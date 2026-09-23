// Verificación de la firma x-signature de las notificaciones de MercadoPago
// (`Code - Leer Notificacion MP`): ejecuta el código del nodo tal cual está en
// el workflow con firmas válidas, falsas, truncadas y ausentes.
//
// Uso: node tests/firmas.mjs
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const leerWf = (f) => JSON.parse(readFileSync(path.join(aqui, '..', 'workflow', f), 'utf8'));
const require = createRequire(import.meta.url);

let ok = 0, fail = 0;
const check = (nombre, condicion, detalle) => {
  if (condicion) { console.log('OK    ' + nombre); ok++; }
  else { console.log('FAIL  ' + nombre + (detalle ? '  ->  ' + detalle : '')); fail++; }
};

function correr(nodo, json, env) {
  const item = {json};
  const $input = {first: () => item, all: () => [item]};
  const fn = new Function('$input', '$json', '$env', 'Buffer', 'require', nodo.parameters.jsCode);

  return fn($input, json, env, Buffer, require);
}

// ── MercadoPago: x-signature ────────────────────────────────────────────────
const crm = leerWf('crm_postgres.json');
const leerMp = crm.nodes.find((n) => n.name === 'Code - Leer Notificacion MP');
const SECRETO = 'secreto-de-prueba';

function firmar(paymentId, secreto = SECRETO) {
  const ts = '1700000000';
  const requestId = 'req-1';
  const hmac = createHmac('sha256', secreto)
    .update(`id:${paymentId};request-id:${requestId};ts:${ts};`)
    .digest('hex');

  return {'x-signature': `ts=${ts},v1=${hmac}`, 'x-request-id': requestId};
}

const notificacion = (headers) => ({body: {type: 'payment', data: {id: '123456'}}, query: {}, headers});
const pagoLeido = (headers, env = {MP_WEBHOOK_SECRET: SECRETO}) =>
  correr(leerMp, notificacion(headers), env)[0].json.payment_id;

check('una notificación bien firmada deja pasar el pago', pagoLeido(firmar('123456')) === '123456');
check('firmada con otro secreto se descarta', pagoLeido(firmar('123456', 'otro')) === '');
check('firmada para otro pago se descarta', pagoLeido(firmar('999')) === '');

const truncada = firmar('123456');

truncada['x-signature'] = truncada['x-signature'].slice(0, -1);
check('una firma de otro largo se descarta (sin excepción)', pagoLeido(truncada) === '');
check('sin x-signature se descarta', pagoLeido({}) === '');
check('sin MP_WEBHOOK_SECRET configurado se descarta todo', pagoLeido(firmar('123456'), {}) === '');

console.log('\nResultado: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
