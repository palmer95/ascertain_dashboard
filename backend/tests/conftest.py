"""Shared fixtures: a real Postgres test database, one rolled-back transaction per test.

The tests run against Postgres, not SQLite, because the API relies on Postgres features
(trigram indexes, text[] columns, UUIDv7, CHECK constraints). The database is created
fresh for each run and built by the real Alembic migrations, so the migrations are tested too.
"""

import os

# Settings are read when the app is imported, so point them at the test database (and switch
# the model off) first. Real environment variables beat the repo's .env.
os.environ["POSTGRES_DB"] = os.environ.get("TEST_POSTGRES_DB", "ascertain_test")
os.environ["ANTHROPIC_API_KEY"] = ""  # Tests must never call the real API.
os.environ["ENVIRONMENT"] = "test"

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable, Iterator
from datetime import date
from pathlib import Path
from typing import Any

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import get_settings
from app.core.db import engine, get_session
from app.main import app
from app.models import Patient
from app.models.enums import BloodType, PatientStatus
from app.services import narrative

BACKEND_DIR = Path(__file__).resolve().parents[1]


async def _recreate_database(name: str) -> None:
    # CREATE/DROP DATABASE can't run in a transaction, hence AUTOCOMMIT; connect to the
    # always-present `postgres` database to do it.
    admin = create_async_engine(
        get_settings().database_url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    try:
        async with admin.connect() as conn:
            await conn.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
            await conn.execute(text(f'CREATE DATABASE "{name}"'))
    finally:
        await admin.dispose()


@pytest.fixture(scope="session", autouse=True)
def database() -> Iterator[None]:
    """A fresh database per run, migrated to head. Runs before any event loop is in use."""
    name = get_settings().postgres_db
    # The test run drops this database: make sure it can never be the development one.
    assert name.endswith("_test"), f"refusing to use {name!r} as the test database"
    asyncio.run(_recreate_database(name))

    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    command.upgrade(config, "head")
    yield


@pytest.fixture
async def db() -> AsyncIterator[AsyncSession]:
    """A session inside a transaction that is rolled back after the test.

    The app's own `commit()` calls only release savepoints, so every test starts from an
    empty database and no test can see another's data.
    """
    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(
            bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()


@pytest.fixture
async def client(db: AsyncSession) -> AsyncIterator[AsyncClient]:
    """An HTTP client for the app, in-process, using the test's session."""

    async def override_session() -> AsyncIterator[AsyncSession]:
        yield db

    app.dependency_overrides[get_session] = override_session
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    finally:
        app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def clear_summary_cache() -> None:
    """Summaries are cached by prompt; don't let one test's summary leak into another."""
    narrative._cache.clear()


def patient_payload(**overrides: Any) -> dict[str, Any]:
    """A valid request body for POST/PUT /patients."""
    return {
        "first_name": "Jane",
        "last_name": "Doe",
        "date_of_birth": "1980-05-17",
        "email": "jane.doe@example.com",
        "phone": "(555) 123-4567",
        "address_line1": "1 Main St",
        "address_line2": None,
        "city": "Springfield",
        "state": "IL",
        "postal_code": "62701",
        "blood_type": "O+",
        "status": "active",
        "allergies": ["Penicillin"],
        "conditions": ["Hypertension"],
    } | overrides


PatientFactory = Callable[..., Awaitable[Patient]]


@pytest.fixture
def make_patient(db: AsyncSession) -> PatientFactory:
    """Insert a patient directly, for setting fields the API doesn't write (`last_visit_at`)."""

    async def make(**overrides: Any) -> Patient:
        fields: dict[str, Any] = {
            "first_name": "Jane",
            "last_name": "Doe",
            "date_of_birth": date(1980, 5, 17),
            "phone": "(555) 123-4567",
            "address_line1": "1 Main St",
            "city": "Springfield",
            "state": "IL",
            "postal_code": "62701",
            "blood_type": BloodType.O_POSITIVE,
            "status": PatientStatus.ACTIVE,
            "allergies": [],
            "conditions": [],
        } | overrides
        patient = Patient(**fields)
        db.add(patient)
        await db.commit()
        return patient

    return make
