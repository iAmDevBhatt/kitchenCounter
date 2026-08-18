# KitchenCounter - AI-Powered Kitchen Inventory & Meal Prep App

KitchenCounter is a Progressive Web App (PWA) for managing kitchen inventory and meal preparation plans. It helps you track what's in your fridge, manage expiration dates, plan meals, and get AI-powered insights.

## Features

- **Kitchen Inventory Management** — Track items with images, quantity, expiry dates, nutritional info, and tags
- **Item Image Uploads** — Add a photo to each inventory item; thumbnails displayed in all tables
- **Tag System** — Attach tags (vitamin, mineral, allergen, diet, general) to items for future nutrient analysis
- **Meal Planning** — Create and manage monthly meal prep plans
- **Dynamic Theming** — Upload a wallpaper; palette applies as background across all pages
- **User Management** — Add, deactivate, and delete users from the Configuration page
- **AI Insights** — Skeleton wired; Claude API fallback ready (LLM call not yet implemented)
- **Docker-first** — SQLite by default; PostgreSQL opt-in; all uploaded data persists across redeployments

## Tech Stack

### Backend
- Python 3.11+ / FastAPI
- SQLite (dev + optional production) / PostgreSQL 15+ (production option)
- SQLAlchemy 2.x sync ORM — `Base.metadata.create_all()` on startup (no Alembic yet)
- JWT auth via `python-jose` + bcrypt

### Frontend
- React 18 + Vite 5
- Tailwind CSS v3 — warm earthy orange/amber palette, Inter font
- React Context for global theme state
- Axios with `/api` prefix → Vite proxy → backend

### AI Integration (partial)
- FastAPI-MCP server stub (`backend/mcp/server.py`) — not yet mounted
- Anthropic SDK skeleton (`backend/ai/claude_client.py`) — LLM call not yet implemented

## Quick Start (Windows)

```powershell
# From project root:
.\start.ps1     # starts backend on :8001 and frontend on :5173
.\stop.ps1      # stops both
```

Default login: `admin` / `admin123`

- Frontend: http://localhost:5173
- API docs: http://127.0.0.1:8001/docs

## Quick Start (Linux/Mac)

```bash
./init.sh       # create venv, install deps, seed database
./start.sh
```

## Environment Variables

Create `.env` in the project root:

```
DATABASE_URL=sqlite:///./kitchendb.sqlite
SECRET_KEY=changeme
ACCESS_TOKEN_EXPIRE_MINUTES=480
UPLOAD_DIR=backend/static/uploads
ANTHROPIC_API_KEY=your_key_here
MCP_ENABLED=true
CORS_ORIGINS=*
```

## Docker Deployment

```bash
# SQLite (default — no Postgres container started):
docker compose up --build

# PostgreSQL:
docker compose --profile postgres up --build
```

### Data persistence

All data survives `docker compose up --build` via named volumes:

| Volume | Contains |
|---|---|
| `uploads_data` | Uploaded images (item photos + wallpapers) |
| `db_data` | SQLite database file |
| `postgres_data` | PostgreSQL data (only with `--profile postgres`) |

> **Never run `docker compose down -v`** in production — it deletes all volumes.

## Project Structure

```
KitchenCounter/
├── backend/
│   ├── main.py                 # FastAPI entry point; mounts /static
│   ├── config.py               # pydantic-settings
│   ├── database.py             # Sync SQLAlchemy, SQLite WAL mode
│   ├── models/                 # SQLAlchemy models (UUID as_uuid=False)
│   ├── schemas/                # Pydantic schemas (UUID fields as str)
│   ├── routers/                # auth, categories, inventory, meal_prep, tags, theme, ai_insights
│   ├── mcp/                    # MCP server stub (not mounted)
│   ├── ai/                     # Claude API client skeleton
│   ├── static/uploads/         # Uploaded files (Docker: named volume)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── context/ThemeContext.jsx   # Global wallpaper + palette state
│   │   ├── components/
│   │   │   ├── InventoryTable/        # Full CRUD, images, tags
│   │   │   ├── TagManager/            # Full CRUD (live API)
│   │   │   └── UserManagement/        # Full CRUD (live API)
│   │   ├── pages/
│   │   └── api/index.js               # Axios, baseURL: '/api'
│   └── vite.config.js                 # Proxy /api + /static → :8001
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── start.ps1 / stop.ps1        # Windows dev scripts
├── start.sh / init.sh          # Linux/Mac dev scripts
├── CLAUDE.md                   # Full technical reference for AI developers
└── KITCHEN_APP_BUILD.md        # Original build specification
```

## Troubleshooting

**Backend won't start on port 8001**
- Check for a lingering process: `netstat -ano | findstr :8001` (Windows)
- Kill it or change the port in `start.ps1` and `vite.config.js`

**Categories / tags not loading (500 error)**
- Most likely a stale DB file from a different machine. Delete `backend/kitchendb.sqlite` and restart — the app recreates the schema automatically. Re-seed with `python backend/seed_data.py`.

**Images not showing**
- The Vite proxy forwards `/static` to `:8001`. Ensure the backend is running.
- In Docker, confirm the `uploads_data` volume is mounted: `docker volume ls`

**Tags picker shows no tags**
- Tags must be created first in Configuration → Tag Management. The picker fetches live from the API.

## Development Notes

See `CLAUDE.md` for the full technical reference including schema details, API route table, UUID rules, and next-phase roadmap.
