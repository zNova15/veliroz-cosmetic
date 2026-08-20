"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  QUIZ_PREGUNTAS,
  QUIZ_TOTAL_PREGUNTAS,
  recomendarRutina,
  savePerfil,
  loadPerfil,
  clearPerfil,
  labelPerfil,
  type QuizPerfil,
} from "@/lib/quiz-logic";
import {
  getSupabase,
  PRODUCTO_SELECT,
  type ProductoRow,
} from "@/lib/supabase";
import { swatchFor } from "@/lib/marcas";
import { useCartStore, makeSnapshot } from "@/lib/store";
import { Toast } from "@/components/Toast";
import { DiagnosticoPanel } from "@/components/DiagnosticoPanel";
import { diagnosticar } from "@/lib/diagnostico";
import { getRutina } from "@/lib/rutinas";

/* ============================================================
   Veliroz Cosmetic — /quiz
   Quiz interactivo (QUIZ_PREGUNTAS define cuántas) para armar una rutina.

   Flujo:
   1) intro  → CTA "Empezar" (o "Ver mi rutina" si ya hay perfil guardado)
   2) preguntas → una a una con progress bar, motion slide
   3) result → perfil + rutina recomendada (2-4 productos hero) +
               CTAs: ver catálogo prefiltrado / agregar rutina al carrito /
               compartir por WhatsApp

   El perfil se guarda en localStorage (QUIZ_STORAGE_KEY) apenas termina
   la última pregunta, para que se pueda retomar / compartir / usar en /cuenta.
   ============================================================ */

/* WhatsApp de Veliroz — mismo que usa AddToCartButton. */
const WA_NUMERO = "51967456364";

/* Respuesta parcial mientras se completa el quiz. Todas las claves son string
   (union de la pregunta correspondiente) pero antes de contestarla son undefined. */
type QuizAnswers = Partial<{
  tipo_piel: string;
  preocupacion: string;
  nivel_acidos: string;
  edad: string;
  tiempo: string;
  spf_diario: string;
  budget: string;
}>;

type FaseFlujo = "intro" | "preguntas" | "resultado";

/* Slide dirección para la animación del carrusel. */
type Dir = 1 | -1;

