"use client";

import { useState } from "react";
import { useCartStore, makeSnapshot } from "@/lib/store";
import { swatchFor } from "@/lib/marcas";
import { Toast } from "./Toast";

/* ============================================================
   Botón "Agregar toda la rutina al carrito".
   Recibe la lista resuelta (server ya buscó cada producto por slug
   y armó la mínima info para agregar). Skipea agotados.
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
}

interface Props {
  items: RutinaCartItem[];
  rutinaNombre: string;
}

export function AddRutinaToCartButton({ items, rutinaNombre }: Props) {
  const add = useCartStore((s) => s.add);
  const [toastOpen, setToastOpen] = useState(false);
  const [subMensaje, setSubMensaje] = useState("");

  const disponibles = items.filter((it) => it.stock > 0);
  const noHayNada = disponibles.length === 0;
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

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
          Total rutina completa
        </span>
        <span className="font-mono text-2xl text-ink">
          S/. {totalRutina.toFixed(2)}
        </span>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={noHayNada}
        className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {noHayNada
          ? "Sin stock en este momento"
          : `Agregar rutina completa (${disponibles.length} productos)`}
      </button>

      {items.length > disponibles.length && !noHayNada && (
        <p className="text-[11px] text-clay text-center">
          {items.length - disponibles.length} producto(s) sin stock — se
          agregan solo los disponibles.
        </p>
      )}

      <Toast open={toastOpen} mensaje="Rutina agregada" subMensaje={subMensaje} />
    </div>
  );
}
