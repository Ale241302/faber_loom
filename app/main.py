"""Punto de entrada FastAPI de FaberLoom.

Crea la app, configura CORS (http://localhost:3000), monta los routers bajo
`/api` y expone `/api/health`. La app debe levantar aunque la base de datos no
esté disponible; `/api/health` reporta `db:false` en ese caso sin romper.
"""

from __future__ import annotations

from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy import text

from app.api.space.router import router as space_router
from app.core.config import settings
from app.core.db import engine

app = FastAPI(
    title="FaberLoom API",
    version="0.1.0",
    description="Backend SpaceLoom (scaffold local).",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HealthOut(BaseModel):
    """Respuesta de health-check."""

    model_config = ConfigDict(strict=True, extra="forbid")

    status: Literal["ok"]
    db: bool


@app.get("/api/health", response_model=HealthOut)
async def health() -> HealthOut:
    """Intenta `SELECT 1`; devuelve db:true/false sin romper si la DB cae."""
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception:  # noqa: BLE001 — health nunca debe propagar errores de DB.
        db_ok = False
    return HealthOut(status="ok", db=db_ok)


app.include_router(space_router, prefix="/api")
