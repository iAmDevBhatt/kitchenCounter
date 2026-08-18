from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, Dict


class ThemeBase(BaseModel):
    wallpaper_path: Optional[str] = None
    extracted_palette: Optional[Dict] = None


class ThemeCreate(ThemeBase):
    user_id: str


class ThemeUpdate(ThemeBase):
    wallpaper_path: Optional[str] = None
    extracted_palette: Optional[Dict] = None


class ThemeResponse(ThemeBase):
    id: str
    user_id: str
    active: bool
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
