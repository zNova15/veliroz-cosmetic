"use client";

/* ============================================================
   Veliroz Cosmetic — Event tracking helpers
   ---------------------------------------------------------
   Emite cada evento en paralelo a:
   - Google Analytics 4 (window.gtag) — GA4 Enhanced Ecommerce spec
   - Meta Pixel (window.fbq)          — Standard events

   Reglas de oro:
   - SSR-safe: chequea typeof window antes de tocar globals.
   - No-op silencioso si los scripts no cargaron (env var ausente).
   - En DEV imprime un console.debug para verificar la instrumentación
     sin depender de tener cuenta de Meta/GA abierta.
   ============================================================ */

const DEV = process.env.NODE_ENV !== "production";

function hasGtag(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}
function hasFbq(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

function dbg(evento: string, payload: unknown): void {
  if (DEV && typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.debug(`[track] ${evento}`, payload);
  }
}

/* -------------------- Add to Cart -------------------- */

export interface AddToCartArgs {
  sku: string;
  precio: number;
  marca: string;
  productoNombre?: string;
  cantidad?: number;
}

export function trackAddToCart(args: AddToCartArgs): void {
  const { sku, precio, marca, productoNombre, cantidad = 1 } = args;
  const valor = Number((precio * cantidad).toFixed(2));

  dbg("add_to_cart", args);

  if (hasGtag()) {
    window.gtag!("event", "add_to_cart", {
      currency: "PEN",
      value: valor,
      items: [
        {
          item_id: sku,
          item_name: productoNombre ?? sku,
          item_brand: marca,
          price: Number(precio.toFixed(2)),
          quantity: cantidad,
        },
      ],
    });
  }

  if (hasFbq()) {
    window.fbq!("track", "AddToCart", {
      content_ids: [sku],
      content_name: productoNombre,
      content_type: "product",
      currency: "PEN",
      value: valor,
    });
  }
}

/* -------------------- View Product (PDP) -------------------- */

export interface ViewProductArgs {
  sku: string;
  marca: string;
  precio: number;
  productoNombre?: string;
  categoria?: string;
}

export function trackViewProduct(args: ViewProductArgs): void {
  const { sku, marca, precio, productoNombre, categoria } = args;

  dbg("view_item", args);

  if (hasGtag()) {
    window.gtag!("event", "view_item", {
      currency: "PEN",
      value: Number(precio.toFixed(2)),
      items: [
        {
          item_id: sku,
          item_name: productoNombre ?? sku,
          item_brand: marca,
          item_category: categoria,
          price: Number(precio.toFixed(2)),
        },
      ],
    });
  }

  if (hasFbq()) {
    window.fbq!("track", "ViewContent", {
      content_ids: [sku],
      content_name: productoNombre,
      content_category: categoria,
      content_type: "product",
      currency: "PEN",
      value: Number(precio.toFixed(2)),
    });
  }
}

/* -------------------- Search -------------------- */

export function trackSearch(args: { query: string }): void {
  const { query } = args;
  if (!query || !query.trim()) return;

  dbg("search", args);

  if (hasGtag()) {
    window.gtag!("event", "search", { search_term: query });
  }

  if (hasFbq()) {
    window.fbq!("track", "Search", { search_string: query });
  }
}

/* -------------------- Initiate Checkout -------------------- */

export interface InitiateCheckoutArgs {
  total: number;
  items_count: number;
  items?: Array<{ sku: string; precio: number; cantidad: number; marca?: string; productoNombre?: string }>;
}

export function trackInitiateCheckout(args: InitiateCheckoutArgs): void {
  const { total, items_count, items = [] } = args;
  const valor = Number(total.toFixed(2));

  dbg("begin_checkout", args);

  if (hasGtag()) {
    window.gtag!("event", "begin_checkout", {
      currency: "PEN",
      value: valor,
      items: items.map((it) => ({
        item_id: it.sku,
        item_name: it.productoNombre ?? it.sku,
        item_brand: it.marca,
        price: Number(it.precio.toFixed(2)),
        quantity: it.cantidad,
      })),
    });
  }

  if (hasFbq()) {
    window.fbq!("track", "InitiateCheckout", {
      content_ids: items.map((it) => it.sku),
      content_type: "product",
      contents: items.map((it) => ({ id: it.sku, quantity: it.cantidad })),
      num_items: items_count,
      currency: "PEN",
      value: valor,
    });
  }
}

/* -------------------- Purchase -------------------- */

export interface PurchaseArgs {
  pedido_codigo: string;
  total: number;
  items: Array<{
    sku: string;
    precio: number;
    cantidad: number;
    marca?: string;
    productoNombre?: string;
  }>;
  cupon?: string;
  costo_envio?: number;
}

export function trackPurchase(args: PurchaseArgs): void {
  const { pedido_codigo, total, items, cupon, costo_envio } = args;
  const valor = Number(total.toFixed(2));

  dbg("purchase", args);

  if (hasGtag()) {
    window.gtag!("event", "purchase", {
      transaction_id: pedido_codigo,
      currency: "PEN",
      value: valor,
      coupon: cupon,
      shipping: costo_envio,
      items: items.map((it) => ({
        item_id: it.sku,
        item_name: it.productoNombre ?? it.sku,
        item_brand: it.marca,
        price: Number(it.precio.toFixed(2)),
        quantity: it.cantidad,
      })),
    });
  }

  if (hasFbq()) {
    window.fbq!("track", "Purchase", {
      content_ids: items.map((it) => it.sku),
      content_type: "product",
      contents: items.map((it) => ({ id: it.sku, quantity: it.cantidad })),
      currency: "PEN",
      value: valor,
      num_items: items.reduce((acc, it) => acc + it.cantidad, 0),
    });
  }
}
