import "server-only";

import { getSupabaseAdmin, hayServiceRole } from "@/lib/supabase-admin";

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

   NOTA: Nubefact NO auto-genera el correlativo — cada emisor lleva el
   suyo. El número sale de `comprobantes_electronicos.correlativo`, que
   asigna el trigger de la mig 011 cuando el pedido pasa a 'pagado'
   (`pedidos.correlativo_nubefact`, que decía este comentario, no existe:
   verificado contra la base el 21-ago-2026).

   Este módulo tiene dos capas:
     1. `emitirComprobante()` — arma el JSON y postea. Sin base de datos.
     2. `emitirComprobanteDePedido()` — el flujo completo: lee el pedido,
        emite y persiste. Vive acá y no en el route handler porque lo
        llaman DOS caminos (el webhook de MercadoPago y la ruta interna
        /api/comprobantes/emitir) y una emisión con dos implementaciones
        distintas es una emisión duplicada esperando el momento.
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
  /** DD-MM-YYYY, el formato que documenta Nubefact ("18-09-2018"). */
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
  /** Presente sólo cuando el fallo lo detectamos NOSOTROS antes de
      postear: sirve para distinguir "el pedido está mal" (hay que
      mirarlo a mano) de "Nubefact rechazó" (se reintenta). */
  codigo?: "datos_cliente" | "importe_cero" | "importes_no_cuadran";
}

export type NubefactResult = NubefactSuccess | NubefactFail;

/* ============================================================
   ¿El comprobante existe en Nubefact aunque el POST haya fallado?

   POR QUÉ EXISTE: `nubefactPost` corta a los 15 s. Si Nubefact ya recibió
   la emisión y SUNAT la aceptó, pero la respuesta no vuelve a tiempo —o
   se corta la red en el medio—, el catch devuelve ok:false y el llamador
   marca estado_emision='error'. El comprobante EXISTE ante SUNAT, con su
   correlativo consumido, y nuestra base dice que no.

   Ese es el peor estado posible del sistema: no se puede reintentar
   (Nubefact rechaza el duplicado) ni se puede entregar el PDF a la
   clienta, y el correlativo queda en un limbo que sólo se resuelve
   mirando el portal de SUNAT a mano.

   Nubefact expone `consultar_comprobante` justamente para esto. Se
   consulta ANTES de dar la emisión por fallida.
   ============================================================ */
async function consultarComprobante(
  tipo: 1 | 2,
  serie: string,
  numero: number
): Promise<NubefactResult> {
  return nubefactPost({
    operacion: "consultar_comprobante",
    tipo_de_comprobante: tipo,
    serie,
    numero,
  });
}

/* Un fallo cuyo texto habla de duplicado NO es un fallo: es la prueba de
   que la emisión anterior entró. Nubefact responde distinto según el
   caso, así que se buscan las variantes en vez de un código exacto. */
function pareceDuplicado(errors: string | undefined): boolean {
  const e = (errors ?? "").toLowerCase();
  return (
    e.includes("duplicad") ||
    e.includes("ya existe") ||
    e.includes("ya fue registrado") ||
    e.includes("ya se encuentra registrado") ||
    e.includes("ya ha sido")
  );
}

/* Un corte de red o un timeout deja el resultado INDETERMINADO: puede que
   la emisión haya entrado igual. Se distingue de un rechazo real, donde
   Nubefact sí contestó. */
function fueIndeterminado(r: { status?: number; errors?: string }): boolean {
  if (typeof r.status === "number") return r.status >= 500;
  const e = (r.errors ?? "").toLowerCase();
  return (
    e.includes("timeout") ||
    e.includes("abort") ||
    e.includes("network") ||
    e.includes("fetch failed") ||
    e.includes("econnreset")
  );
}

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
  /** Cupón + crédito de referido, en soles y CON IGV (así lo guarda `pedidos`). */
  descuento?: number;
  /**
   * `pedidos.total` — lo que la clienta pagó de verdad. No se usa para
   * calcular nada: se usa para NEGARSE a emitir si la suma del
   * comprobante no da ese mismo número. Un comprobante por un importe
   * distinto al cobrado no se corrige, se anula con nota de crédito.
   */
  total_pedido?: number;
  /** Correlativo asignado por nuestra BD (bigserial). */
  correlativo: number;
  lineas: PedidoLineaMinima[];
}

