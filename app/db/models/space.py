"""Modelos SQLAlchemy 2.0 tipados (slice Shell + SpaceLoom).

Coinciden EXACTO con `sql/002_schema.sql` del contrato. La verdad del DDL,
constraints, RLS y defaults vive en `/sql` (y luego en alembic); estos modelos
son el reflejo ORM para el backend.

Notas:
  * Multi-tenant (R2): toda tabla aislable lleva `tenant_id`.
  * `embedding vector(1536)` se declara como columna deferida y opcional para no
    acoplar el import del backend a pgvector; el API no la serializa.
"""

from __future__ import annotations

import datetime
import uuid

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)


class Base(DeclarativeBase):
    """Base declarativa tipada."""


# Tipos reutilizables -------------------------------------------------------

_UUID_PK = UUID(as_uuid=True)


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(
        _UUID_PK,
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )


def _created_at() -> Mapped[datetime.datetime]:
    return mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )


def _updated_at() -> Mapped[datetime.datetime]:
    return mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )


# Tablas --------------------------------------------------------------------


class Tenant(Base):
    """Raíz multi-tenant. NO lleva `tenant_id`."""

    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = _uuid_pk()
    slug: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime.datetime] = _created_at()


class User(Base):
    """Usuario de un tenant. `email` citext, único por tenant."""

    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
        CheckConstraint(
            "role IN ('owner','admin','operator','supervisor','viewer')",
            name="ck_users_role",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        _UUID_PK, nullable=False
    )
    # citext en DB; en Python lo tratamos como str.
    email: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    password_hash: Mapped[str | None] = mapped_column("password_hash", Text, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()


class Workspace(Base):
    """Workspace (client/topic/shared) del mock "My/Shared Workspaces"."""

    __tablename__ = "workspaces"
    __table_args__ = (
        CheckConstraint(
            "kind IN ('client','topic','shared')",
            name="ck_workspaces_kind",
        ),
        CheckConstraint(
            "color_token IN ('coral','amber','sage','slate','vino')",
            name="ck_workspaces_color_token",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(_UUID_PK, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    color_token: Mapped[str] = mapped_column(Text, nullable=False)
    subtitle: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = _created_at()

    conversations: Mapped[list["Conversation"]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Conversation(Base):
    """Conversación (thread) de SpaceLoom."""

    __tablename__ = "conversations"
    __table_args__ = (
        CheckConstraint(
            "model_tier IN ('eco','balanced','sport')",
            name="ck_conversations_model_tier",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(_UUID_PK, nullable=False)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        _UUID_PK,
        ForeignKey("workspaces.id"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(
        _UUID_PK,
        ForeignKey("users.id"),
        nullable=False,
    )
    agent_handle: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'@cotizador'"),
    )
    model_tier: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'balanced'"),
    )
    created_at: Mapped[datetime.datetime] = _created_at()
    updated_at: Mapped[datetime.datetime] = _updated_at()

    workspace: Mapped[Workspace | None] = relationship(
        back_populates="conversations"
    )
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Message.created_at",
    )


class Message(Base):
    """Mensaje de una conversación (user/assistant/system)."""

    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint(
            "role IN ('user','assistant','system')",
            name="ck_messages_role",
        ),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(_UUID_PK, nullable=False)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        _UUID_PK,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    model_tier: Mapped[str | None] = mapped_column(Text, nullable=True)
    tokens_in: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tokens_out: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_grounded: Mapped[bool] = mapped_column(
        nullable=False,
        server_default=text("false"),
    )
    created_at: Mapped[datetime.datetime] = _created_at()

    conversation: Mapped[Conversation] = relationship(
        back_populates="messages"
    )


class KbDocument(Base):
    """Documento de KB (placeholder de grounding; sin datos inventados, R1).

    `embedding vector(1536)` se declara pero NO se mapea como atributo Python
    para evitar acoplar el import a pgvector. La columna existe en DB (002).
    """

    __tablename__ = "kb_documents"

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(_UUID_PK, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    # embedding vector(1536) -> existe en DB; no se carga en el ORM (R1/R7).
    created_at: Mapped[datetime.datetime] = _created_at()


class PasswordResetToken(Base):
    """Token de recuperación de contraseña en la base de datos."""

    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = _uuid_pk()
    tenant_id: Mapped[uuid.UUID] = mapped_column(_UUID_PK, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        _UUID_PK, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    expires_at: Mapped[datetime.datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )
    consumed_at: Mapped[datetime.datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    created_at: Mapped[datetime.datetime] = _created_at()
