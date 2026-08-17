/* ============================================================
   Veliroz Cosmetic — origen canónico del sitio
   ------------------------------------------------------------
   Un solo lugar que decide con qué host se construyen las URLs
   absolutas (sitemap, robots, feeds de Google/Meta, back_urls de
   pasarelas, links de los emails).

   POR QUÉ EXISTE: cada consumidor tenía su propia copia de esta
   lógica y todas priorizaban `VERCEL_URL`. Pero `VERCEL_URL` es el
   host del *deployment* concreto — algo tipo
   `veliroz-cosmetic-j2m1na4zi-znova15s-projects.vercel.app` — no el
   dominio de producción. Resultado: el sitemap publicaba esas URLs
   con hash y Google habría indexado el dominio equivocado.

   Orden correcto:
   1. NEXT_PUBLIC_SITE_URL — override explícito, gana siempre.
   2. En producción, el apex fijo. Deliberadamente NO se consulta
      VERCEL_PROJECT_PRODUCTION_URL: esa variable devuelve "el custom
      domain de producción más corto", que puede cambiar si se agrega
      otro dominio al proyecto. El apex está hardcodeado en los ~20
      `canonical` de las páginas, en `metadataBase`, en el JSON-LD, en
      los emails y en el bot de WhatsApp — si el helper eligiera otro
      host, el canonical declarado contradiría al del sitemap.
   3. VERCEL_URL sólo en preview/dev, donde sí querés el deployment.

   OJO: el apex debe ser el dominio *primary* en Vercel. Si `veliroz.com`
   redirige a `www.veliroz.com`, Google indexa www mientras el canonical
   dice apex — señal contradictoria. Primary = apex, www redirige.
   ============================================================ */

const PRODUCCION = "https://veliroz.com";

function normalizar(url: string): string {
  const conProtocolo = url.startsWith("http") ? url : `https://${url}`;
  return conProtocolo.replace(/\/+$/, "");
}

export function siteUrl(): string {
  const explicito = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicito) return normalizar(explicito);

  if (process.env.VERCEL_ENV === "production") return PRODUCCION;

  // Preview y desarrollo: el host del deployment es lo que corresponde.
  const deployment = process.env.VERCEL_URL;
  if (deployment) return normalizar(deployment);

  return PRODUCCION;
}

/** Une el origen con un path relativo, sin barras duplicadas. */
export function absoluteUrl(path = "/"): string {
  const base = siteUrl();
  if (!path || path === "/") return `${base}/`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
