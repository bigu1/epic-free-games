# Epic Free Games Claimer — 项目计划

## 项目概述

自动领取 Epic Games Store 每周免费游戏的 OpenClaw Skill，可分享至 GitHub/ClawHub。

## 竞品调研总结

| 项目 | Stars | 语言 | 领取方式 | 现状 |
|------|-------|------|----------|------|
| vogler/free-games-claimer | 3993 | JS/Playwright | 浏览器自动化（完整领取） | ✅ 活跃维护 |
| claabs/epicgames-freegames-node | 2236 | TS/Puppeteer | 仅发送结账链接 | ✅ 活跃 |
| Revadike/epicgames-freebies-claimer | 2244 | JS | API 调用 | ❌ 因 hCaptcha 失效 |
| QIN2DIM/epic-awesome-gamer | 1097 | Python | Playwright + AI 验证码 | ✅ 用 Gemini 解 hCaptcha |

### 关键技术发现

1. **纯 API 方式已死** — Epic 在 purchase 环节强制 hCaptcha，纯 HTTP 请求无法完成领取
2. **浏览器自动化是主流** — Playwright/Puppeteer 持久化上下文 + 模拟真人操作
3. **验证码是最大障碍** — 首次登录和领取时可能触发 hCaptcha
4. **Device Auth 可用于认证** — Epic 支持 OAuth2 Device Code flow，适合无头环境
5. **Cookie 持久化有效** — 登录一次后 cookie 可维持较长时间（days~weeks）

## 技术方案

### 核心选型

| 决策 | 选择 | 理由 |
|------|------|------|
| 语言 | Node.js | Playwright 原生支持，社区生态好 |
| 浏览器引擎 | Playwright Chromium | 兼容性最好，支持 persistent context |
| 认证 | 持久化浏览器上下文 | 登录一次，cookie 自动保存 |
| 验证码 | 通知用户手动解决 / AI solver (可选) | hCaptcha 有反自动化检测 |
| 发布形态 | OpenClaw Skill | 支持 cron、通知、分享 |

### 工作流程

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐
│ 1. 查询免费  │ ──→ │ 2. 检查库存  │ ──→ │ 3. 自动领取  │ ──→ │ 4. 通知    │
│    游戏列表  │     │    是否已拥有 │     │    (浏览器)   │     │    结果    │
└─────────────┘     └──────────────┘     └──────────────┘     └────────────┘
   (公开 API)          (需认证)             (需认证+过验证码)     (Telegram等)
```

### 认证流程

```
首次运行:
  1. Playwright 启动浏览器（可见模式）
  2. 打开 Epic 登录页
  3. 用户在浏览器中登录（支持 email/password, 2FA）
  4. 登录成功后 cookie 保存到 data/browser-profile/
  
后续运行:
  1. Playwright 加载持久化上下文（headless 模式）
  2. 自动使用已保存的 cookie
  3. 如果 cookie 过期 → 通知用户重新登录
```

## 项目结构

```
epic-free-games/
├── README.md                   # GitHub 项目说明
├── README_CN.md                # 中文说明
├── LICENSE                     # MIT License
├── package.json                # Node.js 依赖
├── .gitignore                  # 忽略 data/, node_modules/ 等
├── .env.example                # 环境变量模板
│
├── SKILL.md                    # OpenClaw Skill 描述文件
│
├── src/
│   ├── index.js                # 主入口：编排整个领取流程
│   ├── config.js               # 配置管理（环境变量 + 配置文件）
│   ├── epic-api.js             # Epic 公开 API（查询免费游戏列表）
│   ├── claimer.js              # 浏览器自动化领取逻辑
│   ├── auth.js                 # 认证管理（登录、session 检查）
│   ├── notifier.js             # 通知（stdout / webhook / 可扩展）
│   └── utils.js                # 工具函数
│
├── scripts/
│   ├── setup.sh                # 首次配置脚本（npm install + 首次登录）
│   ├── claim.sh                # 领取脚本（cron 调用）
│   └── login.sh                # 手动登录脚本
│
└── data/                       # 运行时数据（.gitignore）
    ├── browser-profile/        # Playwright 持久化浏览器数据
    ├── claimed.json            # 已领取游戏记录
    └── screenshots/            # 调试截图
