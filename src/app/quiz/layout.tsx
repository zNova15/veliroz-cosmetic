import type { Metadata } from "next";

/* ============================================================
   Layout de metadata para /quiz.

   /quiz/page.tsx es Client Component ("use client"), así que no puede
   exportar `metadata`. Sin este layout hereda el canonical del RootLayout
   — que desde el refactor de rutas es "/" — y le estaría diciendo a Google
   que el quiz es un duplicado de la landing (estando además listado en el
   sitemap). Este layout solo fija el canonical propio; el resto de la
   metadata se sigue heredando del root.
   ============================================================ */

export const metadata: Metadata = {
  alternates: { canonical: "/quiz" },
};

export default function QuizLayout({ children }: LayoutProps<"/quiz">) {
  return children;
}
