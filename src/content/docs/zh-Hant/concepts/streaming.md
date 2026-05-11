---
summary: "串流與分塊行為（區塊回覆、頻道預覽串流、模式對應）"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "串流與分塊"
---

OpenClaw 有兩個獨立的串流層：

- **區塊串流（頻道）：** 當助手寫入時發送完整的 **區塊**。這些是正常的頻道訊息（不是 token 增量）。
- **預覽串流（Telegram/Discord/Slack）：** 在生成過程中更新一個臨時的 **預覽訊息**。

目前**沒有真正的 token 增量串流**到頻道訊息。預覽串流是基於訊息的（發送 + 編輯/附加）。

## 區塊串流（頻道訊息）

區塊串流會在助手輸出可用時，以大塊的形式發送。

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

- `text_delta/events`：模型串流事件（對於非串流模型可能比較稀疏）。
- `chunker`：`EmbeddedBlockChunker` 應用最小/最大邊界 + 中斷偏好。
- `channel send`：實際的出站訊息（區塊回覆）。

**控制選項：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（預設關閉）。
- 頻道覆寫：`*.blockStreaming`（以及每個帳號的變體）以強制每個頻道使用 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在發送前合併串流的區塊）。
- 頻道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 頻道分塊模式：`*.chunkMode`（`length` 預設，`newline` 在長度分塊前於空行（段落邊界）分割）。
- Discord 軟上限：`channels.discord.maxLinesPerMessage`（預設 17）分割過長的回覆以避免 UI 截斷。

**邊界語義：**

- `text_end`：在分塊器發出時立即串流區塊；在每個 `text_end` 時刷新。
- `message_end`：等待直到助手訊息完成，然後刷新緩衝輸出。

`message_end` 如果緩衝文字超過 `maxChars` 仍會使用分塊器，因此它可以在結束時發送多個區塊。

### 區塊串流的媒體傳遞

`MEDIA:` 指令是正常的傳遞元數據。當區塊串流提前發送媒體區塊時，OpenClaw 會記住該輪次的傳遞。如果最終的助手負載重複了相同的媒體 URL，最終的傳遞將刪除重複的媒體，而不是再次發送附件。

完全重複的最終負載會被抑制。如果最終負載在已串流的媒體周圍添加了不同的文字，OpenClaw 仍會發送新文字，同時保持媒體僅傳遞一次。這可以防止當代理在串流期間發出 `MEDIA:` 並且提供者也在完成的回覆中包含它時，在 Telegram 等頻道上出現重複的語音訊息或檔案。

## 分塊演算法（低/高界限）

區塊分塊由 `EmbeddedBlockChunker` 實現：

- **低界限：** 除非強制，否則在緩衝區 >= `minChars` 之前不發送。
- **高界限：** 偏好於 `maxChars` 之前分割；如果強制，則在 `maxChars` 處分割。
- **分割偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 強制分割。
- **程式碼圍欄：** 從不將內容在圍欄內分割；如果在 `maxChars` 處強制分割，則關閉並重新開啟圍欄以保持 Markdown 有效。

`maxChars` 被限制為頻道 `textChunkLimit`，因此您不能超過每個頻道的上限。

## 合併（合併串流區塊）

啟用區塊串流後，OpenClaw 可以在發送前 **合併連續的區塊區塊**。這減少了「單行垃圾訊息」，同時仍然提供漸進式輸出。

- 合併在刷新前等待 **空閒間隙** (`idleMs`)。
- 緩衝區由 `maxChars` 限制，如果超過則會刷新。
- `minChars` 可防止微小的片段在累積足夠的文字前發送
  （最終清除總是會發送剩餘文字）。
