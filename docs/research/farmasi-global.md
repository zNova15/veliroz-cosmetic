# FARMASI — Informe de marca (investigación primaria, 19-ago-2026)

> Método: scraping directo con `firecrawl` sobre farmasius.com (US) y farmasi.pe (Perú), + WebFetch/WebSearch. Todo dato lleva su URL. Lo que **no** pude verificar está marcado explícitamente como ⚠️ NO VERIFICADO.

---

## 1. Sitios oficiales, categorías, SKUs y precios

### Arquitectura de dominios (importante, se presta a confusión)

| Dominio | Qué es | Fuente |
|---|---|---|
| `farmasi.com` | **No es tienda.** Es un hub selector de país que redirige a los sitios locales. Tagline: "Beauty. Wellness. Opportunity!!" | https://www.farmasi.com/ |
| `farmasius.com` | Tienda oficial **EE.UU.** Operada por *Farmasi US LLC*. | https://www.farmasius.com/farmasi |
| `farmasi.pe` | **Tienda oficial PERÚ.** Operada por **"Farmasi SAC (DBA 'Farmasi')"** | https://www.farmasi.pe/farmasi · entidad citada en https://www.farmasi.pe/farmasi/content/terms-of-use |
| `farmasi.com.tr` | Turquía. Tagline local traducido: "Beauty. Good living. Opportunity!" | https://www.farmasi.com.tr/kurumsal |

El selector de país de farmasi.com lista **9 países en Sudamérica** (Brasil, **Perú**, Colombia, Ecuador, Paraguay, Bolivia, Chile, Argentina, Venezuela), ~36 en Europa, 17 en Norteamérica/Caribe, 9 en África y Malasia en Asia.

**Las URLs de producto son idénticas entre países** (mismo `cid` de categoría, mismo código de producto de 7 dígitos). Ej: `cid=5aecb19a-63d3-eb11-a315-005056010963` = Skin Care en US **y** "Cuidado de la Piel" en PE. Es un mismo catálogo global con precios locales.

### Categorías reales del menú (farmasius.com, extraídas del nav)

Nivel 1: **Nutrition · Makeup · Skin Care · Hair Care · Self Care · Men · Subscription Program · Gift Cards · Brand Tools · Farmasi Gear · Events**

Desglose relevante para skincare:
- **Skin Care → Shop by Series:** Absolute · Age Reversist · Aqua · Lumi Radiance · Calendula · Tea Tree · Resurface · Vitamin C · Cleansing
- **Skin Care → Shop by Category:** Cleansers · Serums & Treatments · Face Masks · Toners · Eye Care
- **Skin Care → Shop by Concern:** Wrinkles & Fine Lines · Oiliness · Dryness · Sensitive Skin · Dark Spots
- **Makeup:** Eyes (Mascara, Eyeliner/Dipliner, Eyeshadow Palettes, Eye Primer, Eyebrow) · Lips (Liquid Lipstick, Lipstick, Lip Gloss, Lip Liner, Lip Balm & Treatment) · **Latina Collection** · Face & Body (BB & CC Creams, Foundation, Primer, Face Palettes, Concealer, Powder, Blush, Bronzer, Highlighter & Contour, Setting Spray & Powder, Makeup Removers) · Accessories (Brushes & Sponges)
- **Self Care:** Hands & Feet · Soaps · Oral Care · Fragrances · Body Treatment

Nav completo en: https://www.farmasius.com/farmasi
Nav en español (Perú): https://www.farmasi.pe/farmasi — Maquillaje / Cuidado de la Piel / Nutriplus / Cuidado Personal / Fragancias / **Protección Solar** / Cabello

### Conteo de SKUs (contador literal "N Products" de cada página de categoría, US)

