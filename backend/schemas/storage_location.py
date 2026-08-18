from __future__ import annotations
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StorageLocationCreate(BaseModel):
    name: str
    created_by: str


class StorageLocationUpdate(BaseModel):
    name: Optional[str] = None


class StorageLocationResponse(BaseModel):
    id: str
    name: str
    created_by: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
