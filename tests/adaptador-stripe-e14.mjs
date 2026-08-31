#!/usr/bin/env node
/**
 * Adaptador de protocolo hacia una pasarela de pago REAL (Stripe, modo de
 * prueba), para el escenario E14 (§4.3.3 y §5.3 de la tesis).
 *
 * QUÉ ES Y QUÉ NO ES. Este archivo NO reemplaza a `tests/mp-doble.mjs`, que
 * sigue siendo el camino sin credenciales (fabrica el desenlace del pago, no
 * ejecuta ninguno real). Este adaptador habla el mismo contrato HTTP que el
 * doble hacia n8n —los mismos dos endpoints de MercadoPago, más los mismos
 * auxiliares /__estado y /__reset—, pero por dentro cada llamada dispara una
 * llamada REAL a la API de Stripe en modo de prueba. La diferencia con el
 * doble no es cosmética: acá el pago OCURRE (tarjeta de prueba oficial de
 * Stripe, ciclo de vida real de un PaymentIntent), no se fabrica un
 * `status: 'approved'` fijo como hace `mp-doble.mjs`.
 *
 * POR QUÉ STRIPE Y NO MERCADOPAGO REAL. La activación de credenciales de
 * prueba de MercadoPago falla del lado del proveedor (error 422 documentado
 * en foros públicos, reproducido con cuentas distintas — ver §5.3). Stripe no
 * tiene ese punto de fricción: las claves de prueba (`sk_test_...`) están
 * disponibles desde el alta de la cuenta, sin paso de activación.
 *
 * QUÉ ACREDITA ESTA CORRIDA Y QUÉ NO (léase antes de citarla, igual que
 * `tests/e14-cobro-mp.mjs`):
 *   SÍ: que la lógica de cobro del artefacto (idempotencia vía
 *       `WHERE estado_pago = 'PENDIENTE'`, el gate `status === 'approved'`,
 *       el manejo del id numérico del pago, el ciclo preferencia→confirmación
 *       completo) funciona correctamente cuando la respalda una pasarela real
 *       con un ciclo de vida de pago real y no fabricado.
 *   NO:  que el artefacto funcione específicamente contra la API de
 *        MercadoPago. El protocolo, las formas de respuesta y el esquema de
 *        autenticación de Stripe son distintos; la validación contra
 *        MercadoPago real sigue pendiente (Capítulo 8, punto 6).
 *
 * RESTRICCIÓN TÉCNICA QUE ESTE ADAPTADOR RESPETA. El nodo real
 * `Code - Procesar Pago MP` exige que el payment_id devuelto por
 * `GET /v1/payments/{id}` sea numérico puro (`/^[0-9]+$/`, ver el propio
 * nodo). Los ids nativos de Stripe (`pi_...`) no lo son. Por eso este
 * adaptador mantiene, igual que `mp-doble.mjs`, un mapa interno de un id
 * sintético numérico hacia el id real de Stripe: `mp_preference_id` (TEXT,
 * sin esa restricción) sí puede llevar el id nativo de Stripe.
 *
 * DIVERGENCIA DECLARADA DE MONEDA. La producción usa MP_CURRENCY=ARS. Este
 * adaptador usa USD por defecto (configurable con STRIPE_TEST_CURRENCY)
 * porque no todas las cuentas de Stripe en modo de prueba tienen ARS
 * habilitado; no representa el comportamiento de producción, sólo permite
 * que la tarjeta de prueba oficial complete un cargo real.
 *
 * Requisitos:
 *   - STRIPE_TEST_SECRET_KEY en `.env` (clave de prueba, `sk_test_...`). No
 *     la lee n8n ni ningún nodo de producción: es exclusiva de este script.
 *   - n8n levantado con MP_API_BASE apuntando a este adaptador y
 *     MP_ACCESS_TOKEN con cualquier valor no vacío (igual que con el doble).
 *
 * Uso:
 *   node tests/adaptador-stripe-e14.mjs [--puerto 8798]
 *
 * Y en el entorno de n8n:
 *   MP_API_BASE=http://host.docker.internal:8798
 *   MP_ACCESS_TOKEN=<cualquier valor no vacío>
 *
 * Luego: node tests/e14-cobro-mp.mjs con MP_DOBLE_BASE=http://localhost:8798
 * (el mismo test, sin modificar — sólo cambia a qué instrumento apunta).
 *
 * Endpoints auxiliares (no son de MercadoPago ni de Stripe, sirven al test):
 *   GET /__estado    → preferencias y pagos que el adaptador tiene registrados
 *   POST /__reset    → limpia el estado en memoria (no anula pagos en Stripe)
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..');
const rutaEnv = path.join(raiz, '.env');
if (existsSync(rutaEnv)) {
  for (const linea of readFileSync(rutaEnv, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const args = process.argv.slice(2);
const idxPuerto = args.indexOf('--puerto');
const PUERTO = idxPuerto >= 0 ? Number(args[idxPuerto + 1]) : 8798;

const STRIPE_KEY = process.env.STRIPE_TEST_SECRET_KEY || '';
const STRIPE_CURRENCY = (process.env.STRIPE_TEST_CURRENCY || 'usd').toLowerCase();
const STRIPE_TEST_PM = process.env.STRIPE_TEST_PAYMENT_METHOD || 'pm_card_visa';
const STRIPE_API = 'https://api.stripe.com/v1';

if (!STRIPE_KEY.startsWith('sk_test_')) {
  console.error('[adaptador-stripe] STRIPE_TEST_SECRET_KEY no está configurada o no es una clave');
  console.error('  de PRUEBA (debe empezar con sk_test_). Configurala en .env y volvé a correr.');
  console.error('  No se puede seguir: este instrumento nunca debe correr con una clave real.');
  process.exit(2);
}

// Estado en memoria: id sintético numérico (lo que ve n8n) -> datos de Stripe.
let contador = 0;
const preferencias = new Map(); // preference_id (= id de sesión de Stripe) -> { external_reference, monto, moneda }
const pagos = new Map();        // payment_id sintético -> { external_reference, stripePaymentIntentId, status }

async function stripeFetch(metodo, ruta, cuerpoForm) {
  const opciones = {
    method: metodo,
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  if (cuerpoForm) opciones.body = new URLSearchParams(cuerpoForm).toString();
  const res = await fetch(`${STRIPE_API}${ruta}`, opciones);
  const json = await res.json();
  return { ok: res.ok, status: res.status, json };
}

function responder(res, codigo, objeto) {
  const cuerpo = JSON.stringify(objeto);
  res.writeHead(codigo, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(cuerpo),
  });
  res.end(cuerpo);
}

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

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const ruta = url.pathname;

  // ── Contrato de MercadoPago que el nodo real de n8n consume ─────────────
  if (req.method === 'POST' && ruta === '/checkout/preferences') {
    const cuerpo = await leerCuerpo(req);
    // MercadoPago exige el bearer; el adaptador lo exige igual, con el mismo
    // criterio que mp-doble.mjs, para no alterar la ruta de autenticación
    // que ejercita el nodo HTTP.
    const auth = String(req.headers.authorization || '');
    if (!/^Bearer\s+\S+/.test(auth)) {
      return responder(res, 401, { message: 'invalid access token', status: 401 });
    }

    const item = (cuerpo.items && cuerpo.items[0]) || {};
    const externalRef = String(cuerpo.external_reference || '');
    const monto = Number(item.unit_price) || 0;
    const centavos = Math.round(monto * 100);

    console.log(`[adaptador-stripe] confirmando un PaymentIntent REAL de prueba: ${centavos} ${STRIPE_CURRENCY} (external_reference=${externalRef})`);

    // Se confirma de una: no hay checkout hospedado que un navegador visite,
    // así que la tarjeta de prueba se aplica en el momento con la misma API
    // que usaría un checkout real. Restringido a 'card' para no necesitar
    // return_url (lo exigirían los métodos con redirección).
    const intent = await stripeFetch('POST', '/payment_intents', {
      amount: String(centavos),
      currency: STRIPE_CURRENCY,
      payment_method: STRIPE_TEST_PM,
      confirm: 'true',
      'payment_method_types[]': 'card',
      'metadata[external_reference]': externalRef,
    });

    if (!intent.ok) {
      console.error('[adaptador-stripe] Stripe rechazó la creación/confirmación:', intent.json.error?.message || intent.status);
      return responder(res, 502, { message: 'stripe_error', status: 502, detalle: intent.json.error?.message });
    }

    contador += 1;
    const pagoIdSintetico = String(900000000 + contador);
    const stripeId = intent.json.id; // pi_... — TEXT, va a mp_preference_id sin problema

    preferencias.set(stripeId, { external_reference: externalRef, monto, moneda: STRIPE_CURRENCY });
    pagos.set(pagoIdSintetico, {
      external_reference: externalRef,
      stripePaymentIntentId: stripeId,
      status: intent.json.status, // 'succeeded' si la tarjeta de prueba no exige 3DS
    });

    console.log(`[adaptador-stripe] PaymentIntent real ${stripeId} → status=${intent.json.status} · id sintético para n8n=${pagoIdSintetico}`);

    return responder(res, 201, {
      id: stripeId,
      init_point: '(n/a — confirmación headless, sin checkout hospedado)',
      sandbox_init_point: '(n/a — confirmación headless, sin checkout hospedado)',
      external_reference: externalRef,
      date_created: new Date().toISOString(),
    });
  }

  if (req.method === 'GET' && ruta.startsWith('/v1/payments/')) {
    const auth = String(req.headers.authorization || '');
    if (!/^Bearer\s+\S+/.test(auth)) {
      return responder(res, 401, { message: 'invalid access token', status: 401 });
    }
    const pagoIdSintetico = ruta.slice('/v1/payments/'.length);
    const pago = pagos.get(pagoIdSintetico);
    if (!pago) {
      console.log(`[adaptador-stripe] pago sintético ${pagoIdSintetico} no encontrado`);
      return responder(res, 404, { message: 'Payment not found', status: 404 });
    }

    // No confía en el estado cacheado: vuelve a preguntarle a Stripe en vivo,
    // el mismo patrón de "no confiar en el cuerpo, re-verificar contra la
    // API" que ya usa el nodo real de MercadoPago (y que Stripe prescribe
    // como práctica oficial: nunca confiar en el webhook, releer con
    // `retrieve`).
    const intent = await stripeFetch('GET', `/payment_intents/${pago.stripePaymentIntentId}`);
    if (!intent.ok) {
      console.error('[adaptador-stripe] no se pudo releer el PaymentIntent en Stripe:', intent.json.error?.message);
      return responder(res, 502, { message: 'stripe_error', status: 502 });
    }

    const aprobado = intent.json.status === 'succeeded';
    console.log(`[adaptador-stripe] consulta en vivo del pago ${pagoIdSintetico} → Stripe dice '${intent.json.status}' → MP-shape '${aprobado ? 'approved' : 'pending'}'`);

    return responder(res, 200, {
      id: Number(pagoIdSintetico),
      status: aprobado ? 'approved' : 'pending',
      status_detail: aprobado ? 'accredited' : intent.json.status,
      external_reference: pago.external_reference,
      transaction_amount: preferencias.get(pago.stripePaymentIntentId)?.monto ?? null,
      currency_id: (preferencias.get(pago.stripePaymentIntentId)?.moneda ?? '').toUpperCase() || null,
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
    // Sólo limpia el mapa local: los PaymentIntents ya confirmados en Stripe
    // quedan en la cuenta de prueba (no hay «deshacer» un cargo de prueba
    // ya succeeded; no tiene efecto real ni cuesta nada, es modo de prueba).
    preferencias.clear();
    pagos.clear();
    contador = 0;
    return responder(res, 200, { ok: true });
  }

  responder(res, 404, { message: 'not found', status: 404 });
});

servidor.listen(PUERTO, () => {
  console.log(`[adaptador-stripe] escuchando en http://0.0.0.0:${PUERTO}`);
  console.log(`[adaptador-stripe] moneda de prueba: ${STRIPE_CURRENCY} (producción usa MP_CURRENCY=ARS; divergencia declarada, ver cabecera)`);
  console.log('[adaptador-stripe] apuntá n8n con MP_API_BASE=http://host.docker.internal:' + PUERTO);
});
