import Link from "next/link";
import type { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import { SelloConfirmacion } from "@/components/SelloConfirmacion";
import { TrackPurchase } from "@/components/TrackPurchase";

/* ============================================================
   /pago/exito — Server Component. Página de retorno del checkout.
   -------------------------------------------------------------
   Atiende TRES estados, no sólo el feliz:
     · aprobado  → confirmación normal (pedido registrado).
     · pendiente → "tu pago está en proceso" (MP pending / in_process,
                   PagoEfectivo con CIP sin pagar todavía).
     · fallido   → error + CTA para reintentar en /pago + salida por
                   Yape/Plin vía WhatsApp.

   De dónde sale el estado (en este orden):
     1. Params de MercadoPago: `status` o `collection_status`
        (approved | pending | in_process | rejected | cancelled | …).
        MP los agrega a la back_url junto con collection_id, payment_id,
        external_reference, preference_id y merchant_order_id.
     2. Nuestro propio `?estado=aprobado|pendiente|fallido` (lo setea
        lib/mercadopago.ts en cada back_url — sirve cuando MP manda
        `status=null`, que pasa en varios flujos).
     3. Default `aprobado` — el checkout propio (Yape/Plin/transferencia)
        sólo llega aquí cuando la RPC creó el pedido con éxito.

   Datos del pedido: se intenta enriquecer con Supabase (best-effort: la
   RLS anon puede bloquear), y si falla se cae a los params del URL
   (?codigo, ?total, ?email, ?pago) — el fallback de siempre.
   ============================================================ */

const WA_NUM = "51967456364";

type SearchParams = Record<string, string | string[] | undefined>;

type Estado = "aprobado" | "pendiente" | "fallido";

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
  const raw = Array.isArray(v) ? v[0] : v;
  if (!raw) return undefined;
  /* MP manda literalmente la cadena "null" en varios params. */
  const clean = raw.trim();
  if (!clean || clean === "null" || clean === "undefined") return undefined;
  return clean;
}

/* ── Mapa de estados de MercadoPago → nuestros 3 estados ──
   `authorized` = dinero retenida sin capturar → todavía no es una venta,
   lo tratamos como pendiente. */
const MP_ESTADO: Record<string, Estado> = {
  approved: "aprobado",
  accredited: "aprobado",
  pending: "pendiente",
  in_process: "pendiente",
  in_mediation: "pendiente",
  authorized: "pendiente",
  pending_waiting_payment: "pendiente",
  pending_waiting_transfer: "pendiente",
  rejected: "fallido",
  cancelled: "fallido",
  refunded: "fallido",
  charged_back: "fallido",
  failure: "fallido",
};

const ESTADO_PROPIO: Record<string, Estado> = {
  aprobado: "aprobado",
  pendiente: "pendiente",
  fallido: "fallido",
};

function resolverEstado(sp: SearchParams): Estado {
  /* 1. MercadoPago manda el veredicto en status / collection_status. */
  const mp =
    readSingle(sp, "status") ?? readSingle(sp, "collection_status");
  if (mp && MP_ESTADO[mp.toLowerCase()]) return MP_ESTADO[mp.toLowerCase()];

  /* 2. Nuestro hint (back_urls de lib/mercadopago.ts). */
  const propio = readSingle(sp, "estado");
  if (propio && ESTADO_PROPIO[propio.toLowerCase()]) {
    return ESTADO_PROPIO[propio.toLowerCase()];
  }

  /* 3. Checkout propio → el pedido se creó bien. */
  return "aprobado";
}

interface LineaPedido {
  producto_id: string | null;
  nombre: string | null;
  precio_unit: number | null;
  cantidad: number | null;
}

/* Las líneas del pedido, sólo para el evento Purchase. Si falla, el evento
   igual se dispara con el total: perder el detalle de productos degrada la
   atribución, perder el evento entero rompe la optimización de campañas. */
