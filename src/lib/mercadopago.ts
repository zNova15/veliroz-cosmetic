import "server-only";

import MercadoPagoConfig, { Preference, Payment } from "mercadopago";
import type { PreferenceRequest } from "mercadopago/dist/clients/preference/commonTypes";

/* ============================================================
   MercadoPago — SDK server-side (Node runtime).
   -------------------------------------------------------------
   Sólo se usa desde:
     - Server Actions (POST create preference)
     - Route Handlers /api/pagos/mercadopago/**
   El bundle client NUNCA importa este módulo — `server-only` lo
   fuerza en build (Next.js rechaza el import si alguien lo linkea
   desde un archivo con 'use client').

   Env vars leídas (lazy, en cada llamada):
     - MERCADOPAGO_ACCESS_TOKEN  (APP_USR-... obligatorio para create/get)
     - NEXT_PUBLIC_MP_PUBLIC_KEY (public, sólo la usa el client si integramos Bricks)
   ============================================================ */

let _config: MercadoPagoConfig | null = null;

function getConfig(): MercadoPagoConfig | null {
  if (_config) return _config;
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;
  _config = new MercadoPagoConfig({
    accessToken,
    options: { timeout: 8000 },
  });
  return _config;
}

/**
 * `true` si `MERCADOPAGO_ACCESS_TOKEN` está presente.
 * Útil para deshabilitar el botón "Pagar con MP" en el checkout.
 */
export function mpDisponible(): boolean {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN;
}

/* -------------------- createPreference -------------------- */

/**
 * Shape mínimo del pedido que necesitamos para armar una preference.
 * Aceptamos snake_case para poder pasarle una fila cruda de Supabase.
 */
export interface PedidoParaMP {
  pedido_codigo: string;
  cliente_email: string;
  cliente_nombre?: string | null;
  cliente_apellido?: string | null;
  cliente_telefono?: string | null;
  total: number;
  costo_envio?: number;
  lineas: Array<{
    sku: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    imagen?: string | null;
  }>;
}

export interface CreatePreferenceResult {
  ok: boolean;
  init_point?: string;
  sandbox_init_point?: string;
  preference_id?: string;
  error?: string;
}

/**
 * Crea una Checkout Pro preference y devuelve `init_point` para redirect.
 *
 * - `external_reference` = `pedido_codigo` → así los webhooks IPN nos permiten
 *   ubicar el pedido sin depender del `payment_id` de MP.
 * - `back_urls` apuntan al dominio del deploy (env `NEXT_PUBLIC_SITE_URL`, con
 *   fallback a veliroz-cosmetic.vercel.app).
 * - `notification_url` apunta a `/api/pagos/mercadopago/webhook` del mismo host.
 *
 * Si el token no está seteado, devolvemos `{ ok:false, error:"no_token" }` sin
 * lanzar excepción — el checkout lo mostrará como método deshabilitado.
 */
export async function createPreference(
  pedido: PedidoParaMP
): Promise<CreatePreferenceResult> {
  const config = getConfig();
  if (!config) {
    console.warn("[mp.createPreference] MERCADOPAGO_ACCESS_TOKEN no configurado.");
    return { ok: false, error: "no_token" };
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://veliroz-cosmetic.vercel.app";

  const items: PreferenceRequest["items"] = pedido.lineas.map((l) => ({
    id: l.sku,
    title: l.nombre.slice(0, 250),
    quantity: l.cantidad,
    unit_price: Number(l.precio_unitario.toFixed(2)),
    currency_id: "PEN",
    picture_url: l.imagen ?? undefined,
    category_id: "beauty",
  }));

  // Envío como línea extra (MP no maneja envío separado en Perú por default).
  if (pedido.costo_envio && pedido.costo_envio > 0) {
    items.push({
      id: "envio",
      title: "Envío",
      quantity: 1,
      unit_price: Number(pedido.costo_envio.toFixed(2)),
      currency_id: "PEN",
      category_id: "services",
    });
  }

  const body: PreferenceRequest = {
    items,
    external_reference: pedido.pedido_codigo,
    statement_descriptor: "VELIROZ",
    binary_mode: true, // sin estado "in_process"
    payer: {
      email: pedido.cliente_email,
      name: pedido.cliente_nombre ?? undefined,
      surname: pedido.cliente_apellido ?? undefined,
      phone: pedido.cliente_telefono
        ? { number: pedido.cliente_telefono }
        : undefined,
    },
    back_urls: {
      success: `${siteUrl}/cosmetic/checkout/confirmacion?codigo=${pedido.pedido_codigo}&estado=aprobado`,
      failure: `${siteUrl}/cosmetic/checkout/confirmacion?codigo=${pedido.pedido_codigo}&estado=fallido`,
      pending: `${siteUrl}/cosmetic/checkout/confirmacion?codigo=${pedido.pedido_codigo}&estado=pendiente`,
    },
    auto_return: "approved",
    notification_url: `${siteUrl}/api/pagos/mercadopago/webhook`,
    metadata: {
      pedido_codigo: pedido.pedido_codigo,
      linea_negocio: "cosmetic",
    },
  };

  try {
    const client = new Preference(config);
    const res = await client.create({ body });
    return {
      ok: true,
      init_point: res.init_point,
      sandbox_init_point: res.sandbox_init_point,
      preference_id: res.id,
    };
  } catch (err) {
    console.error("[mp.createPreference] fallo:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "error_mp",
    };
  }
}

/* -------------------- getPayment -------------------- */

export interface MpPaymentInfo {
  ok: boolean;
  id?: string;
  status?: string; // approved | rejected | pending | in_process | refunded
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  payment_method_id?: string;
  error?: string;
}

/**
 * Consulta el detalle de un pago por ID (lo mandan los webhooks IPN).
 */
export async function getPayment(paymentId: string): Promise<MpPaymentInfo> {
  const config = getConfig();
  if (!config) return { ok: false, error: "no_token" };
  try {
    const client = new Payment(config);
    const res = await client.get({ id: paymentId });
    return {
      ok: true,
      id: String(res.id ?? paymentId),
      status: res.status ?? undefined,
      status_detail: res.status_detail ?? undefined,
      external_reference: res.external_reference ?? undefined,
      transaction_amount: res.transaction_amount ?? undefined,
      payment_method_id: res.payment_method_id ?? undefined,
    };
  } catch (err) {
    console.error("[mp.getPayment] fallo:", err);
    return { ok: false, error: err instanceof Error ? err.message : "error_mp" };
  }
}
