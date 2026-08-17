import { CosmeticHeader } from "@/components/CosmeticHeader";
import { CartDrawer } from "@/components/CartDrawer";
import { PreventaBar } from "@/components/PreventaBar";

/* ============================================================
   /cosmetic/** layout compartido.
   - Renderiza el header sticky reutilizable (con badges de carrito/wishlist).
   - Barra fina de pre-venta global bajo el header (PreventaBar). El header
     es `fixed top-0` + spacer, así que la barra va DESPUÉS en el DOM para
     que caiga justo debajo y no quede tapada.
   - Monta el CartDrawer una sola vez para todo el segmento — el open/close
     se maneja vía useUIStore, no vía props.
   - No re-declara <html>/<body>: eso lo hace el RootLayout en /app/layout.tsx.
   Nota: la landing pública en '/' vive fuera de este segmento, así que
   monta CosmeticHeader + PreventaBar + CartDrawer inline (ver src/app/page.tsx).
   ============================================================ */

export default function CosmeticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CosmeticHeader />
      <PreventaBar />
      {children}
      <CartDrawer />
    </>
  );
}