async function fetchLineas(codigo: string): Promise<LineaPedido[]> {
  try {
    const sb = getSupabase();
    const { data: ped } = await sb
      .from("pedidos")
      .select("id")
      .eq("pedido_codigo", codigo)
      .maybeSingle();
    const id = (ped as { id?: string } | null)?.id;
    if (!id) return [];
    const { data } = await sb
      .from("lineas_pedido")
      .select("producto_id, nombre, precio_unit, cantidad")
      .eq("pedido_id", id);
    return (data as LineaPedido[] | null) ?? [];
  } catch {
    return [];
  }
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

/* Título por estado — "Pedido confirmado" en una pantalla de pago
   rechazado sería mentirle a la pestaña del navegador. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const estado = resolverEstado(await searchParams);
  const title =
    estado === "pendiente"
      ? "Pago en proceso"
      : estado === "fallido"
        ? "No pudimos procesar tu pago"
        : "Pedido confirmado";
  return {
    title,
    description: "Estado de tu pedido Veliroz Cosmetic.",
    robots: { index: false, follow: false },
  };
}

export default async function ExitoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const estado = resolverEstado(sp);

  /* MP devuelve el pedido en external_reference (lo seteamos con el
     pedido_codigo al crear la preference). */
  const codigo =
    readSingle(sp, "codigo") ?? readSingle(sp, "external_reference") ?? "";
  const totalUrl = readSingle(sp, "total");
  const emailUrl = readSingle(sp, "email");
  const pagoUrl = readSingle(sp, "pago");

  /* Referencias de MP para soporte (las mostramos sólo si vinieron). */
  const pagoId = readSingle(sp, "payment_id") ?? readSingle(sp, "collection_id");
  const merchantOrder = readSingle(sp, "merchant_order_id");
  const preferenceId = readSingle(sp, "preference_id");

  const pedido = codigo ? await fetchPedido(codigo) : null;
  const lineas = codigo ? await fetchLineas(codigo) : [];

  const email = pedido?.cliente_email ?? emailUrl ?? "";
  const total = pedido?.total ?? (totalUrl ? Number(totalUrl) : null);
  const pago = pedido?.metodo_pago ?? pagoUrl ?? "";

  const totalTxt = `S/${Number(total ?? 0).toFixed(2)}`;
  const refTxt = codigo || "Veliroz";

  const waMsg =
    estado === "fallido"
      ? `Hola! Mi pago del pedido ${refTxt} no se procesó (total ${totalTxt}). Quiero pagar por Yape/Plin.`
      : estado === "pendiente"
        ? `Hola! Mi pago del pedido ${refTxt} quedó en proceso (total ${totalTxt}). ¿Me confirman cuando entre?`
        : `Hola! Confirmo mi pedido ${refTxt} · Total ${totalTxt}. Te envío el voucher.`;
  const waHref = `https://wa.me/${WA_NUM}?text=${encodeURIComponent(waMsg)}`;

  /* Sin código no hay nada que mostrar… salvo que MP nos haya mandado aquí
     con un rechazo: ahí sí queremos dar la salida de reintento. */
  if (!codigo && estado !== "fallido") {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 py-16">
        <div className="max-w-md text-center space-y-4">
          <h1 className="font-serif text-3xl text-ink">
            No encontramos el pedido
          </h1>
          <p className="text-sm text-clay">
            Este link no lleva a ningún pedido válido. Vuelve al catálogo para
            empezar de nuevo.
          </p>
          <Link href="/productos" className="btn-primary">
            Ir al catálogo
          </Link>
        </div>
      </main>
    );
  }

  const copy = COPY[estado];

  return (
    <main className="min-h-screen">
      {/* El header (y su spacer) los pone el RootLayout. Esta página montaba
          además su propia nav fija encima: el CosmeticHeader quedaba abajo
          traslucido y se le veían los links fantasma. */}
      <section className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <div className="text-center space-y-4 mb-10">
          <SelloConfirmacion
            d={copy.icono}
            halo={copy.halo}
            tinta={copy.tinta}
            celebrar={estado === "aprobado"}
          />
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe block">
            · {copy.eyebrow} ·
          </span>
          <h1 className="font-serif text-3xl md:text-4xl text-ink text-balance">
            {copy.titulo}
            {estado === "aprobado" && pedido?.cliente_nombre
              ? `, ${pedido.cliente_nombre.split(" ")[0]}`
              : ""}
            .
          </h1>

          {estado === "aprobado" ? (
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
          ) : (
            <p className="text-sm text-clay text-pretty max-w-lg mx-auto">
              {copy.bajada}
              {codigo && (
                <>
                  {" "}
                  Tu pedido quedó guardado como{" "}
                  <span className="font-mono text-ink">{codigo}</span>.
                </>
              )}
            </p>
          )}
        </div>

        {/* ── Bloque de acción según estado ── */}
        {estado === "fallido" && (
          <div className="mb-6 bg-surface border border-[--border-2] rounded-lg p-6 space-y-4">
            <div className="space-y-1">
              <p className="font-serif text-lg text-ink">
                No se cobró nada de tu tarjeta.
              </p>
              <p className="text-sm text-clay text-pretty">
                Puedes reintentar el pago con otro medio, o pagarnos por
                Yape/Plin y mandarnos el voucher — despachamos igual de rápido.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/pago" className="btn-primary justify-center">
                Reintentar el pago
              </Link>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline justify-center"
              >
                <IconWa />
                Pagar por Yape / Plin
              </a>
            </div>
            <p className="text-[11px] text-clay">
              Yape y Plin al{" "}
              <span className="font-mono text-ink">+51 967 456 364</span> ·
              titular Veliroz.
            </p>
          </div>
        )}

        {estado === "pendiente" && (
          <div className="mb-6 bg-champagne/15 border border-champagne/40 rounded-lg p-5 text-sm text-ink">
            <p className="font-serif text-base mb-1">Qué sigue</p>
            <p className="text-clay text-pretty">
              No hace falta que hagas nada. Apenas el pago se acredite lo
              confirmamos y preparamos el despacho. Si en 24 h no tienes
              novedades, escríbenos por WhatsApp con tu código de pedido.
            </p>
          </div>
        )}

        {/* ── Detalle del pedido ── */}
        {codigo && (
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
              {pagoId && <Item k="Nº de operación" v={pagoId} mono />}
              {merchantOrder && !pagoId && (
                <Item k="Orden MP" v={merchantOrder} mono />
              )}
              {preferenceId && !pagoId && !merchantOrder && (
                <Item k="Referencia MP" v={preferenceId} mono />
              )}
            </dl>

            {(pedido || total != null) && (
              <div className="pt-4 border-t border-[--border] space-y-2 text-sm">
                {pedido?.subtotal != null && (
                  <Row
                    label="Subtotal"
                    value={`S/${Number(pedido.subtotal).toFixed(2)}`}
                  />
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
                  <dd className="font-mono text-xl text-ink">{totalTxt}</dd>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instrucciones por método — sólo cuando el pedido se registró bien */}
        {estado === "aprobado" && (pago === "yape" || pago === "plin") && (
          <div className="mt-6 bg-champagne/15 border border-champagne/40 rounded-lg p-5 text-sm text-ink">
            <p className="font-serif text-base mb-1">Un último paso</p>
            <p className="text-clay">
              Envía el voucher de {pago === "yape" ? "Yape" : "Plin"} por
              WhatsApp para confirmar el despacho hoy mismo.
            </p>
          </div>
        )}

        {/* ── CTAs de cierre ── */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:justify-center">
          {estado === "fallido" ? (
            <>
              <Link href="/productos" className="btn-outline justify-center">
                Volver al catálogo
              </Link>
              <Link href="/pago" className="btn-primary justify-center">
                Reintentar el pago
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="btn-outline justify-center">
                Volver al inicio
              </Link>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary justify-center"
              >
                <IconWa />
                {estado === "pendiente"
                  ? "Consultar por WhatsApp"
                  : "Enviar comprobante por WhatsApp"}
              </a>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

/* ────────────────── Copy + estilo por estado ────────────────── */

const COPY: Record<
  Estado,
  {
    eyebrow: string;
    titulo: string;
    bajada: string;
    /* halo = color del círculo detrás del ícono. Va como style inline y no
       como clase: `bg-[--veliroz-success]/15` NO compila en Tailwind v4
       (el modificador de opacidad sobre una var suelta se descarta y el
       círculo queda transparente — así estaba antes de este fix). */
    halo: string;
    /* tinta sí funciona como clase: sin modificador de opacidad. */
    tinta: string;
    icono: string;
  }
> = {
  aprobado: {
    eyebrow: "Pedido confirmado",
    titulo: "Gracias por tu compra",
    bajada: "",
    halo: "color-mix(in srgb, var(--veliroz-success) 15%, transparent)",
    tinta: "text-[--veliroz-success]",
    icono: "M4.5 12.75l6 6 9-13.5",
  },
  pendiente: {
    eyebrow: "Pago en proceso",
    titulo: "Tu pago está en proceso",
    bajada:
      "Te avisamos por WhatsApp apenas se confirme — normalmente toma unos minutos.",
    halo: "color-mix(in srgb, var(--veliroz-champagne) 30%, transparent)",
    tinta: "text-champagne-dark",
    icono: "M12 6v6l4 2M12 21a9 9 0 110-18 9 9 0 010 18z",
  },
  fallido: {
    eyebrow: "Pago rechazado",
    titulo: "No pudimos procesar tu pago",
    bajada:
      "El banco o la billetera rechazó la operación, así que el pedido quedó sin pagar.",
    halo: "color-mix(in srgb, var(--veliroz-danger) 15%, transparent)",
    tinta: "text-[--veliroz-danger]",
    icono: "M12 9v3.75m0 3.75h.008M12 3a9 9 0 100 18 9 9 0 000-18z",
  },
};

/* ────────────────── Sub-componentes ────────────────── */

function IconWa() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    </svg>
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
    pendiente_pago: "Pendiente de pago",
    pagado: "Pagado",
    preparando: "Preparando",
    en_reparto: "En reparto",
    entregado: "Entregado",
    cancelado: "Cancelado",
    reembolsado: "Reembolsado",
  };
  return map[e] ?? e;
}
