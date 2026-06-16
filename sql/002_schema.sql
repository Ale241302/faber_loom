-- =============================================================================
-- FaberLoom · 002_schema.sql
-- Schema base del slice SpaceLoom (PostgreSQL 16+).
-- Multi-tenant (R2): toda tabla aislable lleva tenant_id uuid NOT NULL.
-- La RLS se define aparte en 003_rls.sql.
-- Se ejecuta como superusuario / owner; el rol de app NO crea DDL.
-- Convención: id uuid default gen_random_uuid() PK, created_at/updated_at tz.
-- =============================================================================

-- citext: email case-insensitive con unicidad por tenant.
CREATE EXTENSION IF NOT EXISTS citext;

-- -----------------------------------------------------------------------------
-- 1) tenants — RAÍZ del aislamiento. NO lleva tenant_id.
--    No participa en RLS de tenant (su lectura es abierta; ver 003_rls.sql).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text        NOT NULL UNIQUE,
  name        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2) users — email citext, único POR tenant. role con CHECK (POL_VISIBILIDAD).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       citext      NOT NULL,
  name        text        NOT NULL,
  role        text        NOT NULL DEFAULT 'viewer'
                          CHECK (role IN ('owner','admin','operator','supervisor','viewer')),
  password    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- email único dentro del tenant (no global).
  CONSTRAINT users_tenant_email_uq UNIQUE (tenant_id, email)
);

-- -----------------------------------------------------------------------------
-- 3) workspaces — "My Workspaces" / "Shared Workspaces" del mock.
--    color_token = token semántico (NO hex).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspaces (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  kind         text        NOT NULL
                           CHECK (kind IN ('client','topic','shared')),
  color_token  text        NOT NULL
                           CHECK (color_token IN ('coral','amber','sage','slate','vino')),
  subtitle     text        NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 4) conversations — hilos de SpaceLoom. workspace_id opcional.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id  uuid        NULL REFERENCES workspaces(id) ON DELETE SET NULL,
  title         text        NOT NULL,
  created_by    uuid        NULL REFERENCES users(id) ON DELETE SET NULL,
  agent_handle  text        NOT NULL DEFAULT '@cotizador',
  model_tier    text        NOT NULL DEFAULT 'balanced'
                            CHECK (model_tier IN ('eco','balanced','sport')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 5) messages — mensajes de un hilo. Borrado en cascada con la conversación.
--    El thread arranca vacío (ver 004_seed.sql).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id  uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             text        NOT NULL
                               CHECK (role IN ('user','assistant','system')),
  content          text        NOT NULL,
  model_tier       text        NULL
                               CHECK (model_tier IS NULL OR model_tier IN ('eco','balanced','sport')),
  tokens_in        int         NULL,
  tokens_out       int         NULL,
  is_grounded      boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6) kb_documents — placeholder de grounding. SIN datos inventados (R1).
--    La columna embedding vector(1536) se añade condicionalmente más abajo,
--    solo si la extensión pgvector está instalada.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kb_documents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  source      text        NULL,
  body        text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Añade kb_documents.embedding vector(1536) SOLO si pgvector existe.
-- Así el bootstrap no se rompe en entornos sin pgvector (ver 001_extensions.sql).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'kb_documents' AND column_name = 'embedding'
    ) THEN
      EXECUTE 'ALTER TABLE kb_documents ADD COLUMN embedding vector(1536) NULL';
      RAISE NOTICE 'kb_documents.embedding vector(1536) añadida (pgvector presente).';
    END IF;
  ELSE
    RAISE WARNING 'pgvector ausente: kb_documents SIN columna embedding. '
      'Instala pgvector y re-ejecuta 001+002 para añadirla.';
  END IF;
END
$$;

-- =============================================================================
-- ÍNDICES
-- =============================================================================

-- Aislamiento/consulta por tenant en cada tabla aislable.
CREATE INDEX IF NOT EXISTS idx_users_tenant            ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_tenant       ON workspaces (tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant    ON conversations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_documents_tenant     ON kb_documents (tenant_id);

-- conversations: "Historial" ordena por updated_at desc dentro del tenant.
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_updated
  ON conversations (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_workspace
  ON conversations (workspace_id);

-- messages: listado de un hilo en orden cronológico.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_tenant
  ON messages (tenant_id);

-- pg_trgm GIN para búsqueda difusa en campos de texto buscables.
CREATE INDEX IF NOT EXISTS idx_workspaces_name_trgm
  ON workspaces USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_conversations_title_trgm
  ON conversations USING gin (title gin_trgm_ops);

-- FTS nativo (tsvector, sin extensión) opcional sobre contenido largo.
-- Índices funcionales en español para búsqueda full-text.
CREATE INDEX IF NOT EXISTS idx_messages_content_fts
  ON messages USING gin (to_tsvector('spanish', content));
CREATE INDEX IF NOT EXISTS idx_kb_documents_body_fts
  ON kb_documents USING gin (to_tsvector('spanish', coalesce(title,'') || ' ' || coalesce(body,'')));

-- =============================================================================
-- TRIGGER updated_at — mantiene updated_at en cada UPDATE.
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','workspaces','conversations'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON %1$s;'
      'CREATE TRIGGER trg_%1$s_updated_at BEFORE UPDATE ON %1$s '
      'FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t);
  END LOOP;
END
$$;
