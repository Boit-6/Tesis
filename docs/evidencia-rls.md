# Verificación de seguridad a nivel de fila (RLS)

> Archivo generado por el propio verificador. No se edita a mano: cada
> corrida lo reescribe por completo.

| Campo | Valor |
|---|---|
| Marca temporal (UTC) | 2026-09-02T17:42:44.022Z |
| Duración | 6.3 s |
| Commit | `d1abe08b5cf896f986b92f646c44719755f88661` (d1abe08) |
| Árbol de trabajo | con 6 archivo(s) sin registrar |
| Node.js | v24.18.0 |
| Plataforma | win32 x64 |
| Instrumento | `npm run test:rls` (tests/verificar_rls.mjs) |
| Imagen de PostgreSQL | `postgres:15-alpine` |
| Requisitos | RNF1, RNF2 · deuda S4 de la Tabla 22 |
| Resultado | **OK** (código de salida 0) |

## Salida de la corrida

```
· Levantando postgres:15-alpine …
· Andamiaje de Supabase (roles, auth.users, auth.uid) …
· Aplicando db/schema.sql tal cual está en el repositorio …
· Re-aplicando el esquema (debe ser idempotente) …
· Degradando la base a una versión anterior (simula una instancia vieja) …
· Aplicando el esquema encima (debe migrarla sin fallar) …
  ✓ la base vieja quedó migrada (columnas y vista al día)
· Ejecutando los casos de RLS …

SET
INSERT 0 2
UPDATE 1
UPDATE 1
INSERT 0 1
INSERT 0 1
INSERT 0 1
CREATE TABLE
CREATE FUNCTION
Border style is 2.
+----+--------+----------------------------------------------------------------------+------------------+------------------+
| #  | estado |                                 caso                                 |     esperado     |     obtenido     |
+----+--------+----------------------------------------------------------------------+------------------+------------------+
|  1 | OK     | anon NO puede leer leads                                             | permiso denegado | permiso denegado |
|  2 | OK     | anon NO puede leer facturas                                          | permiso denegado | permiso denegado |
|  3 | OK     | anon NO puede leer logs                                              | permiso denegado | permiso denegado |
|  4 | OK     | anon NO puede leer profiles                                          | permiso denegado | permiso denegado |
|  5 | OK     | anon NO puede leer metrics_mensuales                                 | permiso denegado | permiso denegado |
|  6 | OK     | anon NO puede leer facturas_pendientes                               | permiso denegado | permiso denegado |
|  7 | OK     | usuario logueado sin rol admin ve 0 leads                            | 0 filas          | 0 filas          |
|  8 | OK     | usuario logueado sin rol admin ve 0 facturas                         | 0 filas          | 0 filas          |
|  9 | OK     | usuario sin rol admin ve 0 en las métricas                           | 0 filas          | 0 filas          |
| 10 | OK     | admin lee leads                                                      | 1 filas          | 1 filas          |
| 11 | OK     | admin lee facturas                                                   | 1 filas          | 1 filas          |
| 12 | OK     | admin lee facturas_pendientes                                        | 1 filas          | 1 filas          |
| 13 | OK     | admin lee las métricas                                               | 1 filas          | 1 filas          |
| 14 | OK     | el admin NO puede leer logs (auditoría cerrada)                      | permiso denegado | permiso denegado |
| 15 | OK     | el admin NO puede modificar un lead                                  | permiso denegado | permiso denegado |
| 16 | OK     | el admin NO puede insertar un lead                                   | permiso denegado | permiso denegado |
| 17 | OK     | el admin NO puede borrar un lead                                     | permiso denegado | permiso denegado |
| 18 | OK     | un usuario NO puede darse el rol admin                               | permiso denegado | permiso denegado |
| 19 | OK     | un usuario ve sólo su propio profile                                 | 1 filas          | 1 filas          |
| 20 | OK     | el admin también ve sólo su propio profile                           | 1 filas          | 1 filas          |
| 21 | OK     | service_role lee leads                                               | 1 filas          | 1 filas          |
| 22 | OK     | service_role lee logs                                                | 1 filas          | 1 filas          |
| 23 | OK     | service_role puede escribir                                          | 1 filas          | 1 filas          |
| 24 | OK     | authenticated sin JWT ve 0 leads                                     | 0 filas          | 0 filas          |
| 25 | OK     | n8n_writer inserta un lead                                           | 1 filas          | 1 filas          |
| 26 | OK     | n8n_writer actualiza el lead que acaba de insertar                   | 1 filas          | 1 filas          |
| 27 | OK     | n8n_writer lee las dos filas de leads que ya existen                 | 2 filas          | 2 filas          |
| 28 | OK     | n8n_writer lee logs                                                  | 1 filas          | 1 filas          |
| 29 | OK     | n8n_writer inserta en logs                                           | 1 filas          | 1 filas          |
| 30 | OK     | n8n_writer lee facturas_pendientes (vista security_invoker)          | 1 filas          | 1 filas          |
| 31 | OK     | n8n_writer NO puede borrar un lead: sin GRANT DELETE                 | permiso denegado | permiso denegado |
| 32 | OK     | n8n_writer NO puede leer profiles                                    | permiso denegado | permiso denegado |
| 33 | OK     | n8n_writer NO puede leer auth.users: sin USAGE sobre el esquema auth | permiso denegado | permiso denegado |
+----+--------+----------------------------------------------------------------------+------------------+------------------+
(33 rows)

+----------+-----------------+
| casos ok | casos con falla |
+----------+-----------------+
|       33 |               0 |
+----------+-----------------+
(1 row)

DO


✓ La RLS se comporta como la describe el esquema.
```
