# Marco legal: procesamiento de FOTOS DE ROSTRO de usuarios en Perú

**Fecha de investigación:** 19-ago-2026 · **Jurisdicción:** Perú · **No es asesoría legal** (ver §9)

---

## 0. Veredicto en una línea

> Una foto de rostro procesada por un algoritmo para analizar la piel es, con altísima probabilidad, **dato sensible** bajo la Ley 29733. Eso dispara **consentimiento expreso Y POR ESCRITO**, inscripción del banco de datos ante la ANPD, medidas de seguridad reforzadas, notificación de brechas en 48h, y expone a multas de **hasta 100 UIT (S/ 550,000 en 2026)**. Procesarla sólo en memoria **NO saca el caso del ámbito de la ley** — el reglamento vigente lo dice literal — pero **sí reduce mucho la exposición real**. Y el análisis **nunca** puede llamarse "diagnóstico".

⚠️ **Corrección crítica al material interno de Novvx:** el archivo `references/checklist-29733.md` de la skill `novvx-ley-29733` cita el **D.S. 003-2013-JUS** como reglamento vigente. **Está derogado.** Lo derogó la Disposición Complementaria Derogatoria Única del **D.S. 016-2024-JUS** (publicado 30-nov-2024, vigente desde el **30-mar-2025**). El reglamento nuevo cambia sustantivamente la definición de dato sensible, la tipificación de infracciones y el régimen de incidentes. Hay que actualizar ese checklist.

---

## 1. ¿Una foto de rostro es dato biométrico? ¿Es dato sensible?

### 1.1 Las tres definiciones que hay que cruzar

**(a) Toda foto es dato personal.** Reglamento D.S. 016-2024-JUS, **Art. III.4**:

> *"**Datos personales:** Es aquella información numérica, alfabética, gráfica, **fotográfica**, acústica, sobre hábitos personales, de localización, identificadores en línea o de cualquier otro tipo concerniente a aspectos físicos, económicos, culturales o sociales de las personas naturales que las identifica o las hace identificables."*

**(b) La LEY define dato sensible con un matiz restrictivo.** Ley 29733, **Art. 2.5**:

> *"**Datos sensibles.** Datos personales constituidos por los **datos biométricos que por sí mismos pueden identificar al titular**; datos referidos al **origen racial y étnico**; ingresos económicos; opiniones o convicciones políticas, religiosas, filosóficas o morales; afiliación sindical; e **información relacionada a la salud** o a la vida sexual."*

**(c) El REGLAMENTO NUEVO amplía y elimina el matiz.** D.S. 016-2024-JUS, **Art. III.6**:

> *"**Datos sensibles:** Es aquella información relativa a **datos genéticos o biométricos de la persona natural**, datos neuronales, **datos morales o emocionales**, hechos o circunstancias de su vida afectiva o familiar, los hábitos personales que corresponden a la esfera más íntima, la información relativa a la afiliación sindical, **salud física o mental** u otras análogas que afecten su intimidad."*

Nótese: el reglamento **borra** la condición *"que por sí mismos pueden identificar al titular"* y **agrega** datos emocionales. Es una definición más ancha que la de la ley.

### 1.2 Qué dice la propia Autoridad (ANPD)

La ANPD ya fijó posición y adoptó la definición del GDPR art. 4(14). **Opinión Consultiva N° 032-2021-JUS/DGTAIPD** (17-ago-2021), numeral 9 y Conclusión 1:

> *"Los datos biométricos son datos personales obtenidos a partir de un **tratamiento técnico específico**, relativos a las características físicas, fisiológicas o conductuales de una persona física que **permitan o confirmen la identificación única** de dicha persona, **como imágenes faciales** o datos dactiloscópicos. Los datos biométricos constituyen datos sensibles, de conformidad la LPDP y su reglamento."*

### 1.3 Aplicación al caso concreto (análisis facial de piel)

Hay **tres rutas independientes** por las que esta feature cae en "dato sensible". Basta una:

| Ruta | Fundamento | ¿Aplica a un analizador de piel? |
|---|---|---|
| **1. Biométrico** | Ley 2.5 + Regl. III.6 + OC 032-2021 | **Sí, con matiz.** Si el pipeline detecta *face landmarks* / genera un template facial — que es lo que hace cualquier analizador serio — hay "tratamiento técnico específico" sobre rasgos faciales. Argumentar que "no identificamos a nadie" es una defensa real bajo la definición de la **ley** (art. 2.5 pide capacidad identificatoria), pero **muy débil** frente a la definición del **reglamento** (art. III.6), que no la exige. |
| **2. Salud** | Ley 2.5 ("información relacionada a la salud") + Regl. **III.5**: *"información concerniente a la salud pasada, presente o **pronosticada**, física o mental"* | **Sí, sin matiz.** El *output* — "acné", "rosácea", "hiperpigmentación", "sensibilidad" — es información de salud física. Esto es sensible **aunque la foto no fuera biométrica**. |
| **3. Origen racial/étnico** | Ley 2.5 | **Sí, si el modelo infiere etnia o fototipo.** L'Oréal Skin Genius **sí infiere etnia** (ver §6). En Perú eso convierte el output en sensible por una vía adicional. → **Recomendación: no inferir etnia. No aporta valor comercial y agrega una categoría sensible gratis.** |

**Conclusión operativa:** la ruta 2 es prácticamente indefendible. Aunque se gane el debate biométrico, el resultado del análisis es dato de salud. **Se implementa asumiendo dato sensible.** Cualquier otra postura es una apuesta.

### 1.4 Obligaciones que se disparan

| # | Obligación | Norma |
|---|---|---|
| 1 | Consentimiento **libre, previo, expreso, inequívoco e informado** | Ley 13.5 · Regl. arts. 1–6 |
| 2 | …y **por escrito** (por ser sensible) | **Ley 13.6** · **Regl. art. 8** |
| 3 | Deber de información con **10 contenidos mínimos** | Ley 18 · **Regl. art. 6.1** |
| 4 | **Carga de la prueba del consentimiento es del responsable, siempre** | **Regl. art. 9** |
| 5 | Revocación con mecanismos *"fácilmente accesibles e incondicionales, sencillos, rápidos y gratuitos"* | **Regl. art. 10.4** |
| 6 | Minimización: sólo el dato necesario (violarlo con datos sensibles = infracción **grave**) | Ley 8 · Regl. **133.6** |
| 7 | **Inscripción del banco de datos** ante la ANPD | Ley 29 y 34 · **Regl. art. 42** |
| 8 | Medidas de seguridad digitales documentadas (control de accesos, **logs conservados ≥2 años**) | **Regl. art. 46** |
| 9 | **Documento de Seguridad** con fecha cierta + **inventario que especifique si se tratan datos sensibles** | **Regl. art. 47** |
| 10 | **Notificación de incidente a la ANPD en ≤48 h** (obligatoria cuando hay datos sensibles) + al titular | **Regl. art. 34.1 / 34.3** |
| 11 | **Oficial de Datos Personales (ODP)** si el giro del negocio comprende tratamiento de datos sensibles | **Regl. art. 37.1.3** (ver §3.3 para plazos) |
| 12 | Flujo transfronterizo: garantías + **comunicación al RNPDP** | Regl. arts. 18–21 |
| 13 | Encargados / cloud: cláusulas mínimas, prohibición de sub-transferir, evidenciar destrucción | Regl. arts. 28–33 |
| 14 | Menores: 14–17 consienten ellos; **<14 requiere patria potestad** | **Regl. art. 25.2 / 25.3** |
| 15 | **Evaluación de Impacto (EIPD)** | **Regl. art. 40.1 — es FACULTATIVA**, no obligatoria (ver §9) |

