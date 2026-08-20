/* ============================================================
   Bot flows — Veliroz Cosmetic WhatsApp
   ------------------------------------------------------------
   Router simple basado en keywords (stateless). Cada flow
   devuelve el TEXTO a enviar; el webhook se encarga del sendText.
   Pensado para el MVP: cuando queramos state real
   (multi-turn / carrito por WA), migrar a wa_conversaciones
   en Supabase (ver README, sección WhatsApp Bot).
   ============================================================ */

import { getSupabase } from "./supabase";

/* -------------------- Util -------------------- */

/** Normaliza a minúsculas, sin acentos, trim. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/* -------------------- Detección de intents -------------------- */

export type Intent =
  | { kind: "hola" }
  | { kind: "menu" }
  | { kind: "catalogo" }
  | { kind: "mi_pedido"; pedido_codigo?: string }
  | { kind: "envio" }
  | { kind: "precio"; termino: string }
  | { kind: "contacto" }
  | { kind: "recomendacion"; tipo_piel?: TipoPiel }
  | { kind: "humano" }
  | { kind: "unknown"; texto: string };

export type TipoPiel = "grasa" | "seca" | "sensible" | "mixta" | "normal";

const RE_PEDIDO_CODIGO = /VLZ-?[A-Z0-9]{4,}/i;

/** Parser de texto libre → Intent. Es intencionalmente crudo:
 *  keywords y una regex para códigos de pedido. Sin NLP. */
export function detectIntent(texto: string): Intent {
  const t = norm(texto);

  if (!t) return { kind: "unknown", texto };

  // Códigos de pedido tipo VLZ-XXXX aparecen aunque no digan "mi pedido"
  const matchCod = texto.match(RE_PEDIDO_CODIGO);
  if (matchCod) {
    return { kind: "mi_pedido", pedido_codigo: matchCod[0].toUpperCase() };
  }

  if (/\b(hola|buenas|buenos dias|buenas tardes|buenas noches|hi|hey)\b/.test(t)) {
    return { kind: "hola" };
  }
  if (/\b(menu|opciones|ayuda)\b/.test(t)) return { kind: "menu" };
  if (/\b(catalogo|catálogo|productos|ver productos|tienda)\b/.test(t)) {
    return { kind: "catalogo" };
  }
  if (/\b(mi pedido|mi orden|mi compra|estado del pedido|donde esta|dónde está|tracking|seguimiento)\b/.test(t)) {
    return { kind: "mi_pedido" };
  }
  if (/\b(envio|envío|delivery|shalom|contra ?entrega|reparto|cuanto tarda|cuánto tarda|olva)\b/.test(t)) {
    return { kind: "envio" };
  }
  if (/^precio\s+(.+)/i.test(t)) {
    const m = t.match(/^precio\s+(.+)/i)!;
    return { kind: "precio", termino: m[1].trim() };
  }
  if (/\b(cuanto cuesta|cuánto cuesta|precio|costo)\b/.test(t)) {
    // "precio" solo, sin producto → devolvemos intent contacto (o menú)
    return { kind: "precio", termino: t.replace(/\b(cuanto cuesta|cuánto cuesta|precio|costo)\b/g, "").trim() };
  }
  if (/\b(contacto|hablar|persona|humano|asesor|asesora|whatsapp|telefono|teléfono)\b/.test(t)) {
    return { kind: "humano" };
  }

  // Tipo de piel → recomendación
  const piel = detectTipoPiel(t);
  if (piel) return { kind: "recomendacion", tipo_piel: piel };

  if (/\b(recomienda|recomendacion|recomendación|que uso|rutina)\b/.test(t)) {
    return { kind: "recomendacion" };
  }

  return { kind: "unknown", texto };
}

export function detectTipoPiel(t: string): TipoPiel | undefined {
  const n = norm(t);
  if (/\b(grasa|grasoso|grasosa|oleosa|oleoso)\b/.test(n)) return "grasa";
  if (/\b(seca|deshidratada|reseca)\b/.test(n)) return "seca";
  if (/\b(sensible|reactiva|irritada|rojiza)\b/.test(n)) return "sensible";
  if (/\b(mixta|combinada)\b/.test(n)) return "mixta";
  if (/\b(normal)\b/.test(n)) return "normal";
  return undefined;
}

/* -------------------- Copys -------------------- */

const MENU = [
  "¿En qué te ayudo hoy? Elige una opción escribiendo la palabra:",
  "",
  "• *catálogo* — ver productos",
  "• *mi pedido VLZ-XXXX* — estado de tu pedido",
  "• *envío* — tiempos y costos",
  "• *precio NOMBRE* — buscar por producto",
  "• *recomendación* — te sugerimos una rutina",
  "• *contacto* — hablar con una asesora",
].join("\n");

