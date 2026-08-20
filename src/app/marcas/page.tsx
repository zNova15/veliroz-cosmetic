import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { getSupabase, type Marca } from "@/lib/supabase";
import { swatchFor, imagenMarca } from "@/lib/marcas";

/* ============================================================
   /marcas — grid de marcas activas.
   Server Component: query directa a public.marcas.
   Cada card enlaza a /marcas/[slug] (detalle) y también
   ofrece atajo al filtro /productos?marca=[slug].
   ============================================================ */

export const metadata: Metadata = {
  title: "Marcas curadas",
  description:
    "Beauty of Joseon, Anua, Round Lab, COSRX, SKIN1004, Dr.Althea, BIODANCE, celimax y Mixsoon — todas las marcas que trabajamos en Veliroz Cosmetic. Producto original, formulaciones que sí funcionan.",
  alternates: { canonical: "/marcas" },
};

/* Copy corto por marca — mismo tono editorial del landing.
   Cuando la marca aún no tenga descripción en Supabase (Sprint 5),
   caemos a este map para que la card no se sienta vacía. */
const MARCA_INTRO: Record<string, string> = {
  "the-ordinary":
    "Formulaciones directas, sin marketing. Cada sérum dice qué ingrediente activo lleva y a qué concentración.",
  cerave:
    "Desarrollada con dermatólogos. Ceramidas 3:1:1 que reponen la barrera cutánea sin drama.",
  "beauty-of-joseon":
    "Coreana, tradición hanbang. Su protector solar con arroz + probióticos es el estándar oro sin residuo blanco.",
  cosrx:
    "K-beauty clínica. La snail mucin al 96% es el hero probado para reparación y cicatrices.",
  xhekpon:
    "Clásico español para cuello y escote. Colágeno + elastina para la zona que casi nadie cuida.",
};

async function fetchMarcas(): Promise<Marca[]> {
  const { data, error } = await getSupabase()
    .from("marcas")
    .select("id, slug, nombre, logo_url, pais_origen")
    /* Sin este filtro entraban The Ordinary, CeraVe y Xhekpon, dadas de baja
       en la migración 015 por quedarse sin ningún producto: la página se
       titula "Marcas que sí funcionan" y listaba 13 cuando el catálogo tiene
       10, contradiciendo el contador del hero. Y al hacer clic en una de
       ellas se llegaba a una marca vacía. */
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[marcas] Supabase error:", error);
    return [];
  }
  return (data ?? []) as Marca[];
}

export default async function MarcasPage() {
  const marcas = await fetchMarcas();

  return (
    <main className="min-h-screen">
      {/* ────────────────── HERO ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-10">
        <nav
          aria-label="Migas de pan"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-4"
        >
          <Link href="/" className="hover:text-ink">
            Inicio
          </Link>
          <span className="mx-2">·</span>
          <span className="text-ink">Marcas</span>
        </nav>

        <div className="max-w-3xl space-y-4">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · Nuestra selección ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            Marcas que{" "}
            <span className="font-italic-serif text-rose-deep">sí funcionan</span>.
          </h1>
          <p className="text-clay text-pretty max-w-2xl leading-relaxed">
            No trabajamos con todas las marcas del mercado. Elegimos las que
            tienen fórmulas con evidencia y precio honesto — y las trajimos a
            Perú para que no dependas de la valija de un familiar.
          </p>
        </div>
      </section>

      {/* ────────────────── GRID MARCAS ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-16">
        {marcas.length === 0 ? (
          <div className="bg-surface border border-[--border] rounded-lg p-12 text-center">
            <p className="text-clay">
              No hay marcas activas todavía. Volvé pronto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {marcas.map((m) => {
              const swatch = swatchFor(m.slug);
              const intro = MARCA_INTRO[m.slug];
              const foto = imagenMarca(m.slug);
              return (
                <article
                  key={m.id}
                  className="rounded-lg overflow-hidden border border-[--border] bg-surface flex flex-col transition-transform hover:-translate-y-1"
                >
                  <Link
                    href={`/marcas/${m.slug}`}
                    className="aspect-[5/3] flex items-center justify-center relative"
                    style={{ background: swatch }}
                    aria-label={`Ver marca ${m.nombre}`}
                  >
                    {/* Con foto, el nombre NO va encima: los packshots ocupan
                        el centro y la composición de BIODANCE es una modelo,
                        así que el texto caía sobre el producto o sobre la
                        cara. Va abajo, en el bloque de contenido — igual que
                        en las cards de rutina. Sin foto se mantiene el bloque
                        tipográfico centrado, que ahí sí tiene todo el espacio. */}
                    {foto ? (
                      <Image
                        src={foto}
                        alt={`Productos de ${m.nombre}`}
                        fill
                        sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="text-center px-6">
                        {m.pais_origen && (
                          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-taupe mb-2">
                            {m.pais_origen}
                          </p>
                        )}
                        <p className="font-serif italic text-3xl md:text-4xl text-ink leading-tight">
                          {m.nombre}
                        </p>
                      </div>
                    )}
                  </Link>
                  <div className="p-6 flex flex-col gap-3 flex-1">
                    {foto && (
                      <div>
                        {m.pais_origen && (
                          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-taupe mb-1">
                            {m.pais_origen}
                          </p>
                        )}
                        <p className="font-serif italic text-2xl text-ink leading-tight">
                          {m.nombre}
                        </p>
                      </div>
                    )}
                    {intro && (
                      <p className="text-sm text-clay leading-relaxed text-pretty">
                        {intro}
                      </p>
                    )}
                    <div className="mt-auto pt-3 border-t border-[--border] flex items-center justify-between">
                      <Link
                        href={`/marcas/${m.slug}`}
                        className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep"
                      >
                        Ver todos los productos →
                      </Link>
                      <Link
                        href={`/productos?marca=${m.slug}`}
                        className="font-mono text-[10px] uppercase tracking-[0.18em] text-taupe hover:text-ink"
                      >
                        En catálogo
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
