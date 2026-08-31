-- Andamiaje mínimo de Supabase sobre un PostgreSQL vanilla, para poder correr
-- `db/schema.sql` y sus políticas RLS fuera de Supabase.
--
-- Reproduce sólo lo que el esquema necesita: los tres roles de la plataforma,
-- el esquema `auth` con su tabla de usuarios y la función `auth.uid()`, que es
-- la que leen las políticas. No pretende ser un clon de Supabase.

-- ── Roles de la plataforma ─────────────────────────────────────────────────
-- `anon`: público sin sesión. `authenticated`: usuario logueado.
-- `service_role`: rol administrativo de Supabase, con BYPASSRLS.
-- `n8n_writer`: el que realmente usa la conexión de n8n (§4.6, S4 de la
-- Tabla 11) — sin BYPASSRLS; sus GRANT y sus políticas los define
-- db/schema.sql, no este archivo.
DO $$ BEGIN CREATE ROLE anon NOLOGIN;          EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE ROLE n8n_writer NOLOGIN;    EXCEPTION WHEN duplicate_object THEN null; END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ── Esquema auth ───────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE
);

-- Misma semántica que la de Supabase: lee el `sub` del JWT de la sesión.
-- En los tests la sesión se simula con `SET request.jwt.claims`.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ), ''
  )::uuid
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
