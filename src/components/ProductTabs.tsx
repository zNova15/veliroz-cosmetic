"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ReviewRow } from "@/lib/types";
import { lookupIngredientes } from "@/lib/marcas";

/* ============================================================
   PDP Tabs — Descripción / Ingredientes / Modo de uso / Reviews.
   Animación fade+slide con Motion (respetamos prefers-reduced-motion).
   ============================================================ */

interface Props {
  descripcionLarga: string | null;
  ingredienteActivo: string[] | null;
  ingredientesFull: string | null;
  modoUso: string | null;
  advertencias: string | null;
  reviews: ReviewRow[];
  reviewsAvg: number | null;
  reviewsCount: number;
}

type TabId = "desc" | "ing" | "uso" | "rev";

interface TabDef {
  id: TabId;
  label: string;
  count?: number;
}

export function ProductTabs({
  descripcionLarga,
  ingredienteActivo,
  ingredientesFull,
  modoUso,
  advertencias,
  reviews,
  reviewsAvg,
  reviewsCount,
}: Props) {
  const [active, setActive] = useState<TabId>("desc");

  const tabs = useMemo<TabDef[]>(
    () => [
      { id: "desc", label: "Descripción" },
      { id: "ing", label: "Ingredientes" },
      { id: "uso", label: "Modo de uso" },
      { id: "rev", label: "Reviews", count: reviewsCount },
    ],
    [reviewsCount]
  );

  const ingInfo = useMemo(() => lookupIngredientes(ingredienteActivo), [ingredienteActivo]);

  return (
    <section aria-label="Detalles del producto" className="space-y-8">
      {/* Tab bar */}
      <div role="tablist" className="flex flex-wrap gap-2 border-b border-[--border]">
        {tabs.map((t) => {
          const on = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              aria-controls={`tabpanel-${t.id}`}
              id={`tab-${t.id}`}
              onClick={() => setActive(t.id)}
              className={[
                "relative px-4 py-3 text-sm transition-colors -mb-px",
                on ? "text-ink" : "text-clay hover:text-ink",
              ].join(" ")}
            >
              <span className="font-medium">{t.label}</span>
              {typeof t.count === "number" && t.count > 0 && (
                <span className="ml-1.5 font-mono text-[10px] text-taupe">
                  ({t.count})
                </span>
              )}
              {on && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-2 -bottom-px h-[2px] bg-ink"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Panels */}
      <div className="min-h-[220px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            id={`tabpanel-${active}`}
            role="tabpanel"
            aria-labelledby={`tab-${active}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {active === "desc" && (
              <div className="prose max-w-3xl text-clay leading-relaxed text-pretty space-y-4">
                {descripcionLarga ? (
                  descripcionLarga
                    .split(/\n{2,}/)
                    .map((par, i) => <p key={i}>{par}</p>)
                ) : (
                  <p className="text-stone italic">
                    Descripción larga próximamente. Escribinos por WhatsApp si querés que te la contemos.
                  </p>
                )}
              </div>
            )}

            {active === "ing" && (
              <div className="space-y-8 max-w-3xl">
                {/* Chips de activos */}
                {ingredienteActivo?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {ingredienteActivo.map((a) => (
                      <span
                        key={a}
                        className="px-4 py-2 rounded-full bg-mist border border-[--border] font-mono text-xs uppercase tracking-wider text-ink"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Cards "¿Qué es X?" */}
                {ingInfo.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ingInfo.map((ing) => (
                      <div
                        key={ing.slug}
                        className="p-5 rounded-lg border border-[--border] bg-surface"
                      >
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-taupe">
                          ¿Qué es?
                        </p>
                        <h4 className="font-serif text-xl text-ink mt-1 mb-2">
                          {ing.nombre}
                        </h4>
                        <p className="text-sm text-ink font-medium mb-2">{ing.claim}</p>
                        <p className="text-sm text-clay leading-relaxed">{ing.detalle}</p>
                        {ing.cuidados && (
                          <p className="text-xs text-[--veliroz-champagne-dark] mt-3 italic">
                            ⚠ {ing.cuidados}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* INCI completo */}
                {ingredientesFull && (
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-taupe">
                      INCI completo
                    </p>
                    <p className="font-mono text-[11px] leading-relaxed text-clay bg-mist p-4 rounded-md">
                      {ingredientesFull}
                    </p>
                  </div>
                )}
                {!ingredientesFull && !ingredienteActivo?.length && (
                  <p className="text-sm text-stone italic">
                    Lista de ingredientes próximamente.
                  </p>
                )}
              </div>
            )}

            {active === "uso" && (
              <div className="max-w-2xl space-y-6">
                {modoUso ? (
                  <div className="text-clay leading-relaxed text-pretty space-y-3">
                    {modoUso.split(/\n/).map((linea, i) =>
                      linea.trim() ? (
                        <p key={i} className="flex gap-3">
                          <span className="font-mono text-champagne-dark shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{linea.trim()}</span>
                        </p>
                      ) : null
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-stone italic">
                    Modo de uso próximamente.
                  </p>
                )}
                {advertencias && (
                  <div className="p-4 rounded-md border border-[--veliroz-champagne] bg-[color:#FFF9EF]">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[--veliroz-champagne-dark] mb-1">
                      Advertencias
                    </p>
                    <p className="text-sm text-ink leading-relaxed">{advertencias}</p>
                  </div>
                )}
              </div>
            )}

            {active === "rev" && (
              <div className="max-w-3xl space-y-6">
                {reviewsCount > 0 && reviewsAvg !== null && (
                  <div className="flex items-baseline gap-3 pb-4 border-b border-[--border]">
                    <span className="font-serif text-4xl text-ink">
                      {reviewsAvg.toFixed(1)}
                    </span>
                    <Stars value={reviewsAvg} size="md" />
                    <span className="text-sm text-clay">
                      · {reviewsCount} {reviewsCount === 1 ? "reseña" : "reseñas"}
                    </span>
                  </div>
                )}

                {reviews.length > 0 ? (
                  <ul className="divide-y divide-[--border]">
                    {reviews.map((r) => (
                      <li key={r.id} className="py-5 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Stars value={r.rating} size="sm" />
                          {r.titulo && (
                            <h5 className="font-serif text-lg text-ink">{r.titulo}</h5>
                          )}
                        </div>
                        {r.comentario && (
                          <p className="text-sm text-clay leading-relaxed text-pretty">
                            {r.comentario}
                          </p>
                        )}
                        <div className="flex gap-3 flex-wrap text-[11px] font-mono text-taupe uppercase tracking-wider">
                          {r.tipo_piel && <span>Piel {r.tipo_piel}</span>}
                          {r.edad_rango && <span>· {r.edad_rango}</span>}
                          <span>· {new Date(r.created_at).toLocaleDateString("es-PE")}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 rounded-lg bg-mist border border-[--border] text-center">
                    <p className="font-serif text-lg text-ink italic">
                      Sé el primero en dejar una reseña.
                    </p>
                    <p className="text-sm text-clay mt-1">
                      Solo clientes que compraron pueden opinar.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* Estrellas — versión compacta reutilizada dentro del tab. */
function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const dim = size === "md" ? "w-5 h-5" : "w-4 h-4";
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {stars.map((s) => {
        const filled = value >= s - 0.25;
        const half = !filled && value >= s - 0.75;
        return (
          <svg
            key={s}
            className={`${dim} ${filled || half ? "text-champagne-dark" : "text-stone/40"}`}
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : half ? "url(#half-star)" : "none"}
            stroke="currentColor"
            strokeWidth="1.4"
          >
            {half && (
              <defs>
                <linearGradient id="half-star">
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            )}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111 5.518.442c.499.04.701.663.321.988l-4.204 3.602 1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 19.64a.562.562 0 01-.84-.61l1.285-5.386-4.204-3.602a.563.563 0 01.321-.988l5.518-.442 2.125-5.111z"
            />
          </svg>
        );
      })}
    </span>
  );
}
