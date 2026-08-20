"use client";

import { useActionState, useState } from "react";
import {
  consultarPedidoAction,
  type ConsultaPedidoResult,
} from "@/app/actions/consulta-pedido";
import {
  ESTADOS_PEDIDO,
  ESTADO_CANCELADO,
  indiceEstado,
  labelEstado,
} from "@/lib/pedido-estados";

/* ============================================================
   ConsultaPedido — formulario de seguimiento por código + correo.

   Realidad del backend: la RLS de `pedidos` no deja leer con la
   anon key (ver app/actions/consulta-pedido.ts). Entonces el
   camino "no pudimos mostrarlo" NO es un error del formulario:
   es el resultado esperado hoy, y por eso se resuelve con un CTA
   a WhatsApp con el código ya escrito en el mensaje.

   Regla de esta pantalla: nunca prometer un estado que no
   podemos leer. Si no lo sabemos, lo decimos.
   ============================================================ */

const WA_NUMERO = "51967456364";

export function ConsultaPedido() {
  /* Ambos campos controlados a propósito: React resetea el <form> después
     de ejecutar una action, y un input sin estado se vacía solo. Con el
     correo borrado, el segundo intento moría en la validación nativa de
     `required` sin llegar a disparar la consulta. */
  const [codigo, setCodigo] = useState("");
  const [email, setEmail] = useState("");

  const [state, formAction, pending] = useActionState<
    ConsultaPedidoResult | null,
    FormData
  >(async (_prev, formData) => {
    return consultarPedidoAction(
      String(formData.get("codigo") ?? ""),
      String(formData.get("email") ?? ""),
    );
  }, null);

  const codigoLimpio = codigo.trim().toUpperCase();
  const waMsg = codigoLimpio
    ? `Hola Veliroz Cosmetic, quiero saber el estado de mi pedido ${codigoLimpio}.`
    : "Hola Veliroz Cosmetic, quiero saber el estado de mi pedido. Mi código es: ";
  const waHref = `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(waMsg)}`;

  const errorCodigo =
    state && !state.ok && state.motivo === "codigo_invalido"
      ? "Revisa el código — es el que te llegó por correo, tipo PED-20260816-A1B2C3."
      : null;
  const errorEmail =
    state && !state.ok && state.motivo === "email_invalido"
      ? "Escribe el correo con el que hiciste la compra."
      : null;

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="bg-surface border border-[--border] rounded-lg p-6 md:p-8 space-y-5"
        aria-label="Consultar estado del pedido"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
              Código de pedido
            </span>
            <input
              type="text"
              name="codigo"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="PED-20260816123000-a1b2c3"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={errorCodigo ? true : undefined}
              className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm font-mono focus:outline-none focus:border-ink"
            />
            {errorCodigo && (
              <span className="block text-xs text-[--veliroz-danger]">
                {errorCodigo}
              </span>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
              Correo de la compra
            </span>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoComplete="email"
              aria-invalid={errorEmail ? true : undefined}
              className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
            />
            {errorEmail && (
              <span className="block text-xs text-[--veliroz-danger]">
                {errorEmail}
              </span>
            )}
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Consultando…" : "Consultar estado"}
        </button>

        <p className="text-[11px] text-clay text-pretty">
          El código está en el correo de confirmación, con el asunto de tu
          pedido. Pedimos también el correo para no mostrarle tu pedido a nadie
          más.
        </p>
      </form>

      {/* ─── Resultado ─── */}
      <div aria-live="polite">
        {state?.ok && <ResultadoPedido pedido={state.pedido} />}
        {state && !state.ok && state.motivo === "sin_acceso" && (
          <SinAcceso waHref={waHref} codigo={codigoLimpio} />
        )}
      </div>
    </div>
  );
}

/* ---------------- Pedido encontrado ---------------- */

function ResultadoPedido({
  pedido,
}: {
  pedido: Extract<ConsultaPedidoResult, { ok: true }>["pedido"];
}) {
  const cancelado = pedido.estado === ESTADO_CANCELADO;
  const actual = indiceEstado(pedido.estado);

  return (
    <div className="bg-surface border border-[--border] rounded-lg p-6 md:p-8 space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
            Pedido
          </p>
          <p className="font-mono text-ink text-sm">{pedido.codigo}</p>
        </div>
        <span
          className={
            "font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 rounded-full " +
            (cancelado
              ? "bg-[--veliroz-danger]/10 text-[--veliroz-danger]"
              : "bg-[--veliroz-success]/15 text-[--veliroz-success]")
          }
        >
          {labelEstado(pedido.estado)}
        </span>
      </div>

      {!cancelado && actual >= 0 && (
        <ol className="space-y-3">
          {ESTADOS_PEDIDO.map((e, i) => {
            const hecho = i <= actual;
            return (
              <li key={e.key} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className={
                    "mt-1.5 w-2 h-2 rounded-full shrink-0 " +
                    (hecho ? "bg-ink" : "bg-[--border-2]")
                  }
                />
                <div className="space-y-0.5">
                  <p
                    className={
                      "text-sm " +
                      (hecho ? "text-ink font-medium" : "text-stone")
                    }
                  >
                    {e.label}
                    {i === actual && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-rose-deep">
                        aquí estás
                      </span>
                    )}
                  </p>
                  {i === actual && (
                    <p className="text-xs text-clay text-pretty">{e.detalle}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-[--border] text-sm">
        {pedido.fecha && (
          <div className="space-y-1">
            <dt className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
              Fecha
            </dt>
            <dd className="text-ink">
              {new Date(pedido.fecha).toLocaleDateString("es-PE", {
                dateStyle: "medium",
              })}
            </dd>
          </div>
        )}
        {pedido.total != null && (
          <div className="space-y-1">
            <dt className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
              Total
            </dt>
            <dd className="font-mono text-ink">S/{pedido.total.toFixed(2)}</dd>
          </div>
        )}
        {pedido.tracking && (
          <div className="space-y-1 col-span-2">
            <dt className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
              Guía
            </dt>
            <dd className="font-mono text-ink text-xs">{pedido.tracking}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/* ---------------- No lo pudimos leer ---------------- */

function SinAcceso({ waHref, codigo }: { waHref: string; codigo: string }) {
  return (
    <div className="bg-champagne/15 border border-champagne/40 rounded-lg p-6 md:p-8 space-y-4">
      <div className="space-y-2">
        <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
          Todavía no desde la web
        </p>
        <h3 className="font-serif text-xl md:text-2xl text-ink italic">
          No podemos mostrarte el estado por aquí.
        </h3>
        <p className="text-sm text-clay text-pretty leading-relaxed">
          Te lo decimos derecho: la consulta de pedidos sin iniciar sesión
          todavía no está habilitada, así que desde esta página no leemos tu
          pedido{codigo ? ` ${codigo}` : ""}. También puede ser que el código o
          el correo tengan un error de tipeo.
        </p>
        <p className="text-sm text-clay text-pretty leading-relaxed">
          Lo que sí funciona siempre es WhatsApp: te contamos el estado al toque
          y en el mismo chat coordinamos lo que haga falta.
        </p>
      </div>

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary justify-center w-full sm:w-auto"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        </svg>
        Consultar por WhatsApp
      </a>

      <p className="text-[11px] text-clay">
        El mensaje se abre con tu código ya escrito — solo tienes que enviarlo.
      </p>
    </div>
  );
}
