import type { MetadataRoute } from "next";

/* ============================================================
   Veliroz Cosmetic — robots.txt dinámico
   - Allow global — el catálogo es público, queremos ser indexados.
   - Disallow endpoints internos y flujos privados:
     * /api/*  → route handlers, feeds, webhooks
     * /cosmetic/pago/*  → checkout con datos del usuario
     * /cosmetic/cuenta/*  → área privada del cliente
   - Sitemap apunta al deploy actual (veliroz-cosmetic.vercel.app).
     Cuando esté el custom domain, setear NEXT_PUBLIC_SITE_URL.
   ============================================================ */

function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "https://veliroz-cosmetic.vercel.app";
}

export default function robots(): MetadataRoute.Robots {
  const site = baseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/cosmetic/pago/", "/cosmetic/cuenta/"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
