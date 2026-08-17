import type { CheckoutState } from "@/lib/checkout-store";

/* ============================================================
   Firma común de validadores por-step.
   Devuelve un mapa {campo: mensaje} — vacío = válido.
   ============================================================ */
export type StepValidator = (s: CheckoutState) => Record<string, string>;
