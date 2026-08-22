import { NextResponse, type NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, isResendConfigured, type SendEmailResult } from "@/lib/resend";
import PedidoCreado, {
  type PedidoCreadoProps,
} from "@/emails/PedidoCreado";
import PedidoPagado, {
  type PedidoPagadoProps,
} from "@/emails/PedidoPagado";
import PedidoEnReparto, {
  type PedidoEnRepartoProps,
} from "@/emails/PedidoEnReparto";
import PedidoEntregado, {
  type PedidoEntregadoProps,
} from "@/emails/PedidoEntregado";
import Bienvenida, { type BienvenidaProps } from "@/emails/Bienvenida";
import ReclamoRecibido, {
  type ReclamoRecibidoProps,
} from "@/emails/ReclamoRecibido";
import ReclamoInterno, {
  type ReclamoInternoProps,
} from "@/emails/ReclamoInterno";
import PedidoNuevoInterno, {
  type PedidoNuevoInternoProps,
} from "@/emails/PedidoNuevoInterno";
import { EMPRESA } from "@/lib/empresa";

/* ============================================================
   /api/cron/drain-email-queue  (POST)
   Vercel Cron cada 5 min → toma hasta 20 correos pendientes de
   email_queue con scheduled_at <= now(), los renderiza según
   tipo y los envía vía Resend. Actualiza estado en la fila
   (enviado / fallido / omitido) + intentos + ultimo_error.

   AUTH:
   - Header 'x-cron-secret' == process.env.CRON_SECRET
   - Vercel Cron manda 'Authorization: Bearer $CRON_SECRET' por
     convención; también aceptamos ese formato.
   - Si CRON_SECRET no está configurada (dev/preview) permitimos
     la llamada — el hobby plan simplemente no dispara el cron.

   SUPABASE:
   - Requiere SUPABASE_SERVICE_ROLE_KEY (server-only, NUNCA
     NEXT_PUBLIC_) porque RLS de email_queue solo deja pasar a
     is_admin(). Fallback: anon key con warning — devolverá 0.

   TIPOS DE CORREO: el reparto por `tipo` vive en HANDLERS (más abajo),
   un registro clave → función. Ahí está escrito qué hay que hacer para
   sumar un tipo nuevo sin tocar nada de lo que ya funciona.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = 20;
const MAX_INTENTOS = 5;

type EmailQueueRow = {
  id: string;
  pedido_id: string | null;
  cliente_email: string;
  tipo: string;
  payload: Record<string, unknown> | null;
  intentos: number;
};

type PedidoRow = {
  pedido_codigo: string;
  cliente_nombre: string;
  /* Contacto y estado los usa el aviso interno: sin teléfono ni correo
     el aviso avisa de una venta que nadie sabe cómo atender. */
  cliente_email: string | null;
  cliente_telefono: string | null;
  estado: string | null;
  fecha_pedido: string | null;
  metodo_pago: string | null;
  metodo_entrega: string | null;
  subtotal: number | null;
  descuento: number | null;
  costo_envio: number | null;
  total: number | null;
  envio_meta: Record<string, unknown> | null;
};

type LineaRow = {
  nombre: string;
  cantidad: number;
  precio_unit: number | null;
  subtotal_linea: number | null;
};

type ComprobanteRow = {
  pdf_url: string | null;
  estado_emision: string | null;
};

/* ---------- Auth ---------- */

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev/preview: sin secret configurado, pasa
  const header = req.headers.get("x-cron-secret");
  if (header && header === secret) return true;
  const bearer = req.headers.get("authorization");
  if (bearer && bearer === `Bearer ${secret}`) return true;
  return false;
}

/* ---------- Supabase server client (service role si existe) ---------- */

