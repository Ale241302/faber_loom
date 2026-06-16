"""Seguridad de sesión: emisión/verificación de JWT y helpers de cookie.

La sesión se transporta en una cookie httpOnly firmada (JWT HS256). El cliente
nunca ve ni manipula el `tenant_id`: viaja firmado dentro del token y el
servidor lo usa para fijar el contexto RLS (R2).
"""

from __future__ import annotations

import datetime as dt
import uuid
from dataclasses import dataclass

import jwt
from fastapi import Response

from app.core.config import settings


@dataclass(frozen=True, slots=True)
class SessionClaims:
    """Claims de la sesión autenticada (decodificados del JWT)."""

    user_id: uuid.UUID
    tenant_id: uuid.UUID
    email: str
    name: str
    role: str


def create_session_token(
    *,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    email: str,
    name: str,
    role: str,
) -> str:
    """Crea un JWT firmado con los claims de la sesión."""
    now = dt.datetime.now(tz=dt.timezone.utc)
    payload = {
        "sub": str(user_id),
        "tid": str(tenant_id),
        "email": email,
        "name": name,
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(
            (now + dt.timedelta(hours=settings.JWT_EXPIRE_HOURS)).timestamp()
        ),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)


def decode_session_token(token: str) -> SessionClaims | None:
    """Decodifica/valida el JWT. Devuelve None si es inválido o expiró."""
    try:
        data = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALG],
        )
        return SessionClaims(
            user_id=uuid.UUID(str(data["sub"])),
            tenant_id=uuid.UUID(str(data["tid"])),
            email=str(data["email"]),
            name=str(data["name"]),
            role=str(data["role"]),
        )
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None


def set_session_cookie(response: Response, token: str) -> None:
    """Fija la cookie de sesión httpOnly en la respuesta."""
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.JWT_EXPIRE_HOURS * 3600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    """Borra la cookie de sesión (logout)."""
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
    )
