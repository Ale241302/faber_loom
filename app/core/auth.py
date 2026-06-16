"""Dependencia de autenticación: usuario actual desde la cookie de sesión.

Lee la cookie httpOnly, valida el JWT y entrega los `SessionClaims`. Si falta o
es inválida, responde 401. El `tenant_id` viaja firmado en el token y NUNCA se
toma de un header de cliente (R2).
"""

from __future__ import annotations

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.security import SessionClaims, decode_session_token


def get_current_user(request: Request) -> SessionClaims:
    """Devuelve los claims de la sesión o lanza 401 si no hay sesión válida."""
    token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado.",
        )
    claims = decode_session_token(token)
    if claims is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada.",
        )
    return claims
