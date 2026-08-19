All scrapes done (Sephora/Ulta are behind reCAPTCHA — noted below). Here's the report.

---

# Qué hace que un e-commerce de cosmética se vea PROFESIONAL y de confianza

**Investigación con scraping real (firecrawl) · agosto 2026**

## Método y alcance

| Sitio | Estado | Archivos analizados |
|---|---|---|
| The Ordinary / Deciem | ✅ scrapeado (92 KB) | PDP Niacinamide 10% + Zinc 1% |
| Beauty of Joseon | ✅ scrapeado | PDP Day Dew Sunscreen + home |
| Soko Glam | ✅ scrapeado | PDP I'm From Rice Toner + home + página Real AF |
| Stylevana | ✅ scrapeado (209 KB) | PDP BOJ Relief Sun + home |
| YesStyle | ✅ scrapeado | PDP BOJ Relief Sun + página de marca BOJ |
| Glossier | ✅ scrapeado | PDP Futuredew |
| Rare Beauty | ✅ scrapeado | PDP Soft Pinch Liquid Blush |
| **Sephora / Ulta** | ❌ **bloqueados** | reCAPTCHA Enterprise + bot wall. No pude verificar su HTML. **No incluyo afirmaciones sobre ellos que no pueda probar.** |

Todo lo que sigue está verificado contra HTML real, salvo donde diga lo contrario.

---

## 1. Estructura de la PDP: qué bloques y en qué ORDEN

### El orden canónico (consenso de los 7 sitios)

```
┌─ ARRIBA DEL FOLD ────────────────────────────────┐
│ 0. Barra de anuncio (envío gratis / promo)       │
│ 1. Breadcrumb                                     │
│ 2. Galería (izq) | Panel de compra (der)         │
│    ├ Badges/premios                               │
│    ├ MARCA (link a la marca)                      │
│    ├ H1 = nombre del producto                     │
│    ├ ★ rating + Nº reviews (ancla a reviews)     │
│    ├ PRECIO (+ tachado + % dcto)                  │
│    ├ Descripción corta (1-2 líneas)               │
│    ├ Variantes (tamaño / tono)                    │
│    ├ Stock + tiempo de despacho                   │
│    ├ ADD TO CART                                  │
│    └ 2-3 bullets de confianza (✓ garantía…)      │
├─ BAJO EL FOLD ───────────────────────────────────┤
│ 3. Chips de atributos (vegan, cruelty-free…)     │
│ 4. Detalles / beneficios                          │
│ 5. Resultados clínicos o de consumidoras          │
│ 6. INGREDIENTES CLAVE (explicados)                │
│ 7. INCI COMPLETO (colapsable)                     │
│ 8. CÓMO USAR                                      │
│ 9. FAQs                                           │
│ 10. Cross-sell / rutina                           │
│ 11. UGC / redes                                   │
│ 12. REVIEWS (con filtros) + Q&A                   │
└──────────────────────────────────────────────────┘
```

### Dónde va cada cosa exactamente

**PRECIO** — siempre en el panel derecho, **inmediatamente debajo del rating**, nunca antes.
- The Ordinary: `4.4 (2825) → Write a review → Ask a question → $6.00 USD`
- BOJ: `4.6 · 710 Reviews → $14.40 Regular price ~~$18.00~~ Save 20%`
- Rare Beauty rompe el patrón y mete el precio **dentro del botón**: `Add To Cart • $25`

**REVIEWS** — aparecen **dos veces**:
1. Arriba, como rating compacto con ancla (`Click to scroll to reviews` en BOJ y Soko Glam; Rare Beauty lo pone en la **primera línea de la página**, encima del nombre del producto).
2. Abajo del todo, como bloque completo con histograma y filtros.

**INGREDIENTES** — dos escuelas:
- **Arriba (acordeón en el panel de compra)**: The Ordinary pone el INCI completo pegado al Add to Cart. Público experto que compra por fórmula.
- **Media página (lo dominante)**: BOJ, Soko Glam, Glossier, Rare Beauty, YesStyle → después de beneficios/clínicos, antes de "Cómo usar".

**MODO DE USO** — universalmente **después de ingredientes**, antes de cross-sell. Nunca arriba.

