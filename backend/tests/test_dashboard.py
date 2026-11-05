"""GET /dashboard/stats."""

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient

from app.models.enums import PatientStatus
from tests.conftest import PatientFactory


async def test_empty_database_still_lists_every_status(client: AsyncClient) -> None:
    body = (await client.get("/dashboard/stats")).json()

    assert body["total_patients"] == 0
    assert body["by_status"] == [{"status": s.value, "count": 0} for s in PatientStatus]
    assert body["visits_last_30_days"] == 0
    assert body["recent_visits"] == []


async def test_counts_and_recent_visits(client: AsyncClient, make_patient: PatientFactory) -> None:
    now = datetime.now(UTC)
    for days in (1, 2, 3, 4, 5, 6):
        await make_patient(first_name=f"Day{days}", last_visit_at=now - timedelta(days=days))
    await make_patient(first_name="LongAgo", last_visit_at=now - timedelta(days=45))
    await make_patient(first_name="Never", status=PatientStatus.PENDING, last_visit_at=None)
    await make_patient(first_name="Gone", status=PatientStatus.DISCHARGED)

    body = (await client.get("/dashboard/stats")).json()

    assert body["total_patients"] == 9
    assert {c["status"]: c["count"] for c in body["by_status"]} == {
        "active": 7,
        "inactive": 0,
        "pending": 1,
        "discharged": 1,
    }
    assert body["visits_last_30_days"] == 6
    # The five most recent, newest first; never-seen patients are left out.
    assert [v["first_name"] for v in body["recent_visits"]] == [
        "Day1",
        "Day2",
        "Day3",
        "Day4",
        "Day5",
    ]
