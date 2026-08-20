/* ============================================================
   Rutinas curadas — data hardcoded.
   Cada rutina = objetivo concreto + productos (slugs) + pasos + bundle.

   Los slugs y SKUs de abajo son los REALES del catálogo (migración 013,
   12 SKUs verificados contra Supabase el 2026-08-16):

     producto slug                                | SKU                    | PVP
     ---------------------------------------------|------------------------|-----
     mixsoon-centella-cleansing-foam               | MIXSOON-FOAM-150ML     |  79
     dr-althea-345-relief-cream                    | ALTHEA-345-50ML        |  89
     beauty-of-joseon-relief-sun-spf50             | BOJ-SUN-50ML           |  79
     anua-niacinamide-10-txa-4-serum               | ANUA-NIACIN-TXA-30ML   |  95
     skin1004-madagascar-sun-serum-spf50           | S1004-SUNSERUM-50ML    |  79
     celimax-vita-a-retinal-shot                   | CELIMAX-RETINAL-15ML   |  85
     anua-pdrn-hyaluronic-capsule-serum            | ANUA-PDRN-30ML         | 115
     round-lab-birch-juice-sunscreen-spf50         | RL-BIRCH-SUN-50ML      |  89
     cosrx-advanced-snail-96-mucin-essence         | COSRX-SNAIL-100ML      |  75
     biodance-bio-collagen-real-deep-mask          | BIODANCE-MASK-4PK      |  89
     veliroz-gua-sha-roller-set                    | VLRZ-GUASHA-SET        |  35
     veliroz-set-brochas-12                        | VLRZ-BROCHAS-12        |  69

   `precioLista` es la suma de los PVP de la rutina; `precioBundle` es lo
   que se cobra llevándola completa y `ahorro` la diferencia. Si los precios
   cambian en la BD, actualizar estos tres campos acá (son copy, no cálculo:
   la fuente de verdad de cobro sigue siendo variantes_producto.precio).

   La página /rutinas/[slug] resuelve los productos por slug con
   una sola query a Supabase (in-list).
   ============================================================ */

export type Dificultad = "inicial" | "intermedia" | "avanzada";
export type Momento = "am" | "pm" | "am+pm";

export interface RutinaPaso {
  orden: number;
  productoSlug: string; // ← relaciona con productos.slug
  sku: string; // ← variante real (variantes_producto.sku)
  momento: Momento;
  nota: string; // qué hace y cuándo
}

export interface Rutina {
  slug: string;
  nombre: string;
  tag: string; // subtítulo corto
  descripcion: string; // 2-3 líneas: para quién es
  para: string[]; // "grasa", "poros"...
  tiempoMinutos: number; // por sesión
  dificultad: Dificultad;
  accent: string; // color de fondo card
  /** SKUs reales de la rutina, en orden de uso. */
  skus: string[];
  /**
   * SKU del bundle comprable que espeja esta rutina (migración 017).
   * Con esto el carrito lleva UN ítem al precio de la rutina en vez de
   * N sueltos: antes el carrito sumaba `precioLista` y el descuento se
   * ajustaba a mano por WhatsApp, así que el cliente veía un total
   * distinto al que le prometía la página.
   * Si es null, el botón vuelve al modo viejo (ítems sueltos).
   */
  bundleSku: string | null;
  /** Suma de los PVP individuales (S/). */
  precioLista: number;
  /** Precio llevando la rutina completa (S/). */
  precioBundle: number;
  /** precioLista - precioBundle (S/). */
  ahorro: number;
  pasos: RutinaPaso[];
  advertencia?: string;
}

