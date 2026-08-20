import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

/* ============================================================
   Veliroz Cosmetic — Blog utilities (Sprint 4)
   MDX filesystem-based: src/content/blog/*.mdx
   - Frontmatter YAML parseado con gray-matter
   - Reading-time calculado sobre el body
   - Server-only: nunca importar desde un Client Component
   Rutas consumidoras:
   - /blog             → listPosts()
   - /blog/[slug]      → getPostBySlug() + getRelatedPosts()
   - sitemap.ts                 → listPostSlugs()
   ============================================================ */

/** Ruta absoluta al directorio de posts. */
const BLOG_DIR = path.join(process.cwd(), "src", "content", "blog");

/** Metadatos declarados en el frontmatter de cada .mdx. */
export interface BlogFrontmatter {
  title: string;
  slug: string;
  excerpt: string;
  autor: string;
  fecha: string;                 // ISO-8601 (YYYY-MM-DD)
  categoria: string;             // ej. "Educacional", "Rutinas", "Ingredientes"
  tags: string[];
  hero_gradient: string;         // CSS gradient string p/background sin foto real
  /* Portada compuesta con los packshots de los productos que menciona el
     post (bucket `productos/blog/`, migración 025). Null → se usa el
     gradiente, que sigue siendo un fallback válido. */
  hero_imagen: string | null;
  tiempo_lectura_min?: number;   // override manual — si falta usamos reading-time
  og_image?: string;             // opcional (fallback = og genérico del sitio)
  actualizado?: string;          // ISO opcional
}

/** Post con metadata + body crudo MDX + reading-time. */
export interface BlogPost {
  frontmatter: BlogFrontmatter;
  content: string;               // MDX body (sin frontmatter)
  readingMinutes: number;        // redondeado hacia arriba, min 1
  readingText: string;           // "4 min de lectura"
  fechaISO: string;              // frontmatter.fecha normalizada (para <time datetime>)
  fechaLegible: string;          // "12 de agosto de 2026"
}

/** Meta-only shape usada en listados (sin cargar el body pesado). */
export interface BlogPostMeta {
  frontmatter: BlogFrontmatter;
  readingMinutes: number;
  readingText: string;
  fechaISO: string;
  fechaLegible: string;
}

/* ────────────────── Helpers internos ────────────────── */

function safeReaddir(): string[] {
  try {
    return fs
      .readdirSync(BLOG_DIR)
      .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));
  } catch {
    // El directorio puede no existir en el primer boot (o en un preview sin content).
    return [];
  }
}

function readRaw(fileName: string): string {
  const full = path.join(BLOG_DIR, fileName);
  return fs.readFileSync(full, "utf8");
}

