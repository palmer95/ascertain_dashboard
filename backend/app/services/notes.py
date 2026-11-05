from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import PatientNote
from app.schemas.note import NoteCreate


async def list_notes(session: AsyncSession, patient_id: UUID) -> list[PatientNote]:
    """Newest first (served by ix_patient_notes_patient_id_taken_at)."""
    notes = await session.scalars(
        select(PatientNote)
        .where(PatientNote.patient_id == patient_id)
        .order_by(PatientNote.taken_at.desc(), PatientNote.id.desc())
    )
    return list(notes)


async def create_note(session: AsyncSession, patient_id: UUID, data: NoteCreate) -> PatientNote:
    note = PatientNote(patient_id=patient_id, **data.model_dump())
    session.add(note)
    await session.commit()
    return note


async def delete_note(session: AsyncSession, patient_id: UUID, note_id: UUID) -> bool:
    """Delete only if the note belongs to this patient; returns whether anything was deleted.

    Scoping by patient means `/patients/A/notes/<B's note>` is a 404, never a cross-patient delete.
    """
    deleted = await session.scalar(
        delete(PatientNote)
        .where(PatientNote.id == note_id, PatientNote.patient_id == patient_id)
        .returning(PatientNote.id)
    )
    await session.commit()
    return deleted is not None
