import type { NextConfig } from "next";

/* ============================================================
   Veliroz Cosmetic — next.config

   Contexto de dominios (refactor agosto 2026):
   - veliroz.com          → ESTE app (Veliroz Cosmetic), rutas en la RAÍZ.
   - flores.veliroz.com   → el sitio HTML viejo (Flores Eternas), que hasta
                            ahora ocupaba veliroz.com.

   Los redirects de abajo cubren las dos herencias de URLs:
   (a) Cosmetic vivía en /cosmetic/** → ahora en /**.
   (b) Flores vivía en veliroz.com/*.html y /bienestar|/chocotejas|/dulces
       → ahora en flores.veliroz.com.

   Nota sobre el código HTTP: `permanent: true` emite 308 (no 301). Next usa
   308/307 a propósito para preservar el método del request; Google y Bing lo
   tratan igual que un 301 a efectos de SEO y transferencia de autoridad.
   Si alguna vez se necesita literalmente 301, se reemplaza `permanent: true`
   por `statusCode: 301` (son mutuamente excluyentes).
   ============================================================ */

/* Páginas sueltas del sitio viejo de Flores. Todas terminan en `.html`, así
   que NO colisionan con ninguna ruta de Cosmetic (/contacto, /cuenta, /blog,
   /pago... son rutas sin extensión). Verificado al armar la lista. */
const FLORES_PAGES = [
  "catalogo.html",
  "producto.html",
  "carrito.html",
  "pago.html",
  "pago-exitoso.html",
  "pago-pendiente.html",
  "cuenta.html",
  "mis-pedidos.html",
  "login.html",
  "nosotros.html",
  "ocasiones.html",
  "contacto.html",
  "faq.html",
  "blog.html",
  "articulo.html",
  "puntos.html",
  "suscripcion.html",
  "chocotejas.html",
  "404.html",
] as const;

/* Carpetas completas del sitio viejo. `:path*` matchea cero o más segmentos,
   así que `/chocotejas/:path*` cubre también `/chocotejas` pelado.
   Ninguna de estas tres es ruta de Cosmetic. */
const FLORES_DIRS = ["bienestar", "chocotejas", "dulces"] as const;

const FLORES_HOST = "https://flores.veliroz.com";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "usfpzlxmmgruydqbymsx.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async redirects() {
    return [
      /* ── (a) URLs viejas de Cosmetic: /cosmetic/** → raíz ── */
      { source: "/cosmetic", destination: "/", permanent: true },
      { source: "/cosmetic/:path*", destination: "/:path*", permanent: true },

      /* ── (b) URLs del sitio viejo de Flores → flores.veliroz.com ── */
      ...FLORES_PAGES.map((page) => ({
        source: `/${page}`,
        destination: `${FLORES_HOST}/${page}`,
        permanent: true,
      })),
      ...FLORES_DIRS.map((dir) => ({
        source: `/${dir}/:path*`,
        destination: `${FLORES_HOST}/${dir}/:path*`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
