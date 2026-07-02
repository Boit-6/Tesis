# Dictamen de Evaluación de Trabajo Final — Re-ejecución

> Evaluación par académico senior (perfil compatible CONEAU) del documento `tesis.docx`,
> ejecutando el prompt evaluador completo (Rol → Paso 0 → 13 dimensiones → formato A–G,
> con reglas de evidencia anti-alucinación).
>
> **Fecha:** 1 de julio de 2026. **Base de evidencia:** `tesis.docx` (10.344 palabras) cruzado
> contra el árbol de trabajo **actual** de este repositorio, `MorguiMateo/FormularioLeads`
> (HEAD `e03c9d2`), que —a diferencia de lo que asumía el dictamen previo— **ya es un monorepo
> unificado**: contiene y versiona `db/schema.sql`, `workflow/crm_postgres.json`,
> `tests/smoke_code_nodes.js` y `docker-compose.yml`. Se contrastó además con `Boit-6/Tesis.git`
> (commit `36813d6`) como referencia histórica.
>
> **Relación con `docs/dictamen-tesis.md` (iteración v3):** este documento **no reemplaza** al
> anterior; lo **re-ejecuta y actualiza**. La sección **X** compara explícitamente el dictamen v3
> (i) contra el prompt evaluador y (ii) contra la situación actual, según lo pedido. El hallazgo
> central de esta re-ejecución es que **el artefacto creció por delante del documento**: entre el
> estado que evaluó la v3 (commit `9881a82`) y el HEAD actual se incorporaron funcionalidades
> —flujo de aceptación con rechazo y pedido de cambios, sección «Trabajos activos» con máquina de
> estados propia— que `tesis.docx` **todavía no describe**, y el conteo de nodos del backend pasó
> de 71 (declarado) a **98** (real).

---

## Paso 0 — Calibración previa (obligatorio)

| Elemento | Determinación |
|---|---|
| **Tipo de trabajo** | Trabajo Final de grado (Tecnicatura Universitaria en Programación, UTN–FRM). Res. ME 160/2011 solo como referencia de calidad de nivel superior. |
| **Naturaleza** | Desarrollo tecnológico de carácter aplicado (artefacto de software). Autodeclarado: *«su resultado principal es un artefacto de software […] y no la contrastación de una hipótesis empírica»* (§3.1). |
| **Disciplina / subcampo** | Ingeniería de software; automatización de procesos de negocio (BPA); gestión de leads. |
| **Norma de citación** | **APA 7**, declarada explícitamente: *«se ajusta a las normas de estilo de la American Psychological Association en su séptima edición (APA, 2020)»* (§3, encabezado, y §Referencias). |
| **Extensión / idioma / completitud** | ~10.344 palabras, español (abstract en inglés). Índice y paginación **generados** (campos TOC/PAGE horneados). **Incompleto en un punto probatorio:** *«Las capturas deben incorporarse en la versión final»* (§5 y Anexo A) — Figuras 1–10 ausentes; Tabla 9, columna Evidencia con placeholders *«Pendiente — …»*. |
| **Reproducibilidad frente al código** | **Alta para todo lo documentado.** Contra el HEAD `e03c9d2`, cada afirmación de frontend, esquema y backend verificada **se confirma** (sección ★). La observación ya no es «reproducibilidad», sino **cobertura**: el documento describe *menos* de lo que el artefacto implementa. |

> **Observación crítica de entrada:** el prompt exige identificar la base de evidencia. En esta
> re-ejecución los tres artefactos (frontend, esquema, workflow) conviven en **un único
> repositorio versionado**, lo que **resuelve en el árbol de trabajo** la observación de «dos
> repos desincronizados» del dictamen v3. Sin embargo, **`tesis.docx` no declara ninguna URL de
> repositorio** —§4.1 solo remite a *«el código fuente del repositorio del proyecto»**—, por lo
> que el punto queda cerrado en el código pero **abierto en el documento**.

---

## A. Carátula del dictamen

