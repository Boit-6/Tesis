-- =====================================================================
-- Esquema de la base de datos — CRM Freelance
-- PostgreSQL / Supabase. Idempotente: se puede ejecutar varias veces.
--
-- Este archivo es la fuente de verdad del modelo de datos y de la
-- seguridad a nivel de fila (RLS) descrita en la tesis (§4.4, §4.6 y
-- Anexo C; requisitos RNF1 y RNF2).
--
-- Modelo de seguridad:
--   • La ESCRITURA la realiza n8n con el rol `n8n_writer`: sin BYPASSRLS,
--     con políticas propias de SELECT/INSERT/UPDATE sobre leads, facturas,
--     seguimientos y logs (nunca profiles) y sin privilegio de DELETE,
--     porque ningún nodo del flujo borra filas. Cierra S4 de la Tabla 11
--     de la tesis: si esta credencial se filtra, el radio de daño queda
--     acotado a esas cuatro tablas, no a la base entera. `service_role`
--     sigue existiendo (GRANT más abajo) para uso administrativo puntual,
--     pero deja de ser la credencial que usa la conexión de n8n.
--   • La plataforma es compartida: cada desarrollador tiene un ESPACIO
--     (tabla `espacios`, se crea al confirmar la cuenta) y todas las filas
--     de negocio llevan `espacio_id`. La LECTURA del tablero exige que la
--     fila sea del espacio de quien consulta; estar autenticado no alcanza.
--     `profiles.role = 'admin'` queda para el administrador de la
--     plataforma y no da acceso a los datos de ningún espacio.
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

