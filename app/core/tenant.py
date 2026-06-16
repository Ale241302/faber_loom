"""Contexto de tenant por servidor (R2).

Deriva el tenant del usuario AUTENTICADO (claims firmados en la cookie de
sesión) y ejecuta `SET LOCAL app.current_tenant_id` dentro de la transacción en
curso. NUNCA lee el tenant de un header de cliente.

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

from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.security import SessionClaims


@dataclass(frozen=True, slots=True)
class TenantContext:
    """Contexto resuelto del request: tenant y usuario autenticado."""

    tenant_id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_name: str
    user_role: str


async def get_tenant_ctx(
    session: AsyncSession = Depends(get_session),
    claims: SessionClaims = Depends(get_current_user),
) -> AsyncGenerator[TenantContext, None]:
    """Fija el tenant del usuario autenticado en la sesión y entrega el ctx.

    Pasos:
      1. Inicia una transacción (begin) para que `SET LOCAL` tenga alcance.
      2. Fija `app.current_tenant_id` desde el `tenant_id` firmado en el JWT.
      3. Entrega el contexto; commit/rollback lo gestiona el `begin()`.

    Errores:
      * 401 lo lanza `get_current_user` si no hay sesión válida.
      * 503 si la base de datos no está disponible.
    """
    try:
        async with session.begin():
            # El tenant viene firmado en la cookie (no de un header) — R2.
            await session.execute(
                text("SELECT set_config('app.current_tenant_id', :tid, true)"),
                {"tid": str(claims.tenant_id)},
            )
            yield TenantContext(
                tenant_id=claims.tenant_id,
                user_id=claims.user_id,
                user_email=claims.email,
                user_name=claims.name,
                user_role=claims.role,
            )
    except HTTPException:
        raise
    except (SQLAlchemyError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de datos no disponible.",
        ) from exc