### Tabla comparativa de bloques

| Bloque | Ordinary | BOJ | Soko Glam | Stylevana | YesStyle | Glossier | Rare Beauty |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Rating arriba | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (línea 1) |
| Precio bajo rating | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | en botón |
| Marca linkeada | — | — | ✅ | ✅ | ✅ (en el H1) | — | — |
| Chips atributos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Estudio clínico | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Activos explicados | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| INCI completo | ✅ | ✅ | ✅ | ❌ | ✅ | link | ✅ por tono |
| FAQs en PDP | ✅ | ✅ (15) | ❌ | ❌ | ✅ | ❌ | ✅ |
| Q&A público | ✅ (153) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Reviews filtrables | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

**URLs:**
- https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html
- https://beautyofjoseon.com/products/day-dew-sunscreen
- https://sokoglam.com/products/im-from-rice-toner
- https://www.stylevana.com/en_US/beauty-of-joseon-relief-sun-rice-probiotic-spf50-pa-50ml27138.html
- https://www.yesstyle.com/en/beauty-of-joseon-relief-sun-rice-probiotics-50ml/info.html/pid.1137908658
- https://www.glossier.com/products/futuredew
- https://www.rarebeauty.com/products/soft-pinch-liquid-blush

---

## 2. Cómo muestran INGREDIENTES

### El modelo de 3 capas (el patrón ganador)

**Capa 1 — Héroes explicados (3-4 activos, una línea cada uno).**
Beauty of Joseon, textual:
```
Key Ingredients
Hyaluronic Acid  → Hydrates without heaviness
Niacinamide      → Helps brighten and calm skin
Panthenol        → Gives an additional boost of moisture for a dewy finish
[Full Ingredient List]
```
Glossier hace lo mismo con 4 tarjetas ("Evodia Rutaecarpa Extract → Fruit extract known to visibly increase brightness"). Rare Beauty lo resume en un concepto propio: *"Made with our Botanical Blend of lotus, gardenia, and white water lily"*.

**Capa 2 — INCI completo, colapsable.** Nadie lo esconde. Todos lo tienen.

**Capa 3 — Disclaimers legales.** Dos que se repiten:
- The Ordinary: *"Our formulations are updated from time to time... the ingredient list shown here may vary from the box depending on time and region of purchase."*
- YesStyle: *"This list represents all options or variants of this product... For the most complete and up-to-date list, please refer to product packaging."*

### El mejor ejemplo para Veliroz: Soko Glam

Un **revendedor** que resuelve el problema con dos encabezados. Copiar literal:

```
## Ingredients
### Ingredients We Love
Rice Extract, Natural Extracts (Common Purslane extract, Rice bran
extract, Japanese elm bark extract, Amaranthus caudatus seed extract),
Adenosine

### Full List of Ingredients
Rice Extract, Methylpropanediol, Triethylhexanoin, Hydrogenated poly
(C6-14 olefin), Niacinamide, Pentylene glycol, [...18 ingredientes]
```

Es barato de producir (no requiere copy nuevo por ingrediente) y da autoridad de curador: *"de esta lista, estos son los que importan"*.

### Detalles que suman credibilidad

**Protectores solares: separar ACTIVE / INACTIVE con porcentajes** (BOJ):
```
ACTIVE INGREDIENT:
AVOBENZONE 3.0% · HOMOSALATE 7.0% · OCTISALATE 5.0% · OCTOCRYLENE 5.0%
INACTIVE INGREDIENTS:
WATER (AQUA), BUTYLOCTYL SALICYLATE, GLYCERIN, [...]
```

**Ficha técnica de la fórmula** (The Ordinary, chips en "Highlights"):
`pH 5.00-6.50 · water-free: No · alcohol-free: Yes · oil-free: Yes · silicone-free: Yes · vegan: Yes · gluten-free: Yes · cruelty-free: Yes`

**Compatibilidad entre productos** — The Ordinary tiene un bloque explícito:
```
Do not use with: [Direct Vitamin C] [Indirect Vitamin C]
## Formulation Compatibility Tool
```
Decirle al cliente qué **no** comprar/mezclar es la señal de honestidad más fuerte que encontré.

