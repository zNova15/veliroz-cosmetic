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
        "pedido_codigo,cliente_nombre,metodo_pago,metodo_entrega,subtotal,descuento,costo_envio,total,envio_meta"
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

/* ---------- Dispatcher por tipo ---------- */

async function sendForRow(
  sb: SupabaseClient,
  row: EmailQueueRow
): Promise<SendEmailResult> {
  const payload = (row.payload ?? {}) as Record<string, unknown>;

  switch (row.tipo) {
    case "pedido_creado": {
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
    }

    case "pedido_pagado": {
      if (!row.pedido_id) {
        return { ok: false, error: "pedido_id requerido para pedido_pagado" };
      }
      const { pedido, comprobante } = await loadPedidoContext(
        sb,
        row.pedido_id
      );
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
          comprobante?.estado_emision === "emitido"
            ? comprobante.pdf_url
            : null,
        trackingUrl,
      };
      return sendEmail(
        row.cliente_email,
        `Pago confirmado — ${pedido.pedido_codigo}`,
        PedidoPagado,
        props,
        { tags: [{ name: "tipo", value: "pedido_pagado" }] }
      );
    }

    case "pedido_en_reparto": {
      if (!row.pedido_id) {
        return {
          ok: false,
          error: "pedido_id requerido para pedido_en_reparto",
        };
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
    }

    case "pedido_entregado":
    case "review_request": {
      if (!row.pedido_id) {
        return {
          ok: false,
          error: "pedido_id requerido para pedido_entregado",
        };
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

    case "bienvenida": {
      const nombre =
        (payload.cliente_nombre as string | undefined) ??
        (payload.nombre as string | undefined) ??
        "";
      const cupon = (payload.cupon as string | undefined) ?? "COSMETIC10";
      const descuentoPct =
        (payload.descuento_pct as number | undefined) ?? 10;
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
    }

    default:
      return {
        ok: false,
        error: `Tipo de email no soportado: ${row.tipo}`,
      };
  }
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
