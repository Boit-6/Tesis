#!/usr/bin/env node
// Crea en Notion la base del tablero de tickets con el esquema que espera
// workflow/tickets_notion.json, y devuelve el DATABASE_ID listo para pegar en
// el .env. Es lo que hace portable al módulo: en un proyecto nuevo corrés esto
// y ya tenés el tablero, sin armar propiedades a mano.
//
// Uso:
//   NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=<id> node scripts/setup-notion-tickets.mjs
//
// El token sale de una integración interna (notion.so/my-integrations) y la
// página padre TIENE que estar compartida con esa integración
// (··· → Connections → tu integración), si no la API devuelve 404.
//
// Respeta la misma configuración que el workflow, así la base nace alineada:
//   TICKETS_ESTADOS, TICKETS_PRIORIDADES, TICKETS_ORIGENES, TICKETS_PROPS

const NOTION_VERSION = '2022-06-28';
const API = 'https://api.notion.com/v1';

const env = process.env;
const arg = (nombre) => {
  const i = process.argv.indexOf('--' + nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const token = arg('token') || env.NOTION_TOKEN || env.NOTION_API_KEY;
const parentPageId = arg('page') || env.NOTION_PARENT_PAGE_ID;
const titulo = arg('titulo') || env.TICKETS_DB_TITULO || 'Tickets';

if (!token || !parentPageId) {
  console.error(`
Faltan datos.

  NOTION_TOKEN=secret_xxx NOTION_PARENT_PAGE_ID=<id-de-la-pagina> node scripts/setup-notion-tickets.mjs

  --token   <secret>  alternativa a NOTION_TOKEN
  --page    <id>      alternativa a NOTION_PARENT_PAGE_ID
  --titulo  <texto>   nombre de la base (default: "Tickets")

El id de la página está en su URL: notion.so/Mi-Pagina-<32 caracteres>.
Acordate de compartir la página con la integración (··· → Connections).
`);
  process.exit(1);
}

const lista = (k, def) => (env[k] || def).split(',').map((s) => s.trim()).filter(Boolean);

const ESTADOS = lista('TICKETS_ESTADOS', 'BACKLOG,EN_CURSO,BLOQUEADO,HECHO');
const PRIORIDADES = lista('TICKETS_PRIORIDADES', 'BAJA,MEDIA,ALTA,CRITICA');
const ORIGENES = lista('TICKETS_ORIGENES', 'MANUAL,API,CRM,DASHBOARD');

// Mismos nombres de propiedad que usan los nodos Code (remapeables con TICKETS_PROPS).
const PROPS = Object.assign({
  titulo: 'Name',
  estado: 'Estado',
  prioridad: 'Prioridad',
  prioridadInicial: 'Prioridad inicial',
  score: 'Score',
  etiquetas: 'Etiquetas',
  proyecto: 'Proyecto',
  origen: 'Origen',
  ref: 'Ref',
  creado: 'Creado',
  movimiento: 'Ultimo movimiento',
  escaladas: 'Escaladas',
  vence: 'Vence',
  notas: 'Notas',
}, JSON.parse(env.TICKETS_PROPS || '{}'));

// Notion admite una paleta fija; si hay más opciones que colores se repiten.
const PALETA_ESTADO = ['gray', 'blue', 'orange', 'green', 'purple', 'pink', 'brown'];
const PALETA_PRIORIDAD = ['gray', 'yellow', 'orange', 'red', 'pink', 'purple', 'brown'];

const opciones = (nombres, paleta) =>
  nombres.map((name, i) => ({name, color: paleta[i % paleta.length]}));

const properties = {
  [PROPS.titulo]: {title: {}},
  [PROPS.estado]: {select: {options: opciones(ESTADOS, PALETA_ESTADO)}},
  [PROPS.prioridad]: {select: {options: opciones(PRIORIDADES, PALETA_PRIORIDAD)}},
  [PROPS.prioridadInicial]: {select: {options: opciones(PRIORIDADES, PALETA_PRIORIDAD)}},
  [PROPS.score]: {number: {format: 'number'}},
  [PROPS.etiquetas]: {multi_select: {options: []}},
  [PROPS.proyecto]: {select: {options: []}},
  [PROPS.origen]: {select: {options: opciones(ORIGENES, PALETA_ESTADO)}},
  [PROPS.ref]: {rich_text: {}},
  [PROPS.creado]: {date: {}},
  [PROPS.movimiento]: {date: {}},
  [PROPS.escaladas]: {number: {format: 'number'}},
  [PROPS.vence]: {date: {}},
  [PROPS.notas]: {rich_text: {}},
};

async function notion(ruta, body, metodo = 'POST') {
  const res = await fetch(API + ruta, {
    method: metodo,
    headers: {
      Authorization: 'Bearer ' + token,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Notion ${res.status}: ${json.message || JSON.stringify(json)}`);
  }
  return json;
}

const db = await notion('/databases', {
  parent: {type: 'page_id', page_id: parentPageId.replace(/-/g, '')},
  title: [{type: 'text', text: {content: titulo}}],
  description: [{
    type: 'text',
    text: {content: 'Tablero de tickets. La prioridad y el Score los mantiene el workflow de n8n: un ticket sin movimiento sube solo de prioridad.'},
  }],
  properties,
});

console.log(`
✅ Base creada: ${titulo}
   URL: ${db.url}

Pegá esto en el .env que está al lado del docker-compose:

   NOTION_TICKETS_DATABASE_ID=${db.id.replace(/-/g, '')}

Después, en Notion:
  1. Abrí la base y agregá una vista "Board" agrupada por "${PROPS.estado}" (el tablero tipo Trello).
  2. Ordená esa vista por "${PROPS.score}" descendente: arriba queda lo más urgente,
     que es lo que el cron va recalculando solo.
`);
