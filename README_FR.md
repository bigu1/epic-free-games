# 🎮 Epic Free Games Claimer

Réclamez automatiquement les jeux gratuits hebdomadaires de l'[Epic Games Store](https://store.epicgames.com/free-games). Ne manquez plus jamais un jeu gratuit !

[🌍 Autres langues](README.md)

## Fonctionnalités

- 📋 **Lister** les jeux gratuits actuels et à venir (sans connexion)
- 🤖 **Réclamation automatique** via l'automatisation du navigateur
- 🔐 **Connexion unique** — les sessions persistent entre les exécutions
- 👥 **Multi-comptes** — configuration via `data/config.json`
- 🔔 **Notifications** — Webhook (Telegram, Discord, etc.)
- ⏰ **Planification** — Cron / GitHub Actions
- 🐳 **Support Docker**

## Démarrage rapide

```bash
git clone https://github.com/bigu1/epic-free-games.git
cd epic-free-games
bash scripts/setup.sh
```

Configuration manuelle :

```bash
npm install
npx playwright install firefox
node src/index.js --login    # Se connecter à Epic Games
node src/index.js --claim    # Réclamer les jeux gratuits !
```

## Utilisation

```bash
# Lister les jeux gratuits de la semaine
node src/index.js --list

# Se connecter à Epic Games
node src/index.js --login

# Réclamer tous les jeux gratuits
node src/index.js --claim

# Exécution test (sans réclamer)
DRYRUN=1 node src/index.js --claim

# Vérifier le statut
node src/index.js --status
```

## Configuration

Copier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

| Variable | Requis | Description |
|----------|--------|-------------|
| `EG_EMAIL` | Non | Email du compte Epic Games |
| `EG_PASSWORD` | Non | Mot de passe Epic Games |
| `EG_OTPKEY` | Non | Secret TOTP pour 2FA |
| `HEADLESS` | Non | `0` pour afficher le navigateur, `1` pour mode invisible |
| `WEBHOOK_URL` | Non | URL Webhook pour notifications |
| `DRYRUN` | Non | `1` pour sauter les achats réels |

## Planification

### Cron (Linux / macOS)

Epic met à jour les jeux gratuits chaque jeudi :

```bash
# Chaque jeudi à 00h30
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

## Docker

```bash
docker compose build
docker compose run epic-free-games node src/index.js --login
docker compose up
```

## Multi-comptes

Créer `data/config.json` :

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "SECRET" }
  ]
}
```

## Licence

[MIT](LICENSE)

## Avertissement

Cet outil automatise les interactions du navigateur avec l'Epic Games Store. Utilisez-le à vos propres risques. Ce projet n'est ni affilié ni approuvé par Epic Games, Inc.
