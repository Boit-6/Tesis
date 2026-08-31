-- Casos de verificación de la RLS descrita en §4.6 y el Anexo C.
--
-- Cada caso asume un rol (anon / authenticated con o sin rol admin /
-- service_role), intenta una operación y registra si el resultado coincide con
-- lo que el modelo de seguridad promete. Un error de permisos NO es una falla
-- del test: en la mayoría de los casos es justamente el resultado esperado.

\set ON_ERROR_STOP on

-- ── Datos de prueba ────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-4111-8111-111111111111', 'admin@gmail.com'),
  ('22222222-2222-4222-8222-222222222222', 'pepe@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- El trigger handle_new_user ya creó los profiles; nos aseguramos de los roles.
UPDATE profiles SET role = 'admin' WHERE email = 'admin@gmail.com';
UPDATE profiles SET role = 'user'  WHERE email = 'pepe@gmail.com';

INSERT INTO leads (lead_id, nombre, email, presupuesto, urgencia, servicio, estado, score, tier)
VALUES ('LD-TEST-0001', 'Cliente de prueba', 'cliente@test.com', 5000, 'alta', 'ecommerce', 'NUEVO', 90, 'HOT')
ON CONFLICT (lead_id) DO NOTHING;

INSERT INTO facturas (factura_id, lead_id, cliente, email, monto, fecha_vencimiento)
VALUES ('FAC-TEST-0001', 'LD-TEST-0001', 'Cliente de prueba', 'cliente@test.com', 5000, now() + interval '10 days')
ON CONFLICT (factura_id) DO NOTHING;

INSERT INTO logs (workflow, lead_id, evento, nivel, detalle)
VALUES ('test', 'LD-TEST-0001', 'alta', 'INFO', 'fila de prueba')
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE resultados (
  n serial, caso text, esperado text, obtenido text, ok boolean
);

-- ── Motor de casos ─────────────────────────────────────────────────────────
-- Corre `consulta` bajo `rol` (y opcionalmente como el usuario `uid`),
-- capturando el error de permisos como un resultado más.
CREATE OR REPLACE FUNCTION probar(
  caso text, rol text, uid text, consulta text, esperado text
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  obtenido text;
  filas bigint;
BEGIN
  BEGIN
    EXECUTE format('SET LOCAL ROLE %I', rol);
    IF uid IS NOT NULL THEN
      EXECUTE format('SET LOCAL request.jwt.claims = %L', json_build_object('sub', uid)::text);
    ELSE
      SET LOCAL request.jwt.claims = '';
    END IF;

    EXECUTE consulta INTO filas;
    obtenido := filas || ' filas';
  EXCEPTION
    WHEN insufficient_privilege THEN obtenido := 'permiso denegado';
    WHEN others THEN obtenido := 'error: ' || SQLERRM;
  END;

  RESET ROLE;
  INSERT INTO resultados (caso, esperado, obtenido, ok) VALUES (caso, esperado, obtenido, obtenido = esperado);
END $$;

-- Los `SELECT probar(...)` no tienen salida útil: silenciamos hasta el reporte.
\o /dev/null

-- ── 1. El público (anon) no accede a nada de negocio ───────────────────────
SELECT probar('anon NO puede leer leads',                'anon', NULL, 'SELECT count(*) FROM leads',               'permiso denegado');
SELECT probar('anon NO puede leer facturas',             'anon', NULL, 'SELECT count(*) FROM facturas',            'permiso denegado');
SELECT probar('anon NO puede leer logs',                 'anon', NULL, 'SELECT count(*) FROM logs',                'permiso denegado');
SELECT probar('anon NO puede leer profiles',             'anon', NULL, 'SELECT count(*) FROM profiles',            'permiso denegado');
SELECT probar('anon NO puede leer metrics_mensuales',    'anon', NULL, 'SELECT count(*) FROM metrics_mensuales',   'permiso denegado');
SELECT probar('anon NO puede leer facturas_pendientes',  'anon', NULL, 'SELECT count(*) FROM facturas_pendientes', 'permiso denegado');

-- ── 2. Estar logueado NO alcanza: hace falta el rol admin ──────────────────
SELECT probar('usuario logueado sin rol admin ve 0 leads',    'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM leads',            '0 filas');
SELECT probar('usuario logueado sin rol admin ve 0 facturas', 'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM facturas',         '0 filas');
SELECT probar('usuario sin rol admin ve 0 en las métricas',   'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM metrics_mensuales', '0 filas');

-- ── 3. El admin sí lee el tablero ──────────────────────────────────────────
SELECT probar('admin lee leads',                'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM leads',               '1 filas');
SELECT probar('admin lee facturas',             'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM facturas',            '1 filas');
SELECT probar('admin lee facturas_pendientes',  'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM facturas_pendientes', '1 filas');
SELECT probar('admin lee las métricas',         'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM metrics_mensuales',   '1 filas');

-- ── 4. La auditoría no se expone al tablero, ni siquiera al admin ──────────
SELECT probar('el admin NO puede leer logs (auditoría cerrada)', 'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM logs', 'permiso denegado');

-- ── 5. Nadie escribe desde el navegador: no hay políticas de escritura ─────
SELECT probar('el admin NO puede modificar un lead',   'authenticated', '11111111-1111-4111-8111-111111111111', 'WITH x AS (UPDATE leads SET nombre = ''hackeado'' WHERE lead_id = ''LD-TEST-0001'' RETURNING 1) SELECT count(*) FROM x', 'permiso denegado');
SELECT probar('el admin NO puede insertar un lead',    'authenticated', '11111111-1111-4111-8111-111111111111', 'WITH x AS (INSERT INTO leads (lead_id, nombre, email) VALUES (''LD-HACK'', ''h'', ''h@h.com'') RETURNING 1) SELECT count(*) FROM x', 'permiso denegado');
SELECT probar('el admin NO puede borrar un lead',      'authenticated', '11111111-1111-4111-8111-111111111111', 'WITH x AS (DELETE FROM leads WHERE lead_id = ''LD-TEST-0001'' RETURNING 1) SELECT count(*) FROM x', 'permiso denegado');

-- ── 6. Escalada de privilegios: nadie se auto-asciende a admin ─────────────
SELECT probar('un usuario NO puede darse el rol admin', 'authenticated', '22222222-2222-4222-8222-222222222222', 'WITH x AS (UPDATE profiles SET role = ''admin'' WHERE id = auth.uid() RETURNING 1) SELECT count(*) FROM x', 'permiso denegado');

-- ── 7. profiles: cada uno ve sólo su propia fila ───────────────────────────
SELECT probar('un usuario ve sólo su propio profile',   'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM profiles', '1 filas');
SELECT probar('el admin también ve sólo su propio profile', 'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM profiles', '1 filas');

-- ── 8. service_role (n8n) escribe y lee todo: evade la RLS por diseño ──────
SELECT probar('service_role lee leads',      'service_role', NULL, 'SELECT count(*) FROM leads', '1 filas');
SELECT probar('service_role lee logs',       'service_role', NULL, 'SELECT count(*) FROM logs',  '1 filas');
SELECT probar('service_role puede escribir', 'service_role', NULL, 'WITH x AS (UPDATE leads SET notas = ''ok'' WHERE lead_id = ''LD-TEST-0001'' RETURNING 1) SELECT count(*) FROM x', '1 filas');

-- ── 9. Sin sesión, `authenticated` no ve nada (auth.uid() nulo) ────────────
SELECT probar('authenticated sin JWT ve 0 leads', 'authenticated', NULL, 'SELECT count(*) FROM leads', '0 filas');

-- ── 10. n8n_writer: el rol acotado que usa la conexión de n8n (S4, §4.6) ───
-- A diferencia de `service_role` (caso 8), este rol NO tiene BYPASSRLS: si
-- puede leer y escribir, es porque las políticas de la sección 5.1 de
-- db/schema.sql se lo permiten, no porque la RLS lo esté ignorando.
SELECT probar('n8n_writer inserta un lead',
  'n8n_writer', NULL,
  'WITH x AS (INSERT INTO leads (lead_id, nombre, email) VALUES (''LD-N8NW-0001'', ''Prueba n8n_writer'', ''n8nwriter@test.com'') RETURNING 1) SELECT count(*) FROM x',
  '1 filas');
SELECT probar('n8n_writer actualiza el lead que acaba de insertar',
  'n8n_writer', NULL,
  'WITH x AS (UPDATE leads SET notas = ''actualizado por n8n_writer'' WHERE lead_id = ''LD-N8NW-0001'' RETURNING 1) SELECT count(*) FROM x',
  '1 filas');
SELECT probar('n8n_writer lee las dos filas de leads que ya existen',
  'n8n_writer', NULL, 'SELECT count(*) FROM leads', '2 filas');
SELECT probar('n8n_writer lee logs',
  'n8n_writer', NULL, 'SELECT count(*) FROM logs', '1 filas');
SELECT probar('n8n_writer inserta en logs',
  'n8n_writer', NULL,
  'WITH x AS (INSERT INTO logs (workflow, evento, nivel, detalle) VALUES (''test'', ''prueba_n8n_writer'', ''INFO'', ''fila de prueba'') RETURNING 1) SELECT count(*) FROM x',
  '1 filas');
SELECT probar('n8n_writer lee facturas_pendientes (vista security_invoker)',
  'n8n_writer', NULL, 'SELECT count(*) FROM facturas_pendientes', '1 filas');
SELECT probar('n8n_writer NO puede borrar un lead: sin GRANT DELETE',
  'n8n_writer', NULL,
  'WITH x AS (DELETE FROM leads WHERE lead_id = ''LD-N8NW-0001'' RETURNING 1) SELECT count(*) FROM x',
  'permiso denegado');
SELECT probar('n8n_writer NO puede leer profiles',
  'n8n_writer', NULL, 'SELECT count(*) FROM profiles', 'permiso denegado');
SELECT probar('n8n_writer NO puede leer auth.users: sin USAGE sobre el esquema auth',
  'n8n_writer', NULL, 'SELECT count(*) FROM auth.users', 'permiso denegado');

-- ── Reporte ────────────────────────────────────────────────────────────────
\o
\pset border 2
SELECT
  lpad(n::text, 2)                                  AS "#",
  CASE WHEN ok THEN 'OK' ELSE 'FALLA' END           AS "estado",
  caso                                              AS "caso",
  esperado                                          AS "esperado",
  obtenido                                          AS "obtenido"
FROM resultados ORDER BY n;

SELECT count(*) FILTER (WHERE ok) AS "casos ok", count(*) FILTER (WHERE NOT ok) AS "casos con falla" FROM resultados;

-- Corta con código de salida != 0 si algún caso falló.
DO $$
DECLARE fallas int;
BEGIN
  SELECT count(*) INTO fallas FROM resultados WHERE NOT ok;
  IF fallas > 0 THEN
    RAISE EXCEPTION 'La verificación de RLS falló en % caso(s)', fallas;
  END IF;
END $$;
