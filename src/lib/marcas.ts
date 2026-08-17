/* ============================================================
   Mapa marca-slug → swatch (mismo tinte que en page.tsx).
   Usado por PDP, Gallery y related-products cuando no hay imagen real.
   Fallback = cream-2.
   ============================================================ */

export const MARCA_SWATCH: Record<string, string> = {
  "the-ordinary": "#F7EFE6",
  cerave: "#E9F0EC",
  "beauty-of-joseon": "#F4EDDD",
  cosrx: "#EFECE4",
  xhekpon: "#F3E8E8",
  /* Catálogo K-beauty real (migración 013) */
  "round-lab": "#E8F0F2",
  skin1004: "#E9F1E7",
  anua: "#F3EDE4",
  "dr-althea": "#F1ECF3",
  biodance: "#EAF0F4",
  celimax: "#F6EDE2",
  mixsoon: "#EDF1EA",
  veliroz: "#F5E9EA",
};

export function swatchFor(marcaSlug: string | null | undefined): string {
  if (!marcaSlug) return "#F5EFE7";
  return MARCA_SWATCH[marcaSlug] ?? "#F5EFE7";
}

/* ============================================================
   Explicaciones de ingredientes clave — copy fija hardcoded.
   Cuando el producto lista uno de estos activos en ingrediente_activo[],
   la PDP muestra la card "¿Qué es X?".
   Slug ingrediente en lowercase-guiones (match contra normalizeIng()).
   ============================================================ */

export interface IngredienteInfo {
  slug: string;
  nombre: string;
  claim: string;
  detalle: string;
  cuidados?: string;
}

export const INGREDIENTES_INFO: Record<string, IngredienteInfo> = {
  niacinamida: {
    slug: "niacinamida",
    nombre: "Niacinamida",
    claim: "Regula grasitud y afina poros dilatados.",
    detalle:
      "Forma de vitamina B3. A 10% es la concentración clínica: reduce sebo, mejora la barrera y aclara marcas post-acné en 6-8 semanas de uso constante.",
    cuidados: "No mezclar en la misma capa con vitamina C pura (L-AA).",
  },
  retinol: {
    slug: "retinol",
    nombre: "Retinol",
    claim: "El gold-standard para líneas finas y textura.",
    detalle:
      "Vitamina A que acelera la renovación celular. Empezar 2 veces por semana en la noche, siempre con SPF al día siguiente. La molestia inicial (retinización) dura 2-4 semanas.",
    cuidados: "Nunca durante el embarazo o lactancia.",
  },
  "ac-hialuronico": {
    slug: "ac-hialuronico",
    nombre: "Ácido hialurónico",
    claim: "Hidratación profunda sin pesadez.",
    detalle:
      "Molécula que retiene hasta 1000 veces su peso en agua. Aplicar sobre piel ligeramente húmeda y sellar con crema para que no evapore la humedad hacia afuera.",
  },
  "hyaluronic-acid": {
    slug: "hyaluronic-acid",
    nombre: "Ácido hialurónico",
    claim: "Hidratación profunda sin pesadez.",
    detalle:
      "Molécula que retiene hasta 1000 veces su peso en agua. Aplicar sobre piel ligeramente húmeda y sellar con crema para que no evapore la humedad hacia afuera.",
  },
  "spf-50": {
    slug: "spf-50",
    nombre: "SPF 50+",
    claim: "Protección alta UVB · el paso no negociable.",
    detalle:
      "Bloquea ~98% de la radiación UVB. PA++++ indica protección UVA máxima (la que envejece). Reaplicar cada 3-4 horas si hay exposición directa.",
  },
  "mucina-caracol": {
    slug: "mucina-caracol",
    nombre: "Mucina de caracol",
    claim: "Reparación y cicatrización — el clásico coreano.",
    detalle:
      "Filtrado de secreción de Achatina fulica al 96%. Rico en alantoína, colágeno y péptidos. Ideal para pieles reactivas o post-procedimientos (láser, peeling).",
  },
  "snail-mucin": {
    slug: "snail-mucin",
    nombre: "Mucina de caracol",
    claim: "Reparación y cicatrización — el clásico coreano.",
    detalle:
      "Filtrado de secreción de Achatina fulica al 96%. Rico en alantoína, colágeno y péptidos. Ideal para pieles reactivas o post-procedimientos.",
  },
  ceramidas: {
    slug: "ceramidas",
    nombre: "Ceramidas",
    claim: "Repone la barrera cutánea que perdés con el día.",
    detalle:
      "Lípidos que ya están en tu piel — reponerlos evita deshidratación transepidérmica. Combinación 3:1:1 (ceramida NP/AP/EOP) es la fórmula CeraVe.",
  },
  colageno: {
    slug: "colageno",
    nombre: "Colágeno",
    claim: "Firmeza y elasticidad para zonas descuidadas.",
    detalle:
      "Aplicado en crema actúa como humectante y forma película que mejora textura superficial. El colágeno que produce tu piel se estimula mejor con retinol y péptidos.",
  },
  aloe: {
    slug: "aloe",
    nombre: "Aloe vera",
    claim: "Calmante suave, ideal para pieles sensibilizadas.",
    detalle:
      "Aporta agua, azúcares mucilaginosos y enzimas que refrescan y reducen enrojecimiento. Compatible con casi todo.",
  },
};

/* Normaliza un string a slug estilo BD:
   "Ácido hialurónico" → "acido-hialuronico"  →  buscamos también "ac-hialuronico" */
export function normalizeIng(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* Dado un array de ingrediente_activo[], devuelve la info encontrada (única). */
export function lookupIngredientes(activos: string[] | null | undefined): IngredienteInfo[] {
  if (!activos?.length) return [];
  const encontrados = new Map<string, IngredienteInfo>();
  for (const raw of activos) {
    const slug = normalizeIng(raw);
    // Match directo
    if (INGREDIENTES_INFO[slug]) {
      encontrados.set(INGREDIENTES_INFO[slug].slug, INGREDIENTES_INFO[slug]);
      continue;
    }
    // Match por prefijo/inclusión (ej "acido-hialuronico" → "ac-hialuronico")
    for (const key of Object.keys(INGREDIENTES_INFO)) {
      if (slug.includes(key) || key.includes(slug)) {
        encontrados.set(INGREDIENTES_INFO[key].slug, INGREDIENTES_INFO[key]);
        break;
      }
    }
  }
  return Array.from(encontrados.values());
}
