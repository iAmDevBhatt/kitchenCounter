# Stop KitchenCounter Application (Windows PowerShell)
# Kills only the processes bound to the ports used by start.ps1:
#   port 8001 — uvicorn / FastAPI backend
#   port 5173 — Vite / npm run dev frontend

Write-Host "Stopping KitchenCounter Application..." -ForegroundColor Yellow
Write-Host ""

$stopped = $false

function Stop-PortProcess {
    param([int]$Port, [string]$Label)
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid_ = ($conn | Select-Object -First 1).OwningProcess
        $proc = Get-Process -Id $pid_ -ErrorAction SilentlyContinue
        $name = if ($proc) { $proc.Name } else { "unknown" }
        Write-Host "Stopping $Label (PID $pid_ — $name) on port $Port..." -ForegroundColor Cyan
        Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
        return $true
    } else {
        Write-Host "$Label (port $Port) is not running." -ForegroundColor Gray
        return $false
    }
}

if (Stop-PortProcess -Port 8001 -Label "Backend ") { $stopped = $true }
if (Stop-PortProcess -Port 5173 -Label "Frontend") { $stopped = $true }

Write-Host ""
if ($stopped) {
    Write-Host "KitchenCounter stopped." -ForegroundColor Green
} else {
    Write-Host "Nothing was running." -ForegroundColor Gray
}