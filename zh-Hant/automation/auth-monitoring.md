---
summary: "監控模型供應商的 OAuth 到期"
read_when:
  - Setting up auth expiry monitoring or alerts
  - Automating Claude Code / Codex OAuth refresh checks
title: "Auth Monitoring"
---

# Auth monitoring

OpenClaw 透過 `openclaw models status` 公開 OAuth 到期狀態。使用它進行自動化和警報；腳本是用於手機工作流程的額外選項。
Preferred: CLI check (portable)

## Preferred: CLI check (portable)

```bash
openclaw models status --check
```

退出代碼：

- `0`：OK
- `1`：已過期或缺少憑證
- `2`：即將過期（24 小時內）

這適用於 cron/systemd 且無需額外腳本。

## Optional scripts (ops / phone workflows)

這些位於 `scripts/` 之下，且為**選用**。它們假設對閘道主機有 SSH 存取權限，並針對 systemd + Termux 進行調整。

- `scripts/claude-auth-status.sh` 現在使用 `openclaw models status --json` 作為
  事實來源（如果 CLI 無法使用則回退到直接讀取檔案），
  因此請在 `PATH` 上保留 `openclaw` 用於計時器。
- `scripts/auth-monitor.sh`：cron/systemd 計時器目標；發送警報（ntfy 或手機）。
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`：systemd 使用者計時器。
- `scripts/claude-auth-status.sh`：Claude Code + OpenClaw 驗證檢查器（完整//簡易）。
- `scripts/mobile-reauth.sh`：透過 SSH 的引導式重新驗證流程。
- `scripts/termux-quick-auth.sh`：一鍵小工具狀態 + 開啟驗證 URL。
- `scripts/termux-auth-widget.sh`：完整引導式小工具流程。
- `scripts/termux-sync-widget.sh`：同步 Claude Code 憑證 → OpenClaw。

如果您不需要手機自動化或 systemd 計時器，請跳過這些腳本。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
