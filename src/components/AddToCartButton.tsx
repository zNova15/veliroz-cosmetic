"use client";

import { useEffect, useMemo, useState } from "react";
import { useCartStore, makeSnapshot } from "@/lib/store";
import type { Variante } from "@/lib/types";
import { Toast } from "./Toast";

/* ============================================================
   Bloque interactivo de compra:
   - Selector de variante (si hay >1 activa)
   - Selector de cantidad (- N +) topado por stock
   - Botón "Agregar al carrito" full-width
   - Botón "Consultar por WhatsApp" (fallback / consulta manual)
   - Toast de confirmación (2.5 s auto-dismiss)
   Estado 100% cliente. El precio y stock se toman del snapshot del server
   (variantes vienen como prop) — la fuente de verdad sigue siendo Supabase
   al momento de checkout.
   ============================================================ */

interface Props {
  productoSlug: string;
  productoNombre: string;
  marcaNombre: string;
  imagenSwatch: string;
  variantes: Variante[];
  waNumero?: string;
}

const WA_DEFAULT = "51967456364";

export function AddToCartButton({
  productoSlug,
  productoNombre,
  marcaNombre,
  imagenSwatch,
  variantes,
  waNumero = WA_DEFAULT,
}: Props) {
  // Ya llegan ordenadas del server (order('orden')). Solo filtramos activas.
  const activasOrdenadas = useMemo(
    () => variantes.filter((v) => v.activo),
    [variantes]
  );

  const [varianteId, setVarianteId] = useState<string>(
    activasOrdenadas[0]?.id ?? ""
  );
  const variante = activasOrdenadas.find((v) => v.id === varianteId) ?? activasOrdenadas[0];

  const [cantidad, setCantidad] = useState<number>(1);
  const [toastOpen, setToastOpen] = useState(false);
  const add = useCartStore((s) => s.add);

  // Reset cantidad si cambio de variante para no exceder stock nuevo
  useEffect(() => {
    setCantidad(1);
  }, [varianteId]);

  if (!variante) {
    return (
      <div className="p-4 border border-[--border] rounded-lg bg-mist text-sm text-clay">
        No hay variantes disponibles para este producto.
      </div>
    );
  }

  const stock = Number(variante.stock ?? 0);
  const agotado = stock <= 0;
  const stockLimitado = stock > 0 && stock <= 5;
  const maxCantidad = Math.max(1, Math.min(stock, 20));

  const handleAdd = () => {
    if (agotado) return;
    add({
      sku: variante.sku,
      cantidad,
      snapshot: makeSnapshot({
        productoSlug,
        productoNombre,
        marcaNombre,
        varianteLabel: variante.variante_label,
        precio: Number(variante.precio),
        imagenSwatch,
      }),
    });
    setToastOpen(true);
    // auto-dismiss
    window.setTimeout(() => setToastOpen(false), 2500);
  };

  const waHref = `https://wa.me/${waNumero}?text=${encodeURIComponent(
    `Hola, quiero consultar por ${productoNombre} (${variante.variante_label}).`
  )}`;

  return (
    <div className="space-y-5">
      {/* Selector de variante (si hay más de una activa) */}
      {activasOrdenadas.length > 1 && (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-taupe">
            Presentación
          </p>
          <div className="flex flex-wrap gap-2">
            {activasOrdenadas.map((v) => {
              const activa = v.id === variante.id;
              const sinStock = Number(v.stock ?? 0) <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVarianteId(v.id)}
                  className={[
                    "px-4 py-2 rounded-full text-sm border transition-all",
                    activa
                      ? "bg-ink text-cream border-ink"
                      : "bg-transparent text-ink border-[--border-2] hover:border-ink",
                    sinStock && !activa ? "opacity-50 line-through" : "",
                  ].join(" ")}
                >
                  {v.variante_label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activasOrdenadas.length === 1 && (
        <p className="text-sm text-clay">
          Presentación:{" "}
          <span className="text-ink font-medium">{variante.variante_label}</span>
        </p>
      )}

      {/* Precio */}
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-3xl text-ink" suppressHydrationWarning>
          S/. {Number(variante.precio).toFixed(2)}
        </span>
        {variante.precio_antes && Number(variante.precio_antes) > Number(variante.precio) && (
          <span className="font-mono text-sm text-stone line-through">
            S/. {Number(variante.precio_antes).toFixed(2)}
          </span>
        )}
      </div>

      {/* Stock */}
      <div className="text-sm">
        {agotado ? (
          <span className="inline-flex items-center gap-2 text-[--veliroz-danger]">
            <span className="w-2 h-2 rounded-full bg-[--veliroz-danger]" />
            Agotado — consultanos por reposición
          </span>
        ) : stockLimitado ? (
          <span className="inline-flex items-center gap-2 text-[--veliroz-champagne-dark]">
            <span className="w-2 h-2 rounded-full bg-[--veliroz-champagne-dark]" />
            Últimas {stock} {stock === 1 ? "unidad" : "unidades"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-[--veliroz-success]">
            <span className="w-2 h-2 rounded-full bg-[--veliroz-success]" />
            En stock · listo para envío
          </span>
        )}
      </div>

      {/* Cantidad */}
      {!agotado && (
        <div className="flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-taupe">
            Cantidad
          </p>
          <div className="inline-flex items-center border border-[--border-2] rounded-full overflow-hidden">
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.max(1, c - 1))}
              disabled={cantidad <= 1}
              aria-label="Restar 1"
              className="w-9 h-9 flex items-center justify-center text-ink hover:bg-mist disabled:opacity-40"
            >
              −
            </button>
            <span
              className="w-10 text-center font-mono text-sm text-ink select-none"
              aria-live="polite"
            >
              {cantidad}
            </span>
            <button
              type="button"
              onClick={() => setCantidad((c) => Math.min(maxCantidad, c + 1))}
              disabled={cantidad >= maxCantidad}
              aria-label="Sumar 1"
              className="w-9 h-9 flex items-center justify-center text-ink hover:bg-mist disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* CTA principal */}
      <button
        type="button"
        onClick={handleAdd}
        disabled={agotado}
        className="btn-primary w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {agotado ? "Agotado" : "Agregar al carrito"}
        {!agotado && (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272"
            />
          </svg>
        )}
      </button>

      {/* CTA secundario WhatsApp */}
      <a href={waHref} target="_blank" rel="noopener noreferrer" className="btn-outline w-full justify-center">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        </svg>
        Consultar por WhatsApp
      </a>

      <Toast
        open={toastOpen}
        mensaje="Agregado al carrito"
        subMensaje={`${cantidad} × ${variante.variante_label}`}
      />
    </div>
  );
}
