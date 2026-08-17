/* ============================================================
   Meta WhatsApp Cloud API — Webhook
   ------------------------------------------------------------
   Ruta: POST/GET /api/whatsapp/webhook
   ------------------------------------------------------------
   GET  → verificación inicial que hace Meta al configurar el
          webhook en Business Manager. Devuelve hub.challenge si
          el hub.verify_token coincide con WHATSAPP_VERIFY_TOKEN.
   POST → recibe eventos. Parsea messages entrantes → router
          bot-flows.ts → responde con sendText.
   ------------------------------------------------------------
   Runtime: nodejs (fetch, timeout, streams). Meta acepta ≤20s
   antes de reintentar. Devolvemos 200 SIEMPRE en POST — si algo
   falla, logeamos, no reintentamos (Meta reintentaría igual y
   duplicaría respuestas).
   ============================================================ */

import type { NextRequest } from "next/server";
import { sendText } from "@/lib/whatsapp";
import { routeMensaje } from "@/lib/bot-flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------- GET (verificación) -------------------- */

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token && expected && token === expected) {
    // Meta requiere devolver el challenge EXACTO como text/plain.
    return new Response(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response("forbidden", { status: 403 });
}

/* -------------------- Tipos del payload Meta -------------------- */
/* Shapes recortados a lo que consumimos. Meta manda mucho más
   (statuses, errors, sistema) — lo ignoramos gracefully. */

interface WaWebhookPayload {
  object?: string;
  entry?: WaEntry[];
}

interface WaEntry {
  id?: string;
  changes?: WaChange[];
}

interface WaChange {
  value?: WaValue;
  field?: string;
}

interface WaValue {
  messaging_product?: string;
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
  messages?: WaMessage[];
  statuses?: unknown[];
}

interface WaMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: "text" | "interactive" | "button" | "image" | "audio" | "document" | string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
}

/* -------------------- POST (eventos) -------------------- */

export async function POST(request: NextRequest) {
  let payload: WaWebhookPayload;
  try {
    payload = (await request.json()) as WaWebhookPayload;
  } catch {
    // Meta puede reenviar body mal formado durante debug — respondemos 200
    // para no gatillar reintentos infinitos, pero logeamos.
    // eslint-disable-next-line no-console
    console.error("[wa:webhook] body JSON inválido");
    return Response.json({ received: true });
  }

  // Solo procesamos objetos "whatsapp_business_account"
  if (payload.object !== "whatsapp_business_account") {
    return Response.json({ received: true });
  }

  const mensajes: Array<{ from: string; texto: string; msgId: string }> = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;
      // statuses (delivered/read/failed) — no se responde
      if (!value.messages || value.messages.length === 0) continue;

      for (const m of value.messages) {
        if (!m.from) continue;
        const texto = extractTexto(m);
        if (!texto) continue;
        mensajes.push({ from: m.from, texto, msgId: m.id || "" });
      }
    }
  }

  // Procesamos en paralelo pero SIN esperar (fire-and-forget)
  // no funciona en serverless — Vercel corta la función al return.
  // Así que sí, esperamos, pero con Promise.allSettled para que un
  // fallo de un mensaje no rompa los demás.
  await Promise.allSettled(
    mensajes.map(async (m) => {
      try {
        const result = await routeMensaje({ from: m.from, mensaje: m.texto });
        if (result.reply) {
          await sendText(m.from, result.reply);
        }
        if (result.handoffHumano) {
          // Placeholder para pasar a Chatwoot / notificar admin (Sprint 4).
          // eslint-disable-next-line no-console
          console.log("[wa:handoff]", m.from, "solicita humano");
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[wa:webhook] fallo procesando", m.msgId, e);
      }
    })
  );

  return Response.json({ received: true, procesados: mensajes.length });
}

/* -------------------- Helpers -------------------- */

function extractTexto(m: WaMessage): string {
  if (m.type === "text" && m.text?.body) return m.text.body;
  if (m.type === "button" && m.button?.text) return m.button.text;
  if (m.type === "interactive") {
    return (
      m.interactive?.button_reply?.title ||
      m.interactive?.list_reply?.title ||
      ""
    );
  }
  return "";
}
