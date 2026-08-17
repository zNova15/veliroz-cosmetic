import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { RUTINAS } from "@/lib/rutinas";
import { swatchFor } from "@/lib/marcas";
import {
  getSupabase,
  PRODUCTO_SELECT,
  type Producto,
  type ProductoRow,
  type Variante,
} from "@/lib/supabase";

/* ============================================================
   Veliroz Cosmetic — Landing '/'
   Server Component async: TODO el contenido de catálogo sale de Supabase
   (migración 013 · 12 SKUs reales con foto en Storage, todos en pre-venta).

   Nada de arrays hardcodeados de producto: si Gabriel cambia un precio o
   agrega un SKU en la BD, la landing se actualiza sola (ISR 5 min).

   Lo único hardcodeado son las rutinas (src/lib/rutinas.ts), que son copy
   editorial y ya referencian los slugs/SKUs reales.

   El chrome (CosmeticHeader + PreventaBar + CartDrawer) lo monta el
   RootLayout en src/app/layout.tsx — NO montarlo acá o se duplica.
   ============================================================ */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Veliroz Cosmetic · K-beauty curada y honesta en Perú",
  description:
    "Beauty of Joseon, Anua, Round Lab, COSRX, SKIN1004, Dr.Althea, BIODANCE y más — curados por rutina según tu piel. Pre-venta abierta, envío Shalom S/12 a todo el Perú.",
  alternates: { canonical: "/" },
};

/* Producto que ocupa el bloque visual del hero. Si no existe (o la query
   falla), caemos al primer destacado y después al primero de la lista. */
const HERO_SLUG = "beauty-of-joseon-relief-sun-spf50";
const MAX_CARDS = 8;

/* Etiqueta legible por categoría — mismos slugs que usa el catálogo. */
const CATEGORIA_LABEL: Record<string, string> = {
  serum: "Sérum",
  limpiador: "Limpiador",
  "protector-solar": "Protector solar",
  "crema-hidratante": "Hidratante",
  essence: "Essence",
  mascarilla: "Mascarilla",
  herramientas: "Herramientas",
};

function labelCategoria(slug: string): string {
  return (
    CATEGORIA_LABEL[slug] ??
    slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ")
  );
}

/* ────────────────── Data ────────────────── */

async function fetchCatalogo(): Promise<Producto[]> {
  try {
    const { data, error } = await getSupabase()
      .from("productos")
      .select(PRODUCTO_SELECT)
      .eq("linea_negocio", "cosmetic")
      .eq("activo", true)
      .order("destacado", { ascending: false })
      .order("nombre", { ascending: true });

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[landing] Supabase error:", error);
      return [];
    }

    const rows = (data ?? []) as unknown as ProductoRow[];
    return rows.map((r) => ({
      ...r,
      tipo_piel: r.tipo_piel ?? [],
      preocupacion: r.preocupacion ?? [],
      ingrediente_activo: r.ingrediente_activo ?? [],
      variantes: (r.variantes ?? []).filter((v) => v.activo),
      marca: r.marca ?? null,
    }));
  } catch (err) {
    /* Env vars ausentes o red caída: la landing igual renderiza (sin grilla)
       en vez de reventar el build/deploy. */
    // eslint-disable-next-line no-console
    console.error("[landing] no se pudo leer el catálogo:", err);
    return [];
  }
}

/* Variante de referencia = la más barata activa (la que muestra la card). */
function variantePrincipal(p: Producto): Variante | undefined {
  const vs = p.variantes ?? [];
  if (vs.length === 0) return undefined;
  return [...vs].sort((a, b) => Number(a.precio) - Number(b.precio))[0];
}

/* ────────────────── Lectores de meta (uso público solamente) ──────────────────
   OJO: meta también trae `precio_costo`, `costo_est_pen` y
   `proveedor_sugerido` — datos internos. Solo se leen las claves de abajo;
   nunca se renderiza `meta` completo. */

