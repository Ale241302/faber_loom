#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# FaberLoom · redeploy en el VPS (Docker)
# STUB listo para la fase Docker/GitHub. NO se usa en desarrollo local.
# Lo invoca el bloque de DESPLIEGUE tras `git pull origin` en el VPS.
# ════════════════════════════════════════════════════════════════════
set -euo pipefail

echo "[FaberLoom] Redeploy iniciado: $(date -u +%FT%TZ)"

# 1) Reconstruir imágenes con los cambios bajados de GitHub.
docker compose build

# 2) Aplicar migraciones de DB (Alembic) dentro del contenedor de la API.
#    En producción la verdad del schema vive en alembic/versions/, NO en /sql.
docker compose run --rm api alembic upgrade head

# 3) Levantar/reemplazar servicios sin downtime perceptible.
docker compose up -d

# 4) Limpieza de imágenes huérfanas.
docker image prune -f

echo "[FaberLoom] Redeploy OK: $(date -u +%FT%TZ)"
