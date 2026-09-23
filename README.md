# KitchenCounter

A Progressive Web App for managing your kitchen inventory, planning meals, and saving recipes — designed for laptop, tablet, and mobile.

---

## Features

### Inventory Management
- Track items with name, category, quantity, status, expiry date, net weight, and nutritional info (carbs, protein, fat, fiber, sugar)
- Upload a photo per item — thumbnails shown in all tables; camera capture supported on mobile/tablet
- Attach tags (vitamin, mineral, allergen, diet, general) for nutritional analysis
- Bulk import/export via `.xlsx` or `.csv` (SheetJS + PapaParse)
- Filter by status: All Items · Currently In Stock · Running Low · Out of Stock
- Category picker with full breadcrumb paths and depth indicators

### Meal Planning (Kitchen Slab)
- Monthly meal prep planner — one card per saved day, sorted grid view
- Drag inventory items into Breakfast / Lunch / Dinner slots (pointer-based drag, works on touch devices)
- Set meal status (Planned / Done / Skipped) and attach notes
- Add a video URL per meal entry — or **browse your saved Recipes** to pick one directly
- Day detail slide-over with inline embedded video player (YouTube / Instagram / Facebook)
- Filter inventory by name, category, status, or quantity before dragging

### Recipes
- Save recipe links from any source — YouTube, Instagram, Facebook, or any web page
- **Play** embedded video directly in a modal (YouTube / Instagram / Facebook)
- **Download** to your server with one click — `yt-dlp` for video URLs, `wget` for web pages
- Search recipes by name
- **Share from mobile** — add the app to your home screen; sharing any URL to it pre-fills the Add Recipe form (PWA Web Share Target)

### Diet & Stats
- Monthly dietary tag stats and nutrition totals
- Usage trend charts: stacked bar chart (top items × 6 months), category donut pie, monthly volume line chart
- Inventory health snapshot (status distribution, expiry alerts, top categories)

### Configuration
- **Category Management** — unlimited-depth tree (Root → Category → SubCategory → …); rename, delete with inventory link warnings
- **Tag Management** — full CRUD with type assignment
- **Storage Locations** — name your physical storage spots and assign to inventory items
- **User Management** — add users, toggle active/inactive, delete (cannot self-deactivate)
- **Download Location** — set the server path where recipe downloads are saved; shows Docker volume setup tip

### Theme
- Upload a wallpaper image; extracted colour palette applies across all pages
- Persisted per-user in the database and `localStorage`

### Auth
- JWT-based authentication (`python-jose` + bcrypt)
- Token stored in `localStorage`; auto-redirect to login on 401

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.x (sync), Alembic |
| Database | SQLite (dev + production default) / PostgreSQL 15+ (opt-in) |
| Auth | JWT via `python-jose` + bcrypt |
| Frontend | React 18, Vite 5, Tailwind CSS v3, react-router-dom v7 |
| HTTP client | Axios (`baseURL: '/api'`; Vite proxies to backend in dev) |
| Charts | Recharts 3.x |
| Bulk import/export | SheetJS (`xlsx`) + PapaParse |
| Drag & Drop | Custom pointer-event system (mouse + touch; no HTML5 drag API) |
| Video download | yt-dlp (video URLs), wget (web pages) |
| AI (partial) | Anthropic Claude API skeleton — LLM call not yet implemented |
| Container | Single Docker image (node:18 build → python:3.11-slim runtime) |

---

## Quick Start — Windows (local dev)

```powershell
# From project root:
.\start.ps1     # starts backend on :8001 and frontend on :5173
.\stop.ps1      # stops both
```

- Frontend: http://localhost:5173
- API docs: http://127.0.0.1:8001/docs
- Default login: `admin` / `admin123`

## Quick Start — Linux / Mac (local dev)

```bash
./init.sh       # create venv, install deps, seed database
./start.sh
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=sqlite:///./kitchendb.sqlite
SECRET_KEY=changeme-use-a-long-random-string-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=480
UPLOAD_DIR=backend/static/uploads
DOWNLOAD_DIR=backend/static/downloads
ANTHROPIC_API_KEY=your_key_here
MCP_ENABLED=true
CORS_ORIGINS=*
```

---

## Docker Deployment

```bash
# SQLite (default — no extra services needed):
docker compose up --build

# PostgreSQL (optional):
docker compose --profile postgres up --build
```

The container serves both the FastAPI backend and the built React frontend — no nginx required.  
Access at **http://localhost:8007** (mapped from container port 8000).

### Data persistence

Named volumes ensure all data survives `docker compose up --build` (i.e. rebuilds are safe):

| Volume | Mount path | Contents |
|---|---|---|
| `uploads_data` | `/app/backend/static/uploads` | Item photos + wallpaper images |
| `downloads_data` | `/app/backend/static/downloads` | Recipe downloads (yt-dlp / wget) |
| `db_data` | `/data/db` | SQLite database file |
| `postgres_data` | `/var/lib/postgresql/data` | PostgreSQL data (postgres profile only) |

