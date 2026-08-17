import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";

/* ============================================================
   LegalDoc — chrome compartido de las páginas legales
   (/terminos, /privacidad).

   Layout editorial simple, sin sidebar: hero con migas + título
   Fraunces, índice de anclas, cuerpo en columna angosta (~65ch,
   el ancho de lectura cómodo) y pie con CTA de contacto.

   Server component puro — cero JS. El índice usa <a href="#id">
   nativo; el offset del header fijo lo resuelve `scroll-mt-28`
   en cada <LegalSection>.
   ============================================================ */

export interface LegalIndiceItem {
  id: string;
  titulo: string;
}

interface LegalDocProps {
  /** Kicker mono sobre el título (ej. "· Lo formal, en claro ·"). */
  kicker: string;
  /** Titular principal. */
  titulo: string;
  /** Segunda línea del titular, en itálica rose. Opcional. */
  tituloItalic?: string;
  /** Bajada de 1-2 frases. */
  resumen: ReactNode;
  /** Fecha legible de última actualización (ej. "16 de agosto de 2026"). */
  actualizado: string;
  /** Migas: label del último nivel. */
  breadcrumb: string;
  /** Secciones para el índice — mismo orden que los <LegalSection>. */
  indice: LegalIndiceItem[];
  children: ReactNode;
}

export function LegalDoc({
  kicker,
  titulo,
  tituloItalic,
  resumen,
  actualizado,
  breadcrumb,
  indice,
  children,
}: LegalDocProps) {
  return (
    <main className="min-h-screen">
      {/* ────────────────── HERO ────────────────── */}
      <section className="max-w-[68ch] mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-8">
        <nav
          aria-label="Migas de pan"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-4"
        >
          <Link href="/" className="hover:text-ink">
            Inicio
          </Link>
          <span className="mx-2">·</span>
          <span className="text-ink">{breadcrumb}</span>
        </nav>

        <div className="space-y-3">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            {kicker}
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            {titulo}
            {tituloItalic && (
              <>
                {" "}
                <span className="font-italic-serif text-rose-deep">
                  {tituloItalic}
                </span>
              </>
            )}
          </h1>
          <p className="text-clay text-pretty leading-relaxed max-w-2xl">
            {resumen}
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe pt-2">
            Última actualización · {actualizado}
          </p>
        </div>
      </section>

      {/* ────────────────── ÍNDICE ────────────────── */}
      <section className="max-w-[68ch] mx-auto px-6 md:px-10 pb-12">
        <nav
          aria-label="Contenido de la página"
          className="bg-mist/50 border border-[--border] rounded-lg p-5 md:p-6"
        >
          <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe mb-4">
            En esta página
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {indice.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-clay hover:text-ink underline-offset-4 hover:underline"
                >
                  <span className="font-mono text-[10px] text-taupe mr-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      {/* ────────────────── CUERPO ────────────────── */}
      <article className="max-w-[68ch] mx-auto px-6 md:px-10 pb-16 space-y-12">
        {children}
      </article>

      {/* ────────────────── CTA ────────────────── */}
      <section className="max-w-[68ch] mx-auto px-6 md:px-10 pb-24 border-t border-[--border] pt-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <p className="text-sm text-clay text-pretty max-w-md">
          ¿Algo de esto no se entiende o querés que te lo expliquemos en
          criollo? Escribinos — preferimos una conversación a una letra chica.
        </p>
        <div className="flex gap-3 shrink-0">
          <Link href="/" className="btn-outline text-sm">
            Volver al inicio
          </Link>
          <Link href="/contacto" className="btn-primary text-sm">
            Contactar
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

interface LegalSectionProps {
  id: string;
  /** Número de orden mostrado en mono (ej. "01"). */
  n: string;
  titulo: string;
  children: ReactNode;
}

export function LegalSection({ id, n, titulo, children }: LegalSectionProps) {
  return (
    <section id={id} className="scroll-mt-28 space-y-4">
      <h2 className="font-serif text-2xl md:text-[1.75rem] text-ink italic leading-tight flex items-baseline gap-3">
        <span className="font-mono not-italic text-[11px] text-taupe shrink-0">
          {n}
        </span>
        <span>{titulo}</span>
      </h2>
      <div className="space-y-4 text-[15px] leading-relaxed text-clay text-pretty [&_strong]:text-ink [&_strong]:font-medium [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </section>
  );
}

/** Lista con viñetas del documento legal. */
export function LegalList({ children }: { children: ReactNode }) {
  return (
    <ul className="space-y-2 pl-5 list-disc marker:text-champagne-dark">
      {children}
    </ul>
  );
}
