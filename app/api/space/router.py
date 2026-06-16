"""Router SpaceLoom (`/api/space`).

Todas las queries corren dentro de la sesión donde `get_tenant_ctx` ya ejecutó
`SET LOCAL app.current_tenant_id` (R2). RLS hace el filtrado por tenant; aun así
seteamos `tenant_id` explícito en los INSERT para satisfacer WITH CHECK.

HITL (R3): el POST de mensaje NO hace auto-send. Crea el mensaje 'user' y
devuelve un 'assistant' PLACEHOLDER fijo (is_grounded=false), sin datos
comerciales (R1).
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.space.schemas import (
    ConversationCreate,
    ConversationOut,
    MessageCreate,
    MessageOut,
    SendMessageResult,
    WorkspaceOut,
)
from app.core.db import get_session
from app.core.tenant import TenantContext, get_tenant_ctx
from app.db.models.space import Conversation, Message, Workspace

router = APIRouter(prefix="/space", tags=["space"])

# Texto fijo del placeholder HITL (R3). Sin precios ni datos comerciales (R1).
HITL_PLACEHOLDER: str = (
    "Recibí tu mensaje. El engine ejecutor real no está conectado en este "
    "entorno local, así que esta es una respuesta de marcador de posición. "
    "Ningún resultado se envía de forma automática: en FaberLoom todo output "
    "requiere aprobación humana (HITL) desde WorkLoom antes de salir. No genero "
    "precios ni datos comerciales en esta etapa."
)


def _db_unavailable(exc: SQLAlchemyError) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Base de datos no disponible.",
    )


@router.get("/workspaces", response_model=list[WorkspaceOut])
async def list_workspaces(
    ctx: TenantContext = Depends(get_tenant_ctx),
    session: AsyncSession = Depends(get_session),
) -> list[Workspace]:
    """Lista los workspaces del tenant activo."""
    try:
        result = await session.execute(
            select(Workspace).order_by(Workspace.created_at.asc())
        )
        return list(result.scalars().all())
    except SQLAlchemyError as exc:
        raise _db_unavailable(exc) from exc


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    ctx: TenantContext = Depends(get_tenant_ctx),
    session: AsyncSession = Depends(get_session),
) -> list[Conversation]:
    """Lista conversaciones del tenant, orden `updated_at desc` (Historial)."""
    try:
        result = await session.execute(
            select(Conversation).order_by(Conversation.updated_at.desc())
        )
        return list(result.scalars().all())
    except SQLAlchemyError as exc:
        raise _db_unavailable(exc) from exc


@router.post(
    "/conversations",
    response_model=ConversationOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_conversation(
    payload: ConversationCreate,
    ctx: TenantContext = Depends(get_tenant_ctx),
    session: AsyncSession = Depends(get_session),
) -> Conversation:
    """Crea una conversación para el tenant activo."""
    try:
        conversation = Conversation(
            tenant_id=ctx.tenant_id,
            workspace_id=payload.workspace_id,
            title=payload.title,
            created_by=ctx.user_id,
        )
        if payload.model_tier is not None:
            conversation.model_tier = payload.model_tier

        session.add(conversation)
        await session.flush()
        await session.refresh(conversation)
        await session.commit()
        return conversation
    except SQLAlchemyError as exc:
        await session.rollback()
        raise _db_unavailable(exc) from exc


async def _get_conversation_or_404(
    session: AsyncSession, conversation_id: uuid.UUID
) -> Conversation:
    result = await session.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversación no encontrada.",
        )
    return conversation


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageOut],
)
async def list_messages(
    conversation_id: uuid.UUID,
    ctx: TenantContext = Depends(get_tenant_ctx),
    session: AsyncSession = Depends(get_session),
) -> list[Message]:
    """Lista los mensajes de una conversación (orden cronológico)."""
    try:
        await _get_conversation_or_404(session, conversation_id)
        result = await session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise _db_unavailable(exc) from exc


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=SendMessageResult,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    ctx: TenantContext = Depends(get_tenant_ctx),
    session: AsyncSession = Depends(get_session),
) -> SendMessageResult:
    """Crea el mensaje del usuario y devuelve un assistant PLACEHOLDER (R3).

    NO hay auto-send ni LLM real en local. El assistant es is_grounded=false y
    no genera datos comerciales (R1).
    """
    try:
        conversation = await _get_conversation_or_404(session, conversation_id)
        tier = payload.model_tier or conversation.model_tier

        user_msg = Message(
            tenant_id=ctx.tenant_id,
            conversation_id=conversation_id,
            role="user",
            content=payload.content,
            model_tier=tier,
            is_grounded=False,
        )
        assistant_msg = Message(
            tenant_id=ctx.tenant_id,
            conversation_id=conversation_id,
            role="assistant",
            content=HITL_PLACEHOLDER,
            model_tier=tier,
            is_grounded=False,
        )
        session.add(user_msg)
        session.add(assistant_msg)

        # Toca updated_at de la conversación para reordenar el Historial.
        await session.execute(
            text(
                "UPDATE conversations SET updated_at = now() WHERE id = :cid"
            ),
            {"cid": str(conversation_id)},
        )

        await session.flush()
        await session.refresh(user_msg)
        await session.refresh(assistant_msg)
        await session.commit()

        return SendMessageResult(
            user=MessageOut.model_validate(user_msg),
            assistant=MessageOut.model_validate(assistant_msg),
        )
    except HTTPException:
        await session.rollback()
        raise
    except SQLAlchemyError as exc:
        await session.rollback()
        raise _db_unavailable(exc) from exc
