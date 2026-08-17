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
}

export interface ValidarCuponResult {
  ok: boolean;
  descuento?: number;
  tipo?: string;
  label?: string;
  razon?: string;
  min?: number;
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

    /* Resolver SKU → producto_id (uuid) contra variantes_producto.
       El RPC iterára items[] y hará su propio price-lookup contra
       catalogo — nosotros sólo aportamos el producto_id. */
    const skus = payload.items.map((i) => i.sku);
    const { data: varRows, error: vErr } = await sb
      .from("variantes_producto")
      .select("sku, producto_id")
      .in("sku", skus);
    if (vErr) return { ok: false, error: `db_error: ${vErr.message}` };

    const bySku = new Map<string, string>();
    for (const r of (varRows ?? []) as Array<{ sku: string; producto_id: string }>) {
      bySku.set(r.sku, r.producto_id);
    }

    const items: Array<{
      producto_id: string;
      cantidad: number;
      imagen: string | null;
    }> = [];
    for (const it of payload.items) {
      const producto_id = bySku.get(it.sku);
      if (!producto_id) {
        return { ok: false, error: `sku_no_encontrado:${it.sku}` };
      }
      const c = Math.max(1, Math.min(99, Math.floor(Number(it.cantidad) || 0)));
      items.push({ producto_id, cantidad: c, imagen: it.imagen ?? null });
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
      canal: "web-cosmetic",
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

    const { data, error } = await sb.rpc("crear_pedido", {
      payload: rpcPayload,
    });
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
