"use client";

import { useCheckoutStore } from "@/lib/checkout-store";
import { Field, Tab } from "./FormField";
import type { StepValidator } from "./validators";

/* ============================================================
   Step 1 · Datos personales + Comprobante
   - Nombres, apellidos, email, teléfono (WhatsApp).
   - Tabs boleta/factura con campos condicionales.
   - Devuelve errores por campo vía props (parent orquesta).
   ============================================================ */

interface Props {
  errors: Record<string, string>;
}

export function StepDatos({ errors }: Props) {
  const s = useCheckoutStore();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
          · Paso 1 de 3 ·
        </span>
        <h2 className="font-serif text-2xl md:text-3xl text-ink">
          ¿A quién le enviamos?
        </h2>
        <p className="text-sm text-clay">
          Necesitamos estos datos para el envío y el comprobante fiscal.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field
          label="Nombres"
          name="nombres"
          value={s.nombres}
          onChange={(e) => s.patch({ nombres: e.target.value })}
          placeholder="María Fernanda"
          autoComplete="given-name"
          error={errors.nombres}
        />
        <Field
          label="Apellidos"
          name="apellidos"
          value={s.apellidos}
          onChange={(e) => s.patch({ apellidos: e.target.value })}
          placeholder="Ríos Vargas"
          autoComplete="family-name"
          error={errors.apellidos}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          value={s.email}
          onChange={(e) => s.patch({ email: e.target.value })}
          placeholder="tu@correo.com"
          autoComplete="email"
          error={errors.email}
          hint="Te enviamos el comprobante y el tracking a este correo."
        />
        <Field
          label="Teléfono / WhatsApp"
          name="telefono"
          type="tel"
          value={s.telefono}
          onChange={(e) =>
            s.patch({ telefono: e.target.value.replace(/[^\d+]/g, "") })
          }
          placeholder="+51 987 654 321"
          autoComplete="tel"
          inputMode="tel"
          error={errors.telefono}
        />
      </div>

      {/* Comprobante */}
      <div className="space-y-4">
        <h3 className="font-serif text-lg text-ink">Comprobante</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Tab
            active={s.tipoComprobante === "boleta"}
            onClick={() => s.patch({ tipoComprobante: "boleta" })}
            title="Boleta"
            sub="Compra personal · sólo DNI"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 3h6m-6-6h6M5 6a2 2 0 012-2h10a2 2 0 012 2v14l-3-2-2 2-2-2-2 2-3-2V6z" />
              </svg>
            }
          />
          <Tab
            active={s.tipoComprobante === "factura"}
            onClick={() => s.patch({ tipoComprobante: "factura" })}
            title="Factura"
            sub="Empresa · RUC + razón social"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3z M8 8h8 M8 12h8 M8 16h5" />
              </svg>
            }
          />
        </div>

        {s.tipoComprobante === "boleta" ? (
          <Field
            label="DNI"
            name="dni"
            value={s.dni}
            onChange={(e) =>
              s.patch({ dni: e.target.value.replace(/\D/g, "").slice(0, 8) })
            }
            placeholder="12345678"
            inputMode="numeric"
            maxLength={8}
            error={errors.dni}
            hint="8 dígitos, sin espacios."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field
              label="RUC"
              name="ruc"
              value={s.ruc}
              onChange={(e) =>
                s.patch({ ruc: e.target.value.replace(/\D/g, "").slice(0, 11) })
              }
              placeholder="20123456789"
              inputMode="numeric"
              maxLength={11}
              error={errors.ruc}
              hint="11 dígitos."
            />
            <Field
              label="Razón social"
              name="razonSocial"
              value={s.razonSocial}
              onChange={(e) => s.patch({ razonSocial: e.target.value })}
              placeholder="Veliroz S.A.C."
              autoComplete="organization"
              error={errors.razonSocial}
            />
            <Field
              label="Dirección fiscal"
              name="direccionFiscal"
              value={s.direccionFiscal}
              onChange={(e) => s.patch({ direccionFiscal: e.target.value })}
              placeholder="Av. Javier Prado 1234, San Isidro, Lima"
              autoComplete="street-address"
              error={errors.direccionFiscal}
              className="md:col-span-2"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* Validador puro — invocado por el orquestador antes de avanzar. */
export const validateStepDatos: StepValidator = (s) => {
  const errors: Record<string, string> = {};
  if (!s.nombres.trim()) errors.nombres = "Requerido";
  if (!s.apellidos.trim()) errors.apellidos = "Requerido";
  if (!s.email.trim()) errors.email = "Requerido";
  else if (!/^\S+@\S+\.\S+$/.test(s.email))
    errors.email = "Email no válido";
  if (!s.telefono.trim()) errors.telefono = "Requerido";
  else if (s.telefono.replace(/\D/g, "").length < 9)
    errors.telefono = "Mínimo 9 dígitos";

  if (s.tipoComprobante === "boleta") {
    if (!/^\d{8}$/.test(s.dni)) errors.dni = "DNI debe tener 8 dígitos";
  } else {
    if (!/^\d{11}$/.test(s.ruc)) errors.ruc = "RUC debe tener 11 dígitos";
    if (!s.razonSocial.trim()) errors.razonSocial = "Requerido";
    if (!s.direccionFiscal.trim()) errors.direccionFiscal = "Requerido";
  }
  return errors;
};
