# Análisis facial por foto en cosmética (USA/global) — Investigación de campo

**Fecha:** 19-ago-2026 · **Foco:** el patrón de UX replicable, no la visión propietaria.

---

## 0. TL;DR — el patrón en una frase

> Todas hacen lo mismo: **capturan una selfie con un gate de calidad, la convierten en 5-8 números 0-100 con etiqueta cualitativa, muestran fortalezas junto a problemas, pintan un overlay sobre TU cara, declaran un "top concern", y cierran en una rutina de 4 pasos con 4-6 SKUs.** La tecnología de visión cambia; el guión de pantallas no. Y el guión es lo que convierte (Revieve reporta **3.6x conversión / +29% AOV**; Perfect Corp reporta **250-350% más conversión** y el caso Benefit de **14x uplift**).

Lo caro es el modelo. Lo que vende es el **teatro de la medición** — y eso se replica con presupuesto chico.

---

## 1. Fichas por herramienta

### 1.1 L'Oréal Paris **Skin Genius** (motor ModiFace)

**Pide:** una selfie (cámara o upload, móvil o desktop) **sin maquillaje, sin lentes, sin pelo en la cara, expresión neutra, luz natural** + 3 datos: edad, tipo de piel (seca / normal / mixta / grasa) y nivel de sensibilidad.

**Mide (8 atributos):** Fine Lines · Eye Wrinkles · Wrinkles · Deep Wrinkles · Firmness · Pores Quality · Pigmentation · Radiance. Debajo hay 5 tipos de línea diferenciados (frente, glabelar, periorbital, nasogeniano, marioneta).
Base: **+10.000 imágenes clínicamente graduadas**; los "Atlas of the signs of cutaneous aging" de L'Oréal (2007-) usan **severidad 0-9** por criterio. Claim: **hasta 95% de coincidencia con una consulta dermatológica presencial**.

**Presenta:** "visualizá tus fortalezas y tus áreas de foco para cada uno de los 8 atributos". **No publica un score numérico duro** en la comunicación — el output visible es fortaleza/foco por atributo + rutina. La pieza corporativa sí menciona un **"overall score"** interno y una **"curva de envejecimiento estimada, basada en el promedio de alguien de la misma edad"**, cruzando la selfie con estilo de vida, sueño y contaminación.

**Producto:** recomienda **eligiendo de un catálogo de +30 productos** → rutina personalizada.

**Disclaimers:** minimalista. La línea que repiten es **"We don't store your selfie — it's deleted after the skin analysis."** No hay disclaimer médico prominente (Skin Genius se posiciona como cosmético/anti-edad, no clínico).

**Creíble vs. vendedor:** alto en credibilidad de procedencia (Atlas + dermatólogos + números de dataset), bajo en verificabilidad (no muestra el número crudo, no muestra máscara pixel-level en la versión consumer). Es el más "editorial" del grupo.

- https://www.loreal-paris.co.uk/service-detail-pages/skin-genius-detail-page
- https://www.loreal.com/en/articles/science-and-technology/ri-behind-the-scenes-of-the-skin-analyzer-apps/ ← **la mejor fuente técnica del grupo L'Oréal**
- https://www.lorealparisusa.com/beauty-magazine/skin-care/skin-care-concerns/how-to-use-skin-genius-virtual-tool

**Dato de escala (misma familia):** 15.000 imágenes graduadas por dermatólogos, **600.000 fotos analizadas**, >12 investigadores, >12 algoritmos, **4 apps** sobre el mismo motor (Skin Genius, Lancôme Youth Finder, Vichy SkinConsult AI, Biotherm Skin Age Scan). Desde otoño-2020 analizan **16+ características** de envejecimiento.

---

### 1.2 **Vichy SkinConsult AI** (mismo motor, otra marca — útil para ver la variante)

**Pide:** 1 selfie + edad + tipo de piel. **Mide 7 signos de edad** (líneas finas, arrugas, poros, pigmentación, luminosidad, firmeza, bolsas). Base: **15.000 fotos graduadas por dermatólogos**, claim >95%.
**Presenta:** "**prioridades**" y "**fortalezas**", más un *global skin exposure score*. Duración total <5 min.
**Producto:** en el test independiente de Bustle recomendó **3 productos** (gel limpiador + Minéral 89 + Idealia Life serum) separados en día/noche.

- https://www.vichy.com/skinconsultai
- https://www.loreal.com/en/articles/science-and-technology/skinconsult-ai-vichy/

---

### 1.3 **Neutrogena Skin360** (Kenvue) — hoy corriendo sobre **Haut.AI**

Historia importante: **app + hardware (2018-2023, lente 30x + 12 LEDs + sensor de humedad, $49.99-59.99) → app retirada de Google Play abr-2023 → relanzada como web app → refresh con Haut.AI en sep-2025 (US + Canadá).** El hardware murió; la web ganó.

**Pide:** **solo móvil** (en desktop muestra un QR: *"you'll need to use your mobile phone. Its superior camera quality is essential for the scan"*). Flujo: selfie → resultados → **las preguntas aparecen DESPUÉS del resultado** (*"after your scan is complete and you view your results, a few questions may pop up"*) → productos. **Menos de 5 minutos**. Sin cuenta, sin app.

