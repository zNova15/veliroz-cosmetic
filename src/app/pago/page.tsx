"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { trackInitiateCheckout } from "@/lib/track";

/* ============================================================
   /pago — Checkout multi-step (Client Component).
   - Orquesta 3 steps + validación cross-step + submit.
   - Redirige a /pago/exito?codigo=… al confirmar.
   - Redirige a /productos si el carrito está vacío.
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

  /* InitiateCheckout — se dispara UNA vez, cuando la persona llega al pago
     con carrito. El evento existía en lib/track.ts desde el principio pero
     no lo llamaba nadie: Meta no puede optimizar hacia un evento que nunca
     recibe.
     El ref evita re-disparos cuando el carrito cambia dentro del checkout
     (quitar una unidad, aplicar un cupón): sería el mismo checkout contado
     varias veces y ensuciaría el embudo. */
  const checkoutTrackeado = useRef(false);
  useEffect(() => {
    if (!hydrated || checkoutTrackeado.current || items.length === 0) return;
    checkoutTrackeado.current = true;
    trackInitiateCheckout({
      total: subtotal,
      items_count: items.reduce((n, i) => n + i.cantidad, 0),
      items: items.map((i) => ({
        sku: i.sku,
        precio: i.snapshot.precio,
        cantidad: i.cantidad,
        marca: i.snapshot.marcaNombre,
        productoNombre: i.snapshot.productoNombre,
      })),
    });
  }, [hydrated, items, subtotal]);

  /* Errors por step. */
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotalPostDesc = Math.max(0, subtotal - cuponDescuento);
  const costoEnvio = useMemo(
    () => calcularCostoEnvio(subtotalPostDesc, metodoEnvio),
    [subtotalPostDesc, metodoEnvio],
  );
  const total = subtotalPostDesc + costoEnvio;

  /* El pedido ya se confirmó y estamos navegando a la pantalla de éxito.

     SIN ESTO EL CLIENTE PIERDE SU COMPROBANTE: handleSuccess vacía el
     carrito y después navega, pero vaciarlo dispara el gate de abajo, que
     hace router.replace("/productos") y pisa el push a /pago/exito. La
     persona pagaba y terminaba en el catálogo, sin código de pedido y sin
     saber si la compra entró. Verificado en una compra real de punta a
     punta: el pedido se creaba en la base y la pantalla terminaba en
     /productos.

     Es un ref y no un estado porque tiene que valer YA en el mismo tick en
     que se limpia el carrito, sin esperar un re-render. */
  const confirmado = useRef(false);

  /* Empty-cart gate — solo cuando ya hidratamos y NO venimos de confirmar. */
  useEffect(() => {
    if (hydrated && items.length === 0 && !confirmado.current) {
      router.replace("/productos");
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
    /* Antes de tocar el carrito: a partir de acá el gate no debe actuar. */
    confirmado.current = true;
    clearCart();
    resetCheckout();
    setErrors({});
    const qs = new URLSearchParams({
      codigo: pedidoCodigo,
      total: totalConfirmado.toFixed(2),
      email,
      pago: metodoPago,
    });
    router.push(`/pago/exito?${qs.toString()}`);
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
      {/* El header global (CosmeticHeader) + su spacer los provee el RootLayout.
          Antes esta página montaba su propia <nav fixed> encima, lo que dejaba
          dos barras superpuestas con links fantasma traslúcidos detrás. */}
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
            <Link href="/productos" className="hover:text-ink">
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
