"""Patient persistence. Routers stay thin (HTTP concerns only); this layer owns the queries."""

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Patient
from app.schemas.patient import PatientCreate, PatientUpdate


async def get_patient(session: AsyncSession, patient_id: UUID) -> Patient | None:
    return await session.get(Patient, patient_id)


async def create_patient(session: AsyncSession, data: PatientCreate) -> Patient:
    patient = Patient(**data.model_dump())
    session.add(patient)
    await session.commit()
    return patient


async def update_patient(session: AsyncSession, patient: Patient, data: PatientUpdate) -> Patient:
    # PUT is a full replacement: every writable field is overwritten.
    for field, value in data.model_dump().items():
        setattr(patient, field, value)
    await session.commit()
    return patient


async def delete_patient(session: AsyncSession, patient: Patient) -> None:
    await session.delete(patient)
    await session.commit()
