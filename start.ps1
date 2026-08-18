# Start KitchenCounter Application (Windows PowerShell)
# Starts backend (uvicorn:8000) and frontend (Vite:5173) each in their own window.
# Run from the project root: .\start.ps1
# To stop: .\stop.ps1

$root = $PSScriptRoot

# --- Validate venv ---
$venvActivate = "$root\backend\venv\Scripts\Activate.ps1"
if (-not (Test-Path $venvActivate)) {
    Write-Host "Python venv not found. Creating it now..." -ForegroundColor Yellow
    python -m venv "$root\backend\venv"
    & "$venvActivate"
    pip install -r "$root\backend\requirements.txt" --quiet
    Write-Host "Dependencies installed." -ForegroundColor Green
}

# --- Start backend in new window ---
Write-Host "Launching backend  on http://127.0.0.1:8001 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root'; & '.\backend\venv\Scripts\Activate.ps1'; Write-Host 'Backend running on http://127.0.0.1:8001' -ForegroundColor Green; python -m uvicorn backend.main:app --reload --port 8001"
) -WindowStyle Normal

# Give uvicorn a moment to bind the port
Start-Sleep -Seconds 3

# --- Start frontend in new window ---
Write-Host "Launching frontend on http://localhost:5173 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root\frontend'; Write-Host 'Frontend running on http://localhost:5173' -ForegroundColor Green; npm run dev"
) -WindowStyle Normal

Write-Host ""
Write-Host "KitchenCounter is starting up." -ForegroundColor Green
Write-Host "  Backend : http://127.0.0.1:8001"
Write-Host "  API docs: http://127.0.0.1:8001/docs"
Write-Host "  Frontend: http://localhost:5173"
Write-Host ""
Write-Host "Run .\stop.ps1 to shut everything down."