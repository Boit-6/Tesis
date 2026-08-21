// Smoke test de los Code nodes de los workflows de workflow/*.json.
// Ejecuta el JavaScript de cada nodo "Code" con datos de ejemplo y mocks de las
// variables de n8n ($input, $, $json, $env), para detectar errores de runtime sin
// necesidad de levantar n8n. Uso: node tests/smoke_code_nodes.js
const fs = require('fs');
const path = require('path');

const wfDir = path.join(__dirname, '..', 'workflow');
const wfFiles = fs.readdirSync(wfDir).filter(f => f.endsWith('.json')).sort();

// Variables de entorno que los nodos leen con $env. Los valores son de mentira:
// alcanzan para que la config resuelva y el código corra.
const envMock = {
  TELEGRAM_CHAT_ID: '-1001234567890',
  NOTION_DATABASE_ID: '11111111222233334444555566667777',
  NOTION_TICKETS_DATABASE_ID: '88888888999900001111222233334444',
  TICKETS_PROYECTO: 'CRM Freelance',
};

// Página de Notion de mentira, con la forma que devuelve la API.
function notionPage(over = {}) {
  const dias = over.diasQuieto == null ? 12 : over.diasQuieto;
  const fecha = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
  return {
    id: over.id || '0f0e0d0c-0b0a-4090-8080-707060605050',
    url: 'https://notion.so/ticket',
    created_time: fecha + 'T10:00:00.000Z',
    properties: {
      Name: {type: 'title', title: [{plain_text: over.titulo || 'Arreglar el PDF de la factura'}]},
      Estado: {type: 'select', select: {name: over.estado || 'BACKLOG'}},
      Prioridad: {type: 'select', select: {name: over.prioridad || 'BAJA'}},
      'Prioridad inicial': {type: 'select', select: {name: 'BAJA'}},
      Score: {type: 'number', number: over.score == null ? 10 : over.score},
      Etiquetas: {type: 'multi_select', multi_select: [{name: 'facturacion'}]},
      Proyecto: {type: 'select', select: {name: 'CRM Freelance'}},
      Origen: {type: 'select', select: {name: 'MANUAL'}},
      Ref: {type: 'rich_text', rich_text: [{plain_text: 'LD-1718000000000-ABCD'}]},
      Creado: {type: 'date', date: {start: fecha}},
      'Ultimo movimiento': {type: 'date', date: {start: fecha}},
      Escaladas: {type: 'number', number: 0},
      Vence: {type: 'date', date: null},
      Notas: {type: 'rich_text', rich_text: []},
    },
  };
}

const sample = {
  lead_id: 'LD-1718000000000-ABCD',
  nombre: 'Juan Pérez', email: 'juan@test.com', telefono: '+54 11 5555 5555',
  presupuesto: 6000, urgencia: 'alta', servicio: 'ecommerce',
  descripcion: 'Una tienda online completa con stock, pagos y panel de administracion.',
  fuente: 'webhook', seguimientos: 1, score: 100, tier: 'HOT',
  accept_token: '550e8400-e29b-41d4-a716-446655440000',
  estado_pago: 'PENDIENTE', factura_id: 'FAC-2026-1234', monto: 6000, cliente: 'Juan Pérez',
  dias_al_vencimiento: 3, fecha_vencimiento: '2026-07-01', dias_ciclo_completo: 12,
  body: {
    // CRM
    lead_id: 'LD-1718000000000-ABCD',
    token: '550e8400-e29b-41d4-a716-446655440000',
    estado: 'EN_PROGRESO',
    mensaje: 'Quiero sumar una pasarela de pagos.',
    nombre: 'Juan Pérez', email: 'JUAN@test.com', presupuesto: '6000', urgencia: 'ALTA',
    servicio: 'ecommerce', telefono: '+541155555555',
    descripcion: 'Necesito una tienda online completa con varias funcionalidades.',
    // Tickets
    titulo: 'Arreglar el PDF de la factura',
    prioridad: 'ALTA',
    etiquetas: ['facturacion', 'bug'],
    ticket_id: '0f0e0d0c-0b0a-4090-8080-707060605050',
    ref: 'LD-1718000000000-ABCD',
    notas: 'El logo se corta en la segunda página.',
  },
  query: {
    lead_id: 'LD-1718000000000-ABCD',
    token: '550e8400-e29b-41d4-a716-446655440000',
    factura_id: 'FAC-2026-1234',
    limite: '50',
  },
  headers: {'content-type': 'application/json'},
  // Respuestas de la API de Notion (para los nodos que mapean sus resultados).
  id: '0f0e0d0c-0b0a-4090-8080-707060605050',
  url: 'https://notion.so/ticket',
  results: [
    notionPage({diasQuieto: 12, prioridad: 'BAJA'}),
    notionPage({id: 'aaa', diasQuieto: 2, prioridad: 'ALTA', score: 54}),
    notionPage({id: 'bbb', diasQuieto: 30, prioridad: 'CRITICA', score: 100, estado: 'EN_CURSO'}),
  ],
  properties: notionPage().properties,
  created_time: notionPage().created_time,
  execution: {error: {message: 'boom'}, lastNodeExecuted: 'Nodo X'},
  workflow: {name: 'CRM'},
};

function makeMocks(s) {
  const item = {json: s};
  const $input = {first: () => item, all: () => [item, item], last: () => item};
  const $ = () => ({first: () => item, all: () => [item], item: item});
  return {$input, $, $json: s};
}

let ok = 0, fail = 0;
for (const file of wfFiles) {
  const wf = JSON.parse(fs.readFileSync(path.join(wfDir, file), 'utf8'));
  const codeNodes = wf.nodes.filter(n => n.type === 'n8n-nodes-base.code');
  console.log('\n── ' + file + '  (' + codeNodes.length + ' nodos Code)');
  for (const n of codeNodes) {
    try {
      const {$input, $, $json} = makeMocks(sample);
      const fn = new Function('$input', '$', '$json', '$env', 'Buffer', n.parameters.jsCode);
      const res = fn($input, $, $json, envMock, Buffer);
      if (!Array.isArray(res)) throw new Error('no devolvio un array');
      for (const r of res) if (!r || typeof r.json !== 'object') throw new Error('item sin .json valido');
      console.log('OK    ' + n.name + '  ->  ' + res.length + ' item(s)');
      ok++;
    } catch (e) {
      console.log('FAIL  ' + n.name + '  ->  ' + e.message);
      fail++;
    }
  }
}
console.log('\nResultado: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
