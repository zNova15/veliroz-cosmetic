import Link from "next/link";

/* ============================================================
   Veliroz Cosmetic — Landing placeholder (Sprint 1)
   Estilo editorial cream+ink+rose (Aesop/Rare Beauty inspiration).
   Datos hardcoded para MVP; en Sprint 2 se conectan a Supabase.
   ============================================================ */

const PRODUCTOS_HERO = [
  {
    slug: "the-ordinary-niacinamida",
    marca: "The Ordinary",
    nombre: "Niacinamida 10% + Zinc 1%",
    volumen: "30 ml",
    precio: 59,
    precioAntes: 75,
    tipo: "Sérum",
    para: "Poros · Grasitud",
    swatch: "#F7EFE6",
    hero: true,
  },
  {
    slug: "the-ordinary-hyaluronic-acid",
    marca: "The Ordinary",
    nombre: "Hyaluronic Acid 2% + B5",
    volumen: "30 ml",
    precio: 55,
    tipo: "Sérum",
    para: "Hidratación profunda",
    swatch: "#EEE4D8",
  },
  {
    slug: "cerave-espuma-limpiadora",
    marca: "CeraVe",
    nombre: "Espuma Limpiadora piel Normal-Grasa",
    volumen: "236 ml",
    precio: 54,
    tipo: "Limpiador",
    para: "Diario · Ceramidas",
    swatch: "#E9F0EC",
  },
  {
    slug: "cerave-locion-hidratante-sa",
    marca: "CeraVe",
    nombre: "Loción Hidratante SA para textura irregular",
    volumen: "236 ml",
    precio: 68,
    tipo: "Hidratante",
    para: "Piel áspera · Queratosis",
    swatch: "#EAEEF3",
  },
  {
    slug: "beauty-of-joseon-relief-sun",
    marca: "Beauty of Joseon",
    nombre: "Relief Sun · Rice + Probiotics SPF 50+",
    volumen: "50 ml",
    precio: 65,
    tipo: "Protector solar",
    para: "Diario · Sin residuo blanco",
    swatch: "#F4EDDD",
    hero: true,
  },
  {
    slug: "cosrx-snail-mucin",
    marca: "COSRX",
    nombre: "Advanced Snail 96 Mucin Power Essence",
    volumen: "100 ml",
    precio: 59,
    tipo: "Essence",
    para: "Reparación · Cicatrices",
    swatch: "#EFECE4",
    hero: true,
  },
  {
    slug: "xhekpon-crema-cuello",
    marca: "Xhekpon",
    nombre: "Crema Cuello y Rostro · Colágeno",
    volumen: "40 ml",
    precio: 49,
    tipo: "Anti-edad",
    para: "Cuello · Escote",
    swatch: "#F3E8E8",
  },
];

