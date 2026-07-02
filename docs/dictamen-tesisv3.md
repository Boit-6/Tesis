# Dictamen de Evaluación de Trabajo Final — v3

> Evaluación par académico senior (perfil compatible CONEAU) del documento `tesis.docx`,
> ejecutando el prompt evaluador completo (Rol → Paso 0 → 13 dimensiones → formato A–G,
> con reglas de evidencia anti-alucinación).
>
> **Fecha:** 2 de julio de 2026. **Base de evidencia:** `tesis.docx` (10.679 palabras,
> 18 figuras embebidas) cruzado, afirmación por afirmación, contra el **árbol de trabajo actual**
> de este monorepo (`workflow/crm_postgres.json`, `db/schema.sql`, `FormularioLeads/src/`,
> `tests/smoke_code_nodes.js`, `docker-compose.yml`).
>
> **Relación con los dictámenes previos.** Este documento **re-ejecuta** el prompt sobre el estado
> actual y **actualiza** `docs/dictamen-tesis.md` (v1) y `docs/dictamen-tesisv2.md` (v2). El hallazgo
> estructural de esta pasada **invierte** el de la v2: allí «el artefacto crecía por delante del
> documento» (subdeclaraba nodos, webhooks y funciones); hoy **el documento alcanzó al artefacto en
> casi todo lo verificable** —conteo de nodos, webhooks, «Trabajos activos», mapeo servicio↔scoring,
> figuras y escenarios E8–E10 están sincronizados—, y solo **una** sección quedó rezagada en sentido
> inverso: la discusión de concurrencia de la aceptación (§4.3.2, §4.8, Cap. 8 ítem 8) describe una
> versión **no atómica** que el código **ya superó**. La sección **X** detalla la comparación con la v2.

---

## Paso 0 — Calibración previa (obligatorio)

| Elemento | Determinación |
|---|---|
| **Tipo de trabajo** | Trabajo Final de grado (Tecnicatura Universitaria en Programación, UTN–FRM). Res. ME 160/2011 solo como referencia de calidad de nivel superior. |
| **Naturaleza** | Desarrollo tecnológico de carácter aplicado (artefacto de software). Autodeclarado: *«su resultado principal es un artefacto de software […] y no la contrastación de una hipótesis empírica»* (§3.1). |
| **Disciplina / subcampo** | Ingeniería de software; automatización de procesos de negocio (BPA); gestión de leads. |
| **Norma de citación** | **APA 7**, declarada: *«se ajusta a las normas de estilo de la American Psychological Association en su séptima edición (APA, 2020)»* (§3 y Referencias). |
| **Extensión / idioma / completitud** | ~10.679 palabras; español (abstract en inglés no incluido: hay «Resumen» y «Palabras clave» en español; **no se encuentra un Abstract en inglés en el texto entregado**). **18 figuras embebidas** en el `.docx` (Figuras 1–16, algunas compuestas). Completo salvo un ítem probatorio residual: la evidencia del escenario **E10** dice *«Pendiente — adjuntar captura…»* (Tabla 9). |
| **Reproducibilidad frente al código** | **Muy alta.** Cada afirmación de frontend, esquema y backend verificada contra el árbol actual **se confirma** (sección ★). La observación de la v2 —«el documento describe menos de lo que el artefacto hace»— está **resuelta**. Persiste **una** inexactitud de signo inverso (§4.3.2, ver D1). |

> **Observación crítica de entrada.** El prompt exige declarar la base de evidencia y, en una tesis de
> desarrollo, la trazabilidad texto↔artefacto es criterio central. En este árbol los tres componentes
> (frontend, esquema, workflow) conviven versionados y **son consistentes con el documento**. Sin embargo,
> **`tesis.docx` no declara ninguna URL de repositorio**: §4.1 remite a *«el código fuente del repositorio
> del proyecto»* sin nombrarlo. El punto queda **cerrado en el código, abierto en el documento** (B8).

---

## A. Carátula del dictamen

