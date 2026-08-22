import type { QuizPerfil, Preocupacion } from "./quiz-logic";

/* ============================================================
   Motor de diagnóstico de piel.

   Convierte el QuizPerfil (7 respuestas) en un informe estructurado:
   score global, 6 dimensiones, focos y fortalezas.

   POR QUÉ EXISTE — y por qué NO usa una foto:
   Analizar una foto de rostro para decir "acné" o "rosácea" produce
   dato de SALUD, que la Ley 29733 y el D.S. 016-2024-JUS tratan como
   dato SENSIBLE. Eso obliga a consentimiento por escrito, inscripción
   del banco de datos ante la ANPD, Oficial de Datos Personales,
   documento de seguridad y notificación de brechas en 48h — con
   multas de hasta 100 UIT (S/550,000). Procesar "sólo en memoria" NO
   saca el caso del ámbito de la ley.

   Lo que sí vende del análisis facial no es la visión por computadora:
   es el motor de recomendación y la forma de presentar el resultado.
   Eso se construye con las respuestas del usuario, sin tocar una
   categoría de dato sensible. Las respuestas de un cuestionario son
   datos personales comunes, no biométricos.

   REGLAS DE PRESENTACIÓN (tomadas de cómo lo hacen las marcas grandes):
   · Nunca más de 3 focos y siempre al menos 2 fortalezas. Un informe
     que sólo lista problemas se lee como una venta, no como un
     diagnóstico, y hace que el usuario descrea del resto.
   · Score siempre acompañado de una palabra. Un número solo no
     significa nada.
   · Máximo 6-8 dimensiones. Más se lee como ruido.
   · Ningún texto puede afirmar que esto diagnostica, trata o cura.
     Eso convertiría el sitio en un acto médico.
   ============================================================ */

export type Banda = "excelente" | "bueno" | "regular" | "atencion";

export interface Dimension {
  key: string;
  label: string;
  /** 0-100, donde 100 es el mejor estado posible. */
  score: number;
  banda: Banda;
  /** Frase corta que explica el número, en segunda persona. */
  nota: string;
}

export interface Diagnostico {
  scoreGlobal: number;
  etiqueta: string;
  /** Una línea que resume el estado general sin dramatizar. */
  resumen: string;
  dimensiones: Dimension[];
  /** Máximo 3, ordenados por prioridad. */
  focos: Dimension[];
  /** Mínimo 2. */
  fortalezas: Dimension[];
  /** El foco #1, que ordena toda la recomendación. */
  focoPrincipal: Dimension | null;
}

/* -------------------- Utilidades -------------------- */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function banda(score: number): Banda {
  if (score >= 80) return "excelente";
  if (score >= 60) return "bueno";
  if (score >= 40) return "regular";
  return "atencion";
}

export const BANDA_LABEL: Record<Banda, string> = {
  excelente: "Excelente",
  bueno: "Bien",
  regular: "Mejorable",
  atencion: "A trabajar",
};

/* -------------------- Cálculo por dimensión --------------------
   Cada dimensión parte de una base y suma/resta según las respuestas.
   Los pesos son heurísticos y editoriales — no hay medición física
   detrás, y por eso el copy nunca dice "medimos". Dice "según lo que
   nos contaste". */

function calcProteccion(p: QuizPerfil): Dimension {
  let s = 30;
  if (p.spf_diario === "siempre") s = 92;
  else if (p.spf_diario === "a-veces") s = 55;
  else s = 22;

  /* La edad no cambia cuánto te proteges, pero sí cuánto pesa no hacerlo. */
  if (p.spf_diario !== "siempre" && (p.edad === "30-39" || p.edad === "40-mas")) {
    s -= 8;
  }
  const score = clamp(s);
  return {
    key: "proteccion",
    label: "Protección solar",
    score,
    banda: banda(score),
    nota:
      p.spf_diario === "siempre"
        ? "Usas protector todos los días. Es lo que más cuida tu piel a largo plazo."
        : p.spf_diario === "a-veces"
          ? "Lo usas salteado. Es el cambio que más rinde de toda la rutina."
          : "Todavía no es un hábito. Por aquí empezaría cualquier rutina.",
  };
}

