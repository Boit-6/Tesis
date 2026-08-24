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

// Nodos que anuncian un importe leyéndolo de `presupuesto`.
//
// `presupuesto` es lo que el interesado declara en el formulario; el importe
// comprometido es `precio_propuesto` (y `monto` una vez emitida la factura).
// Confundirlos apareció cinco veces: en la propuesta, en el PDF, en el INSERT de
// la factura, en el correo que la acompaña —que llegó a anunciar un importe
// distinto del que decía el PDF adjunto en el mismo envío— y en tres avisos de
// Telegram. Este recuento tiene que quedarse en cero.
function medirImportes() {
  const wf = leerWorkflow('crm_postgres.json');
  const sospechoso = /(monto|cobrado|inversion|inversión|por <b>\$)[^"]{0,80}\.presupuesto/i;

  return wf.nodes.filter((n) => {
    // El nodo que elige entre un campo y otro es justamente el que resuelve la
    // ambigüedad: no cuenta como uso incorrecto.
    if (n.name === 'Code - Generar ID Factura') return false;

    return sospechoso.test(JSON.stringify(n.parameters || {}));
  }).length;
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
//
// Se miden además las ponderaciones de la Tabla 5, y no sólo los umbrales,
// porque la deriva del 23-ago-2026 pasó justo por ahí: se cambió a qué servicio
// mapea la opción «Otro» del formulario y el .docx siguió describiendo el valor
// viejo, sin que nada fallara. Las ponderaciones se expresan en puntos, que es
// como las declara la Tabla 5.
function medirScoring() {
  const wf = leerWorkflow('crm_postgres.json');
  const js = wf.nodes.find((n) => n.name === 'Code - Scoring').parameters.jsCode;
  const jsNorm = wf.nodes.find((n) => n.name === 'Code - Normalizar Lead').parameters.jsCode;

  // El nodo lee su configuración con tres ayudantes —`leerEnv` para los
  // escalares, `tabla` para los mapas clave:puntos y `tramos` para los cortes
  // de presupuesto—, todos con la misma firma (clave, valor por defecto).
  const leerDefaultCrudo = (clave) => {
    const m = js.match(new RegExp("(?:leerEnv|tabla|tramos)\\('" + clave + "',\\s*'([^']*)'\\)"));

    return m ? m[1] : null;
  };
  const leerDefault = (clave) => {
    const v = leerDefaultCrudo(clave);

    return v === null ? null : Number(v);
  };
  // "clave:puntos,clave:puntos" → {clave: puntos}
  const tablaDefault = (clave) => Object.fromEntries(
    (leerDefaultCrudo(clave) || '')
      .split(',')
      .map((p) => p.split(':'))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k.trim(), Number(v)]),
  );
  const maximoDe = (tabla) => Math.max(...Object.values(tabla));

  const porServicio = tablaDefault('SCORING_SERVICIO');
  const porUrgencia = tablaDefault('SCORING_URGENCIA');
  const porPresupuesto = tablaDefault('SCORING_PRESUPUESTO');

  // A qué servicio traduce el normalizador cada caso, antes de que el scoring
  // lo pondere. Sin este paso las ponderaciones de la Tabla 5 se leen sobre un
  // espacio de entrada que el pipeline real nunca produce.
  const mapaSvc = jsNorm.match(/const svcMap = \{([^}]*)\}/);
  const traduce = (opcion) => {
    const m = mapaSvc && mapaSvc[1].match(new RegExp("'" + opcion + "'\\s*:\\s*'([a-z_]+)'"));

    return m ? m[1] : null;
  };
  const respaldo = (jsNorm.match(/svcMap\[[^\]]*\]\s*\|\|\s*'([a-z_]+)'/) || [])[1] || null;
  const puntosDe = (servicio) => (servicio && porServicio[servicio] !== undefined
    ? porServicio[servicio]
    : leerDefault('SCORING_SERVICIO_DEFAULT'));

  return {
    umbralHot: leerDefault('SCORING_UMBRAL_HOT'),
    umbralWarm: leerDefault('SCORING_UMBRAL_WARM'),
    serviciosPonderados: Object.keys(porServicio).length,
    // Puntos que termina recibiendo la opción «Otro» del formulario.
    puntosOtro: puntosDe(traduce('otro')),
    // Puntos que recibe un servicio que el normalizador no supo mapear.
    puntosRespaldo: puntosDe(respaldo),
    // Techo del modelo: el mejor tramo de cada criterio más los dos bonus.
    puntajeMaximo: maximoDe(porPresupuesto) + maximoDe(porUrgencia) + maximoDe(porServicio) +
      leerDefault('SCORING_BONUS_TELEFONO') + leerDefault('SCORING_BONUS_DESCRIPCION'),
  };
}

const medidas = {
  crm: medirWorkflow('crm_postgres.json'),
  tickets: medirWorkflow('tickets_notion.json'),
  db: medirEsquema(),
  importesDesdePresupuesto: medirImportes(),
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
console.log('  Scoring  : HOT ≥ ' + medidas.scoring.umbralHot + ', WARM ≥ ' + medidas.scoring.umbralWarm +
  ', ' + medidas.scoring.serviciosPonderados + ' servicios ponderados, máximo ' + medidas.scoring.puntajeMaximo);
console.log('  Importes : ' + medidas.importesDesdePresupuesto + ' nodos anuncian un importe leyendo presupuesto (debe ser 0)');
console.log('  Servicio : «Otro» → ' + medidas.scoring.puntosOtro + ' pts · respaldo del normalizador → ' + medidas.scoring.puntosRespaldo + ' pts');

console.log('\nResultado: ' + ok + ' sin cambios, ' + explicados + ' con desvío documentado, ' + divergentes + ' divergentes');

if (divergentes) {
  console.log('\n✗ Hay afirmaciones del documento que ya no son ciertas.');
  console.log('  Actualizá el .docx, o declará el cambio en docs/afirmaciones-tesis.json');
  console.log('  con `delta_documentado` + `nota` explicando de dónde sale la diferencia.');
}

process.exit(divergentes ? 1 : 0);
