# =============================================================================
# Rowvane — Cross-Platform Setup Script (Windows PowerShell)
# Prepares dependencies, environment configuration, and database seeds.
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "          ROWVANE — WORKSPACE SETUP (WINDOWS)     " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Verify Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[-] Error: Node.js is not installed." -ForegroundColor Red
    Write-Host "    Please install Node.js 22.9.0+ (Node.js 22 LTS recommended) from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

$parts = (node -v).TrimStart("v").Split(".")
$major = [int]$parts[0]
$minor = [int]$parts[1]
if ($major -lt 22 -or ($major -eq 22 -and $minor -lt 9)) {
    Write-Host "[-] Error: Unsupported Node.js version." -ForegroundColor Red
    Write-Host "    Installed: $(node -v)" -ForegroundColor Red
    Write-Host "    Required:  Node.js >= 22.9.0 (Node.js 22 LTS recommended)" -ForegroundColor Red
    Write-Host "    Please upgrade Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "[+] Node.js $(node -v) detected (>= 22.9.0)." -ForegroundColor Green

# 2. Verify npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[-] Error: npm is not installed." -ForegroundColor Red
    exit 1
}
Write-Host "[+] npm $(npm -v) detected." -ForegroundColor Green

# 3. Check for native PostgreSQL utilities
Write-Host "[*] Checking PostgreSQL utilities..." -ForegroundColor Yellow
if (Get-Command psql -ErrorAction SilentlyContinue) {
    Write-Host "[+] psql available: $((psql --version) | Select-Object -First 1)" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: 'psql' not found on PATH. Native restores will require PostgreSQL CLI." -ForegroundColor Yellow
}

if (Get-Command pg_dump -ErrorAction SilentlyContinue) {
    Write-Host "[+] pg_dump available: $((pg_dump --version) | Select-Object -First 1)" -ForegroundColor Green
} else {
    Write-Host "[!] Warning: 'pg_dump' not found on PATH. Native backups will require PostgreSQL CLI." -ForegroundColor Yellow
}

# 4. Initialize .env if missing
if (-not (Test-Path ".env")) {
    Write-Host "[*] Initializing .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[+] Created .env file. Review connection settings if using custom credentials." -ForegroundColor Green
} else {
    Write-Host "[+] Existing .env file found (preserved)." -ForegroundColor Green
}

# 5. Install npm dependencies
Write-Host "[*] Installing project dependencies..." -ForegroundColor Yellow
npm install

# 6. Initialize databases
Write-Host "[*] Initializing primary database..." -ForegroundColor Yellow
try {
    npm run seed
    Write-Host "[+] Primary database initialized successfully." -ForegroundColor Green
} catch {
    Write-Host "[!] Note: Could not auto-seed primary database. Ensure PostgreSQL service is running." -ForegroundColor Yellow
}

Write-Host "[*] Initializing dedicated playground showcase database..." -ForegroundColor Yellow
try {
    npm run seed:playground
    Write-Host "[+] Dedicated playground database (rowvane_playground) seeded successfully." -ForegroundColor Green
} catch {
    Write-Host "[!] Note: Could not auto-seed playground database. Run 'npm run seed:playground' once PostgreSQL is started." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "           SETUP COMPLETED SUCCESSFULLY!          " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "To start Rowvane, run:"
Write-Host "   .\start.ps1" -ForegroundColor Yellow
Write-Host "or:"
Write-Host "   npm start" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then open your browser at: http://localhost:3000" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
