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

- `text_delta/events`：模型串流事件（對於非串流模型可能較稀疏）。
- `chunker`：`EmbeddedBlockChunker` 套用最小/最大邊界 + 中斷偏好。
- `channel send`：實際的輸出訊息（區塊回覆）。

**控制選項：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（預設關閉）。
- 頻道覆寫：`*.blockStreaming`（以及每個帳號的變體）以強制每個頻道使用 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在發送前合併串流區塊）。
- 頻道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 頻道分塊模式：`*.chunkMode`（`length` 預設，`newline` 在長度分塊前於空行（段落邊界）分割）。
- Discord 軟上限：`channels.discord.maxLinesPerMessage`（預設 17）分割過長的回覆以避免 UI 遮蔽。

**邊界語義：**

- `text_end`：在分塊器發出時立即串流區塊；在每次 `text_end` 時排清。
- `message_end`：等到助手訊息完成後，再排清緩衝輸出。

如果緩衝文字超過 `maxChars`，`message_end` 仍會使用分塊器，以便在最後發出多個區塊。

### 區塊串流的媒體傳遞

`MEDIA:` 指令是正常的傳遞中繼資料。當區塊串流提前發送
媒體區塊時，OpenClaw 會記住該輪次的傳遞。如果最終的
助手負載重複相同的媒體 URL，最終傳遞會剝除
重複的媒體，而不是再次傳送附件。

完全重複的最終負載會被抑制。如果最終負載在已串流的媒體周圍添加了不同的文字，OpenClaw 仍會發送新文字，同時保持媒體只發送一次。這可以防止當代理在串流期間發出 `MEDIA:` 且提供者也在完成的回覆中包含它時，在 Telegram 等頻道上出現重複的語音訊息或檔案。

## 分塊演算法（低/高界限）

區塊分塊由 `EmbeddedBlockChunker` 實作：

- **下界：** 除非被強制，否則在緩衝區 >= `minChars` 之前不發送。
- **上界：** 偏好在 `maxChars` 之前分割；如果被強制，則在 `maxChars` 處分割。
- **斷行偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 強制斷行。
- **程式碼圍欄：** 永遠不要在圍欄內分割；當在 `maxChars` 處被強制時，關閉並重新開啟圍欄以保持 Markdown 有效。

`maxChars` 被限制在頻道 `textChunkLimit`，因此您無法超過每個頻道的上限。

## 合併（合併串流區塊）

當啟用區塊串流時，OpenClaw 可以在發送之前 **合併連續的區塊區塊**。這在仍然提供漸進式輸出的同時，減少了「單行垃圾訊息」。

- 合併會在排空之前等待 **閒置間隙** (`idleMs`)。
- 緩衝區上限為 `maxChars`，如果超過將會排空。
- `minChars` 防止發送微小的片段，直到積累了足夠的文字
  (最終排空總是發送剩餘的文字)。
- 連接器衍生自 `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`， `newline` → `\n`， `sentence` → 空格)。
- 可透過 `*.blockStreamingCoalesce` 進行頻道覆寫 (包括每個帳戶的設定)。
- 除非被覆寫，否則 Signal/Slack/Discord 的預設合併 `minChars` 會提升至 1500。

## 區塊之間的類人節奏

啟用區塊串流時，您可以在區塊回覆之間加入**隨機暫停**（在第一個區塊之後）。這讓多氣泡回覆感覺更自然。

- 設定： `agents.defaults.humanDelay` (透過 `agents.list[].humanDelay` 按代理覆寫)。
- 模式：`off`（預設）、`natural`（800-2500ms）、`custom`（`minMs`/`maxMs`）。
- 僅適用於 **區塊回覆**，不適用於最終回覆或工具摘要。

## "串流區塊或全部"

這對應到：

- **串流區塊：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（即時發送）。非 Telegram 頻道還需要 `*.blockStreaming: true`。
- **在結尾串流所有內容：** `blockStreamingBreak: "message_end"`（一次清空，如果非常長可能會有多個區塊）。
- **無區塊串流：** `blockStreamingDefault: "off"`（僅最終回覆）。

**頻道備註：** 除非
`*.blockStreaming` 被明確設定為 `true`，否則區塊串流是**關閉**的。頻道可以在沒有區塊回覆的情況下串流即時預覽
(`channels.<channel>.streaming`)。

設定位置提醒：`blockStreaming*` 預設值位於
`agents.defaults` 之下，而非根設定。

