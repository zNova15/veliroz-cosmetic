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

/* ── Disponibilidad ──────────────────────────────────────────
   El catálogo entero arrancó en PRE-VENTA: stock físico 0 esperando el
   primer lote, pero los SKUs son vendibles (el cliente reserva y se
   despacha al llegar el lote — ver PreventaBar y AddToCartButton).
   Antes esto salía como 'out of stock' en los 18 SKUs, y ese es el problema
   caro: Meta NO sirve campañas Advantage+ sobre un catálogo agotado, así
   que la pauta no podía correr aunque se pagara.

   'available for order' es el valor de Meta para "se compra hoy, se
   entrega después" — el equivalente del 'preorder' de Google. 'out of
   stock' queda reservado al agotado real: sin stock y sin meta.preventa.

   Nota de spelling: Meta documenta los valores con espacio ('in stock',
   'available for order'). No los pasamos a snake_case porque el feed ya
   está aprobado en Commerce Manager con esta grafía y no hay razón para
   arriesgar un re-review. */
type DisponibilidadMeta = "in stock" | "available for order" | "out of stock";

function disponibilidadMeta(
  stock: number,
  preventa: boolean,
): DisponibilidadMeta {
  if (stock > 0) return "in stock";
  return preventa ? "available for order" : "out of stock";
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
         es exponerse ante DIGEMID — y Meta también sanciona el catálogo.

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
    const preventa = p.meta?.preventa === true;

    const variantes = (p.variantes ?? []).filter((v) => v.activo);
    for (const v of variantes) {
      const availability = disponibilidadMeta(Number(v.stock ?? 0), preventa);
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
