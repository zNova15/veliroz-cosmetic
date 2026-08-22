import { NextResponse, type NextRequest } from "next/server";
import { hayServiceRole } from "@/lib/supabase-admin";
import {
  emitirComprobanteDePedido,
  nubefactDisponible,
  type MotivoFalloEmision,
} from "@/lib/nubefact";

/* ============================================================
   POST /api/comprobantes/emitir
   -------------------------------------------------------------
   Emite (o reintenta) la boleta/factura de un pedido ya PAGADO.
   Body: { pedido_id: uuid, force?: boolean }

   ES UNA RUTA DE RESCATE, NO EL CAMINO NORMAL. La emisión la dispara
   sola el webhook de MercadoPago cuando el pago se confirma. Esto es
   para el pedido que quedó en 'error' porque Nubefact estaba caído, o
   para el que se cargó a mano desde el CRM.

   La lógica entera vive en `emitirComprobanteDePedido` (src/lib/nubefact.ts)
   y no acá: la comparten esta ruta y el webhook, y dos implementaciones
   de la misma emisión terminan en un correlativo emitido dos veces.

   AUTENTICACIÓN, Y FALLA CERRADA. Emitir un comprobante es un acto
   tributario irreversible —ante SUNAT se deshace con nota de crédito, no
   con un DELETE— y `force:true` reemite encima de uno ya emitido. Sin
   `INTERNAL_API_TOKEN` en el entorno la ruta contesta 500 y no emite
   nada: preferimos que no funcione a que funcione para cualquiera que
   conozca la URL. Mismo header que /api/notificar-pedido-wa
   (`x-internal-token`), pero allá la variable ausente deja pasar y acá no
   — allá lo peor es un WhatsApp de más.
   ============================================================ */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EmitirBody {
  pedido_id?: string;
  /** Reemite aunque ya esté 'emitido'. Quema otro correlativo: a conciencia. */
  force?: boolean;
}

/** HTTP por motivo. El criterio es quién tiene que hacer algo con esto:
    4xx = el pedido está mal, 5xx = lo nuestro está mal. */
const STATUS_POR_MOTIVO: Record<MotivoFalloEmision, number> = {
  sin_service_role: 500,
  db_error: 500,
  pedido_no_encontrado: 404,
  pedido_no_pagado: 409,
  sin_stub: 500,
  sin_lineas: 500,
  /* 200: sin credenciales de Nubefact el reintento automático fallaría
     igual. El motivo queda escrito en comprobantes_electronicos. */
  sin_config: 200,
  correlativo_no_asignado: 500,
  /* 409 los dos: no son fallos técnicos, son pedidos que alguien tiene
     que corregir. Reintentar tal cual da exactamente el mismo error. */
  importes_no_cuadran: 409,
  datos_cliente_invalidos: 409,
  nubefact_error: 502,
};

function autorizar(
  req: NextRequest
): { ok: true } | { ok: false; status: number; error: string } {
  const esperado = process.env.INTERNAL_API_TOKEN;
  if (!esperado) {
    console.error(
      "[comprobantes/emitir] INTERNAL_API_TOKEN no configurado — no se emite."
    );
    return {
      ok: false,
      status: 500,
      error: "sin_internal_api_token",
    };
  }
  const recibido = req.headers.get("x-internal-token");
  if (!recibido || recibido !== esperado) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const auth = autorizar(req);
  if (!auth.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: auth.error,
        hint:
          auth.error === "sin_internal_api_token"
            ? "Setear INTERNAL_API_TOKEN en Vercel. Sin esa variable esta ruta no emite: un comprobante es irreversible ante SUNAT."
            : undefined,
      },
      { status: auth.status }
    );
  }

  let body: EmitirBody;
  try {
    body = (await req.json()) as EmitirBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const pedidoId = (body?.pedido_id ?? "").trim();
  if (!pedidoId) {
    return NextResponse.json(
      { ok: false, error: "pedido_id requerido" },
      { status: 400 }
    );
  }

  const res = await emitirComprobanteDePedido(pedidoId, {
    force: body.force === true,
  });

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        motivo: res.motivo,
        error: res.error,
        correlativo: res.correlativo ?? null,
        pendiente: res.motivo === "sin_config",
      },
      { status: STATUS_POR_MOTIVO[res.motivo] }
    );
  }

  return NextResponse.json({
    ok: true,
    estado: res.estado,
    idempotent: res.estado === "ya_emitido",
    serie: res.serie,
    correlativo: res.correlativo,
    pdf_url: res.pdf_url,
    xml_url: res.xml_url,
    sunat_hash: res.sunat_hash,
    sunat_description: res.sunat_description,
    /* false = SUNAT lo tiene y la base no. Hay que mirarlo a mano. */
    persistido: res.persistido,
  });
}

/* GET de diagnóstico: sólo dice si el entorno está completo, nunca los
   valores. Sirve para responder "¿ya puede emitir?" sin emitir nada. */
export async function GET(req: NextRequest) {
  /* El mismo token que el POST. Antes era público y devolvía las series de
     boleta y factura más el mapa de qué secretos están cargados: es contarle
     el estado de configuración del emisor tributario a cualquiera que pruebe
     la URL. */
  const auth = autorizar(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }

  /* Las SERIES no se devuelven, ni siquiera con token. Sólo hacen falta
     para saber si están configuradas, y ese dato ya está en el booleano.
     Un diagnóstico no tiene por qué revelar la numeración tributaria. */
  return NextResponse.json({
    ok: true,
    endpoint: "comprobantes_emitir",
    ready:
      nubefactDisponible() &&
      hayServiceRole() &&
      Boolean(process.env.NUBEFACT_SERIE_BOLETA),
    nubefact: nubefactDisponible(),
    service_role: hayServiceRole(),
    series_configuradas: Boolean(
      process.env.NUBEFACT_SERIE_BOLETA && process.env.NUBEFACT_SERIE_FACTURA
    ),
  });
}
