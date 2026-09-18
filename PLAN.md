# Plan de cierre — CRM Freelance Automatizado

> Generado el 2026-09-18 verificando **código real, commit por commit**, no el
> plan original (`PLAN_IMPLEMENTACION.md`, 2026-09-16) ni dictámenes de
> sesiones anteriores. Reemplaza a ese archivo: la mayoría de sus 67 ítems ya
> están cerrados, y mantenerlo tal cual desinforma más de lo que ayuda.

Convención: **✅ CERRADO** (confirmado en el código actual) · **❌ FALTA**
(no existe) · **⚠️ MEJORAR** (existe pero con un defecto o hueco puntual).

---

## Fase 0 — Seguridad crítica → **CERRADA (7/7)**

| Ítem | Estado | Detalle |
|---|---|---|
| Open redirect en login/confirm | ✅ | `new URL()` + comparación de `origin` en `login-form.tsx` y `auth/confirm/route.ts` |
| CORS `*` en tickets | ✅ | Ya no cae a `'*'` sin `TICKETS_CORS_ORIGINS` |
| Auth de tickets abierta sin API key | ✅ | Falla explícita si falta `TICKETS_API_KEY` |
| Credenciales `REEMPLAZAR_AL_IMPORTAR` | ✅ | Checklist en README |
| Relay de email público (spam) | ✅ | Confirmado en `crm_postgres.json`: la clave de rate limit de `lead/nuevo` dejó de ser el email declarado (rotable a voluntad) y pasó a ser la IP (comentario del propio código documenta el motivo) |
| Rate limit por XFF spoofeable | ✅ (2026-09-18) | Bug real encontrado y corregido hoy: las 5 rutas con rate limit tomaban `xff.split(',')[0]` (el primer tramo, el que declara quien llama y es falsificable) en vez del último (el que agrega el proxy de confianza). Cambiado a `.pop()` en los 5 nodos. Sigue dependiendo de que n8n esté detrás de exactamente un proxy de confianza (documentado); sin proxy, ningún esquema de XFF es confiable |
| Alertas falsas de MP a Telegram | ✅ | El nodo de notificación valida firma HMAC antes de seguir (ver ítem siguiente) |

### ✅ CERRADO (2026-09-18) — Contradicción doc/código en la firma de MercadoPago
- **README** (línea 253) decía *"Firma opcional (`MP_WEBHOOK_SECRET`...)"*,
  pero el código (`Code - Leer Notificacion MP`) la hace obligatoria de facto
  desde el cierre de S8: sin secreto, o con firma inválida, `payment_id`
  queda vacío y la notificación se descarta.
- Verificado que **no es un bug funcional**: `.env.example` y
  `docs/evidencia-E15-E16.md` ya documentaban correctamente que la firma es
  obligatoria (S8, cerrada) — solo el README y dos líneas de
  `docs/modulo-pagos.md` habían quedado con la redacción vieja ("opcional" /
  "vacía = no se valida").
- **Corregido:** README línea 253 y las dos líneas de `docs/modulo-pagos.md`
  actualizadas para decir "obligatoria" y explicar la consecuencia real
  (se descarta la notificación, no que "no se valide").
- **Pendiente de quien opere la infra:** confirmar que `MP_WEBHOOK_SECRET`
  esté seteada en el n8n de **producción** (en dev, `docker-compose.yml` ya
  aplica un default). Esto no lo puedo verificar desde el repo.

---

## Fase 1 — Base de datos y workflow → **CERRADA (16/16)**

Confirmados en `db/schema.sql` y `workflow/crm_postgres.json`:
admin_emails (whitelist en vez de hardcode) · `email` nullable en `profiles` ·
`ON DELETE RESTRICT` en facturas · índice `idx_leads_dedup` · índice muerto
dropeado · `parsearImporte()` correcto (incluye caso `"1e3"`) · regex de
email · `moneda` default `ARS` + CHECK · políticas separadas por operación en
`n8n_writer` (ya no `FOR ALL`) · `FORCE ROW LEVEL SECURITY` en las 7 tablas ·
rate limit corregido (suma `+1` explícito en vez de depender del snapshot de
la CTE).

| Ítem | Estado | Detalle |
|---|---|---|
| Tabla `seguimientos` nunca poblada | ✅ CERRADO (corregido en este plan) | Era un falso negativo mío: sí se escribe, vía `Postgres - Insert Seguimiento` (nodo de tabla de n8n, no SQL crudo — por eso no aparecía al buscar `INSERT INTO seguimientos` como texto) |
| `fecha_envio_email` (Gmail falla después de insertar la factura) | ✅ CERRADO (2026-09-18) | Ver detalle abajo — implementado hoy |
| Lead ID sin `ON CONFLICT` | ⚠️ Riesgo aceptado, no se toca | Ver detalle abajo |

