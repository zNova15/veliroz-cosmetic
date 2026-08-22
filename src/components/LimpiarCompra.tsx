"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/lib/store";
import { useCheckoutStore } from "@/lib/checkout-store";

/* ============================================================
   Vacía el carrito y el formulario de checkout al llegar a la
   pantalla de compra confirmada.

   POR QUÉ EXISTE: el checkout propio (Yape, Plin, transferencia) limpia
   los dos stores desde /pago, en el callback de éxito. Pero MercadoPago
   NO vuelve por ahí: se lleva a la clienta a su pasarela y la devuelve
   directo a /pago/exito, que es un Server Component y no toca el estado
   del navegador.

   Sin esto, después de pagar la clienta vuelve al sitio con el carrito
   todavía lleno: el badge del header marca los mismos productos, y si
   entra otra vez a /pago y confirma, crea un SEGUNDO pedido por lo mismo
   que ya pagó. Eso no es un detalle de interfaz — es cobrar dos veces.

   SÓLO LIMPIA CUANDO EL PAGO SE APROBÓ. Un pago pendiente (PagoEfectivo
   con el CIP sin pagar, MercadoPago en in_process) o fallido necesita
   exactamente lo contrario: que el carrito siga ahí para poder
   reintentar sin rearmarlo.

   La guarda de ref evita el doble disparo del modo estricto de React.
   No hace falta deduplicar por pedido como en TrackPurchase: vaciar un
   carrito ya vacío no tiene consecuencia.
   ============================================================ */

interface Props {
  /** Sólo `true` limpia. */
  aprobado: boolean;
}

export function LimpiarCompra({ aprobado }: Props) {
  const limpiado = useRef(false);

  useEffect(() => {
    if (!aprobado || limpiado.current) return;
    limpiado.current = true;
    /* getState() en vez de suscribirse: este componente no renderiza
       nada y no debe re-renderizar cuando el store cambia. */
    useCartStore.getState().clear();
    useCheckoutStore.getState().reset();
  }, [aprobado]);

  return null;
}
