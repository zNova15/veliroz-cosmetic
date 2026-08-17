import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/Analytics";

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
  alternates: { canonical: "/cosmetic" },
  openGraph: {
    title: "Veliroz Cosmetic",
    description: "Skincare clínico y honesto. Rutinas curadas según tu piel.",
    url: "https://veliroz.com/cosmetic",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-PE"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="paper-grain antialiased min-h-screen">
        {children}
        {/* Analytics stack: Vercel Web Analytics + GA4 + Meta Pixel.
            Vive en el root para cubrir /, /cosmetic/**, /carrito, /pago/**, etc.
            Cada script chequea su env var y hace fallback silencioso si falta. */}
        <Analytics />
      </body>
    </html>
  );
}
