from __future__ import annotations
from sqlalchemy import Column, UUID, Integer, DateTime, ForeignKey, Enum, Text
from sqlalchemy.sql import func
from ..database import Base
import uuid

class MealPrep(Base):
    __tablename__ = "meal_preps"

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    day = Column(Integer, nullable=False)  # 1-31
    created_by = Column(UUID(as_uuid=False), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MealPrepEntry(Base):
    __tablename__ = "meal_prep_entries"

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    meal_prep_id = Column(UUID(as_uuid=False), ForeignKey("meal_preps.id"), nullable=False)
    meal_time = Column(Enum("Breakfast", "Lunch", "Dinner"))
    video_url = Column(Text)
    notes = Column(Text)
    status = Column(Enum("Planned", "Done", "Skipped"))

class MealPrepItem(Base):
    __tablename__ = "meal_prep_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    meal_prep_entry_id = Column(UUID(as_uuid=False), ForeignKey("meal_prep_entries.id"), nullable=False)
    inventory_item_id = Column(UUID(as_uuid=False), ForeignKey("inventory_items.id"), nullable=False)