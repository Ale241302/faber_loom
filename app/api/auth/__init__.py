"""Paquete de autenticación. Expone `router` para `app.main`."""

from app.api.auth.router import router as router

__all__ = ["router"]
