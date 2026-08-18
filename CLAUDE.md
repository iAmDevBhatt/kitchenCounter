# KitchenCounter - AI Developer Reference

This document provides comprehensive technical documentation for developers working on the KitchenCounter application.

## Architecture Overview

KitchenCounter is a Progressive Web App (PWA) with:
- **Backend**: FastAPI Python application with PostgreSQL database
- **Frontend**: React application with Vite build tool
- **AI Integration**: MCP server (primary) and Claude API fallback  
- **Database**: PostgreSQL 15+ with SQLAlchemy ORM

## Project Structure

```
KitchenCounter/
├── backend/                    # Python FastAPI application
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # App settings (pydantic-settings)
│   ├── database.py             # Async SQLAlchemy engine + session
│   ├── models/                 # Database models 
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   └── tag.py
│   ├── schemas/                # Pydantic validation models
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   └── tag.py
│   ├── routers/                # API routes
│   │   ├── auth.py
│   │   ├── categories.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   ├── tags.py
│   │   ├── theme.py
│   │   └── ai_insights.py
│   ├── mcp/                    # MCP server implementation
│   │   ├── server.py
│   │   └── tools.py
│   ├── ai/                     # AI integration (Anthropic Claude)
│   │   └── claude_client.py
│   ├── migrations/             # Alembic migration files
│   ├── static/                 # Static files and uploads
│   │   └── uploads/
│   └── requirements.txt        # Python dependencies
├── frontend/                   # React frontend
│   ├── public/                 # Public assets (manifest.json, icons)
│   │   ├── manifest.json
│   │   └── icons/
│   ├── src/
│   │   ├── main.jsx            # App entry point
│   │   ├── App.jsx             # Main App component
│   │   ├── assets/             # UI labels, images, etc.
│   │   │   ├── labels.properties  # All UI label strings
│   │   │   └── icons/
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useLabels.js    # Parses labels.properties at runtime
│   │   │   └── useTheme.js     # Dynamic theme from wallpaper image
│   │   ├── components/         # Reusable UI Components
│   │   │   ├── Layout/
│   │   │   ├── CategoryTree/
│   │   │   ├── InventoryTable/
│   │   │   ├── MealPrepGrid/
│   │   │   ├── DragDropItems/
│   │   │   └── AIInsightsPanel/
│   │   ├── pages/              # Page components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── KitchenSlabPage.jsx
│   │   │   ├── ConfigurationPage.jsx
│   │   │   └── ThemePage.jsx
│   │   ├── api/                # Axios API clients per resource
│   │   └── store/              # Zustand global state
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml          # Docker deployment configuration
├── Dockerfile.backend          # Backend Dockerfile
├── Dockerfile.frontend         # Frontend Dockerfile
├── start.sh                    # Start script (Linux/Mac)
├── start.ps1                   # Start script (Windows PowerShell)
├── init.sh                     # Init script (cross-platform)
├── KITCHEN_APP_BUILD.md        # Complete build specification (AI reference)
└── CLAUDE.md                   # AI developer reference
```

## Database Schema

### users
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| username | VARCHAR(100) UNIQUE | |
| email | VARCHAR(255) UNIQUE | |
| hashed_password | TEXT | bcrypt |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | |

### categories
Self-referencing tree. `KitchenCategories` is the immutable root (seeded on init).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(200) | |
| parent_id | UUID FK → categories.id | NULL = root |
| image_path | TEXT | nullable |
| created_by | UUID FK → users.id | |
| created_at | TIMESTAMP | |

**Rules:**
- Root node: `name = "KitchenCategories"`, `parent_id = NULL`
- Depth is unlimited (tree traversal via recursive CTE)
- Frontend resolves depth as: Root → Category → SubCategory → ChildCategory → GrandChildCategory

### tags
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(100) UNIQUE | |
| tag_type | VARCHAR(50) | e.g. `"vitamin"`, `"general"` |
| created_by | UUID FK | |

