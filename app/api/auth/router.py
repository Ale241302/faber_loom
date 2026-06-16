"""Endpoints de autenticación: login, logout, me.

- login: verifica credenciales contra `fl_auth_login` (función SECURITY DEFINER
  que respeta el aislamiento; ver sql/005_auth.sql) y fija la cookie de sesión.
- logout: borra la cookie.
- me: devuelve el usuario autenticado a partir de la cookie.

HITL/seguridad: aquí NO se envía nada cliente-facing; solo se gestiona sesión.
"""

from __future__ import annotations

import uuid
import hashlib
import secrets
import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth.schemas import (
    LoginIn,
    LogoutOut,
    UserOut,
    RecoveryRequestIn,
    RecoveryResetIn,
)
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.db import get_session
from app.core.mail import send_password_reset_email
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


@router.post("/recovery/request")
async def recovery_request(
    body: RecoveryRequestIn,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Solicita el restablecimiento de contraseña. Si el email existe,
    se genera un token y se envía un enlace por correo electrónico.
    Siempre devuelve {"ok": True} para evitar enumeración de usuarios.
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = dt.datetime.now(tz=dt.timezone.utc) + dt.timedelta(hours=2)

    try:
        result = await session.execute(
            text(
                "SELECT o_token_id, o_tenant_id, o_user_id, o_user_name, o_user_email "
                "FROM fl_auth_create_reset_token(:email, :token_hash, :expires_at)"
            ),
            {
                "email": body.email.strip(),
                "token_hash": token_hash,
                "expires_at": expires_at,
            },
        )
        row = result.first()
        await session.commit()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al procesar la solicitud.",
        ) from exc

    if row:
        token_id, tenant_id, user_id, user_name, user_email = row
        lang = body.lang or "es"
        reset_url = f"{settings.FRONTEND_URL}/{lang}/reset-password?token={raw_token}"
        
        send_password_reset_email(
            to_email=user_email,
            name=user_name,
            reset_url=reset_url,
            expires_hours=2,
        )

    return {"ok": True}


@router.post("/recovery/reset", response_model=UserOut)
async def recovery_reset(
    body: RecoveryResetIn,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> UserOut:
    """Verifica el token de restablecimiento y actualiza la contraseña.
    Si tiene éxito, inicia la sesión del usuario inmediatamente fijando la cookie.
    """
    token_hash = hashlib.sha256(body.token.encode("utf-8")).hexdigest()

    try:
        result = await session.execute(
            text(
                "SELECT o_id, o_tenant_id, o_email, o_name, o_role "
                "FROM fl_auth_confirm_reset_token(:token_hash, :password)"
            ),
            {"token_hash": token_hash, "password": body.password},
        )
        row = result.first()
        await session.commit()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar la contraseña.",
        ) from exc

    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido, consumido o expirado.",
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
