"use client";

import { useEffect, useState } from "react";
import { useWishlistStore } from "@/lib/store";

/* ============================================================
   Botón "Wishlist" — corazón contorneado / relleno.
   Sincroniza con Zustand persist (localStorage veliroz-cosmetic-wishlist).
   Guarda por productoId (uuid) para sobrevivir a rename de slug.
   ============================================================ */

interface Props {
  productoId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function WishlistButton({ productoId, className = "", size = "md" }: Props) {
  const toggle = useWishlistStore((s) => s.toggle);
  const has = useWishlistStore((s) => s.items.includes(productoId));

  // Evita el flash de "no favorito" durante SSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const active = mounted && has;

  const dim = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-12 h-12" : "w-10 h-10";
  const svg = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-6 h-6" : "w-5 h-5";

  return (
    <button
      type="button"
      onClick={() => toggle(productoId)}
      aria-pressed={active}
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`${dim} rounded-full bg-cream/90 backdrop-blur-sm border border-[--border] flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-rose-deep ${className}`}
    >
      <svg
        className={`${svg} transition-colors ${active ? "text-rose-deep" : "text-ink"}`}
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
