"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { WishlistButton } from "./WishlistButton";

/* ============================================================
   PDP Gallery — dos modos:

   1. CON foto real (imagenUrl): next/image fill + object-contain sobre
      fondo suave (swatch de marca), padding generoso para que el envase
      respire, zoom sutil on-hover (scale-105, sin layout shift porque el
      contenedor es overflow-hidden y el aspect-square no cambia).
      Al haber una sola imagen NO se renderiza la fila de thumbnails.

   2. SIN foto (imagenUrl null): placeholder tipográfico original —
      swatch por marca + nombre en Fraunces italic + 5 thumbnails de tints.

   ============================================================ */

interface Props {
  productoId: string;
  productoNombre: string;
  marcaNombre: string;
  swatch: string;
  /** URL pública de Supabase Storage. null → placeholder tipográfico. */
  imagenUrl?: string | null;
  destacado?: boolean;
  variantesLabels?: string[];
  /** Badge "· Pre-venta ·" arriba-izq (stock 0 + meta.preventa). */
  preventa?: boolean;
  vista3D?: boolean;
}

// Genera 5 variaciones sutiles del mismo tono para los thumbnails.
function tintPalette(base: string): string[] {
  return [
    base,
    shift(base, +8),
    shift(base, -8),
    shift(base, +14),
    shift(base, -14),
  ];
}
function shift(hex: string, delta: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const parts = [0, 2, 4].map((i) => {
    const v = parseInt(clean.slice(i, i + 2), 16);
    const nv = Math.max(0, Math.min(255, v + delta));
    return nv.toString(16).padStart(2, "0");
  });
  return `#${parts.join("")}`;
}

export function Gallery({
  productoId,
  productoNombre,
  marcaNombre,
  swatch,
  imagenUrl = null,
  destacado = false,
  preventa = false,
  vista3D = false,
}: Props) {
  const tints = tintPalette(swatch);
  const [activo, setActivo] = useState(0);
  const conFoto = Boolean(imagenUrl);
  // Con foto el fondo es fijo (el swatch suave de marca); sin foto, el tint activo.
  const bg = conFoto ? swatch : tints[activo];

  return (
    <div className="space-y-4">
      {/* Vista principal */}
      <motion.div
        key={conFoto ? "foto" : activo}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="group relative aspect-square rounded-lg border border-[--border] overflow-hidden"
        style={{ background: bg }}
      >
        {/* Badges superiores */}
        <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
          <div className="flex flex-col gap-2 items-start">
            {destacado && (
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink bg-cream px-2.5 py-1 rounded-sm border border-[--border]">
                · Hero ·
              </span>
            )}
            {preventa && (
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink bg-champagne/60 px-2.5 py-1 rounded-sm border border-[--border]">
                · Pre-venta ·
              </span>
            )}
            {vista3D && (
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-cream bg-ink px-2.5 py-1 rounded-sm">
                Vista 3D disponible
              </span>
            )}
          </div>
          <WishlistButton productoId={productoId} size="md" />
        </div>

        {conFoto ? (
          /* ── Foto real ───────────────────────────────────── */
          <div className="absolute inset-0 p-10 md:p-14">
            <div className="relative w-full h-full">
              <Image
                src={imagenUrl as string}
                alt={`${productoNombre} — ${marcaNombre}`}
                fill
                sizes="(max-width: 768px) 92vw, 58vw"
                priority
                /* mix-blend-multiply: las fotos de proveedor vienen con fondo
                   blanco sólido; multiplicar contra el swatch (muy claro)
                   funde ese blanco con el fondo y elimina el recuadro. */
                className="object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-105"
              />
            </div>
          </div>
        ) : (
          /* ── Placeholder tipográfico ─────────────────────── */
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-taupe mb-4">
                {marcaNombre}
              </p>
              <p className="font-italic-serif text-4xl md:text-5xl text-ink leading-[1.05] text-balance max-w-md">
                {productoNombre}
              </p>
            </div>

            {/* Reflejo suave inferior — puro decorativo */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
              style={{
                background: `linear-gradient(to top, ${shift(bg, -12)} 0%, transparent 100%)`,
              }}
            />
          </>
        )}
      </motion.div>

      {/* Thumbnails — solo en modo placeholder (con foto real hay 1 sola vista) */}
      {!conFoto && (
        <div className="grid grid-cols-5 gap-2">
          {tints.map((t, i) => {
            const on = i === activo;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActivo(i)}
                aria-label={`Vista ${i + 1}`}
                aria-current={on}
                className={[
                  "aspect-square rounded-md border transition-all overflow-hidden relative",
                  on ? "border-ink" : "border-[--border] hover:border-[--border-2]",
                ].join(" ")}
                style={{ background: t }}
              >
                <span className="sr-only">Vista {i + 1}</span>
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center font-italic-serif text-sm text-ink/60"
                >
                  {marcaNombre.slice(0, 1)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
