"""Patient summary response schema."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.enums import BloodType


class SummarySource(StrEnum):
    LLM = "llm"
    TEMPLATE = "template"


class PatientSummary(BaseModel):
    """Facts come straight from the database; only `narrative` may be model-written."""

    patient_id: UUID
    name: str
    age: int
    blood_type: BloodType
    allergies: list[str]
    conditions: list[str]
    narrative: str = Field(description="Prose summary of the patient's clinical notes.")
    source: SummarySource = Field(
        description="`llm` if Claude wrote the narrative, `template` if it was generated locally "
        "(no API key configured, no notes, or the model call failed or timed out)."
    )
    note_count: int
    generated_at: datetime
