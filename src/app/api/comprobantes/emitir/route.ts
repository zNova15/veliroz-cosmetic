import { NextResponse, type NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  emitirComprobante,
  nubefactDisponible,
  type PedidoLineaMinima,
} from "@/lib/nubefact";

/* ============================================================
   POST /api/comprobantes/emitir
   -------------------------------------------------------------
   Emite boleta o factura en Nubefact para un pedido ya PAGADO.

   Body: { pedido_id: uuid }

   Flujo:
     1. Traemos pedido + lineas_pedido + comprobante_stub (mig 011 crea
        la fila en comprobantes_electronicos con estado_emision='pendiente'
        via trigger cuando el pedido pasa a 'pagado').
     2. Reservamos correlativo (el trigger de mig 011 lo asigna al crear
        la fila stub; si vino en null, lo tomamos del bigserial ahora).
     3. POST a Nubefact.
     4. UPDATE comprobantes_electronicos con xml_url, pdf_url, cdr_estado,
        sunat_hash, estado_emision='emitido'|'error', ultimo_error.

   Idempotencia:
     Si el comprobante ya tiene estado_emision='emitido', devolvemos el
     resultado guardado sin re-emitir (correlativo es único e irreversible
     ante SUNAT).

   Errores:
     - Sin NUBEFACT_TOKEN → estado_emision='error', ultimo_error, 200 OK
       (para no spammear reintentos automáticos que fallarían igual).
     - Fallo de red / SUNAT rechaza → estado_emision='error', 502.
   ============================================================ */

export const runtime = "nodejs";

interface EmitirBody {
  pedido_id?: string;
  /** Fuerza re-emisión aun si ya está 'emitido'. Solo para operaciones. */
  force?: boolean;
}

interface PedidoRow {
  id: string;
  pedido_codigo: string;
  estado: string;
  tipo_comprobante: "boleta" | "factura";
  documento: string;
  razon_social: string | null;
  direccion_fiscal: string | null;
  cliente_nombre: string | null;
  cliente_email: string | null;
  costo_envio: number | null;
  descuento: number | null;
}

interface LineaRow {
  sku: string;
  nombre_snapshot: string | null;
  cantidad: number;
  precio_unitario: number;
}

interface ComprobanteRow {
  id: string;
  pedido_id: string;
  tipo: "boleta" | "factura";
  serie: string | null;
  correlativo: number | null;
  estado_emision: string;
  pdf_url: string | null;
  xml_url: string | null;
  sunat_hash: string | null;
  cdr_estado: string | null;
  ultimo_error: string | null;
}

