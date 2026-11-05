from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.errors import error_responses
from app.dependencies import PatientDep, SessionDep
from app.schemas.note import NoteCreate, NoteRead
from app.services import notes as notes_service

router = APIRouter(prefix="/patients/{patient_id}/notes", tags=["notes"])


@router.get("", summary="List a patient's notes", responses=error_responses(404, 422))
async def list_notes(patient: PatientDep, session: SessionDep) -> list[NoteRead]:
    """Newest first, by the note's clinical time (`taken_at`)."""
    notes = await notes_service.list_notes(session, patient.id)
    return [NoteRead.model_validate(note) for note in notes]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Add a note",
    responses=error_responses(400, 404, 422),
)
async def create_note(body: NoteCreate, patient: PatientDep, session: SessionDep) -> NoteRead:
    note = await notes_service.create_note(session, patient.id, body)
    return NoteRead.model_validate(note)


@router.delete(
    "/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a note",
    responses=error_responses(404, 422),
)
async def delete_note(note_id: UUID, patient: PatientDep, session: SessionDep) -> None:
    """404 if the note doesn't exist or belongs to a different patient."""
    if not await notes_service.delete_note(session, patient.id, note_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Note not found")
