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
- 🗂️ **CRM visual en Notion** + alertas por **Telegram**.
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

La orquestación tiene **13 webhooks** y **4 procesos programados** (más logging y manejo de errores global). El flujo exportado tiene **161 nodos funcionales** (178 en total, incluidas 17 notas de documentación):

| Disparador | Proceso | Qué hace |
|---|---|---|
| Webhook `lead/nuevo` | Captación + scoring + propuesta | Normaliza, califica (score/tier) y guarda; si es HOT/WARM manda propuesta + card en Notion |
| Webhook `lead-propuesta` (GET) | Lectura de propuesta | Devuelve datos para la página de aceptación (solo lectura) |
| Webhook `lead-acepta` | Aceptación (atómica) | Valida token → `UPDATE ... WHERE estado IN (...)` → factura PDF → email |
| Webhook `lead-rechaza` | Rechazo | Marca el lead como PERDIDO |
| Webhook `lead-modifica` | Pedido de cambios | Vuelve a EN_SEGUIMIENTO, guarda el mensaje y avisa por Telegram |
| Webhook `trabajo-estado` | Estado del trabajo | Actualiza `estado_trabajo` (PENDIENTE→…→ENTREGADO) + sync a Notion |
| Webhook `lead-cancelar` | Cancelación | Cancela el lead desde el tablero (PERDIDO + Telegram + Notion) |
| Webhook `cambio-aceptar` / `cambio-rechazar` | Resolver pedidos de cambio | Reenvía la propuesta / mantiene la original |
| Webhook `mp/notificacion` (POST) | Cobro real con MercadoPago | MercadoPago avisa el pago → se verifica contra su API → marca la factura COBRADO (idempotente) |
| Webhook `pago-confirmado` (GET) | Cobro — modo de desarrollo | Sin `MP_ACCESS_TOKEN` configurado, marca la factura COBRADO a mano (idempotente) |
| Webhook `proyecto-cerrado` | Cierre + testimonio | Cierra, calcula el ciclo y pide reseña |
| Cron L-V 9:00 | Follow-up | Seguimiento automático; marca PERDIDO tras N intentos |
| Cron 10:00 | Recordatorios | Avisos de facturas por vencer / vencidas |
| Cron 23:59 | Métricas | Reporte diario por Telegram |

### 🎫 Módulo de tickets (workflow aparte)

[`workflow/tickets_notion.json`](workflow/tickets_notion.json) es un **workflow independiente**: un tablero tipo Trello sobre Notion para las tareas pendientes. Su particularidad es el **envejecimiento**: un ticket que nadie toca sube solo de prioridad (`BAJA → MEDIA → ALTA → CRITICA`) hasta que se atiende, así ninguna tarea queda en el olvido.

| Disparador | Qué hace |
|---|---|
| Webhook `ticket/nuevo` | Crea el ticket en Notion (normaliza prioridad/estado/etiquetas contra la config) |
| Webhook `ticket/estado` | Mueve de columna o cambia la prioridad; recalcula el score y reinicia el reloj |
| Webhook `ticket/listar` (GET) | Devuelve el tablero como JSON plano — lo consume el dashboard |
| Cron 8:00 | Envejecimiento: escala prioridades, recalcula scores y avisa por Telegram |

No comparte nodos con el CRM (el enganche es una llamada HTTP tolerante a fallos), **toda su configuración sale de variables de entorno** y se importa tal cual en otro proyecto. Documentación completa: [`docs/modulo-tickets.md`](docs/modulo-tickets.md).

---

## 🛠️ Stack Tecnológico

**Presentación**
- Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase Auth + Realtime · Vercel

**Orquestación**
- n8n (motor de workflows low-code) · Gotenberg (HTML → PDF)

**Datos**
- PostgreSQL / Supabase (tablas, enums, vistas, triggers, RLS)

**Integraciones**
- Gmail (OAuth2) · Telegram Bot · Notion API · MercadoPago (Checkout Pro + Webhooks)

