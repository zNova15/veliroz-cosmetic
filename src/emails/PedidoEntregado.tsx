import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, brand, styles } from "./_layout";

/* ============================================================
   PedidoEntregado — gracias + review request + tag @Veliroz_02 en IG.
   ============================================================ */

export type PedidoEntregadoProps = {
  pedidoCodigo: string;
  clienteNombre: string;
  reviewUrl?: string | null;
  instagramHandle?: string;
  /** Se acepta por consistencia con los demás correos; este no lo usa. */
  siteUrl?: string;
};

export default function PedidoEntregado(props: PedidoEntregadoProps) {
  const {
    pedidoCodigo,
    clienteNombre,
    reviewUrl,
    instagramHandle = "veliroz_02",
  } = props;

  const primerNombre = clienteNombre.split(" ")[0] || "linda";
  /* Todavía NO existe un flujo de reseñas en la web: el fallback apuntaba a
     /mis-pedidos/{codigo}/review, que devolvía 404 desde el correo. Hasta que
     exista esa página, la reseña se recoge por WhatsApp (canal real del
     negocio) con el código ya cargado en el mensaje. Cuando el flujo esté,
     basta con pasar `reviewUrl` al render del correo. */
  const reviewHref =
    reviewUrl ??
    `https://wa.me/51967456364?text=${encodeURIComponent(
      `Hola Veliroz Cosmetic! Recibí mi pedido ${pedidoCodigo} y les quiero contar qué me pareció: `,
    )}`;
  const igUrl = `https://instagram.com/${instagramHandle}`;

  return (
    <EmailLayout
      preview={`¿Cómo llegó tu pedido, ${primerNombre}?`}
    >
      <Text style={styles.h1}>Ya lo tienes en manos, {primerNombre}</Text>

      <Text style={styles.p}>
        Tu pedido <span style={styles.code}>#{pedidoCodigo}</span> figura como
        entregado. Esperamos que cada producto sea justo lo que estabas
        buscando.
      </Text>

      <Section style={styles.card}>
        <Text style={{ ...styles.h2, marginTop: 0 }}>
          Cuéntanos qué te pareció
        </Text>
        <Text style={styles.p}>
          Tu reseña ayuda a otras personas a decidir con más confianza — y a
          nosotros a seguir mejorando cada envío.
        </Text>
        <Section style={{ textAlign: "center", padding: "12px 0 4px" }}>
          <Button href={reviewHref} style={styles.btn}>
            Dejar mi reseña
          </Button>
        </Section>
      </Section>

      <Text style={styles.h2}>Compártelo en Instagram</Text>
      <Text style={styles.p}>
        Si te encantó, etiquétanos como{" "}
        <a
          href={igUrl}
          style={{
            color: brand.roseDeep,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          @{instagramHandle}
        </a>{" "}
        — republicamos las historias más lindas y a veces regalamos productos
        a quien comparte.
      </Text>

      <Section style={{ textAlign: "center", padding: "8px 0 24px" }}>
        <Button href={igUrl} style={styles.btnOutline}>
          Seguir @{instagramHandle}
        </Button>
      </Section>

      <Text style={styles.muted}>
        Si algo llegó dañado o incompleto, respóndenos este correo antes de
        7 días y lo solucionamos.
      </Text>

      <Text style={styles.p}>Gracias por elegirnos ✿</Text>
    </EmailLayout>
  );
}

PedidoEntregado.PreviewProps = {
  pedidoCodigo: "COS-2026-000123",
  clienteNombre: "Sofía Ramírez",
  reviewUrl: null,
  instagramHandle: "veliroz_02",
} satisfies PedidoEntregadoProps;
