-- ════════════════════════════════════════════════════════════════════
-- FaberLoom · 005_auth.sql — Autenticación (login con contraseña)
-- Se aplica DESPUÉS de 001→004. Idempotente.
--
-- Añade `users.password_hash` y una función de login controlada.
--
-- Problema que resuelve (R2): en login NO se conoce el tenant todavía, y
-- `users` tiene RLS FORCE (sin tenant fijado = 0 filas). Para resolver al
-- usuario por email de forma segura usamos UNA función `SECURITY DEFINER`
-- (única puerta de entrada, solo expone campos de auth) que corre como un rol
-- con BYPASSRLS. El rol de runtime `faberloom_app` NO bypassa RLS; solo puede
-- EJECUTAR esta función, nunca leer `users` cross-tenant directamente.
-- ════════════════════════════════════════════════════════════════════

-- 1) Columna de hash de contraseña (bcrypt vía pgcrypto). Nullable: un usuario
--    sin password_hash simplemente no puede iniciar sesión.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- 2) El rol owner `faberloom` (usado para migraciones/ownership, NO para el
--    runtime de la app) bypassa RLS para que la función DEFINER pueda buscar
--    por email entre tenants. El runtime sigue siendo `faberloom_app` (sin
--    bypass), así que el aislamiento por request no se ve afectado.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'faberloom') THEN
    ALTER ROLE faberloom BYPASSRLS;
  END IF;
END$$;

-- 3) Función de login. Devuelve la fila del usuario SOLO si el email existe y
--    la contraseña verifica contra el hash (crypt de pgcrypto). Sin match,
--    devuelve 0 filas. No expone password_hash.
CREATE OR REPLACE FUNCTION fl_auth_login(p_email text, p_password text)
RETURNS TABLE (
  id        uuid,
  tenant_id uuid,
  email     text,
  name      text,
  role      text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.tenant_id, u.email::text, u.name, u.role
  FROM users u
  WHERE u.email = p_email
    AND u.password_hash IS NOT NULL
    AND u.password_hash = crypt(p_password, u.password_hash)
  LIMIT 1;
$$;

-- 4) La función debe ser propiedad del rol con BYPASSRLS para que el contexto
--    DEFINER bypasse RLS también cuando la migración la aplica el owner.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'faberloom') THEN
    EXECUTE 'ALTER FUNCTION fl_auth_login(text, text) OWNER TO faberloom';
  END IF;
END$$;

-- 5) Solo el rol de app puede ejecutarla; nadie más.
REVOKE ALL ON FUNCTION fl_auth_login(text, text) FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'faberloom_app') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION fl_auth_login(text, text) TO faberloom_app';
  END IF;
END$$;

-- 6) Contraseña de DEMO para el owner sembrado (solo desarrollo local).
--    Cámbiala en cualquier entorno real. Corre como superusuario/owner en la
--    migración, por lo que RLS no bloquea el UPDATE.
UPDATE users
   SET password_hash = crypt('faberloom', gen_salt('bf'))
 WHERE email = 'alvaro@mwt.local';

-- Credenciales dev resultantes:
--   email:    alvaro@mwt.local
--   password: faberloom