**DevOps**
- Docker / Docker Compose

---

## ⚙️ Requisitos Previos

- **Docker** y **Docker Compose**
- **Node.js 18+** y **npm** (para el front)
- **Git**
- Cuentas/credenciales: **Supabase**, **bot de Telegram**, **integración de Notion**, **Gmail (OAuth2)**

---

## 🚀 Levantar el proyecto desde cero

**1. Clonar el repo** (el front vive dentro del monorepo, no es submódulo):
```bash
git clone <url-de-este-repo>
cd tesis
```

**2. Base de datos (Supabase):**
Ejecutar [`db/schema.sql`](db/schema.sql) en el SQL Editor de Supabase (crea tablas, enums, vistas, triggers y las políticas RLS con rol `admin`).

**3. Orquestación (n8n + Gotenberg):**
```bash
cp .env.example .env        # completá TELEGRAM_CHAT_ID, NOTION_DATABASE_ID, N8N_PUBLIC_URL…
docker compose up -d        # n8n en http://localhost:5678 + Gotenberg en la misma red
```
En n8n: importar [`workflow/crm_postgres.json`](workflow/crm_postgres.json), crear las credenciales y editar los valores marcados:

| Credencial (n8n) | Detalle |
|------------------|---------|
| `Postgres - CRM Supabase` | Session pooler 5432, SSL require, user `postgres.<project-ref>` |
| `Gmail - CRM Freelance` | OAuth2 |
| `Telegram - CRM Freelance` | Bot token |
| `Notion - CRM Freelance` | Internal token — **compartir la DB con la integración** |

> Valores a editar a mano: `DATABASE_ID` de Notion, la URL del front, la URL pública de n8n (ngrok o dominio), la URL del Google Form de reseñas y el `chatId` de Telegram. Luego **publicar** el workflow.

**4. Módulo de tickets** (opcional, el CRM funciona sin él):
```bash
NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=<id> node scripts/setup-notion-tickets.mjs
```
Pegar el `DATABASE_ID` que imprime en `NOTION_TICKETS_DATABASE_ID` del `.env`, importar [`workflow/tickets_notion.json`](workflow/tickets_notion.json) en n8n y publicarlo. Detalle en [`docs/modulo-tickets.md`](docs/modulo-tickets.md).

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
| `test:humo` | Ejecuta el JavaScript de los **34 nodos `Code`** de los dos workflows con mocks de n8n (`$input`, `$`, `$json`, `$env`), para detectar errores de runtime sin levantar nada |
| `test:scoring` | Que la calificación de leads dé **idéntico a la Tabla 4** de la tesis en 9240 combinaciones, y que los umbrales sigan siendo configurables |
| `test:tickets` | La regla de envejecimiento: que el ticket olvidado suba de prioridad, que el que se está atendiendo no, y que un tablero sin cambios no genere ni una llamada a la API |
| `test:afirmaciones` | Que los números que afirma la tesis (nodos, webhooks, tablas, umbrales) sigan siendo ciertos sobre el código |

### Con Docker — base de datos

```bash
npm run test:docker
```

