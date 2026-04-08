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

所有 `system` 子指令都使用 Gateway RPC 並接受共用的客戶端旗標：

- `--url <url>`
- `--token <token>`
- `--timeout <ms>`
- `--expect-final`

## 常用指令

```bash
openclaw system event --text "Check for urgent follow-ups" --mode now
openclaw system event --text "Check for urgent follow-ups" --url ws://127.0.0.1:18789 --token "$OPENCLAW_GATEWAY_TOKEN"
openclaw system heartbeat enable
openclaw system heartbeat last
openclaw system presence
```

## `system event`

在 **main** 工作階段佇列一個系統事件。下一個心跳會將其作為 `System:` 行插入提示中。使用 `--mode now` 立即觸發心跳；`next-heartbeat` 則等待下一次排定的計時。

旗標：

- `--text <text>`：必填的系統事件文字。
- `--mode <mode>`：`now` 或 `next-heartbeat`（預設）。
- `--json`：機器可讀輸出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共用的 Gateway RPC 旗標。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：顯示最後一次心跳事件。
- `enable`：重新開啟心跳（如果之前已停用，請使用此選項）。
- `disable`：暫停心跳。

旗標：

- `--json`：機器可讀輸出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共用的 Gateway RPC 旗標。

## `system presence`

列出 Gateway 目前知道的系統存在條目（節點、執行個體和類似的狀態行）。

旗標：

- `--json`：機器可讀輸出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共用的 Gateway RPC 旗標。

## 備註

- 需要一個透過您目前的設定（本機或遠端）可存取的執行中 Gateway。
- 系統事件是暫時性的，不會在重新啟動後持續存在。
