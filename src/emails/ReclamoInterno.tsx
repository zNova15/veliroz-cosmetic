import * as React from "react";
import { Button, Column, Hr, Row, Section, Text } from "@react-email/components";
import { EmailLayout, brand, money, styles } from "./_layout";

/* ============================================================
   ReclamoInterno — aviso al equipo. Se encola desde /api/reclamos
   con tipo='reclamo_interno' y va a RECLAMOS_EMAIL_INTERNO.

   Este correo NO es una notificación: es el expediente. Lleva todos
   los campos del Anexo del D.S. 011-2011-PCM, incluidos documento y
   domicilio, porque quien responde necesita poder identificar a la
   persona sin entrar a la base — y porque el reclamo se contesta desde
   el celular, entre otra cosa, no sentado frente al SQL Editor.

   Consecuencia: este correo contiene datos personales (Ley 29733).
   Va a una casilla del negocio, nunca se reenvía a terceros, y por eso
   el destinatario es una variable de entorno y no una constante en el
   repo.

   El asunto lo arma el drainer con el código y la fecha límite, para
   que la bandeja se pueda ordenar por urgencia sin abrir nada.
   ============================================================ */

export type ReclamoInternoProps = {
  codigo: string;
  tipo: "reclamo" | "queja";
  fechaLimite: string;
  /** ISO completo de created_at, para dejar constancia de la hora. */
  recibidoEn?: string | null;

  nombre: string;
  documentoTipo: string;
  documentoNumero: string;
  email: string;
  telefono?: string | null;
  domicilio: string;

  bienContratado: "producto" | "servicio";
  descripcion: string;
  comprobante?: string | null;
  montoReclamado?: number | null;

  detalle: string;
  pedidoConcreto: string;
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

/* Mismo motivo que en ReclamoRecibido: "2026-09-20" parseado con
   new Date() es medianoche UTC y puede imprimirse como el día anterior.
   Acá el número es la fecha en la que INDECOPI nos considera en falta. */
function fechaLarga(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, anio, mes, dia] = m;
  return `${Number(dia)} de ${MESES[Number(mes) - 1] ?? mes} de ${anio}`;
}

/* Hora de Lima explícita: el servidor corre en UTC y "recibido a las
   02:14" cuando la clienta escribió a las 21:14 confunde a cualquiera
   que después tenga que reconstruir el caso. */
