---
summary: "跨信封、提示詞、工具和連接器的日期和時間處理"
read_when:
  - You are changing how timestamps are shown to the model or users
  - You are debugging time formatting in messages or system prompt output
title: "日期與時間"
---

# 日期與時間

OpenClaw 預設為**傳輸時間戳記使用主機本地時間**，並且**僅在系統提示詞中使用使用者時區**。
提供者時間戳記會被保留，以便工具保持其原生語意（目前時間可透過 `session_status` 取得）。

## 訊息信封（預設為本地時間）

傳入訊息會包含一個時間戳記（精確到分鐘）：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

此信封時間戳記預設為**主機本地時間**，無論提供者的時區為何。

您可以覆寫此行為：

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
- `envelopeTimezone: "local"` 使用主機時區。
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（若無則回退至主機時區）。
- 使用明確的 IANA 時區（例如 `"America/Chicago"`）以指定固定時區。
- `envelopeTimestamp: "off"` 會從信封標頭中移除絕對時間戳記。
- `envelopeElapsed: "off"` 會移除經過時間後綴（`+2m` 樣式）。

### 範例

**本地（預設）：**

```
[WhatsApp +1555 2026-01-18 00:19 PST] hello
```

**使用者時區：**

```
[WhatsApp +1555 2026-01-18 00:19 CST] hello
```

**已啟用經過時間：**

```
[WhatsApp +1555 +30s 2026-01-18T05:19Z] follow-up
```

## 系統提示詞：目前日期與時間

如果已知使用者時區，系統提示詞將包含一個專門的
**目前日期與時間** 區塊，其中**僅包含時區**（不含時鐘/時間格式）
以保持提示詞快取的穩定性：

```
Time zone: America/Chicago
```

當代理需要目前時間時，請使用 `session_status` 工具；狀態
卡片包含一條時間戳記行。

## 系統事件行（預設為本地時間）

插入到代理上下文中的佇列系統事件會加上時間戳記前綴，
使用與訊息信封相同的時區選擇（預設：主機本地時間）。

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### 設定使用者時區與格式

```json5
{
  agents: {
    defaults: {
      userTimezone: "America/Chicago",
      timeFormat: "auto", // auto | 12 | 24
    },
  },
}
```

- `userTimezone` 為提示詞上下文設定**使用者本地時區**。
- `timeFormat` 控制提示詞中的 **12小時/24小時制顯示**。`auto` 遵循作業系統偏好設定。

## 時間格式偵測（自動）

當使用 `timeFormat: "auto"` 時，OpenClaw 會檢查作業系統偏好設定（macOS/Windows）並回退至區域格式化。偵測到的值會**在每個進程中快取**，以避免重複的系統呼叫。

## 工具負載 + 連接器（原始提供者時間 + 正規化欄位）

頻道工具會傳回 **提供者原生時間戳記** 並新增正規化欄位以保持一致性：

- `timestampMs`：自紀元以來的毫秒數（UTC）
- `timestampUtc`：ISO 8601 UTC 字串

會保留原始提供者欄位，以免遺失任何資料。

- Slack：來自 API 的類似紀元的字串
- Discord：UTC ISO 時間戳記
- Telegram/WhatsApp：提供者特定的數值/ISO 時間戳記

如果您需要本地時間，請使用已知的時區在下游進行轉換。

## 相關文件

- [系統提示](/en/concepts/system-prompt)
- [時區](/en/concepts/timezone)
- [訊息](/en/concepts/messages)
