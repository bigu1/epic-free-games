# 🎮 Epic 免费游戏自动领取

自动领取 [Epic Games Store](https://store.epicgames.com/free-games) 每周免费游戏，再也不会错过白嫖！

同时也是 [OpenClaw](https://openclaw.ai) Skill，可以直接集成到 AI 助手的自动化工作流中。

## 功能

- 📋 **查询** — 查看本周和即将到来的免费游戏（无需登录）
- 🤖 **自动领取** — 浏览器自动化完成领取流程
- 🔐 **一次登录** — 会话持久化，后续运行自动复用
- 🔔 **通知** — 支持 Webhook（Telegram、Discord、Bark 等）
- ⏰ **定时任务** — 配合 Cron 每周自动运行
- 🧩 **OpenClaw Skill** — AI 助手集成

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/user/epic-free-games.git
cd epic-free-games

# 一键安装（依赖 + 浏览器 + 首次登录引导）
bash scripts/setup.sh
```

手动安装：

```bash
npm install
npx playwright install chromium
node src/index.js --login    # 登录 Epic Games（弹出浏览器窗口）
node src/index.js --claim    # 领取免费游戏！
```

## 使用方法

```bash
# 查看本周免费游戏（无需登录）
node src/index.js --list

# JSON 格式输出
node src/index.js --list --json

# 登录 Epic Games（打开浏览器窗口）
node src/index.js --login

# 领取所有免费游戏
node src/index.js --claim

# 测试运行（不实际领取）
DRYRUN=1 node src/index.js --claim
```

## 配置

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

| 变量 | 必填 | 说明 |
|------|------|------|
| `EG_EMAIL` | 否 | Epic Games 账号邮箱（用于自动登录） |
| `EG_PASSWORD` | 否 | Epic Games 密码 |
| `EG_OTPKEY` | 否 | 2FA TOTP 密钥（自动生成验证码） |
| `HEADLESS` | 否 | `0` 显示浏览器，`1` 后台运行（默认） |
| `WEBHOOK_URL` | 否 | 通知 Webhook 地址 |
| `DRYRUN` | 否 | `1` 仅模拟不实际领取 |
| `DATA_DIR` | 否 | 自定义数据目录（默认 `./data`） |

> **提示**：凭据不是必填的，可以用 `--login` 在浏览器中手动登录。

## 定时任务

### Cron（Linux / macOS）

Epic 每周四更新免费游戏，建议的 cron 配置：

```bash
# 每周四 00:30 执行
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

### OpenClaw Skill

如果你使用 [OpenClaw](https://openclaw.ai)，本项目可以作为 Skill 直接使用。详见 [SKILL.md](SKILL.md)。

## 工作原理

1. **查询** — 通过 Epic 公开 API 获取免费游戏列表（无需认证）
2. **登录** — 使用 Playwright 持久化浏览器上下文保持登录状态
3. **领取** — 自动导航到每个免费游戏页面，完成领取流程
4. **通知** — 通过控制台和可选的 Webhook 发送结果

### 认证方式

首次运行时，脚本会打开可见的浏览器窗口让你手动登录。登录后 Cookie 保存到 `data/browser-profile/`，后续以无头模式复用。

Session 过期时会收到通知，重新运行 `--login` 即可。

### 验证码处理

Epic 可能偶尔显示 hCaptcha 验证码。检测到时：
- 保存截图用于调试
- 发送通知提醒手动处理
- 游戏标记为 `captcha_blocked`

减少验证码出现的方法：不要太频繁运行，避免使用数据中心 IP。

## 项目结构

```
epic-free-games/
├── src/
│   ├── index.js        # CLI 入口
│   ├── config.js       # 配置管理
│   ├── epic-api.js     # Epic 公开 API（查询免费游戏）
│   ├── claimer.js      # 浏览器自动化（Playwright）
│   ├── notifier.js     # 通知系统
│   └── utils.js        # 工具函数
├── scripts/
│   ├── setup.sh        # 首次安装
│   ├── claim.sh        # Cron 调用脚本
│   └── login.sh        # 手动登录
├── SKILL.md            # OpenClaw Skill 描述
└── data/               # 运行时数据（不上传 Git）
    ├── browser-profile/  # 浏览器会话
    ├── claimed.json      # 领取记录
    └── screenshots/      # 调试截图
```

## Docker

```bash
# 构建并运行
docker compose build
docker compose run epic-free-games node src/index.js --list

# 登录（需要交互式终端）
docker compose run epic-free-games node src/index.js --login

# 领取
docker compose up
```

浏览器 profile 和领取记录通过 Docker volume 持久化在 `./data/` 目录。

## 多账号

创建 `data/config.json`：

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "TOTP_SECRET" }
  ]
}
```

每个账号有独立的浏览器 profile 目录，脚本会依次为所有账号领取免费游戏。

## GitHub Actions

本仓库包含 GitHub Actions 工作流，每周四自动运行。使用方法：

1. Fork 本仓库
2. 进入 Settings → Secrets and variables → Actions
3. 添加 Secrets：`EG_EMAIL`、`EG_PASSWORD`、`EG_OTPKEY`（可选）、`WEBHOOK_URL`（可选）
4. 在 Actions 页面启用工作流

## 常见问题

### "Not logged in" 错误
运行 `node src/index.js --login` 重新登录。

### 每次都出验证码
- 使用家庭网络 IP（不要用 VPN / 机房 IP）
- 降低运行频率
- 清除 `data/browser-profile/` 后重新登录

### 浏览器崩溃
- 确保有足够内存（Chromium 需要约 500MB）
- 尝试：`npx playwright install chromium --with-deps`

## 致谢

参考项目：
- [vogler/free-games-claimer](https://github.com/vogler/free-games-claimer) — Playwright 自动化方案
- [claabs/epicgames-freegames-node](https://github.com/claabs/epicgames-freegames-node) — API 端点参考

## License

[MIT](LICENSE)

## 免责声明

本工具自动化浏览器与 Epic Games Store 的交互操作。使用风险自负。本项目与 Epic Games, Inc. 无关联。
