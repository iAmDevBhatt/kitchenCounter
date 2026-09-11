from __future__ import annotations
import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.app_settings import AppSettings
from ..schemas.app_settings import AppSettingUpdate, AppSettingResponse

router = APIRouter()

_DEFAULTS = {
    "download_dir": os.environ.get("DOWNLOAD_DIR", "/app/backend/static/downloads"),
}

ALLOWED_KEYS = {"download_dir"}


@router.get("/{key}", response_model=AppSettingResponse)
async def get_setting(key: str, db: Session = Depends(get_db)):
    row = db.query(AppSettings).filter(AppSettings.key == key).first()
    if row:
        return row
    # Return default without persisting
    return AppSettingResponse(key=key, value=_DEFAULTS.get(key))


@router.put("/{key}", response_model=AppSettingResponse)
async def upsert_setting(key: str, payload: AppSettingUpdate, db: Session = Depends(get_db)):
    if key not in ALLOWED_KEYS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unknown setting key: {key}")
    row = db.query(AppSettings).filter(AppSettings.key == key).first()
    if row:
        row.value = payload.value
    else:
        row = AppSettings(key=key, value=payload.value)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