---

## 2. Qué exige exactamente la ley para tratarla

### 2.1 ¿Consentimiento expreso? Sí. ¿Por escrito? **Sí.**

**Ley 29733, Art. 13.6** (literal):

> *"En el caso de datos sensibles, el consentimiento para efectos de su tratamiento, además, **debe efectuarse por escrito**. Aun cuando no mediara el consentimiento del titular, el tratamiento de datos sensibles puede efectuarse cuando la ley lo autorice, siempre que ello atienda a motivos importantes de interés público."*

**Reglamento D.S. 016-2024-JUS, Art. 8** (literal):

> *"Tratándose de datos sensibles, además del cumplimiento de los requisitos para el consentimiento válido, este debe ser otorgado **por escrito, a través de su firma manuscrita, digital, electrónica o cualquier otra modalidad que garantice la voluntad del titular** de los datos personales."*

### 2.2 Cómo se materializa "por escrito" en una web

El **Art. 5.1** del reglamento define las formas del consentimiento expreso:

> *"5.1.2. **Escrito**, cuando se exterioriza mediante un documento o **medio electrónico** con su firma autógrafa, electrónica o digital, huella dactilar o cualquier otro mecanismo electrónico autorizado por el ordenamiento jurídico que pueda reflejar la manifestación de voluntad expresa.*
> *5.1.3. **Por canales digitales**, cuando se firma un documento a través de medios electrónicos o digitales, (…) así como la manifestación consistente en **"hacer clic", "cliquear" o "pinchar", "dar un toque", "touch" o "pad"** u otros similares."*

**Y el 5.3 advierte:** *"La sola expresión de voluntad en cualquiera de las formas reguladas en el presente artículo **no exime del cumplimiento de los demás requisitos** del consentimiento referidos a las características de libre, previo e informado."*

**Lectura práctica (defendible, no blindada):** el art. 8 exige la forma *escrita* pero admite *"cualquier otra modalidad que garantice la voluntad del titular"*. La ANPD, en la Conclusión 2 de la OC 032-2021, lo formuló como *"firma manuscrita, firma digital o **cualquier otro mecanismo de autenticación** que garantice la voluntad inequívoca del titular"*. La palabra clave es **autenticación**.

→ Implementación mínima recomendada:

1. **Pantalla dedicada** exclusivamente a este consentimiento — no un checkbox al pie del checkout, no enterrado en Términos y Condiciones.
2. **Checkbox NO pre-marcado**, separado del de "acepto los términos" y separado del de marketing.
3. **Usuario autenticado** (cuenta logueada, u OTP por SMS/email antes de la captura) → esto es lo que aproxima el "mecanismo de autenticación" que pide la ANPD.
4. **Registro probatorio inmutable** de cada consentimiento: `user_id`, timestamp (hora Lima), IP, user-agent, **hash + versión exacta del texto mostrado**, y canal. Sin esto se pierde por **Art. 9** (carga de la prueba).
5. **Botón de revocación** en el perfil, un clic, gratuito, sin fricción (Art. 10.4).

### 2.3 ¿Informado de qué exactamente? Los 10 puntos del Art. 6.1

Reglamento **Art. 6.1** — *"se le debe comunicar de forma clara, con lenguaje sencillo, cuando menos lo siguiente"*:

| # | Exigencia literal | Cómo se redacta para esta feature |
|---|---|---|
| 1 | *Identidad y domicilio del titular del banco de datos / responsable, al que puede dirigirse para revocar o ejercer derechos* | Razón social completa, RUC, domicilio fiscal, email de privacidad |
| 2 | *La finalidad o finalidades del tratamiento* | "Analizar tu foto para estimar características de tu piel y recomendarte productos." **Una finalidad por línea.** Si además se entrena el modelo → es **otra finalidad** y necesita su propia casilla |
| 3 | *Identidad de los que son o pueden ser sus destinatarios* | Nombrar al proveedor de IA (p. ej. Anthropic / OpenAI / AWS Rekognition) y al hosting |
| 4 | *Existencia e identificación del banco de datos donde se almacenarán, **cuando corresponda*** | Nombre del banco tal como se inscribe en el RNPDP. Si no se almacena → decirlo explícito |
| 5 | *Carácter obligatorio o facultativo de sus respuestas* | "Facultativo. Puedes comprar sin usar esta función." |
| 6 | *Consecuencias de proporcionar sus datos y de su negativa* | "Si no la usas, verás recomendaciones generales en lugar de personalizadas." |
| 7 | *Transferencia nacional e internacional que se efectúe* | **Obligatorio nombrar el país**: "tu imagen se procesa en servidores en EE.UU." |
| 8 | ***Existencia de decisiones automatizadas, incluida la elaboración de perfiles**, y las consecuencias para el titular* | **El punto más olvidado.** "El análisis es 100% automatizado, sin revisión humana. Su resultado determina qué productos se te recomiendan." |
| 9 | *El plazo de conservación de los datos personales* | Número concreto: "la foto se elimina en X segundos; los resultados se conservan Y meses" |
| 10 | *Mecanismos para el ejercicio de los derechos del Título III de la Ley* | URL/email + plazo de respuesta |

⚠️ **Publicar una política de privacidad NO sustituye el consentimiento.** Reglamento **Art. 7**: *"La publicación de políticas de privacidad (…) se entiende como una forma de cumplimiento del deber de información y del principio de transparencia **que no exonera del requisito de obtener el consentimiento**."*

### 2.4 Trampa: el consentimiento tiene que ser LIBRE

Reglamento **Art. 3.2**: *"El condicionamiento de la prestación de un servicio o la advertencia o la amenaza de denegar el acceso a beneficios o servicios que normalmente son de acceso no restringido, sí afecta la libertad de quien otorga consentimiento (…) **si los datos solicitados no son indispensables** para la prestación de los beneficios o servicios."*

→ Condicionar **la feature de análisis facial** a dar la foto es legítimo (la foto es indispensable *para eso*). Condicionar **la compra, el registro o un descuento** a dar la foto **no lo es**.

### 2.5 Y si además se usa para marketing

Reglamento **Art. 26**: publicidad y prospección comercial requieren consentimiento **directo** (26.1); si en el primer contacto no se obtiene, **no es lícito volver a contactar** (26.2); la baja debe ser gratuita, atenderse en **10 días** y *"no debe tener mayor complejidad que la empleada para otorgar el consentimiento"* (26.5).

---

## 3. ¿Hay obligación de inscribir el banco de datos ante la ANPD?