let _admin: SupabaseClient | null = null;
function getAdminClient(): { client: SupabaseClient; usingServiceRole: boolean } {
  if (_admin) {
    return {
      client: _admin,
      usingServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey ?? anonKey;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y (SUPABASE_SERVICE_ROLE_KEY | NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-veliroz-cron": "drain-email-queue" } },
  });
  return { client: _admin, usingServiceRole: Boolean(serviceKey) };
}

/* ---------- Resolvers de datos por tipo de correo ---------- */

async function loadPedidoContext(
  sb: SupabaseClient,
  pedidoId: string
): Promise<{
  pedido: PedidoRow | null;
  lineas: LineaRow[];
  comprobante: ComprobanteRow | null;
}> {
  const [pedidoRes, lineasRes, compRes] = await Promise.all([
    sb
      .from("pedidos")
      .select(
        "pedido_codigo,cliente_nombre,cliente_email,cliente_telefono,estado,fecha_pedido,metodo_pago,metodo_entrega,subtotal,descuento,costo_envio,total,envio_meta"
      )
      .eq("id", pedidoId)
      .maybeSingle(),
    sb
      .from("lineas_pedido")
      .select("nombre,cantidad,precio_unit,subtotal_linea")
      .eq("pedido_id", pedidoId),
    sb
      .from("comprobantes_electronicos")
      .select("pdf_url,estado_emision")
      .eq("pedido_id", pedidoId)
      .maybeSingle(),
  ]);

  return {
    pedido: (pedidoRes.data as PedidoRow | null) ?? null,
    lineas: (lineasRes.data as LineaRow[] | null) ?? [],
    comprobante: (compRes.data as ComprobanteRow | null) ?? null,
  };
}

/* ---------- Aviso interno de venta ---------- */

/* A quién le llega el aviso de que entró un pedido. EMAIL_INTERNO
   admite varias direcciones separadas por coma. Sin la variable cae en
   el correo de la empresa, que existe y alguien lee: un aviso operativo
   que no sale por falta de configuración es exactamente el problema que
   este correo vino a resolver, así que no puede depender de que la var
   esté puesta. */
/* Resend rechaza el envío ENTERO con validation_error si el Reply-To no
   parsea, y el drainer lo reintentaría cinco veces antes de dejarlo en
   'fallido'. El correo de la clienta llega del trigger, que sólo hace
   nullif(trim(...)): un pedido cargado a mano desde el CRM con "no tiene"
   o "sofia@" pasa ese filtro. Perder el Reply-To es inofensivo; perder el
   aviso de que entró una venta, no. */
function replyToValido(email: string | null | undefined): string | undefined {
  const e = (email ?? "").trim();
  return /^\S+@\S+\.\S+$/.test(e) ? e : undefined;
}

function destinatariosInternos(): string[] {
  const raw = process.env.EMAIL_INTERNO ?? "";
  const lista = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
  return lista.length > 0 ? lista : [EMPRESA.email];
}

/* wa.me quiere el número con código de país y sin signos, y los
   teléfonos entran como los tipea la clienta (9 dígitos, con espacios,
   con +51). Si no se puede normalizar devolvemos null y el correo no
   muestra el botón — mejor sin botón que con un link que no abre nada. */
function waLink(tel: string | null | undefined): string | null {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length === 9 && d.startsWith("9")) return `https://wa.me/51${d}`;
  if (d.length === 11 && d.startsWith("51")) return `https://wa.me/${d}`;
  return null;
}

/* El server corre en UTC: un pedido de las 8 de la noche de Lima
   figuraría como del día siguiente si se muestra el timestamp crudo. */
