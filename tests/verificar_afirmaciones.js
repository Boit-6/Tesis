// Verifica que las afirmaciones cuantitativas del documento de la tesis sigan
// siendo ciertas sobre el código del repositorio.
//
// El dictamen verificó a mano cosas como «128 nodos funcionales / 11 webhooks /
// 5 tablas». Cada vez que el artefacto cambia, esos números pueden quedar
// desactualizados sin que nadie lo note. Este script los recalcula desde el
// código y compara contra `docs/afirmaciones-tesis.json`.
//
// Los cambios posteriores al corte documental se declaran ahí como
// `delta_documentado` + `nota`: quedan explicados en vez de aparecer como falla.
//
// Uso: node tests/verificar_afirmaciones.js
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const leer = (...p) => fs.readFileSync(path.join(raiz, ...p), 'utf8');
const leerWorkflow = (nombre) => JSON.parse(leer('workflow', nombre));

// ── Mediciones sobre el artefacto ──────────────────────────────────────────
function medirWorkflow(nombre) {
  const wf = leerWorkflow(nombre);
  const de = (tipo) => wf.nodes.filter((n) => n.type === 'n8n-nodes-base.' + tipo).length;
  const notas = de('stickyNote');

  return {
    total: wf.nodes.length,
    notas,
    funcionales: wf.nodes.length - notas,
    webhooks: de('webhook'),
    crons: de('scheduleTrigger'),
  };
}

function medirEsquema() {
  const sql = leer('db', 'schema.sql');
  // Sólo cuenta sentencias reales: si el patrón aparece dentro de un comentario
  // que explica el porqué de una decisión, no es un objeto más del esquema.
  const sqlSinComentarios = sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n');
  const contar = (re) => (sqlSinComentarios.match(re) || []).length;
  const servicioEnum = sql.match(/CREATE TYPE servicio_tipo AS ENUM\s*\(([^)]*)\)/);
  const servicioBase = servicioEnum ? servicioEnum[1].split(',').length : 0;
  // Los ALTER TYPE ... ADD VALUE de la sección de migraciones también cuentan.
  const servicioExtra = contar(/ALTER TYPE servicio_tipo ADD VALUE IF NOT EXISTS/g);

  return {
    tablas: contar(/CREATE TABLE IF NOT EXISTS/g),
    vistas: contar(/CREATE OR REPLACE VIEW/g),
    enums: contar(/CREATE TYPE \w+ AS ENUM/g),
    // El enum se declara con 7 y las migraciones agregan marketing y seo, que
    // en una base nueva ya vienen en la declaración: no hay que sumarlos dos veces.
    servicios: new Set([
      ...(servicioEnum ? servicioEnum[1].match(/'[a-z_]+'/g) || [] : []),
      ...(sql.match(/ALTER TYPE servicio_tipo ADD VALUE IF NOT EXISTS ('[a-z_]+')/g) || [])
        .map((s) => s.replace(/.*(\'[a-z_]+\')/, '$1')),
    ]).size,
    politicas: contar(/CREATE POLICY/g),
    indices: contar(/CREATE INDEX IF NOT EXISTS/g),
    servicioBase,
    servicioExtra,
  };
}

// Los umbrales de scoring ahora son configurables; lo que la tesis documenta
// son los DEFAULTS, que es lo que se lee del nodo.
function medirScoring() {
  const wf = leerWorkflow('crm_postgres.json');
  const js = wf.nodes.find((n) => n.name === 'Code - Scoring').parameters.jsCode;
  const leerDefault = (clave) => {
    const m = js.match(new RegExp("leerEnv\\('" + clave + "',\\s*'([^']*)'\\)"));

    return m ? Number(m[1]) : null;
  };

  return {
    umbralHot: leerDefault('SCORING_UMBRAL_HOT'),
    umbralWarm: leerDefault('SCORING_UMBRAL_WARM'),
  };
}

const medidas = {
  crm: medirWorkflow('crm_postgres.json'),
  tickets: medirWorkflow('tickets_notion.json'),
  db: medirEsquema(),
  scoring: medirScoring(),
};

// ── Comparación ────────────────────────────────────────────────────────────
const decl = JSON.parse(leer('docs', 'afirmaciones-tesis.json'));
const valorDe = (ruta) => ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), medidas);

let ok = 0, divergentes = 0, explicados = 0;
const filas = [];

for (const a of decl.afirmaciones) {
  const medido = valorDe(a.medida);
  const esperado = a.valor_tesis + (a.delta_documentado || 0);
  const coincide = medido === esperado;
  const tieneDelta = (a.delta_documentado || 0) !== 0;

  if (!coincide) divergentes++;
  else if (tieneDelta) explicados++;
  else ok++;

  filas.push({
    estado: !coincide ? 'DIVERGE' : tieneDelta ? 'EXPLICADO' : 'OK',
    id: a.id,
    tesis: a.valor_tesis,
    delta: a.delta_documentado || 0,
    esperado,
    medido: medido === undefined ? '(no medido)' : medido,
    descripcion: a.descripcion,
    nota: a.nota,
  });
}

// ── Reporte ────────────────────────────────────────────────────────────────
const anchoId = Math.max(...filas.map((f) => f.id.length));

console.log('Afirmaciones de la tesis vs. el repositorio');
console.log('Corte documental: ' + decl.corte_documental + '  (' + decl.referencia + ')\n');

for (const f of filas) {
  const delta = f.delta ? ` ${f.delta > 0 ? '+' : ''}${f.delta}` : '';

  console.log(
    f.estado.padEnd(10) + f.id.padEnd(anchoId + 2) +
    `tesis ${String(f.tesis).padStart(4)}${delta.padEnd(4)} → esperado ${String(f.esperado).padStart(4)}   medido ${String(f.medido).padStart(4)}`,
  );
  if (f.estado !== 'OK') console.log(' '.repeat(10) + '↳ ' + f.descripcion);
  if (f.estado === 'EXPLICADO' && f.nota) console.log(' '.repeat(10) + '↳ ' + f.nota);
}

console.log('\nMediciones actuales del artefacto:');
console.log('  CRM      : ' + medidas.crm.total + ' nodos (' + medidas.crm.funcionales + ' funcionales + ' + medidas.crm.notas + ' notas), ' + medidas.crm.webhooks + ' webhooks, ' + medidas.crm.crons + ' crons');
console.log('  Tickets  : ' + medidas.tickets.total + ' nodos (' + medidas.tickets.funcionales + ' funcionales + ' + medidas.tickets.notas + ' notas), ' + medidas.tickets.webhooks + ' webhooks, ' + medidas.tickets.crons + ' cron');
console.log('  Esquema  : ' + medidas.db.tablas + ' tablas, ' + medidas.db.vistas + ' vistas, ' + medidas.db.enums + ' enums, ' + medidas.db.politicas + ' políticas RLS, ' + medidas.db.indices + ' índices');
console.log('  Scoring  : HOT ≥ ' + medidas.scoring.umbralHot + ', WARM ≥ ' + medidas.scoring.umbralWarm);

console.log('\nResultado: ' + ok + ' sin cambios, ' + explicados + ' con desvío documentado, ' + divergentes + ' divergentes');

if (divergentes) {
  console.log('\n✗ Hay afirmaciones del documento que ya no son ciertas.');
  console.log('  Actualizá el .docx, o declará el cambio en docs/afirmaciones-tesis.json');
  console.log('  con `delta_documentado` + `nota` explicando de dónde sale la diferencia.');
}

process.exit(divergentes ? 1 : 0);
