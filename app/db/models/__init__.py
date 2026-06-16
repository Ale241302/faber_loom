"""Modelos SQLAlchemy 2.0 (tipados) del slice SpaceLoom."""

from app.db.models.space import (
    Base,
    Conversation,
    KbDocument,
    Message,
    Tenant,
    User,
    Workspace,
)

__all__ = [
    "Base",
    "Conversation",
    "KbDocument",
    "Message",
    "Tenant",
    "User",
    "Workspace",
]
