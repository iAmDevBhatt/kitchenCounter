# Start KitchenCounter Application (Windows PowerShell)
# This script starts both backend and frontend servers on Windows

Write-Host "Starting KitchenCounter Application..."
Write-Host ""

# Activate virtual environment
$venvPython = ".\backend\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Error "Python venv not found at $venvPython"
    exit 1
}

# Start FastAPI server in a new PowerShell window
$bgArgs = @("-NoExit", "-Command") + @("& '$PSScriptRoot\backend\venv\Scripts\Activate.ps1' ; cd '$PSScriptRoot\backend' ; $env:PYTHONPATH='..' ; Write-Host '' ; Write-Host 'Backend running on http://127.0.0.1:8000' -ForegroundColor Green ; python -m uvicorn backend.main:app --reload --port 8000")
$bgHandle = Start-Process powershell -ArgumentList $bgArgs -PassThru -WindowStyle Normal

Start-Sleep -Seconds 2

# Start React dev server
Write-Host ""
Set-Location -LiteralPath "$PSScriptRoot\frontend"
npm run dev