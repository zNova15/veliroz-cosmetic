import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabase } from "@/lib/supabase";

/* ============================================================
   Webhook Culqi — POST /api/pagos/culqi/webhook
   -------------------------------------------------------------
   Culqi manda notificaciones cuando cambia el estado de un cargo/order
   (creación, éxito, fallo, refund). Doc: https://docs.culqi.com/reference/webhooks

   Firma:
     Culqi manda la header `x-culqi-signature` = HMAC-SHA256(body, secret).
     Configuramos ese secret en Culqi Panel → Webhooks y lo guardamos en
     Vercel como `CULQI_WEBHOOK_SECRET`.

   Eventos que nos importan (por ahora):
     - "charge.creation.succeeded" → pago confirmado, marcamos pedido='pagado'
     - "charge.creation.failed"    → dejamos pedido='pendiente_pago' + log
     - "order.status.changed"      → si status='paid' idem 'pagado'

   Idempotencia:
     Culqi puede reenviar el mismo evento. Usamos el `id` del cargo como
     `mp_payment_id` en pedidos y filtramos por él antes de reprocesar.

   Seguridad de fallo abierto vs cerrado:
     Si `CULQI_WEBHOOK_SECRET` NO está seteado, devolvemos 200 con warning
     para NO bloquear el desarrollo. En producción DEBE estar seteado.
   ============================================================ */

export const runtime = "nodejs"; // usamos node:crypto → no edge

interface CulqiWebhookBody {
  id?: string;
  object?: string;
  type?: string;
  data?: {
    id?: string;
    amount?: number;
    currency_code?: string;
    email?: string;
    outcome?: { type?: string; code?: string; merchant_message?: string };
    metadata?: Record<string, string>;
    reference_code?: string;
    // 'order' fields cuando type comienza con 'order.'
    status?: string;
  };
  created_at?: number;
}

function validarFirma(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(header, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = process.env.CULQI_WEBHOOK_SECRET;

  // Sin secreto → devolvemos 200 con warning y NO procesamos.
  // (No bloqueamos deploys de preview sin la env var seteada.)
  if (!secret) {
    console.warn("[culqi/webhook] CULQI_WEBHOOK_SECRET no configurado — evento IGNORADO.");
    return NextResponse.json({ received: true, processed: false, reason: "no_secret" });
  }

  const firma = req.headers.get("x-culqi-signature");
  if (!validarFirma(rawBody, firma, secret)) {
    console.warn("[culqi/webhook] firma inválida — evento rechazado.");
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  let evt: CulqiWebhookBody;
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const tipo = evt.type ?? "";
  const isSuccess =
    tipo === "charge.creation.succeeded" ||
    (tipo.startsWith("order.status.changed") && evt.data?.status === "paid");
  const isFailed =
    tipo === "charge.creation.failed" ||
    (tipo.startsWith("order.status.changed") && evt.data?.status === "expired");

  const culqiId = evt.data?.id;
  const pedidoCodigo =
    evt.data?.metadata?.pedido_codigo ||
    evt.data?.reference_code ||
    null;

  if (!culqiId || !pedidoCodigo) {
    // Aceptamos evento pero no lo aplicamos — pudimos loguearlo también en
    // una tabla `pagos_webhook_log` si existe (pendiente de migración).
    console.warn("[culqi/webhook] evento sin culqi_id o pedido_codigo:", tipo);
    return NextResponse.json({ received: true, processed: false, reason: "missing_ids" });
  }

  try {
    const sb = getSupabase();
    if (isSuccess) {
      const { error } = await sb
        .from("pedidos")
        .update({
          estado: "pagado",
          fecha_pago: new Date().toISOString(),
          mp_payment_id: culqiId, // reutilizamos la columna para todos los PSPs
          mp_status: "approved",
        })
        .eq("pedido_codigo", pedidoCodigo);

      if (error) {
        console.error("[culqi/webhook] update pedido falló:", error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    } else if (isFailed) {
      const motivo = evt.data?.outcome?.merchant_message || evt.data?.outcome?.type || "failed";
      await sb
        .from("pedidos")
        .update({
          mp_payment_id: culqiId,
          mp_status: `rejected:${motivo}`.slice(0, 200),
        })
        .eq("pedido_codigo", pedidoCodigo);
    }
    // Otros tipos (refunds, disputes) los ignoramos por ahora.

    return NextResponse.json({ received: true, processed: true, type: tipo });
  } catch (err) {
    console.error("[culqi/webhook] unexpected:", err);
    // Devolvemos 500 → Culqi reintenta el envío.
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "unexpected" },
      { status: 500 }
    );
  }
}

// GET diagnostic — Culqi manda un ping opcional para verificar el endpoint.
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "culqi_webhook",
    ready: !!process.env.CULQI_WEBHOOK_SECRET,
  });
}
