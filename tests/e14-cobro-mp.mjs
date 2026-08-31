#!/usr/bin/env node
/**
 * Escenario E14 — confirmación de cobro con MercadoPago, contra un doble.
 *
 * QUÉ EJERCITA (la RAMA 8 del flujo, §4.3.3 de la tesis), con los nodos reales
 * del workflow de producción, sin modificarlos:
 *
 *   1. Creación de la PREFERENCIA de pago contra la API de MercadoPago
 *      (nodo «HTTP - MercadoPago Crear Preferencia»).
 *   2. Llegada de la NOTIFICACIÓN de pago al webhook POST /webhook/mp/notificacion.
 *   3. Consulta del pago contra la API (nodo «HTTP - MercadoPago Obtener Pago»),
 *      que es la fuente de verdad: el flujo no confía en el cuerpo notificado.
 *   4. Transición de la factura a COBRADO con su mp_payment_id persistido.
 *   5. IDEMPOTENCIA: una notificación repetida no vuelve a aplicar el efecto.
 *
 * ALCANCE — LEER ANTES DE CITAR ESTA CORRIDA:
 *
 *   (a) La API de MercadoPago se reemplaza por el doble `tests/mp-doble.mjs`,
 *       que reproduce el contrato documentado de los dos endpoints que el flujo
 *       consume. Esto verifica el comportamiento del ARTEFACTO, no el del
 *       proveedor. La validación contra MercadoPago real sigue PENDIENTE.
 *
 *   (b) La factura en estado PENDIENTE se SIEMBRA directamente en la base como
 *       precondición del escenario, en lugar de producirse recorriendo el flujo
 *       de aceptación. El motivo es ambiental y está declarado: los nodos
 *       «Gmail - Enviar Propuesta» y «Gmail - Enviar Factura PDF» detienen la
 *       cadena cuando la credencial OAuth de Gmail está vencida, como ocurre en
 *       este entorno. La emisión de la factura por el camino completo es lo que
 *       verifica el escenario E5, ya ejecutado. Lo que E14 verifica —y lo que
 *       esta corrida sí ejercita de punta a punta— es la rama de cobro.
 *
 * Requisitos:
 *   - `node tests/mp-doble.mjs` corriendo.
 *   - n8n levantado con MP_API_BASE apuntando al doble y MP_ACCESS_TOKEN con
 *     cualquier valor no vacío (vacío = modo de desarrollo, no aplica).
 *   - Workflows auxiliares de consulta y siembra importados (ver el reporte de
 *     la corrida para el detalle).
 *   - MP_WEBHOOK_SECRET (S8 de la Tabla 11, cerrada — la firma ya es
 *     obligatoria): este script firma sus notificaciones con el mismo valor
 *     por defecto que docker-compose.yml aplica al contenedor de n8n
 *     (`dev-secret-cambiar-en-produccion`) cuando la variable no está fijada
 *     en `.env`. Si se fija un valor propio en `.env`, ambos lo leen igual.
 *
 * Uso:  node tests/e14-cobro-mp.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHmac, randomUUID } from 'node:crypto';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..');

const rutaEnv = path.join(raiz, '.env');
if (existsSync(rutaEnv)) {
  for (const linea of readFileSync(rutaEnv, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const N8N = (process.env.N8N_BASE ?? 'http://localhost:5678').replace(/\/+$/, '');
const DOBLE = (process.env.MP_DOBLE_BASE ?? 'http://localhost:8799').replace(/\/+$/, '');
const PANEL_TOKEN = process.env.CRM_PANEL_TOKEN ?? '';
const PANEL_HEADER = process.env.CRM_PANEL_HEADER ?? 'x-crm-token';
// Mismo default que docker-compose.yml aplica al contenedor cuando la
// variable no está fijada en .env — así ambos lados firman/validan igual.
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || 'dev-secret-cambiar-en-produccion';

const SUFIJO = Date.now();
const EMAIL = `cliente.demo.e14.${SUFIJO}@ejemplo.com`;
const FACTURA_ID = `FAC-2026-E14${String(SUFIJO).slice(-4)}`;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Réplica local del mismo cálculo que hace el nodo «Code - Leer Notificacion
// MP» (workflow/crm_postgres.json) para validar x-signature. No depende de
// ningún servicio externo: es la misma lógica HMAC, del lado del cliente.
function firmarNotificacion(paymentId) {
  const ts = Math.floor(Date.now() / 1000);
  const requestId = randomUUID();
  const manifest = `id:${String(paymentId).toLowerCase()};request-id:${requestId};ts:${ts};`;
  const hmac = createHmac('sha256', MP_WEBHOOK_SECRET).update(manifest).digest('hex');
  return { 'x-signature': `ts=${ts},v1=${hmac}`, 'x-request-id': requestId };
}

let fallos = 0;
function comprobar(ok, etiqueta, detalle = '') {
  console.log(`${ok ? '  ✓' : '  ✗'} ${etiqueta}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos += 1;
  return ok;
}

async function webhook(ruta, { metodo = 'POST', cuerpo, headers = {} } = {}) {
  const res = await fetch(`${N8N}/webhook/${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await res.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* no-JSON */ }
  return { estado: res.status, texto, json };
}

