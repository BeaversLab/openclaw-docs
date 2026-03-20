---
summary: "監控模型供應商的 OAuth 過期"
read_when:
  - 設定認證過期監控或警示
  - 自動化 Claude Code / Codex OAuth 重新整理檢查
title: "Auth Monitoring"
---

# 認證監控

OpenClaw 透過 `openclaw models status` 公開 OAuth 過期健康狀態。使用它來進行
自動化和警示；腳本是針對手機工作流程的可選額外功能。

## 建議：CLI 檢查（可攜帶）

```bash
openclaw models status --check
```

退出代碼：

- `0`：正常
- `1`：憑證已過期或遺失
- `2`：即將過期（24 小時內）

這適用於 cron/systemd 且不需要額外的腳本。

## 可選腳本（運維 / 手機工作流程）

這些位於 `scripts/` 下且為**可選**。它們假設具備閘道主機的 SSH 存取權限，並針對 systemd + Termux 進行了調整。

- `scripts/claude-auth-status.sh` 現在使用 `openclaw models status --json` 作為
  事實來源（如果 CLI 無法使用則回退為直接檔案讀取），
  因此請在 `PATH` 上保留 `openclaw` 以用於計時器。
- `scripts/auth-monitor.sh`：cron/systemd 計時器目標；發送警示（ntfy 或手機）。
- `scripts/systemd/openclaw-auth-monitor.{service,timer}`：systemd 使用者計時器。
- `scripts/claude-auth-status.sh`：Claude Code + OpenClaw 認證檢查器（完整//簡單）。
- `scripts/mobile-reauth.sh`：透過 SSH 進行引導式重新認證流程。
- `scripts/termux-quick-auth.sh`：一鍵小工具狀態 + 開啟認證 URL。
- `scripts/termux-auth-widget.sh`：完整引導式小工具流程。
- `scripts/termux-sync-widget.sh`：同步 Claude Code 憑證 → OpenClaw。

如果您不需要手機自動化或 systemd 計時器，請跳過這些腳本。

import en from "/components/footer/en.mdx";

<en />