- **Título:** *Automatización de Sistema de Tickets para Freelancers con n8n — Diseño e implementación de una plataforma web para la gestión automatizada del ciclo de vida del cliente (captación, calificación, propuesta, facturación y cobro).*
- **Autores:** Mateo Morgui; Tobías Rivas. **Director:** Alberto Cortez.
- **Tipo:** Trabajo Final de grado — desarrollo tecnológico aplicado.
- **Disciplina:** Ingeniería de software / automatización de procesos.
- **Norma detectada:** APA 7 (declarada, §3 y Referencias).
- **Base de evidencia:** `tesis.docx` + repositorio `MorguiMateo/FormularioLeads` HEAD `e03c9d2` (monorepo unificado) + `Boit-6/Tesis.git` `36813d6` (histórico).
- **Fecha de evaluación:** 1 de julio de 2026 (re-ejecución).

## B. Síntesis ejecutiva

**Tesis central:** el ciclo de vida comercial de un freelancer —captación, calificación, propuesta, aceptación, facturación y cobro— puede automatizarse de extremo a extremo con una arquitectura orientada a eventos de bajo código (Next.js + n8n + Supabase). **Principal fortaleza:** validez interna alta y verificable —cada componente documentado se confirma en el código (autenticación con doble verificación y compuerta de rol admin, tres clientes, tiempo real por `postgres_changes`, RLS publicada y versionada, scoring y normalización exactos)—, virtud infrecuente en trabajos de este nivel. **Principal debilidad:** el capítulo de resultados descansa en autorreporte **sin evidencia** (figuras ausentes; Tabla 9 sin datos observados reales) y, de forma nueva y grave para un documento que se juzga por su fidelidad al artefacto, **`tesis.docx` quedó desactualizado respecto de su propio sistema**: subdeclara el backend (71 nodos vs. 98 reales; 4 webhooks vs. 8) y **omite dos funcionalidades ya implementadas** (rechazo/pedido de cambios en la aceptación; sección «Trabajos activos» con máquina de estados). **Veredicto:** aprobado con observaciones mayores.

## C. Veredicto

**APROBADO CON OBSERVACIONES MAYORES** (defensa habilitada solo tras revisión sustantiva del documento).

Justificación: el artefacto **respalda con fidelidad** todo lo que el documento afirma —verificado componente a componente— y las observaciones formales del pasado (norma APA, índice/paginación, atribución del webhook, RLS sin publicar, repos sin unificar) están **resueltas**. Lo que impide un veredicto menor es sustantivo y de dos órdenes: (i) un capítulo de resultados **sin evidencia probatoria** (Figuras 1–10 ausentes; Tabla 9 con la columna Evidencia en *«Pendiente»*), y (ii) una **brecha de cobertura documento–artefacto de nuevo signo**: el sistema evolucionó (aceptación con rechazo/pedido de cambios; «Trabajos activos» con estados `PENDIENTE/EN_PROGRESO/EN_REVISION/ENTREGADO`; 98 nodos; 8 webhooks) y el documento **aún describe una versión anterior**. Esto no es un defecto del artefacto, pero sí una falla de completitud y exactitud del texto que se defiende, que exige revisión sustantiva antes de la defensa. No corresponde «Devuelto para reelaboración» porque el núcleo es coherente y las correcciones son aditivas, no estructurales.

---

## ★ Verificación contra el código (HEAD `e03c9d2`)

Regla de evidencia aplicada: se cita archivo·línea del repositorio junto a la sección del documento.

### ★.1 Afirmaciones CONFIRMADAS