| Prueba | Qué verifica |
|---|---|
| `test:sql` | Compila con `PREPARE` las **22 consultas SQL** de los workflows contra el esquema real. Una columna mal escrita en un nodo Postgres se detecta acá y no en producción |
| `test:rls` | Aplica `db/schema.sql` **tal cual está en el repositorio** y ejecuta **24 casos** de RLS rol por rol: que `anon` no acceda a nada, que estar logueado no alcance sin rol `admin`, que la auditoría esté cerrada, que nadie pueda escribir desde el navegador ni auto-ascenderse a admin |

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
│   └── tickets_notion.json    # Módulo de tickets (3 webhooks + 1 cron) — independiente y reusable
├── db/
│   └── schema.sql             # Esquema PostgreSQL (tablas, enums, vistas, triggers, RLS)
├── scripts/
│   └── setup-notion-tickets.mjs # Crea la base de Notion del tablero de tickets
├── tests/
│   ├── smoke_code_nodes.js       # Smoke test de los Code nodes de todos los workflows
│   ├── scoring.js                # Regresión del scoring contra la Tabla 4 (9240 casos)
│   ├── tickets_envejecimiento.js # Regla de escalada de prioridad de los tickets
│   ├── verificar_afirmaciones.js # Los números de la tesis vs. el código
│   ├── verificar_rls.mjs         # RLS real sobre un PostgreSQL desechable
│   ├── escenarios.mjs            # Validación funcional de punta a punta (E1–E10)
│   └── rls/                      # Andamiaje de Supabase + los 24 casos de RLS
├── docs/
│   ├── dictamen-tesis.md              # Evaluación del trabajo (v3)
│   ├── dictamen-tesisv2.md            # Re-evaluación (re-ejecución del prompt evaluador)
│   ├── checklist-dictamen-v2-estado.md# Estado del checklist del dictamen (quién hace qué)
│   ├── verificacion-y-seguridad.md    # Qué responde cada prueba + cambios de seguridad
│   ├── afirmaciones-tesis.json        # Números que afirma la tesis (los verifica el CI)
│   ├── evidencia-validacion.md        # Reporte que genera la suite de escenarios
│   ├── modulo-tickets.md              # Documentación del módulo de tickets
│   ├── modulo-pagos.md                # Cobro real con MercadoPago + comisión de la plataforma
│   └── roadmap-mejoras.md             # Backlog de mejoras
├── FormularioLeads/           # Front Next.js (parte del monorepo — deploy en Vercel)
│   ├── src/app/
│   │   ├── components/lead-form.tsx   # Formulario de captación
│   │   ├── aceptar/[leadId]/          # Página de aceptación (aceptar / rechazar / pedir cambios)
│   │   ├── dashboard/                 # Tablero interno (Client Component + Realtime + gate admin)
│   │   ├── dashboard/tickets/         # Tablero de tickets (columnas + drag & drop)
│   │   ├── api/tickets/               # Proxy server-side hacia el módulo de tickets
│   │   ├── login/ · register/ · auth/ # Autenticación (Supabase)
│   │   └── lib/supabase/              # Clientes (client / server / middleware)
│   └── tesis.docx             # Documento de la tesis (Anexo A con las Figuras 1–16)
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
- **Pago verificado contra la fuente:** la notificación de MercadoPago (`/webhook/mp/notificacion`) nunca se toma como verdad por sí sola — antes de marcar COBRADO se consulta el pago por su ID en la API de MercadoPago. Firma opcional (`MP_WEBHOOK_SECRET`, HMAC-SHA256 sobre `x-signature`). Detalle en [`docs/modulo-pagos.md`](docs/modulo-pagos.md).
- **Dashboard con control de acceso:** Supabase Auth + compuerta de rol `admin` (`profiles.role`) en el middleware y en la página; lee con la anon key bajo sesión, nunca la service key.
- **RLS en la base:** políticas que exigen rol `admin` para leer, vistas con `security_invoker`, `anon` revocado.
- **Secretos fuera del repo:** credenciales en n8n y en `.env.local` (ignorado por git). El workflow versionado usa `REEMPLAZAR_AL_IMPORTAR` en lugar de IDs reales, y **ninguna URL ni ID queda escrito a mano dentro de los nodos**: todo sale de variables de entorno.
- **RLS verificada, no sólo declarada:** `npm run test:rls` ejecuta 24 casos contra un PostgreSQL real (ver [`docs/verificacion-y-seguridad.md`](docs/verificacion-y-seguridad.md)).
- **Pendiente:** rate limiting / captcha en el formulario público. Es el endpoint que no puede llevar secreto (lo ejecuta el navegador de un tercero), así que la mitigación que corresponde ahí es limitar el abuso, no autenticar.
