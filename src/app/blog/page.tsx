import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { listPosts, type BlogPostMeta } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

/* ============================================================
   Veliroz Cosmetic — /blog
   Server Component: index del diario (MDX filesystem).
   - Lee todos los .mdx de src/content/blog vía listPosts()
   - Grid editorial 3-col: hero con gradient (sin imágenes reales),
     título Fraunces, excerpt, autor/fecha/tiempo lectura
   - JSON-LD Blog schema para search engines
   - Layout compartido (nav + cart drawer) viene del RootLayout
   ============================================================ */

export const metadata: Metadata = {
  title: "Diario",
  description:
    "Guías honestas de skincare desde Perú — rutinas, ingredientes activos y desmitificación de tendencias virales. Sin humo, con evidencia.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Diario Veliroz Cosmetic",
    description:
      "Guías de skincare curadas por rutina — para pieles reales, con evidencia.",
    url: "https://veliroz.com/blog",
    siteName: "Veliroz Cosmetic",
    locale: "es_PE",
    type: "website",
    /* Definir `openGraph` acá reemplaza entero el del layout raíz — no lo
       fusiona — así que sin `images` el índice del diario se compartía sin
       foto. El índice no tiene portada propia (las portadas son de cada
       post), así que va el og por defecto del sitio. */
    images: [
      {
        url: absoluteUrl("/og.png"),
        width: 1200,
        height: 630,
        alt: "Veliroz Cosmetic — skincare coreano curado por rutina",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Diario Veliroz Cosmetic",
    description:
      "Guías de skincare curadas por rutina — para pieles reales, con evidencia.",
    images: [absoluteUrl("/og.png")],
  },
};

/* En dev pnpm dev cachea el fs; en prod es estático post-build. Revalidamos
   cada hora por si dropeamos un post nuevo sin re-deploy. */
export const revalidate = 3600;

const SITE = "https://veliroz.com";

export default function BlogIndexPage() {
  const posts = listPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Diario Veliroz Cosmetic",
    url: `${SITE}/blog`,
    description:
      "Guías honestas de skincare desde Perú — rutinas, ingredientes activos y desmitificación de tendencias virales.",
    publisher: {
      "@type": "Organization",
      name: "Veliroz",
      url: SITE,
    },
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.frontmatter.title,
      datePublished: p.fechaISO,
      dateModified: p.frontmatter.actualizado ?? p.fechaISO,
      description: p.frontmatter.excerpt,
      author: { "@type": "Person", name: p.frontmatter.autor },
      url: `${SITE}/blog/${p.frontmatter.slug}`,
    })),
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ────────────────── HEADER SECCIÓN ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-10">
        <nav
          aria-label="Migas de pan"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-6"
        >
          <Link href="/" className="hover:text-ink">
            Cosmetic
          </Link>
          <span className="mx-2">·</span>
          <span className="text-ink">Diario</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              · Editorial Veliroz ·
            </span>
            <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
              El diario.{" "}
              <span className="font-italic-serif text-rose-deep">
                Skincare honesto, con evidencia.
              </span>
            </h1>
            <p className="text-base text-clay text-pretty leading-relaxed max-w-xl">
              Guías, rutinas e ingredientes explicados como se lo explicaríamos
              a nuestra hermana. Sin marketing exagerado — solo lo que
              funciona para pieles reales.
            </p>
          </div>
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe self-start md:self-end">
            {posts.length} {posts.length === 1 ? "artículo" : "artículos"}
          </p>
        </div>

        <div className="divider-champagne mt-10" />
      </section>

      {/* ────────────────── GRID ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {posts.map((post) => (
              <PostCard key={post.frontmatter.slug} post={post} />
            ))}
          </div>
        )}
      </section>

      {/* ────────────────── CTA FINAL ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-32 text-center space-y-6">
        <div className="divider-champagne" />
        <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
          · Aún no sabes por dónde empezar ·
        </span>
        <h2 className="font-serif text-3xl md:text-4xl text-ink italic leading-tight text-balance">
          Haz el quiz — 6 preguntas, una rutina hecha a tu piel.
        </h2>
        <div className="pt-2">
          <Link href="/quiz" className="btn-primary">
            Empezar el quiz →
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ────────────────── Sub-componentes ────────────────── */

function PostCard({ post }: { post: BlogPostMeta }) {
  const { frontmatter, readingText, fechaLegible, fechaISO } = post;
  return (
    <Link
      href={`/blog/${frontmatter.slug}`}
      className="group flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-md"
    >
      {/* Portada: la composición con los packshots del post si existe, y si
          no el gradiente de marca de siempre (fallback válido). */}
      <div
        className="aspect-[4/3] rounded-md overflow-hidden relative flex items-end p-6"
        style={{ background: frontmatter.hero_gradient }}
      >
        {frontmatter.hero_imagen && (
          <Image
            src={frontmatter.hero_imagen}
            alt=""
            fill
            sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw"
            className="object-cover"
          />
        )}
        <div className="absolute top-4 left-4">
          <span className="font-mono text-[9px] tracking-[0.22em] uppercase text-ink bg-cream/90 backdrop-blur px-2.5 py-1 rounded-sm">
            {frontmatter.categoria}
          </span>
        </div>
        {/* Marca de agua editorial: iniciales gigantes */}
        <span
          aria-hidden
          className="absolute right-4 bottom-3 font-serif italic text-6xl text-ink/15 leading-none select-none"
        >
          {initialsFrom(frontmatter.title)}
        </span>
      </div>

      {/* Meta line */}
      <div className="mt-5 mb-2 font-mono text-[10px] tracking-[0.2em] uppercase text-taupe flex items-center gap-2 flex-wrap">
        <time dateTime={fechaISO}>{fechaLegible}</time>
        <span aria-hidden>·</span>
        <span>{readingText}</span>
      </div>

      {/* Título */}
      <h2 className="font-serif text-xl md:text-2xl text-ink leading-snug text-pretty group-hover:text-rose-deep transition-colors">
        {frontmatter.title}
      </h2>

      {/* Excerpt */}
      <p className="mt-3 text-sm text-clay leading-relaxed text-pretty line-clamp-3">
        {frontmatter.excerpt}
      </p>

      {/* Autor + CTA */}
      <div className="mt-5 pt-4 border-t border-[--border] flex items-center justify-between">
        <span className="text-xs text-taupe">
          Por <span className="text-ink font-medium">{frontmatter.autor}</span>
        </span>
        <span className="text-xs text-ink underline underline-offset-4 decoration-champagne group-hover:decoration-rose-deep">
          Leer →
        </span>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="bg-surface border border-[--border] rounded-lg p-12 text-center space-y-4 max-w-xl mx-auto">
      <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
        · Muy pronto ·
      </span>
      <h3 className="font-serif text-2xl text-ink italic">
        Aún no publicamos artículos.
      </h3>
      <p className="text-sm text-clay max-w-md mx-auto text-pretty">
        Estamos preparando la primera tanda. Mientras tanto, haz el quiz para
        recibir tu rutina personalizada.
      </p>
      <div className="pt-2">
        <Link href="/quiz" className="btn-outline">
          Hacer el quiz
        </Link>
      </div>
    </div>
  );
}

/* Extrae iniciales de un título (máx 2 caracteres). */
function initialsFrom(title: string): string {
  const words = title
    .replace(/[^\p{L}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "V";
  if (words.length === 1) return words[0].slice(0, 2);
  return (words[0][0] + words[1][0]).toUpperCase();
}
