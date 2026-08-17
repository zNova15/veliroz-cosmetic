import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import {
  AddRutinaToCartButton,
  type RutinaCartItem,
} from "@/components/AddRutinaToCartButton";
import {
  RUTINAS,
  getRutina,
  allRutinaSlugs,
  DIFICULTAD_LABEL,
  MOMENTO_LABEL,
  type Rutina,
} from "@/lib/rutinas";
import {
  getSupabase,
  PRODUCTO_SELECT,
  type Producto,
  type ProductoRow,
  type Variante,
} from "@/lib/supabase";
import { swatchFor } from "@/lib/marcas";

/* ============================================================
   /cosmetic/rutinas/[slug] — detalle rutina.
   Server Component: cruza la rutina hardcoded con los productos reales
   (una sola query in-list). Botón "Agregar rutina completa" es Client.
   ============================================================ */

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  return allRutinaSlugs();
}

export const dynamicParams = false; // sólo rutinas del catálogo hardcoded

export async function generateMetadata(
  props: PageProps<"/cosmetic/rutinas/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const r = getRutina(slug);
  if (!r) {
    return { title: "Rutina no encontrada", robots: { index: false, follow: false } };
  }
  return {
    title: `Rutina · ${r.nombre}`,
    description: r.descripcion,
    alternates: { canonical: `/cosmetic/rutinas/${r.slug}` },
    openGraph: {
      title: `Rutina · ${r.nombre} — Veliroz Cosmetic`,
      description: r.descripcion,
      url: `https://veliroz.com/cosmetic/rutinas/${r.slug}`,
      siteName: "Veliroz Cosmetic",
      locale: "es_PE",
      type: "article",
    },
  };
}

/* ────────────────── Data ────────────────── */

