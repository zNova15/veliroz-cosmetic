import "server-only";

/* ============================================================
   Nubefact — emisor de comprobantes electrónicos (SUNAT PE).
   -------------------------------------------------------------
   Doc oficial: https://www.nubefact.com/api_documentacion
   Nubefact expone UN endpoint POST único (`api_url` del cliente) que
   acepta un JSON con la operación (generar_comprobante_v2, anular, etc.)
   y responde con `enlace_del_pdf`, `enlace_del_xml`, `cadena_para_codigo_qr`,
   `codigo_hash`, `aceptada_por_sunat`, `sunat_description`, etc.

   Env vars (todas leídas lazy):
     - NUBEFACT_TOKEN            token privado por RUC (Header Authorization: Bearer …)
     - NUBEFACT_RUC_EMISOR       11 dígitos, en payload como `ruc_emisor`  (opcional; Nubefact ya lo asocia al token)
     - NUBEFACT_SERIE_BOLETA     ej. "B001"
     - NUBEFACT_SERIE_FACTURA    ej. "F001"
     - NUBEFACT_URL              endpoint por cuenta (ej. https://api.nubefact.com/api/v1/xxxxx). Sin default: fatal si falta.

   NOTA: Nubefact NO auto-genera el correlativo — cada emisor lleva su
   correlativo. Usamos `pedidos.correlativo_nubefact` (bigserial en la
   mig 011) para persistir el próximo número. Este módulo solo arma
   el request y postea; la persistencia queda en el route handler.
   ============================================================ */

export interface NubefactLinea {
  /** Descripción (nombre producto + variante). */
  descripcion: string;
  /** Código interno (SKU). */
  codigo_interno?: string;
  /** Unidad SUNAT — 'NIU' para "unidad" (por defecto). */
  unidad_de_medida?: string;
  cantidad: number;
  /** Precio SIN IGV. */
  valor_unitario: number;
  /** Precio CON IGV. */
  precio_unitario: number;
  descuento?: number;
  /** 10 = gravado, 20 = exonerado, 30 = inafecto. */
  tipo_de_igv?: number;
  /** IGV monto (18% de valor_unitario × cantidad si gravado). */
  igv: number;
  /** Subtotal SIN IGV. */
  subtotal: number;
  /** Total (subtotal + igv). */
  total: number;
  /** Código anexo del producto (opcional). */
  anexo?: string;
}

export interface EmitirComprobanteInput {
  /** 1 = factura, 2 = boleta. */
  tipo_de_comprobante: 1 | 2;
  serie: string;
  numero: number;
  /** ISO YYYY-MM-DD. */
  fecha_de_emision: string;
  /** 6 = RUC (factura), 1 = DNI (boleta), 0 = varios. */
  cliente_tipo_de_documento: 1 | 4 | 6 | 7 | 0;
  cliente_numero_de_documento: string;
  cliente_denominacion: string;
  cliente_direccion?: string;
  cliente_email?: string;
  moneda: 1 | 2; // 1 soles, 2 dólares
  tipo_de_cambio?: number;
  porcentaje_de_igv?: number;
  descuento_global?: number;
  total_descuento?: number;
  total_anticipo?: number;
  total_gravada?: number;
  total_inafecta?: number;
  total_exonerada?: number;
  total_igv?: number;
  total_gratuita?: number;
  total_otros_cargos?: number;
  total: number;
  percepcion_tipo?: number;
  percepcion_base_imponible?: number;
  total_percepcion?: number;
  total_incluido_percepcion?: number;
  detraccion?: boolean;
  observaciones?: string;
  /** '1' = ninguna | '2' = anticipo | '4' = venta interna. */
  documento_que_se_modifica_tipo?: number | null;
  documento_que_se_modifica_serie?: string | null;
  documento_que_se_modifica_numero?: number | null;
  tipo_de_nota_de_credito?: number | null;
  tipo_de_nota_de_debito?: number | null;
  enviar_automaticamente_a_la_sunat: boolean;
  enviar_automaticamente_al_cliente: boolean;
  codigo_unico?: string;
  condiciones_de_pago?: string;
  medio_de_pago?: string;
  placa_vehiculo?: string;
  orden_compra_servicio?: string;
  tabla_personalizada_codigo?: string | null;
  formato_de_pdf?: "" | "A4" | "A5" | "TICKET";
  items: NubefactLinea[];
  guias?: unknown[];
  venta_al_credito?: unknown[];
}

