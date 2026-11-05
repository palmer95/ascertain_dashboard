"""GET /patients: pagination, sorting, name search and the advanced filters."""

from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient

from app.core.dates import latest_birth_date_for_age
from app.models.enums import BloodType, PatientStatus
from tests.conftest import PatientFactory


async def names(client: AsyncClient, query: str = "") -> list[str]:
    response = await client.get(f"/patients?{query}")
    assert response.status_code == 200, response.text
    return [p["first_name"] for p in response.json()["items"]]


def born_aged(age: int) -> date:
    """A date of birth that makes someone exactly `age` today."""
    return latest_birth_date_for_age(age, date.today())


class TestPagination:
    async def test_pages_through_every_patient_once(
        self, client: AsyncClient, make_patient: PatientFactory
    ) -> None:
        for i in range(5):
            await make_patient(first_name=f"P{i}", last_name="Same")

        pages = [(await client.get(f"/patients?limit=2&offset={o}")).json() for o in (0, 2, 4)]

        assert [p["total"] for p in pages] == [5, 5, 5]
        ids = [item["id"] for page in pages for item in page["items"]]
        # Equal last names still page stably: no repeats, nothing skipped.
        assert len(ids) == len(set(ids)) == 5
        assert pages[2]["limit"] == 2 and pages[2]["offset"] == 4

    async def test_empty_database(self, client: AsyncClient) -> None:
        response = await client.get("/patients")

        assert response.json() == {"items": [], "total": 0, "limit": 20, "offset": 0}

    @pytest.mark.parametrize("query", ["limit=0", "limit=101", "offset=-1", "sort=height"])
    async def test_out_of_range_parameters_are_rejected(
        self, client: AsyncClient, query: str
    ) -> None:
        response = await client.get(f"/patients?{query}")

        assert response.status_code == 422


class TestSorting:
    async def test_default_is_by_last_then_first_name_ignoring_case(
        self, client: AsyncClient, make_patient: PatientFactory
    ) -> None:
        await make_patient(first_name="Zoe", last_name="adams")
        await make_patient(first_name="Amy", last_name="Baker")
        await make_patient(first_name="Bob", last_name="Adams")

        assert await names(client) == ["Bob", "Zoe", "Amy"]
        assert await names(client, "order=desc") == ["Amy", "Zoe", "Bob"]

    async def test_by_age(self, client: AsyncClient, make_patient: PatientFactory) -> None:
        await make_patient(first_name="Old", date_of_birth=born_aged(80))
        await make_patient(first_name="Young", date_of_birth=born_aged(20))
        await make_patient(first_name="Mid", date_of_birth=born_aged(50))

        assert await names(client, "sort=age") == ["Young", "Mid", "Old"]
        assert await names(client, "sort=age&order=desc") == ["Old", "Mid", "Young"]

    async def test_by_last_visit_puts_never_seen_last_both_ways(
        self, client: AsyncClient, make_patient: PatientFactory
    ) -> None:
        now = datetime.now(UTC)
        await make_patient(first_name="Never", last_visit_at=None)
        await make_patient(first_name="Recent", last_visit_at=now - timedelta(days=1))
        await make_patient(first_name="Earlier", last_visit_at=now - timedelta(days=90))

        assert await names(client, "sort=last_visit_at&order=desc") == [
            "Recent",
            "Earlier",
            "Never",
        ]
        assert await names(client, "sort=last_visit_at") == ["Earlier", "Recent", "Never"]


class TestNameSearch:
    @pytest.fixture(autouse=True)
    async def patients(self, make_patient: PatientFactory) -> None:
        await make_patient(first_name="Jane", last_name="Doe")
        await make_patient(first_name="John", last_name="Doe")
        await make_patient(first_name="Janet", last_name="Smith")

    @pytest.mark.parametrize(
        ("q", "expected"),
        [
            ("jan", {"Jane", "Janet"}),
            ("DOE", {"Jane", "John"}),
            ("jane doe", {"Jane"}),
            ("doe, jane", {"Jane"}),
            ("smith john", set()),  # every word must match
            ("nobody", set()),
        ],
    )
    async def test_every_word_matches_first_or_last_name(
        self, client: AsyncClient, q: str, expected: set[str]
    ) -> None:
        assert set(await names(client, f"q={q}")) == expected

    @pytest.mark.parametrize("q", ["%", "_", "\\"])
    async def test_wildcards_are_matched_literally(self, client: AsyncClient, q: str) -> None:
        assert await names(client, f"q={q}") == []