function fechaLima(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/* El uso del referido lo escribe crear_pedido_con_referido DESPUÉS de
   insertar el pedido, así que el trigger que encola el aviso todavía no
   lo puede ver: se lee acá, al enviar. Cualquier fallo devuelve null y
   el aviso sale igual — perder el correo entero por un dato accesorio
   sería peor que mandarlo incompleto. */
async function cargarReferido(
  sb: SupabaseClient,
  pedidoId: string
): Promise<{ codigo: string; descuento: number } | null> {
  try {
    const { data, error } = await sb
      .from("referidos_usos")
      .select("descuento_aplicado,referidos(codigo)")
      .eq("pedido_id", pedidoId)
      .maybeSingle();
    if (error || !data) return null;
    const fila = data as {
      descuento_aplicado: number | null;
      referidos: { codigo: string } | { codigo: string }[] | null;
    };
    /* PostgREST devuelve el embed como objeto o como array de uno según
       cómo resuelva la relación; se aceptan las dos formas. */
    const ref = Array.isArray(fila.referidos)
      ? fila.referidos[0] ?? null
      : fila.referidos;
    if (!ref || !ref.codigo) return null;
    return { codigo: ref.codigo, descuento: Number(fila.descuento_aplicado ?? 0) };
  } catch {
    return null;
  }
}

/* ---------- Dispatcher por tipo ---------- */

/* Contexto que recibe cada handler. Se arma una sola vez por fila y la
   firma es la misma para todos, así que sumar un tipo no obliga a tocar
   los que ya andan. */
type HandlerCtx = {
  sb: SupabaseClient;
  row: EmailQueueRow;
  payload: Record<string, unknown>;
};

type EmailHandler = (ctx: HandlerCtx) => Promise<SendEmailResult>;

/* CÓMO SE AGREGA UN TIPO DE CORREO — tres pasos, ninguno pisa lo demás:
     1. Migración: ampliar el CHECK de `email_queue.tipo` repitiendo la
        lista COMPLETA de tipos válidos (ver 032). Olvidarse uno rompe
        el trigger, y el trigger corre dentro de la transacción del
        pedido: tumba el checkout, no sólo el correo.
     2. Importar la plantilla arriba de este archivo.
     3. Sumar una entrada a HANDLERS con la clave EXACTA del `tipo`.
   El batch, los reintentos, los estados y la auth no se tocan nunca.

   Antes esto era un switch gigante; la diferencia práctica es que el
   diff de un tipo nuevo son ahora sus propias líneas y nada más — dos
   personas pueden agregar tipos distintos sin chocar. */
const HANDLERS: Record<string, EmailHandler> = {
  pedido_creado: async ({ sb, row }) => {
    if (!row.pedido_id) {
      return { ok: false, error: "pedido_id requerido para pedido_creado" };
    }
    const { pedido, lineas } = await loadPedidoContext(sb, row.pedido_id);
    if (!pedido) return { ok: false, error: "pedido no encontrado" };
    const props: PedidoCreadoProps = {
      pedidoCodigo: pedido.pedido_codigo,
      clienteNombre: pedido.cliente_nombre ?? "",
      items: lineas.map((l) => ({
        nombre: l.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unit,
        subtotal: l.subtotal_linea,
      })),
      subtotal: Number(pedido.subtotal ?? 0),
      descuento: Number(pedido.descuento ?? 0),
      costoEnvio: Number(pedido.costo_envio ?? 0),
      total: Number(pedido.total ?? 0),
      metodoPago: pedido.metodo_pago ?? "",
      metodoEntrega: pedido.metodo_entrega ?? "",
    };
    return sendEmail(
      row.cliente_email,
      `Recibimos tu pedido — ${pedido.pedido_codigo}`,
      PedidoCreado,
      props,
      { tags: [{ name: "tipo", value: "pedido_creado" }] }
    );
  },

  pedido_pagado: async ({ sb, row, payload }) => {
    if (!row.pedido_id) {
      return { ok: false, error: "pedido_id requerido para pedido_pagado" };
    }
    const { pedido, comprobante } = await loadPedidoContext(sb, row.pedido_id);
    if (!pedido) return { ok: false, error: "pedido no encontrado" };
    const meta = pedido.envio_meta ?? {};
    const trackingUrl =
      (payload.tracking_url as string | undefined) ??
      (meta.tracking_url as string | undefined) ??
      null;
    const props: PedidoPagadoProps = {
      pedidoCodigo: pedido.pedido_codigo,
      clienteNombre: pedido.cliente_nombre ?? "",
      total: Number(pedido.total ?? 0),
      metodoPago: pedido.metodo_pago ?? "",
      metodoEntrega: pedido.metodo_entrega ?? "",
      comprobantePdfUrl:
        comprobante?.estado_emision === "emitido" ? comprobante.pdf_url : null,
      trackingUrl,
    };
    return sendEmail(
      row.cliente_email,
      `Pago confirmado — ${pedido.pedido_codigo}`,
      PedidoPagado,
      props,
      { tags: [{ name: "tipo", value: "pedido_pagado" }] }
    );
  },

  pedido_en_reparto: async ({ sb, row, payload }) => {
    if (!row.pedido_id) {
      return { ok: false, error: "pedido_id requerido para pedido_en_reparto" };
    }
    const { pedido } = await loadPedidoContext(sb, row.pedido_id);
    if (!pedido) return { ok: false, error: "pedido no encontrado" };
    const meta = pedido.envio_meta ?? {};
    const props: PedidoEnRepartoProps = {
      pedidoCodigo: pedido.pedido_codigo,
      clienteNombre: pedido.cliente_nombre ?? "",
      metodoEntrega: pedido.metodo_entrega ?? "",
      transportista:
        (payload.transportista as string | undefined) ??
        (meta.transportista as string | undefined) ??
        null,
      trackingCodigo:
        (payload.tracking_codigo as string | undefined) ??
        (meta.tracking_codigo as string | undefined) ??
        null,
      trackingUrl:
        (payload.tracking_url as string | undefined) ??
        (meta.tracking_url as string | undefined) ??
        null,
      fechaEstimada:
        (payload.fecha_estimada as string | undefined) ??
        (meta.fecha_estimada as string | undefined) ??
        null,
    };
    return sendEmail(
      row.cliente_email,
      `Tu pedido está en camino — ${pedido.pedido_codigo}`,
      PedidoEnReparto,
      props,
      { tags: [{ name: "tipo", value: "pedido_en_reparto" }] }
    );
  },

  /* pedido_entregado y review_request comparten plantilla y sólo
     cambian el asunto: la reseña es el mismo correo 7 días después. */
  pedido_entregado: async (ctx) => entregaOResena(ctx),
  review_request: async (ctx) => entregaOResena(ctx),

  bienvenida: async ({ row, payload }) => {
    const nombre =
      (payload.cliente_nombre as string | undefined) ??
      (payload.nombre as string | undefined) ??
      "";
    const cupon = (payload.cupon as string | undefined) ?? "COSMETIC10";
    const descuentoPct = (payload.descuento_pct as number | undefined) ?? 10;
    const props: BienvenidaProps = {
      clienteNombre: nombre,
      cupon,
      descuentoPct,
    };
    return sendEmail(
      row.cliente_email,
      `Bienvenida a Veliroz — tu ${descuentoPct}% adentro`,
      Bienvenida,
      props,
      { tags: [{ name: "tipo", value: "bienvenida" }] }
    );
  },

  /* El único que NO va a la clienta. Lo encola el trigger de la 032 en
     cada INSERT de `pedidos`, de cualquier canal. */
  pedido_nuevo_interno: async ({ sb, row, payload }) => {
    if (!row.pedido_id) {
      return {
        ok: false,
        error: "pedido_id requerido para pedido_nuevo_interno",
      };
    }
    const { pedido, lineas } = await loadPedidoContext(sb, row.pedido_id);
    if (!pedido) return { ok: false, error: "pedido no encontrado" };

    const meta = pedido.envio_meta ?? {};
    const referido = await cargarReferido(sb, row.pedido_id);

    /* El correo de la clienta se lee del payload y NO de
       row.cliente_email: para este tipo esa columna guarda el marcador
       'interno@veliroz.com' porque el destino real lo decide acá (ver
       migración 032). El fallback a la tabla cubre filas encoladas a
       mano sin payload. */
    const clienteEmail =
      (payload.cliente_email as string | undefined) ??
      pedido.cliente_email ??
      null;
    const telefono =
      (payload.cliente_telefono as string | undefined) ??
      pedido.cliente_telefono ??
      null;

    const props: PedidoNuevoInternoProps = {
      pedidoCodigo: pedido.pedido_codigo,
      fechaTexto: fechaLima(
        (payload.fecha_pedido as string | undefined) ?? pedido.fecha_pedido
      ),
      estado: (payload.estado as string | undefined) ?? pedido.estado ?? null,
      linea: (meta.linea as string | undefined) ?? null,
      canal: (payload.canal as string | undefined) ?? null,
      clienteNombre: pedido.cliente_nombre ?? "",
      clienteEmail,
      clienteTelefono: telefono,
      waUrl: waLink(telefono),
      items: lineas.map((l) => ({
        nombre: l.nombre,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unit,
        subtotal: l.subtotal_linea,
      })),
      subtotal: Number(pedido.subtotal ?? 0),
      descuento: Number(pedido.descuento ?? 0),
      costoEnvio: Number(pedido.costo_envio ?? 0),
      total: Number(pedido.total ?? 0),
      metodoPago: pedido.metodo_pago ?? "",
      metodoEntrega: pedido.metodo_entrega ?? "",
      transporte: (meta.transporte as string | undefined) ?? null,
      agencia: (meta.agencia as string | undefined) ?? null,
      direccion: (payload.direccion as string | undefined) ?? null,
      cupon: (payload.cupon as string | undefined) ?? null,
      referidoCodigo: referido?.codigo ?? null,
      referidoDescuento: referido?.descuento ?? null,
      tipoComprobante: (payload.tipo_comprobante as string | undefined) ?? null,
      documento: (payload.documento as string | undefined) ?? null,
      razonSocial: (payload.razon_social as string | undefined) ?? null,
    };

    /* El asunto tiene que alcanzar solo: se lee en la notificación del
       celular sin abrir nada. Código, plata y cómo se cobra. */
    const asunto =
      `Pedido nuevo ${pedido.pedido_codigo} · ` +
      `S/ ${Number(pedido.total ?? 0).toFixed(2)} · ` +
      `${pedido.metodo_pago ?? "sin método"}`;

    return sendEmail(destinatariosInternos(), asunto, PedidoNuevoInterno, props, {
      /* Responder el aviso escribe a la clienta, no a nosotros. */
      replyTo: replyToValido(clienteEmail),
      tags: [{ name: "tipo", value: "pedido_nuevo_interno" }],
    });
  },
  /* ---------- Libro de Reclamaciones ----------
     Los dos salen ENTEROS del payload: no consultan `reclamos` ni usan
     loadPedidoContext, porque `pedido_id` siempre viene null — un reclamo
     no tiene por qué venir de un pedido. Exigirlo abortaría el envío de la
     constancia, que es justo la parte obligatoria.
     El destinatario es `row.cliente_email`, que /api/reclamos ya llenó con
     la persona en un caso y con la casilla del negocio en el otro. */

  reclamo_recibido: async ({ row, payload }) => {
    const props: ReclamoRecibidoProps = {
      codigo: String(payload.codigo ?? ""),
      nombre: String(payload.nombre ?? ""),
      tipo: payload.tipo === "queja" ? "queja" : "reclamo",
      fechaLimite: String(payload.fecha_limite ?? ""),
      detalle: String(payload.detalle ?? ""),
      pedidoConcreto: String(payload.pedido_concreto ?? ""),
      montoReclamado: (payload.monto_reclamado as number | null) ?? null,
    };
    if (!props.codigo) {
      return { ok: false, error: "payload sin codigo de reclamo" };
    }
    return sendEmail(
      row.cliente_email,
      `Tu ${props.tipo} quedó registrado — ${props.codigo}`,
      ReclamoRecibido,
      props,
      { tags: [{ name: "tipo", value: "reclamo_recibido" }] }
    );
  },

  reclamo_interno: async ({ row, payload }) => {
    const codigo = String(payload.codigo ?? "");
    if (!codigo) {
      return { ok: false, error: "payload sin codigo de reclamo" };
    }
    const tipo = payload.tipo === "queja" ? "queja" : "reclamo";
    const fechaLimite = String(payload.fecha_limite ?? "");
    const props: ReclamoInternoProps = {
      codigo,
      tipo,
      fechaLimite,
      recibidoEn: (payload.recibido_en as string | null) ?? null,
      nombre: String(payload.nombre ?? ""),
      documentoTipo: String(payload.documento_tipo ?? ""),
      documentoNumero: String(payload.documento_numero ?? ""),
      email: String(payload.email ?? ""),
      telefono: (payload.telefono as string | null) ?? null,
      domicilio: String(payload.domicilio ?? ""),
      bienContratado:
        payload.bien_contratado === "servicio" ? "servicio" : "producto",
      descripcion: String(payload.descripcion ?? ""),
      comprobante: (payload.comprobante as string | null) ?? null,
      montoReclamado: (payload.monto_reclamado as number | null) ?? null,
      detalle: String(payload.detalle ?? ""),
      pedidoConcreto: String(payload.pedido_concreto ?? ""),
    };
    return sendEmail(
      row.cliente_email,
      `[${tipo}] ${codigo} · responder antes del ${fechaLimite}`,
      ReclamoInterno,
      props,
      {
        /* Responder el expediente escribe a quien reclamó. */
        replyTo: replyToValido(props.email),
        tags: [{ name: "tipo", value: "reclamo_interno" }],
      }
    );
  },
};
/* Cuerpo compartido de pedido_entregado / review_request. */
async function entregaOResena({
  sb,
  row,
  payload,
}: HandlerCtx): Promise<SendEmailResult> {
  if (!row.pedido_id) {
    return { ok: false, error: "pedido_id requerido para pedido_entregado" };
  }
  const { pedido } = await loadPedidoContext(sb, row.pedido_id);
  if (!pedido) return { ok: false, error: "pedido no encontrado" };
  const props: PedidoEntregadoProps = {
    pedidoCodigo: pedido.pedido_codigo,
    clienteNombre: pedido.cliente_nombre ?? "",
    reviewUrl: (payload.review_url as string | undefined) ?? null,
  };
  const subject =
    row.tipo === "review_request"
      ? `¿Cómo te llegó? — ${pedido.pedido_codigo}`
      : `Tu pedido llegó — ${pedido.pedido_codigo}`;
  return sendEmail(row.cliente_email, subject, PedidoEntregado, props, {
    tags: [{ name: "tipo", value: row.tipo }],
  });
}

async function sendForRow(
  sb: SupabaseClient,
  row: EmailQueueRow
): Promise<SendEmailResult> {
  const handler: EmailHandler | undefined = HANDLERS[row.tipo];
  if (!handler) {
    return { ok: false, error: `Tipo de email no soportado: ${row.tipo}` };
  }
  return handler({
    sb,
    row,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  });
}

/* ---------- POST handler ---------- */

async function drain(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  const { client: sb, usingServiceRole } = getAdminClient();

  /* Sin service_role no hay nada que hacer, y hay que DECIRLO.
     `email_queue` tiene RLS activo y cero policies (migración 029), a
     propósito: guarda nombre y correo de clientes. Con la clave anon,
     un SELECT ahí no devuelve error — devuelve cero filas. El drainer
     respondería { ok: true, procesados: 0 } indefinidamente y todo
     parecería sano mientras ningún cliente recibe su confirmación.
     Fallar fuerte es lo único que hace visible esa configuración. */
  if (!usingServiceRole) {
    return NextResponse.json(
      {
        ok: false,
        error: "sin_service_role",
        hint:
          "email_queue tiene RLS y ninguna policy: la clave anon lee 0 filas " +
          "sin error. Configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.",
      },
      { status: 500 }
    );
  }

  /* Sin credencial de Resend, drenar la cola la DESTRUYE.
     sendEmail() devuelve { skipped: true } cuando falta RESEND_API_KEY,
     y el drainer traduce eso a estado 'omitido', que es terminal: la
     fila deja de estar 'pendiente' y nunca se reintenta. En desarrollo
     eso es lo que se busca. En producción significaría que la
     confirmación de una compra real se descarta para siempre, en
     silencio, por una variable de entorno que falta.
     Es preferible que la cola se acumule y el cron proteste. */
  if (!isResendConfigured() && process.env.VERCEL_ENV === "production") {
    return NextResponse.json(
      {
        ok: false,
        error: "sin_resend_api_key",
        hint:
          "La cola queda intacta a propósito: drenarla sin credencial " +
          "marcaría los correos como 'omitido' de forma terminal. " +
          "Configurar RESEND_API_KEY en Vercel.",
      },
      { status: 500 }
    );
  }

  const nowIso = new Date().toISOString();
  const { data: rows, error } = await sb
    .from("email_queue")
    .select("id,pedido_id,cliente_email,tipo,payload,intentos")
    .eq("estado", "pendiente")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error.message,
        hint: usingServiceRole
          ? "servicio con service_role — revisar policy is_admin()"
          : "sin SUPABASE_SERVICE_ROLE_KEY: RLS bloquea al anon; setear la var",
      },
      { status: 500 }
    );
  }

  const queue = (rows ?? []) as EmailQueueRow[];

  let enviados = 0;
  let fallidos = 0;
  let omitidos = 0;

  for (const row of queue) {
    let result: SendEmailResult;
    try {
      result = await sendForRow(sb, row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result = { ok: false, error: msg };
    }

    const intentos = (row.intentos ?? 0) + 1;

    if (result.ok && result.skipped) {
      omitidos++;
      await sb
        .from("email_queue")
        .update({
          estado: "omitido",
          ultimo_error: result.reason,
          intentos,
        })
        .eq("id", row.id);
      continue;
    }

    if (result.ok) {
      enviados++;
      await sb
        .from("email_queue")
        .update({
          estado: "enviado",
          sent_at: new Date().toISOString(),
          intentos,
          ultimo_error: null,
        })
        .eq("id", row.id);
      continue;
    }

    fallidos++;
    // Después de MAX_INTENTOS marcamos 'fallido' de forma terminal;
    // hasta entonces lo dejamos 'pendiente' para reintentar en el
    // próximo tick del cron.
    const nextEstado = intentos >= MAX_INTENTOS ? "fallido" : "pendiente";
    await sb
      .from("email_queue")
      .update({
        estado: nextEstado,
        intentos,
        ultimo_error: result.error.slice(0, 500),
      })
      .eq("id", row.id);
  }

  return NextResponse.json({
    ok: true,
    procesados: queue.length,
    enviados,
    fallidos,
    omitidos,
    usingServiceRole,
    scanned_at: nowIso,
  });
}

export async function POST(req: NextRequest) {
  return drain(req);
}

// Vercel Cron llega como GET por defecto — soportamos ambos para
// que sirva tanto en cron schedule como en pruebas manuales curl.
export async function GET(req: NextRequest) {
  return drain(req);
}
