---
summary: "訊息流程、工作階段、佇列與推論可見性"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "訊息"
---

OpenClaw 透過會話解析、佇列、串流、工具執行和推理可見性的管線來處理傳入訊息。本頁面繪製了從傳入訊息到回覆的路徑。

## 訊息流程（高層級）

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

關鍵調整選項位於設定中：

- `messages.*` 用於前綴、佇列和群組行為。
- `agents.defaults.*` 用於區塊串流和分塊預設值。
- 頻道覆寫（`channels.whatsapp.*`、`channels.telegram.*` 等）用於上限和串流切換。

完整架構請參閱 [Configuration](/zh-Hant/gateway/configuration)。

## 傳入去重

頻道可能會在重新連線後重新傳送相同的訊息。OpenClaw 會維護一個短期快取，以頻道/帳戶/對等/會話/訊息 ID 作為鍵值，以確保重複傳送不會觸發另一次代理程式執行。

## 傳入防抖

來自**相同發送者**的快速連續訊息可以透過 `messages.inbound` 合併為單一代理程式回合。防抖範圍涵蓋每個頻道 + 對話，並使用最新的訊息進行回覆執行緒/ID 處理。

設定（全域預設值 + 各頻道覆寫）：

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500,
      },
    },
  },
}
```

註記：

- 防抖僅適用於**純文字**訊息；媒體/附件會立即清除。
- 控制指令會略過去彈跳（debounce），使其保持獨立。明確選擇加入相同發送者私訊合併的頻道，可以將私訊指令保留在去彈跳視窗內，以便分割發送的酬載能加入同一個代理回合。

## 會話和裝置

會話由閘道擁有，而非由用戶端擁有。

- 直接聊天會合併為代理程式主會話金鑰。
- 群組/頻道會獲得自己的會話金鑰。
- 會話儲存和逐字稿位於閘道主機上。

多個裝置/頻道可以對應到同一個會話，但歷史記錄不會完全同步回每個用戶端。建議：使用一個主要裝置進行長時間對話，以避免上下文分歧。控制 UI 和 TUI 始終顯示閘道支援的會話逐字稿，因此它們是事實來源。

詳情：[Session management](/zh-Hant/concepts/session)。

## 工具結果元資料

工具結果 `content` 是模型可見的結果。工具結果 `details` 是用於 UI 渲染、診斷、媒體傳遞和外掛程式的執行時期中繼資料。

OpenClaw 保持該邊界清晰：

- `toolResult.details` 會在提供者重播和壓縮輸入之前被移除。
- 持久化的會話記錄僅保留有界的 `details`；過大的中繼資料會被標記為 `persistedDetailsTruncated: true` 的精簡摘要所取代。
- 外掛程式和工具應將模型必須閱讀的文字放在 `content` 中，而不僅僅是在 `details` 中。

## 輸入內容與歷史記錄上下文

OpenClaw 將 **提示主體** 與 **指令主體** 分開：

- `BodyForAgent`：當前訊息的主要面向模型的文字。頻道外掛程式應將此內容重點放在發送者當前的提示文字上。
- `Body`：舊版提示後援。這可能包含頻道封包和可選的歷史記錄包裝器，但當 `BodyForAgent` 可用時，目前的頻道不應將其依賴為主要的模型輸入。
- `CommandBody`：用於指令/命令解析的原始使用者文字。
- `RawBody`：`CommandBody` 的舊版別名（為了相容性而保留）。

當頻道提供歷史記錄時，它會使用一個共用的包裝器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

對於**非直接聊天**（群組/頻道/聊天室），**目前訊息內文**會加上發送者標籤的前綴（與歷史記錄項目使用的樣式相同）。這能確保即時訊息和佇列/歷史訊息在代理提示中保持一致。

歷史緩衝區是**僅待處理**的：它們包含未觸發執行的群組訊息（例如，提及閘道的訊息），並且**排除**已經在會話記錄中的訊息。

指令移除 (Directive stripping) 僅適用於 **當前訊息** 部分，因此
歷史記錄保持不變。打包歷史記錄的頻道應將 `CommandBody` (或
`RawBody`) 設定為原始訊息文字，並將 `Body` 保留為組合後的提示詞。
結構化的歷史記錄、回覆、轉發和頻道元數據在組裝提示詞期間會被
渲染為使用者角色的非受信任內容區塊。
歷史記錄緩衝區可透過 `messages.groupChat.historyLimit` (全域
預設值) 和各頻道的覆寫設定來配置，例如 `channels.slack.historyLimit` 或
`channels.telegram.accounts.<id>.historyLimit` (設定 `0` 以停用)。

## 佇列與後續處理

如果執行已經啟動，傳入的訊息可以加入佇列、導向當前的
執行，或是收集起來以進行後續的輪次處理。

- 透過 `messages.queue` (和 `messages.queue.byChannel`) 進行配置。
- 預設模式為 `steer`，當導向回退至
  佇列後續傳遞時，具有 500 毫秒的後續處理防抖。
- 模式包括：`steer`、`followup`、`collect`、`steer-backlog`、`interrupt`，以及
  舊版的一次一個 `queue` 模式。

詳細資訊：[指令佇列](/zh-Hant/concepts/queue) 和 [導向佇列](/zh-Hant/concepts/queue-steering)。

## 頻道執行權

頻道外掛程式可以在訊息進入工作階段佇列之前維持順序、對輸入進行防抖處理，並套用傳輸
反向壓力。它們不應在代理輪次周圍設定獨立的逾時。一旦訊息被路由到
工作階段，長時間執行的工作即由工作階段、工具和執行時
生命週期管理，以便所有頻道都能一致地回報並從緩慢的輪次中恢復。

## 串流、分塊與批次處理

區塊串流會在模型產生文字區塊時發送部分回覆。
分塊會遵守頻道文字限制，並避免分割圍欄程式碼。

關鍵設定：

- `agents.defaults.blockStreamingDefault` (`on|off`，預設關閉)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (基於閒置的批次處理)
- `agents.defaults.humanDelay` (區塊回覆之間的類人暫停)
- 頻道覆寫：`*.blockStreaming` 和 `*.blockStreamingCoalesce` (非 Telegram 頻道需要明確指定 `*.blockStreaming: true`)

詳情：[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 推理可見性和 Token

OpenClaw 可以顯示或隱藏模型推理：

- `/reasoning on|off|stream` 控制可見性。
- 當推理內容由模型生成時，仍會計入 Token 使用量。
- Telegram 支援將推理串流傳送到最終傳遞後即刪除的暫時性草稿氣泡；請使用 `/reasoning on` 以取得持續存在的推理輸出。

詳情：[思考 + 推理指令](/zh-Hant/tools/thinking) 和 [Token 使用](/zh-Hant/reference/token-use)。

## 前綴、串接和回覆

外發訊息格式化集中於 `messages`：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix` (外發前綴串聯)，以及 `channels.whatsapp.messagePrefix` (WhatsApp 內發前綴)
- 透過 `replyToMode` 和各頻道預設值進行的回覆串接

