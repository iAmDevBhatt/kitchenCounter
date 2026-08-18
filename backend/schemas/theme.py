from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional, List, Dict


class ThemeBase(BaseModel):
    wallpaper_path: Optional[str] = None
    extracted_palette: Optional[Dict] = None


class ThemeCreate(ThemeBase):
    user_id: UUID4


class ThemeUpdate(ThemeBase):
    wallpaper_path: Optional[str] = None
    extracted_palette: Optional[Dict] = None


class ThemeResponse(ThemeBase):
    id: UUID4
    user_id: UUID4
    active: bool
    created_at: str

    class Config:
        from_attributes = True