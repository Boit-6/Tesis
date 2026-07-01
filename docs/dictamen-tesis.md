# Dictamen de Evaluación de Trabajo Final

> Evaluación par académico (perfil compatible CONEAU) del documento `tesis.docx`.
> **Iteración v2 (1 de julio de 2026)** — incorpora la verificación del documento contra el
> repositorio de código designado como base de evidencia: `https://github.com/Boit-6/Tesis.git`
> (commit único `36813d6`). Los cambios respecto de la v1 se concentran en el Paso 0, el
> Veredicto, las dimensiones 1, 7, 8, 12 y 13, la matriz E, la nueva sección **★ Verificación
> contra el repositorio**, y las secciones F, G y H.

---

## Paso 0 — Calibración previa

| Elemento | Determinación |
|---|---|
| **Tipo de trabajo** | Trabajo Final de grado (Tecnicatura Universitaria en Programación, UTN–FRM). No es tesis de posgrado; los estándares Res. ME 160/2011 se aplican solo como referencia de calidad, no como vara plena. |
| **Naturaleza** | Desarrollo tecnológico de carácter aplicado (artefacto de software). Correctamente autodeclarado: *"su resultado principal es un artefacto de software […] y no la contrastación de una hipótesis empírica"* (§3.1). |
| **Disciplina / subcampo** | Ingeniería de software; automatización de procesos / orquestación de flujos de trabajo (BPA), gestión de leads. |
| **Norma de citación** | No declarada explícitamente; **inferida como APA 7**. *La ausencia de declaración explícita de la norma es la primera observación formal.* |
| **Extensión / idioma / completitud** | ~7.400 palabras, español (abstract en inglés). **Documento formalmente incompleto**: índice no generado (*"Actualice este índice en Word"*, §Índice), sin paginación, y **todas las evidencias visuales ausentes** (*"Las capturas deben incorporarse en la versión final del documento"*, §5 y Anexo A). |
| **Reproducibilidad frente al repositorio** | **Deficiente.** El §4.1 declara que *"Las afirmaciones sobre el frontend se apoyan en el código fuente del repositorio del proyecto; las relativas al backend de automatización, en el flujo de trabajo exportado desde n8n."* La verificación contra `Boit-6/Tesis.git` confirma con precisión el backend (n8n) pero **refuta o no encuentra respaldo para varias afirmaciones centrales del frontend y de la seguridad** (autenticación, RLS, tiempo real, patrón de tres clientes). Véase la sección ★. |

> **Observación crítica de entrada (v1):** el documento se identifica como no-final (índice sin actualizar, Figuras 1–10 pendientes).
>
> **Observación crítica de entrada (v2):** el repositorio designado como base de evidencia **no reproduce el sistema que la tesis describe**. La versión publicada carece de autenticación, RLS y tiempo real, y contiene código que **contradice** afirmaciones específicas del Capítulo 4 (un botón de refresco manual que, según su propio comentario, *"Reemplaza al Realtime"*, y un dashboard sin autenticación que lee con la *service key* que evade la RLS). Un jurado que clone el repositorio no puede verificar la arquitectura de seguridad descrita.

---

## A. Carátula del dictamen

- **Título:** *Automatización de Sistema de Tickets para Freelancers con n8n — Diseño e implementación de una plataforma web para la gestión automatizada del ciclo de vida del cliente.*
- **Autores:** Mateo Morgui; Tobías Rivas. **Director:** Alberto Cortez.
- **Tipo:** Trabajo Final de grado — desarrollo tecnológico aplicado.
- **Disciplina:** Ingeniería de software / automatización de procesos.
- **Norma detectada:** APA 7 (inferida, no declarada).
- **Repositorio de evidencia:** `https://github.com/Boit-6/Tesis.git` (commit `36813d6`).
- **Fecha de evaluación:** 1 de julio de 2026 (iteración v2).

## B. Síntesis ejecutiva

