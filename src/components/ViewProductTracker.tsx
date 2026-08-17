"use client";

import { useEffect } from "react";
import { trackViewProduct } from "@/lib/track";

/* ============================================================
   Client-side companion de la PDP (server component).
   Emite trackViewProduct al montarse — un solo hit por render
   de página (StrictMode dev-only dispara dos veces, se ignora).
   Ojo: se re-emite cuando cambia el sku (nav SPA a otro producto).
   ============================================================ */

interface Props {
  sku: string;
  marca: string;
  precio: number;
  productoNombre: string;
  categoria?: string;
}

export function ViewProductTracker(props: Props) {
  const { sku, marca, precio, productoNombre, categoria } = props;

  useEffect(() => {
    trackViewProduct({ sku, marca, precio, productoNombre, categoria });
  }, [sku, marca, precio, productoNombre, categoria]);

  return null;
}