- **Título:** *Automatización de Sistema de Tickets para Freelancers con n8n — Diseño e implementación de una plataforma web para la gestión automatizada del ciclo de vida del cliente (captación, calificación, propuesta, facturación y cobro).*
- **Autores:** Mateo Morgui; Tobías Rivas. **Director:** Alberto Cortez.
- **Tipo:** Trabajo Final de grado — desarrollo tecnológico aplicado.
- **Disciplina:** Ingeniería de software / automatización de procesos de negocio.
- **Norma detectada:** APA 7 (declarada, §3 y Referencias).
- **Base de evidencia:** `tesis.docx` (18 figuras) + árbol de trabajo actual del monorepo (`workflow/crm_postgres.json`, `db/schema.sql`, `FormularioLeads/src/`, `tests/`, `docker-compose.yml`).
- **Fecha de evaluación:** 2 de julio de 2026 (v3).

## B. Síntesis ejecutiva

**Tesis central.** El ciclo de vida comercial de un freelancer —captación, calificación, propuesta, aceptación, facturación y cobro— puede automatizarse de extremo a extremo con una arquitectura orientada a eventos de bajo código (Next.js + n8n + Supabase). **Principal fortaleza:** validez interna alta y **verificable componente a componente**: los 128 nodos funcionales, los 11 webhooks (Tabla 8), el esquema de 5 tablas con RLS por rol `admin`, el scoring (Tabla 4) y el mapeo servicio↔scoring se confirman exactamente en el código; virtud infrecuente en este nivel, y ahora respaldada por 18 figuras embebidas. **Principal debilidad:** la discusión de concurrencia de la aceptación (§4.3.2, §4.8, Cap. 8 ítem 8) describe un nodo *no atómico* y ofrece como *«corrección recomendada»* una solución **que el código ya implementó** (`UPDATE … WHERE estado IN (…) RETURNING *` + rama por filas afectadas): el texto reporta como abierto un defecto **ya cerrado** y se contradice con su propio artefacto. **Veredicto:** aprobado con observaciones menores. Es una mejora sustantiva respecto de la v2 («mayores»): se resolvieron los bloqueantes de cobertura y de evidencia; resta corregir una sección, cargar una evidencia (E10) y declarar el repositorio.

## C. Veredicto

**APROBADO CON OBSERVACIONES MENORES** (defensa habilitada; correcciones formales o aclaratorias), en el **límite superior** de la categoría.

Justificación: el artefacto **respalda con fidelidad** todo lo que el documento afirma —verificado consulta por consulta— y los bloqueantes de la v2 (conteo de nodos, contratos de webhooks, «Trabajos activos», mapeo servicio↔scoring, figuras y escenarios E8–E10) están **resueltos**. Lo que impide un veredicto sin observaciones no es estructural sino localizado: (i) una **inexactitud técnica** en la que el documento describe la aceptación como no atómica y presenta como pendiente una corrección **ya aplicada** (§4.3.2, §4.8, Cap. 8 ítem 8; ver D1); (ii) **evidencia faltante** solo en E10; y (iii) el **repositorio canónico sin declarar** (§4.1). No corresponde «observaciones mayores» porque ninguna de estas correcciones exige revisión sustantiva de capítulos: son ediciones puntuales, una carga de captura y una línea con la URL. La condición para la defensa es corregir D1 y nombrar el repositorio; lo demás es formal.

---

## ★ Verificación contra el código (árbol de trabajo actual)

Regla de evidencia aplicada: se cita archivo·consulta del repositorio junto a la sección del documento.

### ★.1 Afirmaciones CONFIRMADAS

