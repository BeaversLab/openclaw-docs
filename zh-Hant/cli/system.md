---
summary: "`openclaw system` （系統事件、心跳、presence）的 CLI 參考"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "系統"
---

# `openclaw system`

Gateway 的系統級輔助工具：將系統事件加入佇列、控制心跳，以及檢視 presence。

## 常用指令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **main** 工作階段上將系統事件加入佇列。下一次心跳會將其以 `System:` 行的形式注入提示中。請使用 `--mode now` 立即觸發心跳；`next-heartbeat` 則等待下一次排定的 tick。

Flags：

- `--text <text>`：必要系統事件文字。
- `--mode <mode>`： `now` 或 `next-heartbeat` (預設)。
- `--json`：機器可讀輸出。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：顯示最後一次心跳事件。
- `enable`：重新開啟心跳 (如果之前已停用，請使用此項)。
- `disable`：暫停心跳。

Flags：

- `--json`：機器可讀輸出。

## `system presence`

列出 Gateway 已知的目前系統 presence 項目 (節點、執行個體和類似狀態行)。

Flags：

- `--json`：機器可讀輸出。

## 備註

- 需要一個可透過您目前的設定 (本機或遠端) 連線的執行中 Gateway。
- 系統事件是暫時性的，不會在重新啟動後保留。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