| Afirmación de la tesis | Evidencia en el código |
|---|---|
| **Autenticación** (§4.2.2): `signInWithPassword`, `signUp`→`/auth/confirm`, `verifyOtp`, `signOut`, `translateAuthError` | `login-form.tsx`, `register-form.tsx`, `auth/confirm/route.ts`, `auth/signout/route.ts`, `lib/supabase/auth-errors.ts`. |
| **Protección de rutas + defensa en profundidad** (§4.2.3) | `lib/supabase/middleware.ts:8,42,48` (`PROTECTED_ROUTES=["/dashboard"]`, `getUser()`, `redirectTo`); `dashboard/page.tsx:13` repite `redirect("/login")`. **Además, no documentado:** `dashboard/page.tsx:19` exige `profile.role === "admin"` o redirige. |
| **Tres clientes + degradación defensiva** (§4.2.4, RNF3) | `lib/supabase/{client,server,middleware}.ts` (retornan `null` si faltan env vars). |
| **Tablero en tiempo real** (§4.2.5, RNF6, escenario **E7**) | `dashboard-client.tsx:215-220`: `.channel("leads-rt").on("postgres_changes",{event:"*",table:"leads"},…)` + `removeChannel`. |
| **Tablero lee bajo sesión** (anon+cookies, no service key) | `dashboard/page.tsx:8` `createClient()` de `lib/supabase/server.ts`; consulta `metrics_mensuales`/`facturas_pendientes` (`dashboard-client.tsx:166-176`). |
| **Formulario** (§4.2.1): slider 100–5000; POST a `/webhook/lead/nuevo` **de producción** | `lead-form.tsx:43-44` (`PRESUPUESTO_MIN=100`,`MAX=5000`), `:6` (`/webhook/lead/nuevo`, no `/webhook-test/`). |
| **Aceptación por POST con `{lead_id, token}` en el cuerpo** (§4.2.6) | `aceptar-propuesta.tsx:306-309`. |
| **Esquema: 5 tablas + RLS + `security_invoker`** (§4.4, §4.6, Anexo C) | `db/schema.sql`: `leads/facturas/seguimientos/logs/profiles`; `ENABLE ROW LEVEL SECURITY` (l.258-262); políticas que exigen `profiles.role='admin'` (l.271-283); vistas `security_invoker=true` (l.198,245); `anon` revocado (l.313). |
| **Scoring (Tabla 4), normalización (§4.3.1), estados (Tabla 7), `accept_token UUID`** | `workflow/crm_postgres.json` (nodos Code/Postgres) — exactos. |
| **Ventana de concurrencia en aceptación** (§4.3.2) | Descrita con honestidad; el UPDATE de `Marcar Aceptado` no recondiciona por estado. Corrección pendiente (Cap. 8, ítem 8). |

### ★.2 DIVERGENCIAS — el documento describe MENOS de lo que el artefacto hace

| # | Hallazgo | Documento | Artefacto (HEAD `e03c9d2`) | Gravedad |
|---|---|---|---|---|
| D1 | **Conteo de nodos** | «71 nodos» (§4.1, §4.3, Anexo B) | **98 nodos funcionales** (26 Postgres, 18 Code, 11 Telegram, 10 respondToWebhook, 8 webhook, 8 IF, 6 HTTP, 5 Gmail, 3 scheduleTrigger, 2 noOp, 1 errorTrigger; sin sticky notes) | Media |
| D2 | **Contratos de integración** | Tabla 8 lista **4** webhooks (`/lead/nuevo`, `/lead-acepta`, `/pago-confirmado`, `/proyecto-cerrado`) | **8** webhooks reales; faltan `/lead-propuesta` (GET solo lectura), `/lead-rechaza`, `/lead-modifica`, `/trabajo-estado` | Media |
| D3 | **Flujo de aceptación** | «tres desenlaces: aceptación satisfactoria, enlace ya utilizado o inválido» (§4.2.6) | Flujo con **Aceptar / Pedir cambios / Rechazar** (`aceptar-propuesta.tsx:328,338,351`; estados `aceptado/rechazado/modificado/…`); backend implementa `lead-rechaza` y `lead-modifica` | Media |
| D4 | **«Trabajos activos» (máquina de estados del trabajo)** | No existe en el documento | `trabajo_estado` ENUM `PENDIENTE/EN_PROGRESO/EN_REVISION/ENTREGADO` (`db/schema.sql:51`), columna `estado_trabajo` en `leads` (l.69) **ausente de la Tabla 5**; sección E del tablero (`dashboard-client.tsx:382`, `trabajo-estado-select.tsx`) y webhook `/trabajo-estado` con sync a Notion | **Alta** (funcionalidad completa no documentada) |
| D5 | **Lista de servicios del formulario vs. lista blanca del scoring** | Tabla 4 pondera 7 servicios: `desarrollo_web, ecommerce, app_movil, automatizacion, diseno_ui, consultoria, soporte` | El formulario ofrece `Desarrollo Web, Diseño UX/UI, Marketing Digital, SEO / Posicionamiento, Consultoría, Otro` (`lead-form.tsx:8-15`) — no mapean 1:1; «Marketing Digital», «SEO», «Otro» caen al default `desarrollo_web`, sesgando el score por servicio | Media |

