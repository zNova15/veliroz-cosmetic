/* ============================================================
   Veliroz Cosmetic — Quiz de tipo de piel
   Lógica pura, testeable, sin dependencias de React ni Supabase.
   El componente cliente arma la QuizPerfil respuesta a respuesta;
   `recomendarRutina(perfil)` devuelve la rutina hero (2-4 slugs reales).

   Los slugs devueltos deben existir en `public.productos` con
   `linea_negocio='cosmetic'` — verificados contra la BD 2026-08-16
   (migración 013, catálogo real de 12 SKUs):
     · mixsoon-centella-cleansing-foam         (limpiador · centella)
     · dr-althea-345-relief-cream              (crema-hidratante · ceramidas)
     · anua-niacinamide-10-txa-4-serum         (serum · niacinamida + TXA)
     · anua-pdrn-hyaluronic-capsule-serum      (serum · PDRN + hialurónico)
     · celimax-vita-a-retinal-shot             (serum · retinal)
     · cosrx-advanced-snail-96-mucin-essence   (essence · mucina de caracol)
     · beauty-of-joseon-relief-sun-spf50       (protector-solar)
     · round-lab-birch-juice-sunscreen-spf50   (protector-solar · hidratante)
     · skin1004-madagascar-sun-serum-spf50     (protector-solar · centella)
     · biodance-bio-collagen-real-deep-mask    (mascarilla · colágeno)
   ============================================================ */

/* -------------------- Tipos base -------------------- */

export type TipoPiel =
  | "muy-grasa"
  | "grasa"
  | "mixta"
  | "normal"
  | "seca"
  | "muy-seca";

export type Preocupacion =
  | "poros"
  | "acne"
  | "manchas"
  | "antiedad"
  | "sensibilidad"
  | "mantener";

export type NivelAcidos = "nunca" | "ocasional" | "regular";
export type EdadSegmento = "menos-20" | "20-29" | "30-39" | "40-mas";
export type TiempoRutina = "2min" | "5min" | "10min";
export type SPFDiario = "nunca" | "a-veces" | "siempre";
export type Budget = "low" | "med" | "high" | "premium";

/* Gate de seguridad, no una preferencia. Los retinoides (incl. el retinal de
   CELIMAX) están contraindicados en embarazo y lactancia. Antes esto vivía
   sólo como texto en la `advertencia` de la rutina antiedad — o sea que el
   motor podía recomendarle retinal a una embarazada y el aviso aparecía
   recién en la letra chica, después. */
export type EmbarazoLactancia = "no" | "si";

export interface QuizPerfil {
  tipo_piel: TipoPiel;
  preocupacion: Preocupacion;
  nivel_acidos: NivelAcidos;
  edad: EdadSegmento;
  tiempo: TiempoRutina;
  spf_diario: SPFDiario;
  budget: Budget;
  /* Opcional para no romper los perfiles ya guardados en localStorage de
     antes de esta pregunta. Ausente se trata como "no informado" y el gate
     NO se aplica — sólo bloquea ante un "sí" explícito. */
  embarazo_lactancia?: EmbarazoLactancia;
  /* Timestamp ISO del momento en que se completó (para debug / auditoría). */
  completado_at?: string;
}

/* -------------------- Preguntas (fuente de verdad) -------------------- */

export interface QuizOpcion<V extends string> {
  value: V;
  label: string;
  /* Subtítulo corto opcional que aparece bajo el label en cada card. */
  hint?: string;
}

/* Todas las preguntas están tipadas en su clave y su union de opciones,
   para que un cambio en la union rompa acá en compile-time. */
