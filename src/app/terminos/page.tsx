import Link from "next/link";
import type { Metadata } from "next";
import { LegalDoc, LegalSection, LegalList } from "@/components/LegalDoc";

/* ============================================================
   /terminos — Términos y Condiciones de venta.

   Obligatorio en Perú para e-commerce (Ley 29571, Código de
   Protección y Defensa del Consumidor) y linkeado desde el texto
   legal del paso 3 del checkout (components/checkout/StepPago.tsx).

   Fuente de verdad de las condiciones comerciales que se repiten
   aquí: /envios (tarifas y plazos), /libro-reclamaciones (datos del
   proveedor) y la PreventaBar (5-7 días de despacho). Si cambia
   una tarifa, cámbiala en los tres lados.

   PENDIENTE HUMANO: razón social + RUC reales cuando salga la
   ficha SUNAT (hoy placeholder, igual que en /libro-reclamaciones).
   ============================================================ */

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Condiciones de compra en Veliroz Cosmetic: pre-venta, precios en soles con IGV, comprobantes electrónicos, medios de pago, envíos y política de devoluciones de 7 días.",
  alternates: { canonical: "/terminos" },
  robots: { index: true, follow: true },
};

const ACTUALIZADO = "16 de agosto de 2026";
const WA_NUMERO = "51967456364";
const EMAIL = "hola@veliroz.com";

const INDICE = [
  { id: "titular", titulo: "Quiénes somos" },
  { id: "objeto", titulo: "Qué vendemos" },
  { id: "compra", titulo: "Cómo se compra (pre-venta)" },
  { id: "precios", titulo: "Precios y comprobantes" },
  { id: "pagos", titulo: "Medios de pago" },
  { id: "envios", titulo: "Envíos y plazos" },
  { id: "devoluciones", titulo: "Devoluciones y retracto" },
  { id: "garantia", titulo: "Garantía y autenticidad" },
  { id: "reclamos", titulo: "Reclamos" },
  { id: "datos", titulo: "Tus datos personales" },
  { id: "sitio", titulo: "Uso del sitio" },
  { id: "cambios", titulo: "Cambios en estos términos" },
  { id: "ley", titulo: "Ley aplicable" },
];

