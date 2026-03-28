---
summary: "監控模型供應商的 OAuth 到期"
read_when:
  - Setting up auth expiry monitoring or alerts
  - Automating Claude Code / Codex OAuth refresh checks
title: "授權監控"
---

# 授權監控

OpenClaw 透過 `openclaw models status` 公開 OAuth 到期健康狀態。請將其用於
自動化和警示；腳本是電話工作流程的可選附加項目。

## 首選：CLI 檢查（便攜）

```exec
openclaw models status --check
```

結束代碼：

- `0`：正常
- `1`：憑證已過期或遺失
- `2`：即將過期（24 小時內）

這適用於 cron/systemd，無需額外的腳本。

## 可選腳本（營運 / 電話工作流程）

這些位於 `scripts/` 下，並且是**可選**的。它們假設對
閘道主機具有 SSH 存取權限，並針對 systemd + Termux 進行了調整。

- `scripts/claude-auth-status.sh` 現在使用 `openclaw models status --json` 作為
  事實來源（如果 CLI 不可用則回退到直接讀取檔案），
  因此請保持 `openclaw` 在 `PATH` 上以用於計時器。
- `scripts/auth-monitor.sh`：cron/systemd 計時器目標；發送警示（ntfy 或電話）。
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`：systemd 使用者計時器。
- `scripts/claude-auth-status.sh`：Claude Code + OpenClaw 授權檢查器（完整//簡單）。
- `scripts/mobile-reauth.sh`：透過 SSH 進行引導式重新授權流程。
- `scripts/termux-quick-auth.sh`：一觸小工具狀態 + 開啟授權 URL。
- `scripts/termux-auth-widget.sh`：完整的引導式小工具流程。
- `scripts/termux-sync-widget.sh`：同步 Claude Code 憑證 → OpenClaw。

如果您不需要電話自動化或 systemd 計時器，請跳過這些腳本。
