// Smoke test de los Code nodes del workflow.
// Ejecuta el JavaScript de cada nodo "Code" con datos de ejemplo y mocks de las
// variables de n8n ($input, $, $json), para detectar errores de runtime sin
// necesidad de levantar n8n. Uso: node tests/smoke_code_nodes.js
const fs = require('fs');
const path = require('path');

const wfPath = path.join(__dirname, '..', 'workflow', 'crm_postgres.json');
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
const codeNodes = wf.nodes.filter(n => n.type === 'n8n-nodes-base.code');

const sample = {
  lead_id: 'LD-1718000000000-ABCD',
  nombre: 'Juan Pérez', email: 'juan@test.com', telefono: '+54 11 5555 5555',
  presupuesto: 6000, urgencia: 'alta', servicio: 'ecommerce',
  descripcion: 'Una tienda online completa con stock, pagos y panel de administracion.',
  fuente: 'webhook', seguimientos: 1, score: 100, tier: 'HOT',
  accept_token: '550e8400-e29b-41d4-a716-446655440000',
  estado_pago: 'PENDIENTE', factura_id: 'FAC-2026-1234', monto: 6000, cliente: 'Juan Pérez',
  dias_al_vencimiento: 3, fecha_vencimiento: '2026-07-01', dias_ciclo_completo: 12,
  body: { nombre: 'Juan Pérez', email: 'JUAN@test.com', presupuesto: '6000', urgencia: 'ALTA', servicio: 'ecommerce', telefono: '+541155555555', descripcion: 'Necesito una tienda online completa con varias funcionalidades.' },
  query: { lead_id: 'LD-1718000000000-ABCD', token: '550e8400-e29b-41d4-a716-446655440000', factura_id: 'FAC-2026-1234' },
  execution: { error: { message: 'boom' }, lastNodeExecuted: 'Nodo X' },
  workflow: { name: 'CRM' }
};

function makeMocks(s) {
  const item = { json: s };
  const $input = { first: () => item, all: () => [item, item], last: () => item };
  const $ = () => ({ first: () => item, all: () => [item], item: item });
  return { $input, $, $json: s };
}

let ok = 0, fail = 0;
for (const n of codeNodes) {
  try {
    const { $input, $, $json } = makeMocks(sample);
    const fn = new Function('$input', '$', '$json', 'Buffer', n.parameters.jsCode);
    const res = fn($input, $, $json, Buffer);
    if (!Array.isArray(res)) throw new Error('no devolvio un array');
    for (const r of res) if (!r || typeof r.json !== 'object') throw new Error('item sin .json valido');
    console.log('OK    ' + n.name + '  ->  ' + res.length + ' item(s)');
    ok++;
  } catch (e) {
    console.log('FAIL  ' + n.name + '  ->  ' + e.message);
    fail++;
  }
}
console.log('\nResultado: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
