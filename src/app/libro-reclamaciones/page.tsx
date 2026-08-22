import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { EMPRESA, rucFormateado } from "@/lib/empresa";

/* ============================================================
   /libro-reclamaciones — cumplimiento INDECOPI.
   Formato virtual del Libro de Reclamaciones exigido en Perú
   (Código de Protección y Defensa del Consumidor · Ley 29571 y
   D.S. 011-2011-PCM modificado por D.S. 006-2014-PCM).

   ANTES: el <form> posteaba a `action="mailto:hola@veliroz.com"`.
   Un submit de formulario HTML hacia mailto: no funciona en Chrome ni
   en Safari móvil, y de ahí viene casi todo el tráfico (entra desde
   Instagram). El reclamo se perdía entero y la persona se iba creyendo
   que lo había presentado. No había registro de nada.

   AHORA: POST nativo a /api/reclamos, que guarda en la tabla
   `reclamos`, asigna el código correlativo (LR-2026-0001) y encola los
   dos correos. La ruta responde con un 303 de vuelta acá:
     ?codigo=LR-…&limite=YYYY-MM-DD  → constancia
     ?error=<codigo>                 → mensaje legible, abajo
     &copia=0                        → se guardó pero el correo no salió

   POR QUÉ SIN JAVASCRIPT: esta página exporta `metadata`, así que es
   Server Component, y un formulario con estado exigiría un archivo de
   cliente aparte. Pero además es lo correcto: el Libro de
   Reclamaciones es obligatorio y tiene que poder enviarse dentro del
   navegador embebido de Instagram, que es donde el JS se comporta más
   raro. Un POST nativo + 303 no depende de nada. El costo es que no
   hay spinner: el indicador de carga es el del navegador.
   ============================================================ */

export const metadata: Metadata = {
  title: "Libro de reclamaciones",
  description:
    "Libro de Reclamaciones virtual · Veliroz Cosmetic. Cumplimiento INDECOPI (Ley 29571, D.S. 011-2011-PCM).",
  alternates: { canonical: "/libro-reclamaciones" },
  robots: { index: true, follow: true },
};

/* Los datos legales salen de src/lib/empresa.ts — fuente única. Antes esta
   página publicaba "20-XXXXXXXX-X · pendiente de ficha RUC", que es
   observable por INDECOPI y lo primero que mira un comprador desconfiado. */
const RAZON_SOCIAL = EMPRESA.razonSocial || EMPRESA.nombreComercial;
const RUC = rucFormateado();
const EMAIL_RECLAMOS = EMPRESA.email;
const WA_NUMERO = EMPRESA.whatsapp;

type SearchParams = Record<string, string | string[] | undefined>;

function readSingle(sp: SearchParams, k: string): string | undefined {
  const v = sp[k];
  const raw = Array.isArray(v) ? v[0] : v;
  const clean = raw?.trim();
  return clean ? clean : undefined;
}

/* La API devuelve códigos, no frases: el texto vive acá, en el mismo
   idioma y el mismo tono que el resto de la página. Cualquier código
   que no esté en el mapa cae al mensaje genérico — nunca se imprime
   en pantalla lo que vino en la URL. */
const ERRORES: Record<string, string> = {
  datos_incompletos:
    "Faltan datos obligatorios o alguno quedó demasiado corto. Revisa el formulario: los campos con asterisco son los que exige la norma.",
  email_invalido:
    "El correo no parece válido. Revísalo — es a donde te enviamos tu constancia.",
  documento_invalido:
    "El número de documento no parece válido. El DNI son 8 dígitos; para carné de extranjería o pasaporte, escríbelo tal cual figura.",
  sin_consentimiento:
    "Tienes que marcar la declaración del final para poder registrar tu reclamación.",
  demasiados_intentos:
    "Recibimos varios envíos desde tu conexión en la última hora. Espera un momento o escríbenos directo por WhatsApp — igual queda registrado.",
  sin_service_role:
    "Tuvimos un problema de configuración de nuestro lado y no pudimos registrar tu reclamación. Escríbenos por WhatsApp ahora mismo y la registramos nosotros.",
  db: "No pudimos guardar tu reclamación por un problema nuestro. Escríbenos por WhatsApp y la registramos nosotros — no pierdas el tiempo reintentando.",
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

/* Formateo a mano en vez de new Date(iso).toLocaleDateString(): el
   string "2026-09-20" se parsea como medianoche UTC y, según la zona del
   runtime, se imprime como el día anterior. Es un plazo legal: un día de
   diferencia cambia cuándo estamos en falta. */
function fechaLarga(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, anio, mes, dia] = m;
  const nombreMes = MESES[Number(mes) - 1];
  if (!nombreMes) return null;
  return `${Number(dia)} de ${nombreMes} de ${anio}`;
}