function fechaHoraLima(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleString("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "medium",
    timeStyle: "short",
  })} (hora de Lima)`;
}

function Campo({
  etiqueta,
  valor,
  mono = false,
}: {
  etiqueta: string;
  valor: string;
  mono?: boolean;
}) {
  return (
    <Row style={{ marginBottom: "10px" }}>
      <Column style={{ width: "140px", verticalAlign: "top" }}>
        <Text
          style={{
            ...styles.muted,
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            fontSize: "10px",
          }}
        >
          {etiqueta}
        </Text>
      </Column>
      <Column style={{ verticalAlign: "top" }}>
        <Text
          style={{
            ...styles.p,
            margin: 0,
            fontSize: "14px",
            color: brand.ink,
            whiteSpace: "pre-line",
            ...(mono
              ? {
                  fontFamily: "'JetBrains Mono','Courier New',monospace",
                  fontSize: "13px",
                }
              : {}),
          }}
        >
          {valor}
        </Text>
      </Column>
    </Row>
  );
}

export default function ReclamoInterno(props: ReclamoInternoProps) {
  const {
    codigo,
    tipo,
    fechaLimite,
    recibidoEn,
    nombre,
    documentoTipo,
    documentoNumero,
    email,
    telefono,
    domicilio,
    bienContratado,
    descripcion,
    comprobante,
    montoReclamado,
    detalle,
    pedidoConcreto,
  } = props;

  const palabra = tipo === "queja" ? "Queja" : "Reclamo";

  /* Sin protocolo wa.me no hay respuesta rápida: el teléfono llega como
     lo tipeó la persona (espacios, guiones, +51). Lo normalizamos acá y
     asumimos Perú cuando son 9 dígitos, que es el caso real. */
  const soloDigitos = (telefono ?? "").replace(/\D/g, "");
  const waNumero =
    soloDigitos.length === 9 ? `51${soloDigitos}` : soloDigitos || null;

  return (
    <EmailLayout
      preview={`${palabra} ${codigo} · responder antes del ${fechaLarga(fechaLimite)}`}
    >
      <Text style={{ ...styles.h1, fontSize: "26px" }}>
        {palabra} {codigo}
      </Text>

      <Section
        style={{
          ...styles.card,
          backgroundColor: brand.mist,
          borderColor: brand.champagne,
          margin: "0 0 20px",
        }}
      >
        <Text style={{ ...styles.p, margin: 0, fontWeight: 600 }}>
          Plazo legal de respuesta: {fechaLarga(fechaLimite)}
        </Text>
        <Text style={{ ...styles.muted, margin: "6px 0 0" }}>
          30 días calendario desde el día siguiente de la presentación (art. 152
          de la Ley 29571). Pasada esa fecha, el incumplimiento es sancionable
          por INDECOPI aunque el caso de fondo se haya resuelto.
        </Text>
      </Section>

      <Text style={styles.h2}>Consumidor</Text>
      <Section style={styles.card}>
        <Campo etiqueta="Nombre" valor={nombre} />
        <Campo
          etiqueta="Documento"
          valor={`${documentoTipo} ${documentoNumero}`}
          mono
        />
        <Campo etiqueta="Correo" valor={email} mono />
        <Campo etiqueta="Teléfono" valor={telefono || "no lo dejó"} mono />
        <Campo etiqueta="Domicilio" valor={domicilio} />
        {recibidoEn ? (
          <Campo etiqueta="Recibido" valor={fechaHoraLima(recibidoEn)} />
        ) : null}
      </Section>

      <Text style={styles.h2}>Bien contratado</Text>
      <Section style={styles.card}>
        <Campo
          etiqueta="Tipo"
          valor={bienContratado === "servicio" ? "Servicio" : "Producto"}
        />
        <Campo etiqueta="Descripción" valor={descripcion} />
        <Campo etiqueta="Comprobante" valor={comprobante || "no lo indicó"} mono />
        <Campo
          etiqueta="Monto"
          valor={
            montoReclamado && montoReclamado > 0
              ? money(montoReclamado)
              : "no lo indicó"
          }
        />
      </Section>

      <Text style={styles.h2}>Qué pasó</Text>
      <Section style={styles.card}>
        <Text style={{ ...styles.p, margin: 0, whiteSpace: "pre-line" }}>
          {detalle}
        </Text>
      </Section>

      <Text style={styles.h2}>Qué pide</Text>
      <Section style={styles.card}>
        <Text style={{ ...styles.p, margin: 0, whiteSpace: "pre-line" }}>
          {pedidoConcreto}
        </Text>
      </Section>

      <Hr style={styles.hr} />

      <Section style={{ textAlign: "center", padding: "8px 0" }}>
        <Button href={`mailto:${email}?subject=${encodeURIComponent(
          `Respuesta a tu ${palabra.toLowerCase()} ${codigo} — Veliroz Cosmetic`,
        )}`} style={styles.btn}>
          Responder por correo
        </Button>
      </Section>

      {waNumero ? (
        <Section style={{ textAlign: "center", padding: "0 0 8px" }}>
          <Button
            href={`https://wa.me/${waNumero}?text=${encodeURIComponent(
              `Hola ${nombre.trim().split(" ")[0]}, te escribimos de Veliroz Cosmetic por tu ${palabra.toLowerCase()} ${codigo}.`,
            )}`}
            style={styles.btnOutline}
          >
            Escribir por WhatsApp
          </Button>
        </Section>
      ) : null}

      <Text style={styles.muted}>
        Al responder, marcar el reclamo como <code>respondido</code> en la tabla{" "}
        <span style={styles.code}>reclamos</span> y guardar el texto en la
        columna <span style={styles.code}>respuesta</span>. Ese registro es lo
        que se presenta si INDECOPI pide el expediente.
      </Text>
    </EmailLayout>
  );
}

ReclamoInterno.PreviewProps = {
  codigo: "LR-2026-0007",
  tipo: "reclamo",
  fechaLimite: "2026-09-20",
  recibidoEn: "2026-08-21T14:32:00.000Z",
  nombre: "Sofía Ramírez",
  documentoTipo: "DNI",
  documentoNumero: "45678912",
  email: "sofia@example.com",
  telefono: "961152276",
  domicilio: "Jr. Amazonas 350, Cajamarca",
  bienContratado: "producto",
  descripcion: "Beauty of Joseon — Relief Sun SPF50+",
  comprobante: "B001-000123",
  montoReclamado: 95,
  detalle:
    "El serum llegó con el sello roto y la mitad del contenido derramado dentro de la caja.",
  pedidoConcreto: "Quiero el cambio del producto por uno sellado.",
} satisfies ReclamoInternoProps;
