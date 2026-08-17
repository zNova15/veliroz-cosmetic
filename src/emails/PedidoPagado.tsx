import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, brand, money, styles } from "./_layout";

/* ============================================================
   PedidoPagado — confirmación pago + preparando envío
   + tracking placeholder + link comprobante PDF cuando exista.
   ============================================================ */

export type PedidoPagadoProps = {
  pedidoCodigo: string;
  clienteNombre: string;
  total: number;
  metodoPago: string;
  metodoEntrega: string;
  comprobantePdfUrl?: string | null;
  trackingUrl?: string | null;
  siteUrl?: string;
};

function metodoPagoLabel(m: string): string {
  const map: Record<string, string> = {
    yape: "Yape",
    plin: "Plin",
    mercadopago: "MercadoPago",
    culqi: "Tarjeta (Culqi)",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia bancaria",
    contra_entrega: "Contra entrega",
    contraentrega: "Contra entrega",
  };
  return map[m?.toLowerCase?.() ?? ""] ?? m;
}

export default function PedidoPagado(props: PedidoPagadoProps) {
  const {
    pedidoCodigo,
    clienteNombre,
    total,
    metodoPago,
    metodoEntrega,
    comprobantePdfUrl,
    trackingUrl,
    siteUrl = "https://veliroz.com",
  } = props;

  const primerNombre = clienteNombre.split(" ")[0] || "linda";
  const esEnvioNacional =
    metodoEntrega === "shalom" || metodoEntrega === "envio_nacional";

  return (
    <EmailLayout
      preview={`Pago confirmado — ${pedidoCodigo} está en preparación`}
    >
      <Text style={styles.h1}>Tu pago se confirmó, {primerNombre}</Text>

      <Text style={styles.p}>
        Recibimos {money(total)} para tu pedido{" "}
        <span style={styles.code}>#{pedidoCodigo}</span> con{" "}
        {metodoPagoLabel(metodoPago)}. Ahora empezamos a empacarlo.
      </Text>

      <Section style={styles.card}>
        <Text style={{ ...styles.h2, marginTop: 0 }}>Qué sigue</Text>

        <Text style={styles.p}>
          <strong style={{ color: brand.ink }}>1. Preparación</strong> — hoy o
          mañana, revisamos cada producto y armamos tu paquete.
        </Text>
        <Text style={styles.p}>
          <strong style={{ color: brand.ink }}>2. Despacho</strong> —{" "}
          {esEnvioNacional
            ? "lo llevamos a Shalom y te compartimos el código de rastreo."
            : "salimos a entregarlo en Cajamarca en cuanto esté listo."}
        </Text>
        <Text style={styles.p}>
          <strong style={{ color: brand.ink }}>3. Entrega</strong> — te
          avisamos por WhatsApp cuando esté en camino.
        </Text>
      </Section>

      {trackingUrl ? (
        <Section style={{ textAlign: "center", padding: "8px 0 24px" }}>
          <Button href={trackingUrl} style={styles.btn}>
            Rastrear envío
          </Button>
        </Section>
      ) : (
        <Text style={styles.muted}>
          Aún no hay número de rastreo — te lo enviamos apenas despachemos.
        </Text>
      )}

      {comprobantePdfUrl ? (
        <Section style={{ padding: "8px 0 20px" }}>
          <Text style={styles.p}>
            Tu comprobante electrónico ya está disponible:
          </Text>
          <Section style={{ textAlign: "center" }}>
            <Button href={comprobantePdfUrl} style={styles.btnOutline}>
              Descargar comprobante PDF
            </Button>
          </Section>
        </Section>
      ) : (
        <Text style={styles.muted}>
          Estamos generando tu comprobante electrónico — te llegará por correo
          en unos minutos.
        </Text>
      )}

      <Text style={styles.p} />
      <Text style={styles.muted}>
        Si necesitas cambiar algo (dirección, un producto), respóndenos este
        correo cuanto antes.
      </Text>

      <Section style={{ textAlign: "center", padding: "16px 0 0" }}>
        <Button
          href={`${siteUrl}/mis-pedidos`}
          style={styles.btnOutline}
        >
          Ver mis pedidos
        </Button>
      </Section>
    </EmailLayout>
  );
}

PedidoPagado.PreviewProps = {
  pedidoCodigo: "COS-2026-000123",
  clienteNombre: "Sofía Ramírez",
  total: 152.91,
  metodoPago: "yape",
  metodoEntrega: "contra_entrega",
  comprobantePdfUrl: "https://example.com/boleta.pdf",
  trackingUrl: null,
} satisfies PedidoPagadoProps;