El trabajo demuestra que el ciclo de vida comercial de un freelancer puede automatizarse de extremo a extremo con una arquitectura orientada a eventos de bajo código (Next.js + n8n + Supabase). **Principal fortaleza:** una capa de orquestación sólida y **fielmente documentada** —los 71 nodos, las reglas de scoring, la normalización, los webhooks y los cron coinciden exactamente con el código. **Principal debilidad:** el repositorio designado como base de evidencia **no reproduce** la arquitectura de seguridad y de frontend que la tesis describe: no hay autenticación ni RLS, el tiempo real fue reemplazado por un refresco manual y el tablero lee con una *service key* que evade la RLS; a esto se suma una validación autorreferencial con la evidencia visual ausente. La brecha es de **versionado y verificabilidad**: las funciones descritas existen en el árbol de trabajo local de los autores, pero no en el repositorio publicado, que además contradice afirmaciones puntuales. **Veredicto:** aprobado con observaciones mayores; la sincronización del repositorio con el documento y la corrección de la arquitectura de seguridad son condiciones previas a la defensa.

## C. Veredicto

**APROBADO CON OBSERVACIONES MAYORES** (defensa habilitada solo tras revisión sustantiva del documento y del artefacto).

Justificación: la concepción arquitectónica es pertinente, los objetivos son trazables y el backend de automatización está documentado con exactitud verificable, lo que distingue al trabajo de uno devuelto para reelaboración. Sin embargo, la verificación contra el repositorio agrava el cuadro de la v1: (i) la arquitectura de seguridad descrita (dashboard autenticado que lee bajo políticas de RLS) **no existe en el artefacto publicado**, que carece de autenticación y lee con una clave de servicio que evade la RLS; (ii) el escenario de validación E7 (actualización en tiempo real) queda **contradicho** por un tablero de refresco manual; y (iii) persiste la validación autorreferencial con evidencia visual ausente. Ninguna deficiencia es conceptualmente irreparable —el código que respalda lo descrito existe en el árbol local—, pero exigen sincronizar el repositorio, corregir la seguridad y rehacer el aparato probatorio antes de la defensa.

## ★ Verificación contra el repositorio de código (iteración v2)

Se clonó `Boit-6/Tesis.git` y se contrastó, afirmación por afirmación, el Capítulo 4 y los anexos con el código. Resultado: **el backend n8n confirma la tesis con precisión; el frontend y la seguridad, no.**

### ★.1 Afirmaciones CONFIRMADAS por el código

| Afirmación de la tesis | Evidencia en el repositorio |
|---|---|
| *"El flujo implementado consta de 71 nodos"* (§4.1, §4.3, Anexo B) | `workflow/crm_postgres.json` contiene exactamente **71 nodos**. |
| Reglas de score (Tabla 4): presupuesto 40/30/20/10, urgencia 30/15/5, servicio 20/18/15/12/5, +5 teléfono, +5 descripción, HOT≥70 / WARM≥40 | `Code - Scoring` reproduce **literalmente** esos umbrales y ponderaciones. |
| Normalización (§4.3.1): trim, correo a minúsculas, urgencia por defecto `media`, servicio por defecto `desarrollo_web`, tres validaciones, `LD-<ts>-<rand>`, truncado a 2000 | `Code - Normalizar Lead` implementa cada paso tal como se describe. |
| Webhooks (Tabla 8): `/lead/nuevo` POST, `/lead-acepta`, `/pago-confirmado` GET, `/proyecto-cerrado` POST | Rutas y métodos coinciden exactamente en los nodos webhook. |
| Cron (§4.3.5): follow-up L–V 9:00, recordatorios diario 10:00, métricas diario 23:59 | Expresiones cron `0 9 * * 1-5`, `0 10 * * *`, `59 23 * * *`. |
| `accept_token` UUID (§4.4, Tabla 5) | `db/schema.sql:47`: `accept_token UUID NOT NULL DEFAULT gen_random_uuid()`. |
| Estados del lead (Tabla 7) y vistas `metrics_mensuales` / `facturas_pendientes` (§4.4) | Enum `lead_estado` y ambas vistas existen en `db/schema.sql`. |

