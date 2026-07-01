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
| **Norma de citación** | No declarada; **inferida APA 7**. La falta de declaración explícita es una observación formal. |
| **Extensión / idioma / completitud** | ~7.400 palabras, español (abstract en inglés). **Incompleto**: índice no generado (*"Actualice este índice en Word"*), sin paginación, y **evidencias visuales ausentes** (*"Las capturas deben incorporarse en la versión final"*, §5 y Anexo A). |
| **Reproducibilidad frente al código (v3)** | **Sustancialmente resuelta para el frontend.** El §4.1 declara que las afirmaciones del frontend se apoyan en *"el código fuente del repositorio del proyecto"*. Contra `MorguiMateo/FormularioLeads`, **todas** las afirmaciones de frontend (autenticación, tres clientes, defensa en profundidad, tiempo real, degradación defensiva, formulario y aceptación) **se confirman**. El backend n8n se confirmó en la v2 (71 nodos, scoring, webhooks, cron). La RLS —único punto que quedaba sin verificar— **se cerró el 1/7/2026** con `db/schema.sql` (validado contra PostgreSQL 16); resta aplicarlo en Supabase. Véase la sección ★. |

> **Observación crítica de entrada (v3):** existen dos repositorios y no es evidente cuál es la base de evidencia canónica. El monorepo `Boit-6/Tesis.git` contiene el backend y el esquema, pero su copia de frontend está desactualizada (sin auth); el repo `MorguiMateo/FormularioLeads` contiene el frontend al día, pero no el esquema ni el workflow. **La tesis debe declarar un único repositorio de referencia, completo y coherente con el texto.** *(Actualización 1/7/2026: la RLS, que no aparecía en ningún esquema publicado, ya se publicó y verificó en `db/schema.sql`.)*

---

## A. Carátula del dictamen

- **Título:** *Automatización de Sistema de Tickets para Freelancers con n8n — Diseño e implementación de una plataforma web para la gestión automatizada del ciclo de vida del cliente.*
- **Autores:** Mateo Morgui; Tobías Rivas. **Director:** Alberto Cortez.
- **Tipo:** Trabajo Final de grado — desarrollo tecnológico aplicado.
- **Disciplina:** Ingeniería de software / automatización de procesos.
- **Norma detectada:** APA 7 (inferida, no declarada).
- **Repositorios de evidencia:** `MorguiMateo/FormularioLeads` (frontend, commit `9881a82`) y `Boit-6/Tesis.git` (backend n8n + esquema, commit `36813d6`).
- **Fecha de evaluación:** 1 de julio de 2026 (iteración v3).

## B. Síntesis ejecutiva

El trabajo demuestra que el ciclo de vida comercial de un freelancer puede automatizarse de extremo a extremo con una arquitectura orientada a eventos de bajo código (Next.js + n8n + Supabase). **Principal fortaleza:** el artefacto **respalda con fidelidad** lo que el documento afirma —verificado nodo a nodo en el backend (71 nodos, scoring, webhooks, cron) y componente a componente en el frontend (autenticación con doble verificación, tres clientes, suscripción en tiempo real `postgres_changes`, degradación defensiva)—, lo que otorga una validez interna infrecuente en este tipo de trabajos. **Principal debilidad:** el documento carece de un estado del arte que posicione la solución frente a alternativas existentes, y su capítulo de validación descansa en autorreporte con la evidencia visual ausente; subsiste, además, un hueco de seguridad relevante: las políticas de **RLS** que la tesis declara centrales no están publicadas en ningún repositorio. **Veredicto:** aprobado con observaciones mayores, en el extremo favorable de la categoría: resueltas las dudas de reproducibilidad del frontend, restan correcciones sustantivas de antecedentes, evidencia de validación y publicación de la RLS.

## C. Veredicto

**APROBADO CON OBSERVACIONES MAYORES** (defensa habilitada tras revisión sustantiva del documento; el artefacto ya no es el obstáculo principal).

Justificación: la verificación contra el repositorio de frontend al día **revierte** las contradicciones que la v2 había señalado —la autenticación, la lectura del tablero bajo sesión de usuario y la actualización en tiempo real (escenario E7) **están implementadas tal como el texto las describe**—, de modo que la validez interna del trabajo queda sólidamente respaldada por el código. Lo que impide un veredicto menor es documental y acotado: (i) la ausencia de estado del arte y de justificación de la solución frente a alternativas, revisión sustantiva ineludible en una tesis de desarrollo; y (ii) un capítulo de resultados que no exhibe evidencia (figuras ausentes; Tabla 9 que fusiona esperado y observado). El tercer punto que la v3 señalaba —la falta de publicación de las políticas de RLS— **quedó resuelto el 1/7/2026** con `db/schema.sql` (verificado contra PostgreSQL 16); resta aplicarlo en Supabase.

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
| Pruebas automatizadas como trabajo *futuro* (§8, ítem 5) | Ya existe `Boit-6/tests/smoke_code_nodes.js`; el documento no la reporta. | Baja |
| Único repositorio de referencia | La tesis no declara cuál de los dos repos es la base de evidencia; están desincronizados entre sí. | Media |