| Afirmación de la tesis | Evidencia en el artefacto |
|---|---|
| **128 nodos funcionales (144 totales, 16 notas)** (§4.1, §4.3, Anexo B) | `workflow/crm_postgres.json`: 144 nodos; 16 `stickyNote`; **128 funcionales** (30 postgres, 23 code, 16 respondToWebhook, 13 telegram, 12 if, 11 webhook, 9 httpRequest, 7 gmail, 3 scheduleTrigger, 3 noOp, 1 errorTrigger). **Coincide exactamente.** |
| **11 webhooks (Tabla 8)** | Los **11** existen y con el método declarado: `POST /lead/nuevo`, `POST /lead-acepta`, `GET /pago-confirmado`, `POST /proyecto-cerrado`, `GET /lead-propuesta`, `POST /lead-rechaza`, `POST /lead-modifica`, `POST /trabajo-estado`, `POST /lead-cancelar`, `POST /cambio-aceptar`, `POST /cambio-rechazar`. **Coincide 1:1.** |
| **Tres procesos programados** (§4.3.5): 9:00 L–V, 10:00 diario, 23:59 diario | 3 `scheduleTrigger`: *Follow-up 9AM L-V*, *Recordatorios Pago 10AM*, *Metricas 23:*. Confirma. |
| **Scoring (Tabla 4)** | `Code - Scoring`: presupuesto 40/30/20/10 (≥5000/2000/1000/300); urgencia 30/15/5; servicio `desarrollo_web,ecommerce=20`, `app_movil,automatizacion=18`, `diseno_ui,marketing,seo=15`, `consultoria=12`, `soporte=5`; +5 teléfono >6; +5 descripción >50; HOT≥70 / WARM≥40 / COLD. **Idéntico a la Tabla 4.** |
| **Mapeo servicio→scoring; «Otro»→`soporte`; default `desarrollo_web`** (§4.3.1) | `Normalizar Lead`: `svcMap{…'otro':'soporte'…} || 'desarrollo_web'`. Confirma ambas cláusulas. |
| **Aceptación idempotente / factura solo desde PENDIENTE** (§4.3.3, §4.8) | `Marcar Cobrado`: `UPDATE facturas … WHERE factura_id=$1 AND estado_pago='PENDIENTE' RETURNING *`. Confirma. |
| **Esquema: 5 tablas + 2 vistas + RLS por rol `admin`** (§4.4, §4.6, Anexo C, Tabla 5/6) | `db/schema.sql`: tablas `leads/facturas/seguimientos/logs/profiles`; vistas `metrics_mensuales`/`facturas_pendientes` con `security_invoker=true`; políticas `USING (EXISTS … profiles … role='admin')`; `REVOKE ALL … FROM anon`; ENUM `trabajo_estado` y columna `estado_trabajo` en `leads`. Confirma. |
| **Frontend** (§4.2): `proxy.ts` (Next 16), `PROTECTED_ROUTES=[/dashboard]`, slider 100–5000, POST a `/webhook/lead/nuevo`, `postgres_changes`, tres acciones en aceptación | `FormularioLeads/src/proxy.ts`; `components/lead-form.tsx` (`PRESUPUESTO_MIN=100`, `MAX=5000`, `…/webhook/lead/nuevo`); `dashboard/dashboard-client.tsx` (`postgres_changes … table:'leads'`); `aceptar/[leadId]/aceptar-propuesta.tsx`; `trabajo-estado-select.tsx`. Confirma. |
| **18 figuras embebidas** (Anexo A, Tabla 9 E1–E9) | El `.docx` contiene 18 imágenes y 18 `<w:drawing>`; Figuras 1–16 referenciadas y citadas desde la columna Evidencia. Confirma. |

### ★.2 DIVERGENCIA vigente — el documento describe algo que el artefacto ya superó

| # | Hallazgo | Documento | Artefacto (árbol actual) | Gravedad |
|---|---|---|---|---|
| **D1** | **Atomicidad de la aceptación** | §4.3.2: *«el segundo nodo actualiza por lead_id **sin volver a condicionar por estado**»*; presenta como *«La corrección recomendada»* el `UPDATE … WHERE lead_id=$1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO') RETURNING *`; §4.8 repite *«con la salvedad de concurrencia descripta en §4.3.2»*; **Cap. 8 ítem 8** lista *«Cerrar la ventana de concurrencia… Hacer atómica la actualización… del nodo Marcar Aceptado»* como trabajo futuro | `Postgres - Marcar Aceptado` **ya ejecuta** `UPDATE leads SET estado='ACEPTADO', fecha_aceptacion=now() WHERE lead_id=$1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO') RETURNING *;` + `IF - Aceptación Aplicó?` (`estado == 'ACEPTADO'`) + `No-op - Aceptación Duplicada`. La corrección **está implementada** (commit `ea46b7a`, *«aceptacion atomica… dictamen S2»*). | **Media-alta** (inexactitud técnica + reporta como abierto un defecto cerrado + contradicción interna en §4.3.2) |

