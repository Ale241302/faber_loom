from __future__ import annotations

import uuid
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Response, status, Cookie
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session

router = APIRouter(prefix="/auth", tags=["auth"])

class LoginRequest(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")
    email: str
    password: str

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    tenant_id: uuid.UUID

class LoginResponse(BaseModel):
    status: Literal["ok"]
    user: UserOut


@router.post("/login", response_model=LoginResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> LoginResponse:
    """Verifica las credenciales y establece las cookies de sesión."""
    try:
        # Para poder buscar en la tabla `users` con RLS habilitado,
        # fijamos temporalmente el tenant al de demo ('mwt').
        demo_tenant_id = "00000000-0000-0000-0000-0000000000a1"
        await session.execute(
            text("SELECT set_config('app.current_tenant_id', :tid, true)"),
            {"tid": demo_tenant_id},
        )

        # Buscamos el usuario por email y clave
        result = await session.execute(
            text(
                "SELECT id, tenant_id, email, name, role FROM users "
                "WHERE email = :email AND password = :password LIMIT 1"
            ),
            {"email": payload.email, "password": payload.password},
        )
        row = result.first()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas.",
            )

        user_id: uuid.UUID = row[0]
        tenant_id: uuid.UUID = row[1]
        email: str = row[2]
        name: str = row[3]
        role: str = row[4]

        # Establecemos las cookies de sesión
        response.set_cookie(
            key="session_email",
            value=email,
            httponly=True,
            samesite="lax",
            path="/",
            max_age=86400 * 7,  # 7 días
        )
        response.set_cookie(
            key="session_tenant_id",
            value=str(tenant_id),
            httponly=True,
            samesite="lax",
            path="/",
            max_age=86400 * 7,
        )

        user_out = UserOut(
            id=user_id,
            email=email,
            name=name,
            role=role,
            tenant_id=tenant_id
        )
        return LoginResponse(status="ok", user=user_out)

    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de datos no disponible.",
        ) from exc


@router.post("/logout")
async def logout(response: Response) -> dict[str, str]:
    """Elimina las cookies de sesión."""
    response.delete_cookie(key="session_email", path="/")
    response.delete_cookie(key="session_tenant_id", path="/")
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
async def me(
    session: AsyncSession = Depends(get_session),
    session_email: str | None = Cookie(default=None),
    session_tenant_id: str | None = Cookie(default=None),
) -> UserOut:
    """Devuelve la información del usuario logueado basado en las cookies."""
    if not session_email or not session_tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado.",
        )

    try:
        # Fijamos el tenant de la cookie en la sesión para RLS
        await session.execute(
            text("SELECT set_config('app.current_tenant_id', :tid, true)"),
            {"tid": session_tenant_id},
        )

        result = await session.execute(
            text(
                "SELECT id, tenant_id, email, name, role FROM users "
                "WHERE email = :email LIMIT 1"
            ),
            {"email": session_email},
        )
        row = result.first()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado o sesión inválida.",
            )

        return UserOut(
            id=row[0],
            tenant_id=row[1],
            email=row[2],
            name=row[3],
            role=row[4]
        )
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Base de datos no disponible.",
        ) from exc
