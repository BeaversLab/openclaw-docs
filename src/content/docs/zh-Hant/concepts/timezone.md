---
summary: "針對代理、信封和提示的時區處理"
read_when:
  - You need to understand how timestamps are normalized for the model
  - Configuring the user timezone for system prompts
title: "時區"
---

OpenClaw 標準化時間戳，使模型看到**單一參考時間**。

## 訊息信封（預設為本地時間）

傳入訊息被包裹在一個信封中，如下所示：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

信封中的時間戳**預設為主機本地時間**，精確到分鐘。

您可以透過以下方式覆寫此設定：

```json5
{
  agents: {
    defaults: {
      envelopeTimezone: "local", // "utc" | "local" | "user" | IANA timezone
      envelopeTimestamp: "on", // "on" | "off"
      envelopeElapsed: "on", // "on" | "off"
    },
  },
}
```

- `envelopeTimezone: "utc"` 使用 UTC。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（若未設定則回退至主機時區）。
- 使用明確的 IANA 時區（例如 `"Europe/Vienna"`）以取得固定偏移量。
- `envelopeTimestamp: "off"` 會從信封標頭中移除絕對時間戳。
- `envelopeElapsed: "off"` 會移除經過時間後綴（`+2m` 樣式）。

### 範例

**本地時間（預設）：**

```
[Signal Alice +1555 2026-01-18 00:19 PST] hello
```

**固定時區：**

```
[Signal Alice +1555 2026-01-18 06:19 GMT+1] hello
```

**經過時間：**

```
[Signal Alice +1555 +2m 2026-01-18T05:19Z] follow-up
```

## 工具載荷（原始供應商資料 + 正規化欄位）

工具呼叫（`channels.discord.readMessages`、`channels.slack.readMessages` 等）會返回**原始供應商時間戳**。
我們也會附加正規化欄位以確保一致性：

- `timestampMs`（UTC 紀元毫秒）
- `timestampUtc`（ISO 8601 UTC 字串）

原始供應商欄位會被保留。

## 系統提示的使用者時區

設定 `agents.defaults.userTimezone` 以告知模型使用者的本地時區。若未
設定，OpenClaw 將在執行時解析**主機時區**（無需寫入設定）。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

系統提示包含：

- `Current Date & Time` 區塊，包含本地時間和時區
- `Time format: 12-hour` 或 `24-hour`

您可以使用 `agents.defaults.timeFormat`（`auto` | `12` | `24`）控制提示格式。

請參閱 [日期與時間](/zh-Hant/date-time) 以了解完整行為和範例。

## 相關

- [Heartbeat](/zh-Hant/gateway/heartbeat) — 活躍小時使用時區進行排程
- [Cron Jobs](/zh-Hant/automation/cron-jobs) — cron 表達式使用時區進行排程
- [日期與時間](/zh-Hant/date-time) — 完整的日期/時間行為和範例
