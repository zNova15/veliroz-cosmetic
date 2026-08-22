import * as React from "react";
import { Button, Column, Hr, Row, Section, Text } from "@react-email/components";
import { EmailLayout, brand, money, styles, type LineaItem } from "./_layout";

/* ============================================================
   PedidoNuevoInterno — el único correo de esta carpeta que NO va a la
   clienta. Se dispara con email_queue.tipo='pedido_nuevo_interno', que
   encola el trigger de la migración 032 en cada INSERT de `pedidos`.

   POR QUÉ EXISTE: hasta ahora la única señal de una venta era que la
   clienta escribiera al WhatsApp. Con todo el catálogo en pre-venta y
   stock 0, cada pedido es además la orden de compra al proveedor: si
   nadie lo ve en el día, no se pide, y la clienta espera algo que
   nunca se compró.

   POR QUÉ NO PARECE UN CORREO DE MARCA: no lo es. Se lee en el celular
   entre otras cosas y tiene que contestar en tres segundos qué se
   vendió, cuánto entró, cómo se cobra, adónde va y a quién llamar.
   Se respeta el layout (header/footer) para que no caiga en spam por
   ser un HTML pelado y para que se reconozca de un vistazo, pero el
   cuerpo son datos, no copy.
   ============================================================ */

export type PedidoNuevoInternoProps = {
  pedidoCodigo: string;
  /** Fecha ya formateada por el drainer (Lima). */
  fechaTexto?: string | null;
  estado?: string | null;
  /** Línea de negocio (envio_meta.linea): cosmetic | flores | chocotejas… */
  linea?: string | null;
  canal?: string | null;

  clienteNombre: string;
  clienteEmail?: string | null;
  clienteTelefono?: string | null;
  /** Link wa.me ya armado por el drainer (null si el teléfono no sirve). */
  waUrl?: string | null;

  items: LineaItem[];
  subtotal: number;
  descuento?: number | null;
  costoEnvio?: number | null;
  total: number;

  metodoPago: string;
  metodoEntrega: string;
  /** envio_meta.transporte — shalom | lima_domicilio. */
  transporte?: string | null;
  agencia?: string | null;
  direccion?: string | null;

  cupon?: string | null;
  referidoCodigo?: string | null;
  referidoDescuento?: number | null;

  tipoComprobante?: string | null;
  documento?: string | null;
  razonSocial?: string | null;
};

/* Etiquetas legibles. El valor crudo se muestra si no está mapeado:
   inventar un label bonito para un enum desconocido esconde el dato. */
const PAGO: Record<string, string> = {
  yape: "Yape",
  plin: "Plin",
  mercadopago: "MercadoPago / tarjeta",
  banco: "Transferencia / PagoEfectivo",
  contra_entrega: "Contra entrega",
  contraentrega: "Contra entrega",
  transferencia: "Transferencia",
};

const ENTREGA: Record<string, string> = {
  envio: "Envío",
  recojo: "Recojo en tienda",
  delivery: "Delivery local",
  contra_entrega: "Contra entrega",
  contraentrega: "Contra entrega",
};

const TRANSPORTE: Record<string, string> = {
  shalom: "Shalom (agencia)",
  lima_domicilio: "Lima · a domicilio",
};

function label(map: Record<string, string>, v: string | null | undefined): string {
  const k = (v ?? "").toLowerCase();
  if (!k) return "—";
  return map[k] ?? v ?? "—";
}

/* Fila etiqueta/valor. Tabla y no flex: Outlook no hace flex. */
function Dato(props: { k: string; v: React.ReactNode }) {
  return (
    <Row style={{ marginBottom: "6px" }}>
      <Column style={{ width: "34%", verticalAlign: "top" }}>
        <Text style={{ ...styles.muted, margin: 0 }}>{props.k}</Text>
      </Column>
      <Column style={{ verticalAlign: "top" }}>
        <Text
          style={{ ...styles.p, margin: 0, fontSize: "14px", color: brand.ink }}
        >
          {props.v}
        </Text>
      </Column>
    </Row>
  );
}

function Titulo(props: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        ...styles.muted,
        margin: "18px 0 8px",
        fontSize: "11px",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        color: brand.taupe,
      }}
    >
      {props.children}
    </Text>
  );
}

