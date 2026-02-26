#!/usr/bin/env bash
# Claim free games — designed to be called by cron or OpenClaw scheduler.
# Exit code 0 = success (even if no games to claim), non-zero = error.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "[$(date -Iseconds)] Running epic-free-games claim..."
node src/index.js --claim
echo "[$(date -Iseconds)] Done."
