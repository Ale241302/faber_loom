-- ════════════════════════════════════════════════════════════════════
-- FaberLoom · 006_password_recovery.sql — Recuperación de contraseña
-- ════════════════════════════════════════════════════════════════════

-- 1) Tabla de tokens de restablecimiento de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  text        NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL,
    consumed_at timestamptz NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Habilitar y forzar RLS en la nueva tabla (aislamiento por tenant)
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS password_reset_tokens_tenant_isolation ON password_reset_tokens;
CREATE POLICY password_reset_tokens_tenant_isolation ON password_reset_tokens
    FOR ALL
    USING      (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Grant privileges for faberloom_app to DML operations on the new table
GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO faberloom_app;

-- 2) Función SECURITY DEFINER para crear tokens de restablecimiento
CREATE OR REPLACE FUNCTION fl_auth_create_reset_token(
    p_email text,
    p_token_hash text,
    p_expires_at timestamptz
)
RETURNS TABLE (
    token_id     uuid,
    tenant_id    uuid,
    user_id      uuid,
    user_name    text,
    user_email   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_tenant_id uuid;
    v_user_name text;
    v_user_email text;
    v_token_id uuid;
BEGIN
    -- Busca al usuario por email de forma cross-tenant (gracias a SECURITY DEFINER + BYPASSRLS del owner)
    SELECT u.id, u.tenant_id, u.name, u.email::text INTO v_user_id, v_tenant_id, v_user_name, v_user_email
    FROM users u
    WHERE LOWER(u.email) = LOWER(p_email)
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Invalida tokens previos sin consumir del mismo usuario
        UPDATE password_reset_tokens
        SET consumed_at = now()
        WHERE user_id = v_user_id AND consumed_at IS NULL;

        v_token_id := gen_random_uuid();

        -- Inserta el nuevo token
        INSERT INTO password_reset_tokens (id, tenant_id, user_id, token_hash, expires_at)
        VALUES (v_token_id, v_tenant_id, v_user_id, p_token_hash, p_expires_at);

        RETURN QUERY SELECT v_token_id, v_tenant_id, v_user_id, v_user_name, v_user_email;
    END IF;
END;
$$;

-- 3) Función SECURITY DEFINER para confirmar/restablecer la contraseña
CREATE OR REPLACE FUNCTION fl_auth_confirm_reset_token(
    p_token_hash text,
    p_new_password text
)
RETURNS TABLE (
    id        uuid,
    tenant_id uuid,
    email     text,
    name      text,
    role      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_id uuid;
    v_user_id uuid;
    v_tenant_id uuid;
    v_expires_at timestamptz;
    v_consumed_at timestamptz;
BEGIN
    -- Busca el token activo
    SELECT t.id, t.user_id, t.tenant_id, t.expires_at, t.consumed_at INTO v_token_id, v_user_id, v_tenant_id, v_expires_at, v_consumed_at
    FROM password_reset_tokens t
    WHERE t.token_hash = p_token_hash
    LIMIT 1;

    IF v_token_id IS NULL THEN
        RETURN;
    END IF;

    IF v_consumed_at IS NOT NULL THEN
        RETURN;
    END IF;

    IF v_expires_at < now() THEN
        RETURN;
    END IF;

    -- Actualiza la contraseña en users hasheando con bcrypt (gen_salt('bf'))
    UPDATE users u
    SET password_hash = crypt(p_new_password, gen_salt('bf')),
        updated_at = now()
    WHERE u.id = v_user_id;

    -- Marca el token como consumido
    UPDATE password_reset_tokens
    SET consumed_at = now()
    WHERE id = v_token_id;

    -- Devuelve la información del usuario para poder iniciar sesión automáticamente
    RETURN QUERY
    SELECT u.id, u.tenant_id, u.email::text, u.name, u.role
    FROM users u
    WHERE u.id = v_user_id;
END;
$$;

-- 4) Ajustar owners y permisos de ejecución
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'faberloom') THEN
    EXECUTE 'ALTER FUNCTION fl_auth_create_reset_token(text, text, timestamptz) OWNER TO faberloom';
    EXECUTE 'ALTER FUNCTION fl_auth_confirm_reset_token(text, text) OWNER TO faberloom';
  END IF;
END$$;

REVOKE ALL ON FUNCTION fl_auth_create_reset_token(text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION fl_auth_confirm_reset_token(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION fl_auth_create_reset_token(text, text, timestamptz) TO faberloom_app;
GRANT EXECUTE ON FUNCTION fl_auth_confirm_reset_token(text, text) TO faberloom_app;
