"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  MetodoEnvio,
  MetodoPago,
  TipoComprobante,
} from "./actions/pedidos";

/* ============================================================
   Checkout store (state del wizard).
   Persistido en localStorage para sobrevivir refresh, pero se
   LIMPIA apenas confirmamos el pedido (evita fugar datos entre
   sesiones distintas del mismo navegador).
   ============================================================ */

export interface CheckoutState {
  /* wizard */
  step: 1 | 2 | 3;

  /* Step 1 · datos personales + comprobante */
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  tipoComprobante: TipoComprobante;
  dni: string;
  ruc: string;
  razonSocial: string;
  direccionFiscal: string;

  /* Step 2 · envío */
  metodoEnvio: MetodoEnvio;
  /* shalom */
  agenciaShalom: string;
  dniReceptor: string;
  /* domicilio lima */
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  numero: string;
  dpto: string;
  interior: string;
  codigoPostal: string;
  referencia: string;

  /* Step 3 · pago */
  metodoPago: MetodoPago;

  /* cupón (evaluado server-side) */
  cupon: string;
  cuponDescuento: number;
  cuponLabel: string;
  cuponError: string;
  /* El campo del checkout es uno solo, pero el backend distingue: los
     cupones viven en `cupones` y los referidos en `referidos`, y se
     aplican por RPC distintos. Esta bandera dice cuál de los dos es. */
  cuponEsReferido: boolean;

  /* setters */
  setStep: (s: CheckoutState["step"]) => void;
  patch: (p: Partial<CheckoutState>) => void;
  reset: () => void;
  aplicarCupon: (
    code: string,
    descuento: number,
    label: string,
    esReferido?: boolean,
  ) => void;
  limpiarCupon: (mensaje?: string) => void;
}

const INITIAL: Omit<
  CheckoutState,
  "setStep" | "patch" | "reset" | "aplicarCupon" | "limpiarCupon"
> = {
  step: 1,
  nombres: "",
  apellidos: "",
  email: "",
  telefono: "",
  tipoComprobante: "boleta",
  dni: "",
  ruc: "",
  razonSocial: "",
  direccionFiscal: "",
  metodoEnvio: "shalom",
  agenciaShalom: "",
  dniReceptor: "",
  departamento: "Lima",
  provincia: "Lima Metropolitana",
  distrito: "Santiago de Surco",
  direccion: "",
  numero: "",
  dpto: "",
  interior: "",
  codigoPostal: "",
  referencia: "",
  metodoPago: "yape",
  cupon: "",
  cuponDescuento: 0,
  cuponLabel: "",
  cuponError: "",
  cuponEsReferido: false,
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      ...INITIAL,
      setStep: (step) => set({ step }),
      patch: (p) => set(p),
      reset: () => set({ ...INITIAL }),
      aplicarCupon: (code, descuento, label, esReferido = false) =>
        set({
          cupon: code.trim().toUpperCase(),
          cuponDescuento: descuento,
          cuponLabel: label,
          cuponError: "",
          cuponEsReferido: esReferido,
        }),
      limpiarCupon: (mensaje = "") =>
        set({
          cupon: "",
          cuponDescuento: 0,
          cuponLabel: "",
          cuponEsReferido: false,
          cuponError: mensaje,
        }),
    }),
    {
      name: "veliroz-cosmetic-checkout",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      /* No persistimos el step — al recargar mid-checkout arrancamos en 1. */
      partialize: (s) => {
        const { step: _step, ...rest } = s;
        void _step;
        return rest;
      },
    },
  ),
);

/* ============================================================
   Helpers de cálculo de envío — reglas Veliroz Cosmetic (Sprint 3+4)
   - Envío GRATIS si subtotal (post-descuento) >= 149
   - Shalom nacional: S/12
   - Domicilio Lima:  S/18
   ============================================================ */
export const ENVIO_GRATIS_DESDE = 149;
export const COSTO_SHALOM = 12;
export const COSTO_DOMICILIO_LIMA = 18;

export function calcularCostoEnvio(
  subtotalPostDescuento: number,
  metodo: MetodoEnvio,
): number {
  if (subtotalPostDescuento >= ENVIO_GRATIS_DESDE) return 0;
  return metodo === "shalom" ? COSTO_SHALOM : COSTO_DOMICILIO_LIMA;
}
