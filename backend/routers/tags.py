from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.tag import Tag
from ..schemas.tag import TagCreate, TagResponse, TagUpdate
import uuid as stdlib_uuid

router = APIRouter()


def _parse_uid(s: str) -> str:
    try:
        return str(stdlib_uuid.UUID(s))
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/", response_model=list[TagResponse])
async def get_tags(db: Session = Depends(get_db)):
    return db.query(Tag).all()


@router.post("/", response_model=TagResponse)
async def create_tag(tag: TagCreate, db: Session = Depends(get_db)):
    existing = db.query(Tag).filter(Tag.name == tag.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag name already exists.")

    db_tag = Tag(**tag.model_dump())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.get("/{tag_id}", response_model=TagResponse)
async def get_tag(tag_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(tag_id)
    tag = db.query(Tag).filter(Tag.id == uid).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(tag_id: str, tag_update: TagUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(tag_id)
    existing = db.query(Tag).filter(Tag.id == uid).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Tag not found")

    if tag_update.name:
        dup = db.query(Tag).filter(Tag.name == tag_update.name, Tag.id != uid).first()
        if dup:
            raise HTTPException(status_code=400, detail="Tag name already exists.")

    update_data = tag_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/{tag_id}")
async def delete_tag(tag_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(tag_id)
    tag = db.query(Tag).filter(Tag.id == uid).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    db.delete(tag)
    db.commit()
    return {"message": "Tag deleted successfully"}