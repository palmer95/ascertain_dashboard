"""Shared FastAPI dependencies.

FastAPI caches dependencies per request, so a route that uses both `SessionDep` and
`PatientDep` gets the same session for both.
"""

from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models import Patient
from app.services import patients as patients_service

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_patient_or_404(patient_id: UUID, session: SessionDep) -> Patient:
    patient = await patients_service.get_patient(session, patient_id)
    if patient is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    return patient


PatientDep = Annotated[Patient, Depends(get_patient_or_404)]
