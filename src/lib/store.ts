"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, CartItemSnapshot } from "./types";

/* ============================================================
   Zustand stores globales persistidos en localStorage.
   - useWishlistStore: set<productoId> (IDs uuid, no slugs — sobreviven al rename).
   - useCartStore: array de líneas (sku, cantidad, snapshot).
   Ambos usan storage safe para SSR: cuando window no existe, devuelven noop.
   ============================================================ */

/* -------------------- Wishlist -------------------- */

interface WishlistState {
  items: string[]; // productoId uuid
  toggle: (productoId: string) => void;
  has: (productoId: string) => boolean;
  count: () => number;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (productoId) =>
        set((state) => {
          const has = state.items.includes(productoId);
          return {
            items: has
              ? state.items.filter((x) => x !== productoId)
              : [...state.items, productoId],
          };
        }),
      has: (productoId) => get().items.includes(productoId),
      count: () => get().items.length,
      clear: () => set({ items: [] }),
    }),
    {
      name: "veliroz-cosmetic-wishlist",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

/* -------------------- Cart -------------------- */

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (sku: string) => void;
  updateQty: (sku: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  total: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (nueva) =>
        set((state) => {
          const idx = state.items.findIndex((x) => x.sku === nueva.sku);
          if (idx >= 0) {
            // Sumamos cantidades y refrescamos snapshot (por si cambió el precio).
            const clon = [...state.items];
            clon[idx] = {
              ...clon[idx],
              cantidad: clon[idx].cantidad + nueva.cantidad,
              snapshot: nueva.snapshot,
            };
            return { items: clon };
          }
          return { items: [...state.items, nueva] };
        }),
      remove: (sku) =>
        set((state) => ({ items: state.items.filter((x) => x.sku !== sku) })),
      updateQty: (sku, qty) =>
        set((state) => {
          if (qty <= 0) {
            return { items: state.items.filter((x) => x.sku !== sku) };
          }
          return {
            items: state.items.map((x) =>
              x.sku === sku ? { ...x, cantidad: qty } : x
            ),
          };
        }),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((acc, x) => acc + x.cantidad, 0),
      total: () =>
        get().items.reduce(
          (acc, x) => acc + Number(x.snapshot.precio) * x.cantidad,
          0
        ),
    }),
    {
      name: "veliroz-cosmetic-cart",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

/* Helper para armar snapshot fácil desde una variante + producto + marca. */
export function makeSnapshot(args: {
  productoSlug: string;
  productoNombre: string;
  marcaNombre: string;
  varianteLabel: string;
  precio: number;
  imagenSwatch: string;
}): CartItemSnapshot {
  return { ...args };
}
