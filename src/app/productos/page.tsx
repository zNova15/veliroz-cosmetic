import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { swatchFor } from "@/lib/marcas";
import {
  getSupabase,
  PRODUCTO_SELECT,
  type Producto,
  type ProductoRow,
  type Variante,
} from "@/lib/supabase";
import {
  FACETS,
  FiltrosMovil,
  FiltrosSidebar,
  hasAnyFilter,
  readMulti,
  type FacetKey,
  type SearchParams,
} from "@/components/FiltrosProductos";

/* ============================================================
   Veliroz Cosmetic — /productos
   Server Component: catálogo filtrable por URL state.
   - Query Supabase con RLS anon (productos activos, linea_negocio='cosmetic').
   - Filtros multi-select via searchParams (?marca=cerave,cosrx&tipo_piel=grasa).
     La config de facets y su UI viven en @/components/FiltrosProductos:
     sidebar en escritorio, panel colapsable + chips activos en móvil.
   - Sort por precio/destacado/created_at.
   - Estado vacío + botón "Limpiar filtros".
   ============================================================ */

export const metadata: Metadata = {
  title: "Catálogo de skincare",
  description:
    "Todos los productos Veliroz Cosmetic — Beauty of Joseon, Anua, Round Lab, COSRX, SKIN1004 y más. Filtra por tipo de piel, preocupación e ingrediente activo.",
  alternates: { canonical: "/productos" },
};

/* SearchParams (el objeto YA resuelto), FACETS y los helpers de URL viven en
   @/components/FiltrosProductos — misma fuente para la página y los filtros. */

const SORT_OPTIONS = [
  { slug: "destacado", label: "Destacados" },
  { slug: "precio-asc", label: "Precio: menor a mayor" },
  { slug: "precio-desc", label: "Precio: mayor a menor" },
  { slug: "novedad", label: "Novedades" },
] as const;

type SortSlug = (typeof SORT_OPTIONS)[number]["slug"];

/* Los colores por marca viven en @/lib/marcas (swatchFor) — misma fuente
   que PDP, /marcas y el quiz, para que un swatch nuevo se agregue una vez. */

/* ────────────────── Utilidades de URL state ────────────────── */

function readSingle(sp: SearchParams, key: string): string | undefined {
  const raw = sp[key];
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Reemplaza el valor de una key single (dropdown sort). */
function replaceHref(
  base: SearchParams,
  key: string,
  value: string,
): string {
  const clone: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v == null || k === key) continue;
    clone[k] = Array.isArray(v) ? v.join(",") : v;
  }
  clone[key] = value;
  const qs = new URLSearchParams(clone).toString();
  return qs ? `/productos?${qs}` : "/productos";
}

/* ────────────────── Data ────────────────── */

