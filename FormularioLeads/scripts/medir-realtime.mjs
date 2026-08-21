#!/usr/bin/env node
// Mide la latencia de la suscripción Realtime (`postgres_changes`) que usa el
// tablero interno (§4.2.5 / RNF6 / escenario E7).
//
// Responde la parte de la recomendación 5 del dictamen que no puede medirse
// desde el servidor: cuánto tarda un cambio en la tabla `leads` en llegarle al
// navegador. Usa el mismo cliente (@supabase/supabase-js) y el mismo canal que
// el dashboard, así que mide exactamente lo que ve el usuario.
//
// Necesita la service_role (para poder escribir la fila de prueba) y la anon
// key (para suscribirse igual que el front).
//
// Uso, desde FormularioLeads/:
//   node scripts/medir-realtime.mjs [--muestras 5]
import {createClient} from '@supabase/supabase-js';
import {readFileSync, existsSync} from 'node:fs';
import path from 'node:path';

// Carga .env.local sin pisar el entorno.
const envLocal = path.join(process.cwd(), '.env.local');

if (existsSync(envLocal)) {
  for (const linea of readFileSync(envLocal, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);

    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error(`
Faltan variables. Necesito, en .env.local o en el entorno:
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY      (para suscribirse, igual que el dashboard)
  SUPABASE_SERVICE_ROLE_KEY          (para escribir la fila de prueba)
`);
  process.exit(1);
}

const i = process.argv.indexOf('--muestras');
const MUESTRAS = i >= 0 ? Number(process.argv[i + 1]) || 5 : 5;

const escritor = createClient(URL, SERVICE, {auth: {persistSession: false}});
// El lector usa la anon key: mismas condiciones que el navegador.
const lector = createClient(URL, ANON, {auth: {persistSession: false}});

const LEAD_ID = `LD-RT-${Date.now()}`;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

let recibirEvento = null;
const canal = lector
  .channel('medicion-realtime')
  .on('postgres_changes', {event: '*', schema: 'public', table: 'leads'}, (payload) => {
    if (recibirEvento) recibirEvento(payload);
  });

console.log('· Suscribiendo al canal de `leads` con la anon key…');

await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('No se pudo suscribir en 15 s. ¿Está `leads` en la publicación supabase_realtime?')), 15000);

  canal.subscribe((estado) => {
    if (estado === 'SUBSCRIBED') {
      clearTimeout(timeout);
      resolve();
    }
    if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
      clearTimeout(timeout);
      reject(new Error('Estado del canal: ' + estado));
    }
  });
});

console.log('· Suscripto. Midiendo ' + MUESTRAS + ' cambios…\n');

const {error: errAlta} = await escritor.from('leads').insert({
  lead_id: LEAD_ID,
  nombre: '[TEST realtime]',
  email: `rt.${Date.now()}@example.test`,
  presupuesto: 1000,
});

if (errAlta) {
  console.error('No se pudo crear el lead de prueba: ' + errAlta.message);
  process.exit(1);
}

const latencias = [];

for (let n = 1; n <= MUESTRAS; n++) {
  const llegada = new Promise((resolve) => {
    recibirEvento = (payload) => {
      if (payload.new?.lead_id === LEAD_ID) resolve(Date.now());
    };
  });

  const t0 = Date.now();

  await escritor.from('leads').update({score: n}).eq('lead_id', LEAD_ID);

  const tEvento = await Promise.race([llegada, esperar(10000).then(() => null)]);

  if (tEvento == null) {
    console.log(`  muestra ${n}: sin evento en 10 s`);
    continue;
  }

  const ms = tEvento - t0;

  latencias.push(ms);
  console.log(`  muestra ${n}: ${ms} ms`);
  await esperar(500);
}

await escritor.from('leads').delete().eq('lead_id', LEAD_ID);
await lector.removeChannel(canal);

if (!latencias.length) {
  console.error('\n✗ No llegó ningún evento. Revisá que `leads` esté en la publicación supabase_realtime.');
  process.exit(1);
}

const orden = [...latencias].sort((a, b) => a - b);
const media = Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length);
const mediana = orden[Math.floor(orden.length / 2)];

console.log(`
Latencia de postgres_changes (UPDATE en leads → evento en el cliente)
  muestras : ${latencias.length}
  mínimo   : ${orden[0]} ms
  mediana  : ${mediana} ms
  media    : ${media} ms
  máximo   : ${orden.at(-1)} ms

Este es el número que pide la recomendación 5 del dictamen para §5/§6.
`);

process.exit(0);
