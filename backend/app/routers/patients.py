from fastapi import APIRouter, Request, Response, status

from app.core.errors import error_responses
from app.dependencies import PatientDep, SessionDep
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate
from app.services import patients as patients_service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a patient",
    responses=error_responses(400, 422),
)
async def create_patient(
    body: PatientCreate, request: Request, response: Response, session: SessionDep
) -> PatientRead:
    patient = await patients_service.create_patient(session, body)
    response.headers["Location"] = str(request.url_for("get_patient", patient_id=patient.id))
    return PatientRead.model_validate(patient)


@router.get("/{patient_id}", summary="Get a patient", responses=error_responses(404, 422))
async def get_patient(patient: PatientDep) -> PatientRead:
    return PatientRead.model_validate(patient)


@router.put(
    "/{patient_id}",
    summary="Replace a patient",
    description="Full replacement: send every field. Omitted optional fields are cleared.",
    responses=error_responses(400, 404, 422),
)
async def update_patient(
    body: PatientUpdate, patient: PatientDep, session: SessionDep
) -> PatientRead:
    patient = await patients_service.update_patient(session, patient, body)
    return PatientRead.model_validate(patient)


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a patient",
    responses=error_responses(404, 422),
)
async def delete_patient(patient: PatientDep, session: SessionDep) -> None:
    await patients_service.delete_patient(session, patient)
