#!/usr/bin/env bash
# Setup script for epic-free-games
# Installs dependencies and guides first-time login.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "🎮 epic-free-games — Setup"
echo "=========================="
echo ""

# Check Node.js version
if ! command -v node &>/dev/null; then
  echo "❌ Node.js is required but not installed."
  echo "   Install it from: https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js >= 18 is required (found: $(node -v))"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Install Playwright Firefox (less captcha-prone than Chromium)
echo ""
echo "🌐 Installing Playwright Firefox..."
npx playwright install firefox

# Create .env from template if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "📝 Created .env from template. Edit it to add your credentials (optional)."
fi

# First-time login
echo ""
echo "🔐 Ready to login to Epic Games Store."
echo "   This will open a browser window for you to log in."
echo ""
read -p "Login now? (Y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  node src/index.js --login
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Usage:"
echo "  node src/index.js --list     # List free games"
echo "  node src/index.js --claim    # Claim free games"
echo "  node src/index.js --help     # Show all options"