### 3.1 Sí. Es obligatoria, gratuita y de aprobación automática.

**Ley 29733, Art. 34** crea el Registro Nacional de Protección de Datos Personales (RNPDP), en el que se inscriben *"los bancos de datos personales de administración pública **o privada**"*.

**Reglamento, Art. 42.1** (literal):

> *"Las personas naturales o jurídicas del **sector privado** o entidades públicas que **creen, modifiquen o cancelen** bancos de datos personales **están obligadas a tramitar la inscripción** de dichos actos ante el Registro Nacional de Protección de Datos Personales."*

**Art. 43.1.2:** son inscribibles *"los bancos de datos personales de administración privada, con la excepción prevista en el numeral 1 del artículo 3 de la Ley"* — la única excepción es el uso **exclusivamente doméstico/personal por personas naturales**. Una empresa no califica.

**Art. 43.3:** *"La inscripción (…) **es gratuita**, incluyendo la modificación y cancelación."*
**Art. 45.2:** *"El procedimiento de inscripción es de **aprobación automática**"* (art. 31 Ley 27444) → sujeto a fiscalización posterior.
**Art. 44.1:** debe *"mantenerse actualizada **en todo momento**"*.

**Trámite:** virtual, vía el Sistema Integrado de Protección de Datos Personales (SIPDP) → https://www.gob.pe/8060 · modificación: https://www.gob.pe/9251

**No hay umbral de volumen.** Ningún artículo del reglamento vigente condiciona la inscripción a un número mínimo de titulares. (El checklist interno de Novvx sugiere ">500 registros" — **eso no está en la norma**; debe corregirse.)

### 3.2 Además: comunicar el flujo transfronterizo

Reglamento **Art. 21.2**: *"En cualquier caso, el flujo transfronterizo de datos personales **debe ponerse en conocimiento** de la Dirección General (…). Dicha comunicación **es inscrita en el Registro Nacional** (…) a través del formato aprobado."*

→ Si la imagen o los resultados salen a un proveedor fuera de Perú (AWS, Anthropic, OpenAI, Vercel, Supabase-US), esto es obligatorio. Omitirlo es **infracción leve** (art. 132.8).

**Garantías** cuando el país no tiene nivel adecuado (Art. 20.1): *"cláusulas contractuales modelo u otros instrumentos jurídicos en los que se establezcan cuando menos las mismas obligaciones a las que se encuentra sujeto"*. En la práctica: **DPA firmado** con cada proveedor.

### 3.3 Oficial de Datos Personales (ODP)

**Art. 37.1** obliga a designarlo, entre otros supuestos, cuando (numeral 3) *"realicen **actividades principales o de giro de negocio que comprendan el tratamiento de datos sensibles**"* o (numeral 2) traten grandes volúmenes / datos sensibles.

**Pero la Primera Disposición Complementaria Final establece un cronograma progresivo** contado desde la publicación (30-nov-2024):

| Tamaño (ventas anuales) | Exigible desde |
|---|---|
| > 2,300 UIT | 30-nov-**2025** (ya vencido) |
| 1,700 – 2,300 UIT (mediana) | 30-nov-**2026** |
| 150 – 1,700 UIT (pequeña) | 30-nov-**2027** |
| ≤ 150 UIT (micro) | 30-nov-**2028** |

Obligaciones del ODP: publicar sus datos de contacto en lugar visible (37.4) y **comunicarlos a la ANPD dentro de 15 días** de la designación (37.5). Puede ser alguien con otras funciones, incluso externo (38.2). No designarlo cuando corresponde es **infracción leve** (132.9).

---

## 4. Sanciones concretas

### 4.1 Los rangos (Ley 29733, Art. 39) — y su valor en soles 2026

**UIT 2026 = S/ 5,500** (D.S. 301-2025-EF, El Peruano 17-dic-2025; sube desde S/ 5,350 de 2025).

| Gravedad | Rango legal | En soles (2026) | Norma |
|---|---|---|---|
| **Leve** | 0.5 – 5 UIT | **S/ 2,750 – S/ 27,500** | Ley 39.1 |
| **Grave** | > 5 – 50 UIT | **S/ 27,500 – S/ 275,000** | Ley 39.2 |
| **Muy grave** | > 50 – 100 UIT | **S/ 275,000 – S/ 550,000** | Ley 39.3 |

**Tope:** *"En ningún caso, la multa impuesta puede exceder del **diez por ciento de los ingresos brutos anuales** que hubiera percibido el presunto infractor durante el ejercicio anterior."* (Ley, art. 39, párrafo final)

**Multas coercitivas adicionales:** hasta **10 UIT** (S/ 55,000) por incumplir obligaciones accesorias a la sanción (Ley, art. 40).
**Reincidencia** dentro de 1 año = agravante (Regl. art. 135).
Además: **medidas correctivas** (ordenar la eliminación de los datos), indemnización civil y responsabilidad penal (Ley, art. 38 y 39 in fine).

### 4.2 Qué infracción concreta cae sobre esta feature

Tipificación en el **D.S. 016-2024-JUS, arts. 132–134**:

| Conducta en esta feature | Tipo | Artículo | Multa 2026 |
|---|---|---|---|
| No inscribir el banco de datos en el RNPDP | **Leve** | 132.4 | S/ 2,750 – 27,500 |
| No comunicar el flujo transfronterizo | **Leve** | 132.8 | S/ 2,750 – 27,500 |
| Informar de forma incompleta ≤2 de los ítems del art. 18 | **Leve** | 132.5 | S/ 2,750 – 27,500 |
| No designar ODP cuando corresponde | **Leve** | 132.9 | S/ 2,750 – 27,500 |
| Incumplir medidas de seguridad (sin daño) | **Leve** | 132.6 | S/ 2,750 – 27,500 |
| **Omitir o informar mal ≥3 ítems del art. 18** | **Grave** | 133.2 | S/ 27,500 – 275,000 |
| **Tratar la foto sin consentimiento válido** (o con consentimiento no escrito) | **Grave** | **133.3** | **S/ 27,500 – 275,000** |
| **Tratar datos sensibles incumpliendo medidas de seguridad** | **Grave** | **133.5** | S/ 27,500 – 275,000 |
| **Pedir/guardar más foto o más resultado del necesario** (minimización sobre sensibles) | **Grave** | **133.6** | S/ 27,500 – 275,000 |
| Usar la foto/resultado para una finalidad distinta a la consentida (p. ej. entrenar el modelo sin decirlo) | **Grave** | 133.7 | S/ 27,500 – 275,000 |
| No notificar el incidente de seguridad a la ANPD en 48 h | **Grave** | 133.12 | S/ 27,500 – 275,000 |
| No inscribir el banco **tras requerimiento** de la ANPD | **Grave** | 133.13 | S/ 27,500 – 275,000 |
| **Brecha de datos sensibles con perjuicio al titular o exposición no autorizada** | **MUY GRAVE** | **134.4** | **S/ 275,000 – 550,000** |
| Obtener las fotos por medios fraudulentos, desleales o ilícitos | **MUY GRAVE** | 134.1 | S/ 275,000 – 550,000 |

