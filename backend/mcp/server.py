from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import json
from ..database import get_db
from ..models.inventory import InventoryItem
from ..models.category import Category
from ..models.meal_prep import MealPrep, MealPrepEntry
from ..models.tag import Tag

# Create the MCP server FastAPI app
mcp_app = FastAPI(title="KitchenCounter MCP Server")

# Add CORS middleware for the MCP server (allow all origins for development)
mcp_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define MCP tools interface
tools = {}

def register_tool(name: str, func):
    """Register a tool with the MCP server"""
    tools[name] = func

@mcp_app.get("/mcp/tools")
async def get_tools():
    """List available MCP tools"""
    return {"tools": list(tools.keys())}

@mcp_app.post("/mcp/tool/{tool_name}")
async def execute_tool(tool_name: str, params: Dict[str, Any]):
    """Execute a specific MCP tool"""
    if tool_name not in tools:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    return await tools[tool_name](params)

# Tool implementations
async def get_inventory_summary(params: Dict[str, Any]):
    """Get summary of inventory items by status and category"""
    db = get_db()
    
    # Get counts by status
    from ..models.inventory import InventoryItem
    from sqlalchemy import func
    
    status_counts = db.query(
        InventoryItem.status,
        func.count(InventoryItem.id).label('count')
    ).group_by(InventoryItem.status).all()
    
    # Get counts by category (with tree structure)
    category_counts = db.query(
        Category.name,
        func.count(InventoryItem.id).label('count')
    ).join(InventoryItem, InventoryItem.category_id == Category.id)\
    .group_by(Category.name).all()
    
    summary = {
        "total_items": db.query(InventoryItem).count(),
        "by_status": {status[0]: status[1] for status in status_counts},
        "by_category": {category[0]: category[1] for category in category_counts}
    }
    
    return {"summary": summary}

async def get_expiring_soon(params: Dict[str, Any]):
    """Get items expiring within a certain number of days"""
    db = get_db()
    from ..models.inventory import InventoryItem
    from datetime import date, timedelta
    
    days = params.get("days", 7)
    
    # Get today's date
    today = date.today()
    end_date = today + timedelta(days=days)
    
    expiring_items = db.query(InventoryItem)\
        .filter(InventoryItem.expiration_date >= today)\
        .filter(InventoryItem.expiration_date <= end_date)\
        .filter(InventoryItem.status != "Finished")\
        .all()
    
    items_list = []
    for item in expiring_items:
        days_until_expiry = (item.expiration_date - date.today()).days
        items_list.append({
            "id": str(item.id),
            "name": item.item_name,
            "expires_in_days": days_until_expiry,
            "category": get_category_name(db, item.category_id),
            "expiration_date": item.expiration_date.isoformat() if item.expiration_date else None
        })
    
    return {"expiring_items": items_list}

async def get_low_stock_items(params: Dict[str, Any]):
    """Get items with high usage percentage (low stock)"""
    db = get_db()
    from ..models.inventory import InventoryItem
    
    # Items with usage_percentage > 70
    low_stock_items = db.query(InventoryItem)\
        .filter(InventoryItem.usage_percentage != None)\
        .filter(InventoryItem.usage_percentage >= 70)\
        .filter(InventoryItem.status != "Finished")\
        .all()
    
    items_list = []
    for item in low_stock_items:
        items_list.append({
            "id": str(item.id),
            "name": item.item_name,
            "usage_percentage": item.usage_percentage,
            "category": get_category_name(db, item.category_id)
        })
    
    return {"low_stock_items": items_list}

async def get_meal_prep_history(params: Dict[str, Any]):
    """Get meal prep data for a date range"""
    db = get_db()
    from ..models.meal_prep import MealPrep, MealPrepEntry
    
    # Get date range parameters
    start_date = params.get("start_date") 
    end_date = params.get("end_date")
    
    # If no date range specified, return recent prep items
    query = db.query(MealPrep)\
        .order_by(MealPrep.year.desc(), MealPrep.month.desc())
    
    meal_preps = query.limit(10).all()
    
    return {
        "meal_preps": [
            {
                "id": str(mp.id),
                "year": mp.year,
                "month": mp.month,
                "day": mp.day,
                "created_at": mp.created_at.isoformat() if mp.created_at else None
            }
            for mp in meal_preps
        ]
    }

async def get_nutritional_summary(params: Dict[str, Any]):
    """Get aggregate nutritional information for a period"""
    db = get_db()
    from ..models.inventory import InventoryItem
    
    # Aggregate macros across all items
    total_carbohydrate = db.query(func.sum(InventoryItem.carbohydrate)).scalar() or 0
    total_fiber = db.query(func.sum(InventoryItem.fiber)).scalar() or 0
    total_sugar = db.query(func.sum(InventoryItem.sugar)).scalar() or 0
    total_fat = db.query(func.sum(InventoryItem.fat)).scalar() or 0
    total_protein = db.query(func.sum(InventoryItem.protein)).scalar() or 0
    
    summary = {
        "total_carbohydrate": float(total_carbohydrate),
        "total_fiber": float(total_fiber),
        "total_sugar": float(total_sugar),
        "total_fat": float(total_fat),
        "total_protein": float(total_protein),
        "item_count": db.query(InventoryItem).count()
    }
    
    return {"nutritional_summary": summary}

async def search_inventory(params: Dict[str, Any]):
    """Full-text search across inventory items"""
    db = get_db()
    from ..models.inventory import InventoryItem
    
    query = params.get("query", "")
    
    if not query:
        return {"search_results": []}
    
    # Search in item_name and description
    search_results = db.query(InventoryItem)\
        .filter(
            (InventoryItem.item_name.ilike(f"%{query}%")) |
            (InventoryItem.description.ilike(f"%{query}%"))
        )\
        .limit(50)\
        .all()
    
    results_list = []
    for item in search_results:
        results_list.append({
            "id": str(item.id),
            "name": item.item_name,
            "category": get_category_name(db, item.category_id),
            "status": item.status,
            "usage_percentage": item.usage_percentage
        })
    
    return {"search_results": results_list}

def get_category_name(db, category_id):
    """Helper function to get category name by ID"""
    if not category_id:
        return "Uncategorized"
    
    category = db.query(Category).filter(Category.id == category_id).first()
    return category.name if category else "Unknown Category"

# Register all tools
register_tool("get_inventory_summary", get_inventory_summary)
register_tool("get_expiring_soon", get_expiring_soon)
register_tool("get_low_stock_items", get_low_stock_items)
register_tool("get_meal_prep_history", get_meal_prep_history)
register_tool("get_nutritional_summary", get_nutritional_summary)
register_tool("search_inventory", search_inventory)