| Categoría | SKUs | URL |
|---|---|---|
| Makeup | **62** | `/product-list/makeup?cid=2bf65b5e-60d3-eb11-a315-005056010963` |
| Skin Care | **47** | `/product-list/skin-care?cid=5aecb19a-63d3-eb11-a315-005056010963` |
| Self Care | **37** | `/product-list/self-care?cid=2b99ca57-65d3-eb11-a315-005056010963` |
| Face & Body (sub de makeup) | **20** | `/product-list/face-body?cid=e1a8ea71-60d3-eb11-a315-005056010963` |
| Hair Care | **13** | `/product-list/hair-care?cid=020e6efe-64d3-eb11-a315-005056010963` |
| Serums & Treatments | **10** | `/product-list/serums-treatments?cid=587a09d6-63d3-eb11-a315-005056010963` |
| Fragrances | **8** | `/product-list/fragrances?cid=a93650d8-a461-ed11-83af-000d3a71539d` |
| Cleansers | **7** | `/product-list/cleansers?cid=8b3124cc-63d3-eb11-a315-005056010963` |
| Mascara | **7** | `/product-list/mascara?cid=8635e0a4-60d3-eb11-a315-005056010963` |
| Absolute (línea premium) | **2** | `/product-list/absolute?cid=7945b987-7fb2-ed11-83b3-000d3a71539d` |

⚠️ **NO VERIFICADO — total de SKUs del sitio US.** No hay página "ver todo" con contador global; las categorías se solapan (Face & Body está dentro de Makeup) y el contador **no cuenta tonos**: existe una URL `all-makeup-products?...&pageNumber=4` que sugiere paginación mayor. Como referencia de tamaño real: la base VFX Pro Camera Ready Foundation sola tiene ~23 tonos (00 Alabaster → 22 Truffle, pids 1002023–1002046).
⚠️ Los "1,000+ productos" y "500+ productos en USA" que circulan salen de fuentes secundarias, **no** de una página oficial que yo haya podido leer.

### Rangos de precio USD (farmasius.com, precio catálogo)

| Categoría | Rango observado |
|---|---|
| Skincare (Dr. C. Tuna) | **$19.00 → $90.00** — piso: Tea Tree Face Wash $19 / Tea Tree Face Toner $19. Techo: Resurface Retinol Reviving Serum **$90**; Absolute Super Elixir $90 (en oferta $60) |
| Makeup | **$18.50 → $39.90** — Rich Oil Stick $18.50; VFX Pro Foundation $39.90; paletas $34.00–$37.50 |
| Mascaras | **$13.90 → $33.00** |
| Hair Care | **$17.90 → $33.90** |
| Self Care / cuerpo | **$8.90 → $54.90** |
| Fragancias | **$27.00 → $59.90** |

**Doble precio en todas las fichas:** precio catálogo + **"PC Price" = exactamente −25%** (Preferred Customer / suscripción). Ej: Vitamin C Glow Serum $65.00 / PC $48.75. Además hay descuentos agresivos permanentes tipo "UP TO 40% OFF!", "11.11", "up-to-60-off".

### Precios Perú (farmasi.pe — soles, catálogo público)

Rango observado **S/18.00 → S/293.00**. Muestras reales:

| Producto | Precio |
|---|---|
| Dr. C. Tuna Vitamin C Glow Serum (1002167) | **S/210.00** |
| Age Reversist Crema Perfeccionadora Instantánea (1000275) | **S/272.00** |
| Resurface Suero Revitalizador (1000279) | S/293.00 → **S/175.80** |
| Age Reversist Crema Hidratante (1000271) | S/170.00 → S/102.00 |
| Age Reversist Crema de Contorno de Ojos (1000273) | S/133.00 → S/79.80 |
| Calendula Crema Facial (1000285) | S/75.00 |
| Dr. C. Tuna Sun Body Lotion SPF 50+ (1001334) | S/75.00 |
| Máscara Double Lash Extend (1301518) | S/75.00 |
| BB Cream Light to Medium 02 (1001552) | S/50.00 |
| Bálsamo Hidratante Frutos Rojos (1000240) | S/18.00 |

Fuente: https://www.farmasi.pe/farmasi (scrape 19-ago-2026)
**Paridad:** Vitamin C Glow Serum = $65 US ≈ S/245 vs **S/210 en Perú** → Perú está *más barato* que USA a tipo de cambio. Esto mata cualquier tesis de "importarlo de EE.UU. y revenderlo con margen".

---

## 2. Posicionamiento

**Es ambos y más: es una casa de marcas, no una marca de skincare.** El portafolio oficial cubre 4 verticales:

