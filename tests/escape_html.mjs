// Inyección de HTML desde el formulario público. `nombre`, `email` y el
// mensaje de un pedido de cambios los escribe cualquiera, y terminan en tres
// lugares que interpretan HTML:
//   • los correos que manda Gmail (incluido el acuse del lead frío, que va a
//     la dirección que puso quien completó el formulario);
//   • el PDF de la factura, que Chromium (Gotenberg) renderiza dentro de la
//     red de n8n;
//   • los avisos de Telegram, que usan parse_mode HTML.
// Este test ejecuta cada nodo Code que arma HTML con un payload hostil y
// revisa que las expresiones {{ }} de Telegram y Gmail escapen esos campos.
// También verifica que docker-compose mantenga a Gotenberg sin JavaScript y
// sin acceso a la red.
//
// Uso: node tests/escape_html.mjs
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..');
const leerWf = (f) => JSON.parse(readFileSync(path.join(raiz, 'workflow', f), 'utf8'));
const crm = leerWf('crm_postgres.json');
const tickets = leerWf('tickets.json');

let ok = 0, fail = 0;
const check = (nombre, condicion, detalle) => {
  if (condicion) { console.log('OK    ' + nombre); ok++; }
  else { console.log('FAIL  ' + nombre + (detalle ? '  ->  ' + detalle : '')); fail++; }
};

const PAYLOAD = "<iframe src=http://n8n:5678/></iframe><b>x</b>";
const hostil = {
  lead_id: 'LD-1718000000000-ABCD',
  factura_id: 'FAC-2026-0001',
  nombre: PAYLOAD + ' García & Asociados',
  cliente: PAYLOAD,
  email: 'x"><img src=x>@y.co',
  servicio: 'ecommerce',
  alcance_propuesto: PAYLOAD,
  plazo_propuesto: PAYLOAD,
  precio_propuesto: 1000,
  accept_token: '550e8400-e29b-41d4-a716-446655440000',
  monto: 1000,
  moneda: 'ARS',
  payUrl: "https://mp.test/p?a=1&b=2' onmouseover='alert(1)",
  pay_url: "https://mp.test/p?a=1&b=2' onmouseover='alert(1)",
  fecha_vencimiento_iso: '2026-10-08T00:00:00Z',
  dias_al_vencimiento: 2,
  seguimientos: 0,
};

function ejecutar(nodo) {
  const item = {json: {...hostil}};
  const $input = {first: () => item, all: () => [item], last: () => item};
  const $ = () => ({first: () => item, all: () => [item], item});
  const fn = new Function('$input', '$', '$json', '$env', 'Buffer', nodo.parameters.jsCode);

  return fn($input, $, item.json, {}, Buffer);
}

// Todo lo que el nodo produce y que se interpreta como HTML: strings de la
// salida que traen etiquetas, más el HTML de la factura (va en binario).
function htmlProducido(salida) {
  const piezas = [];

  for (const r of salida) {
    for (const [k, v] of Object.entries(r.json)) {
      if (typeof v === 'string' && /<[a-z]/i.test(v) && !(k in hostil)) piezas.push(v);
    }
    for (const b of Object.values(r.binary || {})) piezas.push(Buffer.from(b.data, 'base64').toString());
  }

  return piezas.join('\n');
}

// ── Nodos Code que arman HTML ───────────────────────────────────────────────
const NODOS_HTML = [
  'Code - Generar Propuesta',
  'Code - Generar Factura HTML',
  'Code - Preparar Follow-up',
  'Code - Filtrar Vencimientos',
  'Code - Email Testimonio',
  'Code - Re-Propuesta',
  'Code - Email No Cambios',
  'Code - Resumen Facturas Vencidas',
];

