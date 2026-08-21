# KitchenCounter — AI Build Prompt

> **Instructions for the AI reading this file:**
> This is a complete specification document for building the KitchenCounter web app.
> Read every section before writing a single line of code.
> After every development phase (or mid-phase when significant changes are made), update this file to reflect actual implementation decisions, file paths, schema changes, and deviations from the spec.

---

## Implementation Status (last updated 2026-08-19)

### ✅ Completed
- All database models (SQLAlchemy `UUID(as_uuid=False)`), schemas (`str` UUIDs), and CRUD routers
- JWT authentication (`/auth/login`, `/auth/register`)
- User management API (`GET /auth/users`, `PATCH /auth/users/{id}/toggle-active`, `DELETE /auth/users/{id}`)
- All 7 FastAPI routers wired in `main.py`; `/static` mounted for file serving
- Inventory item image upload (`POST /inventory/upload-image/{id}`) — stored in `backend/static/uploads/`
- Inventory item tags many-to-many (`GET/PUT /inventory/{id}/tags`) via `inventory_item_tags` table
- Full frontend page structure: Login, Inventory, KitchenSlab, Configuration, Theme
- InventoryTable: full CRUD, item image thumbnail + upload, tags picker (4-tab modal), stat cards, tab filters, sticky-header scrollable table
  - Tabs: **All Items** (+ Status + expiry date range filters) → **Currently in Stock** → **Running Low** → **Out of Stock**
  - **Currently in Stock** tab fixed: shows only `Stocked` or `InUse` items (previously included all non-null statuses)
  - "Out of Stock" shows both `NotInStock` and `Finished` status
  - Usage slider auto-updates status via backend rules; status change reflects immediately in the correct tab
  - **CategoryPicker** component (inline in `InventoryTable.jsx`): replaces native `<select>` with a polished floating dropdown showing full breadcrumb paths, depth dots, search, and checkmark on selected item
  - **BulkImportExport** component (`InventoryTable/BulkImportExport.jsx`): Export to `.xlsx`/`.csv` (16 fields, human-readable names); Import from `.xlsx`/`.csv` with auto-create for missing categories/tags/locations, per-row progress modal
  - npm deps added: `xlsx` (SheetJS), `papaparse`
- TagManager: live API CRUD (was mocked) — supports types: vitamin, mineral, allergen, diet, general
- UserManagement: live API CRUD (was mocked) — add, toggle-active, delete; self-protection (can't delete/deactivate own account)
- Global theme system: `ThemeContext` (`frontend/src/context/ThemeContext.jsx`) — wallpaper + palette persisted to localStorage + backend; applied across all pages via `Layout.jsx`
- `ThemePage`: drag-drop wallpaper upload, colour palette apply, remove wallpaper
- `labels.properties` i18n system with `useLabels` hook
- `start.ps1` / `stop.ps1` scripts (Windows, port 8001)
- `seed_data.py` with admin user + KitchenCategories root node
- **KitchenSlabPage**: replaced mock inventory data with real API data (`GET /inventory/` + `GET /categories/`); 4 filters (name, category, status, qty≤); scrollable table; pointer-based drag-and-drop (HTML5 drag API abandoned — broken in Chrome/Safari inside `overflow:scroll` ancestors); drag system uses mouse events, 4px threshold, document-level listeners via `useEffect`, refs for stale-closure avoidance, `elementFromPoint` + `[data-dropzone]` for hit testing
- **DietStatsPage**: fixed `YEARS` array (was showing only future years); added `GET /stats/usage-trend` data fetch; added 3 new chart components: `UsageTrendChart` (stacked bar, top 10 items over 6 months), `CategoryUsagePie` (donut pie, category intensity), `MonthlyVolumeLine` (line chart, total item appearances per month)
- **`GET /stats/usage-trend`** endpoint (`backend/routers/stats.py`): rolling 6-month window, no params, returns `months`/`top_items`/`category_totals`/`monthly_totals` — designed for AI/MCP tool calling
- Tailwind CSS v3 + PostCSS; warm earthy UI (orange/amber, Inter font, card-based)
- Docker: `docker-compose.yml` with named volumes for SQLite DB (`db_data`) and uploads (`uploads_data`); PostgreSQL opt-in via `--profile postgres`; data survives `docker compose up --build`
- **Session 5 (2026-08-21):** Consolidated `Dockerfile.backend` + `Dockerfile.frontend` + nginx into a single root `Dockerfile` (multi-stage: builds the frontend, then the FastAPI backend serves the built static files directly — see CLAUDE.md §Docker Deployment). Fixed an image-upload path bug (`routers/inventory.py` was writing outside the mounted volume under Docker) and a missing-env-var crash risk (`config.py` `upload_dir` had no default). §3 and §11.2 below still describe the original two-Dockerfile/nginx design — kept for history, superseded by CLAUDE.md.
- **Session 5 follow-up (first real deploy):** First actual container run surfaced `ImportError: attempted relative import beyond top-level package` from `init_db.py` — the original Dockerfiles (`Dockerfile.backend` included) flattened `backend/`'s contents directly into `/app`, which breaks the `from ..database import ...`-style relative imports used throughout `backend/models`, `backend/routers`, etc. (this bug predates the single-Dockerfile consolidation; it was apparently never caught because the container had never been successfully run before). Fixed by copying `backend/` into `/app/backend/` (nested, matching local dev's `backend.main:app` package layout) and running `init_db`/`uvicorn` via `python -m backend.init_db` / `python -m uvicorn backend.main:app` so `/app` lands on `sys.path`. Also rewrote `init_db.py` to import via `backend.database`/`backend.models` (was inserting its own directory onto `sys.path` and importing bare `database`/`models`, which independently caused the same error). See CLAUDE.md §Docker Deployment for the full explanation.

