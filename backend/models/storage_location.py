from __future__ import annotations
from sqlalchemy import Column, UUID, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..database import Base
import uuid

class StorageLocation(Base):
    __tablename__ = "storage_locations"

    id         = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = Column(String(100), unique=True, nullable=False)
    created_by = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