async function consultar() {
  const res = await fetch(`${N8N}/webhook/consulta-e14?email=${encodeURIComponent(EMAIL)}`);
  const filas = await res.json();
  return Array.isArray(filas) ? filas[0] ?? null : null;
}

async function esperarHasta(descripcion, condicion, { intentos = 20, pausa = 1500 } = {}) {
  for (let i = 0; i < intentos; i += 1) {
    const v = await condicion();
    if (v) return v;
    await esperar(pausa);
  }
  throw new Error(`Se agotó la espera: ${descripcion}`);
}

async function main() {
  console.log('Escenario E14 — confirmación de cobro con MercadoPago (contra doble de prueba)');
  console.log(`n8n:   ${N8N}`);
  console.log(`doble: ${DOBLE}`);
  console.log('');

  try { await fetch(`${DOBLE}/__estado`); }
  catch { console.error(`No se alcanza el doble en ${DOBLE}. Levantalo: node tests/mp-doble.mjs`); process.exit(2); }

  // ── 1. Lead real, por el webhook público ────────────────────────────────
  console.log('1. Alta del lead por el webhook público de captación');
  const alta = await webhook('lead/nuevo', {
    cuerpo: {
      nombre: 'Cliente Demo E14', email: EMAIL, telefono: '+54 261 555 0114',
      servicio: 'Desarrollo Web', presupuesto: 5000, urgencia: 'alta',
      descripcion: 'Escenario E14: rama de cobro con MercadoPago contra doble de prueba.',
      fuente: 'test_e14',
    },
  });
  comprobar(alta.estado === 200, 'el webhook de captación respondió 200', `status=${alta.estado}`);
  const lead = await esperarHasta('el lead se persista', async () => {
    const f = await consultar();
    return f && f.lead_id ? f : null;
  });
  comprobar(lead.tier === 'HOT', 'el lead se califica HOT', `tier=${lead.tier} score=${lead.score}`);

  // ── 2. Preferencia de pago, con el nodo real del workflow ───────────────
  console.log('\n2. Creación de la preferencia de pago (nodo real, contra el doble)');
  const pref = await webhook('verif-mp-base', { cuerpo: { external_reference: FACTURA_ID } });
  comprobar(pref.estado === 200, 'el nodo «HTTP - MercadoPago Crear Preferencia» respondió 200',
    `status=${pref.estado}`);
  const prefId = Array.isArray(pref.json) ? pref.json[0]?.id : pref.json?.id;
  comprobar(!!prefId, 'MercadoPago (doble) devolvió el id de la preferencia', `id=${prefId}`);
  const initPoint = Array.isArray(pref.json) ? pref.json[0]?.init_point : pref.json?.init_point;
  comprobar(!!initPoint, 'devolvió el init_point que alimenta el botón «Pagar ahora»');

  // ── 3. Precondición sembrada: factura PENDIENTE ─────────────────────────
  console.log('\n3. Precondición: factura PENDIENTE asociada al lead');
  console.log('   (sembrada en la base; la emisión por el flujo la cubre E5 — ver cabecera)');
  const siembra = await webhook('sembrar-e14', {
    cuerpo: { factura_id: FACTURA_ID, lead_id: lead.lead_id, email: EMAIL, pref_id: prefId },
  });
  comprobar(siembra.estado === 200, 'la factura se creó', `status=${siembra.estado}`);

  const facturada = await esperarHasta('la factura exista', async () => {
    const f = await consultar();
    return f && f.factura_id ? f : null;
  });
  comprobar(facturada.estado_pago === 'PENDIENTE',
    'estado_pago ANTES de la notificación', `estado_pago=${facturada.estado_pago}`);
  comprobar(!!facturada.mp_preference_id,
    'la factura guarda el mp_preference_id de la preferencia creada',
    `mp_preference_id=${facturada.mp_preference_id}`);
  comprobar(!facturada.mp_payment_id, 'todavía no hay mp_payment_id',
    `mp_payment_id=${facturada.mp_payment_id}`);

  // El doble expone qué pago quedó asociado a esa preferencia.
  const estadoDoble = await (await fetch(`${DOBLE}/__estado`)).json();
  const par = Object.entries(estadoDoble.pagos).find(([, p]) => p.external_reference === FACTURA_ID);
  if (!par) { console.error('El doble no registró un pago para', FACTURA_ID); process.exit(2); }
  const [pagoId] = par;
  console.log(`   · el doble asoció el pago ${pagoId} a la factura ${FACTURA_ID}`);

  // ── 4. Notificación de pago → COBRADO ───────────────────────────────────
  console.log('\n4. MercadoPago notifica el pago aprobado');
  const notif = await webhook('mp/notificacion', {
    cuerpo: { type: 'payment', action: 'payment.updated', data: { id: pagoId } },
    headers: firmarNotificacion(pagoId),
  });
  comprobar(notif.estado === 200, 'la notificación respondió 200', `status=${notif.estado}`);

  const cobrada = await esperarHasta('la factura pase a COBRADO', async () => {
    const f = await consultar();
    return f && f.estado_pago === 'COBRADO' ? f : null;
  }, { intentos: 25, pausa: 2000 });

  comprobar(cobrada.estado_pago === 'COBRADO',
    'estado_pago DESPUÉS de la notificación', `estado_pago=${cobrada.estado_pago}`);
  comprobar(String(cobrada.mp_payment_id) === String(pagoId),
    'la factura persistió el mp_payment_id del pago aprobado',
    `mp_payment_id=${cobrada.mp_payment_id}`);

  // ── 5. Idempotencia ─────────────────────────────────────────────────────
  console.log('\n5. Idempotencia: MercadoPago reintenta la misma notificación');
  const notif2 = await webhook('mp/notificacion', {
    cuerpo: { type: 'payment', action: 'payment.updated', data: { id: pagoId } },
    headers: firmarNotificacion(pagoId),
  });
  comprobar(notif2.estado === 200,
    'la notificación duplicada respondió 200 (no genera reintentos infinitos)',
    `status=${notif2.estado}`);

  await esperar(5000);
  const tras = await consultar();
  comprobar(tras.estado_pago === 'COBRADO', 'la factura sigue COBRADO',
    `estado_pago=${tras.estado_pago}`);
  comprobar(String(tras.mp_payment_id) === String(pagoId), 'el mp_payment_id no cambió',
    `mp_payment_id=${tras.mp_payment_id}`);

  console.log('\n' + '─'.repeat(72));
  console.log('Las tres celdas que la Tabla 12 pedía para E14:');
  console.log(`  estado_pago antes/después        = ${facturada.estado_pago} → ${cobrada.estado_pago}`);
  console.log(`  mp_payment_id persistido         = ${cobrada.mp_payment_id}`);
  console.log('  notificación duplicada aplicada  = una sola vez (estado y mp_payment_id sin cambios)');
  console.log(`  factura / lead de prueba         = ${FACTURA_ID} / ${cobrada.lead_id}`);
  console.log('─'.repeat(72));
  console.log(fallos === 0
    ? '\nE14: todas las comprobaciones pasaron.'
    : `\nE14: ${fallos} comprobación(es) fallida(s).`);
  console.log('Alcance: verifica el ARTEFACTO contra el contrato documentado de la API de');
  console.log('MercadoPago, NO contra el servicio real. La validación con el proveedor sigue');
  console.log('pendiente (ver cabecera de este archivo y §5 de la tesis).');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((e) => { console.error('\nError:', e.message); process.exit(2); });