## D. Evaluación detallada por dimensión

**1. Estructura general y formato — Adecuado.**
Organización IMRyD-adaptada correcta. *Observación de alta gravedad formal:* índice no generado, sin paginación y figuras ausentes (Anexo A). *v3:* la coherencia documento–artefacto del frontend queda saldada; resta unificar el repositorio de referencia.

**2. Planteamiento del problema — Adecuado.**
Distingue tema, problema y pregunta (§1.3). *Debilidad:* la premisa (*"crecimiento sostenido"* del trabajo independiente, §1.1) se afirma sin fuente. *Verificación externa requerida.*

**3. Hipótesis — Adecuado (ausencia justificada).**
Correcta la no formulación de hipótesis (§3.1). Sin penalización.

**4. Objetivos — Excelente.**
General y cinco específicos en infinitivo, alineados y trazables (Anexo E). *v3:* la trazabilidad se refuerza porque la validación declarada (incluido OE4 vía E7) **es ahora reproducible** en el artefacto.

**5. Estado del arte / antecedentes — PARCIAL (1/7/2026).**
Se incorporaron §2.7 (Antecedentes y estado del arte: HubSpot, Pipedrive, Zapier, Make, con el párrafo de cierre que establece el vacío) y §2.8 (Construir frente a configurar, con cuatro razones y trade-offs honestos) al final del Capítulo 2, más una frase-puente en §1.4 y cuatro referencias nuevas. Falta: reforzar con al menos una fuente arbitrada/peer-reviewed reciente (más allá de Järvinen y Taiminen, 2016, ya citada) sobre adopción o TCO de automatización de marketing/ventas.

**6. Marco teórico — Adecuado.**
Pertinente, con definiciones operativas. *Observación de precisión:* Fielding (2000) se cita para definir el webhook (§2.1); esa tesis fundamenta REST, no el webhook. Atribución imprecisa.

**7. Metodología / propuesta de desarrollo — Adecuado (reserva de reproducibilidad levantada para el frontend).**
Enfoque iterativo-incremental, RF (Tabla 1), RNF con ISO/IEC 25010 (Tabla 2), herramientas (Tabla 3) y validación por escenarios (§3.7). *v3:* las decisiones de diseño que el §4.7 destaca —"tres clientes" y "tiempo real por suscripción"— **están implementadas en el repositorio** (`lib/supabase/*`, `dashboard-client.tsx`), lo que valida la propuesta de desarrollo. *Debilidad persistente:* relevamiento (§3.3) endeble, sin usuarios reales.

**8. Resultados / validación — Insuficiente (mejora respecto de v2).**
El escenario E7 **es ahora reproducible** en el código, lo que corrige la falsedad detectada en v2. Sin embargo, la debilidad de fondo persiste **en el documento**: la Tabla 9 fusiona *"Resultado esperado y observado"* en una columna, y el cierre *"En todos los casos el comportamiento observado coincidió con el esperado"* (§5) es autorreporte **sin evidencia** (capturas ausentes). El artefacto respalda los escenarios, pero el capítulo no lo demuestra.

**9. Discusión — Adecuado.**
Reconoce limitaciones con rigor (validez del scoring *"de diseño y no empírica"*, §6; despliegue local sin URL pública). *v3:* debería incorporar la coexistencia de repositorios y el estado real del despliegue (endpoint de prueba del formulario).

**10. Conclusiones — Adecuado.**
Responden punto por punto a los OE (§7) y distinguen lo demostrado de lo sugerido y lo abierto. *v3:* la conclusión de OE4 (*"tablero autenticado con métricas en tiempo real"*) **se sostiene** en el artefacto, con la salvedad de la RLS no publicada.

**11. Trabajos futuros — Adecuado.**
Seis líneas priorizadas y ancladas en limitaciones reales. *v3:* el ítem 5 (pruebas) está parcialmente resuelto (`smoke_code_nodes.js`); conviene reflejarlo.

