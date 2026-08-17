import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { CosmeticHeader } from "@/components/CosmeticHeader";
import { CartDrawer } from "@/components/CartDrawer";
import { PreventaBar } from "@/components/PreventaBar";

/* ============================================================
   Fuentes Veliroz Cosmetic (self-hosted via next/font):
   - Fraunces  : display serif con opsz variable → titulares editoriales
   - Inter     : body sans-serif → UI + copy corrido
   - JetBrains : mono → precios, ingredientes clínicos, códigos SKU
   ============================================================ */

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Veliroz Cosmetic · Skincare clínico y honesto en Perú",
    template: "%s · Veliroz Cosmetic",
  },
  description:
    "The Ordinary, CeraVe, Beauty of Joseon, COSRX y más — curados por rutina según tu piel. Envío nacional Shalom, entrega en Lima y Cajamarca.",
  metadataBase: new URL("https://veliroz.com"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Veliroz Cosmetic",
    description: "Skincare clínico y honesto. Rutinas curadas según tu piel.",
    url: "https://veliroz.com",
    siteName: "Veliroz",
    locale: "es_PE",
    type: "website",
  },
  robots: { index: true, follow: true },
  authors: [{ name: "Veliroz", url: "https://veliroz.com" }],
  keywords: [
    "the ordinary peru",
    "cerave peru",
    "beauty of joseon peru",
    "cosrx peru",
    "skincare peru",
    "cosmeticos cajamarca",
    "cosmeticos lima",
  ],
};

/* ============================================================
   RootLayout — chrome global de veliroz.com (Veliroz Cosmetic).
   Desde el refactor de rutas (Cosmetic pasó del segmento cosmetic a la
   raíz) este layout absorbió al viejo layout del segmento; acá vive
   TODO el chrome compartido:
   - <html>/<body> + variables de fuente.
   - CosmeticHeader: header sticky reutilizable (badges carrito/wishlist).
   - PreventaBar: barra fina de pre-venta global. El header es `fixed top-0`
     + spacer, así que la barra va DESPUÉS en el DOM para caer justo debajo
     y no quedar tapada. No invertir el orden.
   - CartDrawer: se monta UNA sola vez para todo el sitio; el open/close
     se maneja vía useUIStore, no vía props.
   Ojo: ninguna page debe volver a montar header/barra/drawer inline —
   se renderizarían dos veces.
   ============================================================ */

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-PE"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="paper-grain antialiased min-h-screen">
        <CosmeticHeader />
        <PreventaBar />
        {children}
        <CartDrawer />
        {/* Analytics stack: Vercel Web Analytics + GA4 + Meta Pixel.
            Vive en el root para cubrir /, /productos/**, /pago/**, etc.
            Cada script chequea su env var y hace fallback silencioso si falta. */}
        <Analytics />
      </body>
    </html>
  );
}
