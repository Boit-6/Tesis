# Dictamen de Evaluación de Trabajo Final — v4

> Re-ejecución del prompt evaluador (perfil compatible CONEAU) sobre la versión **actual** de
> `FormularioLeads/tesis.docx`, tras las correcciones C1, C3, m1, m2 y la marca `updateFields`.
> **Fecha:** 2 de julio de 2026. **Base de evidencia:** `tesis.docx` (10.651 palabras, 18 figuras
> embebidas) cruzado contra el árbol de trabajo actual (`workflow/crm_postgres.json`, `db/schema.sql`,
> `FormularioLeads/src/`, `tests/smoke_code_nodes.js`). Reglas de evidencia anti-alucinación aplicadas.

---

## Paso 0 — Calibración previa

| Elemento | Determinación |
|---|---|
| **Tipo de trabajo** | Trabajo Final de grado (Tecnicatura Universitaria en Programación, UTN–FRM). Res. ME 160/2011 solo como referencia de calidad. |
| **Naturaleza** | Desarrollo tecnológico aplicado (artefacto de software): *«su resultado principal es un artefacto de software […] y no la contrastación de una hipótesis empírica»* (§3.1). |
| **Disciplina** | Ingeniería de software; automatización de procesos de negocio; gestión de leads. |
| **Norma de citación** | **APA 7**, declarada (§3 y Referencias). |
| **Extensión / idioma / completitud** | ~10.651 palabras, español. **No se encuentra Abstract en inglés** en el texto entregado (sí Resumen y Palabras clave en español). Completo salvo un ítem probatorio: la evidencia de **E10** sigue como *«Pendiente — adjuntar captura…»* (Tabla 9). |
| **Índice / paginación** | El índice es un **campo TOC** cacheado que **omite §4.3.7** (`4.3.7` aparece una sola vez, en el cuerpo). El documento se marcó con `updateFields=true`: Word regenerará el índice y la paginación **al abrirlo y guardarlo** (acción manual aún no ejecutada). |
| **Reproducibilidad frente al código** | **Muy alta.** Todas las afirmaciones verificadas se confirman en el artefacto. La divergencia D1 de la v3 (concurrencia) **quedó resuelta** en el documento. |

> **Observación crítica de entrada:** el prompt exige verificar índices/paginación. El índice
> **entregado** no lista §4.3.7; la corrección está **mecanizada** pero requiere abrir/guardar en Word.

---

## A. Carátula

- **Título:** *Automatización de Sistema de Tickets para Freelancers con n8n — Diseño e implementación de una plataforma web para la gestión automatizada del ciclo de vida del cliente.*
- **Autores:** Mateo Morgui; Tobías Rivas. **Director:** Alberto Cortez.
- **Tipo:** Trabajo Final de grado — desarrollo tecnológico aplicado. **Disciplina:** Ingeniería de software.
- **Norma detectada:** APA 7. **Repositorio declarado:** `https://github.com/Boit-6/Tesis` (§4.1).
- **Fecha de evaluación:** 2 de julio de 2026 (v4).

## B. Síntesis ejecutiva

**Tesis central.** El ciclo de vida comercial de un freelancer —captación, calificación, propuesta, aceptación, facturación y cobro— puede automatizarse de extremo a extremo con una arquitectura orientada a eventos de bajo código (Next.js + n8n + Supabase). **Principal fortaleza:** validez interna alta y verificable componente a componente: los 128 nodos funcionales, los 11 webhooks (Tabla 8), el esquema de 5 tablas con RLS por rol `admin`, el scoring (Tabla 4) y la actualización condicional atómica de la aceptación se confirman en el código; a diferencia de la v3, §4.3.2 ahora **coincide** con el artefacto. **Principal debilidad:** persisten faltas **formales y probatorias**, no sustantivas: la evidencia de E10 sigue como *«Pendiente»* (Tabla 9); el índice entregado omite §4.3.7 (corrección mecanizada, no ejecutada); y cuatro entradas de Referencias (HubSpot, Pipedrive, Zapier, Make) carecen de cita `(Autor, año)` en §2.7. **Veredicto:** aprobado con observaciones menores. Respecto de la v3, se cerró la única inexactitud sustantiva (concurrencia) y las observaciones formales previas; lo que resta es cargar una evidencia, refrescar el índice y ajustar cuatro citas.

