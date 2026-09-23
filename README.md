# CRM Freelance Automatizado

> Trabajo final de tesis — Automatización del ciclo comercial de un freelance con **n8n**

---

## 📋 Descripción

El freelance profesional gestiona su ciclo comercial de forma **manual y fragmentada**: consultas dispersas, propuestas escritas a mano, seguimiento de memoria y cobros perseguidos por chat. Se pierden leads, se pierde tiempo y se proyecta poca profesionalidad.

Este proyecto automatiza **todo el ciclo de punta a punta** para un freelance

```
Lead entra → scoring → propuesta → (aceptar / rechazar / pedir cambios) → factura PDF → pago → seguimiento del trabajo → cierre → testimonio → métricas
```

Características técnicas clave:

- 🧩 **Arquitectura desacoplada en 3 capas** (presentación / orquestación / datos).
- 🗄️ **PostgreSQL como única fuente de verdad** con enums, integridad referencial, RLS y vistas calculadas en vivo.
- 🔑 **Aceptación segura y atómica** mediante token UUID validado contra la base (sin doble facturación en concurrencia).
- 🧾 **Facturación automática en PDF** (HTML → Gotenberg) y **cobro real con MercadoPago** (idempotente; sin credenciales configuradas cae a un modo de desarrollo sin gateway).
- 🎫 **Tablero de tickets propio** con envejecimiento de prioridades + alertas por **Telegram**.
- 📊 **Tablero interno en tiempo real** (Supabase Realtime) con gestión del estado del trabajo y de los pedidos de cambio.

---

## 🏗️ Arquitectura del Repositorio

El sistema está desacoplado en tres capas con responsabilidades claras:

```
┌─────────────────────────┐     ┌──────────────────────┐     ┌─────────────────────────┐
│  Presentación           │     │  Orquestación        │     │  Datos                  │
│  Next.js + Vercel       │ ──▶ │  n8n (webhooks)      │ ──▶ │  PostgreSQL / Supabase  │
│  • Formulario de leads  │     │  • Lógica de negocio │     │  • Fuente de verdad     │
│  • Página de aceptación │     │  • Integraciones     │     │  • Vistas / métricas    │
│  • Dashboard interno    │     │  • Automatizaciones  │     │  • RLS (rol admin)      │
└─────────────────────────┘     └──────────────────────┘     └─────────────────────────┘
```

> El front es público y **nunca** muta la base directo: habla con n8n por HTTP. n8n concentra la lógica y es el único que escribe en las tablas de negocio. El dashboard lee con la anon key bajo sesión (nunca la service key). Cada capa se cambia sin romper las otras.

La orquestación tiene **13 webhooks** y **4 procesos programados** (más logging y manejo de errores global). El flujo exportado tiene **168 nodos funcionales** (185 en total, incluidas 17 notas de documentación):

| Disparador | Proceso | Qué hace |
|---|---|---|
| Webhook `lead-nuevo` | Captación + scoring + propuesta | Normaliza, califica (score/tier) y guarda; si es HOT/WARM avisa para fijar los términos de la propuesta |
| Webhook `lead-propuesta` (GET) | Lectura de propuesta | Devuelve datos para la página de aceptación (solo lectura) |
| Webhook `lead-acepta` | Aceptación (atómica) | Valida token → `UPDATE ... WHERE estado IN (...)` → factura PDF → email |
| Webhook `lead-rechaza` | Rechazo | Marca el lead como PERDIDO |
| Webhook `lead-modifica` | Pedido de cambios | Vuelve a EN_SEGUIMIENTO, guarda el mensaje y avisa por Telegram |
| Webhook `trabajo-estado` | Estado del trabajo | Actualiza `estado_trabajo` (PENDIENTE→…→ENTREGADO) |
| Webhook `lead-cancelar` | Cancelación | Cancela el lead desde el tablero (PERDIDO + Telegram) |
| Webhook `cambio-aceptar` / `cambio-rechazar` | Resolver pedidos de cambio | Reenvía la propuesta / mantiene la original |
| Webhook `mp/notificacion` (POST) | Cobro real con MercadoPago | MercadoPago avisa el pago → se verifica contra su API → marca la factura COBRADO (idempotente) |
| Webhook `pago-confirmado` (GET) | Cobro — modo de desarrollo | Sin `MP_ACCESS_TOKEN` configurado, marca la factura COBRADO a mano (idempotente) |
| Webhook `proyecto-cerrado` | Cierre + testimonio | Cierra, calcula el ciclo y pide reseña |
| Cron L-V 9:00 | Follow-up | Seguimiento automático; marca PERDIDO tras N intentos |
| Cron 10:00 | Recordatorios | Avisos de facturas por vencer / vencidas |
| Cron 23:59 | Métricas | Reporte diario por Telegram |