**Mide:** *"evalúa más de **150 biomarcadores faciales multidimensionales** y analiza más de **15 métricas** esenciales de salud y belleza de la piel. Entrenado con más de **3 millones de data points**."* La nota de prensa lista **8 indicadores**: hidratación, suavidad, tono uniforme, luminosidad, firmeza, manchas oscuras, arrugas y piel limpia (*clear skin*).

**Presenta:** **scores en 6 atributos que "escalan" (ladder up) hacia un Skin360 Score global**, con un desglose profundo del atributo *clear skin*. Escala global **1 a 10** (según Drug Store News). La versión vieja usaba etiquetas explícitas: **1-4.9 "Okay" / 5-7.9 "Good" / 8-10 "Great"**.

**Producto:** identifica **tu top skin concern** → sugiere productos **de mañana y de noche** + **ingredientes clave** para ese concern + puede recomendar un protector solar con color **matcheado a tu tono**.

**Disclaimers:** *"No, we do not store your facial images. Once your scan is processed, it is immediately deleted."*
🔴 **Hallazgo:** los **Terms & Conditions de Skin360 NO contienen la palabra "medical", "diagnose", "substitute", "dermatolog" ni "biometric"**. Solo el genérico "AS IS" + restricción de menores de 13 + link a un *Consumer Health Data Privacy Notice* (cumplimiento tipo My Health My Data). El escudo legal es **no guardar la foto y no llamarlo diagnóstico**, no un disclaimer.

**Creíble vs. vendedor:** el "1 a 10 con etiqueta" es honesto y legible. La crítica más dura vino de Gizmodo: los sistemas de puntuación *"ramp up insecurity"* en usuarios vulnerables. Un dermatólogo consultado por Fortune: *"It's partially a marketing strategy too."*

- https://skin360.neutrogena.com/ ← **probalo, es el mejor ejemplo vivo del patrón completo**
- https://www.neutrogena.com/the-bar/selfies-with-benefits
- https://drugstorenews.com/neutrogena-hautai-collaborate-revamped-skin360-experience
- https://gizmodo.com/neutrogenas-free-skincare-app-actually-works-mostly-1841026360
- https://fortune.com/2024/02/29/face-scanning-ai-apps-are-giving-cosmetics-companies-deeper-connections-and-selling-points-with-customers/

---

### 1.4 **Perfect Corp / YouCam** — el motor "blanco" (Sephora, Cetaphil, Benefit corren sobre esto)

**Pide:** foto o cámara en vivo. **La IA valida iluminación y calidad ambiental ANTES de analizar.** Requisitos duros de la API:
| | SD | HD |
|---|---|---|
| lado corto mínimo | 480 px | **1080 px** |
| lado largo máx | 2560 px | 2560 px |
| peso | <10 MB | <10 MB |

Y: **cara ocupando 60-80% del ancho**, luz uniforme sin sobreexposición, frontal, expresión neutra, **boca cerrada, ojos abiertos, sin lentes ni maquillaje**. Opción **"180° Full Face Mapping"** = 3 fotos (frontal, perfil izq, perfil der).

**Mide (15-16 concerns, nombres exactos de la API):**
`wrinkle` · `pore` · `texture` · `acne` · `redness` · `oiliness` · `moisture` · `radiance` · `age_spot` · `dark_circle_v2` · `eye_bag` · `tear_trough` · `firmness` · `droopy_upper_eyelid` · `droopy_lower_eyelid` · `skin_type`
Con **sub-zonas**: `hd_pore` → forehead/nose/cheek/whole; `hd_wrinkle` → forehead/glabellar/crowfeet/periocular/nasolabial/marionette/whole; `skin_type` → whole/t_zone/u_zone con 8 clases (Normal, Oily, Dry, Combination + variantes "& Redness").

**Presenta:**
- **`all`** = score general 1-100 (más alto = mejor)
- **`skin_age`** = edad de piel "relativa a la distribución poblacional general"
- por concern: **`raw_score`** (float 1-100) y **`ui_score`** (int 1-100)
- **`output_mask_name`**: PNG de máscara (heatmap o binaria), **opacidad y colores configurables**, disponible vía API y JS Camera Kit

🔴 **LA CITA MÁS IMPORTANTE DE TODA ESTA INVESTIGACIÓN** (docs oficiales de Perfect Corp):

> *"**ui_score**: An integer ranging from 1 to 100. The UI Score functions primarily as a **psychological motivator** in beauty assessment. **We adjust the raw scores to produce more favorable results**, acknowledging that consumers generally prefer positive evaluations regarding their skin health. This calibration serves to **instill greater confidence in users** while maintaining the underlying beauty psychology framework."*

Y se ve en el JSON de ejemplo: `raw_score: 48.69 → ui_score: 70` · `raw_score: 60.74 → ui_score: 72` · `raw_score: 89.67 → ui_score: 85`. **Comprime todo hacia la banda 70-85.** El score que ve el usuario está diseñado, no medido.

**Producto:** cada score rutea al catálogo del cliente. Sephora (que corre sobre este motor) entrega **una rutina de 4 pasos**.

**Claims:** 70.000+ imágenes medical-grade · **95% test-retest reliability** (ojo: eso es *repetibilidad*, no exactitud diagnóstica) · **80%+ correlación con evaluación de médicos** · Vanta-certified HIPAA + GDPR.

