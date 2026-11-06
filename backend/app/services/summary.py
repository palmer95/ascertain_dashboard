from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dates import age_on, clinic_today
from app.models import Patient
from app.schemas.summary import PatientSummary
from app.services import notes as notes_service
from app.services.narrative import write_narrative


async def build_summary(session: AsyncSession, patient: Patient) -> PatientSummary:
    notes = await notes_service.list_notes(session, patient.id)
    narrative, source = await write_narrative(patient, notes)
    return PatientSummary(
        patient_id=patient.id,
        name=f"{patient.first_name} {patient.last_name}",
        age=age_on(patient.date_of_birth, clinic_today()),
        blood_type=patient.blood_type,
        allergies=patient.allergies,
        conditions=patient.conditions,
        narrative=narrative,
        source=source,
        note_count=len(notes),
        generated_at=datetime.now(UTC),
    )