詳情：[組態](/zh-Hant/gateway/config-agents#messages) 和頻道文件。

## 靜默回覆

確切的靜默 Token `NO_REPLY` / `no_reply` 意味著「不傳遞使用者可見的回覆」。
當一輪對話也有待處理的工具媒體 (例如產生的 TTS 音訊) 時，OpenClaw
會移除靜默文字，但仍會傳遞媒體附件。
OpenClaw 會根據對話類型解析該行為：

- 直接對話預設不允許靜默，並會將純靜默回覆
  重寫為簡短的可見回退訊息。
- 群組/頻道預設允許靜默。
- 內部協調預設允許靜默。

在非直接聊天中，如果 OpenClaw 在任何助理回覆之前發生內部執行器失敗，也會使用靜默回覆，因此群組/頻道不會看到閘道錯誤的標準文字。直接聊天預設會顯示簡潔的失敗說明；只有在 `/verbose` 為 `on` 或 `full` 時，才會顯示原始執行器詳細資訊。

預設值位於 `agents.defaults.silentReply` 和 `agents.defaults.silentReplyRewrite` 之下；`surfaces.<id>.silentReply` 和 `surfaces.<id>.silentReplyRewrite` 可以針對每個介面進行覆寫。

當父階段有一個或多個擱置中產生的子代理程式執行時，純靜默回復將在所有介面上被捨棄而不是被重寫，因此父階段會保持靜默，直到子完成事件傳送真正的回覆。

## 相關

- [訊息生命週期重構](/zh-Hant/concepts/message-lifecycle-refactor) - 目標持續性傳送與接收設計
- [串流](/zh-Hant/concepts/streaming) — 即時訊息傳遞
- [重試](/zh-Hant/concepts/retry) — 訊息傳遞重試行為
- [佇列](/zh-Hant/concepts/queue) — 訊息處理佇列
- [頻道](/zh-Hant/channels) — 訊息平台整合