### inventory_items
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| category_id | UUID FK → categories.id | any level |
| item_name | VARCHAR(200) | |
| item_image_path | TEXT | |
| bought_date | DATE | |
| expiration_date | DATE | |
| net_weight | DECIMAL(10,2) | |
| quantity | INTEGER | |
| status | ENUM | `InUse`, `Stocked`, `Finished`, `NotInStock` |
| usage_percentage | INTEGER | 0–100; triggers status update (see rules) |
| amount | DECIMAL(10,2) | |
| carbohydrate | DECIMAL(10,2) | |
| fiber | DECIMAL(10,2) | |
| sugar | DECIMAL(10,2) | |
| fat | DECIMAL(10,2) | |
| protein | DECIMAL(10,2) | |
| description | TEXT | |
| notes | TEXT | |
| created_by | UUID FK | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Status auto-update rules (enforced in backend):**
- `usage_percentage = 100` → status = `Finished`
- `usage_percentage 1–99` → status = `InUse`
- `usage_percentage = 0` → no change

### inventory_item_tags
| Column | Type |
|---|---|
| item_id | UUID FK |
| tag_id | UUID FK |

### meal_preps
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| year | INTEGER | |
| month | INTEGER | 1–12 |
| day | INTEGER | 1–31 |
| created_by | UUID FK | |
| created_at | TIMESTAMP | |

**Constraint:** (year, month, day, created_by) unique per user.
Data for a month is NOT created until the user explicitly creates it.

### meal_prep_entries
One row per meal_prep × meal_time combination.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| meal_prep_id | UUID FK → meal_preps.id | |
| meal_time | ENUM | `Breakfast`, `Lunch`, `Dinner` |
| video_url | TEXT | YouTube / Facebook / Instagram |
| notes | TEXT | |
| status | ENUM | `Planned`, `Done`, `Skipped` |

### meal_prep_items
Links inventory items to a meal prep entry.

| Column | Type |
|---|---|
| id | UUID PK |
| meal_prep_entry_id | UUID FK |
| inventory_item_id | UUID FK |

### theme_settings
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| wallpaper_path | TEXT | |
| extracted_palette | JSONB | colorthief output |
| active | BOOLEAN | one active per user |

## API Route Table

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/login` | User login |
| `POST` | `/auth/register` | Create new user |
| `GET` | `/categories/` | List categories |
| `POST` | `/categories/` | Create category |
| `PUT` | `/categories/{id}` | Update category |
| `DELETE` | `/categories/{id}` | Delete category |
| `GET` | `/inventory/` | List inventory items |
| `POST` | `/inventory/` | Create inventory item |
| `PUT` | `/inventory/{id}` | Update inventory item |
| `DELETE` | `/inventory/{id}` | Delete inventory item |
| `GET` | `/meal-prep/month/{year}/{month}` | Get meal prep for month |
| `POST` | `/meal-prep/month/{year}/{month}` | Create meal prep for month |
| `PUT` | `/meal-prep/entry/{id}` | Update meal prep entry |
| `DELETE` | `/meal-prep/entry/{id}` | Delete meal prep entry |
| `GET` | `/tags/` | List tags |
| `POST` | `/tags/` | Create tag |
| `PUT` | `/tags/{id}` | Update tag |
| `DELETE` | `/tags/{id}` | Delete tag |
| `GET` | `/theme/user/{user_id}` | Get user's theme settings |
| `POST` | `/theme/user/{user_id}` | Set user theme settings |
| `POST` | `/ai-insights/` | Call AI insights via Claude fallback |

## Key Business Rules

1. `usage_percentage = 100` → auto-set `status = Finished`
2. `usage_percentage 1–99` → auto-set `status = InUse`
3. `usage_percentage = 0` → leave status unchanged
4. Category root `KitchenCategories` cannot be deleted or renamed
5. Meal prep month data is never auto-created — only on explicit user action
6. Each user has independent theme settings
7. Tags of type `vitamin` appear in the inventory vitamin multi-select field
8. Deleting a category must warn if inventory items are linked to it
9. Before marking a meal prep entry as Done, prompt user to update usage of linked items

## How to Run Migrations

```bash
cd backend
alembic upgrade head
```

To create new migrations:
```bash
cd backend
alembic revision --autogenerate -m "Migration description"
alembic upgrade head
```

## How to Add a New Page/Route

1. Create React component under `frontend/src/pages/`
2. Register route in `App.jsx` 
3. Create FastAPI router in `backend/routers/`
4. Add corresponding database models and schemas if needed
5. Update documentation files (`README.md`, `CLAUDE.md`)

## Next Steps

For development phase 1 (Foundation):
- Complete basic database setup
- Implement authentication system
- Create initial API routes
- Setup PWA configuration

This file should be updated at the end of every development phase and whenever schema, route, or structural changes occur.