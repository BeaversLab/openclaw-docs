---
summary: "串流 + 分塊行為（區塊回覆、頻道預覽串流、模式對應）"
read_when:
  - 解釋串流或分塊如何在頻道上運作
  - 變更區塊串流或頻道分塊行為
  - 除錯重複/過早的區塊回覆或頻道預覽串流
title: "串流與分塊"
---

# 串流 + 分塊

OpenClaw 有兩個獨立的串流層：

- **區塊串流（頻道）：** 在助理寫入時發出完成的 **區塊**。這些是正常的頻道訊息（而非 token 增量）。
- **預覽串流（Telegram/Discord/Slack）：** 在生成期間更新臨時的 **預覽訊息**。

目前 **並沒有真正的 token 增量串流** 傳送到頻道訊息。預覽串流是基於訊息的（發送 + 編輯/附加）。

## 區塊串流（頻道訊息）

區塊串流會在助理輸出可用時，以較大的區塊單位發送。

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

圖例：

- `text_delta/events`：模型串流事件（對於非串流模型可能是稀疏的）。
- `chunker`：`EmbeddedBlockChunker` 套用最小/最大邊界 + 中斷偏好。
- `channel send`：實際的輸出訊息（區塊回覆）。

**控制項：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（預設關閉）。
- 頻道覆寫：`*.blockStreaming`（以及每個帳號的變體）以強制每個頻道使用 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在發送前合併串流區塊）。
- 頻道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 頻道分塊模式：`*.chunkMode`（`length` 預設，`newline` 會在長度分塊前根據空行（段落邊界）分割）。
- Discord 軟上限：`channels.discord.maxLinesPerMessage`（預設 17）分割過長的回覆以避免 UI 截斷。

**邊界語意：**

- `text_end`：當分塊器發出塊時立即串流；在每個 `text_end` 時排清。
- `message_end`：等到助手訊息完成後，再排清緩衝輸出。

`message_end` 如果緩衝文字超過 `maxChars`，仍會使用分塊器，因此它可以在最後發出多個塊。

## 分塊演算法（低/高界限）

區塊分塊由 `EmbeddedBlockChunker` 實作：

- **低界限：** 除非被強制，否則直到緩衝區 >= `minChars` 才發出。
- **高界限：** 偏好在 `maxChars` 之前分割；如果被強制，則在 `maxChars` 處分割。
- **中斷偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬中斷。
- **程式碼圍欄：** 絕不從圍欄內部分割；當在 `maxChars` 被強制時，關閉並重新開啟圍欄以保持 Markdown 有效。

`maxChars` 被限制為頻道 `textChunkLimit`，因此您無法超過每個頻道的上限。

## 合併（合併串流區塊）

啟用區塊串流時，OpenClaw 可以在發出前**合併連續的區塊區塊**。這在提供漸進式輸出的同時減少了「單行垃圾訊息」。

- 合併會在排清前等待 **空閒間隙**（`idleMs`）。
- 緩衝區以 `maxChars` 為上限，如果超過該值則會排清。
- `minChars` 防止發送微小的片段，直到累積足夠的文字（最終排清總是發送剩餘文字）。
- 連接器衍生自 `blockStreamingChunk.breakPreference`（`paragraph` → `\n\n`，`newline` → `\n`，`sentence` → 空格）。
- 可以透過 `*.blockStreamingCoalesce` 使用頻道覆寫（包括每個帳號的設定）。
- 除非被覆寫，否則預設合併 `minChars` 對 Signal/Slack/Discord 會提高到 1500。

## 區塊之間擬人化的步調

當啟用區塊串流時，您可以在區塊回覆之間（第一個區塊之後）加入**隨機暫停**。這會讓多氣泡回覆感覺更自然。

- 配置：`agents.defaults.humanDelay`（透過 `agents.list[].humanDelay` 針對每個代理進行覆寫）。
- 模式：`off`（預設）、`natural`（800–2500ms）、`custom`（`minMs`/`maxMs`）。
- 僅適用於**區塊回覆**，不適用於最終回覆或工具摘要。

## "串流區塊或所有內容"

這對應至：

- **串流區塊：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（邊做邊輸出）。非 Telegram 頻道也需要 `*.blockStreaming: true`。
- **在最後串流所有內容：** `blockStreamingBreak: "message_end"`（清除一次，如果非常長可能會有多個區塊）。
- **無區塊串流：** `blockStreamingDefault: "off"`（僅最終回覆）。

**頻道備註：** 除非明確將
`*.blockStreaming` 設定為 `true`，否則區塊串流為**關閉**。頻道可以在沒有區塊回覆的情況下串流即時預覽
（`channels.<channel>.streaming`）。

配置位置提醒：`blockStreaming*` 預設值位於
`agents.defaults` 之下，而不是根配置。

## 預覽串流模式

正式金鑰：`channels.<channel>.streaming`

模式：

- `off`：停用預覽串流。
- `partial`：會被最新文字替換的單一預覽。
- `block`：以區塊/附加步驟更新的預覽。
- `progress`：生成期間的進度/狀態預覽，完成時的最終答案。

### 頻道對應

| 頻道  | `off` | `partial` | `block` | `progress`        |
| -------- | ----- | --------- | ------- | ----------------- |
| Telegram | ✅    | ✅        | ✅      | 對應至 `partial` |
| Discord  | ✅    | ✅        | ✅      | 對應至 `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅                |

僅限 Slack：

- 當 `streaming=partial` 時（預設：`true`），`channels.slack.nativeStreaming` 會切換 Slack 原生串流 API 呼叫。

舊版金鑰遷移：

- Telegram：`streamMode` + 布林值 `streaming` 自動遷移至 `streaming` 列舉。
- Discord：`streamMode` + 布林值 `streaming` 自動遷移至 `streaming` 列舉。
- Slack：`streamMode` 自動遷移至 `streaming` 列舉；布林值 `streaming` 自動遷移至 `nativeStreaming`。

### 執行時期行為

Telegram：

- 在私訊和群組/主題中跨所有預覽更新使用 `sendMessage` + `editMessageText`。
- 當明確啟用 Telegram 區塊串流時，會跳過預覽串流（以避免重複串流）。
- `/reasoning stream` 可以將推理寫入預覽。

Discord：

- 使用傳送 + 編輯預覽訊息。
- `block` 模式使用草稿分塊（`draftChunk`）。
- 當明確啟用 Discord 區塊串流時，會跳過預覽串流。

Slack：

- 當可用時，`partial` 可以使用 Slack 原生串流（`chat.startStream`/`append`/`stop`）。
- `block` 使用附加式草稿預覽。
- `progress` 使用狀態預覽文字，然後是最終答案。

import en from "/components/footer/en.mdx";

<en />