> **Never run `docker compose down -v`** in production — it deletes all volumes and all your data.

### PUID / PGID (host bind-mounts)

Set `PUID` and `PGID` env vars in `docker-compose.yml` to match your host user/group when using bind-mount paths — the entrypoint will `chown` the upload and DB directories and run under that identity via `gosu`.

---

## Database Migrations (Alembic)

Schema is managed by Alembic. On every Docker start, `docker-entrypoint.sh` runs:

```bash
alembic upgrade head   # idempotent — skips already-applied revisions
```

For local dev:

```powershell
.\backend\venv\Scripts\python.exe -m alembic upgrade head
```

To add a new table or column:

1. Add / modify the SQLAlchemy model in `backend/models/`
2. Import the model in `migrations/env.py`
3. `alembic revision --autogenerate -m "describe change"`
4. Review the generated file in `migrations/versions/`
5. `alembic upgrade head`
6. Commit the migration file alongside the model change

---

## Project Structure

```
KitchenCounter/
├── backend/
│   ├── main.py                   # FastAPI entry point; StripApiPrefixMiddleware; serves built frontend
│   ├── config.py                 # pydantic-settings (reads .env)
│   ├── database.py               # Sync SQLAlchemy engine, SQLite WAL mode
│   ├── models/                   # SQLAlchemy models (all UUID(as_uuid=False))
│   │   ├── user.py
│   │   ├── category.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   ├── tag.py
│   │   ├── theme.py
│   │   ├── inventory_tag.py      # many-to-many join table
│   │   ├── storage_location.py
│   │   ├── recipe.py             # shared recipe list
│   │   └── app_settings.py       # app-wide key/value settings
│   ├── schemas/                  # Pydantic v2 schemas (UUID fields as plain str)
│   ├── routers/                  # One router file per domain
│   │   ├── auth.py
│   │   ├── categories.py
│   │   ├── inventory.py
│   │   ├── meal_prep.py
│   │   ├── tags.py
│   │   ├── theme.py
│   │   ├── storage_locations.py
│   │   ├── stats.py
│   │   ├── ai_insights.py
│   │   ├── recipes.py            # CRUD + /download background task
│   │   └── app_settings.py       # GET/PUT by key
│   ├── mcp/server.py             # MCP server stub (not yet mounted)
│   ├── ai/claude_client.py       # Claude API skeleton (LLM call not implemented)
│   ├── static/uploads/           # Uploaded images (Docker: named volume)
│   ├── static/downloads/         # Recipe downloads (Docker: named volume)
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   ├── favicon.svg           # Custom icon: orange circle, frying pan, fried egg
│   │   └── manifest.json         # PWA manifest with Web Share Target
│   ├── src/
│   │   ├── context/ThemeContext.jsx
│   │   ├── hooks/useLabels.js    # i18n via labels.properties
│   │   ├── assets/labels.properties
│   │   ├── components/
│   │   │   ├── Layout/           # Nav header + phone bottom tab bar + wallpaper background
│   │   │   ├── CategoryTree/     # Live CRUD, unlimited depth
│   │   │   ├── InventoryTable/   # Full CRUD, image upload, tags, CategoryPicker, BulkImportExport
│   │   │   ├── TagManager/
│   │   │   ├── UserManagement/
│   │   │   ├── StorageLocationManager/
│   │   │   ├── RecipePicker/     # Searchable recipe picker modal (used in Kitchen Slab)
│   │   │   └── DownloadLocationManager/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── KitchenSlabPage.jsx
│   │   │   ├── RecipesPage.jsx
│   │   │   ├── DietStatsPage.jsx
│   │   │   ├── ConfigurationPage.jsx
│   │   │   └── ThemePage.jsx
│   │   └── api/index.js          # Axios client, baseURL: '/api'
│   ├── index.html
│   └── vite.config.js            # Proxy: /api → :8001, /static → :8001
├── migrations/                   # Alembic migrations
│   ├── env.py
│   └── versions/
├── docker-compose.yml            # SQLite default; --profile postgres for Postgres
├── Dockerfile                    # Multi-stage: node:18 build → python:3.11-slim runtime
├── docker-entrypoint.sh          # PUID/PGID, alembic upgrade, seed, uvicorn
├── start.ps1 / stop.ps1          # Windows dev scripts
├── start.sh / init.sh            # Linux/Mac dev scripts
├── CLAUDE.md                     # Full technical reference (schema, routes, rules)
└── KITCHEN_APP_BUILD.md          # Build history and implementation status
```

---

## API Overview