## 預覽串流模式

標準鍵：`channels.<channel>.streaming`

模式：

- `off`：停用預覽串流。
- `partial`：單一預覽，會被最新文字取代。
- `block`：以分塊/附加步驟更新預覽。
- `progress`：生成期間的進度/狀態預覽，完成時顯示最終答案。

`streaming.mode: "block"` 是一種適用於支援編輯的頻道（如 Discord 和 Telegram）的預覽串流模式。
它不會在該處啟用頻道區塊傳遞。
當您想要正常的區塊回覆時，請使用 `streaming.block.enabled` 或舊版的 `blockStreaming` 頻道鍵。
Microsoft Teams 是例外：它沒有草稿預覽區塊傳輸，因此 `streaming.mode: "block"` 會對應到 Teams 區塊傳遞，而不是原生的部分/進度串流。

### 頻道對應

| 頻道       | `off` | `partial` | `block` | `progress`     |
| ---------- | ----- | --------- | ------- | -------------- |
| Telegram   | ✅    | ✅        | ✅      | 可編輯進度草稿 |
| Discord    | ✅    | ✅        | ✅      | 可編輯進度草稿 |
| Slack      | ✅    | ✅        | ✅      | ✅             |
| Mattermost | ✅    | ✅        | ✅      | ✅             |
| MS Teams   | ✅    | ✅        | ✅      | 原生進度串流   |

僅限 Slack：

- 當 `channels.slack.streaming.mode="partial"` 時，`channels.slack.streaming.nativeTransport` 會切換 Slack 原生串流 API 呼叫（預設值：`true`）。
- Slack 原生串流和 Slack 助手執行緒狀態需要一個回覆執行緒目標。頂層 DM 不會顯示該執行緒樣式的預覽，但它們仍然可以使用 Slack 草稿預覽貼文和編輯。

舊版金鑰遷移：

- Telegram：舊版 `streamMode` 和純量/布林值 `streaming` 值會被 doctor/config 相容性路徑偵測並遷移至 `streaming.mode`。
- Discord：`streamMode` + 布林值 `streaming` 仍保留為 `streaming` 列舉的執行時期別名；執行 `openclaw doctor --fix` 以重寫已保存的設定。
- Slack：`streamMode` 仍保留為 `streaming.mode` 的執行時期別名；布林值 `streaming` 仍保留為 `streaming.mode` 加上 `streaming.nativeTransport` 的執行時期別名；舊版 `nativeStreaming` 仍保留為 `streaming.nativeTransport` 的執行時期別名。執行 `openclaw doctor --fix` 以重寫已保存的設定。

### 執行時期行為

Telegram：

- 在 DM 和群組/主題中，使用 `sendMessage` + `editMessageText` 預覽更新。
- 最終文字會就地編輯作用中的預覽；較長的最終結果會重用該訊息作為第一個區塊，並僅發送剩餘的區塊。
- `progress` 模式會將工具進度保留在可編輯的狀態草稿中，在完成時清除該草稿，並透過正常傳遞發送最終答案。
- 如果在確認完成文字之前最終編輯失敗，OpenClaw 會使用正常的最終傳遞並清理過時的預覽。
- 當明確啟用 Telegram 區塊串流時，會跳過預覽串流（以避免重複串流）。
- `/reasoning stream` 可以將推理寫入在最終傳遞後會被刪除的暫時性預覽。

Discord：

- 使用傳送 + 編輯預覽訊息。
- `block` 模式使用草稿區塊分割（`draftChunk`）。
- 當明確啟用 Discord 區塊串流時，會跳過預覽串流。
- 最終媒體、錯誤和明確回應的 payload 會取消待處理的預覽而不重新整理新的草稿，然後使用正常傳遞方式。

Slack：

- `partial` 可在可用時使用 Slack 原生串流 (`chat.startStream`/`append`/`stop`)。
- `block` 使用附加式草稿預覽。
- `progress` 使用狀態預覽文字，然後是最終答案。
- 沒有回應執行緒的頂層私訊 (DM) 會使用草稿預覽貼文和編輯，而不是 Slack 原生串流。
- 原生和草稿預覽串流會抑制該輪次的區塊回應，因此 Slack 回應僅透過一個傳遞路徑串流。
- 最終媒體/錯誤 payload 和進度最終結果不會建立可拋棄的草稿訊息；只有可以編輯預覽的文字/區塊最終結果會重新整理待處理的草稿文字。

