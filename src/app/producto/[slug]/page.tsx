import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getSupabase,
  type Marca,
  type Producto,
  type ProductoRow,
  type Variante,
} from "@/lib/supabase";
import type { ProductoPDP, ReviewRow } from "@/lib/types";
import { swatchFor } from "@/lib/marcas";
import { Gallery } from "@/components/Gallery";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductTabs } from "@/components/ProductTabs";
import { ViewProductTracker } from "@/components/ViewProductTracker";

/* ============================================================
   Veliroz Cosmetic — /producto/[slug]
   Server Component: PDP editorial (Aesop / The Ordinary vibe).
   - Query Supabase con RLS anon (producto + marca + variantes + reviews).
   - generateStaticParams → SSG en build.
   - generateMetadata dinámica + JSON-LD Product schema.
   - Fallback → notFound() si no existe o está inactivo.
   ============================================================ */

/* PDP select: PRODUCTO_SELECT + campos editoriales + reviews aprobadas. */
const PDP_SELECT = `
  id,
  slug,
  nombre,
  descripcion_corta,
  descripcion_larga,
  ingredientes_full,
  modo_uso,
  advertencias,
  marca_id,
  categoria,
  subcategoria,
  tipo_piel,
  preocupacion,
  ingrediente_activo,
  imagen_principal,
  destacado,
  tipo,
  linea_negocio,
  activo,
  meta,
  created_at,
  marca:marcas!productos_marca_id_fkey (
    id, slug, nombre, logo_url, pais_origen
  ),
  variantes:variantes_producto!variantes_producto_producto_id_fkey (
    id, producto_id, sku, variante_label, precio, precio_antes, stock, imagen, activo
  ),
  reviews:reviews (
    id, producto_id, cliente_id, pedido_id, rating, titulo, comentario,
    tipo_piel, edad_rango, foto_url, aprobado, util_count, created_at
  )
` as const;

/* Shape crudo devuelto por Supabase — igual que ProductoRow pero con campos
   editoriales y reviews. */
type PDPRow = ProductoRow & {
  descripcion_larga: string | null;
  ingredientes_full: string | null;
  modo_uso: string | null;
  advertencias: string | null;
  reviews: ReviewRow[] | null;
};

/* ────────────────── Data fetching ────────────────── */

async function fetchProductoPDP(slug: string): Promise<ProductoPDP | null> {
  const { data, error } = await getSupabase()
    .from("productos")
    .select(PDP_SELECT)
    .eq("slug", slug)
    .eq("linea_negocio", "cosmetic")
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[pdp] Supabase error:", error);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as PDPRow;
  const variantes = (row.variantes ?? [])
    .filter((v) => v.activo)
    .sort((a, b) => Number(a.precio) - Number(b.precio));

  const reviewsAprob = (row.reviews ?? []).filter((r) => r.aprobado);
  const reviewsCount = reviewsAprob.length;
  const reviewsAvg =
    reviewsCount > 0
      ? reviewsAprob.reduce((acc, r) => acc + r.rating, 0) / reviewsCount
      : null;

  return {
    ...row,
    tipo_piel: row.tipo_piel ?? [],
    preocupacion: row.preocupacion ?? [],
    ingrediente_activo: row.ingrediente_activo ?? [],
    marca: row.marca ?? null,
    variantes,
    reviews: reviewsAprob.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    reviews_avg: reviewsAvg,
    reviews_count: reviewsCount,
  };
}

/* Relacionados: hasta 4 productos activos de la misma marca O categoría,
   excluyendo el actual, ordenados por destacado desc, luego nombre. */
