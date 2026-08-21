"use client";

import { useEffect, useState } from "react";

/* ============================================================
   Sello de la pantalla post-pago.

   POR QUÉ ESTE SÍ ANIMA, cuando casi nada más en el sitio lo hace:
   se ve UNA VEZ POR COMPRA. Es el tier de frecuencia donde vive el
   presupuesto de delight — el mismo movimiento en un botón del
   catálogo sería insoportable a la décima vez, acá es el único
   momento del recorrido que merece celebrarse.

   PROPÓSITO: feedback sobre el resultado de una operación que
   involucró dinero. La persona acaba de pagar y necesita una señal
   inequívoca de que salió bien.

   SÓLO celebra cuando el pago se aprobó. Un pago pendiente o fallido
   recibe el mismo ícono quieto: animar un fracaso con festejo es
   burlarse de quien acaba de tener un problema con su plata.

   El check se dibuja con stroke-dashoffset — es la excepción a la
   regla de "sólo transform y opacity": en un path SVG no dispara
   layout, y es lo que hace leer el trazo como algo que SE ESTÁ
   completando y no como algo que ya estaba.
   ============================================================ */

interface Props {
  /** Path del ícono. */
  d: string;
  /** Color del halo (viene del copy de cada estado). */
  halo: string;
  /** Clase de color del trazo. */
  tinta: string;
  /** Sólo `true` celebra. */
  celebrar: boolean;
}

export function SelloConfirmacion({ d, halo, tinta, celebrar }: Props) {
  const [listo, setListo] = useState(false);
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducido(mq.matches);
    /* Un frame de margen para que la transición tenga de dónde partir:
       pintado directo en el estado final, no hay animación. */
    const t = window.setTimeout(() => setListo(true), 40);
    return () => window.clearTimeout(t);
  }, []);

  const animar = celebrar && !reducido;

  return (
    <div
      className="inline-flex items-center justify-center w-16 h-16 rounded-full"
      style={{
        background: halo,
        transform: animar && !listo ? "scale(0.82)" : "scale(1)",
        opacity: animar && !listo ? 0 : 1,
        /* scale(0.82) y no scale(0): nada aparece de la nada.
           Bounce contenido — es alivio, no confeti. */
        transition: animar
          ? "transform 420ms cubic-bezier(0.34, 1.4, 0.5, 1), opacity 260ms cubic-bezier(0.23, 1, 0.32, 1)"
          : "none",
      }}
    >
      <svg
        className={`w-8 h-8 ${tinta}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={d}
          style={
            animar
              ? {
                  /* 48 cubre de sobra la longitud de estos paths en un
                     viewBox de 24; de más es inofensivo, de menos
                     dejaría el trazo cortado. */
                  strokeDasharray: 48,
                  strokeDashoffset: listo ? 0 : 48,
                  transition:
                    "stroke-dashoffset 520ms cubic-bezier(0.23, 1, 0.32, 1) 140ms",
                }
              : undefined
          }
        />
      </svg>
    </div>
  );
}
