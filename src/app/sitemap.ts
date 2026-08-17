import type { MetadataRoute } from "next";
import { getSupabase } from "@/lib/supabase";
import { listPostsForSitemap } from "@/lib/blog";
import { siteUrl } from "@/lib/site";

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
  // Delegado a src/lib/site.ts — ver ahí por qué no se usa VERCEL_URL en prod.
  return siteUrl();
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
    { url: `${site}/`, lastModified: now, changeFrequency: "daily" as ChangeFreq, priority: 1.0 },
    { url: `${site}/productos`, lastModified: now, changeFrequency: "daily" as ChangeFreq, priority: 0.9 },
    { url: `${site}/rutinas`, lastModified: now, changeFrequency: "weekly" as ChangeFreq, priority: 0.8 },
    { url: `${site}/marcas`, lastModified: now, changeFrequency: "weekly" as ChangeFreq, priority: 0.7 },
    { url: `${site}/blog`, lastModified: now, changeFrequency: "weekly" as ChangeFreq, priority: 0.7 },
    { url: `${site}/quiz`, lastModified: now, changeFrequency: "monthly" as ChangeFreq, priority: 0.6 },
    /* Institucionales + legales: indexables (robots.index = true en su
       metadata) y consultadas antes de comprar, así que entran al sitemap.
       /cuenta, /pago y /mis-pedidos quedan fuera a propósito — son noindex. */
    { url: `${site}/envios`, lastModified: now, changeFrequency: "monthly" as ChangeFreq, priority: 0.5 },
    { url: `${site}/contacto`, lastModified: now, changeFrequency: "monthly" as ChangeFreq, priority: 0.5 },
    { url: `${site}/terminos`, lastModified: now, changeFrequency: "yearly" as ChangeFreq, priority: 0.3 },
    { url: `${site}/privacidad`, lastModified: now, changeFrequency: "yearly" as ChangeFreq, priority: 0.3 },
    { url: `${site}/libro-reclamaciones`, lastModified: now, changeFrequency: "yearly" as ChangeFreq, priority: 0.3 },
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
      url: `${site}/producto/${encodeURIComponent(r.slug)}`,
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
      url: `${site}/blog/${encodeURIComponent(p.slug)}`,
      lastModified: new Date(p.lastModified),
      changeFrequency: "monthly" as ChangeFreq,
      priority: 0.6,
    }));
  } catch (e) {
    console.warn("[sitemap] blog: no pude leer src/content/blog:", e);
  }

  return [...staticRoutes, ...productoRoutes, ...blogRoutes];
}