/* Sólo se muestra en pantalla si tiene la forma de un código nuestro.
   La URL la escribe cualquiera, y el código va dentro de un bloque
   grande y destacado: es exactamente el lugar donde no queremos
   imprimir texto arbitrario. */
function codigoValido(c: string): boolean {
  return /^LR-\d{4}-\d{4,6}$/.test(c);
}

export default async function LibroReclamacionesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const codigoParam = readSingle(sp, "codigo");
  const codigo = codigoParam && codigoValido(codigoParam) ? codigoParam : null;
  const limite = readSingle(sp, "limite");
  const fechaLimite = limite ? fechaLarga(limite) : null;
  const copiaEnviada = readSingle(sp, "copia") !== "0";

  const errorParam = readSingle(sp, "error");
  const mensajeError = errorParam
    ? (ERRORES[errorParam] ??
      "No pudimos registrar tu reclamación. Escríbenos por WhatsApp y la registramos nosotros.")
    : null;

  const waHref = `https://wa.me/${WA_NUMERO}?text=${encodeURIComponent(
    codigo
      ? `Hola Veliroz Cosmetic, quiero hacer seguimiento a mi reclamación ${codigo}.`
      : "Hola Veliroz Cosmetic, quiero presentar una reclamación en el Libro de Reclamaciones.",
  )}`;

  return (
    <main className="min-h-screen">
      {/* ────────────────── HERO ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-8">
        <nav
          aria-label="Migas de pan"
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-taupe mb-4"
        >
          <Link href="/" className="hover:text-ink">
            Inicio
          </Link>
          <span className="mx-2">·</span>
          <span className="text-ink">Libro de reclamaciones</span>
        </nav>

        <div className="max-w-2xl space-y-3">
          <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            · Cumplimiento INDECOPI ·
          </span>
          <h1 className="font-serif text-[--text-display] text-ink leading-[0.98] text-balance">
            Libro de reclamaciones.
          </h1>
          <p className="text-clay text-pretty leading-relaxed">
            Este formulario cumple con lo establecido en el Código de Protección
            y Defensa del Consumidor (Ley 29571) y su reglamento (D.S.
            011-2011-PCM, modificado por D.S. 006-2014-PCM). Tu queja/reclamo se
            atenderá en un plazo máximo de <strong>30 días calendario</strong>.
          </p>
        </div>
      </section>

      {/* ────────────────── DATOS DEL PROVEEDOR ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-8">
        <div className="bg-mist/50 border border-[--border] rounded-lg p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe mb-1">
              Razón social
            </p>
            <p className="text-ink">{RAZON_SOCIAL}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe mb-1">
              RUC
            </p>
            <p className="font-mono text-ink text-xs">{RUC}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-taupe mb-1">
              Domicilio fiscal
            </p>
            <p className="text-ink text-xs text-pretty">
              Cajamarca, Perú · dirección exacta en boleta electrónica
            </p>
          </div>
        </div>
      </section>

      {codigo ? (
        /* ────────────────── CONSTANCIA ──────────────────
           Reemplaza al formulario: lo único que la persona necesita de
           esta pantalla es el código, y competir con 20 inputs por su
           atención sería una forma rara de dárselo. */
        <section className="max-w-3xl mx-auto px-6 md:px-10 pb-16">
          <div className="bg-surface border border-leaf/40 rounded-lg p-6 md:p-10 space-y-6">
            <div className="space-y-2">
              {/* El verde `leaf` queda en el borde y no en el texto: sobre
                  blanco da ~3.4:1 de contraste y este renglón es de 10px.
                  El taupe del resto de la página sí pasa AA. */}
              <span className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                · Reclamación registrada ·
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-ink italic text-balance">
                Listo. Quedó anotada en el libro.
              </h2>
            </div>

            <div className="bg-mist/60 border border-champagne/50 rounded-lg p-6 md:p-8 text-center space-y-2">
              <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
                Tu código de registro
              </p>
              <p className="font-mono text-ink text-2xl md:text-4xl tracking-[0.06em] break-all">
                {codigo}
              </p>
              <p className="text-xs text-clay text-pretty">
                Guárdalo. Es tu constancia de que presentaste la reclamación y
                es con lo que le haces seguimiento.
              </p>
            </div>

            {fechaLimite && (
              <p className="text-sm text-clay text-pretty leading-relaxed">
                Tenemos hasta el <strong className="text-ink">{fechaLimite}</strong>{" "}
                para responderte — los 30 días calendario del artículo 152 de la
                Ley 29571. En la práctica te escribimos mucho antes; el plazo es
                el techo, no la meta.
              </p>
            )}

            <p className="text-sm text-clay text-pretty leading-relaxed">
              {copiaEnviada ? (
                <>
                  Te enviamos una copia con todo lo que registraste al correo
                  que dejaste. Si no la ves en unos minutos, revisa spam o
                  promociones.
                </>
              ) : (
                <>
                  Tu reclamación quedó guardada, pero no pudimos enviarte la
                  copia por correo. Anota el código y escríbenos por WhatsApp
                  para que te la reenviemos.
                </>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary justify-center"
              >
                Hacer seguimiento por WhatsApp
              </a>
              <Link
                href="/libro-reclamaciones"
                className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-md border border-[--border-2] text-ink text-sm hover:border-ink"
              >
                Registrar otra reclamación
              </Link>
            </div>
          </div>
        </section>
      ) : (
        /* ────────────────── FORMULARIO ────────────────── */
        <section className="max-w-3xl mx-auto px-6 md:px-10 pb-16">
          {mensajeError && (
            <div
              role="alert"
              className="mb-6 bg-surface border border-[--veliroz-danger] rounded-lg p-5 space-y-2"
            >
              <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-[--veliroz-danger]">
                No se registró
              </p>
              <p className="text-sm text-ink text-pretty leading-relaxed">
                {mensajeError}
              </p>
              <p className="text-xs text-clay text-pretty">
                Vuelve atrás con el botón del navegador: lo que escribiste
                sigue en el formulario. O escríbenos por{" "}
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline underline-offset-4"
                >
                  WhatsApp
                </a>
                .
              </p>
            </div>
          )}

          <form
            action="/api/reclamos"
            method="post"
            className="bg-surface border border-[--border] rounded-lg p-6 md:p-8 space-y-6"
            aria-label="Formulario libro de reclamaciones"
          >
            {/* Bloque 1 — Datos del consumidor */}
            <fieldset className="space-y-4">
              <legend className="font-serif text-lg text-ink italic">
                1 · Identificación del consumidor
              </legend>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                    Nombres y apellidos *
                  </span>
                  <input
                    type="text"
                    name="nombres"
                    required
                    maxLength={120}
                    autoComplete="name"
                    className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                    DNI / CE *
                  </span>
                  <input
                    type="text"
                    name="dni"
                    required
                    pattern="[0-9A-Za-z]{6,15}"
                    maxLength={15}
                    inputMode="numeric"
                    autoComplete="off"
                    className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                    Correo *
                  </span>
                  <input
                    type="email"
                    name="correo"
                    required
                    maxLength={160}
                    autoComplete="email"
                    className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                    Teléfono / WhatsApp
                  </span>
                  <input
                    type="tel"
                    name="telefono"
                    maxLength={30}
                    autoComplete="tel"
                    className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                  />
                </label>
              </div>

              {/* Domicilio pasó a obligatorio: el Anexo del D.S. 011-2011-PCM
                  lo lista dentro de la identificación del reclamante, y es la
                  dirección a la que se notifica si el caso escala. */}
              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Domicilio *
                </span>
                <input
                  type="text"
                  name="domicilio"
                  required
                  maxLength={200}
                  autoComplete="street-address"
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                />
              </label>
            </fieldset>

            {/* Bloque 2 — Datos del bien / servicio */}
            <fieldset className="space-y-4 pt-4 border-t border-[--border]">
              <legend className="font-serif text-lg text-ink italic">
                2 · Identificación del bien contratado
              </legend>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block space-y-1.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                    Tipo *
                  </span>
                  <select
                    name="tipo_bien"
                    required
                    className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                  >
                    <option value="producto">Producto</option>
                    <option value="servicio">Servicio</option>
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                    N° de boleta / factura
                  </span>
                  <input
                    type="text"
                    name="boleta"
                    placeholder="B001-000123"
                    maxLength={40}
                    className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                  />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Descripción del bien / servicio *
                </span>
                <input
                  type="text"
                  name="descripcion_bien"
                  required
                  maxLength={300}
                  placeholder="Ej: Relief Sun SPF50+ · Beauty of Joseon"
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Monto reclamado (S/.)
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="monto"
                  className="w-full px-4 py-2.5 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink md:w-1/3"
                />
              </label>
            </fieldset>

            {/* Bloque 3 — Detalle */}
            <fieldset className="space-y-4 pt-4 border-t border-[--border]">
              <legend className="font-serif text-lg text-ink italic">
                3 · Detalle de la reclamación
              </legend>

              <div className="space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Tipo *
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="flex items-start gap-3 p-3 bg-mist/40 border border-[--border] rounded-md cursor-pointer hover:border-ink">
                    <input
                      type="radio"
                      name="tipo_solicitud"
                      value="Reclamo"
                      required
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm text-ink font-medium">Reclamo</p>
                      <p className="text-xs text-clay">
                        Disconformidad con el bien o servicio.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 bg-mist/40 border border-[--border] rounded-md cursor-pointer hover:border-ink">
                    <input
                      type="radio"
                      name="tipo_solicitud"
                      value="Queja"
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm text-ink font-medium">Queja</p>
                      <p className="text-xs text-clay">
                        Malestar respecto a la atención al público.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Detalle *
                </span>
                <textarea
                  name="detalle"
                  required
                  rows={5}
                  minLength={10}
                  maxLength={5000}
                  placeholder="Describe lo ocurrido con la mayor cantidad de detalles posible."
                  className="w-full px-4 py-3 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink resize-y"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-taupe">
                  Pedido concreto *
                </span>
                <textarea
                  name="pedido"
                  required
                  rows={3}
                  maxLength={2000}
                  placeholder="Qué solución esperas — cambio, devolución, disculpas formales, etc."
                  className="w-full px-4 py-3 rounded-md border border-[--border-2] bg-cream text-ink text-sm focus:outline-none focus:border-ink resize-y"
                />
              </label>
            </fieldset>

            {/* Honeypot: display:none, sin tabIndex y con autocomplete
                apagado. Ninguna persona lo ve; los bots que rellenan todo
                input caen. El servidor descarta esos envíos en silencio.
                Va oculto con `hidden`, así que ningún lector de pantalla
                lo anuncia y no necesita etiqueta visible. */}
            <input
              type="text"
              name="website"
              hidden
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {/* Consentimiento + submit */}
            <div className="pt-4 border-t border-[--border] space-y-4">
              <label className="flex items-start gap-3 text-xs text-clay text-pretty">
                <input
                  type="checkbox"
                  name="consentimiento"
                  value="si"
                  required
                  className="mt-1"
                />
                <span>
                  Declaro que la información brindada es verdadera y acepto que
                  Veliroz Cosmetic la utilice exclusivamente para atender la
                  presente reclamación, en conformidad con la Ley 29733 de
                  Protección de Datos Personales.
                </span>
              </label>

              <button type="submit" className="btn-primary w-full justify-center">
                Enviar reclamación
              </button>

              <p className="text-[11px] text-clay text-center text-pretty">
                Al enviar queda registrada con un código correlativo y te llega
                una copia por correo. Si prefieres, escríbenos directo a{" "}
                <a
                  href={`mailto:${EMAIL_RECLAMOS}`}
                  className="text-ink underline underline-offset-4"
                >
                  {EMAIL_RECLAMOS}
                </a>{" "}
                o por{" "}
                <a
                  href={`https://wa.me/${WA_NUMERO}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline underline-offset-4"
                >
                  WhatsApp
                </a>
                .
              </p>
            </div>
          </form>
        </section>
      )}

      {/* ────────────────── NOTA INDECOPI ────────────────── */}
      <section className="max-w-4xl mx-auto px-6 md:px-10 pb-24">
        <div className="bg-cream/60 border border-[--border] rounded-lg p-6 space-y-3">
          <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-taupe">
            Aviso INDECOPI
          </p>
          <p className="text-sm text-clay text-pretty leading-relaxed">
            Conforme al artículo 152° del Código de Protección y Defensa del
            Consumidor, el proveedor debe atender el reclamo o queja en un
            plazo no mayor a <strong>30 días calendario</strong>, contados
            desde el día siguiente de su presentación. Si tu reclamo no fue
            atendido satisfactoriamente, puedes presentar tu caso ante{" "}
            <a
              href="https://www.consumidor.gob.pe/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-4"
            >
              INDECOPI
            </a>
            .
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
