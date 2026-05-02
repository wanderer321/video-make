# DramaForge Frontend Startup Script (Windows PowerShell)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopDir = Join-Path $scriptDir "..\desktop"

Write-Host "[DramaForge] Starting frontend dev server..." -ForegroundColor Cyan
Set-Location $desktopDir
node node_modules/vite/bin/vite.js --port 5173
