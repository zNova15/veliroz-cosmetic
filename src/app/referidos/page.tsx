import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { ReferidoPanel } from "@/components/ReferidoPanel";
import { getSupabase } from "@/lib/supabase";

/* ============================================================
   /referidos — programa de referidos.

   Los números del programa (%, tope, crédito, piso) se leen de
   `referidos_config` en el server, así la página nunca anuncia un
   descuento distinto al que el checkout va a aplicar. Si la tabla no
   responde, se cae a los defaults de la migración 018 — que son los
   mismos valores sembrados, así que el copy sigue siendo correcto.
   ============================================================ */

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Recomienda Veliroz y gana crédito",
  description:
    "Comparte tu código: tu amiga se lleva 10% de descuento en su primera compra y tú ganas S/20 de crédito cuando ella recibe su pedido.",
  alternates: { canonical: "/referidos" },
};

interface Config {
  descuento_pct: number;
  descuento_tope: number;
  credito_por_referido: number;
  min_subtotal: number;
}

const DEFAULTS: Config = {
  descuento_pct: 10,
  descuento_tope: 30,
  credito_por_referido: 20,
  min_subtotal: 89,
};

async function fetchConfig(): Promise<Config> {
  try {
    const { data, error } = await getSupabase()
      .from("referidos_config")
      .select("descuento_pct, descuento_tope, credito_por_referido, min_subtotal")
      .eq("id", true)
      .maybeSingle();
    if (error || !data) return DEFAULTS;
    return {
      descuento_pct: Number(data.descuento_pct),
      descuento_tope: Number(data.descuento_tope),
      credito_por_referido: Number(data.credito_por_referido),
      min_subtotal: Number(data.min_subtotal),
    };
  } catch {
    return DEFAULTS;
  }
}

export default async function ReferidosPage() {
  const cfg = await fetchConfig();

  const pasos = [
    {
      n: "01",
      titulo: "Busca tu código",
      texto:
        "Pon el email con el que compraste. Tu código se activa con tu primera compra.",
    },
    {
      n: "02",
      titulo: "Compártelo",
      texto:
        "Mándalo por WhatsApp a quien le venga bien. No hay límite de personas.",
    },
    {
      n: "03",
      titulo: "Ella ahorra, tú ganas",
      texto: `Tu amiga se lleva ${cfg.descuento_pct}% off y tú S/${cfg.credito_por_referido} de crédito cuando ella paga.`,
    },
  ];

  return (
    <>
      <main className="min-h-screen">
        {/* ───── HERO ───── */}
        <section className="border-b border-[--border] bg-cream">
          <div className="max-w-5xl mx-auto px-6 md:px-10 pt-8 pb-14 md:pt-12 md:pb-20">
            <nav
              aria-label="Migas de pan"
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-8"
            >
              <Link href="/" className="hover:text-ink">
                Inicio
              </Link>
              <span className="mx-2">·</span>
              <span className="text-ink">Referidos</span>
            </nav>

            <div className="max-w-2xl space-y-5">
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Programa de referidos
              </span>
              <h1 className="font-serif text-[--text-display] text-ink leading-[1.02] text-balance">
                La mejor recomendación es la de alguien que ya lo usa.
              </h1>
              <p className="text-clay text-lg leading-relaxed text-pretty">
                Comparte tu código: tu amiga se lleva{" "}
                <strong className="text-ink">{cfg.descuento_pct}% off</strong> en
                su primera compra y tú ganas{" "}
                <strong className="text-ink">
                  S/{cfg.credito_por_referido} de crédito
                </strong>{" "}
                cuando ella paga su pedido.
              </p>
            </div>
          </div>
        </section>

        {/* ───── CÓMO FUNCIONA ───── */}
        <section className="max-w-5xl mx-auto px-6 md:px-10 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {pasos.map((p) => (
              <div key={p.n} className="space-y-3">
                <span className="font-mono text-[10px] tracking-[0.24em] text-champagne-dark">
                  {p.n}
                </span>
                <h2 className="font-serif text-2xl text-ink italic leading-tight">
                  {p.titulo}
                </h2>
                <p className="text-sm text-clay leading-relaxed text-pretty">
                  {p.texto}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ───── PANEL ───── */}
        <section className="max-w-3xl mx-auto px-6 md:px-10 pb-16">
          <ReferidoPanel />
        </section>

        {/* ───── LETRA CHICA ─────
            Explícita a propósito: un programa de referidos con reglas
            escondidas genera más reclamos que ventas. */}
        <section className="max-w-3xl mx-auto px-6 md:px-10 pb-24">
          <div className="border-t border-[--border] pt-8 space-y-3">
            <h2 className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
              Las reglas, sin vueltas
            </h2>
            <ul className="space-y-2 text-sm text-clay">
              {[
                `El descuento es ${cfg.descuento_pct}% con un tope de S/${cfg.descuento_tope}, sobre pedidos de S/${cfg.min_subtotal} o más.`,
                "Solo aplica en la primera compra de la persona que usa el código.",
                "No puedes usar tu propio código.",
                `Tu crédito de S/${cfg.credito_por_referido} se acredita cuando el pedido de tu amiga queda pagado. Si se cancela, no se acredita.`,
                "No hay límite de personas que pueden usar tu código.",
                "Para usar tu crédito, avísanos por WhatsApp al hacer tu pedido y lo descontamos del total.",
              ].map((regla, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-champagne-dark mt-1.5 shrink-0">◦</span>
                  <span className="text-pretty">{regla}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
