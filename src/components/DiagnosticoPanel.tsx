"use client";

import { useEffect, useState } from "react";
import type { Diagnostico, Dimension, Banda } from "@/lib/diagnostico";
import { BANDA_LABEL } from "@/lib/diagnostico";

/* ============================================================
   Panel de resultado del diagnóstico.

   Estructura tomada de cómo presentan el resultado las marcas que
   viven de esto (Neutrogena Skin360, Vichy SkinConsult, Skin Genius):
   score con palabra → desglose por dimensión → jerarquía emocional
   (foco #1 + fortalezas) → recomendación.

   DECISIONES:
   · Las barras se animan al montar. No es decoración: el movimiento
     de 0 al valor hace leer el número como una medición y no como un
     texto fijo. Se respeta prefers-reduced-motion.
   · Las dimensiones van ordenadas de peor a mejor. Lo que hay que
     trabajar primero se lee primero.
   · Las fortalezas se muestran SIEMPRE, con el mismo peso visual que
     los focos. Un informe que sólo señala problemas se lee como una
     venta, y el lector deja de creerle también a lo demás.
   · El copy dice "según lo que nos contaste", nunca "medimos": no hay
     medición física detrás y prometerla sería mentir.
   ============================================================ */

const COLOR_BANDA: Record<Banda, string> = {
  excelente: "var(--veliroz-leaf, #6B8E7F)",
  bueno: "var(--veliroz-champagne, #D4B896)",
  regular: "var(--veliroz-taupe, #8B6F63)",
  atencion: "var(--veliroz-rose-deep, #C98B90)",
};

export function DiagnosticoPanel({ diag }: { diag: Diagnostico }) {
  const [animar, setAnimar] = useState(false);
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducido(mq.matches);
    /* Un frame de delay para que la transición tenga de dónde partir:
       si se pinta directo en el valor final, no hay animación. */
    const t = window.setTimeout(() => setAnimar(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  const ordenadas = [...diag.dimensiones].sort((a, b) => a.score - b.score);

  return (
    <section
      aria-label="Tu diagnóstico de piel"
      className="border border-[--border] rounded-lg overflow-hidden bg-surface"
    >
      {/* ───── Score global ───── */}
      <div className="bg-cream border-b border-[--border] px-6 md:px-10 py-8 md:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-8">
          <div className="shrink-0">
            <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              Tu diagnóstico
            </p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="font-serif text-6xl md:text-7xl text-ink leading-none">
                {diag.scoreGlobal}
              </span>
              <span className="font-mono text-sm text-stone">/100</span>
            </p>
          </div>

          <div className="min-w-0 sm:pb-1">
            <p className="font-serif text-2xl md:text-3xl text-ink italic leading-tight">
              {diag.etiqueta}
            </p>
            <p className="mt-2 text-sm text-clay text-pretty max-w-md">
              {diag.resumen}
            </p>
          </div>
        </div>
      </div>

      {/* ───── Dimensiones ───── */}
      <div className="px-6 md:px-10 py-8 space-y-5">
        <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
          Según lo que nos contaste
        </p>

        <ul className="space-y-4">
          {ordenadas.map((d, i) => (
            <li key={d.key}>
              <div className="flex items-baseline justify-between gap-4 mb-1.5">
                <span className="text-sm text-ink">{d.label}</span>
                <span className="font-mono text-[11px] text-taupe shrink-0">
                  {d.score} · {BANDA_LABEL[d.banda]}
                </span>
              </div>

              <div
                className="h-[6px] rounded-full bg-mist overflow-hidden"
                role="img"
                aria-label={`${d.label}: ${d.score} de 100, ${BANDA_LABEL[d.banda]}`}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: animar ? `${d.score}%` : "0%",
                    background: COLOR_BANDA[d.banda],
                    transition: reducido
                      ? "none"
                      : `width 900ms cubic-bezier(.16,1,.3,1) ${i * 80}ms`,
                  }}
                />
              </div>

              <p className="mt-1.5 text-[12px] text-clay text-pretty">{d.nota}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* ───── Focos y fortalezas ───── */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-[--border]">
        <div className="px-6 md:px-10 py-7 md:border-r border-[--border]">
          <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            {diag.focoPrincipal ? "Empezá por acá" : "Todo en orden"}
          </p>

          {diag.focoPrincipal ? (
            <>
              <p className="mt-3 font-serif text-2xl text-ink italic leading-tight">
                {diag.focoPrincipal.label}
              </p>
              <p className="mt-2 text-sm text-clay text-pretty">
                {diag.focoPrincipal.nota}
              </p>

              {diag.focos.length > 1 && (
                <p className="mt-4 text-[12px] text-stone">
                  Después:{" "}
                  {diag.focos
                    .slice(1)
                    .map((f) => f.label)
                    .join(" · ")}
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-clay text-pretty">
              No encontramos nada por debajo del umbral. Tu rutina está
              haciendo el trabajo — lo que sigue es sostenerla.
            </p>
          )}
        </div>

        <div className="px-6 md:px-10 py-7 border-t md:border-t-0 border-[--border]">
          <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            Lo que ya hacés bien
          </p>
          <ul className="mt-3 space-y-2.5">
            {diag.fortalezas.map((f) => (
              <li key={f.key} className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: COLOR_BANDA[f.banda] }}
                />
                <span className="text-sm text-clay">
                  <strong className="text-ink font-normal">{f.label}</strong>
                  <span className="font-mono text-[11px] text-stone"> · {f.score}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ───── Límite de lo que esto es ─────
          Explícito y visible, no escondido en un footer. La ley peruana
          no permite que esto se presente como diagnóstico médico, y
          además decirlo de frente hace que el resto se lea más creíble. */}
      <p className="px-6 md:px-10 py-5 border-t border-[--border] text-[11px] text-stone text-pretty">
        Esto es una orientación cosmética armada con tus respuestas, no un
        diagnóstico médico ni un tratamiento. Si tenés una condición de piel
        —acné severo, rosácea, dermatitis— consultá con un dermatólogo.
      </p>
    </section>
  );
}

/** Versión compacta para la cabecera del resultado. */
export function ScoreBadge({ diag }: { diag: Diagnostico }) {
  const primera = diag.dimensiones[0];
  void primera;
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full bg-cream border border-champagne/40 px-3 py-1">
      <span className="font-mono text-sm text-ink">{diag.scoreGlobal}</span>
      <span className="font-mono text-[10px] text-taupe">/100</span>
      <span className="text-[11px] text-clay">· {diag.etiqueta}</span>
    </span>
  );
}

/** Re-export para que la página no importe de dos lugares. */
export type { Dimension };
