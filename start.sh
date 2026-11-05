#!/usr/bin/env bash
# =============================================================================
# Rowvane — Startup Script (macOS / Linux)
# Performs pre-flight checks and starts the Rowvane visual database workspace.
# =============================================================================

set -e

if ! command -v node &> /dev/null; then
  echo "[-] Error: Node.js is not installed. Please run ./setup.sh first."
  exit 1
fi

if [ ! -f .env ]; then
  echo "[!] Warning: No .env file found. Creating one from .env.example..."
  cp .env.example .env
fi

echo "=================================================="
echo "          ROWVANE — STARTING WORKSPACE"
echo "=================================================="
echo "[+] Starting Rowvane on Node.js $(node -v)..."
echo "[+] Open browser at: http://localhost:3000"
echo "=================================================="

exec node --env-file-if-exists=.env index.js
