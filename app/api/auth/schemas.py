"""Esquemas Pydantic v2 (estrictos) para autenticación."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

UserRole = Literal["owner", "admin", "operator", "supervisor", "viewer"]


class LoginIn(BaseModel):
    """Body de POST /api/auth/login."""

    model_config = ConfigDict(strict=True, extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    """Usuario autenticado expuesto al cliente (sin datos sensibles)."""

    model_config = ConfigDict(strict=True, extra="forbid", from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    role: UserRole
    tenant_id: uuid.UUID


class LogoutOut(BaseModel):
    """Respuesta de logout."""

    model_config = ConfigDict(strict=True, extra="forbid")

    ok: Literal[True] = True


class RecoveryRequestIn(BaseModel):
    """Body de POST /api/auth/recovery/request."""

    model_config = ConfigDict(strict=True, extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    lang: str = Field(default="es", min_length=2, max_length=10)


class RecoveryResetIn(BaseModel):
    """Body de POST /api/auth/recovery/reset."""

    model_config = ConfigDict(strict=True, extra="forbid")

    token: str = Field(min_length=10, max_length=256)
    password: str = Field(min_length=8, max_length=200)
