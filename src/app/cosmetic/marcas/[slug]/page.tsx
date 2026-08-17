import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import {
  getSupabase,
  PRODUCTO_SELECT,
  type Marca,
  type Producto,
  type ProductoRow,
  type Variante,
} from "@/lib/supabase";
import { swatchFor } from "@/lib/marcas";

/* ============================================================
   /cosmetic/marcas/[slug] — detalle marca + productos.
   Server Component. Sirve como landing dedicada de cada marca.
   ============================================================ */

/* Copy más largo para el hero de cada marca. */
const MARCA_HERO: Record<
  string,
  { intro: string; claim: string; fundada?: string }
> = {
  "the-ordinary": {
    claim: "Ingredientes activos, precios honestos.",
    intro:
      "Marca de Deciem que rompió la industria en 2016 con serums monoactivos y etiquetas que dicen exactamente qué contienen y a qué concentración. Sin fragancias innecesarias, sin marketing inflado. Formulaciones respaldadas por dermatología clínica.",
    fundada: "Fundada en Toronto, Canadá · 2016",
  },
  cerave: {
    claim: "Desarrollada con dermatólogos.",
    intro:
      "La marca de rutina básica más recomendada por dermatólogos en Estados Unidos. Fórmulas con la combinación 3:1:1 de ceramidas (NP/AP/EOP) que reponen la barrera lipídica de la piel. Para todos los tipos de piel, incluso las más sensibles.",
    fundada: "Fundada en Estados Unidos · 2005",
  },
  "beauty-of-joseon": {
    claim: "Tradición hanbang, ciencia moderna.",
    intro:
      "K-beauty inspirada en las recetas de belleza coreanas del período Joseon (1392-1897). Ingredientes tradicionales — ginseng, arroz fermentado, propóleo — en formulaciones modernas. Su Relief Sun con arroz + probióticos es el estándar oro global de protectores solares sin residuo blanco.",
    fundada: "Corea del Sur · 2010",
  },
  cosrx: {
    claim: "K-beauty clínica, cero adornos.",
    intro:
      "Fórmulas coreanas con foco absoluto en la eficacia. La Snail Mucin al 96% (filtrado de Achatina fulica) es su hero indiscutido: reparación, cicatrices, post-procedimientos. Empaques minimalistas, packagings sin frituras.",
    fundada: "Corea del Sur · 2013",
  },
  xhekpon: {
    claim: "El clásico español para cuello y escote.",
    intro:
      "Fórmula centenaria (nombre proviene de la contracción \"Hepko-N\") con colágeno hidrolizado y elastina. Es la crema de referencia en farmacias españolas para las zonas que casi nadie cuida: cuello, escote y contorno de manos.",
    fundada: "España · años 60",
  },
};

/* ────────────────── Data ────────────────── */

async function fetchMarca(slug: string): Promise<Marca | null> {
  const { data, error } = await getSupabase()
    .from("marcas")
    .select("id, slug, nombre, logo_url, pais_origen")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[marca] Supabase error:", error);
    return null;
  }
  return (data as Marca) ?? null;
}

async function fetchProductosDeMarca(marcaId: string): Promise<Producto[]> {
  const { data, error } = await getSupabase()
    .from("productos")
    .select(PRODUCTO_SELECT)
    .eq("linea_negocio", "cosmetic")
    .eq("activo", true)
    .eq("marca_id", marcaId)
    .order("destacado", { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[marca productos] Supabase error:", error);
    return [];
  }
  const rows = (data ?? []) as unknown as ProductoRow[];
  return rows.map((r) => ({
    ...r,
    tipo_piel: r.tipo_piel ?? [],
    preocupacion: r.preocupacion ?? [],
    ingrediente_activo: r.ingrediente_activo ?? [],
    marca: r.marca ?? null,
    variantes: (r.variantes ?? []).filter((v) => v.activo),
  }));
}

function varianteRef(p: Producto): Variante | undefined {
  const vs = p.variantes ?? [];
  if (vs.length === 0) return undefined;
  return [...vs].sort((a, b) => Number(a.precio) - Number(b.precio))[0];
}

/* ────────────────── SSG ────────────────── */

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const { data, error } = await getSupabase()
      .from("marcas")
      .select("slug");
    if (error || !data) return [];
    return (data as Array<{ slug: string }>).map((r) => ({ slug: r.slug }));
  } catch (e) {
    console.warn("[marcas.generateStaticParams] Supabase no disponible en build:", e);
    return [];
  }
}

export const dynamicParams = true;

/* ────────────────── Metadata ────────────────── */

