import Link from "next/link";
import type { Metadata } from "next";
import { LegalDoc, LegalSection, LegalList } from "@/components/LegalDoc";
import { EMPRESA } from "@/lib/empresa";

/* ============================================================
   /privacidad — Política de Privacidad (Ley 29733, Perú).

   Obligatoria: linkeada desde el paso 3 del checkout
   (components/checkout/StepPago.tsx) y desde el consentimiento del
   Libro de Reclamaciones.

   Los encargados de tratamiento listados en la sección 05 tienen
   que coincidir con los servicios realmente cableados:
   Supabase (BD), Vercel (hosting), Resend (correo), Culqi y
   MercadoPago (pagos), Nubefact (comprobantes), Meta/WhatsApp
   Business (atención), GA4 + Meta Pixel (analítica).
   Si se agrega o quita un proveedor en el código, actualizar aquí.

   PENDIENTE HUMANO: confirmar el número del reglamento vigente de
   la Ley 29733 y la razón social/RUC del titular del banco de datos.
   ============================================================ */

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo trata Veliroz Cosmetic tus datos personales bajo la Ley N.º 29733: qué recogemos, para qué, con quién lo compartimos y cómo ejercer tus derechos ARCO.",
  alternates: { canonical: "/privacidad" },
  robots: { index: true, follow: true },
};

const ACTUALIZADO = "16 de agosto de 2026";
const WA_NUMERO = "51967456364";
const EMAIL = "hola@veliroz.com";

const INDICE = [
  { id: "responsable", titulo: "Quién trata tus datos" },
  { id: "marco", titulo: "Bajo qué ley" },
  { id: "datos", titulo: "Qué datos recogemos" },
  { id: "finalidades", titulo: "Para qué los usamos" },
  { id: "terceros", titulo: "Con quién los compartimos" },
  { id: "transferencia", titulo: "Servidores fuera del Perú" },
  { id: "plazo", titulo: "Cuánto tiempo los guardamos" },
  { id: "derechos", titulo: "Tus derechos (ARCO)" },
  { id: "cookies", titulo: "Cookies y analítica" },
  { id: "seguridad", titulo: "Cómo los protegemos" },
  { id: "menores", titulo: "Menores de edad" },
  { id: "cambios", titulo: "Cambios en esta política" },
  { id: "contacto", titulo: "Contacto" },
];