### 🎫 Tickets

Un tablero tipo Trello en el dashboard (`/dashboard/tickets`) para las tareas del trabajo. Los tickets son una tabla más de la base (`tickets`, con RLS y tiempo real): se crean y se mueven desde el tablero, y al aceptarse una propuesta el CRM siembra los del proyecto (plantilla en `TICKETS_PLANTILLA_PROYECTO`).

Su particularidad es el **envejecimiento**: un ticket que nadie toca sube solo de prioridad (`BAJA → MEDIA → ALTA → CRITICA`) hasta que se atiende. Moverlo de columna o cambiarle la prioridad reinicia el reloj.

| Pieza | Qué hace |
|---|---|
| `/api/tickets` (GET / POST) | Lista el tablero (vista `tickets_tablero`, con score y días calculados al momento) y crea tickets, con la sesión del admin |
| `/api/tickets/estado` (POST) | Mueve de columna o cambia la prioridad |
| [`workflow/tickets.json`](workflow/tickets.json) · Cron 8:00 | Escala en una sola sentencia SQL los tickets quietos y manda el resumen por Telegram |

Detalle: [`docs/modulo-tickets.md`](docs/modulo-tickets.md).

---

## 🛠️ Stack Tecnológico

**Presentación**
- Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase Auth + Realtime · Vercel

**Orquestación**
- n8n (motor de workflows low-code) · Gotenberg (HTML → PDF)

**Datos**
- PostgreSQL / Supabase (tablas, enums, vistas, triggers, RLS)

**Integraciones**
- Gmail (OAuth2) · Telegram Bot · MercadoPago (Checkout Pro + Webhooks)

**DevOps**
- Docker / Docker Compose

---

## ⚙️ Requisitos Previos

- **Docker** y **Docker Compose**
- **Node.js 18+** y **npm** (para el front)
- **Git**
- Cuentas/credenciales: **Supabase**, **bot de Telegram**, **Gmail (OAuth2)**

---

## 🚀 Levantar el proyecto desde cero

**1. Clonar el repo** (el front vive dentro del monorepo, no es submódulo):
```bash
git clone <url-de-este-repo>
cd tesis
```

**2. Base de datos (Supabase):**
Ejecutar [`db/schema.sql`](db/schema.sql) en el SQL Editor de Supabase (crea tablas, enums, vistas, triggers y las políticas RLS con rol `admin`).

Después, dar de alta la dirección del administrador (el esquema no trae ninguna precargada):
```sql
INSERT INTO admin_emails (email) VALUES ('tu-correo@dominio.com');
```
Esa cuenta pasa a `admin` recién cuando confirma el email.

**3. Orquestación (n8n + Gotenberg):**
```bash
cp .env.example .env        # completá TELEGRAM_CHAT_ID, N8N_PUBLIC_URL…
docker compose up -d        # n8n en http://localhost:5678 + Gotenberg en la misma red
```
En n8n: importar [`workflow/crm_postgres.json`](workflow/crm_postgres.json), crear las credenciales y editar los valores marcados:

| Credencial (n8n) | Detalle |
|------------------|---------|
| `Postgres - CRM Supabase` | Session pooler 5432, SSL require, user `postgres.<project-ref>` |
| `Gmail - CRM Freelance` | OAuth2 |
| `Telegram - CRM Freelance` | Bot token |

> Valores a editar a mano: la URL del front, la URL pública de n8n (ngrok o dominio), la URL del Google Form de reseñas y el `chatId` de Telegram. Luego **publicar** el workflow.

> ⚠️ **Checklist de importación** — 7 nodos de este workflow referencian la credencial `CRM - Header Auth (panel)` con `id: "REEMPLAZAR_AL_IMPORTAR"`. Si se publica el workflow sin re-vincularla, esos nodos quedan rotos o corriendo sin la verificación de esa credencial, según cómo resuelva n8n el ID inexistente. Antes de publicar: abrir cada nodo marcado en rojo por n8n al importar y reasignarle la credencial real.

**4. Tickets:** importar [`workflow/tickets.json`](workflow/tickets.json) en n8n (usa las mismas credenciales de Postgres y Telegram) y publicarlo. La tabla ya la creó `db/schema.sql`.