export async function generateMetadata(
  props: PageProps<"/cosmetic/marcas/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const m = await fetchMarca(slug);
  if (!m) {
    return {
      title: "Marca no encontrada",
      robots: { index: false, follow: false },
    };
  }
  const hero = MARCA_HERO[m.slug];
  return {
    title: m.nombre,
    description: hero?.intro ?? `Productos ${m.nombre} en Veliroz Cosmetic Perú.`,
    alternates: { canonical: `/cosmetic/marcas/${m.slug}` },
    openGraph: {
      title: `${m.nombre} en Veliroz Cosmetic`,
      description: hero?.claim ?? `Productos ${m.nombre} en Perú.`,
      url: `https://veliroz.com/cosmetic/marcas/${m.slug}`,
      siteName: "Veliroz Cosmetic",
      locale: "es_PE",
      type: "website",
    },
  };
}

/* ────────────────── Página ────────────────── */

export default async function MarcaDetallePage(
  props: PageProps<"/cosmetic/marcas/[slug]">
) {
  const { slug } = await props.params;
  const marca = await fetchMarca(slug);
  if (!marca) notFound();

  const productos = await fetchProductosDeMarca(marca.id);
  const hero = MARCA_HERO[marca.slug];
  const swatch = swatchFor(marca.slug);

  return (
    <main className="min-h-screen">
      {/* ────────────────── HERO ────────────────── */}
      <section
        className="border-b border-[--border]"
        style={{ background: swatch }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 pt-8 pb-16 md:pt-12 md:pb-20">
          <nav
            aria-label="Migas de pan"
            className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-6"
          >
            <Link href="/" className="hover:text-ink">
              Inicio
            </Link>
            <span className="mx-2">·</span>
            <Link href="/cosmetic/marcas" className="hover:text-ink">
              Marcas
            </Link>
            <span className="mx-2">·</span>
            <span className="text-ink">{marca.nombre}</span>
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8 space-y-5">
              {marca.pais_origen && (
                <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                  · {marca.pais_origen} ·
                </span>
              )}
              <h1 className="font-serif text-[--text-hero] text-ink leading-[0.92] italic text-balance">
                {marca.nombre}
              </h1>
              {hero?.claim && (
                <p className="font-serif text-2xl md:text-3xl text-rose-deep italic leading-tight text-balance max-w-2xl">
                  {hero.claim}
                </p>
              )}
              {hero?.intro && (
                <p className="text-clay leading-relaxed text-pretty max-w-2xl">
                  {hero.intro}
                </p>
              )}
              {hero?.fundada && (
                <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe pt-2">
                  {hero.fundada}
                </p>
              )}
            </div>

            <div className="md:col-span-4 flex md:justify-end">
              <div className="bg-cream/70 backdrop-blur-sm rounded-lg border border-[--border] px-6 py-5 flex items-center gap-4">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe">
                    En stock
                  </p>
                  <p className="font-serif text-3xl text-ink">
                    {productos.length}
                  </p>
                </div>
                <div className="w-px h-10 bg-[--border]" />
                <p className="text-xs text-clay leading-snug">
                  productos activos
                  <br />
                  hoy
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── PRODUCTOS ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16">
        <div className="flex items-end justify-between mb-8 gap-6 flex-wrap">
          <div>
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              Catálogo de la marca
            </span>
            <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight mt-2">
              Todo lo de {marca.nombre}.
            </h2>
          </div>
          <Link
            href={`/cosmetic/productos?marca=${marca.slug}`}
            className="text-sm text-clay hover:text-ink underline underline-offset-4"
          >
            Ver en catálogo con filtros →
          </Link>
        </div>

        {productos.length === 0 ? (
          <div className="bg-surface border border-[--border] rounded-lg p-12 text-center space-y-3">
            <p className="text-clay">
              Aún no tenemos productos activos de esta marca.
            </p>
            <Link href="/cosmetic/productos" className="btn-outline text-sm">
              Ver catálogo completo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productos.map((p) => {
              const v = varianteRef(p);
              const sinStock = !v || v.stock <= 0;
              return (
                <Link
                  key={p.id}
                  href={`/cosmetic/producto/${p.slug}`}
                  className="prod-card group"
                >
                  <div
                    className="aspect-[4/5] flex items-center justify-center relative"
                    style={{ background: swatch }}
                  >
                    {p.destacado && (
                      <span className="absolute top-4 left-4 font-mono text-[9px] tracking-[0.2em] uppercase text-ink bg-cream px-2 py-1 rounded-sm">
                        · Hero ·
                      </span>
                    )}
                    {sinStock && (
                      <span className="absolute top-4 right-4 font-mono text-[9px] tracking-[0.18em] uppercase text-cream bg-ink/85 px-2 py-1 rounded-sm">
                        Agotado
                      </span>
                    )}
                    <div className="text-center px-6">
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe mb-3">
                        {p.categoria.replace(/-/g, " ")}
                      </p>
                      <p className="font-serif text-xl text-ink italic leading-tight">
                        {marca.nombre}
                      </p>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <h3 className="font-serif text-base text-ink leading-snug text-pretty min-h-[2.4em]">
                      {p.nombre}
                    </h3>
                    <p className="text-xs text-clay">
                      {v?.variante_label ?? "—"}
                    </p>
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
                      <span className="text-xs text-ink underline underline-offset-4 group-hover:text-rose-deep">
                        Ver →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
