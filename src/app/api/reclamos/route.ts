import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EMPRESA } from "@/lib/empresa";

/* ============================================================
   POST /api/reclamos — Libro de Reclamaciones virtual
   ------------------------------------------------------------
   QUÉ ARREGLA: /libro-reclamaciones posteaba a
   `action="mailto:hola@veliroz.com"`. Un submit de formulario HTML
   hacia mailto: no funciona en Chrome ni en Safari móvil — y de ahí
   viene casi todo el tráfico, que entra desde Instagram. El reclamo se
   perdía entero y la persona se iba creyendo que lo había presentado.

   QUÉ EXIGE LA NORMA (D.S. 011-2011-PCM, Ley 29571 art. 152):
   registro con código correlativo, copia inmediata al consumidor y
   respuesta en 30 días calendario. Esta ruta cubre las tres: inserta
   en `reclamos` (el trigger de la migración 031 asigna código y fecha
   límite) y encola DOS correos en `email_queue`.

   DOS FORMATOS DE ENTRADA, a propósito:
   · application/json          → responde JSON. Es la puerta para el bot
                                 de WhatsApp y el CRM.
   · x-www-form-urlencoded     → responde 303 a
     o multipart/form-data       /libro-reclamaciones?codigo=LR-… (o
                                 ?error=…). Así la página funciona con un
                                 <form> nativo, SIN JavaScript.

   POR QUÉ SIN JAVASCRIPT: la página tiene que exportar `metadata`, o
   sea que es Server Component, y un Client Component exigiría un
   archivo aparte. Pero además es lo correcto acá: el Libro de
   Reclamaciones es obligatorio y tiene que enviarse incluso dentro del
   navegador embebido de Instagram, que es donde más raro se comporta
   el JS. Un POST nativo + 303 no depende de nada.

   SERVICE ROLE OBLIGATORIO: `reclamos` tiene RLS con cero policies
   (migración 031) porque guarda documento de identidad y domicilio.
   Con la anon key el INSERT devuelve 42501. No hay fallback: si falta
   la variable, la ruta lo dice fuerte en vez de fingir que anda.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------- Destinatario interno ---------- */
/* Variable de entorno y no constante: el correo interno lleva DNI y
   domicilio de la persona, y a quién le llega ese expediente es una
   decisión del negocio, no del repo. Sin la var cae a la casilla
   pública de la empresa, que siempre existe. */
function emailInterno(): string {
  return process.env.RECLAMOS_EMAIL_INTERNO?.trim() || EMPRESA.email;
}

/* ---------- Supabase con service_role ---------- */

let _admin: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-veliroz-app": "reclamos" } },
  });
  return _admin;
}

/* ---------- Rate limit por IP ---------- */
/* En memoria del proceso: se pierde en cada cold start y no se comparte
   entre instancias de Vercel. Es a propósito — un rate limit en
   Postgres costaría un round-trip por request en un formulario que se
   usa un puñado de veces por mes, y el objetivo acá no es frenar un
   ataque serio sino que un script no llene el libro de hojas basura.

   El techo es generoso (5 por hora) porque las operadoras móviles
   peruanas hacen CGNAT: media Cajamarca puede salir por la misma IP, y
   bloquear un reclamo legítimo es mucho peor que aceptar uno de más. */
const RL_MAX = 5;
const RL_VENTANA_MS = 60 * 60 * 1000;
const RL_MAX_IPS = 5000;
const golpes = new Map<string, number[]>();

function ipDe(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const primera = fwd.split(",")[0]?.trim();
    if (primera) return primera;
  }
  return req.headers.get("x-real-ip")?.trim() || "desconocida";
}

function vigentes(ip: string): number[] {
  const ahora = Date.now();
  return (golpes.get(ip) ?? []).filter((t) => ahora - t < RL_VENTANA_MS);
}

function excedido(ip: string): boolean {
  return vigentes(ip).length >= RL_MAX;
}

/* Se cuenta el reclamo REGISTRADO, no el intento. Si contáramos
   intentos, alguien peleándose con el formulario (o con un error
   nuestro) quedaría bloqueado del canal legal por insistir. Un bot que
   manda basura no pasa la validación y por lo tanto no crea filas: no
   hay nada que limitar ahí. */