```

## 开发计划

### Phase 1: 基础框架 ✅

**目标**: 查询免费游戏 + 项目骨架

- [x] 项目结构搭建
- [x] package.json + 依赖声明
- [x] config.js — 配置管理
- [x] epic-api.js — 查询当前免费游戏（公开 API，无需认证）
- [x] 基础 CLI 入口 (node src/index.js --list)
- [x] README.md 初版
- [x] .gitignore, LICENSE, .env.example

### Phase 2: 浏览器自动化领取 ✅ (待实测)

**目标**: 完成核心领取流程

- [x] login 功能 — 首次登录 + session 持久化 (集成在 claimer.js)
- [x] claimer.js — 浏览器自动化领取（Playwright）
  - [x] 检测 "Free Now" 游戏
  - [x] 点击 "Get" → 处理 purchase iframe → "Place Order"
  - [x] 处理年龄验证、EULA、mature content 等弹窗
  - [x] 检测 "Already in library" 状态
  - [x] Bundle 检测与标题处理
- [x] claimed.json 记录管理
- [x] 错误截图保存
- [ ] **⏳ 实际登录 + 领取测试**（需要用户执行 --login）

### Phase 3: 通知 + 健壮性 ✅

**目标**: 可靠的通知和错误处理

- [x] notifier.js — 通知系统
  - [x] stdout（控制台输出）
  - [x] webhook（通用，可对接 Telegram/Discord/Bark 等）
- [x] hCaptcha 检测 + 通知用户手动处理
- [x] Cookie 过期检测 + 重新登录通知
- [x] 重试逻辑（最多 2 次重试）
- [x] --status 命令（登录状态 + 领取历史 + 当前免费游戏）

### Phase 4: OpenClaw Skill 集成 ✅

**目标**: 打包成可分享的 Skill

- [x] SKILL.md — Skill 描述文件
- [x] scripts/setup.sh — 一键配置
- [x] scripts/claim.sh — Cron 调用入口
- [x] scripts/login.sh — 手动登录
- [x] cron 配置建议（每周四 00:30 执行）
- [x] 文档完善（README + README_CN）

### Phase 5: 高级功能

- [x] 多账号支持（data/config.json + 独立 browser profile）
- [x] Docker 部署支持（Dockerfile + docker-compose.yml）
- [x] GitHub Actions 定时运行支持（.github/workflows/）
- [x] Parental Control PIN 支持
- [x] 增强反检测 stealth（plugins/languages/chrome 伪装）
- [ ] AI 验证码 solver 集成（Gemini/GPT-4V）— 可选
- [ ] DLC 自动领取 — 可选

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| hCaptcha 触发 | 无法自动领取 | 通知用户手动解决；降低运行频率 |
| Cookie 过期 | 需重新登录 | 定期检查 session 状态；通知用户 |
| Epic API 变更 | 功能失效 | 参考上游项目更新；模块化设计易于修改 |
| 账号封禁 | 严重 | 模拟真人行为；合理频率；不做暴力操作 |

## 隐私与安全

- **不存储明文密码** — 通过浏览器交互登录，密码仅在浏览器内
- **data/ 目录 .gitignore** — 浏览器 profile、cookie、截图不上传
- **.env 不上传** — 只提供 .env.example 模板
- **无硬编码凭证** — 所有敏感信息通过环境变量或运行时输入
- **MIT License** — 开源友好

## 参考项目

- [vogler/free-games-claimer](https://github.com/vogler/free-games-claimer) — 主要参考（Playwright 自动化流程）
- [claabs/epicgames-freegames-node](https://github.com/claabs/epicgames-freegames-node) — API 端点 & Device Auth 参考
- [QIN2DIM/epic-awesome-gamer](https://github.com/QIN2DIM/epic-awesome-gamer) — AI 验证码 solver 参考