**Lectura clave:** tratar sin consentimiento es **grave**, no muy grave (varios blogs peruanos dicen lo contrario). Lo **muy grave** es la **filtración de datos sensibles** — es decir, exactamente el escenario "se nos escapó el bucket de selfies".

### 4.3 El precedente peruano que hay que conocer: caso BCP

En enero de 2025 la ANPD (MINJUSDH) sancionó al **Banco de Crédito del Perú** por tratamiento de **datos biométricos faciales**, en dos multas confirmadas en segunda instancia:

- **27 UIT (S/ 124,200)** — recopilación **excesiva y desproporcionada** de datos biométricos faciales (los pedía a cualquiera que usara el Libro de Reclamaciones virtual, fuera cliente o no).
- **36 UIT (S/ 165,600)** — **almacenarlos en base propia sin consentimiento válido**.
- **Total ≈ S/ 290,000** (calculado con la UIT de 2022, S/ 4,600).
- **Medida correctiva:** eliminar todos los patrones biométricos recolectados y cesar de inmediato su almacenamiento y uso.

**Lo que este caso enseña, aplicado a un analizador de piel:**
1. La ANPD **ya sanciona biometría facial**, no es riesgo teórico.
2. Sancionó **por separado** la recolección y el almacenamiento → son dos infracciones distintas. Confirma la tesis de §5: **no almacenar elimina una de las dos multas.**
3. El eje del reproche fue **desproporción** (pedir el rostro para algo que no lo requería). Si el rostro **sí** es indispensable para la finalidad declarada, la posición es mucho más sólida.
4. La medida correctiva —borrar toda la base— es peor que la multa para un negocio que dependa de esos datos.

### 4.4 El precedente internacional que hay que conocer: Neutrogena Skin360

Esta feature exacta ya generó litigio. **Kenvue (ex Johnson & Johnson)** acordó pagar **USD 4.7 millones** para cerrar una class action bajo la **BIPA** de Illinois por los escaneos faciales de **Neutrogena Skin360**: se alegó recolección de información biométrica sin consentimiento suficiente y **sin publicar un calendario de retención**. ~11,000 usuarios de Illinois (dic-2019 a may-2023), ~USD 427 c/u. El acuerdo obliga además a **destruir todas las imágenes** del período, **crear un formulario de consentimiento escrito y un aviso al usuario**, y **adoptar una política escrita de retención y destrucción** de datos biométricos.

→ Los tres remedios impuestos (consentimiento escrito + aviso dedicado + política de retención publicada) son **exactamente** lo que la Ley 29733 y el D.S. 016-2024-JUS ya exigen en Perú. Diseñar la feature con eso desde el día 1 sale gratis; retroajustarla no.

---

## 5. ¿Cambia algo si la foto NO se almacena y sólo se procesa en memoria?

### 5.1 Lo que NO cambia (la pregunta más importante)

**El "no almaceno" NO saca el caso del ámbito de la norma.** Tres artículos lo cierran:

**Reglamento D.S. 016-2024-JUS, Art. IV.4.1** (literal, y es determinante):

> *"El presente Reglamento es de aplicación al tratamiento de los datos personales, **aun cuando no se encuentren en un banco de datos personales**."*

**Ley 29733, Art. 2.19** — la definición de *tratamiento* no requiere almacenar:

> *"**Tratamiento de datos personales.** Cualquier operación o procedimiento técnico, automatizado o no, que permite la recopilación, registro, organización, **almacenamiento**, conservación, **elaboración**, modificación, **extracción**, **consulta**, **utilización**, bloqueo, supresión, comunicación por transferencia o por difusión o **cualquier otra forma de procesamiento** que facilite el acceso, correlación o interconexión de los datos personales."*

**Ley 29733, Art. 2.7** — cierra la puerta también para el proveedor: *"Incluye a quien realice el tratamiento **sin la existencia de un banco de datos personales**."*

→ **Recibir, decodificar, inferir y devolver un resultado es "tratamiento".** Se necesita consentimiento expreso y escrito igual. Se necesita el deber de información igual. Los principios de finalidad y minimización aplican igual.

*(Nota: la Ley 29733 en su art. 3 tiene un ámbito redactado sobre "bancos de datos". El reglamento de 2024 lo desbordó deliberadamente con el art. IV.4.1. Cualquier estrategia que se apoye en esa tensión ley-vs-reglamento es un argumento de litigio, no una base de diseño.)*

### 5.2 Lo que SÍ cambia — y cambia mucho

| Dimensión | Con almacenamiento | Sin almacenamiento (efímero) |
|---|---|---|
| **Banco de datos de imágenes** | Existe → **inscripción obligatoria** (Art. 42) | No existe banco *de imágenes*. ⚠️ Pero si guardas el resultado, email o cuenta, **eso sí es banco de datos** y se inscribe igual |
| **Riesgo de sanción MUY GRAVE** (134.4: brecha de sensibles con exposición) | **Alto** — hay algo que filtrar | **Casi nulo** — no hay corpus que exfiltrar |
| **Segunda multa del caso BCP** ("almacenar sin consentimiento") | Aplica | **No aplica** |
| **Notificación de brecha 48h (Art. 34)** | Escenario realista | Escenario improbable |
| **Derecho de supresión (ARCO)** | Proceso a construir y sostener | Trivial: "ya está eliminada" |
| **Art. 46: logs de acceso a datos, 2 años** | Alcance grande | Alcance mínimo |
| **Graduación de la multa** (art. 230.3 Ley 27444: daño, beneficio, intencionalidad) | Agravado | **Atenuado** — sin daño material |
| **Transferencia internacional** | Aplica | **Sigue aplicando** si la inferencia corre en una API fuera de Perú |

### 5.3 La única mitigación que cambia el juego de verdad

**Inferencia 100% en el dispositivo (on-device / in-browser, WASM o TF.js).** Si la imagen nunca sale del navegador del usuario:

- No hay **transferencia** (Ley art. 2.18) → no hay flujo transfronterizo → cae el Art. 21.2 y el DPA.
- No hay **destinatarios** que declarar en el Art. 6.1.3.
- No hay **encargado de tratamiento** → caen los arts. 28–33.
- La superficie de brecha se reduce a cero.
- Y comercialmente da el mejor mensaje posible: *"tu foto nunca sale de tu teléfono"*.

**Pero ojo:** sigue habiendo tratamiento (el responsable diseña y determina la finalidad), y el **resultado** que se sube al servidor (p. ej. "piel grasa, acné leve") **sigue siendo dato de salud → sensible**. El consentimiento escrito no desaparece; se simplifica.

### 5.4 Escalera de decisión recomendada

```
1. On-device, resultado NO se sube          → riesgo mínimo. Consentimiento escrito igual.
2. On-device, resultado SÍ se sube          → +banco de datos (resultados) → inscribir. Sin transferencia de imagen.
3. Servidor propio en Perú, imagen efímera  → +tratamiento en servidor, sin flujo transfronterizo.
4. API externa (EE.UU.), imagen efímera     → +flujo transfronterizo: DPA + comunicación al RNPDP + informar el país.
5. API externa + almacenar la imagen        → escenario BCP completo. Máxima exposición (134.4).
```

