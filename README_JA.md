# 🎮 Epic 無料ゲーム自動取得ツール

[Epic Games Store](https://store.epicgames.com/free-games) の毎週無料ゲームを自動で取得します。無料ゲームを見逃しません！

[🌍 他の言語](README.md)

## 特徴

- 📋 **一覧表示** — 今週・来週の無料ゲームを確認（ログイン不要）
- 🤖 **自動取得** — ブラウザ自動化でワンクリック取得
- 🔐 **一度ログイン** — セッションが保持され、次回以降は自動
- 👥 **複数アカウント対応** — `data/config.json` で設定
- 🔔 **通知** — Webhook（Telegram、Discord など）
- ⏰ **スケジュール実行** — Cron / GitHub Actions 対応
- 🐳 **Docker 対応**

## クイックスタート

```bash
git clone https://github.com/bigu1/epic-free-games.git
cd epic-free-games
bash scripts/setup.sh
```

手動セットアップ：

```bash
npm install
npx playwright install firefox
node src/index.js --login    # Epic Gamesにログイン（ブラウザが開きます）
node src/index.js --claim    # 無料ゲームを取得！
```

## 使い方

```bash
# 今週の無料ゲームを表示（ログイン不要）
node src/index.js --list

# Epic Gamesにログイン（ブラウザウィンドウが開きます）
node src/index.js --login

# 無料ゲームをすべて取得
node src/index.js --claim

# テスト実行（実際には取得しない）
DRYRUN=1 node src/index.js --claim

# ステータス確認
node src/index.js --status
```

## 設定

`.env.example` を `.env` にコピー：

```bash
cp .env.example .env
```

| 変数 | 必須 | 説明 |
|------|------|------|
| `EG_EMAIL` | いいえ | Epic Games アカウントメール |
| `EG_PASSWORD` | いいえ | Epic Games パスワード |
| `EG_OTPKEY` | いいえ | 2FA TOTPシークレット |
| `HEADLESS` | いいえ | `0` でブラウザ表示、`1` でバックグラウンド |
| `WEBHOOK_URL` | いいえ | 通知用Webhook URL |
| `DRYRUN` | いいえ | `1` で取得をスキップ |

> **ヒント**: 認証情報は任意です。`--login` でブラウザから手動ログインも可能です。

## スケジュール設定

### Cron（Linux / macOS）

Epic は毎週木曜日に無料ゲームを更新します：

```bash
# 毎週木曜 00:30 に実行
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

## Docker

```bash
docker compose build
docker compose run epic-free-games node src/index.js --login
docker compose up
```

## 複数アカウント

`data/config.json` を作成：

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "SECRET" }
  ]
}
```

## ライセンス

[MIT](LICENSE)

## 免責事項

本ツールは Epic Games Store とのブラウザ操作を自動化するものです。自己責任でご使用ください。Epic Games, Inc. とは一切関係ありません。