- **Skincare → `Dr. C. Tuna`** (marca-firma, lleva el apellido del fundador médico). 8-9 series segmentadas por concern.
- **Color cosmetics → `Farmasi` / `VFX Pro`** (línea "camera ready" profesional), + colecciones cápsula (`Latina Collection`, `Midnight Touch`, `Royal Cherry`).
- **Nutrición → `Nutriplus` / `Nutriplus+`** (proteína, colágeno, gomitas, shots, creatina). Es una vertical entera con su propio "Shop by Benefit / Type / Brand".
- **Cuidado personal → `Eurofresh`** (bucal), `Masculine` (hombres), fragancias, jabones.
- ⚠️ `Mr. Wipes` (hogar) aparece en fuentes secundarias pero **no lo vi en el nav de farmasius.com ni farmasi.pe**.

**Claims oficiales:**
- Tagline corporativo: **"Beauty. Wellness. Opportunity!!"** (https://www.farmasi.com/) — PE: "Belleza. Bienestar. Oportunidad!"
- Misión (literal, https://www.farmasius.com/farmasi/content/mission-and-vision): *"To become the world's leading **direct selling** company by creating products people love, opportunities people trust, and a community people never want to leave."*
- Visión: *"Innovate Relentlessly. Improve Lives."*
- Valores: *"Build Community. Create Belonging." / "Inspire Confidence. Unlock Potential." / "Create Opportunity. Expand Freedom." / "Earn Trust. Every Day."*
- About (https://www.farmasius.com/farmasi/content/about-farmasi): *"More than 75 years ago, **Dr. Cevdet Tuna** set out to create products people could trust. A physician, innovator, and entrepreneur…"*

👉 **Lectura comercial:** el claim central de la marca **no es un beneficio de producto, es la oportunidad de negocio**. "Opportunity" está en el tagline. Eso es lo que hay que reescribir por completo si se vende en retail.

**Origen Turquía — sí, y lo explotan fuerte:**
- Fundada **1950** en Estambul por Dr. Cevdet Tuna (LinkedIn oficial: *"75 Years of Beauty, Wellness & Empowerment ✨"*, fundada 1950, 1.001–5.000 empleados, HQ **Ömerli Merkez Mah. Uran Cad. No:33, Çekmeköy, İstanbul**) — https://www.linkedin.com/company/farmasi
- Fabricante legal en los certificados: **Tan Alize Kosmetik** (Tanalize).
- Campus **"FarmaCity"** en Estambul: 2.5 millones de sq ft, 7 fábricas (maquillaje, skincare, fragancia, homecare, packaging) — https://www.directsellingnews.com/2021/03/01/farmasi-atypical-international-expansion/
- El marketing lo capitaliza: el incentivo top de 2026 es el **"Golden Trip" a Estambul y Capadocia** (posts de IG embebidos en el home de farmasius.com: *"Istanbul, the FARMASI way. 🇹🇷"*).

**Tensión de posicionamiento a tener en cuenta:** históricamente Farmasi era "drugstore price, high-end performance" ($9.90 la máscara). Hoy el skincare Dr. C. Tuna se vende a **$45–$90** en USA y **S/170–S/293** en Perú, mientras el maquillaje sigue en $18–$40. **La marca vive partida en dos:** color barato + skincare mid-premium. Vender "Farmasi = barato" y luego mostrar un sérum de S/293 es incoherente.

---

## 3. Modelo de negocio (⚠️ SECCIÓN CRÍTICA PARA LA REVENTA)

**Es MLM / venta directa pura. No es un proveedor mayorista.**

- Fundada 1950 como farmacéutica y **distribuidor retail**; migró a venta directa en **2010** — https://www.directsellingnews.com/2021/03/01/farmasi-atypical-international-expansion/
- 2025: **>USD 600M de facturación global**; proyección 2026: **USD 800M**; subió al **puesto #11 del DSN Global 100** (desde el #27). 50+ países; +500,000 emprendedores independientes sumados solo en 2025. Dirigida por los nietos: **CEO Sinan Tuna / Presidente Emre Tuna** — https://www.prnewswire.com/news-releases/farmasi-projects-800m-revenue-in-2026-as-global-sales-surpass-600m-and-company-rises-to-11-on-dsn-global-100-302778893.html
- USA arrancó en 2019 (Doral/Miami).
- Canales oficiales: web replicada por consultor (`farmasius.com/{nombre-consultor}`), **guest checkout** ("COMPRA COMO INVITADO" / `/farmasi/guest-order` en PE), suscripción con −25%, y **Live Selling Credits** (venden créditos para transmitir en vivo).

### En Perú
- Entidad: **Farmasi SAC**, sitio oficial **farmasi.pe** con checkout directo. Kit de inicio **S/95**; margen/descuento del influencer **~30%** (vs 50% en USA). Pagos Visa/Mastercard/**Yape** vía Mercado Pago; envíos por **Olva Courier**.
  Fuentes: https://farmasi-peru.com/blog/cuanto-cuesta-unirse-a-farmasi-en-peru/ · https://victoriosas.com/que-es-farmasi-y-como-funciona-en-peru-2/ · https://www.farmasi.pe/farmasi/guest-order

### 🔴 ¿Se puede revender legalmente en una tienda peruana? Las Políticas y Procedimientos dicen que NO

Documento leído íntegro: **https://www.farmasius.com/farmasi/content/policies-and-procedures** (es la P&P completa de Farmasi US LLC, no solo la privacy policy). Citas textuales:

> **§9.1(B):** *"A FARMASI Influencer shall not cause any Company product or service or any Company trade name to be sold or displayed in **retail establishments**, including but not limited to **kiosks in malls, stores, shops, or online marketplaces**, during normal business hours or at any other time."*

> **§9.4(C):** *"A FARMASI Influencer may not sell Farmasi products, services or offer the Farmasi sales opportunity via 'online auctions,' such as eBay®, or 'online marketplaces' such as **Amazon** or Etsy."*

> **§9.4(R):** *"Farmasi predicates its business on in-home and event sales… Farmasi maintains and enforces a **strict prohibition against online marketplace sales**… The Company does not allow a FARMASI Influencer to sell any Farmasi products on eBay, Etsy or Facebook Marketplace… **This same policy applies to other third-party sites by which a FARMASI Influencer could sell Farmasi products.**"*

> **§9.4(D):** una web propia de terceros requiere *"prior written approval"* de la empresa, debe identificarte como FARMASI Influencer y usar *"only the approved images and wording authorized by the Company"*.

> **§9.5(C):** *"All advertising, including, but not limited to, print, Internet… are subject to **prior written approval by the Company Compliance Department**."*

**Traducción operativa:**
1. Una tienda peruana de skincare **no puede ser canal autorizado de Farmasi** bajo el contrato de influencer. Ni e-commerce propio sin aprobación escrita, ni marketplace, ni tienda física.
2. El único camino "limpio" sería un **acuerdo corporativo de distribución con Farmasi SAC**, que va contra su propio modelo (compiten con su web y con 4M de influencers).
3. Farmasi **ya vende directo al consumidor peruano** en farmasi.pe con guest checkout y precios más baratos que USA → como proveedor es un **competidor**, no un aliado.

⚠️ **NO VERIFICADO:** no encontré la P&P específica de Perú publicada. La de terms-of-use de farmasi.pe **no** contiene cláusula de reventa. Asumo (razonablemente, no confirmado) que la P&P peruana replica la de US.

### Capa regulatoria peruana (independiente del contrato)
Para comercializar cosméticos en Perú se requiere **NSO (Notificación Sanitaria Obligatoria) de DIGEMID**, tramitada por una **droguería registrada y con autorización del titular del producto**. Vender importado sin NSO expone a multa y decomiso; DIGEMID ya emitió alertas por comercialización de cosméticos sin NSO vía web.
Fuentes: https://www.digemid.minsa.gob.pe/webDigemid/registro-sanitario/ · https://landing.vuce.gob.pe/olce-wp/canal-de-aprendizaje/notificacion-sanitaria-obligatoria-de-productos-cosmeticos-digemid-dgm013/ · https://www.tibagroup.com/es/comercio-internacional/importar/importar-cosmeticos-peru
⚠️ **NO VERIFICADO:** no pude consultar el padrón de DIGEMID para confirmar qué SKUs de Farmasi tienen NSO vigente ni quién es el titular en Perú.

### El mercado gris ya existe (y así se ve)
- **Oechsle.pe** lista "Serúm Tea Tree 10ml DR.C. TUNA - FARMASI" **vendido por un seller de marketplace ("ASWAN"), no por Oechsle** → https://www.oechsle.pe/serum-tea-tree-10ml-dr-c--tuna---farmasi-1001327058/p (sin stock al momento del scrape; el precio renderiza como "S/ 15,990" — formato ambiguo, ⚠️ no verificado el valor real).
- Producto Farmasi abunda en eBay y Amazon US pese a la prohibición explícita.
- ⚠️ **NO VERIFICADO:** Hepsiburada y Trendyol (Turquía) muestran tiendas rotuladas "FARMASI SHOP" / marca oficial, lo que sugiere que **en su mercado de origen sí usan marketplaces**. Ambas URLs me devolvieron 403 y no pude confirmar si el seller es la propia Farmasi.
- Malasia opera con **"over 70 counters"** de retail físico (modelo distinto al de USA/LatAm) → https://farmasimy.com/about-farmasi/

---

## 4. Productos estrella / bestsellers (con evidencia)

No hay página oficial "Best Sellers". Usé el **número de reseñas verificadas en la ficha** como proxy duro (scrape 19-ago-2026, farmasius.com):

| # | Producto | Rating / Reseñas | Precio US | PC Price | Perú |
|---|---|---|---|---|---|
| 1 | **Zen Extension Lash Mascara** (1301322) — badge *"Popular"* | **4.95 ★ / 1,121** | $13.90 → **$8.34** (40% off) | $6.26 | — |
| 2 | **Dr. C. Tuna Vitamin C Glow Serum** (1002167) | **4.97 ★ / 966** | **$65.00** | $48.75 | **S/210.00** |
| 3 | **VFX PRO Camera Ready Foundation** (1002023, ~23 tonos) | **4.94 ★ / 686** | **$39.90** | $29.93 | — |
| 4 | **Dr. C. Tuna Age Reversist Instant Perfecting Cream** (1000275) | **4.97 ★ / 647** | **$65.00** | $48.75 | **S/272.00** |
| 5 | **Dr. C. Tuna Intensive Repair Shampoo** (1000885) | **4.95 ★ / 384** | $33.90 → **$20.34** | $15.26 | — |
| 6 | **Dr. C. Tuna Aqua Hydrating Cream** (1000267) | **4.97 ★ / 323** | **$55.00** | $41.25 | — |

Otros productos-ancla del catálogo (sin conteo de reseñas capturado):
- **Dr. C. Tuna Resurface Retinol Reviving Serum** (1000279) — **$90.00** / PC $67.50 — el SKU más caro del skincare. En Perú **S/293 → S/175.80**.
- **Absolute Super Elixir** (1000991) — $90.00 → $60.00 (línea premium "Absolute", solo 2 SKUs).
- **Dr. C. Tuna Age Reversist Serum** (1000272) — $70.00 / PC $52.50.
- **Dr. C. Tuna Tea Tree Face Wash** (1000288) — $19.00 — el entry-point del skincare, y el SKU que más aparece revendido en Perú.
- Sheet masks (set de 10): Aqua y Lumi Radiance — $49.00.
- Bundles: "Intensive Repair Bundle ($827 value)" (pk91115), "Pure Routine Bundle", "Build Your Own Bundle" como categoría propia.

⚠️ Las fuentes de terceros que citan "Dr. C. Tuna Vitalizing Garlic Shampoo" como bestseller histórico (~1,900 reseñas) **no lo pude confirmar** — ese SKU no aparece en el Hair Care actual de farmasius.com (13 productos).

---

## 5. Certificaciones que exhiben

Página oficial con **PDFs descargables**: https://www.farmasius.com/farmasi/content/product-standards

| Certificación | Archivo |
|---|---|
| **HALAL** (dos certificados) | `content.farmasius.com/PDF/en/NL10510502447-3.pdf`, `NL10510502446-2.pdf` |
| **ISO 9001:2015** (calidad) | `PDF/en/ISO 9001-2015.pdf` |
| **GMP** — *2024 IT2400001321 **Tan Alize Kosmetik** GMP Certificate* | `PDF/en/2024 IT2400001321 Tan Alize Kosmetik GMP Certificate .pdf` |
| **ISO 22716** (GMP específica de cosméticos) | `cdn.farmasius.com/PDF/ISO22716.pdf` |
| **TSE** (Instituto de Normas Turco) | `cdn.farmasius.com/PDF/tse.pdf` |
| **FDA Plant Registration** | `cdn.farmasius.com/PDF/FDAPLANTREGISTCERT.pdf` |
| **ISO 27001:2017** (seguridad de la información) | `PDF/en/ISO 27001-2017.pdf` |
| **GMP Ministerio de Salud de Turquía** | `Announcement/saglik-bakanligi-gmp2.webp` |
| General Declaration / Safety (Tan Alize DSR) | `Announcement/general-decleration.webp`, `tan-alize-dsr.webp` |

Además tienen una página dedicada de **fórmulas sin fragancia**: https://www.farmasius.com/farmasi/content/fragrance-free

### 🚩 Cruelty-free y vegano: lo dicen, pero NO están certificados por terceros

Las fichas afirman *"Cruelty-free and vegan-friendly formula"*, *"Not tested on animals"*, *"100% Vegan"*. Pero:

- **Farmasi NO aparece en la base de datos de PETA (Beauty Without Bunnies).** Búsqueda directa → *"Sorry! We can't find what you're looking for."* — https://crueltyfree.peta.org/?s=farmasi
- **Farmasi NO aparece en la lista de marcas cruelty-free de Cruelty-Free Kitty (actualización 2026)** — https://www.crueltyfreekitty.com/list-of-cruelty-free-brands/
- **NO hay logo Leaping Bunny ni PETA en su página de certificaciones.** El único aval de tercero relacionado es el sello **HALAL** (que sí implica ausencia de derivados animales prohibidos, pero no es una certificación cruelty-free).
- ⚠️ Un sourcing agent turco afirma que Farmasi tiene "Vegan Society + Leaping Bunny" (https://turkeysourcingagency.com/sourcing/cosmetics/vegan-cruelty-free-cosmetics/) — **NO PUDE VERIFICARLO** en ninguna fuente oficial de Farmasi ni en los registros de esas dos organizaciones. **No usar ese dato en marketing.**

👉 **Regla para la tienda:** se puede decir *"la marca declara fórmulas veganas y no testeadas en animales"* y *"fabricado bajo GMP / ISO 9001 / ISO 22716 con registro de planta FDA"*. **No** se puede decir "certificado cruelty-free" ni poner logos de Leaping Bunny/PETA.

---

## 6. Cómo describen sus productos (estructura, tono, largo)

### Estructura fija de la ficha (PDP) — 6 bloques

Verificado en 5 fichas (Vitamin C Glow Serum, Aqua Hydrating Cream, Age Reversist Instant Perfecting Cream, Intensive Repair Shampoo, VFX Pro Foundation, Zen Mascara):

1. **Header:** nombre + `Product Code` (7 dígitos) + `4.97 Stars - 966 Reviews` + precio + **PC Price** + banner de suscripción −25%.
2. **`Product Description`** — 2 a 4 frases. Fórmula recurrente: *[Nombre completo] + [formato/textura] + [beneficio inmediato] + "powered by / enriched with" [ingrediente héroe con nombre propio] + [3 beneficios encadenados] + [para quién es]*. Cierra con **`Product size: 30 ml / 1 fl. oz`**.
   > *"Dr. C. Tuna Aqua Hydrating Cream is a fast-absorbing gel moisturizer that provides an instant burst of refreshing hydration for a smooth, dewy glow. Powered by a Hyaluronic Acid Complex, it deeply nourishes and locks in moisture for long-lasting comfort and radiance. Perfect for all skin types, especially dry or dehydrated skin."*
3. **`How To Use It`** — 2 a 3 frases en imperativo, con detalle gestual real (no genérico):
   > *"Take a small amount of cream and place 4–5 dots around the target area. Using your ring finger, spread gently in a thin layer and keep your face still until dry. For best results, hydrate with Dr. C. Tuna Age Reversist Rich Moisturizer before applying."* ← nótese el **cross-sell dentro del modo de uso**.
4. **`Ingredients`** — **ingrediente héroe explicado en negrita primero**, después el **INCI completo**. Ej: *"**PatcH2O® (Alginate, Pullulan, Hyaluronic Acid…):** provides total hydration… immediate hydration lasting up to 48 hours with a single application."* seguido de la lista INCI entera.
5. **`Precautions`** — cuando aplica (máscaras de pestañas, shampoo): uso externo, fuera del alcance de niños, evitar ojos, suspender si irrita.
6. **`Sustainability`** — **lista "free-from" en bullets**, es su bloque de claims:
   > *"Vegan · Cruelty-free (not tested on animals) · Free of parabens, heavy silicones, and heavy metals"* (shampoo)
   > *"100% Vegan · Cruelty-Free · Free of heavy metals · Gluten-free · Paraben-free"* (VFX foundation)
   > *"Dermatologically tested and manufactured in a non-GMO environment. Free from parabens, SLS, gluten, heavy metals, and animal ingredients."* (Vitamin C serum)
7. **`Proven Results`** (solo en algunos) — **una línea con cifra y disclaimer de laboratorio**:
   > *"Clinically proven to increase collagen levels by **67%** when used daily.\* Tested and approved by an internationally recognized, independent, and accredited laboratory."* (Age Reversist Instant Perfecting Cream)

### Bloque extendido tipo "A+ content" (debajo de la ficha)

Estructura literal del Vitamin C Glow Serum:
```
DR. C. TUNA VITAMIN C GLOW SERUM
UNLEASH YOUR SKIN'S NATURAL RADIANCE          ← tagline en mayúsculas
[párrafo de 2 frases]
## WHY WE LOVE IT                              ← exactamente 4 bullets de beneficio
## KEY INGREDIENT:                             ← con nombre comercial del activo
   "Sodium Ascorbyl Phosphate… The Trade name of the active is STAY-C® 50."
   Antioxidant Protection: … / Brightening Effect: …   (sub-claims en negrita)
## OTHER INGREDIENTS:                          ← lista con explicación de 1 línea c/u
## WHAT WE PROMISE                             ← 8 bullets "free from…"
HOW TO USE IT
DETAILS  (tamaño + INCI repetido)
```

### Tono
- **Beneficio-primero, ingrediente-segundo, ciencia-tercero.** Nunca abre con química.
- Vocabulario compliance-safe: *"helps reduce the appearance of"*, *"supports"*, *"visibly"*, *"looks"*. Casi nunca afirma que cura o elimina.
- Nombran el activo con **marca registrada** para dar respaldo (STAY-C® 50, PatcH2O®, Capixyl™, Marine Plankton Extract, Earth Marine Water, Auvergne Volcanoes Mineral Water). Es su truco de credibilidad.
- Largo: **descripción 40–70 palabras; ficha completa 200–350 palabras; A+ 400–600**.

### Otros elementos de la ficha que valen copiar
- **FAQ SEO al pie de las páginas de categoría**: 9 preguntas del tipo *"¿Qué orden debe tener una rutina de skincare?"* que encadenan producto tras producto → https://www.farmasius.com/farmasi/product-list/skin-care?cid=5aecb19a-63d3-eb11-a315-005056010963
- **Virtual Try-On** ("Try Me On!") en maquillaje y **Skin Diagnosis** ("Analyze. Discover. Glow.") en skincare.
- **Reseñas con foto de usuario** ("Media From People"), ratings entre 4.94 y 4.97.

### ⚠️ Problemas de calidad detectados (relevantes si se piensa reusar su copy)
- La ficha de **Zen Extension Lash Mascara en el sitio EN-US está íntegramente en español** (descripción, INCI, precauciones) — https://www.farmasius.com/farmasi/product-detail/zen-extension-lash-mascara?pid=1301322
- Aparecen **claves de i18n sin traducir** en producción (`productDetail.subsInfoText`, `productList.price`, `categories.productCount`).
- El copy de un mismo producto **varía entre versiones** (el Vitamin C serum tiene dos redacciones distintas del mismo párrafo en la misma página).

---

## Resumen ejecutivo para la decisión comercial

1. **Farmasi no es un proveedor: es un competidor directo en Perú.** Farmasi SAC vende al consumidor final en farmasi.pe con guest checkout, Yape y Olva, a precios **por debajo** de la paridad con USA.
2. **Su contrato prohíbe explícitamente el canal que una tienda representa** (§9.1B, §9.4C, §9.4R): nada de tiendas, kioscos, marketplaces ni webs de terceros sin aprobación escrita.
3. **Riesgo regulatorio adicional en Perú:** sin NSO de DIGEMID a nombre de una droguería con autorización del titular, la comercialización es sancionable.
4. **Lo que sí es aprovechable:** su arquitectura de ficha de producto (los 6-7 bloques), la lógica de series por *concern*, el sello de activo con marca registrada, el bloque "Proven Results" con cifra + disclaimer de laboratorio, y la FAQ SEO de categoría. Eso es un playbook de e-commerce de skincare bien hecho, replicable con otra marca.
5. **Cuidado con dos claims:** "cruelty-free certificado" (**no lo está** por PETA ni Leaping Bunny) y "marca barata" (su skincare va de S/75 a S/293).