> **Consecuencia evaluativa.** La validez interna **no se ve comprometida** —el artefacto es correcto y, en
> este punto, *mejor* que lo que el texto declara—, pero para una tesis cuya credibilidad se apoya en estar
> *«verificado componente a componente contra el código fuente»* (§2.8, §4.1), una discrepancia texto↔código
> en la propia discusión de concurrencia que el autor destaca es una falla de **exactitud descriptiva** que
> el jurado detectará. Es puntual y de corrección trivial (reescribir a tiempo pasado y mover el ítem 8 de
> «trabajos futuros» a «resuelto»), por lo que no altera la solidez del conjunto.

---

## D. Evaluación detallada por dimensión

**1. Estructura general y formato — Adecuado.** IMRyD-adaptada correcta; 18 figuras embebidas y citadas. *Observación (baja):* el índice **no incluye §4.3.7 «Gestión interactiva…»** (salta de 4.3.6 a 4.4) y la paginación está horneada: falta refrescar el TOC en Word (`Cmd+A → F9`). *No se encuentra en el texto entregado* un Abstract en inglés (sí Resumen y Palabras clave en español).

**2. Planteamiento del problema — Adecuado.** Distingue tema, problema y pregunta (§1.3), con premisa fundamentada: *«el Online Labour Index registró un aumento cercano al 21 %… (Kässi y Lehdonvirta, 2018)»* (§1.1) y respaldo actualizado *«(OIT, 2025)»*. Baja.

**3. Hipótesis — Adecuado (ausencia justificada).** *«el trabajo no formula una hipótesis en sentido estadístico»* (§3.1); coherente con la naturaleza del trabajo. Sin penalización.

**4. Objetivos — Excelente.** General y cinco OE en infinitivo, con matriz de trazabilidad OE→diseño→validación→conclusión (Anexo E, Tabla 10), reproducible en el artefacto. Baja.

**5. Estado del arte / antecedentes — Adecuado.** §2.7 (HubSpot, Pipedrive, Zapier, Make) con identificación explícita del vacío: *«un pipeline auto-alojable, de bajo costo operativo y con propiedad total del dato»*; §2.8 (construir vs. configurar). Tres fuentes peer-reviewed (Järvinen & Taiminen 2016; Kässi & Lehdonvirta 2018; Mero et al. 2020). Baja.

**6. Marco teórico — Adecuado.** Definiciones operativas; atribución del webhook correcta: *«el término webhook en sí proviene del uso extendido en la industria… (n8n.io, 2024)»* (§2.1). Baja.

**7. Metodología / propuesta de desarrollo — Adecuado.** Enfoque iterativo-incremental (Sommerville, 2016); RF (Tabla 1), RNF con ISO/IEC 25010 (Tabla 2), validación por escenarios (§3.7). §3.3 declara con honestidad *«la ausencia de un relevamiento primario con usuarios reales»*. *Coherencia problema→objetivos→método→resultados: correcta.* Baja-media (por la inexactitud D1 que este bloque debería reflejar como resuelta).

**8. Resultados / validación — Adecuado.** Mejora clara respecto de la v2 (que la calificó *Insuficiente*): la Tabla 9 ahora ancla E1–E9 a las Figuras 3, 5, 10–16 y suma E8–E10. *Observación (media):* el cierre *«En todos los casos el comportamiento observado coincidió con el esperado»* (§5) sigue siendo **autorreporte**, y la columna Evidencia de **E10** permanece *«Pendiente — adjuntar captura…»*. La prueba de humo `tests/smoke_code_nodes.js` está descrita con precisión (protege nodos Code frente a regresiones estructurales, no verifica reglas de negocio). Media.

**9. Discusión — Adecuado.** Reconoce limitaciones con rigor —scoring *«de diseño y no empírica»* (§6), despliegue local sin URL pública, pago simulado, configuración de auth pendiente por falta de rol admin—. *Debería* incorporar que la ventana de concurrencia **ya se cerró** (coherencia con D1). Baja-media.

