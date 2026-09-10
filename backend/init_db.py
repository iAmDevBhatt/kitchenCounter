"""
Startup seed: inserts default data (admin user, root category) if absent.

In Docker, this runs AFTER `alembic upgrade head` has already applied all
schema migrations, so there is no create_all() call here.  For local dev
(`python -m backend.init_db` without Docker), create_all() still runs as a
convenience fallback so developers don't need to run Alembic manually.
"""
from __future__ import annotations
import os, uuid, sys
from pathlib import Path

# Belt-and-suspenders: make sure the repo-root-equivalent (/app in Docker) is
# on sys.path even if this ever gets run directly instead of via `-m`.
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from backend.database import engine, Base, SessionLocal
from backend.models import (
    user, category, inventory as inv_model,
    meal_prep as mp_model, tag, theme as theme_model,
    inventory_tag, storage_location as storage_location_model,
)
from backend.models.user import User
from backend.models.category import Category
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Whether we are running inside Docker (entrypoint sets this after alembic runs)
_IN_DOCKER = os.environ.get("RUNNING_IN_DOCKER", "").lower() in ("1", "true", "yes")


def seed():
    # Local dev fallback: create tables if Alembic hasn't been run yet.
    # In Docker, alembic upgrade head already ran, so this is a no-op (create_all
    # only creates tables that don't exist yet — it never drops or alters them).
    if not _IN_DOCKER:
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # --- default admin user ---
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                username="admin",
                email="admin@kitchencounter.local",
                hashed_password=pwd_ctx.hash("admin123"),
                is_active=True,
            )
            db.add(admin)
            db.flush()
            print("[init] Created default admin user (admin / admin123)")
        else:
            print("[init] Admin user already exists — skipping")

        # --- root category ---
        root = db.query(Category).filter(
            Category.name == "KitchenCategories",
            Category.parent_id.is_(None),
        ).first()
        if not root:
            root = Category(
                id=str(uuid.uuid4()),
                name="KitchenCategories",
                parent_id=None,
                created_by=admin.id,
            )
            db.add(root)
            print("[init] Created root category KitchenCategories")
        else:
            print("[init] Root category already exists — skipping")

        db.commit()
        print("[init] Database seeding complete")
    except Exception as exc:
        db.rollback()
        print(f"[init] Seeding failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
