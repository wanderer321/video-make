# DramaForge Backend Startup Script (Windows PowerShell)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "..\backend"

Write-Host "[DramaForge] Starting backend..." -ForegroundColor Cyan
Set-Location $backendDir
python main.py