### ★.2 Afirmaciones CONTRADICHAS o SIN RESPALDO en el repositorio

| Afirmación de la tesis | Hallazgo en el repositorio | Gravedad |
|---|---|---|
| *"el tablero se suscribe a los cambios […] mediante el canal de tiempo real de Supabase (postgres_changes)"* (§4.2.5); RNF6; decisión de diseño *"tiempo real por suscripción frente al sondeo"* (§4.7); escenario **E7** *"en tiempo real, sin recarga manual"* | `dashboard/refresh-button.tsx:6` declara: *"// **Reemplaza al Realtime**: re-ejecuta el Server Component"*. El tablero usa un **botón manual** `router.refresh()`. **No hay** `postgres_changes` ni suscripción. **E7, tal como se describe, es irreproducible.** | **Alta** |
| *"El acceso al tablero requiere autenticación con Supabase Auth"* (§4.6); RNF1; *"Autenticación con Supabase Auth"* (§4.2.2); *"Protección de rutas […] proxy.ts"* (§4.2.3) | `dashboard/page.tsx` **no realiza ninguna verificación de sesión**; no existen `login/`, `register/`, `auth/`, `proxy.ts` ni `auth-errors.ts` en el repo. La ruta `/dashboard` es **pública**. | **Alta** |
| *"El tablero […] lee directamente de Supabase en modo solo lectura, amparado por las políticas de RLS"* (§4.2.5) | `dashboard/page.tsx` usa `createServerSupabase()`, que en `lib/supabase-server.ts` emplea `SUPABASE_SERVICE_ROLE_KEY` — cuyo propio comentario advierte *"La service key **bypassea RLS**"*. El tablero **evade** la RLS, no se ampara en ella. | **Alta** |
| *"se habilita la seguridad a nivel de fila con políticas […] las vistas se declaran con la opción security_invoker"* (§4.6, Anexo C); RNF1 | `db/schema.sql` **no contiene** `ENABLE ROW LEVEL SECURITY`, ni `CREATE POLICY`, ni `security_invoker`. Las vistas se crean como `CREATE OR REPLACE VIEW` **sin** esa opción. | **Alta** |
| *"el patrón de tres clientes de Supabase, que separa las responsabilidades de navegador, servidor y borde"* (§4.2.4, §4.7) | El repo tiene **dos** clientes (`supabase.ts`, `supabase-server.ts`). No hay cliente de borde porque no hay middleware. | Media |
| *"El modelo relacional se compone de **tres tablas** y dos vistas"* (§4.4) | Hay **cuatro** tablas: `leads`, `facturas`, `seguimientos` y **`logs`** (`db/schema.sql:88`), esta última no mencionada. | Media |
| *"Incorporar pruebas automatizadas […] Añadir pruebas de los nodos de lógica"* como **trabajo futuro** (§8, ítem 5) | Ya existe `tests/smoke_code_nodes.js`, que ejecuta el JS de cada nodo *Code* con datos de ejemplo. La prueba **ya está hecha** y el documento no la reporta. | Baja |

> **Interpretación (sin acusación):** las funciones ausentes en el repositorio **sí existen** en el árbol de trabajo local de los autores (se verificó la presencia de `lib/supabase/{client,server,middleware}.ts`, `auth-errors.ts`, `login/`, `register/`, `auth/`, `proxy.ts` y `dashboard-client.tsx` con suscripción en tiempo real). Se trata, por tanto, de un **fallo de versionado/publicación**: el documento describe un estado más avanzado que el que se subió al repositorio designado como evidencia, y ese repositorio además contiene código que contradice el texto. No hay indicios de fabricación, pero sí un problema serio de **verificabilidad e integridad de la evidencia** que debe resolverse.

## D. Evaluación detallada por dimensión

