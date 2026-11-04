from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """A single problem with the request, tied to a field when one applies."""

    field: str | None = Field(
        description="Dotted path to the offending field (e.g. `allergies.0`), or null.",
        examples=["date_of_birth"],
    )
    msg: str = Field(examples=["Date of birth cannot be in the future"])


class ErrorBody(BaseModel):
    code: str = Field(
        description="Stable, machine-readable error code.", examples=["validation_error"]
    )
    message: str = Field(
        description="Human-readable summary.", examples=["Request validation failed"]
    )
    details: list[ErrorDetail] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    """Envelope returned for every non-2xx response."""

    error: ErrorBody