async function fetchProductos(): Promise<Producto[]> {
  const { data, error } = await getSupabase()
    .from("productos")
    .select(PRODUCTO_SELECT)
    .eq("linea_negocio", "cosmetic")
    .eq("activo", true);

  if (error) {
    // eslint-disable-next-line no-console
    console.error("[productos] Supabase error:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as ProductoRow[];
  return rows.map((r) => ({
    ...r,
    tipo_piel: r.tipo_piel ?? [],
    preocupacion: r.preocupacion ?? [],
    ingrediente_activo: r.ingrediente_activo ?? [],
    variantes: (r.variantes ?? []).filter((v) => v.activo),
    marca: r.marca ?? undefined,
  }));
}

/* Devuelve la variante "referencia" (más barata activa) — la que muestra la card. */
function variantePrincipal(p: Producto): Variante | undefined {
  const vs = p.variantes ?? [];
  if (vs.length === 0) return undefined;
  return [...vs].sort((a, b) => Number(a.precio) - Number(b.precio))[0];
}

/* ── Lectura type-safe de meta (jsonb → Record<string, unknown> | null) ──
   Nunca confiamos en la forma del jsonb: si la clave falta o viene con otro
   tipo devolvemos null/false y la card simplemente no pinta ese bloque. */

function metaNumber(
  meta: Record<string, unknown> | null | undefined,
  key: string,
): number | null {
  const raw = meta?.[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function metaFlag(
  meta: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  return meta?.[key] === true;
}

/* ────────────────── Filtro + orden en JS ────────────────── */

function inPriceRange(precio: number, ranges: string[]): boolean {
  if (ranges.length === 0) return true;
  return ranges.some((r) => {
    if (r === "0-50") return precio < 50;
    if (r === "50-100") return precio >= 50 && precio <= 100;
    if (r === "100+") return precio > 100;
    return false;
  });
}

function applyFilters(
  productos: Producto[],
  sp: SearchParams,
): Producto[] {
  const marca = readMulti(sp, "marca");
  const categoria = readMulti(sp, "categoria");
  const tipoPiel = readMulti(sp, "tipo_piel");
  const preocupacion = readMulti(sp, "preocupacion");
  const ingrediente = readMulti(sp, "ingrediente");
  const precio = readMulti(sp, "precio");

  return productos.filter((p) => {
    if (marca.length && !marca.includes(p.marca?.slug ?? "")) return false;
    if (categoria.length && !categoria.includes(p.categoria)) return false;
    if (
      tipoPiel.length &&
      !tipoPiel.some((tp) => p.tipo_piel.includes(tp))
    )
      return false;
    if (
      preocupacion.length &&
      !preocupacion.some((pr) => p.preocupacion.includes(pr))
    )
      return false;
    if (
      ingrediente.length &&
      !ingrediente.some((ia) => p.ingrediente_activo.includes(ia))
    )
      return false;
    if (precio.length) {
      const v = variantePrincipal(p);
      if (!v) return false;
      if (!inPriceRange(Number(v.precio), precio)) return false;
    }
    return true;
  });
}

function applySort(productos: Producto[], sort: SortSlug): Producto[] {
  const list = [...productos];
  if (sort === "precio-asc" || sort === "precio-desc") {
    list.sort((a, b) => {
      const pa = Number(variantePrincipal(a)?.precio ?? Infinity);
      const pb = Number(variantePrincipal(b)?.precio ?? Infinity);
      return sort === "precio-asc" ? pa - pb : pb - pa;
    });
  } else if (sort === "novedad") {
    list.sort((a, b) => {
      const da = a.created_at ?? "";
      const db = b.created_at ?? "";
      return db.localeCompare(da);
    });
  } else {
    /* destacado (default) */
    list.sort((a, b) => {
      if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }
  return list;
}

/* ────────────────── Página ────────────────── */

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const sortRaw = readSingle(sp, "sort");
  const sort: SortSlug =
    SORT_OPTIONS.find((s) => s.slug === sortRaw)?.slug ?? "destacado";

  const allProductos = await fetchProductos();
  const filtered = applyFilters(allProductos, sp);
  const productos = applySort(filtered, sort);

  const anyFilter = hasAnyFilter(sp);

  return (
    <main className="min-h-screen">
      {/* NAV + spacer los provee el RootLayout (src/app/layout.tsx) */}
      {/* ────────────────── HEADER SECCIÓN ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-8">
        <nav
          aria-label="Migas de pan"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-4"
        >
          <Link href="/" className="hover:text-ink">
            Inicio
          </Link>
          <span className="mx-2">·</span>
          <span className="text-ink">Catálogo</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              · Skincare curado por rutina ·
            </span>
            <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
              Catálogo.{" "}
              <span className="font-italic-serif text-rose-deep">
                Encuentra lo que le hace bien a tu piel.
              </span>
            </h1>
            <p className="text-sm text-clay text-pretty">
              {productos.length}{" "}
              {productos.length === 1 ? "producto" : "productos"}
              {anyFilter ? " con los filtros aplicados" : " disponibles"}.
            </p>
          </div>

          {/* Sort dropdown — <details> nativo, sin JS de cliente */}
          <details className="relative group self-start md:self-end">
            <summary
              className="list-none cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-[--border-2] bg-surface text-sm text-ink hover:border-ink transition-colors"
              aria-label="Ordenar productos"
            >
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe">
                Ordenar
              </span>
              <span className="font-serif italic">
                {SORT_OPTIONS.find((s) => s.slug === sort)?.label}
              </span>
              <svg
                className="w-3.5 h-3.5 transition-transform group-open:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </summary>
            <div className="absolute right-0 mt-2 w-56 bg-surface border border-[--border-2] rounded-md shadow-lg overflow-hidden z-40">
              {SORT_OPTIONS.map((opt) => {
                const isActive = opt.slug === sort;
                return (
                  <Link
                    key={opt.slug}
                    href={replaceHref(sp, "sort", opt.slug)}
                    scroll={false}
                    className={
                      "block px-4 py-2.5 text-sm transition-colors " +
                      (isActive
                        ? "bg-mist text-ink"
                        : "text-clay hover:bg-mist/60 hover:text-ink")
                    }
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>
          </details>
        </div>
      </section>

      {/* ────────────────── LAYOUT SIDEBAR + GRID ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[264px_1fr] gap-10">
          {/* ────────── SIDEBAR (escritorio) ────────── */}
          <FiltrosSidebar sp={sp} />

          {/* ────────── GRID ────────── */}
          <div>
            {/* Filtros de móvil DENTRO de la columna de resultados: colapsados
                arriba de la grilla, no como una pared de chips antes de ella. */}
            <FiltrosMovil sp={sp} total={productos.length} />

            {productos.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {productos.map((p) => (
                  <ProductoCard key={p.id} producto={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

/* ────────────────── Componentes card + empty ────────────────── */

function ProductoCard({ producto }: { producto: Producto }) {
  const v = variantePrincipal(producto);
  const marcaNombre = producto.marca?.nombre ?? "Veliroz";
  const swatch = swatchFor(producto.marca?.slug);
  const tipoLabel = labelForCategoria(producto.categoria);
  const para = subheadPara(producto);

  const sinStock = !v || v.stock <= 0;
  /* Pre-venta = sin stock a propósito (Gabriel compra al confirmar el pedido).
     Solo mostramos "Agotado" cuando NO es pre-venta: de lo contrario todo el
     catálogo se leería como agotado. */
  /* nso_pendiente: exhibido para medir interés, pero NO comprable hasta que
     el proveedor exhiba la Notificación Sanitaria. Gana sobre "pre-venta"
     porque prometer una reserva de algo que no podemos vender es peor que no
     mostrarlo. */
  const nsoPendiente = metaFlag(producto.meta, "nso_pendiente");
  const preventa = sinStock && !nsoPendiente && metaFlag(producto.meta, "preventa");
  const agotado = sinStock && !preventa && !nsoPendiente;

  const rating = metaNumber(producto.meta, "rating_ext");
  const reviews = metaNumber(producto.meta, "reviews_ext");

  return (
    <Link
      href={`/producto/${producto.slug}`}
      className="prod-card group focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
    >
      {/* ── MEDIA ── aspect-square: los packshots reales son 1:1 con fondo
          blanco, así que la card los muestra completos (object-contain) sobre
          una base blanca con un velo del color de marca. */}
      <div className="relative aspect-square bg-white">
        {producto.imagen_principal && (
          <div
            aria-hidden
            className="absolute inset-0 opacity-25"
            style={{ background: swatch }}
          />
        )}

        {nsoPendiente && (
          <span className="absolute top-4 left-4 z-10 font-mono text-[9px] tracking-[0.18em] uppercase text-ink bg-mist px-2 py-1 rounded-sm">
            Próximamente
          </span>
        )}
        {preventa && (
          <span className="absolute top-4 left-4 z-10 font-mono text-[9px] tracking-wider uppercase text-ink bg-champagne px-2 py-1 rounded-sm">
            · Pre-venta ·
          </span>
        )}
        {agotado && (
          <span className="absolute top-4 left-4 z-10 font-mono text-[9px] tracking-[0.18em] uppercase text-cream bg-ink/85 px-2 py-1 rounded-sm">
            Agotado
          </span>
        )}
        {producto.destacado && (
          <span className="absolute top-4 right-4 z-10 font-mono text-[9px] tracking-[0.2em] uppercase text-ink bg-cream px-2 py-1 rounded-sm">
            · Hero ·
          </span>
        )}

        {producto.imagen_principal ? (
          <Image
            src={producto.imagen_principal}
            alt={`${marcaNombre} — ${producto.nombre}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain p-6"
          />
        ) : (
          /* Sin foto todavía → placeholder tipográfico sobre el swatch pleno. */
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: swatch }}
          >
            <div className="text-center px-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe mb-3">
                {tipoLabel}
              </p>
              <p className="font-serif text-xl text-ink italic leading-tight">
                {marcaNombre}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe">
            {marcaNombre}
          </p>
          <h3 className="font-serif text-base text-ink leading-snug text-pretty">
            {producto.nombre}
          </h3>

          {rating != null && (
            <div
              className="flex items-center gap-1.5 pt-0.5"
              title="Valoración internacional verificada"
            >
              <Estrellas rating={rating} />
              <span className="font-mono text-[10px] text-clay">
                <span className="sr-only">Valoración internacional: </span>
                {rating}
                {reviews != null &&
                  ` · ${reviews.toLocaleString("es-PE")} reseñas`}
              </span>
            </div>
          )}

          <p className="text-xs text-clay">
            {v?.variante_label ?? "—"}
            {para && ` · ${para}`}
          </p>
        </div>

        <div className="flex items-end justify-between pt-3 mt-auto border-t border-[--border]">
          <div>
            {v?.precio_antes != null && Number(v.precio_antes) > Number(v.precio) && (
              <p className="font-mono text-[10px] text-stone line-through">
                S/. {Number(v.precio_antes).toFixed(2)}
              </p>
            )}
            <p className="font-mono text-lg text-ink">
              {v ? `S/. ${Number(v.precio).toFixed(2)}` : "—"}
            </p>
            {preventa && (
              <p className="text-[10px] text-clay mt-0.5">Entrega 5-7 días</p>
            )}
          </div>
          <span className="text-xs text-ink underline underline-offset-4 group-hover:text-rose-deep">
            Ver →
          </span>
        </div>
      </div>
    </Link>
  );
}

/* Estrellas de valoración externa (StyleKorean / Jolse / Amazon / Hwahae).
   Rellenas = rating redondeado; el resto quedan en gris para que se lea
   como una escala sobre 5 y no como una fila decorativa. */
function Estrellas({ rating }: { rating: number }) {
  const llenas = Math.round(rating);
  return (
    <span aria-hidden className="inline-flex items-center gap-px text-[10px] leading-none">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={i <= llenas ? "text-champagne-dark" : "text-stone/40"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface border border-[--border] rounded-lg p-12 text-center space-y-4">
      <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
        Sin resultados
      </span>
      <h3 className="font-serif text-2xl text-ink italic">
        No encontramos productos con esos filtros.
      </h3>
      <p className="text-sm text-clay max-w-md mx-auto text-pretty">
        Prueba quitar algún filtro o vuelve al catálogo completo — todo el
        curado de Veliroz esperándote.
      </p>
      <div className="pt-2">
        <Link href="/productos" className="btn-outline">
          Limpiar filtros
        </Link>
      </div>
    </div>
  );
}

/* ────────────────── Formateo textual ────────────────── */

function labelForCategoria(slug: string): string {
  const opt = FACETS.categoria.options.find((o) => o.slug === slug);
  return opt?.label ?? slug;
}

function subheadPara(p: Producto): string {
  /* Toma las primeras 2 preocupaciones legibles para la línea "para". */
  const pre = p.preocupacion.slice(0, 2).map(prettyToken);
  return pre.join(" · ");
}

function prettyToken(slug: string): string {
  /* Busca en todos los facets, si no lo encuentra hace title-case básico. */
  for (const key of Object.keys(FACETS) as FacetKey[]) {
    const opt = FACETS[key].options.find((o) => o.slug === slug);
    if (opt) return opt.label;
  }
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
