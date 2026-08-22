import Link from "next/link";

/* ============================================================
   FiltrosProductos — facets del catálogo (/productos)
   ------------------------------------------------------------
   Vive fuera de la página porque en móvil y en escritorio los mismos
   filtros se presentan distinto, y tener las dos presentaciones (más la
   config de facets y los helpers de URL) dentro de page.tsx lo volvía
   imposible de leer.

   Todo el estado sigue viviendo en la URL — ?tipo_piel=grasa&marca=anua —
   así un filtro se puede compartir por WhatsApp y Google puede indexarlo.
   Por eso cada chip es un <Link>, no un botón con onClick: la página es un
   Server Component y los filtros funcionan sin una línea de JavaScript.

   Sí, los ~60 chips salen dos veces en el HTML (sidebar + panel móvil, uno
   de los dos siempre en display:none). Es a propósito: la alternativa era
   un solo <details> forzado a abrirse por CSS en escritorio, y "abrir un
   details sin el atributo open" no funciona igual en todos los motores.
   Duplicar ~6 KB de markup (1,5 KB comprimidos) es más barato que un panel
   que en algún navegador aparece cerrado con el sidebar vacío al lado.
   ============================================================ */

/* Next.js 16 App Router: searchParams llega como Promise en async pages;
   este es el tipo YA resuelto (después del await). */
export type SearchParams = Record<string, string | string[] | undefined>;

/* ────────────────── Config de filtros (facets) ────────────────── */
/* Los slugs coinciden con los valores reales en Postgres (migración 007+008). */
export const FACETS = {
  marca: {
    label: "Marca",
    options: [
      { slug: "anua", label: "Anua" },
      { slug: "beauty-of-joseon", label: "Beauty of Joseon" },
      { slug: "biodance", label: "BIODANCE" },
      { slug: "celimax", label: "celimax" },
      { slug: "cosrx", label: "COSRX" },
      { slug: "dr-althea", label: "Dr.Althea" },
      { slug: "mixsoon", label: "Mixsoon" },
      { slug: "round-lab", label: "Round Lab" },
      { slug: "skin1004", label: "SKIN1004" },
      { slug: "the-ordinary", label: "The Ordinary" },
      /* Veliroz sigue en la lista aunque sus dos productos propios salieron
         del catálogo (migración 026): las 4 RUTINAS cuelgan de esta marca,
         porque las armamos nosotros. Sacarla dejaba los bundles sin filtro. */
      { slug: "veliroz", label: "Veliroz" },
    ],
  },
  categoria: {
    label: "Categoría",
    options: [
      /* Rutinas primero: son los bundles (productos tipo='bundle') y lo que
         queremos que el visitante mire antes que los productos sueltos. */
      { slug: "rutina", label: "Rutinas completas" },
      { slug: "protector-solar", label: "Protector solar" },
      { slug: "serum", label: "Sérum" },
      { slug: "tratamiento", label: "Tratamiento" },
      { slug: "exfoliante", label: "Exfoliante" },
      { slug: "crema-hidratante", label: "Hidratante" },
      { slug: "essence", label: "Essence" },
      { slug: "limpiador", label: "Limpiador" },
      { slug: "mascarilla", label: "Mascarilla" },
    ],
  },
  tipo_piel: {
    label: "Tipo de piel",
    options: [
      { slug: "grasa", label: "Grasa" },
      { slug: "mixta", label: "Mixta" },
      { slug: "seca", label: "Seca" },
      { slug: "sensible", label: "Sensible" },
      { slug: "normal", label: "Normal" },
    ],
  },
  preocupacion: {
    label: "Preocupación",
    options: [
      { slug: "proteccion-solar", label: "Protección solar" },
      { slug: "manchas", label: "Manchas" },
      { slug: "acne", label: "Acné" },
      { slug: "marcas-post-acne", label: "Marcas post-acné" },
      { slug: "poros", label: "Poros" },
      { slug: "hidratacion", label: "Hidratación" },
      { slug: "antiedad", label: "Antiedad" },
      { slug: "arrugas", label: "Arrugas" },
      { slug: "firmeza", label: "Firmeza" },
      { slug: "luminosidad", label: "Luminosidad" },
      { slug: "sensibilidad", label: "Sensibilidad" },
      { slug: "rojeces", label: "Rojeces" },
      { slug: "barrera-cutanea", label: "Barrera cutánea" },
      { slug: "textura", label: "Textura" },
      { slug: "reparacion", label: "Reparación" },
      { slug: "limpieza", label: "Limpieza" },
    ],
  },
  ingrediente: {
    label: "Ingrediente activo",
    options: [
      { slug: "spf-50", label: "SPF 50+" },
      { slug: "niacinamida", label: "Niacinamida" },
      { slug: "ac-hialuronico", label: "Ác. hialurónico" },
      { slug: "ac-tranexamico", label: "Ác. tranexámico" },
      { slug: "retinal", label: "Retinal" },
      { slug: "pdrn", label: "PDRN" },
      { slug: "mucina-caracol", label: "Mucina de caracol" },
      { slug: "centella-asiatica", label: "Centella asiática" },
      { slug: "ceramidas", label: "Ceramidas" },
      { slug: "peptidos", label: "Péptidos" },
      { slug: "colageno", label: "Colágeno" },
      { slug: "pantenol", label: "Pantenol" },
      { slug: "madecassoside", label: "Madecassoside" },
      { slug: "extracto-arroz", label: "Extracto de arroz" },
      { slug: "savia-abedul", label: "Savia de abedul" },
      { slug: "probioticos", label: "Probióticos" },
    ],
  },
  precio: {
    label: "Precio",
    options: [
      { slug: "0-50", label: "Menos de S/50" },
      { slug: "50-100", label: "S/50 – S/100" },
      { slug: "100+", label: "Más de S/100" },
    ],
  },
} as const;

