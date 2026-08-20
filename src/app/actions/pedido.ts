"use server";

import { getSupabase } from "@/lib/supabase";

/* ============================================================
   Server Actions — pedidos + cupones (Veliroz Cosmetic)
   -------------------------------------------------------------
   Todos los Server Actions viven en /src/app/actions/*.
   Se invocan desde Client Components (checkout, cart) via
   `await crearPedidoAction(payload)`; nunca desde route handlers
   (aquellos hablan directo a Supabase con service-key server-side).

   Reglas:
   - 'use server' primera línea del archivo → marca TODOS los exports
     como Server Functions RSC.
   - Usamos el cliente ANON (RLS al mando). Los RPCs relevantes son
     SECURITY DEFINER en Postgres → validan precios/stock/cupón del
     lado servidor, así el payload del cliente NO puede mentir sobre
     el total.
   - NUNCA lanzamos exceptions al llamador — devolvemos { ok, ... }
     para que el UI del checkout muestre el error controladamente.
   ============================================================ */

/* -------------------- Tipos de payload y respuesta -------------------- */

/**
 * Payload que recibe la RPC `crear_pedido(payload jsonb)`.
 *
 * El shape espejea el JSON que valida la función Postgres en la
 * migración 009. Los precios NO se envían: los recalcula la RPC
 * con el catálogo autoritativo (variantes_producto).
 */
export interface CrearPedidoPayload {
  cliente: {
    nombre: string;
    email: string;
    telefono?: string | null;
  };
  entrega: {
    metodo: "shalom_agencia" | "domicilio_local" | "contra_entrega_local";
    ciudad?: string | null;
    distrito?: string | null;
    direccion?: string | null;
    referencia?: string | null;
    /** Agencia Shalom preferida (número o zona). Solo para shalom_agencia. */
    agencia_shalom?: string | null;
  };
  pago: {
    metodo: "yape" | "plin" | "culqi" | "mercadopago" | "contra_entrega";
  };
  comprobante: {
    tipo: "boleta" | "factura";
    /** DNI (boleta) o RUC (factura). */
    documento: string;
    /** Requerido si tipo=factura. */
    razon_social?: string | null;
    /** Requerido si tipo=factura. */
    direccion_fiscal?: string | null;
  };
  items: Array<{
    sku: string;
    cantidad: number;
  }>;
  /** Código de cupón ya validado con `validarCuponAction` (opcional). */
  cupon?: string | null;
  /** Línea de negocio origen — siempre 'cosmetic' desde esta app. */
  linea_negocio?: "cosmetic" | "flores";
  /** Notas libres del cliente. */
  notas?: string | null;
}

export interface CrearPedidoOk {
  ok: true;
  pedido_id: string;
  pedido_codigo: string;
  total: number;
  subtotal: number;
  descuento: number;
  costo_envio: number;
}

export interface CrearPedidoErr {
  ok: false;
  error: string;
  /** Código machine-readable (stock_insuficiente, cupon_invalido, …). */
  code?: string;
}

export type CrearPedidoResult = CrearPedidoOk | CrearPedidoErr;

/* -------------------- crearPedidoAction -------------------- */

/**
 * Crea un pedido llamando a la RPC `public.crear_pedido(jsonb)` de Supabase.
 *
 * La RPC (SECURITY DEFINER, mig 009+011):
 *   1. Valida stock por SKU contra variantes_producto.
 *   2. Recalcula precios server-side.
 *   3. Aplica cupón si viene (re-valida con reglas del cupón).
 *   4. Calcula envío según metodo/ciudad (regla Cajamarca vs resto).
 *   5. Inserta pedido + lineas_pedido + dispara triggers de:
 *      - email_queue (confirmación al cliente)
 *      - comprobantes_electronicos (fila stub para Nubefact)
 *      - pedido_timeline (evento 'pedido_creado')
 *   6. Retorna jsonb { pedido_id, pedido_codigo, total, subtotal, descuento, costo_envio }.
 *
 * En caso de error de negocio la RPC lanza excepción con SQLSTATE 'P0001'
 * y un `MESSAGE` legible → lo mapeamos a { ok:false, error, code }.
 */