export default function CosmeticLanding() {
  return (
    <main className="min-h-screen">
      {/* ────────────────── NAV ────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-cream/85 backdrop-blur-md border-b border-[--border]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center font-serif italic text-lg font-bold">
              V
            </span>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-serif text-ink text-base font-semibold tracking-tight">
                Veliroz
              </span>
              <span className="text-[9px] tracking-[0.18em] text-clay uppercase mt-1">
                Cosmetic
              </span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link href="/cosmetic/productos" className="text-clay hover:text-ink transition-colors">
              Productos
            </Link>
            <Link href="/cosmetic/rutinas" className="text-clay hover:text-ink transition-colors">
              Rutinas
            </Link>
            <Link href="/cosmetic/marcas" className="text-clay hover:text-ink transition-colors">
              Marcas
            </Link>
            <Link href="/cosmetic/blog" className="text-clay hover:text-ink transition-colors">
              Diario
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/cosmetic/cuenta" className="text-clay hover:text-ink text-sm hidden md:inline">
              Iniciar sesión
            </Link>
            <Link
              href="/cosmetic/carrito"
              className="relative text-ink hover:text-rose-deep transition-colors"
              aria-label="Ver carrito"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"/>
              </svg>
            </Link>
          </div>
        </div>
      </nav>
      <div className="h-[68px]" />

      {/* ────────────────── HERO ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pt-16 md:pt-24 pb-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7 space-y-8">
          <span className="inline-block text-[10px] tracking-[0.24em] uppercase text-taupe font-medium">
            · Skincare clínico y honesto · Perú ·
          </span>
          <h1 className="font-serif text-[--text-hero] leading-[0.95] text-ink text-balance">
            La rutina no es{" "}
            <span className="font-italic-serif text-rose-deep">un ritual</span>
            . Es un{" "}
            <span className="font-italic-serif text-rose-deep">
              método
            </span>
            .
          </h1>
          <p className="text-lg text-clay max-w-xl leading-relaxed text-pretty">
            Curamos las marcas que sí funcionan — The Ordinary, CeraVe, Beauty of
            Joseon, COSRX — y armamos rutinas concretas para tu piel. Envío
            nacional Shalom · entrega Lima y Cajamarca.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href="/cosmetic/productos" className="btn-primary">
              Ver productos
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </Link>
            <Link href="/cosmetic/quiz" className="btn-outline">
              Quiz · ¿Qué le hace bien a tu piel?
            </Link>
          </div>

          <div className="flex flex-wrap gap-8 pt-8 text-xs text-clay border-t border-[--border] pt-8">
            <div className="space-y-1">
              <p className="font-mono text-ink text-lg">5</p>
              <p>Marcas curadas</p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-ink text-lg">7</p>
              <p>Productos hero</p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-ink text-lg">Shalom</p>
              <p>Envío nacional S/12</p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-ink text-lg">SUNAT</p>
              <p>Boleta electrónica</p>
            </div>
          </div>
        </div>

        {/* Hero visual — placeholder editorial (Sprint 2 → 3D model-viewer) */}
        <div className="md:col-span-5">
          <div className="relative aspect-[4/5] rounded-md overflow-hidden bg-gradient-to-br from-cream-2 via-mist to-rose/20 border border-[--border] p-10 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                Producto en foco
              </span>
              <h3 className="font-serif text-2xl text-ink leading-tight">
                Niacinamida 10% + Zinc 1%
              </h3>
              <p className="text-xs text-clay">The Ordinary · 30 ml</p>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-taupe">
                  Desde
                </p>
                <p className="font-serif text-3xl text-ink">S/. 59.00</p>
              </div>
              <Link
                href="/cosmetic/producto/the-ordinary-niacinamida-10-zinc-1"
                className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep"
              >
                Ver ficha →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────── BANNER OPERADO ────────────────── */}
      <section className="max-w-5xl mx-auto px-6 md:px-10 pb-12">
        <div className="bg-surface rounded-lg border border-[--border] p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe shrink-0">
            Operado desde Cajamarca
          </span>
          <p className="text-sm text-clay flex-1 text-pretty">
            Preparamos tu pedido en Cajamarca y enviamos a todo el Perú por{" "}
            <strong className="text-ink">Shalom-agencia (S/12)</strong>. En{" "}
            <strong className="text-ink">Lima</strong> también entregamos a
            domicilio (S/18) con nuestra colaboradora en Santiago de Surco.
          </p>
        </div>
      </section>

      {/* ────────────────── PRODUCTOS HERO ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16">
        <div className="flex items-end justify-between mb-10 gap-6">
          <div className="space-y-2">
            <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              Nuestra selección · 7 hero
            </span>
            <h2 className="font-serif text-[--text-display] text-ink leading-tight">
              Empezá acá.
            </h2>
          </div>
          <Link
            href="/cosmetic/productos"
            className="hidden md:inline text-sm text-clay hover:text-ink underline underline-offset-4"
          >
            Todos los productos →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {PRODUCTOS_HERO.map((p) => (
            <article key={p.slug} className="prod-card">
              <div
                className="aspect-[4/5] flex items-center justify-center relative"
                style={{ background: p.swatch }}
              >
                {p.hero && (
                  <span className="absolute top-4 left-4 font-mono text-[9px] tracking-[0.2em] uppercase text-ink bg-cream px-2 py-1 rounded-sm">
                    · Hero ·
                  </span>
                )}
                <div className="text-center px-6">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe mb-3">
                    {p.tipo}
                  </p>
                  <p className="font-serif text-xl text-ink italic leading-tight">
                    {p.marca}
                  </p>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col gap-3">
                <div className="space-y-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-taupe">
                    {p.marca}
                  </p>
                  <h3 className="font-serif text-base text-ink leading-snug text-pretty">
                    {p.nombre}
                  </h3>
                  <p className="text-xs text-clay">
                    {p.volumen} · {p.para}
                  </p>
                </div>
                <div className="flex items-end justify-between pt-3 mt-auto border-t border-[--border]">
                  <div>
                    {p.precioAntes && (
                      <p className="font-mono text-[10px] text-stone line-through">
                        S/. {p.precioAntes.toFixed(2)}
                      </p>
                    )}
                    <p className="font-mono text-lg text-ink">
                      S/. {p.precio.toFixed(2)}
                    </p>
                  </div>
                  <Link
                    href={`/cosmetic/producto/${p.slug}`}
                    className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep"
                  >
                    Ver →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 text-center md:hidden">
          <Link
            href="/cosmetic/productos"
            className="text-sm text-clay hover:text-ink underline underline-offset-4"
          >
            Todos los productos →
          </Link>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-10">
        <div className="divider-champagne" />
      </div>

      {/* ────────────────── RUTINAS CURADAS ────────────────── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-20">
        <div className="text-center mb-14 space-y-3">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            No compres productos. Comprá rutinas.
          </span>
          <h2 className="font-serif text-[--text-display] text-ink">
            Empezá por acá según tu piel.
          </h2>
          <p className="text-clay max-w-2xl mx-auto text-pretty">
            Cada rutina es una selección corta — limpieza, activo y protección —
            pensada para un objetivo específico. Sin sobrecarga, sin gastar de
            más.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              nombre: "Primera vez",
              tag: "Para arrancar bien",
              precio: "S/. 145",
              lineas: ["Limpiador · CeraVe", "Hidratante · CeraVe", "Protector · Beauty of Joseon"],
              accent: "#F7EFE6",
            },
            {
              nombre: "Acné + poros",
              tag: "Grasitud controlada",
              precio: "S/. 165",
              lineas: ["Limpiador SA · CeraVe", "Niacinamida · The Ordinary", "Protector · Beauty of Joseon"],
              accent: "#EEE4D8",
            },
            {
              nombre: "Antiedad honesta",
              tag: "Primeras líneas",
              precio: "S/. 175",
              lineas: ["HA + B5 · The Ordinary", "Snail Mucin · COSRX", "Xhekpon · cuello"],
              accent: "#F3E8E8",
            },
          ].map((r) => (
            <article
              key={r.nombre}
              className="rounded-lg p-8 flex flex-col gap-5 border border-[--border]"
              style={{ background: r.accent }}
            >
              <div className="space-y-1">
                <span className="font-mono text-[9px] tracking-[0.24em] uppercase text-taupe">
                  {r.tag}
                </span>
                <h3 className="font-serif text-3xl text-ink italic leading-tight">
                  {r.nombre}
                </h3>
              </div>
              <ul className="space-y-2 text-sm text-clay">
                {r.lineas.map((l) => (
                  <li key={l} className="flex items-start gap-2">
                    <span className="text-champagne-dark mt-1.5 shrink-0">◦</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-4 mt-auto border-t border-[--border] flex items-center justify-between">
                <span className="font-mono text-lg text-ink">{r.precio}</span>
                <Link
                  href={`/cosmetic/rutinas/${r.nombre.toLowerCase().replace(/ /g, "-")}`}
                  className="text-xs text-ink underline underline-offset-4 hover:text-rose-deep"
                >
                  Ver rutina →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ────────────────── MARCAS ────────────────── */}
      <section className="bg-surface py-16 border-y border-[--border]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 text-center space-y-8">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            Nuestras marcas
          </span>
          <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
            {[
              "The Ordinary",
              "CeraVe",
              "Beauty of Joseon",
              "COSRX",
              "Xhekpon",
            ].map((m) => (
              <Link
                key={m}
                href={`/cosmetic/marcas/${m.toLowerCase().replace(/ /g, "-")}`}
                className="font-serif text-xl md:text-2xl text-ink italic hover:text-rose-deep transition-colors"
              >
                {m}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────── FOOTER ────────────────── */}
      <footer className="max-w-7xl mx-auto px-6 md:px-10 pt-20 pb-10 mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-sm">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-ink text-cream flex items-center justify-center font-serif italic font-bold">
                V
              </span>
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
              Curamos las marcas que sí funcionan y te armamos la rutina.
              Operado desde Cajamarca, entregamos a todo el Perú.
            </p>
            <div className="flex gap-4 items-center pt-2">
              <Link href="https://wa.me/51967456364" className="text-clay hover:text-ink text-sm underline underline-offset-4">
                WhatsApp +51 967 456 364
              </Link>
            </div>
          </div>
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              Explora
            </h4>
            <ul className="space-y-2 text-clay">
              <li><Link href="/cosmetic/productos" className="hover:text-ink">Productos</Link></li>
              <li><Link href="/cosmetic/rutinas" className="hover:text-ink">Rutinas</Link></li>
              <li><Link href="/cosmetic/marcas" className="hover:text-ink">Marcas</Link></li>
              <li><Link href="/cosmetic/quiz" className="hover:text-ink">Quiz de piel</Link></li>
              <li><Link href="/cosmetic/blog" className="hover:text-ink">Diario</Link></li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              Cuenta
            </h4>
            <ul className="space-y-2 text-clay">
              <li><Link href="/cosmetic/cuenta" className="hover:text-ink">Iniciar sesión</Link></li>
              <li><Link href="/cosmetic/mis-pedidos" className="hover:text-ink">Mis pedidos</Link></li>
              <li><Link href="/cosmetic/envios" className="hover:text-ink">Envíos y devoluciones</Link></li>
              <li><Link href="/cosmetic/contacto" className="hover:text-ink">Contacto</Link></li>
              <li><Link href="/cosmetic/libro-reclamaciones" className="hover:text-ink">Libro de reclamaciones</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[--border] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-clay">
          <p>© 2026 Veliroz Cosmetic · Sub-marca de Veliroz.</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-ink">Veliroz Flores Eternas</Link>
            <Link href="/chocotejas" className="hover:text-ink">Chocotejas Veliroz</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
