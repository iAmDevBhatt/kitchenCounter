from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[UUID4] = None
    image_path: Optional[str] = None
    created_by: UUID4


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    name: Optional[str] = None
    parent_id: Optional[UUID4] = None
    image_path: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: UUID4
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True