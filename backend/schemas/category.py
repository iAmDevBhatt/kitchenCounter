from __future__ import annotations
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[str] = None
    image_path: Optional[str] = None
    created_by: str


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    name: Optional[str] = None
    parent_id: Optional[str] = None
    image_path: Optional[str] = None
    created_by: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
