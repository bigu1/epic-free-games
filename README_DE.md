# 🎮 Epic Free Games Claimer

Fordere automatisch die wöchentlichen Gratisspiele im [Epic Games Store](https://store.epicgames.com/free-games) an. Verpasse nie wieder ein Gratisspiel!

[🌍 Andere Sprachen](README.md)

## Funktionen

- 📋 **Auflisten** — aktuelle und kommende Gratisspiele anzeigen (kein Login nötig)
- 🤖 **Automatisch einlösen** — per Browser-Automatisierung
- 🔐 **Einmal anmelden** — Sitzungen bleiben zwischen Ausführungen bestehen
- 👥 **Multi-Account-Unterstützung** — Konfiguration über `data/config.json`
- 🔔 **Benachrichtigungen** — Webhook (Telegram, Discord, etc.)
- ⏰ **Zeitplanung** — Cron / GitHub Actions
- 🐳 **Docker-Unterstützung**

## Schnellstart

```bash
git clone https://github.com/bigu1/epic-free-games.git
cd epic-free-games
bash scripts/setup.sh
```

Manuelle Einrichtung:

```bash
npm install
npx playwright install firefox
node src/index.js --login    # Bei Epic Games anmelden
node src/index.js --claim    # Gratisspiele einlösen!
```

## Verwendung

```bash
# Gratisspiele dieser Woche anzeigen
node src/index.js --list

# Bei Epic Games anmelden
node src/index.js --login

# Alle Gratisspiele einlösen
node src/index.js --claim

# Testlauf (ohne tatsächliches Einlösen)
DRYRUN=1 node src/index.js --claim

# Status prüfen
node src/index.js --status
```

## Konfiguration

`.env.example` nach `.env` kopieren:

```bash
cp .env.example .env
```

| Variable | Erforderlich | Beschreibung |
|----------|-------------|--------------|
| `EG_EMAIL` | Nein | Epic Games Konto-E-Mail |
| `EG_PASSWORD` | Nein | Epic Games Passwort |
| `EG_OTPKEY` | Nein | TOTP-Geheimnis für 2FA |
| `HEADLESS` | Nein | `0` = Browser anzeigen, `1` = unsichtbar |
| `WEBHOOK_URL` | Nein | Webhook-URL für Benachrichtigungen |
| `DRYRUN` | Nein | `1` = keine tatsächlichen Käufe |

## Zeitplanung

### Cron (Linux / macOS)

Epic aktualisiert die Gratisspiele jeden Donnerstag:

```bash
# Jeden Donnerstag um 00:30
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

## Docker

```bash
docker compose build
docker compose run epic-free-games node src/index.js --login
docker compose up
```

## Multi-Account

`data/config.json` erstellen:

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "SECRET" }
  ]
}
```

## Lizenz

[MIT](LICENSE)

## Haftungsausschluss

Dieses Tool automatisiert Browser-Interaktionen mit dem Epic Games Store. Nutzung auf eigene Gefahr. Dieses Projekt ist nicht mit Epic Games, Inc. verbunden oder von ihnen unterstützt.
