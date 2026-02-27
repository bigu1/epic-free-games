# 🎮 Epic Free Games Claimer

Automatically claim free weekly games from the [Epic Games Store](https://store.epicgames.com/free-games). Never miss a free game again!

Also works as an [OpenClaw](https://openclaw.ai) Skill for AI agent automation.

## Features

- 📋 **List** current and upcoming free games (no login required)
- 🤖 **Auto-claim** free games via browser automation
- 🔐 **Login once** — sessions persist between runs
- 🔔 **Notifications** — webhook support for Telegram, Discord, etc.
- ⏰ **Cron ready** — set it and forget it
- 🧩 **OpenClaw Skill** — integrates with AI agent workflows

## Quick Start

```bash
# Clone the repo
git clone https://github.com/user/epic-free-games.git
cd epic-free-games

# Run setup (installs deps + Playwright browser + first login)
bash scripts/setup.sh
```

Or manually:

```bash
npm install
npx playwright install chromium
node src/index.js --login    # Login to Epic Games
node src/index.js --claim    # Claim free games!
```

## Usage

```bash
# List current free games (no login needed)
node src/index.js --list

# List with JSON output
node src/index.js --list --json

# Interactive login (opens browser window)
node src/index.js --login

# Claim all available free games
node src/index.js --claim

# Test run without actually claiming
DRYRUN=1 node src/index.js --claim
```

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `EG_EMAIL` | No | Epic Games email (for auto-login) |
| `EG_PASSWORD` | No | Epic Games password |
| `EG_OTPKEY` | No | TOTP secret for 2FA |
| `HEADLESS` | No | `0` to show browser, `1` for headless (default) |
| `WEBHOOK_URL` | No | Webhook URL for notifications |
| `DRYRUN` | No | `1` to skip actual purchases |
| `DATA_DIR` | No | Custom data directory (default: `./data`) |

> **Note**: Credentials are optional. You can always login interactively with `--login`.

## Scheduling

### Cron (Linux/macOS)

Epic Games updates free games every **Thursday**. Add to crontab:

```bash
# Every Thursday at 00:30
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

### OpenClaw Skill

If you're using [OpenClaw](https://openclaw.ai), this works as a Skill with cron scheduling. See [SKILL.md](SKILL.md) for details.

## How It Works

1. **Query** — Fetches free games list from Epic's public API (no auth needed)
2. **Login** — Uses Playwright persistent browser context to maintain login sessions
3. **Claim** — Navigates to each free game and completes the checkout flow
4. **Notify** — Reports results via console and optional webhook

### Authentication

On first run, the script opens a visible browser window for you to log in manually. After login, cookies are saved to `data/browser-profile/` and reused for subsequent headless runs.

If your session expires, you'll get a notification to re-login.

### Captcha Handling

Epic may occasionally show hCaptcha challenges. When detected:
- A screenshot is saved for debugging
- A notification is sent so you can manually resolve it
- The game is marked as `captcha_blocked` in results

To minimize captchas: don't run too frequently, and avoid running from datacenter IPs.

## Project Structure

```
epic-free-games/
├── src/
│   ├── index.js        # CLI entry point
│   ├── config.js       # Configuration management
│   ├── epic-api.js     # Epic public API (free games query)
│   ├── claimer.js      # Browser automation (Playwright)
│   ├── notifier.js     # Notification system
│   └── utils.js        # Utility functions
├── scripts/
│   ├── setup.sh        # First-time setup
│   ├── claim.sh        # Cron-friendly claim script
│   └── login.sh        # Manual re-login
├── SKILL.md            # OpenClaw Skill descriptor
└── data/               # Runtime data (gitignored)
    ├── browser-profile/  # Saved browser session
    ├── claimed.json      # Claim history
    └── screenshots/      # Debug screenshots
```

## Docker

```bash
# Build and run
docker compose build
docker compose run epic-free-games node src/index.js --list

# Login (needs interactive terminal)
docker compose run epic-free-games node src/index.js --login

# Claim
docker compose run epic-free-games

# Or use pre-built command
docker compose up
```

Browser profile and claim history are persisted in `./data/` via Docker volume.

## Multiple Accounts

Create `data/config.json`:

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "TOTP_SECRET" }
  ]
}
```

Each account gets its own browser profile directory. The script will claim free games for all accounts sequentially.

> See `config.json.example` for the template.

## GitHub Actions

This repo includes a GitHub Actions workflow that runs every Thursday. To use it:

1. Fork this repo
2. Go to Settings → Secrets and variables → Actions
3. Add secrets: `EG_EMAIL`, `EG_PASSWORD`, `EG_OTPKEY` (optional), `WEBHOOK_URL` (optional)
4. Enable the workflow in the Actions tab

> **Note**: GitHub Actions runs in a fresh environment each time, so you need to provide credentials via secrets. The browser profile is cached between runs.

## Troubleshooting

### "Not logged in" error
Run `node src/index.js --login` to re-authenticate.

### Captcha on every run
- Try from a residential IP (not VPN/datacenter)
- Reduce run frequency
- Clear `data/browser-profile/` and re-login

### Browser crashes
- Ensure you have enough memory (Chromium needs ~500MB)
- Try: `npx playwright install chromium --with-deps`

## Credits

Inspired by:
- [vogler/free-games-claimer](https://github.com/vogler/free-games-claimer) — Playwright automation approach
- [claabs/epicgames-freegames-node](https://github.com/claabs/epicgames-freegames-node) — API endpoints reference

## License

[MIT](LICENSE)

## Disclaimer

This tool automates browser interactions with the Epic Games Store. Use at your own risk. This project is not affiliated with or endorsed by Epic Games, Inc.
