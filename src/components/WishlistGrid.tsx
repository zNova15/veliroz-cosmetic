"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { makeSnapshot, useCartStore, useWishlistStore } from "@/lib/store";
import { trackAddToCart } from "@/lib/track";
import { Toast } from "./Toast";

/* ============================================================
   WishlistGrid — el cuerpo cliente de /wishlist.

   El server nos pasa el catálogo completo (12 productos activos) ya
   serializado; aquí filtramos por lo que hay en useWishlistStore.

   HIDRATACIÓN: el store persiste en localStorage, así que en SSR el array
   está vacío pero en el primer render del cliente ya viene rehidratado →
   si pintáramos directo, React vería dos árboles distintos. Usamos el
   patrón `mounted` (mismo que CosmeticHeader con los badges): hasta que
   corre el useEffect renderizamos SIEMPRE el skeleton, que es idéntico en
   server y cliente. Recién después mostramos favoritos / empty state.

   Ojo con la clave: el store guarda `productoId` (uuid), no slug — pero
   aceptamos ambos por si quedaron entradas viejas en el localStorage de
   alguien.
   ============================================================ */

export interface WishlistProducto {
  id: string;
  slug: string;
  nombre: string;
  marcaNombre: string;
  /** Color de marca (lib/marcas → swatchFor). */
  swatch: string;
  imagen: string | null;
  /** Variante de referencia (la más barata activa). */
  sku: string | null;
  varianteLabel: string | null;
  precio: number | null;
  precioAntes: number | null;
  preventa: boolean;
  agotado: boolean;
}

interface Props {
  productos: WishlistProducto[];
}

