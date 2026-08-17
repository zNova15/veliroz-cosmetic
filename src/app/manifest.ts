import type { MetadataRoute } from "next";

/* ============================================================
   Veliroz Cosmetic — Web App Manifest (PWA)
   - Colores del design system:
       cream       #FBF7F4   → background
       ink         #1E1A17   → foreground / theme accent
     (theme_color en cream para que la barra del navegador
      mimicree el papel; el punto está en no romper la paleta.)
   - Icono: SVG inline "V" en ink sobre cream. Sirve para
     browsers Chromium + iOS 16+ (any + maskable declarados).
   - start_url apunta a la raíz "/" (la landing del catálogo).
   ============================================================ */

/* Ícono SVG inline como data: URI. Un solo asset, cero fetch. */
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#FBF7F4"/>
  <path d="M128 148 L256 396 L384 148 L336 148 L256 306 L176 148 Z" fill="#1E1A17"/>
</svg>`;

const ICON_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(ICON_SVG)}`;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Veliroz Cosmetic",
    short_name: "Veliroz",
    description:
      "Skincare clínico y honesto — The Ordinary, CeraVe, Beauty of Joseon, COSRX, Xhekpon. Rutinas curadas según tu piel.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF7F4",
    theme_color: "#FBF7F4",
    lang: "es-PE",
    categories: ["shopping", "lifestyle", "health"],
    icons: [
      {
        src: ICON_DATA_URI,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: ICON_DATA_URI,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
