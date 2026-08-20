/* ============================================================
   Culqi — wrapper client-side del checkout Culqi V4.
   -------------------------------------------------------------
   Culqi no publica un paquete npm oficial para el checkout web,
   así que inyectamos su script (checkout.culqi.com/js/v4) por
   demanda y hablamos con `window.Culqi` desde React.

   Este módulo es CLIENT-ONLY. No lo importes desde un Server
   Component o Route Handler — las llamadas al webhook (validación
   HMAC + update pedido) viven en /app/api/pagos/culqi/webhook.

   Env vars leídas:
   - NEXT_PUBLIC_CULQI_PUBLIC_KEY : `pk_live_...` / `pk_test_...`
     (si falta, `loadCulqi()` resuelve `{ ok:false, reason:"missing_key" }`)
   ============================================================ */

const CULQI_SCRIPT_URL = "https://checkout.culqi.com/js/v4";
const CULQI_SCRIPT_ID = "culqi-checkout-v4";

/**
 * Shape mínima del objeto global `window.Culqi` que usamos.
 *
 * La SDK es dinámica (sin @types), así que declaramos solo lo que
 * consumimos. Cualquier otra API queda accesible via `(window as any).Culqi`.
 */
export interface CulqiInstance {
  publicKey: string;
  settings: (opts: {
    title: string;
    currency: "PEN" | "USD";
    /** Monto en CÉNTIMOS de sol (S/59 → 5900). */
    amount: number;
    order?: string;
    xculqirsaid?: string;
    rsapublickey?: string;
  }) => void;
  options: (opts: {
    lang?: "auto" | "es" | "en";
    installments?: boolean;
    modal?: boolean;
    container?: string;
    paymentMethods?: {
      tarjeta?: boolean;
      yape?: boolean;
      billetera?: boolean;
      bancaMovil?: boolean;
      agente?: boolean;
      cuotéalo?: boolean;
    };
    style?: {
      logo?: string;
      bannerColor?: string;
      buttonBackground?: string;
      menuColor?: string;
      linksColor?: string;
      buttonText?: string;
      buttonTextColor?: string;
      priceColor?: string;
    };
  }) => void;
  open: () => void;
  close: () => void;
  token?: { id: string; email: string; [k: string]: unknown };
  order?: { id: string; [k: string]: unknown };
  error?: { object: string; type: string; user_message?: string };
}

declare global {
  interface Window {
    Culqi?: CulqiInstance;
    /**
     * Callback global que Culqi invoca al obtener token / order / error.
     * Defínelo antes de `Culqi.open()` — se sobreescribe entre checkouts.
     */
    culqi?: () => void;
  }
}

/**
 * Resultado de `loadCulqi()`: la SDK cargada o el motivo por el que
 * no arrancó (falta de key, script bloqueado, timeout).
 */
export type LoadCulqiResult =
  | { ok: true; culqi: CulqiInstance }
  | { ok: false; reason: "missing_key" | "load_failed" | "no_window" };

let _loadPromise: Promise<LoadCulqiResult> | null = null;

/**
 * Carga la SDK de Culqi (idempotente — múltiples llamadas comparten Promise).
 *
 * - Si `NEXT_PUBLIC_CULQI_PUBLIC_KEY` no está, retorna `{ok:false, reason:"missing_key"}`
 *   sin inyectar nada y sin lanzar excepción (el checkout muestra un fallback).
 * - En SSR/edge devuelve `no_window` — el caller debe llamarla siempre desde
 *   un `useEffect`/handler.
 */
export function loadCulqi(): Promise<LoadCulqiResult> {
  if (typeof window === "undefined") {
    return Promise.resolve({ ok: false, reason: "no_window" });
  }

  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
  if (!publicKey) {
    console.warn(
      "[culqi] NEXT_PUBLIC_CULQI_PUBLIC_KEY no está seteada — checkout deshabilitado."
    );
    return Promise.resolve({ ok: false, reason: "missing_key" });
  }

  // Ya cargada en esta sesión → resolvemos directo con la instancia.
  if (window.Culqi) {
    window.Culqi.publicKey = publicKey;
    return Promise.resolve({ ok: true, culqi: window.Culqi });
  }

  // Ya hay una carga en vuelo → reutilizamos su Promise.
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise<LoadCulqiResult>((resolve) => {
    const existing = document.getElementById(CULQI_SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.id = CULQI_SCRIPT_ID;
      script.src = CULQI_SCRIPT_URL;
      script.async = true;
    }

    const onLoad = () => {
      if (window.Culqi) {
        window.Culqi.publicKey = publicKey;
        resolve({ ok: true, culqi: window.Culqi });
      } else {
        console.error("[culqi] script cargado pero window.Culqi ausente.");
        resolve({ ok: false, reason: "load_failed" });
      }
    };
    const onError = () => {
      console.error("[culqi] error cargando script " + CULQI_SCRIPT_URL);
      _loadPromise = null; // permitir reintento
      resolve({ ok: false, reason: "load_failed" });
    };

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });

    if (!existing) document.head.appendChild(script);
  });

  return _loadPromise;
}

/* -------------------- createPayment -------------------- */

export interface CreatePaymentArgs {
  /** Token o order id devuelto por el modal Culqi. */
  culqiId: string;
  /** Monto en soles (no céntimos) — el backend lo re-multiplica *100 al cobrar. */
  amount: number;
  /** Código de pedido devuelto por `crearPedidoAction`. */
  pedidoCodigo: string;
  /** Email del cliente (para conciliación). */
  email: string;
  /** 'token' (tarjeta) | 'yape' | 'order' (billetera / banca móvil). */
  paymentType?: "token" | "yape" | "order";
}

export interface CreatePaymentResult {
  ok: boolean;
  culqi_charge_id?: string;
  error?: string;
}

/**
 * Llama al endpoint backend `/api/pagos/culqi/charge` (a implementar en
 * paralelo — es el que finalmente hace POST a api.culqi.com/v2/charges
 * con la SECRET key). Aislamos ese round-trip aquí para que la UI del
 * checkout no dependa del shape exacto del request.
 *
 * NOTA: el endpoint `/api/pagos/culqi/charge` NO existe todavía en este
 * agente — este helper lo prepara para cuando se cablee en el sprint de
 * pagos. Mientras tanto, si el endpoint devuelve 404, el checkout puede
 * mostrar "activa Culqi en Producción" sin romperse.
 */
export async function createPayment(
  args: CreatePaymentArgs
): Promise<CreatePaymentResult> {
  try {
    const res = await fetch("/api/pagos/culqi/charge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: text || `HTTP ${res.status} al crear cargo Culqi.`,
      };
    }
    return (await res.json()) as CreatePaymentResult;
  } catch (err) {
    console.error("[culqi.createPayment] fetch failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de red.",
    };
  }
}

/**
 * Placeholder de config seguro: pinta un "Culqi no configurado" en dev
 * sin reventar la UI. Útil para desactivar el botón de tarjeta cuando
 * `NEXT_PUBLIC_CULQI_PUBLIC_KEY` no está.
 */
export function culqiDisponible(): boolean {
  return typeof process !== "undefined" && !!process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
}