**Casos de negocio publicados:** Benefit Cosmetics **14x uplift en ventas** entre quienes usaron el pore analyzer · Beekman 1802 **50% engagement** · Kanebo **2.48x dwell time** · agregado: **60-100% sesiones más largas, 250-350% más conversión**.

**Precio real (público):** $0.046-0.055 por unit. Consumo: 1-4 concerns = **9 units SD / 12 HD**; 5-8 = 12/16; 9-12 = 14/20; 13-16 = **16 SD / 22 HD**.
→ **un scan de 8 concerns SD ≈ US$0.58 · uno de 16 concerns HD ≈ US$1.06-1.21.** Free tier: **40 units** (≈2-4 scans). Plan más chico: **$24/mes por 500 units** (≈40 scans de 8 concerns).

- https://yce.perfectcorp.com/ai-api/products/skin-analysis-api
- https://docs.perfectcorp.com/reference/ai_skin_analysis ← **el contrato exacto**
- https://yce.perfectcorp.com/ai-api/api-pricing
- https://www.perfectcorp.com/business/products/ai-skin-diagnostic
- https://www.sephora.com/beauty/skin-analysis-tool (7 categorías: líneas finas y arrugas, manchas, textura irregular, rojez, sequedad, poros, imperfecciones → rutina de 4 pasos, *"we won't save your photo"*)

---

### 1.5 **Revieve** (SaaS: No7, BABOR, Paula's Choice, Matas/KICKS, RoC, ERHA)

**Pide:** selfie con **guía en tiempo real de la IA sobre iluminación, lentes y posición facial** + selección de concerns/objetivos personales. Journey de 3 pasos declarado: *Understand* (preferencias y objetivo) → *Inform & educate* (diagnóstico) → *Advise* (rutina configurable).

**Mide:** **20 core skin metrics + 200+ sub-métricas**; evaluación por zonas **T-Zone / Cheek-Zone / U-Zone**; envejecimiento, hidratación, pigmentación, sensibilidad, tipo de piel. Dataset declarado: **15M+ imágenes**. Permite **métricas custom por marca**.

**Presenta:** resumen con **áreas de foco + fortalezas**. En la variante **Skin Age Diagnostics** (RoC "AI Skin Insight"): 4 dimensiones — *fine lines & wrinkles, firmness & elasticity, tone & evenness, texture & smoothness* — que producen un **Skin Age Score** ("cómo se ve tu piel respecto a la piel típica de tu edad cronológica"), con *"a breakdown of each skin metric, **mapped directly onto your face** so you can see what's happening and where"*. **Los resultados se entregan por email.**

**Producto:** rutina personalizada matcheada al inventario real de la marca. **Skin Advisor Pro** agrega perfil persistente, tracking de objetivos y rutina dinámica.

**Disclaimers:** *"Your selfie is used to provide RoC AI Skin Insight™ with precise information about your skin. **Once analyzed, your image is automatically deleted**."* Nada más en el landing.

**Métricas de negocio (benchmark propio):** **3.6x conversión**, **+29% AOV**, **+258K datapoints únicos/mes** ("desbloquea zero- y first-party data de otro modo inaccesible" ← esto es lo que la marca realmente compra).

**Novedad 2026:** el mismo advisor corriendo **dentro de ChatGPT** y **por WhatsApp** (ERHA, Indonesia). El canal se movió; el guión no.

- https://www.revieve.com/platform/skincareadvisor
- https://www.revieve.com/technologies/ai-skin-diagnostics
- https://www.rocskincare.com/pages/roc-ai-skin-insight
- https://www.revieve.com/insider/news/erha-revieve-ai-whatsapp-skin-advisor-indonesia

---

### 1.6 **Haut.AI** — 🏆 la mina de oro: es el único con la lógica completa documentada públicamente

Si vas a replicar UNA cosa, replicá esto. Su documentación expone **el score, las bandas, los umbrales concern→producto y el algoritmo de recomendación completo**.

**Pide:** **LIQA** ("Live Image Quality Assurance"), una cámara inteligente plug-and-play que controla la captura en el browser. Requisitos: **iOS 16+ / Android 12+, cámara 5MP+ (8MP recomendado), WebAssembly, 3GB RAM iOS / 6GB Android**. *"LIQA no se recomienda en desktop"* (webcams insuficientes + no podés mover la luz). Si suben foto: **mínimo 2500×2500 px con la cara ocupando ≥85% de la imagen**, JPEG/PNG/WEBP.

**Journey del Consumer App (widget embebible, no-code):**
1. Captura con LIQA (o upload)
2. *(opcional)* **encuesta** con múltiples tipos de pregunta
3. **Review del análisis con "skin concerns prioritization"** + opciones de compartir
4. Productos recomendados, con **wishlist / add-to-cart**
Todo brandeable (logo, colores, imágenes, idioma) + **GA4 con eventos y passthrough de UTMs**.