export const RUTINAS: Rutina[] = [
  {
    slug: "primera-vez",
    nombre: "Primera vez",
    tag: "Para arrancar bien",
    descripcion:
      "Para quien nunca hizo skincare y no quiere gastar de más probando. Tres pasos y nada más: limpieza que no reseca, crema que repone la barrera y SPF diario. Es la base sobre la que después se agrega cualquier activo.",
    para: ["normal", "sin experiencia", "sensible"],
    tiempoMinutos: 5,
    dificultad: "inicial",
    accent: "#F7EFE6",
    skus: ["MIXSOON-FOAM-150ML", "ALTHEA-345-50ML", "BOJ-SUN-50ML"],
    bundleSku: "RUTINA-PRIMERA-VEZ",
    precioLista: 247,
    precioBundle: 225,
    ahorro: 22,
    pasos: [
      {
        orden: 1,
        productoSlug: "mixsoon-centella-cleansing-foam",
        sku: "MIXSOON-FOAM-150ML",
        momento: "am+pm",
        nota: "Espuma con centella — limpia sin dejar la piel tirante ni con ardor.",
      },
      {
        orden: 2,
        productoSlug: "dr-althea-345-relief-cream",
        sku: "ALTHEA-345-50ML",
        momento: "am+pm",
        nota: "Ceramidas + péptidos. Repone barrera y no deja película grasa.",
      },
      {
        orden: 3,
        productoSlug: "beauty-of-joseon-relief-sun-spf50",
        sku: "BOJ-SUN-50ML",
        momento: "am",
        nota: "SPF50+ PA++++ sin residuo blanco. El paso no negociable — reaplicar cada 3-4h con exposición.",
      },
    ],
  },
  {
    slug: "manchas-tono-desparejo",
    nombre: "Manchas y tono desparejo",
    tag: "Marcas post-acné",
    descripcion:
      "Para piel con marcas oscuras que quedaron después de los granitos, o con el tono desparejo por sol acumulado. Niacinamida al 10% + ácido tranexámico al 4% es la dupla que sí mueve la aguja en 8-12 semanas, y el SPF evita que vuelvan a aparecer.",
    para: ["manchas", "marcas-post-acne", "mixta", "grasa"],
    tiempoMinutos: 6,
    dificultad: "intermedia",
    accent: "#EEE4D8",
    skus: ["MIXSOON-FOAM-150ML", "ANUA-NIACIN-TXA-30ML", "S1004-SUNSERUM-50ML"],
    bundleSku: "RUTINA-MANCHAS-TONO",
    precioLista: 253,
    precioBundle: 229,
    ahorro: 24,
    pasos: [
      {
        orden: 1,
        productoSlug: "mixsoon-centella-cleansing-foam",
        sku: "MIXSOON-FOAM-150ML",
        momento: "am+pm",
        nota: "Limpieza suave: la piel con manchas no necesita agresión, necesita constancia.",
      },
      {
        orden: 2,
        productoSlug: "anua-niacinamide-10-txa-4-serum",
        sku: "ANUA-NIACIN-TXA-30ML",
        momento: "pm",
        nota: "Sobre piel seca, antes de hidratar. Arrancar día por medio la primera semana.",
      },
      {
        orden: 3,
        productoSlug: "skin1004-madagascar-sun-serum-spf50",
        sku: "S1004-SUNSERUM-50ML",
        momento: "am",
        nota: "Textura sérum, acabado invisible. Sin SPF, la niacinamida trabaja contra la corriente.",
      },
    ],
    advertencia:
      "No usar niacinamida en la misma capa que vitamina C pura (L-AA): separá AM y PM.",
  },
  {
    slug: "antiedad-honesta",
    nombre: "Antiedad honesta",
    tag: "Primeras líneas",
    descripcion:
      "Para los 30+ que empiezan a ver líneas finas y pérdida de firmeza y quieren resultados sin promesas de cirugía. Retinal (10 veces más potente que el retinol) de noche, PDRN + hialurónico para reparar y rellenar, y un SPF hidratante que sostiene todo lo demás.",
    para: ["antiedad", "arrugas", "firmeza"],
    tiempoMinutos: 8,
    dificultad: "avanzada",
    accent: "#F3E8E8",
    skus: ["CELIMAX-RETINAL-15ML", "ANUA-PDRN-30ML", "RL-BIRCH-SUN-50ML"],
    bundleSku: "RUTINA-ANTIEDAD-HON",
    precioLista: 289,
    precioBundle: 259,
    ahorro: 30,
    pasos: [
      {
        orden: 1,
        productoSlug: "celimax-vita-a-retinal-shot",
        sku: "CELIMAX-RETINAL-15ML",
        momento: "pm",
        nota: "Empezar 2 noches por semana y subir recién cuando la piel no reaccione.",
      },
      {
        orden: 2,
        productoSlug: "anua-pdrn-hyaluronic-capsule-serum",
        sku: "ANUA-PDRN-30ML",
        momento: "am+pm",
        nota: "PDRN + hialurónico: repara de noche y compensa la sequedad del retinal.",
      },
      {
        orden: 3,
        productoSlug: "round-lab-birch-juice-sunscreen-spf50",
        sku: "RL-BIRCH-SUN-50ML",
        momento: "am",
        nota: "SPF50+ hidratante. Con retinal en la rutina, el protector deja de ser opcional.",
      },
    ],
    advertencia:
      "Retinal: nunca en embarazo o lactancia. Si arde o descama, bajar a una vez por semana antes de abandonar.",
  },
  {
    slug: "piel-reactiva",
    nombre: "Piel reactiva",
    tag: "Rojeces y barrera dañada",
    descripcion:
      "Para cuando exageraste con activos y la piel arde, se pone roja o descama. Reset de 3-4 semanas sin ácidos ni retinoides: limpieza mínima, mucina de caracol para reparar y una crema de ceramidas que sella. Es la rutina de rescate, no la de todos los meses.",
    para: ["sensible", "rojeces", "barrera-cutanea", "reparacion"],
    tiempoMinutos: 5,
    dificultad: "inicial",
    accent: "#E9F0EC",
    skus: [
      "MIXSOON-FOAM-150ML",
      "COSRX-SNAIL-100ML",
      "ALTHEA-345-50ML",
      "S1004-SUNSERUM-50ML",
    ],
    bundleSku: "RUTINA-PIEL-REACTIVA",
    /* 322 = 79 + 75 + 89 + 79. Antes eran 243 sin protector solar: la
       advertencia mandaba a "sumá tu protector habitual", o sea que a la
       única rutina de piel con barrera comprometida —la MÁS fotosensible de
       todas— se le pedía conseguir por fuera justo el producto que más le
       importa, y que vendemos nosotros. Además la home promete
       "limpieza, activo y protección" para todas las rutinas. */
    precioLista: 322,
    precioBundle: 289,
    ahorro: 33,
    pasos: [
      {
        orden: 1,
        productoSlug: "mixsoon-centella-cleansing-foam",
        sku: "MIXSOON-FOAM-150ML",
        momento: "am+pm",
        nota: "Muy suave. Si arde, saltar la limpieza AM y enjuagar solo con agua tibia.",
      },
      {
        orden: 2,
        productoSlug: "cosrx-advanced-snail-96-mucin-essence",
        sku: "COSRX-SNAIL-100ML",
        momento: "am+pm",
        nota: "Mucina al 96%: calma y repara. Generoso mientras dure la fase reactiva.",
      },
      {
        orden: 3,
        productoSlug: "dr-althea-345-relief-cream",
        sku: "ALTHEA-345-50ML",
        momento: "am+pm",
        nota: "Ceramidas + pantenol para sellar. La capa que corta la deshidratación.",
      },
      {
        orden: 4,
        productoSlug: "skin1004-madagascar-sun-serum-spf50",
        sku: "S1004-SUNSERUM-50ML",
        momento: "am",
        nota: "Centella asiática, textura de sérum y filtro químico suave. La piel reactiva es MÁS fotosensible, no menos: sin este paso lo demás se pierde.",
      },
    ],
    advertencia:
      "Pausar todo activo (retinoides, AHA/BHA, vitamina C) durante 3-4 semanas. El protector va sí o sí en AM, aunque no salgas.",
  },
  {
    slug: "glow-evento",
    nombre: "Glow para evento",
    tag: "48 horas antes",
    descripcion:
      "Para la semana de la boda, la sesión de fotos o la fiesta. La mascarilla de bio-colágeno se usa la noche anterior y deja la piel jugosa y con el poro cerrado; el gua sha desinflama la mañana del evento. No cambia tu piel, la pone en su mejor día.",
    para: ["evento", "luminosidad", "firmeza", "hidratacion"],
    tiempoMinutos: 20,
    dificultad: "inicial",
    accent: "#F4EDDD",
    skus: ["BIODANCE-MASK-4PK", "VLRZ-GUASHA-SET"],
    bundleSku: "RUTINA-GLOW-EVENTO",
    precioLista: 124,
    precioBundle: 109,
    ahorro: 15,
    pasos: [
      {
        orden: 1,
        productoSlug: "biodance-bio-collagen-real-deep-mask",
        sku: "BIODANCE-MASK-4PK",
        momento: "pm",
        nota: "La noche anterior: 3 horas puesta (o dormir con ella). El pack trae 4 — una por ocasión.",
      },
      {
        orden: 2,
        productoSlug: "veliroz-gua-sha-roller-set",
        sku: "VLRZ-GUASHA-SET",
        momento: "am",
        nota: "La mañana del evento: 5 minutos de arrastre hacia arriba para desinflamar y marcar el contorno.",
      },
    ],
  },
];

/* Helpers */

export function getRutina(slug: string): Rutina | null {
  return RUTINAS.find((r) => r.slug === slug) ?? null;
}

export function allRutinaSlugs(): Array<{ slug: string }> {
  return RUTINAS.map((r) => ({ slug: r.slug }));
}

/** Slugs de producto únicos de una rutina, en orden de paso. */
export function slugsDeRutina(rutina: Rutina): string[] {
  return Array.from(new Set(rutina.pasos.map((p) => p.productoSlug)));
}

/* Etiqueta legible para dificultad y momento. */
export const DIFICULTAD_LABEL: Record<Dificultad, string> = {
  inicial: "Inicial",
  intermedia: "Intermedia",
  avanzada: "Avanzada",
};

export const MOMENTO_LABEL: Record<Momento, string> = {
  am: "AM",
  pm: "PM",
  "am+pm": "AM · PM",
};
