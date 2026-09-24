-- Casos de verificación de la RLS descrita en §4.6 y el Anexo C.
--
-- Cada caso asume un rol (anon / authenticated con o sin rol admin /
-- service_role), intenta una operación y registra si el resultado coincide con
-- lo que el modelo de seguridad promete. Un error de permisos NO es una falla
-- del test: en la mayoría de los casos es justamente el resultado esperado.

\set ON_ERROR_STOP on

-- ── Datos de prueba ────────────────────────────────────────────────────────
-- Dos desarrolladores con la cuenta confirmada, cada uno con su espacio (lo
-- crea el trigger al confirmar), y una cuenta sin confirmar, que no tiene.
-- 1111 es además el admin de la plataforma: el rol no le da acceso a nada
-- ajeno, sólo decide a qué espacio van los leads que llegan sin espacio
-- (transitorio, ver leads_espacio_por_defecto).
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES
  ('11111111-1111-4111-8111-111111111111', 'admin@gmail.com', now()),
  ('22222222-2222-4222-8222-222222222222', 'pepe@gmail.com', now()),
  ('66666666-6666-4666-8666-666666666666', 'sin-confirmar@gmail.com', NULL)
ON CONFLICT (id) DO NOTHING;

-- El trigger handle_new_user ya creó los profiles; nos aseguramos de los roles.
UPDATE profiles SET role = 'admin' WHERE email = 'admin@gmail.com';
UPDATE profiles SET role = 'user'  WHERE email = 'pepe@gmail.com';

INSERT INTO leads (lead_id, espacio_id, nombre, email, presupuesto, urgencia, servicio, estado, score, tier)
VALUES ('LD-TEST-0001', (SELECT id FROM espacios WHERE dueno_id = '11111111-1111-4111-8111-111111111111'),
        'Cliente de prueba', 'cliente@test.com', 5000, 'alta', 'ecommerce', 'NUEVO', 90, 'HOT'),
       ('LD-PEPE-0001', (SELECT id FROM espacios WHERE dueno_id = '22222222-2222-4222-8222-222222222222'),
        'Cliente de Pepe', 'otro@test.com', 1000, 'media', 'desarrollo_web', 'NUEVO', 40, 'WARM')
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

-- ── 2. Cada desarrollador ve sólo lo de su espacio ─────────────────────────
SELECT probar('Pepe ve sólo su lead, no el del otro espacio',  'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM leads',            '1 filas');
SELECT probar('Pepe NO ve el lead del otro espacio por su id', 'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM leads WHERE lead_id = ''LD-TEST-0001''', '0 filas');
SELECT probar('Pepe NO ve las facturas del otro espacio',      'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM facturas',         '0 filas');
SELECT probar('las métricas de Pepe son sólo las suyas',       'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT sum(total_leads)::bigint FROM metrics_mensuales', '1 filas');
SELECT probar('una cuenta sin confirmar no tiene espacio ni ve leads', 'authenticated', '66666666-6666-4666-8666-666666666666', 'SELECT count(*) FROM leads', '0 filas');
SELECT probar('una cuenta sin confirmar no ve métricas',       'authenticated', '66666666-6666-4666-8666-666666666666', 'SELECT count(*) FROM metrics_mensuales', '0 filas');

-- ── 3. El dueño lee el tablero de su espacio ───────────────────────────────
SELECT probar('admin lee leads (sólo los de su espacio)', 'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM leads',               '1 filas');
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
SELECT probar('service_role lee los leads de todos los espacios', 'service_role', NULL, 'SELECT count(*) FROM leads', '2 filas');
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
SELECT probar('n8n_writer lee los leads de todos los espacios',
  'n8n_writer', NULL, 'SELECT count(*) FROM leads', '3 filas');
SELECT probar('un lead que llega sin espacio va al del admin (transitorio, hasta /f/<slug>)',
  'service_role', NULL,
  'SELECT count(*) FROM leads l JOIN espacios e ON e.id = l.espacio_id WHERE l.lead_id = ''LD-N8NW-0001'' AND e.dueno_id = ''11111111-1111-4111-8111-111111111111''',
  '1 filas');
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

