"use client";

import { useState, useTransition } from "react";
import { useCartStore } from "@/lib/store";
import { useCheckoutStore, calcularCostoEnvio } from "@/lib/checkout-store";
import {
  crearPedidoAction,
  validarCodigoAction,
} from "@/lib/actions/pedidos";

/* ============================================================
   Sidebar sticky del checkout — resumen del pedido:
   - Items (thumb color + nombre + qty + precio)
   - Input cupón + Aplicar (server action)
   - Subtotal / Descuento / Envío / Total
   - Botón "Confirmar pedido" (delegado al parent vía onSubmit).
   ============================================================ */

interface Props {
  /* El parent orquesta la validación cross-step antes de confirmar. */
  onBeforeConfirm: () => boolean;
  onSuccess: (pedidoCodigo: string, total: number) => void;
  /* Botón principal solo se muestra "listo" en el step 3. En 1 y 2 dice "Continuar". */
  stepActual: 1 | 2 | 3;
  onNext: () => void;
}

export function OrderSummary({
  onBeforeConfirm,
  onSuccess,
  stepActual,
  onNext,
}: Props) {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.total());

  const cupon = useCheckoutStore((s) => s.cupon);
  const cuponDescuento = useCheckoutStore((s) => s.cuponDescuento);
  const cuponLabel = useCheckoutStore((s) => s.cuponLabel);
  const cuponError = useCheckoutStore((s) => s.cuponError);
  const aplicarCupon = useCheckoutStore((s) => s.aplicarCupon);
  const limpiarCupon = useCheckoutStore((s) => s.limpiarCupon);
  const metodoEnvio = useCheckoutStore((s) => s.metodoEnvio);

  const subtotalPostDesc = Math.max(0, subtotal - cuponDescuento);
  const costoEnvio = calcularCostoEnvio(subtotalPostDesc, metodoEnvio);
  const total = subtotalPostDesc + costoEnvio;

  const [cuponInput, setCuponInput] = useState("");
  const [validando, setValidando] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleAplicarCupon = async () => {
    const code = cuponInput.trim();
    if (!code) {
      limpiarCupon("Escribí un código antes de aplicarlo.");
      return;
    }
    setValidando(true);
    /* El email va porque las reglas del referido dependen de quién compra
       (no podés usar tu propio código, ni en una segunda compra). */
    const res = await validarCodigoAction(
      code,
      subtotal,
      useCheckoutStore.getState().email,
    );
    setValidando(false);
    if (!res.ok) {
      const msgs: Record<string, string> = {
        /* cupones */
        inexistente: "Ese código no existe.",
        vencido: "El cupón venció.",
        agotado: "El cupón ya no tiene usos disponibles.",
        min_subtotal:
          res.min != null
            ? `Necesitás llegar a S/${Number(res.min).toFixed(2)} de subtotal.`
            : "No llegás al mínimo del cupón.",
        db_error: "Error del servidor. Intentá de nuevo.",
        /* referidos */
        referido_sin_email:
          "Completá tu email en el paso 1 y volvé a aplicar el código.",
        codigo_propio: "No podés usar tu propio código de referido.",
        ya_referido: "Ya usaste un código de referido antes.",
        no_es_primera_compra:
          "Los códigos de referido son solo para la primera compra.",
        subtotal_bajo:
          res.min != null
            ? `El código de referido aplica desde S/${Number(res.min).toFixed(2)}.`
            : "Tu pedido no llega al mínimo del código.",
        programa_inactivo: "El programa de referidos está en pausa.",
      };
      limpiarCupon(msgs[res.razon ?? ""] ?? "Código no válido.");
      return;
    }
    aplicarCupon(code, res.descuento ?? 0, res.label ?? code, res.esReferido);
    setCuponInput("");
  };

  const handleConfirm = () => {
    setConfirmError("");
    if (stepActual !== 3) {
      onNext();
      return;
    }
    /* Step 3: correr validación completa vía parent y confirmar. */
    const ok = onBeforeConfirm();
    if (!ok) return;

    startTransition(async () => {
      const s = useCheckoutStore.getState();
      const c = useCartStore.getState();
      const res = await crearPedidoAction({
        nombres: s.nombres,
        apellidos: s.apellidos,
        email: s.email,
        telefono: s.telefono,
        tipoComprobante: s.tipoComprobante,
        dni: s.dni || undefined,
        ruc: s.ruc || undefined,
        razonSocial: s.razonSocial || undefined,
        direccionFiscal: s.direccionFiscal || undefined,
        metodoEnvio: s.metodoEnvio,
        agenciaShalom: s.agenciaShalom || undefined,
        dniReceptor: s.dniReceptor || undefined,
        departamento: s.departamento || undefined,
        provincia: s.provincia || undefined,
        distrito: s.distrito || undefined,
        direccion: s.direccion || undefined,
        numero: s.numero || undefined,
        dpto: s.dpto || undefined,
        interior: s.interior || undefined,
        codigoPostal: s.codigoPostal || undefined,
        referencia: s.referencia || undefined,
        metodoPago: s.metodoPago,
        items: c.items.map((i) => ({
          sku: i.sku,
          cantidad: i.cantidad,
          imagen: i.snapshot.imagenSwatch,
        })),
        /* Un solo campo en la UI, dos caminos en el backend: el wrapper
           crear_pedido_con_referido revalida el código y recalcula el
           descuento, así que acá sólo se manda cuál es cuál. */
        cupon: s.cupon && !s.cuponEsReferido ? s.cupon : undefined,
        codigoReferido: s.cupon && s.cuponEsReferido ? s.cupon : undefined,
        subtotalCliente: c.total(),
        costoEnvio,
      });

      if (!res.ok || !res.pedidoCodigo) {
        setConfirmError(traducirError(res.error) ?? "No pudimos crear el pedido.");
        return;
      }
      onSuccess(res.pedidoCodigo, res.total ?? total);
    });
  };

  return (
    <aside
      className="rounded-lg border border-[--border-2] bg-surface p-5 md:p-6 space-y-5 lg:sticky lg:top-24 lg:self-start"
      aria-label="Resumen del pedido"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-ink">Tu pedido</h2>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
          · {items.length} {items.length === 1 ? "ítem" : "ítems"} ·
        </span>
      </div>

      <div className="divider-champagne" />

      {/* Items */}
      <ul className="space-y-3 max-h-72 overflow-y-auto pr-1 -mr-1">
        {items.map((it) => (
          <li key={it.sku} className="flex gap-3">
            <div
              className="w-14 h-14 rounded-md border border-[--border] shrink-0"
              style={{ background: it.snapshot.imagenSwatch || "#EFECE4" }}
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe">
                {it.snapshot.marcaNombre}
              </p>
              <p className="font-serif text-sm text-ink leading-snug truncate">
                {it.snapshot.productoNombre}
              </p>
              <p className="text-[11px] text-clay">
                {it.snapshot.varianteLabel} · x{it.cantidad}
              </p>
            </div>
            <p className="font-mono text-sm text-ink shrink-0 self-start">
              S/{(Number(it.snapshot.precio) * it.cantidad).toFixed(2)}
            </p>
          </li>
        ))}
      </ul>

      <div className="divider-champagne" />

      {/* Cupón */}
      <div className="space-y-2">
        <label
          htmlFor="cupon-input"
          className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe"
        >
          Cupón o código de referido
        </label>
        {cupon ? (
          <div className="flex items-center justify-between rounded-md bg-mist/60 border border-champagne/40 px-3 py-2">
            <div className="min-w-0">
              <p className="font-mono text-xs text-ink">{cupon}</p>
              {cuponLabel && (
                <p className="text-[11px] text-clay truncate">{cuponLabel}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => limpiarCupon("")}
              className="text-[11px] text-clay hover:text-ink underline underline-offset-2"
            >
              Quitar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              id="cupon-input"
              value={cuponInput}
              onChange={(e) => setCuponInput(e.target.value.toUpperCase())}
              placeholder="COSMETIC10 o VELI-XXXX"
              className="flex-1 px-3 py-2 rounded-md border border-[--border-2] bg-surface text-sm outline-none focus:border-ink"
            />
            <button
              type="button"
              onClick={handleAplicarCupon}
              disabled={validando || !cuponInput.trim()}
              className="btn-outline text-xs px-4 py-2 disabled:opacity-40"
            >
              {validando ? "…" : "Aplicar"}
            </button>
          </div>
        )}
        {cuponError && (
          <p className="text-[11px] text-[--veliroz-danger]">{cuponError}</p>
        )}
      </div>

      <div className="divider-champagne" />

      {/* Totales */}
      <dl className="space-y-2 text-sm">
        <Row label="Subtotal" value={`S/${subtotal.toFixed(2)}`} />
        {cuponDescuento > 0 && (
          <Row
            label={`Descuento ${cupon ? `(${cupon})` : ""}`}
            value={`-S/${cuponDescuento.toFixed(2)}`}
            tone="ok"
          />
        )}
        <Row
          label="Envío"
          value={costoEnvio === 0 ? "Gratis" : `S/${costoEnvio.toFixed(2)}`}
          tone={costoEnvio === 0 ? "ok" : undefined}
        />
        <div className="pt-2 border-t border-[--border]">
          <div className="flex items-baseline justify-between">
            <dt className="font-serif text-lg text-ink">Total</dt>
            <dd className="font-mono text-xl text-ink">
              S/{total.toFixed(2)}
            </dd>
          </div>
          <p className="text-[10px] text-clay mt-1">IGV incluido</p>
        </div>
      </dl>

      {confirmError && (
        <p
          role="alert"
          className="text-xs text-[--veliroz-danger] bg-[--veliroz-danger]/10 border border-[--veliroz-danger]/30 rounded-md px-3 py-2"
        >
          {confirmError}
        </p>
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending || items.length === 0}
        className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending
          ? "Procesando…"
          : stepActual === 3
            ? "Confirmar pedido"
            : "Continuar"}
      </button>
      <p className="text-[10px] text-clay text-center">
        Compra segura · datos encriptados
      </p>
    </aside>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-clay">{label}</dt>
      <dd
        className={
          tone === "ok"
            ? "font-mono text-[--veliroz-success]"
            : "font-mono text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/* Traduce códigos del RPC a mensajes UI. */
function traducirError(code?: string): string | undefined {
  if (!code) return undefined;
  if (code.startsWith("sku_no_encontrado"))
    return "Uno de los productos ya no está disponible.";
  if (code.startsWith("producto_no_encontrado"))
    return "Uno de los productos no está en catálogo.";
  const map: Record<string, string> = {
    carrito_vacio: "Tu carrito está vacío.",
    email_invalido: "El email no es válido.",
    email_requerido: "El email es obligatorio.",
    metodo_entrega_invalido: "Método de envío no reconocido.",
    metodo_pago_invalido: "Método de pago no reconocido.",
    items_requeridos: "Necesitás al menos un producto.",
    costo_envio_invalido: "El costo de envío no es válido.",
    cantidad_invalida: "Alguna cantidad es inválida.",
    mixto_choco_bienestar_incompatible:
      "No se puede mezclar esas líneas en un mismo pedido.",
    rpc_sin_respuesta: "El servidor no respondió. Intentá de nuevo.",
  };
  return map[code] ?? `Error: ${code}`;
}
