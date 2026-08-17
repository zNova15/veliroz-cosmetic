/* ============================================================
   POST /api/notificar-pedido-wa
   ------------------------------------------------------------
   Trigger interno para disparar notificaciones WhatsApp cuando
   cambia el estado de un pedido. Se llama desde:
   - server action crearPedido (nuevo pedido → veliroz_pedido_creado)
   - webhook de Culqi / MercadoPago (pago confirmado → veliroz_pedido_pagado)
   ------------------------------------------------------------
   Body:
   {
     "pedido_id": "uuid",              // requerido — id o pedido_codigo
     "evento": "creado" | "pagado" | "auto",  // default "auto" (lee estado)
     "link_boleta": "https://..."      // opcional, solo para "pagado"
   }
   ------------------------------------------------------------
   Auth: header x-internal-token debe matchear INTERNAL_API_TOKEN
   (si esa var no está seteada, se acepta cualquiera — dev/preview).
   ============================================================ */

import type { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { sendTemplate, WA_TEMPLATES, type WaSendResult } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  pedido_id?: string;
  evento?: "creado" | "pagado" | "auto";
  link_boleta?: string;
}

interface PedidoRow {
  id: string;
  pedido_codigo: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  total: number | string | null;
  estado: string | null;
}

export async function POST(request: NextRequest) {
  // -------- Auth interno --------
  const expected = process.env.INTERNAL_API_TOKEN;
  if (expected) {
    const got = request.headers.get("x-internal-token");
    if (got !== expected) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  // -------- Body --------
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const pedidoRef = (body.pedido_id || "").trim();
  if (!pedidoRef) {
    return Response.json(
      { ok: false, error: "pedido_id_requerido" },
      { status: 400 }
    );
  }

  // -------- Query pedido (por uuid o por codigo) --------
  const sb = getSupabase();
  const esUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      pedidoRef
    );

  const q = sb
    .from("pedidos")
    .select("id, pedido_codigo, cliente_nombre, cliente_telefono, total, estado");

  const { data, error } = esUuid
    ? await q.eq("id", pedidoRef).maybeSingle()
    : await q.eq("pedido_codigo", pedidoRef).maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[notificar-wa] supabase error", error);
    return Response.json(
      { ok: false, error: "db_error", detail: error.message },
      { status: 500 }
    );
  }
  if (!data) {
    return Response.json(
      { ok: false, error: "pedido_no_encontrado" },
      { status: 404 }
    );
  }

  const pedido = data as PedidoRow;

  if (!pedido.cliente_telefono) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: "sin_telefono",
      pedido_codigo: pedido.pedido_codigo,
    });
  }

  // -------- Decidir evento --------
  const evento: "creado" | "pagado" = decidirEvento(body.evento, pedido.estado);

  // -------- Enviar template --------
  const cliente = pedido.cliente_nombre || "cliente";
  const codigo = pedido.pedido_codigo || pedido.id.slice(0, 8);
  const totalStr = Number(pedido.total || 0).toFixed(2);

  let result: WaSendResult;
  if (evento === "creado") {
    result = await sendTemplate(pedido.cliente_telefono, WA_TEMPLATES.pedidoCreado, [
      { type: "text", text: codigo },
      { type: "text", text: cliente },
      { type: "text", text: `S/ ${totalStr}` },
    ]);
  } else {
    result = await sendTemplate(pedido.cliente_telefono, WA_TEMPLATES.pedidoPagado, [
      { type: "text", text: codigo },
      { type: "text", text: body.link_boleta || "" },
    ]);
  }

  return Response.json({
    ok: true,
    pedido_codigo: codigo,
    evento,
    resultado: result,
  });
}

function decidirEvento(
  requested: Body["evento"],
  estado: string | null
): "creado" | "pagado" {
  if (requested === "creado" || requested === "pagado") return requested;
  // auto: si el pedido está pagado/confirmado/preparando/enviado → pagado
  const e = (estado || "").toLowerCase();
  if (e === "pagado" || e === "confirmado" || e === "preparando" || e === "enviado" || e === "entregado") {
    return "pagado";
  }
  return "creado";
}