function registrarGolpe(ip: string): void {
  const ahora = Date.now();
  const previos = vigentes(ip);
  previos.push(ahora);
  golpes.set(ip, previos);

  /* Poda perezosa: sin esto el Map crece sin techo durante toda la vida
     de la instancia y es una fuga de memoria lenta. */
  if (golpes.size > RL_MAX_IPS) {
    for (const [k, v] of golpes) {
      if (v.every((t) => ahora - t >= RL_VENTANA_MS)) golpes.delete(k);
    }
  }
}

/* ---------- Lectura del body ---------- */

type Campos = Record<string, string>;

async function leerCampos(
  req: Request,
): Promise<{ campos: Campos; esFormulario: boolean } | null> {
  const ct = req.headers.get("content-type") ?? "";

  if (ct.includes("application/json")) {
    try {
      const raw: unknown = await req.json();
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
      const campos: Campos = {};
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (v === null || v === undefined) continue;
        campos[k] = typeof v === "string" ? v : String(v);
      }
      return { campos, esFormulario: false };
    } catch {
      return null;
    }
  }

  try {
    const fd = await req.formData();
    const campos: Campos = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v === "string") campos[k] = v;
    }
    return { campos, esFormulario: true };
  } catch {
    return null;
  }
}

/* Toma el primer nombre de campo que venga con algo. La página usa los
   nombres históricos del formulario (`nombres`, `dni`, `correo`…) y no
   los vamos a renombrar sólo por gusto; un caller programático puede
   mandar los nombres de la tabla. Los dos entran. */