/** Convierte precio con IGV → valor sin IGV. */
function stripIgv(pcuConIgv: number): number {
  return +(pcuConIgv / (1 + IGV_TASA)).toFixed(6);
}

/** Soles con dos decimales — todos los importes que ven Nubefact y SUNAT. */
function round2(n: number): number {
  return +n.toFixed(2);
}

/* Perú es UTC-5 todo el año (no aplica horario de verano), pero el server
   corre en UTC. `new Date().toISOString().slice(0,10)` fechaba con el día
   SIGUIENTE todo lo pagado entre las 19:00 de Lima y la medianoche — y la
   fecha de emisión de una boleta no se corrige con un UPDATE: se anula con
   nota de crédito. Va con Intl en zona America/Lima y no restando cinco
   horas a mano, que es cierto hoy pero es una constante disfrazada de regla.

   El formato es DD-MM-YYYY porque es el que documenta Nubefact
   ("fecha_de_emision": "18-09-2018"). El ISO parecía más seguro, pero si
   validan con strptime('%d-%m-%Y') el ISO no entra; al revés, DD-MM-YYYY
   lo parsean tanto su ejemplo como Ruby. */
/* ⚠️ FORMATO SIN VERIFICAR CONTRA LA API REAL.
   Nubefact documenta las fechas como '18-09-2018' (DD-MM-YYYY) y ese es
   el formato que devuelve esta función, pero no hubo credenciales para
   confirmarlo. Si validan YYYY-MM-DD, TODA boleta rebota — el fallo es
   cerrado (rebota antes de que SUNAT tenga nada), pero la primera venta
   real se queda sin comprobante hasta que alguien lo mire.
   Si rebota, es un solo return acá abajo.
   La zona horaria sí está resuelta: Intl con America/Lima, porque
   toISOString() es UTC y los pedidos entre las 19:00 y medianoche de
   Lima salían con la fecha del día siguiente. */
function fechaEmisionLima(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ahora);
  const parte = (tipo: "year" | "month" | "day"): string =>
    partes.find((p) => p.type === tipo)?.value ?? "";
  return `${parte("day")}-${parte("month")}-${parte("year")}`;
}

/**
 * Reparte el descuento del pedido (cupón y/o crédito de referido, un solo
 * monto CON IGV sobre el total) entre las líneas, proporcional a lo que
 * pesa cada una.
 *
 * POR QUÉ PRORRATEAR Y NO MANDAR UN DESCUENTO GLOBAL: SUNAT quiere la base
 * imponible ya neta y la suma de los ítems tiene que dar el total del
 * comprobante. Antes se mandaba `descuento: 0` en cada línea y el total se
 * armaba sumando líneas + envío sin restar nada: toda boleta con cupón o
 * con referido salía por MÁS de lo que la clienta pagó.
 *
 * El último renglón absorbe el céntimo del redondeo — si cada parte se
 * redondea por su cuenta la suma se desvía y el comprobante deja de cuadrar
 * con el cobro por uno o dos céntimos.
 */
