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

    chown -R "$PUID:$PGID" /app/static/uploads /data/db 2>/dev/null || true
    RUN_AS="gosu ${USER_NAME}:${GROUP_NAME}"
else
    echo "[entrypoint] PUID/PGID not set (or 0) — running as root"
fi

echo "[entrypoint] Running database init & seed..."
$RUN_AS python /app/init_db.py

echo "[entrypoint] Starting uvicorn on port ${PORT}..."
exec $RUN_AS uvicorn main:app --host 0.0.0.0 --port "${PORT}"
