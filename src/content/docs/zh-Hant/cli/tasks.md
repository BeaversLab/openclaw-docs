---
summary: "CLI 參考資料：`openclaw tasks` (背景工作帳本和工作流程狀態)"
read_when:
  - You want to inspect, audit, or cancel background task records
  - You are documenting Task Flow commands under `openclaw tasks flow`
title: "`openclaw tasks`"
---

檢查持久的背景工作和任務流程狀態。如果不指定子命令，
`openclaw tasks` 等同於 `openclaw tasks list`。

請參閱[背景工作](/zh-Hant/automation/tasks)以了解生命週期和傳遞模型。

## 用法

```bash
openclaw tasks
openclaw tasks list
openclaw tasks list --runtime acp
openclaw tasks list --status running
openclaw tasks show <lookup>
openclaw tasks notify <lookup> state_changes
openclaw tasks cancel <lookup>
openclaw tasks audit
openclaw tasks maintenance
openclaw tasks maintenance --apply
openclaw tasks flow list
openclaw tasks flow show <lookup>
openclaw tasks flow cancel <lookup>
```

## 根目錄選項

- `--json`：輸出 JSON。
- `--runtime <name>`：依種類篩選：`subagent`、`acp`、`cron` 或 `cli`。
- `--status <name>`：依狀態篩選：`queued`、`running`、`succeeded`、`failed`、`timed_out`、`cancelled` 或 `lost`。

## 子命令

### `list`

```bash
openclaw tasks list [--runtime <name>] [--status <name>] [--json]
```

列出追蹤的背景工作，最新的在前。

### `show`

```bash
openclaw tasks show <lookup> [--json]
```

依工作 ID、執行 ID 或工作階段金鑰顯示單一工作。

### `notify`

```bash
openclaw tasks notify <lookup> <done_only|state_changes|silent>
```

變更執行中工作的通知原則。

### `cancel`

```bash
openclaw tasks cancel <lookup>
```

取消執行中的背景工作。

### `audit`

```bash
openclaw tasks audit [--severity <warn|error>] [--code <name>] [--limit <n>] [--json]
```

顯示過期、遺失、傳遞失敗或其他不一致的工作和任務流程記錄。保留至 `cleanupAfter` 的遺失工作為警告；過期或未加戳記的遺失工作為錯誤。

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

預覽或套用工作和任務流程的對帳、清理戳記和修剪。
對於 cron 工作，對帳會在將舊的使用中工作標記為
`lost` 之前使用持久的執行日誌/工作狀態，因此完成的 cron 執行不會僅因為
記憶體中的 Gateway 執行時間狀態已消失而成為錯誤的稽核錯誤。離線 CLI 稽核
對於 Gateway 的處理程序本機 cron 使用中工作集並不具權威性。

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

檢查或取消工作帳本下的持久任務流程狀態。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [背景工作](/zh-Hant/automation/tasks)