const BIENVENIDA = [
  "¡Hola! 🌸 Bienvenida a *Veliroz Cosmetic*.",
  "",
  "Skincare coreano, francés y peruano — curado a mano en Cajamarca.",
  "",
  MENU,
].join("\n");

const INFO_ENVIO = [
  "*Envíos Veliroz Cosmetic* 📦",
  "",
  "• *Cajamarca ciudad*: contra-entrega mismo día si pides antes de las 2 pm (S/ 5).",
  "• *Puylucana / Baños del Inca*: mismo día (S/ 3).",
  "• *Lima y provincias*: Shalom en 24–48 h (desde S/ 12). Retiras en agencia.",
  "• *Envío GRATIS* desde S/ 120.",
  "",
  "Escribe *mi pedido VLZ-XXXX* para ver el estado del tuyo.",
].join("\n");

const CONTACTO_HUMANO = [
  "Te derivo con una asesora humana 👋",
  "En breve te responde desde este mismo chat (lunes a sábado 9 am – 7 pm).",
  "",
  "Si es urgente, escríbenos a *hola@veliroz.com*.",
].join("\n");

const RUTINAS: Record<TipoPiel, string[]> = {
  grasa: [
    "Rutina *piel grasa* recomendada:",
    "1. Limpiador con *ácido salicílico* (mañana y noche)",
    "2. *Niacinamida 10%* después de limpiar",
    "3. Hidratante *libre de aceite* (gel)",
    "4. *SPF 50 fluido* siempre en el día",
  ],
  seca: [
    "Rutina *piel seca* recomendada:",
    "1. Limpiador cremoso *sin sulfatos*",
    "2. Tónico con *ácido hialurónico*",
    "3. Serum de *ceramidas + escualano*",
    "4. Crema rica en *manteca de karité*",
    "5. *SPF 50* con textura cremosa",
  ],
  sensible: [
    "Rutina *piel sensible* recomendada:",
    "1. Limpiador *sin fragancia* (Centella asiática)",
    "2. Serum de *panthenol + Centella*",
    "3. Crema barrera con *ceramidas*",
    "4. *SPF mineral* (óxido de zinc)",
    "Evita exfoliantes fuertes las primeras 2 semanas.",
  ],
  mixta: [
    "Rutina *piel mixta* recomendada:",
    "1. Limpiador *gel suave*",
    "2. *Niacinamida* en zona T; *hialurónico* en mejillas",
    "3. Hidratante ligera *no comedogénica*",
    "4. *SPF 50* fluido",
  ],
  normal: [
    "Rutina *piel normal* recomendada:",
    "1. Limpiador *pH balanceado*",
    "2. Antioxidante (*Vitamina C* AM)",
    "3. Hidratante ligera",
    "4. *SPF 50* diario",
    "5. Retinol suave (PM, 2× por semana)",
  ],
};

/* -------------------- Flows -------------------- */

export interface FlowInput {
  from: string;
  mensaje: string;
}

export interface FlowResult {
  reply: string;
  handoffHumano?: boolean;
}

/** Entry point — decide qué flow correr según la intent. */
export async function routeMensaje(input: FlowInput): Promise<FlowResult> {
  const intent = detectIntent(input.mensaje);
  switch (intent.kind) {
    case "hola":
      return { reply: BIENVENIDA };
    case "menu":
      return { reply: MENU };
    case "catalogo":
      return flowCatalogo();
    case "envio":
      return { reply: INFO_ENVIO };
    case "mi_pedido":
      return flowMiPedido({ from: input.from, pedido_codigo: intent.pedido_codigo });
    case "precio":
      return flowPrecio(intent.termino);
    case "recomendacion":
      return flowRecomendacion({ from: input.from, tipo_piel: intent.tipo_piel });
    case "humano":
      return { reply: CONTACTO_HUMANO, handoffHumano: true };
    default:
      return {
        reply:
          "No entendí bien 😅 Escribe *menú* para ver las opciones, o *hola* para empezar de cero.",
      };
  }
}

/** Copy fijo con link al catálogo — no consulta DB. */
export function flowCatalogo(): FlowResult {
  return {
    reply: [
      "Nuestro catálogo completo 🛍️",
      "https://veliroz.com/productos",
      "",
      "Filtra por tipo de piel, marca o preocupación. Cualquier duda, escríbenos *contacto*.",
    ].join("\n"),
  };
}

