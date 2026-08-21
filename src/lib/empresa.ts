/* ============================================================
   Datos legales de la empresa — fuente única.

   Antes vivían repetidos y desincronizados: `/terminos` decía "en trámite
   de inscripción", `/libro-reclamaciones` tenía la constante
   "20-XXXXXXXX-X · pendiente de ficha RUC", y `/privacidad` hablaba del
   responsable sin identificarlo. Tres lugares que un comprador
   desconfiado mira, y los tres decían algo distinto.

   El Libro de Reclamaciones es obligatorio para todo proveedor que
   venda a consumidores en Perú (Código de Protección y Defensa del
   Consumidor), y publicar un RUC de fantasía ahí es observable por
   INDECOPI. Por eso el dato vive acá y se lee, nunca se escribe a mano
   en una página.
   ============================================================ */

export const EMPRESA = {
  /** RUC 20 — persona jurídica. */
  ruc: "20616401280",

  /* ⚠️ COMPLETAR con la razón social EXACTA de la ficha RUC de SUNAT,
     con la forma societaria incluida (S.A.C., S.A.C.S., E.I.R.L.).
     Tiene que coincidir carácter por carácter con SUNAT: en el Libro de
     Reclamaciones y en los Términos, una razón social aproximada vale lo
     mismo que ninguna.

     No se dejó un valor inventado a propósito. Mientras esté vacío, las
     páginas muestran sólo el RUC —que sí es real— en vez de afirmar una
     denominación que podría no ser la registrada. */
  razonSocial: "",

  /** Nombre comercial, el que la clienta reconoce. */
  nombreComercial: "Veliroz Cosmetic",

  domicilioFiscal: "Cajamarca, Perú",
  email: "hola@veliroz.com",
  whatsapp: "51967456364",
  whatsappVisible: "+51 967 456 364",
} as const;

/** Cómo identificarse legalmente, con lo que haya disponible. */
export function identificacionLegal(): string {
  const { razonSocial, ruc, nombreComercial } = EMPRESA;
  return razonSocial
    ? `${razonSocial} (RUC ${ruc}), que opera como ${nombreComercial}`
    : `RUC ${ruc} — ${nombreComercial}`;
}

/** Para el Libro de Reclamaciones, donde el formato importa. */
export function rucFormateado(): string {
  const r = EMPRESA.ruc;
  return `${r.slice(0, 2)}-${r.slice(2, 10)}-${r.slice(10)}`;
}