-- ── 11. n8n_writer también escribe facturas, no sólo leads/logs ────────────
SELECT probar('n8n_writer inserta una factura',
  'n8n_writer', NULL,
  'WITH x AS (INSERT INTO facturas (factura_id, lead_id, cliente, email, monto, fecha_vencimiento) VALUES (''FAC-N8NW-0001'', ''LD-TEST-0001'', ''Cliente de prueba'', ''cliente@test.com'', 1000, now() + interval ''5 days'') RETURNING 1) SELECT count(*) FROM x',
  '1 filas');
SELECT probar('n8n_writer actualiza la factura que acaba de insertar',
  'n8n_writer', NULL,
  'WITH x AS (UPDATE facturas SET estado_pago = ''COBRADO'' WHERE factura_id = ''FAC-N8NW-0001'' RETURNING 1) SELECT count(*) FROM x',
  '1 filas');

-- ── 12. anon no escribe nada, no sólo "no lee" ─────────────────────────────
SELECT probar('anon NO puede insertar un lead',
  'anon', NULL,
  'WITH x AS (INSERT INTO leads (lead_id, nombre, email) VALUES (''LD-ANON-HACK'', ''h'', ''h@h.com'') RETURNING 1) SELECT count(*) FROM x',
  'permiso denegado');
SELECT probar('anon NO puede actualizar un lead',
  'anon', NULL,
  'WITH x AS (UPDATE leads SET nombre = ''hackeado'' WHERE lead_id = ''LD-TEST-0001'' RETURNING 1) SELECT count(*) FROM x',
  'permiso denegado');
SELECT probar('anon NO puede borrar un lead',
  'anon', NULL,
  'WITH x AS (DELETE FROM leads WHERE lead_id = ''LD-TEST-0001'' RETURNING 1) SELECT count(*) FROM x',
  'permiso denegado');

-- ── 13. La RLS está habilitada Y forzada en las 9 tablas de negocio ────────
-- No alcanza con que cada caso de arriba dé el resultado esperado: si a una
-- tabla nueva se le olvida `ENABLE`/`FORCE ROW LEVEL SECURITY`, este es el
-- único caso que lo detecta directo contra el catálogo, sin depender de que
-- alguien se acuerde de sumarle sus propios casos de permisos.
SELECT probar('las 9 tablas de negocio tienen RLS habilitada y forzada',
  'service_role', NULL,
  'SELECT count(*) FROM pg_class WHERE relname IN (''leads'',''facturas'',''seguimientos'',''logs'',''profiles'',''rate_limit_log'',''admin_emails'',''tickets'',''espacios'') AND relrowsecurity AND relforcerowsecurity',
  '9 filas');

-- ── 14. seguimientos: mismo patrón de acceso que facturas ──────────────────
SELECT probar('n8n_writer inserta un seguimiento',
  'n8n_writer', NULL,
  'WITH x AS (INSERT INTO seguimientos (lead_id, numero, canal) VALUES (''LD-TEST-0001'', 1, ''email'') RETURNING 1) SELECT count(*) FROM x',
  '1 filas');
SELECT probar('admin lee seguimientos',
  'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM seguimientos', '1 filas');
SELECT probar('Pepe NO ve los seguimientos del otro espacio',
  'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM seguimientos', '0 filas');
SELECT probar('anon NO puede leer seguimientos',
  'anon', NULL, 'SELECT count(*) FROM seguimientos', 'permiso denegado');

-- ── 15. rate_limit_log: sólo n8n_writer (S1) y service_role, nadie más ─────
SELECT probar('n8n_writer inserta en rate_limit_log',
  'n8n_writer', NULL,
  'WITH x AS (INSERT INTO rate_limit_log (ip_o_clave, ruta) VALUES (''127.0.0.1'', ''lead/nuevo'') RETURNING 1) SELECT count(*) FROM x',
  '1 filas');
SELECT probar('n8n_writer lee rate_limit_log',
  'n8n_writer', NULL, 'SELECT count(*) FROM rate_limit_log', '1 filas');
SELECT probar('n8n_writer NO puede borrar de rate_limit_log: sin GRANT DELETE',
  'n8n_writer', NULL,
  'WITH x AS (DELETE FROM rate_limit_log WHERE ip_o_clave = ''127.0.0.1'' RETURNING 1) SELECT count(*) FROM x',
  'permiso denegado');