export function WishlistGrid({ productos }: Props) {
  const guardados = useWishlistStore((s) => s.items);
  const toggle = useWishlistStore((s) => s.toggle);
  const add = useCartStore((s) => s.add);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [toast, setToast] = useState<{ msg: string; sub: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* Respetamos el orden en que se fueron guardando (el más viejo primero).
     Indexamos por id Y por slug para tolerar entradas legacy. */
  const items = useMemo(() => {
    const porClave = new Map<string, WishlistProducto>();
    for (const p of productos) {
      porClave.set(p.id, p);
      porClave.set(p.slug, p);
    }
    const vistos = new Set<string>();
    const out: WishlistProducto[] = [];
    for (const clave of guardados) {
      const p = porClave.get(clave);
      if (!p || vistos.has(p.id)) continue;
      vistos.add(p.id);
      out.push(p);
    }
    return out;
  }, [productos, guardados]);

  const handleAdd = (p: WishlistProducto) => {
    if (!p.sku || p.precio == null || p.agotado) return;
    add({
      sku: p.sku,
      cantidad: 1,
      snapshot: makeSnapshot({
        productoSlug: p.slug,
        productoNombre: p.nombre,
        marcaNombre: p.marcaNombre,
        varianteLabel: p.varianteLabel ?? "Única",
        precio: p.precio,
        imagenSwatch: p.swatch,
      }),
    });
    trackAddToCart({
      sku: p.sku,
      precio: p.precio,
      marca: p.marcaNombre,
      productoNombre: p.nombre,
      cantidad: 1,
    });
    setToast({
      msg: p.preventa ? "Reserva agregada al carrito" : "Agregado al carrito",
      sub: p.nombre,
    });
  };

  /* ── Pre-hidratación: skeleton idéntico en server y cliente ── */
  if (!mounted) {
    return (
      <div aria-busy="true" aria-live="polite">
        <p className="text-sm text-clay mb-8">Cargando tus favoritos…</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="prod-card animate-pulse"
              aria-hidden
            >
              <div className="aspect-square bg-mist" />
              <div className="p-5 space-y-3">
                <div className="h-2 w-20 bg-mist rounded-full" />
                <div className="h-4 w-3/4 bg-mist rounded-full" />
                <div className="h-4 w-1/3 bg-mist rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return <EmptyState />;

  return (
    <div>
      <p className="text-sm text-clay mb-8 text-pretty">
        {items.length} {items.length === 1 ? "producto guardado" : "productos guardados"}.
        Se quedan en este dispositivo hasta que los saques.
      </p>

      <ul
        role="list"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {items.map((p) => (
          <li key={p.id}>
            <Card producto={p} onQuitar={() => toggle(p.id)} onAdd={() => handleAdd(p)} />
          </li>
        ))}
      </ul>

      <div className="mt-12 text-center">
        <Link href="/productos" className="btn-outline">
          Seguir explorando el catálogo
        </Link>
      </div>

      <Toast
        open={toast != null}
        mensaje={toast?.msg ?? ""}
        subMensaje={toast?.sub}
      />
    </div>
  );
}

/* ────────────────── Card ────────────────── */

function Card({
  producto: p,
  onQuitar,
  onAdd,
}: {
  producto: WishlistProducto;
  onQuitar: () => void;
  onAdd: () => void;
}) {
  const href = `/producto/${p.slug}`;

  return (
    <article className="prod-card h-full group">
      {/* ── MEDIA ── packshots 1:1 con fondo blanco opaco → object-contain
          sobre bg-white con el velo de marca al 25% (igual que el catálogo). */}
      <div className="relative aspect-square bg-white">
        <Link
          href={href}
          className="absolute inset-0 block focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          aria-label={`Ver ${p.nombre}`}
        >
          {p.imagen ? (
            <>
              <span
                aria-hidden
                className="absolute inset-0 opacity-25"
                style={{ background: p.swatch }}
              />
              <Image
                src={p.imagen}
                alt={`${p.marcaNombre} — ${p.nombre}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain p-6"
              />
            </>
          ) : (
            <span
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: p.swatch }}
            >
              <span className="font-italic-serif text-xl text-ink/70">
                {p.marcaNombre}
              </span>
            </span>
          )}
        </Link>

        {p.preventa && (
          <span className="absolute top-4 left-4 z-10 font-mono text-[9px] tracking-wider uppercase text-ink bg-champagne px-2 py-1 rounded-sm pointer-events-none">
            · Pre-venta ·
          </span>
        )}
        {p.agotado && (
          <span className="absolute top-4 left-4 z-10 font-mono text-[9px] tracking-[0.18em] uppercase text-cream bg-ink/85 px-2 py-1 rounded-sm pointer-events-none">
            Agotado
          </span>
        )}

        {/* Quitar de favoritos — fuera del Link para no anidar interactivos. */}
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar ${p.nombre} de favoritos`}
          title="Quitar de favoritos"
          className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-cream/90 backdrop-blur-sm border border-[--border] flex items-center justify-center text-rose-deep transition-all duration-200 hover:scale-110 hover:border-rose-deep"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </button>
      </div>

      {/* ── CUERPO ── */}
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div className="space-y-1">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe">
            {p.marcaNombre}
          </p>
          <h2 className="font-serif text-base text-ink leading-snug text-pretty">
            <Link href={href} className="hover:text-rose-deep transition-colors">
              {p.nombre}
            </Link>
          </h2>
          <p className="text-xs text-clay">{p.varianteLabel ?? "—"}</p>
        </div>

        <div className="pt-3 mt-auto border-t border-[--border] space-y-3">
          <div className="flex items-end justify-between">
            <div>
              {p.precioAntes != null &&
                p.precio != null &&
                p.precioAntes > p.precio && (
                  <p className="font-mono text-[10px] text-stone line-through">
                    S/. {p.precioAntes.toFixed(2)}
                  </p>
                )}
              <p className="font-mono text-lg text-ink">
                {p.precio != null ? `S/. ${p.precio.toFixed(2)}` : "—"}
              </p>
              {p.preventa && (
                <p className="text-[10px] text-clay mt-0.5">Entrega 5-7 días</p>
              )}
            </div>
            <Link
              href={href}
              className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep"
            >
              Ver →
            </Link>
          </div>

          <button
            type="button"
            onClick={onAdd}
            disabled={p.agotado || !p.sku || p.precio == null}
            className="btn-primary w-full justify-center text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {p.agotado
              ? "Agotado"
              : p.preventa
                ? "Reservar"
                : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ────────────────── Empty state ────────────────── */

function EmptyState() {
  return (
    <div className="bg-surface border border-[--border] rounded-lg px-6 py-16 md:py-20 text-center">
      <div className="max-w-md mx-auto space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-mist flex items-center justify-center">
          <svg
            className="w-7 h-7 text-taupe"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe block">
            Sin favoritos
          </span>
          <h2 className="font-serif text-2xl md:text-3xl text-ink italic">
            Todavía no guardaste nada.
          </h2>
          <p className="text-sm text-clay text-pretty">
            Toca el corazón en cualquier producto y lo vas a encontrar aquí para
            decidir con calma.
          </p>
        </div>
        <div className="pt-1">
          <Link href="/productos" className="btn-primary">
            Ver el catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