> **Consecuencia evaluativa:** la validez interna **no se ve comprometida** (todo lo verificado
> es correcto y consistente entre frontend y backend), pero la **validez descriptiva del
> documento sí**: una tesis de desarrollo se juzga, en buena parte, por la fidelidad con que su
> texto documenta el artefacto que defiende. Hoy el texto **subrepresenta** el sistema.

---

## D. Evaluación detallada por dimensión

**1. Estructura general y formato — Adecuado.** IMRyD-adaptada correcta; índice y paginación generados. *Observación (media):* la Tabla 5 (columnas de `leads`) omite `estado_trabajo`, ya presente en el esquema (D4). Figuras ausentes (ver dim. 8).

**2. Planteamiento del problema — Adecuado.** Distingue tema, problema y pregunta (§1.3), con premisa fundamentada: *«el Online Labour Index registró un aumento cercano al 21 %… (Kässi y Lehdonvirta, 2018)»* (§1.1). Baja gravedad.

**3. Hipótesis — Adecuado (ausencia justificada).** *«el trabajo no formula una hipótesis en sentido estadístico»* (§3.1); coherente con la naturaleza. Sin penalización.

**4. Objetivos — Excelente.** General y cinco OE en infinitivo, con matriz de trazabilidad (Anexo E, Tabla 10). Trazabilidad reproducible en el artefacto. Baja.

**5. Estado del arte / antecedentes — Adecuado.** §2.7 (HubSpot, Pipedrive, Zapier, Make + identificación del vacío) y §2.8 (construir vs. configurar). Tres fuentes peer-reviewed (Järvinen & Taiminen 2016; Kässi & Lehdonvirta 2018; Mero et al. 2020). Baja.

**6. Marco teórico — Adecuado.** Definiciones operativas; la atribución del webhook ya no cuelga de Fielding: *«el término webhook en sí proviene del uso extendido en la industria… (n8n.io, 2024)»* (§2.1). Baja.

**7. Metodología / propuesta de desarrollo — Adecuado.** Enfoque iterativo-incremental; RF (Tabla 1), RNF con ISO/IEC 25010 (Tabla 2), validación por escenarios (§3.7). §3.3 declara con honestidad la *«ausencia de un relevamiento primario con usuarios reales»*. Las decisiones de §4.7 están implementadas. *Coherencia problema→objetivos→método→resultados: correcta.* Media (por la brecha de cobertura D1–D4 que este capítulo debería reflejar).

**8. Resultados / validación — Insuficiente.** E7 es reproducible en el código, pero el cierre *«En todos los casos el comportamiento observado coincidió con el esperado»* (§5) es **autorreporte sin evidencia**: la columna Evidencia de la Tabla 9 dice *«Pendiente — adjuntar…»* en los siete escenarios, y *«Las capturas deben incorporarse en la versión final»* (Anexo A). Además, **ningún escenario ejercita** el rechazo, el pedido de cambios ni «Trabajos activos» (D3, D4). **Alta.**

**9. Discusión — Adecuado.** Reconoce limitaciones con rigor: scoring *«de diseño y no empírica»* (§6), despliegue local sin URL pública. *Debería* incorporar las funcionalidades nuevas y el estado real del repositorio unificado. Baja–media.

**10. Conclusiones — Adecuado.** Responden por OE (§7), distinguen demostrado / sugerido / abierto: *«Queda sugerido, pero no demostrado, que la solución mejore indicadores comerciales reales»*. Baja.

**11. Trabajos futuros — Adecuado.** Ocho líneas priorizadas y ancladas en limitaciones reales (incluye el ítem 8, cierre de la ventana de concurrencia). Baja.

**12. Bibliografía y citación — Adecuado.** APA 7 consistente; correspondencia cita↔entrada sin huérfanos evidentes; DOIs verificables (Kässi & Lehdonvirta, Mero et al.). Baja.

