# Módulo de tickets (Notion)

Tablero tipo Trello sobre una base de Notion, orquestado por n8n. Un **ticket es
una tarea pendiente**: tiene prioridad y etiquetas, vive en una columna del
tablero y —lo importante— **si nadie lo toca, sube solo de prioridad** hasta que
se atiende. Eso es lo que evita que una tarea de poca importancia quede en el
olvido para siempre.

El módulo es un workflow **independiente** (`workflow/tickets_notion.json`): no
comparte nodos con el CRM y se puede importar tal cual en otro proyecto.

---

## 1. Cómo funciona el envejecimiento

Cada ticket tiene dos números:

| Campo | Qué es |
|---|---|
| `Prioridad` | El escalón en el que está: `BAJA → MEDIA → ALTA → CRITICA` |
| `Score` | `peso(prioridad) + puntos_por_día × días_abierto`, topeado en 100 |

Un cron diario (8:00) recorre los tickets abiertos y aplica dos reglas:

1. **Escalada.** Si el ticket lleva más días sin movimiento que los que tolera
   su prioridad (`TICKETS_DIAS_ESCALADA`), sube un escalón y su reloj se
   reinicia. Un ticket que entra como `BAJA` y nadie toca recorre toda la escala
   y termina en `CRITICA`.
2. **Score.** Se recalcula siempre, así el tablero se reordena solo: un ticket
   viejo de prioridad baja termina pesando más que uno nuevo de prioridad media.

**Tocar un ticket reinicia el reloj.** Moverlo de columna o cambiarle la
prioridad desde el dashboard cuenta como movimiento: si lo estás atendiendo, el
cron deja de escalarlo. Al pasar a un estado cerrado el `Score` va a 0 y el
ticket sale del envejecimiento.

Ejemplo con los defaults (`BAJA:10, MEDIA:7, ALTA:4`):

```
día 0   "Renombrar carpeta de assets"   BAJA      score 10
día 10  nadie lo tocó → sube            MEDIA     score 45
día 17  nadie lo tocó → sube            ALTA      score 84
día 21  nadie lo tocó → sube            CRITICA   score 100  + aviso por Telegram
```

Al final del día, lo que escaló y lo que ya está en el tope sin resolver llega
por Telegram.

---

## 2. Puesta en marcha

**1. Crear la base en Notion.** El script arma las 14 propiedades con los tipos
y opciones que espera el workflow:

```bash
NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=<id-de-la-pagina> \
  node scripts/setup-notion-tickets.mjs
```

El token sale de una integración interna (notion.so/my-integrations) y **la
página padre tiene que estar compartida con esa integración** (`···` →
Connections), si no la API responde 404. El script imprime el `DATABASE_ID`.

**2. Configurar el entorno.** En el `.env` que está al lado del
`docker-compose.yml`:

```bash
NOTION_TICKETS_DATABASE_ID=<lo-que-imprimió-el-script>
TICKETS_PROYECTO=CRM Freelance
```

Todo lo demás tiene default (ver `.env.example`). Levantar de nuevo n8n para que
tome las variables:

```bash
docker compose up -d
```

**3. Importar el workflow.** En n8n: importar `workflow/tickets_notion.json`,
asignar las credenciales de **Notion** y **Telegram** (los nodos vienen con
`REEMPLAZAR_AL_IMPORTAR`) y **publicar**.

**4. Armar la vista de tablero en Notion.** Abrir la base → nueva vista
**Board**, agrupada por `Estado` y ordenada por `Score` descendente. Eso es el
Trello: arriba de todo queda lo más urgente, que el cron va recalculando solo.

---

## 3. API

Cuatro puntos de entrada. Si `TICKETS_API_KEY` está configurada, los tres
webhooks exigen el header `x-api-key`.

### `POST /webhook/ticket/nuevo`

```json
{
  "titulo": "Arreglar el logo cortado en el PDF",
  "prioridad": "ALTA",
  "estado": "BACKLOG",
  "etiquetas": ["facturacion", "bug"],
  "notas": "Se corta en la segunda página.",
  "vence": "2026-08-15",
  "ref": "LD-1718000000000-ABCD",
  "proyecto": "CRM Freelance",
  "origen": "MANUAL"
}
```

Sólo `titulo` es obligatorio. `prioridad`, `estado` y `origen` se normalizan
contra la config: un valor fuera de la lista cae al default en vez de romper.
Devuelve `201` con `{ ok, ticket_id, url, titulo, estado, prioridad }`.

### `POST /webhook/ticket/estado`

```json
{"ticket_id": "<id de la página de Notion>", "estado": "EN_CURSO", "prioridad": "ALTA", "notas": "..."}
```

Los tres campos son opcionales pero hay que mandar al menos uno. Lee la página
antes de escribir para recalcular el `Score` sin perder los días acumulados.

### `GET /webhook/ticket/listar`

Query params: `estado`, `prioridad`, `proyecto`, `abiertos` (`true` por
defecto), `limite` (máx. 100). Devuelve JSON plano ordenado por `Score`
descendente, con `estados` y `prioridades` para que el front dibuje las columnas
sin hardcodear nada, y con `dias_para_escalar` por ticket.

> Tope de 100 por consulta: es el `page_size` de Notion y el módulo no pagina.
> El campo `truncado` avisa cuando se llegó al límite.

### Cron diario 8:00

El envejecimiento. No tiene entrada HTTP; para probarlo, ejecutar el workflow a
mano desde n8n.

---

## 4. Configuración

Todo por variables de entorno. n8n necesita `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`
para que los nodos `Code` puedan leerlas (ya está en el `docker-compose.yml`).

