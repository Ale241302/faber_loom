"""Esquemas Pydantic v2 (estrictos) para SpaceLoom.

Reglas: Pydantic v2 estricto, type hints completos, CERO `Any` (R7).
Las respuestas usan modelos `*Out` y reflejan EXACTO los campos del contrato.
"""

from __future__ import annotations

import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Literales de dominio (coinciden con los CHECK del esquema 002).
WorkspaceKind = Literal["client", "topic", "shared"]
ColorToken = Literal["coral", "amber", "sage", "slate", "vino"]
ModelTier = Literal["eco", "balanced", "sport"]
MessageRole = Literal["user", "assistant", "system"]


class _OrmModel(BaseModel):
    """Base estricta para modelos de salida leídos del ORM."""

    model_config = ConfigDict(
        from_attributes=True,
        strict=True,
        extra="forbid",
    )


class _InModel(BaseModel):
    """Base estricta para modelos de entrada (request bodies)."""

    model_config = ConfigDict(
        strict=True,
        extra="forbid",
    )


# Salidas -------------------------------------------------------------------


class WorkspaceOut(_OrmModel):
    """Workspace para el rail (My/Shared Workspaces)."""

    id: uuid.UUID
    name: str
    kind: WorkspaceKind
    color_token: ColorToken
    subtitle: str | None


class ConversationOut(_OrmModel):
    """Conversación para el "Historial" y la cabecera del thread."""

    id: uuid.UUID
    title: str
    workspace_id: uuid.UUID | None
    agent_handle: str
    model_tier: ModelTier
    updated_at: datetime.datetime


class MessageOut(_OrmModel):
    """Mensaje individual de una conversación."""

    id: uuid.UUID
    role: MessageRole
    content: str
    model_tier: ModelTier | None
    is_grounded: bool
    created_at: datetime.datetime


# Entradas ------------------------------------------------------------------


class ConversationCreate(_InModel):
    """Cuerpo para crear una conversación."""

    title: str = Field(min_length=1, max_length=200)
    workspace_id: uuid.UUID | None = None
    model_tier: ModelTier | None = None


class MessageCreate(_InModel):
    """Cuerpo para crear un mensaje del usuario."""

    content: str = Field(min_length=1)
    model_tier: ModelTier | None = None


# Resultado compuesto -------------------------------------------------------


class SendMessageResult(BaseModel):
    """Resultado del POST de mensaje: el del usuario + el placeholder HITL (R3).

    El `assistant` es SIEMPRE un placeholder con `is_grounded=false`; el engine
    real no está conectado en local y ningún output sale sin aprobación humana
    en WorkLoom.
    """

    model_config = ConfigDict(strict=True, extra="forbid")

    user: MessageOut
    assistant: MessageOut