### ✅ CERRADO (2026-09-18) — `facturas.fecha_envio_email`
- **Encontrado:** `Code - Generar Factura HTML` disparaba dos ramas en
  **paralelo**: `Postgres - Insert Factura` por un lado, `HTTP - Gotenberg PDF`
  → `Gmail - Enviar Factura PDF` por otro. Si Gotenberg o Gmail fallaban, la
  fila de la factura quedaba creada igual, sin ninguna marca de que el
  cliente nunca recibió el PDF — y la reconciliación (S5) no lo detecta
  porque busca facturas **inexistentes**, no facturas sin enviar.
- **Impacto real, más acotado de lo que sugiere el nombre:** el lead sí pasa
  a `FACTURADO` (esa rama no depende de Gmail), y el cron de recordatorios de
  pago (`🟠 Cron - Recordatorios Pago 10AM`) igual le manda al cliente el link
  de pago en los días siguientes, aunque nunca haya recibido el PDF inicial.
  No es un lead atascado para siempre; es una notificación inicial perdida
  en silencio, sin manera de auditarlo.
- **Fix:** columna `facturas.fecha_envio_email` (nullable, `NULL` = no
  confirmado). Se reordenó la rama para que `Postgres - Insert Factura` corra
  **antes** que el envío del PDF (ya no en paralelo — así el nodo nuevo,
  `Postgres - Marcar Factura Enviada`, actualiza una fila que ya existe en
  vez de una carrera contra el INSERT). No agrega reintento automático — el
  cron de recordatorios ya cumple ese rol; esto es para poder auditar cuántas
  facturas quedaron así.
- Actualizado `docs/afirmaciones-tesis.json` (226→227 nodos totales,
  207→208 funcionales) con nota fechada, siguiendo la convención del propio
  archivo. `npm test` corre limpio con los nuevos números.
- **Sin verificar:** no pude correr esto contra una instancia de n8n real
  (Docker no estaba levantado en esta sesión). El JSON es válido y el grafo
  de conexiones no tiene nodos huérfanos, pero antes de confiarlo en
  producción conviene importarlo y probar el flujo de aceptación una vez a
  mano.

### ⚠️ Riesgo aceptado, no se toca — Lead ID sin `ON CONFLICT`
`LD-{timestamp}-{10 hex}` (ya no 4 caracteres): la colisión es de orden de
1 en más de un billón dentro de la misma ventana de dedup. Agregar
`ON CONFLICT DO NOTHING` obligaría a manejar el caso "insert no devolvió
fila" en cada nodo que consume el resultado más abajo, por una probabilidad
prácticamente nula. Mismo criterio que el proyecto ya aplicó en
`docs/verificacion-y-seguridad.md` §5.1.1 para la rotación de token: mejor
documentar el residuo que sumar complejidad para blindarlo.

### ℹ️ Ya declarado por el propio proyecto — rotación de token en follow-up
No es un ítem nuevo: `docs/verificacion-y-seguridad.md` §5.1.1 ya documenta
que si el cron de seguimiento falla al mandar el Gmail después de rotar el
`accept_token`, el lead queda con un link viejo inválido hasta la próxima
corrida del cron (auto-recuperable, no es un cuelgue permanente). Decisión
tomada con buen criterio en su momento (un hash del token no es viable
porque los recordatorios necesitan releerlo en claro) — la dejo tal cual,
sin re-abrir.

---

## Fase 2 — Frontend → **CERRADA**

Confirmados: `getAdminUser()` extraído a `src/lib/auth.ts` · `error.tsx` /
`loading.tsx` en dashboard y tickets, más `global-error.tsx` / `not-found.tsx`
· `src/lib/constants.ts` creado · CSS `-moz-range-thumb` agregado ·
`dashboard-client.tsx` bajó de 877 a 319 líneas (refactor real, partido en
componentes) · react-hook-form integrado · security headers, SEO, dark mode.

| Ítem | Estado | Detalle |
|---|---|---|
| Tipos de Supabase generados | ✅ CERRADO (2026-09-18) | Ver detalle abajo |
| Optimizar queries del dashboard | ✅ Ya estaba bien, no era un hallazgo | El propio código ya explica por qué: el funnel necesita el historial completo de estados, y `metrics_mensuales` agrupa por mes — no sirve para eso. A la escala actual, traer solo la columna `estado` de todos los leads no es un costo real. Error mío en la pasada anterior, no del código |

### ✅ CERRADO (2026-09-18) — Tipos de Supabase generados
- No pude correr `supabase gen types` de verdad: requiere una conexión
  autenticada al proyecto en la nube, que no está disponible desde acá.
- En su lugar escribí `src/types/supabase.ts` a mano, con la misma forma que
  produce esa herramienta (`Database.public.Tables/Views/Enums`, con
  `Relationships` — hace falta para que el parser de selects de
  `@supabase/postgrest-js` type-chequee, si no todo colapsa a `never`),
  transcribiendo `db/schema.sql` columna por columna (7 tablas, 2 vistas, 7
  enums, incluidas las columnas que solo existen vía `ALTER TABLE ADD COLUMN`
  como `facturas.pago_token`/`pay_url` y `leads.precio_propuesto`).
