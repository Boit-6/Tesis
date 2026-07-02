# Estado del checklist del `dictamen-tesisv2.md` (sección H)

> Mapa de quién hace cada ítem y qué se hizo en esta pasada.
> **Leyenda:** ✅ Hecho (Claude) · 🟡 Parcial · 🔴 Tuyo (Tobías) · 🏛️ Institución.
>
> **Nota de números:** el dictamen dice «98 nodos / 8 webhooks» pero midió la **copia vieja** del
> repo del chico. El workflow **canónico** (`Boit-6/Tesis`) tiene **128 nodos funcionales
> (144 en total, incl. 16 notas) y 11 webhooks**. En la tesis se documentaron esos números reales.

## Bloqueantes

| Ítem | Qué | Estado | Detalle |
|---|---|---|---|
| **B1** | Conteo de nodos + «cinco procesos» | ✅ | `tesis.docx`: 3× «71 nodos» → «128 nodos funcionales»; «cinco procesos» → lista real (rechazo, cambios, estado de trabajo, cancelación, programados). |
| **B2** | Tabla 8 → todos los webhooks | ✅ | Ampliada de 4 a **11** filas (agregados `/lead-propuesta`, `/lead-rechaza`, `/lead-modifica`, `/trabajo-estado`, `/lead-cancelar`, `/cambio-aceptar`, `/cambio-rechazar`). |
| **B3** | Flujo real de aceptación (§ página /aceptar) | ✅ | Reescrito: 3 acciones (aceptar / pedir cambios / rechazar) + «tres resultados posibles» de la aceptación. |
| **B4** | Documentar «Trabajos activos» | ✅ | Fila `estado_trabajo` en la Tabla 5 + nueva subsección **§4.3.7 «Gestión interactiva…»** (máquina de estados + `/trabajo-estado` + sync Notion + cancelar + resolver cambios). |
| **B5** | Figuras 1–10 (capturas) | ✅ | Insertadas en el Anexo A (Figuras 1–10) desde `docs/`: diagrama, formulario, dashboard, aceptación, los 5 flujos de n8n, propuesta+factura. |
| **B6** | Cargar columna Evidencia (Tabla 9) | ✅ | Columna «Evidencia» de **E1–E9** enlazada a las Figuras 11–16 (+ 3, 5 y 10). Solo **E10** queda «Pendiente» porque falta la captura del cambio de estado de trabajo + Notion (tuya). |
| **B7** | Escenarios de validación faltantes | ✅ | Agregadas a la Tabla 9 las filas **E8** (rechazo → PERDIDO), **E9** (pedido de cambios → EN_SEGUIMIENTO) y **E10** (estado de trabajo → Notion). |
| **B8** | Declarar el repositorio canónico | 🔴 | Nombrar la URL del monorepo en §4.1. **Ojo:** hoy hay 2 repos (ver «Coordinación» abajo) — definir cuál es el canónico ANTES de escribir la URL. |

## Mayores

| Ítem | Qué | Estado | Detalle |
|---|---|---|---|
| **M1** | Alinear servicios formulario ↔ scoring | ✅ | **Código: ya estaba** (`svcMap` + `Code - Scoring` ponderan los 9 servicios). **Doc:** corregida la fila «Servicio» de la Tabla 4 (agregados `marketing`/`seo`) + párrafo que documenta el mapeo y el default (`Otro`→`soporte`). |
| **M2** | Aplicar RLS en Supabase producción | 🔴 | Correr `db/schema.sql` en la instancia + confirmar Realtime (`supabase_realtime` sobre `leads`). Requiere tu acceso al proyecto Supabase. |
| **M3** | Métricas observadas mínimas | 🔴 | Latencia de la suscripción realtime + tiempo de PDF (Gotenberg). Medilas en tu entorno y agregalas al doc. |

## Menores / formales

| Ítem | Qué | Estado | Detalle |
|---|---|---|---|
| **m1** | Numerar/citar tablas o figuras nuevas | ✅ | Figuras 11–16 numeradas y **citadas** desde la columna Evidencia de la Tabla 9; §4.3.7 y las filas nuevas de Tabla 5/8 numeradas. |
| **m2** | Bidireccionalidad citas ↔ Referencias | 🔴 | Revisión exhaustiva manual. |
| **m3** | Refrescar índice/paginación del `.docx` | 🔴 | **Hacelo al final, en Word:** `Ctrl+E` (o `Cmd+A`) → `F9` → «Actualizar toda la tabla». Actualiza TOC y números de página (los headings nuevos como §4.3.7 aparecen recién ahí). |

## Seguridad / integridad

| Ítem | Qué | Estado | Detalle |
|---|---|---|---|
| **S1** | Rotar credenciales sensibles | 🔴 | `service_role`/`secret key` de Supabase (+ el token del bot de Telegram que compartiste). Requiere rol Owner del proyecto. |
| **S2** | Cerrar ventana de concurrencia en aceptación | ✅ | **Código hecho** en `workflow/crm_postgres.json`: `Marcar Aceptado` ahora hace `UPDATE … WHERE lead_id=$1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO') RETURNING *`, `alwaysOutputData`, y un IF `¿Aceptación aplicó?` corta los efectos (factura/Notion) si 0 filas → evita doble facturación. |
| **S3** | Antiplagio / detección de IA | 🏛️ | Práctica institucional al entregar. |

## Verificación previa a la defensa

| Ítem | Qué | Estado | Detalle |
|---|---|---|---|
| **V1** | Preparar respuestas a las 6 cuestiones (sección G) | 🔴 | Repasá: conteo real (128/11), rechazo/cambios, «Trabajos activos», servicios↔scoring, RLS aplicada, umbrales de scoring. |
| **V2** | Relectura de coherencia final | 🟡 | Verificado: 0 «71 nodos», 0 «cinco procesos», 0 «tres desenlaces» en el cuerpo. Revisá Resumen/Abstract/Anexos por las dudas tras el `F9`. |

---

## ⚠️ Coordinación pendiente (fuera de este pull)

El repo del chico (`MorguiMateo/FormularioLeads`) quedó como **monorepo aparte** con una copia
**VIEJA** del workflow (98 nodos, sin las ramas nuevas). Tu monorepo (`Boit-6/Tesis`) tiene el
workflow **canónico** (128 funcionales, 11 webhooks). Antes de B8 (declarar la URL del repo)
tenés que **definir cuál es el repositorio canónico** y, si es el tuyo, **empujarle el workflow
nuevo al del chico** para que el jurado clone algo consistente. Este pull trajo solo doc + front,
sin tocar tu workflow.

## Cómo probar S2 (aceptación atómica)
1. Reimportá `workflow/crm_postgres.json` en n8n (recordá re-publicar).
2. Aceptá un lead válido → debe facturar y actualizar Notion normal.
3. Volvé a abrir el MISMO enlace de aceptación y aceptá otra vez → NO debe volver a facturar
   (la rama corta en `No-op - Aceptación Duplicada`); la página igual muestra éxito.
