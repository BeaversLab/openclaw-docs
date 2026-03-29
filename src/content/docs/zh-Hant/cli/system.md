---
summary: "CLI reference for `openclaw system` (system events, heartbeat, presence)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "system"
---

# `openclaw system`

系統層級的 Gateway 輔助功能：將系統事件加入佇列、控制心跳，以及檢視存在狀態。

## 常用指令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **main** 工作階段上將系統事件加入佇列。下一次心跳會將其作為 `System:` 行注入提示中。使用 `--mode now` 立即觸發心跳；`next-heartbeat` 則等待下一次排定的刻度。

Flags：

- `--text <text>`：必要的系統事件文字。
- `--mode <mode>`：`now` 或 `next-heartbeat` (預設)。
- `--json`：機器可讀輸出。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：顯示最後一次心跳事件。
- `enable`：重新開啟心跳 (如果心跳已停用，請使用此選項)。
- `disable`：暫停心跳。

Flags：

- `--json`：機器可讀輸出。

## `system presence`

列出 Gateway 目前已知的系統存在項目 (節點、執行個體和類似的狀態行)。

Flags：

- `--json`：機器可讀輸出。

## 備註

- 需要可透過您目前的設定 (本機或遠端) 存取的執行中 Gateway。
- 系統事件是暫時性的，不會在重新啟動後保留。