-- Espacios (23-sep-2026): la plataforma pasa a ser compartida. Cada
-- desarrollador que se registra tiene el suyo, con su marca, y todo lo de
-- negocio (leads, facturas, seguimientos, tickets, logs) pertenece a un
-- espacio. La RLS deja ver a cada uno sólo lo de su espacio.
-- `dueno_id` UNIQUE: un espacio por cuenta. ON DELETE SET NULL y no CASCADE:
-- las facturas son registro contable y no se pueden ir con la cuenta.
CREATE TABLE IF NOT EXISTS espacios (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificador público del formulario (/f/<slug>).
  slug       TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  -- La marca que ve el cliente en el formulario, los correos y la factura.
  nombre     TEXT NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 80),
  dueno_id   UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id                        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id                   TEXT UNIQUE NOT NULL,
  espacio_id                UUID NOT NULL REFERENCES espacios(id),
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
  accept_token              UUID NOT NULL DEFAULT gen_random_uuid(),
  -- Vigencia del enlace de aceptación. La estampa n8n al enviar la propuesta
  -- (`now() + TOKEN_VIGENCIA_DIAS`) y la revalidan todas las consultas que
  -- aceptan el token. NULL = sin vencimiento (leads anteriores a la columna).
  token_expira_en           TIMESTAMPTZ,
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
  -- Siempre el del lead: lo fija el trigger trg_facturas_espacio.
  espacio_id             UUID NOT NULL REFERENCES espacios(id),
  -- RESTRICT (no CASCADE): las facturas son el registro financiero/legal del
  -- negocio. Un DELETE FROM leads (vía service_role, que evade RLS) no puede
  -- llevarse puestas las facturas asociadas en silencio.
  lead_id                TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE RESTRICT,
  cliente                TEXT NOT NULL,
  email                  TEXT NOT NULL,
  servicio               servicio_tipo,
  monto                  NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  -- 'ARS', no 'USD': el workflow (MP_CURRENCY) siempre factura en pesos por
  -- defecto. El default anterior no coincidía con lo que de hecho se escribe.
  moneda                 TEXT NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS','USD')),
  estado_pago            pago_estado NOT NULL DEFAULT 'PENDIENTE',
  recordatorios_enviados INT NOT NULL DEFAULT 0,
  fecha_emision          TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_vencimiento      TIMESTAMPTZ NOT NULL,
  fecha_cobro            TIMESTAMPTZ,
  -- Cobro real con MercadoPago (RAMA 8). `mp_preference_id` se guarda al
  -- generarse la factura; `mp_payment_id` recién al confirmarse el pago vía
  -- notificación. `comision_plataforma` es lo que se reserva la plataforma
  -- sobre `monto` (MP_COMISION_PORCENTAJE, 1% por defecto) — se calcula al
  -- facturar y es contable: no se transfiere sola, queda anotada para
  -- liquidar aparte (ver docs/modulo-pagos.md).
  mp_preference_id       TEXT,
  mp_payment_id          TEXT,
  comision_plataforma    NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- NULL = todavía no se confirmó el envío del PDF inicial por Gmail (falla
  -- de Gotenberg o de Gmail después de insertada la factura). No dispara un
  -- reintento por sí sola: el cron de recordatorios de pago ya avisa al
  -- cliente con el link igual, aunque nunca haya recibido el PDF. Sirve para
  -- poder auditar cuántas facturas quedaron así.
  fecha_envio_email      TIMESTAMPTZ,
  creado_en              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seguimientos (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id      TEXT NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
  espacio_id   UUID NOT NULL REFERENCES espacios(id),
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
  -- NULL en los eventos que no son de un lead (crons, errores generales).
  espacio_id  UUID REFERENCES espacios(id),
  evento      TEXT,
  nivel       log_nivel NOT NULL DEFAULT 'INFO',
  detalle     TEXT,
  error_msg   TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rol de aplicación por usuario. 'admin' es el administrador de la plataforma
-- y no da acceso a los datos de ningún espacio (ver la sección de RLS).
-- Se completa sola vía trigger al registrarse (ver handle_new_user más abajo).
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Supabase Auth admite registros solo-teléfono (email=NULL): antes esta
  -- columna era NOT NULL y el INSERT del trigger handle_new_user() abortaba
  -- para esos usuarios, dejando la cuenta sin fila en profiles.
  email      TEXT,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Whitelist de admins editable sin tocar este archivo (antes era un string
-- literal comparado en handle_new_user(), lo que además de forzar un cambio
-- de schema para sumar un admin, era un vector de privilege escalation: quien
-- sea que registrara esa dirección exacta se auto-promovía). Sin RLS propia:
-- solo la consulta el trigger SECURITY DEFINER y se administra a mano vía
-- service_role, igual que el resto de las tablas sin política para
-- authenticated/anon.
CREATE TABLE IF NOT EXISTS admin_emails (
  email TEXT PRIMARY KEY
);
-- Sin semilla a propósito. Hasta el 23-sep-2026 se insertaba 'admin@gmail.com',
-- una casilla pública real: quien fuera su dueño se registraba y quedaba admin.
-- Para dar de alta al administrador, una vez y con la dirección real:
--   INSERT INTO admin_emails (email) VALUES ('tu-correo@dominio.com');
-- En una base ya creada, esa fila vieja sigue ahí hasta que se borre a mano
-- (DELETE FROM admin_emails WHERE email = 'admin@gmail.com'); no se borra
-- desde acá por si esa era, de verdad, la dirección del administrador.

-- Tickets: el tablero de trabajo del panel. Hasta el 23-sep-2026 vivían en una
-- base de Notion y n8n hacía de traductor; ahora son una tabla más, con RLS,
-- tiempo real y la regla de envejecimiento en SQL (ticket_dias_escalada más
-- abajo y el cron del workflow de tickets).
DO $$ BEGIN CREATE TYPE ticket_estado AS ENUM ('BACKLOG','EN_CURSO','BLOQUEADO','HECHO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- El orden del enum ES la escala: el cron sube al valor siguiente.
DO $$ BEGIN CREATE TYPE ticket_prioridad AS ENUM ('BAJA','MEDIA','ALTA','CRITICA');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS tickets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  espacio_id         UUID NOT NULL REFERENCES espacios(id),
  titulo             TEXT NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 200),
  estado             ticket_estado NOT NULL DEFAULT 'BACKLOG',
  prioridad          ticket_prioridad NOT NULL DEFAULT 'MEDIA',
  prioridad_inicial  ticket_prioridad NOT NULL DEFAULT 'MEDIA',
  etiquetas          TEXT[] NOT NULL DEFAULT '{}',
  origen             TEXT NOT NULL DEFAULT 'DASHBOARD' CHECK (origen IN ('DASHBOARD','CRM')),
  -- El proyecto al que pertenece, si lo sembró la aceptación de una propuesta.
  lead_id            TEXT REFERENCES leads(lead_id) ON DELETE SET NULL,
  notas              TEXT CHECK (notas IS NULL OR length(notas) <= 2000),
  vence              DATE,
  escaladas          INT NOT NULL DEFAULT 0,
  -- Último cambio de estado o de prioridad (incluida una escalada): es el
  -- reloj del envejecimiento. Lo mantiene el trigger trg_tickets_movimiento.
  ultimo_movimiento  TIMESTAMPTZ NOT NULL DEFAULT now(),
  cerrado_en         TIMESTAMPTZ,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registro de invocaciones por IP/clave y ruta, para el rate limiting básico
-- de los cinco webhooks públicos que no admiten autenticación de origen
-- (Tabla 11, S1: lead/nuevo, lead-propuesta, lead-acepta, lead-rechaza,
-- lead-modifica — los invoca el navegador de un tercero, así que no puede
-- llevar un secreto compartido sin exponerlo). Cada invocación de esas rutas
-- inserta una fila acá antes de seguir; el propio nodo Postgres cuenta cuántas
-- hubo desde la misma clave en la ventana reciente y corta la cadena si se
-- pasó del umbral (ver workflow/crm_postgres.json, nodos «Postgres - Rate
-- Limit (...)» y docs/verificacion-y-seguridad.md §5.3.1).
-- `ip_o_clave` es la IP de origen para los cuatro webhooks de token, y el
-- email declarado en el propio formulario (si vino) para `lead/nuevo`.
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_o_clave  TEXT NOT NULL,
  ruta        TEXT NOT NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Limpieza periódica (pendiente, documentada y no implementada): esta tabla
-- crece sin techo, igual que `logs`. No hay un cron dedicado a purgarla; se
-- podría sumar `DELETE FROM rate_limit_log WHERE creado_en < now() - interval
-- '7 days';` al cron ♻️ Cron - Reconciliar Facturas (RAMA 9, cada 30 minutos)
-- o a uno propio. No se implementó acá porque `n8n_writer` está deliberadamente
-- sin privilegio de DELETE (ningún nodo del flujo borra filas hoy — ver 5.1
-- más abajo) y sumarle uno solo para esta tabla rompería esa invariante sin
-- necesidad real a la escala del MVP.

-- =====================================================================
-- Migraciones para bases YA creadas (idempotentes; no afectan a una base
-- nueva, donde las definiciones de arriba ya incluyen estas columnas/valores)
--
-- Tienen que ir ACÁ, entre las tablas y los índices, y no al final del
-- archivo: los índices y las vistas de más abajo referencian estas columnas.
-- Sobre una base nueva da igual el orden, porque los CREATE TABLE ya las
-- traen; sobre una base vieja, en cambio, el índice se crearía antes de que
-- exista la columna y el script aborta.
-- =====================================================================

-- Notion salió del sistema (23-sep-2026): el lead ya no tiene una tarjeta
-- espejo, así que `card_id` no apunta a nada.
ALTER TABLE leads DROP COLUMN IF EXISTS card_id;

-- Columna de estado del trabajo (para bases creadas antes de agregarla).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estado_trabajo trabajo_estado NOT NULL DEFAULT 'PENDIENTE';

-- Vigencia del enlace de aceptación (para bases ya creadas). Se deja NULL en
-- las filas existentes: los enlaces ya emitidos siguen siendo válidos y las
-- consultas los aceptan con `token_expira_en IS NULL`.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS token_expira_en TIMESTAMPTZ;

-- Servicios marketing/seo que ofrece el formulario (para bases ya creadas).
ALTER TYPE servicio_tipo ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE servicio_tipo ADD VALUE IF NOT EXISTS 'seo';

-- Coherencia de fechas de facturación. NOT VALID: se aplica a las filas nuevas
-- sin exigir que las existentes la cumplan, para que el script siga siendo
-- ejecutable sobre una base con datos.
DO $$ BEGIN
  ALTER TABLE facturas ADD CONSTRAINT chk_facturas_fechas
    CHECK (fecha_vencimiento >= fecha_emision) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Cobro real con MercadoPago (para bases ya creadas). Ver RAMA 8 del
-- workflow y docs/modulo-pagos.md.
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS mp_preference_id TEXT;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS mp_payment_id TEXT;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS comision_plataforma NUMERIC(12,2) NOT NULL DEFAULT 0;
DO $$ BEGIN
  ALTER TABLE facturas ADD CONSTRAINT chk_facturas_comision
    CHECK (comision_plataforma >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Enlace de pago de la factura (para bases ya creadas). Se calculaba al emitir
-- el comprobante y vivía sólo en esa ejecución, de modo que los recordatorios
-- de vencimiento —que leen la factura días después— reclamaban el pago sin
-- poder ofrecer ninguna forma de hacerlo. Guardarlo con la factura, que es de
-- lo que es propiedad, permite que cualquier aviso posterior lo incluya.
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS pay_url TEXT;

-- Token del modo de desarrollo de pago (S1 de la Tabla 11, para bases ya
-- creadas). El endpoint GET /webhook/pago-confirmado sólo exigía factura_id
-- —formato FAC-<año>-<4 dígitos>, 10.000 combinaciones adivinables por año—
-- y ninguna credencial: cualquiera que adivinara o interceptara el
-- identificador podía marcar una factura como cobrada. Mismo mecanismo que
-- accept_token: un valor aleatorio por recurso, verificado contra la base
-- en vez de un secreto compartido estático.
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS pago_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Cómo se cobró la factura (23-sep-2026, para bases ya creadas). Cerrar el
-- proyecto desde el panel da la factura por COBRADO sin que haya entrado
-- ningún pago registrado (se asume cobrada por fuera del sistema); sin esta
-- columna ese cierre era indistinguible de un cobro real y engordaba
-- `cobrado` y `tasa_cobro_pct`. NULL = cobrada antes de la columna, o no
-- cobrada todavía.
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS metodo_cobro TEXT;
DO $$ BEGIN
  ALTER TABLE facturas ADD CONSTRAINT chk_facturas_metodo_cobro
    CHECK (metodo_cobro IS NULL OR metodo_cobro IN ('MERCADOPAGO','DESARROLLO','CIERRE_MANUAL')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Términos que fija el profesional antes de enviar la propuesta (para bases ya
-- creadas). Hasta su incorporación, el precio de la propuesta y el monto de la
-- factura salían de `leads.presupuesto`, es decir del valor que el propio
-- interesado elegía en el formulario: el sistema comprometía al profesional con
-- un importe que él nunca fijaba. `presupuesto` se conserva sin tocar porque es
-- la entrada del scoring y el registro de lo que el cliente declaró; el importe
-- que se factura es `precio_propuesto`.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS precio_propuesto  NUMERIC(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS plazo_propuesto   TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS alcance_propuesto TEXT;
DO $$ BEGIN
  ALTER TABLE leads ADD CONSTRAINT chk_leads_precio_propuesto
    CHECK (precio_propuesto IS NULL OR precio_propuesto > 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- profiles.email pasa a nullable (para bases ya creadas): Supabase Auth
-- admite registros solo-teléfono y el trigger handle_new_user() los rechazaba.
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- facturas.lead_id pasa de CASCADE a RESTRICT (para bases ya creadas). El
-- nombre de constraint es el que Postgres genera por defecto para una
-- REFERENCES inline en la columna.
ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_lead_id_fkey;
ALTER TABLE facturas ADD CONSTRAINT facturas_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES leads(lead_id) ON DELETE RESTRICT;

-- facturas.moneda pasa de default 'USD' a 'ARS' (para bases ya creadas), con
-- el CHECK como NOT VALID para no exigirle a las filas existentes que ya lo
-- cumplan (mismo criterio que chk_facturas_fechas y chk_facturas_comision).
ALTER TABLE facturas ALTER COLUMN moneda SET DEFAULT 'ARS';
DO $$ BEGIN
  ALTER TABLE facturas ADD CONSTRAINT chk_facturas_moneda
    CHECK (moneda IN ('ARS','USD')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Espacios (23-sep-2026, para bases ya creadas). Todo lo que ya existía era de
-- un único dueño, así que va a un espacio "principal" a nombre del primer
-- admin. Si no hay ningún admin, el espacio queda sin dueño y se asigna a mano:
--   UPDATE espacios SET dueno_id = '<uuid de auth.users>' WHERE slug = 'principal';
ALTER TABLE leads        ADD COLUMN IF NOT EXISTS espacio_id UUID REFERENCES espacios(id);
ALTER TABLE facturas     ADD COLUMN IF NOT EXISTS espacio_id UUID REFERENCES espacios(id);
ALTER TABLE seguimientos ADD COLUMN IF NOT EXISTS espacio_id UUID REFERENCES espacios(id);
ALTER TABLE logs         ADD COLUMN IF NOT EXISTS espacio_id UUID REFERENCES espacios(id);
ALTER TABLE tickets      ADD COLUMN IF NOT EXISTS espacio_id UUID REFERENCES espacios(id);

DO $$
DECLARE
  principal uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM leads WHERE espacio_id IS NULL)
     OR EXISTS (SELECT 1 FROM tickets WHERE espacio_id IS NULL) THEN
    SELECT id INTO principal FROM espacios ORDER BY creado_en LIMIT 1;
    IF principal IS NULL THEN
      INSERT INTO espacios (slug, nombre, dueno_id)
      VALUES ('principal', 'Mi espacio',
              (SELECT id FROM profiles WHERE role = 'admin' ORDER BY creado_en LIMIT 1))
      RETURNING id INTO principal;
    END IF;

    -- Sin tocar actualizado_en: la migración no es un cambio del lead. Si el
    -- trigger todavía no existe (primera pasada sobre una base vieja), el
    -- DISABLE falla y se ignora.
    BEGIN
      ALTER TABLE leads DISABLE TRIGGER trg_leads_updated;
    EXCEPTION WHEN undefined_object THEN null;
    END;
    UPDATE leads SET espacio_id = principal WHERE espacio_id IS NULL;
    BEGIN
      ALTER TABLE leads ENABLE TRIGGER trg_leads_updated;
    EXCEPTION WHEN undefined_object THEN null;
    END;

    UPDATE tickets SET espacio_id = principal WHERE espacio_id IS NULL AND lead_id IS NULL;
  END IF;
END $$;

UPDATE facturas f     SET espacio_id = l.espacio_id FROM leads l WHERE f.lead_id = l.lead_id AND f.espacio_id IS NULL;
UPDATE seguimientos s SET espacio_id = l.espacio_id FROM leads l WHERE s.lead_id = l.lead_id AND s.espacio_id IS NULL;
UPDATE tickets t      SET espacio_id = l.espacio_id FROM leads l WHERE t.lead_id = l.lead_id AND t.espacio_id IS NULL;
UPDATE logs g         SET espacio_id = l.espacio_id FROM leads l WHERE g.lead_id = l.lead_id AND g.espacio_id IS NULL;

ALTER TABLE leads        ALTER COLUMN espacio_id SET NOT NULL;
ALTER TABLE facturas     ALTER COLUMN espacio_id SET NOT NULL;
ALTER TABLE seguimientos ALTER COLUMN espacio_id SET NOT NULL;
ALTER TABLE tickets      ALTER COLUMN espacio_id SET NOT NULL;


-- ---------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_estado       ON leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_tier         ON leads(tier);
CREATE INDEX IF NOT EXISTS idx_leads_fecha_ing    ON leads(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_facturas_estado    ON facturas(estado_pago);
CREATE INDEX IF NOT EXISTS idx_facturas_lead      ON facturas(lead_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_lead  ON seguimientos(lead_id);

-- `logs` es la tabla de auditoría: crece sin techo y se consulta por lead y
-- por fecha. No tenía ningún índice.
CREATE INDEX IF NOT EXISTS idx_logs_creado_en     ON logs(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_logs_lead          ON logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_logs_nivel         ON logs(nivel) WHERE nivel IN ('WARN','ERROR');

-- El cron de recordatorios lee `facturas_pendientes` (estado_pago='PENDIENTE')
-- ordenando por vencimiento: el índice compuesto resuelve filtro y orden juntos.
CREATE INDEX IF NOT EXISTS idx_facturas_venc      ON facturas(estado_pago, fecha_vencimiento);

-- El INSERT de leads (Postgres - Insert Lead) filtra por lower(email) +
-- creado_en bajo el advisory lock de deduplicación: sin este índice funcional
-- hace un seq scan completo en la ruta más caliente del webhook público.
CREATE INDEX IF NOT EXISTS idx_leads_dedup ON leads (lower(email), creado_en);

-- `rate_limit_log`: cada webhook protegido cuenta "cuántas filas con esta
-- clave y esta ruta en los últimos N minutos", que es exactamente lo que el
-- índice compuesto resuelve sin recorrer la tabla entera.
CREATE INDEX IF NOT EXISTS idx_rate_limit_clave_ruta_fecha
  ON rate_limit_log(ip_o_clave, ruta, creado_en);

-- idx_leads_token_venc (accept_token, token_expira_en) quedaba muerto: las
-- consultas de aceptación filtran primero por lead_id (ya UNIQUE) y comparan
-- accept_token::text = $2, y ese cast sobre la columna impide usar un índice
-- btree plano sobre accept_token. Se dropea acá para bases ya creadas; no
-- vuelve a declararse arriba.
DROP INDEX IF EXISTS idx_leads_token_venc;

-- Tickets: el tablero lee los abiertos, el cron busca los quietos, y la
-- siembra del CRM no puede duplicar un ticket del mismo proyecto.
CREATE INDEX IF NOT EXISTS idx_tickets_estado ON tickets(estado, ultimo_movimiento);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tickets_lead_titulo ON tickets(lead_id, titulo) WHERE lead_id IS NOT NULL;

-- Espacios: todas las políticas del tablero filtran por espacio_id.
CREATE INDEX IF NOT EXISTS idx_leads_espacio        ON leads(espacio_id, fecha_ingreso DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_espacio     ON facturas(espacio_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_espacio ON seguimientos(espacio_id);
CREATE INDEX IF NOT EXISTS idx_tickets_espacio      ON tickets(espacio_id, estado);
CREATE INDEX IF NOT EXISTS idx_logs_espacio         ON logs(espacio_id) WHERE espacio_id IS NOT NULL;

-- Nota de alcance: a la escala del MVP (decenas de filas) estos índices no
-- cambian los tiempos de forma observable. Se agregan porque las consultas que
-- los usan ya están escritas y son las que crecerían en un uso real.

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
-- Tickets: reglas del envejecimiento
-- ---------------------------------------------------------------------
-- Días sin movimiento que tolera cada prioridad antes de subir un escalón.
-- CRITICA es el tope: no escala.
CREATE OR REPLACE FUNCTION ticket_dias_escalada(p ticket_prioridad) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p WHEN 'BAJA' THEN 10 WHEN 'MEDIA' THEN 7 WHEN 'ALTA' THEN 4 END
$$;

-- Peso de la prioridad en el score (0-100) que ordena el tablero.
CREATE OR REPLACE FUNCTION ticket_peso(p ticket_prioridad) RETURNS int
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p WHEN 'BAJA' THEN 10 WHEN 'MEDIA' THEN 25 WHEN 'ALTA' THEN 50 WHEN 'CRITICA' THEN 80 END
$$;

-- Cambiar el estado o la prioridad cuenta como movimiento y reinicia el reloj
-- (desde el tablero, o el propio cron al escalar). Pasar a HECHO lo cierra.
CREATE OR REPLACE FUNCTION tickets_movimiento() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado OR NEW.prioridad IS DISTINCT FROM OLD.prioridad THEN
    NEW.ultimo_movimiento := now();
  END IF;
  IF NEW.estado = 'HECHO' AND OLD.estado <> 'HECHO' THEN
    NEW.cerrado_en := now();
  ELSIF NEW.estado <> 'HECHO' THEN
    NEW.cerrado_en := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tickets_movimiento ON tickets;
CREATE TRIGGER trg_tickets_movimiento
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION tickets_movimiento();

-- ---------------------------------------------------------------------
-- Espacios: a qué espacio pertenece cada fila
-- ---------------------------------------------------------------------
-- Un lead sin espacio_id va al espacio del primer admin (o al "principal"
-- migrado). Es el comportamiento de un solo dueño y es TRANSITORIO: se usa
-- mientras el formulario público no diga de qué espacio viene el pedido (etapa
-- 3 del plan, formulario en /f/<slug>). SECURITY DEFINER porque n8n_writer no
-- lee espacios ni profiles.
CREATE OR REPLACE FUNCTION public.leads_espacio_por_defecto() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.espacio_id IS NULL THEN
    SELECT e.id INTO NEW.espacio_id
    FROM espacios e
    LEFT JOIN profiles p ON p.id = e.dueno_id
    WHERE p.role = 'admin' OR e.slug = 'principal'
    ORDER BY (p.role = 'admin') DESC NULLS LAST, e.creado_en
    LIMIT 1;

    IF NEW.espacio_id IS NULL THEN
      RAISE EXCEPTION 'No hay ningún espacio al que asignar el lead %', NEW.lead_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_espacio ON leads;
CREATE TRIGGER trg_leads_espacio
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION public.leads_espacio_por_defecto();

-- Lo que cuelga de un lead es del espacio del lead, siempre: nadie lo fija a
-- mano, ni n8n ni el tablero. Así una factura no puede quedar en un espacio
-- distinto del de su pedido, y un ticket que apunta al lead de otro espacio
-- queda en ESE espacio y la política del tablero lo rechaza.
-- Un ticket sin lead, creado desde el tablero, va al espacio de quien lo crea.
-- SECURITY DEFINER: tiene que ver el lead aunque la RLS se lo oculte a quien
-- inserta; si no, un lead ajeno pasaría por "sin lead".
CREATE OR REPLACE FUNCTION public.espacio_desde_lead() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  del_lead uuid;
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    SELECT espacio_id INTO del_lead FROM leads WHERE lead_id = NEW.lead_id;
    IF del_lead IS NOT NULL THEN
      NEW.espacio_id := del_lead;
    END IF;
  END IF;

  IF NEW.espacio_id IS NULL AND TG_TABLE_NAME = 'tickets' THEN
    SELECT id INTO NEW.espacio_id FROM espacios WHERE dueno_id = auth.uid();
    -- Sin sesión (n8n): mismo criterio transitorio que los leads.
    IF NEW.espacio_id IS NULL THEN
      SELECT e.id INTO NEW.espacio_id
      FROM espacios e
      LEFT JOIN profiles p ON p.id = e.dueno_id
      WHERE p.role = 'admin' OR e.slug = 'principal'
      ORDER BY (p.role = 'admin') DESC NULLS LAST, e.creado_en
      LIMIT 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_facturas_espacio ON facturas;
CREATE TRIGGER trg_facturas_espacio
  BEFORE INSERT OR UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION public.espacio_desde_lead();
DROP TRIGGER IF EXISTS trg_seguimientos_espacio ON seguimientos;
CREATE TRIGGER trg_seguimientos_espacio
  BEFORE INSERT OR UPDATE ON seguimientos
  FOR EACH ROW EXECUTE FUNCTION public.espacio_desde_lead();
DROP TRIGGER IF EXISTS trg_logs_espacio ON logs;
CREATE TRIGGER trg_logs_espacio
  BEFORE INSERT OR UPDATE ON logs
  FOR EACH ROW EXECUTE FUNCTION public.espacio_desde_lead();
DROP TRIGGER IF EXISTS trg_tickets_espacio ON tickets;
CREATE TRIGGER trg_tickets_espacio
  BEFORE INSERT OR UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION public.espacio_desde_lead();

-- Un lead que cambia de espacio se lleva lo suyo. Hoy nada lo mueve; lo va a
-- hacer la bolsa de proyectos (etapa 5), cuando otro desarrollador tome un
-- pedido. Alcanza con "tocar" las filas: el trigger de arriba las recalcula.
CREATE OR REPLACE FUNCTION public.leads_propagar_espacio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE facturas     SET espacio_id = NEW.espacio_id WHERE lead_id = NEW.lead_id;
  UPDATE seguimientos SET espacio_id = NEW.espacio_id WHERE lead_id = NEW.lead_id;
  UPDATE tickets      SET espacio_id = NEW.espacio_id WHERE lead_id = NEW.lead_id;
  UPDATE logs         SET espacio_id = NEW.espacio_id WHERE lead_id = NEW.lead_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_propagar_espacio ON leads;
CREATE TRIGGER trg_leads_propagar_espacio
  AFTER UPDATE OF espacio_id ON leads
  FOR EACH ROW
  WHEN (OLD.espacio_id IS DISTINCT FROM NEW.espacio_id)
  EXECUTE FUNCTION public.leads_propagar_espacio();

-- ---------------------------------------------------------------------
-- Trigger: crea el perfil (rol 'user' por defecto) al registrarse.
-- Se promueve a 'admin' si el email está en `admin_emails` (whitelist
-- editable con un INSERT/DELETE puntual, sin tocar este archivo) Y ya está
-- confirmado. Un email NULL (registro solo-teléfono) nunca matchea la
-- whitelist: NULL = NULL no es true en SQL, así que cae a 'user' sin caso
-- especial.
-- La confirmación importa: el INSERT en auth.users ocurre al registrarse,
-- antes de que nadie pruebe ser dueño de la casilla. Si el rol se asignara
-- acá sin mirarla, alcanzaría con desactivar "Confirm email" en Supabase
-- (o con un registro que quedara a medio confirmar) para que cualquiera que
-- escribiera la dirección de la whitelist obtuviera una fila 'admin'. Con
-- "Confirm email" desactivado, Supabase ya trae `email_confirmed_at` en el
-- INSERT, así que ese caso se resuelve acá mismo; si no, lo resuelve
-- handle_user_confirmed() al confirmarse.
-- `SECURITY DEFINER` es necesario porque el usuario recién registrado
-- todavía no tiene fila en `profiles` desde la que autorizarse solo.
-- ---------------------------------------------------------------------
-- Cada cuenta confirmada tiene su espacio (registro abierto, 23-sep-2026). Se
-- crea con un slug provisorio derivado del id, que es único, y el nombre sale
-- de la casilla; el desarrollador los cambia al completar su alta (etapa 2).
-- ON CONFLICT: una cuenta que ya tiene espacio (por ejemplo, el admin al que
-- la migración le dio el "principal") no recibe otro.
CREATE OR REPLACE FUNCTION public.crear_espacio_propio(uid uuid, correo text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO espacios (slug, nombre, dueno_id)
  VALUES ('e-' || replace(uid::text, '-', ''),
          coalesce(nullif(left(split_part(correo, '@', 1), 80), ''), 'Mi espacio'),
          uid)
  ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.crear_espacio_propio(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL
          AND EXISTS (SELECT 1 FROM public.admin_emails WHERE email = NEW.email)
      THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.crear_espacio_propio(NEW.id, NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Promoción al confirmar el email por primera vez. Sólo en esa transición
-- (NULL → fecha): un admin bajado de rol a mano no vuelve a subir solo por
-- un evento posterior de su cuenta.
CREATE OR REPLACE FUNCTION public.handle_user_confirmed() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET role = 'admin'
  WHERE id = NEW.id
    AND role = 'user'
    AND EXISTS (SELECT 1 FROM public.admin_emails WHERE email = NEW.email);

  PERFORM public.crear_espacio_propio(NEW.id, NEW.email);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_user_confirmed();

-- Backfill: cuentas ya existentes (creadas antes de este trigger) también
-- necesitan su fila en `profiles`. Idempotente vía ON CONFLICT: una fila que
-- ya existe (por ejemplo porque un admin real bajó de rol a mano) no se
-- vuelve a tocar acá, así que re-aplicar el schema nunca re-promueve a nadie.
INSERT INTO public.profiles (id, email, role)
SELECT id, email, CASE WHEN email_confirmed_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.admin_emails a WHERE a.email = auth.users.email)
  THEN 'admin' ELSE 'user' END
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Backfill de espacios: cuentas confirmadas antes de que existieran.
DO $$ BEGIN
  PERFORM public.crear_espacio_propio(u.id, u.email)
  FROM auth.users u
  WHERE u.email_confirmed_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM espacios e WHERE e.dueno_id = u.id);
END $$;

-- ---------------------------------------------------------------------
-- Vistas (con security_invoker: respetan la RLS de las tablas base)
-- ---------------------------------------------------------------------
-- Se dropean antes de recrearlas porque `CREATE OR REPLACE VIEW` sólo admite
-- agregar columnas AL FINAL: si cambia el nombre, el tipo o el orden de una
-- columna existente, Postgres aborta con «cannot change name of view column».
-- Eso es exactamente lo que pasa al actualizar una base creada antes de las
-- columnas de MercadoPago, que es el caso de uso que este script promete
-- soportar. Sin el DROP, re-ejecutarlo sobre una base vieja falla.
-- Son vistas sin estado: dropearlas no toca ningún dato.
DROP VIEW IF EXISTS metrics_mensuales;
DROP VIEW IF EXISTS facturas_pendientes;
DROP VIEW IF EXISTS tickets_tablero;

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
    -- Una factura ANULADA no es facturación: no suma al total, ni a lo
    -- pendiente, ni al denominador de la tasa de cobro. Hasta el 23-sep-2026
    -- sí sumaba (pendiente era `estado_pago <> 'COBRADO'`), así que anular una
    -- factura no movía el pendiente del tablero y bajaba la tasa de cobro.
    coalesce(sum(monto) FILTER (WHERE estado_pago <> 'ANULADA'), 0)    AS facturacion,
    coalesce(sum(monto) FILTER (WHERE estado_pago = 'COBRADO'), 0)     AS cobrado,
    coalesce(sum(monto) FILTER (WHERE estado_pago IN ('PENDIENTE','VENCIDA')), 0) AS pendiente,
    -- Hasta el 01-sep-2026 esto se inferia contando PENDIENTE + fecha_vencimiento
    -- < now(), porque ningun nodo escribia la transicion VENCIDA (limitacion
    -- declarada en §4.8 y en el punto 7 del Capitulo 8). Con "🟠 Cron -
    -- Recordatorios Pago 10AM" marcando VENCIDA a las facturas PENDIENTE que
    -- superan FACTURA_VENCIDA_DIAS_GRACIA dias de atraso (workflow/crm_postgres.json),
    -- el indicador de la Tabla 8 pasa a contar el estado real en vez de inferirlo:
    -- una factura ANULADA (tambien nueva) no debe sumar acá, y con la inferencia
    -- vieja sí lo habria hecho mientras siguiera con fecha_vencimiento pasada.
    count(*) FILTER (WHERE estado_pago = 'VENCIDA')                    AS facturas_vencidas,
    round(100.0 * coalesce(sum(monto) FILTER (WHERE estado_pago = 'COBRADO'), 0)
                 / NULLIF(sum(monto) FILTER (WHERE estado_pago <> 'ANULADA'), 0), 1) AS tasa_cobro_pct,
    -- Comisión de la plataforma (MP_COMISION_PORCENTAJE) realizada sobre lo
    -- efectivamente cobrado. Es contable: MercadoPago no la separa sola.
    coalesce(sum(comision_plataforma) FILTER (WHERE estado_pago = 'COBRADO'), 0) AS comision_cobrada,
    -- Parte de `cobrado` que sólo se dio por cobrada al cerrar el proyecto,
    -- sin un pago registrado por el sistema.
    coalesce(sum(monto) FILTER (WHERE estado_pago = 'COBRADO' AND metodo_cobro = 'CIERRE_MANUAL'), 0) AS cobrado_cierre_manual
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
  coalesce(f.tasa_cobro_pct, 0)     AS tasa_cobro_pct,
  coalesce(f.comision_cobrada, 0)   AS comision_cobrada,
  coalesce(f.cobrado_cierre_manual, 0) AS cobrado_cierre_manual
FROM lead_mes l
FULL OUTER JOIN fact_mes f ON l.mes = f.mes
ORDER BY mes DESC;

-- Sigue filtrando sólo PENDIENTE a propósito (01-sep-2026): es la que alimenta
-- los recordatorios de cobro (RAMA 4) y la sección IV del tablero. Una factura
-- que ya pasó a VENCIDA (más de FACTURA_VENCIDA_DIAS_GRACIA días de atraso) o a
-- ANULADA sale de esta lista sin que haga falta agregar un WHERE: ambos son
-- estados distintos de PENDIENTE. El conteo de vencidas para la Tabla 8 vive en
-- `metrics_mensuales.facturas_vencidas`, no acá.
CREATE OR REPLACE VIEW facturas_pendientes
  WITH (security_invoker = true) AS
SELECT
  f.*,
  (f.fecha_vencimiento::date - now()::date) AS dias_al_vencimiento
FROM facturas f
WHERE f.estado_pago = 'PENDIENTE';

-- Lo que pinta el tablero: el ticket, el cliente del proyecto y los números
-- del envejecimiento calculados al momento (nada de esto se guarda, así no
-- hay un score viejo esperando al cron).
CREATE OR REPLACE VIEW tickets_tablero
  WITH (security_invoker = true) AS
SELECT
  t.*,
  l.nombre                                               AS cliente,
  (now()::date - t.creado_en::date)                      AS dias_abierto,
  (now()::date - t.ultimo_movimiento::date)              AS dias_quieto,
  CASE WHEN t.estado = 'HECHO' THEN 0
       ELSE least(100, ticket_peso(t.prioridad) + 2 * (now()::date - t.creado_en::date))
  END                                                    AS score,
  CASE WHEN t.estado = 'HECHO' OR t.prioridad = 'CRITICA' THEN NULL
       ELSE greatest(0, ticket_dias_escalada(t.prioridad) - (now()::date - t.ultimo_movimiento::date))
  END                                                    AS dias_para_escalar
FROM tickets t
LEFT JOIN leads l USING (lead_id);

-- =====================================================================
-- Seguridad a nivel de fila (RLS) — RNF1, RNF2, §4.6, Anexo C
-- =====================================================================

-- 1) Habilitar RLS en todas las tablas de negocio. Con RLS activa y sin
--    política aplicable, el acceso queda denegado por defecto.
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimientos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_emails    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE espacios        ENABLE ROW LEVEL SECURITY;

-- 1.1) FORCE: sin esto, el OWNER de la tabla evade la RLS igual que si
--      tuviera BYPASSRLS (una tarea de backup o una migración conectada con
--      el rol dueño de las tablas, no con service_role, se saltearía todas
--      las políticas). No afecta a `service_role`: ese ya tiene BYPASSRLS
--      explícito, que manda por sobre FORCE.
ALTER TABLE leads           FORCE ROW LEVEL SECURITY;
ALTER TABLE facturas        FORCE ROW LEVEL SECURITY;
ALTER TABLE seguimientos    FORCE ROW LEVEL SECURITY;
ALTER TABLE logs            FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles        FORCE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_log  FORCE ROW LEVEL SECURITY;
ALTER TABLE admin_emails    FORCE ROW LEVEL SECURITY;
ALTER TABLE tickets         FORCE ROW LEVEL SECURITY;
ALTER TABLE espacios        FORCE ROW LEVEL SECURITY;

-- 2) Políticas de LECTURA sobre las tablas que alimentan el tablero.
--    Cada desarrollador ve sólo lo de su espacio (23-sep-2026). Hasta
--    entonces se exigía `profiles.role = 'admin'` y el admin veía todo: con
--    la plataforma compartida, `role` pasó a ser sólo del administrador de
--    la plataforma y ya no da acceso a los datos de nadie.
--    La subconsulta sobre `espacios` pasa por su propia política (cada uno
--    lee su fila), así que no hace falta una función SECURITY DEFINER.
--    `(SELECT auth.uid())` y no `auth.uid()` suelto: así Postgres la evalúa
--    una vez por consulta y no una vez por fila.
--    No se crean políticas de escritura: la escritura la hace n8n.
DROP POLICY IF EXISTS espacios_select_dueno ON espacios;
CREATE POLICY espacios_select_dueno ON espacios
  FOR SELECT TO authenticated USING (dueno_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS leads_select_authenticated ON leads;
CREATE POLICY leads_select_authenticated ON leads
  FOR SELECT TO authenticated
  USING (espacio_id IN (SELECT id FROM espacios WHERE dueno_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS facturas_select_authenticated ON facturas;
CREATE POLICY facturas_select_authenticated ON facturas
  FOR SELECT TO authenticated
  USING (espacio_id IN (SELECT id FROM espacios WHERE dueno_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS seguimientos_select_authenticated ON seguimientos;
CREATE POLICY seguimientos_select_authenticated ON seguimientos
  FOR SELECT TO authenticated
  USING (espacio_id IN (SELECT id FROM espacios WHERE dueno_id = (SELECT auth.uid())));

-- 2.1) `profiles`: cada usuario solo puede leer su propia fila (para que
--      el frontend sepa si mostrar el link al dashboard). Nadie puede
--      escribir su propio rol: solo la service_role o el trigger
--      (SECURITY DEFINER) tocan esta tabla.
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

-- 3) `logs` (auditoría/errores) no tiene ninguna política para
--    `authenticated`: `service_role` (que evade la RLS) y `n8n_writer`
--    (por las políticas `logs_{select,insert,update}_n8n_writer` de la
--    sección 5.1) pueden escribir y consultar, pero `authenticated` y
--    `anon` no acceden. Es intencional: la auditoría no se expone al
--    tablero. `admin_emails` tampoco tiene política: solo la lee la función
--    SECURITY DEFINER handle_new_user() y se administra a mano vía
--    service_role.

-- 4) Privilegios de tabla (GRANT). La RLS filtra filas, pero el rol
--    igual necesita el privilegio SELECT sobre el objeto.
GRANT SELECT ON leads, facturas, seguimientos, profiles, espacios TO authenticated;

-- 4.1) Tickets: a diferencia del resto, el tablero SÍ escribe (crear y mover
--      tickets desde /api/tickets, con la sesión del desarrollador), siempre
--      dentro de su espacio. Sin DELETE. El WITH CHECK es lo que impide
--      llevarse un ticket a otro espacio o colgarlo del lead de otro: el
--      trigger trg_tickets_espacio le pone el espacio de ese lead.
--      Hasta el 23-sep-2026 se llamaban tickets_*_admin y exigían el rol admin.
DROP POLICY IF EXISTS tickets_select_admin ON tickets;
DROP POLICY IF EXISTS tickets_select_espacio ON tickets;
CREATE POLICY tickets_select_espacio ON tickets
  FOR SELECT TO authenticated
  USING (espacio_id IN (SELECT id FROM espacios WHERE dueno_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS tickets_insert_admin ON tickets;
DROP POLICY IF EXISTS tickets_insert_espacio ON tickets;
CREATE POLICY tickets_insert_espacio ON tickets
  FOR INSERT TO authenticated
  WITH CHECK (espacio_id IN (SELECT id FROM espacios WHERE dueno_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS tickets_update_admin ON tickets;
DROP POLICY IF EXISTS tickets_update_espacio ON tickets;
CREATE POLICY tickets_update_espacio ON tickets
  FOR UPDATE TO authenticated
  USING (espacio_id IN (SELECT id FROM espacios WHERE dueno_id = (SELECT auth.uid())))
  WITH CHECK (espacio_id IN (SELECT id FROM espacios WHERE dueno_id = (SELECT auth.uid())));
GRANT SELECT, INSERT, UPDATE ON tickets TO authenticated;
GRANT SELECT ON tickets_tablero TO authenticated;
GRANT SELECT ON metrics_mensuales, facturas_pendientes TO authenticated;

-- 5) `service_role` se conserva para acceso administrativo (SQL editor,
--    tareas puntuales) y como red de contención, pero deja de ser la
--    credencial de la conexión de n8n (véase 5.1). En Supabase este rol ya
--    trae privilegios plenos; en un PostgreSQL vanilla (p. ej. el
--    autoalojado del docker-compose) NO, y BYPASSRLS solo evade la RLS, no
--    otorga el privilegio de tabla. Se conceden explícitamente para que
--    funcione en ambos entornos.
GRANT SELECT, INSERT, UPDATE, DELETE ON leads, facturas, seguimientos, logs, profiles, rate_limit_log, admin_emails, tickets, espacios TO service_role;
GRANT SELECT ON tickets_tablero TO service_role;
GRANT SELECT ON metrics_mensuales, facturas_pendientes TO service_role;

-- Nota: la `service_role` posee además BYPASSRLS, por lo que sus escrituras
-- no quedan sujetas a las políticas de fila.

-- 5.1) Rol acotado para la conexión de n8n (cierra S4 de la Tabla 11).
--    `service_role` evade la RLS por completo y, en un proyecto de Supabase
--    real, alcanza más que las cinco tablas de este esquema: si esa
--    credencial se filtra —ya ocurrió una vez, incidente S7, véase §6.3—,
--    el radio de daño es el de un superusuario de facto. `n8n_writer` es el
--    rol que debe usar la credencial Postgres del nodo homónimo de n8n en
--    su lugar: sin BYPASSRLS, sin acceso a `profiles` ni al esquema `auth`,
--    y sin DELETE, porque ningún nodo del flujo borra filas (verificado
--    contra los 38 nodos Postgres del flujo exportado (01-sep-2026),
--    workflow/crm_postgres.json, y con evidencia ejecutable en
--    tests/rls/casos.sql y tests/idempotencia.mjs).
DO $$ BEGIN CREATE ROLE n8n_writer NOLOGIN;
EXCEPTION WHEN duplicate_object THEN null; END $$;

GRANT USAGE ON SCHEMA public TO n8n_writer;
GRANT SELECT, INSERT, UPDATE ON leads, facturas, seguimientos, logs TO n8n_writer;
-- `rate_limit_log` es sólo de lectura+escritura de una fila por invocación
-- (registrar el intento y contar los recientes): nunca se actualiza una fila
-- ya escrita, así que no lleva UPDATE.
GRANT SELECT, INSERT ON rate_limit_log TO n8n_writer;
GRANT SELECT ON metrics_mensuales, facturas_pendientes TO n8n_writer;
REVOKE ALL ON profiles FROM n8n_writer;
REVOKE ALL ON admin_emails FROM n8n_writer;
-- `espacios` todavía no la necesita n8n: la va a leer cuando los correos
-- salgan con la marca de cada espacio (etapa 3). Los triggers que la leen son
-- SECURITY DEFINER.
REVOKE ALL ON espacios FROM n8n_writer;

-- Políticas de escritura de `n8n_writer`. No filtran filas (USING/WITH CHECK
-- en true): a diferencia de las políticas de `authenticated`, el límite de
-- este rol no es «qué fila» sino «qué tabla y qué operación», y eso ya lo
-- resuelve el GRANT de arriba. Sin estas políticas, con RLS habilitada y sin
-- BYPASSRLS, el rol no podría hacer nada aunque tuviera el GRANT: la RLS
-- deniega por omisión toda operación sin una política permisiva.
--
-- Una política por comando (no `FOR ALL`) a propósito: `FOR ALL` alcanza
-- también a DELETE a nivel de RLS, así que un GRANT DELETE futuro por error
-- quedaría habilitado en silencio por esta política preexistente. Separando
-- por comando, agregar DELETE requeriría además una policy nueva explícita.
DROP POLICY IF EXISTS leads_rw_n8n_writer ON leads;
DROP POLICY IF EXISTS leads_select_n8n_writer ON leads;
CREATE POLICY leads_select_n8n_writer ON leads
  FOR SELECT TO n8n_writer USING (true);
DROP POLICY IF EXISTS leads_insert_n8n_writer ON leads;
CREATE POLICY leads_insert_n8n_writer ON leads
  FOR INSERT TO n8n_writer WITH CHECK (true);
DROP POLICY IF EXISTS leads_update_n8n_writer ON leads;
CREATE POLICY leads_update_n8n_writer ON leads
  FOR UPDATE TO n8n_writer USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS facturas_rw_n8n_writer ON facturas;
DROP POLICY IF EXISTS facturas_select_n8n_writer ON facturas;
CREATE POLICY facturas_select_n8n_writer ON facturas
  FOR SELECT TO n8n_writer USING (true);
DROP POLICY IF EXISTS facturas_insert_n8n_writer ON facturas;
CREATE POLICY facturas_insert_n8n_writer ON facturas
  FOR INSERT TO n8n_writer WITH CHECK (true);
DROP POLICY IF EXISTS facturas_update_n8n_writer ON facturas;
CREATE POLICY facturas_update_n8n_writer ON facturas
  FOR UPDATE TO n8n_writer USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS seguimientos_rw_n8n_writer ON seguimientos;
DROP POLICY IF EXISTS seguimientos_select_n8n_writer ON seguimientos;
CREATE POLICY seguimientos_select_n8n_writer ON seguimientos
  FOR SELECT TO n8n_writer USING (true);
DROP POLICY IF EXISTS seguimientos_insert_n8n_writer ON seguimientos;
CREATE POLICY seguimientos_insert_n8n_writer ON seguimientos
  FOR INSERT TO n8n_writer WITH CHECK (true);
DROP POLICY IF EXISTS seguimientos_update_n8n_writer ON seguimientos;
CREATE POLICY seguimientos_update_n8n_writer ON seguimientos
  FOR UPDATE TO n8n_writer USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS logs_rw_n8n_writer ON logs;
DROP POLICY IF EXISTS logs_select_n8n_writer ON logs;
CREATE POLICY logs_select_n8n_writer ON logs
  FOR SELECT TO n8n_writer USING (true);
DROP POLICY IF EXISTS logs_insert_n8n_writer ON logs;
CREATE POLICY logs_insert_n8n_writer ON logs
  FOR INSERT TO n8n_writer WITH CHECK (true);
DROP POLICY IF EXISTS logs_update_n8n_writer ON logs;
CREATE POLICY logs_update_n8n_writer ON logs
  FOR UPDATE TO n8n_writer USING (true) WITH CHECK (true);

-- Sin policy de UPDATE: coincide con el GRANT de más arriba (SELECT, INSERT
-- nomás) — nunca se actualiza una fila de rate_limit_log ya escrita.
DROP POLICY IF EXISTS rate_limit_log_rw_n8n_writer ON rate_limit_log;
DROP POLICY IF EXISTS rate_limit_log_select_n8n_writer ON rate_limit_log;
CREATE POLICY rate_limit_log_select_n8n_writer ON rate_limit_log
  FOR SELECT TO n8n_writer USING (true);
DROP POLICY IF EXISTS rate_limit_log_insert_n8n_writer ON rate_limit_log;
CREATE POLICY rate_limit_log_insert_n8n_writer ON rate_limit_log
  FOR INSERT TO n8n_writer WITH CHECK (true);

-- Tickets: el CRM siembra los del proyecto al aceptarse una propuesta y el
-- cron de envejecimiento los escala. Sin DELETE, como el resto.
GRANT SELECT, INSERT, UPDATE ON tickets TO n8n_writer;
GRANT SELECT ON tickets_tablero TO n8n_writer;
DROP POLICY IF EXISTS tickets_select_n8n_writer ON tickets;
CREATE POLICY tickets_select_n8n_writer ON tickets FOR SELECT TO n8n_writer USING (true);
DROP POLICY IF EXISTS tickets_insert_n8n_writer ON tickets;
CREATE POLICY tickets_insert_n8n_writer ON tickets FOR INSERT TO n8n_writer WITH CHECK (true);
DROP POLICY IF EXISTS tickets_update_n8n_writer ON tickets;
CREATE POLICY tickets_update_n8n_writer ON tickets FOR UPDATE TO n8n_writer USING (true) WITH CHECK (true);

-- Paso operativo pendiente, fuera del alcance de este script porque no debe
-- versionar contraseñas: en el proyecto de Supabase real, dar LOGIN y una
-- contraseña a `n8n_writer` (`ALTER ROLE n8n_writer WITH LOGIN PASSWORD
-- '<secreto generado>';`, guardada en un gestor de secretos y no en este
-- archivo) y reemplazar la credencial Postgres del nodo homónimo de n8n por
-- esa nueva conexión. Mientras ese paso no se haga, el esquema queda listo
-- pero la conexión real de n8n sigue usando `service_role`.

-- 6) El rol público (`anon`) no debe leer las tablas de negocio ni las
--    vistas. Se revoca explícitamente por si el default privilege de la
--    plataforma lo hubiera otorgado.
REVOKE ALL ON leads, facturas, seguimientos, logs, profiles, rate_limit_log, admin_emails, tickets, espacios FROM anon;
REVOKE ALL ON metrics_mensuales, facturas_pendientes, tickets_tablero FROM anon;

-- 7) Realtime: el tablero se suscribe a los cambios de `leads`
--    (postgres_changes, §4.2.5 / RNF6 / escenario E7) y, desde el
--    23-sep-2026, de `facturas`: el pago de MercadoPago, el cron que marca
--    VENCIDA y la anulación cambian la factura sin tocar su lead, y el
--    tablero no se enteraba hasta recargar. Se agregan las tablas a la
--    publicación de Supabase, de forma idempotente y sin romper en un
--    PostgreSQL vanilla donde esa publicación no exista. La RLS sigue
--    aplicando: cada desarrollador recibe sólo los eventos de su espacio.
DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['leads', 'facturas', 'tickets'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