**12. Bibliografía y citación — Adecuado.**
APA consistente, sin huérfanos evidentes. *Debilidades:* baja proporción de literatura arbitrada reciente (un solo artículo peer-reviewed, Järvinen & Taiminen, 2016) y la atribución imprecisa a Fielding.

**13. Originalidad e integridad académica — Adecuado.**
Sin indicios de plagio ni saltos de registro. *v3:* el problema de integridad de la evidencia señalado en v2 **queda esencialmente resuelto**: el frontend descrito existe y coincide con el documento; resta unificar el repositorio de referencia. Se mantiene la recomendación de control antiplagio y de detección de IA como práctica estándar.

## E. Matriz resumen

| # | Dimensión | Nivel | Gravedad de las observaciones |
|---|---|---|---|
| 1 | Estructura y formato | Adecuado | **Alta** (índice, paginación, figuras) |
| 2 | Planteamiento del problema | Adecuado | Media (premisa sin fuente) |
| 3 | Hipótesis | Adecuado (N/A justificada) | Baja |
| 4 | Objetivos | **Excelente** | Baja |
| 5 | Estado del arte / antecedentes | Parcial (§2.7/§2.8 incorporadas 1/7/2026; falta fuente arbitrada adicional) | Media |
| 6 | Marco teórico | Adecuado | Media (atribución a Fielding) |
| 7 | Metodología / desarrollo | Adecuado | Media (relevamiento; reproducibilidad frontend OK) |
| 8 | Resultados / validación | **Insuficiente** | **Alta** (evidencia ausente del documento) |
| 9 | Discusión | Adecuado | Baja |
| 10 | Conclusiones | Adecuado | Baja |
| 11 | Trabajos futuros | Adecuado | Baja |
| 12 | Bibliografía y citación | Adecuado | Media |
| 13 | Originalidad e integridad | Adecuado | Media (RLS sin publicar; repos a unificar) |

## F. Recomendaciones priorizadas

1. ~~**Publicar y evidenciar la RLS.**~~ **RESUELTO (1/7/2026):** se publicó `db/schema.sql` con `ENABLE ROW LEVEL SECURITY`, políticas de lectura para `authenticated`, grants de escritura para `service_role` y vistas con `security_invoker`, verificado contra PostgreSQL 16. **Acción restante:** aplicar el script en la instancia Supabase de producción y verificar la publicación de Realtime (`supabase_realtime`).
2. **Unificar el repositorio de referencia.** Declarar en la tesis un único repositorio, completo (frontend al día + esquema + workflow), coherente con el texto, para que el jurado clone y verifique sin ambigüedad. **Bloqueante.**
3. **Incorporar la evidencia probatoria ausente** (Figuras 1–10) y **rehacer la Tabla 9** separando *esperado* de *observado* con evidencia por escenario (captura, registro en BD, correo). Con el artefacto ya reproducible, esto es directo. **Bloqueante.**
4. ~~**Agregar una sección de Antecedentes / Estado del arte**~~ **PARCIAL (1/7/2026):** §2.7 (HubSpot, Pipedrive, Zapier, Make + vacío) y §2.8 (**construir vs. configurar** justificado con cuatro razones y trade-offs) agregadas al Capítulo 2. **Acción restante:** sumar una fuente arbitrada/peer-reviewed adicional sobre adopción o TCO de automatización de marketing/ventas.
5. ~~**Resolver las incoherencias frontend–documento**~~ **RESUELTO (1/7/2026):** se corrigió el frontend (que era el desalineado, no el documento) — `aceptar-propuesta.tsx` ahora hace POST con `{lead_id, token}` en el cuerpo (el workflow n8n ya esperaba eso: `Code - Validar Token` lee `body.lead_id`/`body.token`), y `lead-form.tsx` apunta a `/webhook/lead/nuevo` (producción) en vez de `/webhook-test/`.
6. ~~**Corregir el conteo del modelo de datos**~~ **RESUELTO (1/7/2026):** §4.4 y la Tabla 6 ahora declaran **cinco** tablas (`leads`, `facturas`, `seguimientos`, `logs`, `profiles`) y los cuatro estados de `estado_pago` (`PENDIENTE`/`COBRADO`/`VENCIDA`/`ANULADA`), con sus transiciones descriptas en §4.8. **Pendiente aparte:** reportar `smoke_code_nodes.js` en el Capítulo 5 y ajustar el ítem 5 de Trabajos Futuros (no forma parte de esta corrección).
7. **Fundamentar empíricamente el problema** (§1.1–1.2) con al menos una fuente, y reforzar el relevamiento (§3.3).
8. **Correcciones formales:** declarar la norma APA, generar índice, paginación y corregir la atribución del webhook a Fielding (§2.1).
9. **Control de integridad** (antiplagio + detección de IA) y **rotación de credenciales** de servicio (§8, ítem 6).

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
- [ ] **(v3)** **Unificar el repositorio de referencia**: un único repo completo (frontend al día + `db/schema.sql` + `workflow/crm_postgres.json`) declarado en la tesis.
- [ ] Incorporar **todas** las figuras del Anexo A (Figuras 1–10) y reemplazar los *"Deben incorporarse en la versión final"*.
- [~] **Rehacer la Tabla 9** — PARCIAL (1/7/2026): columnas separadas *Resultado esperado* / *Resultado observado* / *Evidencia* implementadas en `tesis.docx` (esperado derivado de las reglas de diseño ya documentadas —Tabla 4—, observado tomado del reporte existente por escenario). Falta **cargar la evidencia real** por escenario (captura, registro de ejecución de n8n, correo, fila en BD); las celdas quedaron con placeholder `Pendiente — …`.
- [~] **Generar el índice automático y agregar paginación** — PARCIAL (1/7/2026): el documento ya trae el campo `TOC` (`\o "1-3" \h \z \u`) y el campo `PAGE` en el pie de página. Como el `.docx` se genera sin motor de layout, Word debe calcular los valores reales la primera vez que se abre: falta **actualizar los campos en Word** (Ctrl+A → F9, o clic derecho sobre "Índice" → Actualizar toda la tabla) y guardar antes de la entrega final.

