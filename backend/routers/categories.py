from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.category import Category
from ..models.inventory import InventoryItem
from ..schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
import uuid as stdlib_uuid

router = APIRouter()


def _parse_uid(s: str) -> str:
    try:
        return str(stdlib_uuid.UUID(s))
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/", response_model=list[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()


@router.post("/", response_model=CategoryResponse)
async def create_category(cat: CategoryCreate, db: Session = Depends(get_db)):
    if cat.name == "KitchenCategories" and cat.parent_id is None:
        raise HTTPException(status_code=400, detail="Cannot create a second root category.")

    db_cat = Category(**cat.model_dump())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(category_id)
    cat = db.query(Category).filter(Category.id == uid).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, cat_update: CategoryUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(category_id)
    existing = db.query(Category).filter(Category.id == uid).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")

    # Prevent renaming the root node
    if existing.parent_id is None and cat_update.name and cat_update.name != "KitchenCategories":
        raise HTTPException(status_code=403, detail="Cannot rename the root category.")

    update_data = cat_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/{category_id}")
async def delete_category(category_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(category_id)
    cat = db.query(Category).filter(Category.id == uid).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Cannot delete the root node
    if cat.parent_id is None:
        raise HTTPException(status_code=403, detail="Cannot delete the root category.")

    # Check for linked inventory items (business rule: warn if linked)
    linked_count = db.query(InventoryItem).filter(InventoryItem.category_id == uid).count()
    if linked_count > 0:
        raise HTTPException(status_code=409, detail=f"Cannot delete category with {linked_count} linked inventory items.")

    # Cascade delete children
    db.query(Category).filter(Category.parent_id == uid).delete()

    db.delete(cat)
    db.commit()
    return {"message": "Category deleted successfully"}