# FaberLoom · Bootstrap SQL local (slice SpaceLoom)

Bootstrap de la base `faberloom` por `psql` para desarrollo **LOCAL** (sin Docker).
Implementa el schema multi-tenant (R2) con RLS `ENABLE + FORCE` y un rol de
aplicación `faberloom_app` (`NOSUPERUSER`, `NOBYPASSRLS`) para que el aislamiento
por tenant aplique siempre.

## Archivos (se aplican EN ORDEN 001 -> 004)

| Archivo | Qué hace |
|---|---|
| `001_extensions.sql` | `pgcrypto`, `pg_trgm` y `vector` (pgvector, tolerante a fallos). |
| `002_schema.sql` | Tablas `tenants, users, workspaces, conversations, messages, kb_documents`, índices (trgm + FTS), trigger `updated_at`. La columna `kb_documents.embedding vector(1536)` se añade **solo si pgvector está instalado**. |
| `003_rls.sql` | Crea el rol `faberloom_app`, otorga DML y define las policies RLS por `tenant_id`. |
| `004_seed.sql` | Datos de demo ficticios (1 tenant, 1 owner, 6 workspaces). **0 mensajes**. |
| `005_auth.sql` | Añade `users.password_hash` + función de login `fl_auth_login` (SECURITY DEFINER, respeta el aislamiento) y fija la contraseña de demo del owner. |

> Si pgvector **no** está instalado, el bootstrap **no se rompe**: 001 emite un
> WARNING y 002 omite la columna `embedding`. Para habilitar embeddings, instala
> pgvector y vuelve a ejecutar `001` + `002`.

## Requisitos

- PostgreSQL 16+ corriendo en `localhost:5432`.
- `psql` en el PATH (incluido en la instalación de PostgreSQL para Windows).
- (Opcional) pgvector para la columna de embeddings.

## Crear DB + rol owner y aplicar (Windows / PowerShell)

Los comandos asumen un superusuario `postgres`. Ajusta `-U` / `-h` a tu entorno.

```powershell
# 0) Ir a la carpeta sql del repo
cd C:\Users\ale13\OneDrive\Documents\faber_loom\sql

# 1) Crear el rol owner 'faberloom' (login) y la base 'faberloom'.
#    (Si ya existen, ignora el error "already exists".)
psql -U postgres -h localhost -c "CREATE ROLE faberloom LOGIN PASSWORD 'faberloom';"
psql -U postgres -h localhost -c "CREATE DATABASE faberloom OWNER faberloom;"

# 2) Aplicar los 4 archivos EN ORDEN sobre la base 'faberloom'.
#    Se ejecutan como superusuario 'postgres' (necesario para CREATE EXTENSION
#    y CREATE ROLE); el rol de app 'faberloom_app' lo crea 003_rls.sql.
#    -v ON_ERROR_STOP=1 aborta al primer error real.
psql -U postgres -h localhost -d faberloom -v ON_ERROR_STOP=1 -f 001_extensions.sql
psql -U postgres -h localhost -d faberloom -v ON_ERROR_STOP=1 -f 002_schema.sql
psql -U postgres -h localhost -d faberloom -v ON_ERROR_STOP=1 -f 003_rls.sql
psql -U postgres -h localhost -d faberloom -v ON_ERROR_STOP=1 -f 004_seed.sql
psql -U postgres -h localhost -d faberloom -v ON_ERROR_STOP=1 -f 005_auth.sql
```

### Credenciales de DEMO (solo desarrollo local)

```
email:    alvaro@mwt.local
password: faberloom
```

> Cambiá la contraseña en cualquier entorno real. El hash se guarda con bcrypt
> (pgcrypto); el login se verifica del lado de Postgres vía `fl_auth_login`.

Alternativa en un solo comando (mismo orden):

```powershell
psql -U postgres -h localhost -d faberloom -v ON_ERROR_STOP=1 `
  -f 001_extensions.sql -f 002_schema.sql -f 003_rls.sql -f 004_seed.sql -f 005_auth.sql
```

## Cadena de conexión de la app

```
postgresql://faberloom_app:faberloom@localhost:5432/faberloom
```

> El backend conecta como `faberloom_app` (NO como owner) para que la RLS aplique.
> En cada request, la dependencia de tenant ejecuta:
>
> ```sql
> SET LOCAL app.current_tenant_id = '<uuid-del-tenant>';
> ```
>
> **Nunca** se lee el `tenant_id` de un header de cliente (R2).

## Probar el aislamiento RLS (manual)

```powershell
# UUID del tenant de demo 'mwt' (fijo en el seed):
#   00000000-0000-0000-0000-0000000000a1

# Como rol de app, fijar el tenant y listar workspaces -> solo filas del tenant.
psql "postgresql://faberloom_app:faberloom@localhost:5432/faberloom" -c `
  "SET app.current_tenant_id = '00000000-0000-0000-0000-0000000000a1'; SELECT name, kind, color_token FROM workspaces ORDER BY name;"

# Sin fijar el tenant (o con otro uuid): 0 filas (fail-closed).
psql "postgresql://faberloom_app:faberloom@localhost:5432/faberloom" -c `
  "SELECT count(*) FROM workspaces;"
```

Con el tenant fijado verás los 6 workspaces de demo; sin fijarlo, `count = 0`.
