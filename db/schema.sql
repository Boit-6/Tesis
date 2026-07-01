-- Schema de la base de datos — CRM Freelance (Soderos S.A.)
-- PostgreSQL / Supabase (se puede ejecutar varias veces).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tipos enumerados
DO $$ BEGIN CREATE TYPE urgencia_tipo AS ENUM ('alta','media','baja');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE servicio_tipo AS ENUM
  ('desarrollo_web','ecommerce','app_movil','automatizacion','diseno_ui','consultoria','soporte');
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

-- Tabla leads
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

-- Tabla facturas (un lead puede tener N facturas)
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

-- Tabla seguimientos (historial de follow-ups)
CREATE TABLE IF NOT EXISTS seguimientos (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id      TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  numero       INT NOT NULL,
  canal        TEXT NOT NULL DEFAULT 'email',
  asunto       TEXT,
  cuerpo       TEXT,
  enviado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla logs (auditoría y errores)
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_leads_estado       ON leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_tier         ON leads(tier);
CREATE INDEX IF NOT EXISTS idx_leads_fecha_ing    ON leads(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_facturas_estado    ON facturas(estado_pago);
CREATE INDEX IF NOT EXISTS idx_facturas_lead      ON facturas(lead_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_lead  ON seguimientos(lead_id);

-- Trigger: mantiene actualizado_en al día en cada UPDATE
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

-- Vista metrics_mensuales (métricas calculadas en vivo)
CREATE OR REPLACE VIEW metrics_mensuales AS
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

-- Vista facturas_pendientes (dias_al_vencimiento: negativo = vencida, 0 = vence hoy)
CREATE OR REPLACE VIEW facturas_pendientes AS
SELECT
  f.*,
  (f.fecha_vencimiento::date - now()::date) AS dias_al_vencimiento
FROM facturas f
WHERE f.estado_pago = 'PENDIENTE';
