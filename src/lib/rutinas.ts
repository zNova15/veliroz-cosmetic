/* ============================================================
   Rutinas curadas — data hardcoded.
   Cada rutina = objetivo concreto + productos (slugs) + pasos.
   Los slugs de productos MUST match los slugs reales en public.productos
   (linea_negocio='cosmetic', migración 007+008).
   La página /cosmetic/rutinas/[slug] resuelve los productos por slug con
   una sola query a Supabase (in-list).
   ============================================================ */

export type Dificultad = "inicial" | "intermedia" | "avanzada";
export type Momento = "am" | "pm" | "am+pm";

export interface RutinaPaso {
  orden: number;
  productoSlug: string; // ← relaciona con productos.slug
  momento: Momento;
  nota: string; // qué hace y cuándo
}

export interface Rutina {
  slug: string;
  nombre: string;
  tag: string; // subtítulo corto
  descripcion: string; // párrafo largo
  para: string[]; // "grasa", "poros"...
  tiempoMinutos: number; // por sesión
  dificultad: Dificultad;
  accent: string; // color de fondo card
  pasos: RutinaPaso[];
  advertencia?: string;
}

export const RUTINAS: Rutina[] = [
  {
    slug: "primera-vez",
    nombre: "Primera vez",
    tag: "Para arrancar bien",
    descripcion:
      "Tres pasos, cero drama. Si nunca hiciste rutina antes, empezá acá: limpiador que respete la barrera, hidratante con ceramidas y protector solar. Nada más. En 4 semanas tu piel ya nota la diferencia.",
    para: ["normal", "sin experiencia"],
    tiempoMinutos: 5,
    dificultad: "inicial",
    accent: "#F7EFE6",
    pasos: [
      {
        orden: 1,
        productoSlug: "cerave-espuma-limpiadora-normal-grasa",
        momento: "am+pm",
        nota: "Limpieza suave con ceramidas — no reseca ni pica.",
      },
      {
        orden: 2,
        productoSlug: "cerave-locion-hidratante-sa",
        momento: "am+pm",
        nota: "Hidratante reparador que no deja película grasa.",
      },
      {
        orden: 3,
        productoSlug: "beauty-of-joseon-relief-sun-spf-50",
        momento: "am",
        nota: "SPF 50+ diario. El paso no negociable. Reaplicar cada 3-4h con exposición.",
      },
    ],
  },
  {
    slug: "acne-poros",
    nombre: "Acné + poros",
    tag: "Grasitud controlada",
    descripcion:
      "Para piel mixta a grasa con poros dilatados y brotes recurrentes. La niacinamida al 10% regula sebo en 6-8 semanas, el limpiador SA disuelve el residuo del poro sin agredir. El SPF cierra: sin protector, todo lo demás rebota.",
    para: ["grasa", "mixta", "poros", "grasitud"],
    tiempoMinutos: 6,
    dificultad: "intermedia",
    accent: "#EEE4D8",
    pasos: [
      {
        orden: 1,
        productoSlug: "cerave-espuma-limpiadora-normal-grasa",
        momento: "am+pm",
        nota: "Limpieza inicial. Si sos muy grasa, cambiá por una versión con SA.",
      },
      {
        orden: 2,
        productoSlug: "the-ordinary-niacinamida-10-zinc-1",
        momento: "pm",
        nota: "Aplicar sobre piel seca antes de hidratar. Empezar día por medio.",
      },
      {
        orden: 3,
        productoSlug: "cerave-locion-hidratante-sa",
        momento: "am+pm",
        nota: "Hidratante que ayuda a la textura irregular.",
      },
      {
        orden: 4,
        productoSlug: "beauty-of-joseon-relief-sun-spf-50",
        momento: "am",
        nota: "SPF sin residuo blanco, ideal para piel grasa.",
      },
    ],
    advertencia:
      "No usar niacinamida en la misma capa que vitamina C pura (L-AA).",
  },
  {
    slug: "antiedad-honesta",
    nombre: "Antiedad honesta",
    tag: "Primeras líneas",
    descripcion:
      "Para los 30+ que empiezan a ver líneas finas y pérdida de firmeza. La combinación hialurónico + mucina de caracol repara y rellena; Xhekpon suma colágeno donde más se descuida (cuello y escote). Sin humo: es constancia, no cirugía.",
    para: ["antiedad", "hidratacion"],
    tiempoMinutos: 8,
    dificultad: "intermedia",
    accent: "#F3E8E8",
    pasos: [
      {
        orden: 1,
        productoSlug: "cerave-espuma-limpiadora-normal-grasa",
        momento: "am+pm",
        nota: "Limpieza suave que respeta la barrera.",
      },
      {
        orden: 2,
        productoSlug: "the-ordinary-hyaluronic-acid-2-b5",
        momento: "am+pm",
        nota: "Aplicar sobre piel húmeda para retener agua en la capa superficial.",
      },
      {
        orden: 3,
        productoSlug: "cosrx-snail-mucin-96-essence",
        momento: "am+pm",
        nota: "Essence reparadora — layer fino, dejar penetrar antes del siguiente paso.",
      },
      {
        orden: 4,
        productoSlug: "xhekpon-crema-cuello-rostro",
        momento: "pm",
        nota: "Cuello y escote. La zona que casi nadie cuida y más envejece.",
      },
      {
        orden: 5,
        productoSlug: "beauty-of-joseon-relief-sun-spf-50",
        momento: "am",
        nota: "SPF 50+ diario. Sin esto, todo lo demás es decoración.",
      },
    ],
  },
  {
    slug: "hidratacion-profunda",
    nombre: "Hidratación profunda",
    tag: "Piel deshidratada · tirante",
    descripcion:
      "Cuando la piel se siente tirante, opaca o áspera al final del día. Estrategia de doble hidratación: ácido hialurónico que retiene agua en las capas superficiales + mucina que repara y sella. Resultado: piel jugosa, no grasa.",
    para: ["seca", "hidratacion", "sensible"],
    tiempoMinutos: 7,
    dificultad: "inicial",
    accent: "#EAEEF3",
    pasos: [
      {
        orden: 1,
        productoSlug: "cerave-espuma-limpiadora-normal-grasa",
        momento: "am+pm",
        nota: "Limpieza sin quitar aceites naturales. Agua tibia, nunca caliente.",
      },
      {
        orden: 2,
        productoSlug: "the-ordinary-hyaluronic-acid-2-b5",
        momento: "am+pm",
        nota: "Sobre piel ligeramente húmeda — clave para que retenga agua hacia adentro.",
      },
      {
        orden: 3,
        productoSlug: "cosrx-snail-mucin-96-essence",
        momento: "am+pm",
        nota: "Sella y repara. Sensación glass-skin instantánea.",
      },
      {
        orden: 4,
        productoSlug: "beauty-of-joseon-relief-sun-spf-50",
        momento: "am",
        nota: "SPF 50+ con arroz + probióticos — cuida barrera al mismo tiempo.",
      },
    ],
  },
  {
    slug: "barrera-sensibilizada",
    nombre: "Barrera dañada",
    tag: "Piel reactiva · rojeces",
    descripcion:
      "Para cuando exageraste con activos (retinol, exfoliantes) y ahora tu piel arde, se pone roja o descama. Reset de 3-4 semanas: cero activos, solo reparar. Ceramidas + mucina son el kit de emergencia probado.",
    para: ["sensible", "reparacion", "sensibilidad", "barrera-cutanea"],
    tiempoMinutos: 5,
    dificultad: "inicial",
    accent: "#E9F0EC",
    pasos: [
      {
        orden: 1,
        productoSlug: "cerave-espuma-limpiadora-normal-grasa",
        momento: "am+pm",
        nota: "Muy suave. Si arde, saltar la limpieza AM y solo enjuagar con agua.",
      },
      {
        orden: 2,
        productoSlug: "cosrx-snail-mucin-96-essence",
        momento: "am+pm",
        nota: "Repara y calma. Aplicar generoso mientras dure la fase reactiva.",
      },
      {
        orden: 3,
        productoSlug: "cerave-locion-hidratante-sa",
        momento: "am+pm",
        nota: "Ceramidas reponen la barrera lipídica. Fundamental.",
      },
      {
        orden: 4,
        productoSlug: "beauty-of-joseon-relief-sun-spf-50",
        momento: "am",
        nota: "SPF suave, sin filtros irritantes. Reaplicar con exposición.",
      },
    ],
    advertencia:
      "Pausar cualquier activo (retinol, AHA/BHA, vitamina C) durante 3-4 semanas.",
  },
  {
    slug: "proteccion-diaria",
    nombre: "Protección diaria",
    tag: "El mínimo no negociable",
    descripcion:
      "Si solo vas a hacer una rutina en tu vida, que sea esta. Limpieza suave, hidratación básica y SPF. 3 pasos, 3 minutos, evita 80% del envejecimiento fotoinducido. Cero excusas.",
    para: ["normal", "proteccion-solar"],
    tiempoMinutos: 3,
    dificultad: "inicial",
    accent: "#F4EDDD",
    pasos: [
      {
        orden: 1,
        productoSlug: "cerave-espuma-limpiadora-normal-grasa",
        momento: "am+pm",
        nota: "Limpieza de una pasada. Simple.",
      },
      {
        orden: 2,
        productoSlug: "cerave-locion-hidratante-sa",
        momento: "am+pm",
        nota: "Hidratante multiuso.",
      },
      {
        orden: 3,
        productoSlug: "beauty-of-joseon-relief-sun-spf-50",
        momento: "am",
        nota: "SPF 50+. Reaplicar si hay exposición prolongada.",
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
