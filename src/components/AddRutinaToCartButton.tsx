"use client";

import { useState } from "react";
import { useCartStore, makeSnapshot } from "@/lib/store";
import { swatchFor } from "@/lib/marcas";
import { Toast } from "./Toast";

/* ============================================================
   Botón "Agregar toda la rutina al carrito".
   Recibe la lista resuelta (server ya buscó cada producto por slug
   y armó la mínima info para agregar). Skipea agotados.

   MODO PRE-VENTA (item.preventa + stock 0): igual que en AddToCartButton,
   stock 0 no es "agotado" sino "todavía no comprado" → el ítem se reserva.

   `precioBundle` es el precio de la rutina completa (copy de
   src/lib/rutinas.ts). El carrito sigue cobrando precio por ítem: el
   ajuste de rutina se aplica al confirmar la reserva por WhatsApp, y así
   se avisa en pantalla — nunca mostramos un total que no vamos a cobrar
   sin decir cómo se llega a él.
   ============================================================ */

export interface RutinaCartItem {
  productoSlug: string;
  productoNombre: string;
  marcaNombre: string;
  marcaSlug: string | null;
  sku: string; // sku de la variante más barata activa
  varianteLabel: string;
  precio: number;
  stock: number;
  /** meta.preventa del producto — stock 0 se lee como reserva. */
  preventa?: boolean;
}

interface Props {
  items: RutinaCartItem[];
  rutinaNombre: string;
  /** Precio de la rutina completa (S/), si tiene ajuste propio. */
  precioBundle?: number;
  /** Ahorro respecto de comprar suelto (S/). */
  ahorro?: number;
}

export function AddRutinaToCartButton({
  items,
  rutinaNombre,
  precioBundle,
  ahorro,
}: Props) {
  const add = useCartStore((s) => s.add);
  const [toastOpen, setToastOpen] = useState(false);
  const [subMensaje, setSubMensaje] = useState("");

  const disponibles = items.filter((it) => it.stock > 0 || it.preventa === true);
  const noHayNada = disponibles.length === 0;
  const esReserva =
    disponibles.length > 0 && disponibles.every((it) => it.stock <= 0);
  const totalRutina = disponibles.reduce((acc, it) => acc + Number(it.precio), 0);

  const handleAdd = () => {
    if (noHayNada) return;
    let agregados = 0;
    for (const it of disponibles) {
      add({
        sku: it.sku,
        cantidad: 1,
        snapshot: makeSnapshot({
          productoSlug: it.productoSlug,
          productoNombre: it.productoNombre,
          marcaNombre: it.marcaNombre,
          varianteLabel: it.varianteLabel,
          precio: Number(it.precio),
          imagenSwatch: swatchFor(it.marcaSlug),
        }),
      });
      agregados += 1;
    }
    setSubMensaje(`${agregados} producto${agregados > 1 ? "s" : ""} · Rutina ${rutinaNombre}`);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2800);
  };

  const hayAjuste =
    typeof precioBundle === "number" && precioBundle < totalRutina;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
          {hayAjuste ? "Precio rutina completa" : "Total rutina completa"}
        </span>
        <span className="flex items-baseline gap-3">
          {hayAjuste && (
            <span className="font-mono text-sm text-stone line-through">
              S/. {totalRutina.toFixed(2)}
            </span>
          )}
          <span className="font-mono text-2xl text-ink">
            S/. {(hayAjuste ? precioBundle! : totalRutina).toFixed(2)}
          </span>
        </span>
      </div>

      {hayAjuste && (
        <p className="text-[11px] text-clay text-center text-pretty">
          Ahorrás S/{ahorro ?? Math.round(totalRutina - precioBundle!)} llevando
          la rutina completa. El carrito suma los precios sueltos: el ajuste de
          rutina lo aplicamos al confirmar tu reserva por WhatsApp.
        </p>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={noHayNada}
        className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {noHayNada
          ? "Sin disponibilidad en este momento"
          : `${esReserva ? "Reservar" : "Agregar"} rutina completa (${
              disponibles.length
            } productos)`}
      </button>

      {items.length > disponibles.length && !noHayNada && (
        <p className="text-[11px] text-clay text-center">
          {items.length - disponibles.length} producto(s) sin disponibilidad —
          se agregan solo los que sí.
        </p>
      )}

      <Toast
        open={toastOpen}
        mensaje={esReserva ? "Rutina reservada" : "Rutina agregada"}
        subMensaje={subMensaje}
      />
    </div>
  );
}
