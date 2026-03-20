---
summary: "代理、信封和提示的時區處理"
read_when:
  - 您需要了解時間戳如何為模型進行標準化
  - 配置系統提示的使用者時區
title: "時區"
---

# 時區

OpenClaw 標準化時間戳，以便模型看到**單一參考時間**。

## 訊息信封（預設為本地時間）

傳入訊息被包裝在如下信封中：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

信封中的時間戳預設為**主機本地時間**，精確到分鐘。

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
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（回退到主機時區）。
- 使用明確的 IANA 時區（例如 `"Europe/Vienna"`）以獲得固定偏移量。
- `envelopeTimestamp: "off"` 從信封標頭中移除絕對時間戳。
- `envelopeElapsed: "off"` 移除經過時間後綴（`+2m` 樣式）。

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

## 工具載荷（原始提供者資料 + 標準化欄位）

工具呼叫（`channels.discord.readMessages`、`channels.slack.readMessages` 等）返回**原始提供者時間戳**。
我們還附加了標準化欄位以保持一致性：

- `timestampMs`（UTC 紀元毫秒數）
- `timestampUtc`（ISO 8601 UTC 字串）

原始提供者欄位會被保留。

## 系統提示的使用者時區

設定 `agents.defaults.userTimezone` 以告知模型使用者的本地時區。如果未設定，OpenClaw 將在**執行時解析主機時區**（無需寫入配置）。

```json5
{
  agents: { defaults: { userTimezone: "America/Chicago" } },
}
```

系統提示包括：

- 包含本地時間和時區的 `Current Date & Time` 部分
- `Time format: 12-hour` 或 `24-hour`

您可以使用 `agents.defaults.timeFormat`（`auto` | `12` | `24`）來控制提示格式。

參閱 [日期與時間](/zh-Hant/date-time) 以了解完整行為和範例。

import en from "/components/footer/en.mdx";

<en />
