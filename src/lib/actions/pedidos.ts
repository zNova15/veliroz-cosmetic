"use server";

import { getSupabase } from "@/lib/supabase";

/* ============================================================
   Server Actions de pedidos — cosmetic checkout.
   - crearPedidoAction: valida, mapea al enum del RPC crear_pedido
     (que hoy tiene enum de flores) y llama al RPC. El precio
     final SIEMPRE lo calcula Postgres contra la view `catalogo`.
   - validarCuponAction: llama al RPC validar_cupon (STABLE).
   Ambas se importan desde Client Components y viajan por RSC.
   ============================================================ */

/* ---------- Tipos serializables cliente↔servidor ---------- */

export type MetodoEnvio = "shalom" | "lima_domicilio";
export type MetodoPago =
  | "culqi"
  | "yape"
  | "plin"
  | "mercadopago"
  | "pagoefectivo";
export type TipoComprobante = "boleta" | "factura";

export interface CheckoutPayload {
  /* datos personales */
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;

  /* comprobante */
  tipoComprobante: TipoComprobante;
  dni?: string;
  ruc?: string;
  razonSocial?: string;
  direccionFiscal?: string;

  /* envío */
  metodoEnvio: MetodoEnvio;
  /* shalom */
  agenciaShalom?: string;
  dniReceptor?: string;
  /* lima domicilio */
  departamento?: string;
  provincia?: string;
  distrito?: string;
  direccion?: string;
  numero?: string;
  dpto?: string;
  interior?: string;
  codigoPostal?: string;
  referencia?: string;

  /* pago (label UI — mapeado al enum RPC dentro de la action) */
  metodoPago: MetodoPago;

  /* items del carrito */
  items: Array<{ sku: string; cantidad: number; imagen?: string | null }>;

  /* cupón opcional */
  cupon?: string;

  /* Código de referido. Va SEPARADO de `cupon` aunque la UI use un solo
     campo: son tablas distintas y el RPC los aplica por caminos distintos.
     El monto del descuento NO viaja aquí — lo recalcula el server. */
  codigoReferido?: string;

  /* auditoría cliente (informativo — el server manda) */
  subtotalCliente: number;
  costoEnvio: number;
}

export interface CrearPedidoResult {
  ok: boolean;
  pedidoCodigo?: string;
  pedidoId?: string;
  subtotal?: number;
  descuento?: number;
  costoEnvio?: number;
  total?: number;
  error?: string;
  /** El referido se aplicó de verdad (lo decide el server, no el cliente). */
  referidoAplicado?: boolean;
  /** Por qué no se aplicó, cuando corresponda. */
  referidoMotivo?: string;
}

export interface ValidarCuponResult {
  ok: boolean;
  descuento?: number;
  tipo?: string;
  label?: string;
  razon?: string;
  min?: number;
  /** true cuando el código resultó ser de referido, no un cupón. */
  esReferido?: boolean;
}

/* ---------- Utilidades server-side ---------- */

/** Convierte el enum de UI (culqi/yape/…) al enum válido del RPC. */
function mapearMetodoPago(m: MetodoPago): string {
  switch (m) {
    case "yape":
      return "yape";
    case "plin":
      return "plin";
    case "mercadopago":
      return "mercadopago";
    case "culqi":
      /* Culqi todavía no tiene enum propio en el RPC — lo trackeamos
         en envio_meta.pago_gateway para no perder la trazabilidad. */
      return "mercadopago";
    case "pagoefectivo":
      return "banco";
    default:
      return "contra_entrega";
  }
}

/* ---------- Actions ---------- */