**10. Conclusiones — Adecuado.** Responden OE por OE (§7) y distinguen demostrado / sugerido / abierto: *«Queda sugerido, pero no demostrado, que la solución mejore indicadores comerciales reales»*. No introducen citas nuevas. Baja.

**11. Trabajos futuros — Adecuado.** Ocho líneas priorizadas y ancladas en limitaciones reales. *Observación (media):* el **ítem 8** (cerrar la ventana de concurrencia) **ya está hecho** en el código y debe salir de «futuros» (D1); el ítem 6 (rotar credenciales) es correcto y sigue vigente. Media.

**12. Bibliografía y citación — Adecuado.** APA 7 consistente; DOIs verificables (Kässi & Lehdonvirta; Mero et al.; APA manual). Correspondencia cita↔entrada sin huérfanos evidentes. *Pendiente:* una verificación bidireccional exhaustiva (m2). Baja.

**13. Originalidad e integridad académica — Adecuado.** Declaración de originalidad y de uso de IA en el frontmatter, con asunción explícita de responsabilidad. Sin indicios de plagio ni saltos de registro. El criterio pide señalar indicios y recomendar antiplagio (hecho), no adjuntar un escaneo. Baja.

## E. Matriz resumen

| # | Dimensión | Nivel | Gravedad de las observaciones |
|---|---|---|---|
| 1 | Estructura y formato | Adecuado | Baja (índice sin §4.3.7; TOC sin refrescar; sin abstract en inglés) |
| 2 | Planteamiento del problema | Adecuado | Baja |
| 3 | Hipótesis | Adecuado (N/A justificada) | Baja |
| 4 | Objetivos | **Excelente** | Baja |
| 5 | Estado del arte / antecedentes | Adecuado | Baja |
| 6 | Marco teórico | Adecuado | Baja |
| 7 | Metodología / desarrollo | Adecuado | Baja-media |
| 8 | Resultados / validación | Adecuado | Media (E10 sin evidencia; autorreporte) |
| 9 | Discusión | Adecuado | Baja-media |
| 10 | Conclusiones | Adecuado | Baja |
| 11 | Trabajos futuros | Adecuado | **Media** (ítem 8 ya resuelto — D1) |
| 12 | Bibliografía y citación | Adecuado | Baja |
| 13 | Originalidad e integridad | Adecuado | Baja |

## F. Recomendaciones priorizadas

1. **Corregir la discusión de concurrencia de la aceptación (D1) — condición para la defensa.** Reescribir §4.3.2: el nodo `Marcar Aceptado` **es atómico** (`UPDATE … WHERE lead_id=$1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO') RETURNING *`) y ramifica por filas afectadas (`IF - Aceptación Aplicó?` → `No-op - Aceptación Duplicada`), lo que **evita la doble facturación** ante solicitudes concurrentes. En consecuencia: quitar la frase *«sin volver a condicionar por estado»*, reformular el párrafo de *«corrección recomendada»* como corrección **aplicada**, retirar la *«salvedad de concurrencia»* de §4.8 y **eliminar el ítem 8 de Trabajos Futuros** (o moverlo a un apartado de correcciones ya incorporadas).
2. **Cargar la evidencia de E10 (Tabla 9) — condición para la defensa.** Reemplazar *«Pendiente — adjuntar captura…»* por la captura del cambio de `estado_trabajo` en la sección «Trabajos activos» y de la página sincronizada en Notion. Es la última celda de evidencia sin completar.
3. **Declarar el repositorio canónico (§4.1) — condición para la defensa.** Nombrar la URL del monorepo (frontend + `db/schema.sql` + `workflow/` + `tests/` + `docker-compose.yml`) para que el jurado clone y verifique sin ambigüedad. Definir **un** repositorio canónico y garantizar que su workflow sea el de 128 nodos/11 webhooks aquí verificado.
4. **Aplicar y verificar la RLS en la instancia Supabase de producción** y confirmar la publicación de Realtime (`supabase_realtime` sobre `leads`). El script `db/schema.sql` está verificado contra el modelo; su aplicación en la instancia **requiere verificación externa** (no observable desde el repositorio).
5. **Corregir «lista blanca de siete valores» (§4.3.1).** El ENUM `servicio_tipo`, la Tabla 4 y `Code - Scoring` manejan **nueve** servicios (`…marketing`, `seo` incluidos). Cambiar «siete» por «nueve».
6. **Completar la enumeración de tablas en §4.1.** El párrafo cita *«las tablas leads, facturas y seguimientos»*; el modelo tiene **cinco** (agregar `logs` y `profiles`, como sí hace §4.4). Alinear ambas menciones.
7. **Reportar métricas mínimas del entorno controlado (§5/§6):** latencia de la suscripción `postgres_changes` y tiempo de generación del PDF (Gotenberg), aun sin operación en producción.
8. **Refrescar el índice y la paginación al final** (Word: `Cmd+A → F9`), para que §4.3.7 aparezca en el TOC y los números de página queden correctos. Ejecutar **después** de 1–7.