**Recomendación:** apuntar a 1–3. Si hay que ir a 4, exigir del proveedor la desactivación de retención y de entrenamiento (zero-data-retention), y dejarlo por escrito en el contrato — **Reglamento Art. 29.5** obliga a *"garantizar y evidenciar la destrucción o la imposibilidad de acceder a los datos personales después de concluida la prestación."*

---

## 6. Cómo redactan sus disclaimers las marcas que hacen esto

### 6.1 L'Oréal Paris — Skin Genius Information Notice

**URL:** https://www.lorealparisusa.com/skin-genius-information-notice

Es el mejor modelo público disponible. Tres decisiones estructurales que hay que copiar:

**(a) Es un aviso SEPARADO, dedicado a la feature.** No está dentro de la Privacy Policy general — es un documento propio que *"coexiste con, complementa y no reemplaza"* la política general. Esto encaja perfecto con el Reglamento Art. 6.1 (información específica de *este* tratamiento) y Art. 7 (la política general no exonera).

**(b) Explica el mecanismo, no sólo la finalidad.** Sección *"How It Works"*, literal:

> *"L'Oréal Paris will use an algorithm to analyze the selfie to detect face landmarks to localize the region around key facial features (i.e., outline of eyes, lower part of nose, outline of lips, etc.). This information is used for visualization (…) and to provide You with the requested service. **It is not used to identify or verify the identity of any individual.**"*

Esa última frase es una **defensa jurídica deliberada**: ataca directamente el requisito de "identificación única" de la definición de dato biométrico. En Perú sirve contra la definición de la **Ley** (art. 2.5) pero **no** contra la del **Reglamento** (art. III.6). **Se copia igual** — es verdadera, es útil, y no cuesta nada — pero **no se puede construir el cumplimiento encima de ella.**

**(c) Retención en dos capas, con números.** Literal:

> *"**L'Oréal Paris only briefly stores your selfie.** Once the information is returned to You, Your selfie is deleted from the central cloud-based hub (generally **within a matter of seconds** of completion of the analysis)."*

Y a continuación lista **exactamente qué sí se queda**: *"The coordinates of facial landmarks, information you provide (gender, age, skin type…), measurements made by the algorithm(s), calculations made from such measurements (…), the results (…) and all recommendations (…) are stored in the central cloud hub"* — con tope: *"no longer than **3 years** after our last interaction with You."*

Esto es literalmente el **Art. 6.1.9** peruano ("el plazo de conservación") bien ejecutado. Es también el remedio que le impusieron a Kenvue.

**(d) Consentimiento por enumeración de actos.** *"When You use Skin Genius, you specifically consent that: L'Oréal Paris is collecting, capturing, possessing, storing, or obtaining the picture You provide, and data obtained or created from Your picture (including the automated recognition of various facial landmarks), **that might qualify as biometric data, biometric information, or a biometric identifier under various laws**."*

Reconocer expresamente la calificación biométrica en el propio consentimiento es lo correcto — y es lo que Neutrogena no hizo.

**Lo que NO se debe copiar en Perú:**

| Elemento de L'Oréal | Problema en Perú |
|---|---|
| *"**YOUR CONSENT TO THIS INFORMATION NOTICE IS A PREREQUISITE TO USE OF SKIN GENIUS**"* | Aceptable **sólo** para la feature (la foto es indispensable a esa finalidad, Regl. 3.2). **Nunca** extenderlo a comprar, registrarse o acceder a un descuento |
| Un solo consentimiento que engloba análisis + marketing + mejora del producto + compartir con afiliadas | Viola el principio de **finalidad** (Ley art. 8) y el Art. 1.2 del reglamento (*"expresa identificación de la finalidad o finalidades"*). En Perú → **casillas separadas** por finalidad |
| *"The algorithm predicts **ethnicity** and age"* | **Origen racial y étnico = dato sensible** (Ley art. 2.5). Agrega una categoría sensible sin necesidad comercial. **No inferir etnia.** |
| *"L'Oréal Paris may share (…) with any other affiliated company or brand"* (destinatarios genéricos) | Art. 6.1.3 pide *"la identidad de los que son o pueden ser sus destinatarios"* → hay que **nombrarlos** |
| *"L'Oréal Paris reserves the right to amend this policy at any time"* | Un cambio de finalidad requiere **nuevo consentimiento** (Regl. 1.3 y 4), no un aviso unilateral |

### 6.2 Neutrogena / Kenvue — Skin360

**URLs:** https://www.neutrogena.com/terms/neutrogena-skin360-terms · https://www.neutrogena.com/customer-service/terms/terms

El disclaimer médico de sus Terms of Service es la formulación estándar del sector, y es la plantilla a traducir:

> *"The information, advice and recommendations provided as part of the services is intended **solely for educational and informational purposes** and **is not intended as medical or healthcare advice, or to be used for medical diagnosis or treatment**, for any individual problem. It is also **not intended as a substitute for professional advice** and services from a qualified healthcare provider familiar with your unique facts, and users should always seek the advice of their doctor or other qualified healthcare provider regarding any medical condition and before starting any new treatment."*

**Pero Skin360 es también el caso de fracaso** (§4.4): buen disclaimer médico, mal consentimiento biométrico → USD 4.7M. **Lección: el disclaimer de claims y el consentimiento de datos son dos problemas distintos y hay que resolver los dos.** Un disclaimer perfecto no salva un consentimiento inválido.

### 6.3 Plantilla adaptada a Perú (base de trabajo, no texto final)

**Título:** `Aviso de Tratamiento de Datos — Análisis de Piel` *(documento propio, enlazado desde la pantalla del análisis)*

**Bloque 1 — Qué hacemos**
> "Al usar el Análisis de Piel, tu fotografía se envía a [proveedor, país] donde un algoritmo automatizado detecta puntos de referencia del rostro (contorno de ojos, nariz, labios) para ubicar las zonas a evaluar. **No usamos tu fotografía para identificarte ni para verificar tu identidad.** El resultado es una estimación orientativa de características cosméticas de tu piel."

**Bloque 2 — Naturaleza del dato (transparencia proactiva)**
> "Tu fotografía y el resultado del análisis pueden constituir **datos sensibles** conforme al artículo 2.5 de la Ley N° 29733 y al artículo III.6 de su Reglamento (D.S. 016-2024-JUS). Por eso solicitamos tu consentimiento **expreso y por escrito** (artículo 13.6 de la Ley y artículo 8 del Reglamento)."

**Bloque 3 — Decisión automatizada** *(Art. 6.1.8, el más olvidado)*
> "El análisis es **completamente automatizado, sin intervención humana**. Su resultado determina qué productos se te recomiendan. No produce ningún efecto legal ni condiciona tu acceso a nuestros productos: puedes comprar sin usar esta función."

**Bloque 4 — Retención, con números**
> "Tu fotografía se elimina de nuestros servidores **inmediatamente después de generar el resultado (menos de X segundos)** y no se conserva copia alguna. Se conservan únicamente: [lista exacta]. Plazo máximo: **X meses** desde tu última interacción, tras los cuales se eliminan automáticamente."

