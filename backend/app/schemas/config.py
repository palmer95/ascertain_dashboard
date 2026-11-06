from pydantic import BaseModel, Field


class ClientConfig(BaseModel):
    """Settings the frontend needs to agree with the API."""

    clinic_timezone: str = Field(
        description="IANA time zone the clinic's calendar dates and times are shown in",
        examples=["America/New_York"],
    )
