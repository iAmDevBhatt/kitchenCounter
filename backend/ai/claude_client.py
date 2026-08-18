from __future__ import annotations
import anthropic
from typing import Dict, Any, List
from ..database import get_db
from ..models.inventory import InventoryItem
from ..models.category import Category
from ..models.meal_prep import MealPrep, MealPrepEntry
from sqlalchemy import func

class ClaudeClient:
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        
    async def _get_inventory_summary(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get summary of inventory items by status and category"""
        db = get_db()
        
        # Get counts by status
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
    
    async def _get_expiring_soon(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get items expiring within a certain number of days"""
        db = get_db()
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
                "category": self._get_category_name(db, item.category_id),
                "expiration_date": item.expiration_date.isoformat() if item.expiration_date else None
            })
        
        return {"expiring_items": items_list}
    
    async def _get_low_stock_items(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get items with high usage percentage (low stock)"""
        db = get_db()
        
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
                "category": self._get_category_name(db, item.category_id)
            })
        
        return {"low_stock_items": items_list}
    
    async def _get_meal_prep_history(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get meal prep data for a date range"""
        db = get_db()
        
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
    
    async def _get_nutritional_summary(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get aggregate nutritional information for a period"""
        db = get_db()
        
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
    
    async def _search_inventory(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Full-text search across inventory items"""
        db = get_db()
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
                "category": self._get_category_name(db, item.category_id),
                "status": item.status,
                "usage_percentage": item.usage_percentage
            })
        
        return {"search_results": results_list}
    
    def _get_category_name(self, db, category_id):
        """Helper function to get category name by ID"""
        if not category_id:
            return "Uncategorized"
        
        category = db.query(Category).filter(Category.id == category_id).first()
        return category.name if category else "Unknown Category"
    
    async def call_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Call a specific AI tool"""
        tool_functions = {
            "get_inventory_summary": self._get_inventory_summary,
            "get_expiring_soon": self._get_expiring_soon,
            "get_low_stock_items": self._get_low_stock_items,
            "get_meal_prep_history": self._get_meal_prep_history,
            "get_nutritional_summary": self._get_nutritional_summary,
            "search_inventory": self._search_inventory
        }
        
        if tool_name not in tool_functions:
            raise ValueError(f"Unknown tool: {tool_name}")
            
        return await tool_functions[tool_name](params)

# Initialize the Claude client (would be configured via settings)
claude_client = None

def get_claude_client():
    """Get or create the Claude client instance"""
    global claude_client
    if claude_client is None:
        # In a real implementation, this would read from config
        import os
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if api_key:
            claude_client = ClaudeClient(api_key)
    return claude_client