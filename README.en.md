# 🎮 Epic Free Games Claimer

[中文](./README.md) | **English**

Automatically claim weekly free games from the [Epic Games Store](https://store.epicgames.com/free-games) so you never miss a giveaway again.

---

## Features

- 📋 **List** current and upcoming free games without logging in
- 🤖 **Auto-claim** games through browser automation
- 🔐 **Login once** and reuse the persisted session later
- 👥 **Multi-account** support via `data/config.json`
- 🔔 **Notifications** through Webhooks (Telegram, Discord, Bark, etc.)
- ⏰ **Scheduling** with Cron / GitHub Actions / recurring runs
- 🐳 **Docker** support for containerized deployment
- 🧩 **[OpenClaw](https://openclaw.ai) Skill** integration for AI assistants

---

## Quick Start

Requires Node.js 20.19 or newer.

```bash
git clone https://github.com/bigu1/epic-free-games.git
cd epic-free-games
bash scripts/setup.sh
```

Manual setup:

```bash
npm install
npx playwright install firefox
node src/index.js --login    # Login to Epic Games
node src/index.js --claim    # Claim free games
```

---

## Usage

```bash
# List current free games (no login required)
node src/index.js --list

# Output as JSON
node src/index.js --list --json

# Login to Epic Games
node src/index.js --login

# Claim all free games
node src/index.js --claim

# Dry run (skip actual purchases)
DRYRUN=1 node src/index.js --claim

# Check current status
node src/index.js --status

# Claim with visible browser
node src/index.js --claim-visible

# Debug one specific game URL
node src/index.js --single https://store.epicgames.com/en-US/p/cozy-grove
```

---

## Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `EG_EMAIL` | Required in GitHub Actions | Epic Games account email for auto-login |
| `EG_PASSWORD` | Required in GitHub Actions | Epic Games account password |
| `EG_OTPKEY` | No | TOTP secret for 2FA |
| `EG_PARENTALPIN` | No | Parental control PIN |
| `HEADLESS` | No | `0` shows the browser, `1` runs headless |
| `CHECKOUT_TIMEOUT` | No | Checkout/Place Order wait timeout in ms (default: `60000`) |
| `WEBHOOK_URL` | No | Notification webhook URL |
| `DRYRUN` | No | `1` simulates the claim without placing the order |
| `DATA_DIR` | No | Custom data directory (default: `./data`) |

> Local runs can use interactive `--login`. GitHub-hosted runners do not persist sessions, so GitHub Actions requires `EG_EMAIL` and `EG_PASSWORD`.

---

## Scheduling

### Cron (Linux / macOS)

Epic usually refreshes free games every Thursday:

```bash
# Cron uses the server's local timezone; this example assumes UTC
# Every Thursday at 17:00 UTC (Epic usually refreshes at 16:00 UTC)
0 17 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

### GitHub Actions

1. Fork this repository
2. Open Settings → Secrets and variables → Actions. Add at least `EG_EMAIL` and `EG_PASSWORD`; optionally add `EG_OTPKEY`, `EG_PARENTALPIN`, and `WEBHOOK_URL`
3. Enable the Actions workflow

Claim failures make the workflow fail; Captcha still requires manual action. For security, public-repository Actions do not cache the login profile or upload screenshots that may contain account details.

### OpenClaw Skill

See [SKILL.md](./SKILL.md)

---

## How It Works

```text
Query free games ──→ Check ownership ──→ Auto claim ──→ Send notification
  (public API)         (authenticated)     (browser automation)   (webhook)
```

### Authentication

On the first run, a browser window opens so you can log in manually. Cookies are stored in `data/browser-profile/` and reused later in headless mode. When the session expires, the script will notify you to log in again.

### Captcha Handling

The script now treats Captcha as an **explicit terminal state** instead of retrying blindly:

- Captcha is recorded as `captcha_blocked`
- Blind retries stop automatically to avoid further damaging the same IP / profile
- Screenshots, reasons, and `details` are saved and included in structured notifications
- Results are written to `claimed.json` for later investigation

To reduce Captcha triggers, it is recommended to:

- use a clean residential IP
- avoid aggressive retry loops
- keep a stable browser profile / session

---

## Docker

```bash
docker compose build
docker compose run epic-free-games node src/index.js --login   # Login
docker compose up                                               # Auto-claim
```

---

## Multi-Account

Create `data/config.json`:

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "SECRET" }
  ]
}
```

Each account gets its own browser profile.

---

## Project Structure

```text
epic-free-games/
├── src/
│   ├── index.js        # CLI entry point
│   ├── config.js       # Configuration management
│   ├── epic-api.js     # Epic public API
│   ├── claimer.js      # Browser automation
│   ├── notifier.js     # Notification system
│   └── utils.js        # Utility helpers
├── scripts/
│   ├── setup.sh        # First-time setup
│   ├── claim.sh        # Cron wrapper script
│   └── login.sh        # Manual login helper
├── SKILL.md            # OpenClaw Skill
└── data/               # Runtime data (gitignored)
```

---

## FAQ

**Getting `Not logged in`**  
Run `node src/index.js --login`

**Captcha appears every time**  
Try switching to a clean residential IP first. The script now marks this state as `captcha_blocked` and stops blind retries. If needed, delete `data/browser-profile/` and log in again.

**Seeing `payment_iframe_timeout` / `place_order_not_found` in logs**  
These usually indicate a page flow problem, not necessarily Captcha. Check `claimed.json` for `reason`, `details`, and `screenshotPath`. If checkout is just slow, raise `CHECKOUT_TIMEOUT`.

**Seeing `captcha_blocked` with a security check / Cloudflare message**  
Epic blocked the checkout iframe before the Place Order button. Run `HEADLESS=0 node src/index.js --claim-visible` and complete the browser challenge manually, or retry from a cleaner network/session.

**The GitHub Action is green, but did it actually claim anything?**

The current version only exits successfully for `claimed`, `already_owned`, or `dryrun_skipped`. Missing login, Captcha, and claim errors make the workflow fail.

**Browser crashes / page closes unexpectedly**  
Make sure the machine has enough memory (roughly 500MB or more). The script now records `page_closed` separately so screenshot failures no longer hide the root cause.

---

## Credits

- [vogler/free-games-claimer](https://github.com/vogler/free-games-claimer) — Playwright automation approach
- [claabs/epicgames-freegames-node](https://github.com/claabs/epicgames-freegames-node) — API endpoint reference

## License

[MIT](./LICENSE)

## Disclaimer

This tool automates browser interactions with the Epic Games Store. Use it at your own risk. This project is not affiliated with Epic Games, Inc.
