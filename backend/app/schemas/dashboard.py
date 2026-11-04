"""Dashboard response schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PatientStatus


class StatusCount(BaseModel):
    status: PatientStatus
    count: int


class RecentVisit(BaseModel):
    """Just enough to list and link to the patient; the full record is one click away."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    status: PatientStatus
    last_visit_at: datetime


class DashboardStats(BaseModel):
    total_patients: int
    by_status: list[StatusCount] = Field(
        description="Every status in a fixed order, including those with zero patients."
    )
    visits_last_30_days: int = Field(
        description="Patients whose most recent visit was in the last 30 days."
    )
    recent_visits: list[RecentVisit] = Field(description="The most recently seen patients.")
