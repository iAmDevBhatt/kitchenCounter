"""Seed first-run data: create admin user + KitchenCategories root."""
import os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent  # E:\kitchenCounter
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(str(ROOT / ".env"))
os.environ["PYTHONPATH"] = str(ROOT)

import backend  # noqa: F401
from backend.config import settings  # noqa: E402

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from backend.models.user import User
from backend.models.category import Category
from backend.models.theme import ThemeSettings
from backend.database import Base

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

_db_url = os.environ.get("DATABASE_URL", "sqlite:///./kitchendb.sqlite")
if _db_url.startswith("sqlite"):
    if not _db_url.startswith("sqlite:///") and not _db_url.startswith("sqlite+"):
        _db_url = "sqlite:///" + os.path.abspath(_db_url.replace("sqlite://", ""))

engine = create_engine(
    _db_url,
    connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
)


def seed():
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    root = db.query(Category).filter(Category.name == "KitchenCategories").first()
    if not root:
        admin = User(
            username="admin",
            email="admin@kitchencounter.local",
            hashed_password=pwd_ctx.hash("admin123"),
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        root_cat = Category(
            name="KitchenCategories",
            parent_id=None,
            created_by=admin.id,
        )
        db.add(root_cat)
        db.commit()
        print("Seeded: admin (password: admin123)")
        print("Seeded: KitchenCategories root node")
    else:
        print("Database already seeded — skipping.")

    db.close()


if __name__ == "__main__":
    seed()
