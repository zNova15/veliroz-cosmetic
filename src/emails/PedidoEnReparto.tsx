import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, brand, styles } from "./_layout";

/* ============================================================
   PedidoEnReparto — se despachó, va en camino.
   Tracking Shalom manual (código pegado por Ventas al momento del envío).
   ============================================================ */

export type PedidoEnRepartoProps = {
  pedidoCodigo: string;
  clienteNombre: string;
  metodoEntrega: string;
  transportista?: string | null;
  trackingCodigo?: string | null;
  trackingUrl?: string | null;
  fechaEstimada?: string | null;
  siteUrl?: string;
};

export default function PedidoEnReparto(props: PedidoEnRepartoProps) {
  const {
    pedidoCodigo,
    clienteNombre,
    metodoEntrega,
    transportista,
    trackingCodigo,
    trackingUrl,
    fechaEstimada,
  } = props;

  const primerNombre = clienteNombre.split(" ")[0] || "linda";
  const carrier =
    transportista ||
    (metodoEntrega === "shalom"
      ? "Shalom"
      : metodoEntrega === "recojo"
        ? "Recojo en tienda"
        : "Nuestro repartidor");

  const esRecojo = metodoEntrega === "recojo";
  const esShalom =
    metodoEntrega === "shalom" || carrier.toLowerCase().includes("shalom");

  return (
    <EmailLayout
      preview={`Tu pedido ${pedidoCodigo} está en camino`}
    >
      <Text style={styles.h1}>Tu pedido va en camino, {primerNombre}</Text>

      <Text style={styles.p}>
        Ya despachamos tu pedido{" "}
        <span style={styles.code}>#{pedidoCodigo}</span>.{" "}
        {esRecojo
          ? "Está listo para que lo recojas cuando puedas."
          : `${carrier} lo tiene y se dirige hacia ti.`}
      </Text>

      <Section style={styles.card}>
        <Text style={{ ...styles.h2, marginTop: 0 }}>Detalles del envío</Text>

        <Text style={{ ...styles.muted, margin: "0 0 6px" }}>
          Transportista
        </Text>
        <Text
          style={{
            ...styles.p,
            margin: "0 0 14px",
            fontWeight: 500,
            color: brand.ink,
          }}
        >
          {carrier}
        </Text>

        {trackingCodigo ? (
          <>
            <Text style={{ ...styles.muted, margin: "0 0 6px" }}>
              Código de rastreo
            </Text>
            <Text
              style={{
                ...styles.code,
                display: "block",
                margin: "0 0 14px",
                fontSize: "16px",
                color: brand.ink,
              }}
            >
              {trackingCodigo}
            </Text>
          </>
        ) : null}

        {fechaEstimada ? (
          <>
            <Text style={{ ...styles.muted, margin: "0 0 6px" }}>
              Llegada estimada
            </Text>
            <Text
              style={{
                ...styles.p,
                margin: 0,
                fontWeight: 500,
                color: brand.ink,
              }}
            >
              {fechaEstimada}
            </Text>
          </>
        ) : null}
      </Section>

      {trackingUrl ? (
        <Section style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <Button href={trackingUrl} style={styles.btn}>
            Rastrear mi pedido
          </Button>
        </Section>
      ) : esShalom ? (
        <Section style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <Button
            href="https://tracking.shalom.pe/"
            style={styles.btnOutline}
          >
            Rastrear en Shalom
          </Button>
        </Section>
      ) : null}

      <Text style={styles.p}>
        {esRecojo
          ? "Nuestro horario de tienda: Lun–Sáb 9am–7pm. Pregunta por Gabriela al llegar."
          : "Ten tu documento a la mano y responde si te llaman — a veces el repartidor confirma la dirección."}
      </Text>

      <Text style={styles.muted}>
        Si no lo recibes o hay algún problema con el envío, escríbenos por
        WhatsApp y lo resolvemos.
      </Text>
    </EmailLayout>
  );
}

PedidoEnReparto.PreviewProps = {
  pedidoCodigo: "COS-2026-000123",
  clienteNombre: "Sofía Ramírez",
  metodoEntrega: "shalom",
  transportista: "Shalom",
  trackingCodigo: "SHL-9384756",
  trackingUrl: "https://tracking.shalom.pe/SHL-9384756",
  fechaEstimada: "Vie 20 · antes de las 6pm",
} satisfies PedidoEnRepartoProps;
