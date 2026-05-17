---
summary: "CLI reference for `openclaw system` (system events, heartbeat, presence)"
read_when:
  - You want to enqueue a system event without creating a cron job
  - You need to enable or disable heartbeats
  - You want to inspect system presence entries
title: "系統"
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

預設在 **main** 工作階段將系統事件加入佇列。下一次心跳會將其作為 `System:` 行注入到提示中。使用 `--mode now` 立即觸發心跳；`next-heartbeat` 則等待下一次計畫的跳動。

傳遞 `--session-key` 以指定特定工作階段（例如將非同步任務完成中繼回啟動它的頻道）。

> **使用 `--session-key` 時的時序例外：** 當提供 `--session-key` 時，
> `--mode next-heartbeat` 會折疊為立即的定向喚醒，而不是
> 等待下一次計畫的跳動。定向喚醒使用心跳意圖
> `immediate`，因此它們會繞過執行器的「未到期」閘門，該閘門否則會
> 延遲（並有效丟棄）具有 `event`-意圖的喚醒。如果您想要延遲
> 傳遞，請省略 `--session-key`，使事件落在主要工作階段上並
> 隨下一次常規心跳傳送。

旗標：

- `--text <text>`：必要的系統事件文字。
- `--mode <mode>`：`now` 或 `next-heartbeat`（預設）。
- `--session-key <sessionKey>`：可選；指定特定代理工作階段
  而非代理的主要工作階段。不屬於已解析代理的金鑰會
  回退到代理的主要工作階段。
- `--json`：機器可讀的輸出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共用的 Gateway RPC 旗標。

## `system heartbeat last|enable|disable`

心跳控制：

- `last`：顯示最後一次心跳事件。
- `enable`：重新開啟心跳（如果先前已停用，請使用此選項）。
- `disable`：暫停心跳。

旗標：

- `--json`：機器可讀的輸出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共用的 Gateway RPC 旗標。

## `system presence`

列出 Gateway 目前已知的系統呈現項目（節點、執行個體和類似的狀態行）。

旗標：

- `--json`：機器可讀的輸出。
- `--url`、`--token`、`--timeout`、`--expect-final`：共用的 Gateway RPC 旗標。

## 注意事項

- 需要一個依據您目前的設定（本機或遠端）可連線的執行中 Gateway。
- 系統事件是暫時的，不會在重新啟動後持久保存。

## 相關

- [CLI 參考](/zh-Hant/cli)
