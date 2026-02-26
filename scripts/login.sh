#!/usr/bin/env bash
# Open browser for interactive Epic Games login.
# Run this when your session has expired.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "🔐 Opening browser for Epic Games login..."
node src/index.js --login
