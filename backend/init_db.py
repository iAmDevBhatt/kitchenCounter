"""
Startup initializer: create all tables then seed default data.
Run automatically by the Docker entrypoint before uvicorn starts.
"""
from __future__ import annotations
import os, uuid, sys

# Ensure the package root is on sys.path when run as `python init_db.py`
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, SessionLocal
from models import (
    user, category, inventory as inv_model,
    meal_prep as mp_model, tag, theme as theme_model,
    inventory_tag, storage_location as storage_location_model,
)
from models.user import User
from models.category import Category
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
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
