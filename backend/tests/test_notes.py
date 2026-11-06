"""Notes under /patients/{id}/notes."""

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.models import Patient
from tests.conftest import PatientFactory


def note(taken_at: datetime | str = "2026-03-01T09:30:00Z", **overrides: Any) -> dict[str, Any]:
    if isinstance(taken_at, datetime):
        taken_at = taken_at.isoformat()
    return {"taken_at": taken_at, "content": "Blood pressure stable."} | overrides


@pytest.fixture
async def patient(make_patient: PatientFactory) -> Patient:
    return await make_patient()


async def test_create_and_list_newest_first(client: AsyncClient, patient: Patient) -> None:
    url = f"/patients/{patient.id}/notes"
    first = await client.post(url, json=note("2026-01-01T08:00:00Z", content="First visit."))
    second = await client.post(url, json=note("2026-02-01T08:00:00+02:00", content="Second."))

    assert first.status_code == second.status_code == 201
    assert first.json()["patient_id"] == str(patient.id)
    listed = (await client.get(url)).json()
    assert [n["content"] for n in listed] == ["Second.", "First visit."]
    # Stored as an absolute instant: the offset is honoured, not dropped.
    assert listed[0]["taken_at"] == "2026-02-01T06:00:00Z"


async def test_patient_without_notes_has_an_empty_list(
    client: AsyncClient, patient: Patient
) -> None:
    response = await client.get(f"/patients/{patient.id}/notes")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize(
    ("body", "field"),
    [
        (note(content=""), "content"),
        (note(content="x" * 5001), "content"),
        (note("2026-03-01T09:30:00"), "taken_at"),  # no time zone: ambiguous
        (note(datetime.now(UTC) + timedelta(hours=1)), "taken_at"),
        ({"content": "Missing time."}, "taken_at"),
    ],
)
async def test_invalid_notes_are_rejected(
    client: AsyncClient, patient: Patient, body: dict[str, Any], field: str
) -> None:
    response = await client.post(f"/patients/{patient.id}/notes", json=body)

    assert response.status_code == 422
    assert [d["field"] for d in response.json()["error"]["details"]] == [field]


async def test_a_few_minutes_of_clock_skew_is_allowed(
    client: AsyncClient, patient: Patient
) -> None:
    response = await client.post(
        f"/patients/{patient.id}/notes", json=note(datetime.now(UTC) + timedelta(minutes=2))
    )

    assert response.status_code == 201


async def test_notes_for_an_unknown_patient_are_a_404(client: AsyncClient) -> None:
    url = f"/patients/{uuid4()}/notes"

    assert (await client.get(url)).status_code == 404
    assert (await client.post(url, json=note())).status_code == 404


async def test_delete(client: AsyncClient, patient: Patient) -> None:
    url = f"/patients/{patient.id}/notes"
    created = (await client.post(url, json=note())).json()

    response = await client.delete(f"{url}/{created['id']}")

    assert response.status_code == 204
    assert (await client.get(url)).json() == []
    assert (await client.delete(f"{url}/{created['id']}")).status_code == 404


async def test_cannot_delete_another_patients_note(
    client: AsyncClient, make_patient: PatientFactory
) -> None:
    owner = await make_patient(first_name="Owner")
    other = await make_patient(first_name="Other")
    created = (await client.post(f"/patients/{owner.id}/notes", json=note())).json()

    response = await client.delete(f"/patients/{other.id}/notes/{created['id']}")

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "Note not found"
    assert len((await client.get(f"/patients/{owner.id}/notes")).json()) == 1


async def last_visit(client: AsyncClient, patient: Patient) -> tuple[str | None, str]:
    body = (await client.get(f"/patients/{patient.id}")).json()
    return body["last_visit_at"], body["updated_at"]


async def test_notes_keep_the_last_visit_up_to_date(client: AsyncClient, patient: Patient) -> None:
    url = f"/patients/{patient.id}/notes"
    never, updated_at = await last_visit(client, patient)
    assert never is None

    march = (await client.post(url, json=note("2026-03-01T09:30:00Z"))).json()
    assert await last_visit(client, patient) == ("2026-03-01T09:30:00Z", updated_at)

    # An older note doesn't move it back; a newer one moves it forward.
    january = (await client.post(url, json=note("2026-01-01T09:30:00Z"))).json()
    assert (await last_visit(client, patient))[0] == "2026-03-01T09:30:00Z"
    april = (await client.post(url, json=note("2026-04-01T09:30:00Z"))).json()
    assert (await last_visit(client, patient))[0] == "2026-04-01T09:30:00Z"

    # Deleting recomputes from the notes left, back to "no visits yet" when none remain.
    await client.delete(f"{url}/{april['id']}")
    assert (await last_visit(client, patient))[0] == "2026-03-01T09:30:00Z"
    await client.delete(f"{url}/{march['id']}")
    assert (await last_visit(client, patient))[0] == "2026-01-01T09:30:00Z"
    await client.delete(f"{url}/{january['id']}")
    # Notes aren't edits to the record, so its "last updated" time never moved.
    assert await last_visit(client, patient) == (None, updated_at)


async def test_a_new_note_shows_on_the_dashboard(client: AsyncClient, patient: Patient) -> None:
    await client.post(f"/patients/{patient.id}/notes", json=note(datetime.now(UTC)))

    stats = (await client.get("/dashboard/stats")).json()

    assert stats["visits_last_30_days"] == 1
    assert [visit["id"] for visit in stats["recent_visits"]] == [str(patient.id)]