function calcBarrera(p: QuizPerfil): Dimension {
  let s = 70;
  if (p.tipo_piel === "muy-seca") s -= 28;
  else if (p.tipo_piel === "seca") s -= 16;
  else if (p.tipo_piel === "muy-grasa") s -= 10;

  if (p.preocupacion === "sensibilidad") s -= 20;
  /* Ácidos frecuentes sobre piel ya sensible castigan la barrera. */
  if (p.nivel_acidos === "regular" && p.preocupacion === "sensibilidad") s -= 12;
  else if (p.nivel_acidos === "regular") s -= 4;

  const score = clamp(s);
  return {
    key: "barrera",
    label: "Barrera e hidratación",
    score,
    banda: banda(score),
    nota:
      score >= 70
        ? "Tu piel tolera bien los activos. Buena base para trabajar."
        : score >= 45
          ? "Conviene reforzar hidratación antes de sumar cosas nuevas."
          : "Primero calmar e hidratar. Sumar activos ahora sería contraproducente.",
  };
}

function calcTextura(p: QuizPerfil): Dimension {
  let s = 68;
  if (p.preocupacion === "poros") s -= 24;
  if (p.preocupacion === "acne") s -= 18;
  if (p.tipo_piel === "muy-grasa") s -= 12;
  else if (p.tipo_piel === "grasa") s -= 6;
  if (p.nivel_acidos === "regular") s += 10;
  else if (p.nivel_acidos === "ocasional") s += 4;

  const score = clamp(s);
  return {
    key: "textura",
    label: "Textura y poros",
    score,
    banda: banda(score),
    nota:
      score >= 70
        ? "Textura pareja según lo que nos contaste."
        : "Un exfoliante suave y constante mueve mucho la aguja aquí.",
  };
}

function calcTono(p: QuizPerfil): Dimension {
  let s = 72;
  if (p.preocupacion === "manchas") s -= 30;
  if (p.spf_diario === "nunca") s -= 14;
  else if (p.spf_diario === "a-veces") s -= 6;
  if (p.edad === "40-mas") s -= 6;

  const score = clamp(s);
  return {
    key: "tono",
    label: "Tono y manchas",
    score,
    banda: banda(score),
    nota:
      score >= 70
        ? "Tono parejo. Mantenerlo depende casi todo del protector solar."
        : "Las manchas se trabajan con constancia y protección diaria, no con un producto milagroso.",
  };
}

function calcFirmeza(p: QuizPerfil): Dimension {
  let s = 82;
  if (p.edad === "30-39") s -= 12;
  else if (p.edad === "40-mas") s -= 24;
  if (p.preocupacion === "antiedad") s -= 14;
  if (p.spf_diario === "siempre") s += 6;

  const score = clamp(s);
  return {
    key: "firmeza",
    label: "Firmeza",
    score,
    banda: banda(score),
    nota:
      score >= 70
        ? "Buen punto de partida. Prevenir rinde más que corregir."
        : "Retinoides y constancia. Los resultados se miden en meses, no en semanas.",
  };
}

function calcHabito(p: QuizPerfil): Dimension {
  let s = 50;
  if (p.tiempo === "10min") s += 26;
  else if (p.tiempo === "5min") s += 14;
  if (p.spf_diario === "siempre") s += 16;
  if (p.nivel_acidos !== "nunca") s += 8;

  const score = clamp(s);
  return {
    key: "habito",
    label: "Constancia",
    score,
    banda: banda(score),
    nota:
      score >= 70
        ? "Ya tienes el hábito. Eso vale más que cualquier producto caro."
        : "Una rutina corta que cumplas gana a una larga que abandones.",
  };
}

/* -------------------- Diagnóstico -------------------- */

