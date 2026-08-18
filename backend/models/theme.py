from __future__ import annotations
from sqlalchemy import Column, UUID, String, Text, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.sql import func
from ..database import Base
import uuid

class ThemeSettings(Base):
    __tablename__ = "theme_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    wallpaper_path = Column(Text)
    extracted_palette = Column(JSON)  # colorthief output
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())