async function fetchRelacionados(actual: ProductoPDP): Promise<Producto[]> {
  const sb = getSupabase();
  const relSelect = `
    id, slug, nombre, descripcion_corta, marca_id, categoria, subcategoria,
    tipo_piel, preocupacion, ingrediente_activo, imagen_principal, destacado,
    tipo, linea_negocio, activo, meta, created_at,
    marca:marcas!productos_marca_id_fkey ( id, slug, nombre, logo_url, pais_origen ),
    variantes:variantes_producto!variantes_producto_producto_id_fkey ( id, producto_id, sku, variante_label, precio, precio_antes, stock, imagen, activo )
  ` as const;

  const filtroOr = actual.marca_id
    ? `marca_id.eq.${actual.marca_id},categoria.eq.${actual.categoria}`
    : `categoria.eq.${actual.categoria}`;

  const { data, error } = await sb
    .from("productos")
    .select(relSelect)
    .eq("linea_negocio", "cosmetic")
    .eq("activo", true)
    .neq("slug", actual.slug)
    .or(filtroOr)
    .limit(8);

  if (error) return [];
  const rows = (data ?? []) as unknown as ProductoRow[];

  return rows
    .map((r) => ({
      ...r,
      tipo_piel: r.tipo_piel ?? [],
      preocupacion: r.preocupacion ?? [],
      ingrediente_activo: r.ingrediente_activo ?? [],
      marca: r.marca ?? null,
      variantes: (r.variantes ?? []).filter((v) => v.activo),
    }))
    .sort((a, b) => {
      // Prioridad: misma marca > misma categoría. Luego destacado > nombre.
      const aSameMarca = a.marca_id === actual.marca_id ? 0 : 1;
      const bSameMarca = b.marca_id === actual.marca_id ? 0 : 1;
      if (aSameMarca !== bSameMarca) return aSameMarca - bSameMarca;
      if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    })
    .slice(0, 4);
}

/* ────────────────── SSG ────────────────── */

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const { data, error } = await getSupabase()
      .from("productos")
      .select("slug")
      .eq("linea_negocio", "cosmetic")
      .eq("activo", true);
    if (error || !data) return [];
    return (data as Array<{ slug: string }>).map((r) => ({ slug: r.slug }));
  } catch (e) {
    // Sin env vars Supabase en build → devolver [] y dejar SSR dinámico
    console.warn("[generateStaticParams] Supabase no disponible en build, sirviendo dinámico:", e);
    return [];
  }
}

// Permitir slugs no incluidos en generateStaticParams (SSR bajo demanda)
export const dynamicParams = true;

/* ────────────────── Metadata ────────────────── */

export async function generateMetadata(
  props: PageProps<"/producto/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const producto = await fetchProductoPDP(slug);
  if (!producto) {
    return {
      title: "Producto no encontrado",
      robots: { index: false, follow: false },
    };
  }
  const marcaNombre = producto.marca?.nombre ?? "Veliroz Cosmetic";
  const url = `https://veliroz.com/producto/${producto.slug}`;
  return {
    title: `${producto.nombre} · ${marcaNombre}`,
    description: producto.descripcion_corta ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title: `${producto.nombre} · ${marcaNombre}`,
      description: producto.descripcion_corta ?? undefined,
      url,
      siteName: "Veliroz Cosmetic",
      locale: "es_PE",
      type: "website",
    },
  };
}

/* ────────────────── Página ────────────────── */

const LABELS_CATEGORIA: Record<string, string> = {
  rutina: "Rutina completa",
  serum: "Sérum",
  limpiador: "Limpiador",
  "protector-solar": "Protector solar",
  exfoliante: "Exfoliante",
  tratamiento: "Tratamiento",
  "crema-hidratante": "Hidratante",
  essence: "Essence",
  mascarilla: "Mascarilla",
  herramientas: "Herramientas",
  tonico: "Tónico",
};

function labelCategoria(cat: string): string {
  return LABELS_CATEGORIA[cat] ?? cat.replace(/-/g, " ");
}

/* ── Lectura segura de productos.meta (jsonb) ──────────────────
   Campos PÚBLICOS: preventa, rating_ext, reviews_ext, evidencia.
   Campos INTERNOS que NUNCA se renderizan al cliente:
   precio_costo (columna), meta.proveedor_sugerido, meta.costo_est_pen. */
type Meta = Record<string, unknown> | null;