export const QUIZ_PREGUNTAS = [
  {
    key: "tipo_piel",
    hero: "¿Cómo se siente tu piel al mediodía si no te ponés nada?",
    subtitulo:
      "Sin cremas, sin maquillaje, sin retoques. Solo tu piel a mitad del día.",
    opciones: [
      { value: "muy-grasa", label: "Muy grasa", hint: "Brilla en toda la cara" },
      { value: "grasa", label: "Grasa en la zona T", hint: "Frente, nariz y mentón" },
      { value: "mixta", label: "Cómoda, ni tira ni brilla", hint: "Balanceada" },
      { value: "normal", label: "Cómoda pero apagada", hint: "Sin extremos" },
      { value: "seca", label: "Tirante o áspera", hint: "Le falta hidratación" },
      { value: "muy-seca", label: "Con descamación", hint: "Se ve escamada" },
    ] as QuizOpcion<TipoPiel>[],
  },
  {
    key: "preocupacion",
    hero: "¿Qué es lo primero que querés mejorar?",
    subtitulo: "Elegí lo que más te molesta al mirarte al espejo.",
    opciones: [
      { value: "poros", label: "Poros dilatados", hint: "Textura visible" },
      { value: "acne", label: "Acné o granitos", hint: "Brotes recurrentes" },
      { value: "manchas", label: "Manchas post-acné", hint: "Marcas oscuras" },
      { value: "antiedad", label: "Arrugas y firmeza", hint: "Prevención o corrección" },
      { value: "sensibilidad", label: "Sensibilidad o rojeces", hint: "Piel reactiva" },
      { value: "mantener", label: "Solo quiero mantenerla", hint: "Rutina de cuidado" },
    ] as QuizOpcion<Preocupacion>[],
  },
  {
    key: "nivel_acidos",
    hero: "¿Ya usaste ácidos antes? (salicílico, glicólico, láctico)",
    subtitulo:
      "Los ácidos son potentes; saber tu tolerancia nos evita darte de más.",
    opciones: [
      { value: "nunca", label: "Nunca", hint: "Es mi primera vez en skincare" },
      { value: "ocasional", label: "Alguna vez", hint: "Sé qué son, no los uso" },
      { value: "regular", label: "Los uso regular", hint: "Ya tolero activos" },
    ] as QuizOpcion<NivelAcidos>[],
  },
  {
    key: "edad",
    hero: "¿Cuántos años tenés?",
    subtitulo: "La edad nos dice qué prevenir y qué corregir.",
    opciones: [
      { value: "menos-20", label: "Menos de 20", hint: "Prevención y limpieza" },
      { value: "20-29", label: "20 a 29", hint: "Mantenimiento y activos" },
      { value: "30-39", label: "30 a 39", hint: "Prevención antiedad" },
      { value: "40-mas", label: "40 o más", hint: "Firmeza y reparación" },
    ] as QuizOpcion<EdadSegmento>[],
  },
  {
    key: "embarazo_lactancia",
    hero: "¿Estás embarazada o amamantando?",
    subtitulo:
      "Lo preguntamos por seguridad: hay activos que se evitan en esta etapa.",
    opciones: [
      { value: "no", label: "No", hint: "Sin restricciones" },
      {
        value: "si",
        label: "Sí",
        hint: "Te armamos la rutina sin retinoides",
      },
    ] as QuizOpcion<EmbarazoLactancia>[],
  },
  {
    key: "tiempo",
    hero: "¿Cuánto tiempo le podés dedicar a tu rutina?",
    subtitulo: "Sé sincera — la rutina que hacés le gana a la rutina ideal.",
    opciones: [
      { value: "2min", label: "2 minutos", hint: "Lo esencial, sin vueltas" },
      { value: "5min", label: "5 minutos", hint: "Rutina de 3-4 pasos" },
      { value: "10min", label: "10 minutos o más", hint: "Skincare completo" },
    ] as QuizOpcion<TiempoRutina>[],
  },
  {
    key: "spf_diario",
    hero: "¿Usás protector solar todos los días?",
    subtitulo: "El SPF diario es el paso no negociable — hasta bajo techo.",
    opciones: [
      { value: "nunca", label: "Nunca", hint: "Nos ponemos al día" },
      { value: "a-veces", label: "A veces, cuando salgo", hint: "Vamos por más" },
      { value: "siempre", label: "Sí, todos los días", hint: "Ya tenés el hábito" },
    ] as QuizOpcion<SPFDiario>[],
  },
  {
    key: "budget",
    hero: "¿Cuánto invertís al mes en skincare?",
    subtitulo:
      "Sin juicio. Nos ayuda a armarte una rutina realista, no una wishlist.",
    opciones: [
      { value: "low", label: "Menos de S/50", hint: "Lo esencial" },
      { value: "med", label: "S/50 – S/100", hint: "Buena rutina base" },
      { value: "high", label: "S/100 – S/200", hint: "Activos + hero" },
      { value: "premium", label: "Más de S/200", hint: "Ritual completo" },
    ] as QuizOpcion<Budget>[],
  },
] as const;

/* Cantidad total (útil para el progress bar). Constante — no la infiero de
   `as const` para que TS la resuelva a `number` y no rompa el uso aritmético. */
export const QUIZ_TOTAL_PREGUNTAS: number = QUIZ_PREGUNTAS.length;

/* -------------------- Recomendación -------------------- */

export interface Rutina {
  slug: string;
  rutina_nombre: string;
  descripcion: string;
  productos_slugs: string[];
  /* Query params que llevan a `/productos` prefiltrado. */
  filtro_url: string;
}

/* Tabla hardcoded: perfil de rutina → producto hero por paso.
   Máximo 4 slugs para no abrumar; siempre incluye SPF (paso no negociable).
   Los slugs se verificaron en Supabase 2026-08-16 (linea_negocio='cosmetic',
   migración 013 — catálogo real de 12 SKUs, todos en pre-venta). */
