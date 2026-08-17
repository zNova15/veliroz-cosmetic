"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCartStore } from "@/lib/store";
import { useUIStore } from "@/lib/uiStore";

/* ============================================================
   CartDrawer — panel lateral (slide-in derecha) con el carrito.
   - Se abre/cierra vía useUIStore (openCart/closeCart).
   - Lee items del useCartStore. Cambios de cantidad → updateQty(sku, qty).
   - Overlay negro semitransparente: click cierra. Escape cierra también.
   - Bloquea scroll del body mientras está abierto.
   - Botón "Ir a pagar" → /cosmetic/pago (se implementa en Sprint 4).
   ============================================================ */

export function CartDrawer() {
  const open = useUIStore((s) => s.cartOpen);
  const close = useUIStore((s) => s.closeCart);

  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const remove = useCartStore((s) => s.remove);
  const total = useCartStore((s) => s.total());
  const count = useCartStore((s) => s.items.reduce((a, i) => a + i.cantidad, 0));

  // Cerrar con Escape + lock scroll body
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.button
            key="overlay"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            aria-label="Cerrar carrito"
            className="fixed inset-0 z-[90] bg-ink/45 backdrop-blur-[2px] cursor-default"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            role="dialog"
            aria-label="Tu carrito"
            aria-modal="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 bottom-0 z-[95] w-full sm:w-[420px] max-w-full bg-cream shadow-2xl flex flex-col border-l border-[--border]"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-[--border]">
              <div className="flex items-baseline gap-2">
                <h2 className="font-serif text-xl text-ink">Tu carrito</h2>
                <span className="font-mono text-[11px] text-taupe">
                  {count} {count === 1 ? "producto" : "productos"}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                className="w-9 h-9 rounded-full flex items-center justify-center text-ink hover:bg-mist transition-colors"
                aria-label="Cerrar"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </header>

            {/* Body */}
            {items.length === 0 ? (
              <EmptyState onClose={close} />
            ) : (
              <>
                <ul
                  role="list"
                  className="flex-1 overflow-y-auto px-5 md:px-6 py-4 space-y-4 divide-y divide-[--border]"
                >
                  {items.map((item, idx) => (
                    <li
                      key={item.sku}
                      className={
                        "flex gap-3 items-start " + (idx === 0 ? "" : "pt-4")
                      }
                    >
                      {/* Swatch color por marca */}
                      <div
                        className="w-16 h-20 rounded-md shrink-0 flex items-center justify-center border border-[--border]"
                        style={{ background: item.snapshot.imagenSwatch }}
                        aria-hidden
                      >
                        <span className="font-italic-serif text-xs text-ink/70 text-center px-1 leading-tight">
                          {item.snapshot.marcaNombre}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe">
                          {item.snapshot.marcaNombre}
                        </p>
                        <Link
                          href={`/cosmetic/producto/${item.snapshot.productoSlug}`}
                          onClick={close}
                          className="font-serif text-sm text-ink leading-snug hover:text-rose-deep line-clamp-2"
                        >
                          {item.snapshot.productoNombre}
                        </Link>
                        <p className="text-[11px] text-clay">
                          {item.snapshot.varianteLabel}
                        </p>

                        <div className="flex items-center justify-between mt-2 gap-2">
                          <QtyStepper
                            value={item.cantidad}
                            onChange={(qty) => updateQty(item.sku, qty)}
                          />
                          <p className="font-mono text-sm text-ink whitespace-nowrap">
                            S/. {(item.snapshot.precio * item.cantidad).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => remove(item.sku)}
                        aria-label={`Quitar ${item.snapshot.productoNombre}`}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-clay hover:text-rose-deep hover:bg-mist transition-colors shrink-0"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Footer */}
                <footer className="border-t border-[--border] px-5 md:px-6 py-5 space-y-3 bg-surface/50">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe">
                      Subtotal
                    </span>
                    <span className="font-mono text-xl text-ink">
                      S/. {total.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[11px] text-clay leading-snug">
                    Envío e impuestos se calculan al pagar.
                  </p>
                  <Link
                    href="/cosmetic/pago"
                    onClick={close}
                    className="btn-primary w-full justify-center"
                  >
                    Ir a pagar
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </Link>
                  <button
                    type="button"
                    onClick={close}
                    className="w-full text-center text-xs text-clay hover:text-ink underline underline-offset-4 pt-1"
                  >
                    Seguir comprando
                  </button>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/* ────────────────── Sub-componentes ────────────────── */

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-mist flex items-center justify-center">
        <svg
          className="w-7 h-7 text-taupe"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="font-serif text-lg text-ink italic">
          Tu carrito está vacío
        </p>
        <p className="text-sm text-clay">
          Empezá por acá — 7 productos curados esperándote.
        </p>
      </div>
      <Link href="/cosmetic/productos" onClick={onClose} className="btn-outline">
        Ver productos
      </Link>
    </div>
  );
}

function QtyStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (qty: number) => void;
}) {
  return (
    <div
      className="inline-flex items-center border border-[--border-2] rounded-full overflow-hidden bg-cream"
      role="group"
      aria-label="Cantidad"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-7 h-7 flex items-center justify-center text-ink hover:bg-mist"
        aria-label="Restar 1"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={99}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(Math.max(0, Math.min(99, Math.floor(n))));
        }}
        className="w-9 h-7 text-center bg-transparent font-mono text-xs text-ink outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Cantidad"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(99, value + 1))}
        className="w-7 h-7 flex items-center justify-center text-ink hover:bg-mist"
        aria-label="Sumar 1"
      >
        +
      </button>
    </div>
  );
}
