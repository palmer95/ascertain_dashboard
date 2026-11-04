#!/usr/bin/env sh
# Container entrypoint: bring the schema up to date and seed (idempotent), then hand off
# to the server command (CMD) so it runs as PID 1 and receives signals directly.
set -eu

echo "Running database migrations..."
alembic upgrade head

echo "Seeding database (skipped if data already exists)..."
python -m app.seed

exec "$@"