const RUTINAS: Record<string, Rutina> = {
  antiedad: {
    slug: "antiedad",
    rutina_nombre: "Rutina Antiedad · Firmeza + luminosidad",
    descripcion:
      "Retinal de noche para líneas finas, PDRN + hialurónico para reparar y rellenar, y un SPF hidratante que evita perder lo ganado.",
    productos_slugs: [
      "celimax-vita-a-retinal-shot",
      "anua-pdrn-hyaluronic-capsule-serum",
      "round-lab-birch-juice-sunscreen-spf50",
    ],
    filtro_url: "/productos?preocupacion=antiedad",
  },
  manchas: {
    slug: "manchas",
    rutina_nombre: "Rutina Antimanchas · Tono uniforme",
    descripcion:
      "Niacinamida 10% + ácido tranexámico 4% para aclarar marcas, mucina de caracol para reparar y SPF 50 para bloquear que aparezcan más.",
    productos_slugs: [
      "anua-niacinamide-10-txa-4-serum",
      "cosrx-advanced-snail-96-mucin-essence",
      "skin1004-madagascar-sun-serum-spf50",
    ],
    filtro_url: "/productos?preocupacion=manchas",
  },
  "acne-graso": {
    slug: "acne-graso",
    rutina_nombre: "Rutina Piel Grasa · Poros + grasitud",
    descripcion:
      "Limpieza con centella que no agrede la barrera, niacinamida para regular el sebo y afinar poros, y SPF ligero que no engrasa.",
    productos_slugs: [
      "mixsoon-centella-cleansing-foam",
      "anua-niacinamide-10-txa-4-serum",
      "beauty-of-joseon-relief-sun-spf50",
    ],
    filtro_url: "/productos?tipo_piel=grasa&preocupacion=poros",
  },
  hidratacion: {
    slug: "hidratacion",
    rutina_nombre: "Rutina Hidratación · Piel calmada",
    descripcion:
      "Limpieza suave que no reseca, PDRN + hialurónico para reponer agua y firmeza, y un SPF de savia de abedul que hidrata mientras protege.",
    productos_slugs: [
      "mixsoon-centella-cleansing-foam",
      "anua-pdrn-hyaluronic-capsule-serum",
      "round-lab-birch-juice-sunscreen-spf50",
    ],
    filtro_url: "/productos?tipo_piel=seca&preocupacion=hidratacion",
  },
  "primera-vez": {
    slug: "primera-vez",
    rutina_nombre: "Rutina Primer Paso · 3 productos esenciales",
    descripcion:
      "Sin ácidos ni activos fuertes. Limpieza suave, crema de ceramidas y SPF alto — la base sobre la que se construye todo lo demás.",
    productos_slugs: [
      "mixsoon-centella-cleansing-foam",
      "dr-althea-345-relief-cream",
      "beauty-of-joseon-relief-sun-spf50",
    ],
    filtro_url: "/productos",
  },
  sensibilidad: {
    slug: "sensibilidad",
    rutina_nombre: "Rutina Piel Sensible · Reparación suave",
    descripcion:
      "Sin ácidos ni fragancias agresivas. Limpieza con centella, crema de ceramidas + péptidos para reparar la barrera y SPF calmante con madecassoside.",
    productos_slugs: [
      "mixsoon-centella-cleansing-foam",
      "dr-althea-345-relief-cream",
      "skin1004-madagascar-sun-serum-spf50",
    ],
    filtro_url: "/productos?tipo_piel=sensible",
  },
};

/* Decisión priorizada — la primera regla que matchea gana.
   Orden intencional: antiedad prioriza sobre budget bajo, sensibilidad
   sobre primer-paso, etc. */