**13. Originalidad e integridad académica — Adecuado.** Declaración de originalidad y uso de IA en el frontmatter. Sin indicios de plagio ni saltos de registro. *El criterio de esta dimensión pide señalar indicios y recomendar antiplagio, no adjuntar un escaneo:* recomendación hecha. Baja–media.

## E. Matriz resumen

| # | Dimensión | Nivel | Gravedad |
|---|---|---|---|
| 1 | Estructura y formato | Adecuado | Media (Tabla 5 omite `estado_trabajo`; figuras) |
| 2 | Planteamiento del problema | Adecuado | Baja |
| 3 | Hipótesis | Adecuado (N/A justificada) | Baja |
| 4 | Objetivos | **Excelente** | Baja |
| 5 | Estado del arte / antecedentes | Adecuado | Baja |
| 6 | Marco teórico | Adecuado | Baja |
| 7 | Metodología / desarrollo | Adecuado | Media (brecha de cobertura) |
| 8 | Resultados / validación | **Insuficiente** | **Alta** (evidencia ausente) |
| 9 | Discusión | Adecuado | Baja–media |
| 10 | Conclusiones | Adecuado | Baja |
| 11 | Trabajos futuros | Adecuado | Baja |
| 12 | Bibliografía y citación | Adecuado | Baja |
| 13 | Originalidad e integridad | Adecuado | Baja–media |

## F. Recomendaciones priorizadas

1. **Sincronizar el documento con el artefacto (bloqueante).** Actualizar el conteo a **98 nodos** (§4.1, §4.3, Anexo B); ampliar la **Tabla 8 a los 8 webhooks** reales; documentar en §4.2.6 el flujo **Aceptar/Pedir cambios/Rechazar** (`lead-rechaza`, `lead-modifica`, y el GET de solo lectura `lead-propuesta`). Sin esto, el texto describe un sistema que ya no es el entregado.
2. **Documentar «Trabajos activos» (bloqueante).** Incorporar la máquina de estados del trabajo (`PENDIENTE/EN_PROGRESO/EN_REVISION/ENTREGADO`), la columna `estado_trabajo` en la **Tabla 5**, la sección del tablero y el webhook `/trabajo-estado` con su sync a Notion. Reflejarlo, si corresponde, como un OE o como alcance ampliado.
3. **Incorporar la evidencia probatoria ausente (bloqueante).** Figuras 1–10 (Anexo A) y **cargar la columna Evidencia de la Tabla 9** con capturas, registro de ejecución de n8n, correo y fila en BD por escenario. Añadir al menos un escenario para rechazo/pedido de cambios y otro para «Trabajos activos».
4. **Alinear la lista de servicios del formulario con la lista blanca del scoring** (`lead-form.tsx` ↔ Tabla 4), o documentar explícitamente el mapeo y el comportamiento por defecto, para que el score por servicio sea trazable.
5. **Declarar el repositorio canónico en el documento.** El árbol ya está unificado (frontend + `db/schema.sql` + `workflow/` + `tests/`); falta **nombrar la URL** en §4.1 para que el jurado clone y verifique sin ambigüedad.
6. **Aplicar la RLS en la instancia Supabase de producción** y confirmar la publicación de Realtime (`supabase_realtime`); el script (`db/schema.sql`) ya está verificado contra PostgreSQL 16.
7. **Cerrar la ventana de concurrencia** del nodo `Marcar Aceptado` (UPDATE condicionado por estado + `RETURNING`, ramificando por filas afectadas), tal como el propio §4.3.2 recomienda.

## G. Cuestiones para la defensa oral

1. El documento declara «71 nodos» y cuatro webhooks (Tabla 8), pero el workflow entregado tiene **98 nodos y ocho webhooks**: ¿a qué corresponde la diferencia y por qué el texto no la refleja?
2. La página de aceptación implementa **rechazo** y **pedido de cambios** (`lead-rechaza`, `lead-modifica`) que §4.2.6 no menciona: ¿cómo procesa el backend cada desenlace y qué transición de estado produce?
3. ¿Qué es la sección **«Trabajos activos»** y la máquina `PENDIENTE/EN_PROGRESO/EN_REVISION/ENTREGADO`? ¿Cómo se relaciona con los estados del embudo (Tabla 7) y por qué no figura en el modelo de datos documentado (Tabla 5)?
4. El formulario ofrece servicios («Marketing Digital», «SEO», «Otro») que **no están** en la lista blanca del scoring (Tabla 4): ¿qué score reciben y cómo se evita un sesgo de calificación?
5. El §4.6 y el Anexo C afirman RLS con lectura solo para rol `admin`: ¿está **aplicada la política en la instancia Supabase** o solo en el script, y cómo se verifica que el tablero (anon key + sesión) solo accede a filas autorizadas?
6. Umbrales de scoring fijados por *«criterio experto»* (§6): ¿sobre qué base, y cómo se comportaría un lead de presupuesto alto y urgencia baja?