for (const nombre of NODOS_HTML) {
  const nodo = crm.nodes.find((n) => n.name === nombre);

  if (!nodo) { check(nombre + ' existe', false); continue; }

  const salida = ejecutar(nodo);
  const html = nombre === 'Code - Resumen Facturas Vencidas' ? salida[0].json.detalle : htmlProducido(salida);

  check(nombre + ': produce contenido', html.length > 0);
  check(nombre + ': sin <iframe> crudo', !/<iframe/i.test(html), html.match(/.{0,40}<iframe.{0,40}/i)?.[0]);
  check(nombre + ': sin <img> crudo', !/<img/i.test(html));
  check(nombre + ': ningún href se cierra antes de tiempo', !/href='[^']*'\s+onmouseover/i.test(html));
}

// Cualquier nodo Code nuevo que arme HTML tiene que sumarse a la lista de arriba.
const armanHtml = crm.nodes.filter(
  (n) => n.type === 'n8n-nodes-base.code' && /<(p|div|table|b)[\s>]/.test(n.parameters.jsCode || ''),
);

for (const n of armanHtml) {
  check('cubierto por el test: ' + n.name, NODOS_HTML.includes(n.name) || n.name === 'Code - HTML Confirmacion');
}

// ── Expresiones {{ }} que van a Telegram (parse_mode HTML) o a Gmail ───────
const CAMPO_LIBRE = /\.(nombre|cliente|mensaje|error_msg|detalle|wf_origen|message)\b/;
// El detalle de este aviso ya sale escapado de Code - Resumen Facturas Vencidas.
const YA_ESCAPADOS = new Set(['Telegram - Facturas Vencidas']);

function textosHtml(wf) {
  const out = [];

  for (const n of wf.nodes) {
    const t = n.type.split('.').pop();

    if (t === 'telegram' && n.parameters.additionalFields?.parse_mode === 'HTML') out.push([n.name, n.parameters.text]);
    if (t === 'gmail' && /^=<p>/.test(n.parameters.message || '')) out.push([n.name, n.parameters.message]);
    if (t === 'executeWorkflow' && n.parameters.workflowInputs?.value?.mensaje) {
      out.push([n.name, n.parameters.workflowInputs.value.mensaje]);
    }
  }

  return out;
}

const escapa = (expr) => expr.includes("replaceAll('<', '&lt;')") && expr.includes("replaceAll('&', '&amp;')");

for (const [wfNombre, wf] of [['crm', crm], ['tickets', tickets]]) {
  for (const [nodo, texto] of textosHtml(wf)) {
    if (YA_ESCAPADOS.has(nodo)) continue;

    for (const [, expr] of String(texto).matchAll(/\{\{(.+?)\}\}/g)) {
      if (!CAMPO_LIBRE.test(expr) || /lastNodeExecuted|workflow\.name/.test(expr)) continue;
      check(`${wfNombre}/${nodo}: escapa ${expr.trim().slice(0, 50)}`, escapa(expr), expr.trim());
    }
  }
}

// La forma de escape que usan las expresiones, evaluada de verdad.
{
  const [, expr] = crm.nodes
    .find((n) => n.name === 'Telegram - Lead Frio')
    .parameters.text.match(/\{\{(.+?\.nombre.+?)\}\}/);
  const res = new Function('$json', 'return ' + expr)({nombre: 'A & B <b>c</b>'});

  check('la expresión de escape produce texto válido para Telegram', res === 'A &amp; B &lt;b&gt;c&lt;/b&gt;', res);
}

// ── Gotenberg aislado (docker-compose.yml) ─────────────────────────────────
const compose = readFileSync(path.join(raiz, 'docker-compose.yml'), 'utf8');
const bloqueGotenberg = compose.slice(compose.indexOf('\n  gotenberg:'), compose.indexOf('\nvolumes:'));

check('Gotenberg sin JavaScript', /--chromium-disable-javascript=true/.test(bloqueGotenberg));
check('Gotenberg sólo carga su propio /tmp', /--chromium-allow-list=\^file:\/\/\/tmp\/\.\*/.test(bloqueGotenberg));

console.log('\nResultado: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
