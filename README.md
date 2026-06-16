# FaberLoom

Copiloto de backoffice comercial B2B (MWT). Esta entrega es el **scaffold local**:
shell completo + surface **SpaceLoom**, sobre el stack canónico **FastAPI + PostgreSQL 16
(RLS) + Next.js 15**. Pensado para correr **en local ahora** y subir a GitHub/Docker
después sin cambiar rutas.

> Naming canónico (nunca se traduce): **FaberLoom**, **SpaceLoom**, **WorkLoom**, **StackLoom**.

## Estructura

```
app/          Backend FastAPI (Pydantic v2, SQLAlchemy 2.0 async) · canon
  api/space/  Endpoints SpaceLoom
  core/       config, db, contexto de tenant (RLS por servidor)
  db/         modelos + notas de policies
  engine/     placeholder engine ejecutor single-agent (E1)
  worker/     placeholder workers async
alembic/      Migraciones (para la fase Docker; en local se usa /sql)
sql/          Bootstrap LOCAL por psql (001→004) + README con comandos
frontend/     Next.js 15 App Router · TS estricto · 7 temas del mock
docker-compose.yml · Caddyfile · scripts/redeploy_vps.sh   (STUBS, fase Docker)
```

## Requisitos

- **PostgreSQL 16+** corriendo en `localhost:5432` (ya lo tenés).
- **Python 3.12** (3.10+ funciona) con `pip` y `venv`.
- **Node.js 18.18+** (recomendado 20+) con `npm`.
- (Opcional) **pgvector** para la columna de embeddings; si falta, el bootstrap NO se rompe.

---

## 1) Base de datos (una sola vez)

Crea la base, el rol de app y aplica el esquema con RLS. Comandos completos en
[`sql/README.md`](sql/README.md). Resumen (Windows / PowerShell):

```powershell
cd C:\Users\ale13\OneDrive\Documents\faber_loom\sql
psql -U postgres -h localhost -c "CREATE ROLE faberloom LOGIN PASSWORD 'faberloom';"
psql -U postgres -h localhost -c "CREATE DATABASE faberloom OWNER faberloom;"
psql -U postgres -h localhost -d faberloom -v ON_ERROR_STOP=1 `
  -f 001_extensions.sql -f 002_schema.sql -f 003_rls.sql -f 004_seed.sql -f 005_auth.sql
```

> **Si ya creaste la DB antes** (sin `005_auth.sql`), basta con aplicar ese:
> `psql -U postgres -h localhost -d faberloom -v ON_ERROR_STOP=1 -f 005_auth.sql`

Esto crea el rol de app `faberloom_app` (NOSUPERUSER, NOBYPASSRLS), las tablas con
`tenant_id NOT NULL` + RLS `ENABLE + FORCE`, y el seed de demo (tenant `mwt`, owner
`alvaro@mwt.local`, 6 workspaces, **0 mensajes**).

## 2) Backend (FastAPI · puerto 8000)

```powershell
cd C:\Users\ale13\OneDrive\Documents\faber_loom
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env          # ajustar si tu password de Postgres difiere
uvicorn app.main:app --reload --port 8000
```

Verificar: <http://localhost:8000/api/health> → `{"status":"ok","db":true}`
y <http://localhost:8000/api/space/workspaces> → los 6 workspaces del seed.
Docs interactivas: <http://localhost:8000/docs>.

> El backend conecta como `faberloom_app` para que la RLS aplique. El tenant se
> fija **por servidor** en cada request (`SET LOCAL app.current_tenant_id`), nunca
> desde un header de cliente (R2).

## 3) Frontend (Next.js · puerto 3000)

```powershell
cd C:\Users\ale13\OneDrive\Documents\faber_loom\frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Abrir <http://localhost:3000>. Sin sesión, te redirige a `/es/login`.

**Credenciales de demo** (solo local): `alvaro@mwt.local` / `faberloom`.

Tras entrar vas a `/es/space` (SpaceLoom). El shell trae los **7 temas** del mock
(Faber Warm por defecto), rail de navegación, y el composer con HITL. El rail
"My Workspaces" / "Historial" se puebla desde la API. El botón de **cerrar sesión**
está en el pie del rail izquierdo (junto a tu usuario).

### Autenticación (cómo funciona)

- Login (`POST /api/auth/login`) verifica email+password contra Postgres (bcrypt
  vía pgcrypto) y devuelve una cookie **httpOnly firmada (JWT)**; el `tenant_id`
  viaja firmado dentro del token, nunca en un header de cliente (R2).
- Cada request al API exige sesión válida; sin ella, las rutas de SpaceLoom
  responden `401` y el frontend te manda al login.
- Logout (`POST /api/auth/logout`) borra la cookie.
- Para entornos reales: cambiá `JWT_SECRET` en `.env` y poné `COOKIE_SECURE=true`
  (requiere https).

---

## Reglas de oro respetadas en este scaffold

- **R2 · Multi-tenant:** `tenant_id NOT NULL` + RLS `FORCE` en toda tabla aislable;
  el tenant fluye por contexto del servidor.
- **R3 · HITL absoluto:** ningún output sale solo. El POST de mensaje devuelve un
  `assistant` **placeholder** (el engine ejecutor real no se conecta en local) con
  `is_grounded=false`; nada se autoenvía.
- **R1 · No inventar datos:** seed claramente ficticio; cero precios/condiciones.
- **R7 · Tipado estricto:** Pydantic v2 estricto (sin `Any`) + TypeScript `strict`.
- **R8 · Tokens del shell:** cero hex en componentes; los 7 `data-theme` del mock.

## Notas hacia Docker/GitHub (después)

- `sql/` es para el bootstrap **local**. En Docker, el esquema viaja por
  `alembic/versions/` (`alembic upgrade head` en `scripts/redeploy_vps.sh`).
- `docker-compose.yml`, `Caddyfile` y `scripts/redeploy_vps.sh` ya fijan nombres de
  servicio y puertos para que las rutas no cambien al migrar. Faltan los `Dockerfile`
  de `api` y `web`, que se definen al entrar a la fase Docker.
- Las rutas internas (`app/...`, `frontend/src/...`) ya siguen el canon del proyecto.