const ETIQUETAS: Array<{ min: number; etiqueta: string; resumen: string }> = [
  {
    min: 80,
    etiqueta: "Piel en buen estado",
    resumen: "Tu rutina ya funciona. Lo que sigue es sostenerla y afinar detalles.",
  },
  {
    min: 62,
    etiqueta: "Buena base",
    resumen: "Tienes lo importante resuelto. Con dos ajustes concretos se nota la diferencia.",
  },
  {
    min: 45,
    etiqueta: "Con margen de mejora",
    resumen: "Hay cosas por ordenar, y son las de siempre: constancia y protección.",
  },
  {
    min: 0,
    etiqueta: "Momento de empezar",
    resumen: "Vas a ver cambios rápido, justamente porque hay mucho por hacer desde cero.",
  },
];

export function diagnosticar(perfil: QuizPerfil): Diagnostico {
  const dimensiones = [
    calcProteccion(perfil),
    calcBarrera(perfil),
    calcTextura(perfil),
    calcTono(perfil),
    calcFirmeza(perfil),
    calcHabito(perfil),
  ];

  /* Global ponderado: protección y barrera pesan más porque son las que
     determinan si el resto de la rutina puede funcionar. */
  const PESOS: Record<string, number> = {
    proteccion: 1.4,
    barrera: 1.3,
    textura: 1,
    tono: 1,
    firmeza: 0.9,
    habito: 1.1,
  };
  const sumaPesos = dimensiones.reduce((a, d) => a + (PESOS[d.key] ?? 1), 0);
  const scoreGlobal = clamp(
    dimensiones.reduce((a, d) => a + d.score * (PESOS[d.key] ?? 1), 0) / sumaPesos,
  );

  const meta = ETIQUETAS.find((e) => scoreGlobal >= e.min) ?? ETIQUETAS[ETIQUETAS.length - 1];

  const porScore = [...dimensiones].sort((a, b) => a.score - b.score);

  /* Máximo 3 focos, y sólo los que realmente están flojos: si alguien
     tiene todo por encima de 70, listarle "focos" sería inventar un
     problema para vender. */
  const focos = porScore.filter((d) => d.score < 70).slice(0, 3);

  /* Al menos 2 fortalezas SIEMPRE, aunque el score general sea bajo.
     Se toman las mejores que no estén ya listadas como foco. */
  const keysFoco = new Set(focos.map((d) => d.key));
  /* Dos fortalezas normalmente; tres cuando no hay ningún foco, para que
     la pantalla no quede vacía en el caso de la piel que anda bien. */
  const cuantasFortalezas = focos.length === 0 ? 3 : 2;
  const fortalezas = [...dimensiones]
    .sort((a, b) => b.score - a.score)
    .filter((d) => !keysFoco.has(d.key))
    .slice(0, cuantasFortalezas);

  return {
    scoreGlobal,
    etiqueta: meta.etiqueta,
    resumen: meta.resumen,
    dimensiones,
    focos,
    fortalezas,
    focoPrincipal: focos[0] ?? null,
  };
}

/* -------------------- Mapeo foco → preocupación del catálogo --------------------
   Puente entre el diagnóstico y los tags que ya usan los productos, para
   que la recomendación salga del catálogo real y no de una lista aparte
   que se desincronice. */
export const FOCO_A_PREOCUPACION: Record<string, Preocupacion> = {
  proteccion: "mantener",
  barrera: "sensibilidad",
  textura: "poros",
  tono: "manchas",
  firmeza: "antiedad",
  habito: "mantener",
};

