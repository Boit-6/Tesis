#!/usr/bin/env node
// Escenarios E11 y E12 — los dos procesos programados que la validación tenía
// pendientes de ejercitar hasta su último escalón.
//
// El problema que este instrumento resuelve no es disparar los cron, sino
// **darles algo que hacer**. Ambos leen la base buscando filas que cumplan una
// condición temporal, y en una base recién sembrada por la suite de escenarios
// esa condición no se cumple nunca:
//
//   · E11 (seguimiento de propuestas). La rama de «último intento» —la que
//     marca el lead como PERDIDO— sólo se recorre cuando el lead ya lleva DOS
//     seguimientos y el tercero corresponde: la consulta del cron exige
//     `now() - fecha_ultimo_seguimiento >= 3 * (seguimientos + 1)` días, es
//     decir nueve días de espera con `seguimientos = 2`. Ningún lead creado
//     durante una corrida los tiene.
//
//   · E12 (recordatorios de pago). El escalón RECORDATORIO es el que atiende a
//     una factura que vence dentro de 1 a 3 días. Las facturas que emite la
//     suite vencen a FACTURA_VENCIMIENTO_DIAS (15 por defecto), de modo que
//     caen en el tramo que `Code - Filtrar Vencimientos` descarta con
//     `continue`, y el escalón no se ejercita.
//
// Este script siembra exactamente esas dos precondiciones, espera a que los
// cron corran —hay que dispararlos desde el editor de n8n: son
// `scheduleTrigger`, no webhooks— y verifica el desenlace leyendo sólo la base.
// Al terminar borra lo que sembró.
//
// Uso:
//   node tests/procesos-programados.mjs            # siembra, espera y verifica
//   node tests/procesos-programados.mjs --sembrar  # sólo siembra y sale
//   node tests/procesos-programados.mjs --verificar
//   node tests/procesos-programados.mjs --limpiar
//   node tests/procesos-programados.mjs --espera 240   # segundos de espera
//
// Los datos sembrados llevan el prefijo LD-E11E12- y FAC-E12- para que la
// limpieza no pueda alcanzar a un lead real por accidente.

import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {abrirBitacora} from './bitacora.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const arg = (nombre) => {
  const i = process.argv.indexOf('--' + nombre);

  return i >= 0 ? (process.argv[i + 1] ?? true) : undefined;
};

const soloSembrar = Boolean(arg('sembrar'));
const soloVerificar = Boolean(arg('verificar'));
const soloLimpiar = Boolean(arg('limpiar'));
// Espera sobre datos ya sembrados, sin volver a sembrarlos ni limpiar al
// final: sirve para dejar el instrumento vigilando mientras se disparan los
// dos cron a mano desde el editor.
const soloEsperar = Boolean(arg('esperar'));
const ESPERA_S = Number(arg('espera') ?? 300);

// ── Credenciales ────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(path.join(RAIZ, '.env'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');

      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const URL_BASE = env.SUPABASE_URL;
const CLAVE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_BASE || !CLAVE) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(2);
}

async function rest(ruta, opciones = {}) {
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: CLAVE,
      Authorization: `Bearer ${CLAVE}`,
      'Content-Type': 'application/json',
      Prefer: opciones.method === 'POST' ? 'return=representation' : 'return=representation',
      ...(opciones.headers ?? {}),
    },
  });

  const texto = await r.text();

  if (!r.ok) throw new Error(`${opciones.method ?? 'GET'} ${ruta} → ${r.status}: ${texto.slice(0, 300)}`);

  return texto ? JSON.parse(texto) : [];
}

// ── Identificadores fijos: la limpieza no puede tocar datos reales ──────────
const LEAD_E11 = 'LD-E11E12-PERDIDO';
// Señuelo imprescindible, no accesorio. El defecto que este instrumento vigila
// sólo se manifiesta cuando el cron procesa MÁS DE UN lead: con un lote de uno
// la rama funciona por casualidad. Sembrar un segundo lead que debe avanzar
// pero NO perderse es lo que convierte esta prueba en una guarda de regresión.
const LEAD_E11_SENUELO = 'LD-E11E12-SIGUE';
const LEAD_E12 = 'LD-E11E12-RECORDATORIO';
const FACTURA_E12 = 'FAC-E12-0001';
// Segunda factura, muy vencida, para ejercitar el escalón URGENTE —la otra
// mitad del mismo defecto, en la rama de recordatorios—.
const FACTURA_E12_URGENTE = 'FAC-E12-0002';

