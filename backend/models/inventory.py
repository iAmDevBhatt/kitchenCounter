from __future__ import annotations
from sqlalchemy import Column, UUID, String, Text, Date, DateTime, Integer, Numeric, Enum, ForeignKey
from sqlalchemy.sql import func
from ..database import Base
import uuid

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id = Column(UUID(as_uuid=False), ForeignKey("categories.id"), nullable=False)
    item_name = Column(String(200), nullable=False)
    item_image_path = Column(Text)
    bought_date = Column(Date)
    expiration_date = Column(Date)
    net_weight = Column(Numeric(10, 2))
    quantity = Column(Integer)
    status = Column(Enum("InUse", "Stocked", "Finished", "NotInStock"))
    usage_percentage = Column(Integer)  # 0-100
    amount = Column(Numeric(10, 2))
    carbohydrate = Column(Numeric(10, 2))
    fiber = Column(Numeric(10, 2))
    sugar = Column(Numeric(10, 2))
    fat = Column(Numeric(10, 2))
    protein = Column(Numeric(10, 2))
    stored_location_id = Column(UUID(as_uuid=False), ForeignKey("storage_locations.id"), nullable=True)
    description = Column(Text)
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=False), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())