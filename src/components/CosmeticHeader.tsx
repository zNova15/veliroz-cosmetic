"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { useUIStore } from "@/lib/uiStore";

/* ============================================================
   CosmeticHeader — nav sticky reutilizable para todas las páginas
   todas las rutas del sitio (montado una sola vez en el RootLayout).
   - Logo Veliroz Cosmetic
   - Links: Productos, Rutinas, Marcas, Diario
   - Iconos: wishlist (badge count), carrito (badge count → abre CartDrawer)
   - Menú mobile hamburguesa (usa useUIStore)
   Auto-detecta el link activo con usePathname (o override vía prop).
   ============================================================ */

type NavKey = "productos" | "rutinas" | "marcas" | "blog";

interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  /** Prefijos de path que activan este link (además del exacto). */
  matchPrefix: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "productos",
    href: "/productos",
    label: "Productos",
    matchPrefix: ["/productos", "/producto"],
  },
  {
    key: "rutinas",
    href: "/rutinas",
    label: "Rutinas",
    matchPrefix: ["/rutinas", "/rutina"],
  },
  {
    key: "marcas",
    href: "/marcas",
    label: "Marcas",
    matchPrefix: ["/marcas", "/marca"],
  },
  {
    key: "blog",
    href: "/blog",
    label: "Diario",
    matchPrefix: ["/blog"],
  },
];

interface Props {
  /** Override manual del link activo. Si se omite, se deduce de usePathname. */
  current?: NavKey | null;
}

function deriveCurrent(pathname: string | null): NavKey | null {
  if (!pathname) return null;
  for (const item of NAV_ITEMS) {
    if (item.matchPrefix.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      return item.key;
    }
  }
  return null;
}

export function CosmeticHeader({ current }: Props = {}) {
  const pathname = usePathname();
  const active: NavKey | null = current ?? deriveCurrent(pathname);

  const openCart = useUIStore((s) => s.openCart);
  const mobileMenuOpen = useUIStore((s) => s.mobileMenuOpen);
  const toggleMobileMenu = useUIStore((s) => s.toggleMobileMenu);
  const closeMobileMenu = useUIStore((s) => s.closeMobileMenu);

  // Badges — evitamos SSR/hydration mismatch mostrando "" hasta montar.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cartCount = useCartStore((s) =>
    s.items.reduce((acc, it) => acc + it.cantidad, 0)
  );
  const wishlistCount = useWishlistStore((s) => s.items.length);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-cream/85 backdrop-blur-md border-b border-[--border]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0"
            onClick={closeMobileMenu}
          >
            {/* Mismo monograma que el favicon (src/app/icon.svg): si el
                header y la pestaña muestran letras distintas, la marca se
                lee como dos. Va inline y no como <img> para que no
                parpadee en la primera carga. */}
            {/* La gota de sérum, misma imagen que el favicon y el footer.
                Es un PNG y no un SVG inline porque la pieza tiene degradado,
                brillo y grano: vectorizarla la aplanaría y perdería
                justamente lo que la hace ver premium. */}
            <Image
              src="/logo.png"
              alt="Veliroz"
              width={40}
              height={40}
              /* Sin la caja oscura detrás, la gota pesa menos: va un punto
                 más grande para equilibrar con el wordmark. */
              className="w-9 h-9 shrink-0 -ml-0.5"
              priority
            />
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-serif text-ink text-base font-semibold tracking-tight">
                Veliroz
              </span>
              <span className="text-[9px] tracking-[0.18em] text-clay uppercase mt-1">
                Cosmetic
              </span>
            </div>
          </Link>

          {/* Nav desktop */}
          <nav
            aria-label="Principal"
            className="hidden md:flex items-center gap-8 text-sm"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "text-ink font-medium"
                      : "text-clay hover:text-ink transition-colors"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href="/cuenta"
              className="text-clay hover:text-ink text-sm hidden md:inline"
            >
              Iniciar sesión
            </Link>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative w-10 h-10 flex items-center justify-center text-ink hover:text-rose-deep transition-colors rounded-full"
              aria-label={`Ver favoritos${
                mounted && wishlistCount > 0 ? ` (${wishlistCount})` : ""
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              {mounted && wishlistCount > 0 && <Badge count={wishlistCount} />}
            </Link>

            {/* Carrito */}
            <button
              type="button"
              onClick={openCart}
              className="relative w-10 h-10 flex items-center justify-center text-ink hover:text-rose-deep transition-colors rounded-full"
              aria-label={`Abrir carrito${
                mounted && cartCount > 0 ? ` (${cartCount})` : ""
              }`}
              aria-haspopup="dialog"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {mounted && cartCount > 0 && <Badge count={cartCount} />}
            </button>

            {/* Hamburguesa mobile */}
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden w-10 h-10 flex items-center justify-center text-ink"
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
            >
              {mobileMenuOpen ? (
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Panel mobile */}
        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.div
              id="mobile-nav-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="md:hidden border-t border-[--border] bg-cream overflow-hidden"
            >
              <nav
                aria-label="Menú móvil"
                className="flex flex-col px-6 py-4 gap-1"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = active === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={closeMobileMenu}
                      aria-current={isActive ? "page" : undefined}
                      className={
                        "px-2 py-3 rounded-md text-base transition-colors " +
                        (isActive
                          ? "text-ink font-medium bg-mist/50"
                          : "text-clay hover:text-ink hover:bg-mist/40")
                      }
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <div className="divider-champagne my-2" />
                <Link
                  href="/cuenta"
                  onClick={closeMobileMenu}
                  className="px-2 py-3 text-sm text-clay hover:text-ink"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/wishlist"
                  onClick={closeMobileMenu}
                  className="px-2 py-3 text-sm text-clay hover:text-ink"
                >
                  Favoritos
                  {mounted && wishlistCount > 0 && (
                    <span className="ml-2 font-mono text-[10px] text-taupe">
                      ({wishlistCount})
                    </span>
                  )}
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Spacer para que el contenido no quede debajo del header fijo */}
      <div className="h-[68px]" aria-hidden />
    </>
  );
}

/* Badge circular con el count. Máx 99+. */
function Badge({ count }: { count: number }) {
  const text = count > 99 ? "99+" : String(count);
  return (
    <span
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-deep text-cream text-[10px] font-mono font-medium flex items-center justify-center leading-none"
      aria-hidden
    >
      {text}
    </span>
  );
}