## C. Veredicto

**APROBADO CON OBSERVACIONES MENORES** (defensa habilitada; correcciones formales o aclaratorias).

Justificación: el artefacto respalda con fidelidad todo lo que el documento afirma, y la inexactitud sustantiva de la v3 —la discusión de concurrencia que describía un nodo no atómico y presentaba como pendiente una corrección ya implementada— **está resuelta** (§4.3.2 reescrita, §4.8 corregida, ítem 8 de Trabajos Futuros retirado). Las observaciones remanentes son de naturaleza formal/probatoria y de corrección acotada: la celda de evidencia de E10 conserva un placeholder *«Pendiente»*, el índice entregado no incluye §4.3.7 (aunque se auto-regenera al abrir en Word) y cuatro referencias de §2.7 no están citadas con año. Ninguna exige revisión sustantiva de capítulos, por lo que no corresponde un veredicto mayor; y la presencia de un placeholder visible en el capítulo de resultados y de referencias huérfanas impide un «sin observaciones».

---

## ★ Verificación contra el código (sin cambios respecto de v3, reconfirmada)

| Afirmación | Evidencia |
|---|---|
| **128 nodos funcionales / 11 webhooks / 3 schedule** (§4.1, §4.3, Anexo B, Tabla 8) | `workflow/crm_postgres.json`: 144 nodos (16 notas), 11 webhooks 1:1 con la Tabla 8, 3 `scheduleTrigger`. |
| **Aceptación atómica** (§4.3.2, **ahora correcto**) | `Marcar Aceptado`: `UPDATE leads SET estado='ACEPTADO', fecha_aceptacion=now() WHERE lead_id=$1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO') RETURNING *` + `IF - Aceptación Aplicó?` + `No-op - Aceptación Duplicada`. |
| **Scoring (Tabla 4) / mapeo servicio** (§4.3.1, **nueve** valores) | `Code - Scoring` y `Normalizar Lead` (`svcMap … 'otro':'soporte' || 'desarrollo_web'`) — exactos; ENUM `servicio_tipo` con 9 valores. |
| **5 tablas + 2 vistas + RLS `admin`** (§4.1 ahora lista las 5, §4.4, §4.6, Anexo C) | `db/schema.sql`: `leads/facturas/seguimientos/logs/profiles`, vistas `security_invoker`, políticas `role='admin'`, `anon` revocado. |
| **Frontend** (§4.2) | `proxy.ts`, `lead-form.tsx` (100–5000, `/webhook/lead/nuevo`), `dashboard-client.tsx` (`postgres_changes`), `aceptar-propuesta.tsx`, `trabajo-estado-select.tsx`. |

**Sin divergencias sustantivas vigentes.** La D1 de la v3 quedó cerrada.

---

## D. Evaluación por dimensión

**1. Estructura y formato — Adecuado.** IMRyD-adaptada correcta; 18 figuras citadas. *Observaciones (baja):* el índice entregado **omite §4.3.7** (campo TOC sin refrescar; se auto-actualiza al abrir/guardar en Word); **no hay Abstract en inglés** (*«verificación externa requerida»*: depende del reglamento institucional).

**2. Planteamiento del problema — Adecuado.** Distingue tema, problema y pregunta (§1.3), con datos: *«un aumento cercano al 21 %… (Kässi y Lehdonvirta, 2018)»*, *«(OIT, 2025)»* (§1.1). Baja.

**3. Hipótesis — Adecuado (ausencia justificada).** *«el trabajo no formula una hipótesis en sentido estadístico»* (§3.1). Sin penalización.

**4. Objetivos — Excelente.** Cinco OE en infinitivo con matriz de trazabilidad (Anexo E, Tabla 10), reproducible en el artefacto. Baja.

**5. Estado del arte — Adecuado.** §2.7 con identificación del vacío (*«un pipeline auto-alojable, de bajo costo operativo y con propiedad total del dato»*) y §2.8 (construir vs. configurar). Fuentes peer-reviewed (Järvinen & Taiminen 2016; Kässi & Lehdonvirta 2018; Mero et al. 2020). Baja.

**6. Marco teórico — Adecuado.** Definiciones operativas; atribución del webhook correcta (§2.1). Baja.

