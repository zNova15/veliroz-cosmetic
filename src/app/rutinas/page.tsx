import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { RUTINAS, DIFICULTAD_LABEL } from "@/lib/rutinas";

/* ============================================================
   /rutinas — landing de rutinas curadas.
   Server Component: data hardcoded en /src/lib/rutinas.ts.
   Cada card → /rutinas/[slug].
   ============================================================ */

export const metadata: Metadata = {
  title: "Rutinas curadas · según tu piel",
  description: `No compres productos, comprá rutinas. ${RUTINAS.length} secuencias curadas por objetivo — ${RUTINAS.map(
    (r) => r.nombre.toLowerCase()
  ).join(", ")}. 2-3 pasos, evidencia real, cero humo.`,
  alternates: { canonical: "/rutinas" },
};

export default function RutinasPage() {
  return (
    <main className="min-h-screen">
      {/* ────────────────── HERO ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-8">
        <nav
          aria-label="Migas de pan"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-4"
        >
          <Link href="/" className="hover:text-ink">
            Inicio
          </Link>
          <span className="mx-2">·</span>
          <span className="text-ink">Rutinas</span>
        </nav>

        <div className="max-w-3xl space-y-4">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · No compres productos. Comprá rutinas ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            Rutinas curadas.{" "}
            <span className="font-italic-serif text-rose-deep">
              Por objetivo, no por marketing.
            </span>
          </h1>
          <p className="text-clay text-pretty max-w-2xl leading-relaxed">
            Cada rutina es una secuencia corta — limpieza, activo y protección —
            pensada para un problema puntual. Empezá con la que corresponda a tu
            piel hoy; si no sabés cuál, hacé el{" "}
            <Link
              href="/quiz"
              className="text-ink underline underline-offset-4 hover:text-rose-deep"
            >
              quiz de 5 preguntas
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ────────────────── GRID DE RUTINAS ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {RUTINAS.map((r) => (
            <article
              key={r.slug}
              className="rounded-lg p-8 flex flex-col gap-5 border border-[--border] transition-transform hover:-translate-y-1"
              style={{ background: r.accent }}
            >
              <div className="space-y-1">
                <span className="font-mono text-[9px] tracking-[0.24em] uppercase text-taupe">
                  {r.tag}
                </span>
                <h2 className="font-serif text-3xl text-ink italic leading-tight">
                  {r.nombre}
                </h2>
              </div>

              <p className="text-sm text-clay leading-relaxed text-pretty line-clamp-3">
                {r.descripcion}
              </p>

              <ul className="space-y-1.5 text-xs text-clay">
                <li className="flex items-center gap-2">
                  <span className="text-champagne-dark">◦</span>
                  <span>
                    {r.pasos.length} pasos · {r.tiempoMinutos} min
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-champagne-dark">◦</span>
                  <span>{DIFICULTAD_LABEL[r.dificultad]}</span>
                </li>
              </ul>

              <div className="pt-4 mt-auto border-t border-[--border] flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] text-stone line-through">
                    S/. {r.precioLista.toFixed(2)}
                  </p>
                  <p className="font-mono text-lg text-ink">
                    S/. {r.precioBundle.toFixed(2)}
                  </p>
                  <p className="font-mono text-[9px] tracking-[0.16em] uppercase text-champagne-dark">
                    Ahorrás S/{r.ahorro}
                  </p>
                </div>
                <Link
                  href={`/rutinas/${r.slug}`}
                  className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep shrink-0"
                >
                  Ver rutina →
                </Link>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-[11px] text-stone text-center text-pretty max-w-xl mx-auto">
          Todo el catálogo está en pre-venta: reservás hoy y despachamos en 5-7
          días. El precio de rutina se aplica al confirmar tu reserva por
          WhatsApp; el carrito suma los precios sueltos.
        </p>
      </section>

      {/* ────────────────── CROSS-LINK QUIZ ────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 pb-24">
        <div className="bg-surface rounded-lg border border-[--border] p-8 md:p-12 text-center space-y-4">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            ¿No sabés por dónde empezar?
          </span>
          <h3 className="font-serif text-3xl text-ink italic leading-tight">
            Contanos qué le pasa a tu piel — te armamos la rutina.
          </h3>
          <p className="text-clay text-sm max-w-lg mx-auto text-pretty">
            5 preguntas, 2 minutos, respuesta con productos concretos y en qué
            orden usarlos. Sin correo, sin humo.
          </p>
          <div className="pt-3">
            <Link href="/quiz" className="btn-primary">
              Hacer el quiz
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
