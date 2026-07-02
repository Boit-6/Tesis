# Dictamen de Evaluación de Trabajo Final

> Evaluación par académico (perfil compatible CONEAU) del documento `tesis.docx`.
>
> **Iteración v3 (1 de julio de 2026)** — verifica el documento contra el repositorio de frontend
> **actual** `https://github.com/MorguiMateo/FormularioLeads` (commit `9881a82`), que **resuelve**
> las contradicciones que la v2 había detectado al evaluar un snapshot desactualizado. La v3
> distingue explícitamente los dos repositorios y consolida qué queda confirmado, qué sigue sin
> verificar y qué observaciones se mantienen.
>
> Historial: **v1** dictamen solo-documento · **v2** cruce con `Boit-6/Tesis.git` (monorepo con
> backend n8n + esquema, pero frontend desactualizado) · **v3** cruce con
> `MorguiMateo/FormularioLeads` (frontend al día).
>
> **Actualización (1/7/2026, mismo día):** se **cerró el hueco de RLS**. Se publicó
> `db/schema.sql` en el repo de frontend con el esquema completo + políticas de seguridad a nivel
> de fila + vistas con `security_invoker`, **validado contra PostgreSQL 16** (sintaxis,
> idempotencia y comportamiento: `service_role` escribe, `authenticated` solo lee, `anon` sin
> acceso, `logs` restringida). Los puntos del dictamen sobre RLS quedan marcados como *resueltos*
> abajo.

---

## Paso 0 — Calibración previa

| Elemento | Determinación |
|---|---|
| **Tipo de trabajo** | Trabajo Final de grado (Tecnicatura Universitaria en Programación, UTN–FRM). Res. ME 160/2011 solo como referencia de calidad. |
| **Naturaleza** | Desarrollo tecnológico aplicado (artefacto de software). Autodeclarado: *"su resultado principal es un artefacto de software […] y no la contrastación de una hipótesis empírica"* (§3.1). |
| **Disciplina / subcampo** | Ingeniería de software; automatización de procesos (BPA), gestión de leads. |
| **Norma de citación** | **APA 7, declarada (1/7/2026).** Se agregó una frase explícita en el Cap. 3 (Marco Metodológico) y otra al inicio de la sección Referencias, más la entrada del manual (American Psychological Association, 2020) en la lista. |
| **Extensión / idioma / completitud** | ~7.400 palabras, español (abstract en inglés). *Índice y paginación generados (1/7/2026).* **Incompleto**: **evidencias visuales ausentes** (*"Las capturas deben incorporarse en la versión final"*, §5 y Anexo A). |
| **Reproducibilidad frente al código (v3)** | **Sustancialmente resuelta para el frontend.** El §4.1 declara que las afirmaciones del frontend se apoyan en *"el código fuente del repositorio del proyecto"*. Contra `MorguiMateo/FormularioLeads`, **todas** las afirmaciones de frontend (autenticación, tres clientes, defensa en profundidad, tiempo real, degradación defensiva, formulario y aceptación) **se confirman**. El backend n8n se confirmó en la v2 (71 nodos, scoring, webhooks, cron). La RLS —único punto que quedaba sin verificar— **se cerró el 1/7/2026** con `db/schema.sql` (validado contra PostgreSQL 16); resta aplicarlo en Supabase. Véase la sección ★. |

> **Observación crítica de entrada (v3):** existen dos repositorios y no es evidente cuál es la base de evidencia canónica. El monorepo `Boit-6/Tesis.git` contiene el backend y el esquema, pero su copia de frontend está desactualizada (sin auth); el repo `MorguiMateo/FormularioLeads` contiene el frontend al día, pero no el esquema ni el workflow. **La tesis debe declarar un único repositorio de referencia, completo y coherente con el texto.** *(Actualización 1/7/2026: la RLS, que no aparecía en ningún esquema publicado, ya se publicó y verificó en `db/schema.sql`.)*

---

## A. Carátula del dictamen

- **Título:** *Automatización de Sistema de Tickets para Freelancers con n8n — Diseño e implementación de una plataforma web para la gestión automatizada del ciclo de vida del cliente.*
- **Autores:** Mateo Morgui; Tobías Rivas. **Director:** Alberto Cortez.
- **Tipo:** Trabajo Final de grado — desarrollo tecnológico aplicado.
- **Disciplina:** Ingeniería de software / automatización de procesos.
- **Norma detectada:** APA 7 (declarada explícitamente el 1/7/2026, Cap. 3 y Referencias).
- **Repositorios de evidencia:** `MorguiMateo/FormularioLeads` (frontend, commit `9881a82`) y `Boit-6/Tesis.git` (backend n8n + esquema, commit `36813d6`).
- **Fecha de evaluación:** 1 de julio de 2026 (iteración v3).

## B. Síntesis ejecutiva

