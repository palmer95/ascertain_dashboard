"""Patient summary response schema."""

from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import BloodType


class SummarySource(StrEnum):
    LLM = "llm"
    TEMPLATE = "template"


# Also the JSON schema Claude answers in (structured outputs): the docstring and field
# descriptions are sent to the model, so they're written to guide it as well as the API reader.
class SummaryNarrative(BaseModel):
    """The patient's clinical course from their notes, in short sections a clinician can scan."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    overview: str = Field(
        description="One or two sentences on the patient's current clinical picture."
    )
    recent_changes: list[str] = Field(
        description="Notable developments from the notes, most recent first: symptoms, "
        "findings, results, medication changes. Each item one short sentence."
    )
    plan: list[str] = Field(
        description="The current plan and follow-ups the notes mention. Each item one short "
        "sentence. Empty if the notes give none."
    )


class PatientSummary(BaseModel):
    """Facts come straight from the database; only `narrative` may be model-written."""

    patient_id: UUID
    name: str
    age: int
    blood_type: BloodType
    allergies: list[str]
    conditions: list[str]
    narrative: SummaryNarrative
    source: SummarySource = Field(
        description="`llm` if Claude wrote the narrative, `template` if it was generated locally "
        "(no API key configured, no notes, or the model call failed or timed out)."
    )
    note_count: int
    generated_at: datetime
