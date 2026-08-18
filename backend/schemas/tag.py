from __future__ import annotations
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TagBase(BaseModel):
    name: str
    tag_type: str
    created_by: str


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None
    tag_type: Optional[str] = None
    created_by: Optional[str] = None


class TagResponse(TagBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True