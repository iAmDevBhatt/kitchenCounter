---
name: project-db-strategy
description: Database choice strategy — SQLite for dev, PostgreSQL for production
metadata:
  type: project
---

SQLite (`kitchendb.sqlite`) is intentionally used for development — chosen for speed and zero-config setup. PostgreSQL 15+ is the target for production (as specced in KITCHEN_APP_BUILD.md).

**Why:** Developer preference for fast local iteration without running a DB server.

**How to apply:** Do not flag SQLite as a bug or deviation. When discussing migrations or production deployment, recommend switching to PostgreSQL then. Alembic migrations are not yet set up — `Base.metadata.create_all()` handles schema for now, which is fine for dev.