SELECT probar('el admin NO puede leer rate_limit_log: no es parte del tablero',
  'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM rate_limit_log', 'permiso denegado');
SELECT probar('anon NO puede leer rate_limit_log',
  'anon', NULL, 'SELECT count(*) FROM rate_limit_log', 'permiso denegado');

-- ── 16. Registro solo-teléfono (F1.2) y promoción a admin vía admin_emails ─
-- El registro solo-teléfono se hace con el rol de conexión de este script
-- (no con `probar()`, que cambiaría de rol): igual que las dos filas de
-- auth.users del principio del archivo.
INSERT INTO auth.users (id, email) VALUES ('33333333-3333-4333-8333-333333333333', NULL);
SELECT probar('un registro solo-teléfono (email NULL) sí obtiene su fila en profiles',
  'service_role', NULL,
  'SELECT count(*) FROM profiles WHERE id = ''33333333-3333-4333-8333-333333333333''',
  '1 filas');
SELECT probar('el registro solo-teléfono queda con rol user, no admin',
  'service_role', NULL,
  'SELECT count(*) FROM profiles WHERE id = ''33333333-3333-4333-8333-333333333333'' AND role = ''user''',
  '1 filas');

INSERT INTO admin_emails (email) VALUES ('nuevo-admin@test.com'), ('confirma-despues@test.com') ON CONFLICT DO NOTHING;
-- Con "Confirm email" desactivado, Supabase trae email_confirmed_at en el INSERT.
INSERT INTO auth.users (id, email, email_confirmed_at) VALUES ('44444444-4444-4444-8444-444444444444', 'nuevo-admin@test.com', now());
SELECT probar('handle_new_user promueve a admin sólo por estar en admin_emails, sin tocar profiles a mano',
  'service_role', NULL,
  'SELECT count(*) FROM profiles WHERE id = ''44444444-4444-4444-8444-444444444444'' AND role = ''admin''',
  '1 filas');

-- ── 16.1 La whitelist no alcanza sin probar que el email es propio ─────────
SELECT probar('el esquema no trae ningún admin precargado (antes: admin@gmail.com)',
  'service_role', NULL, 'SELECT count(*) FROM admin_emails WHERE email = ''admin@gmail.com''', '0 filas');

INSERT INTO auth.users (id, email) VALUES ('55555555-5555-4555-8555-555555555555', 'confirma-despues@test.com');
SELECT probar('un email de la whitelist SIN confirmar queda como user',
  'service_role', NULL,
  'SELECT count(*) FROM profiles WHERE id = ''55555555-5555-4555-8555-555555555555'' AND role = ''user''',
  '1 filas');

UPDATE auth.users SET email_confirmed_at = now() WHERE id = '55555555-5555-4555-8555-555555555555';
SELECT probar('al confirmar el email, pasa a admin',
  'service_role', NULL,
  'SELECT count(*) FROM profiles WHERE id = ''55555555-5555-4555-8555-555555555555'' AND role = ''admin''',
  '1 filas');

UPDATE profiles SET role = 'user' WHERE id = '55555555-5555-4555-8555-555555555555';
UPDATE auth.users SET email_confirmed_at = now() + interval '1 second' WHERE id = '55555555-5555-4555-8555-555555555555';
SELECT probar('un admin bajado a mano no vuelve a subir por otro cambio de la cuenta',
  'service_role', NULL,
  'SELECT count(*) FROM profiles WHERE id = ''55555555-5555-4555-8555-555555555555'' AND role = ''user''',
  '1 filas');

-- ── 16.2 Tickets: el tablero escribe, pero sólo en su espacio ─────────────
INSERT INTO tickets (id, titulo) VALUES ('99999999-9999-4999-8999-999999999999', 'Ticket de prueba');
SELECT probar('anon NO puede leer tickets', 'anon', NULL, 'SELECT count(*) FROM tickets', 'permiso denegado');
SELECT probar('anon NO puede leer tickets_tablero', 'anon', NULL, 'SELECT count(*) FROM tickets_tablero', 'permiso denegado');
SELECT probar('Pepe no ve los tickets del otro espacio',
  'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM tickets_tablero', '0 filas');
