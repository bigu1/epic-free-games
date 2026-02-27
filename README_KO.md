# 🎮 Epic 무료 게임 자동 수령 도구

[Epic Games Store](https://store.epicgames.com/free-games)에서 매주 무료 게임을 자동으로 수령합니다. 다시는 무료 게임을 놓치지 마세요!

[🌍 다른 언어](README.md)

## 기능

- 📋 **목록 확인** — 이번 주 및 예정된 무료 게임 확인 (로그인 불필요)
- 🤖 **자동 수령** — 브라우저 자동화를 통한 수령
- 🔐 **한 번 로그인** — 세션이 유지되어 다음 실행 시 자동 적용
- 👥 **다중 계정 지원** — `data/config.json`으로 설정
- 🔔 **알림** — Webhook (Telegram, Discord 등)
- ⏰ **예약 실행** — Cron / GitHub Actions 지원
- 🐳 **Docker 지원**

## 빠른 시작

```bash
git clone https://github.com/bigu1/epic-free-games.git
cd epic-free-games
bash scripts/setup.sh
```

수동 설정:

```bash
npm install
npx playwright install firefox
node src/index.js --login    # Epic Games 로그인 (브라우저 창이 열립니다)
node src/index.js --claim    # 무료 게임 수령!
```

## 사용법

```bash
# 이번 주 무료 게임 확인 (로그인 불필요)
node src/index.js --list

# Epic Games 로그인 (브라우저 창 열림)
node src/index.js --login

# 모든 무료 게임 수령
node src/index.js --claim

# 테스트 실행 (실제 수령 안 함)
DRYRUN=1 node src/index.js --claim

# 상태 확인
node src/index.js --status
```

## 설정

`.env.example`을 `.env`로 복사:

```bash
cp .env.example .env
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `EG_EMAIL` | 아니오 | Epic Games 계정 이메일 |
| `EG_PASSWORD` | 아니오 | Epic Games 비밀번호 |
| `EG_OTPKEY` | 아니오 | 2FA TOTP 시크릿 |
| `HEADLESS` | 아니오 | `0`이면 브라우저 표시, `1`이면 백그라운드 |
| `WEBHOOK_URL` | 아니오 | 알림용 Webhook URL |
| `DRYRUN` | 아니오 | `1`이면 실제 수령 건너뜀 |

> **팁**: 자격 증명은 선택 사항입니다. `--login`으로 브라우저에서 수동 로그인할 수 있습니다.

## 예약 실행

### Cron (Linux / macOS)

Epic은 매주 목요일에 무료 게임을 업데이트합니다:

```bash
# 매주 목요일 00:30에 실행
30 0 * * 4 cd /path/to/epic-free-games && node src/index.js --claim >> /tmp/epic-free-games.log 2>&1
```

## Docker

```bash
docker compose build
docker compose run epic-free-games node src/index.js --login
docker compose up
```

## 다중 계정

`data/config.json` 생성:

```json
{
  "accounts": [
    { "email": "user1@example.com", "password": "pass1", "otpkey": "" },
    { "email": "user2@example.com", "password": "pass2", "otpkey": "SECRET" }
  ]
}
```

## 라이센스

[MIT](LICENSE)

## 면책 조항

이 도구는 Epic Games Store와의 브라우저 상호작용을 자동화합니다. 사용에 따른 책임은 본인에게 있습니다. 이 프로젝트는 Epic Games, Inc.와 무관합니다.