export default function PrivacidadPage() {
  return (
    <LegalDoc
      breadcrumb="Política de privacidad"
      kicker="· Ley 29733 · Perú ·"
      titulo="Qué hacemos con tus datos."
      tituloItalic="Y qué no."
      resumen={
        <>
          Te pedimos datos para mandarte un pedido, no para armar una base y
          venderla. Aquí está exactamente qué guardamos, por cuánto tiempo,
          quién más lo ve y cómo pedirnos que lo borremos.
        </>
      }
      actualizado={ACTUALIZADO}
      indice={INDICE}
    >
      <LegalSection id="responsable" n="01" titulo="Quién trata tus datos">
        {/* La Ley 29733 exige identificar al responsable del tratamiento.
            Los datos salen de src/lib/empresa.ts, la misma fuente que
            alimenta Términos y el Libro de Reclamaciones: si los tres
            dijeran cosas distintas, ninguno serviría. */}
        <p>
          El titular del banco de datos es{" "}
          <strong>{EMPRESA.nombreComercial}</strong>
          {EMPRESA.razonSocial ? (
            <>
              , razón social <strong>{EMPRESA.razonSocial}</strong>
            </>
          ) : null}
          , <strong>RUC {EMPRESA.ruc}</strong>, con domicilio en{" "}
          <strong>{EMPRESA.domicilioFiscal}</strong>. Los mismos datos figuran
          en el{" "}
          <Link href="/libro-reclamaciones">Libro de Reclamaciones</Link>.
        </p>
        <p>
          Para cualquier tema de datos personales escríbenos a{" "}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a> con el asunto{" "}
          <strong>“Datos personales”</strong>, o por WhatsApp al{" "}
          <a
            href={`https://wa.me/${WA_NUMERO}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            +51 967 456 364
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="marco" n="02" titulo="Bajo qué ley">
        <p>
          Tratamos tus datos conforme a la{" "}
          <strong>Ley N.º 29733, Ley de Protección de Datos Personales</strong>,
          y su reglamento, bajo la supervisión de la Autoridad Nacional de
          Protección de Datos Personales del Ministerio de Justicia y Derechos
          Humanos.
        </p>
        <p>
          En castellano: tus datos son tuyos. Nosotros solo los custodiamos para
          poder cumplir con lo que nos pediste, y estamos obligados a
          devolvértelos, corregirlos o borrarlos cuando lo pidas.
        </p>
      </LegalSection>

      <LegalSection id="datos" n="03" titulo="Qué datos recogemos">
        <p>
          <strong>Cuando compras</strong> — porque sin esto no hay pedido:
        </p>
        <LegalList>
          <li>Nombres y apellidos.</li>
          <li>Correo electrónico y número de teléfono / WhatsApp.</li>
          <li>
            DNI (para boleta) o RUC, razón social y dirección fiscal (para
            factura) — nos lo exige SUNAT para emitir el comprobante.
          </li>
          <li>
            Dirección de envío, distrito y referencias, o la agencia Shalom
            donde vas a recoger.
          </li>
          <li>
            Detalle del pedido: productos, montos, medio de pago y estado.
          </li>
        </LegalList>
        <p>
          <strong>Cuando navegas</strong> — de forma automática: dirección IP,
          tipo de dispositivo y navegador, páginas vistas y de dónde llegaste.
          Sirve para saber qué funciona del sitio y qué no.
        </p>
        <p>
          <strong>Cuando nos escribes</strong>: el contenido de la conversación
          por WhatsApp, correo o formulario, para poder darle seguimiento.
        </p>
        <p>
          <strong>Lo que nunca guardamos:</strong> los datos de tu tarjeta. El
          número, la fecha y el CVV viajan cifrados directo a la pasarela de
          pago (Culqi o MercadoPago) y nunca pasan por nuestros servidores.
          Nosotros solo vemos si el pago se aprobó o no. Tampoco recogemos datos
          sensibles: no te pedimos información de salud, y si nos cuentas algo
          sobre tu piel en una consulta, no lo usamos para otra cosa que
          responderte.
        </p>
      </LegalSection>

      <LegalSection id="finalidades" n="04" titulo="Para qué los usamos">
        <LegalList>
          <li>
            <strong>Procesar tu pedido</strong>: registrarlo, cobrarlo,
            prepararlo y despacharlo.
          </li>
          <li>
            <strong>Emitir tu comprobante electrónico</strong> (boleta o
            factura) y cumplir con nuestras obligaciones tributarias.
          </li>
          <li>
            <strong>Coordinar la entrega</strong> con el courier o con tú
            directamente.
          </li>
          <li>
            <strong>Atenderte</strong> por WhatsApp o correo: consultas,
            seguimiento, cambios y reclamos.
          </li>
          <li>
            <strong>Mandarte correos del pedido</strong> (confirmación, pago
            recibido, en reparto, entregado). Estos no son publicidad: son parte
            de la compra.
          </li>
          <li>
            <strong>Novedades y promociones</strong>, solo si aceptaste
            recibirlas. Puedes darte de baja desde cualquier correo o pidiéndolo
            por WhatsApp, y no pasa nada más.
          </li>
          <li>
            <strong>Mejorar el sitio</strong> con métricas agregadas de
            navegación.
          </li>
        </LegalList>
        <p>
          No vendemos, alquilamos ni cedemos tu base de contactos a terceros
          para que te vendan cosas. Nunca.
        </p>
      </LegalSection>

      <LegalSection id="terceros" n="05" titulo="Con quién los compartimos">
        <p>
          Solo con los proveedores que necesitamos para que tu pedido exista, y
          únicamente con el dato mínimo que cada uno requiere:
        </p>
        <LegalList>
          <li>
            <strong>Pasarelas de pago</strong> (Culqi, MercadoPago): procesan el
            cobro. Ellas manejan los datos de tu tarjeta bajo su propia política
            de privacidad.
          </li>
          <li>
            <strong>Courier Shalom</strong> y colaboradores de reparto en Lima y
            Cajamarca: reciben nombre, teléfono, DNI del receptor y dirección o
            agencia de destino. Sin eso no te pueden entregar el paquete.
          </li>
          <li>
            <strong>Facturador electrónico (Nubefact)</strong>: recibe los datos
            de facturación para emitir la boleta o factura ante SUNAT.
          </li>
          <li>
            <strong>Servicio de correo transaccional (Resend)</strong>: envía
            los correos de tu pedido.
          </li>
          <li>
            <strong>WhatsApp Business (Meta)</strong>: el canal por el que te
            escribimos y nos escribes.
          </li>
          <li>
            <strong>Infraestructura (Supabase, Vercel)</strong>: base de datos y
            hosting del sitio.
          </li>
          <li>
            <strong>Analítica (Google Analytics, Meta Pixel)</strong>: métricas
            de navegación, tal como se explica en la sección de cookies.
          </li>
          <li>
            <strong>Autoridades</strong>: SUNAT, INDECOPI o el Poder Judicial,
            cuando una norma o una orden nos obligue a entregarlos.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="transferencia" n="06" titulo="Servidores fuera del Perú">
        <p>
          Varios de esos proveedores tienen servidores fuera del país (Estados
          Unidos y la Unión Europea, principalmente). Al comprar aceptas ese{" "}
          <strong>flujo transfronterizo de datos</strong>, que se hace sobre
          plataformas con estándares de seguridad y cláusulas contractuales de
          protección equivalentes a las que exige la Ley 29733.
        </p>
      </LegalSection>

      <LegalSection id="plazo" n="07" titulo="Cuánto tiempo los guardamos">
        <LegalList>
          <li>
            <strong>Datos de pedidos y comprobantes</strong>: al menos 5 años,
            porque la normativa tributaria nos obliga a conservarlos.
          </li>
          <li>
            <strong>Conversaciones de atención</strong>: hasta 2 años desde el
            último contacto, para poder retomar tu historial si vuelves a
            escribir.
          </li>
          <li>
            <strong>Datos de marketing</strong>: hasta que te des de baja o
            revoques tu consentimiento. Ahí los eliminamos de la lista.
          </li>
          <li>
            <strong>Métricas de navegación</strong>: según la política de
            retención de cada herramienta de analítica (entre 2 y 26 meses).
          </li>
        </LegalList>
        <p>
          Cumplido el plazo, los eliminamos o los anonimizamos de forma que ya
          no puedan asociarse a tú.
        </p>
      </LegalSection>

      <LegalSection id="derechos" n="08" titulo="Tus derechos (los ARCO)">
        <p>La ley te da cuatro derechos sobre tus datos, y puedes usarlos gratis:</p>
        <LegalList>
          <li>
            <strong>Acceso</strong>: pedirnos qué datos tuyos tenemos y qué
            hacemos con ellos.
          </li>
          <li>
            <strong>Rectificación</strong>: corregir lo que esté mal o
            incompleto (un DNI mal tipeado, una dirección vieja).
          </li>
          <li>
            <strong>Cancelación</strong>: pedir que los borremos, salvo los que
            estamos obligados a conservar por norma tributaria.
          </li>
          <li>
            <strong>Oposición</strong>: pedir que dejemos de usarlos para una
            finalidad puntual — por ejemplo, sacarte de las promociones y dejar
            solo lo del pedido.
          </li>
        </LegalList>
        <p>
          <strong>Cómo se ejercen:</strong> mándanos un correo a{" "}
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a> con el asunto “Datos
          personales”, indicando qué derecho quieres ejercer y adjuntando una
          copia de tu documento de identidad (solo para confirmar que eres tú y
          no un tercero pidiendo tus datos).
        </p>
        <p>
          Te respondemos dentro de los plazos que fija la Ley 29733: hasta{" "}
          <strong>20 días hábiles</strong> para el acceso y hasta{" "}
          <strong>10 días hábiles</strong> para rectificación, cancelación u
          oposición.
        </p>
        <p>
          Si consideras que no te atendimos bien, puedes reclamar ante la{" "}
          <strong>Autoridad Nacional de Protección de Datos Personales</strong>{" "}
          del Ministerio de Justicia y Derechos Humanos.
        </p>
      </LegalSection>

      <LegalSection id="cookies" n="09" titulo="Cookies y analítica">
        <p>Usamos tres tipos de cookies y tecnologías similares:</p>
        <LegalList>
          <li>
            <strong>Necesarias</strong>: mantienen tu carrito y los datos del
            checkout mientras compras. Sin ellas el sitio no funciona; se
            guardan en tu propio navegador.
          </li>
          <li>
            <strong>Analíticas</strong> (Google Analytics 4, Vercel Analytics):
            nos dicen qué páginas se ven y dónde se traba la gente, de forma
            agregada.
          </li>
          <li>
            <strong>Publicitarias</strong> (Meta Pixel): permiten medir si un
            anuncio funcionó y mostrarte publicidad de Veliroz en Instagram o
            Facebook.
          </li>
        </LegalList>
        <p>
          Puedes bloquear o borrar cookies desde la configuración de tu navegador,
          o desactivar la publicidad personalizada desde tu cuenta de Meta o de
          Google. Si bloqueas las necesarias, el carrito y el checkout van a
          dejar de funcionar bien.
        </p>
      </LegalSection>

      <LegalSection id="seguridad" n="10" titulo="Cómo los protegemos">
        <p>
          El sitio funciona íntegramente sobre HTTPS, la base de datos está
          protegida con reglas de acceso por fila (cada pedido solo es visible
          para quien corresponde) y el acceso al panel interno está limitado a
          las personas del equipo que lo necesitan para trabajar.
        </p>
        <p>
          Ningún sistema es infalible. Si alguna vez ocurriera un incidente que
          afecte tus datos, te lo comunicamos y notificamos a la autoridad
          competente, en vez de esconderlo.
        </p>
      </LegalSection>

      <LegalSection id="menores" n="11" titulo="Menores de edad">
        <p>
          El sitio no está dirigido a menores de 14 años y no recogemos sus
          datos a sabiendas. Si eres madre, padre o tutor y crees que un menor
          nos dejó sus datos, escríbenos y los eliminamos de inmediato.
        </p>
      </LegalSection>

      <LegalSection id="cambios" n="12" titulo="Cambios en esta política">
        <p>
          Si cambiamos algo relevante —una finalidad nueva, un proveedor
          nuevo— actualizamos esta página y su fecha. Cuando el cambio requiera
          tu consentimiento, te lo pedimos antes de aplicarlo, no después.
        </p>
      </LegalSection>

      <LegalSection id="contacto" n="13" titulo="Contacto">
        <p>
          Dudas, pedidos de baja, ejercicio de derechos o simplemente
          curiosidad sobre qué tenemos tuyo:
        </p>
        <LegalList>
          <li>
            Correo: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </li>
          <li>
            WhatsApp:{" "}
            <a
              href={`https://wa.me/${WA_NUMERO}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              +51 967 456 364
            </a>
          </li>
          <li>
            Formulario de <Link href="/contacto">contacto</Link>.
          </li>
        </LegalList>
      </LegalSection>
    </LegalDoc>
  );
}
