---
summary: "`openclaw system`（系統事件、心跳、在場狀態）的 CLI 參考"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "system"
---

# `openclaw system`

Gateway 的系統層級輔助工具：將系統事件加入佇列、控制心跳，以及檢視在場狀態。

## 常用指令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **main** 工作階段上將系統事件加入佇列。下一次心跳會將其以 `System:` 行的形式注入提示中。使用 `--mode now` 立即觸發心跳；`next-heartbeat` 則是等待下一次排定的刻度。

旗標：

- `--text <text>`：必要的系統事件文字。
- `--mode <mode>`：`now` 或 `next-heartbeat`（預設值）。
- `--json`: 機器可讀輸出。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`: 顯示最後一次心跳事件。
- `enable`: 重新開啟心跳（如果先前已停用，請使用此選項）。
- `disable`: 暫停心跳。

旗標：

- `--json`: 機器可讀輸出。

## `system presence`

列出 Gateway 目前知道的系統存在條目（節點、實例和類似狀態行）。

旗標：

- `--json`: 機器可讀輸出。

## 注意事項

- 需要一個透過您目前的設定（本地或遠端）可連線的執行中 Gateway。
- 系統事件是暫時性的，不會在重新啟動後保留。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