function tomar(c: Campos, ...claves: string[]): string {
  for (const k of claves) {
    const v = c[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

/* ---------- Validación ---------- */

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_DOC = /^[0-9A-Za-z]{6,15}$/;

/* Códigos de error, no frases: el mensaje legible lo arma la página
   (ver el mapa ERRORES en /libro-reclamaciones). Así no reflejamos
   texto del usuario en la URL ni duplicamos la redacción. */
type CodigoError =
  | "datos_incompletos"
  | "email_invalido"
  | "documento_invalido"
  | "sin_consentimiento"
  | "demasiados_intentos"
  | "sin_service_role"
  | "db";

interface ReclamoValido {
  tipo: "reclamo" | "queja";
  nombre: string;
  documento_tipo: string;
  documento_numero: string;
  email: string;
  telefono: string | null;
  domicilio: string;
  bien_contratado: "producto" | "servicio";
  descripcion: string;
  comprobante: string | null;
  monto_reclamado: number | null;
  detalle: string;
  pedido_concreto: string;
}

/* El formulario tiene un solo input "DNI / CE" y no vamos a rediseñar
   la página para agregar un <select> que la mayoría contestaría mal.
   Se deduce del número, que en Perú es inequívoco en los dos casos
   frecuentes: DNI son 8 dígitos y RUC son 11 empezando en 10 o 20.
   Todo lo demás cae a CE, que es el cajón correcto para pasaportes y
   carnés de extranjería. La API acepta `documento_tipo` explícito si
   algún día el formulario lo manda. */
function deducirTipoDocumento(numero: string): string {
  if (/^\d{8}$/.test(numero)) return "DNI";
  if (/^(10|20)\d{9}$/.test(numero)) return "RUC";
  return "CE";
}

function recortar(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

function validar(c: Campos): { ok: true; datos: ReclamoValido } | { ok: false; error: CodigoError } {
  /* El checkbox del formulario es `required` en HTML, pero eso lo puede
     saltear cualquiera. La declaración de veracidad + consentimiento de
     datos (Ley 29733) tiene que existir del lado del servidor o no vale
     nada. */
  const consentimiento = tomar(c, "consentimiento", "acepto");
  if (!consentimiento || consentimiento === "false") {
    return { ok: false, error: "sin_consentimiento" };
  }

  const nombre = recortar(tomar(c, "nombres", "nombre"), 120);
  const documento_numero = tomar(c, "dni", "documento_numero", "documento");
  /* Con tope como todos los demás: RE_EMAIL no limita longitud y la
     columna es `text` sin límite, así que la puerta JSON —pública y sin
     autenticación— aceptaba una dirección de cualquier tamaño. */
  const email = recortar(tomar(c, "correo", "email"), 160).toLowerCase();
  const domicilio = recortar(tomar(c, "domicilio", "direccion"), 200);
  const descripcion = recortar(tomar(c, "descripcion_bien", "descripcion"), 300);
  const detalle = recortar(tomar(c, "detalle"), 5000);
  const pedido_concreto = recortar(tomar(c, "pedido", "pedido_concreto"), 2000);

  if (
    nombre.length < 2 ||
    !documento_numero ||
    !email ||
    domicilio.length < 4 ||
    descripcion.length < 2 ||
    detalle.length < 10 ||
    pedido_concreto.length < 3
  ) {
    return { ok: false, error: "datos_incompletos" };
  }

  if (!RE_EMAIL.test(email)) return { ok: false, error: "email_invalido" };
  if (!RE_DOC.test(documento_numero)) {
    return { ok: false, error: "documento_invalido" };
  }

  const tipoCrudo = tomar(c, "tipo_solicitud", "tipo").toLowerCase();
  const tipo: "reclamo" | "queja" = tipoCrudo === "queja" ? "queja" : "reclamo";

  const bienCrudo = tomar(c, "tipo_bien", "bien_contratado").toLowerCase();
  const bien_contratado: "producto" | "servicio" =
    bienCrudo === "servicio" ? "servicio" : "producto";

  /* Number("") es 0, no NaN: sin este guardia todo reclamo sin monto
     quedaría registrado como "reclama S/ 0.00", que no es lo mismo que
     "no indicó monto". */
  const montoTxt = tomar(c, "monto", "monto_reclamado").replace(",", ".");
  const montoNum = montoTxt ? Number(montoTxt) : NaN;
  const monto_reclamado =
    Number.isFinite(montoNum) && montoNum > 0 && montoNum < 1_000_000
      ? Math.round(montoNum * 100) / 100
      : null;

  const telefonoTxt = recortar(tomar(c, "telefono", "celular"), 30);
  const comprobanteTxt = recortar(tomar(c, "boleta", "comprobante"), 40);

  const tipoDocExplicito = tomar(c, "documento_tipo").toUpperCase();
  const documento_tipo = ["DNI", "CE", "PASAPORTE", "RUC", "OTRO"].includes(
    tipoDocExplicito,
  )
    ? tipoDocExplicito
    : deducirTipoDocumento(documento_numero);

  return {
    ok: true,
    datos: {
      tipo,
      nombre,
      documento_tipo,
      documento_numero: documento_numero.toUpperCase(),
      email,
      telefono: telefonoTxt || null,
      domicilio,
      bien_contratado,
      descripcion,
      comprobante: comprobanteTxt || null,
      monto_reclamado,
      detalle,
      pedido_concreto,
    },
  };
}

/* ---------- Respuestas ---------- */

/* Location relativo a propósito. NextResponse.redirect() exige una URL
   absoluta y armarla acá reabre la trampa de VERCEL_URL (ver
   src/lib/site.ts): el host del deployment no es el dominio de
   producción. Un Location relativo lo resuelve el navegador contra el
   host que la clienta está usando, y la RFC 7231 lo permite. */
function redirigir(query: string): Response {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `/libro-reclamaciones${query}`,
      "Cache-Control": "no-store",
    },
  });
}

function responder(
  esFormulario: boolean,
  cuerpo: Record<string, unknown>,
  status: number,
  query: string,
): Response {
  if (esFormulario) return redirigir(query);
  return Response.json(cuerpo, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/* ---------- Handler ---------- */

export async function POST(req: Request): Promise<Response> {
  const leido = await leerCampos(req);
  if (!leido) {
    return Response.json(
      { ok: false, error: "body_invalido" },
      { status: 400 },
    );
  }
  const { campos, esFormulario } = leido;

  /* Honeypot: un campo `website` que está en display:none. Ninguna
     persona lo ve ni lo llena; los bots que rellenan todo input sí.
     Se descarta en silencio — devolver un error le enseña al bot cuál
     era la trampa. */
  if ((campos.website ?? "").trim()) {
    return responder(esFormulario, { ok: true, codigo: null }, 200, "");
  }

  const ip = ipDe(req);
  if (excedido(ip)) {
    return responder(
      esFormulario,
      { ok: false, error: "demasiados_intentos" },
      429,
      "?error=demasiados_intentos",
    );
  }

  const v = validar(campos);
  if (!v.ok) {
    return responder(
      esFormulario,
      { ok: false, error: v.error },
      400,
      `?error=${v.error}`,
    );
  }

  const sb = getAdminClient();
  if (!sb) {
    /* Nunca caemos a la anon key: `reclamos` tiene RLS sin policies, el
       INSERT devolvería 42501 y el log diría "permission denied" en vez
       de "falta una variable de entorno". */
    // eslint-disable-next-line no-console
    console.error(
      "[reclamos] Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL — el reclamo NO se guardó",
    );
    return responder(
      esFormulario,
      {
        ok: false,
        error: "sin_service_role",
        hint: "Configurar SUPABASE_SERVICE_ROLE_KEY en Vercel (server-only).",
      },
      500,
      "?error=sin_service_role",
    );
  }

  /* `codigo` y `fecha_limite` NO se mandan: los pone el trigger
     trg_asignar_datos_reclamo (migración 031). Si el cliente pudiera
     elegir su número de hoja, el correlativo dejaría de servir como
     registro. */
  const { data, error } = await sb
    .from("reclamos")
    .insert(v.datos)
    .select("id,codigo,fecha_limite,created_at")
    .single();

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error("[reclamos] insert falló", error?.message, error?.code);
    return responder(
      esFormulario,
      { ok: false, error: "db", detail: error?.message },
      500,
      "?error=db",
    );
  }

  const fila = data as {
    id: string;
    codigo: string;
    fecha_limite: string;
    created_at: string;
  };

  registrarGolpe(ip);

  /* ---------- Los dos correos ----------
     Van por `email_queue` y no por Resend en línea: si Resend está
     lento o caído, un envío directo dejaría a la persona esperando o
     tiraría un 500 sobre un reclamo YA guardado. La cola reintenta
     hasta 5 veces sola (ver /api/cron/drain-email-queue).

     El payload lleva TODO lo que las plantillas necesitan, así el
     drainer no tiene que volver a consultar `reclamos`. La contra es
     que el dato personal queda duplicado en la cola — pero
     `email_queue` tiene exactamente el mismo RLS sin policies, así que
     no amplía la superficie.

     OJO: `tipo` sólo acepta estos dos valores porque la migración 031
     amplía el CHECK de la 029. Sin esa migración aplicada, este insert
     muere con 23514 y el reclamo queda registrado sin avisarle a
     nadie — por eso el fallo se loguea y se devuelve `copia_email`. */
  const payloadBase = {
    reclamo_id: fila.id,
    codigo: fila.codigo,
    tipo: v.datos.tipo,
    fecha_limite: fila.fecha_limite,
    nombre: v.datos.nombre,
    detalle: v.datos.detalle,
    pedido_concreto: v.datos.pedido_concreto,
    monto_reclamado: v.datos.monto_reclamado,
  };

  const { error: errorCola } = await sb.from("email_queue").insert([
    {
      cliente_email: v.datos.email,
      tipo: "reclamo_recibido",
      payload: payloadBase,
    },
    {
      /* `cliente_email` acá es la casilla del negocio: el drainer envía
         a esa columna, sin mirar el payload. */
      cliente_email: emailInterno(),
      tipo: "reclamo_interno",
      payload: {
        ...payloadBase,
        recibido_en: fila.created_at,
        documento_tipo: v.datos.documento_tipo,
        documento_numero: v.datos.documento_numero,
        email: v.datos.email,
        telefono: v.datos.telefono,
        domicilio: v.datos.domicilio,
        bien_contratado: v.datos.bien_contratado,
        descripcion: v.datos.descripcion,
        comprobante: v.datos.comprobante,
      },
    },
  ]);

  if (errorCola) {
    // eslint-disable-next-line no-console
    console.error(
      "[reclamos] el reclamo",
      fila.codigo,
      "quedó guardado pero NO se encolaron los correos:",
      errorCola.message,
    );
  }

  /* El reclamo está guardado: eso es lo que exige la norma y es lo que
     se le devuelve. Si el correo no se pudo encolar, la página se lo
     dice en vez de prometer una copia que no va a llegar. */
  return responder(
    esFormulario,
    {
      ok: true,
      codigo: fila.codigo,
      fecha_limite: fila.fecha_limite,
      copia_email: !errorCola,
    },
    201,
    `?codigo=${encodeURIComponent(fila.codigo)}` +
      `&limite=${encodeURIComponent(fila.fecha_limite)}` +
      (errorCola ? "&copia=0" : ""),
  );
}

/* Un GET acá casi siempre es alguien pegando la URL en el navegador.
   Mandarlo al formulario es más útil que un 405. */
export function GET(): Response {
  return redirigir("");
}
