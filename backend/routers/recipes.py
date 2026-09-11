from __future__ import annotations
import os
import subprocess
import uuid as stdlib_uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.recipe import Recipe
from ..models.app_settings import AppSettings
from ..schemas.recipe import RecipeCreate, RecipeUpdate, RecipeResponse

router = APIRouter()

_DEFAULT_DOWNLOAD_DIR = "/app/backend/static/downloads"


def _parse_uid(s: str) -> str:
    try:
        return str(stdlib_uuid.UUID(s))
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


def _get_download_dir(db: Session) -> str:
    row = db.query(AppSettings).filter(AppSettings.key == "download_dir").first()
    if row and row.value:
        return row.value
    return os.environ.get("DOWNLOAD_DIR", _DEFAULT_DOWNLOAD_DIR)


# ── CRUD ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[RecipeResponse])
async def list_recipes(db: Session = Depends(get_db)):
    return db.query(Recipe).order_by(Recipe.name).all()


@router.post("/", response_model=RecipeResponse)
async def create_recipe(payload: RecipeCreate, db: Session = Depends(get_db)):
    recipe = Recipe(**payload.model_dump())
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.get("/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(recipe_id)
    recipe = db.query(Recipe).filter(Recipe.id == uid).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.put("/{recipe_id}", response_model=RecipeResponse)
async def update_recipe(recipe_id: str, payload: RecipeUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(recipe_id)
    recipe = db.query(Recipe).filter(Recipe.id == uid).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(recipe, field, val)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.delete("/{recipe_id}")
async def delete_recipe(recipe_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(recipe_id)
    recipe = db.query(Recipe).filter(Recipe.id == uid).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted"}


# ── Download ──────────────────────────────────────────────────────────────

def _do_download(url: str, download_dir: str, recipe_name: str) -> None:
    """Run in background. Uses yt-dlp for video URLs, wget for others."""
    Path(download_dir).mkdir(parents=True, exist_ok=True)

    _video_hosts = (
        "youtube.com", "youtu.be", "instagram.com", "facebook.com", "fb.watch",
        "tiktok.com", "vimeo.com", "dailymotion.com",
    )
    is_video = any(h in url for h in _video_hosts)

    if is_video:
        # yt-dlp: save to download_dir with safe filename
        safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in recipe_name)[:80]
        cmd = [
            "yt-dlp",
            "--no-playlist",
            "-o", str(Path(download_dir) / f"{safe_name}_%(id)s.%(ext)s"),
            url,
        ]
    else:
        # For recipe pages: save as HTML using wget
        safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in recipe_name)[:80]
        out_file = str(Path(download_dir) / f"{safe_name}.html")
        cmd = ["wget", "-q", "-O", out_file, "--timeout=30", url]

    try:
        subprocess.run(cmd, timeout=300, check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        pass  # Background task — errors are swallowed; frontend polls status separately


@router.post("/{recipe_id}/download")
async def download_recipe(
    recipe_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    uid = _parse_uid(recipe_id)
    recipe = db.query(Recipe).filter(Recipe.id == uid).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    download_dir = _get_download_dir(db)
    background_tasks.add_task(_do_download, recipe.url, download_dir, recipe.name)
    return JSONResponse({"message": "Download started", "download_dir": download_dir})