---

## X. Comparación pedida: `docs/dictamen-tesis.md` (v3)

### X.1 — El dictamen v3 frente al PROMPT evaluador

**Cumple** el grueso del formato exigido y las reglas de evidencia:

- Presenta Paso 0 (Calibración) y las secciones **A** (Carátula), **B** (Síntesis), **C** (Veredicto con una sola categoría), **D** (13 dimensiones), **E** (Matriz), **F** (Recomendaciones) y **G** (Cuestiones para la defensa). ✔
- Asigna niveles por dimensión y usa referencias de sección. Tono técnico y sobrio, en general. ✔
- Respeta la calibración por tipo de trabajo (desarrollo tecnológico, no empírico). ✔

**Se aparta / excede** el prompt en:

- **Añade secciones no pedidas:** una «★ Verificación contra el código» y una **«H. Checklist de correcciones»** con estados `[x]/[ ]/[~]` y asignaciones («A cargo de: …»). El prompt pide A–G; H y el checklist son valor agregado, pero exceden el formato solicitado.
- **Reglas de evidencia:** el prompt exige *«cita literal breve entre comillas con referencia a página, sección o capítulo»* para **cada** afirmación evaluativa. La v3 apoya muchas afirmaciones en referencias de sección y en el código, pero **no** ancla cada juicio en una cita textual del documento; es más narrativa que citacional.
- **Síntesis ejecutiva (≤200 palabras):** la de la v3 es extensa y con marcas de edición («actualizada 1/7/2026»), rozando o superando el límite.
- **Tono:** aparecen valoraciones celebratorias («validez interna infrecuente», «revierte las contradicciones») que el prompt pide evitar salvo justificación robusta.

### X.2 — El dictamen v3 frente a la SITUACIÓN ACTUAL (HEAD `e03c9d2`)

La v3 quedó **factualmente desactualizada** en puntos verificables:

- **Repos.** La v3 evalúa el frontend en `commit 9881a82` y afirma que el repo **«No contiene `db/`, `workflow/`, `tests/` ni `docker-compose.yml` (repo solo-frontend)»** (Anexo del evaluador v3). **Hoy es falso:** los cuatro están **versionados** en este mismo repo (`git ls-files` los lista; commits `2491ceb`, `57f4706`, `06a0462`). La observación «dos repos desincronizados» y la recomendación 2 («Unificar el repositorio») están **superadas en el árbol de trabajo** (resta solo declarar la URL en el documento).
- **RLS.** La v3 la da por «publicada y verificada, resta aplicarla en Supabase». Sigue vigente, y ahora el `schema.sql` está **en este repo** (no en uno aparte): la compuerta de rol `admin` se confirma también a nivel de página (`dashboard/page.tsx:19`).
- **Conteo de nodos.** La v3 repite «71 nodos … exactos/confirmados». **Hoy son 98** (§★.2, D1): la v3 no detecta el crecimiento del backend.
- **Funcionalidades nuevas no vistas por la v3.** El flujo de **rechazo/pedido de cambios** (commit `c1f9c42`) y la sección **«Trabajos activos»** (commit `55254dc`) son posteriores a `9881a82`; la v3 no los evalúa. Su «★.2» todavía afirma que la aceptación tiene «tres desenlaces», hoy insuficiente (D3).
- **Contratos.** La v3 no observa que la Tabla 8 (4 webhooks) quedó corta frente a los 8 reales (D2), ni el desajuste servicio↔scoring (D5).

