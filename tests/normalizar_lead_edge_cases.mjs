// Casos límite del nodo `Code - Normalizar Lead`: el parser de presupuesto
// (`parsearImporte`, F1.9) y la validación de email. `smoke_code_nodes.mjs`
// ya corre este nodo una vez con datos válidos; este test se concentra en los
// valores raros que un formulario público puede llegar a mandar.
//
// Uso: node tests/normalizar_lead_edge_cases.mjs
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const wf = JSON.parse(
  readFileSync(path.join(aqui, '..', 'workflow', 'crm_postgres.json'), 'utf8'),
);
const jsCode = wf.nodes.find((n) => n.name === 'Code - Normalizar Lead').parameters.jsCode;

// Ejecuta el nodo tal cual está en el workflow. Devuelve el lead normalizado,
// o el mensaje de la excepción si la validación lo rechaza.
function normalizar(body) {
  const item = {json: {body}};
  const $input = {first: () => item, all: () => [item], last: () => item};
  const fn = new Function('$input', jsCode);

  try {
    return {ok: true, lead: fn($input)[0].json};
  } catch (e) {
    return {ok: false, error: e.message};
  }
}

const base = {nombre: 'Cliente de prueba', urgencia: 'media', servicio: 'consultoria'};

let ok = 0, fail = 0;
const check = (nombre, condicion, detalle) => {
  if (condicion) { console.log('OK    ' + nombre); ok++; }
  else { console.log('FAIL  ' + nombre + (detalle ? '  ->  ' + detalle : '')); fail++; }
};

// ── Presupuesto: parsearImporte (F1.9) ─────────────────────────────────────
const presupuestoOk = (valor, esperado, nombre) => {
  const r = normalizar({...base, email: 'cliente@test.com', presupuesto: valor});

  check(nombre, r.ok && r.lead.presupuesto === esperado, JSON.stringify(r));
};
const presupuestoRechazado = (valor, nombre) => {
  const r = normalizar({...base, email: 'cliente@test.com', presupuesto: valor});

  check(nombre, !r.ok && r.error.includes('presupuesto invalido'), JSON.stringify(r));
};

presupuestoOk('$1,500.00', 1500, `"$1,500.00" se interpreta como 1500 (coma de miles)`);
presupuestoOk('1.500,00', 1500, `"1.500,00" se interpreta como 1500 (punto de miles, notación ARS)`);
presupuestoOk(6000, 6000, 'un número ya numérico pasa igual');
presupuestoOk('6000', 6000, 'un string numérico simple se parsea bien');
presupuestoRechazado('1e3', `"1e3" se rechaza en vez de leerse como 13 (la "e" no es notación científica acá)`);
presupuestoRechazado('10abc', '"10abc" (basura al final) se rechaza, no se trunca a 10');
presupuestoRechazado('abc', '"abc" (no numérico) se rechaza');
presupuestoRechazado('', '"" (vacío) se rechaza');
presupuestoRechazado(null, 'null se rechaza');
presupuestoRechazado(0, '0 se rechaza (presupuesto <= 0)');
presupuestoRechazado(-500, 'un negativo se rechaza');

// ── Email ───────────────────────────────────────────────────────────────────
const emailOk = (valor) => normalizar({...base, presupuesto: 6000, email: valor}).ok;

check('email válido simple se acepta', emailOk('test@test.com'));
check('email sin dominio ("a@") se rechaza', !emailOk('a@'));
check('email vacío se rechaza', !emailOk(''));
check('email sin arroba se rechaza', !emailOk('sinarroba.com'));
check('email con mayúsculas se acepta (se normaliza a minúsculas)', emailOk('Test@Test.COM'));
check(
  'un email null no rompe el nodo (falla la validación, no una excepción de tipo)',
  normalizar({...base, presupuesto: 6000, email: null}).error?.includes('email invalido') ?? false,
);

// ── Nombre ──────────────────────────────────────────────────────────────────
// Aparece tal cual en el acuse que va al email del formulario: sin tope ni
// filtro de enlaces, ese correo servía para mandar spam a terceros.
const nombreOk = (valor) => normalizar({...base, presupuesto: 6000, email: 'a@b.co', nombre: valor});

check('un nombre con "&" y tildes se acepta', nombreOk('García & Asociados').ok);
check('un nombre de 100 caracteres se acepta', nombreOk('a'.repeat(100)).ok);
check('un nombre de 101 caracteres se rechaza', nombreOk('a'.repeat(101)).error?.includes('nombre muy largo') ?? false);
check('un nombre con "https://" se rechaza', nombreOk('Juan https://estafa.test').error?.includes('nombre con enlace') ?? false);
check('un nombre con "www." se rechaza', nombreOk('Visitá WWW.estafa.test').error?.includes('nombre con enlace') ?? false);

// ── Espacio: la dirección del formulario de /f/<slug> ──────────────────────
const conEspacio = (valor) => normalizar({...base, presupuesto: 6000, email: 'a@b.co', espacio: valor});

check('sin espacio (formulario de la raíz) queda vacío', normalizar({...base, presupuesto: 6000, email: 'a@b.co'}).lead?.espacio === '');
check('una dirección válida pasa tal cual', conEspacio('estudio-ana').lead?.espacio === 'estudio-ana');
check('la dirección se pasa a minúsculas', conEspacio(' Estudio-Ana ').lead?.espacio === 'estudio-ana');
check('una dirección con espacios o símbolos se rechaza, no cae al espacio del admin',
  conEspacio("ana'; DROP TABLE leads;--").error?.includes('espacio invalido') ?? false);
check('una dirección demasiado corta se rechaza', conEspacio('ab').error?.includes('espacio invalido') ?? false);

console.log('\nResultado: ' + ok + ' OK, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
