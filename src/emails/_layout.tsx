import * as React from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/* ============================================================
   Veliroz Cosmetic — Layout base compartido por todos los emails
   Paleta espejo de globals.css:
   cream #FBF7F4 · ink #1A1613 · rose-deep #C48A8F ·
   champagne-dark #A8945F · taupe #8B6F63 · mist #F0EAE4
   Todos los estilos VAN INLINE (Gmail/Outlook no leen CSS externo)
   ============================================================ */

export const brand = {
  cream: "#FBF7F4",
  cream2: "#F5EFE7",
  ink: "#1A1613",
  inkSoft: "#2C2621",
  rose: "#E8B4B8",
  roseDeep: "#C48A8F",
  champagne: "#D4B896",
  champagneDark: "#A8945F",
  taupe: "#8B6F63",
  mist: "#F0EAE4",
  clay: "#5C4D42",
  serif: "'Fraunces','Georgia','Times New Roman',serif",
  sans: "'Inter','Helvetica Neue','Segoe UI',Arial,sans-serif",
} as const;

export const styles = {
  body: {
    backgroundColor: brand.cream,
    fontFamily: brand.sans,
    color: brand.ink,
    margin: 0,
    padding: 0,
  } as React.CSSProperties,

  container: {
    maxWidth: "560px",
    margin: "0 auto",
    padding: "32px 24px",
    backgroundColor: brand.cream,
  } as React.CSSProperties,

  header: {
    textAlign: "center",
    padding: "16px 0 24px",
    borderBottom: `1px solid ${brand.mist}`,
  } as React.CSSProperties,

  brandName: {
    fontFamily: brand.serif,
    fontSize: "28px",
    fontWeight: 400,
    letterSpacing: "0.14em",
    color: brand.ink,
    margin: 0,
    textTransform: "uppercase",
  } as React.CSSProperties,

  brandTagline: {
    fontFamily: brand.sans,
    fontSize: "11px",
    letterSpacing: "0.28em",
    color: brand.taupe,
    margin: "6px 0 0",
    textTransform: "uppercase",
  } as React.CSSProperties,

  h1: {
    fontFamily: brand.serif,
    fontSize: "32px",
    lineHeight: 1.15,
    fontWeight: 400,
    color: brand.ink,
    margin: "32px 0 16px",
  } as React.CSSProperties,

  h2: {
    fontFamily: brand.serif,
    fontSize: "20px",
    fontWeight: 500,
    color: brand.ink,
    margin: "24px 0 12px",
  } as React.CSSProperties,

  p: {
    fontFamily: brand.sans,
    fontSize: "15px",
    lineHeight: 1.65,
    color: brand.inkSoft,
    margin: "0 0 14px",
  } as React.CSSProperties,

  muted: {
    fontFamily: brand.sans,
    fontSize: "13px",
    lineHeight: 1.55,
    color: brand.taupe,
    margin: "0 0 10px",
  } as React.CSSProperties,

  btn: {
    display: "inline-block",
    backgroundColor: brand.ink,
    color: brand.cream,
    fontFamily: brand.sans,
    fontSize: "13px",
    letterSpacing: "0.16em",
    fontWeight: 500,
    textTransform: "uppercase",
    padding: "14px 32px",
    borderRadius: "2px",
    textDecoration: "none",
  } as React.CSSProperties,

  btnOutline: {
    display: "inline-block",
    backgroundColor: "transparent",
    color: brand.ink,
    fontFamily: brand.sans,
    fontSize: "13px",
    letterSpacing: "0.16em",
    fontWeight: 500,
    textTransform: "uppercase",
    padding: "13px 32px",
    borderRadius: "2px",
    textDecoration: "none",
    border: `1px solid ${brand.ink}`,
  } as React.CSSProperties,

  card: {
    backgroundColor: "#FFFFFF",
    border: `1px solid ${brand.mist}`,
    borderRadius: "4px",
    padding: "20px",
    margin: "20px 0",
  } as React.CSSProperties,

  hr: {
    borderColor: brand.mist,
    borderStyle: "solid",
    borderWidth: "1px 0 0",
    margin: "32px 0",
  } as React.CSSProperties,

  footer: {
    fontFamily: brand.sans,
    fontSize: "11px",
    color: brand.taupe,
    textAlign: "center",
    lineHeight: 1.55,
    padding: "24px 12px 8px",
  } as React.CSSProperties,

  footerLink: {
    color: brand.roseDeep,
    textDecoration: "none",
    margin: "0 6px",
  } as React.CSSProperties,

  code: {
    fontFamily: "'JetBrains Mono','Courier New',monospace",
    fontSize: "13px",
    color: brand.champagneDark,
    letterSpacing: "0.06em",
  } as React.CSSProperties,
} as const;

/* Encabezado marca — reutilizable. */
export function BrandHeader() {
  return (
    <Section style={styles.header}>
      <Text style={styles.brandName}>Veliroz</Text>
      <Text style={styles.brandTagline}>Cosmetic</Text>
    </Section>
  );
}

/* Pie de página — datos y links. */
export function BrandFooter() {
  return (
    <>
      <Hr style={styles.hr} />
      <Section>
        <Text style={styles.footer}>
          Veliroz Cosmetic · Cajamarca, Perú
          <br />
          Escríbenos:{" "}
          <a
            href="https://wa.me/51961152276"
            style={styles.footerLink}
          >
            WhatsApp
          </a>
          ·
          <a href="mailto:hola@veliroz.com" style={styles.footerLink}>
            hola@veliroz.com
          </a>
          ·
          <a
            href="https://instagram.com/veliroz_02"
            style={styles.footerLink}
          >
            @veliroz_02
          </a>
          <br />
          <span style={{ opacity: 0.7 }}>
            Recibes este correo porque hiciste un pedido o creaste una
            cuenta con nosotros.
          </span>
        </Text>
      </Section>
    </>
  );
}

/* Wrapper HTML + Body + Container + Header + Footer.
   Cada template concreto solo aporta el `preview` y el children. */
export type EmailLayoutProps = {
  preview: string;
  children: React.ReactNode;
};

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="es">
      <Head>
        <meta charSet="utf-8" />
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <BrandHeader />
          {children}
          <BrandFooter />
        </Container>
      </Body>
    </Html>
  );
}

/* Formato moneda soles (S/) para todos los emails. */
export function money(n: number | null | undefined): string {
  const value = Number(n ?? 0);
  return `S/ ${value.toFixed(2)}`;
}

/* Tipo compartido de item de línea usado por todos los templates
   de pedido. Coincide con el shape que guardamos en email_queue.payload
   o que armamos en la ruta de drain a partir de items_pedido. */
export type LineaItem = {
  nombre: string;
  variante?: string | null;
  cantidad: number;
  precio_unitario?: number | null;
  subtotal?: number | null;
};