/** Formato "12 de agosto de 2026" (es-PE). */
function formatoLegible(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Devuelve un slug seguro: preferimos el del frontmatter, si falta usamos el nombre de archivo. */
function slugFromFile(fileName: string, fm: Partial<BlogFrontmatter>): string {
  if (fm.slug && typeof fm.slug === "string") return fm.slug;
  return fileName.replace(/\.(mdx|md)$/i, "");
}

/** Validador MUY suave — sólo comprueba que existan los campos mínimos, con defaults. */
function normalizeFrontmatter(
  fileName: string,
  raw: Record<string, unknown>,
): BlogFrontmatter {
  const fm = raw as Partial<BlogFrontmatter>;
  const slug = slugFromFile(fileName, fm);
  return {
    title: (fm.title ?? "Sin título").toString(),
    slug,
    excerpt: (fm.excerpt ?? "").toString(),
    autor: (fm.autor ?? "Veliroz Team").toString(),
    fecha: (fm.fecha ?? "").toString(),
    categoria: (fm.categoria ?? "Editorial").toString(),
    tags: Array.isArray(fm.tags) ? fm.tags.map((t) => String(t)) : [],
    hero_gradient:
      (fm.hero_gradient ?? "linear-gradient(135deg, #F5EFE7 0%, #E8B4B8 100%)").toString(),
    hero_imagen: fm.hero_imagen ? String(fm.hero_imagen) : null,
    tiempo_lectura_min:
      typeof fm.tiempo_lectura_min === "number" ? fm.tiempo_lectura_min : undefined,
    og_image: fm.og_image?.toString(),
    actualizado: fm.actualizado?.toString(),
  };
}

function computeReading(fm: BlogFrontmatter, body: string) {
  const rt = readingTime(body);
  const minutes = fm.tiempo_lectura_min ?? Math.max(1, Math.round(rt.minutes));
  return {
    readingMinutes: minutes,
    readingText: `${minutes} min de lectura`,
  };
}

function buildPost(fileName: string, raw: string): BlogPost {
  const parsed = matter(raw);
  const fm = normalizeFrontmatter(fileName, parsed.data ?? {});
  const { readingMinutes, readingText } = computeReading(fm, parsed.content);
  return {
    frontmatter: fm,
    content: parsed.content,
    readingMinutes,
    readingText,
    fechaISO: fm.fecha,
    fechaLegible: formatoLegible(fm.fecha),
  };
}

/* ────────────────── API pública ────────────────── */

/** Lista todos los posts (meta only) ordenados por fecha desc. */
export function listPosts(): BlogPostMeta[] {
  const files = safeReaddir();
  const posts = files
    .map((f) => {
      try {
        const raw = readRaw(f);
        const parsed = matter(raw);
        const fm = normalizeFrontmatter(f, parsed.data ?? {});
        const { readingMinutes, readingText } = computeReading(fm, parsed.content);
        return {
          frontmatter: fm,
          readingMinutes,
          readingText,
          fechaISO: fm.fecha,
          fechaLegible: formatoLegible(fm.fecha),
        } satisfies BlogPostMeta;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[blog] no pude parsear ${f}:`, err);
        return null;
      }
    })
    .filter((p): p is BlogPostMeta => p !== null);

  return posts.sort((a, b) =>
    (b.fechaISO ?? "").localeCompare(a.fechaISO ?? ""),
  );
}

/** Sólo los slugs — para generateStaticParams y sitemap. */
export function listPostSlugs(): string[] {
  return listPosts().map((p) => p.frontmatter.slug);
}

/** Devuelve un post por slug con body MDX crudo, o null si no existe. */
export function getPostBySlug(slug: string): BlogPost | null {
  const files = safeReaddir();
  for (const f of files) {
    try {
      const raw = readRaw(f);
      const parsed = matter(raw);
      const fm = normalizeFrontmatter(f, parsed.data ?? {});
      if (fm.slug === slug) {
        return buildPost(f, raw);
      }
    } catch {
      /* skip */
    }
  }
  return null;
}

/** Related posts: preferimos misma categoría → tags en común → resto. */
export function getRelatedPosts(slug: string, limit = 3): BlogPostMeta[] {
  const all = listPosts();
  const current = all.find((p) => p.frontmatter.slug === slug);
  if (!current) return all.slice(0, limit);

  const rest = all.filter((p) => p.frontmatter.slug !== slug);
  const scored = rest
    .map((p) => {
      let score = 0;
      if (p.frontmatter.categoria === current.frontmatter.categoria) score += 3;
      const overlap = p.frontmatter.tags.filter((t) =>
        current.frontmatter.tags.includes(t),
      ).length;
      score += overlap;
      return { post: p, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.post.fechaISO ?? "").localeCompare(a.post.fechaISO ?? "");
    })
    .map((s) => s.post);

  return scored.slice(0, limit);
}

/** Metadata para el sitemap (slug + última fecha conocida). */
export interface BlogSitemapEntry {
  slug: string;
  lastModified: string; // ISO
}

export function listPostsForSitemap(): BlogSitemapEntry[] {
  return listPosts().map((p) => ({
    slug: p.frontmatter.slug,
    lastModified: p.frontmatter.actualizado ?? p.fechaISO ?? new Date().toISOString(),
  }));
}