SELECT probar('una cuenta sin espacio NO puede crear tickets',
  'authenticated', '66666666-6666-4666-8666-666666666666',
  'WITH x AS (INSERT INTO tickets (titulo) VALUES (''intruso'') RETURNING 1) SELECT count(*) FROM x', 'permiso denegado');
SELECT probar('Pepe NO puede mover los tickets del otro espacio (0 filas afectadas)',
  'authenticated', '22222222-2222-4222-8222-222222222222',
  'WITH x AS (UPDATE tickets SET estado = ''HECHO'' RETURNING 1) SELECT count(*) FROM x', '0 filas');
SELECT probar('Pepe crea un ticket y queda en su espacio',
  'authenticated', '22222222-2222-4222-8222-222222222222',
  'WITH x AS (INSERT INTO tickets (titulo) VALUES (''de Pepe'') RETURNING espacio_id) SELECT count(*) FROM x JOIN espacios e ON e.id = x.espacio_id WHERE e.dueno_id = auth.uid()', '1 filas');
SELECT probar('Pepe NO puede colgar un ticket del lead de otro espacio',
  'authenticated', '22222222-2222-4222-8222-222222222222',
  'WITH x AS (INSERT INTO tickets (titulo, lead_id) VALUES (''colado'', ''LD-TEST-0001'') RETURNING 1) SELECT count(*) FROM x', 'permiso denegado');
-- El id del espacio ajeno se arma acá afuera, como postgres: Pepe no podría
-- leerlo, pero alguien podría adivinarlo o haberlo visto.
SELECT probar('Pepe NO puede crear un ticket en el espacio de otro',
  'authenticated', '22222222-2222-4222-8222-222222222222',
  format('WITH x AS (INSERT INTO tickets (titulo, espacio_id) VALUES (''colado'', %L) RETURNING 1) SELECT count(*) FROM x',
         (SELECT id FROM espacios WHERE dueno_id = '11111111-1111-4111-8111-111111111111')),
  'permiso denegado');
SELECT probar('Pepe NO puede llevarse su ticket a otro espacio',
  'authenticated', '22222222-2222-4222-8222-222222222222',
  'WITH x AS (UPDATE tickets SET lead_id = ''LD-TEST-0001'' WHERE titulo = ''de Pepe'' RETURNING 1) SELECT count(*) FROM x', 'permiso denegado');
SELECT probar('el admin ve los tickets en el tablero',
  'authenticated', '11111111-1111-4111-8111-111111111111', 'SELECT count(*) FROM tickets_tablero', '1 filas');
SELECT probar('el admin puede crear un ticket',
  'authenticated', '11111111-1111-4111-8111-111111111111',
  'WITH x AS (INSERT INTO tickets (titulo) VALUES (''desde el tablero'') RETURNING 1) SELECT count(*) FROM x', '1 filas');
SELECT probar('el admin puede mover un ticket',
  'authenticated', '11111111-1111-4111-8111-111111111111',
  'WITH x AS (UPDATE tickets SET estado = ''EN_CURSO'' WHERE titulo = ''Ticket de prueba'' RETURNING 1) SELECT count(*) FROM x', '1 filas');
SELECT probar('nadie borra tickets desde el tablero',
  'authenticated', '11111111-1111-4111-8111-111111111111',
  'WITH x AS (DELETE FROM tickets RETURNING 1) SELECT count(*) FROM x', 'permiso denegado');
SELECT probar('n8n_writer puede sembrar tickets',
  'n8n_writer', NULL,
  'WITH x AS (INSERT INTO tickets (titulo, origen) VALUES (''sembrado'', ''CRM'') RETURNING 1) SELECT count(*) FROM x', '1 filas');

-- ── 17. set_actualizado_en: el trigger de leads corre de verdad ────────────
-- `antes` y `upd` comparten el mismo snapshot (misma semántica de la CTE que
-- causó el bug de rate limiting corregido en Fase 0): `antes` lee el valor
-- previo a este UPDATE, no el que el propio UPDATE está por escribir.
SELECT probar('actualizar un lead bumpea actualizado_en',
  'service_role', NULL,
  'WITH antes AS (SELECT actualizado_en FROM leads WHERE lead_id = ''LD-TEST-0001''), upd AS (UPDATE leads SET notas = ''trigger-check'' WHERE lead_id = ''LD-TEST-0001'' RETURNING actualizado_en) SELECT count(*) FROM upd, antes WHERE upd.actualizado_en > antes.actualizado_en',
  '1 filas');

