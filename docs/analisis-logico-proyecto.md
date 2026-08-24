# Análisis de lógica y fundamentación del proyecto (23-ago-2026)

> A diferencia de `docs/preparacion-defensa-oral.md` (respuestas ya preparadas a preguntas ya
> hechas por dictámenes anteriores), esto es una lectura propia e independiente del documento y del
> código, buscando específicamente lo que **no cierra del todo**, lo que **sí cierra pero no está
> ensayado**, y lo que **se puede modificar ahora** en vez de solo declararlo como límite. Se apoya en
> una lectura completa de los Capítulos 1, 2.7-2.8, 4.3.1, 4.6-4.9, 5, 6, 7 y 8 del `.docx`, en
> `README.md`, `docs/verificacion-y-seguridad.md`, `docs/modulo-pagos.md` y el código de
> `workflow/crm_postgres.json`.

---

## 1. El marco de lectura que resuelve la mitad de las preguntas difíciles

Antes de entrar en los puntos finos, hay una sola idea que conviene tener asimilada, no memorizada,
porque de ahí se derivan casi todas las respuestas a preguntas del tipo "¿por qué no midieron X?":

**Esta es una tesis de viabilidad técnica, no de impacto.** La pregunta de investigación (§1.3) pide
explícitamente "¿es técnicamente viable...?", no "¿cuánto mejora...?". Esa elección se hizo tarde
(§7.1 lo admite: "una promesa en el objetivo general condiciona toda la cadena metodológica") pero
una vez hecha, es **consistente hacia adelante**: el Capítulo 5 mide comportamiento, no esfuerzo
ahorrado; el Capítulo 7 responde "sí" a viabilidad y explícitamente "fuera de alcance" a magnitud.

El riesgo no es que esta elección esté mal — está bien, y es la más honesta de las dos opciones
disponibles una vez que no hay línea de base. El riesgo es **retórico**: el Capítulo 1 completo está
narrado en términos de "se pierden leads, se pierde tiempo" (una promesa de impacto), y el lector
llega al objetivo general siete páginas después ya esperando que se mida eso. La tesis lo anticipa
(§1.3: "la pregunta se formula en términos de viabilidad técnica y no de magnitud del ahorro") pero
esa frase pasa rápido. **Recomendación:** en la defensa, no esperar a que pregunten "¿y cuánto tiempo
ahorra?" — nombrar la tensión primero, en la propia introducción de la exposición, exactamente como
ya la nombra el texto. Decirla en voz alta antes de que la pregunten cambia la percepción de "no lo
pensaron" a "lo pensaron y lo decidieron".

---

## 2. Lo que está sólido — no tocar

- **La reformulación del objetivo general (§1.5).** Es inusual que un trabajo de grado retroceda una
  promesa ya escrita porque la estrategia de validación no la sostiene. Es la decisión metodológica
  más fuerte de todo el documento y hay que exhibirla como tal, no esconderla como una corrección.
- **La atomicidad de la aceptación (§4.3.2).** `UPDATE ... WHERE estado IN (...)` resuelto con
  concurrencia real probada (`Promise.all`, no secuencial). Es ingeniería de verdad, no una
  afirmación de diseño sin probar.
