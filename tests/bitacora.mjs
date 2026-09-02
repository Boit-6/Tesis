// Bitácora de evidencia en disco para los verificadores que hasta ahora sólo
// informaban por consola.
//
// El evaluador externo observó (Anexo K, Tabla 47) que `test:rls`,
// `test:idempotencia` y `test:realtime` no dejaban ningún archivo, de modo que
// sus resultados no eran auditables a posteriori sin volver a ejecutarlos —a
// diferencia de `test:escenarios`, `test:trazabilidad` y `test:exposicion`, que
// sí escriben en `docs/`. Este módulo cierra esa asimetría.
//
// Uso:
//   import {abrirBitacora} from './bitacora.mjs';
//   const bitacora = abrirBitacora('evidencia-rls.md', 'Verificación de RLS',
//                                  {Imagen: 'postgres:14-alpine'});
//   … el script corre normalmente, con su console.log de siempre …
//   bitacora.cerrar(codigoSalida);
//
// Mientras la bitácora está abierta, todo lo que va a stdout y stderr se
// duplica: sigue viéndose en la terminal y además se acumula para el archivo.
// El encabezado registra la marca temporal, el commit y el estado del árbol de
// trabajo, que es lo que permite atar la corrida a una versión del artefacto.

import {execSync} from 'node:child_process';
import {writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const git = (cmd, porOmision = 'desconocido') => {
  try {
    return execSync(`git ${cmd}`, {cwd: RAIZ, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']}).trim();
  } catch {
    return porOmision;
  }
};

// Quita los códigos de color ANSI: en el archivo estorban.
const limpiar = (s) => String(s).replace(/\[[0-9;]*m/g, '');

export function abrirBitacora(archivo, titulo, metadatos = {}) {
  const inicio = new Date();
  const lineas = [];
  const original = {
    stdout: process.stdout.write.bind(process.stdout),
    stderr: process.stderr.write.bind(process.stderr),
  };

  const capturar = (escribirOriginal) => (chunk, ...resto) => {
    lineas.push(limpiar(chunk));
    return escribirOriginal(chunk, ...resto);
  };

  process.stdout.write = capturar(original.stdout);
  process.stderr.write = capturar(original.stderr);

  function cerrar(codigoSalida = 0) {
    process.stdout.write = original.stdout;
    process.stderr.write = original.stderr;

    const fin = new Date();
    const sucio = git('status --porcelain', '');
    const cab = [
      `# ${titulo}`,
      '',
      '> Archivo generado por el propio verificador. No se edita a mano: cada',
      '> corrida lo reescribe por completo.',
      '',
      '| Campo | Valor |',
      '|---|---|',
      `| Marca temporal (UTC) | ${inicio.toISOString()} |`,
      `| Duración | ${((fin - inicio) / 1000).toFixed(1)} s |`,
      `| Commit | \`${git('rev-parse HEAD')}\` (${git('rev-parse --short HEAD')}) |`,
      `| Árbol de trabajo | ${sucio ? `con ${sucio.split('\n').length} archivo(s) sin registrar` : 'limpio'} |`,
      `| Node.js | ${process.version} |`,
      `| Plataforma | ${process.platform} ${process.arch} |`,
    ];

    for (const [clave, valor] of Object.entries(metadatos)) {
      cab.push(`| ${clave} | ${valor} |`);
    }

    cab.push(`| Resultado | ${codigoSalida === 0 ? '**OK** (código de salida 0)' : `**FALLA** (código de salida ${codigoSalida})`} |`);
    cab.push('', '## Salida de la corrida', '', '```');

    const cuerpo = lineas.join('').replace(/\s+$/, '');
    const texto = cab.join('\n') + '\n' + cuerpo + '\n```\n';

    const destino = path.join(RAIZ, 'docs', archivo);

    mkdirSync(path.dirname(destino), {recursive: true});
    writeFileSync(destino, texto, 'utf8');
    original.stdout(`\nEvidencia archivada: docs/${archivo}\n`);
  }

  return {cerrar};
}
