from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional, List
import uuid as stdlib_uuid
from datetime import date as DateType, date


class MealPrepBase(BaseModel):
    year: int
    month: int
    day: int
    created_by: UUID4


class MealPrepCreate(MealPrepBase):
    pass


class MealPrepUpdate(MealPrepBase):
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None


class MealPrepResponse(MealPrepBase):
    id: UUID4
    created_at: str

    class Config:
        from_attributes = True


class MealPrepEntryBase(BaseModel):
    meal_prep_id: UUID4
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
    id: UUID4
    created_at: str

    class Config:
        from_attributes = True


class MealPrepItemBase(BaseModel):
    meal_prep_entry_id: UUID4
    inventory_item_id: UUID4


class MealPrepItemCreate(MealPrepItemBase):
    pass


class MealPrepItemResponse(MealPrepItemBase):
    id: UUID4
    created_at: str

    class Config:
        from_attributes = True