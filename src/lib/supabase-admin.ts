import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ============================================================
   Cliente Supabase con service_role — SOLO servidor.
   ------------------------------------------------------------
   POR QUÉ EXISTE (y por qué falla fuerte en vez de degradar):

   `pedidos` tiene RLS y la clave anon no la atraviesa. Lo grave no es
   que bloquee: es CÓMO bloquea. Comprobado contra la base real:

       SELECT pedidos con anon  →  []            (sin error)
       UPDATE pedidos con anon  →  []  HTTP 200  ("éxito", cero filas)

   PostgREST responde 200 y `error: null` tanto cuando la RLS filtró
   todo como cuando la fila no existía. Los webhooks de pago sólo
   miraban `error`, así que contestaban {processed:true}: MercadoPago /
   Culqi daban el evento por entregado y NO reintentaban. El pago se
   cobraba, el pedido quedaba en 'nuevo', no se emitía boleta y no salía
   ningún correo — plata cobrada sin registro y nadie enterándose.

   De ahí las dos reglas de este módulo:
   1. NUNCA cae a la clave anon. Un cliente que "funciona" pero no ve
      ninguna fila es exactamente el fallo que estamos evitando.
   2. `getSupabaseAdmin()` lanza si falta la variable. El llamador debe
      chequear `hayServiceRole()` antes y responder 500 — un 500 hace
      que la pasarela reintente; un 200 pierde el pago para siempre.

   `server-only` es la otra mitad: si alguien importa este módulo desde
   un archivo con 'use client', el build revienta. La service_role
   bypassea RLS entera; en el bundle público sería la base regalada.
   ============================================================ */

let _admin: SupabaseClient | null = null;

/** `true` si la service_role está configurada en el entorno. */
export function hayServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Cliente con service_role (bypassea RLS). Lazy: la variable se lee en
 * la primera llamada, no en el import — Next.js evalúa los módulos en
 * build para prerender y crashear ahí bloquearía el deploy entero.
 *
 * Lanza si falta `SUPABASE_SERVICE_ROLE_KEY` o `NEXT_PUBLIC_SUPABASE_URL`.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY " +
        "(setear en Vercel → Settings → Environment Variables; la " +
        "service_role es server-only, jamás NEXT_PUBLIC_)",
    );
  }

  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-veliroz-app": "cosmetic-server" } },
  });
  return _admin;
}
