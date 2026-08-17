import Link from "next/link";
import type { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";

/* ============================================================
   /cosmetic/pago/exito?codigo=PED-… — Server Component.
   - Lee ?codigo & fallback data (?total, ?email, ?pago) del URL.
   - Intenta enriquecer con Supabase (best-effort: la RLS puede
     bloquear anon; si falla, mostramos los datos del URL).
   - CTA: Volver al inicio · Enviar comprobante por WhatsApp.
   ============================================================ */

export const metadata: Metadata = {
  title: "Pedido confirmado",
  description: "Tu pedido Veliroz Cosmetic se registró con éxito.",
  robots: { index: false, follow: false },
};

const WA_NUM = "51967456364";

type SearchParams = Record<string, string | string[] | undefined>;

interface PedidoDetalle {
  pedido_codigo: string;
  cliente_email: string | null;
  cliente_nombre: string | null;
  metodo_pago: string | null;
  metodo_entrega: string | null;
  subtotal: number | null;
  descuento: number | null;
  costo_envio: number | null;
  total: number | null;
  estado: string | null;
  fecha_pedido: string | null;
}

function readSingle(sp: SearchParams, k: string): string | undefined {
  const v = sp[k];
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

async function fetchPedido(codigo: string): Promise<PedidoDetalle | null> {
  try {
    const { data, error } = await getSupabase()
      .from("pedidos")
      .select(
        "pedido_codigo, cliente_email, cliente_nombre, metodo_pago, metodo_entrega, subtotal, descuento, costo_envio, total, estado, fecha_pedido",
      )
      .eq("pedido_codigo", codigo)
      .maybeSingle();
    if (error) return null;
    return (data as PedidoDetalle | null) ?? null;
  } catch {
    return null;
  }
}

export default async function ExitoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const codigo = readSingle(sp, "codigo") ?? "";
  const totalUrl = readSingle(sp, "total");
  const emailUrl = readSingle(sp, "email");
  const pagoUrl = readSingle(sp, "pago");

  const pedido = codigo ? await fetchPedido(codigo) : null;

  const email = pedido?.cliente_email ?? emailUrl ?? "";
  const total = pedido?.total ?? (totalUrl ? Number(totalUrl) : null);
  const pago = pedido?.metodo_pago ?? pagoUrl ?? "";

  const waMsg = `Hola! Confirmo mi pedido ${codigo || "Veliroz"} · Total S/${(total ?? 0).toFixed(2)}. Te envío el voucher.`;
  const waHref = `https://wa.me/${WA_NUM}?text=${encodeURIComponent(waMsg)}`;

  if (!codigo) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-3xl text-ink">
            No encontramos el pedido
          </h1>
          <p className="text-sm text-clay">
            Este link no lleva a ningún pedido válido. Volvé al catálogo para
            empezar de nuevo.
          </p>
          <Link href="/cosmetic/productos" className="btn-primary">
            Ir al catálogo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* NAV minimal */}
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
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-clay hidden md:inline">
            · Pedido registrado ·
          </span>
        </div>
      </nav>
      <div className="h-[68px]" />

      <section className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[--veliroz-success]/15">
            <svg
              className="w-8 h-8 text-[--veliroz-success]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe block">
            · Pedido confirmado ·
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-ink text-balance">
            Gracias por tu compra
            {pedido?.cliente_nombre ? `, ${pedido.cliente_nombre.split(" ")[0]}` : ""}.
          </h1>
          <p className="text-sm text-clay text-pretty max-w-lg mx-auto">
            Guardamos tu pedido con el código{" "}
            <span className="font-mono text-ink">{codigo}</span>
            {email && (
              <>
                {" "}
                y enviamos la confirmación a{" "}
                <span className="text-ink">{email}</span>
              </>
            )}
            .
          </p>
        </div>

        <div className="bg-surface border border-[--border] rounded-lg p-6 md:p-8 space-y-5">
          <h2 className="font-serif text-xl text-ink">Detalle</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <Item k="Código" v={codigo} mono />
            {pedido?.fecha_pedido && (
              <Item
                k="Fecha"
                v={new Date(pedido.fecha_pedido).toLocaleString("es-PE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
            )}
            {pago && <Item k="Método de pago" v={prettyPago(pago)} />}
            {pedido?.metodo_entrega && (
              <Item k="Entrega" v={prettyEntrega(pedido.metodo_entrega)} />
            )}
            {pedido?.estado && (
              <Item k="Estado" v={prettyEstado(pedido.estado)} />
            )}
          </dl>

          {(pedido || total != null) && (
            <div className="pt-4 border-t border-[--border] space-y-2 text-sm">
              {pedido?.subtotal != null && (
                <Row label="Subtotal" value={`S/${Number(pedido.subtotal).toFixed(2)}`} />
              )}
              {pedido?.descuento != null && Number(pedido.descuento) > 0 && (
                <Row
                  label="Descuento"
                  value={`-S/${Number(pedido.descuento).toFixed(2)}`}
                  tone="ok"
                />
              )}
              {pedido?.costo_envio != null && (
                <Row
                  label="Envío"
                  value={
                    Number(pedido.costo_envio) === 0
                      ? "Gratis"
                      : `S/${Number(pedido.costo_envio).toFixed(2)}`
                  }
                  tone={Number(pedido.costo_envio) === 0 ? "ok" : undefined}
                />
              )}
              <div className="pt-2 border-t border-[--border] flex items-baseline justify-between">
                <dt className="font-serif text-lg text-ink">Total</dt>
                <dd className="font-mono text-xl text-ink">
                  S/{Number(total ?? 0).toFixed(2)}
                </dd>
              </div>
            </div>
          )}
        </div>

        {/* Instrucciones por método */}
        {(pago === "yape" || pago === "plin") && (
          <div className="mt-6 bg-champagne/15 border border-champagne/40 rounded-lg p-5 text-sm text-ink">
            <p className="font-serif text-base mb-1">Un último paso</p>
            <p className="text-clay">
              Enviá el voucher de {pago === "yape" ? "Yape" : "Plin"} por
              WhatsApp para confirmar el despacho hoy mismo.
            </p>
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:justify-center">
          <Link href="/" className="btn-outline justify-center">
            Volver al inicio
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary justify-center"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            Enviar comprobante por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}

function Item({
  k,
  v,
  mono,
}: {
  k: string;
  v: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
        {k}
      </dt>
      <dd className={mono ? "font-mono text-ink text-sm" : "text-ink text-sm"}>
        {v}
      </dd>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok";
}) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-clay">{label}</dt>
      <dd
        className={
          tone === "ok"
            ? "font-mono text-[--veliroz-success]"
            : "font-mono text-ink"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function prettyPago(m: string): string {
  const map: Record<string, string> = {
    culqi: "Tarjeta · Culqi",
    yape: "Yape",
    plin: "Plin",
    mercadopago: "MercadoPago",
    pagoefectivo: "PagoEfectivo",
    banco: "Depósito bancario",
    contra_entrega: "Contra entrega",
  };
  return map[m] ?? m;
}

function prettyEntrega(m: string): string {
  const map: Record<string, string> = {
    envio: "Envío",
    recojo: "Recojo en tienda",
    zona_local: "Zona local",
  };
  return map[m] ?? m;
}

function prettyEstado(e: string): string {
  const map: Record<string, string> = {
    nuevo: "Recibido",
    pagado: "Pagado",
    preparando: "Preparando",
    en_reparto: "En reparto",
    entregado: "Entregado",
    cancelado: "Cancelado",
  };
  return map[e] ?? e;
}
