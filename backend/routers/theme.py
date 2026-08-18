from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.theme import ThemeSettings
from ..schemas.theme import ThemeCreate, ThemeResponse, ThemeUpdate
import uuid as stdlib_uuid

router = APIRouter()


def _parse_uid(s: str) -> stdlib_uuid.UUID:
    try:
        return stdlib_uuid.UUID(s)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/user/{user_id}", response_model=ThemeResponse | None)
async def get_theme(user_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(user_id)
    theme = (
        db.query(ThemeSettings)
        .filter(ThemeSettings.user_id == uid, ThemeSettings.active == True)
        .first()
    )
    return theme


@router.post("/user/{user_id}", response_model=ThemeResponse)
async def set_theme(user_id: str, theme_data: ThemeCreate, db: Session = Depends(get_db)):
    uid = _parse_uid(user_id)

    db.query(ThemeSettings).filter(
        ThemeSettings.user_id == uid, ThemeSettings.active == True
    ).update({"active": False})

    new_theme = ThemeSettings(**theme_data.model_dump())
    new_theme.active = True
    db.add(new_theme)
    db.commit()
    db.refresh(new_theme)
    return new_theme