class TestFilters:
    async def test_status_and_blood_type_match_any_of_their_values(
        self, client: AsyncClient, make_patient: PatientFactory
    ) -> None:
        await make_patient(
            first_name="A", status=PatientStatus.ACTIVE, blood_type=BloodType.O_NEGATIVE
        )
        await make_patient(
            first_name="B", status=PatientStatus.PENDING, blood_type=BloodType.A_POSITIVE
        )
        await make_patient(
            first_name="C", status=PatientStatus.DISCHARGED, blood_type=BloodType.O_NEGATIVE
        )

        assert set(await names(client, "status=active&status=pending")) == {"A", "B"}
        assert set(await names(client, "blood_type=O-")) == {"A", "C"}
        # Different filters combine with AND.
        assert await names(client, "status=discharged&blood_type=O-") == ["C"]

    async def test_state(self, client: AsyncClient, make_patient: PatientFactory) -> None:
        await make_patient(first_name="Cal", state="CA")
        await make_patient(first_name="Tex", state="TX")
        await make_patient(first_name="Ill", state="IL")

        assert set(await names(client, "state=ca&state=TX")) == {"Cal", "Tex"}

    async def test_age_range_is_inclusive(
        self, client: AsyncClient, make_patient: PatientFactory
    ) -> None:
        for age in (29, 30, 40, 41):
            await make_patient(first_name=f"Age{age}", date_of_birth=born_aged(age))
        # Turns 30 tomorrow, so is 29 today.
        await make_patient(first_name="Almost30", date_of_birth=born_aged(30) + timedelta(days=1))

        assert set(await names(client, "min_age=30&max_age=40")) == {"Age30", "Age40"}
        assert await names(client, "min_age=40&max_age=40") == ["Age40"]
        assert set(await names(client, "max_age=29")) == {"Age29", "Almost30"}

    async def test_reversed_age_range_is_rejected_on_max_age(self, client: AsyncClient) -> None:
        response = await client.get("/patients?min_age=50&max_age=40")

        assert response.status_code == 422
        assert response.json()["error"]["details"][0]["field"] == "max_age"

    async def test_condition_and_allergy_match_part_of_any_item(
        self, client: AsyncClient, make_patient: PatientFactory
    ) -> None:
        await make_patient(first_name="Dia", conditions=["Asthma", "Type 2 diabetes"])
        await make_patient(first_name="Pen", allergies=["Penicillin"], conditions=["Asthma"])
        await make_patient(first_name="None")

        assert await names(client, "condition=DIAB") == ["Dia"]
        assert set(await names(client, "condition=asthma")) == {"Dia", "Pen"}
        assert await names(client, "allergy=cillin") == ["Pen"]
        assert await names(client, "allergy=%25") == []  # a literal %, not a wildcard

    @pytest.mark.parametrize(
        ("last_visit", "expected"),
        [
            ("within_30_days", {"Week"}),
            ("within_90_days", {"Week", "TwoMonths"}),
            ("within_1_year", {"Week", "TwoMonths"}),
            ("over_1_year", {"TwoYears"}),
            ("never", {"Never"}),
        ],
    )
    async def test_last_visit_presets(
        self,
        client: AsyncClient,
        make_patient: PatientFactory,
        last_visit: str,
        expected: set[str],
    ) -> None:
        now = datetime.now(UTC)
        visits: dict[str, Any] = {
            "Week": now - timedelta(days=7),
            "TwoMonths": now - timedelta(days=60),
            "TwoYears": now - timedelta(days=730),
            "Never": None,
        }
        for name, visited in visits.items():
            await make_patient(first_name=name, last_visit_at=visited)

        assert set(await names(client, f"last_visit={last_visit}")) == expected

    async def test_total_counts_all_matches_not_just_the_page(
        self, client: AsyncClient, make_patient: PatientFactory
    ) -> None:
        for i in range(3):
            await make_patient(first_name=f"Active{i}", status=PatientStatus.ACTIVE)
        await make_patient(first_name="Gone", status=PatientStatus.DISCHARGED)

        body = (await client.get("/patients?status=active&limit=1")).json()

        assert body["total"] == 3
        assert len(body["items"]) == 1
