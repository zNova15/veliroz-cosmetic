import type { Marca, Variante, Producto } from "./supabase";

/* ============================================================
   Types específicos de la PDP + carrito/wishlist.
   Los shapes base (Marca, Variante, Producto, ProductoRow) están
   en src/lib/supabase.ts — se importan desde ahí.
   Este archivo agrega:
   - Campos "editorial" del producto (descripcion_larga, modo_uso, etc.)
     que la PDP necesita pero el catálogo no.
   - Reviews.
   - Snapshot de carrito.
   ============================================================ */

/* Campos extra que solo la PDP selecciona.
   Coinciden 1:1 con columnas de public.productos.  */
export interface ProductoEditorial {
  descripcion_larga: string | null;
  ingredientes_full: string | null;
  modo_uso: string | null;
  advertencias: string | null;
}

/* Reviews (public.reviews). Solo mostramos las aprobadas. */
export interface ReviewRow {
  id: string;
  producto_id: string;
  cliente_id: string | null;
  pedido_id: string | null;
  rating: number;
  titulo: string | null;
  comentario: string | null;
  tipo_piel: string | null;
  edad_rango: string | null;
  foto_url: string | null;
  aprobado: boolean;
  util_count: number;
  created_at: string;
}

/* Producto completo cargado por la PDP:
   Producto + campos editoriales + marca + variantes + reviews agregadas. */
export type ProductoPDP = Producto & ProductoEditorial & {
  marca: Marca | null;
  variantes: Variante[];
  reviews: ReviewRow[];
  reviews_avg: number | null;
  reviews_count: number;
};

/* Snapshot mínimo que guardamos en el carrito localStorage.
   No dependemos de que el producto siga existiendo — el snapshot es autónomo. */
export interface CartItemSnapshot {
  productoSlug: string;
  productoNombre: string;
  marcaNombre: string;
  varianteLabel: string;
  precio: number;
  imagenSwatch: string;
}

export interface CartItem {
  sku: string;
  cantidad: number;
  snapshot: CartItemSnapshot;
}

/* Re-exports por conveniencia — así los components sólo importan de types. */
export type { Marca, Variante, Producto } from "./supabase";
