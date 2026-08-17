import * as React from "react";
import { Resend } from "resend";

/* ============================================================
   Wrapper Resend para Veliroz Cosmetic
   - Lazy init: la instancia solo se crea si RESEND_API_KEY existe
     (evita crashear el build en Vercel cuando falta la var).
   - Cero throw en tiempo de módulo — misma lógica que supabase.ts.
   - Si no hay key, sendEmail() hace console.log y retorna
     { skipped: true } para que el drainer marque el registro sin
     fallar el request.
   - Nunca importar este archivo desde un Client Component: usa
     process.env server-only + envía JSON pesado con render(...).
   ============================================================ */

const DEFAULT_FROM = "Veliroz Cosmetic <hola@veliroz.com>";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

export type SendEmailResult =
  | { ok: true; id: string; skipped?: false }
  | { ok: true; id: null; skipped: true; reason: string }
  | { ok: false; error: string; skipped?: false };

export type SendEmailOpts = {
  /** Sobrescribe DEFAULT_FROM ("Veliroz Cosmetic <hola@veliroz.com>"). */
  from?: string;
  /** Reply-To opcional — por defecto Resend reusa `from`. */
  replyTo?: string | string[];
  /** Tags Resend (útiles en dashboard: tipo=pedido_pagado, etc). */
  tags?: Array<{ name: string; value: string }>;
};

/**
 * sendEmail(to, subject, Component, props, opts?)
 *
 * Renderiza un componente React Email → HTML + text plano y lo
 * despacha vía Resend. Si RESEND_API_KEY no está seteado hace
 * console.log de un preview y retorna { skipped: true } — nunca
 * throw, para que el drainer pueda distinguir omisión de error.
 */
export async function sendEmail<P extends object>(
  to: string | string[],
  subject: string,
  Component: React.ComponentType<P>,
  props: P,
  opts: SendEmailOpts = {}
): Promise<SendEmailResult> {
  const resend = getResend();
  const element = React.createElement(Component, props);
  const recipients = Array.isArray(to) ? to : [to];

  if (!resend) {
    // Fallback dev/preview: log estructurado, no throw.
    // El drainer usa { skipped } para marcar el registro como 'omitido'
    // en vez de 'fallido' — así podemos correr en preview sin ruido.
    // eslint-disable-next-line no-console
    console.warn(
      "[resend] RESEND_API_KEY ausente — email omitido.",
      JSON.stringify(
        {
          to: recipients,
          subject,
          component: Component.displayName || Component.name || "Anon",
        },
        null,
        2
      )
    );
    return {
      ok: true,
      id: null,
      skipped: true,
      reason: "RESEND_API_KEY no configurada",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: opts.from ?? DEFAULT_FROM,
      to: recipients,
      subject,
      react: element,
      replyTo: opts.replyTo,
      tags: opts.tags,
    });

    if (error) {
      const msg =
        typeof error === "string"
          ? error
          : error.message ?? JSON.stringify(error);
      return { ok: false, error: msg };
    }
    if (!data?.id) {
      return { ok: false, error: "Resend no devolvió id" };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

/** ¿La wrapper tiene credencial válida para enviar de verdad? */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export const RESEND_FROM = DEFAULT_FROM;
