"""Configuración de la aplicación vía Pydantic Settings.

Lee de variables de entorno y/o `.env`. Sin valores comerciales (R1).
"""

from __future__ import annotations

from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings tipados. Cargados desde `.env` (ver `.env.example`)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Conexión async (asyncpg). Se conecta como el rol de app `faberloom_app`
    # (NOSUPERUSER, NOBYPASSRLS) para que la RLS aplique siempre (R2).
    DATABASE_URL: str = (
        "postgresql+asyncpg://faberloom_app:faberloom@localhost:5432/faberloom"
    )

    # Usuario dev fijo: el tenant se resuelve por servidor a partir de este
    # email, NUNCA desde un header de cliente (R2).
    DEV_USER_EMAIL: str = "alvaro@mwt.local"

    # Tenant dev (uuid del seed 'mwt'). Se fija en la sesión ANTES de la
    # primera query para evitar el bootstrap chicken-and-egg con RLS.
    DEV_TENANT_ID: str = "00000000-0000-0000-0000-0000000000a1"

    # Orígenes CORS permitidos (coma-separados).
    CORS_ORIGINS: str = "http://localhost:3000"

    # ── Sesión / JWT (cookie httpOnly) ──
    # CAMBIAR en cualquier entorno real (poné un secreto largo y aleatorio).
    JWT_SECRET: str = "dev-insecure-change-me-please-32+chars"
    JWT_ALG: str = "HS256"
    JWT_EXPIRE_HOURS: int = 8
    SESSION_COOKIE_NAME: str = "fl_session"
    # En local (http) Secure debe ser False; en prod (https) ponelo True.
    COOKIE_SECURE: bool = False
    # 'lax' funciona para localhost:3000 -> localhost:8000 (mismo site).
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"

    @property
    def cors_origins_list(self) -> list[str]:
        """Lista de orígenes CORS a partir de la cadena coma-separada."""
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()
