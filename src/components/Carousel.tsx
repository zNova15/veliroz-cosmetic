"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

/* ============================================================
   Carrusel genérico (Embla).

   Envuelve una lista de slides y agrega flechas + dots. No sabe nada
   de productos ni de rutinas: recibe `children` ya renderizados y sólo
   se ocupa del desplazamiento.

   DECISIONES:
   · Las flechas se OCULTAN si todo entra en pantalla (`canScroll`).
     Un carrusel con flechas muertas hace pensar que hay más contenido.
   · `dragFree: false` + `containScroll: "trimSnaps"` — el último slide
     no deja un hueco vacío a la derecha.
   · Teclado: ← y → mueven, pero sólo cuando el foco está dentro del
     carrusel, para no secuestrar las flechas de la página.
   · `prefers-reduced-motion` → salto instantáneo en vez de scroll
     animado. Embla anima con rAF, así que hay que apagarlo explícito.
   · Los slides NO se marcan aria-hidden: siguen siendo tabulables y
     los lee el lector de pantalla aunque estén fuera del viewport
     visual (es un scroll, no un tab panel).
   ============================================================ */

interface Props {
  children: React.ReactNode;
  /** Describe el contenido para lectores de pantalla. */
  ariaLabel: string;
  /** Muestra los puntos de paginación. Útil en móvil, ruidoso en desktop. */
  showDots?: boolean;
}

export function Carousel({ children, ariaLabel, showDots = true }: Props) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [emblaRef, embla] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
    duration: reducedMotion ? 0 : 22,
  });

  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [snaps, setSnaps] = useState<number[]>([]);
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (!embla) return;
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
    setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    setSnaps(embla.scrollSnapList());
    onSelect();
    embla.on("select", onSelect);
    embla.on("reInit", () => {
      setSnaps(embla.scrollSnapList());
      onSelect();
    });
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla, onSelect]);

  /* Si todo entra en pantalla, Embla reporta un solo snap: sin flechas. */
  const canScroll = snaps.length > 1;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!embla) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      embla.scrollPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      embla.scrollNext();
    }
  };

  return (
    <div
      role="group"
      aria-roledescription="carrusel"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="relative"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5 md:gap-6">{children}</div>
      </div>

      {canScroll && (
        <>
          <div className="flex items-center justify-between mt-6 gap-4">
            {showDots ? (
              <div className="flex items-center gap-2" role="tablist" aria-label="Ir al grupo">
                {snaps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === selected}
                    aria-label={`Grupo ${i + 1} de ${snaps.length}`}
                    onClick={() => embla?.scrollTo(i)}
                    /* El punto se ve de 8px pero el área táctil es de 44px:
                       el mínimo accesible sin romper el diseño. */
                    className="relative h-11 w-4 grid place-items-center cursor-pointer group"
                  >
                    <span
                      className={`block rounded-full transition-all duration-200 ${
                        i === selected
                          ? "w-6 h-[3px] bg-ink"
                          : "w-2 h-[3px] bg-stone group-hover:bg-taupe"
                      }`}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <CarouselArrow
                dir="prev"
                disabled={!canPrev}
                onClick={() => embla?.scrollPrev()}
              />
              <CarouselArrow
                dir="next"
                disabled={!canNext}
                onClick={() => embla?.scrollNext()}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CarouselArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Anterior" : "Siguiente"}
      className="w-11 h-11 grid place-items-center rounded-full border border-[--border]
                 text-ink transition-colors duration-200 cursor-pointer
                 hover:bg-ink hover:text-cream hover:border-ink
                 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink
                 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent
                 disabled:hover:text-ink disabled:hover:border-[--border]"
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={dir === "prev" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
        />
      </svg>
    </button>
  );
}

/** Slide con ancho responsive. Envolver cada hijo del Carousel. */
export function CarouselSlide({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex-[0_0_auto] min-w-0 ${className}`}>{children}</div>
  );
}
