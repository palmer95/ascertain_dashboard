from fastapi import APIRouter

from app.core.config import get_settings
from app.schemas.config import ClientConfig

router = APIRouter(tags=["config"])


@router.get("/config", summary="Settings for the frontend")
async def get_config() -> ClientConfig:
    """The clinic's time zone, so the app shows times on the same calendar the API uses."""
    return ClientConfig(clinic_timezone=get_settings().clinic_timezone)