function prorratearDescuento(brutos: number[], descuento: number): number[] {
  const brutoTotal = round2(brutos.reduce((a, b) => a + b, 0));
  const aRepartir = Math.min(Math.max(descuento, 0), brutoTotal);
  if (aRepartir === 0 || brutoTotal === 0) return brutos.map(() => 0);

  const partes: number[] = [];
  let acumulado = 0;
  brutos.forEach((bruto, i) => {
    const esUltima = i === brutos.length - 1;
    const parte = esUltima
      ? round2(aRepartir - acumulado)
      : round2((aRepartir * bruto) / brutoTotal);
    /* Ninguna línea puede descontar más de lo que vale: pasaría con un
       descuento concentrado en la última. Si eso recorta el reparto, la
       suma no da y la verificación de más abajo frena la emisión. */
    const acotada = Math.max(0, Math.min(parte, bruto));
    acumulado = round2(acumulado + acotada);
    partes.push(acotada);
  });
  return partes;
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

  const razonSocial = pedido.razon_social ?? "";
  const direccionFiscal = pedido.direccion_fiscal ?? "";

  if (esFactura) {
    if (!razonSocial || !direccionFiscal) {
      return {
        ok: false,
        errors: "Factura requiere razón social y dirección fiscal del cliente.",
        codigo: "datos_cliente",
      };
    }
    if (!/^\d{11}$/.test(pedido.documento)) {
      return {
        ok: false,
        errors: "RUC inválido (11 dígitos).",
        codigo: "datos_cliente",
      };
    }
  } else if (!/^\d{8}$/.test(pedido.documento ?? "")) {
    /* El checkout web exige DNI de 8 dígitos, así que esto sólo salta en
       pedidos cargados a mano. Se frena ANTES de tocar Nubefact: un
       correlativo quemado con un documento inválido no se recupera. */
    return {
      ok: false,
      errors: `DNI inválido (8 dígitos) en el pedido ${pedido.pedido_codigo}.`,
      codigo: "datos_cliente",
    };
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

  /* Bruto por línea = lo que costaría sin descuento, con IGV. Es la base
     del prorrateo y también lo que suma `pedidos.subtotal` + envío. */
  const brutos = itemsBase.map((l) => round2(l.precio_unitario * l.cantidad));
  const descuentosConIgv = prorratearDescuento(brutos, pedido.descuento ?? 0);

  const items: NubefactLinea[] = itemsBase.map((l, i) => {
    const valorUnit = stripIgv(l.precio_unitario);
    const bruto = brutos[i];
    const descLinea = descuentosConIgv[i];
    /* Lo que la clienta pagó por esta línea, ya con el descuento aplicado. */
    const neto = round2(bruto - descLinea);
    /* Valor de venta ANTES del descuento: contra esto se mide el descuento
       del ítem, que ante SUNAT va sin IGV porque reduce la base imponible. */
    const baseBruta = round2(valorUnit * l.cantidad);
    /* Sin descuento se conserva la aritmética de siempre (subtotal =
       valor unitario × cantidad); con descuento el subtotal se deriva del
       neto, para que subtotal + igv dé exactamente lo cobrado. */
    const subtotal = descLinea === 0 ? baseBruta : round2(neto / (1 + IGV_TASA));
    const igv = round2(neto - subtotal);
    const total = round2(subtotal + igv);
    return {
      descripcion: l.nombre.slice(0, 250),
      codigo_interno: l.sku,
      unidad_de_medida: "NIU",
      cantidad: l.cantidad,
      valor_unitario: valorUnit,
      precio_unitario: l.precio_unitario,
      descuento: Math.max(0, round2(baseBruta - subtotal)),
      tipo_de_igv: 10,
      igv,
      subtotal,
      total,
    };
  });

  const totalGravada = round2(items.reduce((a, x) => a + x.subtotal, 0));
  const totalIgv = round2(items.reduce((a, x) => a + x.igv, 0));
  const totalDescuento = round2(
    items.reduce((a, x) => a + (x.descuento ?? 0), 0)
  );
  const total = round2(totalGravada + totalIgv);

  /* Un comprobante por S/ 0 no es un comprobante: pasaría con un descuento
     que se come el pedido entero. Se frena acá y no en Nubefact, para no
     gastar el correlativo en algo que SUNAT rechaza. */
  if (total <= 0) {
    return {
      ok: false,
      errors: `El comprobante del pedido ${pedido.pedido_codigo} sumaría S/ ${total.toFixed(2)}. No se emite.`,
      codigo: "importe_cero",
    };
  }

  /* La verificación que evita la nota de crédito: el comprobante tiene que
     sumar exactamente lo que se cobró (`pedidos.total` = subtotal −
     descuento + envío, ver mig 020). Si no cuadra, NO se emite: un
     comprobante mal emitido ante SUNAT no se edita, se anula. Un céntimo
     de tolerancia por los redondeos línea a línea. */
  if (typeof pedido.total_pedido === "number") {
    const diferencia = Math.abs(round2(total - pedido.total_pedido));
    if (diferencia > 0.01) {
      return {
        ok: false,
        errors:
          `Los importes no cuadran: el comprobante sumaría S/ ${total.toFixed(2)} ` +
          `y el pedido ${pedido.pedido_codigo} cobró S/ ${pedido.total_pedido.toFixed(2)} ` +
          `(descuento S/ ${(pedido.descuento ?? 0).toFixed(2)}, envío S/ ` +
          `${(pedido.costo_envio ?? 0).toFixed(2)}). No se emite: revisar el pedido a mano.`,
        codigo: "importes_no_cuadran",
      };
    }
  }

  const payload: EmitirComprobanteInput & { operacion: string } = {
    operacion: "generar_comprobante",
    tipo_de_comprobante: esFactura ? 1 : 2,
    serie,
    numero: pedido.correlativo,
    fecha_de_emision: fechaEmisionLima(),
    cliente_tipo_de_documento: esFactura ? 6 : 1,
    cliente_numero_de_documento: pedido.documento,
    /* Los datos de factura ya se validaron arriba; se leen en constantes
       en vez de con `!` para que el compilador siga cuidando el caso. */
    cliente_denominacion: (esFactura
      ? razonSocial
      : pedido.cliente_nombre ?? "CLIENTE"
    ).slice(0, 250),
    cliente_direccion: esFactura ? direccionFiscal.slice(0, 100) : undefined,
    cliente_email: pedido.cliente_email ?? undefined,
    moneda: 1,
    porcentaje_de_igv: 18,
    total_gravada: totalGravada,
    total_igv: totalIgv,
    total,
    /* La suma de los descuentos de los ítems, sin IGV — no el descuento
       del pedido, que viene con IGV. Mandarlo con IGV descuadraba el
       comprobante contra su propio detalle. */
    total_descuento: totalDescuento,
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: !!pedido.cliente_email,
    codigo_unico: pedido.pedido_codigo,
    formato_de_pdf: "A4",
    items,
  };

  return nubefactPost(payload as unknown as Record<string, unknown>);
}

/* ============================================================
   Emisión de punta a punta desde el id del pedido.
   -------------------------------------------------------------
   POR QUÉ VIVE ACÁ Y NO EN EL ROUTE HANDLER: la emisión la disparan dos
   caminos —el webhook de MercadoPago cuando el pago se confirma, y la
   ruta interna /api/comprobantes/emitir para reintentar a mano—. Con la
   lógica duplicada, el día que una de las dos cambie el correlativo se
   emite dos veces o no se emite ninguna.

   CON service_role, NUNCA CON LA ANON. `pedidos` y
   `comprobantes_electronicos` tienen RLS y la clave anon no la
   atraviesa; PostgREST no dice "prohibido", dice 200 con cero filas
   (ver src/lib/supabase-admin.ts). Con la anon esta función leía "no hay
   comprobante stub" para todos los pedidos del mundo.
   ============================================================ */

/** Estados en los que un pedido ya está cobrado y corresponde emitir.
    Salen de `pedidos_estado_check` (001_schema): nuevo | pagado |
    preparando | en_reparto | entregado | cancelado. 'enviado', que
    figuraba antes en la ruta, no es un estado válido de esta base. */
const ESTADOS_FACTURABLES = new Set([
  "pagado",
  "preparando",
  "en_reparto",
  "entregado",
]);

export type MotivoFalloEmision =
  | "sin_service_role"
  | "db_error"
  | "pedido_no_encontrado"
  | "pedido_no_pagado"
  | "sin_stub"
  | "sin_lineas"
  | "sin_config"
  | "correlativo_no_asignado"
  | "importes_no_cuadran"
  /* DNI/RUC que no pasa la validación de SUNAT: reintentar no lo
     arregla, hay que corregir el pedido. */
  | "datos_cliente_invalidos"
  | "nubefact_error";

export interface EmisionOk {
  ok: true;
  /** 'ya_emitido' = no se volvió a tocar SUNAT; se devolvió lo guardado. */
  estado: "emitido" | "ya_emitido";
  serie: string | null;
  correlativo: number | null;
  pdf_url: string | null;
  xml_url: string | null;
  sunat_hash: string | null;
  sunat_description: string | null;
  /** false = SUNAT ya tiene el comprobante pero la fila local no se pudo
      actualizar. Es el caso que hay que mirar a mano. */
  persistido: boolean;
}

export interface EmisionFallo {
  ok: false;
  motivo: MotivoFalloEmision;
  error: string;
  correlativo?: number | null;
}

export type EmisionPedidoResultado = EmisionOk | EmisionFallo;

interface PedidoParaComprobante {
  id: string;
  pedido_codigo: string;
  estado: string | null;
  tipo_comprobante: "boleta" | "factura" | null;
  documento: string | null;
  razon_social: string | null;
  direccion_fiscal: string | null;
  cliente_nombre: string | null;
  cliente_email: string | null;
  costo_envio: number | string | null;
  descuento: number | string | null;
  total: number | string | null;
}

/* Las columnas REALES de `lineas_pedido` (verificadas contra la base el
   21-ago-2026). Antes se pedía `sku, nombre_snapshot, precio_unitario`,
   que no existen: PostgREST respondía 42703 y la ruta moría antes de
   llegar a Nubefact. `producto_id` guarda el SKU en texto — lo escribe
   así la server action al armar el payload de crear_pedido. */
interface LineaParaComprobante {
  producto_id: string | null;
  nombre: string | null;
  cantidad: number | string | null;
  precio_unit: number | string | null;
}

interface StubComprobante {
  id: string;
  serie: string | null;
  correlativo: number | null;
  estado_emision: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  sunat_hash: string | null;
  cdr_estado: string | null;
  intentos: number | null;
}

function num(v: number | string | null | undefined): number {
  const n = typeof v === "string" ? Number(v) : v ?? 0;
  return Number.isFinite(n) ? Number(n) : 0;
}

/**
 * Emite (o reintenta) el comprobante de un pedido ya cobrado.
 *
 * Es idempotente: si la fila ya está en 'emitido' devuelve lo guardado
 * sin volver a llamar a Nubefact, porque el correlativo ante SUNAT es
 * irreversible. `force` salta esa guarda y es un acto tributario a
 * conciencia — la ruta que lo expone pide token.
 */
export async function emitirComprobanteDePedido(
  pedidoId: string,
  opciones: { force?: boolean } = {}
): Promise<EmisionPedidoResultado> {
  if (!hayServiceRole()) {
    return {
      ok: false,
      motivo: "sin_service_role",
      error:
        "SUPABASE_SERVICE_ROLE_KEY ausente. Con la anon key el SELECT " +
        "devuelve 0 filas SIN error y la emisión se daría por imposible " +
        "sin serlo.",
    };
  }

  const sb = getSupabaseAdmin();

  const { data: pedidoData, error: pedidoErr } = await sb
    .from("pedidos")
    .select(
      "id, pedido_codigo, estado, tipo_comprobante, documento, razon_social, direccion_fiscal, cliente_nombre, cliente_email, costo_envio, descuento, total"
    )
    .eq("id", pedidoId)
    .maybeSingle();

  if (pedidoErr) {
    return { ok: false, motivo: "db_error", error: pedidoErr.message };
  }
  const pedido = (pedidoData as PedidoParaComprobante | null) ?? null;
  if (!pedido) {
    return {
      ok: false,
      motivo: "pedido_no_encontrado",
      error: `pedido ${pedidoId} no existe`,
    };
  }
  if (!ESTADOS_FACTURABLES.has(pedido.estado ?? "")) {
    return {
      ok: false,
      motivo: "pedido_no_pagado",
      error: `el pedido ${pedido.pedido_codigo} está en '${pedido.estado}'`,
    };
  }

  /* El stub lo crea el trigger de la mig 011 al pasar a 'pagado'; ahí se
     asigna el correlativo. Si no está, el problema es del trigger y no
     hay nada que emitir. */
  const { data: stubData, error: stubErr } = await sb
    .from("comprobantes_electronicos")
    .select(
      "id, serie, correlativo, estado_emision, pdf_url, xml_url, sunat_hash, cdr_estado, intentos"
    )
    .eq("pedido_id", pedido.id)
    .maybeSingle();

  if (stubErr) {
    return { ok: false, motivo: "db_error", error: stubErr.message };
  }
  const stub = (stubData as StubComprobante | null) ?? null;
  if (!stub) {
    return {
      ok: false,
      motivo: "sin_stub",
      error: `sin fila en comprobantes_electronicos para ${pedido.pedido_codigo} (revisar el trigger de la mig 011)`,
    };
  }

  if (stub.estado_emision === "emitido" && !opciones.force) {
    return {
      ok: true,
      estado: "ya_emitido",
      serie: stub.serie,
      correlativo: stub.correlativo,
      pdf_url: stub.pdf_url,
      xml_url: stub.xml_url,
      sunat_hash: stub.sunat_hash,
      sunat_description: stub.cdr_estado,
      persistido: true,
    };
  }

  const intentos = stub.intentos ?? 0;

  /* Anota el fallo sin pisar un comprobante que YA está emitido: si dos
     reintentos del webhook se cruzan, el segundo puede recibir de
     Nubefact un "serie y número duplicados" y marcaría 'error' encima de
     una emisión buena, perdiendo el enlace al PDF. El filtro extra lo
     impide del lado del servidor. */
  const anotarError = async (mensaje: string): Promise<void> => {
    const { error } = await sb
      .from("comprobantes_electronicos")
      .update({
        estado_emision: "error",
        ultimo_error: mensaje.slice(0, 500),
        intentos: intentos + 1,
      })
      .eq("id", stub.id)
      .neq("estado_emision", "emitido");
    if (error) {
      console.error(
        "[nubefact] no se pudo anotar el error de emisión:",
        error.message
      );
    }
  };

  const { data: lineasData, error: lineasErr } = await sb
    .from("lineas_pedido")
    .select("producto_id, nombre, cantidad, precio_unit")
    .eq("pedido_id", pedido.id);

  if (lineasErr) {
    await anotarError(`lectura de líneas: ${lineasErr.message}`);
    return { ok: false, motivo: "db_error", error: lineasErr.message };
  }
  const lineas = (lineasData as LineaParaComprobante[] | null) ?? [];
  if (lineas.length === 0) {
    await anotarError("el pedido no tiene líneas");
    return {
      ok: false,
      motivo: "sin_lineas",
      error: `el pedido ${pedido.pedido_codigo} no tiene líneas`,
    };
  }

  if (!nubefactDisponible()) {
    const msg = "NUBEFACT_TOKEN o NUBEFACT_URL no configurado";
    await anotarError(msg);
    return { ok: false, motivo: "sin_config", error: msg };
  }

  if (!stub.correlativo) {
    const msg = "correlativo no asignado por el trigger de la mig 011";
    await anotarError(msg);
    return { ok: false, motivo: "correlativo_no_asignado", error: msg };
  }

  let resultado = await emitirComprobante({
    pedido_codigo: pedido.pedido_codigo,
    tipo_comprobante: pedido.tipo_comprobante === "factura" ? "factura" : "boleta",
    documento: pedido.documento ?? "",
    razon_social: pedido.razon_social,
    direccion_fiscal: pedido.direccion_fiscal,
    cliente_nombre: pedido.cliente_nombre,
    cliente_email: pedido.cliente_email,
    costo_envio: num(pedido.costo_envio),
    descuento: num(pedido.descuento),
    total_pedido: num(pedido.total),
    correlativo: stub.correlativo,
    lineas: lineas.map((l) => ({
      sku: l.producto_id ?? "",
      nombre: l.nombre ?? l.producto_id ?? "Producto",
      cantidad: num(l.cantidad),
      precio_unitario: num(l.precio_unit),
    })),
  });

  if (!resultado.ok) {
    /* Antes de marcar 'error': si el fallo fue indeterminado (timeout,
       corte, 5xx) o Nubefact dice que ya existe, el comprobante puede
       estar emitido ante SUNAT con este mismo correlativo. Preguntarle
       cuesta una llamada y evita el único estado del sistema que no se
       puede reparar desde el código. */
    if (pareceDuplicado(resultado.errors) || fueIndeterminado(resultado)) {
      const tipo: 1 | 2 = pedido.tipo_comprobante === "factura" ? 1 : 2;
      /* `serie` puede venir null si el trigger de la 011 no la escribió;
         sin serie no hay nada que consultar y se sigue al camino de error. */
      const consulta = stub.serie
        ? await consultarComprobante(tipo, stub.serie, stub.correlativo)
        : null;
      if (consulta?.ok) {
        /* Sí existía. Se sigue por el camino de éxito con los datos que
           devolvió la consulta, en vez de dejar un correlativo quemado
           marcado como error. */
        resultado = consulta;
      }
    }
  }

  if (!resultado.ok) {
    await anotarError(resultado.errors);
    /* Lo que detectamos nosotros antes de postear no se reintenta solo:
       lo tiene que mirar alguien. Lo que rechazó Nubefact (caído, timeout,
       SUNAT ocupada) sí. */
    const motivo: MotivoFalloEmision =
      resultado.codigo === "datos_cliente"
        ? "datos_cliente_invalidos"
        : resultado.codigo === "importes_no_cuadran" ||
            resultado.codigo === "importe_cero"
          ? "importes_no_cuadran"
          : "nubefact_error";
    return {
      ok: false,
      motivo,
      error: resultado.errors,
      correlativo: stub.correlativo,
    };
  }

  /* EL GUARDADO VA EN EL MISMO CAMBIO QUE EL SELECT DE ARRIBA, a propósito:
     con las columnas de lectura arregladas pero `fecha_emision` (que no
     existe) todavía escrita acá, la ruta llegaba a Nubefact, quemaba el
     correlativo ante SUNAT y recién después fallaba al guardar — un
     comprobante real sin ningún rastro local. La columna es `emitido_at`.
     Va el instante UTC, que es lo que guarda un timestamptz; la fecha de
     Lima es la del documento y ya viajó en el payload. */
  const patch = {
    estado_emision: "emitido",
    xml_url: resultado.enlace_del_xml ?? null,
    pdf_url: resultado.enlace_del_pdf ?? null,
    cdr_estado:
      resultado.aceptada_por_sunat === true
        ? "aceptado"
        : resultado.sunat_description ?? null,
    sunat_hash: resultado.codigo_hash ?? null,
    serie: resultado.serie || stub.serie,
    correlativo: resultado.numero || stub.correlativo,
    ultimo_error: null,
    intentos: intentos + 1,
    emitido_at: new Date().toISOString(),
  };

  const { error: updErr } = await sb
    .from("comprobantes_electronicos")
    .update(patch)
    .eq("id", stub.id);

  if (updErr) {
    /* SUNAT ya lo tiene: esto no se reintenta, se arregla a mano. Los
       enlaces van al log porque acá no hay nadie leyendo la respuesta
       (el webhook llama en segundo plano). */
    console.error(
      "[nubefact] EMITIDO EN SUNAT PERO NO GUARDADO —",
      `pedido=${pedido.pedido_codigo}`,
      `serie=${resultado.serie}`,
      `numero=${resultado.numero}`,
      `pdf=${resultado.enlace_del_pdf ?? "-"}`,
      `error=${updErr.message}`
    );
  }

  return {
    ok: true,
    estado: "emitido",
    serie: resultado.serie,
    correlativo: resultado.numero,
    pdf_url: resultado.enlace_del_pdf ?? null,
    xml_url: resultado.enlace_del_xml ?? null,
    sunat_hash: resultado.codigo_hash ?? null,
    sunat_description: resultado.sunat_description ?? null,
    persistido: !updErr,
  };
}
