---
summary: "監控模型提供者的 OAuth 過期"
read_when:
  - Setting up auth expiry monitoring or alerts
  - Automating Claude Code / Codex OAuth refresh checks
title: "Auth Monitoring"
---

# Auth monitoring

OpenClaw 透過 `openclaw models status` 公開 OAuth 過期狀態。請將其用於
自動化和警示；腳本則是針對手機工作流程的額外選項。

## Preferred: CLI check (portable)

```bash
openclaw models status --check
```

Exit codes:

- `0`: OK
- `1`: expired or missing credentials
- `2`: expiring soon (within 24h)

這適用於 cron/systemd，不需要額外的腳本。

## Optional scripts (ops / phone workflows)

這些位於 `scripts/` 下，屬於**選用**功能。它們假設具有對
gateway 主機的 SSH 存取權限，並針對 systemd + Termux 進行了調整。

- `scripts/claude-auth-status.sh` 現在使用 `openclaw models status --json` 作為
  事實來源（如果 CLI 無法使用則回退到直接讀取檔案），
  因此請將 `openclaw` 保留在 `PATH` 上以用於計時器。
- `scripts/auth-monitor.sh`: cron/systemd 計時器目標；發送警示（ntfy 或手機）。
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`: systemd 使用者計時器。
- `scripts/claude-auth-status.sh`: Claude Code + OpenClaw auth checker (full//simple).
- `scripts/mobile-reauth.sh`: guided re‑auth flow over SSH.
- `scripts/termux-quick-auth.sh`: one‑tap widget status + open auth URL.
- `scripts/termux-auth-widget.sh`: full guided widget flow.
- `scripts/termux-sync-widget.sh`: sync Claude Code creds → OpenClaw.

如果您不需要手機自動化或 systemd 計時器，請跳過這些腳本。