export interface NubefactSuccess {
  ok: true;
  tipo_de_comprobante: number;
  serie: string;
  numero: number;
  enlace_del_pdf?: string;
  enlace_del_xml?: string;
  enlace_del_cdr?: string;
  aceptada_por_sunat?: boolean;
  sunat_description?: string;
  sunat_note?: string;
  sunat_responsecode?: string;
  sunat_soap_error?: string;
  cadena_para_codigo_qr?: string;
  codigo_hash?: string;
  enlace?: string;
  raw: unknown;
}

export interface NubefactFail {
  ok: false;
  errors: string;
  status?: number;
  raw?: unknown;
}

export type NubefactResult = NubefactSuccess | NubefactFail;

export function nubefactDisponible(): boolean {
  return !!process.env.NUBEFACT_TOKEN && !!process.env.NUBEFACT_URL;
}

/**
 * Post genérico contra la URL de Nubefact asociada al RUC del emisor.
 * `operacion` se agrega al body — Nubefact soporta varias operaciones
 * pero aquí exponemos únicamente `generar_comprobante`.
 */
async function nubefactPost(body: Record<string, unknown>): Promise<NubefactResult> {
  const url = process.env.NUBEFACT_URL;
  const token = process.env.NUBEFACT_TOKEN;
  if (!url || !token) {
    return { ok: false, errors: "NUBEFACT_TOKEN o NUBEFACT_URL no configurados." };
  }

  let raw: unknown = null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Token token="${token}"`,
      },
      body: JSON.stringify(body),
      // Nubefact suele responder en <2s; con 15s cubrimos picos.
      signal: AbortSignal.timeout(15000),
    });
    raw = await res.json().catch(() => null);
    if (!res.ok) {
      const errors =
        (raw as { errors?: string })?.errors ??
        `HTTP ${res.status} en Nubefact.`;
      return { ok: false, errors, status: res.status, raw };
    }
    const data = raw as {
      errors?: string;
      tipo_de_comprobante?: number;
      serie?: string;
      numero?: number;
      enlace_del_pdf?: string;
      enlace_del_xml?: string;
      enlace_del_cdr?: string;
      aceptada_por_sunat?: boolean;
      sunat_description?: string;
      sunat_note?: string;
      sunat_responsecode?: string;
      sunat_soap_error?: string;
      cadena_para_codigo_qr?: string;
      codigo_hash?: string;
      enlace?: string;
    };
    if (data.errors) {
      return { ok: false, errors: data.errors, raw };
    }
    return {
      ok: true,
      tipo_de_comprobante: data.tipo_de_comprobante ?? 0,
      serie: data.serie ?? "",
      numero: data.numero ?? 0,
      enlace_del_pdf: data.enlace_del_pdf,
      enlace_del_xml: data.enlace_del_xml,
      enlace_del_cdr: data.enlace_del_cdr,
      aceptada_por_sunat: data.aceptada_por_sunat,
      sunat_description: data.sunat_description,
      sunat_note: data.sunat_note,
      sunat_responsecode: data.sunat_responsecode,
      sunat_soap_error: data.sunat_soap_error,
      cadena_para_codigo_qr: data.cadena_para_codigo_qr,
      codigo_hash: data.codigo_hash,
      enlace: data.enlace,
      raw,
    };
  } catch (err) {
    return {
      ok: false,
      errors: err instanceof Error ? err.message : "Error de red con Nubefact.",
      raw,
    };
  }
}

/* -------------------- Helpers de armado -------------------- */

const IGV_TASA = 0.18;

/** Fila básica de línea del pedido (lo que necesita el emisor). */
export interface PedidoLineaMinima {
  sku: string;
  nombre: string;
  cantidad: number;
  /** Precio unitario CON IGV, tal cual lo pagó el cliente. */
  precio_unitario: number;
}

/** Datos mínimos del pedido para armar el comprobante. */
export interface PedidoParaEmision {
  pedido_codigo: string;
  tipo_comprobante: "boleta" | "factura";
  documento: string; // DNI o RUC
  razon_social?: string | null;
  cliente_email?: string | null;
  direccion_fiscal?: string | null;
  cliente_nombre?: string | null;
  costo_envio?: number;
  descuento?: number;
  /** Correlativo asignado por nuestra BD (bigserial). */
  correlativo: number;
  lineas: PedidoLineaMinima[];
}

/** Convierte precio con IGV → valor sin IGV. */
function stripIgv(pcuConIgv: number): number {
  return +(pcuConIgv / (1 + IGV_TASA)).toFixed(6);
}

/**
 * Arma el request de Nubefact a partir del pedido + emite.
 *
 * Reglas Perú:
 *   - Boleta: cliente_tipo_de_documento = 1 (DNI). Serie 'B...'.
 *   - Factura: cliente_tipo_de_documento = 6 (RUC). Serie 'F...'. Requiere razon_social + direccion_fiscal.
 *   - IGV 18% incluido en precio final → descomponemos gravada/igv.
 *   - Envío se pasa como línea (concepto "Envío", igv 18%).
 */
export async function emitirComprobante(
  pedido: PedidoParaEmision
): Promise<NubefactResult> {
  const esFactura = pedido.tipo_comprobante === "factura";
  const serie = esFactura
    ? process.env.NUBEFACT_SERIE_FACTURA ?? "F001"
    : process.env.NUBEFACT_SERIE_BOLETA ?? "B001";

  if (esFactura) {
    if (!pedido.razon_social || !pedido.direccion_fiscal) {
      return {
        ok: false,
        errors: "Factura requiere razón social y dirección fiscal del cliente.",
      };
    }
    if (!/^\d{11}$/.test(pedido.documento)) {
      return { ok: false, errors: "RUC inválido (11 dígitos)." };
    }
  } else if (!/^\d{8}$/.test(pedido.documento)) {
    return { ok: false, errors: "DNI inválido (8 dígitos)." };
  }

  // Armamos ítems + envío.
  const itemsBase: PedidoLineaMinima[] = [...pedido.lineas];
  if (pedido.costo_envio && pedido.costo_envio > 0) {
    itemsBase.push({
      sku: "ENVIO",
      nombre: "Envío",
      cantidad: 1,
      precio_unitario: pedido.costo_envio,
    });
  }

  const items: NubefactLinea[] = itemsBase.map((l) => {
    const valorUnit = stripIgv(l.precio_unitario);
    const subtotal = +(valorUnit * l.cantidad).toFixed(2);
    const total = +(l.precio_unitario * l.cantidad).toFixed(2);
    const igv = +(total - subtotal).toFixed(2);
    return {
      descripcion: l.nombre.slice(0, 250),
      codigo_interno: l.sku,
      unidad_de_medida: "NIU",
      cantidad: l.cantidad,
      valor_unitario: valorUnit,
      precio_unitario: l.precio_unitario,
      descuento: 0,
      tipo_de_igv: 10,
      igv,
      subtotal,
      total,
    };
  });

  const totalGravada = +items.reduce((a, x) => a + x.subtotal, 0).toFixed(2);
  const totalIgv = +items.reduce((a, x) => a + x.igv, 0).toFixed(2);
  const total = +(totalGravada + totalIgv).toFixed(2);

  const payload: EmitirComprobanteInput & { operacion: string } = {
    operacion: "generar_comprobante",
    tipo_de_comprobante: esFactura ? 1 : 2,
    serie,
    numero: pedido.correlativo,
    fecha_de_emision: new Date().toISOString().slice(0, 10),
    cliente_tipo_de_documento: esFactura ? 6 : 1,
    cliente_numero_de_documento: pedido.documento,
    cliente_denominacion: esFactura
      ? pedido.razon_social!.slice(0, 250)
      : (pedido.cliente_nombre ?? "CLIENTE").slice(0, 250),
    cliente_direccion: esFactura
      ? pedido.direccion_fiscal!.slice(0, 100)
      : undefined,
    cliente_email: pedido.cliente_email ?? undefined,
    moneda: 1,
    porcentaje_de_igv: 18,
    total_gravada: totalGravada,
    total_igv: totalIgv,
    total,
    total_descuento: pedido.descuento ?? 0,
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: !!pedido.cliente_email,
    codigo_unico: pedido.pedido_codigo,
    formato_de_pdf: "A4",
    items,
  };

  return nubefactPost(payload as unknown as Record<string, unknown>);
}
