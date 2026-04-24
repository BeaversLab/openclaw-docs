---
summary: "CLI 參考資料：`openclaw tasks` (背景工作帳本和工作流程狀態)"
read_when:
  - You want to inspect, audit, or cancel background task records
  - You are documenting Task Flow commands under `openclaw tasks flow`
title: "`openclaw tasks`"
---

# `openclaw tasks`

檢查持久背景工作和工作流程狀態。若未指定子指令，`openclaw tasks` 等同於 `openclaw tasks list`。

請參閱 [背景工作](/zh-Hant/automation/tasks) 以了解生命週期和傳遞模型。

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

## 根選項

- `--json`：輸出 JSON。
- `--runtime <name>`：依種類篩選：`subagent`、`acp`、`cron` 或 `cli`。
- `--status <name>`：依狀態篩選：`queued`、`running`、`succeeded`、`failed`、`timed_out`、`cancelled` 或 `lost`。

## 子指令

### `list`

```bash
openclaw tasks list [--runtime <name>] [--status <name>] [--json]
```

列出已追蹤的背景工作，最新的優先。

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

顯示過時、遺失、傳遞失敗或其他不一致的工作及工作流程記錄。

### `maintenance`

```bash
openclaw tasks maintenance [--apply] [--json]
```

預覽或執行工作和工作流程的調解、清理標記與修剪。

### `flow`

```bash
openclaw tasks flow list [--status <name>] [--json]
openclaw tasks flow show <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

檢查或取消工作帳本下的持久工作流程狀態。
