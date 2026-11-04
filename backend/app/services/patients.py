"""Patient persistence. Routers stay thin (HTTP concerns only); this layer owns the queries."""

import re
from typing import Any
from uuid import UUID

from sqlalchemy import ColumnElement, UnaryExpression, and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import QueryableAttribute

from app.models import Patient
from app.schemas.patient import (
    PatientCreate,
    PatientListParams,
    PatientSort,
    PatientUpdate,
    SortOrder,
)

# Search words are separated by whitespace or commas, so "doe, jane" works.
_SEARCH_WORD_SEPARATOR = re.compile(r"[\s,]+")


def _escape_like(term: str) -> str:
    """Treat user input literally: `%` and `_` are LIKE wildcards, `\\` is our escape char."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _search_filter(q: str) -> ColumnElement[bool] | None:
    """Every word must match the first or last name (served by the trigram indexes)."""
    words = [w for w in _SEARCH_WORD_SEPARATOR.split(q) if w]
    if not words:
        return None
    clauses = []
    for word in words:
        pattern = f"%{_escape_like(word)}%"
        clauses.append(
            or_(
                Patient.first_name.ilike(pattern, escape="\\"),
                Patient.last_name.ilike(pattern, escape="\\"),
            )
        )
    return and_(*clauses)


def _order_by(sort: PatientSort, order: SortOrder) -> list[UnaryExpression[Any]]:
    """ORDER BY for each sort key. Every variant ends in a unique column (id) so pages are
    stable: without a total order, rows with equal keys can repeat or vanish across pages."""
    descending = order is SortOrder.DESC

    def direction(
        column: ColumnElement[Any] | QueryableAttribute[Any], *, reverse: bool = False
    ) -> UnaryExpression[Any]:
        return column.desc() if descending != reverse else column.asc()

    last_name, first_name = func.lower(Patient.last_name), func.lower(Patient.first_name)
    match sort:
        case PatientSort.NAME:
            # Matches ix_patients_name_sort (scanned backwards for DESC).
            return [direction(last_name), direction(first_name), direction(Patient.id)]
        case PatientSort.AGE:
            # Age ascending (youngest first) is date of birth descending.
            return [direction(Patient.date_of_birth, reverse=True), Patient.id.asc()]
        case PatientSort.LAST_VISIT:
            # Never-seen patients go last in both directions; DESC matches the index.
            return [direction(Patient.last_visit_at).nulls_last(), Patient.id.asc()]
        case PatientSort.STATUS:
            # Grouped by status, alphabetical within each group.
            return [direction(Patient.status), last_name.asc(), first_name.asc(), Patient.id.asc()]


async def list_patients(
    session: AsyncSession, params: PatientListParams
) -> tuple[list[Patient], int]:
    """One page of patients plus the total match count (for pagination controls)."""
    filters: list[ColumnElement[bool]] = []
    if params.q and (search := _search_filter(params.q)) is not None:
        filters.append(search)
    if params.status is not None:
        filters.append(Patient.status == params.status)

    total = await session.scalar(select(func.count()).select_from(Patient).where(*filters))
    page = await session.scalars(
        select(Patient)
        .where(*filters)
        .order_by(*_order_by(params.sort, params.order))
        .limit(params.limit)
        .offset(params.offset)
    )
    return list(page), total or 0


async def get_patient(session: AsyncSession, patient_id: UUID) -> Patient | None:
    return await session.get(Patient, patient_id)


async def create_patient(session: AsyncSession, data: PatientCreate) -> Patient:
    patient = Patient(**data.model_dump())
    session.add(patient)
    await session.commit()
    return patient


async def update_patient(session: AsyncSession, patient: Patient, data: PatientUpdate) -> Patient:
    # PUT is a full replacement: every writable field is overwritten.
    for field, value in data.model_dump().items():
        setattr(patient, field, value)
    await session.commit()
    return patient


async def delete_patient(session: AsyncSession, patient: Patient) -> None:
    await session.delete(patient)
    await session.commit()
