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

有關完整架構，請參閱 [Configuration](/zh-Hant/gateway/configuration)。

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
- 控制指令會略過防抖，使其保持獨立——**除非**頻道明確選擇加入相同發送者 DM 合併（例如 [BlueBubbles `coalesceSameSenderDms`](/zh-Hant/channels/bluebubbles#coalescing-split-send-dms-command--url-in-one-composition)），在此情況下，DM 指令會在防抖視窗內等待，以便分割發送的承載能加入同一個代理程式回合。

## 會話和裝置

會話由閘道擁有，而非由用戶端擁有。

- 直接聊天會合併為代理程式主會話金鑰。
- 群組/頻道會獲得自己的會話金鑰。
- 會話儲存和逐字稿位於閘道主機上。

多個裝置/頻道可以對應到同一個會話，但歷史記錄不會完全同步回每個用戶端。建議：使用一個主要裝置進行長時間對話，以避免上下文分歧。控制 UI 和 TUI 始終顯示閘道支援的會話逐字稿，因此它們是事實來源。

詳細資訊：[Session management](/zh-Hant/concepts/session)。

## 工具結果元資料

工具結果 `content` 是模型可見的結果。工具結果 `details` 是
用於 UI 渲染、診斷、媒體傳遞和外掛程式的執行時期元數據。

OpenClaw 保持該邊界清晰：

- `toolResult.details` 會在提供者重放和壓縮輸入之前被移除。
- 持久化的會話紀錄僅保留有界的 `details`；過大的元數據
  會被替換為標記為 `persistedDetailsTruncated: true` 的精簡摘要。
- 外掛程式和工具應將模型必須閱讀的文字放在 `content` 中，而不僅僅是
  在 `details` 中。

## 輸入內容與歷史記錄上下文

OpenClaw 將 **提示主體** 與 **指令主體** 分開：

- `Body`：發送給代理的提示文字。這可能包括頻道信封和
  可選的歷史記錄包裝器。
- `CommandBody`：用於指令/指令解析的原始使用者文字。
- `RawBody`：`CommandBody` 的舊版別名（為了相容性而保留）。

當頻道提供歷史記錄時，它會使用共享的包裝器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

對於 **非直接聊天**（群組/頻道/聊天室），**目前訊息主體** 會加上
傳送者標籤的前綴（與歷史記錄項目使用的樣式相同）。這使得即時和佇列/歷史
訊息在代理提示中保持一致。

歷史記錄緩衝區是 **僅包含待處理項目** 的：它們包括未*未*
觸發執行的群組訊息（例如，提及閘門訊息），並且 **排除**
已經在會話紀錄中的訊息。

指令移除僅適用於 **目前訊息** 部分，以便歷史記錄
保持完整。包裝歷史記錄的頻道應將 `CommandBody`（或
`RawBody`）設定為原始訊息文字，並將 `Body` 保留為組合提示。
歷史記錄緩衝區可透過 `messages.groupChat.historyLimit`（全域
預設值）和各頻道的覆寫進行配置，例如 `channels.slack.historyLimit` 或
`channels.telegram.accounts.<id>.historyLimit`（設定 `0` 以停用）。

## 佇列與後續追蹤

如果執行已經在進行中，傳入訊息可以加入佇列、導向當前執行，或收集以進行後續輪次。

- 透過 `messages.queue`（以及 `messages.queue.byChannel`）進行配置。
- 模式：`interrupt`、`steer`、`followup`、`collect`，以及積壓變體。

詳情：[佇列處理](/zh-Hant/concepts/queue)。

## 串流、分塊與批次處理

區塊串流會在模型產生文字區塊時發送部分回覆。分塊會遵守頻道文字限制並避免分割圍欄程式碼。

主要設定：

- `agents.defaults.blockStreamingDefault`（`on|off`，預設關閉）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk`（`minChars|maxChars|breakPreference`）
- `agents.defaults.blockStreamingCoalesce`（基於閒置的批次處理）
- `agents.defaults.humanDelay`（區塊回覆之間類似人的暫停）
- 頻道覆寫：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 頻道需要明確指定 `*.blockStreaming: true`）

詳情：[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 推論可見性與 Token

OpenClaw 可以顯示或隱藏模型推論：

- `/reasoning on|off|stream` 控制可見性。
- 推論內容由模型產生時，仍會計入 Token 使用量。
- Telegram 支援將推論串流傳輸至草稿氣泡。

詳情：[思考 + 推論指令](/zh-Hant/tools/thinking) 和 [Token 使用](/zh-Hant/reference/token-use)。

## 前綴、串接與回覆

外寄訊息格式化集中在 `messages` 中：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（外寄前綴串聯），以及 `channels.whatsapp.messagePrefix`（WhatsApp 傳入前綴）
- 透過 `replyToMode` 和各頻道預設值進行回覆串接

詳情：[配置](/zh-Hant/gateway/config-agents#messages) 和頻道文件。

## 靜默回覆

精確的靜默權杖 `NO_REPLY` / `no_reply` 意指「不傳送使用者可見的回覆」。
當一個輪次也有待處理的工具媒體，例如生成的 TTS 音訊時，OpenClaw 會移除靜默文字但仍會傳送媒體附件。
OpenClaw 會根據對話類型解析該行為：

- 直接對話預設不允許靜默，並會將單純的靜默回覆重寫為簡短的可见後備訊息。
- 群組/頻道預設允許靜默。
- 內部協調預設允許靜默。

OpenClaw 也會將靜默回覆用於在非直接對話中任何助理回覆之前發生的內部執行器失敗，因此群組/頻道不會看到閘道錯誤樣板文字。直接對話預設會顯示精簡的失敗文案；
只有在 `/verbose` 為 `on` 或 `full` 時，才會顯示原始執行器詳細資訊。

預設值位於 `agents.defaults.silentReply` 和
`agents.defaults.silentReplyRewrite` 之下；`surfaces.<id>.silentReply` 和
`surfaces.<id>.silentReplyRewrite` 可以針對每個介面覆寫這些設定。

當父工作階段有一個或多個待處理的衍生子代理程式執行時，單純的靜默回覆將會在所有介面上被捨棄，而不是被重寫，以便父工作階段保持靜默，直到子完成事件傳送真正的回覆。

## 相關

- [串流處理](/zh-Hant/concepts/streaming) — 即時訊息傳送
- [重試](/zh-Hant/concepts/retry) — 訊息傳送重試行為
- [佇列](/zh-Hant/concepts/queue) — 訊息處理佇列
- [頻道](/zh-Hant/channels) — 訊息平台整合