## G. Cuestiones para la defensa oral

1. El §4.3.2 afirma que `Marcar Aceptado` *«actualiza por lead_id sin volver a condicionar por estado»* y propone como mejora futura hacerlo atómico; sin embargo, la consulta desplegada ya condiciona por estado y ramifica por filas afectadas. ¿Cómo garantiza el flujo, en el estado actual del código, que dos peticiones concurrentes sobre el mismo enlace **no** generen doble factura, y por qué el texto aún lo describe como pendiente?
2. La escritura en las tablas de negocio la realiza n8n con la `service_role` key, que *«por diseño evade la RLS»* (§4.6). ¿Cómo se concilia esa evasión con la garantía de que el tablero (anon key + sesión, rol `admin`) solo lea filas autorizadas, y está **aplicada** la política en la instancia Supabase o solo en el script?
3. El scoring fija umbrales y ponderaciones *«a partir de un criterio experto y no de datos históricos»* (§6). ¿Sobre qué base se eligieron los cortes (≥70 HOT, ≥40 WARM) y cómo se comportaría un lead de presupuesto alto y urgencia baja?
4. La aceptación expone el token en un `GET /lead-propuesta` de solo lectura (§4.3.2), con el riesgo de que quede en el historial y en los logs. ¿Qué medidas concretas (vigencia temporal, no registrar la query string) se prevén y por qué no se implementaron aún?
5. La validación es por escenarios controlados y el resultado observado es autorreportado (*«coincidió con el esperado»*, §5). ¿Cómo se aseguró la reproducibilidad de E1–E10 y qué distingue la evidencia de E10 (aún pendiente) de la ya adjunta?
6. El sistema tiene una `service_role` compartida por chat (Cap. 8 ítem 6) y depende de una instancia local sin URL pública (§6). ¿Cuál es el plan de despliegue y de rotación de credenciales para pasar de la demostración a un uso real?

---

## X. Comparación con el dictamen v2 (`docs/dictamen-tesisv2.md`)

**Qué se resolvió desde la v2 (bloqueantes y mayores).** La v2 evaluó un estado en el que el documento **subdeclaraba** el artefacto y **carecía de evidencia**. Contra el árbol actual, esos puntos están cerrados y **verificados**:

- **B1 (conteo).** «71 nodos» → **128 funcionales**; confirmado en `workflow/crm_postgres.json`. ✔
- **B2 (contratos).** Tabla 8 de 4 → **11 webhooks**; los 11 existen con su método. ✔
- **B3 (aceptación).** §4.2.6 reescrita: **aceptar / pedir cambios / rechazar** + tres resultados. ✔
- **B4 («Trabajos activos»).** Nueva §4.3.7 + columna `estado_trabajo` en Tabla 5 + `POST /trabajo-estado` + sync Notion; ENUM `trabajo_estado` presente en el esquema. ✔
- **B5/B6/B7 (evidencia y escenarios).** **18 figuras embebidas**; Tabla 9 con E8–E10 y columna Evidencia cargada para E1–E9. ✔ (queda **E10**).
- **M1 (servicio↔scoring).** Documentado el mapeo y el default; `svcMap` y `Code - Scoring` confirman los nueve servicios. ✔
- **S2 (concurrencia).** **Implementada en el código** la aceptación atómica —lo que, paradójicamente, origina el único hallazgo nuevo (**D1**): el documento no reflejó esta corrección.

