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

function psql(archivo) {
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
      input: 'SET client_min_messages TO WARNING;\n' + readFileSync(archivo, 'utf8'),
    },
  );
}

let codigoSalida = 0;

try {
  console.log('· Levantando ' + IMAGEN + ' …');
  limpiar();
  sh(`docker run -d --name ${CONTENEDOR} -e POSTGRES_PASSWORD=postgres ${IMAGEN}`);

  // Esperar a que acepte conexiones (el sleep corre dentro del contenedor).
  sh(`docker exec ${CONTENEDOR} sh -c "for i in $(seq 1 60); do pg_isready -q -U postgres && exit 0; sleep 0.5; done; exit 1"`);

  console.log('· Andamiaje de Supabase (roles, auth.users, auth.uid) …');
  psql(path.join(aqui, 'rls', 'bootstrap.sql'));

  console.log('· Aplicando db/schema.sql tal cual está en el repositorio …');
  psql(path.join(raiz, 'db', 'schema.sql'));

  // Idempotencia: el esquema declara ser re-ejecutable, lo comprobamos.
  console.log('· Re-aplicando el esquema (debe ser idempotente) …');
  psql(path.join(raiz, 'db', 'schema.sql'));

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
