from __future__ import annotations

# Load .env BEFORE any relative imports (pydantic-settings / DB needs env vars)
import os
from pathlib import Path

_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(str(_env_path))
os.environ["PYTHONPATH"] = str(Path(__file__).resolve().parent.parent)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .database import engine, Base
from .routers import auth, categories, inventory, meal_prep, tags, theme, ai_insights, storage_locations, stats
# import all models so Base.metadata.create_all sees every table
from .models import user, category, inventory as inv_model, meal_prep as mp_model, tag, theme as theme_model, inventory_tag, storage_location as storage_location_model
from pathlib import Path

# Create all tables on startup (works for both PostgreSQL and SQLite)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="KitchenCounter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_static_dir = Path(__file__).resolve().parent / "static"
_static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(meal_prep.router, prefix="/meal-prep", tags=["Meal Prep"])
app.include_router(tags.router, prefix="/tags", tags=["Tags"])
app.include_router(theme.router, prefix="/theme", tags=["Theme"])
app.include_router(ai_insights.router, prefix="/ai-insights", tags=["AI Insights"])
app.include_router(storage_locations.router, prefix="/storage-locations", tags=["Storage Locations"])
app.include_router(stats.router, prefix="/stats", tags=["Stats"])


@app.get("/")
async def root():
    return {"message": "KitchenCounter API is running"}