export default function TerminosPage() {
  return (
    <LegalDoc
      breadcrumb="Términos y condiciones"
      kicker="· Lo formal, en claro ·"
      titulo="Términos y condiciones."
      tituloItalic="Sin letra chica."
      resumen={
        <>
          Esto es lo que acordamos cuando compras en veliroz.com. Lo
          escribimos como hablamos: si algo no te queda claro, escríbenos y te
          lo explicamos antes de que pagues.
        </>
      }
      actualizado={ACTUALIZADO}
      indice={INDICE}
    >
      <LegalSection id="titular" n="01" titulo="Quiénes somos">
        <p>
          <strong>Veliroz Cosmetic</strong> es la línea de skincare de Veliroz.
          Operamos desde <strong>Cajamarca, Perú</strong>, y vendemos por este
          sitio (veliroz.com) y por WhatsApp.
        </p>
        <p>
          Razón social y RUC: <strong>en trámite de inscripción</strong>. Apenas
          esté emitida la ficha, los datos van a figurar aquí, en el{" "}
          <Link href="/libro-reclamaciones">Libro de Reclamaciones</Link> y en
          cada comprobante electrónico que emitamos.
        </p>
        <p>
          Nuestros canales oficiales — no tenemos otros, y nunca vas a recibir
          un pedido de pago desde un número distinto:
        </p>
        <LegalList>
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
            Correo: <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
          </li>
          <li>
            Instagram:{" "}
            <a
              href="https://instagram.com/veliroz_02"
              target="_blank"
              rel="noopener noreferrer"
            >
              @Veliroz_02
            </a>
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="objeto" n="02" titulo="Qué vendemos">
        <p>
          Vendemos al detalle <strong>productos cosméticos importados</strong>{" "}
          —principalmente skincare coreano y de farmacia— de marcas que
          seleccionamos una por una. No los fabricamos: los importamos sellados
          y los revendemos tal cual salen de fábrica.
        </p>
        <p>
          La información de rutinas, tipos de piel e ingredientes que publicamos
          en el sitio, el quiz y el diario es{" "}
          <strong>orientativa, no un diagnóstico médico</strong>. Si tienes una
          condición dermatológica, estás embarazada o en tratamiento, consulta a
          tu dermatólogo antes de sumar un activo nuevo. Nada de lo que decimos
          reemplaza esa consulta.
        </p>
        <p>
          Para comprar tienes que ser mayor de edad y tener capacidad legal para
          contratar.
        </p>
      </LegalSection>

      <LegalSection id="compra" n="03" titulo="Cómo se compra (y qué es la pre-venta)">
        <p>
          Hoy <strong>todo el catálogo está en pre-venta</strong>. Eso significa
          que el producto todavía no está físicamente en nuestro almacén cuando
          lo reservas: juntamos los pedidos, cerramos el lote con el importador
          y despachamos.
        </p>
        <p>El flujo completo, paso por paso:</p>
        <LegalList>
          <li>
            Eliges los productos, completas tus datos en el checkout y eliges
            cómo pagas.
          </li>
          <li>
            Al confirmar, generamos tu pedido con un{" "}
            <strong>código único</strong> y te lo mandamos por correo. Ese
            código es tu comprobante de reserva.
          </li>
          <li>
            Te escribimos por WhatsApp para confirmar la reserva y coordinar
            entrega. Si pagaste con Yape, Plin o transferencia, ahí también
            validamos el voucher.
          </li>
          <li>
            Cerrado el lote, preparamos y despachamos en{" "}
            <strong>5 a 7 días</strong> desde la confirmación del pago.
          </li>
        </LegalList>
        <p>
          <strong>El pedido queda cerrado cuando lo confirmamos nosotros</strong>
          , no en el momento del click. Si un producto se agota en el lote o el
          precio del proveedor cambia de forma significativa antes de
          confirmarte, te avisamos y eliges: esperar el siguiente lote, cambiar
          por otro producto o que te devolvamos el 100% de lo pagado. Sin
          vueltas ni descuentos por “gastos administrativos”.
        </p>
        <p>
          Puedes cancelar tu pre-venta sin costo{" "}
          <strong>mientras el pedido no haya sido despachado</strong>. Escríbenos
          por WhatsApp con tu código y te devolvemos lo pagado por el mismo
          medio.
        </p>
      </LegalSection>

      <LegalSection id="precios" n="04" titulo="Precios y comprobantes">
        <p>
          Todos los precios están en <strong>soles (S/) e incluyen IGV</strong>.
          Lo que ves en la ficha del producto es lo que pagas por ese producto;
          el costo de envío se calcula aparte en el checkout y se muestra antes
          de que confirmes.
        </p>
        <p>
          Por cada compra emitimos <strong>comprobante electrónico</strong> —
          boleta o factura, según lo que elijas en el checkout— y te llega por
          correo. Para factura necesitamos RUC, razón social y dirección fiscal;
          para boleta, tu DNI. Los comprobantes se emiten a través de un
          proveedor autorizado por SUNAT.
        </p>
        <p>
          Hacemos lo posible por que precios, fotos y descripciones estén
          siempre correctos, pero pueden colarse errores de tipeo o de carga. Si
          un precio publicado es evidentemente equivocado (por ejemplo, un
          sérum de S/89 listado en S/8,90), no estamos obligados a vender a ese
          precio: te avisamos antes de cobrar y decides si quieres continuar al
          precio real o cancelar sin costo.
        </p>
        <p>
          Las promociones y cupones tienen sus propias condiciones (vigencia,
          mínimo de compra, productos incluidos) y no son acumulables salvo que
          digamos expresamente lo contrario.
        </p>
      </LegalSection>

      <LegalSection id="pagos" n="05" titulo="Medios de pago">
        <p>Aceptamos:</p>
        <LegalList>
          <li>
            <strong>Tarjeta de crédito o débito</strong> (Visa, Mastercard,
            Amex) mediante las pasarelas Culqi y MercadoPago.
          </li>
          <li>
            <strong>Yape y Plin</strong> al +51 967 456 364. Después de pagar,
            mándanos el voucher por WhatsApp para confirmar tu pedido el mismo
            día.
          </li>
          <li>
            <strong>Transferencia bancaria</strong> a la cuenta que te pasamos
            por WhatsApp al confirmar el pedido.
          </li>
          <li>
            <strong>PagoEfectivo</strong>: generamos un código CIP para pagar en
            agentes y banca por internet. El CIP vence a las 24 horas; si vence,
            el pedido se libera y hay que rehacerlo.
          </li>
        </LegalList>
        <p>
          <strong>Nunca vemos ni guardamos los datos de tu tarjeta.</strong> Esa
          información viaja cifrada directo a la pasarela de pago, que es quien
          la procesa bajo estándar PCI DSS.
        </p>
        <p>
          Si tu pago es rechazado o no llega a acreditarse, el pedido queda en
          estado pendiente y no entra al lote. Te escribimos antes de darlo de
          baja.
        </p>
      </LegalSection>

      <LegalSection id="envios" n="06" titulo="Envíos y plazos">
        <p>Enviamos a todo el Perú desde Cajamarca:</p>
        <LegalList>
          <li>
            <strong>Nacional, agencia Shalom: S/12</strong> — 2 a 5 días hábiles
            según ciudad, para retiro en agencia.
          </li>
          <li>
            <strong>Lima, a domicilio: S/18</strong> — 1 a 2 días hábiles.
          </li>
          <li>
            <strong>Cajamarca ciudad: S/3 a S/5</strong> contra entrega, y{" "}
            <strong>retiro gratis</strong> coordinado en Puylucana.
          </li>
          <li>
            <strong>Envío gratis a agencia Shalom desde S/149</strong> de
            subtotal — se activa solo en el checkout.
          </li>
        </LegalList>
        <p>
          Los plazos se cuentan en <strong>días hábiles desde el despacho</strong>
          , no desde la compra, y suman los 5-7 días de cierre de lote de la
          pre-venta. Los tiempos de la agencia dependen de Shalom: hacemos el
          seguimiento con tú, pero no controlamos su operación ni respondemos
          por demoras, paros o cierres de carretera ajenos a nosotros.
        </p>
        <p>
          Es tu responsabilidad darnos una dirección y un contacto correctos. Si
          el envío se pierde o vuelve por datos mal cargados, el reenvío corre
          por tu cuenta. Revisa el detalle completo de zonas y proceso en{" "}
          <Link href="/envios">envíos y devoluciones</Link>.
        </p>
      </LegalSection>

      <LegalSection
        id="devoluciones"
        n="07"
        titulo="Devoluciones, cambios y derecho de retracto"
      >
        <p>
          Tienes <strong>7 días calendario desde que recibes el pedido</strong>{" "}
          para pedir la devolución de un producto{" "}
          <strong>sin abrir, con el sello y el empaque original intactos</strong>
          . Escríbenos por WhatsApp con tu código de pedido y una foto del
          producto y coordinamos el retorno.
        </p>
        <p>
          <strong>
            Por razones sanitarias, un producto abierto no admite devolución.
          </strong>{" "}
          La cosmética que entró en contacto con la piel no puede volver al
          stock ni revenderse: es una regla de higiene, no una excusa comercial.
          La única excepción —y siempre respondemos por ella— es el defecto de
          fábrica.
        </p>
        <p>Sí cambiamos o devolvemos, abierto o cerrado:</p>
        <LegalList>
          <li>Productos con defecto de fábrica.</li>
          <li>Productos equivocados respecto de lo que pediste.</li>
          <li>
            Productos dañados en el transporte — guarda la caja de envío, es la
            evidencia.
          </li>
          <li>Productos vencidos o con fecha de vencimiento inminente.</li>
        </LegalList>
        <p>
          En esos casos el costo del retorno lo asumimos nosotros. En una
          devolución por arrepentimiento (producto cerrado dentro de los 7
          días), el flete de retorno corre por tu cuenta y te devolvemos el
          valor del producto.
        </p>
        <p>
          Los reembolsos se hacen por el mismo medio de pago original y demoran{" "}
          <strong>5 a 10 días hábiles</strong> según el banco o la pasarela.
          También podemos emitir nota de crédito para tu próxima compra, si lo
          prefieres.
        </p>
      </LegalSection>

      <LegalSection id="garantia" n="08" titulo="Garantía y autenticidad">
        <p>
          Todo lo que vendemos es <strong>original y sellado de fábrica</strong>
          . Trabajamos con importadores y distribuidores formales, y los
          productos cuentan con el registro sanitario correspondiente a nombre
          del importador ante DIGEMID.
        </p>
        <p>
          Si alguna vez recibes un producto y dudas de su autenticidad,
          escríbenos: te pedimos el lote, lo rastreamos con el importador y, si
          hay algo raro, te devolvemos el dinero completo. Sin discusión.
        </p>
        <p>
          Lo que <strong>no</strong> garantizamos es un resultado cosmético
          determinado. La piel de cada persona responde distinto: un producto
          que a una le cambió la vida a otra puede no hacerle nada. Eso no
          constituye defecto ni da derecho a devolución.
        </p>
      </LegalSection>

      <LegalSection id="reclamos" n="09" titulo="Reclamos">
        <p>
          Si algo salió mal, el camino corto es WhatsApp: casi todo lo
          resolvemos el mismo día.
        </p>
        <p>
          Si prefieres el camino formal, tenemos{" "}
          <Link href="/libro-reclamaciones">Libro de Reclamaciones virtual</Link>
          , conforme al Código de Protección y Defensa del Consumidor (Ley
          29571) y su reglamento. Toda queja o reclamo registrado ahí se
          responde en un plazo máximo de <strong>30 días calendario</strong>.
        </p>
        <p>
          Presentar un reclamo en nuestro libro no te impide acudir a{" "}
          <a
            href="https://www.consumidor.gob.pe/"
            target="_blank"
            rel="noopener noreferrer"
          >
            INDECOPI
          </a>{" "}
          cuando quieras.
        </p>
      </LegalSection>

      <LegalSection id="datos" n="10" titulo="Tus datos personales">
        <p>
          Los datos que nos das para comprar (nombre, correo, teléfono,
          DNI o RUC, dirección) los tratamos según la{" "}
          <strong>Ley N.º 29733 de Protección de Datos Personales</strong> y su
          reglamento. Los usamos para procesar tu pedido, emitir el comprobante,
          coordinar la entrega y atenderte — nada más.
        </p>
        <p>
          El detalle completo (con quién los compartimos, cuánto tiempo los
          guardamos y cómo ejercer tus derechos de acceso, rectificación,
          cancelación y oposición) está en nuestra{" "}
          <Link href="/privacidad">Política de Privacidad</Link>.
        </p>
      </LegalSection>

      <LegalSection id="sitio" n="11" titulo="Uso del sitio y contenidos">
        <p>
          Los textos, fotos de producto, guías de rutina y diseño de veliroz.com
          son nuestros o los usamos con autorización. Puedes compartirlos citando
          la fuente; no puedes copiarlos para revender ni para armar una tienda
          con nuestro contenido.
        </p>
        <p>
          Las marcas de terceros que aparecen en el catálogo (Beauty of
          Joseon, Anua, Round Lab, COSRX, SKIN1004 y las demás) pertenecen a sus
          titulares. Las mostramos porque vendemos sus productos, no porque
          representemos oficialmente a esas marcas.
        </p>
        <p>
          Te pedimos no usar el sitio para nada ilegal, no intentar vulnerarlo y
          no cargar datos de terceros sin su permiso. Podemos suspender pedidos
          con indicios de fraude.
        </p>
      </LegalSection>

      <LegalSection id="cambios" n="12" titulo="Cambios en estos términos">
        <p>
          Podemos actualizar estos términos cuando cambie algo de la operación
          (tarifas, medios de pago, plazos). La versión vigente es siempre la que
          está publicada aquí, con su fecha de actualización arriba.
        </p>
        <p>
          <strong>
            A tu pedido se le aplican los términos que estaban publicados el día
            que lo hiciste
          </strong>
          , no los que vengan después.
        </p>
      </LegalSection>

      <LegalSection id="ley" n="13" titulo="Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por las leyes de la{" "}
          <strong>República del Perú</strong>, en particular por el Código de
          Protección y Defensa del Consumidor (Ley 29571) y la Ley 29733 de
          Protección de Datos Personales.
        </p>
        <p>
          Ante cualquier controversia, primero intentamos resolverla
          directamente con tú. Si no llegamos a un acuerdo, puedes recurrir a
          INDECOPI o a los juzgados de la ciudad de Cajamarca.
        </p>
      </LegalSection>
    </LegalDoc>
  );
}
