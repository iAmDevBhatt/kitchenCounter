from __future__ import annotations
import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase


_db_url = os.environ.get("DATABASE_URL", "sqlite:///./kitchendb.sqlite")

if _db_url.startswith("sqlite"):
    if not _db_url.startswith("sqlite:///") and not _db_url.startswith("sqlite+"):
        _db_url = "sqlite:///" + os.path.abspath(_db_url.replace("sqlite://", ""))

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()