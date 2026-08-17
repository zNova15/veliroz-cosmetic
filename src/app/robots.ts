import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

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
  // Delegado a src/lib/site.ts — ver ahí por qué no se usa VERCEL_URL en prod.
  return siteUrl();
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
