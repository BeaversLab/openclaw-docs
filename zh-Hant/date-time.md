---
summary: "在信封、提示、工具和連接器之間處理日期和時間"
read_when:
  - 您正在更改向模型或用戶顯示時間戳的方式
  - 您正在偵錯訊息或系統提示輸出中的時間格式
title: "日期與時間"
---

# 日期與時間

OpenClaw 預設為**傳輸時間戳使用主機本地時間**，而**僅在系統提示中使用用戶時區**。
提供者時間戳會被保留，以便工具保持其原生語義（可透過 `session_status` 取得當前時間）。

## 訊息信封（預設為本地時間）

傳入訊息會加上時間戳（精確到分鐘）：

```
[Provider ... 2026-01-05 16:26 PST] message text
```

此信封時間戳**預設為主機本地時間**，無論提供者時區為何。

您可以覆蓋此行為：

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
- `envelopeTimezone: "user"` 使用 `agents.defaults.userTimezone`（若失敗則回退至主機時區）。
- 使用明確的 IANA 時區（例如 `"America/Chicago"`）以指定固定區域。
- `envelopeTimestamp: "off"` 從信封標頭中移除絕對時間戳。
- `envelopeElapsed: "off"` 移除經過時間後綴（即 `+2m` 樣式）。

### 範例

**本地（預設）：**

```
[WhatsApp +1555 2026-01-18 00:19 PST] hello
```

**用戶時區：**

```
[WhatsApp +1555 2026-01-18 00:19 CST] hello
```

**已啟用經過時間：**

```
[WhatsApp +1555 +30s 2026-01-18T05:19Z] follow-up
```

## 系統提示：當前日期與時間

如果已知用戶時區，系統提示會包含專門的
**當前日期與時間**區塊，其中**僅包含時區**（無時鐘/時間格式）
以保持提示快取穩定：

```
Time zone: America/Chicago
```

當代理需要當前時間時，請使用 `session_status` 工具；狀態
卡片包含一行時間戳。

## 系統事件行（預設為本地時間）

插入代理上下文的排隊系統事件會加上時間戳前綴，使用
與訊息信封相同的時區選擇（預設：主機本地）。

```
System: [2026-01-12 12:19:17 PST] Model switched.
```

### 配置用戶時區與格式

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

- `userTimezone` 為提示上下文設定**用戶本地時區**。
- `timeFormat` 控制提示中的 **12/24 小時制顯示**。`auto` 遵循作業系統偏好設定。

## 時間格式偵測（自動）

當 `timeFormat: "auto"` 時，OpenClaw 會檢查作業系統偏好設定（macOS/Windows）並回退至地區格式。偵測到的值會**依程序快取**，以避免重複的系統呼叫。

## 工具負載 + 連接器（原始提供者時間 + 標準化欄位）

頻道工具會傳回**提供者原生的時間戳記**並新增標準化欄位以保持一致性：

- `timestampMs`：epoch 毫秒（UTC）
- `timestampUtc`：ISO 8601 UTC 字串

原始提供者欄位會予以保留，以免遺失任何資料。

- Slack：來自 API 的類 epoch 字串
- Discord：UTC ISO 時間戳記
- Telegram/WhatsApp：提供者特定的數值/ISO 時間戳記

如果您需要本地時間，請使用已知的時區在下游進行轉換。

## 相關文件

- [系統提示](/zh-Hant/concepts/system-prompt)
- [時區](/zh-Hant/concepts/timezone)
- [訊息](/zh-Hant/concepts/messages)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
