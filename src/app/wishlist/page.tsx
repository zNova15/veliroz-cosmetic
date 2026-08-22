import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import {
  WishlistGrid,
  type WishlistProducto,
} from "@/components/WishlistGrid";
import { swatchFor } from "@/lib/marcas";
import {
  getSupabase,
  PRODUCTO_SELECT,
  type ProductoRow,
  type Variante,
} from "@/lib/supabase";

/* ============================================================
   /wishlist — Favoritos.

   La lista vive en localStorage (useWishlistStore), así que el server NO
   sabe qué guardó cada persona: traemos el catálogo cosmetic completo
   (12 productos) y el Client Component filtra por los ids del store.
   Es el mismo costo que /productos y evita hacer la página 100% cliente
   (así conservamos metadata y el fetch en el server).

   noindex: es una página personal, no tiene nada que hacer en Google.
   ============================================================ */

export const metadata: Metadata = {
  title: "Favoritos",
  description:
    "Los productos que guardaste en Veliroz Cosmetic para decidir con calma.",
  robots: { index: false, follow: true },
};

/* El catálogo cambia poco; 5 min de cache alcanza y evita pegarle a
   Supabase en cada visita. */
export const revalidate = 300;

function metaFlag(
  meta: Record<string, unknown> | null | undefined,
  key: string,
): boolean {
  return meta?.[key] === true;
}

/** Variante de referencia = la más barata activa (igual que el catálogo). */
function variantePrincipal(vs: Variante[]): Variante | undefined {
  if (vs.length === 0) return undefined;
  return [...vs].sort((a, b) => Number(a.precio) - Number(b.precio))[0];
}

async function fetchCatalogo(): Promise<WishlistProducto[]> {
  try {
    const { data, error } = await getSupabase()
      .from("productos")
      .select(PRODUCTO_SELECT)
      .eq("linea_negocio", "cosmetic")
      .eq("activo", true);

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[wishlist] Supabase error:", error);
      return [];
    }

    const rows = (data ?? []) as unknown as ProductoRow[];
    return rows.map((r) => {
      const v = variantePrincipal((r.variantes ?? []).filter((x) => x.activo));
      const sinStock = !v || Number(v.stock) <= 0;
      /* Mismo criterio que AddToCartButton (la ficha de producto), palabra
         por palabra. Antes esta página calculaba `agotado = sinStock &&
         !preventa` e ignoraba `meta.nso_pendiente`: los productos sin
         Notificación Sanitaria confirmada quedaban comprables de un clic
         desde favoritos mientras la ficha los bloqueaba. Vender uno de esos
         obliga a devolver la plata y el producto es decomisable, así que el
         bloqueo tiene que ser el mismo en las dos pantallas.

         Pre-venta = stock 0 a propósito (se compra al confirmar el pedido);
         nso_pendiente gana siempre, porque no es falta de stock. */
      const nsoPendiente = metaFlag(r.meta, "nso_pendiente");
      const preventa = metaFlag(r.meta, "preventa") && sinStock && !nsoPendiente;
      return {
        id: r.id,
        slug: r.slug,
        nombre: r.nombre,
        marcaNombre: r.marca?.nombre ?? "Veliroz",
        swatch: swatchFor(r.marca?.slug),
        imagen: r.imagen_principal,
        sku: v?.sku ?? null,
        varianteLabel: v?.variante_label ?? null,
        precio: v ? Number(v.precio) : null,
        precioAntes: v?.precio_antes != null ? Number(v.precio_antes) : null,
        preventa,
        nsoPendiente,
        agotado: (sinStock && !preventa) || nsoPendiente,
      } satisfies WishlistProducto;
    });
  } catch (err) {
    // Env vars ausentes en build/preview → página vacía, nunca un 500.
    // eslint-disable-next-line no-console
    console.error("[wishlist] fetch falló:", err);
    return [];
  }
}

export default async function WishlistPage() {
  const productos = await fetchCatalogo();

  return (
    <main className="min-h-screen">
      {/* ────────────────── HERO ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-8">
        <nav
          aria-label="Migas de pan"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-4"
        >
          <Link href="/" className="hover:text-ink">
            Inicio
          </Link>
          <span className="mx-2">·</span>
          <span className="text-ink">Favoritos</span>
        </nav>

        <div className="max-w-2xl space-y-3">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · Tu lista ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            Favoritos.{" "}
            <span className="font-italic-serif text-rose-deep">
              Lo que dejaste para pensarlo.
            </span>
          </h1>
        </div>
      </section>

      {/* ────────────────── GRID (cliente) ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        <WishlistGrid productos={productos} />
      </section>

      <SiteFooter />
    </main>
  );
}
