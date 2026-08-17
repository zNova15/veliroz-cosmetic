import * as React from "react";
import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, brand, styles } from "./_layout";

/* ============================================================
   Bienvenida — nuevo usuario. Cupón destacado COSMETIC10 y
   una invitación suave a explorar.
   ============================================================ */

export type BienvenidaProps = {
  clienteNombre: string;
  cupon?: string;
  descuentoPct?: number;
  siteUrl?: string;
};

export default function Bienvenida(props: BienvenidaProps) {
  const {
    clienteNombre,
    cupon = "COSMETIC10",
    descuentoPct = 10,
    siteUrl = "https://veliroz.com",
  } = props;

  const primerNombre = clienteNombre.split(" ")[0] || "linda";

  return (
    <EmailLayout
      preview={`Bienvenida a Veliroz, ${primerNombre} — tu ${descuentoPct}% de descuento adentro`}
    >
      <Text style={styles.h1}>Bienvenida a Veliroz, {primerNombre}</Text>

      <Text style={styles.p}>
        Nos alegra tenerte por acá. Curamos cada producto pensando en pieles
        reales, ingredientes que sí funcionan y marcas con las que estamos de
        acuerdo.
      </Text>

      {/* Bloque cupón — el corazón del email */}
      <Section
        style={{
          backgroundColor: brand.mist,
          border: `1px dashed ${brand.champagneDark}`,
          borderRadius: "6px",
          padding: "28px 20px",
          margin: "24px 0",
          textAlign: "center",
        }}
      >
        <Text
          style={{
            fontFamily: brand.sans,
            fontSize: "11px",
            letterSpacing: "0.28em",
            color: brand.taupe,
            textTransform: "uppercase",
            margin: "0 0 10px",
          }}
        >
          Tu regalo de bienvenida
        </Text>
        <Text
          style={{
            fontFamily: brand.serif,
            fontSize: "26px",
            color: brand.ink,
            margin: "0 0 12px",
            lineHeight: 1.2,
          }}
        >
          {descuentoPct}% de descuento en tu primera compra
        </Text>
        <Text
          style={{
            fontFamily: "'JetBrains Mono','Courier New',monospace",
            fontSize: "22px",
            letterSpacing: "0.24em",
            color: brand.champagneDark,
            backgroundColor: "#FFFFFF",
            border: `1px solid ${brand.champagne}`,
            borderRadius: "3px",
            padding: "14px 20px",
            display: "inline-block",
            margin: "0 0 18px",
          }}
        >
          {cupon}
        </Text>
        <Text style={{ ...styles.muted, margin: "0 0 16px" }}>
          Úsalo al finalizar tu compra. Válido por 30 días · una vez por
          cuenta.
        </Text>
        <Section>
          <Button href={siteUrl} style={styles.btn}>
            Explorar la tienda
          </Button>
        </Section>
      </Section>

      <Text style={styles.h2}>Por dónde empezar</Text>
      <Text style={styles.p}>
        <strong style={{ color: brand.ink }}>· Rutina básica</strong> —
        limpiador, hidratante y protector solar. La base de todo.
      </Text>
      <Text style={styles.p}>
        <strong style={{ color: brand.ink }}>· Activos específicos</strong> —
        niacinamida, retinol, vitamina C. Añádelos cuando quieras subir un
        nivel.
      </Text>
      <Text style={styles.p}>
        <strong style={{ color: brand.ink }}>· Kits curados</strong> —
        combinaciones que ya probamos y funcionan juntas.
      </Text>

      <Text style={styles.muted}>
        Si tienes dudas sobre qué te conviene, respóndenos este correo o
        escríbenos por WhatsApp — te armamos una recomendación tomando en
        cuenta tu tipo de piel.
      </Text>

      <Text style={styles.p}>Bienvenida a la casa ✿</Text>
    </EmailLayout>
  );
}

Bienvenida.PreviewProps = {
  clienteNombre: "Sofía Ramírez",
  cupon: "COSMETIC10",
  descuentoPct: 10,
} satisfies BienvenidaProps;