-- ── 18. Espacios: uno por cuenta confirmada, y cada uno ve el suyo ─────────
SELECT probar('cada cuenta confirmada tiene su espacio; la sin confirmar, no',
  'service_role', NULL,
  'SELECT count(*) FROM espacios WHERE dueno_id IN (''11111111-1111-4111-8111-111111111111'', ''22222222-2222-4222-8222-222222222222'', ''66666666-6666-4666-8666-666666666666'')',
  '2 filas');
SELECT probar('un desarrollador ve sólo su espacio',
  'authenticated', '22222222-2222-4222-8222-222222222222', 'SELECT count(*) FROM espacios', '1 filas');
SELECT probar('anon NO puede leer espacios', 'anon', NULL, 'SELECT count(*) FROM espacios', 'permiso denegado');
SELECT probar('un desarrollador NO puede quedarse con el espacio de otro',
  'authenticated', '22222222-2222-4222-8222-222222222222',
  'WITH x AS (UPDATE espacios SET dueno_id = auth.uid() RETURNING 1) SELECT count(*) FROM x', 'permiso denegado');
SELECT probar('n8n_writer no lee espacios (todavía no le hace falta)',
  'n8n_writer', NULL, 'SELECT count(*) FROM espacios', 'permiso denegado');

UPDATE auth.users SET email_confirmed_at = now() WHERE id = '66666666-6666-4666-8666-666666666666';
SELECT probar('al confirmar la cuenta se crea su espacio',
  'authenticated', '66666666-6666-4666-8666-666666666666', 'SELECT count(*) FROM espacios', '1 filas');

-- ── 19. Lo que cuelga de un lead es siempre del espacio del lead ──────────
SELECT probar('una factura hereda el espacio de su lead aunque n8n mande otro',
  'n8n_writer', NULL,
  format('WITH x AS (INSERT INTO facturas (factura_id, lead_id, espacio_id, cliente, email, monto, fecha_vencimiento) VALUES (''FAC-PEPE-0001'', ''LD-PEPE-0001'', %L, ''c'', ''c@c.com'', 10, now() + interval ''5 days'') RETURNING espacio_id) SELECT count(*) FROM x JOIN leads l ON l.espacio_id = x.espacio_id WHERE l.lead_id = ''LD-PEPE-0001''',
         (SELECT id FROM espacios WHERE dueno_id = '11111111-1111-4111-8111-111111111111')),
  '1 filas');
SELECT probar('un log de un lead queda en el espacio del lead',
  'service_role', NULL,
  'SELECT count(*) FROM logs g JOIN leads l USING (lead_id) WHERE g.lead_id = ''LD-TEST-0001'' AND g.espacio_id = l.espacio_id',
  '1 filas');

-- Un pedido que pasa a otro espacio (lo que va a hacer la bolsa de
-- proyectos) se lleva sus facturas, seguimientos, tickets y logs.
UPDATE leads SET espacio_id = (SELECT id FROM espacios WHERE dueno_id = '22222222-2222-4222-8222-222222222222')
WHERE lead_id = 'LD-TEST-0001';
SELECT probar('al mover un lead de espacio, sus facturas lo siguen',
  'authenticated', '22222222-2222-4222-8222-222222222222',
  'SELECT count(*) FROM facturas WHERE lead_id = ''LD-TEST-0001''', '2 filas');
SELECT probar('al mover un lead de espacio, sus seguimientos lo siguen',
  'authenticated', '22222222-2222-4222-8222-222222222222',
  'SELECT count(*) FROM seguimientos WHERE lead_id = ''LD-TEST-0001''', '1 filas');
SELECT probar('y el dueño anterior deja de verlo',
  'authenticated', '11111111-1111-4111-8111-111111111111',
  'SELECT count(*) FROM facturas WHERE lead_id = ''LD-TEST-0001''', '0 filas');

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
