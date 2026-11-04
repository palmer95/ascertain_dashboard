from fastapi import APIRouter

from app.dependencies import SessionDep
from app.schemas.dashboard import DashboardStats
from app.services import dashboard as dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", summary="Dashboard statistics")
async def get_dashboard_stats(session: SessionDep) -> DashboardStats:
    """Patient counts by status and recent visit activity, for the dashboard home page."""
    return await dashboard_service.get_stats(session)
