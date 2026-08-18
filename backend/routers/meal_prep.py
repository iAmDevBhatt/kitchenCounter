from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.meal_prep import MealPrep, MealPrepEntry, MealPrepItem
from ..models.inventory import InventoryItem
from ..schemas.meal_prep import (
    MealPrepCreate, MealPrepResponse,
    MealPrepEntryCreate, MealPrepEntryUpdate, MealPrepEntryResponse,
    MealPrepItemCreate, MealPrepItemResponse,
)
import uuid as stdlib_uuid

router = APIRouter()


def _parse_uid(s: str) -> str:
    try:
        return str(stdlib_uuid.UUID(s))
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/month/{year}/{month}")
async def get_month(year: int, month: int, db: Session = Depends(get_db)):
    return (
        db.query(MealPrep)
        .filter(MealPrep.year == year, MealPrep.month == month)
        .all()
    )


@router.post("/month/{year}/{month}")
async def create_month(year: int, month: int, db: Session = Depends(get_db)):
    import calendar
    days_in_month = calendar.monthrange(year, month)[1]

    results = []
    for day in range(1, days_in_month + 1):
        existing = (
            db.query(MealPrep)
            .filter(MealPrep.year == year, MealPrep.month == month, MealPrep.day == day)
            .first()
        )
        if not existing:
            mp = MealPrep(year=year, month=month, day=day)
            db.add(mp)
            results.append(mp)

    if not results:
        raise HTTPException(status_code=400, detail="Meal prep data for this month already exists.")

    db.commit()
    for r in results:
        db.refresh(r)
    return {"message": f"Created {len(results)} day entries", "created_ids": [r.id for r in results]}


@router.get("/entry/{entry_id}", response_model=MealPrepEntryResponse)
async def get_entry(entry_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(entry_id)
    entry = db.query(MealPrepEntry).filter(MealPrepEntry.id == uid).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal prep entry not found")
    return entry


@router.put("/entry/{entry_id}", response_model=MealPrepEntryResponse)
async def update_entry(entry_id: str, entry_update: MealPrepEntryUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(entry_id)
    existing = db.query(MealPrepEntry).filter(MealPrepEntry.id == uid).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Meal prep entry not found")

    update_data = entry_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/entry/{entry_id}")
async def delete_entry(entry_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(entry_id)
    entry = db.query(MealPrepEntry).filter(MealPrepEntry.id == uid).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal prep entry not found")

    db.query(MealPrepItem).filter(MealPrepItem.meal_prep_entry_id == uid).delete()
    db.delete(entry)
    db.commit()
    return {"message": "Meal prep entry deleted successfully"}


@router.post("/entry/{entry_id}/items", response_model=MealPrepItemResponse)
async def add_item_to_entry(entry_id: str, item_link: MealPrepItemCreate, db: Session = Depends(get_db)):
    uid = _parse_uid(entry_id)
    entry = db.query(MealPrepEntry).filter(MealPrepEntry.id == uid).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal prep entry not found")

    mp_item = MealPrepItem(
        meal_prep_entry_id=uid,
        inventory_item_id=item_link.inventory_item_id,
    )
    db.add(mp_item)
    db.commit()
    db.refresh(mp_item)
    return mp_item