"""CRUD for /patients, its validation, and its error responses."""

from datetime import date, timedelta
from typing import Any
from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.conftest import patient_payload


async def create(client: AsyncClient, **overrides: Any) -> dict[str, Any]:
    response = await client.post("/patients", json=patient_payload(**overrides))
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


def error_fields(response_json: dict[str, Any]) -> set[str | None]:
    return {detail["field"] for detail in response_json["error"]["details"]}


class TestCreate:
    async def test_returns_the_new_patient_with_a_location(self, client: AsyncClient) -> None:
        response = await client.post("/patients", json=patient_payload())

        assert response.status_code == 201
        body = response.json()
        assert response.headers["Location"].endswith(f"/patients/{body['id']}")
        assert body["first_name"] == "Jane"
        assert body["allergies"] == ["Penicillin"]
        assert body["last_visit_at"] is None
        assert body["age"] >= 45

    async def test_normalizes_input(self, client: AsyncClient) -> None:
        body = await create(
            client,
            state=" il ",
            email="",
            address_line2="   ",
            allergies=["  Penicillin ", "penicillin", ""],
        )

        assert body["state"] == "IL"
        assert body["email"] is None
        assert body["address_line2"] is None
        # Trimmed, blanks dropped, case-insensitive duplicates removed.
        assert body["allergies"] == ["Penicillin"]

    async def test_missing_required_fields_are_listed(self, client: AsyncClient) -> None:
        response = await client.post("/patients", json={})

        assert response.status_code == 422
        assert {"first_name", "last_name", "date_of_birth", "phone", "status"} <= error_fields(
            response.json()
        )

    @pytest.mark.parametrize(
        ("field", "value"),
        [
            ("email", "not-an-email"),
            ("phone", "12345"),
            ("state", "ZZ"),
            ("postal_code", "1234"),
            ("blood_type", "C+"),
            ("status", "critical"),
            ("date_of_birth", (date.today() + timedelta(days=1)).isoformat()),
            ("date_of_birth", "1899-12-31"),
            ("first_name", ""),
            ("allergies", ["x" * 201]),
        ],
    )
    async def test_invalid_values_are_rejected_on_their_field(
        self, client: AsyncClient, field: str, value: Any
    ) -> None:
        response = await client.post("/patients", json=patient_payload(**{field: value}))

        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"
        # List items report their index (`allergies.0`), which the form maps to the list.
        assert any(f and f.split(".")[0] == field for f in error_fields(response.json()))


class TestRead:
    async def test_get_returns_the_patient(self, client: AsyncClient) -> None:
        created = await create(client)

        response = await client.get(f"/patients/{created['id']}")

        assert response.status_code == 200
        assert response.json() == created

    async def test_unknown_patient_is_a_404(self, client: AsyncClient) -> None:
        response = await client.get(f"/patients/{uuid4()}")

        assert response.status_code == 404
        assert response.json()["error"] == {
            "code": "not_found",
            "message": "Patient not found",
            "details": [],
        }

    async def test_malformed_id_is_a_422(self, client: AsyncClient) -> None:
        response = await client.get("/patients/not-a-uuid")

        assert response.status_code == 422
        assert error_fields(response.json()) == {"patient_id"}


class TestUpdate:
    async def test_put_replaces_every_field(self, client: AsyncClient) -> None:
        created = await create(client, email="old@example.com", conditions=["Asthma"])

        response = await client.put(
            f"/patients/{created['id']}",
            json=patient_payload(first_name="Janet", email=None, conditions=[]),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["first_name"] == "Janet"
        # Omitted optional values are cleared, not kept: PUT is a full replacement.
        assert body["email"] is None
        assert body["conditions"] == []
        assert body["created_at"] == created["created_at"]
        assert (await client.get(f"/patients/{created['id']}")).json() == body

    async def test_invalid_update_changes_nothing(self, client: AsyncClient) -> None:
        created = await create(client)

        response = await client.put(
            f"/patients/{created['id']}", json=patient_payload(postal_code="bad")
        )

        assert response.status_code == 422
        assert (await client.get(f"/patients/{created['id']}")).json() == created

    async def test_unknown_patient_is_a_404(self, client: AsyncClient) -> None:
        response = await client.put(f"/patients/{uuid4()}", json=patient_payload())

        assert response.status_code == 404


class TestDelete:
    async def test_delete_removes_the_patient_and_their_notes(self, client: AsyncClient) -> None:
        created = await create(client)
        await client.post(
            f"/patients/{created['id']}/notes",
            json={"taken_at": "2026-01-02T09:00:00Z", "content": "Follow-up."},
        )

        response = await client.delete(f"/patients/{created['id']}")

        assert response.status_code == 204
        assert response.content == b""
        assert (await client.get(f"/patients/{created['id']}")).status_code == 404
        assert (await client.get(f"/patients/{created['id']}/notes")).status_code == 404

    async def test_deleting_twice_is_a_404(self, client: AsyncClient) -> None:
        created = await create(client)
        await client.delete(f"/patients/{created['id']}")

        response = await client.delete(f"/patients/{created['id']}")

        assert response.status_code == 404
