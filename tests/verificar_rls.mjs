#!/usr/bin/env node
// Verificación EJECUTABLE de la seguridad a nivel de fila (RLS).
//
// El dictamen pregunta si la RLS está realmente aplicada o si sólo existe en el
// script (cuestión 2 de la defensa oral). Este verificador la ejecuta: levanta
// un PostgreSQL desechable en Docker, monta el andamiaje mínimo de Supabase
// (roles, `auth.users`, `auth.uid()`), corre `db/schema.sql` tal cual está en el
// repositorio y después intenta, rol por rol, todo lo que el modelo de
// seguridad promete impedir.
//
// No toca ninguna instancia real: el contenedor se crea y se destruye.
//
// Uso:  node tests/verificar_rls.mjs [--dejar-vivo]
import {execFileSync, execSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aqui, '..');
const CONTENEDOR = 'crm-rls-test';
// La versión mayor del motor no se acredita por la ficha del proveedor sino por
// una restricción del propio esquema: `metrics_mensuales` y `facturas_pendientes`
// se declaran `WITH (security_invoker = true)`, y esa opción de vista existe
// recién desde PostgreSQL 15. Una 14 aborta con `ERROR: unrecognized parameter
// "security_invoker"` antes de llegar a las políticas.
// Contrastable con:  npm run test:rls --imagen postgres:14-alpine
const IMAGEN = (() => {
  const args = process.argv.slice(2);
  const i = args.indexOf('--imagen');
  if (i !== -1 && args[i + 1]) return args[i + 1];
  // En la forma que cita la Tabla 13 (`npm run test:rls --imagen postgres:14-alpine`)
  // npm se queda con `--imagen` como config suya y reenvía sólo el valor suelto,
  // así que se lo acepta también por posición.
  return args.find((a) => /^[\w./-]+:[\w.-]+$/.test(a)) || 'postgres:16-alpine';
})();
const dejarVivo = process.argv.includes('--dejar-vivo');

const sh = (cmd, opciones = {}) =>
  execSync(cmd, {encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opciones});

function limpiar() {
  try {
    sh(`docker rm -f ${CONTENEDOR}`);
  } catch {
    // No existía: nada que limpiar.
  }
}

