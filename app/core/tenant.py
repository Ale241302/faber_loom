"""Contexto de tenant por servidor (R2).

Resuelve el tenant del usuario dev (por `DEV_USER_EMAIL`) y ejecuta
`SET LOCAL app.current_tenant_id = '<uuid>'` dentro de la sesión/transacción
en curso. NUNCA lee el tenant de un header de cliente.

Toda query del request corre dentro de esta sesión, donde RLS aplica usando
`current_setting('app.current_tenant_id', true)::uuid`.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session


@dataclass(frozen=True, slots=True)
class TenantContext:
    """Contexto resuelto del request: tenant y usuario dev."""

    tenant_id: uuid.UUID
    user_id: uuid.UUID
    user_email: str


async def get_tenant_ctx(
    session: AsyncSession = Depends(get_session),
) -> AsyncGenerator[TenantContext, None]:
    """Dependencia: fija el tenant en la sesión y entrega el `TenantContext`.

    Pasos:
      1. Inicia una transacción (begin) para que `SET LOCAL` tenga alcance.
      2. Resuelve el usuario dev por `DEV_USER_EMAIL` (consulta a `users`).
      3. Ejecuta `SET LOCAL app.current_tenant_id`.
      4. Entrega el contexto; el commit/rollback lo gestiona el `begin()`.

    Errores:
      * 503 si la base de datos no está disponible.
      * 503 si el usuario dev / tenant no existen (DB sin seed).
    """
    try:
        async with session.begin():
            # Paso 1: fijar el tenant dev ANTES de cualquier query con RLS.
            # `users` está protegida por RLS (ENABLE + FORCE); sin fijar el
            # tenant primero, el SELECT de abajo devolvería 0 filas y nunca
            # podríamos resolver el contexto (bootstrap chicken-and-egg).
            # El tenant_id dev se toma de settings (NUNCA de un header — R2).
            await session.execute(
                text("SELECT set_config('app.current_tenant_id', :tid, true)"),
                {"tid": settings.DEV_TENANT_ID},
            )

            # Paso 2: resolver el usuario dev (ya visible bajo RLS del tenant).
            result = await session.execute(
                text(
                    "SELECT id, tenant_id, email FROM users "
                    "WHERE email = :email LIMIT 1"
                ),
                {"email": settings.DEV_USER_EMAIL},
            )
            row = result.first()
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=(
                        "Usuario dev no encontrado; la base de datos no está "
                        "sembrada (ver sql/004_seed.sql)."
                    ),
                )

            user_id: uuid.UUID = row[0]
            tenant_id: uuid.UUID = row[1]
            user_email: str = row[2]

            # SET LOCAL con valor parametrizado de forma segura (set_config).
            await session.execute(
                text(
                    "SELECT set_config('app.current_tenant_id', :tid, true)"
                ),
                {"tid": str(tenant_id)},
            )

            ctx = TenantContext(
                tenant_id=tenant_id,
                user_id=user_id,
                user_email=user_email,
            )
            yield ctx
    except HTTPException:
        raise
    except (SQLAlchemyError, OSError) as exc:
        # DB caída: SQLAlchemyError (driver) u OSError/ConnectionRefusedError
        # que asyncpg puede propagar sin envolver al fallar el connect.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de datos no disponible.",
        ) from exc
