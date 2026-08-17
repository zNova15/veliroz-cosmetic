"use client";

/* ============================================================
   Progress bar 3-step del checkout.
   - Muestra número + label + línea de progreso.
   - Los steps ya completados son clickeables (setStep hacia atrás).
   ============================================================ */

interface Props {
  step: 1 | 2 | 3;
  onNavigate?: (s: 1 | 2 | 3) => void;
}

const STEPS: Array<{ n: 1 | 2 | 3; label: string; sub: string }> = [
  { n: 1, label: "Datos", sub: "personales y comprobante" },
  { n: 2, label: "Envío", sub: "cómo y dónde" },
  { n: 3, label: "Pago",  sub: "método de pago" },
];

export function ProgressBar({ step, onNavigate }: Props) {
  return (
    <ol
      aria-label="Pasos del checkout"
      className="grid grid-cols-3 gap-2 md:gap-6"
    >
      {STEPS.map((s) => {
        const done = s.n < step;
        const active = s.n === step;
        const clickable = done && !!onNavigate;
        return (
          <li key={s.n} className="relative">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onNavigate?.(s.n)}
              aria-current={active ? "step" : undefined}
              className={[
                "w-full text-left flex items-start gap-3 p-3 rounded-md transition-colors",
                clickable ? "hover:bg-mist/60 cursor-pointer" : "",
                active ? "bg-mist/40" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "shrink-0 mt-0.5 w-7 h-7 rounded-full inline-flex items-center justify-center font-mono text-xs border transition-colors",
                  done
                    ? "bg-ink text-cream border-ink"
                    : active
                      ? "bg-cream text-ink border-ink"
                      : "bg-transparent text-taupe border-[--border-2]",
                ].join(" ")}
                aria-hidden
              >
                {done ? (
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  s.n
                )}
              </span>
              <span className="flex flex-col leading-tight">
                <span
                  className={[
                    "font-serif text-base",
                    active || done ? "text-ink" : "text-taupe",
                  ].join(" ")}
                >
                  {s.label}
                </span>
                <span className="text-[11px] text-clay hidden sm:block">
                  {s.sub}
                </span>
              </span>
            </button>
            {/* Línea horizontal entre steps (desktop) */}
            {s.n < 3 && (
              <span
                aria-hidden
                className={[
                  "hidden md:block absolute top-6 left-full w-6 h-px",
                  done ? "bg-ink" : "bg-[--border-2]",
                ].join(" ")}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
