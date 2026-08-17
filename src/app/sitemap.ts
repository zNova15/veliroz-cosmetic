import type { MetadataRoute } from "next";
import { getSupabase } from "@/lib/supabase";
import { listPostsForSitemap } from "@/lib/blog";

/* ============================================================
   Veliroz Cosmetic — sitemap dinámico (app/sitemap.ts)
   Fuentes:
   - Estáticas: landing + hubs cosmetic (productos, rutinas,
     marcas, blog, quiz).
   - Productos: Supabase productos activos (linea_negocio='cosmetic').
     Si Supabase no está disponible en build → se omite silenciosamente.
   - Blog: MDX filesystem (src/content/blog/*.mdx) leído por
     listPostsForSitemap(). Siempre disponible en build, sin red.
   Cache: revalidate 1h — buen balance para catálogo dinámico.
   ============================================================ */

export const revalidate = 3600;

function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "https://veliroz-cosmetic.vercel.app";
}

type ChangeFreq = MetadataRoute.Sitemap[number]["changeFrequency"];

interface ProductoSitemapRow {
  slug: string;
  created_at: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = baseUrl();
  const now = new Date();

  /* ─────────── Rutas estáticas ─────────── */
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: now, changeFrequency: "weekly" as ChangeFreq, priority: 1.0 },
    { url: `${site}/cosmetic`, lastModified: now, changeFrequency: "daily" as ChangeFreq, priority: 1.0 },
    { url: `${site}/cosmetic/productos`, lastModified: now, changeFrequency: "daily" as ChangeFreq, priority: 0.9 },
    { url: `${site}/cosmetic/rutinas`, lastModified: now, changeFrequency: "weekly" as ChangeFreq, priority: 0.8 },
    { url: `${site}/cosmetic/marcas`, lastModified: now, changeFrequency: "weekly" as ChangeFreq, priority: 0.7 },
    { url: `${site}/cosmetic/blog`, lastModified: now, changeFrequency: "weekly" as ChangeFreq, priority: 0.7 },
    { url: `${site}/cosmetic/quiz`, lastModified: now, changeFrequency: "monthly" as ChangeFreq, priority: 0.6 },
  ];

  /* ─────────── Productos (Supabase, degrada grácilmente) ─────────── */
  let productoRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data, error } = await getSupabase()
      .from("productos")
      .select("slug, created_at")
      .eq("linea_negocio", "cosmetic")
      .eq("activo", true);
    if (error) throw error;
    const rows = (data ?? []) as ProductoSitemapRow[];
    productoRoutes = rows.map((r) => ({
      url: `${site}/cosmetic/producto/${encodeURIComponent(r.slug)}`,
      lastModified: r.created_at ? new Date(r.created_at) : now,
      changeFrequency: "weekly" as ChangeFreq,
      priority: 0.8,
    }));
  } catch (e) {
    console.warn("[sitemap] productos: Supabase no disponible:", e);
  }

  /* ─────────── Blog (MDX filesystem — nunca falla en build) ─────────── */
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    blogRoutes = listPostsForSitemap().map((p) => ({
      url: `${site}/cosmetic/blog/${encodeURIComponent(p.slug)}`,
      lastModified: new Date(p.lastModified),
      changeFrequency: "monthly" as ChangeFreq,
      priority: 0.6,
    }));
  } catch (e) {
    console.warn("[sitemap] blog: no pude leer src/content/blog:", e);
  }

  return [...staticRoutes, ...productoRoutes, ...blogRoutes];
}