/* ============================================================
   Rutinas alternativas
   ------------------------------------------------------------
   Después del resultado, el quiz ofrecía UNA sola respuesta. Eso deja
   sin salida a quien no se siente identificado — y esa persona se va,
   no mira otra cosa.

   PRIMER INTENTO, DESCARTADO: puntuar por solapamiento entre los tags
   `para` de la rutina y el perfil. Con sólo 5 rutinas de temáticas
   deliberadamente distintas, casi nunca se solapan: en la prueba con
   piel mixta + manchas, las cuatro alternativas puntuaron 0 y la
   sección no se mostraba nunca.

   LO QUE SE USA: las 6 dimensiones que el diagnóstico YA calculó. Cada
   rutina declara qué dimensiones trabaja, y puntúa según cuánto le
   falta al usuario en esas — una rutina es relevante en la medida en
   que ataca algo que está flojo. Siempre da resultado y el motivo sale
   de datos reales, no de una etiqueta.
   ============================================================ */

/** Qué dimensiones del diagnóstico trabaja cada rutina curada. */
const RUTINA_TRABAJA: Record<string, string[]> = {
  /* Las dos rutinas nuevas están inactivas hasta que existan sus fotos y
     corra la migración 036 (ver la nota en rutinas.ts), pero van acá desde
     ya: sin esta entrada `rutinasAlternativas` las filtra por dims vacías y
     nunca aparecerían en "Otras que podrían servirte" ni después de
     activarlas. */
  "piel-grasa-granitos": ["textura", "proteccion"],
  "hidratacion-profunda": ["barrera", "proteccion"],
  "primera-vez": ["proteccion", "barrera", "habito"],
  "manchas-tono-desparejo": ["tono", "proteccion"],
  "antiedad-honesta": ["firmeza", "proteccion"],
  "piel-reactiva": ["barrera"],
  "glow-evento": ["textura", "barrera"],
};

export interface RutinaPuntuada<T> {
  rutina: T;
  puntos: number;
  /** Por qué aparece, en palabras del diagnóstico. */
  motivo: string;
}

/**
 * Ordena rutinas por cuánto atacan lo que el perfil tiene más flojo,
 * excluyendo la ya recomendada. Genérico sobre la forma de la rutina
 * para no acoplar este módulo a `rutinas.ts`: sólo necesita `slug`.
 */
export function rutinasAlternativas<T extends { slug: string }>(
  todas: T[],
  perfil: QuizPerfil,
  excluirSlug: string | null,
  diag: Diagnostico,
  max = 2,
): Array<RutinaPuntuada<T>> {
  void perfil;
  const porKey = new Map(diag.dimensiones.map((d) => [d.key, d]));

  return todas
    .filter((r) => r.slug !== excluirSlug)
    .map((r) => {
      const keys = RUTINA_TRABAJA[r.slug] ?? [];
      const dims = keys
        .map((k) => porKey.get(k))
        .filter((d): d is Dimension => Boolean(d));

      /* Cuanto más bajo el score de lo que la rutina trabaja, más puntos.
         Una rutina que ataca algo que ya está en 90 no aporta nada. */
      const puntos = dims.reduce((a, d) => a + (100 - d.score), 0);

      /* Las dimensiones que trabaja, de peor a mejor. El motivo se elige
         más abajo para no repetir el mismo texto en dos tarjetas. */
      const ordenadas = [...dims].sort((a, b) => a.score - b.score);

      return { rutina: r, puntos, dims: ordenadas };
    })
    .filter((x) => x.dims.length > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, max)
    /* Dos tarjetas con "Trabaja tu protección solar" se leen como plantilla
       aunque las dos sean ciertas. La segunda nombra su siguiente dimensión
       más floja; si no tiene otra, se queda con la suya. */
    .reduce<Array<RutinaPuntuada<T>>>((acc, x) => {
      const usados = new Set(acc.map((a) => a.motivo));
      const elegida =
        x.dims.find((d) => !usados.has(frase(d))) ?? x.dims[0];
      acc.push({ rutina: x.rutina, puntos: x.puntos, motivo: frase(elegida) });
      return acc;
    }, []);
}

function frase(d: Dimension): string {
  return d.score < 60
    ? `Trabaja tu ${d.label.toLowerCase()}`
    : `Refuerza tu ${d.label.toLowerCase()}`;
}
