from datetime import datetime
from uuid import UUID

from sqlalchemy import ColumnElement, ScalarSelect, delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Patient, PatientNote
from app.schemas.note import NoteCreate

# A patient's last visit is the clinical time of their latest note: each note records an
# encounter (visit or call). It's stored on the patient, so the list can sort and filter by it
# with an index, and kept in step here, in the same transaction as the note change.
# `updated_at` is left alone: it tracks edits to the record itself, not new notes.


async def _set_last_visit(
    session: AsyncSession, patient_id: UUID, value: ColumnElement[datetime] | ScalarSelect[datetime]
) -> None:
    # RETURNING the row refreshes the patient already loaded in this session, so nothing
    # later reads a stale (or expired, which async can't lazy-load) `last_visit_at`.
    await session.scalar(
        update(Patient)
        .where(Patient.id == patient_id)
        .values(last_visit_at=value, updated_at=Patient.updated_at)
        .returning(Patient)
        .execution_options(synchronize_session=False, populate_existing=True)
    )


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
    # GREATEST ignores NULL, so a first note sets the value and an older one never moves it back.
    await _set_last_visit(session, patient_id, func.greatest(Patient.last_visit_at, note.taken_at))
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
    if deleted is not None:
        # Recomputed from the notes left; NULL ("no visits yet") when none remain.
        latest = (
            select(func.max(PatientNote.taken_at))
            .where(PatientNote.patient_id == patient_id)
            .scalar_subquery()
        )
        await _set_last_visit(session, patient_id, latest)
    await session.commit()
    return deleted is not None
