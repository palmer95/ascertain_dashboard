"""Clinical note request/response schemas."""

from datetime import UTC, datetime, timedelta
from typing import Annotated
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.models.note import NOTE_MAX_LENGTH

# Allows for clock skew between the client and the server.
_FUTURE_TOLERANCE = timedelta(minutes=5)


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    taken_at: AwareDatetime = Field(
        description="When the note was taken (clinical time), with a timezone offset."
    )
    content: Annotated[str, StringConstraints(min_length=1, max_length=NOTE_MAX_LENGTH)]

    @field_validator("taken_at")
    @classmethod
    def _not_in_future(cls, value: datetime) -> datetime:
        if value > datetime.now(UTC) + _FUTURE_TOLERANCE:
            raise ValueError("Note time cannot be in the future")
        return value


class NoteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    taken_at: datetime
    content: str
    created_at: datetime
