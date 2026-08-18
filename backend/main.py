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
from .database import engine, Base
from .routers import auth, categories, inventory, meal_prep, tags, theme, ai_insights

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

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(categories.router, prefix="/categories", tags=["Categories"])
app.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
app.include_router(meal_prep.router, prefix="/meal-prep", tags=["Meal Prep"])
app.include_router(tags.router, prefix="/tags", tags=["Tags"])
app.include_router(theme.router, prefix="/theme", tags=["Theme"])
app.include_router(ai_insights.router, prefix="/ai-insights", tags=["AI Insights"])


@app.get("/")
async def root():
    return {"message": "KitchenCounter API is running"}