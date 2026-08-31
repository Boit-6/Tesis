#!/usr/bin/env node
// Verificación EJECUTABLE de las dos garantías de idempotencia que la Tabla 11
// declara cerradas: S6 (deduplicación en la captación) y S5 (reconciliación de
// facturas). No las simula: levanta un PostgreSQL desechable, aplica el
// `db/schema.sql` del repositorio y **ejecuta las mismas consultas que llevan
// escritas los nodos del workflow**, leídas del propio `crm_postgres.json`.
//
// Que el SQL salga del artefacto y no de una copia pegada acá es lo que hace
// que la prueba siga diciendo algo si alguien toca un nodo: si el INSERT deja
// de ser condicional, este verificador se pone en rojo.
//
// Los parámetros se enlazan con PREPARE/EXECUTE, que es la misma vía por la que
// el nodo Postgres de n8n los pasa ($1, $2, …): no hay interpolación de texto.
//
// Uso:  node tests/idempotencia.mjs   (o `npm run test:idempotencia`)
import {execFile, execFileSync, execSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..');
const CONTENEDOR = 'crm-idem-test';
const IMAGEN = 'postgres:16-alpine';

const sh = (cmd) => execSync(cmd, {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']});
const limpiar = () => {
  try { sh(`docker rm -f ${CONTENEDOR}`); } catch { /* no existía */ }
};

// ── El SQL sale del workflow, no de este archivo ────────────────────────────
const wf = JSON.parse(readFileSync(path.join(raiz, 'workflow', 'crm_postgres.json'), 'utf8'));

function consultaDe(nombreNodo) {
  const nodo = wf.nodes.find((n) => n.name === nombreNodo);

  if (!nodo?.parameters?.query) throw new Error(`El nodo «${nombreNodo}» ya no lleva una consulta SQL.`);

  // Las consultas de n8n son expresiones: `=` inicial y `{{ … }}` interpolados.
  // Acá se resuelven los `$env` con los MISMOS valores por defecto que declara
  // el propio nodo, que son los que rigen si nadie define la variable.
  return nodo.parameters.query
    .replace(/^=/, '')
    .replace(/\{\{\s*\$env\.\w+\s*\|\|\s*(\d+)\s*\}\}/g, '$1')
    .trim()
    .replace(/;$/, '');
}

const SQL_INSERT_LEAD = consultaDe('Postgres - Insert Lead');
const SQL_LEER_ACEPTADO = consultaDe('Postgres - Leer Aceptado Sin Factura');
const SQL_INSERT_FACTURA = consultaDe('Postgres - Insert Factura Reconciliada');
const SQL_LEAD_FACTURADO = consultaDe('Postgres - Lead a Facturado (Reconciliación)');

// Si algún `{{ … }}` sobrevivió, la consulta no es ejecutable y el verificador
// estaría probando otra cosa. Mejor fallar acá y a la vista.
for (const [nombre, sql] of Object.entries({SQL_INSERT_LEAD, SQL_LEER_ACEPTADO, SQL_INSERT_FACTURA, SQL_LEAD_FACTURADO})) {
  if (sql.includes('{{')) throw new Error(`${nombre} conserva una expresión sin resolver: ${sql}`);
}

let ok = 0;
let fallas = 0;

function comprobar(descripcion, condicion, detalle = '') {
  if (condicion) {
    ok++;
    console.log(`OK    ${descripcion}`);
  } else {
    fallas++;
    console.log(`FALLA ${descripcion}${detalle ? `\n      ${detalle}` : ''}`);
  }
}

let codigoSalida = 0;

// Espera a que PostgreSQL acepte conexiones. El bucle vive acá y no dentro de
// `sh -c "for i in $(seq 1 60); …"`, que es como estaba: en Windows execSync
// usa cmd.exe, que no expande `$(seq 1 60)` y se lo pasa intacto a la shell del
// contenedor —donde funciona—, pero en Linux lo expande la shell de afuera e
// inserta saltos de línea que rompen el `for`. El resultado era una verificación
// que pasaba en la máquina de desarrollo y fallaba en CI.
function esperarPostgres(intentos = 120) {
  for (let i = 0; i < intentos; i++) {
    try {
      // `-h 127.0.0.1` fuerza TCP a propósito. Durante initdb, la imagen de
      // postgres levanta un servidor temporal que escucha SÓLO por socket Unix
      // (listen_addresses=''), y un pg_isready sin -h lo da por bueno: la
      // verificación seguía y psql fallaba al conectarse un instante después.
      execFileSync('docker',
        ['exec', CONTENEDOR, 'pg_isready', '-q', '-h', '127.0.0.1', '-p', '5432', '-U', 'postgres'],
        {stdio: 'ignore'});
      return;
    } catch {
      // Espera sincrónica de 500 ms sin depender de la shell.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  }
  throw new Error('PostgreSQL no aceptó conexiones dentro del tiempo previsto.');
}

try {
  console.log(`· Levantando ${IMAGEN} …`);
  limpiar();
  sh(`docker run -d --name ${CONTENEDOR} -e POSTGRES_PASSWORD=postgres ${IMAGEN}`);
  esperarPostgres();

  const psql = (entrada, args = []) =>
    execFileSync(
      'docker',
      ['exec', '-i', CONTENEDOR, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', ...args, '-f', '-'],
      {encoding: 'utf8', input: 'SET client_min_messages TO WARNING;\n' + entrada},
    );

  // -t (sin encabezados), -A (sin alineación) y -q (sin las etiquetas de estado
  // «SET», «PREPARE», …) para que la salida sean sólo las filas devueltas.
  const valor = (sql) => psql(sql, ['-t', '-A', '-q']).trim();
  const filas = (sql) => valor(sql).split('\n').filter((l) => l !== '');

  console.log('· Aplicando el esquema …');
  psql(readFileSync(path.join(aqui, 'rls', 'bootstrap.sql'), 'utf8'));
  psql(readFileSync(path.join(raiz, 'db', 'schema.sql'), 'utf8'));

  const lit = (v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

  // Cada llamada a psql abre una sesión nueva, y las sentencias preparadas son
  // por sesión: la consulta del nodo se PREPARA y se EJECUTA en la misma vuelta.
  // El PREPARE también es la validación de tipos que hace `test:sql`.
  const ejecutar = (sql, valores = []) => {
    const args = valores.length ? `(${valores.map(lit).join(', ')})` : '';

    return filas(`PREPARE consulta AS ${sql};\nEXECUTE consulta${args};`);
  };

  // Un lead tal como lo entrega `Code - Scoring`: los once parámetros del nodo.
  const insertarLead = (over = {}) => {
    const l = {
      lead_id: 'LD-1000000000000-AAAA',
      nombre: 'Juan Pérez',
      email: 'juan@test.com',
      telefono: '+54 11 5555 5555',
      presupuesto: 6000,
      urgencia: 'alta',
      servicio: 'ecommerce',
      // Con coma a propósito: es el caso que rompía la lista de parámetros
      // separada por comas de n8n y obligó a pasarlos como arreglo.
      descripcion: 'Una tienda, con stock y pagos.',
      fuente: 'formulario_web',
      score: 100,
      tier: 'HOT',
      ...over,
    };
    return ejecutar(SQL_INSERT_LEAD, [l.lead_id, l.nombre, l.email, l.telefono, l.presupuesto,
      l.urgencia, l.servicio, l.descripcion, l.fuente, l.score, l.tier]).length;
  };

  console.log('\n── S6 · Deduplicación por correo en la captación ──\n');

  comprobar('el primer envío del formulario crea el lead',
    insertarLead() === 1);

  comprobar('el segundo envío con el mismo correo NO crea un lead nuevo (doble clic)',
    insertarLead({lead_id: 'LD-1000000000001-BBBB'}) === 0);

  comprobar('y tampoco creó una segunda fila en la base',
    valor("SELECT count(*) FROM leads WHERE email = 'juan@test.com';") === '1');

  comprobar('el correo se compara sin distinguir mayúsculas',
    insertarLead({lead_id: 'LD-1000000000002-CCCC', email: 'JUAN@Test.com'}) === 0);

  comprobar('otro interesado, con otro correo, sí entra',
    insertarLead({lead_id: 'LD-1000000000003-DDDD', email: 'ana@test.com'}) === 1);

  comprobar('la descripción con comas llegó entera (los parámetros no se partieron)',
    valor("SELECT descripcion FROM leads WHERE lead_id = 'LD-1000000000000-AAAA';")
      === 'Una tienda, con stock y pagos.');

  comprobar('el lead conserva su puntaje y su nivel',
    valor("SELECT score || '/' || tier FROM leads WHERE lead_id = 'LD-1000000000000-AAAA';") === '100/HOT');

  // Pasada la ventana, el mismo correo vuelve a ser un lead legítimo: es una
  // consulta nueva del mismo interesado, no un doble clic.
  psql("UPDATE leads SET creado_en = now() - interval '30 minutes' WHERE email = 'juan@test.com';");

  comprobar('vencida la ventana, el mismo correo vuelve a generar un lead',
    insertarLead({lead_id: 'LD-1000000000004-EEEE'}) === 1);

  // ── El caso que la prueba secuencial no ve ────────────────────────────────
  // Un doble clic no produce dos envíos ordenados: produce dos peticiones que
  // se solapan. Cada una abre su propia transacción y, bajo READ COMMITTED,
  // ninguna ve la fila que la otra todavía no commiteó, de modo que el
  // `WHERE NOT EXISTS` por sí solo las deja pasar a las dos. Se comprobó
  // contra el sistema vivo: dos POST a /webhook/lead/nuevo separados por 150 ms
  // insertaban dos leads. Lo que cierra la carrera es el cerrojo consultivo
  // `pg_try_advisory_xact_lock` sobre el correo, que sólo una de las dos
  // transacciones consigue.
  //
  // Acá se reproduce esa concurrencia de verdad: la sesión A inserta y retiene
  // la transacción dos segundos; la sesión B entra a la mitad.
  const psqlAsincrono = (entrada) =>
    new Promise((resolver) => {
      const hijo = execFile(
        'docker',
        ['exec', '-i', CONTENEDOR, 'psql', '-U', 'postgres', '-d', 'postgres', '-q', '-t', '-A', '-f', '-'],
        {encoding: 'utf8'},
        (error, stdout, stderr) => resolver({error, stdout, stderr}),
      );

      hijo.stdin.end(entrada);
    });

  const sentenciaLead = (leadId, correo) =>
    `PREPARE consulta AS ${SQL_INSERT_LEAD};\n` +
    `EXECUTE consulta(${[leadId, 'Doble Clic', correo, '', 1000, 'media', 'consultoria',
      'Dos peticiones solapadas.', 'formulario_web', 50, 'WARM'].map(lit).join(', ')});\n`;

  const correoCarrera = 'concurrente@test.com';
  const sesionA = psqlAsincrono(`BEGIN;\n${sentenciaLead('LD-3000000000000-AAAA', correoCarrera)}SELECT pg_sleep(2);\nCOMMIT;\n`);

  await new Promise((r) => setTimeout(r, 500));
  await psqlAsincrono(sentenciaLead('LD-3000000000001-BBBB', correoCarrera));
  await sesionA;

  comprobar('dos envíos SIMULTÁNEOS del mismo correo dejan un solo lead',
    valor(`SELECT count(*) FROM leads WHERE email = '${correoCarrera}';`) === '1',
    `quedaron ${valor(`SELECT count(*) FROM leads WHERE email = '${correoCarrera}';`)}`);

  console.log('\n── S5 · Reconciliación de la factura perdida ──\n');

  // Escenario de la deuda: la aceptación se aplicó y la cadena se cortó antes
  // de persistir la factura (es lo que pasa hoy si falla Gotenberg, la API de
  // MercadoPago o el nodo de correo).
  psql(`
    INSERT INTO leads (lead_id, nombre, email, presupuesto, servicio, estado, fecha_aceptacion, precio_propuesto)
    VALUES ('LD-2000000000000-PERD', 'Cliente Huérfano', 'huerfano@test.com', 3000, 'desarrollo_web',
            'ACEPTADO', now() - interval '60 minutes', 7200),
           ('LD-2000000000001-RECI', 'Aceptación En Vuelo', 'envuelo@test.com', 3000, 'consultoria',
            'ACEPTADO', now() - interval '1 minute', 4000),
           ('LD-2000000000002-CONF', 'Cliente Facturado', 'confactura@test.com', 3000, 'seo',
            'ACEPTADO', now() - interval '90 minutes', 5000);
    INSERT INTO facturas (factura_id, lead_id, cliente, email, servicio, monto, fecha_vencimiento)
    VALUES ('FAC-2026-9999', 'LD-2000000000002-CONF', 'Cliente Facturado', 'confactura@test.com',
            'seo', 5000, now() + interval '15 days');
  `);

  const pendientes = () => ejecutar(SQL_LEER_ACEPTADO);

  comprobar('la consulta encuentra el lead ACEPTADO sin factura',
    pendientes().length === 1 && pendientes()[0].startsWith('LD-2000000000000-PERD'),
    pendientes().join(' | '));

  comprobar('no toca la aceptación en vuelo (dentro del período de gracia)',
    !pendientes().join('|').includes('LD-2000000000001-RECI'));

  comprobar('no toca el lead que sí tiene factura',
    !pendientes().join('|').includes('LD-2000000000002-CONF'));

  // Los trece parámetros que arma `Code - Preparar Factura Reconciliada`.
  // `factura_id` es determinista: mismo lead, mismo identificador. `pago_token`
  // se sumó al cerrar S1 (Tabla 11): el enlace de pago_confirmado ya no
  // alcanza sólo con adivinar factura_id.
  const reconciliar = (over = {}) => {
    const f = {
      factura_id: 'FAC-R-0000PERD',
      lead_id: 'LD-2000000000000-PERD',
      cliente: 'Cliente Huérfano',
      email: 'huerfano@test.com',
      servicio: 'desarrollo_web',
      monto: 7200,
      moneda: 'ARS',
      fecha_emision: new Date().toISOString(),
      fecha_vencimiento: new Date(Date.now() + 15 * 86400000).toISOString(),
      mp_preference_id: null,
      comision_plataforma: 72,
      pay_url: 'http://localhost:5678/webhook/pago-confirmado?factura_id=FAC-R-0000PERD',
      pago_token: '11111111-2222-4333-8444-555555555555',
      ...over,
    };
    return ejecutar(SQL_INSERT_FACTURA, [f.factura_id, f.lead_id, f.cliente, f.email, f.servicio,
      f.monto, f.moneda, f.fecha_emision, f.fecha_vencimiento, f.mp_preference_id,
      f.comision_plataforma, f.pay_url, f.pago_token]).length;
  };

  comprobar('la primera corrida del cron emite la factura que faltaba',
    reconciliar() === 1);

  comprobar('la segunda corrida NO emite una segunda factura',
    reconciliar() === 0);

  comprobar('tampoco la emite si el identificador cambia: el candado es el lead',
    reconciliar({factura_id: 'FAC-R-OTRO'}) === 0);

  comprobar('la base tiene exactamente una factura para ese lead',
    valor("SELECT count(*) FROM facturas WHERE lead_id = 'LD-2000000000000-PERD';") === '1');

  comprobar('la factura reconciliada nace PENDIENTE, como cualquier otra',
    valor("SELECT estado_pago FROM facturas WHERE lead_id = 'LD-2000000000000-PERD';") === 'PENDIENTE');

  comprobar('conserva el precio que fijó el profesional, no el presupuesto declarado',
    valor("SELECT monto FROM facturas WHERE lead_id = 'LD-2000000000000-PERD';") === '7200.00');

  const facturar = () => ejecutar(SQL_LEAD_FACTURADO, ['LD-2000000000000-PERD']).length;

  comprobar('el lead pasa a FACTURADO', facturar() === 1);
  comprobar('y una segunda pasada no vuelve a aplicarlo', facturar() === 0);

  comprobar('reconciliado, el lead ya no aparece como pendiente',
    !pendientes().join('|').includes('LD-2000000000000-PERD'));

  comprobar('la factura recuperada entra al circuito de recordatorios de pago',
    valor("SELECT count(*) FROM facturas_pendientes WHERE lead_id = 'LD-2000000000000-PERD';") === '1');

  console.log(`\nResultado: ${ok} OK, ${fallas} FALLA`);
  if (fallas) codigoSalida = 1;
} catch (err) {
  codigoSalida = 1;
  console.error([err.stdout, err.stderr].filter(Boolean).join('\n').trim() || err.message);
  console.error('\n✗ No se pudo completar la verificación.');
} finally {
  limpiar();
}

process.exit(codigoSalida);
