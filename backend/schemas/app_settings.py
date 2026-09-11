from __future__ import annotations
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AppSettingUpdate(BaseModel):
    value: Optional[str] = None


class AppSettingResponse(BaseModel):
    key: str
    value: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
