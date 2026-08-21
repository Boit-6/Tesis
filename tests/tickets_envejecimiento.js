// Test de la regla de envejecimiento del módulo de tickets.
// Ejecuta el JavaScript REAL del nodo "Code - Calcular Escaladas" (tal como
// quedó en workflow/tickets_notion.json) contra páginas de Notion sintéticas,
// y verifica que un ticket olvidado suba de prioridad y que uno atendido no.
// Uso: node tests/tickets_envejecimiento.js
const fs = require('fs');
const path = require('path');

const wf = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'workflow', 'tickets_notion.json'), 'utf8'),
);

function jsCodeDe(nombre) {
  const nodo = wf.nodes.find(n => n.name === nombre);
  if (!nodo) throw new Error('No existe el nodo "' + nombre + '" en tickets_notion.json');
  return nodo.parameters.jsCode;
}

const ENV = {
  NOTION_TICKETS_DATABASE_ID: '88888888999900001111222233334444',
  TICKETS_PROYECTO: 'CRM Freelance',
  // Defaults explícitos: el test verifica ESTA configuración.
  TICKETS_PRIORIDADES: 'BAJA,MEDIA,ALTA,CRITICA',
  TICKETS_DIAS_ESCALADA: 'BAJA:10,MEDIA:7,ALTA:4',
  TICKETS_PESO_PRIORIDAD: 'BAJA:10,MEDIA:25,ALTA:50,CRITICA:80',
  TICKETS_PUNTOS_POR_DIA: '2',
  TICKETS_SCORE_MAX: '100',
};

const hace = (dias) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);

// Página de Notion mínima con las propiedades que lee el módulo.
function page({id, titulo, prioridad, estado = 'BACKLOG', diasAbierto, diasQuieto, score, escaladas = 0}) {
  return {
    id,
    url: 'https://notion.so/' + id,
    created_time: hace(diasAbierto) + 'T10:00:00.000Z',
    properties: {
      Name: {type: 'title', title: [{plain_text: titulo}]},
      Estado: {type: 'select', select: {name: estado}},
      Prioridad: {type: 'select', select: {name: prioridad}},
      Score: {type: 'number', number: score},
      Creado: {type: 'date', date: {start: hace(diasAbierto)}},
      'Ultimo movimiento': {type: 'date', date: {start: hace(diasQuieto)}},
      Escaladas: {type: 'number', number: escaladas},
    },
  };
}

function correrCalculoEscaladas(pages) {
  const item = {json: {results: pages}};
  const $input = {first: () => item, all: () => [item], last: () => item};
  const $ = () => ({first: () => item, all: () => [item], item});
  const fn = new Function('$input', '$', '$json', '$env', jsCodeDe('Code - Calcular Escaladas'));
  return fn($input, $, item.json, ENV).map(i => i.json);
}

function correrResumen(pages) {
  const item = {json: {results: pages}};
  const $input = {first: () => item, all: () => [item], last: () => item};
  const $ = () => ({first: () => item, all: () => [item], item});
  const fn = new Function('$input', '$', '$json', '$env', jsCodeDe('Code - Resumen Envejecimiento'));
  return fn($input, $, item.json, ENV)[0].json;
}

let ok = 0, fail = 0;
function check(nombre, condicion, detalle) {
  if (condicion) {
    console.log('OK    ' + nombre);
    ok++;
  } else {
    console.log('FAIL  ' + nombre + (detalle ? '  ->  ' + detalle : ''));
    fail++;
  }
}

