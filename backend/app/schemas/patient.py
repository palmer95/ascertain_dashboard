"""Patient request/response schemas.

Write schemas validate and normalize input. `PatientRead` is a plain output shape, so data
already in the database is never re-validated (and can't 500) on the way out.
"""

import re
from datetime import date, datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    computed_field,
    field_validator,
)

from app.core.dates import age_on
from app.models.enums import BloodType, PatientStatus

MIN_DATE_OF_BIRTH = date(1900, 1, 1)
MAX_LIST_ITEMS = 50

# Every USPS code. Kept compact on purpose: it's a lookup table, not logic.
# fmt: off
US_STATE_CODES = frozenset({
    # 50 states
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    # DC and territories
    "DC", "AS", "GU", "MP", "PR", "VI",
    # Freely associated states (the seed data includes FM and PW)
    "FM", "MH", "PW",
    # Military mail (APO/FPO)
    "AA", "AE", "AP",
})
# fmt: on

_PHONE_CHARS = re.compile(r"^\+?[0-9\s().-]+$")
_POSTAL_CODE = re.compile(r"^[0-9]{5}(-[0-9]{4})?$")


def _blank_to_none(value: object) -> object:
    """Forms often send "" for an empty optional field; store that as null."""
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _clean_list(value: object) -> object:
    """Trim entries, drop blanks, and drop case-insensitive duplicates (first one wins)."""
    if not isinstance(value, list):
        return value  # let Pydantic report the type error
    seen: set[str] = set()
    cleaned: list[object] = []
    for item in value:
        if not isinstance(item, str):
            cleaned.append(item)
            continue
        text = item.strip()
        if text and text.casefold() not in seen:
            seen.add(text.casefold())
            cleaned.append(text)
    return cleaned


def _validate_phone(value: str) -> str:
    digits = sum(ch.isdigit() for ch in value)
    if not _PHONE_CHARS.match(value) or not 10 <= digits <= 15:
        raise ValueError("Enter a valid phone number, e.g. (555) 123-4567")
    return value


def _validate_state(value: str) -> str:
    if value not in US_STATE_CODES:
        raise ValueError("Enter a valid 2-letter US state code, e.g. CA")
    return value


def _validate_postal_code(value: str) -> str:
    if not _POSTAL_CODE.match(value):
        raise ValueError("Enter a 5-digit ZIP code, or ZIP+4 (12345-6789)")
    return value


Name = Annotated[str, StringConstraints(min_length=1, max_length=100)]
Text100 = Annotated[str, StringConstraints(min_length=1, max_length=100)]
Text200 = Annotated[str, StringConstraints(min_length=1, max_length=200)]
OptionalText200 = Annotated[
    Annotated[str, StringConstraints(max_length=200)] | None, BeforeValidator(_blank_to_none)
]
OptionalEmail = Annotated[EmailStr | None, BeforeValidator(_blank_to_none)]
Phone = Annotated[str, StringConstraints(max_length=32), AfterValidator(_validate_phone)]
StateCode = Annotated[
    str,
    BeforeValidator(lambda v: v.strip().upper() if isinstance(v, str) else v),
    AfterValidator(_validate_state),
]
PostalCode = Annotated[str, AfterValidator(_validate_postal_code)]
ClinicalList = Annotated[
    list[Annotated[str, StringConstraints(max_length=200)]],
    BeforeValidator(_clean_list),
    Field(max_length=MAX_LIST_ITEMS),
]


class PatientWrite(BaseModel):
    """Fields a client may set. Unknown fields are rejected so typos don't silently vanish."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    first_name: Name
    last_name: Name
    date_of_birth: date
    email: OptionalEmail = None
    phone: Phone
    address_line1: Text200
    address_line2: OptionalText200 = None
    city: Text100
    state: StateCode = Field(examples=["CA"])
    postal_code: PostalCode = Field(examples=["94107"])
    blood_type: BloodType
    status: PatientStatus
    allergies: ClinicalList = Field(default_factory=list, examples=[["Penicillin"]])
    conditions: ClinicalList = Field(default_factory=list, examples=[["Hypertension"]])

    @field_validator("date_of_birth")
    @classmethod
    def _date_of_birth_in_range(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        if value < MIN_DATE_OF_BIRTH:
            raise ValueError("Date of birth must be on or after 1900-01-01")
        return value


class PatientCreate(PatientWrite):
    """Body for `POST /patients`."""


class PatientUpdate(PatientWrite):
    """Body for `PUT /patients/{id}`: a full replacement, so every required field is sent."""


class PatientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    first_name: str
    last_name: str
    date_of_birth: date
    email: str | None
    phone: str
    address_line1: str
    address_line2: str | None
    city: str
    state: str
    postal_code: str
    blood_type: BloodType
    status: PatientStatus
    allergies: list[str]
    conditions: list[str]
    last_visit_at: datetime | None
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]  # mypy doesn't model decorated properties
    @property
    def age(self) -> int:
        """Derived from date_of_birth on every read; never stored, so it can't go stale."""
        return age_on(self.date_of_birth, date.today())


class PatientSort(StrEnum):
    NAME = "name"
    AGE = "age"
    LAST_VISIT = "last_visit_at"
    STATUS = "status"


class SortOrder(StrEnum):
    ASC = "asc"
    DESC = "desc"


class PatientListParams(BaseModel):
    """Query parameters for `GET /patients`."""

    q: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = Field(
        default=None,
        description=(
            "Case-insensitive name search. Every word must match the first or last name, "
            'so "jane doe" and "doe, jane" both work.'
        ),
    )
    status: PatientStatus | None = None
    sort: PatientSort = PatientSort.NAME
    order: SortOrder = SortOrder.ASC
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class PatientPage(BaseModel):
    items: list[PatientRead]
    total: int = Field(description="Matching patients across all pages.")
    limit: int
    offset: int
