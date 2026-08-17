import {
  getSupabase,
  PRODUCTO_SELECT,
  type ProductoRow,
} from "@/lib/supabase";
import { siteUrl } from "@/lib/site";

/* ============================================================
   Veliroz Cosmetic — Meta (Facebook/Instagram) Catalog CSV
   GET /api/feeds/meta-catalog.csv
   - Formato CSV que Meta Commerce Manager acepta como Data Feed.
   - Columnas obligatorias: id, title, description, availability,
     condition, price, link, image_link, brand.
   - Extras útiles: google_product_category, product_type.
   - Cache ISR 6h (Meta recrawlea cada 24h por defecto).
   ============================================================ */

export const revalidate = 21600; // 6h
export const dynamic = "force-static";

function baseUrl(): string {
  // Delegado a src/lib/site.ts — ver ahí por qué no se usa VERCEL_URL en prod.
  return siteUrl();
}

/* CSV RFC 4180 escaping:
   - Envolvemos SIEMPRE entre comillas dobles (Meta parsea sin ambigüedad).
   - Escapamos comillas internas duplicándolas ("" ).
   - Colapsamos CR/LF a espacio para no romper el conteo de filas. */
function csvCell(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return `""`;
  const s = String(raw).replace(/[\r\n]+/g, " ").replace(/"/g, '""');
  return `"${s}"`;
}

const GOOGLE_CATEGORY =
  "Health & Beauty > Personal Care > Cosmetics > Skin Care";

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
    console.warn("[feed meta-catalog] Supabase no disponible:", e);
    items = [];
  }

  const header = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "link",
    "image_link",
    "brand",
    "google_product_category",
    "product_type",
  ].join(",");

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
          csvCell(v.sku),
          csvCell(titleFull),
          csvCell(descBase),
          csvCell(availability),
          csvCell("new"),
          csvCell(price),
          csvCell(productLink),
          csvCell(image),
          csvCell(marcaNombre),
          csvCell(GOOGLE_CATEGORY),
          csvCell(productType),
        ].join(","),
      );
    }
  }

  const csv = [header, ...rows].join("\r\n") + "\r\n";

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control":
        "public, max-age=0, s-maxage=21600, stale-while-revalidate=86400",
      "Content-Disposition": 'inline; filename="veliroz-meta-catalog.csv"',
    },
  });
}