function correr(sql) {
  // El SQL se manda por stdin: así no hace falta montar volúmenes ni pelearse
  // con la traducción de rutas de Windows a las del contenedor.
  // -v ON_ERROR_STOP=1 hace que psql devuelva != 0 ante el primer error.
  return execFileSync(
    'docker',
    ['exec', '-i', CONTENEDOR, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
    {
      encoding: 'utf8',
      // El esquema es idempotente y emite un NOTICE por cada objeto que ya
      // existía; sólo interesan los WARNING para arriba.
      input: 'SET client_min_messages TO WARNING;\n' + sql,
    },
  );
}

function psql(archivo) {
  return correr(readFileSync(archivo, 'utf8'));
}

// Deja la base como estaba ANTES de las columnas de MercadoPago y del
// vencimiento del token: mismas tablas, pero sin esas columnas y con las vistas
// viejas. Es el estado real de cualquier instancia creada antes de esos
// cambios, y el único escenario donde se rompe `CREATE OR REPLACE VIEW`.
const DEGRADAR_A_VERSION_VIEJA = `
DROP VIEW IF EXISTS facturas_pendientes;
DROP VIEW IF EXISTS metrics_mensuales;

ALTER TABLE facturas DROP COLUMN IF EXISTS mp_preference_id;
ALTER TABLE facturas DROP COLUMN IF EXISTS mp_payment_id;
ALTER TABLE facturas DROP COLUMN IF EXISTS comision_plataforma;
ALTER TABLE leads    DROP COLUMN IF EXISTS token_expira_en;

-- La vista tal como era entonces: sin las columnas de MercadoPago.
CREATE VIEW facturas_pendientes WITH (security_invoker = true) AS
SELECT f.*, (f.fecha_vencimiento::date - now()::date) AS dias_al_vencimiento
FROM facturas f
WHERE f.estado_pago = 'PENDIENTE';
`;

// Una base de un solo dueño con datos, como era antes de los espacios. Las
// cuentas se crean ANTES de quitar los espacios porque los triggers de
// auth.users ya los crean al confirmar; el DROP se los lleva igual.
// Un ticket cuelga de un lead y otro no; un log también. CASCADE se lleva las
// políticas y la vista que usan la columna: el esquema las vuelve a crear.
const ANTES_DE_LOS_ESPACIOS = `
INSERT INTO admin_emails (email) VALUES ('viejo-admin@test.com');
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'viejo-admin@test.com', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'otra-cuenta@test.com', now());

DROP TRIGGER trg_leads_espacio ON leads;
DROP TRIGGER trg_leads_propagar_espacio ON leads;
DROP TRIGGER trg_facturas_espacio ON facturas;
DROP TRIGGER trg_seguimientos_espacio ON seguimientos;
DROP TRIGGER trg_logs_espacio ON logs;
DROP TRIGGER trg_tickets_espacio ON tickets;
ALTER TABLE leads        DROP COLUMN espacio_id CASCADE;
ALTER TABLE facturas     DROP COLUMN espacio_id CASCADE;
ALTER TABLE seguimientos DROP COLUMN espacio_id CASCADE;
ALTER TABLE logs         DROP COLUMN espacio_id CASCADE;
ALTER TABLE tickets      DROP COLUMN espacio_id CASCADE;
DROP TABLE espacios CASCADE;

INSERT INTO leads (lead_id, nombre, email, actualizado_en) VALUES
  ('LD-VIEJO-1', 'Uno', 'uno@test.com', '2026-01-01'),
  ('LD-VIEJO-2', 'Dos', 'dos@test.com', '2026-01-01');
ALTER TABLE leads DISABLE TRIGGER trg_leads_updated;
UPDATE leads SET actualizado_en = '2026-01-01';
ALTER TABLE leads ENABLE TRIGGER trg_leads_updated;
INSERT INTO facturas (factura_id, lead_id, cliente, email, monto, fecha_vencimiento)
VALUES ('FAC-VIEJA-1', 'LD-VIEJO-1', 'Uno', 'uno@test.com', 100, now() + interval '5 days');
INSERT INTO tickets (titulo, lead_id) VALUES ('del proyecto', 'LD-VIEJO-1');
INSERT INTO tickets (titulo) VALUES ('suelto');
INSERT INTO logs (workflow, lead_id, evento) VALUES ('test', 'LD-VIEJO-2', 'alta');
`;

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
  console.log('· Levantando ' + IMAGEN + ' …');
  limpiar();
  sh(`docker run -d --name ${CONTENEDOR} -e POSTGRES_PASSWORD=postgres ${IMAGEN}`);

  // Esperar a que acepte conexiones (el sleep corre dentro del contenedor).
  esperarPostgres();

  console.log('· Andamiaje de Supabase (roles, auth.users, auth.uid) …');
  psql(path.join(aqui, 'rls', 'bootstrap.sql'));

  console.log('· Aplicando db/schema.sql tal cual está en el repositorio …');
  psql(path.join(raiz, 'db', 'schema.sql'));

  // Idempotencia: el esquema declara ser re-ejecutable, lo comprobamos.
  console.log('· Re-aplicando el esquema (debe ser idempotente) …');
  psql(path.join(raiz, 'db', 'schema.sql'));

  // Actualización de una instancia vieja. Re-aplicar sobre una base recién
  // creada no prueba nada: las vistas ya tienen la forma nueva, así que el
  // CREATE OR REPLACE no cambia ninguna columna y siempre pasa. El caso que
  // importa —y el que rompía en la instancia real— es una base anterior a las
  // columnas de MercadoPago, donde reemplazar la vista SÍ cambia su lista de
  // columnas y Postgres aborta si el script no la dropea antes.
  console.log('· Degradando la base a una versión anterior (simula una instancia vieja) …');
  correr(DEGRADAR_A_VERSION_VIEJA);

  console.log('· Aplicando el esquema encima (debe migrarla sin fallar) …');
  psql(path.join(raiz, 'db', 'schema.sql'));

  const migrada = correr(`
    SELECT
      (SELECT count(*) FROM information_schema.columns
        WHERE table_name = 'facturas' AND column_name = 'comision_plataforma') AS col_facturas,
      (SELECT count(*) FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'token_expira_en') AS col_leads,
      (SELECT count(*) FROM information_schema.columns
        WHERE table_name = 'metrics_mensuales' AND column_name = 'comision_cobrada') AS col_vista;
  `);

  if (!/\s1\s*\|\s*1\s*\|\s*1/.test(migrada)) {
    throw new Error(
      'La migración desde una base vieja no dejó las columnas nuevas:\n' + migrada,
    );
  }
  console.log('  ✓ la base vieja quedó migrada (columnas y vista al día)');

  // Una base de un solo dueño, anterior a los espacios y CON datos: es la
  // instancia real. Todo tiene que quedar en un espacio "principal" a nombre
  // del admin, sin tocar `actualizado_en`, y re-aplicar no puede duplicarlo.
  console.log('· Degradando a una base anterior a los espacios, con datos …');
  correr(ANTES_DE_LOS_ESPACIOS);
  console.log('· Aplicando el esquema encima (debe repartir los datos en un espacio) …');
  psql(path.join(raiz, 'db', 'schema.sql'));
  psql(path.join(raiz, 'db', 'schema.sql'));

  const repartida = correr(`
    SELECT
      (SELECT count(*) FROM espacios) AS espacios,
      (SELECT count(*) FROM espacios e JOIN profiles p ON p.id = e.dueno_id
        WHERE e.slug = 'principal' AND p.email = 'viejo-admin@test.com') AS principal_del_admin,
      (SELECT count(*) FROM leads l JOIN espacios e ON e.id = l.espacio_id WHERE e.slug = 'principal') AS leads,
      (SELECT count(*) FROM facturas f JOIN espacios e ON e.id = f.espacio_id WHERE e.slug = 'principal') AS facturas,
      (SELECT count(*) FROM tickets t JOIN espacios e ON e.id = t.espacio_id WHERE e.slug = 'principal') AS tickets,
      (SELECT count(*) FROM logs g JOIN espacios e ON e.id = g.espacio_id WHERE e.slug = 'principal') AS logs,
      (SELECT count(*) FROM leads WHERE actualizado_en = '2026-01-01') AS sin_tocar;
  `);

  // 2 espacios: el principal del admin y el propio de la otra cuenta confirmada.
  if (!/\s2\s*\|\s*1\s*\|\s*2\s*\|\s*1\s*\|\s*2\s*\|\s*1\s*\|\s*2\s*$/m.test(repartida)) {
    throw new Error('La migración a espacios no repartió los datos como se esperaba:\n' + repartida);
  }
  console.log('  ✓ los datos de la base vieja quedaron en el espacio del admin');

  correr(`
    TRUNCATE leads, facturas, seguimientos, logs, tickets, espacios CASCADE;
    DELETE FROM auth.users;
    DELETE FROM admin_emails;
  `);

  console.log('· Ejecutando los casos de RLS …\n');
  console.log(psql(path.join(aqui, 'rls', 'casos.sql')));
  console.log('\n✓ La RLS se comporta como la describe el esquema.');
} catch (err) {
  codigoSalida = 1;
  const salida = [err.stdout, err.stderr].filter(Boolean).join('\n').trim();

  console.error(salida || err.message);
  console.error('\n✗ La verificación de RLS falló.');
} finally {
  if (dejarVivo) {
    console.log(`\n(contenedor ${CONTENEDOR} sigue vivo: docker exec -it ${CONTENEDOR} psql -U postgres)`);
  } else {
    limpiar();
  }
}

process.exit(codigoSalida);
