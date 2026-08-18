from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.storage_location import StorageLocation
from ..schemas.storage_location import StorageLocationCreate, StorageLocationUpdate, StorageLocationResponse
import uuid as stdlib_uuid

router = APIRouter()


def _parse_uid(s: str) -> str:
    try:
        return str(stdlib_uuid.UUID(s))
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/", response_model=list[StorageLocationResponse])
async def list_locations(db: Session = Depends(get_db)):
    return db.query(StorageLocation).order_by(StorageLocation.name).all()


@router.post("/", response_model=StorageLocationResponse)
async def create_location(payload: StorageLocationCreate, db: Session = Depends(get_db)):
    existing = db.query(StorageLocation).filter(StorageLocation.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Location name already exists.")
    loc = StorageLocation(**payload.model_dump())
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


@router.put("/{loc_id}", response_model=StorageLocationResponse)
async def update_location(loc_id: str, payload: StorageLocationUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(loc_id)
    loc = db.query(StorageLocation).filter(StorageLocation.id == uid).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    if payload.name:
        dup = db.query(StorageLocation).filter(
            StorageLocation.name == payload.name, StorageLocation.id != uid
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="Location name already exists.")
        loc.name = payload.name
    db.commit()
    db.refresh(loc)
    return loc


@router.delete("/{loc_id}")
async def delete_location(loc_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(loc_id)
    loc = db.query(StorageLocation).filter(StorageLocation.id == uid).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    db.delete(loc)
    db.commit()
    return {"message": "Location deleted"}
