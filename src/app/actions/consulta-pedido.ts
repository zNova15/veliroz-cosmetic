"use server";

import { getSupabase } from "@/lib/supabase";

/* ============================================================
   consultarPedidoAction — consulta pública de estado de pedido
   por código + correo, para /mis-pedidos.

   HONESTIDAD SOBRE LA RLS
   -----------------------
   La tabla `pedidos` NO tiene policy de SELECT para el rol anon:
   solo se lee con un JWT verificado del propio cliente (auth que
   todavía no está cableada) o con service_role desde el server.
   Esta app usa la anon key en todos lados, así que hoy esta
   consulta devuelve vacío CASI SIEMPRE — y eso está bien: el UI
   trata "no puedo mostrarlo" como el camino normal y deriva a
   WhatsApp, que es el canal real del negocio.

   Se deja la consulta escrita (y no un stub) para que el día que
   exista una policy anon acotada, un RPC SECURITY DEFINER o el
   login, la página empiece a responder sin tocar el UI.

   NOTA DE SEGURIDAD: no distinguimos "no existe" de "el correo no
   coincide" de "la RLS me bloqueó" — todo cae en `sin_acceso`.
   Así la página no sirve como oráculo para adivinar códigos de
   pedido ajenos. Tampoco devolvemos dirección, documento ni
   teléfono: solo estado, fecha y total.
   ============================================================ */

export interface PedidoPublico {
  codigo: string;
  estado: string;
  fecha: string | null;
  total: number | null;
  metodoEntrega: string | null;
  /** Guía de la agencia, si el operador la cargó en envio_meta. */
  tracking: string | null;
}

export type ConsultaPedidoResult =
  | { ok: true; pedido: PedidoPublico }
  | {
      ok: false;
      motivo: "codigo_invalido" | "email_invalido" | "sin_acceso";
    };

/* Códigos reales vistos en el proyecto: PED-20260816123000-a1b2c3 y
   VLZ-1A2B3C (el bot de WhatsApp usa este último). Validamos flojo a
   propósito: preferimos intentar la consulta antes que rechazar el
   código legítimo de una clienta por un cambio de prefijo. */
const RE_CODIGO = /^[A-Z]{2,5}-[A-Z0-9][A-Z0-9-]{3,48}$/;
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Techo de espera: el proyecto de Supabase puede estar frío y tardar
   decenas de segundos. Preferimos derivar a WhatsApp en 6s antes que
   dejar el botón en "Consultando…" indefinidamente. */
const TIMEOUT_MS = 6000;

async function conTimeout<T>(p: PromiseLike<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(p),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function consultarPedidoAction(
  codigoRaw: string,
  emailRaw: string,
): Promise<ConsultaPedidoResult> {
  const codigo = (codigoRaw ?? "").trim().toUpperCase();
  /* El checkout guarda cliente_email en minúsculas (ver
     lib/actions/pedidos.ts), así que normalizamos igual y comparamos
     con eq — nada de ilike, que trataría % y _ como comodines. */
  const email = (emailRaw ?? "").trim().toLowerCase();

  if (!RE_CODIGO.test(codigo)) return { ok: false, motivo: "codigo_invalido" };
  if (!RE_EMAIL.test(email)) return { ok: false, motivo: "email_invalido" };

  try {
    const res = await conTimeout(
      getSupabase()
        .from("pedidos")
        .select(
          "pedido_codigo, estado, fecha_pedido, total, metodo_entrega, envio_meta",
        )
        .eq("pedido_codigo", codigo)
        .eq("cliente_email", email)
        .limit(1),
    );

    if (!res) {
      console.warn("[consultarPedidoAction] timeout consultando pedidos");
      return { ok: false, motivo: "sin_acceso" };
    }

    const { data, error } = res;

    if (error) {
      console.warn("[consultarPedidoAction] supabase:", error.message);
      return { ok: false, motivo: "sin_acceso" };
    }

    const row = (data ?? [])[0] as
      | {
          pedido_codigo: string;
          estado: string | null;
          fecha_pedido: string | null;
          total: number | string | null;
          metodo_entrega: string | null;
          envio_meta: Record<string, unknown> | null;
        }
      | undefined;

    if (!row) return { ok: false, motivo: "sin_acceso" };

    const trackingRaw = row.envio_meta?.tracking;

    return {
      ok: true,
      pedido: {
        codigo: row.pedido_codigo,
        estado: row.estado ?? "nuevo",
        fecha: row.fecha_pedido,
        total: row.total != null ? Number(row.total) : null,
        metodoEntrega: row.metodo_entrega,
        tracking: typeof trackingRaw === "string" ? trackingRaw : null,
      },
    };
  } catch (e) {
    console.warn("[consultarPedidoAction] excepción:", e);
    return { ok: false, motivo: "sin_acceso" };
  }
}
