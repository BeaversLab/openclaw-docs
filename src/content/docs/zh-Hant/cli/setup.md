---
summary: "CLI 參考資料，用於 `openclaw setup` (初始化設定檔 + 工作區)"
read_when:
  - You’re doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
title: "安裝"
---

# `openclaw setup`

初始化 `~/.openclaw/openclaw.json` 和代理程式工作區。

相關連結：

- 開始使用：[開始使用](/zh-Hant/start/getting-started)
- CLI 入門：[入門 (CLI)](/zh-Hant/start/wizard)

## 範例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 選項

- `--workspace <dir>`: agent 工作區目錄（儲存為 `agents.defaults.workspace`）
- `--wizard`: 執行入門流程
- `--non-interactive`: 執行入門流程而不提示
- `--mode <local|remote>`: 入門模式
- `--import-from <provider>`：在入門期間執行的遷移提供者
- `--import-source <path>`：`--import-from` 的來源代理主目錄
- `--import-secrets`：在入門遷移期間匯入支援的金鑰
- `--remote-url <url>`：遠端 Gateway WebSocket URL
- `--remote-token <token>`：遠端 Gateway 權杖

若要透過 setup 執行入門：

```bash
openclaw setup --wizard
```

備註：

- 純 `openclaw setup` 會初始化設定 + 工作區，而不會執行完整的入門流程。
- 當存在任何入門旗標 (`--wizard`, `--non-interactive`, `--mode`, `--import-from`, `--import-source`, `--import-secrets`, `--remote-url`, `--remote-token`) 時，入門會自動執行。
- 如果偵測到 Hermes 狀態，互動式入門可以自動提供遷移。匯入入門需要全新的設定；請使用 [Migrate](/zh-Hant/cli/migrate) 進行試執行計畫、備份以及在入門之外的覆寫模式。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [安裝概覽](/zh-Hant/install)