| Variable | Default | Qué hace |
|---|---|---|
| `NOTION_TICKETS_DATABASE_ID` | *(requerida)* | Base de Notion del tablero |
| `TICKETS_PROYECTO` | `CRM Freelance` | Nombre estampado en cada ticket |
| `TICKETS_ESTADOS` | `BACKLOG,EN_CURSO,BLOQUEADO,HECHO` | Columnas del tablero |
| `TICKETS_ESTADOS_CERRADOS` | `HECHO` | Estados que dejan de envejecer |
| `TICKETS_ESTADO_INICIAL` | primer estado | Columna donde nace un ticket |
| `TICKETS_PRIORIDADES` | `BAJA,MEDIA,ALTA,CRITICA` | Escala, de menor a mayor |
| `TICKETS_PRIORIDAD_DEFAULT` | `MEDIA` | Prioridad si no se especifica |
| `TICKETS_ORIGENES` | `MANUAL,API,CRM,DASHBOARD` | Valores válidos de `Origen` |
| `TICKETS_DIAS_ESCALADA` | `BAJA:10,MEDIA:7,ALTA:4` | Días sin movimiento antes de subir un escalón |
| `TICKETS_PESO_PRIORIDAD` | `BAJA:10,MEDIA:25,ALTA:50,CRITICA:80` | Base del `Score` |
| `TICKETS_PUNTOS_POR_DIA` | `2` | Cuánto suma al `Score` cada día abierto |
| `TICKETS_SCORE_MAX` | `100` | Tope del `Score` |
| `TICKETS_FILTRAR_POR_PROYECTO` | `true` | Aísla proyectos que comparten tablero |
| `TICKETS_PROPS` | `{}` | JSON para remapear los nombres de las propiedades de Notion |
| `TICKETS_API_KEY` | *(vacía)* | Si se setea, exige el header `x-api-key` |
| `TICKETS_CORS_ORIGINS` | `*` | Orígenes permitidos en los webhooks |
| `TICKETS_TELEGRAM_CHAT_ID` | `TELEGRAM_CHAT_ID` | Chat de los avisos del módulo |
| `TICKETS_WEBHOOK_BASE` | `http://localhost:5678` | Base que usa el CRM para llamar al módulo |
| `TICKETS_PLANTILLA_PROYECTO` | ver `.env.example` | Tickets que se siembran al aceptarse una propuesta |

---

## 5. Llevarlo a otro proyecto

El módulo no sabe nada del CRM. Para reusarlo:

1. Crear la base con `scripts/setup-notion-tickets.mjs` en el Notion del
   proyecto nuevo.
2. Importar `workflow/tickets_notion.json` en su n8n y poner las credenciales.
3. Cambiar `NOTION_TICKETS_DATABASE_ID` y `TICKETS_PROYECTO`.

Si el flujo de trabajo es distinto, `TICKETS_ESTADOS` y `TICKETS_PRIORIDADES`
redefinen las columnas y la escala **sin tocar una línea de código**: los nodos
`Code` leen la escala de las variables y el tablero del dashboard dibuja las
columnas con lo que devuelve `ticket/listar`.

Si la base de Notion ya existe con otros nombres de propiedad, `TICKETS_PROPS`
las remapea:

```bash
TICKETS_PROPS={"estado":"Status","prioridad":"Priority","titulo":"Task"}
```

**Un solo tablero para varios proyectos:** con `TICKETS_FILTRAR_POR_PROYECTO=true`
(el default) cada instancia sólo ve y envejece los tickets cuyo `Proyecto`
coincide con su `TICKETS_PROYECTO`.

---

## 6. Cómo entran los tickets

| Origen | Cómo |
|---|---|
| `DASHBOARD` | Formulario del tablero en `/dashboard/tickets` |
| `CRM` | Automático: al aceptarse una propuesta se siembran los tickets del proyecto según `TICKETS_PLANTILLA_PROYECTO` |
| `API` | `POST /webhook/ticket/nuevo` desde donde sea (curl, otro workflow, otro sistema) |
| `MANUAL` | Creando la card a mano en Notion |

El enganche con el CRM es una llamada HTTP desde `crm_postgres.json` con
`onError: continuar`: **si el módulo de tickets no está activo, la aceptación de
la propuesta sigue su curso igual**. Esa es la razón de que sean dos workflows y
no uno.

---

## 7. El tablero del dashboard

`/dashboard/tickets` (requiere sesión + rol `admin`, igual que el resto del
panel). Columnas por estado, cards arrastrables entre columnas —con botones
`←` `→` para teclado y touch—, alta rápida con prioridad y etiquetas, y en cada
card los días abierto, las veces que escaló y cuánto le falta para volver a
escalar.

El front **no habla con Notion ni con n8n directamente**: pasa por
`/api/tickets` y `/api/tickets/estado`, route handlers de Next.js que revalidan
el rol `admin` y agregan la `TICKETS_API_KEY` del lado del servidor. Así ni el
token de Notion ni la API key llegan nunca al navegador.

En el `.env.local` del front:

```bash
N8N_BASE=http://localhost:5678   # opcional, cae a NEXT_PUBLIC_N8N_BASE
TICKETS_API_KEY=                 # el mismo valor que en el .env de n8n
```

---

## 8. Pruebas

```bash
node tests/tickets_envejecimiento.js   # la regla de escalada, con casos
node tests/smoke_code_nodes.js         # todos los nodos Code de los dos workflows
```

`tickets_envejecimiento.js` ejecuta el JavaScript **real** del nodo
`Code - Calcular Escaladas` (tal como está en el JSON del workflow) contra
tickets sintéticos de distintas edades, y verifica que el olvidado suba, que el
atendido no, que el que ya está en el tope no siga subiendo y que un tablero sin
cambios no genere ni una llamada a la API.