export type FacetKey = keyof typeof FACETS;

const FACET_KEYS = Object.keys(FACETS) as FacetKey[];

/* ────────────────── Utilidades de URL state ────────────────── */

export function readMulti(sp: SearchParams, key: string): string[] {
  const raw = sp[key];
  if (!raw) return [];
  const s = Array.isArray(raw) ? raw.join(",") : raw;
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Construye la URL después de togglear un valor multi-select. */
export function toggleHref(
  base: SearchParams,
  key: string,
  value: string,
): string {
  const clone: Record<string, string> = {};
  for (const [k, v] of Object.entries(base)) {
    if (v == null) continue;
    clone[k] = Array.isArray(v) ? v.join(",") : v;
  }
  const cur = readMulti(base, key);
  const has = cur.includes(value);
  const next = has ? cur.filter((v) => v !== value) : [...cur, value];
  if (next.length === 0) delete clone[key];
  else clone[key] = next.join(",");
  const qs = new URLSearchParams(clone).toString();
  return qs ? `/productos?${qs}` : "/productos";
}

/** ¿Hay al menos un filtro activo? */
export function hasAnyFilter(sp: SearchParams): boolean {
  for (const k of FACET_KEYS) {
    if (readMulti(sp, k).length > 0) return true;
  }
  return false;
}

type FiltroActivo = {
  facetKey: FacetKey;
  facetLabel: string;
  slug: string;
  label: string;
};

/** Aplana los filtros de la URL a una lista para pintar los chips quitables. */
function filtrosActivos(sp: SearchParams): FiltroActivo[] {
  const out: FiltroActivo[] = [];
  for (const key of FACET_KEYS) {
    const facet = FACETS[key];
    for (const slug of readMulti(sp, key)) {
      const opt = facet.options.find((o) => o.slug === slug);
      /* Un slug desconocido (URL editada a mano, o un facet que sacamos del
         catálogo) igual se muestra con su slug crudo: si no, la persona ve
         "3 productos" y ningún chip que explique por qué. */
      out.push({
        facetKey: key,
        facetLabel: facet.label,
        slug,
        label: opt?.label ?? slug,
      });
    }
  }
  return out;
}

/* ────────────────── Piezas compartidas ────────────────── */

function IconoX({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FacetGroup({
  facetKey,
  label,
  active,
  sp,
}: {
  facetKey: FacetKey;
  label: string;
  active: string[];
  sp: SearchParams;
}) {
  const options = FACETS[facetKey].options;
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe">
        {label}
      </h3>
      <div className="flex flex-wrap gap-2 md:gap-1.5">
        {options.map((opt) => {
          const isActive = active.includes(opt.slug);
          const href = toggleHref(sp, facetKey, opt.slug);
          return (
            <Link
              key={opt.slug}
              href={href}
              scroll={false}
              aria-pressed={isActive}
              aria-label={`Filtrar por ${label.toLowerCase()}: ${opt.label}`}
              /* min-h-[44px] sólo hasta md: en el sidebar de escritorio se
                 apunta con el mouse y un chip de 30px está bien, pero con el
                 dedo hay que darle el área táctil mínima. */
              className={
                "inline-flex items-center gap-1 px-3 py-2.5 md:py-1.5 min-h-[44px] md:min-h-0 rounded-full text-xs transition-colors border " +
                (isActive
                  ? "bg-ink text-cream border-ink"
                  : "bg-mist/60 text-clay border-transparent hover:border-[--border-2] hover:text-ink")
              }
            >
              <span>{opt.label}</span>
              {isActive && <IconoX />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function GruposDeFacets({ sp }: { sp: SearchParams }) {
  return (
    <>
      {FACET_KEYS.map((key) => (
        <FacetGroup
          key={key}
          facetKey={key}
          label={FACETS[key].label}
          active={readMulti(sp, key)}
          sp={sp}
        />
      ))}
    </>
  );
}

/* ────────────────── Escritorio: sidebar sticky ────────────────── */

/** Columna izquierda del catálogo. Oculta bajo md: ahí manda FiltrosMovil. */
export function FiltrosSidebar({ sp }: { sp: SearchParams }) {
  return (
    <aside className="hidden md:block space-y-8 md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-7rem)] md:overflow-y-auto md:pr-2">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-ink">Filtros</h2>
        {hasAnyFilter(sp) && (
          <Link
            href="/productos"
            scroll={false}
            className="text-[11px] text-rose-deep hover:text-ink underline underline-offset-4"
          >
            Limpiar todo
          </Link>
        )}
      </div>

      <GruposDeFacets sp={sp} />
    </aside>
  );
}

/* ────────────────── Móvil: panel colapsado ────────────────── */

/**
 * Barra de filtros para < md.
 *
 * /productos es donde caen los anuncios de Instagram y ese tráfico es casi
 * todo móvil: antes el sidebar se apilaba ARRIBA de la grilla y lo primero
 * que veía la persona eran ~60 chips en vez de un producto. Ahora los
 * filtros viven detrás de "Filtrar" y la grilla empieza en el primer scroll.
 *
 * Es un <details> nativo a propósito: se abre y se cierra sin JavaScript, o
 * sea que funciona antes de que hidrate la página — que en 4G peruana no es
 * un detalle. React no controla el atributo `open`, así que al tocar un chip
 * (que navega a otra URL) el panel se queda abierto y se pueden encadenar
 * varios filtros.
 */
export function FiltrosMovil({
  sp,
  total,
}: {
  sp: SearchParams;
  total: number;
}) {
  const activos = filtrosActivos(sp);

  return (
    <div className="md:hidden mb-6 space-y-3">
      <details className="group bg-surface border border-[--border] rounded-md">
        <summary
          /* aria-controls apunta al panel; el estado expandido NO se escribe
             a mano: el navegador ya lo expone en <summary> y un
             aria-expanded fijo quedaría mintiendo apenas se abre, porque
             sin JS nadie lo actualiza. */
          aria-controls="filtros-panel-movil"
          className="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none flex items-center justify-between gap-3 min-h-[44px] px-4 py-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          <span className="inline-flex items-center gap-2">
            <svg
              aria-hidden
              className="w-4 h-4 text-taupe"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M7 12h10M10 18h4"
              />
            </svg>
            <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink">
              Filtrar
            </span>
            {activos.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-ink text-cream font-mono text-[10px] leading-none">
                {activos.length}
                <span className="sr-only">
                  {activos.length === 1 ? " filtro activo" : " filtros activos"}
                </span>
              </span>
            )}
          </span>

          <span className="inline-flex items-center gap-2 text-taupe">
            {/* El conteo también acá: con el panel abierto la línea de arriba
                queda fuera de pantalla, y sin este número la persona toca
                filtros a ciegas sin saber cuántos productos le quedan. */}
            <span className="font-mono text-[11px]">
              {total} {total === 1 ? "producto" : "productos"}
            </span>
            {/* Única animación del panel: el chevron gira. Sólo transform, y
                `ease-out` es la curva del design system (@theme la redefine),
                no la de Tailwind. Nada de `duration-[--dur-fast]`: ese atajo
                ya no existe en Tailwind v4 (ver COMPAT en globals.css). */}
            <svg
              aria-hidden
              className="w-3.5 h-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          </span>
        </summary>

        {/* max-h + scroll interno: son seis grupos de chips, y sin tope el
            panel abierto empuja la grilla dos pantallas hacia abajo y deja
            el propio "Filtrar" fuera de vista para volver a cerrarlo. */}
        <div
          id="filtros-panel-movil"
          className="border-t border-[--border] px-4 py-5 space-y-7 max-h-[65vh] overflow-y-auto overscroll-contain"
        >
          <h2 className="sr-only">Filtros del catálogo</h2>
          <GruposDeFacets sp={sp} />
        </div>
      </details>

      {/* Chips activos SIEMPRE visibles, con el panel abierto o cerrado: si no,
          quien llega con ?marca=anua desde un anuncio ve tres productos y no
          entiende por qué. Cada chip se quita solo (mismo toggleHref). */}
      {activos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activos.map((f) => (
            <Link
              key={`${f.facetKey}:${f.slug}`}
              href={toggleHref(sp, f.facetKey, f.slug)}
              scroll={false}
              aria-label={`Quitar filtro ${f.facetLabel.toLowerCase()}: ${f.label}`}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-full bg-ink text-cream text-xs"
            >
              <span>{f.label}</span>
              <IconoX className="w-3 h-3 opacity-70" />
            </Link>
          ))}
          <Link
            href="/productos"
            scroll={false}
            className="inline-flex items-center min-h-[44px] px-2 text-[11px] text-rose-deep underline underline-offset-4"
          >
            Limpiar todo
          </Link>
        </div>
      )}
    </div>
  );
}