**Bloque 5 — Destinatarios y país** *(Arts. 6.1.3 y 6.1.7)*
> "Procesadores: [Nombre, país]. [Nombre, país]. Existe **transferencia internacional**; contamos con cláusulas contractuales que imponen a estos proveedores las mismas obligaciones que asumimos nosotros."

**Bloque 6 — Banco de datos y derechos** *(Arts. 6.1.4, 6.1.1 y 6.1.10)*
> "Banco de datos: «[nombre]», inscrito en el Registro Nacional de Protección de Datos Personales. Responsable: [Razón social], RUC [—], [domicilio]. Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición, y **revocar este consentimiento en cualquier momento y sin justificación**, escribiendo a [email] o desde [URL]. La revocación es gratuita e inmediata."

**Bloque 7 — Disclaimer de claims** (ver §7.4)

**Bloque 8 — Casillas separadas, ninguna pre-marcada**
- ☐ Acepto el tratamiento de mi fotografía para el análisis de piel descrito. *(obligatoria para la feature)*
- ☐ Acepto que se conserven mis resultados para darle seguimiento a mi rutina. *(opcional)*
- ☐ Acepto recibir recomendaciones de productos por email/WhatsApp. *(opcional — Regl. art. 26)*
- ☐ Acepto que mi imagen se use para mejorar el algoritmo. *(opcional — finalidad distinta, jamás implícita)*

---

## 7. Restricciones sobre CLAIMS

### 7.1 ¿Se puede decir que el análisis "diagnostica"? **NO. Nunca.**

Hay **cuatro normas independientes** que se activan con la palabra "diagnóstico". Cualquiera basta para tener un problema.

**(a) Decisión 833 de la CAN — cosméticos (aplicable directamente en Perú).**
Art. 3:
> *"**No se consideran productos cosméticos** aquellas sustancias o formulaciones destinadas a la **prevención, tratamiento o diagnóstico de enfermedades** (…). Los productos cosméticos **no podrán declarar indicaciones terapéuticas** ni otra que contravenga su definición."*

Art. 48 (publicidad):
> *"Las Autoridades Nacionales Competentes verificarán (…) que en la publicidad y promoción de los productos cosméticos, **no se atribuyan características, propiedades o acciones que no posean, o que excedan de las funciones cosméticas, o que indiquen propiedades curativas, terapéuticas o afirmaciones en salud que induzcan a error o confusión al consumidor con otra categoría de productos**."*

Art. 49: el incumplimiento deriva en *"medidas de seguridad sanitaria y las sanciones, según la legislación interna de cada País Miembro"* → en Perú, DIGEMID.

**Consecuencia real:** un claim terapéutico puede sacar al producto de la categoría cosmética. Sin NSO ≠ producto cosmético → producto sin registro sanitario → comercialización ilegal.

**(b) Ley 29459 — el software puede ser un dispositivo médico.**
Art. 4 define **dispositivo médico** como *"cualquier instrumento, aparato, implemento, máquina, reactivo o calibrador in vitro, **aplicativo informático**, material u otro artículo similar o relacionado, previsto por el fabricante para ser empleado en seres humanos (…) para propósitos específicos de: **diagnóstico**, prevención, monitoreo, tratamiento o alivio de **una enfermedad** (…)"*.

→ **"aplicativo informático" está EXPRESAMENTE en la definición.** Si se declara que el analizador *diagnostica* una condición dermatológica, se está declarando —textualmente— que es un dispositivo médico, lo que arrastraría **registro sanitario ante DIGEMID**, requisitos de fabricante y tecnovigilancia. Es la diferencia entre lanzar una feature y abrir un expediente regulatorio de años.

**(c) Ley 26842, Ley General de Salud — el diagnóstico es acto médico reservado.**
Art. 24: *"La expedición de recetas, certificados e **informes** directamente relacionados con la atención de pacientes (…) o cualquier producto, sustancia o agente destinado al **diagnóstico**, prevención o tratamiento de enfermedades, **se reputan actos del ejercicio profesional de la medicina** y están sujetos a la vigilancia de los Colegios Profesionales."*
Art. 22: para ejercer actividades propias de la medicina *"se requiere tener título profesional (…) y cumplir con los requisitos de colegiación."*

**(d) Código Penal, Art. 290 — ejercicio ilegal de la medicina. Es delito.**
Sanciona con **pena privativa de libertad de 1 a 4 años** a quien, *simulando calidad de médico u otra profesión de las ciencias médicas, sin tener título profesional, **anuncia, emite diagnósticos**, prescribe, administra o aplica cualquier medio supuestamente destinado al cuidado de la salud, aunque obre de modo gratuito*; y alcanza también la expedición de *dictámenes o informes destinados a sustentar el diagnóstico*.

→ Este es el techo de riesgo. Una pantalla de resultados que diga **"Diagnóstico: rosácea"** es, literalmente, un informe que emite un diagnóstico. **Línea roja absoluta.**

### 7.2 Y por si fuera poco: publicidad e INDECOPI

**D. Leg. 1044 — Ley de Represión de la Competencia Desleal:**
- **Art. 8.1** — actos de engaño: inducir a error sobre *"la naturaleza (…), características, aptitud para el uso, calidad (…), atributos, beneficios o condiciones"*.
- **Art. 8.3** — *"La carga de acreditar la veracidad y exactitud de las afirmaciones objetivas (…) corresponde a quien las haya comunicado en su calidad de anunciante."*
- **Art. 8.4 — sustanciación previa** (literal): *"En particular, para la difusión de cualquier mensaje referido a características comprobables de un bien o un servicio anunciado, el anunciante **debe contar previamente con las pruebas** que sustenten la veracidad de dicho mensaje."*

→ **Traducción operativa:** cualquier cifra que se muestre ("95% de precisión", "reduce manchas en 4 semanas", "detecta 7 signos") debe estar respaldada por un estudio **en la mano, ANTES de publicar**. Conseguir la prueba después de que INDECOPI la pida no sirve — el incumplimiento ya se consumó.

**Ley 29571, Código de Protección y Defensa del Consumidor:** art. 13 (protección contra publicidad engañosa sobre *"aptitud para el uso, calidad (…) atributos, beneficios, limitaciones o condiciones"*) y el deber de **idoneidad** (arts. 18–19: correspondencia entre lo que el consumidor espera según la publicidad y lo que efectivamente recibe).

### 7.3 Tabla de lenguaje: prohibido / seguro

