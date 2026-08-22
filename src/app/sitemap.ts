import type { MetadataRoute } from "next";
import { getSupabase } from "@/lib/supabase";
import { listPostsForSitemap } from "@/lib/blog";
import { siteUrl } from "@/lib/site";
import { RUTINAS_ACTIVAS, getRutina } from "@/lib/rutinas";

/* ============================================================
   Veliroz Cosmetic — sitemap dinámico (app/sitemap.ts)
   Fuentes:
   - Estáticas: landing + hubs cosmetic (productos, rutinas,
     marcas, blog, quiz) + institucionales indexables.
   - Marcas: Supabase `marcas` activas → /marcas/[slug].
   - Rutinas: catálogo hardcoded de src/lib/rutinas.ts → /rutinas/[slug].
   - Productos: Supabase productos activos (linea_negocio='cosmetic').
     Si Supabase no está disponible en build → se omite silenciosamente.
   - Blog: MDX filesystem (src/content/blog/*.mdx) leído por
     listPostsForSitemap(). Siempre disponible en build, sin red.
   Cache: revalidate 1h — buen balance para catálogo dinámico.

   POR QUÉ SE REESCRIBIÓ (ago-2026): faltaban las 10 landings de marca y
   las 4 de rutina, que son justamente las de mayor intención de búsqueda
   ("anua perú", "beauty of joseon perú") — el sitemap sólo declaraba los
   hubs /marcas y /rutinas, así que Google llegaba a las fichas sólo por
   enlace interno. Además entraban URLs que no deberían: los bundles
   /producto/rutina-* (contenido duplicado de /rutinas/*, ver abajo) y los
   productos con meta.nso_pendiente, que no se pueden vender.

   REGLA: acá van SÓLO URLs canónicas. Si una página declara
   `alternates.canonical` apuntando a otra, va la otra y no ella.
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
  updated_at: string | null;
  meta: Record<string, unknown> | null;
}

interface MarcaSitemapRow {
  slug: string;
  updated_at: string | null;
  created_at: string | null;
}

/* lastModified real: `updated_at` es lo que de verdad cambió el contenido
   (las migraciones 024/025/033 reescribieron fotos y textos y sólo tocan esa
   columna). Antes se mandaba `created_at` para todo y, si faltaba, la fecha
   de hoy — un sitemap donde todo se modificó "hoy" es ruido que Google
   aprende a ignorar. */
function ultimaModificacion(
  row: { updated_at?: string | null; created_at?: string | null },
  fallback: Date,
): Date {
  const crudo = row.updated_at ?? row.created_at;
  if (!crudo) return fallback;
  const fecha = new Date(crudo);
  return Number.isNaN(fecha.getTime()) ? fallback : fecha;
}

/* ── Bundle de rutina → rutina ──────────────────────────────
   Cada rutina vive en dos URLs: /rutinas/<slug> (la que enlaza todo el
   sitio) y /producto/rutina-<slug> (el bundle comprable de la migración
   017). La canónica es la primera, así que la segunda NO entra al sitemap:
   ver el `alternates.canonical` de src/app/producto/[slug]/page.tsx, que es
   donde se declara la misma decisión.

   El vínculo sale de `meta.rutina_slug`, que es lo que la migración 017
   escribió en el bundle; el prefijo del slug queda como respaldo por si un
   bundle viejo no lo trae. Y se valida contra rutinas.ts porque
   /rutinas/[slug] tiene `dynamicParams = false`: si el bundle está activo
   en la base pero la rutina está apagada (glow-evento, migración 026),
   publicar /rutinas/<slug> sería mandar a Google a un 404. En ese caso el
   bundle se queda como /producto/*, que sí responde. */
const PREFIJO_BUNDLE = "rutina-";

