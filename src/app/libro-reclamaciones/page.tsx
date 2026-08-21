import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { EMPRESA, rucFormateado } from "@/lib/empresa";

/* ============================================================
   /libro-reclamaciones — cumplimiento INDECOPI.
   Formato virtual del Libro de Reclamaciones exigido en Perú
   (Código de Protección y Defensa del Consumidor · Ley 29571 y
   D.S. 011-2011-PCM modificado por D.S. 006-2014-PCM).
   El submit va a mailto: (fallback). Cuando cableemos Resend, se
   redirige a /api/reclamos con el mismo shape de campos.
   ============================================================ */

export const metadata: Metadata = {
  title: "Libro de reclamaciones",
  description:
    "Libro de Reclamaciones virtual · Veliroz Cosmetic. Cumplimiento INDECOPI (Ley 29571, D.S. 011-2011-PCM).",
  alternates: { canonical: "/libro-reclamaciones" },
  robots: { index: true, follow: true },
};

/* Los datos legales salen de src/lib/empresa.ts — fuente única. Antes esta
   página publicaba "20-XXXXXXXX-X · pendiente de ficha RUC", que es
   observable por INDECOPI y lo primero que mira un comprador desconfiado. */
const RAZON_SOCIAL = EMPRESA.razonSocial || EMPRESA.nombreComercial;
const RUC = rucFormateado();
const EMAIL_RECLAMOS = EMPRESA.email;
const WA_NUMERO = EMPRESA.whatsapp;