**Tira de especificaciones** (The Ordinary, encima de "Overview"):
```
Targets:        Signs of Congestion, Dryness, Dullness, Textural Irregularities, Visible Shine
Suited for:     All Skin Types
Format:         Serum: Water-Based
Key ingredients: Niacinamide, Zinc PCA
```

**Stylevana es el contraejemplo:** su PDP **no tiene INCI**. Solo un cuadro `Cruelty Free / Product Type / Usage / Skin Concern / Skin Type` y 5 bullets de marketing. Es el revendedor que menos confianza técnica transmite. **No copiar esto.**

---

## 3. Señales de confianza (inventario verificado)

### A. Reviews — la arquitectura completa

Lo que tienen los que se ven serios (BOJ, Soko Glam, YesStyle, Rare Beauty, The Ordinary):

1. **Promedio + total + histograma de 5 barras con números absolutos**
   `4.6 · Based on 710 reviews · 5★:595 · 4★:49 · 3★:25 · 2★:10 · 1★:31`
2. **% de recomendación**: `91% would recommend this product` (BOJ) · `97.8% customers satisfied` (YesStyle)
3. **Badge "Verified Buyer"** por review (BOJ, Soko Glam, Stylevana)
4. **Atributos declarados del reviewer**: `How old are you? 18-24 · What is your skin type? Oily · What are your skin concerns? Acne, Sun Damage, Sensitivity, Scarring`
5. **Filtros por esos atributos** — Rare Beauty filtra por **Age, Skin Type, Shade Group, Con imágenes/video**; The Ordinary por **Skin Type, Skin Concern, Skin Tone, Age, Locale**
6. **Temas auto-extraídos**: `Customers Talked About: Texture · Application · Moisturizing · Finish · Protection` (BOJ). Stylevana llega a 24 temas (Results, Cast, Shipping, Value, Breakouts…)
7. **Votación de utilidad**: `Was this helpful? Yes (20) / No (0)`
8. **Reviews de 1★ visibles** — The Ordinary muestra 240 reviews de 1★ sobre 2826. **Nadie los esconde.** Esa es la señal.

### B. La marca responde en público

The Ordinary tiene **153 preguntas** con respuesta oficial firmada (`theordinary_LD`):
> **Q:** How can you tell the difference between counterfeit and original ordinary products?
> **Q:** Is this product pregnancy safe?
> **A:** DECIEM's products are intended for adult skin, 18 and over.

Que la pregunta sobre falsificaciones esté **publicada y respondida** es en sí mismo el activo de confianza.

### C. Badges y sellos

