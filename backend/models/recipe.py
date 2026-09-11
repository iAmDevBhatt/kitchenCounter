from __future__ import annotations
from sqlalchemy import Column, UUID, String, Text, DateTime
from sqlalchemy.sql import func
from ..database import Base
import uuid


class Recipe(Base):
    __tablename__ = "recipes"

    id         = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = Column(String(300), nullable=False)
    url        = Column(Text, nullable=False)
    notes      = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
