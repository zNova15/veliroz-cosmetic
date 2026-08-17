import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
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

   Idempotencia:
     Guardamos `mp_payment_id` en pedidos. Si el mismo pago llega
     dos veces, el update es no-op (mismo estado).

   Seguridad:
     Si `MERCADOPAGO_WEBHOOK_SECRET` está seteado, validamos la firma
     v1 (HMAC-SHA256 sobre "id:<data.id>;request-id:<hdr>;ts:<ts>;").
     Si NO está, procesamos igual pero logueamos warning — MP en
     producción manda la firma por default.
   ============================================================ */

export const runtime = "nodejs";

interface MpWebhookBody {
  type?: string;
  action?: string;
  data?: { id?: string | number };
  live_mode?: boolean;
}

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

async function procesarPago(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  if (!mpDisponible()) {
    console.warn("[mp/webhook] MP token no configurado — no puedo consultar pago.");
    return { ok: false, error: "no_token" };
  }

  const info = await getPayment(paymentId);
  if (!info.ok) return { ok: false, error: info.error };
  if (!info.external_reference) {
    console.warn("[mp/webhook] pago sin external_reference:", paymentId);
    return { ok: false, error: "no_reference" };
  }

  const sb = getSupabase();
  const nuevoEstado =
    info.status === "approved"
      ? "pagado"
      : info.status === "rejected"
        ? "pendiente_pago"
        : info.status === "refunded"
          ? "reembolsado"
          : "pendiente_pago";

  const patch: Record<string, unknown> = {
    mp_payment_id: info.id,
    mp_status: info.status ?? null,
  };
  if (info.status === "approved") {
    patch.estado = "pagado";
    patch.fecha_pago = new Date().toISOString();
  } else if (info.status === "refunded") {
    patch.estado = "reembolsado";
  } else if (info.status === "rejected") {
    // No forzamos 'cancelado' — el cliente puede reintentar. Sólo dejamos rastro.
  }
  void nuevoEstado; // reservado para futuros mapeos (in_process, etc.)

  const { error } = await sb
    .from("pedidos")
    .update(patch)
    .eq("pedido_codigo", info.external_reference);

  if (error) {
    console.error("[mp/webhook] update pedido falló:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
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

  if (!paymentId) {
    return NextResponse.json({ received: true, processed: false, reason: "no_id" });
  }

  // Solo tratamos eventos de pago (ignoramos merchant_order por ahora).
  if (topic && !String(topic).includes("payment")) {
    return NextResponse.json({ received: true, processed: false, reason: "topic_skipped", topic });
  }

  // Firma opcional (recomendado en prod).
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (secret) {
    const ok = await validarFirmaMP(
      paymentId,
      req.headers.get("x-request-id"),
      req.headers.get("x-signature"),
      secret
    );
    if (!ok) {
      console.warn("[mp/webhook] firma inválida — rechazado.");
      return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
    }
  }

  const res = await procesarPago(paymentId);
  if (!res.ok) {
    // 500 → MP reintenta.
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 });
  }
  return NextResponse.json({ received: true, processed: true, payment_id: paymentId });
}

// MP a veces manda GET para verificar accesibilidad. Devolvemos 200.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("id") ?? url.searchParams.get("data.id");
  if (!paymentId) {
    return NextResponse.json({
      ok: true,
      endpoint: "mp_webhook",
      ready: mpDisponible(),
    });
  }
  // Algunos setups del panel MP disparan GET reales con ?id=… — los procesamos.
  const res = await procesarPago(paymentId);
  return NextResponse.json({ received: true, ...res });
}
