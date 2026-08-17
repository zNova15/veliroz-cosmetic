import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ============================================================
   Cliente Supabase Veliroz Cosmetic
   - Un único createClient (anon key, RLS al mando) reutilizado
     tanto en Server Components como en Client Components.
   - No usamos service_role en el bundle público — jamás.
   - Fetch nativo → funciona en runtime edge/node.
   ============================================================ */

/* Env vars leídas lazy en cada llamada (NO en top-level) para que el
   build no reviente cuando las vars están ausentes — Next.js evalúa
   los Server Components en build para prerender/collect-config, y
   crashear ahí bloquea todo el deploy. En runtime real siempre están
   presentes (setearlas en Vercel → Settings → Environment Variables). */

let _sb: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY (setear en Vercel Settings → Environment Variables)"
    );
  }
  _sb = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { "x-veliroz-app": "cosmetic-web" },
    },
  });
  return _sb;
}

/* ============================================================
   Tipos derivados de la migración 007 (linea_negocio = 'cosmetic').
   Mantener alineados con:
   - public.marcas
   - public.productos  (linea_negocio = 'cosmetic')
   - public.variantes_producto
   ============================================================ */

export type Marca = {
  id: string;
  slug: string;
  nombre: string;
  logo_url: string | null;
  pais_origen: string | null;
};

export type Variante = {
  id: string;
  producto_id: string;
  sku: string;
  variante_label: string;
  precio: number;
  precio_antes: number | null;
  stock: number;
  imagen: string | null;
  activo: boolean;
};

export type Producto = {
  id: string;
  slug: string;
  nombre: string;
  descripcion_corta: string | null;
  marca_id: string | null;
  categoria: string;
  subcategoria: string | null;
  tipo_piel: string[];
  preocupacion: string[];
  ingrediente_activo: string[];
  imagen_principal: string | null;
  destacado: boolean;
  tipo: "individual" | "bundle" | "kit";
  linea_negocio: string;
  activo: boolean;
  meta: Record<string, unknown> | null;
  created_at?: string;
  /* Relaciones cargadas por el select embed. */
  marca?: Marca | null;
  variantes?: Variante[];
};

/* Row shape que devuelve Supabase con el select embed. */
export type ProductoRow = Omit<Producto, "marca" | "variantes"> & {
  marca: Marca | null;
  variantes: Variante[] | null;
};

/* Select embed reutilizable desde el catálogo, ficha, home, etc. */
export const PRODUCTO_SELECT = `
  id,
  slug,
  nombre,
  descripcion_corta,
  marca_id,
  categoria,
  subcategoria,
  tipo_piel,
  preocupacion,
  ingrediente_activo,
  imagen_principal,
  destacado,
  tipo,
  linea_negocio,
  activo,
  meta,
  created_at,
  marca:marcas!productos_marca_id_fkey (
    id, slug, nombre, logo_url, pais_origen
  ),
  variantes:variantes_producto!variantes_producto_producto_id_fkey (
    id, producto_id, sku, variante_label, precio, precio_antes, stock, imagen, activo
  )
` as const;