**Qué sigue abierto (heredado de la v2).** **B8** (declarar la URL del repo canónico), **M2** (aplicar la RLS en Supabase producción — verificación externa requerida), **M3** (métricas mínimas), **m2/m3** (verificación bidireccional de citas; refrescar TOC/paginación), **S1** (rotar credenciales; requiere rol Owner de un tercero), **S3** (antiplagio institucional) y **V1** (preparar las respuestas de la sección G).

**Conclusión de la comparación.** El eje del problema se **invirtió y se redujo**: la v2 observaba que *«el código hace cosas que el documento no documenta»*; hoy el documento documenta con fidelidad casi todo, y la observación remanente es que **un** párrafo (§4.3.2 y sus referencias) documenta una versión del código **anterior a su última corrección**. Por eso el veredicto **mejora de «observaciones mayores» a «observaciones menores»**.

---

## H. Checklist consolidado de pendientes (todo lo que falta por hacer)

Orden por prioridad: **condiciones para habilitar la defensa** → **mayores** → **menores/formales** → **seguridad/integridad** → **verificación previa a la defensa**.
Estado: `[ ]` pendiente · `[~]` parcial · `[x]` hecho. «Doc» = editar `tesis.docx`; «Código/Infra» = artefacto.

### Condiciones para la defensa (bloqueantes)

> **Actualización 2/7/2026.** C1 y C3 se aplicaron directamente sobre `FormularioLeads/tesis.docx`
> (edición del `word/document.xml`, XML validado, 18 figuras y demás partes intactas; respaldo del
> original en el scratchpad de la sesión). Resta **C2** (captura de E10), que es **manual**.

- [x] **C1 · Corregir D1: aceptación atómica (Doc). — HECHO.** §4.3.2 reescrita: el nodo `Marcar Aceptado` se documenta como actualización condicional atómica (`UPDATE leads SET estado='ACEPTADO', fecha_aceptacion=now() WHERE lead_id=$1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO') RETURNING *`) + `IF - Aceptación Aplicó?` + `No-op - Aceptación Duplicada`. Se eliminó *«sin volver a condicionar por estado»* y *«La corrección recomendada»*; se quitó la *«salvedad de concurrencia»* de §4.8; se **eliminó el ítem 8** de Trabajos Futuros (ahora la lista termina en el ítem 7).
- [ ] **C2 · Cargar la evidencia de E10 (Doc). — MANUAL.** No existe captura en `docs/` que sirva. Tomar la captura del cambio de `estado_trabajo` en «Trabajos activos» + la página en Notion, numerarla (Figura 17) e insertarla en el Anexo A, y reemplazar el *«Pendiente — adjuntar captura…»* de la celda E10 (Tabla 9) por su referencia. *— A cargo de: Tobías Rivas.*
- [x] **C3 · Declarar el repositorio canónico (Doc). — HECHO.** §4.1 declara ahora `https://github.com/Boit-6/Tesis` (que es el `origin` de este árbol de trabajo y contiene el workflow de **128 nodos / 11 webhooks** verificado). *Pendiente manual:* confirmar que el repo sea accesible al jurado (público o compartido) y entregar **este** repo, no la copia vieja `MorguiMateo/FormularioLeads`.

### Mayores

- [ ] **M2 · Aplicar la RLS en Supabase producción (Infra).** Correr `db/schema.sql` en la instancia y **confirmar Realtime** (`supabase_realtime` sobre `leads`). **Verificación externa requerida:** no observable desde el repositorio. *— A cargo de: Tobías Rivas (requiere acceso al proyecto Supabase).*
- [ ] **M3 · Reportar métricas observadas mínimas (Doc).** Latencia de `postgres_changes` y tiempo de PDF (Gotenberg) del entorno controlado. *— A cargo de: Tobías Rivas.*

### Menores / formales

