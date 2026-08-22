import {
  getSupabase,
  PRODUCTO_SELECT,
  type ProductoRow,
} from "@/lib/supabase";
import { siteUrl } from "@/lib/site";

/* ============================================================
   Veliroz Cosmetic — Google Merchant Center feed
   GET /api/feeds/google-merchant.xml
   - RSS 2.0 con namespace g: (formato oficial GMC)
   - Un <item> por VARIANTE activa (SKU único). Un producto con
     3 tamaños emite 3 items — que es como GMC espera stock/precio
     a nivel SKU.
   - Cache: ISR 6h (revalidate 21600 s). Google recrawlea cada
     ~24h; 6h nos deja margen y ahorra queries.
   ============================================================ */

export const revalidate = 21600; // 6h
export const dynamic = "force-static";

function baseUrl(): string {
  // Delegado a src/lib/site.ts — ver ahí por qué no se usa VERCEL_URL en prod.
  return siteUrl();
}

/* Escapado XML mínimo pero completo (los 5 caracteres reservados). */
function xmlEscape(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* Google Product Category — usamos el path taxonómico (más flexible
   que el ID numérico; ambos aceptados). Skincare = 469. */
const GOOGLE_CATEGORY =
  "Health & Beauty > Personal Care > Cosmetics > Skin Care";

/* Map interno categoria → product_type (breadcrumb propio Veliroz). */
function productTypeFor(categoria: string, subcategoria: string | null): string {
  const cat = categoria || "Skincare";
  const sub = subcategoria ? ` > ${subcategoria}` : "";
  return `Cosmetic > ${cat}${sub}`;
}

/* ── Disponibilidad ──────────────────────────────────────────
   El catálogo entero arrancó en PRE-VENTA: stock físico 0 esperando el
   primer lote, pero los SKUs son vendibles (el cliente reserva y se
   despacha al llegar el lote — ver PreventaBar y AddToCartButton).
   Antes esto salía como 'out of stock' en los 18 SKUs, y un catálogo
   agotado no se puede pautar: Meta no sirve Advantage+ sobre él y Google
   deja de mostrar los ítems. O sea, la pauta no podía correr ni pagando.

   'preorder' es exactamente el estado que Google define para esto:
   comprable hoy, entrega diferida. 'out of stock' queda para el caso real
   de agotado — un producto sin stock y sin meta.preventa. */
type DisponibilidadGoogle = "in stock" | "preorder" | "out of stock";

function disponibilidadGoogle(
  stock: number,
  preventa: boolean,
): DisponibilidadGoogle {
  if (stock > 0) return "in stock";
  return preventa ? "preorder" : "out of stock";
}

/* ── availability_date ───────────────────────────────────────
   Google RECHAZA el ítem entero si declara availability 'preorder' sin
   g:availability_date. No es una advertencia: el SKU no entra al feed.

   De dónde sale la fecha: la web le promete al cliente "entrega estimada
   5-7 días HÁBILES" (PreventaBar + AddToCartButton). 7 días hábiles caen,
   en el peor caso, a 14 días naturales — dos fines de semana y un feriado
   de por medio. Usamos ese techo para que el feed nunca prometa antes que
   la ficha; si la promesa de la web cambia, esta constante cambia con ella.

   POR QUÉ SE CALCULA DENTRO DE GET() Y NO EN EL MÓDULO: esta ruta es
   force-static. Una constante de módulo se evalúa UNA vez, cuando el
   bundle se carga en el prerender del build, y quedaría congelada en la
   fecha del deploy: tres semanas después el feed publicaría una
   availability_date en el pasado y Google tiraría los ítems. Dentro de
   GET() el cuerpo se vuelve a ejecutar en cada regeneración ISR (cada 6h),
   así que la fecha avanza con el calendario.

   Y por qué se trunca a medianoche de Lima: sin truncar, cada regeneración
   movería la fecha unas horas y el feed cambiaría sin que haya cambiado
   nada real. Truncado, el valor sólo se mueve cuando cambia el día en
   Perú. El offset es constante -05:00 porque Perú no aplica horario de
   verano — no es un hardcode olvidado. */
const DIAS_HASTA_ENTREGA = 14;
const OFFSET_LIMA = "-05:00";

function availabilityDate(ahora: Date): string {
  /* Corremos el reloj a hora Lima y truncamos el día en UTC: así el corte
     de día es el peruano y no el del servidor (que corre en UTC). */
  const lima = new Date(ahora.getTime() - 5 * 60 * 60 * 1000);
  const objetivo = new Date(
    Date.UTC(
      lima.getUTCFullYear(),
      lima.getUTCMonth(),
      lima.getUTCDate() + DIAS_HASTA_ENTREGA,
    ),
  );
  return `${objetivo.toISOString().slice(0, 10)}T00:00:00${OFFSET_LIMA}`;
}

export async function GET(): Promise<Response> {
  const site = baseUrl();
  let items: ProductoRow[] = [];

  try {
    const { data, error } = await getSupabase()
      .from("productos")
      .select(PRODUCTO_SELECT)
      .eq("linea_negocio", "cosmetic")
      .eq("activo", true)
      /* Fuera los que esperan Notificación Sanitaria (meta.nso_pendiente).
         Publicitar un cosmético sin NSO en Perú no es un catálogo impreciso,
         es exponerse ante DIGEMID — y Google/Meta también sancionan.

         TRAMPA: el filtro natural, .not("meta->>nso_pendiente","eq","true"),
         VACÍA el feed. PostgREST lo traduce a NOT (meta->>'nso_pendiente' =
         'true'); para los productos que ni siquiera tienen la clave, el ->>
         devuelve NULL, la comparación da NULL, NOT NULL sigue siendo NULL y
         el WHERE descarta la fila. Verificado contra la base: devuelve 0 de
         18 filas. Por eso el OR explícito con is.null, que sí incluye a los
         que no tienen la clave (y a un meta entero en NULL). */
      .or("meta->>nso_pendiente.is.null,meta->>nso_pendiente.neq.true");
    if (error) throw error;
    items = ((data ?? []) as unknown) as ProductoRow[];
  } catch (e) {
    console.warn("[feed google-merchant] Supabase no disponible:", e);
    items = [];
  }

  const ahora = new Date();
  const now = ahora.toUTCString();
  const fechaEntrega = availabilityDate(ahora);

  const rows: string[] = [];
  for (const p of items) {
    const marcaNombre = p.marca?.nombre ?? "Veliroz";
    const productLink = `${site}/producto/${encodeURIComponent(p.slug)}`;
    const imageFallback = p.imagen_principal ?? "";
    const productType = productTypeFor(p.categoria, p.subcategoria);
    const descBase =
      p.descripcion_corta ??
      `${p.nombre} — ${marcaNombre}. Disponible en Veliroz Cosmetic.`;
    const preventa = p.meta?.preventa === true;

    const variantes = (p.variantes ?? []).filter((v) => v.activo);
    for (const v of variantes) {
      const availability = disponibilidadGoogle(Number(v.stock ?? 0), preventa);
      const price = `${Number(v.precio).toFixed(2)} PEN`;
      const image = v.imagen ?? imageFallback;
      const titleFull = v.variante_label
        ? `${p.nombre} — ${v.variante_label}`
        : p.nombre;

      rows.push(
        [
          "    <item>",
          `      <g:id>${xmlEscape(v.sku)}</g:id>`,
          `      <title>${xmlEscape(titleFull)}</title>`,
          `      <description>${xmlEscape(descBase)}</description>`,
          `      <link>${xmlEscape(productLink)}</link>`,
          image ? `      <g:image_link>${xmlEscape(image)}</g:image_link>` : "",
          `      <g:availability>${availability}</g:availability>`,
          // Obligatoria SÓLO en preorder; en el resto Google la ignora o se queja.
          availability === "preorder"
            ? `      <g:availability_date>${xmlEscape(fechaEntrega)}</g:availability_date>`
            : "",
          `      <g:price>${xmlEscape(price)}</g:price>`,
          `      <g:brand>${xmlEscape(marcaNombre)}</g:brand>`,
          `      <g:condition>new</g:condition>`,
          `      <g:google_product_category>${xmlEscape(GOOGLE_CATEGORY)}</g:google_product_category>`,
          `      <g:product_type>${xmlEscape(productType)}</g:product_type>`,
          `      <g:mpn>${xmlEscape(v.sku)}</g:mpn>`,
          `      <g:identifier_exists>false</g:identifier_exists>`,
          "    </item>",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Veliroz Cosmetic — Catálogo</title>
    <link>${xmlEscape(site)}</link>
    <description>Skincare coreano curado por rutina en Perú — Beauty of Joseon, Anua, Round Lab, COSRX y SKIN1004.</description>
    <lastBuildDate>${xmlEscape(now)}</lastBuildDate>
${rows.join("\n")}
  </channel>
</rss>
`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
}