### ⚠️ Deviations from spec / known issues
- **Database:** SQLite used for dev AND optionally production (intentional user decision). PostgreSQL available via Docker profile. Alembic not configured — `Base.metadata.create_all()` handles schema.
- **Backend port:** 8001 (not 8000) — port 8000 had persistent ghost TCP socket entries.
- **MCP server:** `backend/mcp/server.py` exists but is **not mounted** in `main.py`. Needs `app.mount("/mcp", mcp_app)`.
- **`get_db()` bug in MCP tools:** Tool functions call `get_db()` directly (generator, not session). Must use `with Session(engine) as db:`.
- **Claude API fallback:** `backend/ai/claude_client.py` skeleton exists; LLM call not implemented. `anthropic` missing from `requirements.txt`.
- **`/ai-insights/mcp` route:** Missing — `AIInsightsPanel` calls it but it doesn't exist in `ai_insights.py`.
- **`AIInsightsPanel` import:** Imports `../../api/client` — should be `../../api/index.js`.
- **No `__init__.py`:** Relative imports work because `PYTHONPATH` is set in `main.py`.
- **PWA:** `vite-plugin-pwa` not installed.
- **shadcn/ui + @dnd-kit:** Not installed. UI is raw Tailwind; drag-and-drop uses a custom mouse-event system (not HTML5 drag API and not @dnd-kit).
- **Zustand store:** Not created. State is local `useState` + `ThemeContext`.

### 🔜 Next phases
- **Phase 6 (AI):** Mount MCP server; fix `get_db()` in tools; implement `messages.create()` in `claude_client.py`; add `/ai-insights/mcp` route; fix `AIInsightsPanel` import; expose `GET /stats/usage-trend` as an MCP tool
- **Phase 7 (PWA):** Install `vite-plugin-pwa`; configure service worker + manifest
- **Phase 8 (Nutrition charts):** Nutrient intake pie charts by month — aggregate nutrition fields from inventory items linked to meal prep entries, grouped by tag

---

## 1. Project Overview

Build a **Kitchen Inventory and Meal Prep** Progressive Web App (PWA).

- **Backend:** Python + FastAPI
- **Frontend:** React + Vite (with `vite-plugin-pwa` for PWA support)
- **Database:** PostgreSQL
- **Deployment modes:** Standalone (dev) and Docker (production)
- **AI Integration:** Built-in MCP server (primary) + Claude API with tool calling (fallback)

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI (Python 3.11+) |
| ORM | SQLAlchemy 2.x (async) with Alembic migrations |
| Database | PostgreSQL 15+ |
| Frontend | React 18 + Vite 5 |
| PWA | vite-plugin-pwa (Workbox) |
| UI library | shadcn/ui + Tailwind CSS |
| Drag and drop | @dnd-kit/core |
| Image color extraction | colorthief (JS) for dynamic theme from wallpaper |
| Auth | JWT (python-jose) + bcrypt password hashing |
| AI / MCP | FastAPI-MCP or custom MCP server + Anthropic SDK (claude-sonnet-5) |
| Containerization | Docker + docker-compose |
| Config/Labels | `labels.properties` (Java-style) parsed at frontend runtime |
| Media storage | Local filesystem (standalone) / Docker volume |

