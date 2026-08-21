from __future__ import annotations
from pydantic import BaseModel
from typing import Optional, List
import uuid as stdlib_uuid
from datetime import date as DateType, date, datetime


class MealPrepBase(BaseModel):
    year: int
    month: int
    day: int
    created_by: str


class MealPrepCreate(MealPrepBase):
    pass


class MealPrepUpdate(MealPrepBase):
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None
    created_by: Optional[str] = None


class MealPrepResponse(MealPrepBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MealPrepEntryBase(BaseModel):
    meal_prep_id: str
    meal_time: str  # Breakfast, Lunch, Dinner
    video_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # Planned, Done, Skipped


class MealPrepEntryCreate(MealPrepEntryBase):
    pass


class MealPrepEntryUpdate(MealPrepEntryBase):
    meal_time: Optional[str] = None
    video_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class MealPrepEntryResponse(MealPrepEntryBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MealPrepItemBase(BaseModel):
    meal_prep_entry_id: str
    inventory_item_id: str


class MealPrepItemCreate(MealPrepItemBase):
    pass


class MealPrepItemResponse(MealPrepItemBase):
    id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
