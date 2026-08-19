Research complete. Here's the deliverable.

# Cuestionarios de diagnóstico de piel DTC — teardown accionable
**Fecha: 19-ago-2026.** Investigación primaria (extraje los payloads en vivo de Proven, Prose y Curology hoy) + benchmarks públicos.

---

## 0. Hallazgo de contexto antes de copiar a nadie

Dos de las seis marcas **ya no tienen quiz de piel**. Verificado hoy:

| Marca | Estado real |
|---|---|
| **Curology** | ✅ Vivo. `quiz.curology.com` |
| **Proven** | ✅ Vivo, el más sofisticado. 61 preguntas en el bank |
| **Prose** | ✅ Vivo (hair; el skin usa el mismo motor) |
| **Function of Beauty** | ⚠️ **Skincare retirado.** `/pages/quiz-home` no menciona "skin" ni una vez; `/pages/skin-quiz` → 404 ("404 is Code for Bad Hair Day"). Sólo hair + body |
| **Atolla** | ❌ **Muerta.** Comprada por FoB en ago-2021, absorbida. Sólo archive.org |
| **Skin Inc** | ❌ **Diagnóstico muerto.** `/pages/skin-id` renderiza vacío; `/products/create-your-own-custom-serum` → 404. Volvieron a e-commerce clásico |

**Lección comercial:** el quiz personalizado tiene costo de mantenimiento alto. Cuando la marca deja de invertir, el quiz se pudre antes que la tienda. Si le vendés esto a un cliente, vendé el motor + el mantenimiento, no un entregable único.

---

## 1. Cuántas preguntas, de qué tipo, y cuál es la PRIMERA

| Marca | Preguntas | Tipo dominante | PRIMERA pregunta (literal) |
|---|---|---|---|
| **Curology** | "15 o menos" (blog oficial); Savvy lo mapea como **46 pantallas** totales | Multiple choice + 3 fotos obligatorias | **`/skin-goals`** → "¿qué querés tratar?" (acné, manchas, arrugas, poros, rojeces, textura, firmeza) — **multi-select** |
| **Proven** | **61 en el bank**, ~25-30 vistas reales por ramificación | SelectOne / SelectMany / texto / zip | "**Let's start with the basics — who's this routine for?**" (nombre) → luego "**What are your main skin concerns?**" |
| **Prose** | **30+** en 4 capítulos | Imagen-select + tooltips | "**What does a single strand of hair feel like?**" + instrucción física: *"Roll a single hair between your fingers"* |
| **Function of Beauty** | ~15-20 (sólo hair hoy) | Imagen-select | Tipo de cabello |
| **Atolla** (histórico) | Quiz + kit físico de test cada 3 semanas (pH, aceite, hidratación) | Mixto digital + hardware | Historial de piel |
| **Skin Inc** (histórico) | ~10, "3 minutos" | Multiple choice | Edad |

### La regla de la primera pregunta
**Las tres marcas vivas abren pidiendo el OBJETIVO o una AUTO-OBSERVACIÓN fácil. Ninguna abre con datos demográficos, ni con email, ni con "¿qué producto buscás?".**

Curology lo justifica explícitamente por boca de su nurse practitioner Jasmin Chang:

> *"Super important to give us more direction when prescribing a formula. We want to treat what's important to the patient as much as possible, and sometimes photos don't tell the whole story."*

Las 3 razones por las que funciona:
1. **Coste cognitivo cero.** El usuario ya sabe la respuesta antes de llegar (por eso hizo clic).
2. **Compromiso previo (Cialdini).** Al declarar "quiero tratar el acné" se auto-etiqueta; abandonar después contradice su propia declaración.
3. **Multi-select = permiso para exagerar.** Marcar 3 preocupaciones justifica luego una rutina de 3 productos en vez de 1. El AOV se decide en la pregunta 1.

**Excepción inteligente de Proven:** abre con el **nombre** ("who's this routine for?"). Es la pregunta de menor fricción posible y le compra derecho a personalizar todo lo demás ("Gabriel, tus resultados..."). Prose hace lo mismo en el reveal: *"Celia, your results are in!"*

---