export async function crearPedidoAction(
  payload: CheckoutPayload,
): Promise<CrearPedidoResult> {
  try {
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      return { ok: false, error: "carrito_vacio" };
    }
    if (!payload.email || !/^\S+@\S+\.\S+$/.test(payload.email)) {
      return { ok: false, error: "email_invalido" };
    }

    const sb = getSupabase();

    /* El `producto_id` que espera el RPC es la CLAVE DE `catalogo`, que en
       esta base es el SKU en texto (BOJ-SUN-50ML, lirio-10,
       bienestar-mantequilla-mani-250) — no el uuid de `productos`.

       Este bloque antes resolvía SKU → `variantes_producto.producto_id`, que
       es el uuid del producto padre, y se lo mandaba al RPC. El RPC hacía
       `select … from catalogo where producto_id = <uuid>`, no encontraba
       nada, y abortaba con "Uno de los productos no está en catálogo".
       Resultado: NINGÚN pedido de cosmética se podía completar. Se detectó
       al probar el checkout punta a punta por primera vez.

       Se sigue consultando `variantes_producto` para VALIDAR que el SKU
       existe y está activo antes de llamar al RPC: así un carrito viejo con
       un SKU dado de baja da un error claro acá en vez de un fallo opaco
       adentro de la transacción. */
    const skus = payload.items.map((i) => i.sku);
    const { data: varRows, error: vErr } = await sb
      .from("variantes_producto")
      .select("sku, activo")
      .in("sku", skus);
    if (vErr) return { ok: false, error: `db_error: ${vErr.message}` };

    const activos = new Set(
      ((varRows ?? []) as Array<{ sku: string; activo: boolean }>)
        .filter((r) => r.activo)
        .map((r) => r.sku),
    );

    const items: Array<{
      producto_id: string;
      cantidad: number;
      imagen: string | null;
    }> = [];
    for (const it of payload.items) {
      if (!activos.has(it.sku)) {
        return { ok: false, error: `sku_no_encontrado:${it.sku}` };
      }
      const c = Math.max(1, Math.min(99, Math.floor(Number(it.cantidad) || 0)));
      /* El SKU tal cual: es la clave con la que catalogo lo indexa. */
      items.push({ producto_id: it.sku, cantidad: c, imagen: it.imagen ?? null });
    }

    /* ---------- Guarda de NSO ----------
       Un cosmético sin Notificación Sanitaria Obligatoria vigente del
       importador NO se vende. Es la regla dura del negocio: si alguien lo
       compra y el NSO no aparece, hay que devolver la plata y la
       mercadería es decomisable. Los productos en esa situación se marcan
       con meta.nso_pendiente = true y se siguen exhibiendo —sirven para
       medir interés— pero no pueden entrar en un pedido.

       Hasta ahora esa regla vivía SÓLO en AddToCartButton, o sea en el
       navegador. Un POST directo a esta action la salteaba entera, y esta
       action es la que cobra. Una regla que sólo existe en la interfaz es
       una sugerencia.

       POR QUÉ UNA CONSULTA APARTE Y NO UN EMBED EN LA DE ARRIBA: aquélla
       es la que valida los SKU del cobro y hoy funciona. Sumarle un embed
       significa que un cambio de relación en `productos` tira el checkout
       entero. Ésta se agrega al lado; si algún día molesta, se saca sin
       tocar nada más.

       LÍMITE CONOCIDO: mira el producto del SKU, no los componentes de un
       bundle. Hoy no hay bundle que incluya un SKU con NSO pendiente
       (verificado contra la base el 21-ago-2026); si se arma uno, esta
       guarda no lo ve y hay que extenderla por bundle_composicion. */
    const { data: nsoRows, error: nsoErr } = await sb
      .from("variantes_producto")
      .select(
        "sku, producto:productos!variantes_producto_producto_id_fkey (nombre, meta)",
      )
      .in("sku", skus);
    /* Falla cerrada, igual que la validación de SKU de arriba: si no se
       puede comprobar, no se vende. Equivocarse para el otro lado es
       cobrar por algo que no se puede entregar. */
    if (nsoErr) return { ok: false, error: `db_error_nso: ${nsoErr.message}` };

    type ProductoNso = { nombre: string | null; meta: Record<string, unknown> | null };
    type VarianteNsoRow = {
      sku: string;
      /* PostgREST devuelve el embed como objeto, pero según cómo resuelva
         la relación puede venir como array de uno. Se aceptan las dos. */
      producto: ProductoNso | ProductoNso[] | null;
    };
    for (const r of (nsoRows ?? []) as VarianteNsoRow[]) {
      const prod = Array.isArray(r.producto) ? r.producto[0] ?? null : r.producto;
      if (prod?.meta?.nso_pendiente === true) {
        return { ok: false, error: `nso_pendiente:${r.sku}` };
      }
    }

    /* Metadata de envío (fuera del enum tradicional). */
    const envioMeta: Record<string, unknown> = {
      linea: "cosmetic",
      transporte: payload.metodoEnvio,
      pago_gateway: payload.metodoPago,
    };
    if (payload.metodoEnvio === "shalom") {
      envioMeta.agencia = payload.agenciaShalom ?? null;
      envioMeta.dni_receptor = payload.dniReceptor ?? null;
    } else {
      envioMeta.departamento = payload.departamento ?? null;
      envioMeta.provincia = payload.provincia ?? null;
      envioMeta.distrito = payload.distrito ?? null;
      envioMeta.numero = payload.numero ?? null;
      envioMeta.dpto = payload.dpto ?? null;
      envioMeta.interior = payload.interior ?? null;
      envioMeta.codigo_postal = payload.codigoPostal ?? null;
      envioMeta.referencia = payload.referencia ?? null;
    }

    const direccion =
      payload.metodoEnvio === "shalom"
        ? `Shalom · Agencia ${payload.agenciaShalom ?? "—"} · Receptor DNI ${
            payload.dniReceptor ?? "—"
          }`
        : [
            payload.direccion,
            payload.numero && `N.º ${payload.numero}`,
            payload.dpto && `Dpto ${payload.dpto}`,
            payload.interior && `Int. ${payload.interior}`,
            payload.distrito,
            payload.provincia,
            payload.departamento,
          ]
            .filter(Boolean)
            .join(", ");

    const rpcPayload = {
      nombre: `${payload.nombres} ${payload.apellidos}`.trim(),
      email: payload.email.trim().toLowerCase(),
      telefono: payload.telefono,
      session_id: `cosmetic-web-${Date.now()}`,
      /* 'web' y no 'web-cosmetic': el CHECK `pedidos_canal_check` sólo
         acepta web | whatsapp | presencial, así que el valor anterior hacía
         fallar TODO pedido con 23514. La línea de negocio no se distingue
         acá — la resuelve el propio RPC a partir de las categorías del
         catálogo, y además viaja en envio_meta.linea. */
      canal: "web",
      metodo_entrega: "envio", // shalom y domicilio-lima → 'envio' + envio_meta
      metodo_pago: mapearMetodoPago(payload.metodoPago),
      tipo_comprobante: payload.tipoComprobante,
      documento:
        payload.tipoComprobante === "boleta" ? payload.dni : payload.ruc,
      razon_social: payload.razonSocial ?? null,
      direccion_fiscal: payload.direccionFiscal ?? null,
      direccion,
      envio_meta: envioMeta,
      costo_envio: Math.max(0, Math.min(200, Number(payload.costoEnvio) || 0)),
      cupon: payload.cupon ? payload.cupon.trim().toUpperCase() : null,
      items,
    };

    /* Con código de referido usamos el wrapper (migración 020): valida y
       aplica el descuento server-side en la misma transacción. Sin código,
       el RPC de siempre — así el camino de las otras 3 líneas no cambia. */
    const referido = payload.codigoReferido?.trim();
    const { data, error } = referido
      ? await sb.rpc("crear_pedido_con_referido", {
          payload: rpcPayload,
          referido_codigo: referido,
        })
      : await sb.rpc("crear_pedido", { payload: rpcPayload });
    if (error) return { ok: false, error: error.message };

    const r = (data ?? null) as Record<string, unknown> | null;
    if (!r || typeof r.pedido_codigo !== "string") {
      return { ok: false, error: "rpc_sin_respuesta" };
    }

    return {
      ok: true,
      pedidoCodigo: r.pedido_codigo as string,
      pedidoId: (r.pedido_id as string) ?? undefined,
      subtotal: Number(r.subtotal ?? 0),
      descuento: Number(r.descuento ?? 0),
      costoEnvio: Number(r.costo_envio ?? 0),
      total: Number(r.total ?? 0),
      referidoAplicado:
        r.referido_aplicado === true ? true : r.referido_aplicado === false ? false : undefined,
      referidoMotivo:
        typeof r.referido_motivo === "string" ? r.referido_motivo : undefined,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `excepcion: ${msg}` };
  }
}

