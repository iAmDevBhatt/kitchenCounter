from __future__ import annotations
from sqlalchemy import Column, UUID, String, Text, DateTime
from sqlalchemy.sql import func
from ..database import Base
import uuid


class AppSettings(Base):
    """App-wide key/value settings (one row per key)."""
    __tablename__ = "app_settings"

    id         = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    key        = Column(String(100), unique=True, nullable=False)
    value      = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
