# ── Stage 1: build the React frontend ──────────────────────────────────────
FROM node:18-alpine AS frontend-build

WORKDIR /src/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN chmod +x node_modules/.bin/* && npm run build
# -> /src/frontend/dist

# ── Stage 2: backend runtime, also serves the built frontend ──────────────
FROM python:3.11-slim

WORKDIR /app

# curl: used by the HEALTHCHECK below
# gosu: lets the entrypoint start as root (to fix volume ownership via
#       PUID/PGID) and then step down to an unprivileged user before exec'ing
#       uvicorn
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl gosu \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY --from=frontend-build /src/frontend/dist ./frontend_dist

# Persistent directories — bind-mounted as volumes in docker-compose
RUN mkdir -p /app/static/uploads /data/db

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -f "http://localhost:${PORT}/" || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
