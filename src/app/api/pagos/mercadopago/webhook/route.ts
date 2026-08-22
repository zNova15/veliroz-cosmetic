import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin, hayServiceRole } from "@/lib/supabase-admin";
import { getPayment, mpDisponible } from "@/lib/mercadopago";

/* ============================================================
   Webhook MercadoPago — POST /api/pagos/mercadopago/webhook
   -------------------------------------------------------------
   MP IPN v2 puede llegar en dos formas:

   (a) Nueva (v2 webhooks): body JSON
       { "type": "payment", "data": { "id": "12345" }, ... }
       + header `x-signature` (HMAC ts=...,v1=...) + `x-request-id`

   (b) Vieja (IPN legacy): query string
       ?topic=payment&id=12345

   Ambas apuntan a lo mismo → hacemos GET /v1/payments/{id} para
   obtener el estado real (nunca confiamos en el body del webhook).

   ── TRES COSAS QUE ANTES PERDÍAN PAGOS ──────────────────────

   1. El UPDATE iba con `getSupabase()` (clave anon). `pedidos` tiene
      RLS y la anon no la atraviesa, pero PostgREST no lo dice: devuelve
      HTTP 200, `error: null` y cero filas. Este handler sólo miraba
      `error`, así que respondía {processed:true}, MP daba el evento por
      entregado y no reintentaba. Pago cobrado, pedido en 'nuevo', sin
      boleta y sin correo. Ahora va con service_role (lib/supabase-admin)
      y se CUENTAN las filas devueltas: es la única forma de distinguir
      "actualicé" de "no vi nada", porque el error viene null en ambos.

   2. Sin `MERCADOPAGO_WEBHOOK_SECRET` procesaba igual. Un endpoint de
      cobro que acepta cualquier POST sin verificar nada es peor que uno
      caído: cualquiera que conozca la URL marca pedidos como pagados.
      Ahora sin secreto responde 500 — y el 500 es deliberado: MP
      reintenta y el evento queda pendiente hasta que la env exista.

   3. Idempotencia. MP reenvía el mismo evento varias veces. Un pedido
      que YA está en el estado destino contesta 200 sin volver a
      escribir, para no re-tocar `pedidos.estado` (el trigger de la
      migración 029 encola 'pedido_pagado' en cada cambio a 'pagado').
      Se distingue de "el pedido no existe", que sí es 500: ahí hay
      un pago real sin pedido al que atarlo y alguien tiene que verlo.
   ============================================================ */

export const runtime = "nodejs";

interface MpWebhookBody {
  type?: string;
  action?: string;
  data?: { id?: string | number };
  live_mode?: boolean;
}

interface PedidoRow {
  id: string;
  estado: string | null;
  mp_payment_id: string | null;
}

type Resultado =
  | { ok: true; resultado: "actualizado" | "ya_estaba" | "ignorado_pedido_ya_pagado" }
  | { ok: false; error: string };

function parseSignatureHeader(h: string | null): { ts?: string; v1?: string } {
  if (!h) return {};
  const out: Record<string, string> = {};
  for (const part of h.split(",")) {
    const [k, v] = part.split("=").map((x) => x?.trim());
    if (k && v) out[k] = v;
  }
  return { ts: out.ts, v1: out.v1 };
}

async function validarFirmaMP(
  paymentId: string,
  requestId: string | null,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1) return false;
  const manifest = `id:${paymentId};request-id:${requestId ?? ""};ts:${ts};`;
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function procesarPago(paymentId: string): Promise<Resultado> {
  if (!mpDisponible()) {
    console.warn("[mp/webhook] MP token no configurado — no puedo consultar pago.");
    return { ok: false, error: "no_token" };
  }

  const info = await getPayment(paymentId);
  if (!info.ok) return { ok: false, error: info.error ?? "mp_error" };
  if (!info.external_reference) {
    /* Un pago aprobado que no sabemos a qué pedido pertenece es plata sin
       registro: 500 para que MP reintente y quede a la vista en el panel. */
    console.warn("[mp/webhook] pago sin external_reference:", paymentId);
    return { ok: false, error: "no_reference" };
  }

  const sb = getSupabaseAdmin();
  const codigo = info.external_reference;

  const { data, error: errLectura } = await sb
    .from("pedidos")
    .select("id, estado, mp_payment_id")
    .eq("pedido_codigo", codigo)
    .maybeSingle();

  if (errLectura) {
    console.error("[mp/webhook] lectura del pedido falló:", errLectura);
    return { ok: false, error: `lectura: ${errLectura.message}` };
  }

  const pedido = (data as PedidoRow | null) ?? null;
  if (!pedido) {
    console.error(
      "[mp/webhook] pago sin pedido en la base:",
      paymentId,
      codigo
    );
    return { ok: false, error: `pedido_no_encontrado:${codigo}` };
  }

  /* 'rejected' NO fuerza 'cancelado': la clienta puede reintentar con
     otra tarjeta sobre el mismo pedido. Sólo dejamos rastro. */
  /* 'cancelado' y no 'reembolsado': `pedidos_estado_check` (001_schema,
     compartido por las cuatro líneas del negocio) sólo admite
     nuevo|pagado|preparando|en_reparto|entregado|cancelado. Escribir
     'reembolsado' violaba el CHECK con 23514, el webhook devolvía 500 y
     MercadoPago reintentaba el mismo evento para siempre. El detalle no se
     pierde: queda en mp_status='refunded'. Ampliar el CHECK tocaría el
     esquema de flores, bienestar y chocotejas, que es más riesgo que valor. */
  const estadoDestino =
    info.status === "approved"
      ? "pagado"
      : info.status === "refunded"
        ? "cancelado"
        : null;

  /* Reenvío del mismo evento: ya estaba en el estado destino → 200 sin
     escribir. Escribir de nuevo no rompería nada (el trigger 029 sale
     temprano cuando el estado no cambia), pero no hay razón para tocar
     la fila y sí para que el log diga qué pasó. */
  if (estadoDestino && pedido.estado === estadoDestino) {
    return { ok: true, resultado: "ya_estaba" };
  }

  /* Un pedido YA pagado que recibe un evento sin estado destino (un
     'rejected' tardío de un reintento, un 'in_process' fuera de orden) no
     se toca. `pedidos_pagado_mp_requiere_status` exige que un pedido
     pagado por MercadoPago tenga mp_status='approved': pisarlo con
     'rejected' lo violaba con 23514, el webhook respondía 500 y
     MercadoPago reintentaba en bucle un evento que nunca iba a entrar. */
  if (!estadoDestino && pedido.estado === "pagado") {
    return { ok: true, resultado: "ignorado_pedido_ya_pagado" };
  }

  const patch: Record<string, unknown> = {
    mp_payment_id: info.id ?? paymentId,
    mp_status: info.status ?? null,
  };
  if (estadoDestino) patch.estado = estadoDestino;
  if (info.status === "approved") patch.fecha_pago = new Date().toISOString();

  const { data: filas, error } = await sb
    .from("pedidos")
    .update(patch)
    .eq("pedido_codigo", codigo)
    .select("id");

  if (error) {
    console.error("[mp/webhook] update pedido falló:", error);
    return { ok: false, error: error.message };
  }

  /* Cero filas con `error: null` es el fallo silencioso de siempre.
     Con service_role ya no debería pasar (no hay RLS que filtre), así
     que si pasa es una carrera real — 500 y que MP reintente. */
  const filasTocadas = (filas as Array<{ id: string }> | null)?.length ?? 0;
  if (filasTocadas === 0) {
    console.error("[mp/webhook] update devolvió 0 filas para", codigo);
    return { ok: false, error: `update_sin_filas:${codigo}` };
  }

  return { ok: true, resultado: "actualizado" };
}

