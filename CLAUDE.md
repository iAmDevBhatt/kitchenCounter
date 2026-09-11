# KitchenCounter - AI Developer Reference

> Last updated: 2026-09-11 (session 10). See `KITCHEN_APP_BUILD.md` §Implementation Status for full gap list.

This document provides comprehensive technical documentation for developers working on the KitchenCounter application.

## Architecture Overview

KitchenCounter is a Progressive Web App (PWA) with:
- **Backend**: FastAPI Python application (SQLite for dev and optionally production, PostgreSQL for production target)
- **Frontend**: React 18 + Vite 5 with Tailwind CSS v3 (warm earthy design, Inter font)
- **AI Integration**: MCP server stub (`backend/mcp/server.py`) — not yet mounted; Claude API fallback skeleton in `backend/ai/claude_client.py` — LLM call not yet implemented
- **Database**: SQLite (dev, intentional) / PostgreSQL 15+ (production option). SQLAlchemy ORM. **Alembic** manages schema migrations — `alembic upgrade head` runs on every Docker start before the seed step.
- **Auth**: JWT via `python-jose` + bcrypt. Token stored in `localStorage`. Default credentials: `admin` / `admin123`.

## Critical Implementation Rules

> These rules are non-negotiable — violating them has caused runtime 500 errors in the past.

| Rule | Detail |
|---|---|
| `UUID(as_uuid=False)` | ALL SQLAlchemy UUID columns must use `as_uuid=False` — SQLite stores UUIDs as strings |
| `default=lambda: str(uuid.uuid4())` | ALL PK UUID columns must use this exact default, not `uuid.uuid4` |
| Pydantic schemas use `str` for UUIDs | Never use `UUID4` in Pydantic schemas — use plain `str` for all UUID fields |
| `_parse_uid` returns `str` | All routers' `_parse_uid` helper returns `str(stdlib_uuid.UUID(s))`, never a `uuid.UUID` object |
| Backend port is **8001** | Port 8000 had ghost TCP socket entries that could not be killed — permanently moved to 8001 |
| Axios `baseURL: '/api'` | All frontend API calls use the `/api` prefix; Vite proxies `/api → http://127.0.0.1:8001` |

## Frontend Tech Stack

| Item | Detail |
|---|---|
| Framework | React 18 + Vite 5 |
| Styling | Tailwind CSS v3 (`tailwind.config.js`, `postcss.config.js`) |
| Design system | Warm earthy — orange/amber palette, Inter font, custom utility classes in `index.css` |
| Routing | react-router-dom v7 |
| HTTP | Axios (`frontend/src/api/index.js`) with `baseURL: '/api'` |
| State | Local `useState`/`useEffect` + React Context (`ThemeContext`) for global theme |
| Drag & drop | Mouse-event system (NO HTML5 drag API) — `onMouseDown`/`onTouchStart` + document-level `mousemove`/`mouseup`/`touchmove`/`touchend`, 4px threshold, refs avoid stale closures. Works on both mouse and touch (tablet/phone). |
| Charts | Recharts 3.x (`recharts`, `react-is` peer dep) — used by DietStatsPage |
| Bulk import/export | `xlsx` (SheetJS) + `papaparse` — installed in `frontend/` |
| PWA | Not yet configured (`vite-plugin-pwa` not installed) |

## Responsive Design & Touch Support

The app is fully responsive — designed and tested for laptop, tablet, and mobile.

### Touch Targets
- The `.btn` base class in `index.css` enforces `min-h-[44px]` on all buttons, meeting touch-target accessibility guidelines.
- Table row action buttons (Edit/Delete/Save/Cancel) use `min-h-[36px]` — slightly smaller since they sit in compact table rows, but intentionally tappable.
- Modal close buttons are padded to at least 44×44 px.

### Layout Breakpoints
| Component | Mobile (< `md`) | Tablet/Desktop (`md`+) |
|---|---|---|
| `Layout` header | Logo icon only (text hidden), `gap-4` | Full "KitchenCounter" text, `gap-4 lg:gap-8` |
| Mobile nav strip | `min-h-[44px]` touch links, horizontal scroll | Hidden (`md:hidden`) |
| `MealPrepModal` body | Inventory panel on top (max-h-52, scrollable) + drop zones below | Side-by-side (`w-60` left + `flex-1` right) |
| `DietStatsPage` MealStatusCharts | Single-column (`grid-cols-1`) | Two-column (`sm:grid-cols-2`) |
| `AIInsightsPanel` | Full viewport width (`w-full`) | Fixed 320 px panel (`sm:w-80`) |

### Hover vs Touch — CategoryTree Actions
- Add / Rename / Delete buttons use `opacity-0 group-hover:opacity-100` on pointer devices.
- On touch devices (`@media (hover: none)`), the same buttons are always visible via `[@media(hover:none)]:opacity-100`.

