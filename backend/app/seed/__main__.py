"""Seed the database: `python -m app.seed`.

Idempotent: does nothing if any patients already exist, so it is safe to run on every
container start. A transaction-scoped advisory lock prevents duplicate seeding if two
instances start at the same time.
"""

import asyncio
import logging

from sqlalchemy import func, select, text

from app.core.db import SessionFactory, engine
from app.models import Patient
from app.seed.patients import build_patients

PATIENT_COUNT = 150
_ADVISORY_LOCK_KEY = 4_200_001

logger = logging.getLogger("app.seed")


async def seed() -> None:
    async with SessionFactory() as session, session.begin():
        await session.execute(
            text("SELECT pg_advisory_xact_lock(:key)"), {"key": _ADVISORY_LOCK_KEY}
        )

        existing = await session.scalar(select(func.count()).select_from(Patient))
        if existing:
            logger.info("Database already has %d patients; skipping seed.", existing)
            return

        session.add_all(build_patients(PATIENT_COUNT))
        logger.info("Seeded %d patients.", PATIENT_COUNT)


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
    asyncio.run(main())
