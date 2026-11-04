from fastapi import APIRouter

from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", summary="Liveness check")
async def health() -> HealthResponse:
    """Report that the API process is up and serving requests."""
    return HealthResponse(status="ok")
