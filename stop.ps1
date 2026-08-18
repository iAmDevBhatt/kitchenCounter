# Stop script for KitchenCounter application
# This script stops all running development processes

Write-Host "Stopping KitchenCounter development servers..."

# Stop backend server (uvicorn)
$backendProcesses = Get-Process -Name uvicorn -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*backend*" }
if ($backendProcesses) {
    Write-Host "Stopping backend server..."
    $backendProcesses | Stop-Process -Force
}

# Stop frontend server (vite)
$frontendProcesses = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*vite*" }
if ($frontendProcesses) {
    Write-Host "Stopping frontend server..."
    $frontendProcesses | Stop-Process -Force
}

# Kill any remaining related processes
Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "KitchenCounter development servers stopped."