# CRM Freelance Automatizado

> Trabajo final de tesis — Automatización del ciclo comercial de un freelance con **n8n**

---

## 📋 Descripción

El freelance profesional gestiona su ciclo comercial de forma **manual y fragmentada**: consultas dispersas, propuestas escritas a mano, seguimiento de memoria y cobros perseguidos por chat. Se pierden leads, se pierde tiempo y se proyecta poca profesionalidad.

Este proyecto automatiza **todo el ciclo de punta a punta** para un freelance

```
Lead entra → scoring → propuesta → seguimiento → aceptación → factura PDF → pago → cierre → testimonio → métricas
```

Características técnicas clave:

- 🧩 **Arquitectura desacoplada en 3 capas** (presentación / orquestación / datos).
- 🗄️ **PostgreSQL como única fuente de verdad** con enums, integridad referencial y vistas calculadas en vivo.
- 🔑 **Aceptación segura** mediante token UUID validado contra la base.
- 🧾 **Facturación automática en PDF** (HTML → Gotenberg) y **pago simulado idempotente**.
- 🗂️ **CRM visual en Notion** sincronizado en tiempo real + alertas por **Telegram**.

---

## 🏗️ Arquitectura del Repositorio

El sistema está desacoplado en tres capas con responsabilidades claras:

```
┌─────────────────────────┐     ┌──────────────────────┐     ┌─────────────────────────┐
│  Presentación           │     │  Orquestación        │     │  Datos                  │
│  Next.js + Vercel       │ ──▶ │  n8n (webhooks)      │ ──▶ │  PostgreSQL / Supabase  │
│  • Formulario de leads  │     │  • Lógica de negocio │     │  • Fuente de verdad     │
│  • Página de aceptación │     │  • Integraciones     │     │  • Vistas / métricas    │
│  • Dashboard interno    │     │  • Automatizaciones  │     │                         │
└─────────────────────────┘     └──────────────────────┘     └─────────────────────────┘
```

> El front es público y **nunca** muta la base directo: habla con n8n por HTTP. n8n concentra la lógica y es el único que escribe en la base. Cada capa se cambia sin romper las otras.

La orquestación se compone de **8 flujos** independientes, cada uno con su disparador:

| # | Flujo | Disparador | Qué hace |
|---|-------|-----------|----------|
| 1 | Intake + Scoring | Webhook `lead/nuevo` | Normaliza, califica y guarda el lead |
| 2 | Propuesta | (sigue al 1) | Email de propuesta + card en Notion |
| 3 | Follow-up | Cron 9 AM L-V | Seguimiento automático; marca PERDIDO |
| 4 | Aceptación | Webhook `lead-acepta` | Valida token → factura PDF → email |
| 5 | Recordatorios | Cron 10 AM | Avisos de facturas por vencer/vencidas |
| 6 | Pago simulado | Webhook `pago-confirmado` | Marca la factura COBRADO (idempotente) |
| 7 | Cierre + Testimonio | Webhook `proyecto-cerrado` | Cierra, cobra y pide reseña |
| 8 | Métricas | Cron 23:59 | Reporte diario por Telegram |

Sobre todo eso corren una capa de **logging** y un **manejo de errores global**.

---

## 🛠️ Stack Tecnológico

**Presentación**
- Next.js 16 (App Router) · React 19 · Tailwind v4 · Vercel

**Orquestación**
- n8n (motor de workflows low-code) · Gotenberg (HTML → PDF)

**Datos**
- PostgreSQL / Supabase (tablas, enums, vistas, triggers)

**Integraciones**
- Gmail (OAuth2) · Telegram Bot · Notion API

**DevOps**
- Docker / Docker Compose

---

## ⚙️ Requisitos Previos

- **Docker** y **Docker Compose**
- **Node.js 18+** y **npm** (para el front)
- **Git** (con soporte de submódulos)
- Cuentas/credenciales: **Supabase**, **bot de Telegram**, **integración de Notion**, **Gmail (OAuth2)**

---

## 🚀 Levantar el proyecto desde cero

**1. Clonar el repo (con submódulos, porque el front es uno):**
```bash
git clone --recursive <url-de-este-repo>
cd tesis
```
> Si ya clonaste sin `--recursive`: `git submodule update --init`.

**2. Base de datos (Supabase):**
Ejecutar [`db/schema.sql`](db/schema.sql) en el SQL Editor de Supabase.

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

> Valores a editar a mano: `DATABASE_ID` de Notion, `FRONT_BASE` (URL del front), `BASE` (URL pública de n8n), `formUrl` (Google Form de reseñas) y el `chatId` de Telegram. Luego **publicar** el workflow.

**4. Presentación (front):**
```bash
cd FormularioLeads
cp .env.example .env.local   # completá los valores
npm install
npm run dev                  # http://localhost:3000
```

---

## 🧪 Pruebas

Smoke test de los nodos `Code` del workflow: ejecuta el JavaScript de cada nodo con datos de ejemplo y mocks de las variables de n8n (`$input`, `$`, `$json`, `Buffer`), para detectar errores de runtime **sin levantar n8n**.

```bash
node tests/smoke_code_nodes.js
```

---

## 📂 Estructura del proyecto

```
tesis/
├── workflow/
│   └── crm_postgres.json      # Workflow de n8n (8 flujos, ~70 nodos)
├── db/
│   └── schema.sql             # Esquema PostgreSQL (tablas, enums, vistas, trigger)
├── tests/
│   └── smoke_code_nodes.js    # Smoke test de los Code nodes
├── FormularioLeads/           # Front Next.js (SUBMÓDULO — deploy en Vercel)
│   └── src/app/
│       ├── page.tsx           # Formulario de captación de leads
│       ├── aceptar/[leadId]/  # Página de aceptación (GET ver + POST aceptar)
│       └── dashboard/         # Panel interno (server-side, service key)
├── docker-compose.yml         # n8n + Gotenberg en una red propia
├── tesis.md                   # Documento de la tesis
└── README.md
```

---

## 🔐 Seguridad

- **Token de aceptación:** UUID aleatorio por lead, validado contra la base (no falsificable).
- **Secretos fuera del repo:** credenciales en n8n y en `.env.local` (ignorado por git). El workflow versionado usa `REEMPLAZAR_AL_IMPORTAR` en lugar de IDs reales.
- **`SUPABASE_SERVICE_ROLE_KEY`** solo se usa server-side (dashboard), nunca llega al navegador.
- **Pago idempotente:** `UPDATE ... WHERE estado_pago = 'PENDIENTE'` evita cobrar dos veces.
- **Pendiente:** control de acceso en `/dashboard` (hoy público en Vercel) y firma en los webhooks de entrada.

---
