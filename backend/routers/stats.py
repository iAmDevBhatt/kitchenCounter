from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.meal_prep import MealPrep, MealPrepEntry, MealPrepItem
from ..models.inventory import InventoryItem
from ..models.inventory_tag import InventoryItemTag
from ..models.tag import Tag
from ..models.category import Category
from collections import defaultdict
from datetime import date

router = APIRouter()


@router.get("/dietary/{year}/{month}")
def dietary_stats(year: int, month: int, db: Session = Depends(get_db)):
    """
    For a given year+month return:
    - tag_distribution: [{name, tag_type, count}] — how many meal-prep appearances per tag
    - nutrition_totals: {carbohydrate, fiber, sugar, fat, protein} — sum over all items used
    - meal_time_breakdown: [{meal_time, item_count}]
    - status_breakdown: [{status, count}] — how many entries were Done/Planned/Skipped
    - items_used: [{id, name, usage_count}] — most-used inventory items this month
    """
    # 1. Get all meal_prep day rows for the month
    preps = db.query(MealPrep).filter(
        MealPrep.year == year, MealPrep.month == month
    ).all()
    if not preps:
        return {
            "tag_distribution": [],
            "nutrition_totals": {"carbohydrate": 0, "fiber": 0, "sugar": 0, "fat": 0, "protein": 0},
            "meal_time_breakdown": [],
            "status_breakdown": [],
            "items_used": [],
            "has_data": False,
        }

    prep_ids = [p.id for p in preps]

    # 2. Get all entries for those preps
    entries = db.query(MealPrepEntry).filter(
        MealPrepEntry.meal_prep_id.in_(prep_ids)
    ).all()
    entry_ids = [e.id for e in entries]

    # 3. Status breakdown
    status_counts = defaultdict(int)
    meal_time_counts = defaultdict(int)
    for e in entries:
        if e.status:
            status_counts[e.status] += 1
        if e.meal_time:
            meal_time_counts[e.meal_time] += 1

    if not entry_ids:
        return {
            "tag_distribution": [],
            "nutrition_totals": {"carbohydrate": 0, "fiber": 0, "sugar": 0, "fat": 0, "protein": 0},
            "meal_time_breakdown": [{"meal_time": k, "count": v} for k, v in meal_time_counts.items()],
            "status_breakdown": [{"status": k, "count": v} for k, v in status_counts.items()],
            "items_used": [],
            "has_data": True,
        }

    # 4. Get all meal prep items (entry → inventory item links)
    mp_items = db.query(MealPrepItem).filter(
        MealPrepItem.meal_prep_entry_id.in_(entry_ids)
    ).all()
    inv_ids = [m.inventory_item_id for m in mp_items]

    if not inv_ids:
        return {
            "tag_distribution": [],
            "nutrition_totals": {"carbohydrate": 0, "fiber": 0, "sugar": 0, "fat": 0, "protein": 0},
            "meal_time_breakdown": [{"meal_time": k, "count": v} for k, v in meal_time_counts.items()],
            "status_breakdown": [{"status": k, "count": v} for k, v in status_counts.items()],
            "items_used": [],
            "has_data": True,
        }

    # 5. Get inventory items and compute nutrition totals
    inv_items = db.query(InventoryItem).filter(InventoryItem.id.in_(inv_ids)).all()
    inv_map = {i.id: i for i in inv_items}

    # Item usage count
    item_usage = defaultdict(int)
    for m in mp_items:
        item_usage[m.inventory_item_id] += 1

    items_used = sorted(
        [{"id": k, "name": inv_map[k].item_name, "count": v}
         for k, v in item_usage.items() if k in inv_map],
        key=lambda x: x["count"], reverse=True
    )[:10]

    def _f(v): return float(v) if v is not None else 0.0

    nutrition_totals = {"carbohydrate": 0.0, "fiber": 0.0, "sugar": 0.0, "fat": 0.0, "protein": 0.0}
    for item_id, count in item_usage.items():
        item = inv_map.get(item_id)
        if not item: continue
        nutrition_totals["carbohydrate"] += _f(item.carbohydrate) * count
        nutrition_totals["fiber"]        += _f(item.fiber)        * count
        nutrition_totals["sugar"]        += _f(item.sugar)        * count
        nutrition_totals["fat"]          += _f(item.fat)          * count
        nutrition_totals["protein"]      += _f(item.protein)      * count

    nutrition_totals = {k: round(v, 1) for k, v in nutrition_totals.items()}

    # 6. Tag distribution — count appearances per tag across all used items
    tag_rows = db.query(InventoryItemTag).filter(
        InventoryItemTag.item_id.in_(list(inv_ids))
    ).all()
    tag_ids = list({r.tag_id for r in tag_rows})
    tags = db.query(Tag).filter(Tag.id.in_(tag_ids)).all()
    tag_map = {t.id: t for t in tags}

    # item_id → [tag_ids]
    item_tags = defaultdict(list)
    for row in tag_rows:
        item_tags[row.item_id].append(row.tag_id)

    tag_count = defaultdict(int)
    for item_id, count in item_usage.items():
        for tid in item_tags.get(item_id, []):
            tag_count[tid] += count

    tag_distribution = sorted(
        [{"id": tid, "name": tag_map[tid].name, "tag_type": tag_map[tid].tag_type, "count": cnt}
         for tid, cnt in tag_count.items() if tid in tag_map],
        key=lambda x: x["count"], reverse=True
    )

    return {
        "tag_distribution": tag_distribution,
        "nutrition_totals": nutrition_totals,
        "meal_time_breakdown": [{"meal_time": k, "count": v} for k, v in meal_time_counts.items()],
        "status_breakdown": [{"status": k, "count": v} for k, v in status_counts.items()],
        "items_used": items_used,
        "has_data": True,
    }


