"""add patient search and sort indexes

Revision ID: 2982a8226605
Revises: e7a2dac89ed3
Create Date: 2026-11-04 07:40:27.362798

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2982a8226605"
down_revision: str | Sequence[str] | None = "e7a2dac89ed3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Trigram operators for indexable substring search. A "trusted" extension since
    # Postgres 13, so the database owner can create it without superuser rights.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_index(
        "ix_patients_first_name_trgm",
        "patients",
        ["first_name"],
        postgresql_using="gin",
        postgresql_ops={"first_name": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_patients_last_name_trgm",
        "patients",
        ["last_name"],
        postgresql_using="gin",
        postgresql_ops={"last_name": "gin_trgm_ops"},
    )
    op.create_index(
        "ix_patients_name_sort",
        "patients",
        [sa.literal_column("lower(last_name)"), sa.literal_column("lower(first_name)"), "id"],
    )
    op.create_index(
        "ix_patients_last_visit_at",
        "patients",
        [sa.literal_column("last_visit_at DESC NULLS LAST"), "id"],
    )
    op.create_index(op.f("ix_patients_date_of_birth"), "patients", ["date_of_birth"])
    op.create_index(op.f("ix_patients_status"), "patients", ["status"])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_patients_status"), table_name="patients")
    op.drop_index(op.f("ix_patients_date_of_birth"), table_name="patients")
    op.drop_index("ix_patients_last_visit_at", table_name="patients")
    op.drop_index("ix_patients_name_sort", table_name="patients")
    op.drop_index("ix_patients_last_name_trgm", table_name="patients")
    op.drop_index("ix_patients_first_name_trgm", table_name="patients")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
