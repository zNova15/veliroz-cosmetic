"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCartStore } from "@/lib/store";
import {
  useCheckoutStore,
  calcularCostoEnvio,
} from "@/lib/checkout-store";
import { ProgressBar } from "@/components/checkout/ProgressBar";
import { StepDatos, validateStepDatos } from "@/components/checkout/StepDatos";
import { StepEnvio, validateStepEnvio } from "@/components/checkout/StepEnvio";
import { StepPago, validateStepPago } from "@/components/checkout/StepPago";
import { OrderSummary } from "@/components/checkout/OrderSummary";

/* ============================================================
   /cosmetic/pago — Checkout multi-step (Client Component).
   - Orquesta 3 steps + validación cross-step + submit.
   - Redirige a /cosmetic/pago/exito?codigo=… al confirmar.
   - Redirige a /cosmetic/productos si el carrito está vacío.
   ============================================================ */

type Step = 1 | 2 | 3;

export default function PagoPage() {
  const router = useRouter();

  /* Cart (para gate + subtotal). */
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.total());
  const clearCart = useCartStore((s) => s.clear);

  /* Checkout state (persistido). */
  const step = useCheckoutStore((s) => s.step);
  const setStep = useCheckoutStore((s) => s.setStep);
  const cuponDescuento = useCheckoutStore((s) => s.cuponDescuento);
  const metodoEnvio = useCheckoutStore((s) => s.metodoEnvio);
  const resetCheckout = useCheckoutStore((s) => s.reset);

  /* Guard: montado en cliente para evitar hydration mismatch con zustand-persist. */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  /* Errors por step. */
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotalPostDesc = Math.max(0, subtotal - cuponDescuento);
  const costoEnvio = useMemo(
    () => calcularCostoEnvio(subtotalPostDesc, metodoEnvio),
    [subtotalPostDesc, metodoEnvio],
  );
  const total = subtotalPostDesc + costoEnvio;

  /* Empty-cart gate — solo cuando ya hidratamos. */
  useEffect(() => {
    if (hydrated && items.length === 0) {
      /* No hard-redirect si el usuario recién completó (el pago exitoso
         limpia el carrito antes de router.push). Lo evitamos con un
         chequeo de storage — pero para simplicidad hoy sí redirigimos. */
      router.replace("/cosmetic/productos");
    }
  }, [hydrated, items.length, router]);

  const advance = (target?: Step) => {
    const next: Step = (target ?? Math.min(3, step + 1)) as Step;
    /* Validar todos los steps <= target/current antes de avanzar. */
    const errsD = validateStepDatos(useCheckoutStore.getState());
    if (Object.keys(errsD).length > 0) {
      setStep(1);
      setErrors(errsD);
      return false;
    }
    if (next >= 2) {
      const errsE = validateStepEnvio(useCheckoutStore.getState());
      if (next >= 3 && Object.keys(errsE).length > 0) {
        setStep(2);
        setErrors(errsE);
        return false;
      }
      if (next === 2 && step === 1) {
        setErrors({});
        setStep(2);
        return true;
      }
      if (next === 2 && step === 3) {
        setErrors({});
        setStep(2);
        return true;
      }
    }
    if (next === 3) {
      const errsE = validateStepEnvio(useCheckoutStore.getState());
      if (Object.keys(errsE).length > 0) {
        setStep(2);
        setErrors(errsE);
        return false;
      }
      setErrors({});
      setStep(3);
      return true;
    }
    setErrors({});
    setStep(next);
    return true;
  };

  /* Validador que corre el sidebar antes de confirmar (step 3 → RPC). */
  const preConfirmValidator = () => {
    const s = useCheckoutStore.getState();
    const errs = {
      ...validateStepDatos(s),
      ...validateStepEnvio(s),
      ...validateStepPago(s),
    };
    if (Object.keys(errs).length > 0) {
      /* Enviar al primer step con errores. */
      const errsD = validateStepDatos(s);
      const errsE = validateStepEnvio(s);
      if (Object.keys(errsD).length > 0) setStep(1);
      else if (Object.keys(errsE).length > 0) setStep(2);
      setErrors(errs);
      return false;
    }
    return true;
  };

  const handleSuccess = (pedidoCodigo: string, totalConfirmado: number) => {
    /* Limpia estado y navega. Enviamos también total y email por URL. */
    const email = useCheckoutStore.getState().email;
    const metodoPago = useCheckoutStore.getState().metodoPago;
    clearCart();
    resetCheckout();
    setErrors({});
    const qs = new URLSearchParams({
      codigo: pedidoCodigo,
      total: totalConfirmado.toFixed(2),
      email,
      pago: metodoPago,
    });
    router.push(`/cosmetic/pago/exito?${qs.toString()}`);
  };

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-clay">Cargando checkout…</p>
      </main>
    );
  }

  if (items.length === 0) {
    return null; // el useEffect ya redirige
  }

  return (
    <main className="min-h-screen">
      {/* NAV minimal */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-cream/85 backdrop-blur-md border-b border-[--border]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center font-serif italic text-lg font-bold">
              V
            </span>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-serif text-ink text-base font-semibold tracking-tight">
                Veliroz
              </span>
              <span className="text-[9px] tracking-[0.18em] text-clay uppercase mt-1">
                Cosmetic
              </span>
            </div>
          </Link>
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-clay hidden md:inline">
            · Checkout seguro ·
          </span>
          <Link
            href="/cosmetic/productos"
            className="text-clay hover:text-ink text-sm inline-flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Seguir comprando
          </Link>
        </div>
      </nav>
      <div className="h-[68px]" />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-8 md:py-12">
        {/* Breadcrumb + progress */}
        <div className="mb-8 md:mb-10 space-y-6">
          <nav
            aria-label="Migas de pan"
            className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe"
          >
            <Link href="/" className="hover:text-ink">
              Inicio
            </Link>
            <span className="mx-2">·</span>
            <Link href="/cosmetic/productos" className="hover:text-ink">
              Catálogo
            </Link>
            <span className="mx-2">·</span>
            <span className="text-ink">Pago</span>
          </nav>

          <div className="max-w-3xl">
            <ProgressBar
              step={step}
              onNavigate={(s) => {
                setErrors({});
                setStep(s);
              }}
            />
          </div>
        </div>

        {/* Layout main + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
          {/* Steps */}
          <div className="min-w-0">
            <div className="bg-surface border border-[--border] rounded-lg p-5 md:p-8 space-y-8">
              {step === 1 && <StepDatos errors={errors} />}
              {step === 2 && (
                <StepEnvio
                  errors={errors}
                  subtotalPostDescuento={subtotalPostDesc}
                />
              )}
              {step === 3 && <StepPago totalMostrado={total} />}

              {/* Nav secondary (Volver / Continuar) */}
              <div className="flex items-center justify-between pt-6 border-t border-[--border]">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setStep((step - 1) as Step);
                    }}
                    className="text-sm text-clay hover:text-ink inline-flex items-center gap-1.5"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Volver
                  </button>
                ) : (
                  <span />
                )}

                {step < 3 && (
                  <button
                    type="button"
                    onClick={() => advance()}
                    className="btn-outline"
                  >
                    Continuar
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="min-w-0">
            <OrderSummary
              stepActual={step}
              onNext={() => advance()}
              onBeforeConfirm={preConfirmValidator}
              onSuccess={handleSuccess}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