### Drag & Drop — Touch Support (KitchenSlabPage `MealPrepModal`)
The drag system supports both mouse and touch:
- `onMouseDown` / `onTouchStart` on each inventory row seed `pendingRef`.
- Document-level `mousemove` + `touchmove` (passive: false) activate drag after 4 px threshold; update ghost position; hit-test `[data-dropzone]` via `elementFromPoint`.
- `mouseup` + `touchend` commit the dragged item to the targeted meal slot.
- `touchmove` calls `e.preventDefault()` to block page scroll during a drag.

## Vite Proxy Configuration

```js
// frontend/vite.config.js
proxy: {
  '/api': {
    target: 'http://127.0.0.1:8001',
    changeOrigin: true,
    rewrite: path => path.replace(/^\/api/, ''),
  },
  '/static': { target: 'http://127.0.0.1:8001', changeOrigin: true },
}
```

## Favicon / App Icon

`frontend/public/favicon.svg` — orange circle background, black frying pan, fried egg (white + amber yolk). Shown in browser tabs, bookmarks, and iOS home screen saves.

**How it works end-to-end (Docker):**
- Vite copies everything in `frontend/public/` into `dist/` at build time — no Dockerfile change needed.
- `index.html` references it via `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` and `<link rel="apple-touch-icon" href="/favicon.svg">`.
- In production (single container), `backend/main.py`'s SPA catch-all route checks whether the requested path is a real file in `frontend_dist/` before falling back to `index.html`. This prevents `/favicon.svg` from being swallowed by the catch-all and returning the SPA shell instead of the icon.

**`main.py` root-file serving logic (inside the `SERVE_STATIC` block):**
```python
candidate = _frontend_dist / full_path
if candidate.is_file() and candidate.parent == _frontend_dist:
    return FileResponse(str(candidate), media_type=_MIME.get(candidate.suffix, ...))
return FileResponse(str(_frontend_dist / "index.html"))  # SPA fallback
```
The `candidate.parent == _frontend_dist` guard ensures only files directly in `dist/` are served this way — subdirectory traversal is not possible.

## Known Issues / Gaps

| Issue | File | Fix needed |
|---|---|---|
| `mcp_app` not mounted | `backend/main.py` | Add `app.mount("/mcp", mcp_app)` |
| `get_db()` bug in MCP | `backend/mcp/server.py` | Use `with Session(engine) as db:` |
| No LLM call | `backend/ai/claude_client.py` | Implement `self.client.messages.create(...)` |
| `anthropic` missing | `backend/requirements.txt` | Add `anthropic>=0.40.0` |
| `/ai-insights/mcp` missing | `backend/routers/ai_insights.py` | Add POST route |
| `AIInsightsPanel` import | `frontend/src/components/AIInsightsPanel/AIInsightsPanel.jsx` | Fix import to `../../api/index.js` |
| PWA service worker missing | `frontend/` | Install `vite-plugin-pwa`, configure service worker (manifest.json + share target already present) |

## Project Structure