/** Trae todos los productos de una rutina en una sola query. */
async function fetchProductosDeRutina(rutina: Rutina): Promise<Producto[]> {
  const slugs = Array.from(new Set(rutina.pasos.map((p) => p.productoSlug)));
  if (slugs.length === 0) return [];
  const { data, error } = await getSupabase()
    .from("productos")
    .select(PRODUCTO_SELECT)
    .eq("linea_negocio", "cosmetic")
    .eq("activo", true)
    .in("slug", slugs);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[rutinas] Supabase error:", error);
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

function varianteReferencia(p: Producto): Variante | undefined {
  const vs = p.variantes ?? [];
  if (vs.length === 0) return undefined;
  return [...vs].sort((a, b) => Number(a.precio) - Number(b.precio))[0];
}

/* ────────────────── Página ────────────────── */

export default async function RutinaDetallePage(
  props: PageProps<"/cosmetic/rutinas/[slug]">
) {
  const { slug } = await props.params;
  const rutina = getRutina(slug);
  if (!rutina) notFound();

  const productos = await fetchProductosDeRutina(rutina);
  const bySlug = new Map(productos.map((p) => [p.slug, p]));

  /* Armamos los pasos con producto resuelto. Si algún producto no está en la
     BD (raro, pero puede pasar en dev), lo dejamos como "faltante" pero
     seguimos renderizando el resto de la rutina. */
  const pasosResueltos = rutina.pasos.map((paso) => {
    const p = bySlug.get(paso.productoSlug);
    const v = p ? varianteReferencia(p) : undefined;
    return { paso, producto: p, variante: v };
  });

  const encontrados = pasosResueltos.filter((x) => x.producto && x.variante);
  const carritoItems: RutinaCartItem[] = encontrados.map(
    ({ paso, producto, variante }) => ({
      productoSlug: paso.productoSlug,
      productoNombre: producto!.nombre,
      marcaNombre: producto!.marca?.nombre ?? "Veliroz",
      marcaSlug: producto!.marca?.slug ?? null,
      sku: variante!.sku,
      varianteLabel: variante!.variante_label,
      precio: Number(variante!.precio),
      stock: Number(variante!.stock ?? 0),
      /* Catálogo en pre-venta: stock 0 = reservable, no agotado. */
      preventa: producto!.meta?.preventa === true,
    })
  );

  return (
    <main className="min-h-screen">
      {/* ────────────────── HERO ────────────────── */}
      <section
        className="border-b border-[--border]"
        style={{ background: rutina.accent }}
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
            <Link href="/cosmetic/rutinas" className="hover:text-ink">
              Rutinas
            </Link>
            <span className="mx-2">·</span>
            <span className="text-ink">{rutina.nombre}</span>
          </nav>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-8 space-y-5">
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Rutina · {rutina.tag}
              </span>
              <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
                {rutina.nombre}
              </h1>
              <p className="text-clay text-lg leading-relaxed text-pretty max-w-2xl">
                {rutina.descripcion}
              </p>
              {rutina.advertencia && (
                <p className="text-sm text-clay bg-cream/60 border-l-2 border-rose-deep px-4 py-3 rounded-r-sm max-w-2xl">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-rose-deep block mb-1">
                    Advertencia
                  </span>
                  {rutina.advertencia}
                </p>
              )}
            </div>

            <aside className="md:col-span-4 bg-cream/70 backdrop-blur-sm rounded-lg border border-[--border] p-6 space-y-4">
              <h2 className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                A ojo
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-clay">Pasos</dt>
                  <dd className="text-ink font-mono">{rutina.pasos.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-clay">Duración</dt>
                  <dd className="text-ink font-mono">
                    {rutina.tiempoMinutos} min
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-clay">Dificultad</dt>
                  <dd className="text-ink font-mono">
                    {DIFICULTAD_LABEL[rutina.dificultad]}
                  </dd>
                </div>
                <div className="flex justify-between pt-3 border-t border-[--border]">
                  <dt className="text-clay">Suelto</dt>
                  <dd className="text-stone font-mono line-through">
                    S/. {rutina.precioLista.toFixed(2)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-clay">Rutina completa</dt>
                  <dd className="text-ink font-mono">
                    S/. {rutina.precioBundle.toFixed(2)}
                  </dd>
                </div>
              </dl>

              {rutina.para.length > 0 && (
                <div className="pt-3 border-t border-[--border] space-y-2">
                  <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe">
                    Ideal para
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {rutina.para.map((p) => (
                      <span
                        key={p}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-cream text-clay border border-[--border]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* ────────────────── PASOS ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-3xl mb-10 space-y-2">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            La secuencia
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
            Cómo se hace, paso por paso.
          </h2>
        </div>

        <ol className="space-y-4">
          {pasosResueltos.map(({ paso, producto, variante }) => {
            const swatch = swatchFor(producto?.marca?.slug ?? null);
            const marcaNombre = producto?.marca?.nombre ?? "—";
            const enPreventa = producto?.meta?.preventa === true;
            const sinStock =
              !enPreventa && (!variante || Number(variante.stock ?? 0) <= 0);

            return (
              <li
                key={`${paso.orden}-${paso.productoSlug}`}
                className="rounded-lg border border-[--border] overflow-hidden bg-surface"
              >
                <div className="grid grid-cols-1 sm:grid-cols-[80px_1fr] md:grid-cols-[80px_180px_1fr_auto] gap-0 items-stretch">
                  {/* Orden */}
                  <div className="flex items-center justify-center py-6 border-b sm:border-b-0 sm:border-r border-[--border] bg-mist/40">
                    <span className="font-serif italic text-4xl text-ink">
                      {paso.orden}
                    </span>
                  </div>

                  {/* Packshot real (misma receta que landing/catálogo: base
                      blanca + velo de marca, object-contain). Si el producto
                      todavía no tiene foto —los sets Veliroz— cae al swatch
                      tipográfico de antes. */}
                  {producto?.imagen_principal ? (
                    <div className="hidden md:block relative border-r border-[--border] bg-white">
                      <div
                        aria-hidden
                        className="absolute inset-0 opacity-25"
                        style={{ background: swatch }}
                      />
                      <Image
                        src={producto.imagen_principal}
                        alt={`${marcaNombre} — ${producto.nombre}`}
                        fill
                        sizes="180px"
                        className="object-contain p-4"
                      />
                    </div>
                  ) : (
                    <div
                      className="hidden md:flex items-center justify-center py-6 border-r border-[--border]"
                      style={{ background: swatch }}
                    >
                      <p className="font-italic-serif text-xl text-ink text-center px-4 leading-tight">
                        {marcaNombre}
                      </p>
                    </div>
                  )}

                  {/* Contenido */}
                  <div className="p-5 md:p-6 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe">
                        {MOMENTO_LABEL[paso.momento]}
                      </span>
                      <span className="text-taupe">·</span>
                      <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe">
                        {marcaNombre}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl text-ink leading-snug">
                      {producto ? producto.nombre : paso.productoSlug}
                    </h3>
                    <p className="text-sm text-clay text-pretty">{paso.nota}</p>
                    {variante && (
                      <p className="text-xs text-clay">
                        {variante.variante_label} ·{" "}
                        <span className="font-mono text-ink">
                          S/. {Number(variante.precio).toFixed(2)}
                        </span>
                      </p>
                    )}
                    {enPreventa && producto && (
                      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-champagne-dark">
                        · Pre-venta · entrega 5-7 días
                      </p>
                    )}
                    {sinStock && producto && (
                      <p className="text-[11px] text-[--veliroz-danger]">
                        Sin stock ahora — consultanos por reposición.
                      </p>
                    )}
                    {!producto && (
                      <p className="text-[11px] text-clay italic">
                        Producto pendiente de sincronizar.
                      </p>
                    )}
                  </div>

                  {/* CTA ver */}
                  <div className="p-5 md:p-6 md:pl-0 flex items-center md:justify-end border-t md:border-t-0 md:border-l border-[--border] md:border-l-transparent">
                    {producto ? (
                      <Link
                        href={`/cosmetic/producto/${producto.slug}`}
                        className="btn-outline text-xs"
                      >
                        Ver ficha
                      </Link>
                    ) : (
                      <span className="text-xs text-clay">—</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ────────────────── CTA CARRITO ────────────────── */}
      <section className="max-w-3xl mx-auto px-6 md:px-10 pb-24">
        <div className="bg-surface rounded-lg border border-[--border] p-8 space-y-6">
          <div className="text-center space-y-2">
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              Todo en un click
            </span>
            <h3 className="font-serif text-2xl md:text-3xl text-ink italic leading-tight">
              Llevate la rutina {rutina.nombre.toLowerCase()} completa.
            </h3>
          </div>
          <AddRutinaToCartButton
            items={carritoItems}
            rutinaNombre={rutina.nombre}
            precioBundle={rutina.precioBundle}
            ahorro={rutina.ahorro}
          />
        </div>
      </section>

      {/* ────────────────── CROSS-LINK QUIZ ────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 pb-24">
        <div className="border-t border-[--border] pt-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-clay text-sm text-pretty">
            ¿Otra rutina te suena más? Explorá las{" "}
            <Link
              href="/cosmetic/rutinas"
              className="text-ink underline underline-offset-4"
            >
              {RUTINAS.length} rutinas curadas
            </Link>{" "}
            o hacé el{" "}
            <Link
              href="/cosmetic/quiz"
              className="text-ink underline underline-offset-4"
            >
              quiz de 5 preguntas
            </Link>
            .
          </p>
          <Link href="/cosmetic/productos" className="btn-outline text-sm">
            Ver catálogo completo →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