**1. Estructura general y formato — Adecuado.**
Organización IMRyD-adaptada y correcta. *Observación de alta gravedad formal:* índice no generado, sin paginación y **todas las figuras ausentes** (Anexo A). *v2:* la incompletitud se extiende al artefacto —el repositorio no está alineado con el documento (sección ★)—, lo que compromete el criterio de calidad de reproducibilidad propio de una tesis de desarrollo.

**2. Planteamiento del problema — Adecuado.**
Formulación precisa que distingue tema, problema y pregunta (§1.3). *Debilidad:* la premisa empírica (*"crecimiento sostenido"* del trabajo independiente, §1.1) se afirma sin fuente. *Verificación externa requerida.*

**3. Hipótesis — Adecuado (ausencia justificada).**
Correctamente no se formula hipótesis: *"el trabajo no formula una hipótesis en sentido estadístico"* (§3.1). Sin penalización.

**4. Objetivos — Excelente.**
General y cinco específicos en infinitivo, alineados y trazables vía la matriz del Anexo E. Sin objetivos huérfanos. Es la dimensión más fuerte. *Matiz v2:* la trazabilidad es documental; parte de lo que la matriz declara "validado" (p. ej. OE4 vía E7) no es reproducible en el repositorio.

**5. Estado del arte / antecedentes — Insuficiente.**
No existe sección de antecedentes; el Capítulo 2 es marco conceptual, no revisión de soluciones comparables (CRMs, iPaaS). El *"vacío de conocimiento"* no se establece frente al estado del arte real, ni se justifica *construir* frente a *usar* herramientas existentes.

**6. Marco teórico — Adecuado.**
Pertinente, con definiciones operativas. *Observación de precisión:* se cita a Fielding (2000) para definir el webhook (§2.1); esa tesis fundamenta REST, no el webhook. Atribución imprecisa.

**7. Metodología / propuesta de desarrollo — Adecuado (con reserva de reproducibilidad).**
Apropiada para desarrollo: enfoque iterativo-incremental, RF (Tabla 1), RNF anclados a ISO/IEC 25010 (Tabla 2), herramientas (Tabla 3) y estrategia de validación (§3.7). *Debilidad v1:* relevamiento (§3.3) endeble, sin usuarios reales. *Debilidad v2 (agravante):* la **propuesta de desarrollo no es enteramente verificable** en el artefacto publicado. Las decisiones de diseño que el §4.7 destaca —"tres clientes" y "tiempo real por suscripción"— **no están en el repositorio** (hay dos clientes y refresco manual; sección ★). Para una tesis de desarrollo, donde la validación del artefacto es criterio central, esta brecha pesa.

**8. Resultados / validación — Insuficiente.**
Debilidad central, ahora reforzada. La Tabla 9 fusiona *"Resultado esperado y observado"* en una columna, y el cierre *"En todos los casos el comportamiento observado coincidió con el esperado"* (§5) es autorreporte sin evidencia (capturas ausentes). *v2:* al menos un escenario es **falsable y falso** contra el artefacto —**E7** afirma actualización *"en tiempo real, sin recarga manual"*, pero el repositorio implementa un botón de refresco manual que *"Reemplaza al Realtime"*. Una validación que declara verificado lo que el código contradice es una falla grave de validez interna.

**9. Discusión — Adecuado.**
Reconoce limitaciones con rigor (validez del scoring *"de diseño y no empírica"*, §6; despliegue local sin URL pública). *v2:* la discusión, no obstante, **omite** las divergencias entre lo descrito y lo publicado en materia de seguridad y tiempo real.

**10. Conclusiones — Adecuado.**
Responden punto por punto a los OE (§7) y distinguen lo demostrado de lo sugerido y lo abierto. *v2:* la conclusión de OE4 (*"se expuso el tablero autenticado con métricas en tiempo real"*) **no se sostiene** en el repositorio (ni autenticación ni tiempo real). Hereda la fragilidad de la dimensión 8.