| Method | Route | Description |
|---|---|---|
| `POST` | `/auth/login` | Login, returns JWT |
| `POST` | `/auth/register` | Create user |
| `GET` | `/categories/` | List all categories (flat with parent_id) |
| `GET` | `/inventory/` | List inventory items |
| `POST` | `/inventory/upload-image/{id}` | Upload item image |
| `GET/PUT` | `/inventory/{id}/tags` | Get / set item tags |
| `GET` | `/meal-prep/month/{year}/{month}` | Get meal plan for a month |
| `PUT` | `/meal-prep/entry/{id}` | Update a meal entry (video URL, notes, status) |
| `GET` | `/recipes/` | List all recipes |
| `POST` | `/recipes/{id}/download` | Download recipe to server (yt-dlp / wget) |
| `GET/PUT` | `/app-settings/{key}` | Read / write app setting (e.g. `download_dir`) |
| `GET` | `/stats/usage-trend` | 6-month rolling usage trend (AI/MCP ready) |
| `GET` | `/stats/dietary/{year}/{month}` | Monthly dietary tag stats |

Full route table in `CLAUDE.md`.

---

## Mobile / PWA Usage

The app is fully responsive — tested on laptop, tablet, and phone.

**On a phone:**
- A bottom tab bar replaces the top nav (Diet & Stats · Inventory · Kitchen Slab · Recipes · **More** → Configuration, Theme, Logout).
- Inventory and Recipes show as cards instead of wide tables. You can edit usage with the slider right on each card.
- Forms open as bottom sheets.
- In the meal-plan editor, tap 🌅 / ☀️ / 🌙 next to an item to add it to Breakfast / Lunch / Dinner. You can also long-press an item and drag it.

### Install on Android (Chrome)
1. Open the app URL in Chrome and log in
2. Tap **⋮ → Add to Home screen** (or **Install app** if Chrome offers it)
3. Launch it from the home-screen icon — it opens full-screen with no address bar

### Install on iPhone / iPad (Safari)
1. Open the app URL in **Safari** (other iOS browsers can't install web apps on older iOS versions)
2. Tap **Share → Add to Home Screen → Add**
3. Launch it from the home-screen icon — it opens full-screen

### Tips for a smooth install
- **Use HTTPS.** Over plain `http://192.168.x.x:8007`, Android adds a normal bookmark shortcut rather than an installed app, and **Share → KitchenCounter** won't appear. Put the app behind HTTPS, for example a reverse proxy (Caddy / Nginx Proxy Manager / Traefik) with a certificate, Tailscale `serve`, or a Cloudflare Tunnel.
- **Log in once in the browser first.** The login token lives in the browser's storage. On iOS, the home-screen app has its own storage, so you'll log in again the first time you open it.
- **Offline use isn't supported yet.** There's no service worker (`vite-plugin-pwa` is Phase 7), so the app needs a connection to your server.
- **After a redeploy,** fully close and reopen the home-screen app to pick up the new version.

### Share a recipe URL from your phone
1. Find a recipe on YouTube, Instagram, or any website
2. Tap **Share → KitchenCounter**
3. The app opens with the Add Recipe modal pre-filled — give it a name and save

> The Web Share Target works on Android Chrome when the app is installed as a PWA. iOS Safari does not support Web Share Target yet, but the app works fully via the browser.

---

## Troubleshooting

**Backend won't start on port 8001**
```powershell
netstat -ano | findstr :8001   # find the PID
taskkill /PID <pid> /F
```

**500 errors on startup / missing tables**
- Run migrations: `.\backend\venv\Scripts\python.exe -m alembic upgrade head`
- Or delete `backend/kitchendb.sqlite` for a clean slate (data loss — dev only)

**Images not showing**
- Vite proxy forwards `/static → :8001`. Confirm the backend is running.
- In Docker: `docker volume ls` — confirm `uploads_data` volume exists.

**Downloads not working in Docker**
- Confirm `downloads_data` volume is mapped: `docker volume inspect kitchencounter_downloads_data`
- `yt-dlp` and `wget` are installed in the container image — check container logs: `docker logs kitchencounter`

**npm install fails (corporate network)**
```powershell
npm config set strict-ssl false
npm install
npm config set strict-ssl true
```

---

## Known Gaps / Roadmap

| Item | Status |
|---|---|
| MCP server (`backend/mcp/server.py`) | Stub — not mounted in `main.py` |
| Claude LLM call (`backend/ai/claude_client.py`) | Skeleton — `messages.create()` not implemented |
| `/ai-insights/mcp` route | Missing |
| PWA service worker / offline support | Manifest, PNG icons and iOS meta tags are present, so the app is installable; `vite-plugin-pwa` is not installed, so there's no offline support |
| Nutrition intake pie charts (by month) | Not yet built |

---

## Development Reference

See **`CLAUDE.md`** for the complete technical reference: full database schema, all API routes, UUID rules, drag-and-drop architecture, Docker deployment details, and migration workflow.

See **`KITCHEN_APP_BUILD.md`** for the full build history and per-session implementation notes.