export default function LibroReclamacionesPage() {
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
          <span className="text-ink">Libro de reclamaciones</span>
        </nav>

        <div className="max-w-2xl space-y-3">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · Cumplimiento INDECOPI ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            Libro de reclamaciones.
          </h1>
          <p className="text-clay text-pretty leading-relaxed">
            Este formulario cumple con lo establecido en el Código de Protección
            y Defensa del Consumidor (Ley 29571) y su reglamento (D.S.
            011-2011-PCM, modificado por D.S. 006-2014-PCM). Tu queja/reclamo se
            atenderá en un plazo máximo de <strong>30 días calendario</strong>.
          </p>
        </div>
      </section>

      {/* ────────────────── DATOS DEL PROVEEDOR ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-8">
        <div className="bg-mist/50 border border-[--border] rounded-lg p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe mb-1">
              Razón social
            </p>
            <p className="text-ink">{RAZON_SOCIAL}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe mb-1">
              RUC
            </p>
            <p className="font-mono text-ink text-xs">{RUC}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe mb-1">
              Domicilio fiscal
            </p>
            <p className="text-ink text-xs text-pretty">
              Cajamarca, Perú · dirección exacta en boleta electrónica
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────── FORMULARIO ────────────────── */}
      <section className="max-w-3xl mx-auto px-6 md:px-10 pb-16">
        <form
          action={`mailto:${EMAIL_RECLAMOS}`}
          method="post"
          encType="text/plain"
          className="bg-surface border border-[--border] rounded-lg p-6 md:p-8 space-y-6"
          aria-label="Formulario libro de reclamaciones"
        >
          {/* Bloque 1 — Datos del consumidor */}
          <fieldset className="space-y-4">
            <legend className="font-serif text-lg text-ink italic">
              1 · Identificación del consumidor
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Nombres y apellidos *
                </span>
                <input
                  type="text"
                  name="nombres"
                  required
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  DNI / CE *
                </span>
                <input
                  type="text"
                  name="dni"
                  required
                  pattern="[0-9A-Z]{8,12}"
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Correo *
                </span>
                <input
                  type="email"
                  name="correo"
                  required
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Teléfono / WhatsApp
                </span>
                <input
                  type="tel"
                  name="telefono"
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Domicilio
              </span>
              <input
                type="text"
                name="domicilio"
                className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
              />
            </label>
          </fieldset>

          {/* Bloque 2 — Datos del bien / servicio */}
          <fieldset className="space-y-4 pt-4 border-t border-[--border]">
            <legend className="font-serif text-lg text-ink italic">
              2 · Identificación del bien contratado
            </legend>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Tipo *
                </span>
                <select
                  name="tipo_bien"
                  required
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                >
                  <option value="producto">Producto</option>
                  <option value="servicio">Servicio</option>
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  N° de boleta / factura
                </span>
                <input
                  type="text"
                  name="boleta"
                  placeholder="B001-000123"
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Descripción del bien / servicio *
              </span>
              <input
                type="text"
                name="descripcion_bien"
                required
                placeholder="Ej: Relief Sun SPF50+ · Beauty of Joseon"
                className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Monto reclamado (S/.)
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                name="monto"
                className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink md:w-1/3"
              />
            </label>
          </fieldset>

          {/* Bloque 3 — Detalle */}
          <fieldset className="space-y-4 pt-4 border-t border-[--border]">
            <legend className="font-serif text-lg text-ink italic">
              3 · Detalle de la reclamación
            </legend>

            <div className="space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Tipo *
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <label className="flex items-start gap-3 p-3 bg-mist/40 border border-[--border] rounded-md cursor-pointer hover:border-ink">
                  <input
                    type="radio"
                    name="tipo_solicitud"
                    value="Reclamo"
                    required
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm text-ink font-medium">Reclamo</p>
                    <p className="text-xs text-clay">
                      Disconformidad con el bien o servicio.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 bg-mist/40 border border-[--border] rounded-md cursor-pointer hover:border-ink">
                  <input
                    type="radio"
                    name="tipo_solicitud"
                    value="Queja"
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm text-ink font-medium">Queja</p>
                    <p className="text-xs text-clay">
                      Malestar respecto a la atención al público.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Detalle *
              </span>
              <textarea
                name="detalle"
                required
                rows={5}
                placeholder="Describe lo ocurrido con la mayor cantidad de detalles posible."
                className="w-full px-4 py-3 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink resize-y"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Pedido concreto *
              </span>
              <textarea
                name="pedido"
                required
                rows={3}
                placeholder="Qué solución esperas — cambio, devolución, disculpas formales, etc."
                className="w-full px-4 py-3 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink resize-y"
              />
            </label>
          </fieldset>

          {/* Consentimiento + submit */}
          <div className="pt-4 border-t border-[--border] space-y-4">
            <label className="flex items-start gap-3 text-xs text-clay text-pretty">
              <input type="checkbox" name="consentimiento" required className="mt-1" />
              <span>
                Declaro que la información brindada es verdadera y acepto que
                Veliroz Cosmetic la utilice exclusivamente para atender la
                presente reclamación, en conformidad con la Ley 29733 de
                Protección de Datos Personales.
              </span>
            </label>

            <button type="submit" className="btn-primary w-full justify-center">
              Enviar reclamación
            </button>

            <p className="text-[11px] text-clay text-center text-pretty">
              Al enviar se abre tu app de correo con la reclamación redactada.
              Si prefieres, escríbenos directo a{" "}
              <a
                href={`mailto:${EMAIL_RECLAMOS}`}
                className="text-ink underline underline-offset-4"
              >
                {EMAIL_RECLAMOS}
              </a>{" "}
              o por{" "}
              <a
                href={`https://wa.me/${WA_NUMERO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline underline-offset-4"
              >
                WhatsApp
              </a>
              .
            </p>
          </div>
        </form>
      </section>

      {/* ────────────────── NOTA INDECOPI ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-24">
        <div className="bg-cream/60 border border-[--border] rounded-lg p-6 space-y-3">
          <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            Aviso INDECOPI
          </p>
          <p className="text-sm text-clay text-pretty leading-relaxed">
            Conforme al artículo 152° del Código de Protección y Defensa del
            Consumidor, el proveedor debe atender el reclamo o queja en un
            plazo no mayor a <strong>30 días calendario</strong>, contados
            desde el día siguiente de su presentación. Si tu reclamo no fue
            atendido satisfactoriamente, puedes presentar tu caso ante{" "}
            <a
              href="https://www.consumidor.gob.pe/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-4"
            >
              INDECOPI
            </a>
            .
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