function rutinaCanonicaDe(row: ProductoSitemapRow): string | null {
  const desdeMeta = row.meta?.["rutina_slug"];
  const candidato =
    typeof desdeMeta === "string" && desdeMeta
      ? desdeMeta
      : row.slug.startsWith(PREFIJO_BUNDLE)
        ? row.slug.slice(PREFIJO_BUNDLE.length)
        : null;
  if (!candidato) return null;
  const rutina = getRutina(candidato);
  return rutina?.activa ? rutina.slug : null;
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
    { url: `${site}/referidos`, lastModified: now, changeFrequency: "monthly" as ChangeFreq, priority: 0.6 },
    /* Institucionales + legales: indexables (robots.index = true en su
       metadata) y consultadas antes de comprar, así que entran al sitemap.
       /cuenta, /pago, /wishlist y /mis-pedidos quedan fuera a propósito —
       son noindex. */
    { url: `${site}/envios`, lastModified: now, changeFrequency: "monthly" as ChangeFreq, priority: 0.5 },
    { url: `${site}/contacto`, lastModified: now, changeFrequency: "monthly" as ChangeFreq, priority: 0.5 },
    { url: `${site}/terminos`, lastModified: now, changeFrequency: "yearly" as ChangeFreq, priority: 0.3 },
    { url: `${site}/privacidad`, lastModified: now, changeFrequency: "yearly" as ChangeFreq, priority: 0.3 },
    { url: `${site}/libro-reclamaciones`, lastModified: now, changeFrequency: "yearly" as ChangeFreq, priority: 0.3 },
  ];

  /* ─────────── Marcas (Supabase, degrada grácilmente) ───────────
     Mismo filtro `activo` que usa /marcas (ver ahí): una marca dada de baja
     no tiene productos y su landing queda vacía — declararla en el sitemap
     es pedirle a Google que indexe una página sin contenido. */
  let marcaRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data, error } = await getSupabase()
      .from("marcas")
      .select("slug, updated_at, created_at")
      .eq("activo", true);
    if (error) throw error;
    const rows = (data ?? []) as MarcaSitemapRow[];
    marcaRoutes = rows.map((r) => ({
      url: `${site}/marcas/${encodeURIComponent(r.slug)}`,
      lastModified: ultimaModificacion(r, now),
      changeFrequency: "weekly" as ChangeFreq,
      priority: 0.7,
    }));
  } catch (e) {
    console.warn("[sitemap] marcas: Supabase no disponible:", e);
  }

  /* ─────────── Productos y rutinas (una sola query) ───────────
     Las rutinas activas se siembran primero con `now` para que existan aunque
     Supabase esté caído: la página es SSG desde src/lib/rutinas.ts y responde
     igual. Cuando la query trae el bundle, su `updated_at` pisa esa fecha —
     es el único dato de la base que refleja cuándo cambió la rutina. */
  const rutinaLastMod = new Map<string, Date>(
    RUTINAS_ACTIVAS.map((r) => [r.slug, now]),
  );
  let productoRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data, error } = await getSupabase()
      .from("productos")
      .select("slug, created_at, updated_at, meta")
      .eq("linea_negocio", "cosmetic")
      .eq("activo", true)
      /* Fuera los que esperan Notificación Sanitaria (meta.nso_pendiente):
         la web les bloquea el carrito y los feeds de Google/Meta ya los
         excluyen, así que declararlos acá invitaba a Google a indexar
         fichas de cosméticos que no podemos vender en Perú.

         TRAMPA (la misma que documentan los feeds): el filtro natural
         .not("meta->>nso_pendiente","eq","true") VACÍA el resultado.
         PostgREST lo traduce a NOT (meta->>'nso_pendiente' = 'true'); para
         los productos sin la clave el ->> devuelve NULL, la comparación da
         NULL, NOT NULL sigue siendo NULL y el WHERE descarta la fila. Por
         eso el OR explícito con is.null. */
      .or("meta->>nso_pendiente.is.null,meta->>nso_pendiente.neq.true");
    if (error) throw error;
    const rows = (data ?? []) as ProductoSitemapRow[];

    for (const r of rows) {
      const rutinaSlug = rutinaCanonicaDe(r);
      if (rutinaSlug) {
        // Bundle de rutina: su canónica es /rutinas/<slug>, no esta URL.
        rutinaLastMod.set(rutinaSlug, ultimaModificacion(r, now));
        continue;
      }
      productoRoutes.push({
        url: `${site}/producto/${encodeURIComponent(r.slug)}`,
        lastModified: ultimaModificacion(r, now),
        changeFrequency: "weekly" as ChangeFreq,
        priority: 0.8,
      });
    }
  } catch (e) {
    console.warn("[sitemap] productos: Supabase no disponible:", e);
    productoRoutes = [];
  }

  const rutinaRoutes: MetadataRoute.Sitemap = RUTINAS_ACTIVAS.map((r) => ({
    url: `${site}/rutinas/${encodeURIComponent(r.slug)}`,
    lastModified: rutinaLastMod.get(r.slug) ?? now,
    changeFrequency: "weekly" as ChangeFreq,
    priority: 0.8,
  }));

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

  return [
    ...staticRoutes,
    ...marcaRoutes,
    ...rutinaRoutes,
    ...productoRoutes,
    ...blogRoutes,
  ];
}
