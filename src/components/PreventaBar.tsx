/* ============================================================
   PreventaBar — barra fina de anuncio global (modo pre-venta).

   Contexto: todo el catálogo está en pre-venta (stock 0 en todas las
   variantes, meta.preventa = true). El cliente reserva y despachamos
   cuando entra el lote.

   Ubicación: se monta inmediatamente DESPUÉS de <CosmeticHeader />.
   El header es `fixed top-0 z-50` + spacer de 68px, así que una barra
   colocada "antes" en el DOM quedaría tapada por el header. Montada
   después, cae justo debajo del header y encima de todo el contenido,
   que es exactamente donde se lee una announcement bar — y sin pelear
   z-index ni introducir layout shift.

   Tono: champagne al 20% + texto ink. Anuncio editorial, no descuento.
   ============================================================ */

export function PreventaBar() {
  return (
    <div
      className="bg-champagne/20 border-b border-[--border]"
      role="note"
      aria-label="Aviso de pre-venta"
    >
      <p className="max-w-7xl mx-auto px-6 md:px-10 py-2 text-center text-ink text-[10px] sm:text-xs leading-relaxed tracking-[0.06em]">
        <span className="hidden sm:inline">
          · Pre-venta · Reservá hoy y recibí en 5-7 días · Envío Shalom S/12 a
          todo el Perú ·
        </span>
        <span className="sm:hidden">
          · Pre-venta · Recibí en 5-7 días · Envío S/12 ·
        </span>
      </p>
    </div>
  );
}
