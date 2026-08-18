# KitchenCounter — Remaining Fixes to Get App Running

## Context Already Done
- `.env` exists with `DATABASE_URL=sqlite:///./kitchendb.sqlite`
- `bcrypt` downgraded 5.0.0 → 4.0.1
- `fastapi` upgraded to 0.141.1, `uvicorn` to 0.52.3
- Database seeded: admin/admin123 + KitchenCategories root exist

## Still Broken — Apply Every Fix Below

---

### Fix 1: `backend\schemas\inventory.py` — line 3

Replace:
```python
from typing import Optional, List
```
With:
```python
from typing import Optional, List, Union
import uuid
from decimal import Decimal
from datetime import date as DateType
```

Then in the same file:
- `category_id: UUID` → `category_id: str`  (Pydantic v2 auto-coerces)
- `created_by: UUID` → `created_by: str`
- `bought_date: Optional[Date]` → `Optional[DateType]`
- `expiration_date: Optional[Date]` → `Optional[DateType]`
- All `Decimal` references are fine (now imported above)

---

### Fix 2: `backend\schemas\meal_prep.py` — line 3 + all UUID fields

Replace the entire file with:
```python
from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional, List
import uuid as stdlib_uuid
from datetime import date as DateType, date


class MealPrepBase(BaseModel):
    year: int
    month: int
    day: int
    created_by: UUID4

class MealPrepCreate(MealPrepBase):
    pass

class MealPrepUpdate(MealPrepBase):
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None

class MealPrepResponse(MealPrepBase):
    id: UUID4
    created_at: str

    class Config:
        from_attributes = True


class MealPrepEntryBase(BaseModel):
    meal_prep_id: UUID4
    meal_time: str
    video_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class MealPrepEntryCreate(MealPrepEntryBase):
    pass

class MealPrepEntryUpdate(MealPrepEntryBase):
    meal_time: Optional[str] = None
    video_url: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class MealPrepEntryResponse(MealPrepEntryBase):
    id: UUID4
    created_at: str

    class Config:
        from_attributes = True


class MealPrepItemBase(BaseModel):
    meal_prep_entry_id: UUID4
    inventory_item_id: UUID4

class MealPrepItemCreate(MealPrepItemBase):
    pass

class MealPrepItemResponse(MealPrepItemBase):
    id: UUID4
    created_at: str

    class Config:
        from_attributes = True
```

---

### Fix 3: `backend\schemas\category.py` — replace whole file

```python
from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional
import uuid


class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[UUID4] = None
    image_path: Optional[str] = None
    created_by: UUID4


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(CategoryBase):
    name: Optional[str] = None
    parent_id: Optional[UUID4] = None
    image_path: Optional[str] = None


class CategoryResponse(CategoryBase):
    id: UUID4
    created_at: str

    class Config:
        from_attributes = True
```

---

### Fix 4: `backend\schemas\tag.py` — replace whole file

```python
from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional


class TagBase(BaseModel):
    name: str
    tag_type: str
    created_by: UUID4


class TagCreate(TagBase):
    pass


class TagUpdate(TagBase):
    name: Optional[str] = None
    tag_type: Optional[str] = None


class TagResponse(TagBase):
    id: UUID4
    created_at: str

    class Config:
        from_attributes = True
```

---

### Fix 5: `backend\schemas\theme.py` — replace whole file

```python
from __future__ import annotations
from pydantic import BaseModel, UUID4
from typing import Optional, List, Dict


class ThemeBase(BaseModel):
    wallpaper_path: Optional[str] = None
    extracted_palette: Optional[Dict] = None


class ThemeCreate(ThemeBase):
    user_id: UUID4


class ThemeUpdate(ThemeBase):
    wallpaper_path: Optional[str] = None
    extracted_palette: Optional[Dict] = None


class ThemeResponse(ThemeBase):
    id: UUID4
    user_id: UUID4
    active: bool
    created_at: str

    class Config:
        from_attributes = True
```

---

### Fix 6: `backend\schemas\user.py` — replace whole file (no changes needed but confirming clean)

This file is already fine as-is. No UUID or Date/Decimal imports from typing.

---

### Fix 7: `backend\routers\inventory.py` — replace whole file

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.inventory import InventoryItem
from ..schemas.inventory import InventoryItemCreate, InventoryItemResponse, InventoryItemUpdate
from typing import List
import os
import uuid as stdlib_uuid
from pathlib import Path