/* Camino común de POST y GET: el evento ya se identificó, ahora hay que
   verificarlo y aplicarlo. */
async function atender(
  req: NextRequest,
  paymentId: string
): Promise<NextResponse> {
  /* Fail-closed. Antes, sin secreto, se procesaba igual "para no
     bloquear preview" — y preview pega contra la MISMA base de
     producción, así que era una puerta abierta a marcar pedidos como
     pagados desde afuera. */
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[mp/webhook] MERCADOPAGO_WEBHOOK_SECRET no configurado — evento rechazado."
    );
    return NextResponse.json(
      {
        ok: false,
        error: "sin_webhook_secret",
        hint:
          "Sin secreto no se puede verificar la firma. 500 a propósito: " +
          "MP reintenta y el evento no se pierde. Configurar " +
          "MERCADOPAGO_WEBHOOK_SECRET en Vercel.",
      },
      { status: 500 }
    );
  }

  const firmaOk = await validarFirmaMP(
    paymentId,
    req.headers.get("x-request-id"),
    req.headers.get("x-signature"),
    secret
  );
  if (!firmaOk) {
    console.warn("[mp/webhook] firma inválida — rechazado.");
    return NextResponse.json(
      { ok: false, error: "invalid_signature" },
      { status: 401 }
    );
  }

  if (!hayServiceRole()) {
    console.error("[mp/webhook] SUPABASE_SERVICE_ROLE_KEY ausente.");
    return NextResponse.json(
      {
        ok: false,
        error: "sin_service_role",
        hint:
          "pedidos tiene RLS: con la anon key el UPDATE devuelve 200 y 0 " +
          "filas, y el pago se daría por procesado sin haberlo sido. " +
          "Configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.",
      },
      { status: 500 }
    );
  }

  const res = await procesarPago(paymentId);
  if (!res.ok) {
    // 500 → MP reintenta.
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  }
  return NextResponse.json({
    received: true,
    processed: true,
    resultado: res.resultado,
    payment_id: paymentId,
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const url = new URL(req.url);

  // (a) v2 body ; (b) legacy query
  let evt: MpWebhookBody | null = null;
  try {
    evt = rawBody ? (JSON.parse(rawBody) as MpWebhookBody) : null;
  } catch {
    evt = null;
  }

  const paymentId =
    String(evt?.data?.id ?? "") ||
    url.searchParams.get("id") ||
    url.searchParams.get("data.id");

  const topic = evt?.type ?? url.searchParams.get("topic") ?? url.searchParams.get("type");

  /* Sin id no hay pago que consultar: nada que perder, 200 y listo. */
  if (!paymentId) {
    return NextResponse.json({ received: true, processed: false, reason: "no_id" });
  }

  // Solo tratamos eventos de pago (ignoramos merchant_order por ahora).
  if (topic && !String(topic).includes("payment")) {
    return NextResponse.json({ received: true, processed: false, reason: "topic_skipped", topic });
  }

  return atender(req, paymentId);
}

/* MP manda GET para verificar que el endpoint existe cuando se guarda la
   URL en el panel: ese ping viene sin id y se responde 200.
   Si alguna vez llega un GET CON id, pasa por el mismo control que el
   POST (firma incluida) — un GET sin firma que marque pedidos como
   pagados sería la misma puerta abierta que se acaba de cerrar arriba. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("id") ?? url.searchParams.get("data.id");
  if (!paymentId) {
    return NextResponse.json({
      ok: true,
      endpoint: "mp_webhook",
      ready: mpDisponible() && hayServiceRole() && Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET),
    });
  }
  return atender(req, paymentId);
}
