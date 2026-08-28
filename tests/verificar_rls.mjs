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
const IMAGEN = 'postgres:16-alpine';
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

let codigoSalida = 0;

// Espera a que PostgreSQL acepte conexiones. El bucle vive acá y no dentro de
// `sh -c "for i in $(seq 1 60); …"`, que es como estaba: en Windows execSync
// usa cmd.exe, que no expande `$(seq 1 60)` y se lo pasa intacto a la shell del
// contenedor —donde funciona—, pero en Linux lo expande la shell de afuera e
// inserta saltos de línea que rompen el `for`. El resultado era una verificación
// que pasaba en la máquina de desarrollo y fallaba en CI.
function esperarPostgres(intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      execFileSync('docker', ['exec', CONTENEDOR, 'pg_isready', '-q', '-U', 'postgres'],
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
