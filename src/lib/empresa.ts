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

  /* Denominación EXACTA de la partida registral 16289559 (SUNARP,
     inscrita 21-ago-2026), con los puntos incluidos. La completa es
     "NOVVX SOCIEDAD POR ACCIONES CERRADA SIMPLIFICADA"; no se registró
     abreviatura. En el Libro de Reclamaciones y en los Términos, una
     razón social aproximada vale lo mismo que ninguna. */
  razonSocial: "NOVVX S.A.C.S.",

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
