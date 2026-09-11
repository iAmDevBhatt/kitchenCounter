from __future__ import annotations
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RecipeCreate(BaseModel):
    name: str
    url: str
    notes: Optional[str] = None


class RecipeUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    notes: Optional[str] = None


class RecipeResponse(BaseModel):
    id: str
    name: str
    url: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
