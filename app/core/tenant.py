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

from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_session


@dataclass(frozen=True, slots=True)
class TenantContext:
    """Contexto resuelto del request: tenant y usuario logueado."""

    tenant_id: uuid.UUID
    user_id: uuid.UUID
    user_email: str


async def get_tenant_ctx(
    session: AsyncSession = Depends(get_session),
    session_email: str | None = Cookie(default=None),
    session_tenant_id: str | None = Cookie(default=None),
) -> AsyncGenerator[TenantContext, None]:
    """Dependencia: fija el tenant en la sesión y entrega el `TenantContext`.

    Pasos:
      1. Inicia una transacción (begin) para que `SET LOCAL` tenga alcance.
      2. Valida la sesión a partir de las cookies `session_email` y `session_tenant_id`.
      3. Resuelve el usuario por email.
      4. Ejecuta `SET LOCAL app.current_tenant_id`.
      5. Entrega el contexto; el commit/rollback lo gestiona el `begin()`.

    Errores:
      * 401 si no está autenticado o la sesión es inválida.
      * 503 si la base de datos no está disponible.
    """
    email_to_use = session_email
    tenant_id_to_use = session_tenant_id

    # Fallback para local development sólo si las cookies no están y settings
    # tiene configurados DEV_USER_EMAIL y DEV_TENANT_ID (para no romper tests locales).
    if not email_to_use or not tenant_id_to_use:
        email_to_use = settings.DEV_USER_EMAIL
        tenant_id_to_use = settings.DEV_TENANT_ID

    if not email_to_use or not tenant_id_to_use:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado.",
        )

    try:
        async with session.begin():
            # Paso 1: fijar el tenant de la sesión ANTES de cualquier query con RLS.
            await session.execute(
                text("SELECT set_config('app.current_tenant_id', :tid, true)"),
                {"tid": tenant_id_to_use},
            )

            # Paso 2: resolver el usuario logueado
            result = await session.execute(
                text(
                    "SELECT id, tenant_id, email FROM users "
                    "WHERE email = :email LIMIT 1"
                ),
                {"email": email_to_use},
            )
            row = result.first()
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Usuario no encontrado o sesión inválida.",
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
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de datos no disponible.",
        ) from exc
