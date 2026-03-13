# 🎮 Epic 免费游戏自动领取 / Epic Free Games Claimer

自动领取 [Epic Games Store](https://store.epicgames.com/free-games) 每周免费游戏，再也不会错过白嫖！

Automatically claim free weekly games from the [Epic Games Store](https://store.epicgames.com/free-games). Never miss a free game again!

---

## 功能 / Features

- 📋 **查询** 本周和即将到来的免费游戏（无需登录）/ List current & upcoming free games (no login required)
- 🤖 **自动领取** 浏览器自动化完成领取流程 / Auto-claim via browser automation
- 🔐 **一次登录** 会话持久化，后续自动复用 / Login once, sessions persist
- 👥 **多账号** 支持 `data/config.json` 配置 / Multi-account support
- 🔔 **通知** Webhook（Telegram、Discord、Bark 等）/ Webhook notifications
- ⏰ **定时任务** Cron / GitHub Actions / Scheduled runs
- 🐳 **Docker** 容器化部署 / Containerized deployment
- 🧩 **[OpenClaw](https://openclaw.ai) Skill** AI 助手集成 / AI agent integration

---

## 快速开始 / Quick Start

```bash
git clone https://github.com/bigu1/epic-free-games.git
cd epic-free-games
bash scripts/setup.sh
```

手动安装 / Manual setup:

```bash
npm install
npx playwright install firefox
node src/index.js --login    # 登录 Epic Games / Login to Epic Games
node src/index.js --claim    # 领取免费游戏！/ Claim free games!
```

---

## 使用方法 / Usage

```bash
# 查看本周免费游戏（无需登录）/ List free games (no login)
node src/index.js --list

# JSON 格式输出 / JSON output
node src/index.js --list --json

# 登录 Epic Games / Login (opens browser window)
node src/index.js --login

# 领取所有免费游戏 / Claim all free games
node src/index.js --claim

# 测试运行 / Dry run (skip actual purchases)
DRYRUN=1 node src/index.js --claim

# 查看状态 / Check status
node src/index.js --status

# 可见模式领取 / Claim with visible browser
node src/index.js --claim-visible

# 单游戏调试 / Claim one specific game URL
node src/index.js --single https://store.epicgames.com/en-US/p/cozy-grove
```

---

## 配置 / Configuration

复制 `.env.example` 为 `.env` / Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| 变量 / Variable | 必填 / Required | 说明 / Description |
|---|---|---|
| `EG_EMAIL` | 否 / No | Epic Games 账号邮箱 / Account email (for auto-login) |
| `EG_PASSWORD` | 否 / No | Epic Games 密码 / Account password |
| `EG_OTPKEY` | 否 / No | 2FA TOTP 密钥 / TOTP secret for 2FA |
| `HEADLESS` | 否 / No | `0` 显示浏览器 `1` 后台运行 / `0` show browser, `1` headless |
| `WEBHOOK_URL` | 否 / No | 通知 Webhook 地址 / Notification webhook URL |
| `DRYRUN` | 否 / No | `1` 仅模拟 / `1` skip actual purchases |
| `DATA_DIR` | 否 / No | 自定义数据目录 / Custom data directory (default: `./data`) |

> 凭据不是必填的，可以用 `--login` 手动登录。
> Credentials are optional — you can login interactively with `--login`.

---

## 定时任务 / Scheduling

### Cron (Linux / macOS)

Epic 每周四更新免费游戏 / Epic updates free games every Thursday:

```bash
# 每周四 00:30 / Every Thursday at 00:30
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

### GitHub Actions

1. Fork 本仓库 / Fork this repo
2. Settings → Secrets → 添加 / Add: `EG_EMAIL`, `EG_PASSWORD`, `EG_OTPKEY`, `WEBHOOK_URL`
3. 启用 Actions / Enable the workflow

### OpenClaw Skill

详见 / See [SKILL.md](SKILL.md)

---

## 工作原理 / How It Works

```
查询免费游戏 ──→ 检查是否已拥有 ──→ 自动领取 ──→ 通知结果
Query games  ──→ Check ownership  ──→ Auto claim ──→ Notify
 (公开 API)      (需认证/Auth)      (浏览器/Browser)  (Webhook)
```

### 认证 / Authentication

首次运行打开浏览器手动登录，Cookie 保存到 `data/browser-profile/`，后续 headless 自动复用。Session 过期时通知重新登录。

On first run, a browser window opens for manual login. Cookies are saved to `data/browser-profile/` and reused in headless mode. You'll be notified when the session expires.

### 验证码 / Captcha

现在脚本会把验证码当成**明确状态**处理，而不是继续傻重试：
- 检测到验证码会记录为 `captcha_blocked`
- 自动停止盲重试，避免把同一 IP / profile 越打越脏
- 保存截图、原因、details，并发送结构化通知
- 结果会写入 `claimed.json`，便于后续排查

To reduce triggers: use a clean residential IP, avoid aggressive retries, and keep a stable browser profile/session.

---

## Docker

```bash
docker compose build
docker compose run epic-free-games node src/index.js --login   # 登录 / Login
docker compose up                                               # 领取 / Claim
```

---

## 多账号 / Multi-Account

创建 / Create `data/config.json`:

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "SECRET" }
  ]
}
```

每个账号独立 browser profile / Each account gets its own browser profile.

---

## 项目结构 / Project Structure

```
epic-free-games/
├── src/
│   ├── index.js        # CLI 入口 / Entry point
│   ├── config.js       # 配置管理 / Configuration
│   ├── epic-api.js     # Epic 公开 API / Public API
│   ├── claimer.js      # 浏览器自动化 / Browser automation
│   ├── notifier.js     # 通知系统 / Notifications
│   └── utils.js        # 工具函数 / Utilities
├── scripts/
│   ├── setup.sh        # 首次安装 / First-time setup
│   ├── claim.sh        # Cron 脚本 / Cron script
│   └── login.sh        # 手动登录 / Manual login
├── SKILL.md            # OpenClaw Skill
└── data/               # 运行时数据（gitignored）/ Runtime data
```

---

## 常见问题 / FAQ

**"Not logged in" 错误** → 运行 `node src/index.js --login` / Run `--login`

**每次都出验证码** → 优先换成干净家庭 IP；脚本现在会把这类情况标成 `captcha_blocked`，并停止盲重试。必要时清除 `data/browser-profile/` 后重新登录。

**日志里看到 `payment_iframe_timeout` / `place_order_not_found`** → 这是页面流程异常，不一定是验证码；先看 `claimed.json` 里的 `reason/details/screenshotPath` 再判断。

**浏览器崩溃 / 页面关闭** → 确保有足够内存（~500MB）；现在脚本会单独记录 `page_closed`，不会再让截图失败覆盖主因。

---

## 致谢 / Credits

- [vogler/free-games-claimer](https://github.com/vogler/free-games-claimer) — Playwright 自动化方案
- [claabs/epicgames-freegames-node](https://github.com/claabs/epicgames-freegames-node) — API 端点参考

## License

[MIT](LICENSE)

## 免责声明 / Disclaimer

本工具自动化浏览器与 Epic Games Store 的交互操作。使用风险自负。本项目与 Epic Games, Inc. 无关联。

This tool automates browser interactions with the Epic Games Store. Use at your own risk. Not affiliated with Epic Games, Inc.
