import type { MetadataRoute } from "next";

/* ============================================================
   Veliroz Cosmetic — robots.txt dinámico
   - Allow global — el catálogo es público, queremos ser indexados.
   - Disallow endpoints internos y flujos privados:
     * /api/*  → route handlers, feeds, webhooks
     * /pago/*  → checkout con datos del usuario
     * /cuenta/*  → área privada del cliente
     * /mis-pedidos  → post-venta (noindex en su metadata)
   - Sitemap apunta al deploy actual (veliroz.com).
     Cuando esté el custom domain, setear NEXT_PUBLIC_SITE_URL.
   ============================================================ */

function baseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "https://veliroz.com";
}

export default function robots(): MetadataRoute.Robots {
  const site = baseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/pago/", "/cuenta/", "/mis-pedidos"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