export default function QuizPage() {
  const [fase, setFase] = useState<FaseFlujo>("intro");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<Dir>(1);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [perfilGuardado, setPerfilGuardado] = useState<QuizPerfil | null>(null);

  /* Al montar, si hay perfil ya en localStorage, ofrecemos "ver rutina" o "rehacer". */
  useEffect(() => {
    const p = loadPerfil();
    if (p) setPerfilGuardado(p);
  }, []);

  const pregunta = QUIZ_PREGUNTAS[step];
  const progreso = ((step + 1) / QUIZ_TOTAL_PREGUNTAS) * 100;

  /* Al elegir una opción avanzamos automáticamente (mejor UX que "siguiente"). */
  const handleElegir = useCallback(
    (key: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
      // Pequeña pausa para que el usuario vea el highlight de su selección.
      window.setTimeout(() => {
        if (step + 1 >= QUIZ_TOTAL_PREGUNTAS) {
          // Última pregunta: consolidamos perfil, guardamos, cerramos.
          const perfil = { ...answers, [key]: value } as QuizPerfil;
          savePerfil(perfil);
          setPerfilGuardado(perfil);
          setFase("resultado");
        } else {
          setDir(1);
          setStep((s) => s + 1);
        }
      }, 240);
    },
    [step, answers]
  );

  const handleAtras = () => {
    if (step === 0) {
      setFase("intro");
      return;
    }
    setDir(-1);
    setStep((s) => s - 1);
  };

  const handleEmpezar = () => {
    setAnswers({});
    setStep(0);
    setDir(1);
    setFase("preguntas");
  };

  const handleRehacer = () => {
    clearPerfil();
    setPerfilGuardado(null);
    handleEmpezar();
  };

  return (
    <main className="min-h-screen bg-cream paper-grain">
      {/* Progress bar fijo arriba (solo en fase preguntas) */}
      {fase === "preguntas" && (
        <div
          className="fixed top-0 left-0 right-0 h-1 bg-mist z-40"
          aria-hidden="true"
        >
          <motion.div
            className="h-full bg-ink"
            initial={false}
            animate={{ width: `${progreso}%` }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      )}

      {/* Header minimalista con botón back */}
      <header className="max-w-4xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-serif text-lg text-ink hover:text-rose-deep transition-colors"
        >
          Veliroz
        </Link>
        {fase === "preguntas" && (
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-taupe">
            {step + 1} / {QUIZ_TOTAL_PREGUNTAS}
          </span>
        )}
      </header>

      {/* Fase INTRO */}
      {fase === "intro" && (
        <IntroPantalla
          perfilGuardado={perfilGuardado}
          onEmpezar={handleEmpezar}
          onVerResultado={() => setFase("resultado")}
          onRehacer={handleRehacer}
        />
      )}

      {/* Fase PREGUNTAS */}
      {fase === "preguntas" && (
        <section className="max-w-3xl mx-auto px-6 pt-8 pb-24 min-h-[60vh] relative overflow-x-hidden">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={pregunta.key}
              custom={dir}
              initial={{ opacity: 0, x: 48 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -48 * dir }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              <PreguntaBloque
                heroTitulo={pregunta.hero}
                subtitulo={pregunta.subtitulo}
                seleccionada={answers[pregunta.key as keyof QuizAnswers]}
                opciones={pregunta.opciones as readonly {
                  value: string;
                  label: string;
                  hint?: string;
                }[]}
                onElegir={(v) => handleElegir(pregunta.key, v)}
              />
            </motion.div>
          </AnimatePresence>

          {/* Botón Atrás — siempre visible, aunque sea sutil */}
          <div className="mt-10 flex items-center gap-4">
            <button
              type="button"
              onClick={handleAtras}
              className="text-sm text-clay hover:text-ink transition-colors inline-flex items-center gap-2"
            >
              <span aria-hidden="true">←</span>
              {step === 0 ? "Volver al inicio" : "Atrás"}
            </button>
          </div>
        </section>
      )}

      {/* Fase RESULTADO */}
      {fase === "resultado" && perfilGuardado && (
        <ResultadoPantalla
          perfil={perfilGuardado}
          onRehacer={handleRehacer}
        />
      )}
    </main>
  );
}

/* ================================================================
   INTRO — pantalla inicial editorial
   ================================================================ */

function IntroPantalla({
  perfilGuardado,
  onEmpezar,
  onVerResultado,
  onRehacer,
}: {
  perfilGuardado: QuizPerfil | null;
  onEmpezar: () => void;
  onVerResultado: () => void;
  onRehacer: () => void;
}) {
  return (
    <section className="max-w-3xl mx-auto px-6 pt-16 pb-24 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-taupe mb-6">
        Quiz Veliroz — 2 min
      </p>
      <h1 className="font-serif text-[--text-display] text-ink text-balance leading-[1.05]">
        {/* Dinámico a propósito: al sumar la pregunta de embarazo el título
            se quedó diciendo "7 preguntas" mientras el contador marcaba 8. */}
        Encontrá tu rutina en{" "}
        <span className="font-italic-serif text-rose-deep">
          {QUIZ_TOTAL_PREGUNTAS} preguntas
        </span>
        .
      </h1>
      <p className="mt-6 text-clay text-lg max-w-xl mx-auto text-pretty">
        Respondé como si estuvieras hablándonos por WhatsApp. Al final te
        devolvemos 3 o 4 productos elegidos entre Beauty of Joseon, Anua, Round Lab, COSRX y SKIN1004 — con el
        motivo de cada uno, sin vueltas.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        {perfilGuardado ? (
          <>
            <button
              type="button"
              onClick={onVerResultado}
              className="btn-primary"
            >
              Ver mi rutina guardada
            </button>
            <button
              type="button"
              onClick={onRehacer}
              className="btn-outline"
            >
              Rehacer el quiz
            </button>
          </>
        ) : (
          <button type="button" onClick={onEmpezar} className="btn-primary">
            Empezar quiz
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>

      <div className="divider-champagne mt-16 max-w-md mx-auto" />

      <ul className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-2xl mx-auto">
        <li className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-taupe">
            01
          </p>
          <p className="text-sm text-ink">
            Sin correo ni registro. Solo el quiz.
          </p>
        </li>
        <li className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-taupe">
            02
          </p>
          <p className="text-sm text-ink">
            Los productos ya están validados con dermatólogos.
          </p>
        </li>
        <li className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-taupe">
            03
          </p>
          <p className="text-sm text-ink">
            Podés agregar la rutina al carrito con un click.
          </p>
        </li>
      </ul>
    </section>
  );
}

/* ================================================================
   PreguntaBloque — hero + opciones como cards grandes
   ================================================================ */

function PreguntaBloque({
  heroTitulo,
  subtitulo,
  opciones,
  seleccionada,
  onElegir,
}: {
  heroTitulo: string;
  subtitulo: string;
  opciones: readonly { value: string; label: string; hint?: string }[];
  seleccionada: string | undefined;
  onElegir: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="font-serif text-3xl md:text-[2.5rem] text-ink leading-[1.15] text-balance">
        {heroTitulo}
      </h2>
      <p className="mt-3 text-clay text-base text-pretty max-w-xl">
        {subtitulo}
      </p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {opciones.map((op) => {
          const activa = seleccionada === op.value;
          return (
            <button
              key={op.value}
              type="button"
              onClick={() => onElegir(op.value)}
              aria-pressed={activa}
              className={[
                "group relative text-left rounded-[--radius-md] border p-5 transition-all",
                "bg-surface hover:border-ink hover:shadow-[0_16px_40px_-20px_rgba(26,22,19,0.18)]",
                activa
                  ? "border-ink shadow-[0_16px_40px_-20px_rgba(26,22,19,0.25)] ring-1 ring-ink"
                  : "border-[--border-2]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-serif text-xl text-ink leading-tight">
                    {op.label}
                  </p>
                  {op.hint && (
                    <p className="mt-1 text-sm text-clay">{op.hint}</p>
                  )}
                </div>
                <span
                  aria-hidden="true"
                  className={[
                    "shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                    activa
                      ? "bg-ink border-ink"
                      : "bg-transparent border-[--border-2] group-hover:border-ink",
                  ].join(" ")}
                >
                  {activa && (
                    <svg
                      className="w-3.5 h-3.5 text-cream"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   RESULTADO — perfil + rutina recomendada + CTAs
   ================================================================ */

/* Shape mínimo que necesitamos para pintar la card en el resultado. */
type ProductoLite = {
  slug: string;
  nombre: string;
  descripcion_corta: string | null;
  imagen_principal: string | null;
  marca_slug: string | null;
  marca_nombre: string | null;
  categoria: string;
  variante: {
    id: string;
    sku: string;
    variante_label: string;
    precio: number;
    stock: number;
  } | null;
};

function ResultadoPantalla({
  perfil,
  onRehacer,
}: {
  perfil: QuizPerfil;
  onRehacer: () => void;
}) {
  const rutina = useMemo(() => recomendarRutina(perfil), [perfil]);
  const labels = useMemo(() => labelPerfil(perfil), [perfil]);
  const [productos, setProductos] = useState<ProductoLite[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("Rutina agregada al carrito");
  const add = useCartStore((s) => s.add);

  /* La rutina curada equivalente, si existe (ver bundleSlug en quiz-logic). */
  const bundle = rutina.bundleSlug ? getRutina(rutina.bundleSlug) : null;

  /* Fetch client-side de los productos por slug (anon key). */
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        setCargando(true);
        setErrorMsg(null);
        const { data, error } = await getSupabase()
          .from("productos")
          .select(PRODUCTO_SELECT)
          .in("slug", rutina.productos_slugs)
          .eq("linea_negocio", "cosmetic")
          .eq("activo", true);
        if (error) throw error;
        const rows = (data ?? []) as unknown as ProductoRow[];

        // Reordenar según el orden original del array (Supabase no respeta IN order).
        const orden = new Map(
          rutina.productos_slugs.map((s, i) => [s, i] as const)
        );
        const ordered = rows
          .slice()
          .sort(
            (a, b) => (orden.get(a.slug) ?? 99) - (orden.get(b.slug) ?? 99)
          );

        const lite: ProductoLite[] = ordered.map((r) => {
          const activas = (r.variantes ?? []).filter((v) => v.activo);
          const barata = [...activas].sort(
            (a, b) => Number(a.precio) - Number(b.precio)
          )[0];
          return {
            slug: r.slug,
            nombre: r.nombre,
            descripcion_corta: r.descripcion_corta,
            imagen_principal: r.imagen_principal,
            marca_slug: r.marca?.slug ?? null,
            marca_nombre: r.marca?.nombre ?? null,
            categoria: r.categoria,
            variante: barata
              ? {
                  id: barata.id,
                  sku: barata.sku,
                  variante_label: barata.variante_label,
                  precio: Number(barata.precio),
                  stock: Number(barata.stock ?? 0),
                }
              : null,
          };
        });
        if (!cancelado) setProductos(lite);
      } catch (e) {
        if (!cancelado) {
          setErrorMsg(
            e instanceof Error ? e.message : "No pudimos cargar la rutina"
          );
          setProductos([]);
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [rutina.productos_slugs]);

  const total = useMemo(
    () =>
      (productos ?? []).reduce(
        (acc, p) => acc + (p.variante ? p.variante.precio : 0),
        0
      ),
    [productos]
  );

  const handleAgregarRutina = () => {
    if (!productos || productos.length === 0) return;
    let agregados = 0;
    for (const p of productos) {
      if (!p.variante || p.variante.stock <= 0) continue;
      add({
        sku: p.variante.sku,
        cantidad: 1,
        snapshot: makeSnapshot({
          productoSlug: p.slug,
          productoNombre: p.nombre,
          marcaNombre: p.marca_nombre ?? "Veliroz",
          varianteLabel: p.variante.variante_label,
          precio: p.variante.precio,
          imagenSwatch: swatchFor(p.marca_slug),
        }),
      });
      agregados += 1;
    }
    setToastMsg(
      agregados === 0
        ? "No hay stock disponible"
        : `${agregados} ${agregados === 1 ? "producto agregado" : "productos agregados"}`
    );
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2500);
  };

  /* WhatsApp share con la rutina + link al catálogo prefiltrado. */
  const waHref = useMemo(() => {
    const nombres = (productos ?? [])
      .map((p) => `• ${p.nombre}`)
      .join("\n");
    const texto = [
      `Hola Veliroz, hice el quiz y me tocó: ${rutina.rutina_nombre}.`,
      "",
      `Perfil: piel ${labels.tipo_piel.toLowerCase()}, ${labels.preocupacion.toLowerCase()}, nivel ${labels.nivel.toLowerCase()}.`,
      "",
      "Los productos que me recomiendan:",
      nombres || "(cargando)",
      "",
      "¿Me confirman disponibilidad y me ayudan a comprarlos?",
    ].join("\n");
    return `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(texto)}`;
  }, [rutina, labels, productos]);

  return (
    <section className="max-w-5xl mx-auto px-6 pt-8 pb-24">
      {/* Hero con nombre de la rutina */}
      <div className="max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-taupe">
          Tu rutina personalizada
        </p>
        <h1 className="mt-3 font-serif text-[--text-display] text-ink leading-[1.05] text-balance">
          {rutina.rutina_nombre}
        </h1>
        <p className="mt-5 text-clay text-lg text-pretty">
          {rutina.descripcion}
        </p>
      </div>

      {/* Chips del perfil */}
      <div className="mt-8 flex flex-wrap gap-2">
        <PerfilChip label="Tipo de piel" value={labels.tipo_piel} />
        <PerfilChip label="Preocupación" value={labels.preocupacion} />
        <PerfilChip label="Nivel" value={labels.nivel} />
        <PerfilChip label="Budget" value={labels.budget} />
        <PerfilChip
          label="SPF diario"
          value={
            perfil.spf_diario === "siempre"
              ? "Sí, todos los días"
              : perfil.spf_diario === "a-veces"
                ? "A veces"
                : "Nunca"
          }
        />
      </div>

      {/* Alerta SPF si nunca lo usa */}
      {perfil.spf_diario === "nunca" && (
        <div className="mt-6 border border-[--veliroz-champagne-dark] bg-champagne/20 rounded-[--radius-md] p-5 flex gap-4">
          <span className="text-2xl" aria-hidden="true">
            ☀
          </span>
          <div>
            <p className="font-serif text-lg text-ink">
              El SPF es la mitad de tu resultado.
            </p>
            <p className="mt-1 text-sm text-clay text-pretty">
              Sin protector solar diario, ninguna crema antimanchas ni antiedad
              rinde. Por eso lo pusimos en tu rutina — es el paso no negociable.
            </p>
          </div>
        </div>
      )}

      {/* El diagnóstico va ANTES de la recomendación: primero se explica de
          dónde sale, después se recomienda. Al revés se lee como una venta
          con la justificación pegada atrás. */}
      <div className="mt-10">
        <DiagnosticoPanel diag={diagnosticar(perfil)} />
      </div>

      <div className="divider-champagne mt-12 mb-10" />

      {cargando && <ProductosSkeleton count={rutina.productos_slugs.length} />}

      {!cargando && errorMsg && (
        <div className="border border-[--border-2] rounded-[--radius-md] p-6 bg-mist text-sm text-clay">
          {errorMsg}. Revisá tu conexión y volvé a intentar.
        </div>
      )}

      {/* Si esta rutina tiene un bundle curado equivalente, se ofrece a
          precio de bundle. Antes el quiz mandaba a /productos?filtro=… y
          la persona tenía que rearmar sola lo que ya le habíamos armado
          —y más caro, porque sumaba los sueltos. */}
      {bundle && (
        <div className="mt-10 rounded-lg border border-champagne/50 bg-cream p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Llevala completa
              </p>
              <p className="mt-2 font-serif text-2xl text-ink italic leading-tight">
                {bundle.nombre}
              </p>
              <p className="mt-1.5 text-sm text-clay">
                {bundle.pasos.length} pasos · comprando el set ahorrás S/
                {bundle.ahorro}
              </p>
            </div>

            <div className="shrink-0 flex items-end gap-4">
              <div className="text-right">
                <p className="font-mono text-[11px] text-stone line-through">
                  S/ {bundle.precioLista.toFixed(2)}
                </p>
                <p className="font-serif text-3xl text-ink leading-none">
                  S/ {bundle.precioBundle.toFixed(2)}
                </p>
              </div>
              <Link
                href={`/rutinas/${bundle.slug}`}
                className="btn-primary whitespace-nowrap"
              >
                Ver la rutina
              </Link>
            </div>
          </div>
        </div>
      )}

      {!cargando && !errorMsg && productos && (
        <div className="mt-10">
          {/* El total va acá y no arriba: es la suma de los productos SUELTOS.
              Arriba quedaba enfrentado al precio del bundle —"Total S/249"
              contra "S/229"— y se leían como dos precios en conflicto para lo
              mismo. Acá queda claro que es el costo de armarla por separado. */}
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              {bundle ? "O armala vos, producto por producto" : "Tu rutina, paso a paso"}
            </p>
            {productos && productos.length > 0 && (
              <p className="font-mono text-xs text-clay shrink-0" suppressHydrationWarning>
                Suelto: <span className="text-ink">S/. {total.toFixed(2)}</span>
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {productos.map((p, i) => (
              <ProductoResultadoCard key={p.slug} p={p} paso={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* CTAs finales */}
      <div className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={handleAgregarRutina}
          disabled={cargando || !productos || productos.length === 0}
          className="btn-primary justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Agregar rutina al carrito
          <span aria-hidden="true">→</span>
        </button>
        <Link href={rutina.filtro_url} className="btn-outline justify-center">
          Ver más productos para vos
        </Link>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-outline justify-center"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          </svg>
          Compartir por WhatsApp
        </a>
      </div>

      <button
        type="button"
        onClick={onRehacer}
        className="mt-10 text-sm text-clay hover:text-ink transition-colors inline-flex items-center gap-2"
      >
        <span aria-hidden="true">↻</span>
        Rehacer el quiz
      </button>

      <Toast open={toastOpen} mensaje={toastMsg} />
    </section>
  );
}

/* ================================================================
   Sub-componentes del resultado
   ================================================================ */

function PerfilChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[--border-2] bg-surface px-4 py-1.5 text-sm">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-taupe">
        {label}
      </span>
      <span className="text-ink">{value}</span>
    </span>
  );
}

function ProductoResultadoCard({
  p,
  paso,
}: {
  p: ProductoLite;
  paso: number;
}) {
  const swatch = swatchFor(p.marca_slug);
  const precio = p.variante ? p.variante.precio : null;
  const agotado = p.variante ? p.variante.stock <= 0 : true;
  return (
    <Link
      href={`/producto/${p.slug}`}
      className="prod-card group"
      aria-label={`${p.nombre} — ver detalle`}
    >
      <div
        className="relative aspect-[4/5] flex items-end justify-between p-4"
        style={{ background: swatch }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink/60">
          Paso {paso}
        </span>
        {p.marca_nombre && (
          <span className="font-serif text-sm text-ink/70">
            {p.marca_nombre}
          </span>
        )}
        {p.imagen_principal && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagen_principal}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover mix-blend-multiply opacity-90"
          />
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-taupe">
          {p.categoria.replace(/-/g, " ")}
        </p>
        <h3 className="mt-2 font-serif text-lg text-ink leading-snug">
          {p.nombre}
        </h3>
        {p.descripcion_corta && (
          <p className="mt-2 text-sm text-clay line-clamp-2">
            {p.descripcion_corta}
          </p>
        )}
        <div className="mt-auto pt-4 flex items-baseline justify-between">
          {precio != null ? (
            <span className="font-mono text-base text-ink" suppressHydrationWarning>
              S/. {precio.toFixed(2)}
            </span>
          ) : (
            <span className="font-mono text-sm text-taupe">Consultar</span>
          )}
          <span className="text-xs text-clay group-hover:text-ink transition-colors">
            Ver detalle →
          </span>
        </div>
        {agotado && precio != null && (
          <p className="mt-2 text-xs text-[--veliroz-danger]">
            Agotado — consultá por reposición
          </p>
        )}
      </div>
    </Link>
  );
}

function ProductosSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[--radius-md] border border-[--border] bg-surface overflow-hidden"
          aria-hidden="true"
        >
          <div className="aspect-[4/5] bg-mist animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-3 w-20 bg-mist rounded animate-pulse" />
            <div className="h-5 w-full bg-mist rounded animate-pulse" />
            <div className="h-4 w-4/5 bg-mist rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