## 2. Cómo mantienen enganchado al usuario

### 2.1 El patrón convergente más fuerte: **"WHY WE ASK"**
Proven y Prose llegaron **independientemente** al mismo mecanismo. Cada pregunta lleva un bloque que explica por qué se pregunta.

Proven, en `/quiz/Q1_wrinkles/` (extraído en vivo):
> **WHY WE ASK:** Fine lines and wrinkles indicate collagen breakdown and repetitive muscle contractions creating skin creases. Your concern level determines the **intensity of anti-aging actives** we include - from gentle peptides for prevention to stronger retinoids for correction.
> *Based on research from:* [logo Tianjin University] [logo Dartmouth Medical School]

**Logos de universidades por pregunta.** Esto convierte cada pantalla de "formulario" a "consulta médica". Es lo más copiable de todo el research.

Prose lo hace como tooltip expandible: *"This info about individual hair thickness is crucial to supporting overall strength and addressing frizz and flyaways."*

### 2.2 Micro-copy educativa que devuelve valor por respuesta
Proven inyecta un dato tras responder — el usuario **aprende algo** a cambio de cada clic:
- "Skin sensitivity affects 45% of the population."
- "Airplane cabins are very dry with high UV exposure."
- "Stress is linked to premature aging, skin inflammation and the onset or aggregation of skin diseases."
- "Digital pollution requires special blue and HEV light-inhibiting ingredients."
- "Cystic acne requires intensive intervention with specific ingredients."

### 2.3 Progreso por CAPÍTULOS, no por porcentaje
Nadie muestra "23%". Muestran secciones nombradas:

- **Prose** (barra fija arriba): `Hair & Scalp → Treatments → Lifestyle → Preferences & Goals`
- **Proven** (íconos + transiciones): `Skin Concerns → Let's Make Your Formula → Just a couple questions about you → Let's talk lifestyle → Where you live affects your skin`
- **Curology** (rutas reales): `face → skin-goals → your-skin → health-history → more-info → register → proven-results → product-recommendations`

**Por qué:** 4 capítulos de 8 preguntas se perciben más cortos que 32 preguntas. Además una barra al 12% en la pregunta 4 mata; "estás en Lifestyle" no.

### 2.4 Respuestas visuales con auto-diagnóstico
Prose no pregunta "¿tu pelo es fino?" — te hace **hacer algo**: *"Roll a single hair between your fingers"* → tres opciones con foto:
- "Barely feel it = fine/thin hair"
- "Not sure or feel it slightly = medium hair"
- "Feels like sewing thread = thick/coarse hair"

Elimina el "no sé" (la principal causa de abandono en quizzes de diagnóstico) y sube la precisión del dato.

### 2.5 Micro-recompensas a mitad de quiz
- **Prose**: tras el código postal muestra *"Here's what affects your hair in [tu ciudad]"* — payoff antes del final.
- **Proven**: 47 factores / 28M data points / 20,000 estudios repetido como framing.
- **Prose**: la penúltima pregunta es **elegir la fragancia** — la única variable que el usuario controla. Termina con agencia, no con interrogatorio.
- **Todos**: opción "I don't know" / "Not sure" siempre disponible.

### 2.6 Guardar y volver
Prose: botón **"Save + exit"** persistente y en la portada *"Already gave us your email? Resume here"*. El quiz de 30 preguntas deja de ser todo-o-nada.

---

## 3. Qué datos capturan y CUÁNDO piden el email

### Inventario de datos (Proven, extraído completo)
- **Concerns** (multi) + follow-ups ramificados por cada uno: sensibilidad, arrugas, sequedad, acné, firmeza, rojeces, hiperpigmentación, ojeras
- **Piel**: tipo, tono/melanina (6 niveles), diagnósticos (Rosácea, Dermatitis Seborreica, Psoriasis Facial, Eccema)
- **Médico**: prescripción tópica, alergias a ingredientes, retinol + concentración exacta (`<0.04%` a `>1.00%`), embarazo/lactancia
- **Demo**: edad (8 rangos), género (incl. no binario / prefiero no decir)
- **Lifestyle**: vasos de agua, horas de sueño, estrés (5 niveles), dieta (azúcares, lácteos, alcohol, procesados), frecuencia de vuelos, maquillaje + remoción, método de afeitado
- **Entorno**: **código postal** (clima/UV), horas de sol, horas de pantalla
- **Comercial**: productos que ya usa, si quiere SPF en el day moisturizer

