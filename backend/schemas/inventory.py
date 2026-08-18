from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional, List, Union
from decimal import Decimal
from datetime import date as DateType
import uuid


class InventoryItemBase(BaseModel):
    category_id: str
    item_name: str
    item_image_path: Optional[str] = None
    bought_date: Optional[DateType] = None
    expiration_date: Optional[DateType] = None
    net_weight: Optional[Decimal] = None
    quantity: Optional[int] = None
    status: Optional[str] = None  # InUse, Stocked, Finished, NotInStock
    usage_percentage: Optional[int] = None  # 0-100
    amount: Optional[Decimal] = None
    carbohydrate: Optional[Decimal] = None
    fiber: Optional[Decimal] = None
    sugar: Optional[Decimal] = None
    fat: Optional[Decimal] = None
    protein: Optional[Decimal] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    created_by: str


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemUpdate(InventoryItemBase):
    item_name: Optional[str] = None
    category_id: Optional[str] = None
    item_image_path: Optional[str] = None
    bought_date: Optional[DateType] = None
    expiration_date: Optional[DateType] = None
    net_weight: Optional[Decimal] = None
    quantity: Optional[int] = None
    usage_percentage: Optional[int] = None
    amount: Optional[Decimal] = None
    carbohydrate: Optional[Decimal] = None
    fiber: Optional[Decimal] = None
    sugar: Optional[Decimal] = None
    fat: Optional[Decimal] = None
    protein: Optional[Decimal] = None
    description: Optional[str] = None
    notes: Optional[str] = None


class InventoryItemResponse(InventoryItemBase):
    id: UUID4
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True