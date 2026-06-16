"""Motor async SQLAlchemy 2.0 + asyncpg, sessionmaker y dependencia de sesión.

El engine se crea de forma perezosa y NO abre conexiones al importar: la app
debe levantar aunque la base de datos esté caída (health -> db:false).
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# create_async_engine no abre conexiones hasta el primer uso, así que es seguro
# crearlo a nivel de módulo aunque Postgres no esté disponible todavía.
#
# `timeout`/`command_timeout` (asyncpg) acotan el intento de conexión para que,
# si la DB no está, `/api/health` devuelva db:false rápido sin colgarse.
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    future=True,
    connect_args={"timeout": 3, "command_timeout": 5},
)

SessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependencia FastAPI: provee una `AsyncSession` por request.

    No fija el tenant; eso lo hace `get_tenant_ctx`, que depende de esta sesión.
    """
    async with SessionLocal() as session:
        yield session
