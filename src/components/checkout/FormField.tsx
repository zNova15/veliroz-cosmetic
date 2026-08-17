"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

/* ============================================================
   Field genérico del checkout: label + input + mensaje de error.
   Sin librerías de forms — mantiene el bundle chico.
   ============================================================ */

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  right?: ReactNode; // slot opcional a la derecha del input (badge, botón)
}

export function Field({
  label,
  error,
  hint,
  right,
  className = "",
  id,
  ...rest
}: FieldProps) {
  const inputId = id || rest.name || label.replace(/\s+/g, "-").toLowerCase();
  const invalid = !!error;
  return (
    <label htmlFor={inputId} className={"block space-y-1.5 " + className}>
      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
        {label}
      </span>
      <span className="relative block">
        <input
          id={inputId}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined}
          className={[
            "w-full px-4 py-3 rounded-md border bg-surface text-ink placeholder:text-stone/70",
            "text-sm outline-none transition-colors",
            "focus:border-ink focus:ring-1 focus:ring-ink/20",
            invalid
              ? "border-[--veliroz-danger]"
              : "border-[--border-2] hover:border-ink/40",
          ].join(" ")}
          {...rest}
        />
        {right && (
          <span className="absolute inset-y-0 right-2 flex items-center">
            {right}
          </span>
        )}
      </span>
      {invalid ? (
        <span
          id={`${inputId}-err`}
          className="block text-[11px] text-[--veliroz-danger]"
        >
          {error}
        </span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="block text-[11px] text-clay">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

/* Radio/tab visual usado en Comprobante, Envío, Pago */
interface TabProps {
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title: string;
  sub?: string;
  badge?: string;
  disabled?: boolean;
}
export function Tab({ active, onClick, icon, title, sub, badge, disabled }: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={[
        "text-left flex items-start gap-3 p-4 rounded-lg border transition-all w-full",
        active
          ? "border-ink bg-mist/60 shadow-sm"
          : "border-[--border-2] bg-surface hover:border-ink/40",
        disabled ? "opacity-40 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {icon && (
        <span
          className={[
            "shrink-0 w-9 h-9 rounded-md flex items-center justify-center",
            active ? "bg-ink text-cream" : "bg-mist text-clay",
          ].join(" ")}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-serif text-sm text-ink">{title}</span>
          {badge && (
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] bg-champagne/30 text-clay px-1.5 py-0.5 rounded-sm">
              {badge}
            </span>
          )}
        </span>
        {sub && (
          <span className="block text-[11px] text-clay leading-snug mt-0.5">
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}
