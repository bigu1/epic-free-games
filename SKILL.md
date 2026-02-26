# Epic Free Games Claimer

Automatically claim free weekly games from the Epic Games Store.

## Description

This skill queries Epic Games Store for free game promotions and claims them automatically using browser automation (Playwright). It supports:

- **Listing** current and upcoming free games (no login required)
- **Auto-claiming** free games via browser automation
- **Notifications** via stdout, webhook, or integrated with OpenClaw channels
- **Session persistence** — login once, sessions are saved for future runs
- **Cron scheduling** — set and forget, runs weekly

## Setup

```bash
cd epic-free-games
bash scripts/setup.sh
```

This will:
1. Install Node.js dependencies
2. Install Playwright Chromium browser
3. Guide you through first-time Epic Games login

## Usage

```bash
# List free games (no login needed)
node src/index.js --list

# Login to Epic Games (opens browser window)
node src/index.js --login

# Claim all free games
node src/index.js --claim
```

## Cron (OpenClaw)

Recommended schedule: **Every Thursday at 00:30** (Epic updates free games on Thursdays).

```
cron: 0 0 * * 4
stagger: 30m
```

Task prompt for cron:
```
Run the Epic free games claimer: cd /path/to/epic-free-games && bash scripts/claim.sh
Report results to the user.
```

## Configuration

Copy `.env.example` to `.env` and edit as needed. All settings are optional — you can also login interactively.

## Requirements

- Node.js >= 18
- Playwright (installed automatically)
- Epic Games account

## Triggers

- "claim epic games", "epic free games", "free games this week"
- "what's free on epic", "领取 epic 免费游戏"
