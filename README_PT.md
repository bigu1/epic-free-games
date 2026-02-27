# 🎮 Epic Free Games Claimer

Resgate automaticamente os jogos gratuitos semanais da [Epic Games Store](https://store.epicgames.com/free-games). Nunca mais perca um jogo grátis!

[🌍 Outros idiomas](README.md)

## Recursos

- 📋 **Listar** jogos gratuitos atuais e futuros (sem login)
- 🤖 **Resgate automático** via automação do navegador
- 🔐 **Login único** — sessões persistem entre execuções
- 👥 **Multi-contas** — configuração via `data/config.json`
- 🔔 **Notificações** — Webhook (Telegram, Discord, etc.)
- ⏰ **Agendamento** — Cron / GitHub Actions
- 🐳 **Suporte Docker**

## Início rápido

```bash
git clone https://github.com/bigu1/epic-free-games.git
cd epic-free-games
bash scripts/setup.sh
```

Configuração manual:

```bash
npm install
npx playwright install firefox
node src/index.js --login    # Fazer login na Epic Games
node src/index.js --claim    # Resgatar jogos grátis!
```

## Uso

```bash
# Listar jogos gratuitos da semana
node src/index.js --list

# Fazer login na Epic Games
node src/index.js --login

# Resgatar todos os jogos gratuitos
node src/index.js --claim

# Execução de teste (sem resgatar)
DRYRUN=1 node src/index.js --claim

# Verificar status
node src/index.js --status
```

## Configuração

Copiar `.env.example` para `.env`:

```bash
cp .env.example .env
```

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `EG_EMAIL` | Não | Email da conta Epic Games |
| `EG_PASSWORD` | Não | Senha da Epic Games |
| `EG_OTPKEY` | Não | Segredo TOTP para 2FA |
| `HEADLESS` | Não | `0` para mostrar navegador, `1` para modo invisível |
| `WEBHOOK_URL` | Não | URL do Webhook para notificações |
| `DRYRUN` | Não | `1` para pular compras reais |

## Agendamento

### Cron (Linux / macOS)

A Epic atualiza os jogos gratuitos toda quinta-feira:

```bash
# Toda quinta-feira às 00:30
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

## Docker

```bash
docker compose build
docker compose run epic-free-games node src/index.js --login
docker compose up
```

## Multi-contas

Criar `data/config.json`:

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "SECRET" }
  ]
}
```

## Licença

[MIT](LICENSE)

## Aviso legal

Esta ferramenta automatiza interações do navegador com a Epic Games Store. Use por sua conta e risco. Este projeto não é afiliado nem endossado pela Epic Games, Inc.
