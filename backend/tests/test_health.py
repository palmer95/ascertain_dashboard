from httpx import AsyncClient


async def test_health_returns_ok(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_every_response_carries_a_request_id(client: AsyncClient) -> None:
    response = await client.get("/health")

    assert response.headers["X-Request-ID"]


async def test_unknown_route_uses_the_error_format(client: AsyncClient) -> None:
    response = await client.get("/nope")

    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "not_found", "message": "Not Found", "details": []}
    }


async def test_malformed_json_is_a_400(client: AsyncClient) -> None:
    response = await client.post(
        "/patients", content="{not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_json"
