# 🎮 Epic 免费游戏自动领取器

**中文** | [English](./README.en.md)

自动领取 [Epic Games Store](https://store.epicgames.com/free-games) 每周免费游戏，再也不会错过白嫖！

---

## 功能

- 📋 **查询** 本周和即将到来的免费游戏（无需登录）
- 🤖 **自动领取** 通过浏览器自动化完成领取流程
- 🔐 **一次登录** 会话持久化，后续自动复用
- 👥 **多账号** 支持 `data/config.json` 配置
- 🔔 **通知** 支持 Webhook（Telegram、Discord、Bark 等）
- ⏰ **定时任务** 支持 Cron / GitHub Actions / 定时运行
- 🐳 **Docker** 支持容器化部署
- 🧩 **[OpenClaw](https://openclaw.ai) Skill** 支持 AI 助手集成

---

## 快速开始

```bash
git clone https://github.com/bigu1/epic-free-games.git
cd epic-free-games
bash scripts/setup.sh
```

手动安装：

```bash
npm install
npx playwright install firefox
node src/index.js --login    # 登录 Epic Games
node src/index.js --claim    # 领取免费游戏
```

---

## 使用方法

```bash
# 查看本周免费游戏（无需登录）
node src/index.js --list

# JSON 格式输出
node src/index.js --list --json

# 登录 Epic Games
node src/index.js --login

# 领取所有免费游戏
node src/index.js --claim

# 测试运行（不实际下单）
DRYRUN=1 node src/index.js --claim

# 查看状态
node src/index.js --status

# 可见模式领取
node src/index.js --claim-visible

# 单游戏调试
node src/index.js --single https://store.epicgames.com/en-US/p/cozy-grove
```

---

## 配置

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

| 变量 | 必填 | 说明 |
|---|---|---|
| `EG_EMAIL` | 否 | Epic Games 账号邮箱（用于自动登录） |
| `EG_PASSWORD` | 否 | Epic Games 密码 |
| `EG_OTPKEY` | 否 | 2FA TOTP 密钥 |
| `HEADLESS` | 否 | `0` 显示浏览器，`1` 后台运行 |
| `CHECKOUT_TIMEOUT` | 否 | Checkout / Place Order 等待超时毫秒数（默认 `60000`） |
| `WEBHOOK_URL` | 否 | 通知 Webhook 地址 |
| `DRYRUN` | 否 | `1` 仅模拟，不实际领取 |
| `DATA_DIR` | 否 | 自定义数据目录（默认：`./data`） |

> 凭据不是必填的，也可以使用 `--login` 手动登录。

---

## 定时任务

### Cron（Linux / macOS）

Epic 通常在每周四更新免费游戏：

```bash
# 每周四 00:30
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

### GitHub Actions

1. Fork 本仓库
2. 进入 Settings → Secrets，添加：`EG_EMAIL`、`EG_PASSWORD`、`EG_OTPKEY`、`WEBHOOK_URL`
3. 启用 Actions 工作流

### OpenClaw Skill

详见 [SKILL.md](./SKILL.md)

---

## 工作原理

```text
查询免费游戏 ──→ 检查是否已拥有 ──→ 自动领取 ──→ 发送通知
 (公开 API)       (需要认证)         (浏览器自动化)    (Webhook)
```

### 认证

首次运行时会打开浏览器供你手动登录。Cookie 会保存到 `data/browser-profile/`，后续可在 headless 模式下自动复用。会话过期时，程序会通知你重新登录。

### 验证码 / Captcha

现在脚本会把验证码当成**明确状态**处理，而不是继续盲目重试：

- 检测到验证码会记录为 `captcha_blocked`
- 自动停止重复重试，避免把同一 IP / profile 越打越脏
- 保存截图、原因和 `details`，并发送结构化通知
- 结果会写入 `claimed.json`，方便后续排查

为了减少触发概率，建议：

- 使用干净的家庭网络 IP
- 避免过于激进的重试频率
- 尽量保持稳定的浏览器 profile / session

---

## Docker

```bash
docker compose build
docker compose run epic-free-games node src/index.js --login   # 登录
docker compose up                                               # 自动领取
```

---

## 多账号

创建 `data/config.json`：

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "SECRET" }
  ]
}
```

每个账号都会使用独立的 browser profile。

---

## 项目结构

```text
epic-free-games/
├── src/
│   ├── index.js        # CLI 入口
│   ├── config.js       # 配置管理
│   ├── epic-api.js     # Epic 公开 API
│   ├── claimer.js      # 浏览器自动化
│   ├── notifier.js     # 通知系统
│   └── utils.js        # 工具函数
├── scripts/
│   ├── setup.sh        # 首次安装
│   ├── claim.sh        # Cron 脚本
│   └── login.sh        # 手动登录
├── SKILL.md            # OpenClaw Skill
└── data/               # 运行时数据（已 gitignore）
```

---

## 常见问题

**提示 `Not logged in`**  
运行 `node src/index.js --login`

**每次都出验证码**  
优先换成干净的家庭 IP；脚本现在会把这类情况标记为 `captcha_blocked`，并停止盲重试。必要时可删除 `data/browser-profile/` 后重新登录。

**日志里看到 `payment_iframe_timeout` / `place_order_not_found`**  
这通常表示页面流程异常，不一定是验证码。建议先查看 `claimed.json` 里的 `reason` / `details` / `screenshotPath`。如果只是 checkout 加载慢，可调大 `CHECKOUT_TIMEOUT`。

**日志里看到带 security check / Cloudflare 信息的 `captcha_blocked`**  
说明 Epic 在 Place Order 出现前拦截了 checkout iframe。请运行 `HEADLESS=0 node src/index.js --claim-visible`，在可见浏览器里手动完成验证，或换更干净的网络 / session 后重试。

**浏览器崩溃 / 页面关闭**  
确保机器有足够内存（约 500MB 以上）；现在脚本会单独记录 `page_closed`，不会再让截图失败覆盖主因。

---

## 致谢

- [vogler/free-games-claimer](https://github.com/vogler/free-games-claimer) — Playwright 自动化方案
- [claabs/epicgames-freegames-node](https://github.com/claabs/epicgames-freegames-node) — API 端点参考

## License

[MIT](./LICENSE)

## 免责声明

本工具会自动化浏览器与 Epic Games Store 的交互操作。使用风险自负。本项目与 Epic Games, Inc. 无关联。
