from __future__ import annotations
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.inventory import InventoryItem

router = APIRouter()


@router.get("/expiring")
async def get_expiring_soon(db: Session = Depends(get_db), days: int = 7):
    cut_off = date.today() + timedelta(days=days)
    items = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.expiration_date != None,
            InventoryItem.expiration_date <= cut_off,
        )
        .all()
    )
    return {"items": [i for i in items], "days": days}


@router.get("/summary")
async def get_inventory_summary(db: Session = Depends(get_db)):
    results = []
    for status_val in ["InUse", "Stocked", "Finished", "NotInStock"]:
        count = db.query(InventoryItem).filter(InventoryItem.status == status_val).count()
        results.append({"status": status_val, "count": count})
    return {"summary": results}


@router.get("/search")
async def search_inventory(q: str | None = "", limit: int = 50, db: Session = Depends(get_db)):
    if not q:
        items = db.query(InventoryItem).limit(limit).all()
    else:
        items = (
            db.query(InventoryItem)
            .filter(InventoryItem.item_name.ilike(f"%{q}%"))
            .limit(limit)
            .all()
        )
    return {"query": q, "items": items}


@router.post("/")
async def call_ai_insights():
    return {"message": "AI insights endpoint — connect Anthropic SDK or MCP server here"}