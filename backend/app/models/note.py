import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

NOTE_MAX_LENGTH = 5000


class PatientNote(Base):
    """A clinical note. Immutable once written (no updated_at): fix a mistake by deleting it."""

    __tablename__ = "patient_notes"
    __table_args__ = (
        CheckConstraint(
            f"char_length(content) BETWEEN 1 AND {NOTE_MAX_LENGTH}", name="content_length"
        ),
    )
    # Return server-generated created_at on INSERT (see TimestampMixin for why).
    __mapper_args__ = {"eager_defaults": True}  # noqa: RUF012

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, server_default=text("uuidv7()"))
    # Deleting a patient deletes their notes in the database, with no ORM round trips.
    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"))
    # Clinical time, supplied by the client; distinct from when the row was written.
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# Serves "this patient's notes, newest first" and doubles as the foreign-key index.
Index(
    "ix_patient_notes_patient_id_taken_at",
    PatientNote.patient_id,
    PatientNote.taken_at.desc(),
    PatientNote.id,
)
