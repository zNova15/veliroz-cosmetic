import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";

/* ============================================================
   /cosmetic/contacto — canales de atención.
   Form simple → mailto: (fallback zero-JS). El CTA principal es
   WhatsApp con mensaje pre-cargado. La cuenta operativa vive en
   Cajamarca; equipo de entrega colabora en Lima (Santiago de Surco).
   ============================================================ */

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Escribinos por WhatsApp, correo o el formulario — respondemos en horario Lima (L-V 9-18h). Consultas de producto, seguimiento de pedidos, mayoristas.",
  alternates: { canonical: "/cosmetic/contacto" },
};

const WA_NUMERO = "51967456364";
const EMAIL = "hola@veliroz.com";
const HORARIO = "Lunes a viernes · 9:00 a 18:00 (hora Lima)";

/* Mensajes precargados para WhatsApp — se elige uno u otro CTA */
const WA_MSG_GENERAL = encodeURIComponent(
  "Hola Veliroz Cosmetic, quería consultarles algo."
);
const WA_MSG_PEDIDO = encodeURIComponent(
  "Hola Veliroz Cosmetic, quería consultar por el estado de mi pedido. Mi número de boleta es: "
);
const WA_MSG_MAYORISTA = encodeURIComponent(
  "Hola Veliroz Cosmetic, me contacto para consultar por venta al por mayor / distribución."
);

export default function ContactoPage() {
  return (
    <main className="min-h-screen">
      {/* ────────────────── HERO ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-8">
        <nav
          aria-label="Migas de pan"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-4"
        >
          <Link href="/" className="hover:text-ink">
            Inicio
          </Link>
          <span className="mx-2">·</span>
          <span className="text-ink">Contacto</span>
        </nav>

        <div className="max-w-2xl space-y-3">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · Escribinos ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            Hablemos.{" "}
            <span className="font-italic-serif text-rose-deep">
              De piel, pedidos o lo que quieras.
            </span>
          </h1>
          <p className="text-clay text-pretty leading-relaxed">
            La forma más rápida es WhatsApp — tenemos un equipo pequeño y
            respondemos en el día. También podés escribirnos por correo o dejar
            un mensaje acá abajo.
          </p>
        </div>
      </section>

      {/* ────────────────── CANALES ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href={`https://wa.me/${WA_NUMERO}?text=${WA_MSG_GENERAL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-surface border border-[--border] rounded-lg p-5 flex flex-col gap-2 hover:border-ink transition-colors"
          >
            <div className="flex items-center gap-2 text-ink">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
              <span className="font-serif text-lg italic">WhatsApp</span>
            </div>
            <p className="text-xs text-clay">Respuesta en el día.</p>
            <p className="font-mono text-sm text-ink mt-auto">
              +51 967 456 364
            </p>
          </a>

          <a
            href={`mailto:${EMAIL}`}
            className="bg-surface border border-[--border] rounded-lg p-5 flex flex-col gap-2 hover:border-ink transition-colors"
          >
            <div className="flex items-center gap-2 text-ink">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75c0-1.036.84-1.875 1.875-1.875h15.75c1.036 0 1.875.84 1.875 1.875v10.5c0 1.036-.84 1.875-1.875 1.875H4.125A1.875 1.875 0 012.25 17.25V6.75z M22.5 6.75l-9.53 6.72a1.875 1.875 0 01-2.16 0L2.25 6.75"
                />
              </svg>
              <span className="font-serif text-lg italic">Correo</span>
            </div>
            <p className="text-xs text-clay">Consultas más largas.</p>
            <p className="font-mono text-sm text-ink mt-auto break-all">
              {EMAIL}
            </p>
          </a>

          <div className="bg-surface border border-[--border] rounded-lg p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-ink">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-serif text-lg italic">Horario</span>
            </div>
            <p className="text-xs text-clay">{HORARIO}</p>
            <p className="text-[11px] text-clay mt-auto">
              Operado desde Cajamarca · entregas Lima Santiago de Surco.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────── FORM MAILTO ────────────────── */}
      <section className="max-w-3xl mx-auto px-6 md:px-10 pb-16">
        <div className="bg-surface border border-[--border] rounded-lg p-6 md:p-8 space-y-6">
          <div>
            <h2 className="font-serif text-2xl md:text-3xl text-ink italic">
              Formulario
            </h2>
            <p className="text-xs text-clay mt-1">
              Al enviar se abre tu app de correo con el mensaje redactado.
            </p>
          </div>

          <form
            action={`mailto:${EMAIL}`}
            method="post"
            encType="text/plain"
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Nombre
                </span>
                <input
                  type="text"
                  name="nombre"
                  required
                  autoComplete="name"
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Correo
                </span>
                <input
                  type="email"
                  name="correo"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Motivo
              </span>
              <select
                name="motivo"
                className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                defaultValue="Consulta de producto"
              >
                <option>Consulta de producto</option>
                <option>Seguimiento de pedido</option>
                <option>Mayorista / distribución</option>
                <option>Otro</option>
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Mensaje
              </span>
              <textarea
                name="mensaje"
                required
                rows={5}
                placeholder="Contanos qué necesitás — cuanto más contexto, mejor."
                className="w-full px-4 py-3 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink resize-y"
              />
            </label>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button type="submit" className="btn-primary justify-center">
                Enviar por correo
              </button>
              <a
                href={`https://wa.me/${WA_NUMERO}?text=${WA_MSG_GENERAL}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline justify-center"
              >
                O responder por WhatsApp
              </a>
            </div>
          </form>
        </div>
      </section>

      {/* ────────────────── SHORTCUTS ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-24">
        <h2 className="font-serif text-2xl text-ink italic mb-4">
          Consultas frecuentes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <a
            href={`https://wa.me/${WA_NUMERO}?text=${WA_MSG_PEDIDO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-mist/50 hover:bg-mist rounded-md px-4 py-3 border border-[--border] text-clay hover:text-ink transition-colors"
          >
            → Estado de mi pedido
          </a>
          <Link
            href="/cosmetic/envios"
            className="bg-mist/50 hover:bg-mist rounded-md px-4 py-3 border border-[--border] text-clay hover:text-ink transition-colors"
          >
            → Envíos y devoluciones
          </Link>
          <a
            href={`https://wa.me/${WA_NUMERO}?text=${WA_MSG_MAYORISTA}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-mist/50 hover:bg-mist rounded-md px-4 py-3 border border-[--border] text-clay hover:text-ink transition-colors"
          >
            → Mayorista / distribución
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