export async function POST(req: NextRequest) {
  let body: EmitirBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body?.pedido_id) {
    return NextResponse.json(
      { ok: false, error: "pedido_id requerido" },
      { status: 400 }
    );
  }

  const sb = getSupabase();

  // 1. Pedido
  const { data: pedido, error: pedidoErr } = await sb
    .from("pedidos")
    .select(
      "id, pedido_codigo, estado, tipo_comprobante, documento, razon_social, direccion_fiscal, cliente_nombre, cliente_email, costo_envio, descuento"
    )
    .eq("id", body.pedido_id)
    .maybeSingle<PedidoRow>();

  if (pedidoErr) {
    return NextResponse.json(
      { ok: false, error: pedidoErr.message },
      { status: 500 }
    );
  }
  if (!pedido) {
    return NextResponse.json(
      { ok: false, error: "pedido_no_encontrado" },
      { status: 404 }
    );
  }
  if (pedido.estado !== "pagado" && pedido.estado !== "enviado" && pedido.estado !== "entregado") {
    return NextResponse.json(
      { ok: false, error: `pedido_no_pagado (estado=${pedido.estado})` },
      { status: 409 }
    );
  }

  // 2. Comprobante stub creado por trigger (mig 011)
  const { data: compRow, error: compErr } = await sb
    .from("comprobantes_electronicos")
    .select("id, pedido_id, tipo, serie, correlativo, estado_emision, pdf_url, xml_url, sunat_hash, cdr_estado, ultimo_error")
    .eq("pedido_id", pedido.id)
    .maybeSingle<ComprobanteRow>();

  if (compErr) {
    return NextResponse.json({ ok: false, error: compErr.message }, { status: 500 });
  }
  if (!compRow) {
    return NextResponse.json(
      { ok: false, error: "comprobante_stub_no_creado (revisar trigger mig 011)" },
      { status: 500 }
    );
  }

  // Idempotencia: ya emitido.
  if (compRow.estado_emision === "emitido" && !body.force) {
    return NextResponse.json({
      ok: true,
      idempotent: true,
      correlativo: compRow.correlativo,
      serie: compRow.serie,
      pdf_url: compRow.pdf_url,
      xml_url: compRow.xml_url,
      sunat_hash: compRow.sunat_hash,
    });
  }

  // 3. Líneas
  const { data: lineas, error: lineasErr } = await sb
    .from("lineas_pedido")
    .select("sku, nombre_snapshot, cantidad, precio_unitario")
    .eq("pedido_id", pedido.id)
    .returns<LineaRow[]>();

  if (lineasErr) {
    return NextResponse.json({ ok: false, error: lineasErr.message }, { status: 500 });
  }
  if (!lineas || lineas.length === 0) {
    return NextResponse.json(
      { ok: false, error: "pedido_sin_lineas" },
      { status: 500 }
    );
  }

  // 4. Fallo controlado si Nubefact no está seteado (no explotamos).
  if (!nubefactDisponible()) {
    await sb
      .from("comprobantes_electronicos")
      .update({
        estado_emision: "error",
        ultimo_error: "NUBEFACT_TOKEN o NUBEFACT_URL no configurado",
      })
      .eq("id", compRow.id);
    return NextResponse.json({
      ok: false,
      error: "NUBEFACT_TOKEN no configurado",
      pendiente: true,
    });
  }

  // 5. Correlativo (bigserial asignado por trigger). Si vino null, es un bug
  //    en la migración → fallamos ruidoso.
  if (!compRow.correlativo) {
    return NextResponse.json(
      { ok: false, error: "correlativo_no_asignado" },
      { status: 500 }
    );
  }

  const lineasMin: PedidoLineaMinima[] = lineas.map((l) => ({
    sku: l.sku,
    nombre: l.nombre_snapshot ?? l.sku,
    cantidad: l.cantidad,
    precio_unitario: Number(l.precio_unitario),
  }));

  const result = await emitirComprobante({
    pedido_codigo: pedido.pedido_codigo,
    tipo_comprobante: pedido.tipo_comprobante,
    documento: pedido.documento,
    razon_social: pedido.razon_social,
    direccion_fiscal: pedido.direccion_fiscal,
    cliente_nombre: pedido.cliente_nombre,
    cliente_email: pedido.cliente_email,
    costo_envio: pedido.costo_envio ?? 0,
    descuento: pedido.descuento ?? 0,
    correlativo: compRow.correlativo,
    lineas: lineasMin,
  });

  if (!result.ok) {
    await sb
      .from("comprobantes_electronicos")
      .update({
        estado_emision: "error",
        ultimo_error: result.errors.slice(0, 500),
      })
      .eq("id", compRow.id);
    return NextResponse.json(
      { ok: false, error: result.errors, correlativo: compRow.correlativo },
      { status: 502 }
    );
  }

  const patch = {
    estado_emision: "emitido",
    xml_url: result.enlace_del_xml ?? null,
    pdf_url: result.enlace_del_pdf ?? null,
    cdr_estado: result.aceptada_por_sunat === true ? "aceptado" : result.sunat_description ?? null,
    sunat_hash: result.codigo_hash ?? null,
    serie: result.serie ?? compRow.serie,
    correlativo: result.numero ?? compRow.correlativo,
    ultimo_error: null,
    fecha_emision: new Date().toISOString(),
  };

  const { error: updErr } = await sb
    .from("comprobantes_electronicos")
    .update(patch)
    .eq("id", compRow.id);

  if (updErr) {
    // Emitido en SUNAT pero no persistió local → devolvemos ok con warning.
    console.error("[comprobantes/emitir] update local falló tras emisión:", updErr);
    return NextResponse.json({
      ok: true,
      warning: "emitido_sin_persistir_local",
      persist_error: updErr.message,
      correlativo: result.numero,
      pdf_url: result.enlace_del_pdf,
      xml_url: result.enlace_del_xml,
    });
  }

  return NextResponse.json({
    ok: true,
    correlativo: result.numero,
    serie: result.serie,
    pdf_url: result.enlace_del_pdf,
    xml_url: result.enlace_del_xml,
    sunat_hash: result.codigo_hash,
    sunat_description: result.sunat_description,
  });
}

// GET diagnostic — util para probar que la env var está.
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "comprobantes_emitir",
    ready: nubefactDisponible(),
    serie_boleta: process.env.NUBEFACT_SERIE_BOLETA ?? null,
    serie_factura: process.env.NUBEFACT_SERIE_FACTURA ?? null,
  });
}