**11. Trabajos futuros — Adecuado.**
Seis líneas priorizadas y ancladas en limitaciones reales. *v2:* el ítem 5 (pruebas automatizadas) está **parcialmente ya resuelto** en el repositorio (`tests/smoke_code_nodes.js`), lo que revela desincronización documento–artefacto.

**12. Bibliografía y citación — Adecuado.**
APA consistente; sin huérfanos evidentes. *Debilidades:* baja proporción de literatura arbitrada reciente (un solo artículo peer-reviewed, Järvinen & Taiminen, 2016) y la atribución imprecisa a Fielding.

**13. Originalidad e integridad académica — Adecuado (con verificación reforzada).**
No hay indicios de plagio ni saltos de registro. *v2:* la divergencia documento–repositorio introduce un problema de **integridad de la evidencia**: el texto describe, como respaldadas por "el repositorio del proyecto", funciones que ese repositorio no contiene. Lo más probable —confirmado por el árbol local— es un fallo de versionado, no fabricación; aun así, debe corregirse y declararse. Se mantiene la recomendación de control antiplagio y de detección de IA como práctica estándar.

## E. Matriz resumen

| # | Dimensión | Nivel | Gravedad de las observaciones |
|---|---|---|---|
| 1 | Estructura y formato | Adecuado | **Alta** (índice, paginación, figuras; repo desalineado) |
| 2 | Planteamiento del problema | Adecuado | Media (premisa sin fuente) |
| 3 | Hipótesis | Adecuado (N/A justificada) | Baja |
| 4 | Objetivos | **Excelente** | Baja |
| 5 | Estado del arte / antecedentes | **Insuficiente** | **Alta** |
| 6 | Marco teórico | Adecuado | Media (atribución a Fielding) |
| 7 | Metodología / desarrollo | Adecuado (con reserva) | **Alta** (reproducibilidad) |
| 8 | Resultados / validación | **Insuficiente** | **Alta** (E7 contradicho por el código) |
| 9 | Discusión | Adecuado | Media (omite divergencias) |
| 10 | Conclusiones | Adecuado | Media (OE4 no sostenido en el repo) |
| 11 | Trabajos futuros | Adecuado | Baja |
| 12 | Bibliografía y citación | Adecuado | Media |
| 13 | Originalidad e integridad | Adecuado | **Alta** (integridad de la evidencia) |

## F. Recomendaciones priorizadas

1. **Sincronizar el repositorio con el documento.** Publicar en `Boit-6/Tesis.git` la versión del frontend que la tesis describe (autenticación, patrón de tres clientes, `proxy.ts`, dashboard con suscripción en tiempo real) y las políticas de RLS del esquema. Sin esto, la arquitectura de seguridad del Capítulo 4 no es verificable. **Bloqueante.**
2. **Reconciliar la arquitectura de seguridad.** O bien el tablero se autentica y lee bajo RLS (como afirma el texto), o bien el texto debe describir lo que realmente hace el artefacto (tablero interno sin auth con *service key*). La contradicción actual —RNF1 y §4.2.5 frente a `dashboard/page.tsx` + `supabase-server.ts`— debe eliminarse, e incorporar las políticas RLS y el `security_invoker` al `schema.sql`. **Bloqueante y con impacto de seguridad.**
3. **Corregir la validación del tiempo real (E7).** Ajustar §4.2.5, §4.7, RNF6 y el escenario E7 al mecanismo real (refresco manual `router.refresh()`), o restituir la suscripción `postgres_changes` en el repositorio. Un escenario de validación no puede afirmar lo que el código niega.
4. **Incorporar la evidencia probatoria ausente** (Figuras 1–10; capturas de formulario, tablero, flujos n8n, propuesta y factura PDF) y **rehacer la Tabla 9** separando *esperado* de *observado* con evidencia por escenario. **Bloqueante.**
5. **Corregir el conteo del modelo de datos** (§4.4): son cuatro tablas —incluir `logs`— y documentar los estados de pago `VENCIDA`/`ANULADA` (Tabla 6).
6. **Reportar las pruebas existentes.** Integrar `tests/smoke_code_nodes.js` en el Capítulo 5 como parte de la validación y reformular el ítem 5 de Trabajos Futuros (que hoy la presenta como pendiente).
7. **Agregar una sección de Antecedentes / Estado del arte** y **fundamentar empíricamente el problema** (§1.1–1.2).
8. **Correcciones formales:** declarar la norma APA, generar índice, paginación, y corregir la atribución del webhook a Fielding (§2.1).
9. **Control de integridad** (antiplagio + detección de IA) y **rotación de credenciales** de servicio potencialmente expuestas (ya previsto en §8, ítem 6).