// ── Escenario ───────────────────────────────────────────────────────────────
const tablero = [
  // Baja prioridad, 12 días sin que nadie lo toque: tolera 10 → tiene que subir.
  page({id: 'olvidado', titulo: 'Renombrar carpeta de assets', prioridad: 'BAJA', diasAbierto: 12, diasQuieto: 12, score: 10}),
  // Baja prioridad recién creado: no debe moverse de prioridad.
  page({id: 'nuevo', titulo: 'Sacar console.log del form', prioridad: 'BAJA', diasAbierto: 1, diasQuieto: 1, score: 12}),
  // Alta prioridad pero movido ayer: se está atendiendo, no escala.
  page({id: 'atendido', titulo: 'Bug en el PDF', prioridad: 'ALTA', diasAbierto: 20, diasQuieto: 1, score: 90}),
  // Ya está en el tope de la escala: no puede subir más.
  page({id: 'tope', titulo: 'Servidor caído', prioridad: 'CRITICA', diasAbierto: 40, diasQuieto: 40, score: 100}),
  // Media prioridad, 8 días quieto: tolera 7 → sube a ALTA.
  page({id: 'media-vieja', titulo: 'Actualizar el README', prioridad: 'MEDIA', diasAbierto: 8, diasQuieto: 8, score: 41}),
];

const cambios = correrCalculoEscaladas(tablero);
const por = (id) => cambios.find(c => c.ticket_id === id);

check(
  'un ticket BAJA olvidado 12 días sube a MEDIA',
  por('olvidado') && por('olvidado').sube && por('olvidado').prioridad === 'MEDIA',
  JSON.stringify(por('olvidado')),
);
check(
  'un ticket MEDIA quieto 8 días sube a ALTA',
  por('media-vieja') && por('media-vieja').sube && por('media-vieja').prioridad === 'ALTA',
  JSON.stringify(por('media-vieja')),
);
check(
  'un ticket ALTA movido ayer NO escala',
  !por('atendido') || por('atendido').sube === false,
  JSON.stringify(por('atendido')),
);
check(
  'un ticket ya en CRITICA no sube más (es el tope de la escala)',
  !por('tope') || por('tope').sube === false,
  JSON.stringify(por('tope')),
);
check(
  'el ticket recién creado no genera escalada',
  !por('nuevo') || por('nuevo').sube === false,
  JSON.stringify(por('nuevo')),
);

// El score del olvidado: peso(MEDIA)=25 + 2 puntos × 12 días = 49.
check(
  'el score recalculado combina prioridad nueva y días abiertos (25 + 2×12 = 49)',
  por('olvidado') && por('olvidado').score === 49,
  por('olvidado') && String(por('olvidado').score),
);

// El score está topeado por TICKETS_SCORE_MAX.
check(
  'el score nunca supera TICKETS_SCORE_MAX',
  cambios.every(c => c.score <= 100),
  JSON.stringify(cambios.map(c => c.score)),
);

// Cada cambio tiene que traer un patch válido para la API de Notion.
check(
  'cada cambio trae un notion_patch con properties',
  cambios.every(c => c.notion_patch && typeof c.notion_patch.properties === 'object'),
);
check(
  'las escaladas incrementan el contador Escaladas',
  cambios.filter(c => c.sube).every(c => c.notion_patch.properties.Escaladas.number === 1),
);
check(
  'las escaladas reinician el reloj (Ultimo movimiento = hoy)',
  cambios.filter(c => c.sube).every(
    c => c.notion_patch.properties['Ultimo movimiento'].date.start === new Date().toISOString().slice(0, 10),
  ),
);

// Un tablero sin nada que tocar no debe llamar a la API.
const quietos = [page({id: 'ok', titulo: 'Todo bien', prioridad: 'ALTA', diasAbierto: 2, diasQuieto: 1, score: 54})];
check(
  'si no hay nada que actualizar no se emite ningún item (0 llamadas a Notion)',
  correrCalculoEscaladas(quietos).length === 0,
  JSON.stringify(correrCalculoEscaladas(quietos)),
);

// ── Resumen para Telegram ───────────────────────────────────────────────────
const resumen = correrResumen(tablero);
check('el resumen avisa cuando hubo escaladas', resumen.hay_aviso === true);
check('el resumen cuenta los tickets abiertos', resumen.abiertos === tablero.length, String(resumen.abiertos));
check('el resumen nombra el ticket olvidado', resumen.texto.includes('Renombrar carpeta de assets'));
check('el resumen muestra el salto de prioridad', resumen.texto.includes('BAJA → <b>MEDIA</b>'), resumen.texto);
check('un tablero vacío no dispara aviso', correrResumen([]).hay_aviso === false);

console.log('\nResultado: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
