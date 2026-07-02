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
- 🧾 **Facturación automática en PDF** (HTML → Gotenberg) y **pago simulado idempotente**.
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

La orquestación tiene **11 webhooks** y **3 procesos programados** (más logging y manejo de errores global). El flujo exportado tiene **128 nodos funcionales** (144 en total, incluidas 16 notas de documentación):

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
| Webhook `pago-confirmado` (GET) | Pago simulado | Marca la factura COBRADO (idempotente) |
| Webhook `proyecto-cerrado` | Cierre + testimonio | Cierra, calcula el ciclo y pide reseña |
| Cron L-V 9:00 | Follow-up | Seguimiento automático; marca PERDIDO tras N intentos |
| Cron 10:00 | Recordatorios | Avisos de facturas por vencer / vencidas |
| Cron 23:59 | Métricas | Reporte diario por Telegram |

---

## 🛠️ Stack Tecnológico

**Presentación**
- Next.js 16 (App Router) · React 19 · Tailwind v4 · Supabase Auth + Realtime · Vercel

**Orquestación**
- n8n (motor de workflows low-code) · Gotenberg (HTML → PDF)

**Datos**
- PostgreSQL / Supabase (tablas, enums, vistas, triggers, RLS)

**Integraciones**
- Gmail (OAuth2) · Telegram Bot · Notion API

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

**4. Presentación (front):**
```bash
cd FormularioLeads
cp .env.example .env.local   # completá los valores (Supabase + NEXT_PUBLIC_N8N_BASE)
npm install
npm run dev                  # http://localhost:3000
```

---

## 🧪 Pruebas

Smoke test de los nodos `Code` del workflow: ejecuta el JavaScript de cada nodo con datos de ejemplo y mocks de las variables de n8n (`$input`, `$`, `$json`, `Buffer`), para detectar errores de runtime **sin levantar n8n**.

```bash
node tests/smoke_code_nodes.js
```

Validación funcional por escenarios (E1–E10) documentada en la tesis (Tabla 9 + Anexo A con las figuras).

---

## 📂 Estructura del proyecto

```
tesis/
├── workflow/
│   └── crm_postgres.json      # Workflow n8n (11 webhooks + 3 crons, 128 nodos func. + notas)
├── db/
│   └── schema.sql             # Esquema PostgreSQL (tablas, enums, vistas, triggers, RLS)
├── tests/
│   └── smoke_code_nodes.js    # Smoke test de los Code nodes
├── docs/
│   ├── dictamen-tesis.md              # Evaluación del trabajo (v3)
│   ├── dictamen-tesisv2.md            # Re-evaluación (re-ejecución del prompt evaluador)
│   ├── checklist-dictamen-v2-estado.md# Estado del checklist del dictamen (quién hace qué)
│   └── roadmap-mejoras.md             # Backlog de mejoras
├── FormularioLeads/           # Front Next.js (parte del monorepo — deploy en Vercel)
│   ├── src/app/
│   │   ├── components/lead-form.tsx   # Formulario de captación
│   │   ├── aceptar/[leadId]/          # Página de aceptación (aceptar / rechazar / pedir cambios)
│   │   ├── dashboard/                 # Tablero interno (Client Component + Realtime + gate admin)
│   │   ├── login/ · register/ · auth/ # Autenticación (Supabase)
│   │   └── lib/supabase/              # Clientes (client / server / middleware)
│   └── tesis.docx             # Documento de la tesis (Anexo A con las Figuras 1–16)
├── docker-compose.yml         # n8n + Gotenberg en una red propia
└── README.md
```

---

## 🔐 Seguridad

- **Token de aceptación:** UUID aleatorio por lead, validado contra la base (no falsificable).
- **Aceptación atómica:** `UPDATE ... WHERE lead_id = $1 AND estado IN ('PROPUESTA_ENVIADA','EN_SEGUIMIENTO')` — evita doble facturación ante aceptaciones concurrentes.
- **Pago idempotente:** `UPDATE ... WHERE estado_pago = 'PENDIENTE'` evita cobrar dos veces.
- **Dashboard con control de acceso:** Supabase Auth + compuerta de rol `admin` (`profiles.role`) en el middleware y en la página; lee con la anon key bajo sesión, nunca la service key.
- **RLS en la base:** políticas que exigen rol `admin` para leer, vistas con `security_invoker`, `anon` revocado.
- **Secretos fuera del repo:** credenciales en n8n y en `.env.local` (ignorado por git). El workflow versionado usa `REEMPLAZAR_AL_IMPORTAR` en lugar de IDs reales.
- **Pendiente:** firma/verificación de origen en los webhooks de entrada.
