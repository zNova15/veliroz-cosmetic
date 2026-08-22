import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin, hayServiceRole } from "@/lib/supabase-admin";

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
     - "charge.creation.failed"    → dejamos el pedido como está + rastro
     - "order.status.changed"      → si status='paid' idem 'pagado'

   ── QUÉ SE ARREGLÓ ACÁ ──────────────────────────────────────

   1. Fail-open de la firma. Sin `CULQI_WEBHOOK_SECRET` este endpoint
      respondía 200 "recibido" sin haber verificado nada: le decía a la
      pasarela que el evento estaba entregado y lo tiraba a la basura.
      Ahora responde 500 — Culqi reintenta y el evento sobrevive hasta
      que la variable exista. Un webhook de cobro que acepta cualquier
      cosa es peor que uno caído.

   2. El UPDATE iba con la clave anon y `pedidos` tiene RLS: PostgREST
      devuelve HTTP 200, `error: null` y CERO filas cuando la RLS filtra.
      Como el handler sólo miraba `error`, el pago quedaba cobrado y el
      pedido en 'nuevo', sin correo ni boleta. Ahora va con service_role
      y se cuentan las filas del `.select('id')`: contar es lo único que
      distingue "actualicé" de "no vi nada".

   3. Idempotencia. Culqi reenvía el mismo evento. Un pedido ya 'pagado'
      contesta 200 sin volver a escribir, así el trigger de la migración
      029 no re-encola el correo de confirmación. "Ya estaba" es 200;
      "el pedido no existe" es 500, porque ahí hay un cargo real sin
      pedido al que atarlo y alguien tiene que verlo.
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

interface PedidoRow {
  id: string;
  estado: string | null;
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

  /* Sin secreto NO se puede verificar nada → 500, nunca 200.
     El 200 de antes le confirmaba a Culqi la entrega de un evento que
     jamás se aplicó; con 500 el evento queda en su cola de reintentos. */
  if (!secret) {
    console.error("[culqi/webhook] CULQI_WEBHOOK_SECRET no configurado — evento RECHAZADO.");
    return NextResponse.json(
      {
        ok: false,
        error: "sin_webhook_secret",
        hint: "Configurar CULQI_WEBHOOK_SECRET en Vercel (Culqi Panel → Webhooks).",
      },
      { status: 500 }
    );
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

  // Refunds, disputes y demás: los ignoramos por ahora, sin tocar la base.
  if (!isSuccess && !isFailed) {
    return NextResponse.json({ received: true, processed: false, reason: "tipo_ignorado", type: tipo });
  }

  const culqiId = evt.data?.id;
  const pedidoCodigo =
    evt.data?.metadata?.pedido_codigo ||
    evt.data?.reference_code ||
    null;

  if (!culqiId || !pedidoCodigo) {
    /* Un cargo EXITOSO que no dice a qué pedido pertenece es plata
       cobrada sin registro: 500 para que reintente y quede a la vista.
       Un evento fallido sin referencia no cuesta nada, se descarta. */
    console.error("[culqi/webhook] evento sin culqi_id o pedido_codigo:", tipo);
    if (isSuccess) {
      return NextResponse.json({ ok: false, error: "missing_ids" }, { status: 500 });
    }
    return NextResponse.json({ received: true, processed: false, reason: "missing_ids" });
  }

  if (!hayServiceRole()) {
    console.error("[culqi/webhook] SUPABASE_SERVICE_ROLE_KEY ausente.");
    return NextResponse.json(
      {
        ok: false,
        error: "sin_service_role",
        hint:
          "pedidos tiene RLS: con la anon key el UPDATE devuelve 200 y 0 filas, " +
          "y el pago se daría por procesado sin haberlo sido. " +
          "Configurar SUPABASE_SERVICE_ROLE_KEY en Vercel.",
      },
      { status: 500 }
    );
  }

  try {
    const sb = getSupabaseAdmin();

    const { data, error: errLectura } = await sb
      .from("pedidos")
      .select("id, estado")
      .eq("pedido_codigo", pedidoCodigo)
      .maybeSingle();

    if (errLectura) {
      console.error("[culqi/webhook] lectura del pedido falló:", errLectura);
      return NextResponse.json(
        { ok: false, error: `lectura: ${errLectura.message}` },
        { status: 500 }
      );
    }

    const pedido = (data as PedidoRow | null) ?? null;
    if (!pedido) {
      console.error("[culqi/webhook] cargo sin pedido en la base:", culqiId, pedidoCodigo);
      return NextResponse.json(
        { ok: false, error: `pedido_no_encontrado:${pedidoCodigo}` },
        { status: 500 }
      );
    }

    if (isSuccess && pedido.estado === "pagado") {
      // Reenvío del mismo evento: nada que escribir.
      return NextResponse.json({ received: true, processed: true, resultado: "ya_estaba" });
    }

    /* `mp_payment_id` / `mp_status` se reusan para todos los PSPs.
       mp_status='approved' además es obligatorio: el CHECK
       pedidos_pagado_mp_requiere_status exige que un pedido 'pagado'
       con metodo_pago='mercadopago' (donde cae Culqi, ver
       mapearMetodoPago en lib/actions/pedidos.ts) lo tenga seteado. */
    const patch: Record<string, unknown> = isSuccess
      ? {
          estado: "pagado",
          fecha_pago: new Date().toISOString(),
          mp_payment_id: culqiId,
          mp_status: "approved",
        }
      : {
          mp_payment_id: culqiId,
          mp_status: `rejected:${
            evt.data?.outcome?.merchant_message || evt.data?.outcome?.type || "failed"
          }`.slice(0, 200),
        };

    const { data: filas, error } = await sb
      .from("pedidos")
      .update(patch)
      .eq("pedido_codigo", pedidoCodigo)
      .select("id");

    if (error) {
      console.error("[culqi/webhook] update pedido falló:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    /* Cero filas con error null es el fallo silencioso que costó este
       refactor: sin contarlas, "no actualicé nada" se ve idéntico a
       "actualicé bien". */
    const filasTocadas = (filas as Array<{ id: string }> | null)?.length ?? 0;
    if (filasTocadas === 0) {
      console.error("[culqi/webhook] update devolvió 0 filas para", pedidoCodigo);
      return NextResponse.json(
        { ok: false, error: `update_sin_filas:${pedidoCodigo}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      received: true,
      processed: true,
      resultado: "actualizado",
      type: tipo,
    });
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
    ready: Boolean(process.env.CULQI_WEBHOOK_SECRET) && hayServiceRole(),
  });
}