export async function validarCuponAction(
  code: string,
  subtotal: number,
): Promise<ValidarCuponResult> {
  try {
    if (!code || code.trim().length === 0) {
      return { ok: false, razon: "sin_codigo" };
    }
    const sb = getSupabase();
    const { data, error } = await sb.rpc("validar_cupon", {
      p_code: code.trim().toUpperCase(),
      p_subtotal: subtotal,
    });
    if (error) return { ok: false, razon: "db_error" };
    const r = (data ?? null) as Record<string, unknown> | null;
    if (!r) return { ok: false, razon: "sin_respuesta" };
    return {
      ok: r.ok === true,
      descuento: r.descuento != null ? Number(r.descuento) : undefined,
      tipo: typeof r.tipo === "string" ? r.tipo : undefined,
      label: typeof r.label === "string" ? r.label : undefined,
      razon: typeof r.razon === "string" ? r.razon : undefined,
      min: r.min != null ? Number(r.min) : undefined,
    };
  } catch {
    return { ok: false, razon: "excepcion" };
  }
}

/* ============================================================
   Un solo campo para cupón Y código de referido.

   POR QUÉ UNIFICADO: pedirle al cliente que distinga entre "cupón" y
   "código de referido" es hacerle administrar nuestra taxonomía. Él
   tiene un código y quiere usarlo. Probamos cupón primero (es el caso
   más común y no necesita email) y si no existe, probamos referido.

   El referido necesita el email porque sus reglas dependen de quién
   compra: no puedes usar tu propio código ni el de una segunda compra.
   Si el checkout todavía no tiene email, se informa en vez de fallar
   en silencio.

   El monto NUNCA se confía: aquí se valida para MOSTRAR, y
   crear_pedido_con_referido lo recalcula server-side al cobrar.
   ============================================================ */