- 連接器衍生自 `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → 空格)。
- 通道覆寫可透過 `*.blockStreamingCoalesce` 取得（包括每個帳號的設定）。
- 預設合併 `minChars` 在 Signal/Slack/Discord 上會提升至 1500，除非另有覆寫。

## 區塊之間的類人節奏

啟用區塊串流時，您可以在區塊回覆之間加入**隨機暫停**（在第一個區塊之後）。這讓多氣泡回覆感覺更自然。

- 設定：`agents.defaults.humanDelay` (透過 `agents.list[].humanDelay` 針對每個 agent 進行覆寫)。
- 模式：`off` (預設), `natural` (800–2500ms), `custom` (`minMs`/`maxMs`)。
- 僅適用於 **區塊回覆**，不適用於最終回覆或工具摘要。

## "串流區塊或全部"

這對應到：

- **串流區塊：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (隨時發送)。非 Telegram 通道還需要 `*.blockStreaming: true`。
- **在結束時串流所有內容：** `blockStreamingBreak: "message_end"` (清除一次，如果非常長可能會有多個區塊)。
- **無區塊串流：** `blockStreamingDefault: "off"` (僅最終回覆)。

**通道備註：** 除非明確將 `*.blockStreaming` 設定為 `true`，否則區塊串流是**關閉** 的。通道可以串流即時預覽 (`channels.<channel>.streaming`) 而不發送區塊回覆。

設定位置提醒：`blockStreaming*` 預設值位於 `agents.defaults` 之下，而非根設定。

## 預覽串流模式

主要鍵：`channels.<channel>.streaming`

模式：

- `off`：停用預覽串流。
- `partial`：單一預覽，會被最新文字取代。
- `block`：在區塊/附加步驟中進行預覽更新。
- `progress`：生成期間進行進度/狀態預覽，完成時提供最終答案。

### 頻道映射

| 頻道       | `off` | `partial` | `block` | `progress`       |
| ---------- | ----- | --------- | ------- | ---------------- |
| Telegram   | ✅    | ✅        | ✅      | 映射到 `partial` |
| Discord    | ✅    | ✅        | ✅      | 映射到 `partial` |
| Slack      | ✅    | ✅        | ✅      | ✅               |
| Mattermost | ✅    | ✅        | ✅      | ✅               |

僅限 Slack：

- 當 `channels.slack.streaming.mode="partial"`（預設值：`true`）時，`channels.slack.streaming.nativeTransport` 會切換 Slack 原生串流 API 呼叫。
- Slack 原生串流和 Slack 助手執行緒狀態需要一個回覆執行緒目標；頂層 DM 不會顯示該執行緒樣式預覽。

舊版金鑰遷移：

- Telegram：舊版 `streamMode` 和純量/布林值 `streaming` 值會由 doctor/config 相容性路徑偵測並遷移至 `streaming.mode`。
- Discord：`streamMode` + 布林值 `streaming` 自動遷移至 `streaming` 列舉。
- Slack：`streamMode` 自動遷移至 `streaming.mode`；布林值 `streaming` 自動遷移至 `streaming.mode` 加上 `streaming.nativeTransport`；舊版 `nativeStreaming` 自動遷移至 `streaming.nativeTransport`。

### 執行時期行為

Telegram：

- 在 DM 和群組/主題中使用 `sendMessage` + `editMessageText` 預覽更新。
- 當預覽顯示約一分鐘後，會傳送全新的最終訊息而不是就地編輯，然後清理預覽，讓 Telegram 的時間戳記反映回覆完成。
- 當明確啟用 Telegram 區塊串流時，會跳過預覽串流（以避免重複串流）。
- `/reasoning stream` 可以將推理寫入預覽。

Discord：

- 使用傳送 + 編輯預覽訊息。
- `block` 模式使用草稿區塊化 (`draftChunk`)。
- 當明確啟用 Discord 區塊串流時，會跳過預覽串流。
- 最終媒體、錯誤和明確回覆的承載會取消待處理的預覽而不重新整理新草稿，然後使用正常傳遞。

Slack：

- `partial` 可在可用時使用 Slack 原生串流 (`chat.startStream`/`append`/`stop`)。
- `block` 使用附加樣式的草稿預覽。
- `progress` 使用狀態預覽文字，然後是最終答案。
- 原生和草稿預覽串流會抑制該輪次的區塊回覆，因此 Slack 回覆僅透過一個傳遞路徑進行串流。
- 最終媒體/錯誤承載和進度最終結果不會建立一次性草稿訊息；只有可編輯預覽的文字/區塊最終結果會重新整理待處理的草稿文字。

Mattermost：

- 將思考、工具活動和部分回覆文字串流到單一草稿預覽貼文中，當最終答案可安全傳送時就地定稿。
- 如果在定稿時預覽貼文已被刪除或無法使用，則回退為傳送新的最終貼文。
- 最終媒體/錯誤承載會在正常傳遞之前取消待處理的預覽更新，而不是重新整理臨時預覽貼文。

Matrix：

- 當最終文字可以重複使用預覽事件時，草稿預覽會就地定稿。
- 僅媒體、錯誤和回覆目標不匹配的最終結果會在正常傳遞之前取消待處理的預覽更新；已可見的過時預覽會被刪除。

### 工具進度預覽更新

預覽串流還可以包含 **工具進度 (tool-progress)** 更新——即短狀態行，例如「正在搜尋網路」、「正在讀取檔案」或「正在呼叫工具」——這些會在工具執行期間出現在同一條預覽訊息中，位於最終回覆之前。這可以讓多步驟工具輪次在第一次思考預覽和最終答案之間保持視覺上的活躍，而不是沈默無聲。

支援的介面：

- **Discord**、**Slack** 和 **Telegram** 在預覽串流啟用時，預設會將工具進度串流到即時預覽編輯中。
- Telegram 自 `v2026.4.22` 版本發布時已啟用工具進度預覽更新；保持啟用可保留該已發布的行為。
- **Mattermost** 已將工具活動併入其單一草稿預覽貼文中（見上文）。
- 工具進度編輯遵循作用中的預覽串流模式；當預覽串流為 `off` 或當區塊串流已接管訊息時，它們將被跳過。
- 若要保留預覽串流但隱藏工具進度行，請將該頻道的 `streaming.preview.toolProgress` 設定為 `false`。若要完全停用預覽編輯，請將 `streaming.mode` 設定為 `off`。

範例：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": false
        }
      }
    }
  }
}
```

## 相關

- [訊息](/zh-Hant/concepts/messages) — 訊息生命週期與傳遞
- [重試](/zh-Hant/concepts/retry) — 傳遞失敗時的重試行為
- [頻道](/zh-Hant/channels) — 各頻道的串流支援
