-- =============================================================================
-- FaberLoom · 001_extensions.sql
-- Extensiones requeridas por el slice SpaceLoom (PostgreSQL 16+).
-- Se ejecuta como superusuario / owner de la base (no como el rol de app).
-- =============================================================================

-- pgcrypto: provee gen_random_uuid() para los PKs uuid del schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_trgm: índices GIN trigram para búsqueda difusa por texto
-- (workspaces.name, conversations.title).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------------------
-- pgvector (embeddings de grounding en kb_documents).
--
-- IMPORTANTE: 'vector' NO viene en el core de PostgreSQL; requiere el paquete
-- pgvector instalado en el servidor (p.ej. `apt install postgresql-16-pgvector`
-- o el paquete `pgvector` de conda-forge).
--
-- Lo dejamos en su PROPIO statement y de forma TOLERANTE A FALLOS: si la
-- extensión no está disponible, emitimos un WARNING pero NO abortamos el
-- bootstrap. El resto del schema (002_schema.sql) NO depende de que 'vector'
-- exista: la columna kb_documents.embedding se añade condicionalmente mediante
-- un bloque DO que comprueba la presencia de la extensión.
--
-- Si ves el WARNING y quieres grounding vectorial real:
--   1) instala pgvector en el servidor,
--   2) vuelve a ejecutar este archivo (CREATE EXTENSION IF NOT EXISTS vector),
--   3) re-ejecuta 002_schema.sql (el bloque DO añadirá la columna embedding).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
  RAISE NOTICE 'Extensión "vector" (pgvector) disponible: grounding vectorial habilitado.';
EXCEPTION
  WHEN undefined_file OR feature_not_supported OR insufficient_privilege OR OTHERS THEN
    RAISE WARNING 'No se pudo instalar la extensión "vector" (pgvector): %. '
      'El bootstrap continúa SIN columna de embeddings. '
      'Instala pgvector y re-ejecuta 001+002 para habilitar embeddings.', SQLERRM;
END
$$;