| ❌ NUNCA | ✅ SEGURO |
|---|---|
| "Diagnostica" / "diagnóstico de tu piel" | "**Análisis** cosmético" · "**evaluación** visual" · "**estimación** orientativa" |
| "Detecta rosácea / dermatitis / melasma / acné" *(nombres de patologías)* | "Identifica zonas con **enrojecimiento visible**" · "**apariencia** de manchas" · "**tendencia** grasa" |
| "Trata" / "cura" / "elimina" / "corrige" | "**Mejora el aspecto de**" · "**ayuda a atenuar la apariencia de**" · "**hidrata**" · "**protege**" |
| "Cicatriza" / "desinflama" / "regenera la dermis" / "antibacteriano" | "**Suaviza**" · "**calma la sensación de**" · "**revitaliza el aspecto**" |
| "Dermatológico" / "grado médico" / "clínicamente comprobado" *(sin estudio en mano)* | "**Formulado con**" · "**testeado dermatológicamente**" *(sólo si existe el test)* |
| "Reemplaza la consulta con el dermatólogo" | "**No sustituye** la consulta con un profesional de la salud" |
| "Tu piel tiene un problema de salud" | "Tu piel muestra características **cosméticas** compatibles con…" |
| "Recomendación médica" / "receta para tu piel" | "**Rutina cosmética sugerida**" |
| "95% de precisión" *(sin estudio)* | Omitirlo, o publicar la metodología y tenerla archivada (**DL 1044 art. 8.4**) |

**Regla de bolsillo:** un cosmético actúa sobre el **aspecto** de partes superficiales del cuerpo (Decisión 833, def. 2.26: *"limpiarlos, perfumarlos, **modificar o mejorar su aspecto**, protegerlos, mantenerlos en buen estado o corregir los olores corporales"*). Todo verbo que implique actuar sobre una **función fisiológica** o una **enfermedad** cruza la línea.

### 7.4 Disclaimer de claims — texto sugerido (visible en la pantalla de resultados, no en el footer)

> **Esto no es un diagnóstico médico.**
> Este análisis es una herramienta **cosmética, orientativa y automatizada**. **No diagnostica, no trata, no cura ni previene ninguna enfermedad**, no constituye un acto médico ni una opinión profesional de salud, y **no sustituye la consulta con un médico dermatólogo colegiado**. Los resultados son estimaciones visuales generadas por un algoritmo y pueden variar según la iluminación, la calidad de la imagen y otros factores. Si notas un cambio en tu piel que te preocupa —una lesión que crece, cambia de color, sangra o no cicatriza— **acude a un profesional de la salud**.

**Además, tres reglas de producto (no de texto):**
1. **Ningún nombre de patología** en la UI, ni siquiera en tooltips, alt-text, nombres de clase CSS, respuestas de la API o prompts del modelo. Si el modelo devuelve "rosacea", se mapea a "enrojecimiento visible" antes de renderizar.
2. **Umbral de derivación**: si el modelo detecta algo fuera del rango cosmético (lesión asimétrica, cambio de color), **no se nombra** — se muestra un mensaje neutro de "te recomendamos consultar a un dermatólogo".
3. **El disclaimer va junto al resultado**, no en Términos y Condiciones. Un disclaimer que el usuario no ve no protege ante INDECOPI (asimetría informativa, Ley 29571 art. 13).

---

## 8. Checklist de implementación (orden de ejecución)

**Bloqueantes antes del go-live**
1. Decidir la arquitectura según la escalera de §5.4. **Preferir on-device.**
2. Redactar el **Aviso de Tratamiento** dedicado con los **10 puntos del Art. 6.1** (§2.3 y §6.3).
3. **Consentimiento escrito**: pantalla dedicada, checkboxes separados, ninguno pre-marcado, usuario autenticado.
4. **Log probatorio inmutable** del consentimiento (Art. 9 — carga de la prueba).
5. **Inscribir el banco de datos** en el RNPDP (gratis, automático): https://www.gob.pe/8060
6. Si hay proveedor extranjero: **DPA firmado** + **comunicar el flujo transfronterizo** al RNPDP (Art. 21.2).
7. **Documento de Seguridad** con fecha cierta, con inventario que especifique que se tratan **datos sensibles** (Art. 47.3).
8. **Retención escrita y automatizada**: job de borrado, no una política en un PDF.
9. **Disclaimer de claims** visible junto al resultado + auditoría de todo el copy contra la tabla de §7.3.
10. **Gate de edad**: <14 requiere consentimiento de quien ejerce la patria potestad (Art. 25.3); 14–17 consienten ellos (Art. 25.2).

**Primeros 30 días**
11. **Runbook de incidentes de 48 h** (Art. 34): quién detecta, quién notifica a la ANPD, plantilla con los 4 contenidos mínimos del Art. 34.2.
12. **Logs de acceso a datos personales, conservados ≥2 años** (Art. 46.3).
13. **Canal ARCO** funcional + revocación de un clic (Art. 10.4), respuesta en 10 días para bajas de marketing (Art. 26.5).
14. Verificar si aplica **ODP** y en qué fecha, según el cronograma de §3.3.
15. **Sustanciación previa** archivada de todo claim comprobable (DL 1044 art. 8.4).

**Recomendado (no obligatorio)**
16. **EIPD** — es **facultativa** (Art. 40.1), pero para datos sensibles + perfilado es la mejor evidencia de diligencia frente a la ANPD y atenúa la graduación de una eventual multa. Referencias sugeridas por la norma: **NTP-ISO/IEC 27005** y **NTP-ISO 31000**.

---

## 9. Qué NO se puede afirmar sin abogado

Estos cinco puntos son los que definen la exposición real y **requieren validación de un abogado peruano especializado en protección de datos antes del go-live** (1–2 horas de consulta alcanzan):

1. **Si el checkbox digital autenticado satisface el "por escrito" del Art. 13.6 / Art. 8.** Hay base razonable (Art. 5.1.3 + OC 032-2021), pero no hay pronunciamiento expreso de la ANPD sobre consentimiento sensible vía web sin firma digital certificada. **Es el punto de mayor incertidumbre de todo el análisis.**
2. **Si el analizador de piel califica como dato biométrico** cuando no identifica. La tensión entre Ley art. 2.5 (exige capacidad identificatoria) y Reglamento art. III.6 (no la exige) no está resuelta jurisprudencialmente. *(Irrelevante en la práctica: la vía "salud" ya lo hace sensible.)*
3. **Si mostrar resultados con vocabulario dermatológico** activa el umbral de "dispositivo médico" de la Ley 29459 art. 4. Requiere lectura conjunta con el D.S. 016-2011-SA y, si hay duda, consulta a DIGEMID.
4. **El plazo exacto para atender solicitudes ARCO** bajo el reglamento nuevo (el checklist interno de Novvx cita ~20 días hábiles a partir del reglamento derogado). Verificar contra los arts. 62–73 del D.S. 016-2024-JUS.
5. **Si Estados Unidos tiene "nivel adecuado de protección"** para el flujo transfronterizo. La ANPD lo determina por resolución (Art. 19.1); a la fecha de esta investigación **no se localizó una resolución vigente** que lo declare → asumir que **no** lo tiene y aplicar el Art. 20 (cláusulas contractuales).

**Trabajo interno pendiente:** actualizar `/Users/macbookpro/.claude/skills/novvx-ley-29733/references/checklist-29733.md` — cita el D.S. 003-2013-JUS (derogado), omite el umbral inexistente de ">500 registros", y no cubre el régimen de incidentes 48h, el ODP ni el art. IV.4.1.

---

## 10. Fuentes

