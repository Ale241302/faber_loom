"""Endpoints de autenticación: login, logout, me.

- login: verifica credenciales contra `fl_auth_login` (función SECURITY DEFINER
  que respeta el aislamiento; ver sql/005_auth.sql) y fija la cookie de sesión.
- logout: borra la cookie.
- me: devuelve el usuario autenticado a partir de la cookie.

HITL/seguridad: aquí NO se envía nada cliente-facing; solo se gestiona sesión.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.schemas import LoginIn, LogoutOut, UserOut
from app.core.auth import get_current_user
from app.core.db import get_session
from app.core.security import (
    SessionClaims,
    clear_session_cookie,
    create_session_token,
    set_session_cookie,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserOut)
async def login(
    body: LoginIn,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    """Valida email+password y emite la cookie de sesión httpOnly."""
    try:
        result = await session.execute(
            text(
                "SELECT id, tenant_id, email, name, role "
                "FROM fl_auth_login(:email, :password)"
            ),
            {"email": body.email, "password": body.password},
        )
        row = result.first()
    except (SQLAlchemyError, OSError) as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de datos no disponible.",
        ) from exc

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas.",
        )

    user_id: uuid.UUID = row[0]
    tenant_id: uuid.UUID = row[1]
    email: str = row[2]
    name: str = row[3]
    role: str = row[4]

    token = create_session_token(
        user_id=user_id,
        tenant_id=tenant_id,
        email=email,
        name=name,
        role=role,
    )
    set_session_cookie(response, token)

    return UserOut(
        id=user_id,
        email=email,
        name=name,
        role=role,  # type: ignore[arg-type]
        tenant_id=tenant_id,
    )


@router.post("/logout", response_model=LogoutOut)
async def logout(response: Response) -> LogoutOut:
    """Cierra la sesión borrando la cookie."""
    clear_session_cookie(response)
    return LogoutOut()


@router.get("/me", response_model=UserOut)
async def me(claims: SessionClaims = Depends(get_current_user)) -> UserOut:
    """Devuelve el usuario autenticado a partir de la cookie de sesión."""
    return UserOut(
        id=claims.user_id,
        email=claims.email,
        name=claims.name,
        role=claims.role,  # type: ignore[arg-type]
        tenant_id=claims.tenant_id,
    )