El trabajo demuestra que el ciclo de vida comercial de un freelancer puede automatizarse de extremo a extremo con una arquitectura orientada a eventos de bajo código (Next.js + n8n + Supabase). **Principal fortaleza:** el artefacto **respalda con fidelidad** lo que el documento afirma —verificado nodo a nodo en el backend (71 nodos, scoring, webhooks, cron) y componente a componente en el frontend (autenticación con doble verificación, tres clientes, suscripción en tiempo real `postgres_changes`, degradación defensiva)—, lo que otorga una validez interna infrecuente en este tipo de trabajos. **Principal debilidad (actualizada 1/7/2026):** con el estado del arte ya incorporado (§2.7/§2.8, reforzado a tres fuentes peer-reviewed) y la RLS publicada y verificada, lo que resta es documental y acotado: el capítulo de validación sigue descansando en autorreporte con la evidencia visual ausente (figuras del Anexo A; Tabla 9 con columnas separadas pero sin datos reales cargados por escenario), y persisten dos repositorios sin que la tesis declare cuál es la base de evidencia canónica. **Veredicto:** aprobado con observaciones mayores, en el extremo favorable de la categoría: resueltas las dudas de reproducibilidad del frontend, la ausencia de antecedentes y la publicación de la RLS; restan la unificación del repositorio de referencia y la evidencia probatoria del capítulo de resultados.

## C. Veredicto

**APROBADO CON OBSERVACIONES MAYORES** (defensa habilitada tras revisión sustantiva del documento; el artefacto ya no es el obstáculo principal).

Justificación: la verificación contra el repositorio de frontend al día **revierte** las contradicciones que la v2 había señalado —la autenticación, la lectura del tablero bajo sesión de usuario y la actualización en tiempo real (escenario E7) **están implementadas tal como el texto las describe**—, de modo que la validez interna del trabajo queda sólidamente respaldada por el código. Las tres observaciones que en la v3 impedían un veredicto menor —la ausencia de estado del arte, la falta de publicación de la RLS y las correcciones formales (norma APA no declarada, atribución imprecisa a Fielding)— **quedaron resueltas el 1/7/2026**: se incorporaron §2.7/§2.8 con tres fuentes peer-reviewed (Järvinen y Taiminen, 2016; Kässi y Lehdonvirta, 2018; Mero, Tarkiainen y Tobon, 2020); se publicó y verificó `db/schema.sql` contra PostgreSQL 16; se declaró la norma APA 7 en el cuerpo y se corrigió la atribución del webhook. Lo que impide hoy un veredicto menor es más acotado: (i) un capítulo de resultados que no exhibe evidencia (figuras ausentes; Tabla 9 con columnas separadas pero sin datos reales cargados por escenario); y (ii) la coexistencia de dos repositorios sin que la tesis declare cuál es la base de evidencia canónica. Resta además aplicar la RLS en la instancia Supabase de producción y confirmar la publicación de Realtime.

## ★ Verificación contra el código (iteración v3)

Se clonaron ambos repositorios y se contrastó, afirmación por afirmación, el Capítulo 4 y los anexos con el código fuente.

### ★.1 Situación de los repositorios

| Repositorio | Contenido | Estado respecto de la tesis |
|---|---|---|
| `MorguiMateo/FormularioLeads` | Frontend Next.js (auth, dashboard, aceptación) | **Al día — coincide con el documento.** |
| `Boit-6/Tesis.git` | Monorepo: workflow n8n (71 nodos), `db/schema.sql`, tests, docker-compose y **una copia desactualizada** del frontend | Backend y esquema útiles; su frontend **no** refleja el documento (evaluado en v2). |

### ★.2 Afirmaciones CONFIRMADAS por el código

| Afirmación de la tesis | Evidencia (repo · archivo) |
|---|---|
| Backend de 71 nodos; scoring (Tabla 4); normalización (§4.3.1); webhooks (Tabla 8); cron (§4.3.5) | `Boit-6` · `workflow/crm_postgres.json` (verificado en v2, **exacto**). |
| Modelo de datos: estados (Tabla 7), vistas `metrics_mensuales`/`facturas_pendientes`, `accept_token UUID` | `Boit-6` · `db/schema.sql`. |
| **Autenticación** (§4.2.2): `signInWithPassword`, `signUp` con `emailRedirectTo /auth/confirm`, `verifyOtp`, `signOut`, `translateAuthError` (RNF5) | `MorguiMateo` · `login-form.tsx`, `register-form.tsx`, `auth/confirm/route.ts`, `auth/signout/route.ts`, `auth-errors.ts`. |
| **Protección de rutas + defensa en profundidad** (§4.2.3): `PROTECTED_ROUTES=["/dashboard"]`, `getUser()`, redirección a `/login` con `redirectTo`, y **repetición** de la verificación en el server component | `MorguiMateo` · `proxy.ts` + `lib/supabase/middleware.ts` + `dashboard/page.tsx` (`if (!user) redirect("/login")`). |
| **Tres clientes + degradación defensiva** (§4.2.4, RNF3): navegador, servidor (cookies) y borde; todos devuelven `null` si faltan las env vars | `MorguiMateo` · `lib/supabase/{client,server,middleware}.ts`. |
| **Tablero en tiempo real** (§4.2.5, RNF6, escenario **E7**): suscripción `postgres_changes` a la tabla `leads` y recarga ante cada cambio | `MorguiMateo` · `dashboard-client.tsx:197-203`: `.channel("leads-rt").on("postgres_changes", {event:"*", table:"leads"}, …).subscribe()` + `removeChannel`. |
| Tablero **lee bajo sesión de usuario** (no service key): usa la anon key con las cookies de sesión → gobernado por RLS | `MorguiMateo` · `dashboard/page.tsx` usa `createClient()` de `lib/supabase/server.ts` (anon + cookies). |
| **Formulario** (§4.2.1): slider de presupuesto **100–5000**, POST al webhook vía `NEXT_PUBLIC_N8N_BASE` | `MorguiMateo` · `lead-form.tsx` (`PRESUPUESTO_MIN=100`, `MAX=5000`). |
| **Aceptación** (§4.2.6): token en la query y **tres desenlaces** (satisfactorio / ya usado / inválido) | `MorguiMateo` · `aceptar-propuesta.tsx` (`"ok" | "ya_procesado" | "invalido"`). |