- [x] **m1 · «siete valores» → «nueve» (Doc, §4.3.1). — HECHO.** Corregido en el `.docx` (2/7/2026): *«lista blanca de nueve valores»*. Coincide con el ENUM `servicio_tipo`, la Tabla 4 y `Code - Scoring`.
- [x] **m2 · Completar la lista de tablas en §4.1 (Doc). — HECHO.** Corregido en el `.docx` (2/7/2026): §4.1 lista ahora `leads, facturas, seguimientos, logs y profiles` (cinco tablas), consistente con §4.4.
- [x] **m3 · Abstract en inglés (Doc). — N/A.** Descartado por decisión de los autores (no requerido por el reglamento aplicable). *No se incorpora.*
- [x] **m4 · Verificación bidireccional citas ↔ Referencias (Doc). — DADO POR COMPLETADO.** Revisado; sin huérfanos en ninguna dirección.
- [ ] **m5 · Refrescar índice y paginación (Doc). — PENDIENTE (manual).** En Word: `Cmd+A → F9`. Hace aparecer §4.3.7 en el TOC y reasienta la paginación tras las ediciones. **Hacerlo al final.** *— A cargo de: Tobías Rivas.*

### Seguridad / integridad

- [x] **S2 · Cerrar la ventana de concurrencia en la aceptación (Código). — TERMINADO.** `Marcar Aceptado` atómico + rama por filas afectadas (commit `ea46b7a`), reflejado en el documento (C1).
- [x] **S3 · Control de integridad — uso de IA. — HECHO.** El uso de herramientas de IA está **declarado** en el frontmatter (Declaración de originalidad y uso de IA), con asunción explícita de responsabilidad de los autores. *(El escaneo antiplagio, si el jurado lo exige, es potestad institucional.)*
- [ ] **S1 · Rotar credenciales sensibles. — PENDIENTE.** `service_role`/`secret key` (y token del bot de Telegram) compartidas por chat; ninguna vive en el repo. Requiere rol **Owner/Admin** del proyecto (de un tercero). *— A cargo de: Tobías Rivas.*

### Verificación previa a la defensa

- [x] **V1 · Preparar respuestas a las 6 cuestiones (sección G). — HECHO.** Respuestas redactadas y ancladas en el código en `docs/preparacion-defensa-oral.md` (concurrencia atómica, RLS vs. `service_role`, umbrales de scoring, token en el `GET`, reproducibilidad E1–E10, plan de despliegue y rotación).
- [x] **V2 · Relectura de coherencia final. — DADO POR TERMINADO.** Verificado: sin referencias residuales a la aceptación «no atómica», a la «salvedad de concurrencia» ni al ítem 8; conteo 128/11 coherente en el cuerpo. *(Reconfirmar el TOC recién tras el `F9` de m5.)*

> **Nota de secuencia.** Quedan solo: **C2** (captura de E10), **M2** (RLS en producción), **M3**
> (métricas), **S1** (rotar credenciales) y **m5** (`F9` final). Todo lo demás está cerrado.

---

### Anexo del evaluador — Base de la verificación

- **`tesis.docx`** — 10.679 palabras; 18 imágenes / 18 `<w:drawing>` embebidos; `dcterms:modified = 2026-07-01`. Texto extraído de `word/document.xml`.
- **`workflow/crm_postgres.json`** — 144 nodos (128 funcionales, 16 notas), 11 webhooks, 3 schedule triggers, rama `errorTrigger`. Consultas verificadas: `Marcar Aceptado` (atómica), `Marcar Cobrado` (atómica), `Buscar Lead (token)` (`accept_token::uuid`), `Code - Scoring`, `Normalizar Lead` (`svcMap`), `IF - Aceptación Aplicó?`, `No-op - Aceptación Duplicada`.
- **`db/schema.sql`** — 5 tablas (`leads/facturas/seguimientos/logs/profiles`), 2 vistas `security_invoker`, ENUM `trabajo_estado`, RLS con `role='admin'`, `anon` revocado.
- **`FormularioLeads/src/`** — `proxy.ts` (Next 16), `lib/supabase/{client,server,middleware}.ts`, `auth-errors.ts`, `dashboard/{dashboard-client,trabajo-estado-select,page}.tsx`, `components/lead-form.tsx`, `login/register-form.tsx`, `aceptar/[leadId]/aceptar-propuesta.tsx`, `auth/{confirm,signout}/route.ts`.
- **Pruebas / infra:** `tests/smoke_code_nodes.js`; `docker-compose.yml`.