## G. Cuestiones para la defensa oral

1. El §4.2.5 afirma que el tablero *"se suscribe a los cambios […] (postgres_changes)"* y el escenario E7 declara actualización *"en tiempo real, sin recarga manual"*, pero el repositorio implementa un botón que *"Reemplaza al Realtime"*: ¿cuál es el mecanismo real y por qué la validación reporta lo contrario?
2. RNF1 exige que *"El tablero solo es accesible para usuarios autenticados"* y el §4.2.5 dice que lee *"amparado por las políticas de RLS"*; sin embargo, `dashboard/page.tsx` no verifica sesión y lee con la *service key* que *"bypassea RLS"*: ¿qué protege hoy el acceso a los datos de todos los leads en `/dashboard`?
3. El §4.6 y el Anexo C afirman políticas de RLS y vistas con `security_invoker`, ausentes en `db/schema.sql`: ¿dónde están definidas esas políticas y cómo se verifican de forma reproducible?
4. ¿Por qué el repositorio designado como base de evidencia no contiene la capa de autenticación ni el patrón de tres clientes que el documento describe? ¿Qué versión debe considerar el jurado como la evaluable?
5. Los umbrales del scoring (HOT ≥ 70) se fijaron por *"criterio experto"* (§6): ¿sobre qué base, y cómo se comportaría un lead de presupuesto alto y urgencia baja?
6. Existiendo CRMs y plataformas de automatización (Zapier, Make, HubSpot) que cubren gran parte del ciclo, ¿qué justifica construir la solución en lugar de configurarlas, y en qué reside el aporte original?

---

## H. Checklist de correcciones

Orden: primero los **bloqueantes** (condición para habilitar la defensa), luego los **mayores** y por último los **menores/formales**. Los ítems nuevos de la iteración v2 se marcan con **(v2)**.

### Bloqueantes (sin esto no se habilita la defensa)

- [ ] **(v2)** Sincronizar `Boit-6/Tesis.git` con el sistema descrito: subir autenticación (`login/`, `register/`, `auth/`, `proxy.ts`, `auth-errors.ts`), el patrón de tres clientes (`lib/supabase/{client,server,middleware}.ts`) y el `dashboard-client.tsx` con suscripción en tiempo real.
- [ ] **(v2)** Incorporar al `db/schema.sql` las políticas de **RLS** (`ENABLE ROW LEVEL SECURITY`, `CREATE POLICY`) y el `security_invoker` de las vistas que la tesis afirma (§4.6, Anexo C).
- [ ] **(v2)** Reconciliar la seguridad del tablero: o se autentica y lee bajo RLS, o el texto se corrige para describir el tablero interno real (sin auth, con *service key*). Eliminar la contradicción con RNF1 y §4.2.5.
- [ ] **(v2)** Corregir el escenario **E7** y §4.2.5/§4.7/RNF6: alinear "tiempo real" con el mecanismo real (`router.refresh()`) o restituir `postgres_changes`.
- [ ] Incorporar **todas** las figuras del Anexo A (Figuras 1–10) y reemplazar los *"Deben incorporarse en la versión final"*.
- [ ] Rehacer la **Tabla 9** con columnas separadas *Resultado esperado* / *Resultado observado* y evidencia por escenario.
- [ ] Generar el **índice** automático y agregar **paginación**.

