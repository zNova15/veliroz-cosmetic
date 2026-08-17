"use client";

import { create } from "zustand";

/* ============================================================
   UI state global (efímero, no persistido en localStorage):
   - cartOpen        → drawer lateral del carrito abierto/cerrado
   - mobileMenuOpen  → panel de nav mobile (hamburguesa) abierto/cerrado

   Se mantiene aparte de useCartStore/useWishlistStore porque:
   1. No queremos rehidratar "estaba abierto" al recargar.
   2. Cualquier component client puede abrir/cerrar el drawer sin prop-drilling
      (ej: AddToCartButton podría abrir el drawer tras agregar, en el futuro).
   ============================================================ */

interface UIState {
  cartOpen: boolean;
  mobileMenuOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  cartOpen: false,
  mobileMenuOpen: false,
  openCart: () => set({ cartOpen: true, mobileMenuOpen: false }),
  closeCart: () => set({ cartOpen: false }),
  toggleCart: () =>
    set((s) => ({ cartOpen: !s.cartOpen, mobileMenuOpen: false })),
  openMobileMenu: () => set({ mobileMenuOpen: true, cartOpen: false }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  toggleMobileMenu: () =>
    set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen, cartOpen: false })),
}));
