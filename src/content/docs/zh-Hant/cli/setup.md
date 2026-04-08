---
summary: "CLI 參考資料，用於 `openclaw setup` (初始化設定檔 + 工作區)"
read_when:
  - You’re doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "setup"
---

# `openclaw setup`

初始化 `~/.openclaw/openclaw.json` 和代理程式工作區。

相關連結：

- 開始使用：[開始使用](/en/start/getting-started)
- CLI 入門：[入門 (CLI)](/en/start/wizard)

## 範例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 選項

- `--workspace <dir>`: agent 工作區目錄（儲存為 `agents.defaults.workspace`）
- `--wizard`: 執行入門流程
- `--non-interactive`: 執行入門流程而不提示
- `--mode <local|remote>`: 入門模式
- `--remote-url <url>`: 遠端 Gateway WebSocket URL
- `--remote-token <token>`: 遠端 Gateway 權杖

若要透過 setup 執行入門流程：

```bash
openclaw setup --wizard
```

備註：

- 純粹的 `openclaw setup` 會初始化設定與工作區，而不經過完整的入門流程。
- 當存在任何入門旗標（`--wizard`、`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）時，入門流程會自動執行。