### Mayores (revisión sustantiva)

- [~] **Antecedentes / Estado del arte** — PARCIAL (1/7/2026): §2.7 (HubSpot, Pipedrive, Zapier, Make + párrafo del vacío) agregada al final del Capítulo 2. Falta reforzar con una fuente arbitrada/peer-reviewed adicional.
- [x] **Justificar construir vs. configurar** — HECHO (1/7/2026): §2.8 con cuatro razones (costo/lock-in, propiedad del dato, personalización de reglas, objetivo formativo), trade-offs honestos y cierre que fija el aporte original; responde directamente a la cuestión 6 de la defensa.
- [x] **(v3)** **Método del webhook de aceptación y endpoint del formulario** — RESUELTO (1/7/2026): se corrigió el frontend (`aceptar-propuesta.tsx` a POST con `{lead_id, token}` en el cuerpo; `lead-form.tsx` a `/webhook/lead/nuevo` de producción), que era lo desalineado — Tabla 8 y el workflow n8n ya coincidían en POST/producción.
- [x] **(v3)** **Conteo del modelo de datos y estados de factura** — RESUELTO (1/7/2026): §4.4 y Tabla 6 ahora declaran **cinco** tablas (se sumó `profiles` tras la publicación de RLS) incluyendo `logs`, con `estado_pago` documentado en sus cuatro valores (`PENDIENTE`/`COBRADO`/`VENCIDA`/`ANULADA`) y sus transiciones en §4.8.
- [ ] **(v3)** Reportar en el Capítulo 5 la prueba existente `smoke_code_nodes.js` y reformular el ítem 5 de Trabajos Futuros.
- [ ] Fundamentar la premisa del problema (§1.1–1.2) con fuente y reforzar el relevamiento (§3.3) con usuarios reales.
- [ ] Añadir **métricas observadas** mínimas (latencia de la suscripción en tiempo real, tiempo de generación del PDF).

### Menores / formales

- [ ] **Declarar la norma de citación** (APA 7) en el cuerpo.
- [ ] Corregir la **atribución del webhook** a Fielding (2000) en §2.1.
- [ ] Incorporar más **fuentes arbitradas recientes** (peer-reviewed, últimos 5–10 años).
- [ ] Verificar que cada tabla y figura esté numerada y **citada en el texto**.
- [ ] Confirmar **correspondencia bidireccional** entre citas y entradas de Referencias.

### Integridad y seguridad

- [ ] Pasar el documento por **antiplagio** y **detección de IA**; dejar constancia.
- [ ] **Rotar las claves de servicio** potencialmente expuestas (§8, ítem 6) y describir su protección.
- [ ] Describir el manejo de **concurrencia** del token de aceptación (§4.3.2) y la exposición del token en la URL (GET).

### Verificación previa a la defensa

- [ ] RLS publicada y verificable; repositorio de referencia unificado y declarado.
- [ ] Índice, figuras, paginación y Tabla 9 (esperado/observado) presentes.
- [ ] Sección de antecedentes incorporada.
- [x] Incoherencias de webhook (método y endpoint) resueltas (1/7/2026).
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