### El momento del email

| Marca | Momento | Copy exacto |
|---|---|---|
| **Proven** | **ÚLTIMA pregunta**, justo antes de la animación "Calculating Results" | *"Where should we send your results?"* / helper: *"Drop your primary email for skin magic and account access! 💌"* |
| **Prose** | **Temprano/medio** — necesario para "Save + exit" y resume | *"Already gave us your email? Resume here"* |
| **Curology** | **Paso `/register`, ANTES de `/proven-results` y `/product-recommendations`** | Creación de cuenta completa (es telemedicina, no opcional) |

**Los tres gatean el resultado detrás del email.** Pero el framing es la diferencia:

> **"Where should we send your results?"** convierte mejor que **"Enter your email to unlock your results."**
> Una se siente servicio; la otra, peaje.

Proven además ordena todo el sacrificio ANTES del email: 25-30 preguntas contestadas = sunk cost máximo cuando llega el pedido. Y usa emoji + "skin magic" para desarmar la resistencia.

---

## 4. Del resultado al carrito

### Curology (el más agresivo)
`register → proven-results → product-recommendations`. Mete una pantalla de **prueba social** ("5.5+ million patients served", "93% report effective" con nota al pie *"Among 856 customers subscribed to Curology for 3+ months. Self-reported."*) **entre** el registro y la recomendación. Oferta: **primer mes gratis, pagás $5.45 de shipping**. El producto real llega después de que un proveedor licenciado revisa las fotos — el "resultado" del quiz es la **aprobación médica**, no el producto. Renovación automática a $39.90 cada 2 meses.

### Proven
1. Última pregunta → email
2. Pantalla **"Calculating Results"** (animación de cómputo)
3. Página de resultado tipo "Congrats" (flag interno: `CONGRATS_CART_PRICING_EXPERIMENT`)
4. **Un solo SKU compuesto**: sistema de 3 pasos, $167.97 → **$99 (40% off)**, 2 meses de suministro
5. Fallback: rutinas pre-armadas **"SkinSpecific"** (Acne / Anti-Aging / Hyperpigmentation) para quien no completa

Copy del resultado: *"A complete daily routine with cleanser, day moisturizer, and night cream, fully personalized for your skin."*

### Prose
> *"The quiz ends with an animation that feels like a real time calculation and reveals your customized products and an overview of the hair concerns these formulas address."*

Muestra **scores por factor con su razonamiento** (ej. "Sensitivity: 85/100"), no una lista de productos. Guarda el resultado permanentemente para volver.

### Los 4 mecanismos comunes
1. **Animación de cálculo falso** (2-4 seg). El esfuerzo percibido justifica el precio. Proven: `Calculating Results`.
2. **Bundle, no producto suelto.** La rutina de 3 pasos es un SKU. Por eso el quiz sube el AOV +20% en skincare.
3. **Resultado en UNA página con 1-3 productos.** Dato duro: 1 página con 1-3 recos convierte **10.6%**; repartido en 11+ páginas cae a **7.1%**.
4. **Descuento anclado al esfuerzo.** El 40% off aparece recién en el resultado. "Te lo ganaste."

---

## 5. Conversión — data pública

**Benchmark maestro** (RevenueHunt, 20,000+ tiendas, agregado y anonimizado):

| Métrica | Valor |
|---|---|
| **Completan el quiz** (de los que empiezan) | **69%** — 31% cae antes del resultado |
| **Compran** (de los que completan) | **5.5%** — ~1 de 18, **2.75x** una tienda típica de 2% |
| **Beauty & skincare específicamente** | **6.1%** de conversión (305% de la tienda promedio) |
| **Uplift de AOV en skincare** | **+20%**, presente en 80% de las tiendas |
| **Órdenes el mismo día** | 67% · a 30 días: 91% |
| **Órdenes a 30+ días** | **1 de 5** — el quiz sigue convirtiendo meses después |

