"""Seed the database: `python -m app.seed`.

Idempotent: patients are seeded only into an empty table, and notes only while there are
none, so it is safe to run on every container start (and fills in notes on a database seeded
before notes existed). A transaction-scoped advisory lock prevents duplicate seeding if two
instances start at the same time.
"""

import asyncio
import logging

from sqlalchemy import func, select, text

from app.core.db import SessionFactory, engine
from app.models import Patient, PatientNote
from app.seed.notes import build_notes
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
            logger.info("Database already has %d patients; skipping patient seed.", existing)
        else:
            session.add_all(build_patients(PATIENT_COUNT))
            await session.flush()  # Assigns patient IDs for the notes below.
            logger.info("Seeded %d patients.", PATIENT_COUNT)

        if await session.scalar(select(func.count()).select_from(PatientNote)):
            logger.info("Notes already exist; skipping note seed.")
            return
        patients = list(await session.scalars(select(Patient)))
        notes = build_notes(patients)
        session.add_all(notes)
        logger.info("Seeded %d notes.", len(notes))


async def main() -> None:
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
    asyncio.run(main())
