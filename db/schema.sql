-- =====================================================================
-- Esquema de la base de datos — CRM Freelance
-- PostgreSQL / Supabase. Idempotente: se puede ejecutar varias veces.
--
-- Este archivo es la fuente de verdad del modelo de datos y de la
-- seguridad a nivel de fila (RLS) descrita en la tesis (§4.4, §4.6 y
-- Anexo C; requisitos RNF1 y RNF2).
--
-- Modelo de seguridad:
--   • La ESCRITURA la realiza exclusivamente n8n con la `service_role`
--     key, que evade la RLS por diseño (BYPASSRLS). No se definen
--     políticas de INSERT/UPDATE/DELETE para usuarios finales.
--   • La LECTURA del tablero requiere rol de aplicación `admin`: cada
--     usuario de `auth.users` tiene una fila en `profiles` (creada por
--     trigger) con `role` en {'user','admin'}. Las políticas de SELECT
--     de las tablas de negocio verifican `profiles.role = 'admin'`, no
--     alcanza con estar autenticado.
--   • El rol `anon` (público, sin sesión) no tiene acceso a las tablas
--     de negocio (deny por defecto de la RLS). El formulario público no
--     lee la base: envía los datos a n8n por webhook.
--   • Las vistas se declaran con `security_invoker = true` para que
--     respeten las políticas de las tablas subyacentes.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos enumerados
-- ---------------------------------------------------------------------
DO $$ BEGIN CREATE TYPE urgencia_tipo AS ENUM ('alta','media','baja');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE servicio_tipo AS ENUM
  ('desarrollo_web','ecommerce','app_movil','automatizacion','diseno_ui','consultoria','soporte','marketing','seo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE tier_tipo AS ENUM ('HOT','WARM','COLD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE lead_estado AS ENUM
  ('NUEVO','PROPUESTA_ENVIADA','EN_SEGUIMIENTO','ACEPTADO','FACTURADO','CERRADO','PERDIDO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE pago_estado AS ENUM ('PENDIENTE','COBRADO','VENCIDA','ANULADA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE log_nivel AS ENUM
  ('INFO','RECORDATORIO','HOY','VENCIDA','URGENTE','WARN','ERROR');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Estado del TRABAJO (ejecución del proyecto, distinto del estado del lead/venta)
DO $$ BEGIN CREATE TYPE trabajo_estado AS ENUM ('PENDIENTE','EN_PROGRESO','EN_REVISION','ENTREGADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id                   TEXT UNIQUE NOT NULL,
  nombre                    TEXT NOT NULL,
  email                     TEXT NOT NULL CHECK (position('@' in email) > 1),
  telefono                  TEXT,
  presupuesto               NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (presupuesto >= 0),
  urgencia                  urgencia_tipo NOT NULL DEFAULT 'media',
  servicio                  servicio_tipo NOT NULL DEFAULT 'desarrollo_web',
  descripcion               TEXT,
  fuente                    TEXT DEFAULT 'webhook',
  estado                    lead_estado NOT NULL DEFAULT 'NUEVO',
  estado_trabajo            trabajo_estado NOT NULL DEFAULT 'PENDIENTE',
  score                     INT NOT NULL DEFAULT 0,
  tier                      tier_tipo,
  seguimientos              INT NOT NULL DEFAULT 0,
  operador_asignado         TEXT,
  notas                     TEXT,
  card_id                   TEXT,
  accept_token              UUID NOT NULL DEFAULT gen_random_uuid(),
  fecha_ingreso             TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_propuesta           TIMESTAMPTZ,
  fecha_ultimo_seguimiento  TIMESTAMPTZ,
  fecha_aceptacion          TIMESTAMPTZ,
  fecha_cierre              TIMESTAMPTZ,
  dias_ciclo_completo       INT,
  creado_en                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facturas (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  factura_id             TEXT UNIQUE NOT NULL,
  lead_id                TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  cliente                TEXT NOT NULL,
  email                  TEXT NOT NULL,
  servicio               servicio_tipo,
  monto                  NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  moneda                 TEXT NOT NULL DEFAULT 'USD',
  estado_pago            pago_estado NOT NULL DEFAULT 'PENDIENTE',
  recordatorios_enviados INT NOT NULL DEFAULT 0,
  fecha_emision          TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_vencimiento      TIMESTAMPTZ NOT NULL,
  fecha_cobro            TIMESTAMPTZ,
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seguimientos (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id      TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  numero       INT NOT NULL,
  canal        TEXT NOT NULL DEFAULT 'email',
  asunto       TEXT,
  cuerpo       TEXT,
  enviado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logs (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workflow    TEXT,
  lead_id     TEXT,
  evento      TEXT,
  nivel       log_nivel NOT NULL DEFAULT 'INFO',
  detalle     TEXT,
  error_msg   TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rol de aplicación por usuario (admin ve el tablero interno, user no).
-- Se completa sola vía trigger al registrarse (ver handle_new_user más abajo).
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_estado       ON leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_tier         ON leads(tier);
CREATE INDEX IF NOT EXISTS idx_leads_fecha_ing    ON leads(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_facturas_estado    ON facturas(estado_pago);
CREATE INDEX IF NOT EXISTS idx_facturas_lead      ON facturas(lead_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_lead  ON seguimientos(lead_id);

-- ---------------------------------------------------------------------
-- Trigger: mantiene actualizado_en al día en cada UPDATE
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_actualizado_en() RETURNS trigger AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated ON leads;
CREATE TRIGGER trg_leads_updated
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ---------------------------------------------------------------------
-- Trigger: crea el perfil (rol 'user' por defecto) al registrarse.
-- El único email whitelisteado como 'admin' es admin@gmail.com (usuario
-- de prueba). Para sumar otro admin, actualizar el CASE de acá o correr
-- un UPDATE puntual sobre `profiles` desde el SQL editor de Supabase.
-- `SECURITY DEFINER` es necesario porque el usuario recién registrado
-- todavía no tiene fila en `profiles` desde la que autorizarse solo.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email = 'admin@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill: cuentas ya existentes (creadas antes de este trigger) también
-- necesitan su fila en `profiles`. Idempotente vía ON CONFLICT.
INSERT INTO public.profiles (id, email, role)
SELECT id, email, CASE WHEN email = 'admin@gmail.com' THEN 'admin' ELSE 'user' END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Vistas (con security_invoker: respetan la RLS de las tablas base)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW metrics_mensuales
  WITH (security_invoker = true) AS
WITH lead_mes AS (
  SELECT
    to_char(date_trunc('month', fecha_ingreso), 'YYYY-MM')              AS mes,
    count(*)                                                            AS total_leads,
    count(*) FILTER (WHERE tier = 'HOT')                               AS leads_hot,
    count(*) FILTER (WHERE tier = 'WARM')                              AS leads_warm,
    count(*) FILTER (WHERE estado = 'CERRADO')                         AS leads_cerrados,
    count(*) FILTER (WHERE estado = 'PERDIDO')                         AS leads_perdidos,
    round(100.0 * count(*) FILTER (WHERE estado = 'CERRADO')
                 / NULLIF(count(*), 0), 1)                             AS conversion_pct,
    round(avg(dias_ciclo_completo) FILTER (WHERE estado = 'CERRADO'), 1) AS tiempo_prom_dias
  FROM leads
  GROUP BY 1
),
fact_mes AS (
  SELECT
    to_char(date_trunc('month', fecha_emision), 'YYYY-MM')             AS mes,
    coalesce(sum(monto), 0)                                            AS facturacion,
    coalesce(sum(monto) FILTER (WHERE estado_pago = 'COBRADO'), 0)     AS cobrado,
    coalesce(sum(monto) FILTER (WHERE estado_pago <> 'COBRADO'), 0)    AS pendiente,
    count(*) FILTER (WHERE estado_pago = 'PENDIENTE'
                      AND fecha_vencimiento < now())                   AS facturas_vencidas,
    round(100.0 * coalesce(sum(monto) FILTER (WHERE estado_pago = 'COBRADO'), 0)
                 / NULLIF(sum(monto), 0), 1)                           AS tasa_cobro_pct
  FROM facturas
  GROUP BY 1
)
SELECT
  coalesce(l.mes, f.mes)            AS mes,
  coalesce(l.total_leads, 0)        AS total_leads,
  coalesce(l.leads_hot, 0)          AS leads_hot,
  coalesce(l.leads_warm, 0)         AS leads_warm,
  coalesce(l.leads_cerrados, 0)     AS leads_cerrados,
  coalesce(l.leads_perdidos, 0)     AS leads_perdidos,
  coalesce(l.conversion_pct, 0)     AS conversion_pct,
  coalesce(l.tiempo_prom_dias, 0)   AS tiempo_prom_dias,
  coalesce(f.facturacion, 0)        AS facturacion,
  coalesce(f.cobrado, 0)            AS cobrado,
  coalesce(f.pendiente, 0)          AS pendiente,
  coalesce(f.facturas_vencidas, 0)  AS facturas_vencidas,
  coalesce(f.tasa_cobro_pct, 0)     AS tasa_cobro_pct
FROM lead_mes l
FULL OUTER JOIN fact_mes f ON l.mes = f.mes
ORDER BY mes DESC;

CREATE OR REPLACE VIEW facturas_pendientes
  WITH (security_invoker = true) AS
SELECT
  f.*,
  (f.fecha_vencimiento::date - now()::date) AS dias_al_vencimiento
FROM facturas f
WHERE f.estado_pago = 'PENDIENTE';

-- =====================================================================
-- Seguridad a nivel de fila (RLS) — RNF1, RNF2, §4.6, Anexo C
-- =====================================================================

-- 1) Habilitar RLS en todas las tablas de negocio. Con RLS activa y sin
--    política aplicable, el acceso queda denegado por defecto.
ALTER TABLE leads         ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimientos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;

-- 2) Políticas de LECTURA sobre las tablas que alimentan el tablero.
--    No alcanza con `authenticated`: se exige además `profiles.role =
--    'admin'` (la subconsulta puede leer la propia fila por la política
--    profiles_select_own de más abajo). No se crean políticas de
--    escritura: la inserción/actualización la hace n8n con la
--    service_role (evade RLS).
DROP POLICY IF EXISTS leads_select_authenticated ON leads;
CREATE POLICY leads_select_authenticated ON leads
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS facturas_select_authenticated ON facturas;
CREATE POLICY facturas_select_authenticated ON facturas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS seguimientos_select_authenticated ON seguimientos;
CREATE POLICY seguimientos_select_authenticated ON seguimientos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2.1) `profiles`: cada usuario solo puede leer su propia fila (para que
--      el frontend sepa si mostrar el link al dashboard). Nadie puede
--      escribir su propio rol: solo la service_role o el trigger
--      (SECURITY DEFINER) tocan esta tabla.
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

-- 3) `logs` (auditoría/errores) queda sin política: solo la service_role
--    (que evade la RLS) escribe y consulta. `authenticated` y `anon` no
--    acceden. Es intencional: la auditoría no se expone al tablero.

-- 4) Privilegios de tabla (GRANT). La RLS filtra filas, pero el rol
--    igual necesita el privilegio SELECT sobre el objeto.
GRANT SELECT ON leads, facturas, seguimientos, profiles TO authenticated;
GRANT SELECT ON metrics_mensuales, facturas_pendientes TO authenticated;

-- 5) Escritura de n8n con la `service_role`. En Supabase este rol ya trae
--    privilegios plenos; en un PostgreSQL vanilla (p. ej. el autoalojado
--    del docker-compose) NO, y BYPASSRLS solo evade la RLS, no otorga el
--    privilegio de tabla. Se conceden explícitamente para que funcione en
--    ambos entornos.
GRANT SELECT, INSERT, UPDATE, DELETE ON leads, facturas, seguimientos, logs, profiles TO service_role;
GRANT SELECT ON metrics_mensuales, facturas_pendientes TO service_role;

-- 6) El rol público (`anon`) no debe leer las tablas de negocio ni las
--    vistas. Se revoca explícitamente por si el default privilege de la
--    plataforma lo hubiera otorgado.
REVOKE ALL ON leads, facturas, seguimientos, logs, profiles FROM anon;
REVOKE ALL ON metrics_mensuales, facturas_pendientes FROM anon;

-- Nota: la `service_role` posee además BYPASSRLS, por lo que sus escrituras
-- no quedan sujetas a las políticas de fila.

-- 7) Realtime: el tablero se suscribe a los cambios de `leads`
--    (postgres_changes, §4.2.5 / RNF6 / escenario E7). Se agrega la tabla
--    a la publicación de Supabase, de forma idempotente y sin romper en
--    un PostgreSQL vanilla donde esa publicación no exista.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'leads'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE leads;
    END IF;
  END IF;
END $$;

-- =====================================================================
-- Migraciones para bases YA creadas (idempotentes; no afectan a una base
-- nueva, donde las definiciones de arriba ya incluyen estas columnas/valores)
-- =====================================================================

-- Columna de estado del trabajo (para bases creadas antes de agregarla).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estado_trabajo trabajo_estado NOT NULL DEFAULT 'PENDIENTE';

-- Servicios marketing/seo que ofrece el formulario (para bases ya creadas).
ALTER TYPE servicio_tipo ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE servicio_tipo ADD VALUE IF NOT EXISTS 'seo';
