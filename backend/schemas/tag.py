from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional


class TagBase(BaseModel):
    name: str
    tag_type: str  # e.g. "vitamin", "general"
    created_by: UUID4


class TagCreate(TagBase):
    pass


class TagUpdate(TagBase):
    name: Optional[str] = None
    tag_type: Optional[str] = None


class TagResponse(TagBase):
    id: UUID4
    created_at: str

    class Config:
        from_attributes = True