@router.get("/inventory-overview")
def inventory_overview(db: Session = Depends(get_db)):
    """Snapshot stats: status breakdown, expiry overview, top categories by item count."""
    from ..models.category import Category
    from datetime import date, timedelta

    items = db.query(InventoryItem).all()
    today = date.today()

    status_counts = defaultdict(int)
    expiry_buckets = {"expired": 0, "within_3d": 0, "within_7d": 0, "ok": 0, "none": 0}
    cat_counts = defaultdict(int)

    for item in items:
        status_counts[item.status or "Unknown"] += 1
        cat_counts[item.category_id] += 1
        if item.expiration_date:
            days = (item.expiration_date - today).days
            if days < 0:
                expiry_buckets["expired"] += 1
            elif days <= 3:
                expiry_buckets["within_3d"] += 1
            elif days <= 7:
                expiry_buckets["within_7d"] += 1
            else:
                expiry_buckets["ok"] += 1
        else:
            expiry_buckets["none"] += 1

    # Resolve category names
    cat_ids = list(cat_counts.keys())
    cats = db.query(Category).filter(Category.id.in_(cat_ids)).all()
    cat_name_map = {c.id: c.name for c in cats}

    top_categories = sorted(
        [{"name": cat_name_map.get(k, "Unknown"), "count": v} for k, v in cat_counts.items()],
        key=lambda x: x["count"], reverse=True
    )[:8]

    return {
        "total": len(items),
        "status_breakdown": [{"status": k, "count": v} for k, v in status_counts.items()],
        "expiry_breakdown": [{"bucket": k, "count": v} for k, v in expiry_buckets.items()],
        "top_categories": top_categories,
    }


@router.get("/usage-trend")
def usage_trend(db: Session = Depends(get_db)):
    """
    Rolling 6-month usage trend — designed for AI/MCP tool calling (no parameters needed).

    Returns:
      months:          [{label, year, month}]           — ordered oldest → newest
      top_items:       [{id, name, monthly_counts}]     — top 10 items by total appearances;
                       monthly_counts is a list aligned to `months`
      category_totals: [{category_id, name, count}]     — total appearances per category
                       across all 6 months, sorted desc — for pie chart
      monthly_totals:  [{label, total_items}]            — total item appearances per month
    """
    today = date.today()

    # Build the 6 month windows: oldest first
    windows = []
    y, m = today.year, today.month
    for _ in range(6):
        windows.insert(0, (y, m))
        m -= 1
        if m == 0:
            m = 12
            y -= 1

    month_labels = [f"{date(y, m, 1).strftime('%b')} {y}" for y, m in windows]

    # Pre-load all category names once
    cat_name_map = {c.id: c.name for c in db.query(Category).all()}

    # Aggregate per month
    all_item_usage: dict[str, list[int]] = defaultdict(lambda: [0] * 6)
    item_name_map: dict[str, str] = {}
    item_cat_map: dict[str, str] = {}
    monthly_totals: list[int] = []

    for idx, (yr, mo) in enumerate(windows):
        preps = db.query(MealPrep).filter(
            MealPrep.year == yr, MealPrep.month == mo
        ).all()
        if not preps:
            monthly_totals.append(0)
            continue

        entries = db.query(MealPrepEntry).filter(
            MealPrepEntry.meal_prep_id.in_([p.id for p in preps])
        ).all()
        if not entries:
            monthly_totals.append(0)
            continue

        mp_items = db.query(MealPrepItem).filter(
            MealPrepItem.meal_prep_entry_id.in_([e.id for e in entries])
        ).all()
        if not mp_items:
            monthly_totals.append(0)
            continue

        inv_ids = list({m.inventory_item_id for m in mp_items})
        inv_items = db.query(InventoryItem).filter(InventoryItem.id.in_(inv_ids)).all()
        for it in inv_items:
            item_name_map[it.id] = it.item_name
            item_cat_map[it.id] = it.category_id

        month_count = defaultdict(int)
        for mp in mp_items:
            month_count[mp.inventory_item_id] += 1

        total = 0
        for item_id, cnt in month_count.items():
            all_item_usage[item_id][idx] += cnt
            total += cnt
        monthly_totals.append(total)

    # Top 10 items by total usage across 6 months
    item_totals = {iid: sum(counts) for iid, counts in all_item_usage.items()}
    top_ids = sorted(item_totals, key=lambda x: item_totals[x], reverse=True)[:10]

    top_items = [
        {
            "id": iid,
            "name": item_name_map.get(iid, iid),
            "monthly_counts": all_item_usage[iid],
            "total": item_totals[iid],
        }
        for iid in top_ids
    ]

    # Category totals across all 6 months
    cat_totals: dict[str, int] = defaultdict(int)
    for iid, total in item_totals.items():
        cat_id = item_cat_map.get(iid)
        if cat_id:
            cat_totals[cat_id] += total

    category_totals = sorted(
        [
            {"category_id": cid, "name": cat_name_map.get(cid, "Unknown"), "count": cnt}
            for cid, cnt in cat_totals.items()
        ],
        key=lambda x: x["count"],
        reverse=True,
    )

    return {
        "months": [{"label": lbl, "year": y, "month": m} for lbl, (y, m) in zip(month_labels, windows)],
        "top_items": top_items,
        "category_totals": category_totals,
        "monthly_totals": [
            {"label": month_labels[i], "total_items": monthly_totals[i]}
            for i in range(6)
        ],
    }
