#!/bin/sh
set -e

echo "[entrypoint] Running database init & seed..."
python /app/init_db.py

echo "[entrypoint] Starting uvicorn..."
exec uvicorn main:app --host 0.0.0.0 --port 8001
