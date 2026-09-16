# FormularioLeads — Front del CRM Freelance Automatizado

Capa de presentación del proyecto (ver el [README de la raíz](../README.md) para
la arquitectura completa). Next.js 16 (App Router) + React 19 + Tailwind v4 +
Supabase Auth/Realtime. Habla con la orquestación (n8n) por HTTP; nunca
escribe directo en la base.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **Tailwind v4**
- **Supabase** — Auth, Realtime y cliente `anon` bajo sesión (nunca la
  `service_role` desde el front)
- Consumidor HTTP de los webhooks de **n8n** (`workflow/crm_postgres.json` y
  `workflow/tickets_notion.json`, en la raíz del monorepo)

## Levantar el entorno de desarrollo

```bash
cd FormularioLeads
cp .env.example .env.local   # completar los valores, ver detalle abajo
npm install
npm run dev                  # http://localhost:3000
```

Requiere Node **20+** (ver `.nvmrc` en la raíz del repo).

## Variables de entorno

Detalladas y comentadas en [`.env.example`](.env.example). Resumen:

| Variable                               | Requerida | Qué es                                                                                                                             |
| -------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_N8N_BASE`                 | Sí        | Base de los webhooks de n8n para llamadas desde el navegador                                                                       |
| `NEXT_PUBLIC_SUPABASE_URL`             | Sí        | Project URL de Supabase                                                                                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | Sí        | anon/publishable key (no es secreta; RLS protege los datos)                                                                        |
| `N8N_BASE`                             | No        | Base de n8n para llamadas server-side; si falta, cae a `NEXT_PUBLIC_N8N_BASE`                                                      |
| `CRM_PANEL_HEADER` / `CRM_PANEL_TOKEN` | No\*      | Credencial de los webhooks internos del panel (`/api/crm/*`) — debe coincidir con la credencial `CRM - Header Auth (panel)` de n8n |
| `TICKETS_API_KEY`                      | No\*      | Secreto del módulo de tickets; debe coincidir con `TICKETS_API_KEY` del `.env` de n8n. Vacío = módulo sin auth                     |
| `NEXT_PUBLIC_EMAIL_CONTACTO`           | No        | Dirección que se muestra en enlaces vencidos/inválidos de la página de aceptación                                                  |

\* Sin configurar, las rutas que dependen de estas credenciales devuelven
`503` en vez de operar sin autenticar (ver `src/app/api/crm/[accion]/route.ts`
y `src/lib/tickets.ts`).

## Scripts

```bash
npm run dev         # servidor de desarrollo (Turbopack)
npm run build        # build de producción
npm run start         # sirve el build de producción
npm run lint          # ESLint (usa --max-warnings 0 en CI)
npm run typecheck     # tsc --noEmit
```

Desde la raíz del monorepo también hay atajos: `npm run dev:front`,
`npm run lint:front`, `npm run typecheck:front` y `npm run check` (corre toda
la suite del repo + lint + typecheck del front).

## Estructura relevante

```
src/app/
├── components/lead-form.tsx   # Formulario de captación (público)
├── aceptar/[leadId]/          # Página de aceptación de propuesta
├── dashboard/                 # Tablero interno (gate admin + Realtime)
├── dashboard/tickets/         # Tablero de tickets (columnas + drag & drop)
├── api/crm/[accion]/          # Proxy server-side hacia los webhooks internos del panel
├── api/tickets/               # Proxy server-side hacia el módulo de tickets
├── login/ · register/ · auth/ # Autenticación (Supabase)
└── lib/supabase/              # Clientes de Supabase (client / server / middleware)
```

## Despliegue

Pensado para Vercel. El build no necesita credenciales configuradas: los
clientes de Supabase devuelven `null` cuando faltan las variables en vez de
romper (ver `src/lib/supabase/client.ts` y `server.ts`).
