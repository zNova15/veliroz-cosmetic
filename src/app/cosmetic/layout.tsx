import { CosmeticHeader } from "@/components/CosmeticHeader";
import { CartDrawer } from "@/components/CartDrawer";

/* ============================================================
   /cosmetic/** layout compartido.
   - Renderiza el header sticky reutilizable (con badges de carrito/wishlist).
   - Monta el CartDrawer una sola vez para todo el segmento — el open/close
     se maneja vía useUIStore, no vía props.
   - No re-declara <html>/<body>: eso lo hace el RootLayout en /app/layout.tsx.
   Nota: la landing pública en '/' vive fuera de este segmento, así que
   monta CosmeticHeader + CartDrawer inline (ver src/app/page.tsx).
   ============================================================ */

export default function CosmeticLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CosmeticHeader />
      {children}
      <CartDrawer />
    </>
  );
}