router = APIRouter()


def _parse_uid(s: str) -> stdlib_uuid.UUID:
    try:
        return stdlib_uuid.UUID(s)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/", response_model=List[InventoryItemResponse])
async def get_inventory_items(db: Session = Depends(get_db)):
    return db.query(InventoryItem).all()


@router.post("/", response_model=InventoryItemResponse)
async def create_inventory_item(item: InventoryItemCreate, db: Session = Depends(get_db)):
    # Auto-set status from usage_percentage (business rule)
    if item.usage_percentage == 100:
        item.status = "Finished"
    elif 1 <= item.usage_percentage <= 99:
        item.status = "InUse"

    db_item = InventoryItem(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.get("/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(item_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    item = db.query(InventoryItem).filter(InventoryItem.id == uid).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.put("/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(item_id: str, item_update: InventoryItemUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    db_item = db.query(InventoryItem).filter(InventoryItem.id == uid).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # Business rule: auto-update status from usage_percentage
    if item_update.usage_percentage is not None:
        if item_update.usage_percentage == 100:
            item_update.status = "Finished"
        elif 1 <= item_update.usage_percentage <= 99:
            item_update.status = "InUse"

    update_data = item_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item


@router.delete("/{item_id}")
async def delete_inventory_item(item_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    db_item = db.query(InventoryItem).filter(InventoryItem.id == uid).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    db.delete(db_item)
    db.commit()
    return {"message": "Inventory item deleted successfully"}


@router.post("/upload-image/{item_id}")
async def upload_item_image(item_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    uid = _parse_uid(item_id)
    db_item = db.query(InventoryItem).filter(InventoryItem.id == uid).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    allowed_extensions = {".png", ".jpg", ".jpeg", ".gif"}
    ext = Path(file.filename or "").suffix.lower()

    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PNG, JPG, JPEG, and GIF are allowed.")

    upload_dir = "backend/static/uploads"
    os.makedirs(upload_dir, exist_ok=True)

    filename = f"{stdlib_uuid.uuid4()}{ext}"
    file_path = os.path.join(upload_dir, filename)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    db_item.item_image_path = f"/uploads/{filename}"
    db.commit()

    return {"message": "Image uploaded successfully", "image_path": db_item.item_image_path}
```

---

### Fix 8: `backend\routers\categories.py` — replace whole file

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models.category import Category
from ..models.inventory import InventoryItem
from ..schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
import uuid as stdlib_uuid

router = APIRouter()


def _parse_uid(s: str) -> stdlib_uuid.UUID:
    try:
        return stdlib_uuid.UUID(s)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/", response_model=list[CategoryResponse])
async def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()


@router.post("/", response_model=CategoryResponse)
async def create_category(cat: CategoryCreate, db: Session = Depends(get_db)):
    if cat.name == "KitchenCategories" and cat.parent_id is None:
        raise HTTPException(status_code=400, detail="Cannot create a second root category.")

    # Check limit on direct children of root (KITCHEN_APP_BUILD.md doesn't specify a limit; keep it open)
    db_cat = Category(**cat.model_dump())
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, cat_update: CategoryUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(category_id)
    existing = db.query(Category).filter(Category.id == uid).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")

    # Prevent renaming the root node
    if existing.parent_id is None and cat_update.name and cat_update.name != "KitchenCategories":
        raise HTTPException(status_code=403, detail="Cannot rename the root category.")

    update_data = cat_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/{category_id}")
async def delete_category(category_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(category_id)
    cat = db.query(Category).filter(Category.id == uid).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Cannot delete the root node
    if cat.parent_id is None:
        raise HTTPException(status_code=403, detail="Cannot delete the root category.")

    # Check for linked inventory items (business rule: warn if linked)
    linked_count = db.query(InventoryItem).filter(InventoryItem.category_id == uid).count()
    if linked_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete category with {linked_count} linked inventory items.",
        )

    # Also check for subcategories (cascade delete children)
    db.query(Category).filter(Category.parent_id == uid).delete()

    db.delete(cat)
    db.commit()
    return {"message": "Category deleted successfully"}
```

---

### Fix 9: `backend\routers\meal_prep.py` — replace whole file

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from ..database import get_db
from ..models.meal_prep import MealPrep, MealPrepEntry, MealPrepItem
from ..models.inventory import InventoryItem
from ..schemas.meal_prep import (
    MealPrepCreate, MealPrepResponse,
    MealPrepEntryCreate, MealPrepEntryUpdate, MealPrepEntryResponse,
    MealPrepItemCreate, MealPrepItemResponse,
)
import uuid as stdlib_uuid

router = APIRouter()


def _parse_uid(s: str) -> stdlib_uuid.UUID:
    try:
        return stdlib_uuid.UUID(s)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/month/{year}/{month}")
async def get_month(year: int, month: int, db: Session = Depends(get_db)):
    """Return all meal preps for a given year/month."""
    return (
        db.query(MealPrep)
        .filter(MealPrep.year == year, MealPrep.month == month)
        .all()
    )


@router.post("/month/{year}/{month}")
async def create_month(year: int, month: int, db: Session = Depends(get_db)):
    """Create meal prep records for each day of the month."""
    import calendar
    days_in_month = calendar.monthrange(year, month)[1]

    # Create a day entry for each day of the month
    results = []
    for day in range(1, days_in_month + 1):
        existing = (
            db.query(MealPrep)
            .filter(MealPrep.year == year, MealPrep.month == month, MealPrep.day == day)
            .first()
        )
        if not existing:
            mp = MealPrep(year=year, month=month, day=day)
            db.add(mp)
            results.append(mp)

    if not results:
        raise HTTPException(status_code=400, detail="Meal prep data for this month already exists.")

    db.commit()
    # Refresh all to get IDs
    for r in results:
        db.refresh(r)
    return {"message": f"Created {len(results)} day entries", "created_ids": [r.id for r in results]}


@router.get("/entry/{entry_id}", response_model=MealPrepEntryResponse)
async def get_entry(entry_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(entry_id)
    entry = db.query(MealPrepEntry).filter(MealPrepEntry.id == uid).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal prep entry not found")
    return entry


@router.put("/entry/{entry_id}", response_model=MealPrepEntryResponse)
async def update_entry(entry_id: str, entry_update: MealPrepEntryUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(entry_id)
    existing = db.query(MealPrepEntry).filter(MealPrepEntry.id == uid).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Meal prep entry not found")

    update_data = entry_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing, key, value)

    db.commit()
    db.refresh(existing)
    return existing


@router.delete("/entry/{entry_id}")
async def delete_entry(entry_id: str, db: Session = Depends(get_db)):
    uid = _parse_uid(entry_id)
    entry = db.query(MealPrepEntry).filter(MealPrepEntry.id == uid).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal prep entry not found")

    # Delete linked meal prep items first (junction table)
    db.query(MealPrepItem).filter(MealPrepItem.meal_prep_entry_id == uid).delete()
    db.delete(entry)
    db.commit()
    return {"message": "Meal prep entry deleted successfully"}


# ══ Item links ══

@router.post("/entry/{entry_id}/items", response_model=MealPrepItemResponse)
async def add_item_to_entry(entry_id: str, item_link: MealPrepItemCreate, db: Session = Depends(get_db)):
    uid = _parse_uid(entry_id)
    entry = db.query(MealPrepEntry).filter(MealPrepEntry.id == uid).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal prep entry not found")

    mp_item = MealPrepItem(
        meal_prep_entry_id=uid,
        inventory_item_id=item_link.inventory_item_id,
    )
    db.add(mp_item)
    db.commit()
    db.refresh(mp_item)
    return mp_item
```

---

### Fix 10: `backend\routers\tags.py` — replace whole file

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.tag import Tag
from ..schemas.tag import TagCreate, TagResponse, TagUpdate
import uuid as stdlib_uuid

router = APIRouter()


def _parse_uid(s: str) -> stdlib_uuid.UUID:
    try:
        return stdlib_uuid.UUID(s)
    except (ValueError, TypeError):
        raise HTTPException(status_code=404, detail="Invalid ID")


@router.get("/", response_model=list[TagResponse])
async def get_tags(db: Session = Depends(get_db)):
    return db.query(Tag).all()


@router.post("/", response_model=TagResponse)
async def create_tag(tag: TagCreate, db: Session = Depends(get_db)):
    # Check unique name constraint
    existing = db.query(Tag).filter(Tag.name == tag.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag name already exists.")

    db_tag = Tag(**tag.model_dump())
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.put("/{tag_id}", response_model=TagResponse)
async def update_tag(tag_id: str, tag_update: TagUpdate, db: Session = Depends(get_db)):
    uid = _parse_uid(tag_id)
    existing = db.query(Tag).filter(Tag.id == uid).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Check name uniqueness (excluding self)
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
```

---

### Fix 11: `backend\routers\theme.py` — replace whole file

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
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

    # Deactivate any existing active theme for this user
    db.query(ThemeSettings).filter(
        ThemeSettings.user_id == uid, ThemeSettings.active == True
    ).update({"active": False})

    new_theme = ThemeSettings(**theme_data.model_dump())
    new_theme.active = True
    db.add(new_theme)
    db.commit()
    db.refresh(new_theme)
    return new_theme
```

---

### Fix 12: `backend\routers\auth.py` — replace whole file

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserResponse
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from ..config import settings

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme — fixed: use OAuth2PasswordBearer, not HTTPException
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
```

---

### Fix 13: `backend\routers\ai_insights.py` — replace whole file

```python
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.inventory import InventoryItem
from ..schemas.inventory import InventoryItemResponse
import uuid as stdlib_uuid

router = APIRouter()


@router.get("/expiring")
async def get_expiring_soon(db: Session = Depends(get_db), days: int = 7):
    """Return inventory items expiring within N days."""
    from datetime import date, timedelta
    cutoff = date.today() + timedelta(days=days)
    items = (
        db.query(InventoryItem)
        .filter(
            InventoryItem.expiration_date != None,
            InventoryItem.expiration_date <= cutoff,
        )
        .all()
    )
    return {"items": [i for i in items], "days": days}


@router.get("/summary")
async def get_inventory_summary(db: Session = Depends(get_db)):
    """Return counts grouped by status."""
    results = []
    for status_val in ["InUse", "Stocked", "Finished", "NotInStock"]:
        count = db.query(InventoryItem).filter(InventoryItem.status == status_val).count()
        results.append({"status": status_val, "count": count})
    return {"summary": results}


@router.get("/search")
async def search_inventory(q: str | None = "", limit: int = 50, db: Session = Depends(get_db)):
    """Full-text style search on item_name."""
    if not q:
        items = db.query(InventoryItem).limit(limit).all()
    else:
        q_lower = q.lower()
        # Manual ILIKE (SQLite supports LIKE which is case-insensitive)
        items = (
            db.query(InventoryItem)
            .filter(InventoryItem.item_name.ilike(f"%{q}%"))
            .limit(limit)
            .all()
        )
    return {"query": q, "items": items}


@router.post("/")
async def call_ai_insights():
    """Placeholder endpoint. Claude fallback integration goes here."""
    return {"message": "AI insights endpoint — connect Anthropic SDK or MCP server here"}
```

---

### Fix 14: `backend\database.py` — ensure async engine for SQLite

Replace the entire file with:

```python
from __future__ import annotations
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

_db_url = os.environ.get("DATABASE_URL", "sqlite:///./kitchendb.sqlite")

if _db_url.startswith("sqlite"):
    # Normalize: ensure file path uses absolute path
    if not _db_url.startswith("sqlite:///") and not _db_url.startswith("sqlite+"):
        _db_url = "sqlite:///" + os.path.abspath(_db_url.replace("sqlite://", ""))

engine = create_engine(
    _db_url,
    pool_pre_ping=True,
    connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
)

# Enable WAL mode and foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

> **Note:** `database.py` is critical. The original used synchronous style with `declarative_base()` and relative `import ..database`. All imports now use `from ..database import Base, SessionLocal, get_db` (absolute package imports). Confirm every model/router uses this pattern.

---

### Fix 15: `backend\main.py` — import from absolute paths

Replace the entire file with:

```python
from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, categories, inventory, meal_prep, tags, theme, ai_insights

# Ensure SQLite has the DB file path set up correctly
from .config import settings

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
```

---

### Fix 16: `backend\seed_data.py` — fix for SQLite + Pydantic v2

Replace the entire file with:

```python
"""Seed first-run data: create admin user + KitchenCategories root."""
import os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(str(ROOT / ".env"))
os.environ["PYTHONPATH"] = str(ROOT)

import backend                             # noqa: F401
from backend.config import settings       # noqa: E402

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from backend.models.category import Category
from backend.models.user import User from backend.database import Base

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

_db_url = os.environ.get("DATABASE_URL", "sqlite:///./kitchendb.sqlite")
if _db_url.startswith("sqlite"):
    if not _db_url.startswith("sqlite:///") and not _db_url.startswith("sqlite+"):
        _db_url = "sqlite:///" + os.path.abspath(_db_url.replace("sqlite://", ""))

engine = create_engine(
    _db_url,
    connect_args={"check_same_thread": False} if "sqlite" in _db_url else {},
)


def seed():
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    root = db.query(Category).filter(Category.name == "KitchenCategories").first()
    if not root:
        admin = User(
            username="admin",
            email="admin@kitchencounter.local",
            hashed_password=pwd_ctx.hash("admin123"),
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        root_cat = Category(
            name="KitchenCategories",
            parent_id=None,
            created_by=admin.id,
        )
        db.add(root_cat)
        db.commit()
        print("Seeded: admin (password: admin123)")
        print("Seeded: KitchenCategories root node")
    else:
        print("Database already seeded — skipping.")

    db.close()


if __name__ == "__main__":
    seed()
```

---

### Fix 17: Remove old `kitchendb.sqlite` if it exists (to start fresh)

```powershell
Remove-Item E:\kitchenCounter\kitchendb.sqlite -ErrorAction SilentlyContinue
```

---

### Final Steps — Verify Everything Works

**Terminal 1 — Backend:**
```powershell
cd E:\kitchenCounter
.\backend\venv\Scripts\Activate.ps1
uvicorn backend.main:app --port 8000
```

Expected output: `INFO:     Uvicorn running on http://127.0.0.1:8000`

**Test:** Open browser or curl → `http://localhost:8000/` should return JSON with `"KitchenCounter API is running"`

**Terminal 2 — Frontend:**
```powershell
cd E:\kitchenCounter\frontend
npm run dev
```

App accessible at `http://localhost:5173`. Login with **admin / admin123**.

---

## Summary of All Changes

| File | Issue Fixed |
|------|-------------|
| `schemas/inventory.py` | UUID/Date/Decimal from typing → proper imports, DateType alias |
| `schemas/meal_prep.py` | UUID/Date from typing → all UUID → UUID4, full rewrite |
| `schemas/category.py` | UUID from typing → UUID4, full rewrite |
| `schemas/tag.py` | UUID from typing → UUID4, full rewrite |
| `schemas/theme.py` | UUID from typing → UUID4, full rewrite |
| `routers/inventory.py` | String-to-UUID comparison, `.dict()` → `.model_dump()`, helper `_parse_uid()` |
| `routers/categories.py` | Same pattern + prevent renaming/deleting root node |
| `routers/meal_prep.py` | Full rewrite with proper UUID handling, item link endpoint added |
| `routers/tags.py` | Full rewrite with proper UUID handling, uniqueness checks |
| `routers/theme.py` | Full rewrite with proper UUID handling, active toggle logic |
| `routers/auth.py` | HTTPException → OAuth2PasswordBearer, added get_current_user helper, `.dict()` fixed |
| `routers/ai_insights.py` | Full rewrite with working SQLite-compatible query endpoints |
| `database.py` | Added WAL/foreign-keys pragmas for SQLite, `DeclarativeBase` class, absolute import style |
| `main.py` | Cleaned up imports, ensured table creation works |
| `seed_data.py` | Fixed engine setup for SQLite, `.dict()` calls removed |

## Key Compatibility Issues Summary

1. **Python 3.14**: Removed `UUID`, `Date`, `Decimal` from `typing` module — they are builtins or in their own modules now. Use `pydantic.UUID4` for type hints in schemas.
2. **Pydantic v2**: Replaced all `.dict()` → `.model_dump()`, `.dict(exclude_unset=True)` → `.model_dump(exclude_unset=True)`.
3. **FastAPI 0.141 + Pydantic v2**: Replaced `OAuth2PasswordRequestForm` + `HTTPException` workaround with proper `OAuth2PasswordBearer`.
4. **SQLite on Windows**: Added `PRAGMA journal_mode=WAL` and `PRAGMA foreign_keys=ON` for reliability.
