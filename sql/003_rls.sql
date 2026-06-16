-- =============================================================================
-- FaberLoom · 003_rls.sql
-- Rol de aplicación + Row-Level Security multi-tenant (R2).
-- Se ejecuta como superusuario / owner.
--
-- Modelo de aislamiento:
--   - El tenant activo se fija POR SESIÓN con:
--       SET LOCAL app.current_tenant_id = '<uuid>';
--   - Las policies comparan tenant_id contra:
--       current_setting('app.current_tenant_id', true)::uuid
--     El segundo argumento `true` evita error si el GUC no está fijado
--     (devuelve NULL -> ninguna fila visible, fail-closed).
--   - RLS se ENABLE + FORCE en cada tabla aislable para que aplique INCLUSO
--     al owner de la tabla (FORCE) y al rol de app.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rol de aplicación: NOSUPERUSER + NOBYPASSRLS para que la RLS SIEMPRE aplique.
-- Sólo se le otorgan privilegios DML (no DDL). El password es de demo local.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'faberloom_app') THEN
    CREATE ROLE faberloom_app LOGIN PASSWORD 'faberloom'
      NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    RAISE NOTICE 'Rol faberloom_app creado.';
  ELSE
    -- Asegura los atributos de seguridad aunque el rol ya exista.
    ALTER ROLE faberloom_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
    RAISE NOTICE 'Rol faberloom_app ya existía: atributos normalizados.';
  END IF;
END
$$;

-- Acceso al esquema y a las secuencias/funciones necesarias para DML.
GRANT USAGE ON SCHEMA public TO faberloom_app;

-- Privilegios DML sobre las tablas existentes y futuras del esquema.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO faberloom_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO faberloom_app;

-- Que las tablas/secuencias creadas DESPUÉS también hereden los grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO faberloom_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO faberloom_app;

-- =============================================================================
-- tenants — RAÍZ. Lectura abierta para el rol de app (necesita resolver su
-- propio tenant), pero SIN escritura para el rol de app (la administra el owner).
-- Se habilita RLS con una policy de SELECT permisiva.
-- =============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_select_all ON tenants;
CREATE POLICY tenants_select_all ON tenants
  FOR SELECT
  USING (true);

-- (No se crean policies de INSERT/UPDATE/DELETE para tenants: el rol de app
--  no puede mutar la tabla raíz porque FORCE RLS + ausencia de policy = denegado.
--  El owner/superusuario gestiona tenants vía 004_seed.sql o migraciones.)

-- =============================================================================
-- Helper: aplica el patrón de RLS por tenant a una tabla aislable.
-- Crea una policy ALL con USING + WITH CHECK sobre tenant_id.
-- =============================================================================
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users','workspaces','conversations','messages','kb_documents'
  ] LOOP
    -- Activa y FUERZA la RLS.
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY;', tbl);

    -- Policy única ALL: filtra lectura (USING) y valida escritura (WITH CHECK)
    -- contra el tenant fijado en la sesión. Fail-closed si el GUC es NULL.
    EXECUTE format('DROP POLICY IF EXISTS %1$s_tenant_isolation ON %1$s;', tbl);
    EXECUTE format($pol$
      CREATE POLICY %1$s_tenant_isolation ON %1$s
        FOR ALL
        USING      (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
        WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    $pol$, tbl);
  END LOOP;
END
$$;