| Tipo | Ejemplo real |
|---|---|
| Premio de tercero | The Ordinary: SheerLuxe Beauty Awards 2023, Boots Beauty Awards 2022 |
| **Premio propio** | Soko Glam **Best of K-Beauty® 2024** · Stylevana **VANA Award Winner** · YesStyle **Awards 2025** |
| Certificación de reviews | Stylevana: widget Yotpo `188K · 4.5 star rating · Certified reviews` |
| Seguridad | Stylevana footer: Visa, PayPal, Mastercard, **McAfee**, **RapidSSL** |
| Legal | Stylevana: `WARNING: California Proposition 65` |
| Sostenibilidad | The Ordinary: instrucciones de reciclaje por tipo de envase (#1 PETE, #2 HDPE, #5 PP) |
| Causa | Rare Beauty: `1% of annual sales will support the Rare Impact Fund` |

### D. Envío y devoluciones

En la **barra superior**, siempre:
- Soko Glam: `NO TARIFFS, FREE US SHIPPING OVER $50`
- Stylevana: `FREE Shipping on $48+ US orders`
- YesStyle: `Free Standard Shipping with any US$35 purchase` + `Shop Tariff-free at YesStyle`
- The Ordinary: `Carbon neutral shipping on all orders` + `Complimentary shipping over 25 USD`

**En la PDP**, YesStyle mete un módulo dedicado:
```
Shipping to United States
• Free Standard Shipping with any US$ 35 purchase (10 - 14 business days)
• Returns and Exchanges
```
Stylevana tiene una pestaña **"Shopping Info"** dentro de la ficha: About Us + Free Shipping + Payment Methods + Contact Us.

**Plazo de despacho explícito** — el detalle más subestimado:
- Stylevana: `In Stock · Usually shipped within 24 hours`
- YesStyle: `50ml · In-Stock - Usually ships within 24 hours`

### E. Financiación
Soko Glam → Klarna (`Buy now. Pay with Klarna · Check purchase power`). Glossier → `4 interest-free payments of $7.50`.

---

## 4. Cómo manejan la falta de reviews en productos nuevos

**Regla observada: nunca se falsean. Se sustituyen por otra evidencia.** Soko Glam muestra sin pudor `5.0 · 1 Review` y `5.0 · 3 Reviews` en su home. La honestidad numérica es parte del efecto.

### Escalera de sustitutos, de más a menos fuerte

**1. Estudio clínico con laboratorio, fechas y título del estudio** — el estándar de oro. BOJ:
```
Clinical Results
SPF 94.7±13.6 (Korean Lab)
  Based on a human study conducted by Global Medical Research Center (GMRC),
  Korea, as documented in "A Clinical Study for Determining the Sun Protection
  Factor of Beauty of Joseon Day Dew Sunscreen," conducted from March 10 to
  April 25, 2025.
SPF 52 (Spain Lab)
  ...COSMESERVICE, Spain... May 30, 2024 to April 24, 2025.
Water Resistance (80 min)
  ...FDA 2021 guidelines by Eurofins CRL, USA, Study No. 624-N23059-27...
```

**2. Estudio de consumidoras con n declarado.** Rare Beauty:
```
Real results:
• 100% said it applies easily and wears evenly
• 100% said the texture is silky and glides on smoothly
• 97%  said the color blends seamlessly
*In an independent consumer study of 32 people
```
Glossier: `100% said they observed increased skin radiance · 96% said they saw improvement... after four weeks` + link `See testing details`.
The Ordinary: `*Based on a clinical study of 35 subjects applying the product twice daily for 8 weeks.`

> **n=32 es suficiente.** Nadie finge muestras grandes. Declarar el n honestamente es lo que hace creíble el 100%.

**3. Nota editorial del vendedor** (arma de revendedor). YesStyle:
```
Editor's Note
The sunscreen that needs no introduction! ... No greasy finish, no white
cast – just comforting, skin-friendly sun care...
Yesties favorite: The hype is real!
```

**4. Ranking de categoría.** YesStyle: `Bestseller Rank: #1 in Beauty · #1 in Sun Care · #1 in Sunscreens`

**5. Contador de unidades vendidas.** Stylevana: `39500+ 🔥 sold`. YesStyle en las cards: `27,510`.

**6. Premio propio.** `YesStyle Favorite Sunscreen 2025`, `Best of K-Beauty® 2024`.

**7. Reviews agregadas a nivel MARCA.** YesStyle muestra en la ficha del producto nuevo: `97.5% · 8739` (recomendación y votantes de **la marca entera**). Brillante: hereda confianza de la marca cuando el SKU aún no tiene historial.

**8. FAQs preventivas.** BOJ tiene 15 preguntas que sustituyen a las reviews respondiendo las objeciones reales: *"Is this a mineral or chemical sunscreen?"*, *"Will it cause breakouts?"*, *"Can sensitive skin use it too?"* → *"Yes, it has completed the HRIPT (Human Repeat Insult Patch Test)."*

**9. Cita del fundador.** Rare Beauty: *"Why Selena Loves It — 'There's nothing like a soft hint of blush…'"*

**10. Carrusel de reviews cruzadas en la home.** Soko Glam: "Real People, Real Reviews" con 3 reviews largas de productos **distintos**, cada una con marca + producto + botón SHOP. Un producto sin reviews vive en una página donde sí hay prueba social.

**11. Badge "New" + captura de demanda.** `Sold Out - Notify Me When It's Available` con campo de email (BOJ).

---

## 5. HOME: arriba del fold y qué sigue

### Anatomía del fold

```
1. BARRA DE ANUNCIO (rotativa) → envío gratis + promo + a veces countdown
2. Header: logo centrado o izq · buscador · cuenta · wishlist · carrito
3. Nav por 3 ejes SIMULTÁNEOS:
     • Por producto  (Cleanser, Toner, Serum, Sunscreen…)
     • Por concern   (Acne, Wrinkles, Dryness, Sensitivity…)
     • Por ingrediente (Snail Mucin, Centella, Niacinamide, Vitamin C…)
4. HERO: 1 imagen + H1 corto + subtítulo de 1 línea + 1 CTA
```

Hero real de Soko Glam:
```
Your K-Beauty Haul Starts Here
Refresh your skincare lineup with cult favorites, new discoveries,
and everything in between.
[SHOP NOW]
```
Corto, sin adjetivos vacíos, un solo botón.

**Beauty of Joseon** tiene la barra más agresiva: 4 mensajes rotando + countdown `04 Days 00 Hours 04 Minutes 50 Seconds`.

**El eje "por ingrediente" es el más distintivo de K-beauty.** BOJ tiene un módulo entero: *"Find Your Perfect Hanbang Match"* → Ginseng · Rice · Green Tea · Red Bean · Propolis · Green Plum · Centella, cada uno linkeando a una colección.

### Secuencia después del fold (orden real de Soko Glam)

```
1. Hero carousel (3 slides)
2. "START YOUR K-BEAUTY JOURNEY" → tabs: Newly Curated | Best Sellers | Back In Stock | Viral K-Beauty
3. Banner promo
4. "FIND YOUR K-BEAUTY ROUTINE" → 6 iconos de categoría (Cleansers, Toners, Essence, Moisturizers, Sunscreen, Face Masks)
5. Bloque de categoría estacional (sunscreens)
6. "Watch and Shop" → video shoppable
7. "K-BEAUTY BEST SELLERS" → carrusel
8. Tríptico de MARCA: Our Story | The Klog (blog) | ★ Real AF Guarantee
9. Citas de prensa (carrusel)
10. "Real People, Real Reviews"
11. Instagram (@sokoglam · 373K followers)
12. Newsletter
13. Footer: Customer Care | About | In the Press
```

**El punto 8 es la pieza clave y va cerca del final**, no arriba. Marca → contenido → garantía, los tres al mismo nivel visual.

BOJ cierra igual: `Inspired By Hanbang. Connected by Community.` + "Discover Our Ingredients" + "Take the Skin Quiz" + 2 artículos del blog.

---

## 6. Fotografía

### La secuencia canónica de galería

Verificada en Soko Glam (I'm From Rice Toner, 8 imágenes) — orden literal de los nombres de archivo:

```
1. I_m-From-Rice-Toner.jpg              → PACKSHOT sobre blanco
2. ..._lifestyle03_Resized.jpg          → LIFESTYLE
3. ..._lifestyle04_Resized.jpg          → LIFESTYLE
4. Soko-Glam-Im-From-Rice-Toner-Texture.jpg → TEXTURA (producto vertido)
5. RiceToner_4__1_Resized.jpg           → detalle / ingrediente
6. RiceToner4_edit_1_Resized.jpg        → detalle
7. ..._lifestyle01_Resized.jpg          → LIFESTYLE
8. RiceDuoSet2_1_Resized.jpg            → SET (cross-sell visual)
```

Rare Beauty (maquillaje, 8 slots):
```
1. ECOMM-SP-LIQUID-BLUSH-DEWY-HOPE      → packshot
2. ECOMM-ELLA-BRIGHT-...-HOPE           → modelo usándolo
3. SHADE-GRIDS-...                      → grilla de tonos
4. SWATCH-SP-LIQUID-BLUSH-DEWY-HOPE     → swatch del producto
5. ARM-SWATCHES-SP-LIQUID-BLUSH         → swatches en piel real
6. STYLIZED-COMPARISON-CHART-SP-BLUSH   → comparativa matte vs dewy
7. video
8. video
```

### Reglas extraídas

| Tipo | Obligatorio | Nota |
|---|---|---|
| **Packshot sobre blanco** | ✅ siempre slot 1 | Sin sombras duras. Es la foto del listado. |
| **Lifestyle** | ✅ 2-3 slots | En Soko Glam intercalado, no agrupado al final. |
| **Textura** | ✅ crítico en skincare | Producto vertido/extendido. Soko Glam le da nombre de archivo propio (`-Texture`). |
| **Swatches** | ✅ obligatorio en color | Rare Beauty duplica: swatch de producto **y** swatch en brazo. |
| **Grilla de tonos** | color | Todos los tonos juntos. |
| **Comparativa** | diferencial | Rare Beauty: chart matte vs dewy. |
| **Video** | ✅ al final | BOJ y Rare Beauty. |
| **Infografía** | ✅ | The Ordinary: `Graphic showing the instant radiance and minimized pore benefits` + `Before and after using... to reduce oil and minimize pores` |

**Alt text descriptivo, no keyword-stuffing.** BOJ, real:
> *"A row of tinted mineral sunscreen tubes in a gradient of skin-tone shades, with beige swatches spread in front of each tube on a white background."*

**Doble imagen en las cards de listado (hover).** Soko Glam sirve dos: packshot + lifestyle. Stylevana y BOJ igual.

**UGC embebido en la PDP.** The Ordinary incrusta una galería de TikToks con sus captions completos (`#theordinary #skincaretok #niacinamideserum`). Rare Beauty tiene `@RareBeauty` con animación. BOJ tiene `@beautyofjoseon` con 6 posts.

---

## 7. K-BEAUTY QUE REVENDE: el playbook exacto para Veliroz

Este es el caso idéntico al de Veliroz: **vender marcas ajenas y aun así ser el que da la confianza.** Los tres lo resuelven con los mismos 8 mecanismos.

### Mecanismo 1 — Declaración de autenticidad como página propia con nombre propio

**Soko Glam** — https://sokoglam.com/pages/real-af — texto literal:

> # Soko Glam Real AF Guarantee
> **No fakes, ever.** At Soko Glam, authenticity isn't optional—it's our promise. We partner directly with top Korean brands to bring you the real deal—authentic K-Beauty, straight from the source. No dupes, no knockoffs, just skincare you can trust.
>
> # Curation Philosophy
> Everything you find at Soko Glam has been hand-selected and tested by our team of experts. We curate only the highest quality products that will bring you visible results.

Cuatro decisiones a copiar:
1. **Tiene nombre de marca** ("Real AF Guarantee"), no es un párrafo en el footer.
2. **Explica el mecanismo** ("partner directly with top Korean brands... straight from the source"), no solo afirma.
3. **Está en el menú principal** (Soko Glam la enlaza como "Why Shop Soko").
4. **Se repite en cada PDP** con ícono + versión corta.

Versión que aparece dentro de la ficha de producto:
> ### The Soko Glam Real AF Guarantee
> Our team of skin care experts personally vet and test every product that we curate. Our products are **100% authentic and sourced directly from brands**. We take pride in helping all people believe in only good (skin) days ahead.

**Traducción propuesta para Veliroz:**
> ## Garantía Veliroz Original
> **Cero falsificaciones.** Trabajamos directo con los titulares de registro sanitario y distribuidores autorizados. Cada producto que vendemos llega sellado, con lote y vencimiento verificables. Sin dupes, sin réplicas, sin "versión export".
>
> ## Cómo curamos
> No listamos todo lo que existe. Probamos cada producto antes de venderlo y solo publicamos los que funcionan en piel peruana y clima peruano.

### Mecanismo 2 — La frase de retailer autorizado, textual

**YesStyle**, en la ficha de marca Y en cada PDP:
> **"YesStyle is an authorized retailer of Beauty of Joseon."**

Y en el FAQ de la página de marca:
> **Where to buy Beauty of Joseon?**
> You can buy authentic Beauty of Joseon products from **authorized retailers like YesStyle**. Shopping with trusted sellers ensures you're getting genuine products with the quality and safety you expect.

Una frase, repetida en 3 lugares. Es el activo de confianza más barato que existe.

### Mecanismo 3 — La marca es un ciudadano de primera clase

| Sitio | Cómo trata la marca |
|---|---|
| YesStyle | La marca **es un link dentro del H1**: `# [Beauty of Joseon](/beauty-of-joseon/...) - Relief Sun: Rice + Probiotics` |
| Soko Glam | Marca linkeada **encima** del H1 (`I'M FROM` → `/collections/im-from`); todas las cards llevan `Vendor: ACWELL` |
| Stylevana | Marca dentro del H1 (`BEAUTY OF JOSEON - Relief Sun : Rice + Probiotic SPF50+ PA++++ - 50ml`) + link debajo + muro de 20 logos de marca en la home |

**Nunca esconden que revenden. Lo exhiben.** La marca aparece 2-3 veces por ficha.

Y cada marca tiene **página propia con contenido original** — YesStyle escribe historia de marca + bandera de país + FAQ de 6 preguntas:
```
# Beauty of Joseon 🇰🇷
Known for its Dynasty Cream, Korean brand Beauty of Joseon uses luxurious
Oriental herbs... The brand was inspired by a 19th century encyclopedia...
YesStyle is an authorized retailer of Beauty of Joseon.
97.5%   8739

## Is Beauty of Joseon good?
## What are the main Beauty of Joseon ingredients?
## Is Beauty of Joseon cruelty-free?
## Are Beauty of Joseon products vegan?
## Where to buy Beauty of Joseon?      ← aquí va la frase de autorización
## What are the best Beauty of Joseon products?
```

### Mecanismo 4 — Transparencia sobre el empaque (anti-falsificación)

El detalle más sofisticado que encontré. YesStyle, en "Features", **antes** de los beneficios:

> **Note: The QR code label on the packaging has been updated to a transparent seal sticker printed with Beauty of Joseon's logo. Customers will randomly receive original or new packaging version during the transition period.**

Se adelantan a la duda *"¿por qué mi caja se ve distinta a la de la foto?"* — que es exactamente cómo nace una acusación de falsificación. **Para Veliroz esto es oro**: cada vez que cambie un lote o empaque, publicarlo en la ficha.

### Mecanismo 5 — Autoridad de curador propia

No pueden reclamar la fórmula, así que **inventan el criterio**:

| Activo | Sitio |
|---|---|
| **Best of K-Beauty® Awards** (marca registrada propia) | Soko Glam |
| **VANA Award** Winner / Nominee (badge en cada card) | Stylevana |
| **YesStyle Awards 2025** ("YesStyle Favorite Sunscreen 2025") | YesStyle |
| **Editor's Note** por producto | YesStyle |
| **"The List by Ashley Mixon"**, "Charlotte's Curation Picks" | Soko Glam |
| **10 Step Korean Skincare Routine** (guía educativa) | Soko Glam |
| **The Klog** (blog de marca) | Soko Glam |

Soko Glam además tiene **"Best of K-Beauty® 2024"** como badge **dentro de la PDP**, junto a "Soko Glam Vegan Beauty" y "Soko Glam Clean Beauty" — taxonomías propias, no de la marca.

### Mecanismo 6 — Prueba social agregada a nivel tienda

- **Stylevana**: widget Yotpo en el footer de todas las páginas → `188K · 4.5 star rating · Certified reviews · Powered by YOTPO`. Verificado por tercero, no auto-declarado.
- **YesStyle**: `97.8% customers satisfied` sobre 27,478 reviews + `97.5% / 8739` a nivel marca.
- **Soko Glam**: carrusel de citas de prensa:
  > *"Now arguably the most well-known online retailer for curated Korean beauty products, Soko Glam was one of the very first companies to put K-Beauty on the global map."*

  \+ página `/pages/in-the-press`.

### Mecanismo 7 — Certidumbre logística (donde el revendedor gana o pierde)

| Señal | Quién |
|---|---|
| `In-Stock - Usually ships within 24 hours` | Stylevana, YesStyle |
| `Free Standard Shipping (10 - 14 business days)` — plazo real, no vago | YesStyle |
| `NO TARIFFS` / `Shop Tariff-free` | Soko Glam, YesStyle |
| **`Customs Fee Refunds`** | YesStyle |
| **`100% Satisfaction`** | YesStyle |
| `Deal is 82% claimed` | YesStyle |
| `39500+ 🔥 sold` | Stylevana |
| Order Tracking en el header | YesStyle |
| Pestaña "Shopping Info" dentro de la PDP | Stylevana |
| McAfee + RapidSSL + logos de pago | Stylevana |
| Klarna / `Sign in & get free shipping` | Soko Glam |

### Mecanismo 8 — Retención que también es confianza

Los tres tienen programa de puntos **visible en la PDP**:
- Soko Glam: `✓ Earn up to 54 points in Soko Rewards` (bullet verde junto a la garantía)
- Stylevana: VANA Reward Club + `Refer A Friend - Get $10 OFF` + descuento estudiante + programa de afiliados
- YesStyle: `Download YS App & Get 50 YS Points`

---

## Backlog priorizado para Veliroz

### P0 — Ejecutar esta semana

1. **Página `/garantia-original`** con nombre de marca propio. Copiar la estructura de `sokoglam.com/pages/real-af`: bloque de autenticidad + bloque de filosofía de curación. Enlazarla desde el menú principal.
2. **Bloque de garantía repetido en cada PDP**, versión corta con ícono, justo debajo del precio, como los bullets verdes de Soko Glam.
3. **Marca como link en cada ficha y cada card.** Encima del H1 (patrón Soko Glam) o dentro del H1 (patrón YesStyle). Nunca omitirla.
4. **Frase de autorización** en la ficha de marca + en la PDP: *"Veliroz es distribuidor autorizado de [marca] en Perú."* Solo donde sea cierto.
5. **INCI completo en las 12 fichas**, con el split de Soko Glam: `Ingredientes que amamos` (3-5 activos) + `Lista completa de ingredientes` + disclaimer de variación por lote.

### P1 — Próximas 2 semanas

6. **Reordenar la PDP** al orden canónico de la sección 1.
7. **Módulo de envío en la PDP** con plazo real en días hábiles + link a devoluciones (patrón YesStyle "Shipping to United States").
8. **Estado de stock + plazo de despacho** junto al botón: `En stock · despachamos en 24 h`.
9. **FAQs por producto** (8-15 preguntas). Es el sustituto de reviews mejor costo/beneficio mientras los SKUs están en pre-venta. Modelo: las 15 de BOJ Day Dew.
10. **Galería con la secuencia canónica**: packshot blanco → lifestyle → **textura** → detalle → set. La foto de textura es la que más falta suele hacer.

### P2 — Mes 1

11. **Páginas de marca** con historia original + bandera de origen + FAQ de 6 preguntas (modelo YesStyle), incluyendo *"¿Dónde comprar [marca] en Perú?"*.
12. **Navegación por ingrediente** además de por producto y por concern (Niacinamida, Centella, Ácido Hialurónico, Snail Mucin, Vitamina C).
13. **Reviews con atributos** (edad, tipo de piel, preocupación) + filtros + badge "Compra verificada" + votación de utilidad. Mostrar el histograma completo, incluidas las de 1★.
14. **Sistema de curación propio**: "Selección Veliroz", "Lo que probamos y aprobamos", o un premio anual. Es lo que convierte revendedor en autoridad.
15. **Contadores de venta** (`+2,400 vendidos`) una vez que haya volumen real. Nunca inventarlos.

### Errores a NO copiar

- **Stylevana sin INCI** — su ficha da 5 bullets de marketing y ningún ingrediente. Es el revendedor menos creíble técnicamente de los tres.
- **Countdown permanente** (BOJ tiene 4 mensajes rotando + reloj). Erosiona credibilidad si nunca vence.
- **Barra de anuncio con 4 mensajes rotando** — ilegible. Máximo 2.
- **Glossier sin rating visible en PDP** — funciona solo si ya tenés marca; para un revendedor nuevo es suicida.

---

## Archivos de la investigación

Todos los scrapes crudos quedaron en:
`/private/tmp/claude-501/-Users-macbookpro-Desktop-Nova-ClaudeCode-Empresa-IA/b171c4e4-88ca-409c-8169-e2a8693de471/scratchpad/cosm/`

`ordinary_pdp.md` · `boj_pdp.md` (home) · `boj_pdp2.md` (PDP) · `soko_home.md` · `soko_pdp3.md` · `soko_realaf.md` · `vana_home.md` · `vana_pdp2.md` · `ys_brand.md` · `ys_pdp2.md` · `glossier_pdp.md` · `rare_pdp.md`

**Limitación:** Sephora y Ulta bloquean scraping con reCAPTCHA Enterprise. No pude verificar su HTML y por eso no aparecen en las conclusiones. Si se necesitan, habría que ir por sesión de browser autenticada (`firecrawl browser`) o captura manual.