const dias = (n) => new Date(Date.now() + n * 86400000).toISOString();

let ok = 0;
let fallas = 0;

function comprobar(descripcion, condicion, detalle = '') {
  if (condicion) {
    ok++;
    console.log(`  ✅ ${descripcion}${detalle ? `: ${detalle}` : ''}`);
  } else {
    fallas++;
    console.log(`  ❌ ${descripcion}${detalle ? `: ${detalle}` : ''}`);
  }
}

const TODOS = `("${LEAD_E11}","${LEAD_E11_SENUELO}","${LEAD_E12}")`;

async function limpiar(silencioso = false) {
  for (const tabla of ['seguimientos', 'logs']) {
    await rest(`${tabla}?lead_id=in.${TODOS}`, {method: 'DELETE'});
  }
  await rest(`facturas?lead_id=in.${TODOS}`, {method: 'DELETE'});
  await rest(`leads?lead_id=in.${TODOS}`, {method: 'DELETE'});
  if (!silencioso) console.log('  (datos de prueba eliminados)');
}

async function sembrar() {
  console.log('\nSiembra de las dos precondiciones');
  await limpiar(true);

  // ── E11: un lead al borde de su tercer y último seguimiento ──────────────
  // `seguimientos = 2` hace que `Code - Preparar Follow-up` calcule num_seg = 3
  // y marque es_ultimo, que es la condición del IF que deriva a «Marcar
  // Perdido». La antigüedad de diez días supera los nueve que exige la
  // consulta del cron para ese conteo (3 × (2 + 1)).
  await rest('leads', {
    method: 'POST',
    body: JSON.stringify({
      lead_id: LEAD_E11,
      nombre: 'Cliente E11 Seguimiento Final',
      email: 'e11.seguimiento@ejemplo-test.invalid',
      telefono: '+5492610000011',
      presupuesto: 5000,
      urgencia: 'media',
      servicio: 'desarrollo_web',
      descripcion: 'Lead sembrado para ejercitar la transición a PERDIDO del proceso de seguimiento.',
      fuente: 'test_e11',
      estado: 'EN_SEGUIMIENTO',
      score: 85,
      tier: 'HOT',
      seguimientos: 2,
      precio_propuesto: 6200,
      plazo_propuesto: '3 semanas',
      alcance_propuesto: 'Sitio institucional con panel de carga',
      fecha_propuesta: dias(-12),
      fecha_ultimo_seguimiento: dias(-10),
      token_expira_en: dias(4),
    }),
  });
  console.log(`  · ${LEAD_E11}: EN_SEGUIMIENTO, seguimientos=2, último hace 10 días → debe PERDERSE`);

  // El señuelo: vencido para su PRIMER seguimiento (3 días bastan con
  // seguimientos = 0), de modo que entra en el mismo lote y debe avanzar sin
  // perderse. Su presencia obliga al cron a manejar dos ítems a la vez, que es
  // la condición bajo la cual la transición a PERDIDO dejaba de alcanzarse.
  await rest('leads', {
    method: 'POST',
    body: JSON.stringify({
      lead_id: LEAD_E11_SENUELO,
      nombre: 'Cliente E11 Sigue Activo',
      email: 'e11.sigue@ejemplo-test.invalid',
      telefono: '+5492610000013',
      presupuesto: 3000,
      urgencia: 'baja',
      servicio: 'marketing',
      descripcion: 'Lead sembrado como señuelo: debe recibir seguimiento y NO perderse.',
      fuente: 'test_e11',
      estado: 'PROPUESTA_ENVIADA',
      score: 55,
      tier: 'WARM',
      seguimientos: 0,
      precio_propuesto: 3400,
      plazo_propuesto: '2 semanas',
      alcance_propuesto: 'Campaña de lanzamiento',
      fecha_propuesta: dias(-5),
      token_expira_en: dias(9),
    }),
  });
  console.log(`  · ${LEAD_E11_SENUELO}: PROPUESTA_ENVIADA, seguimientos=0, propuesta hace 5 días → debe SEGUIR`);

  // ── E12: una factura que vence dentro de dos días ────────────────────────
  // `Code - Filtrar Vencimientos` clasifica 1..3 días como RECORDATORIO. La
  // vista facturas_pendientes calcula dias_al_vencimiento por diferencia de
  // fechas, así que dos días de margen caen de lleno en ese tramo.
  await rest('leads', {
    method: 'POST',
    body: JSON.stringify({
      lead_id: LEAD_E12,
      nombre: 'Cliente E12 Recordatorio',
      email: 'e12.recordatorio@ejemplo-test.invalid',
      telefono: '+5492610000012',
      presupuesto: 4000,
      urgencia: 'alta',
      servicio: 'automatizacion',
      descripcion: 'Lead sembrado para ejercitar el escalón RECORDATORIO de los avisos de pago.',
      fuente: 'test_e12',
      estado: 'FACTURADO',
      score: 78,
      tier: 'HOT',
      precio_propuesto: 4800,
      fecha_propuesta: dias(-20),
      fecha_aceptacion: dias(-13),
    }),
  });

  await rest('facturas', {
    method: 'POST',
    body: JSON.stringify({
      factura_id: FACTURA_E12,
      lead_id: LEAD_E12,
      cliente: 'Cliente E12 Recordatorio',
      email: 'e12.recordatorio@ejemplo-test.invalid',
      servicio: 'automatizacion',
      monto: 4800,
      moneda: 'USD',
      estado_pago: 'PENDIENTE',
      recordatorios_enviados: 0,
      fecha_emision: dias(-13),
      fecha_vencimiento: dias(2),
      pay_url: 'http://localhost:5678/webhook/pago-confirmado?factura_id=' + FACTURA_E12,
    }),
  });
  console.log(`  · ${FACTURA_E12}: PENDIENTE, vence en 2 días → escalón RECORDATORIO`);

  // Segunda factura del mismo lote, muy vencida: cae en el escalón URGENTE, el
  // único de esta rama que deriva a un IF y, por lo tanto, el que expone el
  // mismo defecto de propagación que E11.
  await rest('facturas', {
    method: 'POST',
    body: JSON.stringify({
      factura_id: FACTURA_E12_URGENTE,
      lead_id: LEAD_E12,
      cliente: 'Cliente E12 Urgente',
      email: 'e12.urgente@ejemplo-test.invalid',
      servicio: 'automatizacion',
      monto: 1500,
      moneda: 'USD',
      estado_pago: 'PENDIENTE',
      recordatorios_enviados: 0,
      fecha_emision: dias(-25),
      fecha_vencimiento: dias(-10),
      pay_url: 'http://localhost:5678/webhook/pago-confirmado?factura_id=' + FACTURA_E12_URGENTE,
    }),
  });
  console.log(`  · ${FACTURA_E12_URGENTE}: PENDIENTE, vencida hace 10 días → escalón URGENTE`);

  // Se comprueba que la vista efectivamente la expone en el tramo esperado:
  // si no, el cron no la vería y la espera sería en vano.
  const [pend] = await rest(`facturas_pendientes?factura_id=eq.${FACTURA_E12}&select=dias_al_vencimiento`);

  console.log(`  · la vista facturas_pendientes la informa a ${pend?.dias_al_vencimiento} día(s) del vencimiento`);
}

