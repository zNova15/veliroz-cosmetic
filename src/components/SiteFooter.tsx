import Image from "next/image";
import Link from "next/link";

/* ============================================================
   Footer compartido para todo el sitio.
   El header/nav lo monta el RootLayout con <CosmeticHeader />,
   así que las páginas sólo agregan este footer al final.
   Server component — sin JS.
   ============================================================ */

export function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto px-6 md:px-10 pt-20 pb-10 mt-8 border-t border-[--border]">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-sm">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center gap-2.5">
            {/* Misma gota que el favicon y el header: un solo símbolo. */}
            <Image
              src="/logo.png"
              alt="Veliroz"
              width={40}
              height={40}
              /* Sin la caja oscura detrás, la gota pesa menos: va un punto
                 más grande para equilibrar con el wordmark. */
              className="w-9 h-9 shrink-0 -ml-0.5"
            />
            <div className="flex flex-col leading-none">
              <span className="font-serif text-ink text-base font-semibold">
                Veliroz Cosmetic
              </span>
              <span className="text-[9px] tracking-[0.18em] text-clay uppercase mt-1">
                Skincare curado · Perú
              </span>
            </div>
          </div>
          <p className="text-clay max-w-md leading-relaxed text-pretty">
            Curamos las marcas que sí funcionan y te armamos la rutina. Operado
            desde Cajamarca, entregamos a todo el Perú.
          </p>
          <div className="flex gap-4 items-center pt-2">
            <Link
              href="https://wa.me/51967456364"
              className="text-clay hover:text-ink text-sm underline underline-offset-4"
            >
              WhatsApp +51 967 456 364
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            Explora
          </h4>
          <ul className="space-y-2 text-clay">
            <li>
              <Link href="/productos" className="hover:text-ink">
                Productos
              </Link>
            </li>
            <li>
              <Link href="/rutinas" className="hover:text-ink">
                Rutinas
              </Link>
            </li>
            <li>
              <Link href="/marcas" className="hover:text-ink">
                Marcas
              </Link>
            </li>
            <li>
              <Link href="/quiz" className="hover:text-ink">
                Quiz de piel
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-ink">
                Diario
              </Link>
            </li>
            <li>
              <Link href="/referidos" className="hover:text-ink">
                Refiere y gana
              </Link>
            </li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            Cuenta
          </h4>
          <ul className="space-y-2 text-clay">
            <li>
              <Link href="/cuenta" className="hover:text-ink">
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link href="/mis-pedidos" className="hover:text-ink">
                Mis pedidos
              </Link>
            </li>
            <li>
              <Link href="/envios" className="hover:text-ink">
                Envíos y devoluciones
              </Link>
            </li>
            <li>
              <Link href="/contacto" className="hover:text-ink">
                Contacto
              </Link>
            </li>
            <li>
              <Link
                href="/libro-reclamaciones"
                className="hover:text-ink"
              >
                Libro de reclamaciones
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-[--border] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-clay">
        <p>© 2026 Veliroz Cosmetic · Sub-marca de Veliroz.</p>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/terminos" className="hover:text-ink">
            Términos y condiciones
          </Link>
          <Link href="/privacidad" className="hover:text-ink">
            Privacidad
          </Link>
          <Link href="https://flores.veliroz.com" className="hover:text-ink">
            Veliroz Flores Eternas
          </Link>
          <Link
            href="https://flores.veliroz.com/chocotejas"
            className="hover:text-ink"
          >
            Chocotejas Veliroz
          </Link>
        </div>
      </div>
    </footer>
  );
}