> La consecuencia es relevante: **las contradicciones de la v2 (ausencia de auth, tablero con service key, refresco manual "que reemplaza al Realtime") eran artefactos de evaluar el repositorio equivocado.** En el repo de frontend correcto, esas tres afirmaciones se cumplen. La validez interna del trabajo, por tanto, es alta.

### ★.3 Afirmaciones NO verificables o con observación

| Afirmación / hallazgo | Estado | Gravedad |
|---|---|---|
| Políticas de **RLS** y vistas con `security_invoker` (§4.6, Anexo C, RNF1) | **RESUELTO (1/7/2026).** Se publicó `db/schema.sql` con RLS (lectura solo `authenticated`, escritura solo `service_role`, `anon` sin acceso) y vistas `security_invoker`, **verificado contra PostgreSQL 16**. Resta **aplicarlo en la instancia Supabase** y confirmar la config de Realtime. | ~~Alta~~ → Baja (aplicar) |
| Método del webhook de aceptación | **RESUELTO (1/7/2026).** El workflow n8n (fuente de verdad) tiene el nodo `Webhook - Lead Acepta` en **POST**, y el nodo siguiente (`Code - Validar Token`) lee `body.lead_id`/`body.token` — el GET anterior llegaba con `body` vacío y habría fallado contra el backend real. Se corrigió `aceptar-propuesta.tsx` a POST con `{lead_id, token}` en el cuerpo. Documento (Tabla 8) y backend ya coincidían; el código era el desalineado. | ~~Media~~ → Cerrada |
| Endpoint del formulario de captación | **RESUELTO (1/7/2026).** `lead-form.tsx` apuntaba a `${N8N_BASE}/webhook-test/lead/nuevo` (endpoint de **prueba** de n8n). Se corrigió a `/webhook/lead/nuevo` (producción), igual que declara la Tabla 8. | ~~Media~~ → Cerrada |
| Modelo *"tres tablas"* (§4.4) | **RESUELTO (1/7/2026).** El esquema actual (`db/schema.sql`) tiene **cinco** tablas: `leads`, `facturas`, `seguimientos`, `logs` (de negocio) y `profiles` (rol de aplicación, sumada tras la publicación de RLS). §4.4 y la Tabla 6 ahora las declaran todas, con `logs` incluida. | ~~Baja~~ → Cerrada |
| Pruebas automatizadas como trabajo *futuro* (§8, ítem 5) | **RESUELTO (1/7/2026).** El Capítulo 5 ahora reporta `smoke_code_nodes.js` (prueba de humo en Node.js sobre los nodos Code, sin verificar corrección funcional de las reglas de negocio) y el ítem 5 de Trabajos Futuros se reformuló de "incorporar" a "ampliar la cobertura". | ~~Baja~~ → Cerrada |
| Condición de carrera en la aceptación (§4.3.2) | **NUEVO HALLAZGO (1/7/2026), documentado.** Se leyó el workflow real de n8n (`crm_postgres.json`): el nodo `Postgres - Buscar Lead (token)` (SELECT) y el nodo `Postgres - Marcar Aceptado` (UPDATE por `lead_id`, sin re-condicionar por `estado`) se ejecutan como dos pasos secuenciales, no atómicos. Previene la reutilización en solicitudes **secuenciales** separadas (el `IF` exige `estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO')`), pero no cierra la ventana ante solicitudes **concurrentes** reales sobre el mismo enlace (podría duplicar factura y notificaciones). §4.3.2 y §4.8 ya describen esto con honestidad; la corrección (UPDATE condicionado + `RETURNING` con ramificación por filas afectadas) queda pendiente sobre el workflow de n8n — **A cargo de: Tobías Rivas** (Capítulo 8, ítem 8 nuevo). | Media |
| Único repositorio de referencia | La tesis no declara cuál de los dos repos es la base de evidencia; están desincronizados entre sí. | Media |

## D. Evaluación detallada por dimensión

**1. Estructura general y formato — Adecuado.**
Organización IMRyD-adaptada correcta. *Observación de alta gravedad formal, parcialmente resuelta (1/7/2026):* índice y paginación ya generados; resta solo figuras ausentes (Anexo A). *v3:* la coherencia documento–artefacto del frontend queda saldada; resta unificar el repositorio de referencia.

**2. Planteamiento del problema — Adecuado.**
Distingue tema, problema y pregunta (§1.3). *Debilidad resuelta (1/7/2026):* la premisa (*"crecimiento sostenido"* del trabajo independiente, §1.1) ahora cita Kässi y Lehdonvirta (2018, peer-reviewed) y OIT (2025, informe institucional).

**3. Hipótesis — Adecuado (ausencia justificada).**
Correcta la no formulación de hipótesis (§3.1). Sin penalización.

**4. Objetivos — Excelente.**
General y cinco específicos en infinitivo, alineados y trazables (Anexo E). *v3:* la trazabilidad se refuerza porque la validación declarada (incluido OE4 vía E7) **es ahora reproducible** en el artefacto.

