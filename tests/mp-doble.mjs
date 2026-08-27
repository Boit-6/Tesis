#!/usr/bin/env node
/**
 * Doble de prueba de la API de MercadoPago (escenario E14).
 *
 * Reproduce el contrato DOCUMENTADO de los dos únicos endpoints de MercadoPago
 * que consume el flujo (§4.3.3 de la tesis):
 *
 *   POST /checkout/preferences   → crea la preferencia de Checkout Pro y
 *                                  devuelve { id, init_point, ... }
 *   GET  /v1/payments/{id}       → devuelve el pago, con status y
 *                                  external_reference (el factura_id)
 *
 * NO es MercadoPago ni lo sustituye: es un doble que permite ejercitar el
 * escenario E14 de punta a punta cuando la activación de credenciales de prueba
 * del proveedor no está disponible. La validación contra el servicio real sigue
 * siendo necesaria y está declarada como pendiente en la tesis.
 *
 * Uso:
 *   node tests/mp-doble.mjs [--puerto 8799]
 *
 * Y en el entorno de n8n:
 *   MP_API_BASE=http://host.docker.internal:8799
 *   MP_ACCESS_TOKEN=<cualquier valor no vacío>
 *
 * Endpoints auxiliares (no son de MercadoPago, sirven para el test):
 *   GET /__estado    → preferencias y pagos que el doble tiene registrados
 *   POST /__reset    → limpia el estado
 */

import { createServer } from 'node:http';

const args = process.argv.slice(2);
const idxPuerto = args.indexOf('--puerto');
const PUERTO = idxPuerto >= 0 ? Number(args[idxPuerto + 1]) : 8799;

// Estado en memoria: preferencias creadas y pagos derivados de ellas.
let contador = 0;
const preferencias = new Map(); // preference_id -> { external_reference, monto, moneda }
const pagos = new Map();        // payment_id     -> { external_reference, status, preference_id }

function leerCuerpo(req) {
  return new Promise((resolve) => {
    let datos = '';
    req.on('data', (c) => { datos += c; });
    req.on('end', () => {
      try { resolve(datos ? JSON.parse(datos) : {}); }
      catch { resolve({}); }
    });
  });
}

function responder(res, codigo, objeto) {
  const cuerpo = JSON.stringify(objeto);
  res.writeHead(codigo, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(cuerpo),
  });
  res.end(cuerpo);
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const ruta = url.pathname;

  // ── Contrato real de MercadoPago ────────────────────────────────────────
  if (req.method === 'POST' && ruta === '/checkout/preferences') {
    const cuerpo = await leerCuerpo(req);
    // MercadoPago exige el bearer; el doble lo exige igual para que el
    // escenario ejercite la ruta de autenticación del nodo HTTP.
    const auth = String(req.headers.authorization || '');
    if (!/^Bearer\s+\S+/.test(auth)) {
      return responder(res, 401, { message: 'invalid access token', status: 401 });
    }

    contador += 1;
    const prefId = `PREF-DOBLE-${String(contador).padStart(4, '0')}`;
    const item = (cuerpo.items && cuerpo.items[0]) || {};
    const externalRef = String(cuerpo.external_reference || '');

    preferencias.set(prefId, {
      external_reference: externalRef,
      monto: item.unit_price,
      moneda: item.currency_id,
      notification_url: cuerpo.notification_url || null,
    });

    // El pago que "ocurrirá" sobre esta preferencia queda predefinido, de modo
    // que el test sepa qué payment_id notificar.
    const pagoId = String(900000000 + contador);
    pagos.set(pagoId, {
      external_reference: externalRef,
      status: 'approved',
      preference_id: prefId,
    });

    console.log(`[doble-mp] preferencia creada ${prefId} · external_reference=${externalRef} · pago asociado=${pagoId}`);
    return responder(res, 201, {
      id: prefId,
      init_point: `http://localhost:${PUERTO}/checkout/pagar?pref=${prefId}`,
      sandbox_init_point: `http://localhost:${PUERTO}/checkout/pagar?pref=${prefId}`,
      external_reference: externalRef,
      date_created: new Date().toISOString(),
    });
  }

  if (req.method === 'GET' && ruta.startsWith('/v1/payments/')) {
    const auth = String(req.headers.authorization || '');
    if (!/^Bearer\s+\S+/.test(auth)) {
      return responder(res, 401, { message: 'invalid access token', status: 401 });
    }
    const pagoId = ruta.slice('/v1/payments/'.length);
    const pago = pagos.get(pagoId);
    if (!pago) {
      console.log(`[doble-mp] pago ${pagoId} no encontrado`);
      return responder(res, 404, { message: 'Payment not found', status: 404 });
    }
    console.log(`[doble-mp] consulta del pago ${pagoId} → ${pago.status} · external_reference=${pago.external_reference}`);
    return responder(res, 200, {
      id: Number(pagoId),
      status: pago.status,
      status_detail: pago.status === 'approved' ? 'accredited' : 'pending',
      external_reference: pago.external_reference,
      transaction_amount: preferencias.get(pago.preference_id)?.monto ?? null,
      currency_id: preferencias.get(pago.preference_id)?.moneda ?? null,
      date_approved: new Date().toISOString(),
    });
  }

  // ── Auxiliares del test (no forman parte del contrato de MercadoPago) ───
  if (req.method === 'GET' && ruta === '/__estado') {
    return responder(res, 200, {
      preferencias: Object.fromEntries(preferencias),
      pagos: Object.fromEntries(pagos),
    });
  }

  if (req.method === 'POST' && ruta === '/__reset') {
    preferencias.clear();
    pagos.clear();
    contador = 0;
    return responder(res, 200, { ok: true });
  }

  responder(res, 404, { message: 'not found', status: 404 });
});

servidor.listen(PUERTO, () => {
  console.log(`[doble-mp] escuchando en http://0.0.0.0:${PUERTO}`);
  console.log('[doble-mp] apuntá n8n con MP_API_BASE=http://host.docker.internal:' + PUERTO);
});
