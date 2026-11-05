#!/usr/bin/env bash
# =============================================================================
# Rowvane — Cross-Platform Setup Script (macOS / Linux)
# Prepares dependencies, environment configuration, and database seeds.
# =============================================================================

set -e

echo "=================================================="
echo "          ROWVANE — WORKSPACE SETUP"
echo "=================================================="

# 1. Verify Node.js
if ! command -v node &> /dev/null; then
  echo "[-] Error: Node.js is not installed."
  echo "    Please install Node.js 22.9.0+ (Node.js 22 LTS recommended) from https://nodejs.org/"
  exit 1
fi

NODE_RAW=$(node -v | tr -d 'v')
NODE_MAJOR=$(echo "$NODE_RAW" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_RAW" | cut -d. -f2)

if [ "$NODE_MAJOR" -lt 22 ] || { [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 9 ]; }; then
  echo "[-] Error: Unsupported Node.js version."
  echo "    Installed: $(node -v)"
  echo "    Required:  Node.js >= 22.9.0 (Node.js 22 LTS recommended)"
  echo "    Please upgrade Node.js from https://nodejs.org/"
  exit 1
fi
echo "[+] Node.js $(node -v) detected (>= 22.9.0)."

# 2. Verify npm
if ! command -v npm &> /dev/null; then
  echo "[-] Error: npm is not installed."
  exit 1
fi
echo "[+] npm $(npm -v) detected."

# 3. Check for native PostgreSQL utilities
echo "[*] Checking PostgreSQL utilities..."
if command -v psql &> /dev/null; then
  echo "[+] psql available: $(psql --version)"
else
  echo "[!] Warning: 'psql' not found on PATH. (Native restores will be disabled until installed)."
fi

if command -v pg_dump &> /dev/null; then
  echo "[+] pg_dump available: $(pg_dump --version)"
else
  echo "[!] Warning: 'pg_dump' not found on PATH. (Native backups will be disabled until installed)."
fi

# 4. Initialize .env if missing
if [ ! -f .env ]; then
  echo "[*] Initializing .env from .env.example..."
  cp .env.example .env
  echo "[+] Created .env file. Review connection settings if using non-default credentials."
else
  echo "[+] Existing .env file found (preserved)."
fi

# 5. Install npm dependencies
echo "[*] Installing project dependencies..."
npm install

# 6. Initialize and seed databases
echo "[*] Initializing primary database..."
if npm run seed; then
  echo "[+] Primary database initialized successfully."
else
  echo "[!] Note: Could not auto-seed primary database. Ensure PostgreSQL is running on port 5432."
fi

echo "[*] Initializing dedicated playground showcase database..."
if npm run seed:playground; then
  echo "[+] Dedicated playground database (rowvane_playground) seeded successfully."
else
  echo "[!] Note: Could not auto-seed playground database. You can re-run 'npm run seed:playground' once PostgreSQL is started."
fi

echo ""
echo "=================================================="
echo "           SETUP COMPLETED SUCCESSFULLY!"
echo "=================================================="
echo "To start Rowvane, run:"
echo "   ./start.sh"
echo "or:"
echo "   npm start"
echo ""
echo "Then open your browser at: http://localhost:3000"
echo "=================================================="
