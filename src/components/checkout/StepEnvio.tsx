"use client";

import {
  useCheckoutStore,
  ENVIO_GRATIS_DESDE,
  COSTO_SHALOM,
  COSTO_DOMICILIO_LIMA,
} from "@/lib/checkout-store";
import { Field, Tab } from "./FormField";
import type { StepValidator } from "./validators";

/* ============================================================
   Step 2 · Envío
   Tabs: Shalom nacional (default) · Domicilio Lima
   - Banner "Envío gratis desde S/149".
   - Costo Shalom S/12 · Domicilio Lima S/18 · GRATIS si aplica.
   ============================================================ */

interface Props {
  errors: Record<string, string>;
  subtotalPostDescuento: number;
}

export function StepEnvio({ errors, subtotalPostDescuento }: Props) {
  const s = useCheckoutStore();
  const gratis = subtotalPostDescuento >= ENVIO_GRATIS_DESDE;
  const faltaParaGratis = Math.max(0, ENVIO_GRATIS_DESDE - subtotalPostDescuento);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
          · Paso 2 de 3 ·
        </span>
        <h2 className="font-serif text-2xl md:text-3xl text-ink">
          ¿Cómo llegamos?
        </h2>
        <p className="text-sm text-clay">
          Elige Shalom para envío a nivel nacional o entrega a domicilio en Lima.
        </p>
      </header>

      {/* Banner envío gratis */}
      <div
        className={[
          "rounded-lg border p-4 flex items-center gap-3",
          gratis
            ? "border-[--veliroz-leaf]/40 bg-[--veliroz-leaf]/10"
            : "border-champagne/40 bg-champagne/10",
        ].join(" ")}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className={gratis ? "w-5 h-5 text-[--veliroz-leaf]" : "w-5 h-5 text-champagne-dark"}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h13v9H3z M16 11h4l1 3v3h-5" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
        <div className="text-sm">
          {gratis ? (
            <>
              <strong className="text-ink">Envío gratis aplicado.</strong>{" "}
              <span className="text-clay">
                Superaste los S/{ENVIO_GRATIS_DESDE} — el envío corre por
                nuestra cuenta.
              </span>
            </>
          ) : (
            <>
              <strong className="text-ink">
                Te faltan S/{faltaParaGratis.toFixed(2)}
              </strong>{" "}
              <span className="text-clay">
                para envío gratis (mínimo S/{ENVIO_GRATIS_DESDE}).
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tabs método */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Tab
          active={s.metodoEnvio === "shalom"}
          onClick={() => s.patch({ metodoEnvio: "shalom" })}
          title="Envío nacional Shalom"
          sub={gratis ? "Gratis · 2 a 5 días" : `S/${COSTO_SHALOM} · 2 a 5 días`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h13v9H3z M16 11h4l1 3v3h-5" />
              <circle cx="7" cy="18" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
          }
          badge="Recomendado"
        />
        <Tab
          active={s.metodoEnvio === "lima_domicilio"}
          onClick={() => s.patch({ metodoEnvio: "lima_domicilio" })}
          title="Domicilio · Lima"
          sub={gratis ? "Gratis · 24 a 48 h" : `S/${COSTO_DOMICILIO_LIMA} · 24 a 48 h`}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l9-7 9 7v9a1 1 0 01-1 1h-4v-6H8v6H4a1 1 0 01-1-1v-9z" />
            </svg>
          }
        />
      </div>

      {/* Formulario condicional */}
      {s.metodoEnvio === "shalom" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Agencia de destino"
            name="agenciaShalom"
            value={s.agenciaShalom}
            onChange={(e) => s.patch({ agenciaShalom: e.target.value })}
            placeholder="Ej: Cajamarca · Av. San Martín 456"
            error={errors.agenciaShalom}
            hint="Cualquier agencia Shalom del Perú."
            className="md:col-span-2"
          />
          <Field
            label="DNI del receptor"
            name="dniReceptor"
            value={s.dniReceptor}
            onChange={(e) =>
              s.patch({
                dniReceptor: e.target.value.replace(/\D/g, "").slice(0, 8),
              })
            }
            placeholder="12345678"
            inputMode="numeric"
            maxLength={8}
            error={errors.dniReceptor}
            hint="Quien recoge el paquete debe presentar este DNI."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Departamento"
            name="departamento"
            value={s.departamento}
            onChange={(e) => s.patch({ departamento: e.target.value })}
            placeholder="Lima"
            autoComplete="address-level1"
            error={errors.departamento}
          />
          <Field
            label="Provincia"
            name="provincia"
            value={s.provincia}
            onChange={(e) => s.patch({ provincia: e.target.value })}
            placeholder="Lima Metropolitana"
            autoComplete="address-level2"
            error={errors.provincia}
          />
          <Field
            label="Distrito"
            name="distrito"
            value={s.distrito}
            onChange={(e) => s.patch({ distrito: e.target.value })}
            placeholder="Santiago de Surco"
            autoComplete="address-level3"
            error={errors.distrito}
          />
          <Field
            label="Código postal"
            name="codigoPostal"
            value={s.codigoPostal}
            onChange={(e) =>
              s.patch({
                codigoPostal: e.target.value.replace(/[^\d]/g, "").slice(0, 5),
              })
            }
            placeholder="15023"
            inputMode="numeric"
            autoComplete="postal-code"
            error={errors.codigoPostal}
          />
          <Field
            label="Dirección"
            name="direccion"
            value={s.direccion}
            onChange={(e) => s.patch({ direccion: e.target.value })}
            placeholder="Av. Primavera"
            autoComplete="address-line1"
            error={errors.direccion}
            className="md:col-span-2"
          />
          <Field
            label="Número"
            name="numero"
            value={s.numero}
            onChange={(e) => s.patch({ numero: e.target.value })}
            placeholder="1234"
            error={errors.numero}
          />
          <Field
            label="Dpto (opcional)"
            name="dpto"
            value={s.dpto}
            onChange={(e) => s.patch({ dpto: e.target.value })}
            placeholder="502"
          />
          <Field
            label="Interior (opcional)"
            name="interior"
            value={s.interior}
            onChange={(e) => s.patch({ interior: e.target.value })}
            placeholder="B"
          />
          <Field
            label="Referencia"
            name="referencia"
            value={s.referencia}
            onChange={(e) => s.patch({ referencia: e.target.value })}
            placeholder="Cerca al parque, edificio color crema"
            className="md:col-span-2"
          />
        </div>
      )}
    </div>
  );
}

export const validateStepEnvio: StepValidator = (s) => {
  const errors: Record<string, string> = {};
  if (s.metodoEnvio === "shalom") {
    if (!s.agenciaShalom.trim())
      errors.agenciaShalom = "Indica la agencia de destino";
    if (!/^\d{8}$/.test(s.dniReceptor))
      errors.dniReceptor = "DNI del receptor debe tener 8 dígitos";
  } else {
    if (!s.departamento.trim()) errors.departamento = "Requerido";
    if (!s.provincia.trim()) errors.provincia = "Requerido";
    if (!s.distrito.trim()) errors.distrito = "Requerido";
    if (!s.direccion.trim()) errors.direccion = "Requerido";
    if (!s.numero.trim()) errors.numero = "Requerido";
  }
  return errors;
};
