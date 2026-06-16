-- =============================================================================
-- FaberLoom · 004_seed.sql
-- Datos de DEMO claramente ficticios y NO operativos (R1).
-- NO inventa precios ni datos comerciales. El thread arranca SIN mensajes.
-- Se ejecuta como superusuario / owner (puede insertar en tenants; RLS no
-- bloquea al owner sólo si hay policy, pero como owner del seed usamos el
-- patrón de fijar el tenant en sesión para las tablas hijas).
--
-- Idempotente: usa ON CONFLICT DO NOTHING sobre las claves naturales.
--
-- Todo el seed va dentro de UNA transacción explícita (BEGIN/COMMIT) para que
-- `SET LOCAL app.current_tenant_id` aplique correctamente al bloque y, así, la
-- RLS por tenant permita insertar en las tablas hijas incluso si el seed se
-- corre como owner no-superusuario (FORCE RLS aplica también al owner).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Tenant raíz de demo: MuitoWork (MWT).
-- -----------------------------------------------------------------------------
INSERT INTO tenants (id, slug, name)
VALUES ('00000000-0000-0000-0000-0000000000a1', 'mwt', 'MuitoWork (MWT)')
ON CONFLICT (slug) DO NOTHING;

-- Fijamos el tenant en la transacción para que la RLS permita insertar en las
-- tablas hijas (FORCE RLS aplica también al owner del seed).
SET LOCAL app.current_tenant_id = '00000000-0000-0000-0000-0000000000a1';

-- -----------------------------------------------------------------------------
-- 2) Usuario owner de demo.
-- -----------------------------------------------------------------------------
INSERT INTO users (id, tenant_id, email, name, role, password)
VALUES (
  '00000000-0000-0000-0000-0000000000b1',
  '00000000-0000-0000-0000-0000000000a1',
  'alvaro@mwt.local', 'Alvaro', 'owner', 'default_pass'
)
ON CONFLICT (tenant_id, email) DO NOTHING;

INSERT INTO users (id, tenant_id, email, name, role, password)
VALUES 
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'alejandro@muitowork.com', 'Alejandro', 'admin', 'Ale241302'),
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'alvaro@muitowork.com', 'Alvaro', 'admin', 'MuitoWork2026')
ON CONFLICT (tenant_id, email) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3) Workspaces "My Workspaces" (client/topic) del mock.
--    color_token = token semántico (NO hex).
-- -----------------------------------------------------------------------------
INSERT INTO workspaces (id, tenant_id, name, kind, color_token, subtitle) VALUES
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1',
   'Sondel SA',            'client', 'coral', NULL),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000a1',
   'Industrias Norte',     'client', 'amber', NULL),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000a1',
   'Rana Walk',            'client', 'sage',  NULL),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000a1',
   'Precios dieléctrica',  'topic',  'slate', NULL)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4) Shared Workspaces del mock.
-- -----------------------------------------------------------------------------
INSERT INTO workspaces (id, tenant_id, name, kind, color_token, subtitle) VALUES
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000a1',
   'Licitación Q3 · Construx', 'shared', 'vino',  NULL),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000a1',
   'Corporativo MWT',          'shared', 'slate', NULL)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5) Conversaciones / mensajes:
--    NINGUNA. El thread arranca vacío con el empty-state del mock.
--    (No se inserta en conversations ni messages: 0 mensajes por diseño, R3.)
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 6) kb_documents: SIN datos (placeholder grounding, R1).
--    No se siembran documentos para no introducir datos inventados.
-- -----------------------------------------------------------------------------

COMMIT;
