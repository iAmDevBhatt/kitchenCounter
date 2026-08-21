from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.inventory import InventoryItem
from ..models.inventory_tag import InventoryItemTag
from ..models.tag import Tag
from ..schemas.inventory import InventoryItemCreate, InventoryItemResponse, InventoryItemUpdate
from typing import List
import os
import uuid as stdlib_uuid
from pathlib import Path

router = APIRouter()


def _parse_uid(s: str) -> str:
    try:
        return str(stdlib_uuid.UUID(s))  # validates format, returns canonical string
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/", response_model=List[InventoryItemResponse])
async def get_inventory_items(db: Session = Depends(get_db)):
    return db.query(InventoryItem).all()


@router.post("/", response_model=InventoryItemResponse)
async def create_inventory_item(item: InventoryItemCreate, db: Session = Depends(get_db)):
    # Business rule: auto-set status based on usage_percentage
    if item.usage_percentage is not None:
        if item.usage_percentage == 100:
            new_status = "Finished"
        elif 1 <= item.usage_percentage <= 99:
            new_status = "InUse"
        else:
            new_status = item.status
        # We'll set it after creation; for now pass through
    
    db_item = InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.get("/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(item_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    item = db.query(InventoryItem).filter(InventoryItem.id == uid).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(item_id: str, item_update: InventoryItemUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    db_item = db.query(InventoryItem).filter(InventoryItem.id == uid).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = item_update.model_dump(exclude_unset=True)

    # Auto-set status from usage_percentage only when caller did not explicitly set status
    if 'usage_percentage' in update_data and 'status' not in update_data:
        pct = update_data['usage_percentage']
        if pct == 100:
            update_data['status'] = 'Finished'
        elif 1 <= pct <= 99:
            update_data['status'] = 'InUse'
    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/{item_id}")
async def delete_inventory_item(item_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    db_item = db.query(InventoryItem).filter(InventoryItem.id == uid).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    db.delete(db_item)
    db.commit()
    return {"message": "Inventory item deleted successfully"}


@router.get("/{item_id}/tags")
async def get_item_tags(item_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    rows = db.query(InventoryItemTag).filter(InventoryItemTag.item_id == uid).all()
    tag_ids = [r.tag_id for r in rows]
    if not tag_ids:
        return []
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    return [{"id": t.id, "name": t.name, "tag_type": t.tag_type} for t in tags]


@router.put("/{item_id}/tags")
async def set_item_tags(item_id: str, payload: dict, db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    tag_ids = payload.get("tag_ids", [])
    # Delete existing
    db.query(InventoryItemTag).filter(InventoryItemTag.item_id == uid).delete()
    # Insert new
    for tid in tag_ids:
        db.add(InventoryItemTag(item_id=uid, tag_id=str(stdlib_uuid.UUID(tid))))
    db.commit()
    return {"tag_ids": tag_ids}


@router.post("/upload-image/{item_id}")
async def upload_item_image(item_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    db_item = db.query(InventoryItem).filter(InventoryItem.id == uid).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    allowed_extensions = {".png", ".jpg", ".jpeg", ".gif"}
    ext = Path(file.filename or "").suffix.lower()

    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPG, JPEG, and GIF are allowed.")

    # Resolve relative to this file (not CWD) so it's correct regardless of
    # where the process is launched from — matches main.py's static mount.
    upload_dir = str(Path(__file__).resolve().parent.parent / "static" / "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{stdlib_uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_dir, filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    db_item.item_image_path = f"/uploads/{filename}"
    db.commit()

    return {"message": "Image uploaded successfully", "image_path": db_item.item_image_path}