---

## 3. Repository / File Structure

```
KitchenCounter/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # App settings (pydantic-settings)
│   ├── database.py              # Async SQLAlchemy engine + session
│   ├── models/
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   └── tag.py
│   ├── schemas/
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   └── tag.py
│   ├── routers/
│   │   ├── auth.py
│   │   ├── categories.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   ├── tags.py
│   │   ├── theme.py
│   │   └── ai_insights.py
│   ├── mcp/
│   │   ├── server.py            # MCP server exposing DB tools
│   │   └── tools.py             # Tool definitions (query inventory, meal plans, etc.)
│   ├── ai/
│   │   └── claude_client.py     # Anthropic SDK fallback integration
│   ├── migrations/              # Alembic migration files
│   ├── static/
│   │   └── uploads/             # User-uploaded images
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   ├── manifest.json        # PWA manifest
│   │   └── icons/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── assets/
│   │   │   └── labels.properties  # All UI label strings
│   │   ├── hooks/
│   │   │   ├── useLabels.js     # Parses labels.properties at runtime
│   │   │   └── useTheme.js      # Dynamic theme from wallpaper image
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   ├── CategoryTree/
│   │   │   ├── InventoryTable/
│   │   │   ├── MealPrepGrid/
│   │   │   ├── DragDropItems/
│   │   │   └── AIInsightsPanel/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── KitchenSlabPage.jsx
│   │   │   ├── ConfigurationPage.jsx
│   │   │   └── ThemePage.jsx
│   │   ├── api/                 # Axios API clients per resource
│   │   └── store/               # Zustand global state
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── start.sh                     # Standalone start script (Linux/Mac)
├── start.ps1                    # Standalone start script (Windows PowerShell)
├── init.sh                      # Cross-platform init script (install deps + seed DB)
├── CLAUDE.md                    # AI developer reference (auto-updated)
└── README.md                    # Human developer reference (auto-updated)
```

---

## 4. Database Schema

### 4.1 users
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| username | VARCHAR(100) UNIQUE | |
| email | VARCHAR(255) UNIQUE | |
| hashed_password | TEXT | bcrypt |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | |

### 4.2 categories
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

### 4.3 tags
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(100) UNIQUE | |
| tag_type | VARCHAR(50) | e.g. `"vitamin"`, `"general"` |
| created_by | UUID FK | |

### 4.4 inventory_items
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

### 4.5 inventory_item_tags (junction)
| Column | Type |
|---|---|
| item_id | UUID FK |
| tag_id | UUID FK |

### 4.6 meal_preps
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

### 4.7 meal_prep_entries
One row per meal_prep × meal_time combination.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| meal_prep_id | UUID FK → meal_preps.id | |
| meal_time | ENUM | `Breakfast`, `Lunch`, `Dinner` |
| video_url | TEXT | YouTube / Facebook / Instagram |
| notes | TEXT | |
| status | ENUM | `Planned`, `Done`, `Skipped` |

### 4.8 meal_prep_items (junction)
Links inventory items to a meal prep entry.

| Column | Type |
|---|---|
| id | UUID PK |
| meal_prep_entry_id | UUID FK |
| inventory_item_id | UUID FK |

### 4.9 theme_settings
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK | |
| wallpaper_path | TEXT | |
| extracted_palette | JSONB | colorthief output |
| active | BOOLEAN | one active per user |

---

## 5. Pages & Feature Specification

### 5.1 Login Page
- Username + password login
- JWT access token stored in `localStorage`
- Admin user can create additional users from Configuration Page

### 5.2 Inventory Page
Three tabs/sections on a single page:

| Section | Items shown |
|---|---|
| 1 — Current Stock | status IN (`InUse`, `Stocked`, `Finished`) |
| 2 — Running Low | status IN (`InUse`, `Finished`) |
| 3 — Out of Stock | status IN (`Finished`, `NotInStock`) |