**Benchmarks de funnel (ConvertFlow, skincare/diagnóstico):**
- Quiz start rate desde landing: **18-28%**
- Completación de preguntas: **55-70%**
- Recomendación → carrito: **14-22%**

**Conversión por cantidad de preguntas** — desmiente el mito de "más corto es mejor":

| Preguntas | Conversión |
|---|---|
| 1-5 | 9.8% |
| 6-8 | 10.4% |
| **9-12** | **11.0%** ← óptimo |
| 13+ | 9.9% |

> *"Quizzes with 6-12 questions outperform shorter ones because they build enough trust for shoppers to believe the recommendation is personalized."*

**Function of Beauty (dato de marca real):** **80% de completación** con Visual Quiz Builder, **+16.4% vs su solución in-house**. El quiz sostiene **80% del negocio**, +1 millón de interacciones al año.

⚠️ **Advertencia metodológica honesta:** el 5.5% es *orders per completed quiz*, no *per visitor*. Quien completa un quiz ya está auto-seleccionado. No es comparable manzana-con-manzana contra el CR global de la tienda. No se lo vendas a un cliente como "te subo la conversión 275%".

---

## 6. Errores comunes y qué hace abandonar

| # | Error | Dato / evidencia |
|---|---|---|
| 1 | **Email gate mal ubicado o mal escrito** | Es el acantilado más pronunciado: **30-50% de los que terminan abandonan en ese paso** |
| 2 | **Quiz demasiado corto** | <5 preguntas se siente superficial; el usuario no cree que la reco sea personalizada. 1-5 preguntas: 9.8% vs 9-12: 11.0% |
| 3 | **Quiz demasiado largo sin capítulos** | Cada pregunta después de la 8 sin estructura baja completación 5-10% |
| 4 | **Resultado repartido en muchas páginas** | 1 página con 1-3 productos: **10.6%** · 11+ páginas: **7.1%** |
| 5 | **Preguntar sin explicar por qué** | Es el único bloque que Proven Y Prose implementaron por separado. Su ausencia es la señal de "esto es un formulario de captación" |
| 6 | **Preguntas que el usuario no puede responder** | "¿Tu piel es deshidratada o seca?" → parálisis. Solución Prose: instrucción física + fotos + "Not sure" siempre disponible |
| 7 | **Foto obligatoria temprano** | Fricción máxima. Curology la pide **después** de todo el cuestionario, ya con cuenta creada y compromiso médico |
| 8 | **Compounding silencioso** | 6 pasos al 70% cada uno = **sólo 12% de los que empiezan llegan al resultado**. Hay que medir paso por paso, no sólo completación total |
| 9 | **Médicas/sensibles al principio** | Curology las manda a `/health-history`, paso 4 de 8 |
| 10 | **No dejar guardar y volver** | Sin "Save + exit" (Prose), un quiz de 30 preguntas es todo-o-nada |

---

## 7. Blueprint accionable

**Estructura recomendada — 10-12 preguntas, 4 capítulos:**

```
CAP 1 · TU PIEL          Q1 multi-select: "¿Qué querés cambiar de tu piel?"  ← objetivo, no demo
                         Q2-3 ramificadas según Q1
CAP 2 · TU RUTINA        Q4-6 qué usa hoy, alergias, prescripciones
CAP 3 · TU VIDA          Q7-9 sueño, estrés, dieta       ← acá va el dato educativo
CAP 4 · TU ENTORNO       Q10 código postal → "Esto es lo que afecta tu piel en Lima"
                                                          ← micro-recompensa geo
EMAIL                    "¿A dónde te enviamos tus resultados?"
CALCULANDO               animación 3 seg
RESULTADO                1 página · 1-3 productos · bundle · descuento anclado
```

**No negociables (los 8):**
1. Q1 = objetivo del usuario, multi-select, cero demografía
2. Bloque **"Por qué preguntamos esto"** en cada pantalla — con fuente/estudio si podés
3. Progreso por capítulos nombrados, nunca porcentaje
4. Respuestas con imagen + instrucción física cuando el usuario no sabe auto-diagnosticarse
5. Email **al final**, redactado como servicio: *"¿A dónde te enviamos tus resultados?"*
6. Animación de cálculo de 2-4 segundos antes del reveal
7. Resultado = **un bundle en una sola página**, con el nombre del usuario
8. Save + resume, y "No estoy seguro/a" en toda pregunta ambigua

