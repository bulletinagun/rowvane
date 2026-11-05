# =============================================================================
# Rowvane — Startup Script (Windows PowerShell)
# Performs pre-flight checks and starts the Rowvane visual database workspace.
# =============================================================================

$ErrorActionPreference = "Stop"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[-] Error: Node.js is not installed. Please run .\setup.ps1 first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".env")) {
    Write-Host "[!] Warning: No .env file found. Creating one from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "          ROWVANE — STARTING WORKSPACE            " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "[+] Starting Rowvane on Node.js $((node -v))..." -ForegroundColor Green
Write-Host "[+] Open browser at: http://localhost:3000" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

node --env-file-if-exists=.env index.js