Each table supports: search, filter by category, sort, inline edit of `usage_percentage` (slider), image upload per item, add/edit/delete item.

### 5.3 Kitchen Slab Page

**Section 1 — KitchenCounter (filtered inventory view)**
Filterable by: Category, SubCategory, ChildCategory, GrandChildCategory, Status.

**Section 2 — Monthly Meal Prep Grid**
- Month/Year selector; multi-year support
- No data pre-created — user must click "Create Month" to initialise a month
- Grid columns: Day | Breakfast (url, notes, items) | Lunch (url, notes, items) | Dinner (url, notes, items)
- **Add Meal Prep:** modal with day, per-meal-time video URL, notes, items (drag from KitchenCounter)
- **Update Meal Prep:** inline "Update Status" button → status per meal-time + usage slider per linked inventory item (confirm before save)
- **Delete Meal Prep:** confirmation prompt then hard delete

### 5.4 Configuration Page
- **Category Management:** visual tree editor — add/edit/delete nodes at any depth; attach image per node
- **Tag Management:** add/edit/delete tags; assign `tag_type` (e.g. `vitamin`, `general`)
- **User Management:** admin creates/deactivates users
- **Vitamin/Nutrient Tags:** manage tags available in inventory vitamin field

### 5.5 Theme Page
- Upload wallpaper image per page (or global)
- On upload, colorthief extracts dominant palette → updates CSS variables for buttons/accents
- User can manually override extracted colours
- Preview panel shows live theme before saving

---

## 6. Background Images & Dynamic Theming

- Every page has a full-viewport background image (wallpaper)
- User uploads images via the Theme Page
- On image upload: `colorthief` extracts dominant + palette colours
- CSS custom properties (`--primary`, `--accent`, `--btn-bg`, etc.) are updated dynamically
- Theme persisted in `theme_settings` table per user
- Fallback: default theme if no wallpaper set

---

## 7. UI Labels / i18n

- All user-visible strings live in `frontend/src/assets/labels.properties`
- Format: `key=value` (one per line, `#` comments)
- `useLabels.js` hook fetches and parses this file at app startup
- No deployment required to change a label — just edit the file and refresh
- Example:
  ```
  page.inventory.title=My Kitchen Inventory
  btn.add.item=Add Item
  section.current.stock=Currently In Stock
  ```

---

## 8. AI Insights

### 8.1 MCP Server (primary)
Expose the following MCP tools over a local MCP endpoint (e.g. `/mcp`):

| Tool name | Description |
|---|---|
| `get_inventory_summary` | Count items by status and category |
| `get_expiring_soon` | Items expiring within N days |
| `get_low_stock_items` | Items with usage_percentage > 70 |
| `get_meal_prep_history` | Meal preps for a date range |
| `get_nutritional_summary` | Aggregate macros for a period |
| `search_inventory` | Full-text search across items |

Any Claude/AI client can connect to the MCP server and call these tools to reason over the kitchen data.

### 8.2 Claude API Fallback
- `backend/ai/claude_client.py` uses the Anthropic SDK
- Model: `claude-sonnet-5`
- Same tools as MCP exposed as Claude tool definitions
- Triggered from `POST /api/ai/insights` endpoint
- Frontend has an AI Insights Panel (collapsible sidebar) that calls this endpoint

---

## 9. PWA Configuration

- `vite-plugin-pwa` with Workbox in `GenerateSW` mode
- Offline caching: static assets + last-loaded inventory data
- `manifest.json`: name, short_name, icons (192×192, 512×512), theme_color, display: standalone
- Install prompt handled by `beforeinstallprompt` event

---

## 10. Authentication

- `POST /auth/login` → returns `access_token` (JWT, 8h expiry)
- `POST /auth/register` (admin-only)
- All other routes require `Authorization: Bearer <token>` header
- Frontend: Axios interceptor attaches token; 401 redirects to login

---

## 11. Deployment

### 11.1 Standalone (dev)
```
# start.sh / start.ps1
# 1. Activate Python venv
# 2. Start PostgreSQL (if not running)
# 3. Run Alembic migrations
# 4. Start FastAPI: uvicorn backend.main:app --reload --port 8000
# 5. Start Vite dev server: npm run dev (port 5173)
```