async function estado() {
  const [l11] = await rest(`leads?lead_id=eq.${LEAD_E11}&select=estado,seguimientos,fecha_ultimo_seguimiento`);
  const [senuelo] = await rest(`leads?lead_id=eq.${LEAD_E11_SENUELO}&select=estado,seguimientos`);
  const segs = await rest(`seguimientos?lead_id=eq.${LEAD_E11}&select=numero,asunto,enviado_en&order=enviado_en.asc`);
  const [f12] = await rest(`facturas?factura_id=eq.${FACTURA_E12}&select=recordatorios_enviados,estado_pago`);
  const [f12u] = await rest(`facturas?factura_id=eq.${FACTURA_E12_URGENTE}&select=recordatorios_enviados,estado_pago`);

  return {l11, senuelo, segs, f12, f12u};
}

async function esperar() {
  console.log(`\nEsperando a que corran los dos cron (hasta ${ESPERA_S} s).`);
  console.log('Dispararlos desde el editor de n8n: son scheduleTrigger, no webhooks.');
  console.log('  · 🟡 Cron - Follow-up 9AM L-V        → E11');
  console.log('  · 🟠 Cron - Recordatorios Pago 10AM  → E12\n');

  const limite = Date.now() + ESPERA_S * 1000;
  let ultimo = '';

  while (Date.now() < limite) {
    const {l11, f12} = await estado();
    const linea = `E11 estado=${l11?.estado} seguimientos=${l11?.seguimientos} · E12 recordatorios=${f12?.recordatorios_enviados}`;

    if (linea !== ultimo) {
      console.log(`  [${new Date().toISOString().slice(11, 19)}] ${linea}`);
      ultimo = linea;
    }
    if (l11?.estado === 'PERDIDO' && Number(f12?.recordatorios_enviados) > 0) {
      console.log('\n  Ambos procesos dejaron su efecto.');
      return true;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log('\n  Se agotó la espera.');

  return false;
}

async function verificar() {
  const {l11, senuelo, segs, f12, f12u} = await estado();

  console.log('\nE11 — seguimiento de propuestas, hasta la transición a PERDIDO');
  comprobar('el lead existe y es legible sólo con lo que la base persiste', Boolean(l11));
  comprobar('el tercer seguimiento se registró', Number(l11?.seguimientos) === 3,
    `seguimientos = ${l11?.seguimientos}`);
  comprobar('la fecha del último seguimiento se actualizó a esta corrida',
    Boolean(l11?.fecha_ultimo_seguimiento) &&
      Date.now() - new Date(l11.fecha_ultimo_seguimiento).getTime() < 86400000,
    l11?.fecha_ultimo_seguimiento ?? '(sin fecha)');
  comprobar('el lead quedó en PERDIDO tras agotar los tres intentos',
    l11?.estado === 'PERDIDO', `estado = ${l11?.estado}`);

  // Diagnóstico del modo de falla conocido. Si el tercer seguimiento se
  // registró pero el estado no cambió, la causa no es el dato sembrado sino la
  // forma en que el flujo propaga los ítems, y conviene dejarlo dicho acá para
  // que la evidencia archivada no obligue a reconstruir el análisis.
  if (Number(l11?.seguimientos) === 3 && l11?.estado !== 'PERDIDO') {
    console.log('');
    console.log('  Diagnóstico. El tercer seguimiento se registró y el estado no cambió: la');
    console.log('  cadena llegó hasta el IF y se fue por la rama falsa. El nodo');
    console.log('  «Postgres - Update Lead Seguimiento» ejecuta un UPDATE sin RETURNING, y el');
    console.log('  nodo Postgres de n8n colapsa esa salida a UN solo ítem, cualquiera sea la');
    console.log('  cantidad de entradas. El IF —que resuelve su condición con');
    console.log('  $(\'Code - Preparar Follow-up\').all()[$itemIndex].json.es_ultimo— recibe por');
    console.log('  eso un único ítem, evalúa siempre el índice 0 y nunca alcanza al lead que');
    console.log('  lleva es_ultimo en verdadero cuando ese lead no es el primero del lote.');
    console.log('  Consecuencia: la transición a PERDIDO es inalcanzable siempre que el cron');
    console.log('  procese más de un lead a la vez, y sólo ocurre por casualidad cuando el');
    console.log('  único lead vencido es además el que va por su tercer intento.');
  }
  comprobar('el envío del seguimiento dejó su fila auditable',
    segs.length >= 1, `${segs.length} fila(s) en seguimientos`);
  if (segs.length) {
    comprobar('la última fila corresponde al tercer intento',
      Number(segs[segs.length - 1].numero) === 3,
      `numero = ${segs[segs.length - 1].numero}`);
  }

  console.log('\nE11 — el lote llevaba más de un lead: el señuelo debe avanzar sin perderse');
  comprobar('el señuelo recibió su primer seguimiento',
    Number(senuelo?.seguimientos) === 1, `seguimientos = ${senuelo?.seguimientos}`);
  comprobar('el señuelo NO se marcó como perdido',
    senuelo?.estado === 'EN_SEGUIMIENTO', `estado = ${senuelo?.estado}`);

  console.log('\nE12 — recordatorios de pago, escalón RECORDATORIO');
  comprobar('la factura existe y sigue impaga', f12?.estado_pago === 'PENDIENTE',
    `estado_pago = ${f12?.estado_pago}`);
  comprobar('el aviso se contabilizó en la factura',
    Number(f12?.recordatorios_enviados) >= 1,
    `recordatorios_enviados = ${f12?.recordatorios_enviados}`);

  const [pend] = await rest(`facturas_pendientes?factura_id=eq.${FACTURA_E12}&select=dias_al_vencimiento`);
  const d = Number(pend?.dias_al_vencimiento);

  comprobar('el aviso corresponde al tramo RECORDATORIO (1 a 3 días)',
    d >= 1 && d <= 3, `${d} día(s) al vencimiento`);

  console.log('\nE12 — escalón URGENTE, en el mismo lote');
  comprobar('la factura vencida también recibió su aviso',
    Number(f12u?.recordatorios_enviados) >= 1,
    `recordatorios_enviados = ${f12u?.recordatorios_enviados}`);

  const [pu] = await rest(`facturas_pendientes?factura_id=eq.${FACTURA_E12_URGENTE}&select=dias_al_vencimiento`);

  comprobar('corresponde al tramo URGENTE (más de 3 días vencida)',
    Number(pu?.dias_al_vencimiento) < -3, `${pu?.dias_al_vencimiento} día(s) al vencimiento`);
}

// ── Principal ───────────────────────────────────────────────────────────────
// Sólo los modos que COMPRUEBAN algo archivan evidencia. Sembrar y limpiar son
// preparación y aseo: si también escribieran, una limpieza posterior pisaría el
// registro de la corrida acreditante y lo dejaría sin respaldo —que es
// exactamente el defecto de auditabilidad que este archivo viene a resolver—.
const archivaEvidencia = !soloSembrar && !soloLimpiar;
const bitacora = archivaEvidencia
  ? abrirBitacora('evidencia-E11-E12.md',
    'Procesos programados: seguimiento (E11) y recordatorios de pago (E12)', {
      Instrumento: '`npm run test:programados` (tests/procesos-programados.mjs)',
      Escenarios: 'E11 hasta la transición a PERDIDO · E12 en el escalón RECORDATORIO',
      Disparo: 'manual desde el editor de n8n (ambos son scheduleTrigger)',
    })
  : {cerrar() {}};

let codigoSalida = 0;

try {
  if (soloLimpiar) {
    await limpiar();
  } else if (soloVerificar) {
    await verificar();
  } else if (soloEsperar) {
    const llegaron = await esperar();

    await verificar();
    if (!llegaron) {
      console.log('\n  (la espera se agotó: las comprobaciones reflejan lo que sí ocurrió)');
    }
  } else if (soloSembrar) {
    await sembrar();
    console.log('\nDatos sembrados. Disparar los dos cron y correr después:');
    console.log('  node tests/procesos-programados.mjs --verificar');
  } else {
    await sembrar();
    const llegaron = await esperar();

    await verificar();
    if (!llegaron) {
      console.log('\n  (la espera se agotó: las comprobaciones de arriba reflejan lo que sí ocurrió)');
    }
    await limpiar();
  }

  if (!soloLimpiar && !soloSembrar) {
    console.log(`\nResultado: ${ok} OK, ${fallas} FALLA`);
    if (fallas) codigoSalida = 1;
  }
} catch (err) {
  codigoSalida = 1;
  console.error('\n✗ ' + err.message);
}

bitacora.cerrar(codigoSalida);
process.exit(codigoSalida);
