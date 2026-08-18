# KitchenCounter - AI-Powered Kitchen Inventory & Meal Prep App

KitchenCounter is a Progressive Web App (PWA) for managing kitchen inventory and meal preparation plans. It helps you track what's in your fridge, manage expiration dates, plan your meals, and get AI-powered insights.

## Features
- **Kitchen Inventory Management**: Track ingredients with quantity, expiration dates, and nutritional information
- **Meal Planning**: Create and manage monthly meal prep plans 
- **Dynamic Theming**: Personalized UI based on uploaded wallpapers
- **AI Insights**: Leverage AI to get insights from your kitchen data via MCP server or Claude API
- **PWA Support**: Installable application with offline capabilities

## Tech Stack

### Backend
- Python 3.11+
- FastAPI (Python web framework)
- PostgreSQL 15+
- SQLAlchemy 2.x (async ORM)
- Alembic (database migrations)

### Frontend
- React 18 + Vite 5
- shadcn/ui + Tailwind CSS
- PWA support with vite-plugin-pwa

### AI Integration
- FastAPI-MCP server for database tool access
- Anthropic SDK (Claude Sonnet 5 model) as fallback

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

## Prerequisites

- Python 3.11+
- Node.js 18+ 
- PostgreSQL 15+

## Quick Start

### 1. Initialize the project:
```bash
./init.sh
```

### 2. Start the application:
```bash
# Linux/Mac:
./start.sh

# Windows:
./start.ps1
```

## Environment Variables

Create a `.env` file based on `.env.example`:
```
DATABASE_URL=postgresql+asyncpg://kitchenuser:password@localhost:5432/kitchendb
SECRET_KEY=changeme
ACCESS_TOKEN_EXPIRE_MINUTES=480
UPLOAD_DIR=backend/static/uploads
ANTHROPIC_API_KEY=your_key_here
MCP_ENABLED=true
CORS_ORIGINS=http://localhost:5173
```

## Database Schema

See `CLAUDE.md` for detailed database schema information.

## Deployment

The application supports both standalone development and Docker deployment. 

### Standalone Development:
- Run `./init.sh` to setup project dependencies and database
- Run `./start.sh` (Linux/Mac) or `./start.ps1` (Windows)

### Docker Deployment:
- Build images with `docker-compose build`
- Start containers with `docker-compose up`

## Troubleshooting

1. **Database connection issues**:
   - Ensure PostgreSQL is running
   - Create database: `createdb kitchendb`
   - Create user and grant permissions  

2. **Frontend not starting**:
   - Run `npm install` in `frontend/` directory
   - Check that Node.js version is 18+

3. **Backend issues**:
   - Activate virtual environment: `source backend/venv/bin/activate`
   - Ensure all Python dependencies are installed

## Development Notes

This application follows a phased development approach as outlined in `KITCHEN_APP_BUILD.md`. The phases progress from basic setup to advanced features like AI integration and PWA capabilities.

AI developers, please update `CLAUDE.md` and `README.md` at the end of each development phase.