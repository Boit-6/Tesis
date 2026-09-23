# evidencia rls

| campo | valor |
| --- | --- |
| comando | `node tests/verificar_rls.mjs` |
| marca temporal (UTC) | 2026-09-23T16:42:15.824Z |
| commit | 095b250fb42b08f2001da58262882944ee0b8232 |
| commit (corto) | 095b250 |
| arbol de trabajo | CON CAMBIOS SIN CONFIRMAR |
| codigo de salida | 0 |
| duracion | 3.0 s |

## salida

```
· Levantando postgres:16-alpine …
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
+----+--------+--------------------------------------------------------------------------------------------+------------------+------------------+
| #  | estado |                                            caso                                            |     esperado     |     obtenido     |
+----+--------+--------------------------------------------------------------------------------------------+------------------+------------------+
|  1 | OK     | anon NO puede leer leads                                                                   | permiso denegado | permiso denegado |
|  2 | OK     | anon NO puede leer facturas                                                                | permiso denegado | permiso denegado |
|  3 | OK     | anon NO puede leer logs                                                                    | permiso denegado | permiso denegado |
|  4 | OK     | anon NO puede leer profiles                                                                | permiso denegado | permiso denegado |
|  5 | OK     | anon NO puede leer metrics_mensuales                                                       | permiso denegado | permiso denegado |
|  6 | OK     | anon NO puede leer facturas_pendientes                                                     | permiso denegado | permiso denegado |
|  7 | OK     | usuario logueado sin rol admin ve 0 leads                                                  | 0 filas          | 0 filas          |
|  8 | OK     | usuario logueado sin rol admin ve 0 facturas                                               | 0 filas          | 0 filas          |
|  9 | OK     | usuario sin rol admin ve 0 en las métricas                                                 | 0 filas          | 0 filas          |
| 10 | OK     | admin lee leads                                                                            | 1 filas          | 1 filas          |
| 11 | OK     | admin lee facturas                                                                         | 1 filas          | 1 filas          |
| 12 | OK     | admin lee facturas_pendientes                                                              | 1 filas          | 1 filas          |
| 13 | OK     | admin lee las métricas                                                                     | 1 filas          | 1 filas          |
| 14 | OK     | el admin NO puede leer logs (auditoría cerrada)                                            | permiso denegado | permiso denegado |
| 15 | OK     | el admin NO puede modificar un lead                                                        | permiso denegado | permiso denegado |
| 16 | OK     | el admin NO puede insertar un lead                                                         | permiso denegado | permiso denegado |
| 17 | OK     | el admin NO puede borrar un lead                                                           | permiso denegado | permiso denegado |
| 18 | OK     | un usuario NO puede darse el rol admin                                                     | permiso denegado | permiso denegado |
| 19 | OK     | un usuario ve sólo su propio profile                                                       | 1 filas          | 1 filas          |
| 20 | OK     | el admin también ve sólo su propio profile                                                 | 1 filas          | 1 filas          |
| 21 | OK     | service_role lee leads                                                                     | 1 filas          | 1 filas          |
| 22 | OK     | service_role lee logs                                                                      | 1 filas          | 1 filas          |
| 23 | OK     | service_role puede escribir                                                                | 1 filas          | 1 filas          |
| 24 | OK     | authenticated sin JWT ve 0 leads                                                           | 0 filas          | 0 filas          |
| 25 | OK     | n8n_writer inserta un lead                                                                 | 1 filas          | 1 filas          |
| 26 | OK     | n8n_writer actualiza el lead que acaba de insertar                                         | 1 filas          | 1 filas          |
| 27 | OK     | n8n_writer lee las dos filas de leads que ya existen                                       | 2 filas          | 2 filas          |
| 28 | OK     | n8n_writer lee logs                                                                        | 1 filas          | 1 filas          |
| 29 | OK     | n8n_writer inserta en logs                                                                 | 1 filas          | 1 filas          |
| 30 | OK     | n8n_writer lee facturas_pendientes (vista security_invoker)                                | 1 filas          | 1 filas          |
| 31 | OK     | n8n_writer NO puede borrar un lead: sin GRANT DELETE                                       | permiso denegado | permiso denegado |
| 32 | OK     | n8n_writer NO puede leer profiles                                                          | permiso denegado | permiso denegado |
| 33 | OK     | n8n_writer NO puede leer auth.users: sin USAGE sobre el esquema auth                       | permiso denegado | permiso denegado |
| 34 | OK     | n8n_writer inserta una factura                                                             | 1 filas          | 1 filas          |
| 35 | OK     | n8n_writer actualiza la factura que acaba de insertar                                      | 1 filas          | 1 filas          |
| 36 | OK     | anon NO puede insertar un lead                                                             | permiso denegado | permiso denegado |
| 37 | OK     | anon NO puede actualizar un lead                                                           | permiso denegado | permiso denegado |
| 38 | OK     | anon NO puede borrar un lead                                                               | permiso denegado | permiso denegado |
| 39 | OK     | las 7 tablas de negocio tienen RLS habilitada y forzada                                    | 7 filas          | 7 filas          |
| 40 | OK     | n8n_writer inserta un seguimiento                                                          | 1 filas          | 1 filas          |
| 41 | OK     | admin lee seguimientos                                                                     | 1 filas          | 1 filas          |
| 42 | OK     | un usuario sin rol admin NO ve seguimientos                                                | 0 filas          | 0 filas          |
| 43 | OK     | anon NO puede leer seguimientos                                                            | permiso denegado | permiso denegado |
| 44 | OK     | n8n_writer inserta en rate_limit_log                                                       | 1 filas          | 1 filas          |
| 45 | OK     | n8n_writer lee rate_limit_log                                                              | 1 filas          | 1 filas          |
| 46 | OK     | n8n_writer NO puede borrar de rate_limit_log: sin GRANT DELETE                             | permiso denegado | permiso denegado |
| 47 | OK     | el admin NO puede leer rate_limit_log: no es parte del tablero                             | permiso denegado | permiso denegado |
| 48 | OK     | anon NO puede leer rate_limit_log                                                          | permiso denegado | permiso denegado |
| 49 | OK     | un registro solo-teléfono (email NULL) sí obtiene su fila en profiles                      | 1 filas          | 1 filas          |
| 50 | OK     | el registro solo-teléfono queda con rol user, no admin                                     | 1 filas          | 1 filas          |
| 51 | OK     | handle_new_user promueve a admin sólo por estar en admin_emails, sin tocar profiles a mano | 1 filas          | 1 filas          |
| 52 | OK     | actualizar un lead bumpea actualizado_en                                                   | 1 filas          | 1 filas          |
+----+--------+--------------------------------------------------------------------------------------------+------------------+------------------+
(52 rows)

+----------+-----------------+
| casos ok | casos con falla |
+----------+-----------------+
|       52 |               0 |
+----------+-----------------+
(1 row)

DO


✓ La RLS se comporta como la describe el esquema.
```