### 11.2 Docker
```yaml
# docker-compose.yml services:
# - db: postgres:15
# - backend: Dockerfile.backend (uvicorn, port 8000)
# - frontend: Dockerfile.frontend (nginx serving Vite build, port 80)
# Volumes: postgres_data, uploads
```

---

## 12. Init Script (`init.sh` / cross-platform)

Detects OS (Windows/Linux/Mac) and:
1. Checks Python 3.11+ and Node 18+ installed
2. Creates and activates Python venv
3. `pip install -r backend/requirements.txt`
4. `npm install` in `frontend/`
5. Creates `.env` from `.env.example` if not present
6. Starts PostgreSQL (or prompts user)
7. Runs `alembic upgrade head`
8. Seeds DB: creates root `KitchenCategories` node + default admin user
9. Prints success + next steps

---

## 13. Start Scripts

### `start.sh` (Linux/Mac)
```bash
#!/bin/bash
source venv/bin/activate
cd backend && uvicorn main:app --reload --port 8000 &
cd frontend && npm run dev
```

### `start.ps1` (Windows)
```powershell
& .\venv\Scripts\Activate.ps1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; uvicorn main:app --reload --port 8000"
cd frontend; npm run dev
```

---

## 14. CLAUDE.md (AI developer reference)

Create a file `CLAUDE.md` at the project root with:
- Architecture overview
- Database schema (mirrored from section 4 above, kept up-to-date)
- File structure with role of each file
- API route table
- Key business rules (status auto-update, category tree rules, meal prep data creation policy)
- How to run migrations
- How to add a new page/route
- **Footer instruction:** "AI: Update this file at the end of every development phase and whenever you make schema, route, or structural changes."

---

## 15. README.md (Human developer reference)

Create a file `README.md` at the project root with:
- Project description
- Prerequisites
- Quick start (init + start scripts)
- Environment variables reference
- Database schema summary
- Project structure
- How to add a new category, inventory item, meal prep
- Docker deployment steps
- Troubleshooting
- **Footer instruction:** "AI: Update this file at the end of every development phase and whenever you make schema, route, or structural changes."

---

## 16. Environment Variables (`.env.example`)

```
DATABASE_URL=postgresql+asyncpg://kitchenuser:password@localhost:5432/kitchendb
SECRET_KEY=changeme
ACCESS_TOKEN_EXPIRE_MINUTES=480
UPLOAD_DIR=backend/static/uploads
ANTHROPIC_API_KEY=your_key_here
MCP_ENABLED=true
CORS_ORIGINS=http://localhost:5173
```

---

## 17. Key Business Rules (enforce in backend)

1. `usage_percentage = 100` → auto-set `status = Finished`
2. `usage_percentage 1–99` → auto-set `status = InUse`
3. `usage_percentage = 0` → leave status unchanged
4. Category root `KitchenCategories` cannot be deleted or renamed
5. Meal prep month data is never auto-created — only on explicit user action
6. Each user has independent theme settings
7. Tags of type `vitamin` appear in the inventory vitamin multi-select field
8. Deleting a category must warn if inventory items are linked to it
9. Before marking a meal prep entry as Done, prompt user to update usage of linked items

---

## 18. Build Order Recommendation for the AI

1. **Phase 1 — Foundation:** Init script, env config, DB models, Alembic migrations, FastAPI app skeleton, JWT auth routes
2. **Phase 2 — Category API + Config Page:** Category CRUD (tree), Tag CRUD, Config page frontend
3. **Phase 3 — Inventory API + Page:** Inventory CRUD, image upload, usage slider, 3-section view
4. **Phase 4 — Kitchen Slab + Meal Prep:** KitchenCounter filter view, monthly meal prep grid, drag-and-drop items
5. **Phase 5 — Theme + Labels:** Wallpaper upload, colorthief integration, CSS variable injection, labels.properties system
6. **Phase 6 — AI Insights:** MCP server tools, Claude API fallback, AI Insights Panel in UI
7. **Phase 7 — PWA + Docker:** vite-plugin-pwa config, Dockerfiles, docker-compose, start scripts
8. **Phase 8 — Docs:** Finalise CLAUDE.md and README.md

---

> **AI reminder:** Update this file (`KITCHEN_APP_BUILD_PROMPT.md`), `CLAUDE.md`, and `README.md` at the end of each phase above and whenever schema, routes, or file structure changes.
