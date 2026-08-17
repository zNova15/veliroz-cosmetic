"use client";

import type { ReactNode } from "react";
import { useUIStore } from "@/lib/uiStore";

/* ============================================================
   AbrirCarritoButton — el carrito de Veliroz Cosmetic es un DRAWER
   (CartDrawer, montado una vez en el RootLayout), no una página: no
   existe /carrito y linkear ahí devuelve 404.

   Este botón deja que un Server Component (ej: /cuenta) ofrezca "abrir
   el carrito" sin convertirse en client: se importa y se usa inline.
   ============================================================ */

interface Props {
  children: ReactNode;
  className?: string;
}

export function AbrirCarritoButton({ children, className = "" }: Props) {
  const openCart = useUIStore((s) => s.openCart);

  return (
    <button
      type="button"
      onClick={openCart}
      aria-haspopup="dialog"
      className={className}
    >
      {children}
    </button>
  );
}
