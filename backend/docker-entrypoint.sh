#!/bin/sh
# Bring the schema up to date and seed (both idempotent), then exec the server so it runs
# as PID 1 and receives stop signals directly.
set -eu

alembic upgrade head
python -m app.seed

exec "$@"