function esPreventa(p: Producto): boolean {
  return p.meta?.preventa === true;
}

function ratingExt(p: Producto): number | null {
  const v = p.meta?.rating_ext;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function reviewsExt(p: Producto): number | null {
  const v = p.meta?.reviews_ext;
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
}

function fmtNum(n: number): string {
  return n.toLocaleString("es-PE");
}

/* ────────────────── Página ────────────────── */

export default async function CosmeticLanding() {
  const productos = await fetchCatalogo();

  /* Contadores REALES: marcas que efectivamente tienen producto activo
     (no las 13 filas de `marcas`, varias sin catálogo todavía). */
  const marcas = Array.from(
    new Map(
      productos
        .map((p) => p.marca)
        .filter((m): m is NonNullable<typeof m> => Boolean(m?.slug))
        .map((m) => [m.slug, m])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const totalProductos = productos.length;
  const totalMarcas = marcas.length;

  /* El claim del hero dice "marcas coreanas": Veliroz es marca propia
     (gua sha, brochas) y NO puede contarse ahí. El contador "Marcas
     curadas" sí la incluye — está curada, solo que no es K-beauty.
     Para nombrar 4 en el copy priorizamos las que tienen producto
     destacado; a igualdad, alfabético. */
  const marcasKbeauty = marcas.filter((m) => m.slug !== "veliroz");
  const slugsDestacados = new Set(
    productos.filter((p) => p.destacado).map((p) => p.marca?.slug)
  );
  const marcasVitrina = [...marcasKbeauty].sort((a, b) => {
    const da = slugsDestacados.has(a.slug) ? 0 : 1;
    const db = slugsDestacados.has(b.slug) ? 0 : 1;
    return da !== db ? da - db : a.nombre.localeCompare(b.nombre, "es");
  });

  const hero =
    productos.find((p) => p.slug === HERO_SLUG) ??
    productos.find((p) => p.destacado) ??
    productos[0];
  const heroVariante = hero ? variantePrincipal(hero) : undefined;
  const heroRating = hero ? ratingExt(hero) : null;

  /* La grilla de la landing es la vitrina: solo entran productos con packshot
     real. Sin este filtro, el orden de la BD (destacado desc, nombre asc) mete
     el set Gua Sha —todavía sin foto— en el slot 8 y deja fuera al SKIN1004,
     que sí tiene. Los sets Veliroz siguen visibles en /productos.
     El fallback tipográfico de ProductoCard queda igual: si algún día no hay
     8 productos fotografiados, la grilla se completa igual en vez de vaciarse. */
  const cards = [
    ...productos.filter((p) => p.imagen_principal),
    ...productos.filter((p) => !p.imagen_principal),
  ].slice(0, MAX_CARDS);

  /* Índice slug → producto para resolver las líneas de cada rutina. */
  const porSlug = new Map(productos.map((p) => [p.slug, p]));
  const rutinasDestacadas = RUTINAS.slice(0, 3);

  return (
    <>
      <main className="min-h-screen">
        {/* ────────────────── HERO ────────────────── */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-7 space-y-8">
            <span className="inline-block text-[10px] tracking-[0.24em] uppercase text-taupe font-medium">
              · K-beauty curada · Pre-venta abierta · Perú ·
            </span>
            <h1 className="font-serif text-[--text-hero] leading-[0.95] text-ink text-balance">
              La rutina no es{" "}
              <span className="font-italic-serif text-rose-deep">un ritual</span>
              . Es un <span className="font-italic-serif text-rose-deep">método</span>
              .
            </h1>
            <p className="text-lg text-clay max-w-xl leading-relaxed text-pretty">
              {marcasVitrina.length > 0 ? (
                <>
                  Traemos las {marcasVitrina.length} marcas coreanas que sí
                  tienen evidencia detrás —{" "}
                  {marcasVitrina
                    .slice(0, 4)
                    .map((m) => m.nombre)
                    .join(", ")}{" "}
                  y más — y armamos rutinas concretas para tu piel.
                </>
              ) : (
                <>
                  Traemos las marcas coreanas que sí tienen evidencia detrás y
                  armamos rutinas concretas para tu piel.
                </>
              )}{" "}
              Reservá en pre-venta y recibí en 5-7 días · Shalom a todo el Perú.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/productos" className="btn-primary">
                Ver productos
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
              <Link href="/quiz" className="btn-outline">
                Quiz · ¿Qué le hace bien a tu piel?
              </Link>
            </div>

            <div className="flex flex-wrap gap-8 text-xs text-clay border-t border-[--border] pt-8">
              <div className="space-y-1">
                <p className="font-mono text-ink text-lg">{totalMarcas}</p>
                <p>Marcas curadas</p>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-ink text-lg">{totalProductos}</p>
                <p>Productos en catálogo</p>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-ink text-lg">Shalom</p>
                <p>Envío nacional S/12</p>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-ink text-lg">SUNAT</p>
                <p>Boleta electrónica</p>
              </div>
            </div>
          </div>

          {/* Hero visual — producto destacado #1 con su foto real.
              Los packshots son 1:1 con fondo blanco → base blanca + velo del
              color de marca (misma receta que las cards del catálogo), y el
              bloque de texto va debajo, no encima, para no tapar el envase. */}
          <div className="md:col-span-5">
            {hero ? (
              <div className="rounded-md overflow-hidden border border-[--border] bg-white">
                <div className="relative aspect-square">
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-25"
                    style={{ background: swatchFor(hero.marca?.slug) }}
                  />
                  {hero.imagen_principal ? (
                    <Image
                      src={hero.imagen_principal}
                      alt={`${hero.marca?.nombre ?? "Veliroz"} — ${hero.nombre}`}
                      fill
                      priority
                      sizes="(min-width: 768px) 40vw, 90vw"
                      className="object-contain p-10 md:p-12"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="font-italic-serif text-3xl text-ink">
                        {hero.marca?.nombre ?? "Veliroz"}
                      </p>
                    </div>
                  )}
                  {esPreventa(hero) && (
                    <span className="absolute top-4 left-4 z-10 font-mono text-[9px] tracking-wider uppercase text-ink bg-champagne px-2 py-1 rounded-sm">
                      · Pre-venta ·
                    </span>
                  )}
                </div>

                <div className="bg-cream border-t border-[--border] p-6 md:p-7 space-y-2">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                    Producto en foco
                  </span>
                  <h2 className="font-serif text-2xl text-ink leading-tight text-balance">
                    {hero.nombre}
                  </h2>
                  <p className="text-xs text-clay">
                    {hero.marca?.nombre ?? "Veliroz"}
                    {heroVariante ? ` · ${heroVariante.variante_label}` : ""}
                  </p>
                  {heroRating !== null && (
                    <p className="font-mono text-[10px] text-taupe">
                      ★ {heroRating.toFixed(1)}
                      {reviewsExt(hero) !== null && (
                        <> · {fmtNum(reviewsExt(hero)!)} reseñas</>
                      )}
                    </p>
                  )}

                  <div className="pt-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-taupe">
                        {esPreventa(hero) ? "Pre-venta desde" : "Desde"}
                      </p>
                      <p className="font-serif text-3xl text-ink">
                        {heroVariante
                          ? `S/. ${Number(heroVariante.precio).toFixed(2)}`
                          : "—"}
                      </p>
                    </div>
                    <Link
                      href={`/producto/${hero.slug}`}
                      className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep shrink-0"
                    >
                      Ver ficha →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative aspect-[4/5] rounded-md overflow-hidden bg-gradient-to-br from-cream-2 via-mist to-rose/20 border border-[--border] p-10 flex items-center justify-center">
                <p className="font-italic-serif text-2xl text-taupe text-center">
                  Catálogo en camino
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ────────────────── BANNER OPERADO ────────────────── */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 pb-12">
          <div className="bg-surface rounded-lg border border-[--border] p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe shrink-0">
              Cómo funciona la pre-venta
            </span>
            <p className="text-sm text-clay flex-1 text-pretty">
              Reservás hoy, cerramos el lote y despachamos en{" "}
              <strong className="text-ink">5 a 7 días</strong>. Preparamos tu
              pedido en Cajamarca y enviamos por{" "}
              <strong className="text-ink">Shalom-agencia (S/12)</strong> a todo
              el Perú. En <strong className="text-ink">Lima</strong> también
              entregamos a domicilio (S/18).
            </p>
          </div>
        </section>

        {/* ────────────────── PRODUCTOS ────────────────── */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-16">
          <div className="flex items-end justify-between mb-10 gap-6">
            <div className="space-y-2">
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Nuestra selección · {totalProductos} productos
              </span>
              <h2 className="font-serif text-[--text-display] text-ink leading-tight">
                Empezá acá.
              </h2>
            </div>
            <Link
              href="/productos"
              className="hidden md:inline text-sm text-clay hover:text-ink underline underline-offset-4"
            >
              Todos los productos →
            </Link>
          </div>

          {cards.length === 0 ? (
            <div className="bg-surface border border-[--border] rounded-lg p-12 text-center space-y-3">
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Catálogo
              </span>
              <p className="font-serif text-2xl text-ink italic">
                Estamos cargando la selección.
              </p>
              <p className="text-sm text-clay">
                Escribinos por WhatsApp y te contamos qué entra en el próximo
                lote.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cards.map((p) => (
                <ProductoCard key={p.id} producto={p} />
              ))}
            </div>
          )}

          <p className="mt-8 text-[11px] text-stone text-center md:text-left text-pretty">
            Las valoraciones provienen de fuentes internacionales verificables
            (StyleKorean, Jolse, Olive Young, Hwahae, Amazon). Todavía no
            tenemos reseñas propias — cuando las haya, van a ser de clientas
            peruanas reales.
          </p>

          <div className="mt-10 text-center md:hidden">
            <Link
              href="/productos"
              className="text-sm text-clay hover:text-ink underline underline-offset-4"
            >
              Todos los productos →
            </Link>
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-10">
          <div className="divider-champagne" />
        </div>

        {/* ────────────────── RUTINAS CURADAS ────────────────── */}
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-20">
          <div className="text-center mb-14 space-y-3">
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              No compres productos. Comprá rutinas.
            </span>
            <h2 className="font-serif text-[--text-display] text-ink">
              Empezá por acá según tu piel.
            </h2>
            <p className="text-clay max-w-2xl mx-auto text-pretty">
              Cada rutina es una selección corta — limpieza, activo y protección
              — pensada para un objetivo específico. Llevándola completa te sale
              menos que comprando suelto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rutinasDestacadas.map((r) => {
              const lineas = r.pasos
                .map((paso) => {
                  const prod = porSlug.get(paso.productoSlug);
                  if (!prod) return null;
                  return `${labelCategoria(prod.categoria)} · ${
                    prod.marca?.nombre ?? "Veliroz"
                  }`;
                })
                .filter((x): x is string => Boolean(x));

              return (
                <article
                  key={r.slug}
                  className="rounded-lg p-8 flex flex-col gap-5 border border-[--border]"
                  style={{ background: r.accent }}
                >
                  <div className="space-y-1">
                    <span className="font-mono text-[9px] tracking-[0.24em] uppercase text-taupe">
                      {r.tag}
                    </span>
                    <h3 className="font-serif text-3xl text-ink italic leading-tight">
                      {r.nombre}
                    </h3>
                  </div>

                  {lineas.length > 0 && (
                    <ul className="space-y-2 text-sm text-clay">
                      {lineas.map((l, i) => (
                        <li key={`${r.slug}-${i}`} className="flex items-start gap-2">
                          <span className="text-champagne-dark mt-1.5 shrink-0">
                            ◦
                          </span>
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="pt-4 mt-auto border-t border-[--border] flex items-end justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] text-stone line-through">
                        S/. {r.precioLista.toFixed(2)}
                      </p>
                      <p className="font-mono text-lg text-ink">
                        S/. {r.precioBundle.toFixed(2)}
                      </p>
                      <p className="font-mono text-[9px] tracking-[0.16em] uppercase text-champagne-dark">
                        Ahorrás S/{r.ahorro}
                      </p>
                    </div>
                    <Link
                      href={`/rutinas/${r.slug}`}
                      className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep shrink-0"
                    >
                      Ver rutina →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-10 text-center space-y-3">
            <p className="text-[11px] text-stone text-pretty max-w-xl mx-auto">
              El precio de rutina se aplica al confirmar tu reserva por
              WhatsApp; el carrito suma los precios sueltos.
            </p>
            <Link
              href="/rutinas"
              className="text-sm text-clay hover:text-ink underline underline-offset-4"
            >
              Las {RUTINAS.length} rutinas curadas →
            </Link>
          </div>
        </section>

        {/* ────────────────── MARCAS ────────────────── */}
        {marcas.length > 0 && (
          <section className="bg-surface py-16 border-y border-[--border]">
            <div className="max-w-7xl mx-auto px-6 md:px-10 text-center space-y-8">
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Nuestras marcas
              </span>
              <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-5">
                {marcas.map((m) => (
                  <Link
                    key={m.slug}
                    href={`/marcas/${m.slug}`}
                    className="font-serif text-xl md:text-2xl text-ink italic hover:text-rose-deep transition-colors"
                  >
                    {m.nombre}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ────────────────── FOOTER ────────────────── */}
        <footer className="max-w-7xl mx-auto px-6 md:px-10 pt-20 pb-10 mt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-sm">
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center font-serif italic font-bold">
                  V
                </span>
                <div className="flex flex-col leading-none">
                  <span className="font-serif text-ink text-base font-semibold">
                    Veliroz Cosmetic
                  </span>
                  <span className="text-[9px] tracking-[0.18em] text-clay uppercase mt-1">
                    Skincare curado · Perú
                  </span>
                </div>
              </div>
              <p className="text-clay max-w-md leading-relaxed text-pretty">
                Curamos las marcas que sí funcionan y te armamos la rutina.
                Operado desde Cajamarca, entregamos a todo el Perú.
              </p>
              <div className="flex gap-4 items-center pt-2">
                <Link
                  href="https://wa.me/51967456364"
                  className="text-clay hover:text-ink text-sm underline underline-offset-4"
                >
                  WhatsApp +51 967 456 364
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Explora
              </h3>
              <ul className="space-y-2 text-clay">
                <li>
                  <Link href="/productos" className="hover:text-ink">
                    Productos
                  </Link>
                </li>
                <li>
                  <Link href="/rutinas" className="hover:text-ink">
                    Rutinas
                  </Link>
                </li>
                <li>
                  <Link href="/marcas" className="hover:text-ink">
                    Marcas
                  </Link>
                </li>
                <li>
                  <Link href="/quiz" className="hover:text-ink">
                    Quiz de piel
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-ink">
                    Diario
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Cuenta
              </h3>
              <ul className="space-y-2 text-clay">
                <li>
                  <Link href="/cuenta" className="hover:text-ink">
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link href="/mis-pedidos" className="hover:text-ink">
                    Mis pedidos
                  </Link>
                </li>
                <li>
                  <Link href="/envios" className="hover:text-ink">
                    Envíos y devoluciones
                  </Link>
                </li>
                <li>
                  <Link href="/contacto" className="hover:text-ink">
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link
                    href="/libro-reclamaciones"
                    className="hover:text-ink"
                  >
                    Libro de reclamaciones
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-[--border] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-clay">
            <p>© 2026 Veliroz Cosmetic · Sub-marca de Veliroz.</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/terminos" className="hover:text-ink">
                Términos y condiciones
              </Link>
              <Link href="/privacidad" className="hover:text-ink">
                Privacidad
              </Link>
              <Link href="https://flores.veliroz.com" className="hover:text-ink">
                Veliroz Flores Eternas
              </Link>
              <Link
                href="https://flores.veliroz.com/chocotejas"
                className="hover:text-ink"
              >
                Chocotejas Veliroz
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

/* ────────────────── Card de producto ────────────────── */

function ProductoCard({ producto }: { producto: Producto }) {
  const v = variantePrincipal(producto);
  const swatch = swatchFor(producto.marca?.slug);
  const rating = ratingExt(producto);
  const reviews = reviewsExt(producto);
  const preventa = esPreventa(producto);
  const marcaNombre = producto.marca?.nombre ?? "Veliroz";

  return (
    <article className="prod-card">
      {/* Packshots 1:1 con fondo blanco → base blanca + velo de marca
          (misma receta que las cards de /productos). */}
      <Link
        href={`/producto/${producto.slug}`}
        className="relative aspect-square block overflow-hidden bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        aria-label={`Ver ficha de ${marcaNombre} ${producto.nombre}`}
      >
        {producto.imagen_principal ? (
          <>
            <div
              aria-hidden
              className="absolute inset-0 opacity-25"
              style={{ background: swatch }}
            />
            <Image
              src={producto.imagen_principal}
              alt={`${marcaNombre} — ${producto.nombre}`}
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
              className="object-contain p-6"
            />
          </>
        ) : (
          /* Sin packshot todavía (sets Veliroz): placeholder tipográfico. */
          <div
            className="absolute inset-0 flex items-center justify-center text-center px-6"
            style={{ background: swatch }}
          >
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe mb-3">
                {labelCategoria(producto.categoria)}
              </p>
              <p className="font-serif text-xl text-ink italic leading-tight">
                {marcaNombre}
              </p>
            </div>
          </div>
        )}

        {preventa && (
          <span className="absolute top-4 left-4 z-10 font-mono text-[9px] tracking-wider uppercase text-ink bg-champagne px-2 py-1 rounded-sm">
            · Pre-venta ·
          </span>
        )}
        {producto.destacado && (
          <span className="absolute top-4 right-4 z-10 font-mono text-[9px] tracking-[0.2em] uppercase text-ink bg-cream px-2 py-1 rounded-sm">
            · Hero ·
          </span>
        )}
      </Link>

      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe">
            {marcaNombre}
          </p>
          <h3 className="font-serif text-base text-ink leading-snug text-pretty">
            <Link
              href={`/producto/${producto.slug}`}
              className="hover:text-rose-deep transition-colors"
            >
              {producto.nombre}
            </Link>
          </h3>
          <p className="text-xs text-clay">
            {v?.variante_label ?? "—"} · {labelCategoria(producto.categoria)}
          </p>
          {rating !== null && (
            <p className="font-mono text-[10px] text-taupe">
              ★ {rating.toFixed(1)}
              {reviews !== null && <> · {fmtNum(reviews)} reseñas</>}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between pt-3 mt-auto border-t border-[--border]">
          <div>
            {v?.precio_antes != null &&
              Number(v.precio_antes) > Number(v.precio) && (
                <p className="font-mono text-[10px] text-stone line-through">
                  S/. {Number(v.precio_antes).toFixed(2)}
                </p>
              )}
            <p className="font-mono text-lg text-ink">
              {v ? `S/. ${Number(v.precio).toFixed(2)}` : "—"}
            </p>
          </div>
          <Link
            href={`/producto/${producto.slug}`}
            className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep"
          >
            Ver →
          </Link>
        </div>
      </div>
    </article>
  );
}
