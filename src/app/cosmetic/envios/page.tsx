import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";

/* ============================================================
   /cosmetic/envios — información de envíos y devoluciones.
   Modelo real Veliroz (memory `project_veliroz_auditoria_2607.md`):
   - Cajamarca ciudad: contra-entrega S/3-5, gratis desde S/40.
   - Puylucana (planta): retiro personal gratis.
   - Perú (Shalom agencia): S/12, 2-5 días hábiles.
   - Lima: domicilio S/18 (colaboradora Santiago de Surco).
   - Envío gratis nacional desde S/149.
   ============================================================ */

export const metadata: Metadata = {
  title: "Envíos y devoluciones",
  description:
    "Envío nacional Shalom S/12. Gratis desde S/149. Lima a domicilio S/18. Cajamarca contra-entrega S/3-5. Política de devoluciones 7 días.",
  alternates: { canonical: "/cosmetic/envios" },
};

const TARIFAS = [
  {
    zona: "Cajamarca ciudad",
    detalle: "Contra-entrega en 24h",
    precio: "S/. 3 – 5",
    nota: "Zonas cercanas al centro. Consultar por distancia.",
  },
  {
    zona: "Puylucana (retiro)",
    detalle: "Retiro en planta",
    precio: "Gratis",
    nota: "Coordinamos hora por WhatsApp.",
  },
  {
    zona: "Lima Metropolitana",
    detalle: "Domicilio · colaboradora Santiago de Surco",
    precio: "S/. 18",
    nota: "1-2 días hábiles. Confirmación por WhatsApp.",
  },
  {
    zona: "Nacional (agencia Shalom)",
    detalle: "Retiro en agencia Shalom",
    precio: "S/. 12",
    nota: "2-5 días hábiles según ciudad.",
  },
  {
    zona: "Nacional · pedido ≥ S/149",
    detalle: "Envío gratis a agencia Shalom",
    precio: "Gratis",
    nota: "Se activa automáticamente al superar S/149 de subtotal.",
  },
];

const PROCESO = [
  {
    orden: 1,
    titulo: "Confirmamos tu pedido",
    detalle:
      "Ni bien pagás, recibís correo con el número de pedido y comprobante electrónico (boleta o factura).",
  },
  {
    orden: 2,
    titulo: "Preparamos en Cajamarca",
    detalle:
      "Empacamos con burbuja + caja rígida — el vidrio de los frascos viaja seguro. Toma 1 día hábil promedio.",
  },
  {
    orden: 3,
    titulo: "Despachamos y trackeamos",
    detalle:
      "Te pasamos guía Shalom o coordinamos hora de entrega en Lima. Podés seguir el pedido por WhatsApp.",
  },
  {
    orden: 4,
    titulo: "Llega y probás",
    detalle:
      "Tenés 7 días desde la entrega para cambios por defecto de fábrica o pedido incorrecto. Devoluciones detalladas más abajo.",
  },
];

export default function EnviosPage() {
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
          <span className="text-ink">Envíos y devoluciones</span>
        </nav>

        <div className="max-w-2xl space-y-3">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · Cómo te llega el pedido ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            Envío nacional.{" "}
            <span className="font-italic-serif text-rose-deep">
              Y devoluciones honestas.
            </span>
          </h1>
          <p className="text-clay text-pretty leading-relaxed">
            Enviamos desde Cajamarca a todo el Perú por Shalom, con opción de
            entrega a domicilio en Lima. Tarifas claras, sin sorpresas al final
            del checkout.
          </p>
        </div>
      </section>

      {/* ────────────────── TARIFAS ────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 pb-12">
        <h2 className="font-serif text-2xl md:text-3xl text-ink italic mb-6">
          Tarifas por zona.
        </h2>
        <div className="bg-surface border border-[--border] rounded-lg overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_1.4fr_120px_1fr] px-6 py-3 bg-mist/50 font-mono text-[10px] tracking-[0.2em] uppercase text-taupe border-b border-[--border]">
            <span>Zona</span>
            <span>Modalidad</span>
            <span className="text-right">Precio</span>
            <span className="text-right">Tiempo estimado</span>
          </div>
          <ul>
            {TARIFAS.map((t) => (
              <li
                key={t.zona}
                className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr_120px_1fr] gap-2 md:gap-4 px-6 py-4 border-b border-[--border] last:border-b-0 text-sm"
              >
                <div>
                  <p className="font-serif text-lg text-ink italic md:not-italic md:text-base leading-tight">
                    {t.zona}
                  </p>
                  <p className="md:hidden text-clay text-xs mt-1">
                    {t.detalle}
                  </p>
                </div>
                <p className="text-clay hidden md:block">{t.detalle}</p>
                <p className="font-mono text-ink md:text-right">{t.precio}</p>
                <p className="text-clay text-xs md:text-right md:text-sm text-pretty">
                  {t.nota}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-clay mt-4 text-pretty">
          Nota: tiempos de agencia dependen de Shalom (varían por ciudad). Para
          zonas alejadas coordinamos por WhatsApp antes de despachar.
        </p>
      </section>

      {/* ────────────────── PROCESO ────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 pb-16">
        <h2 className="font-serif text-2xl md:text-3xl text-ink italic mb-6">
          El proceso, sin misterios.
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROCESO.map((p) => (
            <li
              key={p.orden}
              className="bg-surface border border-[--border] rounded-lg p-5 flex gap-4"
            >
              <span className="font-serif italic text-3xl text-champagne-dark shrink-0 leading-none">
                {p.orden}
              </span>
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-ink leading-tight">
                  {p.titulo}
                </h3>
                <p className="text-sm text-clay text-pretty">{p.detalle}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ────────────────── DEVOLUCIONES ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-16">
        <div className="bg-mist/50 border border-[--border] rounded-lg p-6 md:p-8 space-y-5">
          <div>
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              Devoluciones
            </span>
            <h2 className="font-serif text-2xl md:text-3xl text-ink italic mt-2">
              7 días para cambios.
            </h2>
          </div>

          <div className="space-y-4 text-sm text-clay text-pretty">
            <p>
              <strong className="text-ink">Qué cambiamos:</strong> productos con
              defecto de fábrica, envío equivocado o daño durante el transporte
              (siempre y cuando conserves la caja de envío como evidencia).
            </p>
            <p>
              <strong className="text-ink">Qué no cambiamos:</strong> productos
              abiertos, usados o con el sello de garantía roto —{" "}
              <em>salvo que el motivo sea defecto de fábrica</em>. Cosmética con
              piel comprometida no puede reingresar al stock por normativa
              sanitaria.
            </p>
            <p>
              <strong className="text-ink">Cómo empezamos el cambio:</strong>{" "}
              escribinos por{" "}
              <Link
                href="https://wa.me/51967456364"
                className="text-ink underline underline-offset-4"
              >
                WhatsApp
              </Link>{" "}
              dentro de los 7 días de recibido con foto del producto y número
              de pedido. Coordinamos el retorno por la misma vía en la que
              llegó (agencia Shalom o Lima domicilio).
            </p>
            <p>
              <strong className="text-ink">Reembolsos:</strong> emitimos nota de
              crédito o devolución al medio de pago original (5-10 días
              hábiles según banco).
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────── CTA ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-24 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-[--border] pt-10">
        <p className="text-clay text-sm text-pretty">
          ¿Tenés una duda puntual sobre tu zona o pedido? Consultanos por
          WhatsApp — respondemos en el día.
        </p>
        <Link href="/cosmetic/contacto" className="btn-outline text-sm">
          Contactar
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