export default function PedidoNuevoInterno(props: PedidoNuevoInternoProps) {
  const {
    pedidoCodigo,
    fechaTexto,
    estado,
    linea,
    canal,
    clienteNombre,
    clienteEmail,
    clienteTelefono,
    waUrl,
    items,
    subtotal,
    descuento,
    costoEnvio,
    total,
    metodoPago,
    metodoEntrega,
    transporte,
    agencia,
    direccion,
    cupon,
    referidoCodigo,
    referidoDescuento,
    tipoComprobante,
    documento,
    razonSocial,
  } = props;

  const unidades = items.reduce((acc, it) => acc + Number(it.cantidad ?? 0), 0);

  return (
    <EmailLayout
      preview={`Pedido ${pedidoCodigo} · ${money(total)} · ${label(PAGO, metodoPago)}`}
    >
      <Text style={{ ...styles.h1, fontSize: "26px", margin: "24px 0 4px" }}>
        Pedido nuevo · {pedidoCodigo}
      </Text>
      <Text style={{ ...styles.muted, margin: "0 0 18px" }}>
        {money(total)} · {label(PAGO, metodoPago)} · {unidades}{" "}
        {unidades === 1 ? "unidad" : "unidades"}
        {fechaTexto ? ` · ${fechaTexto}` : ""}
      </Text>

      {/* Lo que hay que comprar. Va primero: con stock 0 esto ES la
          orden de compra al proveedor, no un resumen de cortesía. */}
      <Section style={styles.card}>
        <Text style={{ ...styles.h2, marginTop: 0, fontSize: "17px" }}>
          Qué se vendió
        </Text>

        {items.length === 0 ? (
          <Text style={{ ...styles.muted, margin: 0, color: brand.roseDeep }}>
            El pedido no tiene líneas cargadas — revisar en la base antes de
            comprar nada.
          </Text>
        ) : (
          items.map((it, idx) => (
            <Row key={idx} style={{ marginBottom: "8px" }}>
              <Column style={{ width: "40px", verticalAlign: "top" }}>
                <Text
                  style={{
                    ...styles.p,
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 600,
                    color: brand.ink,
                  }}
                >
                  {it.cantidad}×
                </Text>
              </Column>
              <Column style={{ verticalAlign: "top" }}>
                <Text
                  style={{
                    ...styles.p,
                    margin: 0,
                    fontSize: "14px",
                    color: brand.ink,
                  }}
                >
                  {it.nombre}
                  {it.variante ? (
                    <span style={{ color: brand.taupe }}> — {it.variante}</span>
                  ) : null}
                </Text>
              </Column>
              <Column align="right" style={{ width: "90px", verticalAlign: "top" }}>
                <Text style={{ ...styles.muted, margin: 0 }}>
                  {money(it.subtotal ?? (it.precio_unitario ?? 0) * it.cantidad)}
                </Text>
              </Column>
            </Row>
          ))
        )}

        <Hr style={{ ...styles.hr, margin: "14px 0" }} />

        <Row>
          <Column>
            <Text style={{ ...styles.muted, margin: 0 }}>Subtotal</Text>
          </Column>
          <Column align="right">
            <Text style={{ ...styles.muted, margin: 0 }}>{money(subtotal)}</Text>
          </Column>
        </Row>
        {descuento && descuento > 0 ? (
          <Row>
            <Column>
              <Text style={{ ...styles.muted, margin: 0, color: brand.roseDeep }}>
                Descuento
              </Text>
            </Column>
            <Column align="right">
              <Text style={{ ...styles.muted, margin: 0, color: brand.roseDeep }}>
                − {money(descuento)}
              </Text>
            </Column>
          </Row>
        ) : null}
        <Row>
          <Column>
            <Text style={{ ...styles.muted, margin: 0 }}>Envío cobrado</Text>
          </Column>
          <Column align="right">
            <Text style={{ ...styles.muted, margin: 0 }}>
              {costoEnvio && costoEnvio > 0 ? money(costoEnvio) : "Gratis"}
            </Text>
          </Column>
        </Row>
        <Row>
          <Column>
            <Text
              style={{ ...styles.p, margin: "6px 0 0", fontWeight: 600, color: brand.ink }}
            >
              Total
            </Text>
          </Column>
          <Column align="right">
            <Text
              style={{ ...styles.p, margin: "6px 0 0", fontWeight: 600, color: brand.ink }}
            >
              {money(total)}
            </Text>
          </Column>
        </Row>
      </Section>

      <Titulo>Cobro</Titulo>
      <Dato k="Método de pago" v={label(PAGO, metodoPago)} />
      <Dato k="Estado del pedido" v={estado ?? "—"} />
      {cupon ? <Dato k="Cupón" v={cupon} /> : null}
      {referidoCodigo ? (
        <Dato
          k="Referido"
          v={
            referidoDescuento && referidoDescuento > 0
              ? `${referidoCodigo} (− ${money(referidoDescuento)})`
              : referidoCodigo
          }
        />
      ) : null}
      {tipoComprobante ? (
        <Dato
          k="Comprobante"
          v={
            <>
              {tipoComprobante}
              {documento ? ` · ${documento}` : ""}
              {razonSocial ? ` · ${razonSocial}` : ""}
            </>
          }
        />
      ) : null}

      <Titulo>Entrega</Titulo>
      <Dato
        k="Modalidad"
        v={
          transporte
            ? label(TRANSPORTE, transporte)
            : label(ENTREGA, metodoEntrega)
        }
      />
      {agencia ? <Dato k="Agencia Shalom" v={agencia} /> : null}
      {direccion ? <Dato k="Dirección" v={direccion} /> : null}

      <Titulo>Cliente</Titulo>
      <Dato k="Nombre" v={clienteNombre || "—"} />
      <Dato
        k="Teléfono"
        v={clienteTelefono ? clienteTelefono : "sin teléfono"}
      />
      <Dato
        k="Correo"
        v={
          clienteEmail ? (
            <a href={`mailto:${clienteEmail}`} style={{ color: brand.roseDeep }}>
              {clienteEmail}
            </a>
          ) : (
            "sin correo"
          )
        }
      />
      {linea || canal ? (
        <Dato
          k="Origen"
          v={[linea, canal].filter(Boolean).join(" · ") || "—"}
        />
      ) : null}

      {waUrl ? (
        <Section style={{ textAlign: "center", padding: "22px 0 4px" }}>
          <Button href={waUrl} style={styles.btn}>
            Escribirle por WhatsApp
          </Button>
        </Section>
      ) : null}

      <Text style={{ ...styles.muted, marginTop: "18px" }}>
        Aviso automático de la cola de correo. Si el pedido no se atiende, el
        aviso no se repite: no hay segundo recordatorio.
      </Text>
    </EmailLayout>
  );
}