**Instrumentación:** Proven mide con **Mixpanel + RudderStack + Segment**, email con **Klaviyo**, y corre tests con flags (`QUIZ_CHAT_FUNNEL_EXPERIMENT` — están probando formato conversacional; `CART_ROUTINE_NO_EDIT_STEP_EXPERIMENT`; `CONGRATS_CART_PRICING_EXPERIMENT`). Medí drop-off **por pregunta**, no completación global.

---

## URLs

**Quizzes en vivo**
- Proven start — https://www.provenskincare.com/quiz/start/
- Proven, ejemplo de pregunta con "WHY WE ASK" — https://www.provenskincare.com/quiz/Q1_wrinkles/
- Proven, primera pregunta (nombre) — https://www.provenskincare.com/quiz/name/
- Curology quiz — https://quiz.curology.com/sign-up/get-started/your-skin
- Curology, secuencia de pasos — `/face` `/skin-goals` `/your-skin` `/health-history` `/more-info` `/register` `/proven-results` `/product-recommendations`
- Prose consultation — https://prose.com/consultation/haircare
- Prose, pregunta con imágenes + "Why we ask" — https://prose.com/consultation/haircare/my-hair/thickness
- Function of Beauty (sólo hair/body) — https://functionofbeauty.com/pages/quiz-home
- Skin Inc (diagnóstico caído) — https://iloveskininc.com/pages/skin-id
- Atolla (archivo) — https://web.archive.org/web/20200811162840/https://atolla.co/

**Racional de diseño**
- Curology: la ciencia detrás del quiz — https://curology.com/blog/the-science-behind-our-skincare-quiz-why-it-works/
- Proven: Skin Genome Quiz™ — https://support.provenskincare.com/en-US/articles/skin-genome-quiz-96717
- Savvy: Curology onboarding (46 pantallas) — https://trysavvy.com/example/curology
- GoodUX/Appcues: Curology sign-up flow — https://goodux.appcues.com/blog/curologys-customized-skincare-sign-up-flow
- DTC Patterns: teardown del quiz de Prose — https://www.dtcpatterns.com/dtc-patterns-articles/proses-product-picker-quiz-is-the-like-having-a-hair-guru-on-your-phone
- Visual Quiz Builder × Function of Beauty (80% completación, +16.4%) — https://www.visualquizbuilder.com/post/visual-quiz-builder-1r-partner-with-function-of-beauty-to-tackle-hair-care-personalization

**Benchmarks**
- RevenueHunt, state of product recommendation quizzes 2026 (20k+ tiendas) — https://revenuehunt.com/state-of-product-recommendation-quizzes/
- ConvertFlow, quiz funnel drop-off 2026 — https://www.convertflow.com/blog/how-to-fix-ecommerce-quiz-funnel-drop-off-in-2026
- RevenueHunt, errores de quiz por data — https://revenuehunt.com/quiz-creation-mistakes-that-hurt-your-ecommerce-sales/
- Heyflow, resultados personalizados que convierten — https://heyflow.com/blog/personalized-results-quiz-funnel/

**Contexto Atolla / FoB**
- WWD: FoB adquiere Atolla — https://wwd.com/beauty-industry-news/beauty-features/function-of-beauty-atolla-first-acquisition-1234892401/
- PRNewswire — https://www.prnewswire.com/news-releases/function-of-beauty-acquires-atolla-301347767.html

**Archivos locales**
Scrapes crudos en `/Users/macbookpro/Desktop/Nova/ClaudeCode/Empresa IA/.firecrawl/dtc-quiz/` (`revenuehunt.md`, `proven-wrinkles.md`, `prose-thickness.md`, `curology-live.md`, etc.). El bank completo de 61 preguntas de Proven lo extraje del payload Next.js de `provenskincare.com/quiz/name/` — reproducible con curl + regex sobre `self.__next_f`.