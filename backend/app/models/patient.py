import uuid
from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Enum, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin
from app.models.enums import BloodType, PatientStatus


def _string_enum(enum_cls: type[StrEnum], name: str) -> Enum:
    """Store enum *values* (e.g. "A+") as VARCHAR guarded by a CHECK constraint.

    Chosen over a native Postgres ENUM type because CHECK constraints are trivial to
    evolve in migrations, while native enums need ALTER TYPE and Alembic's autogenerate
    does not detect new values.
    """
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        create_constraint=True,
        validate_strings=True,
        values_callable=lambda members: [m.value for m in members],
    )


class Patient(TimestampMixin, Base):
    __tablename__ = "patients"
    __table_args__ = (
        CheckConstraint("state ~ '^[A-Z]{2}$'", name="state_format"),
        CheckConstraint("postal_code ~ '^[0-9]{5}(-[0-9]{4})?$'", name="postal_code_format"),
    )

    # UUIDv7 (Postgres 18 built-in): non-enumerable like v4, but time-ordered for index locality.
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))

    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    date_of_birth: Mapped[date]

    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str] = mapped_column(String(32))

    # US addresses only (documented assumption).
    address_line1: Mapped[str] = mapped_column(String(200))
    address_line2: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str] = mapped_column(String(2))
    postal_code: Mapped[str] = mapped_column(String(10))

    blood_type: Mapped[BloodType] = mapped_column(_string_enum(BloodType, "blood_type"))
    status: Mapped[PatientStatus] = mapped_column(_string_enum(PatientStatus, "status"))

    allergies: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))
    conditions: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("'{}'"))

    last_visit_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    def __repr__(self) -> str:
        # Deliberately excludes names and other PHI so it is safe to appear in logs.
        return f"<Patient id={self.id}>"