```
KitchenCounter/
├── backend/                    # Python FastAPI application
│   ├── main.py                 # FastAPI app entry point; mounts /static; imports all models
│   ├── config.py               # App settings (pydantic-settings)
│   ├── database.py             # Sync SQLAlchemy engine + session (SQLite WAL mode)
│   ├── models/                 # Database models (all UUID(as_uuid=False))
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   ├── tag.py
│   │   ├── theme.py
│   │   └── inventory_tag.py    # inventory_item_tags join table
│   ├── schemas/                # Pydantic validation models (all UUID fields are str)
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   ├── tag.py
│   │   └── theme.py
│   ├── routers/                # API routes
│   │   ├── auth.py             # login, register, list/toggle/delete users
│   │   ├── categories.py
│   │   ├── inventory.py        # CRUD + /upload-image + /tags endpoints
│   │   ├── meal_prep.py
│   │   ├── tags.py
│   │   ├── theme.py            # includes /upload-wallpaper
│   │   └── ai_insights.py
│   ├── mcp/                    # MCP server stub (not yet mounted)
│   │   └── server.py
│   ├── ai/                     # AI integration skeleton (LLM call not implemented)
│   │   └── claude_client.py
│   ├── static/                 # Served at /static; uploads/ persisted via Docker volume
│   │   └── uploads/
│   └── requirements.txt
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx             # Wrapped in <ThemeProvider>
│   │   ├── context/
│   │   │   └── ThemeContext.jsx  # Global theme/wallpaper state via React Context
│   │   ├── hooks/
│   │   │   ├── useLabels.js    # Parses labels.properties at runtime
│   │   │   └── useTheme.js     # Re-exports from ThemeContext
│   │   ├── components/
│   │   │   ├── Layout/         # Nav + wallpaper background, consumes ThemeContext
│   │   │   ├── CategoryTree/   # Live API, full CRUD
│   │   │   ├── InventoryTable/ # Live API, full CRUD + image upload + tags + CategoryPicker + BulkImportExport
│   │   │   ├── TagManager/     # Live API, full CRUD (was mocked, now real)
│   │   │   ├── UserManagement/ # Live API, full CRUD (was mocked, now real)
│   │   │   ├── MealPrepGrid/
│   │   │   ├── DragDropItems/
│   │   │   ├── AIInsightsPanel/
│   │   │   ├── RecipePicker/          # Searchable recipe-URL picker modal; used in KitchenSlabPage MealDropZone
│   │   │   └── DownloadLocationManager/ # Reads/writes download_dir via /api/app-settings
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── InventoryPage.jsx      # Tabs: All Items → In Stock (Stocked+InUse) → Running Low → Out of Stock. "Add Item" button is in the table card header (above the table), not the page header.
│   │   │   ├── KitchenSlabPage.jsx    # Real inventory data; 4 filters; pointer-based drag to meal prep modal; monthly plan shown as day-card grid + DayDetail slide-over with inline video embeds
│   │   │   ├── RecipesPage.jsx        # Recipe list: search, play modal, download button, add/edit/delete; auto-opens Add from ?url= (PWA share target)
│   │   │   ├── DietStatsPage.jsx      # Dietary stats + usage trend charts (3 chart components, fixed year picker)
│   │   │   ├── ConfigurationPage.jsx  # Tabs: Categories | Tags | Storage Locations | Users | Download Location
│   │   │   └── ThemePage.jsx         # Wallpaper upload + palette apply
│   │   └── api/
│   │       └── index.js        # Axios client, baseURL: '/api'
│   ├── vite.config.js          # Proxy: /api → :8001, /static → :8001
│   └── package.json
├── docker-compose.yml          # SQLite default; --profile postgres for Postgres
├── Dockerfile                  # Single image: builds frontend, backend serves it + the API
├── docker-entrypoint.sh        # PUID/PGID setup, DB init/seed, then execs uvicorn on $PORT
├── start.ps1                   # Windows: starts backend (:8001) + frontend (:5173)
├── stop.ps1
├── start.sh
├── init.sh
├── KITCHEN_APP_BUILD.md
└── CLAUDE.md
```

## Database Schema

### users
| Column | Type | Notes |
|---|---|---|
| id | UUID PK (str) | |
| username | VARCHAR(100) UNIQUE | |
| email | VARCHAR(255) UNIQUE | |
| hashed_password | TEXT | bcrypt |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMP | |

### categories
Self-referencing tree. `KitchenCategories` is the immutable root (seeded on init).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK (str) | |
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
| id | UUID PK (str) | |
| name | VARCHAR(100) UNIQUE | |
| tag_type | VARCHAR(50) | `"vitamin"`, `"mineral"`, `"allergen"`, `"diet"`, `"general"` |
| created_by | UUID FK (str) | |

### inventory_items
| Column | Type | Notes |
|---|---|---|
| id | UUID PK (str) | |
| category_id | UUID FK → categories.id | any level |
| item_name | VARCHAR(200) | |
| item_image_path | TEXT | path under /static/uploads/ |
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
| created_by | UUID FK (str) | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Status auto-update rules (enforced in backend):**
- `usage_percentage = 100` → status = `Finished`
- `usage_percentage 1–99` → status = `InUse`
- `usage_percentage = 0` → no change (status unchanged)

### inventory_item_tags
| Column | Type |
|---|---|
| item_id | UUID FK (str) |
| tag_id | UUID FK (str) |

### meal_preps
| Column | Type | Notes |
|---|---|---|
| id | UUID PK (str) | |
| year | INTEGER | |
| month | INTEGER | 1–12 |
| day | INTEGER | 1–31 |
| created_by | UUID FK (str) | |
| created_at | TIMESTAMP | |

**Constraint:** (year, month, day, created_by) unique per user.
Data for a month is NOT created until the user explicitly creates it.

### meal_prep_entries
| Column | Type | Notes |
|---|---|---|
| id | UUID PK (str) | |
| meal_prep_id | UUID FK → meal_preps.id | |
| meal_time | ENUM | `Breakfast`, `Lunch`, `Dinner` |
| video_url | TEXT | YouTube / Facebook / Instagram |
| notes | TEXT | |
| status | ENUM | `Planned`, `Done`, `Skipped` |

### meal_prep_items
| Column | Type |
|---|---|
| id | UUID PK (str) |
| meal_prep_entry_id | UUID FK |
| inventory_item_id | UUID FK |