- **La RLS verificada, no solo declarada.** 24 casos contra un Postgres real, rol por rol. Cierra una
  de las críticas más comunes a este tipo de arquitectura ("¿cómo sé que la política hace lo que
  dice?").
- **La autocrítica organizada en tablas explícitas**, no dispersa en el texto: Tabla 11 (deudas de
  seguridad), §6.2 (limitaciones que comprometen las afirmaciones), §7.1 (cuatro aprendizajes
  concretos). Un tribunal adversarial busca exactamente esto y ya está hecho.
- **El argumento de construir vs. configurar (§2.8)**, con sus propias reservas: de cuatro razones,
  el propio texto dice que dos se sostienen sin reservas y dos parcialmente. Eso es más creíble que
  cuatro razones sin matices.

---

## 3. Tensiones lógicas reales — con veredicto propio

### 3.1 El sesgo de "Otro" en el scoring — **es una falla de diseño real, no solo un límite de validación**

El texto lo declara con honestidad (§6, cuerpo del Capítulo 6): la opción "Otro" recibe la
ponderación mínima, penalizando exactamente los leads que el sistema no supo clasificar. Esto está
presentado como una limitación de *validez empírica* del scoring (falta calibrar con datos), pero en
realidad es un error de *lógica de negocio* independiente de cualquier calibración: no hay ningún
dato histórico que justifique que un lead no clasificable valga menos que uno clasificable — son
cosas distintas. Uno es "no sé cuánto vale", no "vale poco".

**Veredicto:** esto no necesita datos de conversión para arreglarse, necesita una línea de código.
Sacar a "Otro" del peso mínimo es defendible sin ningún dato: es neutral en vez de sesgado.

> **Precisión del 24-ago.** Dos cosas de este párrafo no eran exactas. Primera: el cambio no va en
> `Code - Scoring` sino en `Code - Normalizar Lead` (es el mapeo del servicio, no la tabla de pesos),
> y por eso `tests/scoring.js` —que puntúa servicios ya normalizados— **no lo cubre**; la cobertura se
> agregó en `tests/verificar_afirmaciones.js`. Segunda: `consultoria` vale 12 y la mediana de los
> nueve pesos es 15, así que el valor elegido es "no mínimo", no "mediano". Se lo mantiene igual
> porque además lee bien en el tablero: un proyecto atípico que hay que conversar es, literalmente,
> una consultoría.

### 3.2 El endpoint de pago simulado sigue siendo explotable HOY, tal como lo describe el propio §6.2

Verifiqué el código: `Code - Validar Pago` (detrás de `GET /webhook/pago-confirmado`) no comprueba en
ningún punto si `MP_ACCESS_TOKEN` está configurado. Esto significa que aunque un deployment tenga
MercadoPago real activo para el resto de los cobros, **cualquiera que conozca o adivine la URL
`/webhook/pago-confirmado?factura_id=X`** puede marcar esa factura como cobrada sin haber pagado nada
— porque el endpoint de desarrollo nunca se desactiva cuando el modo real está disponible. La
protección de idempotencia (`WHERE estado_pago='PENDIENTE'`) evita que se cobre dos veces, pero no
evita que se cobre **cero** veces mientras el sistema cree que fueron una.

El propio Capítulo 6 lo llama "la deuda de seguridad más grave, por su consecuencia de negocio", y el
Capítulo 8 la pone primera en la lista de trabajo previo a cualquier uso real. **No es un hallazgo
mío: ya está en el texto.** Lo que aporto es la confirmación de que sigue reproducible en el código
actual, no es una descripción que quedó vieja.

**Veredicto:** esto sí es corregible ahora con bajo riesgo — un `IF` al principio del flujo que
rechace la petición si `process.env.MP_ACCESS_TOKEN` no está vacío. No cambia el modo de desarrollo
sin credenciales (que debe seguir funcionando), sólo lo desactiva cuando ya no hace falta. **Es una
decisión tuya, no mía:** cerrar esto ahora fortalece el artefacto pero también cambia lo que dice el
texto en §6.2 y en la Tabla 11 (pasaría de "abierta" a "cerrada"), y hay valor legítimo en **dejarla
declarada a propósito** como muestra de priorización consciente (ver §5 de este documento). Decime
qué preferís.

### 3.3 El patrón de bug de hoy (`.item` ambiguo) apareció en 4 nodos distintos — ¿son todos, o son los que encontramos?

Hoy corregí 3 nodos más con el mismo patrón exacto que ya había aparecido una vez en la sesión
anterior (`trabajo-estado`): una expresión `.item` que se vuelve ambigua para n8n en cuanto, más
arriba en la cadena, un `Postgres UPDATE` colapsa varios ítems en un solo resultado. Encontré los 4
porque **ejercité en vivo, uno por uno, los 3 cron** — no porque revisé el resto del workflow en busca
del mismo patrón.

**Veredicto:** el hecho de que apareciera 4 veces en dos sesiones distintas sugiere que es un patrón
estructural de cómo está armado el workflow (cualquier rama que combine "actualizar varias filas de
una vez" con "leer datos de un nodo anterior más arriba en la cadena, con `.item`") y no una casualidad
localizada. No audité sistemáticamente el resto de los ~140 nodos buscando el mismo patrón — sería
una búsqueda de texto acotada (`grep` de `.item` seguido de qué nodo está entre medio) que puedo hacer
si te interesa cerrar esto con más confianza antes de la defensa, en vez de confiar en que "ya
encontramos todos los que hay".

### 3.4 El hallazgo del `TELEGRAM_CHAT_ID` es evidencia nueva a favor del propio argumento de la tesis, no en contra

El objetivo general promete "sin sacrificar... el control del profesional sobre el proceso". Que las
13 notificaciones de Telegram de todo el sistema estuvieran rotas — silenciosamente, sin que nadie lo
supiera hasta que se ejercitó un cron a mano — es exactamente el tipo de fallo silencioso que
compromete ese control. Pero encaja perfecto con dos cosas que la tesis **ya sostiene por su cuenta**:
el aprendizaje #3 de §7.1 ("la pregunta útil no es *¿este nodo es atómico?* sino *¿qué ocurre si falla
el paso siguiente?*") y el argumento entero del dictamen v6 de que sólo ejercitar el sistema en vivo
revela lo que la lectura estática no puede. Este hallazgo no debilita la tesis: la confirma con un
caso nuevo y real, ocurrido hoy.

**Veredicto:** vale la pena subirlo como evidencia — no como una falla vergonzosa sino como un
ejemplo más, fresco, del propio argumento metodológico del trabajo. Ya está documentado en
`docs/dictamen-v6-reejecucion.md`; falta decidir si entra también al `.docx` (Capítulo 5 o 6) antes de
la defensa.

### 3.5 El Capítulo 5 del `.docx` describe un estado ya superado

El texto actual dice literalmente "los escenarios E11 a E13... exigen disparar los cron y registrar
su salida" (pendiente) y "el protocolo... pide tres repeticiones... la repetibilidad... todavía no
está establecida". Ambas cosas ya se resolvieron hoy (ver `docs/dictamen-v6-reejecucion.md`,
actualización del 23-ago). Esto no es una tensión lógica sino una sincronización pendiente: el
`.docx` no refleja el estado actual del artefacto. Es exactamente el primer aprendizaje de §7.1
("el documento y el artefacto se desincronizan si no se los versiona juntos") ocurriendo de nuevo, en
vivo, mientras se prepara la defensa de un trabajo que advierte sobre ese mismo riesgo.

---

## 4. Decisiones que parecen raras desde afuera pero se sostienen — para decirlas con seguridad, no leerlas

- **"Objetivo formativo" como una de las cuatro razones para construir (§2.8).** Suena débil en un
  contexto comercial ("lo hice para aprender" no es una ventaja competitiva), pero esto es una tesis
  de grado de un Técnico Universitario en Programación, no un pitch de producto. Es la razón *más*
  legítima de las cuatro en ese contexto, no la más débil. Decirlo así, explícitamente, en vez de
  dejar que suene a excusa.
- **Arquitectura "híbrida" en vez de 100% autoalojada.** No es una contradicción del argumento de
  "control sobre el dato" — es una versión más honesta y más matizada de ese argumento. La tesis ya
  lo declara así ("se sostiene solo parcialmente"). El error sería pretender que es autoalojada
  completa; no lo es y el texto no lo pretende.
- **Dejar vivo el modo de desarrollo sin MercadoPago.** Esto en sí mismo es correcto: un sistema que
  se rompe cuando faltan credenciales opcionales es peor diseño que uno que degrada con gracia. El
  problema no es que exista el modo de desarrollo — es que no se desactiva cuando el modo real ya
  está disponible (ver 3.2). Vale la pena separar estas dos ideas en la cabeza antes de que un
  tribunal las mezcle.

---

## 5. Qué hacer ahora, priorizado

| # | Acción | Quién | Costo | Nota |
|---|---|---|---|---|
| 1 | ~~Conseguir el `chat_id` real de Telegram y reiniciar n8n~~ | **Hecho** | — | `chat_id` real + credencial de bot vencida encontrada y actualizada; verificado con `message_id` real de Telegram |
| 2 | ~~Neutralizar el peso de "Otro" en scoring~~ | **Hecho** | — | `'otro'` ahora mapea a `consultoria` (peso 12) en vez de `soporte` (peso 5). Commit `2630e7f`. El 24-ago se alineó también el respaldo del normalizador, que era `desarrollo_web` (peso 20, el máximo) — el mismo error con el signo invertido |
| 3 | ~~Cerrar el guard de `pago-confirmado`~~ | **Hecho** | — | Rechaza la petición si `MP_ACCESS_TOKEN` ya está configurado. Commit `2630e7f` |
| 4 | ~~Auditar el resto del workflow por el patrón `.item` ambiguo~~ | **Hecho** | — | 2 casos más encontrados sin disparar (`Telegram - Lead Perdido`, `Notion - Estado Perdido`, misma rama de Follow-up) y corregidos. Commit `2630e7f` |
| 5 | ~~Actualizar el Capítulo 5 / Anexo E del `.docx` con la corrida de hoy~~ | **Hecho** | — | E11-E13, triple repetición, OE5 pasa a "cumplido parcialmente". Commit `441e20f` |
| 6 | ~~Subir el hallazgo del `TELEGRAM_CHAT_ID` como evidencia nueva~~ | **Hecho** | — | Integrado en el mismo párrafo de Capítulo 5 que describe E11-E13. Commit `441e20f` |
| 7 | ~~Reflejar en la Tabla 11 / §6.2 el cierre de S2~~ | **Hecho** | — | Estado pasa de "Abierta" a "Parcial — cerrada para el cobro real". Commit `441e20f` |
| 8 | Ensayar en voz alta la tensión de 3.1 antes de que la pregunten | Vos | — | Cambia la percepción de "se les pasó" a "lo decidieron" |
| 9 | ~~Auditoría de coherencia documento-artefacto en frío~~ | **Hecho (24-ago)** | — | 11 incoherencias más, todas cerradas. Ver la "Cuarta pasada" de `docs/dictamen-v6-reejecucion.md` |

**Detalle honesto que quedó en el propio `.docx` (Tabla 12, E11):** al re-ejercitar el proceso de
seguimiento para verificar el fix, un lead de prueba (`LEAD-0004`) quedó con `seguimientos=3` sin
completar la transición a `PERDIDO` — la reconciliación manual de ese registro de prueba sigue
pendiente en la base (no en el código). Está documentado así a propósito, como evidencia en vivo del
mismo riesgo que S5 ya declaraba para la rama de facturación.

Lo único que queda de esta lista es el punto 8, y es tuyo: no hay nada más que yo pueda tocar sin
tu intervención (E7, S7, E14 y la Figura 14 siguen bloqueados en vos o en el tercero, como ya se
explicó arriba).
