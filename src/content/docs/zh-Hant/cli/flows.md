---
summary: "重新導向：flow 指令位於 `openclaw tasks flow`"
read_when:
  - You encounter `openclaw flows` in older docs or release notes
  - You want a quick TaskFlow inspection reference
title: "Flows (重新導向)"
---

# `openclaw tasks flow`

沒有頂層的 `openclaw flows` 指令。持續性 TaskFlow 檢查位於 `openclaw tasks flow` 之下。

## 子指令

```bash
openclaw tasks flow list   [--json] [--status <name>]
openclaw tasks flow show   <lookup> [--json]
openclaw tasks flow cancel <lookup>
```

| 子指令   | 描述                      | 引數 / 選項                                                             |
| -------- | ------------------------- | ----------------------------------------------------------------------- |
| `list`   | 列出已追蹤的 TaskFlow。   | `--json` 機器可讀輸出；`--status <name>` 篩選器（請參閱下方的狀態值）。 |
| `show`   | 顯示單一 TaskFlow。       | `<lookup>` flow id 或 owner key；`--json` 機器可讀輸出。                |
| `cancel` | 取消正在執行的 TaskFlow。 | `<lookup>` flow id 或 owner key。                                       |

`<lookup>` 接受 flow id（由 `list` / `show` 傳回）或 flow 的 owner key（擁有子系統用來追蹤 flow 的穩定識別碼）。

### 狀態篩選器值

`--status` 在 `list` 上接受以下其中之一：

`queued`、`running`、`waiting`、`blocked`、`succeeded`、`failed`、`cancelled`、`lost`

## 範例

```bash
openclaw tasks flow list
openclaw tasks flow list --status running
openclaw tasks flow list --json
openclaw tasks flow show flow_abc123
openclaw tasks flow show flow_abc123 --json
openclaw tasks flow cancel flow_abc123
```

如需完整的 TaskFlow 概念和編寫資訊，請參閱 [TaskFlow](/zh-Hant/automation/taskflow)。如需父級 `tasks` 指令，請參閱 [tasks CLI 參考](/zh-Hant/cli/tasks)。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [自動化](/zh-Hant/automation)
- [TaskFlow](/zh-Hant/automation/taskflow)