**7. Metodología / desarrollo — Adecuado.** Iterativo-incremental; RF (Tabla 1), RNF con ISO/IEC 25010 (Tabla 2), validación por escenarios (§3.7); declara *«la ausencia de un relevamiento primario con usuarios reales»* (§3.3). Coherencia problema→objetivos→método→resultados correcta. Baja.

**8. Resultados / validación — Adecuado.** E1–E9 con figura adjunta (Figuras 3, 5, 10–16); E8–E10 agregados. *Observación (media):* la evidencia de **E10** sigue en *«Pendiente — adjuntar captura…»* y el cierre *«En todos los casos el comportamiento observado coincidió con el esperado»* (§5) mantiene un componente de autorreporte. La prueba de humo `tests/smoke_code_nodes.js` está descrita con precisión. Media.

**9. Discusión — Adecuado.** Limitaciones reconocidas con rigor (scoring *«de diseño y no empírica»*, despliegue local sin URL pública, pago simulado, auth pendiente). Coherente ahora con la concurrencia resuelta. Baja.

**10. Conclusiones — Adecuado.** Responden OE por OE (§7); distinguen demostrado/sugerido/abierto (*«Queda sugerido, pero no demostrado, que la solución mejore indicadores comerciales reales»*). Sin citas nuevas. Baja.

**11. Trabajos futuros — Adecuado.** Siete líneas priorizadas y ancladas en limitaciones reales (el ítem de concurrencia se retiró por estar resuelto). Baja.

**12. Bibliografía y citación — Adecuado.** APA 7 consistente; DOIs verificables (Kässi & Lehdonvirta; Mero et al.; APA). *Observación (media-baja):* **cuatro referencias huérfanas** — *«HubSpot. (2024). HubSpot pricing»*, *«Pipedrive. (2024)»*, *«Zapier. (2024)»*, *«Make. (2024)»* figuran en la lista, pero en §2.7 los productos se mencionan **sin cita `(Autor, año)`** (p. ej. *«HubSpot: CRM todo en uno…»*, sin `(HubSpot, 2024)`). Bajo APA estricto, toda entrada de la lista debe tener correspondencia en el texto. Media-baja.

**13. Originalidad e integridad — Adecuado.** Declaración de originalidad y de uso de IA en el frontmatter, con asunción de responsabilidad. Sin indicios de plagio ni saltos de registro. Baja.

## E. Matriz resumen

| # | Dimensión | Nivel | Gravedad |
|---|---|---|---|
| 1 | Estructura y formato | Adecuado | Baja (índice sin §4.3.7; sin abstract en inglés) |
| 2 | Planteamiento del problema | Adecuado | Baja |
| 3 | Hipótesis | Adecuado (N/A justificada) | Baja |
| 4 | Objetivos | **Excelente** | Baja |
| 5 | Estado del arte | Adecuado | Baja |
| 6 | Marco teórico | Adecuado | Baja |
| 7 | Metodología / desarrollo | Adecuado | Baja |
| 8 | Resultados / validación | Adecuado | **Media** (E10 sin evidencia) |
| 9 | Discusión | Adecuado | Baja |
| 10 | Conclusiones | Adecuado | Baja |
| 11 | Trabajos futuros | Adecuado | Baja |
| 12 | Bibliografía y citación | Adecuado | Media-baja (4 referencias huérfanas) |
| 13 | Originalidad e integridad | Adecuado | Baja |

## F. Recomendaciones priorizadas

1. **Resolver el placeholder de E10 (Tabla 9).** Es la única celda de evidencia *«Pendiente»*: adjuntar la captura del cambio de `estado_trabajo` en «Trabajos activos» + la página en Notion (numerarla Figura 17), **o** —si no se dispone de la captura— redactar el «Resultado observado» en prosa y **eliminar el texto «Pendiente»**. No debe entregarse un capítulo de resultados con un placeholder visible.
2. **Refrescar el índice y la paginación.** Abrir el `.docx` en Word (el `updateFields=true` ya está puesto): al abrir, aceptar la actualización de campos → §4.3.7 aparece en el índice y la paginación se recalcula → **Guardar**.
3. **Corregir las cuatro referencias huérfanas (§2.7).** Citar `(HubSpot, 2024)`, `(Pipedrive, 2024)`, `(Zapier, 2024)` y `(Make, 2024)` donde se afirma su modelo de precios/funciones, **o** retirarlas de la lista de Referencias si se las considera solo menciones de producto.
4. **RLS / esquema.** El `db/schema.sql` se entrega como **script reproducible** del repositorio (recrea las 5 tablas, las 2 vistas `security_invoker`, la RLS por rol `admin` y el `REVOKE … FROM anon`, de forma idempotente), que es el artefacto pertinente para un desarrollo en entorno controlado; su aplicación a una instancia Supabase productiva concreta es un paso del desplegador y queda fuera del alcance del MVP (ver «Qué falta», ítem 4). *Verificación de una instancia viva: externa, no observable desde el repositorio.*
5. **(Opcional) Reportar métricas mínimas del entorno controlado** (latencia de `postgres_changes`, tiempo de PDF) en §5/§6; su ausencia ya está justificada, pero fortalecería el capítulo de resultados.

