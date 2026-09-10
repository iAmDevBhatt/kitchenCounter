#!/bin/sh
set -e

PORT="${PORT:-8000}"
PUID="${PUID:-0}"
PGID="${PGID:-0}"

RUN_AS=""

# If PUID/PGID are set to a non-root id, create a matching user/group, chown
# the persistent (volume-mounted) directories so the host-side bind mounts
# get sane ownership, then drop privileges via gosu before starting the app.
if [ "$PUID" != "0" ] && [ "$PGID" != "0" ]; then
    echo "[entrypoint] Configuring app user ${PUID}:${PGID}"

    if ! getent group "$PGID" >/dev/null 2>&1; then
        groupadd -g "$PGID" appgroup
    fi
    GROUP_NAME="$(getent group "$PGID" | cut -d: -f1)"

    if ! getent passwd "$PUID" >/dev/null 2>&1; then
        useradd -u "$PUID" -g "$PGID" -M -s /usr/sbin/nologin appuser
    fi
    USER_NAME="$(getent passwd "$PUID" | cut -d: -f1)"

    if ! chown -R "$PUID:$PGID" /app/backend/static/uploads /data/db; then
        echo "[entrypoint] WARNING: chown of /app/backend/static/uploads or /data/db failed —" >&2
        echo "[entrypoint]          the container will likely fail to write to them as UID ${PUID}." >&2
    fi
    RUN_AS="gosu ${USER_NAME}:${GROUP_NAME}"
else
    echo "[entrypoint] PUID/PGID not set (or 0) — running as root"
fi

# Fail fast with a clear message instead of a deep SQLAlchemy traceback if the
# DB's parent directory is missing or unwritable — usually means DATABASE_URL
# doesn't agree with where a volume is actually mounted.
db_dir=$(python -c "
import os, re
url = os.environ.get('DATABASE_URL', 'sqlite:///./kitchendb.sqlite')
m = re.match(r'sqlite(\+\w+)?:////?(.*)', url)
print(os.path.dirname('/' + m.group(2)) if m else '')
")
if [ -n "$db_dir" ]; then
    if [ ! -d "$db_dir" ]; then
        echo "[entrypoint] ERROR: DATABASE_URL points at a directory that doesn't exist in this" >&2
        echo "[entrypoint]        container: '$db_dir'. Check that DATABASE_URL's path matches a" >&2
        echo "[entrypoint]        volume/bind-mount target in docker-compose.yml." >&2
        exit 1
    fi
    if [ -n "$RUN_AS" ] && ! $RUN_AS test -w "$db_dir"; then
        echo "[entrypoint] ERROR: '$db_dir' exists but isn't writable by UID ${PUID}:${PGID}." >&2
        echo "[entrypoint]        Check ownership of the host directory bind-mounted there." >&2
        exit 1
    fi
fi

# Run Alembic migrations first so any new tables/columns added since the last
# deployment are applied safely without wiping existing data.
# `alembic upgrade head` is idempotent — it only applies migrations that haven't
# run yet.  The initial revision (0001) uses has_table() guards so it's a no-op
# against databases already created by create_all() before Alembic was wired up.
echo "[entrypoint] Running Alembic migrations..."
$RUN_AS python -m alembic -c /app/alembic.ini upgrade head

# Seed default data (admin user + root category) — skips records that already exist.
echo "[entrypoint] Running database seed..."
$RUN_AS env RUNNING_IN_DOCKER=true python -m backend.init_db

echo "[entrypoint] Starting uvicorn on port ${PORT}..."
exec $RUN_AS python -m uvicorn backend.main:app --host 0.0.0.0 --port "${PORT}"
