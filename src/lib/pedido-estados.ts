/* ============================================================
   Estados del pedido — fuente única de verdad para el UI.

   Las claves son los valores REALES de `pedidos.estado` en
   Supabase (los mismos que escriben los webhooks de pago y que
   traduce prettyEstado() en /pago/exito).

   Módulo sin React: lo importan tanto el Server Component
   /mis-pedidos como el Client Component ConsultaPedido.
   ============================================================ */

export interface EstadoPedido {
  /** Valor guardado en pedidos.estado. */
  key: string;
  /** Etiqueta para el cliente. */
  label: string;
  /** Qué está pasando realmente en esa etapa. */
  detalle: string;
}

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  {
    key: "nuevo",
    label: "Recibido",
    detalle:
      "Tenemos tu pedido y su código. Si pagaste con Yape, Plin o transferencia, estamos validando el voucher.",
  },
  {
    key: "pagado",
    label: "Pagado",
    detalle:
      "El pago se confirmó y tu reserva entró al lote. Te llega el comprobante electrónico por correo.",
  },
  {
    key: "preparando",
    label: "Preparando",
    detalle:
      "Empacamos en Cajamarca — burbuja y caja rígida, porque el vidrio viaja mal solo.",
  },
  {
    key: "en_reparto",
    label: "En reparto",
    detalle:
      "Ya salió: viaja a la agencia Shalom o al repartidor de Lima. Te pasamos la guía por WhatsApp.",
  },
  {
    key: "entregado",
    label: "Entregado",
    detalle:
      "Llegó. Tenés 7 días para escribirnos si algo vino mal o defectuoso.",
  },
];

/** Estado terminal fuera de la línea de tiempo. */
export const ESTADO_CANCELADO = "cancelado";

/** Etiqueta legible de cualquier estado (incluye los que no están en la línea). */
export function labelEstado(estado: string): string {
  const found = ESTADOS_PEDIDO.find((e) => e.key === estado);
  if (found) return found.label;
  if (estado === ESTADO_CANCELADO) return "Cancelado";
  return estado;
}

/** Posición en la línea de tiempo, o -1 si el estado no pertenece a ella. */
export function indiceEstado(estado: string): number {
  return ESTADOS_PEDIDO.findIndex((e) => e.key === estado);
}
