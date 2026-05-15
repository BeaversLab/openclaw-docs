---
summary: "時區在 OpenClaw 中的顯現位置 — 信封、工具負載、系統提示"
read_when:
  - You want a quick mental model for timezone handling
  - You are deciding where to set or override a timezone
title: "時區"
---

OpenClaw 將時間戳標準化，讓模型看到的是**單一參考時間**，而不是混合了提供者本地時鐘的時間。時區會在三個介面上顯現，各有其用途：

## 三個時區介面

| 介面     | 顯示內容                                                                                     | 預設值                                | 設定方式                           |
| -------- | -------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------- |
| 訊息信封 | 包裝輸入通道訊息：`[Signal +1555 2026-01-18 00:19 PST] hello`                                | 主機本地                              | `agents.defaults.envelopeTimezone` |
| 工具負載 | 通道 `readMessages` 風格的工具會傳回原始提供者時間 + 標準化的 `timestampMs` / `timestampUtc` | UTC 欄位始終存在                      | 不可設定 — 保留提供者原生時間戳    |
| 系統提示 | 一個小型的 `Current Date & Time` 區塊，僅包含**時區**（無時鐘值，以維持快取穩定性）          | 若未設定 `userTimezone`，則為主機時區 | `agents.defaults.userTimezone`     |

系統提示刻意省略即時時鐘，以在對話輪次之間保持提示快取的穩定性。當代理需要當前時間時，會呼叫 `session_status`。

## 設定使用者時區

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
    },
  },
}
```

若未設定 `userTimezone`，OpenClaw 會在執行時解析主機時區（不寫入設定）。`agents.defaults.timeFormat` (`auto` | `12` | `24`) 控制信封和下游介面中的 12 小時/24 小時渲染，而非在系統提示區段中。

## 何時覆寫

- 當您希望跨不同區域的主機具有穩定的時間戳，或希望 UTC 對齊的日誌與診斷輸出相符時，**請使用 UTC 信封** (`envelopeTimezone: "utc"`)。
- 當閘道主機位於一個時區但使用者位於另一個時區，且不論主機遷移如何都希望信封以使用者的時區顯示時，**請使用固定的 IANA 時區**（例如 `"Europe/Vienna"`）。
- 當時間戳上下文對對話無用時，**請設定 `envelopeTimestamp: "off"`** 以使用低權杖信封。

有關完整的行為參考、各供應商的範例以及經過時間格式化，請參閱 [日期與時間](/zh-Hant/date-time)。

## 相關

- [日期與時間](/zh-Hant/date-time) — 完整的信封/工具/提示行為與範例。
- [Heartbeat](/zh-Hant/gateway/heartbeat) — 活躍時段使用時區進行排程。
- [Cron Jobs](/zh-Hant/automation/cron-jobs) — cron 表示式使用時區進行排程。
