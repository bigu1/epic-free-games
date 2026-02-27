# 🎮 Epic Free Games Claimer

Reclama automáticamente los juegos gratuitos semanales de [Epic Games Store](https://store.epicgames.com/free-games). ¡No te pierdas ningún juego gratis!

[🌍 Otros idiomas](README.md)

## Características

- 📋 **Listar** juegos gratuitos actuales y próximos (sin necesidad de iniciar sesión)
- 🤖 **Reclamar automáticamente** mediante automatización del navegador
- 🔐 **Inicia sesión una vez** — las sesiones persisten entre ejecuciones
- 👥 **Soporte multi-cuenta** — configuración vía `data/config.json`
- 🔔 **Notificaciones** — Webhook (Telegram, Discord, etc.)
- ⏰ **Programación** — Cron / GitHub Actions
- 🐳 **Soporte Docker**

## Inicio rápido

```bash
git clone https://github.com/bigu1/epic-free-games.git
cd epic-free-games
bash scripts/setup.sh
```

Configuración manual:

```bash
npm install
npx playwright install firefox
node src/index.js --login    # Iniciar sesión en Epic Games
node src/index.js --claim    # ¡Reclamar juegos gratis!
```

## Uso

```bash
# Listar juegos gratuitos de esta semana
node src/index.js --list

# Iniciar sesión en Epic Games
node src/index.js --login

# Reclamar todos los juegos gratuitos
node src/index.js --claim

# Ejecución de prueba (sin reclamar)
DRYRUN=1 node src/index.js --claim

# Verificar estado
node src/index.js --status
```

## Configuración

Copiar `.env.example` a `.env`:

```bash
cp .env.example .env
```

| Variable | Requerido | Descripción |
|----------|-----------|-------------|
| `EG_EMAIL` | No | Email de la cuenta de Epic Games |
| `EG_PASSWORD` | No | Contraseña de Epic Games |
| `EG_OTPKEY` | No | Secreto TOTP para 2FA |
| `HEADLESS` | No | `0` para mostrar el navegador, `1` para modo invisible |
| `WEBHOOK_URL` | No | URL del Webhook para notificaciones |
| `DRYRUN` | No | `1` para omitir compras reales |

## Programación

### Cron (Linux / macOS)

Epic actualiza los juegos gratuitos cada jueves:

```bash
# Cada jueves a las 00:30
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

## Docker

```bash
docker compose build
docker compose run epic-free-games node src/index.js --login
docker compose up
```

## Multi-cuenta

Crear `data/config.json`:

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "SECRET" }
  ]
}
```

## Licencia

[MIT](LICENSE)

## Aviso legal

Esta herramienta automatiza interacciones del navegador con Epic Games Store. Úsala bajo tu propio riesgo. Este proyecto no está afiliado ni respaldado por Epic Games, Inc.