/** Consulta a Supabase por pedido_codigo. Sin código → pide uno. */
export async function flowMiPedido(args: {
  from: string;
  pedido_codigo?: string;
}): Promise<FlowResult> {
  if (!args.pedido_codigo) {
    return {
      reply:
        "Pasame el código de tu pedido — arranca con *VLZ-* (lo tienes en el correo/whatsapp de confirmación). Ejemplo: *mi pedido VLZ-1A2B3C*",
    };
  }

  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("pedidos")
      .select(
        "pedido_codigo, estado, metodo_entrega, total, envio_meta, cliente_telefono"
      )
      .eq("pedido_codigo", args.pedido_codigo)
      .maybeSingle();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[bot:mi_pedido] supabase error", error);
      return {
        reply:
          "No pude leer el pedido ahora mismo. Reintenta en un minuto o escribe *contacto*.",
      };
    }
    if (!data) {
      return {
        reply: `No encontramos el pedido *${args.pedido_codigo}*. Revisa que el código esté completo (empieza con VLZ-).`,
      };
    }

    // Match blando por teléfono — si el remitente coincide con el
    // cliente_telefono, damos más detalle; si no, respondemos genérico
    // para no filtrar info a terceros.
    const misma =
      !!data.cliente_telefono &&
      normalizeDigits(data.cliente_telefono) === normalizeDigits(args.from);

    if (!misma) {
      return {
        reply: `Pedido *${data.pedido_codigo}* — estado: *${data.estado}*. Para más detalles, escríbenos desde el mismo número con el que hiciste la compra 🙏.`,
      };
    }

    const tracking = (data.envio_meta as { tracking?: string } | null)?.tracking;
    const lineas = [
      `*${data.pedido_codigo}* — ${data.estado}`,
      `Entrega: ${data.metodo_entrega}`,
      `Total: S/ ${Number(data.total).toFixed(2)}`,
    ];
    if (tracking) lineas.push(`Tracking: ${tracking}`);
    return { reply: lineas.join("\n") };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[bot:mi_pedido] throw", e);
    return {
      reply:
        "No pude consultar el pedido en este momento. Reintenta o escribe *contacto*.",
    };
  }
}

/** Busca en productos por nombre (ILIKE). Devuelve top 3 con precio. */
export async function flowPrecio(termino: string): Promise<FlowResult> {
  const q = termino.trim();
  if (!q || q.length < 2) {
    return {
      reply:
        "Decime qué producto buscas. Ejemplo: *precio niacinamida* o *precio protector solar*.",
    };
  }
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("productos")
      .select(
        `slug, nombre, variantes:variantes_producto!variantes_producto_producto_id_fkey(precio, variante_label, activo)`
      )
      .eq("linea_negocio", "cosmetic")
      .eq("activo", true)
      .ilike("nombre", `%${q}%`)
      .limit(3);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[bot:precio] supabase error", error);
      return {
        reply: "No pude buscar ahora. Prueba desde el catálogo: https://veliroz.com/productos",
      };
    }
    if (!data || data.length === 0) {
      return {
        reply: `No encontré nada con "*${q}*". Prueba con otra palabra o mira el catálogo: https://veliroz.com/productos`,
      };
    }

    const filas = data.map((p) => {
      const vs = (p.variantes || []).filter(
        (v: { activo: boolean }) => v.activo
      ) as Array<{ precio: number; variante_label: string }>;
      if (vs.length === 0) return `• *${p.nombre}* — (sin stock)`;
      const min = Math.min(...vs.map((v) => Number(v.precio)));
      const max = Math.max(...vs.map((v) => Number(v.precio)));
      const precioTxt =
        min === max ? `S/ ${min.toFixed(2)}` : `desde S/ ${min.toFixed(2)}`;
      return `• *${p.nombre}* — ${precioTxt}\n  https://veliroz.com/producto/${p.slug}`;
    });

    return { reply: `Encontré esto para "*${q}*":\n\n${filas.join("\n")}` };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[bot:precio] throw", e);
    return {
      reply: "Tuve un problema buscando. Prueba el catálogo: https://veliroz.com/productos",
    };
  }
}

/** Devuelve rutina sugerida por tipo de piel. Si no se detectó,
 *  pregunta amablemente. */
export function flowRecomendacion(args: {
  from: string;
  tipo_piel?: TipoPiel;
}): FlowResult {
  if (!args.tipo_piel) {
    return {
      reply: [
        "¡Con gusto te armo una rutina 💧!",
        "Cuéntame tu *tipo de piel*: escribe *grasa*, *seca*, *sensible*, *mixta* o *normal*.",
      ].join("\n"),
    };
  }
  const rutina = RUTINAS[args.tipo_piel];
  return {
    reply: [
      ...rutina,
      "",
      "Encuentras todo esto en: https://veliroz.com/productos",
    ].join("\n"),
  };
}

/* Deja solo dígitos — para comparar teléfonos de forma tolerante. */
function normalizeDigits(s: string): string {
  return s.replace(/[^\d]/g, "");
}