**5. Presentación (front):**
```bash
cd FormularioLeads
cp .env.example .env.local   # completá los valores (Supabase + NEXT_PUBLIC_N8N_BASE)
npm install
npm run dev                  # http://localhost:3000
```

---

## 🧪 Pruebas

### Offline — no necesita n8n, ni base, ni credenciales

```bash
npm test
```

| Prueba | Qué verifica |
|---|---|
| `test:humo` | Ejecuta el JavaScript de los **41 nodos `Code`** de los dos workflows con mocks de n8n (`$input`, `$`, `$json`, `$env`), para detectar errores de runtime sin levantar nada |
| `test:scoring` | Que la calificación de leads dé **idéntico a la Tabla 4** de la tesis en 9240 combinaciones, y que los umbrales sigan siendo configurables |
| `test:autherrores` | El RNF5 en su mitad medible: que los **22 códigos** de error que Supabase Auth puede devolver en los flujos que usa la aplicación (`signUp`, `signInWithPassword` y `verifyOtp`) tengan mensaje en español. El conjunto alcanzable se declara código por código, con la operación que lo origina |
| `test:parametros` | Cómo los **28 nodos Postgres** le pasan los valores a su consulta: que usen la forma de arreglo (con la forma de texto n8n descarta los valores vacíos y parte los que traen comas), que la cantidad coincida con los `$N` del SQL y que ningún dato viaje concatenado dentro de la consulta |
| `test:edgecases` | Casos límite de `Code - Normalizar Lead`: el parser de presupuesto (formatos de moneda, notación científica, basura) y la validación de email |
| `test:afirmaciones` | Que los números que afirma la tesis (nodos, webhooks, tablas, umbrales) sigan siendo ciertos sobre el código |

### Con Docker — base de datos

```bash
npm run test:docker
```

| Prueba | Qué verifica |
|---|---|
| `test:sql` | Compila con `PREPARE` las **28 consultas SQL** de los workflows contra el esquema real. Una columna mal escrita en un nodo Postgres se detecta acá y no en producción |
| `test:rls` | Aplica `db/schema.sql` **tal cual está en el repositorio** y ejecuta **66 casos** de RLS rol por rol: que `anon` no acceda a nada, que estar logueado no alcance sin rol `admin`, que la auditoría esté cerrada, que nadie pueda escribir desde el navegador ni auto-ascenderse a admin, y que la whitelist de admins exija un email confirmado |
| `test:idempotencia` | Ejecuta de verdad las consultas de deduplicación (S6) y de reconciliación de facturas (S5) sobre el esquema real, leyendo el SQL del propio workflow: si un nodo deja de ser idempotente, se pone en rojo |

Ambas levantan un PostgreSQL desechable: no tocan ninguna instancia real.

### Con el sistema levantado — validación funcional

```bash
node tests/escenarios.mjs --verificar   # chequea configuración y conectividad
npm run test:escenarios                 # ejecuta el ciclo completo
```

Dispara los webhooks reales y verifica el estado resultante en la base: alta de leads HOT/COLD, lectura de propuesta, **dos aceptaciones concurrentes → una sola factura**, pago idempotente, rechazo, pedido de cambios, estado del trabajo y token vencido. Mide cada paso y escribe `docs/evidencia-validacion.md`.

> Qué observación del dictamen responde cada prueba: [`docs/verificacion-y-seguridad.md`](docs/verificacion-y-seguridad.md).

Validación funcional por escenarios (E1–E10) documentada en la tesis (Tabla 9 + Anexo A con las figuras).

---

## 📂 Estructura del proyecto

