import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { ConsultaPedido } from "@/components/ConsultaPedido";
import { ESTADOS_PEDIDO } from "@/lib/pedido-estados";

/* ============================================================
   /mis-pedidos — seguimiento de pedido sin sesión.

   Por qué existe: la linkean el footer de la landing y los correos
   transaccionales PedidoPagado / PedidoEntregado. Un 404 desde un
   correo de post-venta es el peor lugar para tener uno.

   Qué hace: consulta por código + correo (ver
   app/actions/consulta-pedido.ts). Como la RLS de `pedidos` no
   permite SELECT anónimo, hoy el resultado normal es "no lo pude
   leer" → derivación a WhatsApp con el código pre-cargado. La
   página está escrita para que eso NO se sienta como una falla:
   la línea de tiempo de estados se explica igual, sin depender de
   la consulta.

   noindex: es una pantalla de post-venta, no de captación.
   ============================================================ */

export const metadata: Metadata = {
  title: "Mis pedidos",
  description:
    "Consulta el estado de tu pedido Veliroz Cosmetic con tu código y tu correo, o escríbenos por WhatsApp y te lo contamos al toque.",
  alternates: { canonical: "/mis-pedidos" },
  robots: { index: false, follow: true },
};

const WA_NUMERO = "51967456364";

export default function MisPedidosPage() {
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
          <span className="text-ink">Mis pedidos</span>
        </nav>

        <div className="max-w-2xl space-y-3">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · Seguimiento ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            ¿Dónde está{" "}
            <span className="font-italic-serif text-rose-deep">mi pedido?</span>
          </h1>
          <p className="text-clay text-pretty leading-relaxed">
            Pega el código que te llegó por correo y el correo con el que
            compraste. Si no logramos mostrarte el estado aquí, te pasamos
            directo a WhatsApp — que es donde de verdad te respondemos.
          </p>
        </div>
      </section>

      {/* ────────────────── CONSULTA ────────────────── */}
      <section className="max-w-3xl mx-auto px-6 md:px-10 pb-12">
        <ConsultaPedido />
      </section>

      {/* ────────────────── LÍNEA DE TIEMPO ────────────────── */}
      <section className="max-w-3xl mx-auto px-6 md:px-10 pb-16">
        <div className="space-y-2 mb-8">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            Las cinco etapas
          </span>
          <h2 className="font-serif text-2xl md:text-3xl text-ink italic">
            Por dónde pasa tu pedido.
          </h2>
          <p className="text-sm text-clay text-pretty">
            Cada vez que tu pedido cambia de etapa te llega un correo. Si
            estás en pre-venta, sumale los 5 a 7 días de cierre de lote entre
            <span className="text-ink"> Pagado</span> y
            <span className="text-ink"> Preparando</span>.
          </p>
        </div>

        <ol className="relative border-l border-[--border-2] ml-2">
          {ESTADOS_PEDIDO.map((e, i) => (
            <li key={e.key} className="relative pl-8 pb-8 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-champagne-dark"
              />
              <div className="space-y-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[10px] text-taupe">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-serif text-lg text-ink leading-tight">
                    {e.label}
                  </h3>
                </div>
                <p className="text-sm text-clay text-pretty leading-relaxed">
                  {e.detalle}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="text-xs text-clay text-pretty mt-6 pt-6 border-t border-[--border]">
          Un pedido también puede quedar{" "}
          <strong className="text-ink">cancelado</strong> — porque lo pediste
          tú, porque el pago nunca se acreditó o porque el lote no llegó. En
          los tres casos te escribimos antes, y si ya habías pagado te
          devolvemos el 100%.
        </p>
      </section>

      {/* ────────────────── AYUDA ────────────────── */}
      <section className="max-w-3xl mx-auto px-6 md:px-10 pb-24">
        <div className="bg-mist/50 border border-[--border] rounded-lg p-6 md:p-8 space-y-5">
          <div className="space-y-1">
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              Preguntas de siempre
            </span>
            <h2 className="font-serif text-2xl text-ink italic">
              Si algo no cuadra.
            </h2>
          </div>

          <div className="space-y-4 text-sm text-clay text-pretty">
            <p>
              <strong className="text-ink">Perdí el código.</strong> Busca en tu
              correo “Veliroz” o revisa spam. Si no aparece, escríbenos por
              WhatsApp con tu nombre y la fecha de compra y lo encontramos
              nosotros.
            </p>
            <p>
              <strong className="text-ink">Pagué con Yape o Plin.</strong> El
              pedido queda en <em>Recibido</em> hasta que validamos el voucher.
              Mándalo por WhatsApp y pasa a <em>Pagado</em> el mismo día.
            </p>
            <p>
              <strong className="text-ink">Quiero cambiar la dirección.</strong>{" "}
              Se puede mientras el pedido no esté <em>En reparto</em>.
              Escríbenos cuanto antes.
            </p>
            <p>
              <strong className="text-ink">¿Y mi cuenta?</strong> El historial
              con sesión iniciada llega en el próximo release — mira{" "}
              <Link
                href="/cuenta"
                className="text-ink underline underline-offset-4"
              >
                Mi cuenta
              </Link>
              . Mientras tanto, esta página y WhatsApp son el camino.
            </p>
            <p>
              <strong className="text-ink">Llegó mal o incompleto.</strong>{" "}
              Tienes 7 días desde la entrega: mira{" "}
              <Link
                href="/envios"
                className="text-ink underline underline-offset-4"
              >
                envíos y devoluciones
              </Link>{" "}
              o presenta tu caso en el{" "}
              <Link
                href="/libro-reclamaciones"
                className="text-ink underline underline-offset-4"
              >
                libro de reclamaciones
              </Link>
              .
            </p>
          </div>

          <div className="pt-4 border-t border-[--border] flex flex-col sm:flex-row sm:items-center gap-3">
            <a
              href={`https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(
                "Hola Veliroz Cosmetic, quiero consultar por mi pedido.",
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm justify-center"
            >
              Escribir por WhatsApp
            </a>
            <Link href="/productos" className="btn-outline text-sm justify-center">
              Seguir comprando
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
