---
summary: "訊息流程、工作階段、佇列與推論可見性"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "訊息"
---

# 訊息

本頁面將說明 OpenClaw 如何處理傳入訊息、工作階段、佇列、串流以及推論可見性。

## 訊息流程（高階概覽）

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

主要控制選項位於設定中：

- `messages.*` 用於前置詞、佇列與群組行為。
- `agents.defaults.*` 用於區塊串流與分塊的預設值。
- 頻道覆寫（`channels.whatsapp.*`、`channels.telegram.*` 等）用於上限與串流切換。

參閱[設定](/zh-Hant/gateway/configuration)以取得完整的架構。

## 傳入去重

頻道可能在重新連線後重新傳送相同的訊息。OpenClaw 會維護一個短期快取，以頻道/帳號/對象/工作階段/訊息 ID 作為鍵值，以確保重複傳送不會觸發另一次代理程式執行。

## 傳入去彈跳

來自 **相同傳送者** 的快速連續訊息可透過 `messages.inbound` 合併為單一代理程式輪次。去彈跳是以頻道 + 對話為範圍，並使用最新的訊息進行回覆串接/ID 指定。

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

備註：

- 去彈跳僅適用於 **純文字** 訊息；媒體/附件會立即排空。
- 控制指令會略過去抖動（debouncing），因此它們保持獨立——**除非**某個通道明確選擇啟用相同發送者 DM 合併（例如 [BlueBubbles `coalesceSameSenderDms`](/zh-Hant/channels/bluebubbles#coalescing-split-send-dms-command--url-in-one-composition)），在此情況下，DM 指令會在去抖動視窗內等待，以便分割發送的負載能加入同一個代理回合。

## 工作階段與裝置

工作階段歸閘道所有，而非歸用戶端所有。

- 直接聊天會合併至代理程式主工作階段金鑰。
- 群組/頻道則擁有自己的工作階段金鑰。
- 工作階段存放區與文字記錄位於閘道主機上。

多個裝置/頻道可對應至同一個工作階段，但歷史記錄不會完全同步回每個用戶端。建議：長時間對話請使用一個主要裝置，以避免語境分歧。Control UI 與 TUI 一律顯示由閘道備份的工作階段文字記錄，因此其為真實來源。

詳細資訊：[Session 管理](/zh-Hant/concepts/session)。

## 傳入內容與歷史記錄語境

OpenClaw 會將 **提示主體** 與 **指令主體** 分離：

- `Body`：發送給代理的提示文字。這可能包含通道信封和
  可選的歷史記錄包裝器。
- `CommandBody`：用於指令/命令解析的原始使用者文字。
- `RawBody`：`CommandBody` 的舊版別名（為相容性而保留）。

當頻道提供歷史記錄時，它使用一個共享的包裝器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

對於**非直接聊天**（群組/頻道/房間），**當前訊息內容**會加上傳送者標籤前綴（與歷史記錄項目使用的樣式相同）。這使即時訊息和佇列/歷史訊息在 Agent 提示中保持一致。

歷史緩衝區是**僅限待處理**的：它們包含未觸發執行的群組訊息（例如，需要提及才觸發的訊息），並**排除**已經在會話記錄中的訊息。

指令移除僅適用於**目前訊息**部分，因此歷史記錄
保持完整。包裝歷史記錄的通道應將 `CommandBody`（或
`RawBody`）設定為原始訊息文字，並將 `Body` 保留為組合提示。
歷史記錄緩衝區可透過 `messages.groupChat.historyLimit`（全域
預設值）和各通道覆寫（如 `channels.slack.historyLimit` 或
`channels.telegram.accounts.<id>.historyLimit`）（設定 `0` 以停用）進行設定。

## 佇列與後續處理

如果執行已在進行中，傳入訊息可以加入佇列、導入至當前執行，或收集以供後續輪次處理。

- 透過 `messages.queue`（以及 `messages.queue.byChannel`）進行設定。
- 模式：`interrupt`、`steer`、`followup`、`collect`，以及積壓變體。

詳細資訊：[佇列處理](/zh-Hant/concepts/queue)。

## 串流、分塊與批次處理

區塊串流會在模型產生文字區塊時發送部分回覆。分塊會尊重頻道文字限制，並避免分割圍欄程式碼。

關鍵設定：

- `agents.defaults.blockStreamingDefault` (`on|off`，預設關閉)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (基於閒置的批次處理)
- `agents.defaults.humanDelay` (區塊回覆之間類人的暫停)
- 通道覆寫：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 通道需要明確的 `*.blockStreaming: true`）

詳細資訊：[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 推理可見性和 Token

OpenClaw 可以顯示或隱藏模型推理：

- `/reasoning on|off|stream` 控制可見性。
- 推理內容由模型生成時仍會計入 Token 使用量。
- Telegram 支援將推理串流至草稿氣泡中。

詳細資訊：[思考 + 推理指令](/zh-Hant/tools/thinking) 和 [Token 使用](/zh-Hant/reference/token-use)。

## 前綴、串回和回覆

外寄訊息格式化集中在 `messages` 中：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（外寄前綴級聯），加上 `channels.whatsapp.messagePrefix`（WhatsApp 內送前綴）
- 透過 `replyToMode` 和各通道預設值進行回覆串接

詳細資訊：[設定](/zh-Hant/gateway/configuration-reference#messages) 和通道文件。

## 靜默回覆

確切的靜默標記 `NO_REPLY` / `no_reply` 意味著「不傳送使用者可見的回覆」。
OpenClaw 會根據對話類型解析該行為：

- 直接對話預設不允許靜默，並會將純靜默回覆重寫為簡短的可見備用回覆。
- 群組/頻道預設允許靜默。
- 內部編排預設允許靜默。

預設值位於 `agents.defaults.silentReply` 和
`agents.defaults.silentReplyRewrite` 之下；`surfaces.<id>.silentReply` 和
`surfaces.<id>.silentReplyRewrite` 可以針對每個介面進行覆寫。

當父階段有一或多個待處理的產生子代理執行時，純靜默回覆會在所有介面上被丟棄而不是被重寫，因此父階段會保持靜默，直到子代理完成事件傳送真正的回覆。

## 相關

- [串流](/zh-Hant/concepts/streaming) — 即時訊息傳送
- [重試](/zh-Hant/concepts/retry) — 訊息傳送重試行為
- [佇列](/zh-Hant/concepts/queue) — 訊息處理佇列
- [通道](/zh-Hant/channels) — 訊息平台整合
