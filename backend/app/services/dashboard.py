from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.enums import PatientStatus
from app.models.patient import Patient
from app.schemas.dashboard import DashboardStats, RecentVisit, StatusCount

RECENT_VISITS_LIMIT = 5
ACTIVITY_WINDOW = timedelta(days=30)


async def get_stats(session: AsyncSession) -> DashboardStats:
    """Aggregates computed in the database, so the cost doesn't grow with what's sent back."""
    rows = await session.execute(select(Patient.status, func.count()).group_by(Patient.status))
    counts: dict[PatientStatus, int] = {status: count for status, count in rows.tuples()}

    since = datetime.now(UTC) - ACTIVITY_WINDOW
    visits_last_30_days = await session.scalar(
        select(func.count()).select_from(Patient).where(Patient.last_visit_at >= since)
    )

    # Served by ix_patients_last_visit_at (last_visit_at DESC NULLS LAST, id).
    recent = await session.scalars(
        select(Patient)
        .where(Patient.last_visit_at.is_not(None))
        .order_by(Patient.last_visit_at.desc().nulls_last(), Patient.id)
        .limit(RECENT_VISITS_LIMIT)
    )

    return DashboardStats(
        total_patients=sum(counts.values()),
        # Every status, zeros included, so the client never has to fill gaps.
        by_status=[StatusCount(status=s, count=counts.get(s, 0)) for s in PatientStatus],
        visits_last_30_days=visits_last_30_days or 0,
        recent_visits=[RecentVisit.model_validate(p) for p in recent],
    )
