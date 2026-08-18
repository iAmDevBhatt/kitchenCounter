from __future__ import annotations
from sqlalchemy import Column, UUID, ForeignKey
from ..database import Base
import uuid

class InventoryItemTag(Base):
    __tablename__ = "inventory_item_tags"

    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory_items.id"), primary_key=True)
    tag_id = Column(UUID(as_uuid=True), ForeignKey("tags.id"), primary_key=True)