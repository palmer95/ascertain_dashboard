"""ORM models. Import every model here so Alembic autogenerate can see it."""

from app.models.base import Base
from app.models.patient import Patient

__all__ = ["Base", "Patient"]