### theme_settings
| Column | Type | Notes |
|---|---|---|
| id | UUID PK (str) | |
| user_id | UUID FK (str) | |
| wallpaper_path | TEXT | path under /static/uploads/ |
| extracted_palette | JSONB | colorthief output |
| active | BOOLEAN | one active per user |

### recipes
Shared across all users (no `created_by`).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK (str) | |
| name | VARCHAR(300) | |
| url | TEXT | YouTube / Instagram / Facebook / any URL |
| notes | TEXT | nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### app_settings
App-wide key/value store (one row per key).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK (str) | |
| key | VARCHAR(100) UNIQUE | e.g. `download_dir` |
| value | TEXT | nullable |
| updated_at | TIMESTAMP | |

**Allowed keys:** `download_dir` (server path where recipe downloads are saved; default `/app/backend/static/downloads`).

## API Route Table

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/login` | User login |
| `POST` | `/auth/register` | Create new user |
| `GET` | `/auth/users` | List all users |
| `PATCH` | `/auth/users/{id}/toggle-active` | Toggle user active state |
| `DELETE` | `/auth/users/{id}` | Delete user |
| `GET` | `/categories/` | List categories (flat, with parent_id) |
| `POST` | `/categories/` | Create category |
| `PUT` | `/categories/{id}` | Update category |
| `DELETE` | `/categories/{id}` | Delete category |
| `GET` | `/inventory/` | List inventory items |
| `POST` | `/inventory/` | Create inventory item |
| `GET` | `/inventory/{id}` | Get single inventory item |
| `PUT` | `/inventory/{id}` | Update inventory item |
| `DELETE` | `/inventory/{id}` | Delete inventory item |
| `POST` | `/inventory/upload-image/{id}` | Upload item image |
| `GET` | `/inventory/{id}/tags` | Get tags for item |
| `PUT` | `/inventory/{id}/tags` | Set tags for item (replaces all) |
| `GET` | `/meal-prep/month/{year}/{month}` | Get meal prep for month |
| `POST` | `/meal-prep/month/{year}/{month}` | Create meal prep for month |
| `PUT` | `/meal-prep/entry/{id}` | Update meal prep entry |
| `DELETE` | `/meal-prep/entry/{id}` | Delete meal prep entry |
| `GET` | `/tags/` | List tags |
| `POST` | `/tags/` | Create tag |
| `PUT` | `/tags/{id}` | Update tag |
| `DELETE` | `/tags/{id}` | Delete tag |
| `GET` | `/theme/user/{user_id}` | Get user's active theme settings |
| `POST` | `/theme/user/{user_id}` | Save user theme settings |
| `POST` | `/theme/upload-wallpaper` | Upload wallpaper image |
| `POST` | `/ai-insights/` | Call AI insights via Claude fallback |
| `GET` | `/storage-locations/` | List storage locations |
| `POST` | `/storage-locations/` | Create storage location |
| `PUT` | `/storage-locations/{id}` | Update storage location |
| `DELETE` | `/storage-locations/{id}` | Delete storage location |
| `GET` | `/stats/dietary/{year}/{month}` | Dietary tag stats + nutrition totals for a month |
| `GET` | `/stats/inventory-overview` | Inventory health snapshot (status, expiry, top categories) |
| `GET` | `/stats/usage-trend` | Rolling 6-month item usage trend — designed for AI/MCP tool calling (no params) |
| `GET` | `/recipes/` | List all recipes |
| `POST` | `/recipes/` | Create recipe |
| `GET` | `/recipes/{id}` | Get single recipe |
| `PUT` | `/recipes/{id}` | Update recipe |
| `DELETE` | `/recipes/{id}` | Delete recipe |
| `POST` | `/recipes/{id}/download` | Start background download (yt-dlp for video, wget for pages) |
| `GET` | `/app-settings/{key}` | Get app setting (returns default if not set) |
| `PUT` | `/app-settings/{key}` | Upsert app setting |

## Key Business Rules

1. `usage_percentage = 100` → auto-set `status = Finished`
2. `usage_percentage 1–99` → auto-set `status = InUse`
3. `usage_percentage = 0` → leave status unchanged
4. Category root `KitchenCategories` cannot be deleted or renamed
5. Meal prep month data is never auto-created — only on explicit user action
6. Each user has independent theme settings
7. Tags can be of types: `vitamin`, `mineral`, `allergen`, `diet`, `general`; intended for nutrient pie charts by month
8. Deleting a category must warn if inventory items are linked to it
9. Before marking a meal prep entry as Done, prompt user to update usage of linked items
10. Logged-in user cannot deactivate or delete their own account from User Management

## Global Theme System

Theme state is managed by `ThemeContext` (`frontend/src/context/ThemeContext.jsx`):
- Persists palette and wallpaper URL to `localStorage`
- Applies CSS variables to `:root`: `--theme-primary`, `--theme-background`, `--theme-wallpaper`
- Loads saved theme from `GET /api/theme/user/{userId}` on app mount
- `Layout.jsx` consumes the context and applies wallpaper as `backgroundImage` with fixed attachment
- `useTheme.js` re-exports `useThemeContext` for backwards compatibility

## CategoryPicker Component

`frontend/src/components/InventoryTable/InventoryTable.jsx` contains an inline `CategoryPicker` component replacing the native `<select>` for category choice in the item modal:
- Renders a floating dropdown with a search input
- Displays each category as a breadcrumb path (e.g. `KitchenCategories > Dairy > Cheese`)
- Depth indicators (filled dots) show nesting level at a glance
- Checkmark on currently selected item
- Closes on outside click via `useEffect`

## Bulk Import / Export

`frontend/src/components/InventoryTable/BulkImportExport.jsx` — standalone component rendered in the InventoryTable toolbar:

**Export:** downloads current inventory as `.xlsx` or `.csv`. Category/location/tag UUIDs are resolved to human-readable names. Columns (16): Item Name, Category, Stored Location, Quantity, Status, Bought Date, Expiry Date, Net Weight, Amount, Sugar, Fiber, Carbohydrate, Fat, Protein, Tags, Notes.

**Import:** accepts `.xlsx` / `.csv` (same column headers). Per row:
1. Resolves category by name — auto-creates under root via `POST /categories/` if not found
2. Resolves storage location by name — auto-creates via `POST /storage-locations/` if not found
3. Resolves each tag name — auto-creates via `POST /tags/` with `tag_type: 'general'` if not found
4. `POST /inventory/` → `PUT /inventory/{id}/tags`
5. Shows progress modal (row counter, succeeded/failed counts, per-row error list)

**npm install note (corporate env):** `npm config set strict-ssl false` before install; reset to `true` after.

## Kitchen Slab — Drag-and-Drop Architecture

HTML5 drag API is broken inside `overflow: auto/scroll` ancestors (Chrome/Safari — `dataTransfer.getData()` returns empty string). The drag system uses pointer events (mouse + touch) instead:

- `onMouseDown` / `onTouchStart` on inventory row items seeds `pendingRef` with the item and start coordinates
- Single `useEffect([], [])` adds document-level `mousemove`+`mouseup` and `touchmove`+`touchend` listeners; refs (`draggingRef`, `activeRef`) provide stale-closure-free access to state
- `handleMove(cx, cy)` shared by both mouse and touch paths: activates drag after 4px threshold; updates floating ghost; hides ghost → `elementFromPoint` → find `[data-dropzone]` ancestor → set `activeOver`
- `touchmove` registered with `{ passive: false }` so `e.preventDefault()` can suppress page scroll during a drag
- `handleUp()` shared by `mouseup` and `touchend`: reads refs, commits item to targeted meal slot, resets all state
- Drop targets: `<div data-dropzone={mealName}>` — highlights when `activeOver === mealName`
- Floating ghost: `position: fixed; z-index: 100; pointer-events: none`

## Monthly Meal Plan — Day Card Grid & Detail Slide-Over

The Monthly Meal Plan section (Section 2 of `KitchenSlabPage`) uses a **card grid + slide-over** pattern instead of a table.

### Day Card Grid
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — one card per saved day, sorted by day number.
- Each `DayCard` shows: day number, 🎬/🛒 indicators, three meal rows (icon + status badge + truncated ingredient list), and **View / Edit / Delete** buttons.
- Tapping **View** opens the `DayDetail` slide-over without leaving the page.

### DayDetail Slide-Over
- Fixed panel sliding in from the right: `w-full sm:w-[420px]`, `z-50`. Backdrop click closes it.
- Shows each meal in its own rounded section with: status badge, inline video player, notes, ingredient chips with stock-status badges.
- **Edit** from the slide-over closes it and opens `MealPrepModal`; after saving, the slide-over re-opens with refreshed data (`saveRow` updates `viewRow` state if the saved id matches).
- **Delete** closes the slide-over and opens `ConfirmDelete`.

### Video Embed — `embedUrl(url)`
Returns `{ src, allow }` for embeddable URLs, `null` for unknown platforms (caller shows an external link instead).

| Platform | URL patterns matched | Embed target |
|---|---|---|
| YouTube | `youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/live/`, `/embed/`, `m.youtube.com/` | `youtube.com/embed/{ID}?rel=0` |
| Instagram | `/reel/`, `/p/`, `/tv/` | `instagram.com/p/{CODE}/embed` |
| Facebook | `facebook.com/.../videos/{ID}`, `fb.watch/{ID}` | `facebook.com/plugins/video.php?href=...` |
| Other | — | Falls back to `<a target="_blank">` external link |

Videos render in a `16:9 aspect-video` iframe inside the slide-over. Non-embeddable URLs show "Open video link" which opens a new tab — this is intentional.

## Usage Trend Endpoint (AI/MCP)

`GET /stats/usage-trend` — no parameters required; designed for direct AI/MCP tool calling.

Returns:
```json
{
  "months": [{"label": "Feb 2026", "year": 2026, "month": 2}, ...],   // 6 entries, oldest first
  "top_items": [{"id": "...", "name": "...", "monthly_counts": [0,2,1,0,3,1], "total": 7}, ...],
  "category_totals": [{"category_id": "...", "name": "...", "count": 12}, ...],
  "monthly_totals": [{"label": "Feb 2026", "total_items": 5}, ...]
}
```

`monthly_counts` is a list aligned positionally to `months` — index 0 = oldest month.

## Diet & Stats Page — Usage Trend Charts

Three new chart components in `DietStatsPage.jsx`:

| Component | Chart type | Data used |
|---|---|---|
| `UsageTrendChart` | Stacked `BarChart` | `top_items` × months; each item is a `<Bar stackId="a">` |
| `CategoryUsagePie` | Donut `PieChart` (`innerRadius=50, outerRadius=110`) | `category_totals` top 10; labels hidden for slices < 4% |
| `MonthlyVolumeLine` | `LineChart` 160px tall | `monthly_totals` `total_items` |

Also fixed: `YEARS` array now covers `now.getFullYear() - 10` through present (was incorrectly listing only future years).

## Inventory Item Image Flow

1. User selects or drags an image file in the item modal (Basic Info tab)
2. On save: item is created/updated first → ID obtained → `POST /inventory/upload-image/{id}` with multipart form data
3. Backend saves to `backend/static/uploads/{uuid}{ext}`, stores relative path in `item_image_path`
4. Frontend resolves path: `/static` + path → served by Vite proxy → backend `/static` mount
5. Tables display 36×36 `object-cover` thumbnail; items without image show an initial-letter fallback

## Docker Deployment

**Single image** (`Dockerfile`, project root) — replaces the old `Dockerfile.backend` +
`Dockerfile.frontend` + nginx setup:
1. **Stage 1** (`node:18-alpine`): `npm ci && npm run build` in `frontend/` → `dist/`
2. **Stage 2** (`python:3.11-slim`): installs backend deps, copies `backend/` to **`/app/backend/`**
   (kept nested, not flattened into `/app`), copies stage 1's `dist/` in as
   `/app/backend/frontend_dist/`, then runs `docker-entrypoint.sh`

> **Why nested and not flattened:** every module under `backend/` (models, routers, schemas, ai)
> uses two-dot relative imports like `from ..database import Base`, which only resolve if
> `backend` is importable as the top-level package containing them (i.e. `backend.models.user`)
> — exactly how local dev already runs it: `python -m uvicorn backend.main:app` from the repo
> root (`start.ps1`). Flattening `backend/`'s contents directly into `/app` (the original
> `Dockerfile.backend` did this) turns `models` into a *bare* top-level package with no parent,
> so those same imports fail with `ImportError: attempted relative import beyond top-level
> package`. `docker-entrypoint.sh` therefore always runs things as `python -m backend.init_db` /
> `python -m uvicorn backend.main:app` (from `WORKDIR /app`), never as bare `python init_db.py` /
> `uvicorn main:app` — `python -m` is what puts `/app` on `sys.path` so `backend` resolves.
> `backend/init_db.py` imports via `from backend.database import ...` / `from backend.models import
> ...` for the same reason (mirrors `backend/seed_data.py`, which already did this correctly for
> local dev).

At runtime, FastAPI (`backend/main.py`) itself serves the built frontend — no nginx container:
- `GET /assets/*` → `StaticFiles` mount of `frontend_dist/assets`
- `GET /{anything not matched by a router above}` → `frontend_dist/index.html` (SPA fallback,
  gated by `SERVE_STATIC` env var, default `true`; skipped entirely if `frontend_dist/` doesn't
  exist — e.g. local `uvicorn backend.main:app` dev runs)
- `StripApiPrefixMiddleware` rewrites `/api/*` → `/*` before routing, since there's no
  nginx/Vite proxy left to do that stripping in front of the single container. Routers stay
  registered unprefixed (`/auth`, `/categories`, ...) so the route table above and `/docs` are
  unaffected; the frontend's `axios baseURL: '/api'` now hits this middleware instead of a proxy.

`docker-entrypoint.sh` also handles `PUID`/`PGID` env vars (default `0` = run as root): if both
are set non-zero it creates a matching user/group, `chown`s `/app/backend/static/uploads` and
`/data/db`, then runs `init_db.py` and `uvicorn` via `gosu` as that user — useful when those paths
are host bind-mounts (as in the blr-stack deployment below) so file ownership matches the host.

```
# SQLite (default — no extra services needed):
docker compose up --build

# PostgreSQL:
docker compose --profile postgres up --build
```

Named volumes ensure data persists across redeployments (`docker compose up --build` is safe):
| Volume | Mount | Contains |
|---|---|---|
| `uploads_data` | `/app/backend/static/uploads` | All uploaded images (item + wallpaper) |
| `db_data` | `/data/db` | SQLite database file (`kitchendb.sqlite`) |
| `postgres_data` | `/var/lib/postgresql/data` | Postgres data (only with `--profile postgres`) |

> **Warning:** `docker compose down -v` deletes all volumes. Never run this in production.

SQLite `DATABASE_URL` in Docker: `sqlite:////data/db/kitchendb.sqlite` (4 slashes = absolute path).

Container listens on `$PORT` (default `8000`, set via env var) — this is unrelated to the
dev-only "backend port is 8001" rule above, which applies only to `start.ps1`/local `uvicorn`.

## Database Migrations (Alembic)

Schema changes are managed by Alembic. The `migrations/` directory holds all migration files.

### Docker (production)
`docker-entrypoint.sh` runs `alembic upgrade head` automatically before starting uvicorn. This is idempotent — already-applied revisions are skipped. Existing data is **never** wiped.

### Local dev
For local dev, `python -m backend.init_db` still calls `Base.metadata.create_all()` as a convenience fallback (only creates missing tables, never alters). To stay in sync with what Docker will run:
```powershell
cd C:\...\kitchenCounter
.\backend\venv\Scripts\python.exe -m alembic upgrade head
```

### Adding a new table or column
1. Add / modify the SQLAlchemy model in `backend/models/`.
2. Import the model in `migrations/env.py` (alongside the existing imports).
3. Generate a new migration:
   ```powershell
   .\backend\venv\Scripts\python.exe -m alembic revision --autogenerate -m "describe change"
   ```
4. Review the generated file in `migrations/versions/` — autogenerate is not perfect, especially for `Enum` columns and SQLite batch mode.
5. Test locally: `.\backend\venv\Scripts\python.exe -m alembic upgrade head`
6. Commit the new migration file alongside the model change.

### Key config points
- `alembic.ini` `script_location` → `migrations/`
- `alembic.ini` `sqlalchemy.url` fallback → `sqlite:///./kitchendb.sqlite` (overridden at runtime by `DATABASE_URL` env var in `migrations/env.py`)
- `render_as_batch=True` in `env.py` — required for SQLite which doesn't support `ALTER COLUMN`/`DROP COLUMN` directly; Alembic rebuilds the table in a batch operation

## How to Run (Development)

```powershell
# Windows — from project root:
.\start.ps1     # starts backend (:8001) + frontend (:5173) each in their own window
.\stop.ps1      # stops both
```

Backend API docs available at: `http://127.0.0.1:8001/docs`

## Environment Variables (.env)

```
DATABASE_URL=sqlite:///./kitchendb.sqlite
SECRET_KEY=changeme
ACCESS_TOKEN_EXPIRE_MINUTES=480
UPLOAD_DIR=backend/static/uploads
ANTHROPIC_API_KEY=your_key_here
MCP_ENABLED=true
CORS_ORIGINS=*
DOWNLOAD_DIR=backend/static/downloads
```

## Docker Deployment (blr-stack)

The project is designed to be cloned into `/opt/blr-stack/KitchenCounter/`.  
The main `/opt/blr-stack/docker-compose.yml` can include these service blocks.

**Standalone (self-contained) — SQLite default:**
```bash
cd /opt/blr-stack/KitchenCounter
docker compose up --build -d
```

**Merge into parent docker-compose.yml:**
- Copy the `kitchencounter` service block (and `postgres_data`/`uploads_data`/`db_data` volumes,
  or point them at bind-mount paths as below) from this project's `docker-compose.yml`
- Declare a shared network `blr-net` in the parent file (or adjust the network name)
- Single container serves both frontend and API — pick one host port for it (example below uses
  `8007` → container's `$PORT`, default `8000`)

**Container names:**
| Container | Name |
|---|---|
| PostgreSQL (optional) | `kitchencounter-db` |
| App (frontend + backend) | `kitchencounter` |

Example service block using bind-mount volumes under `/opt/blr-stack/` (matches this repo's
`docker-compose.yml`, just with bind mounts instead of named volumes):
```yaml
kitchencounter:
  build:
    context: ./kitchenCounter
    dockerfile: Dockerfile
  container_name: kitchencounter
  restart: unless-stopped
  environment:
    DATABASE_URL: sqlite:////data/db/kitchencounter.db
    SECRET_KEY: change-me-in-production-use-a-long-random-string
    ACCESS_TOKEN_EXPIRE_MINUTES: "1440"   # 24h
    SERVE_STATIC: "true"
    PORT: "8000"
    PUID: "3000"
    PGID: "3000"
  volumes:
    - /opt/blr-stack/kitchenCounter/app/static/uploads:/app/backend/static/uploads
    - /opt/blr-stack/kitchenCounter/app/data:/data/db
  ports:
    - "8007:8000"
  networks:
    - blr-net
```
> `DATABASE_URL` and the second volume must agree on the container-side path (`/data/db` here) —
> a mismatch there means the DB file silently lands outside the mounted volume and is lost on
> rebuild. This repo has no `JWT_SECRET`/`JWT_EXPIRY_HOURS` env vars (a different app's naming
> convention) — this app reads `SECRET_KEY` and `ACCESS_TOKEN_EXPIRE_MINUTES` (minutes, not
> hours) instead, per [Environment Variables](#environment-variables-env) above.

**Data persistence (named volumes survive `docker compose down` and rebuilds):**
| Volume | Mounted at | Contents |
|---|---|---|
| `uploads_data` | `/app/backend/static/uploads` | Item images |
| `db_data` | `/data/db` | SQLite database file |
| `postgres_data` | `/var/lib/postgresql/data` | PostgreSQL data (postgres profile) |

**First-boot seed:**  
The backend entrypoint (`docker-entrypoint.sh`) runs `python init_db.py` before uvicorn starts.  
This creates all tables and seeds: default admin user (`admin` / `admin123`) + root category `KitchenCategories`.  
Safe to re-run on every container start — it skips already-existing records.

**npm SSL note (corporate environments):**  
If `npm install` fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, run with `--strict-ssl false`, then restore with `npm config set strict-ssl true`.

## How to Add a New Page/Route

1. Create React component under `frontend/src/pages/`
2. Register route in `App.jsx`
3. Create FastAPI router in `backend/routers/`
4. Add corresponding database models (use `UUID(as_uuid=False)`) and schemas (use `str` for UUIDs)
5. Import model in `backend/main.py` AND in `migrations/env.py` so Alembic autogenerate detects the new table
6. Update `CLAUDE.md` and `README.md`

## Next Steps

- **Phase 6 (AI):** Mount MCP server in `main.py`; fix `get_db()` in `mcp/server.py`; implement Claude LLM call in `claude_client.py`; add `/ai-insights/mcp` route; fix `AIInsightsPanel` import
- **Phase 7 (PWA):** Install `vite-plugin-pwa`; configure service worker for offline support and home-screen install (manifest.json already present with share target)
- **Phase 8 (Nutrition charts):** Implement nutrient intake pie charts by month using tags + nutrition data from inventory items linked to meal preps

## Recipes Feature

### Architecture
- **Backend:** `recipes` table (shared across all users) + `app_settings` key/value table
- **Download:** `POST /recipes/{id}/download` dispatches a `BackgroundTask` that runs `yt-dlp` (video URLs) or `wget` (page URLs). Download directory is read from `app_settings.download_dir` (falls back to `DOWNLOAD_DIR` env var, then `/app/backend/static/downloads`).
- **Frontend:** `RecipesPage.jsx` — full CRUD table with search, embedded play modal, per-row download status (spinner → ✓), add/edit/delete
- **Kitchen Slab integration:** `MealDropZone` has a "📖 Recipes" button next to the video URL input that opens `RecipePicker` — a searchable modal listing all saved recipes so the user can pick one to fill the URL field
- **Configuration:** "Download Location" tab in ConfigurationPage → `DownloadLocationManager` component reads/writes `/api/app-settings/download_dir`
- **PWA Share Target:** `manifest.json` declares `share_target` at `/share-target?url=&title=&text=`. When the user shares a URL from their phone browser to the KitchenCounter PWA, `App.jsx` routes it to `/recipes?url=...` and `RecipesPage` auto-opens the Add modal pre-filled.

### embedUrl() helper
Both `RecipesPage` and `KitchenSlabPage` (for the DayDetail slide-over) use the same embed URL pattern. The canonical implementation lives in `RecipesPage.jsx`. If you need to share it, extract to `frontend/src/utils/embedUrl.js`.

### Docker — downloads volume
```yaml
volumes:
  - downloads_data:/app/backend/static/downloads
```
The `Dockerfile` installs `yt-dlp` (via pip) + `wget` + `ffmpeg` in the runtime stage and creates `/app/backend/static/downloads`.

This file should be updated at the end of every development phase and whenever schema, route, or structural changes occur.
