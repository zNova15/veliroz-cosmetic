import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { AbrirCarritoButton } from "@/components/AbrirCarritoButton";

/* ============================================================
   /cuenta — stub sin auth cableada.
   Se muestra el formulario de sesión (visual only, sin submit real)
   + tabla vacía de "mis pedidos" + nota explícita de que la
   próxima release cablea Firebase/Supabase auth (misma decisión
   del CRM Veliroz).
   Tags noindex — no queremos SEO en placeholders.
   ============================================================ */

export const metadata: Metadata = {
  title: "Mi cuenta",
  description:
    "Inicia sesión para ver tus pedidos, comprobantes y direcciones. Auth se cablea en el próximo release.",
  alternates: { canonical: "/cuenta" },
  robots: { index: false, follow: true },
};

export default function CuentaPage() {
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
          <span className="text-ink">Cuenta</span>
        </nav>

        <div className="max-w-2xl space-y-3">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · Mi cuenta ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            Inicia sesión.
          </h1>
          <p className="text-clay text-pretty leading-relaxed">
            Guardamos tus pedidos, comprobantes electrónicos y direcciones
            para que la próxima compra sea de un click.
          </p>
        </div>
      </section>

      {/* ────────────────── AVISO ─────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-6">
        <div className="bg-mist/60 border border-[--border] rounded-lg p-5 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-champagne-dark shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-ink">
              Auth cableada en el próximo release.
            </p>
            <p className="text-clay text-pretty">
              Mientras tanto, compra como <strong>invitado</strong> desde el{" "}
              <AbrirCarritoButton className="text-ink underline underline-offset-4 hover:text-rose-deep cursor-pointer">
                carrito
              </AbrirCarritoButton>{" "}
              — el pedido se registra igual y te llegan boleta y confirmación
              por correo / WhatsApp.
            </p>
          </div>
        </div>
      </section>

      {/* ────────────────── LAYOUT 2 col ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ─── Login form (visual only) ─── */}
          {/* Sin `action`: el form es visual (todo disabled) y no debe navegar
              a ningún lado — apuntaba a /carrito, que no existe. */}
          <form
            className="bg-surface border border-[--border] rounded-lg p-6 space-y-5"
            aria-label="Iniciar sesión (deshabilitado — próximo release)"
          >
            <div>
              <h2 className="font-serif text-2xl text-ink italic">
                Ya tienes cuenta
              </h2>
              <p className="text-xs text-clay mt-1">
                Formulario visual — sesión aún no habilitada.
              </p>
            </div>

            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Correo
              </span>
              <input
                type="email"
                name="email"
                disabled
                placeholder="tu@correo.com"
                className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-mist/30 text-ink text-sm disabled:cursor-not-allowed disabled:opacity-70"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Contraseña
              </span>
              <input
                type="password"
                name="password"
                disabled
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-mist/30 text-ink text-sm disabled:cursor-not-allowed disabled:opacity-70"
              />
            </label>

            <button
              type="button"
              disabled
              className="btn-primary w-full justify-center opacity-40 cursor-not-allowed"
            >
              Iniciar sesión
            </button>

            <p className="text-xs text-clay text-center">
              ¿No tienes cuenta?{" "}
              <span className="text-taupe italic">Se habilita pronto</span>.
            </p>
          </form>

          {/* ─── Mis pedidos placeholder ─── */}
          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl text-ink italic">
                Mis pedidos
              </h2>
              <p className="text-xs text-clay mt-1">
                Historial y comprobantes electrónicos aparecerán aquí.
              </p>
            </div>

            <div className="bg-surface border border-[--border] rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 gap-2 px-4 py-2 bg-mist/50 font-mono text-[10px] tracking-[0.18em] uppercase text-taupe border-b border-[--border]">
                <span>Pedido</span>
                <span>Fecha</span>
                <span className="text-right">Total</span>
              </div>
              <div className="px-6 py-12 text-center space-y-3">
                <p className="text-sm text-clay">
                  Todavía no hay pedidos.
                </p>
                <Link
                  href="/productos"
                  className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep"
                >
                  Explorar productos →
                </Link>
              </div>
            </div>

            <div className="bg-surface border border-[--border] rounded-lg p-4 text-xs text-clay space-y-2">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Alternativa mientras tanto
              </p>
              <p className="text-pretty">
                Escríbenos por WhatsApp{" "}
                <Link
                  href="https://wa.me/51967456364"
                  className="text-ink underline underline-offset-4"
                >
                  +51 967 456 364
                </Link>{" "}
                y consultamos tu pedido por número de boleta.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
