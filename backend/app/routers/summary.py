from fastapi import APIRouter

from app.core.errors import error_responses
from app.dependencies import PatientDep, SessionDep
from app.schemas.summary import PatientSummary
from app.services import summary as summary_service

router = APIRouter(prefix="/patients/{patient_id}", tags=["summary"])


@router.get("/summary", summary="Get a patient summary", responses=error_responses(404, 422))
async def get_patient_summary(patient: PatientDep, session: SessionDep) -> PatientSummary:
    """Key facts from the record plus a narrative of the clinical notes.

    The narrative is written by Claude when `ANTHROPIC_API_KEY` is set, and by a template
    otherwise (or if the model call fails); `source` says which.
    """
    return await summary_service.build_summary(session, patient)
