"""Calendar dates follow the clinic's time zone, not the server's (UTC).

The interesting moments are just either side of midnight on the clinic's wall clock: there,
UTC is already on the next day, which used to shift note dates, ages and the DOB check.
"""

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any

import pytest
from httpx import AsyncClient
from pydantic import ValidationError

from app.core import dates
from app.core.config import Settings, get_settings
from app.models import Patient
from tests.conftest import PatientFactory, patient_payload

# May 17 begins at 04:00 UTC in New York (EDT, UTC-4).
BEFORE_MIDNIGHT = datetime(2026, 5, 17, 3, 59, tzinfo=UTC)  # 23:59 on May 16 in the clinic
AFTER_MIDNIGHT = datetime(2026, 5, 17, 4, 0, tzinfo=UTC)  # 00:00 on May 17 in the clinic


@pytest.fixture(autouse=True)
def new_york_clinic(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "clinic_timezone", "America/New_York")


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> Callable[[datetime], None]:
    def set_now(moment: datetime) -> None:
        monkeypatch.setattr(dates, "_now", lambda: moment)

    return set_now


async def test_the_frontend_is_told_the_clinic_time_zone(client: AsyncClient) -> None:
    response = await client.get("/config")

    assert response.status_code == 200
    assert response.json() == {"clinic_timezone": "America/New_York"}


def test_the_default_is_eastern_and_unknown_zones_are_rejected() -> None:
    assert Settings(_env_file=None).clinic_timezone == "America/New_York"
    with pytest.raises(ValidationError, match="is not an IANA time zone"):
        Settings(_env_file=None, clinic_timezone="Mars/Olympus_Mons")


@pytest.mark.parametrize(
    ("moment", "age"), [(BEFORE_MIDNIGHT, 45), (AFTER_MIDNIGHT, 46)], ids=["eve", "birthday"]
)
async def test_birthdays_turn_over_at_the_clinics_midnight(
    client: AsyncClient,
    make_patient: PatientFactory,
    clock: Callable[[datetime], None],
    moment: datetime,
    age: int,
) -> None:
    patient = await make_patient()  # born 1980-05-17
    clock(moment)

    record = (await client.get(f"/patients/{patient.id}")).json()
    summary = (await client.get(f"/patients/{patient.id}/summary")).json()
    aged_46 = (await client.get("/patients", params={"min_age": 46})).json()

    assert record["age"] == summary["age"] == age
    assert aged_46["total"] == (1 if age == 46 else 0)


@pytest.mark.parametrize(
    ("moment", "status"), [(BEFORE_MIDNIGHT, 422), (AFTER_MIDNIGHT, 201)], ids=["eve", "day-of"]
)
async def test_a_birth_is_in_the_future_until_the_clinics_midnight(
    client: AsyncClient, clock: Callable[[datetime], None], moment: datetime, status: int
) -> None:
    clock(moment)

    response = await client.post("/patients", json=patient_payload(date_of_birth="2026-05-17"))

    assert response.status_code == status


@pytest.mark.parametrize(
    ("zone", "day"),
    [("America/New_York", "2026-03-03"), ("UTC", "2026-03-04")],
    ids=["clinic-evening", "utc"],
)
async def test_a_note_is_dated_by_the_clinics_calendar(
    client: AsyncClient,
    make_patient: PatientFactory,
    monkeypatch: pytest.MonkeyPatch,
    zone: str,
    day: str,
) -> None:
    monkeypatch.setattr(get_settings(), "clinic_timezone", zone)
    patient: Patient = await make_patient()
    # 10 pm on Mar 3 in New York (EST, UTC-5) is already Mar 4 in UTC.
    note: dict[str, Any] = {"taken_at": "2026-03-04T03:00:00Z", "content": "Evening call."}
    await client.post(f"/patients/{patient.id}/notes", json=note)

    summary = (await client.get(f"/patients/{patient.id}/summary")).json()

    assert summary["narrative"]["overview"] == f"1 clinical note on file, from {day}."