**Normativa peruana**
- [Ley N° 29733, Ley de Protección de Datos Personales (texto vigente 2025, PDF)](https://www.smv.gob.pe/Uploads/Ley_29733_vigente_2025.pdf) — arts. 2.5, 2.19, 3, 13.5, 13.6, 14, 18, 29, 34, 38, 39, 40
- [Ley 29733 actualizada — LP Derecho](https://lpderecho.pe/ley-proteccion-datos-personales-ley-29733-actualizada/)
- [D.S. N° 016-2024-JUS, Reglamento de la Ley 29733 (PDF El Peruano)](https://img.lpderecho.pe/wp-content/uploads/2024/11/Decreto-Supremo-016-2024-JUS-LPDerecho.pdf) — arts. III.4, III.5, III.6, IV, V, VI, 1–10, 18–21, 25, 26, 28–34, 37–47, 131–135, DCF Primera
- [D.S. 016-2024-JUS — texto navegable, LP Derecho](https://lpderecho.pe/reglamento-ley-proteccion-datos-personales-decreto-supremo-016-2024-jus/)
- [D.S. 016-2024-JUS en gob.pe](https://www.gob.pe/institucion/smv/normas-legales/6426760-016-2024-jus)
- [Opinión Consultiva N° 032-2021-JUS/DGTAIPD — datos biométricos (ANPD)](https://www.gob.pe/institucion/anpd/informes-publicaciones/2082384-oc-n-032-2021-jus-dgtaipd-sobre-los-datos-biometricos-y-su-empleo-en-la-identificacion-de-personas-el-tratamiento-de-datos-personales-la-obtencion-del-consentimiento-la-conservacion-de-documentos-digitales-la-atencion-de-derechos-ar)
- [Inscribir banco de datos en el RNPDP — trámite ANPD](https://www.gob.pe/8060) · [Modificar banco inscrito](https://www.gob.pe/9251)
- [D.S. 301-2025-EF — UIT 2026 = S/ 5,500](https://lpderecho.pe/valor-uit-2026-decreto-supremo-301-2025-ef/) · [MEF](https://www.gob.pe/institucion/mef/noticias/1314665-mef-establece-en-s-5500-el-valor-de-la-uit-para-el-ano-2026) · [Valor de la UIT, gob.pe](https://www.gob.pe/435-valor-de-la-uit-en-el-ano-2026)
- [Ley N° 26842, Ley General de Salud (PDF MINSA)](https://www.minsa.gob.pe/Recursos/OGTI/SINADEF/Ley-26842.pdf) — arts. 22, 24, 25, 42, 71
- [Ley N° 29459 — productos farmacéuticos, dispositivos médicos y productos sanitarios](https://spij.minjus.gob.pe/Normas/textos/261109T.pdf) — art. 4 (def. dispositivo médico incluye "aplicativo informático") · [DIGEMID — Dispositivos Médicos](https://www.digemid.minsa.gob.pe/webDigemid/registro-sanitario/dispositivos-medicos/)
- [Decisión 833 CAN — Armonización de Legislaciones en materia de Productos Cosméticos (PDF)](http://www.sice.oas.org/trade/JUNAC/Decisiones/DEC833_s.pdf) — arts. 2.26, 3, 48, 49
- [D. Leg. N° 1044, Ley de Represión de la Competencia Desleal (PDF)](https://faolex.fao.org/docs/pdf/per85752.pdf) — art. 8.1–8.4
- [Ley N° 29571, Código de Protección y Defensa del Consumidor (PDF)](https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/LEY_29571_v5.pdf) — arts. 13, 18, 19
- [Código Penal art. 290 — ejercicio ilegal de la medicina (jurisprudencia, LP Derecho)](https://lpderecho.pe/articulo-290-codigo-penal-ejercicio-ilegal-medicina/)

**Precedentes**
- [Multan al BCP con casi S/ 300,000 por recopilación excesiva de datos biométricos faciales — LP Derecho](https://lpderecho.pe/multan-con-casi-s-300-000-al-bcp-por-recopilacion-excesiva-y-desproporcionada-de-datos-biometricos-faciales-de-sus-usuarios/)
- [MINJUSDH sanciona a entidad financiera por mal uso de datos biométricos — TV Perú](https://www.tvperu.gob.pe/noticias/nacionales/minjusdh-sanciona-a-entidad-financiera-por-mal-uso-de-tratamiento-de-datos-biometricos) · [Gestión](https://gestion.pe/economia/empresas/sancionan-al-bcp-por-inadecuado-tratamiento-de-datos-personales-biometricos-solicitados-a-sus-usuarios-minjusdh-sanciona-al-banco-de-credito-del-peru-gobierno-noticia/) · [Infobae](https://www.infobae.com/peru/2025/01/06/bcp-es-sancionado-con-casi-s-300000-por-recolectar-y-almacenar-datos-biometricos-faciales-de-usuarios-sin-permiso/)
- [Kenvue acuerda USD 4.7M por Neutrogena Skin360 (BIPA) — Bloomberg Law](https://news.bloomberglaw.com/privacy-and-data-security/kenvue-to-pay-4-7-million-to-settle-neutrogena-face-scan-suit) · [ClassAction.org](https://www.classaction.org/news/4.7m-neutrogena-settlement-to-end-class-action-lawsuit-over-alleged-bipa-violations) · [Cosmetics Business](https://cosmeticsbusiness.com/neutrogena-johnson&johnson-kenvue-settle-skin-360-privacy-claims)

**Disclaimers de marcas**
- [L'Oréal Paris — Skin Genius Information Notice](https://www.lorealparisusa.com/skin-genius-information-notice)
- [L'Oréal Paris — Skin Genius landing](https://www.lorealparisusa.com/skin-genius-landing-page)
- [Neutrogena Skin360 — Terms & Conditions](https://www.neutrogena.com/terms/neutrogena-skin360-terms) · [Neutrogena Terms of Service (disclaimer médico)](https://www.neutrogena.com/customer-service/terms/terms)

**Análisis y contexto**
- [IAPP — Se publica el nuevo reglamento de protección de datos personales en Perú](https://iapp.org/news/a/se-publica-el-nuevo-reglamento-de-protecci-n-de-datos-personales-en-per-)
- [EY Perú / AmCham — multas por no designar Oficial de Protección de Datos](https://amcham.org.pe/news/ey-peru-empresas-podrian-recibir-multas-de-hasta-s-26750-por-no-designar-un-oficial-de-proteccion-de-datos-antes-del-30-de-noviembre/)
- [Estudio Carrión — nuevo reglamento vigente desde marzo 2025](https://estudiocarrion.com/nuevo-reglamento-proteccion-de-datos-personales-entra-en-vigor-en-marzo-2025/)

**Archivos de trabajo** (texto normativo extraído, en el scratchpad de esta sesión):
`/private/tmp/claude-501/-Users-macbookpro-Desktop-Nova-ClaudeCode-Empresa-IA/b171c4e4-88ca-409c-8169-e2a8693de471/scratchpad/` → `ds016-html.md` (reglamento completo, texto limpio), `ley29733.txt`, `oc032.txt` (Opinión Consultiva ANPD), `dec833.md`, `dl1044.md`, `ley26842.txt`, `loreal-skingenius.md`