**Mide — Face Skin Analysis 3.0 (40+ parámetros):** Breakouts (acne inflammation, pimples, papules, pustules, post-acne hyperpigmentation) · Dark Circles · Eyes Age · Under Eye Puffiness · ITA · **Lines** (deep, fine, forehead, lip, marionette, nasolabial, glabellar, under eye, crow's feet, eye) · Perceived Age · **Pigmentation** (freckles, moles, melasma, sun spots) · Pores (enlarged) · Redness (irritation) · **Sagging** (jowls, lacrimal grooves) · Skin Type · Skin Tone · Uniformness · Hydration · Quality.

🔴 **EL FORMATO DE SCORE — copialo tal cual:**
```json
"main_metric": {
  "value": 64,
  "widget_type": "bad_good_line",   // más alto = mejor
  "name": "Pores Score",
  "tech_name": "pores_score"
}
```
Bandas oficiales (0-100):
| Rango | Etiqueta |
|---|---|
| 90-100 | **Excellent** |
| 80-90 | **Great** |
| 70-80 | **Good** |
| 50-70 | **Average** |
| 30-50 | **Poor** |
| 0-30 | **Bad** |

**Sub-métricas** que dan el "olor a instrumento": `pores_number: 455` (widget `numeric`) y `pores_density` (widget `density`).
**Zonas** (`area_results`): face, forehead, forehead_n_bridge, nose, nose_bridge, right/left_cheek (wide/large), left/right_eye_outer, chin, chin_wide.
**Máscaras:** `polygon_mask` / `point_mask` / `heatmap_mask`, en GeoJSON (MultiPolygon / MultiPoint) con `view_box`, y — clave — **`fill` (color recomendado para pintar) e `intensity` (intensidad recomendada)**. La API te dice literalmente de qué color dibujar el overlay.

🔴 **LOS UMBRALES score → concern (Product Recommendation 2.0):**
| Concern | Regla |
|---|---|
| Breakouts | `Acne score < 90` |
| Pigmented spots | `Pigmentation < 90` |
| Uneven skin tone | `Uniformness < 70` |
| Redness | `Redness < 70` |
| Wrinkles | `Lines < 75` |
| Sagging | `Sagging < 70` |
| Under eye lines | `L o R eye lines < 80` |
| Dark circles | `Dark circles < 70` |
| Under eye puffiness | `Eye bags < 70` |
| Pores | `Pores < 50` |
| Aging | `Perceived age > 45` **y** (`Lines < 70` **o** `Pigmentation < 80`) |

Notá el diseño: **los umbrales son generosos** (basta un 89 en acné para tener "breakouts") → **casi nadie sale sin concerns → casi nadie sale sin productos que comprar**. Eso es el motor comercial escondido en un número.

🔴 **EL ALGORITMO DE RECOMENDACIÓN (7 pasos, replicable con SQL):**
1. Filtro duro por **tipo de piel** (si el producto no tiene el tag del tipo de piel del usuario, **nunca** se recomienda). Si el usuario marcó "piel sensible" → sólo productos con tag `Sensitive = Yes`.
2. Filtro duro por **concerns**: productos con ≥1 tag coincidente + productos **sin tags** (cuidado básico). Producto con tags que no solapan → descartado.
3. Ordenar por **priority** (curado por la marca).
4. Ordenar por **peso de tags**: concern *basic* = **1**, concern *advanced* = **1.5**.
5. Ordenar por **precio**.
6. **Top 10 por categoría**, 9 categorías: desmaquillante · limpiador · tónico · exfoliante · mascarilla · sérum · contorno de ojos · hidratante · protector solar.
7. Vista:
   - **Routine view**: el top de cada categoría; si sólo tiene tag AM o PM, busca **el par opuesto** en la misma categoría; + **1 producto "Promo"** (el de mayor prioridad y **mayor precio** que NO esté en la rutina 👀) + bloque **"You may also like"** con el resto.
   - **List view**: lista plana ordenada.

- https://docs.saas.haut.ai/haut.ai — **todas las páginas están disponibles en Markdown agregando `.md` a la URL, y hay `llms.txt`**
- .../developers/saas-api-overview/api-for-face-metrics-2.0/pores.md ← el formato del score
- .../haut.ai-features/product-recommendation-system-2.0/user-tags.md ← los umbrales
- .../haut.ai-features/product-recommendation-system-2.0/recommendation-algorithm.md ← el motor
- .../haut.ai-features/liqa.md ← requisitos de captura
- .../haut.ai-features/consumer-apps.md ← el journey

---

### 1.7 **La Roche-Posay Effaclar Spotscan / Spotscan+** (el caso "cuasi-médico")

**Pide:** **3 selfies — centro, perfil izquierdo, perfil derecho**, de cerca, con el móvil. Target declarado: **adolescentes y adultos jóvenes**.

**Mide:** *"cuenta, localiza y categoriza tus imperfecciones (granos, puntos negros, marcas pigmentadas)"*. Base: **12.000 fotos de todas las etnias con acné**. Validación: **1.012 pacientes con acné supervisados por 3 dermatólogos**.

**Presenta:** un **grado GEA (Global Evaluation of Acne) de 0 a 5** — la misma escala que usan los dermatólogos — con face map de las lesiones y predicción de mejora "antes/después".

🔴 **La regla de derivación como feature:** *"**A partir del grado 3, se te aconseja consultar a un dermatólogo**."* Y: *"Spotscan+ no reemplaza una cita con un dermatólogo, pero es un primer paso vital."* **Esto es lo que compra credibilidad: la herramienta admite en voz alta dónde termina.**

**Producto:** rutina Effaclar personalizada — **hasta 4 productos** + tips.

**Privacidad:** *"Spotscan+ no almacena ningún dato; las fotos del usuario se eliminan del servidor inmediatamente después del análisis."*

**Creíble vs. vendedor — el test independiente:** Bustle probó 5 apps. Spotscan **mostró la situación "bajo una luz más negativa de lo que realmente era"** y **confundió milia con puntos negros**. Le recomendó 2 productos. Es decir: la marca que vende tratamiento anti-acné tiene un modelo que **sobre-detecta acné**. El sesgo va en la dirección del catálogo.

**Evolución US (2025-26):** LRP reemplazó Spotscan por **MyRoutine AI** — **1 selfie**, perfil en <1 min, **6 concerns**, **<3 minutos total**, *"95% de precisión con un modelo entrenado en 50.000 imágenes científicas"*, validado por dermatólogos, **gratis y sin registro obligatorio**, con **10% OFF en la rutina recomendada** y email **voluntario** para recibir resultados. Foto borrada *"generalmente en cuestión de segundos"*.

- https://www.laroche-posay.co.uk/what-is-effaclar-spotscan
- https://www.loreal.com/en/articles/science-and-technology/la-roche-posay-spotscan/
- https://www.laroche-posay.us/find-your-routine/myroutine-ai-analysis.html
- https://www.bustle.com/p/do-ai-skin-apps-actually-work-i-tested-out-5-heres-what-i-found-19253267 ← **el mejor test independiente que encontré**

---

### 1.8 **Olay Skin Advisor** (P&G) — el pionero del "Skin Age" y el único auditado por sesgo

**Pide:** selfie **sin maquillaje** + cuestionario sobre rutina actual y preferencias de producto.

**Mide:** **5 "aging zones"** — frente, contorno de ojo (patas de gallo), mejilla, bajo-ojos y boca. Signos: flacidez, manchas oscuras, opacidad, líneas finas, arrugas.

**Presenta:** un **"Olay Skin Age"** = *cuán vieja se ve tu piel comparada con otras personas que tienen los mismos signos de envejecimiento* ← **comparación poblacional explícita, es el gancho de toda la herramienta**. Además marca zonas **"best"** y zonas **"improvement"**.

**Producto:** productos Olay por concern, con recomendaciones tanto para lo que hay que mejorar como para lo que ya está bien.

🔴 **Auditoría externa (única en la categoría):** en 2021 Olay lanzó **#DecodeTheBias** con **Joy Buolamwini** (Algorithmic Justice League) y contrató a **ORCAA (O'Neil Risk Consulting)** para auditar Skin Advisor. Resultado publicado: **menos preciso en los extremos del espectro de edad y ligeramente menos preciso en pieles oscuras**. Olay se comprometió a actualizar el dataset y auditar de forma recurrente. Tráfico reportado: **487.000 visitas/mes (abr-2025)**.

**Creíble vs. vendedor:** publicar tu propia auditoría de sesgo es la jugada de credibilidad más fuerte del sector. Pero en el test de Bustle, **Olay le dio a la periodista una edad de piel MENOR que su edad real** — el sesgo halagador en acción (opuesto al de Spotscan, y en ambos casos alineado con lo que la marca necesita que sientas).

- https://www.olay.com/pages/skin-advisor
- https://www.olay.com/decodethebias/orcaa
- https://orcaarisk.com/in-the-news/2021/9/22/our-audit-of-olays-skin-advisor-is-live

---

## 2. 📐 EL PATRÓN UX REPLICABLE — el guión de 11 pantallas

Esto es lo que hay que copiar. Ninguna pantalla requiere visión propietaria.

| # | Pantalla | Qué hace | Detalle robado de |
|---|---|---|---|
| **0** | **Promesa + fricción cero** | "Entendé tu piel. Gratis, 2 minutos, **sin cuenta ni app**." + logos de prensa/aval | Neutrogena, LRP MyRoutine |
| **1** | **Consentimiento anticipado** | UNA línea antes de abrir la cámara: *"Tu foto se analiza y **se borra automáticamente**. No la guardamos."* | Los 6 lo dicen, con el mismo verbo |
| **2** | **Gate de captura guiada** | Óvalo + checks en vivo (luz / lentes / distancia / expresión). **Rechazar la foto mala es lo que hace parecer un instrumento.** Mobile-first: en desktop mostrar QR | LIQA (Haut.AI), Perfect Corp valida antes de analizar |
| **3** | **Micro-encuesta 3-5 preguntas** | Edad · tipo de piel · sensibilidad · objetivo. **Neutrogena las pone DESPUÉS del resultado** — reduce abandono y aumenta la sensación de "esto salió de mi cara, no de mis respuestas" | Neutrogena / Skin Genius |
| **4** | **Procesamiento con teatro** | 2-6 s nombrando los pasos ("detectando zonas… midiendo textura… comparando…"). El tiempo percibido es parte del valor | universal |
| **5** | **Score global + etiqueta** | Un número (0-100 o 1-10) **+ palabra**. Nunca el número solo | Haut.AI `bad_good_line`; Neutrogena 1-10 |
| **6** | **Desglose 5-8 dimensiones** | Barras horizontales "bad → good", ordenadas peor→mejor. **Máximo 8.** Más de 8 se lee como ruido | Skin Genius (8), Neutrogena (6), Sephora (7), LRP (6) |
| **7** | **Overlay sobre TU cara** | Toggle on/off por concern. Es el momento "ah, lo veo" | Perfect Corp (máscaras PNG), Haut.AI (GeoJSON + color sugerido), RoC ("mapped directly onto your face") |
| **8** | **Jerarquía emocional** | **"Tu foco #1: X"** + **"Tus fortalezas: Y, Z"**. Regla no escrita: **nunca más de 3 problemas, siempre ≥2 fortalezas** | Vichy (priorities/strengths), Olay (best/improvement), Skin Genius |
| **9** | **Rutina, no lista** | **4 pasos AM/PM con 4-6 SKUs.** No un catálogo. + 1 "promo" + bloque "también te puede gustar" | Sephora (4 pasos), LRP (hasta 4), Vichy (3), Haut.AI (routine view) |
| **10** | **Captura de email como beneficio** | *"Te mandamos tus resultados **para que compares tus scores dentro de un mes**"* — el email se pide para tracking, no para spam. + descuento (**LRP: 10% OFF en la rutina**) | Neutrogena, RoC, LRP |
| **11** | **Re-scan / tracking** | La única razón real por la que vuelven. Es el loop de retención | Skin Advisor Pro (Revieve), Skin360 |

### Las 12 decisiones de diseño que hacen que se vea creíble

1. **Score 0-100 con dirección explícita** (más alto = mejor). Nunca escalas invertidas mezcladas.
2. **Bandas cualitativas nombradas** (Excellent/Great/Good/Average/Poor/Bad). El número solo es hostil.
3. **Fortalezas siempre visibles junto a problemas.** Sin esto, el resultado se siente un ataque.
4. **Comparación poblacional**: "edad de piel" o "vs. personas de tu edad". Es el elemento más viral y el más blando científicamente.
5. **Overlay sobre la foto propia.** Convierte una opinión en una observación.
6. **Al menos un conteo absoluto** ("455 poros detectados"). Un entero suelto vale más que tres adjetivos.
7. **Zonificación anatómica** (frente / nariz / mejillas / contorno de ojo / mentón). Suena a mapeo, no a impresión.
8. **Números de procedencia visibles**: "10.000 imágenes graduadas", "validado con 1.012 pacientes y 3 dermatólogos".
9. **El sello humano**: "developed with dermatologists" en el header.
10. **La regla de derivación**: "a partir del grado 3, consultá a un dermatólogo". **Admitir el límite es lo que compra la autoridad.**
11. **Promesa de borrado ANTES de la captura**, no en el footer.
12. **Salida acotada y accionable**: 4 pasos, no 12 productos.

---

## 3. 🚩 Dónde está el humo (el límite entre útil y venta)

| Claim | Qué es realmente |
|---|---|
| **"ui_score"** de Perfect Corp | El score que ves está **deliberadamente inflado** hacia la banda 70-85 como *"psychological motivator"*. Documentado por ellos mismos. **Nadie más lo admite, pero todos lo hacen.** |
| **"Hidratación / moisture"** desde una foto | No hay corneometría. Es inferencia de brillo/textura en RGB. Es la métrica **más vendida y menos medible**. |
| **"Firmeza / elasticidad"** | No hay cutometría. Es geometría de contornos + sombras. |
| **"95% de precisión"** | Perfect Corp es honesto: es **95% test-retest reliability** = da lo mismo dos veces, **no** que acierte. L'Oréal dice "hasta 95% vs. consulta dermatológica" — "hasta" hace todo el trabajo. |
| **"80%+ correlación con médicos"** | Significa **20% de desacuerdo** con un profesional. |
| **"Skin Age"** | Número sin unidad clínica. Existe porque es compartible. |
| **Umbrales generosos** | Haut.AI marca "breakouts" con score **<90/100**. Casi nadie sale limpio. **El diagnóstico está calibrado para que siempre haya algo que comprar.** |
| **Dirección del sesgo = dirección del catálogo** | Bustle: **Olay** (anti-edad) le dio edad de piel **menor** que la real → te hace sentir bien con la marca. **LRP Spotscan** (anti-acné) mostró el acné **peor** de lo que era y confundió milia con comedones → te empuja al tratamiento. |
| **Sesgo demográfico real** | ORCAA sobre Olay: **menos preciso en pieles oscuras y en los extremos de edad**. Es el único con auditoría pública; asumí que el resto tiene el mismo problema sin publicarlo. |
| **El producto real es el dato** | Revieve lo dice sin filtro: **"+258K datapoints únicos/mes — desbloquea zero- y first-party data de otro modo inaccesible."** El análisis es el precio que el usuario paga con su cara. |
| **El costo psicológico** | Gizmodo: los scores *"ramp up insecurity"*. Un derm en Fortune: *"It's partially a marketing strategy too."* |

**La línea, en una regla operativa:**
> Es **útil** cuando mide algo visible en la foto (arrugas, poros, manchas, rojez, textura), lo pinta sobre la cara, muestra fortalezas, y admite dónde termina.
> Es **humo** cuando mide algo que la cámara no puede ver (hidratación, elasticidad, "salud"), infla el número por diseño, esconde el error, no deriva nunca, y cada camino termina en un SKU.

---

## 4. 💸 Presupuesto: los 4 caminos, con números reales

| Camino | Costo | Qué te da | Qué NO te da |
|---|---|---|---|
| **A. Perfect Corp API** | **$0.43-1.21/scan** (9-22 units × $0.046-0.055). 40 units gratis. $24/mes = 500 units ≈ 40 scans de 8 concerns | 15 concerns con scores, máscaras PNG por concern, skin_age, JS Camera Kit, HIPAA/GDPR, playground | Se te va la caja a 1.000 scans/mes (~$550-700/mes). El motor no es tuyo |
| **B. Haut.AI** | Pricing no público; Consumer App no-code en todos los planes, **API sólo en plan Professional** | Widget embebible completo (captura+encuesta+resultados+productos+GA4) sin escribir front-end, 40+ parámetros, SkinGPT | Dependencia total; lock-in del journey |
| **C. Open source local** | **$0** — `github.com/DurtyDhiana/skin-scan` (OpenCV + MediaPipe, 7 mapas: rojez, grasa, textura, poros, imperfecciones, hidratación, pigmentación, todo local) | Máscaras y heatmaps sin API key ni datos saliendo del server | Cero validación clínica, cero autoridad de marca. Sirve como capa visual, no como claim |
| **D. 🏆 Híbrido VLM — el que yo armaría** | **~$0.01-0.04/scan** | Ver abajo | Máscaras pixel-perfect (se resuelve con zonas, no con píxeles) |

### El camino D, concreto

1. **Captura (gratis, browser):** MediaPipe Face Mesh en JS → 468 landmarks. Con eso hacés **el gate de calidad completo**: cara centrada, tamaño relativo (regla Perfect Corp: **cara = 60-80% del ancho**), frontalidad (yaw/pitch por landmarks), ojos abiertos, y **luminancia + varianza de laplaciano** para luz y foco. Rechazá la foto mala. *Este paso solo ya te compra la mitad de la credibilidad.*
2. **Zonificación (gratis):** con los mismos landmarks recortás **frente, nariz, mejilla izq/der, periocular, mentón** — exactamente las `area_results` de Haut.AI. Ya tenés el "mapeo anatómico".
3. **Medición (VLM, 1 llamada):** una sola llamada de visión con **rúbrica estructurada 0-100 por dimensión y por zona**, en JSON forzado. Máximo **6 dimensiones**: líneas/arrugas · poros/textura · manchas/tono desigual · rojez · brillo-grasa · luminosidad. **No prometas hidratación ni elasticidad.** Pedí también 1 frase de justificación por dimensión ("líneas visibles en zona periocular al sonreír").
4. **Calibración (código propio, gratis):** mapeá el score crudo a las **bandas de Haut.AI** (90+ Excellent … <30 Bad). Definí tus umbrales concern→producto **con la generosidad que elijas** — y decidí conscientemente si inflás como Perfect Corp o no. *Recomendación: no inflar el número, pero sí ordenar la narrativa (fortalezas primero, máximo 3 focos).*
5. **Overlay (gratis, Canvas/SVG):** pintá **por zona**, no por píxel — polígonos semitransparentes sobre las regiones de MediaPipe, con opacidad proporcional a la severidad. **A 400px de ancho en un móvil, un heatmap por zona y uno por píxel se leen casi igual.** Copiá el patrón de Haut.AI de devolver `fill` + `intensity` por máscara.
6. **Recomendación (SQL puro, gratis):** implementá los 7 pasos de Haut.AI tal cual. Necesitás sólo dos tablas de tags: `producto → {skin_types[], concerns[], categoria, am_pm, priority, precio, promo}` y `usuario → {skin_type, concerns[]}`. **Este es el 80% del valor comercial y no tiene nada de IA.**
7. **Cierre:** rutina 4 pasos AM/PM + 1 promo + "también te puede gustar" + email para comparar en 30 días + descuento.

**Cuánto sale realmente:** ~US$0.01-0.04 por scan en inferencia + el front-end. **1.000 scans/mes ≈ US$10-40**, contra ~US$580 en Perfect Corp con 8 concerns SD. El delta se lo comés en credibilidad de marca (no podés decir "dermatologist-verified"), no en UX.

---

## 5. ⚖️ El copy legal mínimo (lo que realmente muestran)

**Lo que TODOS dicen, casi con las mismas palabras — poné esto antes de abrir la cámara:**
> *"Tu foto se usa únicamente para el análisis y **se elimina automáticamente** una vez procesada. No la almacenamos."*
> (LRP: *"se elimina del hub cloud generalmente en cuestión de segundos"* · Neutrogena: *"immediately deleted"* · L'Oréal: *"we don't store your selfie"* · RoC: *"automatically deleted"* · Sephora: *"we won't save your photo"*)

**El disclaimer médico — hallazgo contraintuitivo:** las marcas grandes **casi no lo escriben**. Los ToS de Neutrogena Skin360 **no contienen "medical", "diagnose" ni "substitute"**. Se protegen (a) borrando la foto, (b) usando vocabulario cosmético ("beauty", "skin health", "concerns", nunca "condition" ni "diagnosis"), y (c) **derivando explícitamente** (LRP: "a partir del grado 3, consultá a un dermatólogo").

**Las que sí lo escriben usan esta plantilla** (herramientas independientes tipo ScanSkinAI / SkinScan / YourSkinGPT):
> *"El análisis, las recomendaciones y la información provistas por esta herramienta de IA son sólo con fines informativos generales y **no pretenden sustituir el consejo, diagnóstico o tratamiento médico profesional**. Esta herramienta analiza únicamente la **apariencia cosmética** y **no diagnostica enfermedades, trastornos ni condiciones de la piel**."*

**Para Perú / Ley 29733, agregá lo que ellos no necesitan y vos sí:**
- consentimiento **expreso y previo** para el tratamiento de la imagen (dato biométrico → categoría sensible),
- finalidad declarada y acotada, plazo de conservación (idealmente **cero: procesar en memoria y descartar**),
- si mandás la foto a un tercero (OpenAI/Anthropic/Perfect Corp) → **declarar el flujo transfronterizo**,
- edad mínima (Neutrogena corta en **13**; LRP Spotscan apunta a adolescentes → cuidado con menores).

---

## 6. 🚫 Anti-patrones (errores que se ven en el mercado)

1. **Desktop-first.** Neutrogena directamente **te expulsa a móvil con un QR**; Haut.AI dice que LIQA "no se recomienda en desktop". Si tu tool corre en webcam de laptop, el resultado es basura y se nota.
2. **Analizar cualquier foto.** Si no rechazás la foto mala, no sos un instrumento: sos un generador de opiniones.
3. **Más de 8 dimensiones en la primera pantalla.** Revieve mide 200+ sub-métricas y muestra un resumen. Perfect Corp mide 16 y Sephora, sobre el mismo motor, muestra **7**.
4. **Sólo problemas.** Sin fortalezas explícitas el usuario cierra la pestaña y te odia.
5. **Terminar en una grilla de catálogo.** El output es una **rutina**, no un listado.
6. **Prometer hidratación/elasticidad desde una foto** sin decir que es estimación visual. Es el claim más fácil de romper y el que más te expone.
7. **Pedir cuenta antes del resultado.** LRP lo dice literal: *"no estás obligado a suscribirte para ver tus productos recomendados"*. El email se pide **después**, como beneficio ("compará dentro de un mes").
8. **Un número desnudo sin etiqueta.** "64" es agresivo; "64 — Average" es información.
9. **No tener regla de derivación.** Es gratis, es ético, y es lo que más autoridad te da.

---

## 7. Fuentes

**Documentación técnica (la más accionable)**
- Haut.AI docs — https://docs.saas.haut.ai/haut.ai (agregá `.md` a cualquier URL; hay `llms.txt`)
- Perfect Corp AI Skin Analysis API — https://docs.perfectcorp.com/reference/ai_skin_analysis
- Perfect Corp pricing — https://yce.perfectcorp.com/ai-api/api-pricing
- LIQA — https://docs.liqa.haut.ai/

**Herramientas vivas para probar**
- https://skin360.neutrogena.com/ · https://www.laroche-posay.us/find-your-routine/myroutine-ai-analysis.html · https://www.olay.com/pages/skin-advisor · https://www.vichy.com/skinconsultai · https://www.loreal-paris.co.uk/skin-genius · https://www.sephora.com/beauty/skin-analysis-tool · https://www.rocskincare.com/pages/roc-ai-skin-insight

**Cómo lo cuentan las marcas**
- L'Oréal R&I, "Behind the scenes of the skin analyzer apps" — https://www.loreal.com/en/articles/science-and-technology/ri-behind-the-scenes-of-the-skin-analyzer-apps/
- L'Oréal, Spotscan+ — https://www.loreal.com/en/articles/science-and-technology/la-roche-posay-spotscan/
- Revieve Skincare Advisor — https://www.revieve.com/platform/skincareadvisor
- Perfect Corp AI Skin Diagnostic — https://www.perfectcorp.com/business/products/ai-skin-diagnostic
- Neutrogena × Haut.AI — https://drugstorenews.com/neutrogena-hautai-collaborate-revamped-skin360-experience

**Escrutinio independiente (para el punto 6)**
- Bustle, 5 apps testeadas — https://www.bustle.com/p/do-ai-skin-apps-actually-work-i-tested-out-5-heres-what-i-found-19253267
- Gizmodo, Skin360 — https://gizmodo.com/neutrogenas-free-skincare-app-actually-works-mostly-1841026360
- Fortune, face-scanning apps — https://fortune.com/2024/02/29/face-scanning-ai-apps-are-giving-cosmetics-companies-deeper-connections-and-selling-points-with-customers/
- ORCAA × Olay #DecodeTheBias — https://www.olay.com/decodethebias/orcaa · https://orcaarisk.com/in-the-news/2021/9/22/our-audit-of-olays-skin-advisor-is-live

**Alternativa gratis**
- skin-scan (OpenCV + MediaPipe, 7 mapas, local) — https://github.com/DurtyDhiana/skin-scan

---

*Archivos crudos de scraping en:* `/private/tmp/claude-501/-Users-macbookpro-Desktop-Nova-ClaudeCode-Empresa-IA/b171c4e4-88ca-409c-8169-e2a8693de471/scratchpad/.firecrawl/`