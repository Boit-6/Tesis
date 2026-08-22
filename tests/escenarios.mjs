#!/usr/bin/env node
// Validación funcional EJECUTABLE del ciclo comercial completo.
//
// El dictamen observa que la validación por escenarios de §5 tiene «un
// componente de autorreporte»: los resultados están descritos en prosa y
// respaldados por capturas, pero nadie más puede re-ejecutarlos. Este runner
// los convierte en una corrida reproducible: dispara los webhooks reales,
// verifica el estado resultante en la base y mide cuánto tardó cada paso.
//
// No simula nada: habla con la instancia de n8n y con la base de verdad.
//
// Configuración (variables de entorno, o un .env en la raíz):
//   N8N_BASE                    http://localhost:5678
//   SUPABASE_URL                https://<proyecto>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   service_role (evade RLS: sólo para pruebas)
//   CRM_PANEL_TOKEN             valor del header auth de los webhooks del panel
//
// Uso:
//   node tests/escenarios.mjs                 corre todo y escribe el reporte
//   node tests/escenarios.mjs --verificar     sólo chequea configuración y conectividad
//   node tests/escenarios.mjs --no-limpiar    deja los datos de prueba en la base
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..');

// ── Configuración ──────────────────────────────────────────────────────────
// Carga un .env de la raíz si existe, sin pisar lo que ya venga del entorno.
const rutaEnv = path.join(raiz, '.env');

if (existsSync(rutaEnv)) {
  for (const linea of readFileSync(rutaEnv, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);

    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const N8N = (process.env.N8N_BASE ?? 'http://localhost:5678').replace(/\/+$/, '');
const SUPA = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const PANEL_TOKEN = process.env.CRM_PANEL_TOKEN ?? '';
// Nombre del header que valida n8n. Tiene que coincidir con el que se cargó en
// la credencial "CRM - Header Auth (panel)".
const PANEL_HEADER = process.env.CRM_PANEL_HEADER ?? 'x-crm-token';

const soloVerificar = process.argv.includes('--verificar');
const limpiar = !process.argv.includes('--no-limpiar');

// ── Utilidades ─────────────────────────────────────────────────────────────
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const ahora = () => Number(process.hrtime.bigint() / 1000000n);

async function rest(ruta, opciones = {}) {
  const res = await fetch(`${SUPA}/rest/v1/${ruta}`, {
    ...opciones,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      ...(opciones.headers ?? {}),
    },
  });

  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);

  const texto = await res.text();

  return texto ? JSON.parse(texto) : [];
}