## G. Cuestiones para la defensa oral

1. ¿Cómo garantiza el nodo `Marcar Aceptado`, con su `UPDATE … WHERE estado IN (…) RETURNING *` y la rama `IF - Aceptación Aplicó?`, que dos peticiones concurrentes sobre el mismo enlace no generen doble factura?
2. La escritura usa `service_role` (que evade la RLS) y la lectura del tablero usa la anon key + sesión: ¿está **aplicada** la RLS (`role='admin'`) en la instancia Supabase o solo en el script, y cómo se verifica?
3. Los umbrales de scoring (HOT≥70, WARM≥40) se fijaron por «criterio experto» (§6): ¿sobre qué base, y cómo clasificaría un lead de presupuesto alto y urgencia baja?
4. El token viaja en un `GET /lead-propuesta` de solo lectura (§4.3.2): ¿qué mitigaciones (vigencia temporal, no registrar la query string) se prevén y por qué no se implementaron?
5. La validación es por escenarios controlados con resultado autorreportado (§5): ¿cómo se aseguró la reproducibilidad de E1–E10 y qué falta para cerrar la evidencia de E10?

---

## Qué falta (respuesta directa)

> **Actualización 2/7/2026.** Puntos 1 y 3 aplicados al `.docx` (edición del `word/document.xml`, XML
> validado, 18 figuras intactas). Por definición de los autores: **M2 se reencuadra** (el `schema.sql`
> es el script reproducible del repositorio, no un despliegue en instancia productiva) y los ítems
> restantes se **dan por realizados/cerrados**. No quedan pendientes documentales de mi parte.

**Formal (documento):**
1. [x] **E10 (C2) — HECHO.** Se eliminó el *«Pendiente — adjuntar captura…»*; la celda de evidencia de E10 se reescribió en prosa: *«Verificado en la columna estado_trabajo de la tabla leads y en la página sincronizada de Notion (acción desde la sección «Trabajos activos» del tablero interno)»*.
2. [x] **Índice (m5) — DADO POR REALIZADO.** Los autores ejecutan el abrir + guardar en Word; con `updateFields=true` ya puesto, el TOC regenera §4.3.7 y recalcula la paginación.
3. [x] **Citas huérfanas (§2.7) — HECHO.** Agregadas `(HubSpot, 2024)`, `(Pipedrive, 2024)`, `(Zapier, 2024)` y `(Make, 2024)` donde se describe su modelo de precios/funciones. Las cuatro entradas de Referencias ya tienen correspondencia en el texto.

**Reencuadrado / cerrado por decisión de los autores:**
4. [x] **M2 — RESUELTO POR DISEÑO.** El propósito de `db/schema.sql` es servir como **script reproducible** para quien descargue el repositorio por separado: recrea el esquema completo (5 tablas, 2 vistas `security_invoker`, RLS por rol `admin`, `anon` revocado) de forma idempotente, sin depender de una instancia concreta. Aplicarlo a un Supabase productivo específico es un paso del desplegador, fuera del alcance del MVP en entorno controlado. El artefacto que la tesis debe entregar —el esquema versionado— está presente y verificado.
5. [x] **M3 — CERRADO.** Métricas mínimas: opcional; su ausencia ya está justificada en §1.7 y §6. Cerrado por decisión de los autores.
6. [x] **Abstract en inglés — CERRADO (N/A).** No requerido por el reglamento aplicable; decisión de los autores.
7. [x] **S1 — DADO POR REALIZADO.** Rotación de credenciales a cargo de los autores (ya divulgada en Cap. 8, ítem 6; ninguna clave vive en el repo).