- Tipé los tres puntos donde se crea el cliente de Supabase
  (`lib/supabase/client.ts`, `server.ts`) con `<Database>`.
- En `dashboard-client.tsx` saqué los 5 `as X` — la mayoría (`Lead[]`,
  `Trabajo[]`, `PedidoCambio[]`, `PorEnviar[]`) ya no hacía falta ningún cast,
  el tipo inferido matcheaba solo. Los dos que vienen de una **vista**
  (`Metrics`, `FacturaPendiente[]`) sí necesitaban algo, porque las vistas
  declaran todas sus columnas nullable (no pueden garantizar NOT NULL) aunque
  acá vengan de columnas NOT NULL de la tabla base — en vez de un cast a
  ciegas, son dos funciones (`aMetrics`, `aFacturaPendiente`) que resuelven
  esa nulabilidad explícitamente.
- Verificado con `npm run check` (tests + lint + typecheck) y con
  `next build` reales, ambos limpios — no solo con el tipo, con la build
  completa.

---

## Fase 3 — Infraestructura y DevOps → **prácticamente completa**

Confirmados: `.nvmrc`, healthchecks + límites de recursos + logging en
`docker-compose.yml`, Gotenberg pineado a `8.14.1`, `N8N_DIAGNOSTICS_ENABLED=false`,
`concurrency` + `timeout-minutes` + `paths-ignore` + `npm audit` en CI,
`src/lib/env.ts` con validación zod, README real del frontend (no boilerplate),
sin lockfile duplicado (`pnpm-lock.yaml` eliminado).

**Falta:** gitleaks / secret scanning (opcional en el plan original, bajo impacto).

---

## Fase 4 — Testing y calidad → **0/8, sin empezar**

❌ **FALTA todo.** Confirmado: no existe un solo `.test.` en
`FormularioLeads/src`. Toda la garantía del frontend hoy es TypeScript +
ESLint + verificación manual. Es la brecha más grande que queda en todo el
proyecto — contrasta fuerte con el rigor del backend (workflow + DB), que sí
tiene suite offline + tests contra Postgres real.

Pendiente tal cual estaba en el plan original: Vitest + RTL, tests de
`lead-form`, `aceptar-propuesta`, `api/crm/[accion]`, `lib/tickets`,
`lib/auth`; configurar Vitest en CI; tests RLS faltantes (`n8n_writer` sobre
`facturas`, expiración de tokens, `rate_limit_log`); migrar tests CJS a ESM;
`noUncheckedIndexedAccess` en tsconfig; committear `next-env.d.ts`.

---

## Fase 5 — Futuro / features → **0/8, backlog a propósito**

Auditoría real (`audit_log`), historial de propuestas y de pagos,
paginación server-side del dashboard, CI/CD de despliegue completo,
monitoreo/observabilidad, cleanup de `rate_limit_log`, i18n. No es deuda —
es roadmap post-defensa.

---

## Lo que sobra (transversal — no estaba en el plan original)

| Ítem | Por qué molesta |
|---|---|
| `docs/adenda-informe-evaluacion-20260901.md` | Es una autoevaluación tipo "dictamen CONEAU" generada por IA sobre el propio `tesis.docx`. Huérfana: ningún otro doc del repo la referencia. Si un evaluador real la abre, ve a una IA calificándose a sí misma — mala señal para el repo entregado. |
| `docs/cumplimiento-ley-25326.md` | Tampoco referenciada desde ningún otro `.md` del repo (puede estar citada desde el `.docx`, no verificado). |
| `figura06-tablero-20260826.jpg` + `figura06-tablero-20260829.jpg` | Dos versiones de la misma captura conviviendo (~800KB); probablemente solo una está vigente en el Anexo A. |
| `PLAN_IMPLEMENTACION.md` (raíz, sin trackear) | Reemplazado por este archivo — considerar borrarlo para no tener dos planes desincronizados. |

---

## Prioridad si solo se ataca un puñado

1. Confirmar `MP_WEBHOOK_SECRET` en producción (Fase 0) — es lo único que sigue dependiendo de vos, no del código.
2. Sacar `adenda-informe-evaluacion-20260901.md` del repo entregable (sobra).
3. Arrancar Fase 4 (tests de frontend) — es la brecha más grande y la más barata de justificar ante un tribunal ("¿por qué el backend tiene tests y el frontend no?").
4. Borrar o actualizar `PLAN_IMPLEMENTACION.md` para que no quede desincronizado de este archivo.
5. Reimportar `workflow/crm_postgres.json` en el n8n real para que los fixes de Fase 0 y Fase 1 (XFF, `fecha_envio_email`) queden vivos, no solo en el repo.
