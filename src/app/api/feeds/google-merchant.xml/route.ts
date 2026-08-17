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

/* Base URL: en Vercel Preview / branch deploys, VERCEL_URL (host sin
   protocolo) es lo más confiable. En prod fijamos veliroz.com.
   Priorizamos NEXT_PUBLIC_SITE_URL si el equipo lo setea para custom domain. */
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

export async function GET(): Promise<Response> {
  const site = baseUrl();
  let items: ProductoRow[] = [];

  try {
    const { data, error } = await getSupabase()
      .from("productos")
      .select(PRODUCTO_SELECT)
      .eq("linea_negocio", "cosmetic")
      .eq("activo", true);
    if (error) throw error;
    items = ((data ?? []) as unknown) as ProductoRow[];
  } catch (e) {
    console.warn("[feed google-merchant] Supabase no disponible:", e);
    items = [];
  }

  const now = new Date().toUTCString();

  const rows: string[] = [];
  for (const p of items) {
    const marcaNombre = p.marca?.nombre ?? "Veliroz";
    const productLink = `${site}/producto/${encodeURIComponent(p.slug)}`;
    const imageFallback = p.imagen_principal ?? "";
    const productType = productTypeFor(p.categoria, p.subcategoria);
    const descBase =
      p.descripcion_corta ??
      `${p.nombre} — ${marcaNombre}. Disponible en Veliroz Cosmetic.`;

    const variantes = (p.variantes ?? []).filter((v) => v.activo);
    for (const v of variantes) {
      const availability = v.stock > 0 ? "in stock" : "out of stock";
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
    <description>Skincare clínico y honesto en Perú — The Ordinary, CeraVe, Beauty of Joseon, COSRX, Xhekpon.</description>
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