### Mayores (revisión sustantiva)

- [ ] **(v2)** Corregir el conteo del modelo de datos (§4.4): son **cuatro** tablas (incluir `logs`); documentar estados `VENCIDA`/`ANULADA` (Tabla 6).
- [ ] **(v2)** Reportar en el Capítulo 5 la prueba existente `tests/smoke_code_nodes.js` y reformular el ítem 5 de Trabajos Futuros (hoy la presenta como pendiente).
- [ ] Añadir una sección **Antecedentes / Estado del arte** con soluciones comparables (HubSpot, Pipedrive, Zapier, Make) y establecer el vacío que cubre el trabajo.
- [ ] Justificar la decisión **construir vs. configurar** una herramienta existente.
- [ ] Fundamentar la premisa del problema (§1.1–1.2) con al menos una fuente.
- [ ] Reforzar **Técnicas de relevamiento** (§3.3) con evidencia de usuarios reales, o declararlo como limitación.
- [ ] Añadir **métricas observadas** mínimas (latencia de refresco, tiempo de generación del PDF).

### Menores / formales

- [ ] **Declarar la norma de citación** (APA 7) en el cuerpo.
- [ ] Corregir la **atribución del webhook** a Fielding (2000) en §2.1.
- [ ] Incorporar más **fuentes arbitradas recientes** (peer-reviewed, últimos 5–10 años).
- [ ] Verificar que cada tabla y figura esté numerada y **citada en el texto**.
- [ ] Confirmar **correspondencia bidireccional** entre citas y entradas de Referencias.

### Integridad y seguridad

- [ ] **(v2)** Documentar y declarar la divergencia documento–repositorio como lo que es (versionado), para preservar la integridad de la evidencia.
- [ ] Pasar el documento por **antiplagio** y **detección de IA**; dejar constancia.
- [ ] **Rotar las claves de servicio** potencialmente expuestas (§8, ítem 6) y describir su almacenamiento/protección.
- [ ] Describir el manejo de **concurrencia** del token de aceptación (§4.3.2).

### Verificación previa a la defensa

- [ ] Repositorio sincronizado con el documento (auth, RLS, tres clientes, tiempo real).
- [ ] Arquitectura de seguridad coherente entre texto y código.
- [ ] E7 y demás escenarios reproducibles contra el artefacto publicado.
- [ ] Índice, figuras, paginación y Tabla 9 (esperado/observado) presentes.
- [ ] Sección de antecedentes incorporada.
- [ ] Preparadas las respuestas a las 6 cuestiones de la sección G.

---

### Anexo del evaluador — Base de la verificación (v2)

- Repositorio: `https://github.com/Boit-6/Tesis.git`, commit único `36813d6` *"chore: estructura inicial del repo de tesis"*.
- `workflow/crm_postgres.json`: 71 nodos; `Code - Scoring` y `Code - Normalizar Lead` confirman Tabla 4 y §4.3.1; webhooks y cron confirman Tabla 8 y §4.3.5.
- `db/schema.sql`: cuatro tablas (`leads`, `facturas`, `seguimientos`, `logs`) y dos vistas; **sin RLS/políticas/`security_invoker`**; `accept_token UUID` (línea 47).
- `FormularioLeads/`: dos clientes Supabase; `dashboard/page.tsx` sin autenticación y con `SUPABASE_SERVICE_ROLE_KEY`; `dashboard/refresh-button.tsx` *"Reemplaza al Realtime"*; sin `login/`, `register/`, `auth/`, `proxy.ts`, `auth-errors.ts`.
- `tests/smoke_code_nodes.js`: prueba de humo de los nodos *Code* (existe, no reportada en el documento).
- Contraste con el árbol de trabajo local: las funciones ausentes en el repo (auth, tres clientes, tiempo real) **sí están** presentes localmente → divergencia de versionado.