async function webhook(ruta, {metodo = 'POST', cuerpo, headers = {}} = {}) {
  const res = await fetch(`${N8N}/webhook/${ruta}`, {
    method: metodo,
    headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true', ...headers},
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await res.text();

  let json = null;

  try { json = texto ? JSON.parse(texto) : null; } catch { /* respuesta HTML */ }

  return {status: res.status, texto, json};
}

// n8n procesa de forma asíncrona: se sondea hasta que el efecto aparece.
async function esperarHasta(descripcion, condicion, {timeout = 25000, intervalo = 400} = {}) {
  const t0 = ahora();

  for (;;) {
    const valor = await condicion();

    if (valor) return {valor, ms: ahora() - t0};
    if (ahora() - t0 > timeout) {
      throw new Error(`Timeout (${timeout}ms) esperando: ${descripcion}`);
    }
    await esperar(intervalo);
  }
}

const leadPorEmail = async (email) => (await rest(`leads?email=eq.${encodeURIComponent(email)}&select=*`))[0] ?? null;
const facturasDe = (leadId) => rest(`facturas?lead_id=eq.${encodeURIComponent(leadId)}&select=*`);

// ── Registro de resultados ─────────────────────────────────────────────────
const resultados = [];
const metricas = [];
let corriendo = null;

function escenario(id, tabla9, titulo, fn) {
  return {id, tabla9, titulo, fn};
}

function medir(nombre, ms, detalle = '') {
  metricas.push({escenario: corriendo, nombre, ms, detalle});
}

// ── Definición de los escenarios ───────────────────────────────────────────
// `tabla9` mapea contra la Tabla 9 de la tesis donde el mapeo es seguro.
// Los `null` hay que cotejarlos con el documento antes de citarlos.
const ejecucion = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
const emailDe = (sufijo) => `crm.test.${ejecucion}.${sufijo}@example.test`;
const creados = [];

async function altaDeLead(sufijo, datos) {
  const email = emailDe(sufijo);
  const t0 = ahora();

  await webhook('lead/nuevo', {
    cuerpo: {
      nombre: `[TEST ${ejecucion}] ${sufijo}`,
      email,
      telefono: '+54 11 5555 5555',
      descripcion: 'Escenario de validación automatizada del ciclo comercial completo.',
      ...datos,
    },
  });

  const {valor: lead, ms} = await esperarHasta(
    `el lead ${sufijo} aparezca en la base`,
    () => leadPorEmail(email),
  );

  medir('alta del lead en la base', ms, `POST /lead/nuevo → fila en leads (${sufijo})`);
  creados.push(lead.lead_id);

  return {lead, email, t0};
}

const ESCENARIOS = [
  escenario('lead-hot', 'E1', 'Un lead de presupuesto alto se califica HOT y recibe propuesta', async (t) => {
    // Entrada EXACTA de la Tabla 12, escenario E1: desarrollo_web, USD 5000,
    // urgencia alta, con teléfono de más de 6 caracteres y descripción de más
    // de 50. Si acá se usa otra entrada, el resultado no sirve como evidencia
    // de E1 aunque el score coincida.
    const {lead} = await altaDeLead('hot', {
      presupuesto: 5000,
      urgencia: 'alta',
      servicio: 'desarrollo_web',
    });

    t.igual(lead.tier, 'HOT', 'tier');
    t.igual(lead.score, 100, 'score (40 presupuesto + 30 urgencia + 20 servicio + 5 teléfono + 5 descripción)');

    const {valor: conPropuesta, ms} = await esperarHasta(
      'el lead pase a PROPUESTA_ENVIADA',
      async () => {
        const l = await leadPorEmail(lead.email ?? emailDe('hot'));

        return l && l.estado === 'PROPUESTA_ENVIADA' ? l : null;
      },
    );

    medir('propuesta enviada', ms, 'incluye el email de propuesta y la card de Notion');
    t.verdad(!!conPropuesta.accept_token, 'se generó el token de aceptación');
    t.verdad(!!conPropuesta.token_expira_en, 'el token tiene fecha de vencimiento');
    t.verdad(!!conPropuesta.fecha_propuesta, 'se registró la fecha de propuesta');

    return conPropuesta;
  }),

  escenario('lead-warm', 'E2', 'Un lead de valor medio se califica WARM y recibe propuesta', async (t) => {
    // Entrada EXACTA de E2: consultoria, USD 1000, urgencia media, SIN teléfono
    // y descripción de menos de 50 caracteres (por eso no suma los dos bonus).
    const {lead} = await altaDeLead('warm', {
      presupuesto: 1000,
      urgencia: 'media',
      servicio: 'consultoria',
      telefono: '',
      descripcion: 'Consultoría breve.',
    });

    t.igual(lead.tier, 'WARM', 'tier');
    t.igual(lead.score, 47, 'score (20 presupuesto + 15 urgencia + 12 servicio + 0 + 0)');

    const {valor: conPropuesta} = await esperarHasta(
      'el lead WARM también pase a PROPUESTA_ENVIADA',
      async () => {
        const l = await leadPorEmail(emailDe('warm'));

        return l && l.estado === 'PROPUESTA_ENVIADA' ? l : null;
      },
    );

    t.igual(conPropuesta.estado, 'PROPUESTA_ENVIADA', 'estado');
  }),

  escenario('lead-cold', 'E3', 'Un lead de presupuesto bajo se califica COLD y NO recibe propuesta', async (t) => {
    // Entrada EXACTA de E3: soporte, USD 300, urgencia baja, sin teléfono y
    // descripción breve.
    const {lead} = await altaDeLead('cold', {
      presupuesto: 300,
      urgencia: 'baja',
      servicio: 'soporte',
      telefono: '',
      descripcion: 'Consulta breve.',
    });

    t.igual(lead.tier, 'COLD', 'tier');
    t.igual(lead.score, 20, 'score (10 presupuesto + 5 urgencia + 5 servicio + 0 + 0)');

    // Se le da margen para confirmar que NO cambia de estado.
    await esperar(3000);
    const despues = await leadPorEmail(emailDe('cold'));

    t.igual(despues.estado, 'NUEVO', 'sigue en NUEVO (no se le envió propuesta)');
  }),

  escenario('propuesta-lectura', null, 'La propuesta se lee sólo con el token correcto', async (t, ctx) => {
    const lead = ctx['lead-hot'];
    const ok = await webhook(`lead-propuesta?lead_id=${lead.lead_id}&token=${lead.accept_token}`, {metodo: 'GET'});

    t.verdad(ok.texto.includes(lead.lead_id) || ok.json, 'con el token correcto devuelve la propuesta');

    const malo = await webhook(`lead-propuesta?lead_id=${lead.lead_id}&token=00000000-0000-4000-8000-000000000000`, {metodo: 'GET'});

    t.verdad(!malo.texto.includes('accept_token'), 'con un token inválido no filtra datos del lead');
  }),

  escenario('aceptacion-atomica', 'E5/E6', 'Aceptación válida y reutilización del enlace: una sola factura', async (t, ctx) => {
    const lead = ctx['lead-hot'];
    const t0 = ahora();

    // E6 declara CUATRO invocaciones: dos concurrentes y dos consecutivas.
    // Primero las concurrentes, que son el corazón de §4.3.2 y de la cuestión 1
    // de la defensa: se disparan a la vez, sin esperar a que la primera termine.
    const [a, b] = await Promise.all([
      webhook('lead-acepta', {cuerpo: {lead_id: lead.lead_id, token: lead.accept_token}}),
      webhook('lead-acepta', {cuerpo: {lead_id: lead.lead_id, token: lead.accept_token}}),
    ]);

    t.verdad(a.status < 500 && b.status < 500, 'ninguna de las dos peticiones concurrentes devolvió error de servidor');

    const {ms} = await esperarHasta(
      'se emita la factura',
      async () => (await facturasDe(lead.lead_id)).length > 0,
    );

    medir('aceptación → factura emitida', ms, 'incluye la generación del PDF con Gotenberg y el envío por email');
    medir('respuesta al navegador', ahora() - t0, 'las dos peticiones de aceptación en paralelo');

    // E5: la aceptación válida deja el comprobante con vencimiento a 15 días.
    const primera = (await facturasDe(lead.lead_id))[0];
    const dias = Math.round(
      (new Date(primera.fecha_vencimiento) - new Date(primera.fecha_emision)) / 86400000,
    );

    t.igual(dias, 15, 'días entre emisión y vencimiento de la factura');

    // Ahora las dos consecutivas, reusando el mismo enlace ya consumido.
    const c = await webhook('lead-acepta', {cuerpo: {lead_id: lead.lead_id, token: lead.accept_token}});
    const d = await webhook('lead-acepta', {cuerpo: {lead_id: lead.lead_id, token: lead.accept_token}});

    t.verdad(c.status < 500 && d.status < 500, 'ninguna de las dos peticiones consecutivas devolvió error de servidor');

    // Margen por si una segunda factura llegara tarde.
    await esperar(4000);
    const facturas = await facturasDe(lead.lead_id);

    t.igual(facturas.length, 1, 'facturas tras cuatro aceptaciones (2 concurrentes + 2 consecutivas)');

    const despues = await leadPorEmail(emailDe('hot'));

    t.verdad(['ACEPTADO', 'FACTURADO'].includes(despues.estado), `el lead quedó en ${despues.estado}`);

    return {lead: despues, factura: facturas[0]};
  }),

  escenario('pago-idempotente', null, 'El pago simulado es idempotente', async (t, ctx) => {
    const {factura} = ctx['aceptacion-atomica'];

    await webhook(`pago-confirmado?factura_id=${factura.factura_id}`, {metodo: 'GET'});

    const {valor: cobrada, ms} = await esperarHasta(
      'la factura pase a COBRADO',
      async () => {
        const f = (await rest(`facturas?factura_id=eq.${factura.factura_id}&select=*`))[0];

        return f && f.estado_pago === 'COBRADO' ? f : null;
      },
    );

    medir('pago confirmado', ms, 'marca la factura como COBRADO');
    const cobroOriginal = cobrada.fecha_cobro;

    // Segundo intento con el mismo enlace: no debe volver a cobrar.
    await webhook(`pago-confirmado?factura_id=${factura.factura_id}`, {metodo: 'GET'});
    await esperar(2500);
    const otraVez = (await rest(`facturas?factura_id=eq.${factura.factura_id}&select=*`))[0];

    t.igual(otraVez.fecha_cobro, cobroOriginal, 'la fecha de cobro no cambió al reusar el enlace');
  }),

  escenario('rechazo', 'E8', 'El rechazo de la propuesta deja el lead en PERDIDO', async (t) => {
    const {lead} = await altaDeLead('rechazo', {presupuesto: 6000, urgencia: 'alta', servicio: 'ecommerce'});
    const {valor: conPropuesta} = await esperarHasta(
      'el lead tenga propuesta enviada',
      async () => {
        const l = await leadPorEmail(emailDe('rechazo'));

        return l && l.estado === 'PROPUESTA_ENVIADA' ? l : null;
      },
    );

    await webhook('lead-rechaza', {cuerpo: {lead_id: conPropuesta.lead_id, token: conPropuesta.accept_token}});

    const {ms} = await esperarHasta(
      'el lead pase a PERDIDO',
      async () => (await leadPorEmail(emailDe('rechazo')))?.estado === 'PERDIDO',
    );

    medir('rechazo procesado', ms);
    t.ok('el lead quedó en PERDIDO');
    void lead;
  }),

  escenario('pedido-cambios', 'E9', 'El pedido de cambios vuelve el lead a EN_SEGUIMIENTO y guarda el mensaje', async (t) => {
    const {lead} = await altaDeLead('cambios', {presupuesto: 6000, urgencia: 'alta', servicio: 'ecommerce'});
    const {valor: conPropuesta} = await esperarHasta(
      'el lead tenga propuesta enviada',
      async () => {
        const l = await leadPorEmail(emailDe('cambios'));

        return l && l.estado === 'PROPUESTA_ENVIADA' ? l : null;
      },
    );

    const mensaje = 'Necesito sumar una pasarela de pagos, con comas, para probar el escapado.';

    await webhook('lead-modifica', {cuerpo: {lead_id: conPropuesta.lead_id, token: conPropuesta.accept_token, mensaje}});

    const {valor: despues, ms} = await esperarHasta(
      'el lead vuelva a EN_SEGUIMIENTO',
      async () => {
        const l = await leadPorEmail(emailDe('cambios'));

        return l && l.estado === 'EN_SEGUIMIENTO' ? l : null;
      },
    );

    medir('pedido de cambios procesado', ms);
    t.verdad((despues.notas ?? '').includes('pasarela de pagos'), 'el mensaje del cliente quedó guardado en notas');
    void lead;
  }),

  escenario('estado-trabajo', 'E10', 'El estado del trabajo se actualiza desde el panel y se sincroniza', async (t, ctx) => {
    const lead = ctx['aceptacion-atomica'].lead;
    const headers = PANEL_TOKEN ? {[PANEL_HEADER]: PANEL_TOKEN} : {};
    const res = await webhook('trabajo-estado', {cuerpo: {lead_id: lead.lead_id, estado: 'EN_PROGRESO'}, headers});

    t.verdad(res.status !== 403, 'el webhook del panel aceptó la credencial (403 = revisar CRM_PANEL_TOKEN)');

    const {ms} = await esperarHasta(
      'estado_trabajo pase a EN_PROGRESO',
      async () => (await leadPorEmail(emailDe('hot')))?.estado_trabajo === 'EN_PROGRESO',
    );

    medir('cambio de estado de trabajo', ms, 'incluye la sincronización con Notion');

    const conCard = await leadPorEmail(emailDe('hot'));

    t.verdad(!!conCard.card_id, 'el lead tiene card_id: la sincronización con Notion está activa');
  }),

  escenario('token-vencido', null, 'Un token vencido no permite aceptar la propuesta', async (t) => {
    const {lead} = await altaDeLead('vencido', {presupuesto: 6000, urgencia: 'alta', servicio: 'ecommerce'});
    const {valor: conPropuesta} = await esperarHasta(
      'el lead tenga propuesta enviada',
      async () => {
        const l = await leadPorEmail(emailDe('vencido'));

        return l && l.estado === 'PROPUESTA_ENVIADA' ? l : null;
      },
    );

    // Se fuerza el vencimiento hacia atrás para no esperar los días de vigencia.
    await rest(`leads?lead_id=eq.${conPropuesta.lead_id}`, {
      method: 'PATCH',
      headers: {Prefer: 'return=minimal'},
      body: JSON.stringify({token_expira_en: new Date(Date.now() - 86400000).toISOString()}),
    });

    await webhook('lead-acepta', {cuerpo: {lead_id: conPropuesta.lead_id, token: conPropuesta.accept_token}});
    await esperar(3500);

    const despues = await leadPorEmail(emailDe('vencido'));

    t.verdad(despues.estado === 'PROPUESTA_ENVIADA', `el lead NO se aceptó (quedó en ${despues.estado})`);
    t.igual((await facturasDe(conPropuesta.lead_id)).length, 0, 'no se emitió factura con el token vencido');
    void lead;
  }),
];

// ── Motor ──────────────────────────────────────────────────────────────────
function hacerAserciones(registro) {
  return {
    igual(obtenido, esperado, que) {
      const ok = obtenido === esperado;

      registro.push({ok, texto: `${que}: ${JSON.stringify(obtenido)}${ok ? '' : ` (esperaba ${JSON.stringify(esperado)})`}`});
    },
    verdad(condicion, que) {
      registro.push({ok: !!condicion, texto: que});
    },
    ok(que) {
      registro.push({ok: true, texto: que});
    },
  };
}

async function verificarEntorno() {
  const problemas = [];

  if (!SUPA) problemas.push('Falta SUPABASE_URL.');
  if (!KEY) problemas.push('Falta SUPABASE_SERVICE_ROLE_KEY.');
  if (!PANEL_TOKEN) problemas.push('Falta CRM_PANEL_TOKEN (el escenario del panel puede dar 403).');

  if (SUPA && KEY) {
    try {
      await rest('leads?select=lead_id&limit=1');
      console.log('  ✓ Supabase responde');
    } catch (e) {
      problemas.push('Supabase no responde: ' + e.message);
    }
  }

  try {
    const r = await fetch(`${N8N}/healthz`).catch(() => null);

    console.log(r && r.ok ? '  ✓ n8n responde' : `  · n8n en ${N8N} (sin /healthz; se probará al disparar el primer webhook)`);
  } catch { /* no bloquea */ }

  return problemas;
}

async function main() {
  console.log('Validación funcional del ciclo comercial');
  console.log(`n8n: ${N8N}`);
  console.log(`base: ${SUPA || '(sin configurar)'}\n`);

  const problemas = await verificarEntorno();

  if (problemas.length) {
    console.log('\nConfiguración incompleta:');
    for (const p of problemas) console.log('  ✗ ' + p);
    console.log('\nCompletá el .env de la raíz (ver .env.example) y volvé a correr.');

    if (!soloVerificar) process.exit(1);
  }

  if (soloVerificar) {
    console.log('\n(--verificar: no se ejecutaron escenarios)');
    process.exit(problemas.length ? 1 : 0);
  }

  console.log('\nEjecutando escenarios…\n');
  const ctx = {};

  for (const esc of ESCENARIOS) {
    corriendo = esc.id;
    const registro = [];
    const t0 = ahora();

    try {
      const salida = await esc.fn(hacerAserciones(registro), ctx);

      if (salida) ctx[esc.id] = salida;
      const fallas = registro.filter((r) => !r.ok);

      resultados.push({...esc, ms: ahora() - t0, registro, estado: fallas.length ? 'FALLA' : 'OK'});
    } catch (err) {
      resultados.push({...esc, ms: ahora() - t0, registro, estado: 'ERROR', error: err.message});
    }

    const r = resultados.at(-1);
    const marca = r.estado === 'OK' ? '✓' : '✗';

    console.log(`${marca} ${r.estado.padEnd(6)} ${esc.id.padEnd(22)} ${esc.titulo}  (${r.ms} ms)`);
    for (const a of r.registro) console.log(`      ${a.ok ? '·' : '✗'} ${a.texto}`);
    if (r.error) console.log(`      ✗ ${r.error}`);
  }

  if (limpiar && creados.length) {
    console.log('\nLimpiando datos de prueba…');
    for (const id of creados) {
      try {
        await rest(`facturas?lead_id=eq.${id}`, {method: 'DELETE', headers: {Prefer: 'return=minimal'}});
        await rest(`seguimientos?lead_id=eq.${id}`, {method: 'DELETE', headers: {Prefer: 'return=minimal'}});
        await rest(`leads?lead_id=eq.${id}`, {method: 'DELETE', headers: {Prefer: 'return=minimal'}});
      } catch (e) {
        console.log(`  · no se pudo borrar ${id}: ${e.message}`);
      }
    }
  }

  escribirReporte();

  const fallidos = resultados.filter((r) => r.estado !== 'OK').length;

  console.log(`\nResultado: ${resultados.length - fallidos} OK, ${fallidos} con problemas`);
  console.log('Reporte: docs/evidencia-validacion.md');
  process.exit(fallidos ? 1 : 0);
}

function escribirReporte() {
  const fecha = new Date().toISOString();
  const l = [];

  l.push('# Evidencia de validación funcional');
  l.push('');
  l.push('> Generado por `node tests/escenarios.mjs`. **No se edita a mano.**');
  l.push('>');
  l.push('> Cada escenario dispara los webhooks reales de n8n y verifica el estado resultante');
  l.push('> en la base. Reemplaza el autorreporte de §5 por una corrida reproducible: cualquiera');
  l.push('> con el entorno levantado obtiene esta misma tabla.');
  l.push('');
  l.push(`**Ejecución:** ${fecha}  ·  **n8n:** \`${N8N}\``);
  l.push('');
  l.push('## Escenarios');
  l.push('');
  l.push('| # | Tabla 9 | Escenario | Resultado | Tiempo |');
  l.push('|---|---|---|---|---|');

  resultados.forEach((r, i) => {
    l.push(`| ${i + 1} | ${r.tabla9 ?? '—'} | ${r.titulo} | ${r.estado} | ${r.ms} ms |`);
  });

  l.push('');
  l.push('> La columna «Tabla 9» sólo se completa donde el mapeo con el documento es inequívoco.');
  l.push('> Los `—` hay que cotejarlos contra la Tabla 9 antes de citarlos en la tesis.');
  l.push('');
  l.push('## Comprobaciones');
  l.push('');

  for (const r of resultados) {
    l.push(`### ${r.id} — ${r.titulo}`);
    l.push('');
    for (const a of r.registro) l.push(`- ${a.ok ? '✅' : '❌'} ${a.texto}`);
    if (r.error) l.push(`- ❌ ${r.error}`);
    l.push('');
  }

  if (metricas.length) {
    l.push('## Métricas del entorno controlado');
    l.push('');
    l.push('> Responde la recomendación 5 del dictamen v4. Son tiempos de punta a punta:');
    l.push('> incluyen la latencia de red, el procesamiento de n8n y los servicios externos.');
    l.push('');
    l.push('| Escenario | Medición | Tiempo | Detalle |');
    l.push('|---|---|---|---|');
    for (const m of metricas) {
      l.push(`| ${m.escenario} | ${m.nombre} | ${m.ms} ms | ${m.detalle} |`);
    }
    l.push('');

    const pdf = metricas.find((m) => m.nombre === 'aceptación → factura emitida');

    if (pdf) {
      l.push(`**Generación de la factura en PDF (Gotenberg), extremo a extremo:** ${pdf.ms} ms.`);
      l.push('');
    }
  }

  writeFileSync(path.join(raiz, 'docs', 'evidencia-validacion.md'), l.join('\n') + '\n', 'utf8');
}

main().catch((err) => {
  console.error('\n✗ ' + err.message);
  process.exit(1);
});
