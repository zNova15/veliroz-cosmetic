"use client";

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Toast } from "./Toast";

/* ============================================================
   Panel del programa de referidos.

   Sin login: el cliente escribe el email con el que compró y el RPC
   `obtener_mi_codigo_referido` le devuelve su código (lo crea la
   primera vez). Exige un pedido previo — ver la migración 019 sobre
   por qué no se genera código para cualquier email.

   Los parámetros del programa (%, tope, crédito) NO están hardcodeados
   aquí: vienen en la respuesta del RPC, que los lee de
   `referidos_config`. Así Gabriel los cambia sin tocar el front y la
   página nunca promete un número distinto al que se cobra.
   ============================================================ */

interface Datos {
  codigo: string;
  usos_confirmados: number;
  credito_generado: number;
  credito_disponible: number;
  descuento_pct: number;
  descuento_tope: number;
  credito_por_referido: number;
  min_subtotal: number;
}

const MOTIVOS: Record<string, string> = {
  sin_pedidos:
    "Todavía no encontramos un pedido con ese email. Tu código se activa con tu primera compra — así nos aseguramos de que recomiendes algo que ya probaste.",
  email_requerido: "Escribe tu email para buscar tu código.",
  programa_inactivo:
    "El programa de referidos está en pausa por ahora. Escríbenos por WhatsApp y te contamos cuándo vuelve.",
  cliente_no_resuelto:
    "Encontramos tu pedido pero no pudimos armar tu ficha. Escríbenos por WhatsApp y lo resolvemos a mano.",
};

export function ReferidoPanel() {
  const [email, setEmail] = useState("");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = email.trim().toLowerCase();
    if (!limpio) {
      setError(MOTIVOS.email_requerido);
      return;
    }
    setCargando(true);
    setError(null);
    setDatos(null);
    try {
      const { data, error: rpcError } = await getSupabase().rpc(
        "obtener_mi_codigo_referido",
        { p_email: limpio },
      );
      if (rpcError) throw rpcError;
      const r = data as { ok: boolean; motivo?: string } & Datos;
      if (!r?.ok) {
        setError(
          MOTIVOS[r?.motivo ?? ""] ??
            "No pudimos traer tu código. Prueba de nuevo en un momento.",
        );
        return;
      }
      setDatos(r);
    } catch {
      setError(
        "No pudimos conectarnos. Revisa tu internet y prueba de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  };

  const copiar = async (texto: string, queCosa: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setToast(queCosa);
      window.setTimeout(() => setToast(null), 2400);
    } catch {
      /* clipboard bloqueado (http, permisos): el código está a la vista
         para copiarlo a mano, así que no hace falta alarmar. */
      setToast(null);
    }
  };

  const mensajeWhatsApp = datos
    ? `Hola! Te paso mi código de Veliroz Cosmetic: ${datos.codigo}\n\nCon ese código tienes ${datos.descuento_pct}% de descuento en tu primera compra (hasta S/${datos.descuento_tope}). El catálogo está en https://veliroz.com`
    : "";

  return (
    <div className="space-y-8">
      {/* ───── Buscador ───── */}
      <form
        onSubmit={buscar}
        className="bg-surface border border-[--border] rounded-lg p-6 md:p-8 space-y-4"
      >
        <div className="space-y-2">
          <label
            htmlFor="referido-email"
            className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe block"
          >
            Tu email de compra
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="referido-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              className="flex-1 min-w-0 bg-cream border border-[--border] rounded-sm px-4 py-3
                         text-ink placeholder:text-stone
                         focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
            />
            <button
              type="submit"
              disabled={cargando}
              className="btn-primary justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cargando ? "Buscando…" : "Ver mi código"}
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm text-clay bg-cream/60 border-l-2 border-rose-deep px-4 py-3 rounded-r-sm text-pretty"
          >
            {error}
          </p>
        )}
      </form>

      {/* ───── Resultado ───── */}
      {datos && (
        <div className="space-y-6">
          <div className="bg-cream border border-champagne/40 rounded-lg p-6 md:p-8 text-center space-y-5">
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe block">
              Tu código
            </span>

            <p className="font-mono text-3xl md:text-4xl tracking-[0.14em] text-ink">
              {datos.codigo}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => copiar(datos.codigo, "Código copiado")}
                className="btn-outline justify-center cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </svg>
                Copiar código
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary justify-center"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2m0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.26 8.26 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24m4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.77-1.84-.2-.48-.41-.41-.56-.42h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.23.89 2.41 1.02 2.58.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29" />
                </svg>
                Compartir por WhatsApp
              </a>
            </div>
          </div>

          {/* ───── Métricas ───── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Metrica
              label="Amigas que compraron"
              valor={String(datos.usos_confirmados)}
            />
            <Metrica
              label="Crédito ganado"
              valor={`S/ ${Number(datos.credito_generado).toFixed(2)}`}
            />
            <Metrica
              label="Crédito disponible"
              valor={`S/ ${Number(datos.credito_disponible).toFixed(2)}`}
              destacado
            />
          </div>

          {Number(datos.credito_disponible) > 0 && (
            <p className="text-sm text-clay bg-surface border border-[--border] rounded-lg px-5 py-4 text-pretty">
              Tienes{" "}
              <strong className="text-ink font-mono">
                S/{Number(datos.credito_disponible).toFixed(2)}
              </strong>{" "}
              a favor. Escríbenos por WhatsApp al hacer tu próximo pedido y lo
              descontamos del total.
            </p>
          )}

          {datos.usos_confirmados === 0 && (
            <p className="text-sm text-clay text-pretty">
              Todavía nadie usó tu código. El crédito de S/
              {datos.credito_por_referido} se acredita cuando tu amiga paga su
              pedido — no antes, así nadie cobra por una compra que después se
              cancela.
            </p>
          )}
        </div>
      )}

      <Toast open={Boolean(toast)} mensaje={toast ?? ""} />
    </div>
  );
}

function Metrica({
  label,
  valor,
  destacado = false,
}: {
  label: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 text-center space-y-1 ${
        destacado
          ? "bg-cream border-champagne/40"
          : "bg-surface border-[--border]"
      }`}
    >
      <p className="font-mono text-2xl text-ink">{valor}</p>
      <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-taupe">
        {label}
      </p>
    </div>
  );
}
