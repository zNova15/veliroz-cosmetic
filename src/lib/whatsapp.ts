/* ============================================================
   Meta WhatsApp Cloud API — wrapper mínimo Veliroz Cosmetic
   ------------------------------------------------------------
   - Lee env vars en cada llamada (NO en top-level) para que el
     build de Next 16 pueda evaluar módulos server sin las vars
     y no reviente el prerender / config collection.
   - Fallback stub: si falta WHATSAPP_ACCESS_TOKEN o
     WHATSAPP_PHONE_NUMBER_ID, no hace fetch — devuelve
     { skipped: true } y logea. Así el flujo del checkout /
     webhook sigue funcionando en dev y en preview sin credenciales.
   - Números en formato E.164 SIN el "+"  (Meta lo exige así),
     p.ej. "51987654321". normalizePhone() intenta mapear
     "+51 987 654 321" → "51987654321".
   - Templates deben crearse antes en Meta Business Manager
     (ver README). Los names y variables van documentadas ahí.
   ============================================================ */

/* -------------------- Tipos públicos -------------------- */

export type WaSendResult =
  | { skipped: true; reason: string }
  | { ok: true; messageId: string; raw: unknown }
  | { ok: false; error: string; status?: number; raw?: unknown };

export interface WaTemplateParam {
  /** Solo texto por ahora — la Meta Cloud API acepta más tipos
   *  (currency, date_time, image, etc.) pero los templates
   *  de Veliroz son todos texto. */
  type: "text";
  text: string;
}

/* -------------------- Env / config lazy -------------------- */

interface WaConfig {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
}

function readConfig(): WaConfig | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;
  return {
    token,
    phoneNumberId,
    apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
  };
}

function graphUrl(cfg: WaConfig): string {
  return `https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`;
}

/* -------------------- Utilidades -------------------- */

/**
 * Devuelve el número en formato E.164 SIN "+" — el que exige
 * la Cloud API. Acepta con o sin espacios, con o sin "+", y
 * agrega el prefijo "51" (Perú) si viene un móvil peruano crudo
 * de 9 dígitos empezando en "9".
 */
export function normalizePhone(raw: string): string {
  const clean = raw.replace(/[^\d]/g, "");
  if (clean.length === 9 && clean.startsWith("9")) return `51${clean}`;
  return clean;
}

/* -------------------- Core fetch -------------------- */

async function postWa(payload: Record<string, unknown>): Promise<WaSendResult> {
  const cfg = readConfig();
  if (!cfg) {
    // eslint-disable-next-line no-console
    console.log("[wa:stub] WHATSAPP_ACCESS_TOKEN / _PHONE_NUMBER_ID no seteados", payload);
    return { skipped: true, reason: "missing_env" };
  }

  try {
    const res = await fetch(graphUrl(cfg), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      // Meta a veces demora en responder — capamos en 10s.
      signal: AbortSignal.timeout(10_000),
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error("[wa:err]", res.status, raw);
      return {
        ok: false,
        error:
          (raw as { error?: { message?: string } })?.error?.message ||
          `HTTP ${res.status}`,
        status: res.status,
        raw,
      };
    }
    const messageId =
      (raw as { messages?: Array<{ id?: string }> })?.messages?.[0]?.id || "";
    return { ok: true, messageId, raw };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[wa:throw]", msg);
    return { ok: false, error: msg };
  }
}

/* -------------------- API pública -------------------- */

/**
 * Envía un TEMPLATE aprobado por Meta.
 * @param to número destino (E.164 sin "+"; se normaliza)
 * @param templateName nombre exacto del template en Meta BM
 * @param params parámetros posicionales del body del template
 * @param languageCode default "es" — algunos templates usan "es_PE"
 */
export async function sendTemplate(
  to: string,
  templateName: string,
  params: WaTemplateParam[] = [],
  languageCode = "es"
): Promise<WaSendResult> {
  const dest = normalizePhone(to);
  if (!dest) return { ok: false, error: "phone_empty" };

  const components =
    params.length > 0
      ? [
          {
            type: "body",
            parameters: params,
          },
        ]
      : undefined;

  return postWa({
    messaging_product: "whatsapp",
    to: dest,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  });
}

/**
 * Envía un texto simple (solo funciona dentro de la ventana
 * de 24h de un mensaje entrante del usuario — fuera de eso Meta
 * exige un template).
 */
export async function sendText(to: string, message: string): Promise<WaSendResult> {
  const dest = normalizePhone(to);
  if (!dest) return { ok: false, error: "phone_empty" };
  return postWa({
    messaging_product: "whatsapp",
    to: dest,
    type: "text",
    text: { preview_url: true, body: message },
  });
}

/**
 * Envía imagen o documento por URL pública.
 * Detecta pdf → documento; cualquier otra extensión → imagen.
 */
export async function sendMedia(
  to: string,
  url: string,
  caption?: string
): Promise<WaSendResult> {
  const dest = normalizePhone(to);
  if (!dest) return { ok: false, error: "phone_empty" };
  const lower = url.toLowerCase();
  const isPdf = lower.endsWith(".pdf");

  if (isPdf) {
    return postWa({
      messaging_product: "whatsapp",
      to: dest,
      type: "document",
      document: {
        link: url,
        ...(caption ? { caption } : {}),
        filename: url.split("/").pop() || "documento.pdf",
      },
    });
  }
  return postWa({
    messaging_product: "whatsapp",
    to: dest,
    type: "image",
    image: {
      link: url,
      ...(caption ? { caption } : {}),
    },
  });
}

/* -------------------- Helper de templates Veliroz -------------------- */
/* Nombres canónicos — declarados acá para que los callers no
   tengan que memorizar strings sueltos. */

export const WA_TEMPLATES = {
  pedidoCreado: "veliroz_pedido_creado",
  pedidoPagado: "veliroz_pedido_pagado",
  bienvenida: "veliroz_bienvenida",
} as const;
