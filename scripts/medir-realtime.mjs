#!/usr/bin/env node
// Escenario E7 — actualización del tablero en tiempo real (RNF6).
//
// Mide cuánto tarda en llegar a un cliente suscripto un cambio sobre `leads` a
// través del canal `postgres_changes` de Supabase, que es el mecanismo del que
// depende el refresco sin recarga del tablero (§4.2.5).
//
// El RNF6 fija un umbral de 3 segundos. El script informa la latencia de cada
// repetición, la máxima y el percentil 95, y termina con código distinto de cero
// si el umbral no se cumple o si no llega ningún evento, de modo que sirva como
// verificación automática y no sólo como medición manual.
//
// Uso:
//   node scripts/medir-realtime.mjs            # 5 repeticiones
//   node scripts/medir-realtime.mjs --n 10
//
// Sin dependencias: usa fetch y WebSocket nativos, igual que el resto de los
// scripts de la raíz. Lee las credenciales de FormularioLeads/.env.local.
//
// No deja residuo: no crea ni borra filas. Reescribe la marca `actualizado_en`
// del lead más reciente, que es la columna de metadatos que existe justamente
// para registrar modificaciones.
//
// Si no llega ningún evento, lo más probable es que la tabla no esté publicada:
//   ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
// db/schema.sql ya lo hace de forma idempotente.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = path.join(RAIZ, 'FormularioLeads', '.env.local');

const UMBRAL_MS = 3000;        // RNF6
const ESPERA_EVENTO_MS = 6000; // tolerancia por repetición
const ASENTAMIENTO_MS = 2500;  // el servidor tarda en enlazar la suscripción
const TOPICO = 'realtime:e7-medicion';

const leerEnv = (ruta) => {
  let texto;
  try {
    texto = readFileSync(ruta, 'utf8');
  } catch {
    console.error(`No se pudo leer ${ruta}.`);
    console.error('Copiá FormularioLeads/.env.example a .env.local y completalo.');
    process.exit(2);
  }
  const out = {};
  for (const linea of texto.split('\n')) {
    const t = linea.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
};

const percentil = (valores, p) => {
  if (!valores.length) return null;
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1)];
};

const arg = (nombre) => {
  const i = process.argv.indexOf('--' + nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const N = Number(arg('n') ?? 5);
if (!Number.isInteger(N) || N < 1) {
  console.error('--n debe ser un entero positivo.');
  process.exit(2);
}

const env = leerEnv(ENV);
const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
  process.exit(2);
}

const rest = (ruta, init = {}) =>
  fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    ...init,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

console.log('Escenario E7 — actualización en tiempo real del tablero');
console.log(`Umbral RNF6: ${UMBRAL_MS} ms · repeticiones: ${N}\n`);

// ── Lead sobre el que se mide ────────────────────────────────────────────────
const resLead = await rest('leads?select=lead_id,nombre&order=fecha_ingreso.desc&limit=1');
const leads = await resLead.json();
if (!Array.isArray(leads) || !leads.length) {
  console.error('No hay ningún lead en la base sobre el que medir.');
  process.exit(2);
}
const lead = leads[0];
console.log(`Lead observado: ${lead.lead_id} (${lead.nombre})`);

// ── Canal de tiempo real ─────────────────────────────────────────────────────
const wsUrl = `${URL_BASE.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${KEY}&vsn=1.0.0`;
const ws = new WebSocket(wsUrl);
const recibidos = [];
let ref = 0;
const siguienteRef = () => String(++ref);

const enviar = (event, payload, topic = TOPICO) =>
  ws.send(JSON.stringify({ topic, event, payload, ref: siguienteRef() }));

const unido = await new Promise((resolver) => {
  const limite = setTimeout(() => resolver(false), 15000);
  ws.onerror = () => { clearTimeout(limite); resolver(false); };
  ws.onopen = () => {
    enviar('phx_join', {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: '' },
        postgres_changes: [{ event: '*', schema: 'public', table: 'leads' }],
      },
    });
  };
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.event === 'phx_reply' && msg.payload?.status === 'ok' && msg.topic === TOPICO) {
      clearTimeout(limite);
      resolver(true);
    }
    if (msg.event === 'postgres_changes') recibidos.push(Date.now());
  };
});

if (!unido) {
  console.error('\nNo se pudo abrir el canal de tiempo real.');
  console.error('Comprobá que `leads` esté en la publicación `supabase_realtime`:');
  console.error('  ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;');
  process.exit(1);
}

const latido = setInterval(
  () => ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: siguienteRef() })),
  25000,
);

await new Promise((r) => setTimeout(r, ASENTAMIENTO_MS));
console.log('Canal abierto.\n');

// ── Repeticiones ─────────────────────────────────────────────────────────────
const latencias = [];
for (let i = 1; i <= N; i++) {
  const previos = recibidos.length;
  const t0 = Date.now();
  const res = await rest(`leads?lead_id=eq.${encodeURIComponent(lead.lead_id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ actualizado_en: new Date().toISOString() }),
  });
  if (!res.ok) {
    console.error('Fallo al escribir:', res.status, await res.text());
    clearInterval(latido);
    ws.close();
    process.exit(2);
  }
  await new Promise((r) => {
    const iv = setInterval(() => {
      if (recibidos.length > previos) { clearInterval(iv); r(); }
    }, 5);
    setTimeout(() => { clearInterval(iv); r(); }, ESPERA_EVENTO_MS);
  });
  if (recibidos.length > previos) {
    const ms = recibidos[recibidos.length - 1] - t0;
    latencias.push(ms);
    console.log(`  repetición ${i}: ${ms} ms`);
  } else {
    console.log(`  repetición ${i}: sin evento en ${ESPERA_EVENTO_MS} ms`);
  }
}

clearInterval(latido);
ws.close();

// ── Resultado ────────────────────────────────────────────────────────────────
const max = latencias.length ? Math.max(...latencias) : null;
const p95 = percentil(latencias, 95);

console.log('\n' + '='.repeat(52));
console.log(`Eventos recibidos : ${latencias.length} de ${N}`);
if (latencias.length) {
  console.log(`Latencias (ms)    : ${[...latencias].sort((a, b) => a - b).join(', ')}`);
  console.log(`Máxima            : ${max} ms`);
  console.log(`p95               : ${p95} ms  (${(p95 / 1000).toFixed(2)} s)`);
}
console.log(`Umbral RNF6       : ${UMBRAL_MS} ms`);
const cumple = latencias.length === N && max !== null && max < UMBRAL_MS;
console.log(`Resultado         : ${cumple ? 'CUMPLE' : 'NO CUMPLE'}`);
console.log('='.repeat(52));

process.exit(cumple ? 0 : 1);
