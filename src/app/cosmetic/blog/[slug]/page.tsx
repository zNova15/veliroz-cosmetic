import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPostBySlug,
  getRelatedPosts,
  listPostSlugs,
} from "@/lib/blog";
import { BlogMDX } from "@/components/BlogMDX";

/* ============================================================
   Veliroz Cosmetic — /cosmetic/blog/[slug]
   Server Component: detail de un post MDX.
   - generateStaticParams desde el filesystem (todos los .mdx)
   - generateMetadata dinámica (title, description, og:image)
   - Render MDX con next-mdx-remote/rsc + plugins gfm/slug/pretty-code
   - JSON-LD Article schema
   - Related posts al final (misma categoría / tags en común)
   Layout compartido (nav + cart drawer) viene de /cosmetic/layout.tsx
   ============================================================ */

const SITE = "https://veliroz.com";

export const dynamicParams = false;

export function generateStaticParams(): Array<{ slug: string }> {
  return listPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: PageProps<"/cosmetic/blog/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {
      title: "Artículo no encontrado",
      robots: { index: false, follow: false },
    };
  }
  const { frontmatter, fechaISO } = post;
  const url = `${SITE}/cosmetic/blog/${frontmatter.slug}`;
  const ogImage = frontmatter.og_image ?? `${SITE}/og-blog-default.jpg`;

  return {
    title: frontmatter.title,
    description: frontmatter.excerpt,
    alternates: { canonical: url },
    keywords: frontmatter.tags,
    authors: [{ name: frontmatter.autor }],
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.excerpt,
      url,
      siteName: "Veliroz Cosmetic",
      locale: "es_PE",
      type: "article",
      publishedTime: fechaISO,
      modifiedTime: frontmatter.actualizado ?? fechaISO,
      authors: [frontmatter.autor],
      tags: frontmatter.tags,
      images: [{ url: ogImage, width: 1200, height: 630, alt: frontmatter.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.excerpt,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage(
  props: PageProps<"/cosmetic/blog/[slug]">,
) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { frontmatter, content, readingText, fechaISO, fechaLegible } = post;
  const related = getRelatedPosts(slug, 3);
  const url = `${SITE}/cosmetic/blog/${frontmatter.slug}`;
  const ogImage = frontmatter.og_image ?? `${SITE}/og-blog-default.jpg`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: frontmatter.title,
    description: frontmatter.excerpt,
    datePublished: fechaISO,
    dateModified: frontmatter.actualizado ?? fechaISO,
    author: { "@type": "Person", name: frontmatter.autor },
    publisher: {
      "@type": "Organization",
      name: "Veliroz",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/icon-512.png` },
    },
    image: ogImage,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: frontmatter.tags.join(", "),
    articleSection: frontmatter.categoria,
    inLanguage: "es-PE",
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ────────────────── HERO / HEADER ────────────────── */}
      <header className="max-w-4xl mx-auto px-6 md:px-10 pt-12 md:pt-20 pb-10">
        <nav
          aria-label="Migas de pan"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-6"
        >
          <Link href="/cosmetic" className="hover:text-ink">
            Cosmetic
          </Link>
          <span className="mx-2">·</span>
          <Link href="/cosmetic/blog" className="hover:text-ink">
            Diario
          </Link>
          <span className="mx-2">·</span>
          <span className="text-ink">{frontmatter.categoria}</span>
        </nav>

        <div className="space-y-6">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · {frontmatter.categoria} ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            {frontmatter.title}
          </h1>
          <p className="text-lg md:text-xl text-clay leading-relaxed text-pretty max-w-2xl">
            {frontmatter.excerpt}
          </p>

          {/* Meta line */}
          <div className="pt-2 flex flex-wrap items-center gap-4 font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
            <span>
              Por <span className="text-ink font-medium">{frontmatter.autor}</span>
            </span>
            <span aria-hidden>·</span>
            <time dateTime={fechaISO}>{fechaLegible}</time>
            <span aria-hidden>·</span>
            <span>{readingText}</span>
          </div>
        </div>
      </header>

      {/* Divider champagne + hero visual (gradient de marca) */}
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <div
          className="w-full aspect-[16/7] rounded-lg overflow-hidden relative"
          style={{ background: frontmatter.hero_gradient }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              aria-hidden
              className="font-serif italic text-[16vw] md:text-[10vw] text-ink/10 leading-none select-none"
            >
              {initialsFrom(frontmatter.title)}
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────── BODY MDX ────────────────── */}
      <article className="px-6 md:px-10 py-14 md:py-20">
        <BlogMDX source={content} />
      </article>

      {/* ────────────────── TAGS ────────────────── */}
      {frontmatter.tags.length > 0 && (
        <section className="max-w-2xl mx-auto px-6 md:px-10 pb-14">
          <div className="divider-champagne mb-8" />
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe">
              · Etiquetas ·
            </span>
            {frontmatter.tags.map((t) => (
              <span
                key={t}
                className="text-xs px-3 py-1 rounded-full bg-mist/60 text-clay border border-transparent"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ────────────────── AUTOR CARD ────────────────── */}
      <section className="max-w-3xl mx-auto px-6 md:px-10 pb-14">
        <div className="bg-surface border border-[--border] rounded-lg p-8 md:p-10 flex flex-col md:flex-row items-start gap-6">
          <div className="w-16 h-16 rounded-full bg-champagne flex items-center justify-center font-serif italic text-2xl text-ink shrink-0">
            V
          </div>
          <div className="space-y-2 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
              · Editorial ·
            </p>
            <h3 className="font-serif text-xl text-ink">
              {frontmatter.autor}
            </h3>
            <p className="text-sm text-clay leading-relaxed text-pretty">
              El equipo editorial de Veliroz Cosmetic — dermatólogas y
              formuladoras que curan cada producto que entra al catálogo.
              Escribimos con evidencia, no con marketing.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────── RELATED POSTS ────────────────── */}
      {related.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
          <div className="divider-champagne mb-10" />
          <div className="flex items-end justify-between mb-8">
            <div className="space-y-2">
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                · Seguí leyendo ·
              </span>
              <h2 className="font-serif text-3xl text-ink italic">
                También te puede gustar
              </h2>
            </div>
            <Link
              href="/cosmetic/blog"
              className="hidden md:inline text-xs text-ink underline underline-offset-4 decoration-champagne hover:decoration-rose-deep"
            >
              Ver todo el diario →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {related.map((r) => (
              <Link
                key={r.frontmatter.slug}
                href={`/cosmetic/blog/${r.frontmatter.slug}`}
                className="group flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-ink rounded-md"
              >
                <div
                  className="aspect-[4/3] rounded-md overflow-hidden relative"
                  style={{ background: r.frontmatter.hero_gradient }}
                >
                  <span className="absolute top-3 left-3 font-mono text-[9px] tracking-[0.22em] uppercase text-ink bg-cream/90 backdrop-blur px-2 py-1 rounded-sm">
                    {r.frontmatter.categoria}
                  </span>
                  <span
                    aria-hidden
                    className="absolute right-3 bottom-2 font-serif italic text-5xl text-ink/15 leading-none select-none"
                  >
                    {initialsFrom(r.frontmatter.title)}
                  </span>
                </div>
                <div className="mt-4 font-mono text-[10px] tracking-[0.18em] uppercase text-taupe">
                  <time dateTime={r.fechaISO}>{r.fechaLegible}</time>
                  <span aria-hidden className="mx-2">·</span>
                  <span>{r.readingText}</span>
                </div>
                <h3 className="mt-2 font-serif text-lg text-ink leading-snug text-pretty group-hover:text-rose-deep transition-colors">
                  {r.frontmatter.title}
                </h3>
              </Link>
            ))}
          </div>
          <div className="mt-10 md:hidden text-center">
            <Link
              href="/cosmetic/blog"
              className="text-xs text-ink underline underline-offset-4 decoration-champagne hover:decoration-rose-deep"
            >
              Ver todo el diario →
            </Link>
          </div>
        </section>
      )}
    </main>
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
