#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL not set; skipping migrations" >&2
  exit 0
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found; cannot apply SQL migrations" >&2
  exit 1
fi

echo "Applying SQL migrations..."
for f in migrations/*.sql; do
  echo " -> $f"
  psql "$DATABASE_URL" -f "$f"
done

echo "Migrations applied."