function metaNum(meta: Meta, key: string): number | null {
  const raw = meta?.[key];
  const n =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

function metaStr(meta: Meta, key: string): string | null {
  const raw = meta?.[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

/* meta.evidencia viene MEZCLADA: fragmentos de social proof público
   (rankings de StyleKorean / Olive Young / Amazon…) junto con research
   interno de compras (proveedor AliExpress, márgenes 49-57%, "SIN NSO",
   huecos de stock de la competencia). Publicarla cruda filtra sourcing y
   margen al cliente, así que solo se muestran los fragmentos que citan una
   fuente pública verificable y no tocan ningún tema interno.
   Lo ideal a futuro: un meta.evidencia_publica curado en la BD. */
const FUENTE_PUBLICA =
  /stylekorean|jolse|olive\s*young|hwahae|amazon|byrdie|falabella|aruma|tiktok|allure|glamour|cosmopolitan/i;

const FRAGMENTO_INTERNO =
  /margen|aliexpress|alibaba|proveedor|costo|\bnso\b|oportunidad|anclar|sin\s+stock|S\/\s*\d/i;

function evidenciaPublica(raw: string | null): string | null {
  if (!raw) return null;
  const fragmentos = raw
    .split(/\s*·\s*/)
    .map((f) => f.trim())
    .filter((f) => f && FUENTE_PUBLICA.test(f) && !FRAGMENTO_INTERNO.test(f));
  return fragmentos.length > 0 ? fragmentos.join(" · ") : null;
}

export default async function ProductoPage(
  props: PageProps<"/producto/[slug]">
) {
  const { slug } = await props.params;
  const producto = await fetchProductoPDP(slug);
  if (!producto) notFound();

  const marca: Marca | null = producto.marca;
  const swatch = swatchFor(marca?.slug);
  const varianteRef: Variante | undefined = producto.variantes[0];
  const relacionados = await fetchRelacionados(producto);

  /* Pre-venta: meta.preventa + ninguna variante con stock físico. */
  const meta: Meta = producto.meta;
  const preventaFlag = meta?.preventa === true;
  const stockTotal = producto.variantes.reduce(
    (acc, v) => acc + Number(v.stock ?? 0),
    0
  );
  const enPreventa = preventaFlag && stockTotal <= 0;

  /* Social proof externo (StyleKorean / Jolse / Amazon / Hwahae). */
  const ratingExt = metaNum(meta, "rating_ext");
  const reviewsExt = metaNum(meta, "reviews_ext");
  /* SIEMPRE filtrada: meta.evidencia cruda mezcla social proof con research
     interno de compras (proveedor, margen, NSO). Ver evidenciaPublica(). */
  const evidencia = evidenciaPublica(metaStr(meta, "evidencia"));
  const estrellasExt = ratingExt !== null ? Math.round(ratingExt) : 0;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    description: producto.descripcion_corta ?? undefined,
    brand: marca ? { "@type": "Brand", name: marca.nombre } : undefined,
    category: labelCategoria(producto.categoria),
    image: producto.imagen_principal ?? undefined,
    ...(varianteRef && {
      sku: varianteRef.sku,
      offers: {
        "@type": "Offer",
        priceCurrency: "PEN",
        price: Number(varianteRef.precio).toFixed(2),
        availability:
          Number(varianteRef.stock) > 0
            ? "https://schema.org/InStock"
            : enPreventa
              ? "https://schema.org/PreOrder"
              : "https://schema.org/OutOfStock",
        url: `https://veliroz.com/producto/${producto.slug}`,
      },
    }),
    ...(producto.reviews_count > 0 && producto.reviews_avg !== null && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: producto.reviews_avg.toFixed(1),
        reviewCount: producto.reviews_count,
      },
    }),
  };

  return (
    <main className="min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Analytics: view_item / ViewContent — dispara al montar en cliente */}
      {varianteRef && (
        <ViewProductTracker
          sku={varianteRef.sku}
          marca={marca?.nombre ?? "Veliroz"}
          precio={Number(varianteRef.precio)}
          productoNombre={producto.nombre}
          categoria={producto.categoria}
        />
      )}

      {/* NAV + spacer los provee el RootLayout (src/app/layout.tsx) */}
      {/* ────────────────── BREADCRUMB ────────────────── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8">
        <nav aria-label="Breadcrumb" className="font-mono text-[10px] uppercase tracking-[0.22em] text-taupe">
          <ol className="flex flex-wrap gap-2 items-center">
            <li>
              <Link href="/" className="hover:text-ink">Inicio</Link>
            </li>
            <li aria-hidden>·</li>
            <li>
              <Link href="/productos" className="hover:text-ink">Catálogo</Link>
            </li>
            <li aria-hidden>·</li>
            <li>
              <Link
                href={`/productos?categoria=${producto.categoria}`}
                className="hover:text-ink"
              >
                {labelCategoria(producto.categoria)}
              </Link>
            </li>
          </ol>
        </nav>
      </div>

      {/* ────────────────── ABOVE-THE-FOLD ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-16 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-14 items-start">
        {/* Izq — Gallery (7/12 ≈ 58%) */}
        <div className="md:col-span-7">
          <Gallery
            productoId={producto.id}
            productoNombre={producto.nombre}
            marcaNombre={marca?.nombre ?? "Veliroz"}
            swatch={swatch}
            imagenUrl={producto.imagen_principal}
            destacado={producto.destacado}
            preventa={enPreventa}
          />
        </div>

        {/* Der — Info (5/12 ≈ 42%) */}
        <div className="md:col-span-5 md:sticky md:top-24 space-y-6">
          {marca && (
            <Link
              href={`/productos?marca=${marca.slug}`}
              className="font-mono text-[10px] uppercase tracking-[0.24em] text-taupe hover:text-ink"
            >
              {marca.nombre}
              {marca.pais_origen && (
                <span className="ml-2 text-stone">· {marca.pais_origen}</span>
              )}
            </Link>
          )}

          <h1 className="font-serif text-3xl md:text-4xl text-ink leading-[1.1] text-balance">
            {producto.nombre}
          </h1>

          {producto.descripcion_corta && (
            <p className="text-clay leading-relaxed text-pretty">
              {producto.descripcion_corta}
            </p>
          )}

          {/* Social proof externo — rating agregado de fuentes internacionales.
              No entra al JSON-LD (aggregateRating solo admite reseñas propias). */}
          {ratingExt !== null && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-champagne-dark" aria-hidden>
                {"★".repeat(estrellasExt)}
                {"☆".repeat(Math.max(0, 5 - estrellasExt))}
              </span>
              <span className="font-mono text-ink">{ratingExt.toFixed(1)}</span>
              {reviewsExt !== null && reviewsExt > 0 && (
                <span className="text-clay">
                  · {new Intl.NumberFormat("es-PE").format(reviewsExt)}{" "}
                  {reviewsExt === 1
                    ? "reseña internacional"
                    : "reseñas internacionales"}
                </span>
              )}
            </div>
          )}

          {/* Curaduría Veliroz — por qué este producto entró al catálogo */}
          {evidencia && (
            <div className="bg-mist rounded-lg p-3 space-y-1.5 border border-[--border]">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-taupe">
                Por qué lo elegimos
              </p>
              <p className="text-[13px] text-clay leading-relaxed text-pretty">
                {evidencia}
              </p>
            </div>
          )}

          {/* Rating summary — solo si hay reviews aprobadas */}
          {producto.reviews_count > 0 && producto.reviews_avg !== null && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-champagne-dark" aria-hidden>
                {"★".repeat(Math.round(producto.reviews_avg))}
                {"☆".repeat(5 - Math.round(producto.reviews_avg))}
              </span>
              <span className="font-mono text-ink">
                {producto.reviews_avg.toFixed(1)}
              </span>
              <span className="text-clay">
                · {producto.reviews_count} {producto.reviews_count === 1 ? "reseña" : "reseñas"}
              </span>
            </div>
          )}

          {/* Chips de contexto (tipo_piel / preocupación) */}
          {(producto.tipo_piel?.length || producto.preocupacion?.length) && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {producto.tipo_piel?.map((tp) => (
                <span
                  key={`tp-${tp}`}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-mist text-clay border border-[--border]"
                >
                  Piel {tp}
                </span>
              ))}
              {producto.preocupacion?.map((pr) => (
                <span
                  key={`pr-${pr}`}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-rose/20 text-ink border border-[--border]"
                >
                  {pr}
                </span>
              ))}
            </div>
          )}

          {/* AddToCartButton — interactivo */}
          <div className="pt-2">
            <AddToCartButton
              productoSlug={producto.slug}
              productoNombre={producto.nombre}
              marcaNombre={marca?.nombre ?? "Veliroz"}
              imagenSwatch={swatch}
              variantes={producto.variantes}
              preventa={enPreventa}
            />
          </div>

          {/* Info bar horizontal */}
          <ul className="grid grid-cols-3 gap-2 pt-6 border-t border-[--border] text-[11px] text-clay">
            <li className="flex flex-col gap-1">
              <span className="font-mono text-taupe uppercase tracking-wider text-[9px]">
                Envío
              </span>
              <span>Shalom S/12 nacional</span>
            </li>
            <li className="flex flex-col gap-1">
              <span className="font-mono text-taupe uppercase tracking-wider text-[9px]">
                Comprobante
              </span>
              <span>Boleta electrónica</span>
            </li>
            <li className="flex flex-col gap-1">
              <span className="font-mono text-taupe uppercase tracking-wider text-[9px]">
                Origen
              </span>
              <span>Producto original</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ────────────────── DIVIDER ────────────────── */}
      <div className="max-w-5xl mx-auto px-10">
        <div className="divider-champagne" />
      </div>

      {/* ────────────────── TABS ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-20">
        <ProductTabs
          descripcionLarga={producto.descripcion_larga}
          ingredienteActivo={producto.ingrediente_activo}
          ingredientesFull={producto.ingredientes_full}
          modoUso={producto.modo_uso}
          advertencias={producto.advertencias}
          reviews={producto.reviews}
          reviewsAvg={producto.reviews_avg}
          reviewsCount={producto.reviews_count}
        />
      </section>

      {/* ────────────────── RELACIONADOS ────────────────── */}
      {relacionados.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 border-t border-[--border]">
          <div className="flex items-end justify-between mb-8 gap-6">
            <div className="space-y-2">
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Podría interesarte
              </span>
              <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
                Seguí explorando.
              </h2>
            </div>
            <Link
              href="/productos"
              className="hidden md:inline text-sm text-clay hover:text-ink underline underline-offset-4"
            >
              Ver todo →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {relacionados.map((p) => (
              <RelatedCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* ────────────────── FOOTER MINI ────────────────── */}
      <footer className="max-w-7xl mx-auto px-6 md:px-10 py-10 border-t border-[--border] text-xs text-clay flex flex-col md:flex-row items-center justify-between gap-3">
        <p>© 2026 Veliroz Cosmetic · Sub-marca de Veliroz.</p>
        <div className="flex gap-6">
          <Link href="/productos" className="hover:text-ink">Todos los productos</Link>
          <Link href="/envios" className="hover:text-ink">Envíos y devoluciones</Link>
          <Link href="https://wa.me/51967456364" className="hover:text-ink">WhatsApp</Link>
        </div>
      </footer>
    </main>
  );
}

/* ────────────────── SUB-COMPONENTES SERVER ────────────────── */

/* Card compacta para el bloque "Podría interesarte".
   Reusa .prod-card + swatch por marca. Sin next/image. */
function RelatedCard({ p }: { p: Producto }) {
  const sw = swatchFor(p.marca?.slug);
  const v0 = (p.variantes ?? [])[0];
  return (
    <Link href={`/producto/${p.slug}`} className="prod-card group">
      <div
        className="aspect-square flex items-center justify-center relative"
        style={{ background: sw }}
      >
        <div className="text-center px-4">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe mb-2">
            {p.categoria.replace(/-/g, " ")}
          </p>
          <p className="font-italic-serif text-xl text-ink leading-tight">
            {p.marca?.nombre ?? "Veliroz"}
          </p>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-serif text-sm text-ink leading-snug text-pretty min-h-[2.4em]">
          {p.nombre}
        </h3>
        <div className="flex items-end justify-between mt-auto pt-2 border-t border-[--border]">
          <span className="font-mono text-sm text-ink">
            {v0 ? `S/. ${Number(v0.precio).toFixed(2)}` : "—"}
          </span>
          <span className="text-[10px] text-clay group-hover:text-rose-deep">Ver →</span>
        </div>
      </div>
    </Link>
  );
}