export function recomendarRutina(perfil: QuizPerfil): Rutina {
  /* 0) GATE DE SEGURIDAD — va primero que todo, incluso antes de sensibilidad.
     Los retinoides (el retinal de CELIMAX incluido) están contraindicados en
     embarazo y lactancia, así que la rutina antiedad no puede recomendarse
     acá por ninguna vía: ni pedida explícitamente, ni por la regla de 40+,
     ni por la de 30-39 preventiva.
     Se deriva a `manchas`, que trabaja el mismo objetivo cosmético con
     niacinamida + SPF, ambos seguros en el embarazo.
     Sólo bloquea ante un "sí" explícito: un perfil viejo sin el campo no
     queda atrapado acá. */
  if (perfil.embarazo_lactancia === "si") {
    if (perfil.preocupacion === "sensibilidad") return RUTINAS["sensibilidad"];
    if (perfil.tipo_piel === "seca" || perfil.tipo_piel === "muy-seca") {
      return RUTINAS["hidratacion"];
    }
    if (
      perfil.preocupacion === "acne" ||
      perfil.preocupacion === "poros" ||
      perfil.tipo_piel === "grasa" ||
      perfil.tipo_piel === "muy-grasa"
    ) {
      return RUTINAS["acne-graso"];
    }
    return RUTINAS["manchas"];
  }

  // 1) Sensibilidad SIEMPRE gana (piel reactiva → no dar ácidos aunque los pida).
  if (perfil.preocupacion === "sensibilidad") return RUTINAS["sensibilidad"];

  // 2) Manchas post-acné: niacinamida + mucina + SPF (el clásico Reddit-approved).
  if (perfil.preocupacion === "manchas") return RUTINAS["manchas"];

  // 3) Antiedad explícita → rutina completa (aunque el nivel sea principiante).
  if (perfil.preocupacion === "antiedad") return RUTINAS["antiedad"];

  // 4) 40+ automáticamente entra a antiedad (aunque no la pida).
  if (perfil.edad === "40-mas") return RUTINAS["antiedad"];

  // 5) 30-39 + preocupación "mantener" → antiedad preventiva.
  if (perfil.edad === "30-39" && perfil.preocupacion === "mantener") {
    return RUTINAS["antiedad"];
  }

  // 6) Acné o poros con piel grasa/mixta → rutina de control.
  if (
    (perfil.preocupacion === "acne" || perfil.preocupacion === "poros") &&
    (perfil.tipo_piel === "grasa" ||
      perfil.tipo_piel === "muy-grasa" ||
      perfil.tipo_piel === "mixta")
  ) {
    return RUTINAS["acne-graso"];
  }

  // 7) Primera vez (nunca usó ácidos + tiempo mínimo) → 3 pasos suaves.
  if (perfil.nivel_acidos === "nunca" && perfil.tiempo === "2min") {
    return RUTINAS["primera-vez"];
  }

  // 8) Piel seca/muy-seca → hidratación.
  if (perfil.tipo_piel === "seca" || perfil.tipo_piel === "muy-seca") {
    return RUTINAS["hidratacion"];
  }

  // 9) Cualquier piel grasa que llegó hasta acá → control grasitud.
  if (perfil.tipo_piel === "grasa" || perfil.tipo_piel === "muy-grasa") {
    return RUTINAS["acne-graso"];
  }

  // 10) Default: primer paso (más seguro para quien no encaja arriba).
  return RUTINAS["primera-vez"];
}

/* Etiqueta humana para mostrar el perfil resultante en la pantalla final. */
export function labelPerfil(perfil: QuizPerfil): {
  tipo_piel: string;
  preocupacion: string;
  nivel: string;
  budget: string;
} {
  const t: Record<TipoPiel, string> = {
    "muy-grasa": "Muy grasa",
    grasa: "Grasa",
    mixta: "Mixta",
    normal: "Normal",
    seca: "Seca",
    "muy-seca": "Muy seca",
  };
  const p: Record<Preocupacion, string> = {
    poros: "Poros",
    acne: "Acné",
    manchas: "Manchas post-acné",
    antiedad: "Antiedad",
    sensibilidad: "Sensibilidad",
    mantener: "Mantenimiento",
  };
  const n: Record<NivelAcidos, string> = {
    nunca: "Principiante",
    ocasional: "Intermedio",
    regular: "Avanzado",
  };
  const b: Record<Budget, string> = {
    low: "Menos de S/50",
    med: "S/50 – S/100",
    high: "S/100 – S/200",
    premium: "Más de S/200",
  };
  return {
    tipo_piel: t[perfil.tipo_piel],
    preocupacion: p[perfil.preocupacion],
    nivel: n[perfil.nivel_acidos],
    budget: b[perfil.budget],
  };
}

/* -------------------- Persistencia -------------------- */

export const QUIZ_STORAGE_KEY = "veliroz-cosmetic-quiz-perfil";

export function loadPerfil(): QuizPerfil | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(QUIZ_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuizPerfil>;
    // Validación mínima: todas las claves obligatorias deben estar.
    const keys: (keyof QuizPerfil)[] = [
      "tipo_piel",
      "preocupacion",
      "nivel_acidos",
      "edad",
      "tiempo",
      "spf_diario",
      "budget",
    ];
    if (keys.every((k) => typeof parsed[k] === "string")) {
      return parsed as QuizPerfil;
    }
    return null;
  } catch {
    return null;
  }
}

export function savePerfil(perfil: QuizPerfil): void {
  if (typeof window === "undefined") return;
  try {
    const withTs: QuizPerfil = {
      ...perfil,
      completado_at: perfil.completado_at ?? new Date().toISOString(),
    };
    window.localStorage.setItem(QUIZ_STORAGE_KEY, JSON.stringify(withTs));
  } catch {
    /* localStorage lleno o bloqueado — no bloqueamos el flujo por eso. */
  }
}

export function clearPerfil(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(QUIZ_STORAGE_KEY);
  } catch {
    /* ídem */
  }
}
