---
summary: "串流與分塊行為（區塊回覆、頻道預覽串流、模式對應）"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "串流與分塊"
---

# 串流 + 分塊

OpenClaw 有兩個獨立的串流層：

- **區塊串流（頻道）：** 當助理寫入時，發送完整的 **區塊**。這些是正常的頻道訊息（而非 token 增量）。
- **預覽串流（Telegram/Discord/Slack）：** 在生成過程中更新暫時的 **預覽訊息**。

目前對於頻道訊息 **並沒有真正的 token 增量串流**。預覽串流是基於訊息的（發送 + 編輯/附加）。

## 區塊串流（頻道訊息）

區塊串流會在助理輸出可用時，以較大的分塊發送。

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
- `chunker`：`EmbeddedBlockChunker` 應用最小/最大界限 + 中斷偏好。
- `channel send`：實際的出站訊息（區塊回覆）。

**控制項：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（預設關閉）。
- 頻道覆寫：`*.blockStreaming`（以及每個帳號的變體）以針對每個頻道強制設定 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在發送前合併串流區塊）。
- 頻道硬性上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 頻道分塊模式：`*.chunkMode`（`length` 預設，`newline` 在長度分塊前於空白行處（段落邊界）分割）。
- Discord 軟性上限：`channels.discord.maxLinesPerMessage`（預設 17）分割較高的回覆以避免 UI 截斷。

**邊界語義：**

- `text_end`：一旦分塊器發出就串流區塊；在每個 `text_end` 上排清。
- `message_end`：等到助理訊息完成後，再沖刷緩衝輸出。

如果緩衝文字超過 `maxChars`，`message_end` 仍會使用區塊器，以便在最後輸出多個區塊。

## 分塊演算法（低/高界限）

區塊分塊是由 `EmbeddedBlockChunker` 實作的：

- **低界限：** 除非被強制，否則在緩衝區 >= `minChars` 之前不輸出。
- **高界限：** 偏好在 `maxChars` 之前分割；如果被強制，則在 `maxChars` 處分割。
- **斷行偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 強制斷行。
- **程式碼圍欄：** 從不在圍欄內分割；當在 `maxChars` 被強制分割時，會先關閉再重新開啟圍欄以保持 Markdown 有效。

`maxChars` 被限制在頻道 `textChunkLimit` 內，因此您無法超出每個頻道的上限。

## 合併（合併串流區塊）

啟用區塊串流時，OpenClaw 可以在發送之前**合併連續的區塊區塊**。
這減少了「單行垃圾訊息」，同時仍然提供
漸進式輸出。

- 合併會在沖刷前等待 **閒置間隙** (`idleMs`)。
- 緩衝區上限為 `maxChars`，如果超出則會進行沖刷。
- `minChars` 防止發送過小的片段，直到累積足夠的文字
  （最終沖刷總是會發送剩餘文字）。
- 連接器衍生自 `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → 空格)。
- 可透過 `*.blockStreamingCoalesce` 使用頻道覆寫（包括每個帳號的設定）。
- 預設合併 `minChars` 對 Signal/Slack/Discord 提升至 1500，除非另有覆寫。

## 區塊之間的類人節奏

啟用區塊串流時，您可以在區塊回覆之間（第一個區塊之後）
加入 **隨機暫停**。這讓多氣泡回覆感覺
更自然。

- 配置：`agents.defaults.humanDelay`（可透過 `agents.list[].humanDelay` 針對每個代理覆寫）。
- 模式：`off`（預設）、`natural`（800–2500ms）、`custom`（`minMs`/`maxMs`）。
- 僅適用於 **區塊回覆**，不適用於最終回覆或工具摘要。

## 「串流區塊或全部串流」

這對應至：

- **串流區塊：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（邊做邊發送）。非 Telegram 頻道也需要 `*.blockStreaming: true`。
- **結束時串流所有內容：** `blockStreamingBreak: "message_end"`（排清一次，如果非常長則可能分為多個區塊）。
- **無區塊串流：** `blockStreamingDefault: "off"`（僅最終回覆）。

**頻道備註：** 除非明確將
`*.blockStreaming` 設定為 `true`，否則區塊串流為**關閉**。頻道可以在沒有區塊回覆的情況下串流即時預覽
(`channels.<channel>.streaming`)。

配置位置提醒：`blockStreaming*` 預設值位於
`agents.defaults` 之下，而非根配置。

## 預覽串流模式

正式金鑰：`channels.<channel>.streaming`

模式：

- `off`：停用預覽串流。
- `partial`：單一預覽，會被最新文字取代。
- `block`：以區塊/附加步驟更新預覽。
- `progress`：產生期間顯示進度/狀態預覽，完成時顯示最終答案。

### 頻道對應

| 頻道     | `off` | `partial` | `block` | `progress`       |
| -------- | ----- | --------- | ------- | ---------------- |
| Telegram | ✅    | ✅        | ✅      | 對應至 `partial` |
| Discord  | ✅    | ✅        | ✅      | 對應至 `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅               |

僅限 Slack：

- 當 `streaming=partial` 時，`channels.slack.nativeStreaming` 會切換 Slack 原生串流 API 呼叫（預設值：`true`）。

舊版金鑰遷移：

- Telegram：`streamMode` + 布林值 `streaming` 會自動遷移至 `streaming` 列舉。
- Discord: `streamMode` + boolean `streaming` 自動遷移至 `streaming` enum。
- Slack: `streamMode` 自動遷移至 `streaming` enum；boolean `streaming` 自動遷移至 `nativeStreaming`。

### 執行時期行為

Telegram:

- 在私訊 和群組/話題 中使用 `sendMessage` + `editMessageText` 預覽更新。
- 當明確啟用 Telegram 區塊串流時，會跳過預覽串流（以避免重複串流）。
- `/reasoning stream` 可以將推理寫入預覽。

Discord:

- 使用 send + edit 預覽訊息。
- `block` 模式使用草稿分塊 (`draftChunk`)。
- 當明確啟用 Discord 區塊串流時，會跳過預覽串流。

Slack:

- 當可用時，`partial` 可以使用 Slack 原生串流 (`chat.startStream`/`append`/`stop`)。
- `block` 使用附加式 (append-style) 草稿預覽。
- `progress` 使用狀態預覽文字，然後是最終答案。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