```
tesis/
├── workflow/
│   ├── crm_postgres.json      # Workflow n8n del CRM (11 webhooks + 3 crons, 130 nodos func. + notas)
│   └── tickets.json           # Cron de envejecimiento de los tickets
├── db/
│   └── schema.sql             # Esquema PostgreSQL (tablas, enums, vistas, triggers, RLS)
├── tests/
│   ├── smoke_code_nodes.mjs       # Smoke test de los Code nodes de todos los workflows
│   ├── scoring.mjs                # Regresión del scoring contra la Tabla 4 (9240 casos)
│   ├── verificar_afirmaciones.mjs # Los números de la tesis vs. el código
│   ├── normalizar_lead_edge_cases.mjs # Presupuesto y email en sus casos límite
│   ├── verificar_rls.mjs         # RLS real sobre un PostgreSQL desechable
│   ├── escenarios.mjs            # Validación funcional de punta a punta (E1–E10)
│   └── rls/                      # Andamiaje de Supabase + los 24 casos de RLS
├── docs/
│   ├── verificacion-y-seguridad.md    # Qué responde cada prueba + cambios de seguridad
│   ├── afirmaciones-tesis.json        # Números que afirma la tesis (los verifica el CI)
│   ├── evidencia-validacion.md        # Reporte que genera la suite de escenarios
│   ├── dictamen-v6-reejecucion.md     # Corrida manual de E11–E13 (evidencia citada en el Anexo A)
│   ├── modulo-tickets.md              # Documentación del módulo de tickets
│   ├── modulo-pagos.md                # Cobro real con MercadoPago + comisión de la plataforma
│   ├── roadmap-mejoras.md             # Backlog de mejoras
│   └── figura*.jpg                    # Capturas vigentes del Anexo A
├── FormularioLeads/           # Front Next.js (parte del monorepo — deploy en Vercel)
│   ├── src/app/
│   │   ├── components/lead-form.tsx   # Formulario de captación
│   │   ├── aceptar/[leadId]/          # Página de aceptación (aceptar / rechazar / pedir cambios)
│   │   ├── dashboard/                 # Tablero interno (Client Component + Realtime + gate admin)
│   │   ├── dashboard/tickets/         # Tablero de tickets (columnas + drag & drop)
│   │   ├── api/tickets/               # Proxy server-side hacia el módulo de tickets
│   │   ├── login/ · register/ · auth/ # Autenticación (Supabase)
│   │   └── lib/supabase/              # Clientes (client / server / middleware)
│   ├── tesis.docx             # Documento de la tesis, versión final (Anexo A con las Figuras 1–18)
│   └── Informe-Trabajo-Final.pdf  # El mismo documento en PDF: es la versión entregada
├── .github/workflows/ci.yml   # CI: pruebas del artefacto + RLS + lint/typecheck/build
├── .env.example               # Variables del entorno de n8n (CRM + tickets)
├── package.json               # Scripts de prueba de la raíz (npm test)
├── docker-compose.yml         # n8n + Gotenberg en una red propia
└── README.md
```

---

## 🔐 Seguridad

- **Token de aceptación:** UUID aleatorio por lead, validado contra la base (no falsificable) y **con vencimiento** (`TOKEN_VIGENCIA_DIAS`, 14 días por defecto). Las cuatro consultas que aceptan el token revalidan la vigencia.
- **Webhooks del panel con credencial:** las acciones internas (cancelar, resolver pedidos de cambio, mover el estado del trabajo) usan Header Auth y ya no se llaman desde el navegador: pasan por `/api/crm/[accion]`, que revalida el rol `admin` y agrega el secreto del lado del servidor.
- **Aceptación atómica:** `UPDATE ... WHERE lead_id = $1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO')` — evita doble facturación ante aceptaciones concurrentes.
- **Pago idempotente:** `UPDATE ... WHERE estado_pago = 'PENDIENTE'` evita cobrar dos veces, tanto en el cobro real con MercadoPago como en el modo de desarrollo.
- **Pago verificado contra la fuente:** la notificación de MercadoPago (`/webhook/mp/notificacion`) nunca se toma como verdad por sí sola — antes de marcar COBRADO se consulta el pago por su ID en la API de MercadoPago. Firma obligatoria (`MP_WEBHOOK_SECRET`, HMAC-SHA256 sobre `x-signature`): sin ese secreto, o con firma inválida, el nodo descarta la notificación. Detalle en [`docs/modulo-pagos.md`](docs/modulo-pagos.md).
- **Dashboard con control de acceso:** Supabase Auth + compuerta de rol `admin` (`profiles.role`) en el middleware y en la página; lee con la anon key bajo sesión, nunca la service key.
- **RLS en la base:** políticas que exigen rol `admin` para leer, vistas con `security_invoker`, `anon` revocado.
- **Secretos fuera del repo:** credenciales en n8n y en `.env.local` (ignorado por git). El workflow versionado usa `REEMPLAZAR_AL_IMPORTAR` en lugar de IDs reales, y **ninguna URL ni ID queda escrito a mano dentro de los nodos**: todo sale de variables de entorno.
- **RLS verificada, no sólo declarada:** `npm run test:rls` ejecuta 24 casos contra un PostgreSQL real (ver [`docs/verificacion-y-seguridad.md`](docs/verificacion-y-seguridad.md)).
- **Pendiente:** rate limiting / captcha en el formulario público. Es el endpoint que no puede llevar secreto (lo ejecuta el navegador de un tercero), así que la mitigación que corresponde ahí es limitar el abuso, no autenticar.