**Conclusión de la comparación:** el dictamen v3 fue correcto para el estado que evaluó, pero **el artefacto avanzó** y hoy el eje del problema **se invirtió**: ya no es «el documento afirma cosas que el código no respalda» (v2), sino **«el código hace cosas que el documento no documenta»**. Esta re-ejecución mantiene el veredicto (**Aprobado con observaciones mayores**) por razones parcialmente nuevas: no por reproducibilidad ni por repos, sino por la **evidencia probatoria ausente** y por la **brecha de cobertura documento→artefacto** aquí detallada.

---

## H. Checklist consolidado de pendientes (todo lo que falta por hacer)

Orden por prioridad: **bloqueantes** (condición para habilitar la defensa) → **mayores** → **menores/formales** → **seguridad/integridad** → **verificación previa a la defensa**. Estado: `[ ]` pendiente · `[~]` parcial · `[x]` hecho. «Doc» = editar `tesis.docx`; «Código/Infra» = artefacto.

### Bloqueantes

- [ ] **B1 · Sincronizar el conteo del backend (Doc).** Reemplazar «71 nodos» por **98** en §4.1, §4.3 y Anexo B. Ajustar «cinco procesos» → los procesos reales (se sumaron rechazo, pedido de cambios y estado de trabajo). *— Doc.*
- [ ] **B2 · Completar la Tabla 8 (Doc).** Pasar de 4 a **8 webhooks**: agregar `/lead-propuesta` (GET, solo lectura), `/lead-rechaza` (POST), `/lead-modifica` (POST, con `mensaje`) y `/trabajo-estado` (POST). *— Doc.*
- [ ] **B3 · Documentar el flujo real de aceptación (Doc).** Reescribir §4.2.6: ya no son «tres desenlaces», sino **Aceptar / Pedir cambios / Rechazar** (`aceptar-propuesta.tsx`), con sus estados (`aceptado/rechazado/modificado/ya_procesado/invalido`) y las transiciones que produce cada uno en el backend. *— Doc.*
- [ ] **B4 · Documentar «Trabajos activos» (Doc).** Incorporar la máquina de estados del trabajo (`PENDIENTE/EN_PROGRESO/EN_REVISION/ENTREGADO`), agregar la columna `estado_trabajo` a la **Tabla 5**, describir la sección E del tablero y el webhook `/trabajo-estado` con su sync a Notion. Decidir si se declara como OE nuevo o como alcance ampliado. *— Doc.*
- [ ] **B5 · Incorporar la evidencia visual (Doc).** Insertar las **Figuras 1–10** (Anexo A) y reemplazar los *«Deben incorporarse en la versión final»*. *— A cargo de: Tobías Rivas.*
- [ ] **B6 · Cargar la columna Evidencia de la Tabla 9 (Doc).** Reemplazar los siete *«Pendiente — adjuntar…»* con evidencia real por escenario (captura de tablero, registro de ejecución de n8n, correo, fila en BD). *— A cargo de: Tobías Rivas.*
- [ ] **B7 · Agregar escenarios de validación faltantes (Doc).** Sumar a la Tabla 9 al menos un escenario de **rechazo**, uno de **pedido de cambios** y uno de **«Trabajos activos»** (cambio de estado del trabajo). *— Doc.*
- [ ] **B8 · Declarar el repositorio canónico (Doc).** Nombrar la URL del monorepo unificado en §4.1 (hoy solo dice «el repositorio del proyecto»), para que el jurado clone y verifique sin ambigüedad. *— Doc.*

### Mayores

- [ ] **M1 · Alinear servicios formulario ↔ scoring.** Hacer coincidir la lista de `lead-form.tsx` (`Marketing Digital`, `SEO`, `Otro`, `Diseño UX/UI`…) con la lista blanca de la Tabla 4 (`desarrollo_web, ecommerce, app_movil, automatizacion, diseno_ui, consultoria, soporte`), **o** documentar explícitamente el mapeo y el default (`desarrollo_web`) y su efecto en el score. *— Código + Doc.*
- [ ] **M2 · Aplicar la RLS en Supabase producción.** Correr `db/schema.sql` en la instancia y **confirmar la publicación de Realtime** (`supabase_realtime` sobre `leads`). El script ya está verificado contra PostgreSQL 16. *— A cargo de: Tobías Rivas (requiere acceso al proyecto Supabase).*
- [ ] **M3 · Reportar métricas observadas mínimas (Doc).** Latencia de la suscripción en tiempo real y tiempo de generación del PDF (Gotenberg), aunque sean del entorno controlado. *— A cargo de: Tobías Rivas.*

