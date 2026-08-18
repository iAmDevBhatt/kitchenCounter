from __future__ import annotations
from sqlalchemy import Column, UUID, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from ..database import Base
import uuid

class Tag(Base):
    __tablename__ = "tags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    tag_type = Column(String(50))  # e.g. "vitamin", "general"
    created_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())