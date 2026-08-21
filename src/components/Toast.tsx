"use client";

import { AnimatePresence, motion } from "motion/react";

/* ============================================================
   Toast minimalista (usado por AddToCartButton).
   Auto-dismiss lo maneja el que consume el estado.
   ============================================================ */

interface Props {
  open: boolean;
  mensaje: string;
  subMensaje?: string;
}

export function Toast({ open, mensaje, subMensaje }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-ink text-cream px-5 py-3 rounded-full shadow-lg flex items-center gap-3 max-w-[92vw]"
          role="status"
          aria-live="polite"
        >
          <svg className="w-4 h-4 text-champagne" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-sm font-medium tracking-wide">{mensaje}</span>
          {subMensaje && (
            <span className="text-xs text-cream/70 hidden sm:inline">· {subMensaje}</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