### Menores / formales

- [ ] **m1 · Numerar y citar en el texto** cualquier tabla/figura nueva que se agregue por B1–B4 (p. ej., si se numera una tabla de webhooks ampliada o una figura de «Trabajos activos»). *— Doc.*
- [ ] **m2 · Revisar bidireccionalidad citas↔Referencias** de forma exhaustiva (hoy solo se verificó sin huérfanos evidentes). *— Doc.*
- [ ] **m3 · Actualizar campos del `.docx`** tras editar: abrir en Word, `Cmd+A → F9` (índice y paginación) y guardar. Hacerlo **al final**, después de B1–B8. *— Doc.*

### Seguridad / integridad

- [~] **S1 · Rotar credenciales sensibles.** `service_role` y `secret key` de Supabase se compartieron por chat; ninguna vive en el repo. La rotación requiere rol **Owner/Admin** del proyecto (de un tercero). *— A cargo de: Tobías Rivas.*
- [ ] **S2 · Cerrar la ventana de concurrencia en la aceptación (Código).** Hacer atómico el nodo `Marcar Aceptado`: `UPDATE … WHERE lead_id=$1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO') RETURNING *` y ramificar por filas afectadas (§4.3.2, Cap. 8 ítem 8). *— A cargo de: Tobías Rivas.*
- [ ] **S3 · Control de integridad.** Pasar el documento por antiplagio y detección de IA como práctica institucional al entregar (recomendación; la declaración de originalidad ya está en el frontmatter). *— Institución/jurado.*

### Verificación previa a la defensa

- [ ] **V1 · Preparar respuestas a las 6 cuestiones de la sección G** (conteo de nodos, rechazo/pedido de cambios, «Trabajos activos», servicios↔scoring, RLS aplicada, umbrales de scoring).
- [ ] **V2 · Relectura de coherencia final:** confirmar que, tras B1–B8, no queden referencias residuales a «71 nodos», «cuatro webhooks» ni «tres desenlaces» en ninguna parte del documento (cuerpo, Anexos, Resumen/Abstract).

> **Nota de secuencia:** ejecutar primero B1–B8 y M1–M3 (contenido), luego m1–m2, y **al final** m3 (hornear campos). S2 es sobre el workflow de n8n y es independiente del `.docx`.

---

### Anexo del evaluador — Base de la verificación

- **`tesis.docx`** (10.344 palabras; extraído con `textutil`).
- **Repositorio `MorguiMateo/FormularioLeads`, HEAD `e03c9d2`** (monorepo unificado):
  - Frontend: `lib/supabase/{client,server,middleware}.ts`, `src/proxy.ts`, `dashboard/page.tsx` (re-check + rol admin), `dashboard/dashboard-client.tsx` (`postgres_changes`, sección «Trabajos activos»), `trabajo-estado-select.tsx`, `login-form.tsx`, `register-form.tsx`, `auth/{confirm,signout}/route.ts`, `auth-errors.ts`, `components/lead-form.tsx` (slider 100–5000, `/webhook/lead/nuevo`), `aceptar/[leadId]/aceptar-propuesta.tsx` (POST body; aceptar/rechazar/modificar).
  - Esquema: `db/schema.sql` (5 tablas, `trabajo_estado` ENUM, RLS con rol `admin`, vistas `security_invoker`, `anon` revocado).
  - Backend: `workflow/crm_postgres.json` — **98 nodos**, 8 webhooks (`lead/nuevo`, `lead-acepta`, `lead-propuesta`, `lead-rechaza`, `lead-modifica`, `trabajo-estado`, `pago-confirmado`, `proyecto-cerrado`), 3 schedule triggers, rama de error.
  - Pruebas: `tests/smoke_code_nodes.js`. Infra: `docker-compose.yml`.
- **`Boit-6/Tesis.git`** (`36813d6`): referencia histórica (snapshot anterior; su copia de frontend no reproduce el documento).