Mattermost：

- 將思考、工具活動和部分回應文字串流到單一草稿預覽貼文中，當最終答案可以安全傳送時就地定案。
- 如果在定案時預覽貼文已被刪除或無法使用，則會回退為傳送新的最終貼文。
- 最終媒體/錯誤 payload 會在正常傳遞之前取消待處理的預覽更新，而不是重新整理臨時預覽貼文。

Matrix：

- 當最終文字可以重複使用預覽事件時，草稿預覽會就地定案。
- 僅媒體、錯誤和回應目標不符的最終結果會在正常傳遞之前取消待處理的預覽更新；已可見的過時預覽會被撤銷。

### 工具進度預覽更新

預覽串流也可以包含 **工具進度 (tool-progress)** 更新——例如「搜尋網路」、「讀取檔案」或「呼叫工具」等短狀態行——這些會在工具執行時、最終回覆之前，顯示在同一則預覽訊息中。在 Codex app-server 模式下，Codex 的前言/註解訊息也使用這條相同的預覽路徑，因此短暫的「我正在檢查...」進度說明可以串流進入可編輯的草稿，而不會成為最終答案的一部分。這讓多步驟的工具輪次在視覺上保持生動，而不會在第一個思考預覽與最終答案之間顯得沈寂。

長時間執行的工具可能會在返回之前發出類型化進度。例如，`web_fetch` 在啟動時會設定一個五秒計時器：如果提取仍在進行中，預覽可以顯示 `Fetching page content...`；如果提取在該時間之前完成或被取消，則不會發出進度行。稍後的最終工具結果仍會正常傳遞給模型。

支援的介面：

- **Discord**、**Slack**、**Telegram** 和 **Matrix** 在啟用預覽串流時，預設會將工具進度和 Codex 前言更新串流到即時預覽編輯中。Microsoft Teams 在個人聊天中使用其原生的進度串流。
- Telegram 自 `v2026.4.22` 起發佈時已啟用工具進度預覽更新；保持啟用可保留該已發布的行為。
- **Mattermost** 已經將工具活動合併到其單一草稿預覽貼文中（見上文）。
- 工具進度編輯遵循活動的預覽串流模式；當預覽串流為 `off` 或區塊串流已接管訊息時，它們會被跳過。在 Telegram 上，`streaming.mode: "off"` 為僅限最終結果：一般進度閒談也會被抑制，而不是作為獨立狀態訊息傳遞，而核准提示、媒體負載和錯誤仍會正常路由。
- 要保留預覽串流但隱藏工具進度行，請將該頻道的 `streaming.preview.toolProgress` 設定為 `false`。要保留工具進度行可見同時隱藏 command/exec 文字，請將 `streaming.preview.commandText` 設定為 `"status"` 或將 `streaming.progress.commandText` 設定為 `"status"`；預設值為 `"raw"` 以保留已發布的行為。此策略由使用 OpenClaw 緊湊進度渲染器的草稿/進度頻道共用，包括 Discord、Matrix、Microsoft Teams、Mattermost、Slack 草稿預覽和 Telegram。要完全停用預覽編輯，請將 `streaming.mode` 設定為 `off`。
- Telegram 選取的引用回覆是個例外：當 `replyToMode` 不是 `"off"` 且存在選取的引用文字時，OpenClaw 會跳過該輪次的答案預覽串流，因此工具進度預覽行無法呈現。沒有選取引用文字的當前訊息回覆仍然會保留預覽串流。詳見 [Telegram 頻道文件](/zh-Hant/channels/telegram)。

保持進度行可見，但隱藏原始指令/執行文字：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

在另一個精簡進度頻道金鑰下使用相同的結構，例如 `channels.discord`、`channels.matrix`、`channels.msteams`、`channels.mattermost` 或 Slack 草稿預覽。對於 progress-draft 模式，請將相同的政策置於 `streaming.progress` 下：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

## 相關

- [訊息生命週期重構](/zh-Hant/concepts/message-lifecycle-refactor) - 目標的共享預覽、編輯、串流和最終確認設計
- [進度草稿](/zh-Hant/concepts/progress-drafts) - 在長時間輪次中更新的可見進行中訊息
- [訊息](/zh-Hant/concepts/messages) - 訊息生命週期與傳遞
- [重試](/zh-Hant/concepts/retry) - 傳遞失敗時的重試行為
- [頻道](/zh-Hant/channels) - 各頻道的串流支援
