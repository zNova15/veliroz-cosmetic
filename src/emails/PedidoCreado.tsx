import * as React from "react";
import {
  Button,
  Column,
  Hr,
  Row,
  Section,
  Text,
} from "@react-email/components";
import {
  EmailLayout,
  brand,
  money,
  styles,
  type LineaItem,
} from "./_layout";

/* ============================================================
   PedidoCreado — se dispara vía trigger email_queue.tipo='pedido_creado'
   Objetivo: agradecer + resumen + próximos pasos según método de pago.
   ============================================================ */

export type PedidoCreadoProps = {
  pedidoCodigo: string;
  clienteNombre: string;
  items: LineaItem[];
  subtotal: number;
  descuento?: number | null;
  costoEnvio?: number | null;
  total: number;
  metodoPago: string;
  metodoEntrega: string;
  siteUrl?: string;
};

const proximosPasosPorPago: Record<string, string> = {
  yape: "Te enviaremos las instrucciones para completar tu pago con Yape en los próximos minutos.",
  plin: "Te enviaremos las instrucciones para completar tu pago con Plin en los próximos minutos.",
  contra_entrega:
    "Pagarás cuando recibas tu pedido — no es necesario adelantar nada.",
  contraentrega:
    "Pagarás cuando recibas tu pedido — no es necesario adelantar nada.",
  transferencia:
    "Te enviaremos los datos bancarios y el comprobante en breve para completar la transferencia.",
  mercadopago:
    "Estamos verificando tu pago con MercadoPago — recibirás confirmación en cuanto se acredite.",
  culqi:
    "Estamos verificando tu pago — recibirás confirmación en cuanto tu tarjeta se acredite.",
  tarjeta:
    "Estamos verificando tu pago con tarjeta — recibirás confirmación en cuanto se acredite.",
};

function metodoEntregaLabel(m: string): string {
  switch (m) {
    case "contra_entrega":
    case "contraentrega":
      return "Entrega contra entrega en Cajamarca";
    case "shalom":
      return "Envío nacional por Shalom";
    case "recojo":
      return "Recojo en tienda (Puylucana)";
    case "delivery":
      return "Delivery local";
    default:
      return m;
  }
}

export default function PedidoCreado(props: PedidoCreadoProps) {
  const {
    pedidoCodigo,
    clienteNombre,
    items,
    subtotal,
    descuento,
    costoEnvio,
    total,
    metodoPago,
    metodoEntrega,
    siteUrl = "https://veliroz-cosmetic.vercel.app",
  } = props;

  const pasos =
    proximosPasosPorPago[metodoPago?.toLowerCase?.() ?? ""] ??
    "Te avisaremos por WhatsApp en cuanto tu pago se confirme.";

  return (
    <EmailLayout
      preview={`Gracias ${clienteNombre.split(" ")[0]}, recibimos tu pedido ${pedidoCodigo}`}
    >
      <Text style={styles.h1}>
        Gracias por tu pedido, {clienteNombre.split(" ")[0] || "linda"}
      </Text>

      <Text style={styles.p}>
        Recibimos tu pedido{" "}
        <span style={styles.code}>#{pedidoCodigo}</span>. Empezamos a
        prepararlo con mucho cariño.
      </Text>

      <Section style={styles.card}>
        <Text style={{ ...styles.h2, marginTop: 0 }}>Resumen del pedido</Text>

        {items.map((it, idx) => (
          <Row key={idx} style={{ marginBottom: "10px" }}>
            <Column>
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
              <Text style={{ ...styles.muted, margin: 0 }}>
                {it.cantidad} ×{" "}
                {money(it.precio_unitario ?? (it.subtotal ?? 0) / it.cantidad)}
              </Text>
            </Column>
            <Column
              align="right"
              style={{ verticalAlign: "top", width: "90px" }}
            >
              <Text
                style={{
                  ...styles.p,
                  margin: 0,
                  fontSize: "14px",
                  color: brand.ink,
                }}
              >
                {money(
                  it.subtotal ?? (it.precio_unitario ?? 0) * it.cantidad
                )}
              </Text>
            </Column>
          </Row>
        ))}

        <Hr style={{ ...styles.hr, margin: "16px 0" }} />

        <Row>
          <Column>
            <Text style={{ ...styles.muted, margin: 0 }}>Subtotal</Text>
          </Column>
          <Column align="right">
            <Text style={{ ...styles.muted, margin: 0 }}>
              {money(subtotal)}
            </Text>
          </Column>
        </Row>

        {descuento && descuento > 0 ? (
          <Row>
            <Column>
              <Text
                style={{ ...styles.muted, margin: 0, color: brand.roseDeep }}
              >
                Descuento
              </Text>
            </Column>
            <Column align="right">
              <Text
                style={{ ...styles.muted, margin: 0, color: brand.roseDeep }}
              >
                − {money(descuento)}
              </Text>
            </Column>
          </Row>
        ) : null}

        <Row>
          <Column>
            <Text style={{ ...styles.muted, margin: 0 }}>Envío</Text>
          </Column>
          <Column align="right">
            <Text style={{ ...styles.muted, margin: 0 }}>
              {costoEnvio && costoEnvio > 0 ? money(costoEnvio) : "Gratis"}
            </Text>
          </Column>
        </Row>

        <Hr style={{ ...styles.hr, margin: "12px 0" }} />

        <Row>
          <Column>
            <Text
              style={{
                ...styles.p,
                margin: 0,
                fontWeight: 600,
                color: brand.ink,
              }}
            >
              Total
            </Text>
          </Column>
          <Column align="right">
            <Text
              style={{
                ...styles.p,
                margin: 0,
                fontWeight: 600,
                color: brand.ink,
              }}
            >
              {money(total)}
            </Text>
          </Column>
        </Row>
      </Section>

      <Text style={styles.h2}>Próximos pasos</Text>
      <Text style={styles.p}>{pasos}</Text>
      <Text style={styles.muted}>
        Modalidad de entrega: {metodoEntregaLabel(metodoEntrega)}
      </Text>

      <Section style={{ textAlign: "center", padding: "24px 0 8px" }}>
        <Button href={`${siteUrl}/cosmetic`} style={styles.btnOutline}>
          Seguir explorando
        </Button>
      </Section>

      <Text style={styles.muted}>
        Cualquier duda estamos por WhatsApp — respondemos rápido, en serio.
      </Text>
    </EmailLayout>
  );
}

PedidoCreado.PreviewProps = {
  pedidoCodigo: "COS-2026-000123",
  clienteNombre: "Sofía Ramírez",
  items: [
    {
      nombre: "The Ordinary — Niacinamide 10% + Zinc 1%",
      variante: "30 ml",
      cantidad: 1,
      precio_unitario: 39.9,
      subtotal: 39.9,
    },
    {
      nombre: "CeraVe Hidratante Facial",
      variante: "52 ml",
      cantidad: 2,
      precio_unitario: 65,
      subtotal: 130,
    },
  ],
  subtotal: 169.9,
  descuento: 16.99,
  costoEnvio: 0,
  total: 152.91,
  metodoPago: "yape",
  metodoEntrega: "contra_entrega",
} satisfies PedidoCreadoProps;
