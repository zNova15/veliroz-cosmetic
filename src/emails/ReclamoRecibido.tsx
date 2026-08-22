import * as React from "react";
import { Button, Hr, Section, Text } from "@react-email/components";
import { EmailLayout, brand, money, styles } from "./_layout";

/* ============================================================
   ReclamoRecibido — copia para el consumidor.
   Se encola desde /api/reclamos con tipo='reclamo_recibido'.

   POR QUÉ ESTE CORREO ES OBLIGATORIO, no una cortesía: el D.S.
   011-2011-PCM exige entregar copia de la hoja al consumidor en el
   acto. En el libro físico eso es el papel calco; en el virtual es
   este correo. Sin él, la persona no tiene con qué demostrar que
   presentó el reclamo.

   Por eso el contenido no es un "gracias por escribirnos": es el
   código, la fecha tope de respuesta y lo que ella misma escribió,
   devuelto tal cual para que le sirva de constancia.
   ============================================================ */

export type ReclamoRecibidoProps = {
  codigo: string;
  nombre: string;
  /** El D.S. los distingue: producto/servicio vs. atención. */
  tipo: "reclamo" | "queja";
  /** Fecha tope de respuesta en formato YYYY-MM-DD. */
  fechaLimite: string;
  detalle: string;
  pedidoConcreto: string;
  montoReclamado?: number | null;
  siteUrl?: string;
  whatsapp?: string;
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "setiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/* Formateo a mano en vez de new Date(...).toLocaleDateString(): el
   string "2026-09-20" se parsea como medianoche UTC y, según la zona
   del runtime, se imprime como el día anterior. En una fecha que es un
   plazo legal, equivocarse por un día importa. */
function fechaLarga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, anio, mes, dia] = m;
  const nombreMes = MESES[Number(mes) - 1] ?? mes;
  return `${Number(dia)} de ${nombreMes} de ${anio}`;
}

export default function ReclamoRecibido(props: ReclamoRecibidoProps) {
  const {
    codigo,
    nombre,
    tipo,
    fechaLimite,
    detalle,
    pedidoConcreto,
    montoReclamado,
    siteUrl = "https://veliroz.com",
    whatsapp = "51967456364",
  } = props;

  const primerNombre = nombre.trim().split(" ")[0] || "hola";
  const palabra = tipo === "queja" ? "queja" : "reclamo";

  return (
    <EmailLayout
      preview={`Tu ${palabra} quedó registrado con el código ${codigo}`}
    >
      <Text style={styles.h1}>Registramos tu {palabra}, {primerNombre}</Text>

      <Text style={styles.p}>
        Esta es tu constancia. Guárdala: con este código puedes hacerle
        seguimiento por WhatsApp o presentarlo ante INDECOPI si hiciera
        falta.
      </Text>

      {/* El código, que es lo único que la persona necesita conservar. */}
      <Section
        style={{
          ...styles.card,
          textAlign: "center",
          backgroundColor: brand.mist,
          borderColor: brand.champagne,
        }}
      >
        <Text
          style={{
            ...styles.muted,
            margin: "0 0 6px",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontSize: "11px",
          }}
        >
          Código de registro
        </Text>
        <Text
          style={{
            fontFamily: "'JetBrains Mono','Courier New',monospace",
            fontSize: "28px",
            letterSpacing: "0.08em",
            color: brand.ink,
            margin: 0,
          }}
        >
          {codigo}
        </Text>
      </Section>

      <Text style={styles.h2}>Cuándo te respondemos</Text>
      <Text style={styles.p}>
        Tenemos hasta el <strong>{fechaLarga(fechaLimite)}</strong> para darte
        una respuesta — son los 30 días calendario que fija el artículo 152 del
        Código de Protección y Defensa del Consumidor (Ley 29571). En la
        práctica te vamos a escribir mucho antes; el plazo es el techo, no la
        meta.
      </Text>
      <Text style={styles.muted}>
        Si tu caso se resuelve en el camino, igual te lo confirmamos por escrito
        para cerrar el registro.
      </Text>

      <Hr style={styles.hr} />

      <Text style={styles.h2}>Lo que registramos</Text>

      <Section style={styles.card}>
        <Text
          style={{
            ...styles.muted,
            margin: "0 0 4px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: "10px",
          }}
        >
          Tipo
        </Text>
        <Text style={{ ...styles.p, margin: "0 0 16px" }}>
          {tipo === "queja"
            ? "Queja — malestar respecto a la atención"
            : "Reclamo — disconformidad con el producto o servicio"}
        </Text>

        <Text
          style={{
            ...styles.muted,
            margin: "0 0 4px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: "10px",
          }}
        >
          Detalle
        </Text>
        <Text style={{ ...styles.p, margin: "0 0 16px", whiteSpace: "pre-line" }}>
          {detalle}
        </Text>

        <Text
          style={{
            ...styles.muted,
            margin: "0 0 4px",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            fontSize: "10px",
          }}
        >
          Lo que pides
        </Text>
        <Text
          style={{
            ...styles.p,
            margin: montoReclamado ? "0 0 16px" : 0,
            whiteSpace: "pre-line",
          }}
        >
          {pedidoConcreto}
        </Text>

        {montoReclamado && montoReclamado > 0 ? (
          <>
            <Text
              style={{
                ...styles.muted,
                margin: "0 0 4px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: "10px",
              }}
            >
              Monto reclamado
            </Text>
            <Text style={{ ...styles.p, margin: 0 }}>
              {money(montoReclamado)}
            </Text>
          </>
        ) : null}
      </Section>

      <Text style={styles.p}>
        Si algo de arriba está mal escrito, respóndenos este correo o
        escríbenos por WhatsApp con tu código y lo corregimos.
      </Text>

      <Section style={{ textAlign: "center", padding: "24px 0 8px" }}>
        <Button
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
            `Hola Veliroz Cosmetic, quiero hacer seguimiento a mi ${palabra} ${codigo}.`,
          )}`}
          style={styles.btn}
        >
          Hacer seguimiento
        </Button>
      </Section>

      <Text style={styles.muted}>
        Si no quedas conforme con nuestra respuesta, puedes llevar el caso a
        INDECOPI en{" "}
        <a href="https://www.consumidor.gob.pe/" style={styles.footerLink}>
          consumidor.gob.pe
        </a>
        . El Libro de Reclamaciones está siempre disponible en{" "}
        <a href={`${siteUrl}/libro-reclamaciones`} style={styles.footerLink}>
          {siteUrl.replace(/^https?:\/\//, "")}/libro-reclamaciones
        </a>
        .
      </Text>
    </EmailLayout>
  );
}

ReclamoRecibido.PreviewProps = {
  codigo: "LR-2026-0007",
  nombre: "Sofía Ramírez",
  tipo: "reclamo",
  fechaLimite: "2026-09-20",
  detalle:
    "El serum llegó con el sello roto y la mitad del contenido derramado dentro de la caja.",
  pedidoConcreto: "Quiero el cambio del producto por uno sellado.",
  montoReclamado: 95,
} satisfies ReclamoRecibidoProps;