export async function validarCodigoAction(
  code: string,
  subtotal: number,
  email?: string,
): Promise<ValidarCuponResult> {
  const limpio = (code ?? "").trim();
  if (limpio.length === 0) return { ok: false, razon: "sin_codigo" };

  /* 1. ¿Es un cupón? */
  const cupon = await validarCuponAction(limpio, subtotal);
  if (cupon.ok) return cupon;

  /* Si el cupón existe pero no aplica (vencido, mínimo no alcanzado…),
     ese motivo es más útil que "código inválido" — no seguimos probando. */
  const motivosDeCuponReal = new Set([
    "vencido",
    "min_subtotal",
    "sin_usos",
    "solo_primera_compra",
    "agotado",
  ]);
  if (cupon.razon && motivosDeCuponReal.has(cupon.razon)) return cupon;

  /* 2. ¿Es un código de referido? */
  const mail = (email ?? "").trim().toLowerCase();
  if (!mail) {
    return { ok: false, razon: "referido_sin_email", esReferido: true };
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb.rpc("validar_codigo_referido", {
      p_codigo: limpio,
      p_email: mail,
      p_subtotal: subtotal,
    });
    if (error) return { ok: false, razon: "db_error" };
    const r = (data ?? null) as Record<string, unknown> | null;
    if (!r) return { ok: false, razon: "sin_respuesta" };

    if (r.ok !== true) {
      return {
        ok: false,
        esReferido: true,
        razon: typeof r.motivo === "string" ? r.motivo : "codigo_invalido",
        min: r.min_subtotal != null ? Number(r.min_subtotal) : undefined,
      };
    }

    return {
      ok: true,
      esReferido: true,
      descuento: Number(r.descuento ?? 0),
      tipo: "referido",
      label: `Código de referido · ${r.descuento_pct}% (tope S/${r.tope})`,
    };
  } catch {
    return { ok: false, razon: "excepcion" };
  }
}