export async function crearPedidoAction(
  payload: CrearPedidoPayload
): Promise<CrearPedidoResult> {
  // Guard rápido: si el carrito viene vacío, no molestamos a la BD.
  if (!payload?.items?.length) {
    return { ok: false, error: "El carrito está vacío.", code: "carrito_vacio" };
  }

  try {
    const sb = getSupabase();
    // La RPC recibe un ÚNICO argumento jsonb llamado `payload`.
    const { data, error } = await sb.rpc("crear_pedido", {
      payload: {
        linea_negocio: "cosmetic",
        ...payload,
      },
    });

    if (error) {
      // Error crudo de Postgres/PostgREST — lo mapeamos y logueamos.
      console.error("[crearPedidoAction] supabase error:", error);
      return {
        ok: false,
        error: error.message || "No pudimos registrar el pedido.",
        code: (error as { code?: string }).code,
      };
    }

    if (!data || typeof data !== "object") {
      return {
        ok: false,
        error: "Respuesta inesperada del servidor.",
        code: "respuesta_invalida",
      };
    }

    // La RPC puede devolver { ok:false, error, code } cuando la regla de
    // negocio falla sin necesidad de EXCEPTION (p.ej. stock_insuficiente).
    const rec = data as Record<string, unknown>;
    if (rec.ok === false) {
      return {
        ok: false,
        error: String(rec.error ?? "Error al crear el pedido."),
        code: rec.code ? String(rec.code) : undefined,
      };
    }

    return {
      ok: true,
      pedido_id: String(rec.pedido_id),
      pedido_codigo: String(rec.pedido_codigo),
      total: Number(rec.total ?? 0),
      subtotal: Number(rec.subtotal ?? 0),
      descuento: Number(rec.descuento ?? 0),
      costo_envio: Number(rec.costo_envio ?? 0),
    };
  } catch (err) {
    // Última red — nunca dejamos escapar una excepción al Client Component.
    console.error("[crearPedidoAction] unexpected:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado.",
      code: "unexpected",
    };
  }
}

/* -------------------- validarCuponAction -------------------- */

export interface ValidarCuponOk {
  ok: true;
  /** Monto de descuento en soles a aplicar al subtotal actual. */
  descuento: number;
  /** 'porcentaje' | 'monto' | 'envio_gratis'. */
  tipo: string;
  /** Etiqueta amigable para mostrar en el UI ("15% OFF", "Envío gratis"). */
  label: string;
  /** Devuelto tal cual para persistirlo en pedidos.cupon. */
  code: string;
}

export interface ValidarCuponErr {
  ok: false;
  razon: string;
}

export type ValidarCuponResult = ValidarCuponOk | ValidarCuponErr;

/**
 * Valida un código de cupón contra la RPC `validar_cupon(code text, subtotal numeric)`.
 *
 * La RPC (SECURITY DEFINER) chequea:
 *   - existencia y estado (activo, no vencido)
 *   - mínimo de compra
 *   - usos restantes (global + por cliente si aplica)
 *   - línea de negocio compatible ('cosmetic')
 * Devuelve jsonb { ok, descuento, tipo, label } o { ok:false, razon }.
 */
export async function validarCuponAction(
  code: string,
  subtotal: number
): Promise<ValidarCuponResult> {
  const clean = (code || "").trim().toUpperCase();
  if (!clean) {
    return { ok: false, razon: "Ingresa un código de cupón." };
  }
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return { ok: false, razon: "Subtotal inválido." };
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb.rpc("validar_cupon", {
      code: clean,
      subtotal,
    });

    if (error) {
      console.error("[validarCuponAction] supabase error:", error);
      return { ok: false, razon: error.message || "No pudimos validar el cupón." };
    }

    if (!data || typeof data !== "object") {
      return { ok: false, razon: "Respuesta inesperada del servidor." };
    }

    const rec = data as Record<string, unknown>;
    if (rec.ok === false || rec.ok === undefined) {
      return {
        ok: false,
        razon: String(rec.razon ?? rec.error ?? "Cupón inválido."),
      };
    }

    return {
      ok: true,
      descuento: Number(rec.descuento ?? 0),
      tipo: String(rec.tipo ?? "monto"),
      label: String(rec.label ?? clean),
      code: clean,
    };
  } catch (err) {
    console.error("[validarCuponAction] unexpected:", err);
    return {
      ok: false,
      razon: err instanceof Error ? err.message : "Error inesperado al validar cupón.",
    };
  }
}