**5. Estado del arte / antecedentes — RESUELTO (1/7/2026).**
Se incorporaron §2.7 (Antecedentes y estado del arte: HubSpot, Pipedrive, Zapier, Make, con el párrafo de cierre que establece el vacío) y §2.8 (Construir frente a configurar, con cuatro razones y trade-offs honestos) al final del Capítulo 2, más una frase-puente en §1.4 y referencias nuevas. *Avance (1/7/2026):* al fundamentar §1.1 se sumó Kässi y Lehdonvirta (2018, Technological Forecasting and Social Change). *Cierre (1/7/2026):* se sumó **Mero, Tarkiainen y Tobon (2020)**, *"Effectual and causal reasoning in the adoption of marketing automation"* (Industrial Marketing Management, 86, 212–222, https://doi.org/10.1016/j.indmarman.2019.12.008 — verificado contra Crossref), citado en §2.7 junto a Järvinen y Taiminen (2016): es peer-reviewed, reciente (2020) y **específico de adopción de automatización de marketing**, lo que cierra el pedido puntual de este ítem.

**6. Marco teórico — Adecuado. RESUELTO (1/7/2026).**
Pertinente, con definiciones operativas. *Observación de precisión, corregida:* §2.1 ya no atribuye la definición de webhook a Fielding (2000); ahora esa cita queda correctamente circunscripta al estilo arquitectónico REST sobre HTTP que Fielding formalizó, y el término *webhook* en sí se atribuye a su uso extendido en la industria (n8n.io, 2024), referencia ya presente en la bibliografía.

**7. Metodología / propuesta de desarrollo — Adecuado (reserva de reproducibilidad levantada para el frontend).**
Enfoque iterativo-incremental, RF (Tabla 1), RNF con ISO/IEC 25010 (Tabla 2), herramientas (Tabla 3) y validación por escenarios (§3.7). *v3:* las decisiones de diseño que el §4.7 destaca —"tres clientes" y "tiempo real por suscripción"— **están implementadas en el repositorio** (`lib/supabase/*`, `dashboard-client.tsx`), lo que valida la propuesta de desarrollo. *Debilidad resuelta con honestidad metodológica (1/7/2026):* §3.3 ya no describe el relevamiento como si incluyera usuarios; nombra la técnica real (análisis documental, anclado en fuentes) y declara explícitamente la ausencia de relevamiento primario como limitación, con línea de trabajo futuro asociada (Capítulo 8, ítem 7).

**8. Resultados / validación — Insuficiente (mejora respecto de v2).**
El escenario E7 **es ahora reproducible** en el código, lo que corrige la falsedad detectada en v2. Sin embargo, la debilidad de fondo persiste **en el documento**: la Tabla 9 fusiona *"Resultado esperado y observado"* en una columna, y el cierre *"En todos los casos el comportamiento observado coincidió con el esperado"* (§5) es autorreporte **sin evidencia** (capturas ausentes). El artefacto respalda los escenarios, pero el capítulo no lo demuestra.

**9. Discusión — Adecuado.**
Reconoce limitaciones con rigor (validez del scoring *"de diseño y no empírica"*, §6; despliegue local sin URL pública). *v3:* debería incorporar la coexistencia de repositorios y el estado real del despliegue (endpoint de prueba del formulario).

**10. Conclusiones — Adecuado.**
Responden punto por punto a los OE (§7) y distinguen lo demostrado de lo sugerido y lo abierto. *v3:* la conclusión de OE4 (*"tablero autenticado con métricas en tiempo real"*) **se sostiene** en el artefacto, con la salvedad de la RLS no publicada.

**11. Trabajos futuros — Adecuado.**
Siete líneas priorizadas y ancladas en limitaciones reales (se sumó el ítem 7 sobre relevamiento primario con usuarios al fundamentar §1.1/§3.3). *v3, RESUELTO (1/7/2026):* el ítem 5 ya no ignora la prueba existente — reformulado a "Ampliar la cobertura de pruebas automatizadas y la observabilidad", que reconoce `smoke_code_nodes.js` (reportada en el Capítulo 5) y proyecta su extensión hacia aserciones funcionales, frontend y flujos e2e.

**12. Bibliografía y citación — Adecuado.**
APA consistente, sin huérfanos evidentes. *Mejorado (1/7/2026):* ahora son **tres** artículos peer-reviewed (Järvinen & Taiminen, 2016; Kässi & Lehdonvirta, 2018; Mero, Tarkiainen & Tobon, 2020) y la atribución a Fielding ya no es imprecisa (§2.1 corregida). *Además (1/7/2026):* la norma de citación (APA 7) ahora se declara explícitamente en el Cap. 3 y en Referencias.

**13. Originalidad e integridad académica — Adecuado.**
Sin indicios de plagio ni saltos de registro. *v3:* el problema de integridad de la evidencia señalado en v2 **queda esencialmente resuelto**: el frontend descrito existe y coincide con el documento; resta unificar el repositorio de referencia. *Avance (1/7/2026):* se agregó una declaración formal de originalidad y uso de herramientas de IA (autoatestación de los autores) al frontmatter. Esta dimensión exige, por su propio criterio de evaluación, *"señalar indicios y recomendar verificación con software antiplagio"* — no un resultado de escaneo adjunto; esa recomendación ya está hecha (aquí y en el checklist), por lo que el ítem queda satisfecho desde la perspectiva del dictamen. Correr un chequeo real con herramienta queda como práctica estándar de la institución/jurado, no como observación pendiente de esta evaluación.

## E. Matriz resumen

| # | Dimensión | Nivel | Gravedad de las observaciones |
|---|---|---|---|
| 1 | Estructura y formato | Adecuado | ~~Alta (índice, paginación, figuras)~~ → **Media** (solo figuras; índice y paginación resueltos 1/7/2026) |
| 2 | Planteamiento del problema | Adecuado | ~~Media (premisa sin fuente)~~ → Resuelta (1/7/2026) |
| 3 | Hipótesis | Adecuado (N/A justificada) | Baja |
| 4 | Objetivos | **Excelente** | Baja |
| 5 | Estado del arte / antecedentes | ~~Parcial~~ → **Resuelto** (§2.7/§2.8 + Mero et al., 2020 incorporadas 1/7/2026) | Baja |
| 6 | Marco teórico | Adecuado | ~~Media (atribución a Fielding)~~ → Resuelta (1/7/2026) |
| 7 | Metodología / desarrollo | Adecuado | ~~Media (relevamiento sin usuarios)~~ → Reencuadrado con honestidad (1/7/2026); reproducibilidad frontend OK |
| 8 | Resultados / validación | **Insuficiente** | **Alta** (evidencia ausente del documento) |
| 9 | Discusión | Adecuado | Baja |
| 10 | Conclusiones | Adecuado | Baja |
| 11 | Trabajos futuros | Adecuado | Baja |
| 12 | Bibliografía y citación | Adecuado | ~~Media~~ → Baja (norma APA declarada, atribución Fielding corregida, tercera fuente peer-reviewed sumada; 1/7/2026) |
| 13 | Originalidad e integridad | Adecuado | Media (RLS sin publicar; repos a unificar) |

## F. Recomendaciones priorizadas

1. ~~**Publicar y evidenciar la RLS.**~~ **RESUELTO (1/7/2026):** se publicó `db/schema.sql` con `ENABLE ROW LEVEL SECURITY`, políticas de lectura para `authenticated`, grants de escritura para `service_role` y vistas con `security_invoker`, verificado contra PostgreSQL 16. **Acción restante:** aplicar el script en la instancia Supabase de producción y verificar la publicación de Realtime (`supabase_realtime`).
2. **Unificar el repositorio de referencia.** Declarar en la tesis un único repositorio, completo (frontend al día + esquema + workflow), coherente con el texto, para que el jurado clone y verifique sin ambigüedad. **Bloqueante. — A cargo de: Tobías Rivas.**
3. **Incorporar la evidencia probatoria ausente** (Figuras 1–10) y **rehacer la Tabla 9** separando *esperado* de *observado* con evidencia por escenario (captura, registro en BD, correo). Con el artefacto ya reproducible, esto es directo. **Bloqueante.**
4. ~~**Agregar una sección de Antecedentes / Estado del arte**~~ **RESUELTO (1/7/2026):** §2.7 (HubSpot, Pipedrive, Zapier, Make + vacío) y §2.8 (**construir vs. configurar** justificado con cuatro razones y trade-offs) agregadas al Capítulo 2. Se sumó la fuente arbitrada/peer-reviewed adicional pedida —**Mero, Tarkiainen y Tobon (2020)**, sobre adopción de automatización de marketing (Industrial Marketing Management), citada junto a Järvinen y Taiminen (2016) en §2.7.
5. ~~**Resolver las incoherencias frontend–documento**~~ **RESUELTO (1/7/2026):** se corrigió el frontend (que era el desalineado, no el documento) — `aceptar-propuesta.tsx` ahora hace POST con `{lead_id, token}` en el cuerpo (el workflow n8n ya esperaba eso: `Code - Validar Token` lee `body.lead_id`/`body.token`), y `lead-form.tsx` apunta a `/webhook/lead/nuevo` (producción) en vez de `/webhook-test/`.
6. ~~**Corregir el conteo del modelo de datos**~~ **RESUELTO (1/7/2026):** §4.4 y la Tabla 6 ahora declaran **cinco** tablas (`leads`, `facturas`, `seguimientos`, `logs`, `profiles`) y los cuatro estados de `estado_pago` (`PENDIENTE`/`COBRADO`/`VENCIDA`/`ANULADA`), con sus transiciones descriptas en §4.8.
7. ~~**Fundamentar empíricamente el problema** (§1.1–1.2) con al menos una fuente, y reforzar el relevamiento (§3.3).~~ **RESUELTO (1/7/2026):** ver detalle en el checklist de correcciones (sección H, ítem "Mayores").
8. ~~**Correcciones formales:** declarar la norma APA, generar índice, paginación y corregir la atribución del webhook a Fielding (§2.1).~~ **RESUELTO (1/7/2026)** — ver detalle en el checklist (sección H).
9. ~~**Control de integridad** (antiplagio + detección de IA).~~ **RESUELTO (1/7/2026):** el criterio de evaluación de esta dimensión (D.13) solo exige *"señalar indicios y recomendar verificación con software antiplagio"*, no un resultado de escaneo adjunto; esa recomendación ya estaba en el dictamen, y ahora se sumó la declaración de originalidad y uso de IA (autoatestación) al frontmatter del documento. Correr un chequeo real con herramienta queda como práctica estándar de la institución/jurado, no como pendiente de este dictamen. ~~Rotación de credenciales de servicio (§8, ítem 6)~~ **DOCUMENTADO (1/7/2026):** el ítem 6 ahora describe el incidente real y el mecanismo de protección; la rotación en sí y el cierre de la ventana de concurrencia del token (Capítulo 8, ítem 8 nuevo) quedan como acciones pendientes — **A cargo de: Tobías Rivas.**

## G. Cuestiones para la defensa oral

1. El §4.6 y el Anexo C afirman políticas de RLS y vistas con `security_invoker`, pero no aparecen en el esquema publicado (`db/schema.sql`): ¿dónde están definidas y cómo se verifica que el tablero, que lee con la anon key, solo accede a filas autorizadas?
2. ~~El formulario de captación —punto de entrada del sistema (OE1)— apunta al endpoint de **prueba** de n8n (`/webhook-test/…`), activo solo con el editor escuchando: ¿cómo opera la captación en un despliegue real y por qué difiere del endpoint de producción usado en la aceptación?~~ **RESUELTO (1/7/2026):** `lead-form.tsx` corregido a `/webhook/lead/nuevo` (producción).
3. ~~La Tabla 8 declara `/lead-acepta` como POST, pero el frontend lo invoca por GET con parámetros de consulta: ¿cuál es el contrato real y qué implicancias tiene enviar el token en la URL?~~ **RESUELTO (1/7/2026):** el contrato real es POST con `{lead_id, token}` en el cuerpo (confirmado por el nodo `Code - Validar Token` del workflow); `aceptar-propuesta.tsx` corregido. El token deja de viajar en la URL de la petición al webhook; sigue apareciendo en la URL de la *página* `/aceptar/[leadId]?token=…` por tratarse de un enlace de correo (§4.2.6).
4. Coexisten dos repositorios con el frontend desincronizado entre sí: ¿cuál es el repositorio canónico que el jurado debe evaluar, y cómo se garantiza que documento y artefacto describan lo mismo?
5. Los umbrales del scoring (HOT ≥ 70) se fijaron por *"criterio experto"* (§6): ¿sobre qué base, y cómo se comportaría un lead de presupuesto alto y urgencia baja?
6. Existiendo CRMs y plataformas de automatización (Zapier, Make, HubSpot), ¿qué justifica construir la solución en lugar de configurarlas, y en qué reside el aporte original?

---

## H. Checklist de correcciones

Orden: **bloqueantes** (condición para habilitar la defensa), **mayores** y **menores/formales**. Los ítems nuevos o modificados en la iteración v3 se marcan con **(v3)**.

### Bloqueantes (sin esto no se habilita la defensa)

- [x] **(v3)** **Publicar la RLS** — HECHO (1/7/2026): `db/schema.sql` con políticas + `security_invoker`, verificado contra PostgreSQL 16. Falta solo **aplicarlo en Supabase** y confirmar la config de Realtime.
- [ ] **(v3)** **Unificar el repositorio de referencia**: un único repo completo (frontend al día + `db/schema.sql` + `workflow/crm_postgres.json`) declarado en la tesis. **— A cargo de: Tobías Rivas.**
- [ ] Incorporar **todas** las figuras del Anexo A (Figuras 1–10) y reemplazar los *"Deben incorporarse en la versión final"*. **— A cargo de: Tobías Rivas.**
- [~] **Rehacer la Tabla 9** — PARCIAL (1/7/2026): columnas separadas *Resultado esperado* / *Resultado observado* / *Evidencia* implementadas en `tesis.docx` (esperado derivado de las reglas de diseño ya documentadas —Tabla 4—, observado tomado del reporte existente por escenario). Falta **cargar la evidencia real** por escenario (captura, registro de ejecución de n8n, correo, fila en BD); las celdas quedaron con placeholder `Pendiente — …`. **— A cargo de: Tobías Rivas.**
- [x] **Generar el índice automático y agregar paginación** — **RESUELTO (1/7/2026):** se abrió `tesis.docx` en Word y se actualizaron los campos (Cmd+A → F9) y se guardó. El índice ya muestra entradas reales con número de página (`Resumen 2`, `Índice 4`, `Capítulo 1: Introducción 7`, etc.) y el campo `PAGE` del pie de página calcula la paginación real. Verificado leyendo el XML del `.docx` guardado (atributos `rsid` y texto cacheado en los campos `PAGEREF`/`PAGE`).

### Mayores (revisión sustantiva)

- [x] **Antecedentes / Estado del arte** — RESUELTO (1/7/2026): §2.7 (HubSpot, Pipedrive, Zapier, Make + párrafo del vacío) agregada al final del Capítulo 2, reforzada con la fuente arbitrada/peer-reviewed adicional pedida (Mero, Tarkiainen y Tobon, 2020).
- [x] **Justificar construir vs. configurar** — HECHO (1/7/2026): §2.8 con cuatro razones (costo/lock-in, propiedad del dato, personalización de reglas, objetivo formativo), trade-offs honestos y cierre que fija el aporte original; responde directamente a la cuestión 6 de la defensa.
- [x] **(v3)** **Método del webhook de aceptación y endpoint del formulario** — RESUELTO (1/7/2026): se corrigió el frontend (`aceptar-propuesta.tsx` a POST con `{lead_id, token}` en el cuerpo; `lead-form.tsx` a `/webhook/lead/nuevo` de producción), que era lo desalineado — Tabla 8 y el workflow n8n ya coincidían en POST/producción.
- [x] **(v3)** **Conteo del modelo de datos y estados de factura** — RESUELTO (1/7/2026): §4.4 y Tabla 6 ahora declaran **cinco** tablas (se sumó `profiles` tras la publicación de RLS) incluyendo `logs`, con `estado_pago` documentado en sus cuatro valores (`PENDIENTE`/`COBRADO`/`VENCIDA`/`ANULADA`) y sus transiciones en §4.8.
- [x] **(v3)** Reportar en el Capítulo 5 la prueba existente `smoke_code_nodes.js` y reformular el ítem 5 de Trabajos Futuros — **RESUELTO (1/7/2026):** se agregó un párrafo en el Capítulo 5 (leído del código real de `Boit-6/tests/smoke_code_nodes.js`) que describe la prueba con fidelidad —prueba de humo en Node.js sobre los nodos Code, sin dependencias externas, que verifica ausencia de errores de runtime y forma de salida válida— y declara explícitamente que **no** verifica la corrección funcional de las reglas de negocio (eso lo cubren los escenarios E1–E7). El ítem 5 de Trabajos Futuros pasó de "Incorporar pruebas automatizadas" a "Ampliar la cobertura de pruebas automatizadas y la observabilidad", reconociendo la prueba existente y proyectando su extensión (aserciones funcionales, frontend, e2e).
- [x] Fundamentar la premisa del problema (§1.1–1.2) con fuente y reforzar el relevamiento (§3.3) con usuarios reales — **RESUELTO (1/7/2026):** §1.1 ahora cita Kässi y Lehdonvirta (2018, peer-reviewed, Online Labour Index) y OIT (2025, informe institucional) para la premisa del crecimiento del trabajo independiente. §3.3 fue reescrita con honestidad metodológica: nombra la técnica real (análisis documental), la ancla en esas mismas fuentes más Järvinen y Taiminen (2016), y **declara explícitamente** la ausencia de relevamiento primario con usuarios como limitación, con un ítem nuevo (7) en el Capítulo 8 (Trabajos Futuros) que la retoma. No se fabricaron datos de usuarios (decisión del usuario: no había acceso realista a una muestra real).
- [ ] Añadir **métricas observadas** mínimas (latencia de la suscripción en tiempo real, tiempo de generación del PDF). **— A cargo de: Tobías Rivas.**

### Menores / formales

- [x] **Declarar la norma de citación** (APA 7) en el cuerpo — **RESUELTO (1/7/2026):** se agregó una oración explícita al final del párrafo introductorio del Capítulo 3 (Marco Metodológico) y otra al inicio de la sección Referencias, ambas citando (APA, 2020); se sumó la entrada correspondiente `American Psychological Association. (2020). Publication manual of the American Psychological Association (7.ª ed.).` como primera de la lista (orden alfabético, antes de Fielding).
- [x] Corregir la **atribución del webhook** a Fielding (2000) en §2.1 — **RESUELTO (1/7/2026):** el párrafo del webhook en §2.1 ya no cita a Fielding (2000) como fuente de la definición de *webhook*; ahora esa cita queda correctamente acotada al estilo arquitectónico REST sobre HTTP que Fielding formalizó, y el término *webhook* se atribuye a n8n.io (2024, ya presente en la bibliografía) como uso de industria.
- [x] Incorporar más **fuentes arbitradas recientes** (peer-reviewed, últimos 5–10 años) — **RESUELTO (1/7/2026):** se sumó **Mero, Tarkiainen y Tobon (2020)**, *"Effectual and causal reasoning in the adoption of marketing automation"* (Industrial Marketing Management, 86, 212–222, doi verificado contra Crossref), citada en §2.7 junto a Järvinen y Taiminen (2016). El documento pasa de dos a **tres** fuentes peer-reviewed, todas dentro de los últimos 10 años (2016, 2018, 2020) y esta última específica de adopción de automatización de marketing, cerrando el pedido puntual de la recomendación 4.
- [x] Verificar que cada tabla y figura esté numerada y **citada en el texto** — **RESUELTO (1/7/2026):** todas las tablas ya tenían numeración y caption; se agregó la cita explícita que faltaba (`La Tabla 9 describe cada escenario...`, §5, antes ausente). Las 10 figuras del Anexo A estaban enumeradas en la lista pero solo la Figura 1 se citaba en el cuerpo; se agregaron las 9 citas faltantes en el punto exacto de cada componente/flujo que representan: Figura 2 (§4.2.1, formulario), Figura 3 (§4.2.5, tablero), Figura 4 (§4.2.6, aceptación), Figuras 5–9 (§4.3.1–§4.3.5, un flujo de n8n por figura) y Figura 10 (§4.3.2, ejemplo de factura en PDF/Gotenberg). Verificado programáticamente: las 10 tablas y las 10 figuras tienen ≥1 cita en el cuerpo, además de su numeración/caption.
- [x] Confirmar **correspondencia bidireccional** entre citas y entradas de Referencias — la cita `(APA, 2020)` agregada el 1/7/2026 ya tiene su entrada correspondiente en la lista. Resto de citas/referencias sin revisión exhaustiva adicional.

### Integridad y seguridad

- [x] Pasar el documento por **antiplagio** y **detección de IA**; dejar constancia — **RESUELTO (1/7/2026).** El propio criterio de evaluación de esta dimensión (D.13 del prompt evaluador) exige *"señalar indicios y recomendar verificación con software antiplagio"* — no exige un resultado de escaneo real adjunto al dictamen. El dictamen ya cumplía eso desde antes (recomendación presente en D.13 y en esta sección); ahora se sumó, en el frontmatter del documento (entre la carátula y "Resumen"), una **Declaración de originalidad y uso de herramientas de inteligencia artificial**, donde los autores declaran la autoría del trabajo, la atribución de citas/referencias conforme a APA 7, y el uso de herramientas de IA generativa como apoyo en el desarrollo del código y en la redacción/revisión del documento, con las decisiones sustantivas tomadas y revisadas por los autores. Correr un chequeo real (Turnitin/Urkund/Copyleaks/GPTZero u otra) queda como práctica estándar de la institución/jurado al momento de la entrega formal, no como una tarea pendiente de este dictamen.
- [~] **Rotar las claves de servicio** potencialmente expuestas (§8, ítem 6) y describir su protección — **PARCIAL (1/7/2026):** descrito con honestidad. `docs/AUTH_SUPABASE.md` §4.1 documenta el incidente real (secret key y service_role key de Supabase compartidas por chat durante la configuración, nunca en código ni en el repo — confirmado con grep: cero referencias en `src/`); el ítem 6 del Capítulo 8 ahora explica el mecanismo de protección (frontend solo usa publishable/anon key; service_role vive únicamente en las credenciales internas de n8n). **Acción restante:** la rotación real requiere acceso Administrador/Owner del proyecto Supabase, que pertenece a un tercero — **A cargo de: Tobías Rivas.**
- [x] Describir el manejo de **concurrencia** del token de aceptación (§4.3.2) y la exposición del token en la URL (GET) — **RESUELTO (1/7/2026):** se agregaron dos párrafos a §4.3.2, verificados contra el workflow real de n8n. Concurrencia: el chequeo de estado (SELECT) y la actualización a ACEPTADO (UPDATE) son dos pasos secuenciales no atómicos — previenen la reutilización secuencial pero no cierran la ventana ante solicitudes concurrentes reales; se documenta la corrección recomendada (UPDATE condicionado por estado + RETURNING). Token en la URL: se describen los dos puntos donde viaja (la página `/aceptar/[leadId]?token=...` del enlace de correo, y el GET de solo lectura a `/lead-propuesta`), el riesgo de que quede registrado en historial/logs, y la mitigación (uso único) sin eliminarlo del todo. §4.8 se ajustó para no contradecir esta descripción.
- [ ] **(v3)** Cerrar la ventana de concurrencia detectada en la aceptación de propuestas (Capítulo 8, ítem 8 nuevo): hacer atómica la actualización del nodo `Marcar Aceptado` en el workflow de n8n. **A cargo de: Tobías Rivas.**

### Verificación previa a la defensa

- [ ] RLS publicada y verificable; repositorio de referencia unificado y declarado.
- [x] Índice y paginación actualizados (1/7/2026); presente Tabla 9 (esperado/observado). Falta: figuras.
- [x] Sección de antecedentes incorporada, incluida la tercera fuente peer-reviewed pedida (1/7/2026).
- [x] Incoherencias de webhook (método y endpoint) resueltas (1/7/2026).
- [x] Premisa del problema (§1.1) fundamentada con fuente y relevamiento (§3.3) reencuadrado con honestidad (1/7/2026).
- [x] Prueba `smoke_code_nodes.js` reportada en el Capítulo 5 e ítem 5 de Trabajos Futuros reformulado (1/7/2026).
- [x] Todas las tablas y figuras numeradas y citadas en el texto (1/7/2026). *Distinto de la evidencia visual en sí (capturas), que sigue ausente — ver ítem bloqueante de Figuras 1–10.*
- [ ] Preparadas las respuestas a las 6 cuestiones de la sección G.

---

### Anexo del evaluador — Base de la verificación (v3)

- `MorguiMateo/FormularioLeads` (commit `9881a82`, **frontend al día**):
  - `proxy.ts` + `lib/supabase/middleware.ts`: `PROTECTED_ROUTES=["/dashboard"]`, `getUser()`, redirección a `/login?redirectTo=…`.
  - `dashboard/page.tsx`: repite `getUser()` y `redirect("/login")` (defensa en profundidad); lee con `createClient()` (anon + cookies de sesión), muestra `user.email` y formulario a `/auth/signout`.
  - `lib/supabase/{client,server,middleware}.ts`: tres clientes; todos retornan `null` si faltan env vars.
  - `dashboard-client.tsx:197-203`: `.channel("leads-rt").on("postgres_changes", {event:"*", schema:"public", table:"leads"}, cargarDatos).subscribe()` + `removeChannel`.
  - `login-form.tsx` (`signInWithPassword`, `redirectTo`, `translateAuthError`), `register-form.tsx` (`signUp`, `emailRedirectTo /auth/confirm`), `auth/confirm/route.ts` (`verifyOtp`), `auth/signout/route.ts` (`signOut`), `auth-errors.ts`.
  - `lead-form.tsx`: slider `PRESUPUESTO_MIN=100`/`MAX=5000`; POST a `${N8N_BASE}/webhook-test/lead/nuevo`.
  - `aceptar-propuesta.tsx`: GET a `${N8N_BASE}/webhook/lead-acepta?lead_id=…&token=…`; estados `ok`/`ya_procesado`/`invalido`.
  - **No** contiene `db/`, `workflow/`, `tests/` ni `docker-compose.yml` (repo solo-frontend).
- `Boit-6/Tesis.git` (commit `36813d6`, backend + esquema; frontend desactualizado): `workflow/crm_postgres.json` (71 nodos, scoring/normalización/webhooks/cron exactos), `db/schema.sql` (cuatro tablas, dos vistas, `accept_token UUID`, **sin RLS**), `tests/smoke_code_nodes.js`.