PedidoNuevoInterno.PreviewProps = {
  pedidoCodigo: "COS-2026-000123",
  fechaTexto: "21 ago 2026, 10:42",
  estado: "pendiente",
  linea: "cosmetic",
  canal: "web",
  clienteNombre: "Sofía Ramírez",
  clienteEmail: "sofia@example.com",
  clienteTelefono: "961152276",
  waUrl: "https://wa.me/51961152276",
  items: [
    {
      nombre: "Anua — Niacinamide 10% + TXA 4%",
      variante: "30 ml",
      cantidad: 1,
      precio_unitario: 95,
      subtotal: 95,
    },
    {
      nombre: "Dr.Althea — 345 Relief Cream",
      variante: "50 ml",
      cantidad: 2,
      precio_unitario: 89,
      subtotal: 178,
    },
  ],
  subtotal: 273,
  descuento: 27.3,
  costoEnvio: 12,
  total: 257.7,
  metodoPago: "yape",
  metodoEntrega: "envio",
  transporte: "shalom",
  agencia: "Cajamarca — Av. Vía de Evitamiento",
  direccion: "Shalom · Agencia Cajamarca · Receptor DNI 71234567",
  cupon: "COSMETIC10",
  referidoCodigo: null,
  referidoDescuento: null,
  tipoComprobante: "boleta",
  documento: "71234567",
  razonSocial: null,
} satisfies PedidoNuevoInternoProps;
