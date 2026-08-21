"use client";

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/track";

/* ============================================================
   Dispara el evento Purchase al llegar a la pantalla post-pago.

   POR QUÉ EXISTE: `trackPurchase` vivía en lib/track.ts desde el inicio
   y no lo llamaba NINGÚN componente. Sin ese evento, Meta no puede
   optimizar campañas hacia compra ni reportar retorno — la pauta
   quedaría optimizando hacia clics, que es exactamente el error que
   hace que un presupuesto chico se evapore.

   La página de éxito es Server Component (lee el pedido de Supabase),
   así que el disparo tiene que vivir en una isla cliente como esta.

   DOS GUARDAS, y las dos importan porque acá se cuenta dinero:

   1. `dispararon` (ref) evita el doble conteo entre el render inicial y
      el efecto de React en modo estricto.

   2. `sessionStorage` evita contar dos veces el MISMO pedido si la
      persona recarga la pantalla o vuelve con el botón atrás — algo
      muy común después de pagar. Sin esto, un pedido de S/225
      recargado tres veces le reporta S/675 a Meta y la optimización
      sale mal calibrada.
   ============================================================ */

interface Props {
  pedidoCodigo: string;
  total: number;
  items: Array<{
    sku: string;
    precio: number;
    cantidad: number;
    marca?: string;
    productoNombre?: string;
  }>;
  cupon?: string;
  costoEnvio?: number;
  /** Sólo se cuenta como venta un pago aprobado. */
  aprobado: boolean;
}

export function TrackPurchase({
  pedidoCodigo,
  total,
  items,
  cupon,
  costoEnvio,
  aprobado,
}: Props) {
  const dispararon = useRef(false);

  useEffect(() => {
    if (!aprobado || dispararon.current || !pedidoCodigo || total <= 0) return;

    const clave = `veliroz-purchase-${pedidoCodigo}`;
    try {
      if (window.sessionStorage.getItem(clave)) return;
      window.sessionStorage.setItem(clave, "1");
    } catch {
      /* Storage bloqueado (incógnito estricto, cookies off): se sigue de
         largo. Perder la deduplicación es mucho menos grave que perder
         el evento — un pedido contado de más se nota; uno no contado,
         no. */
    }

    dispararon.current = true;
    trackPurchase({
      pedido_codigo: pedidoCodigo,
      total,
      items,
      cupon,
      costo_envio: costoEnvio,
    });
  }, [aprobado, pedidoCodigo, total, items, cupon, costoEnvio]);

  return null;
}
