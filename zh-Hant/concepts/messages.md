---
summary: "訊息流程、工作階段、佇列，以及推理可見性"
read_when:
  - 說明傳入訊息如何轉變為回覆
  - 釐清工作階段、佇列模式或串流行為
  - 記錄推理可見性與使用影響
title: "訊息"
---

# 訊息

本頁面綜合說明 OpenClaw 如何處理傳入訊息、工作階段、佇列、串流以及推理可見性。

## 訊息流程（高層級）

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

主要控制選項位於設定檔中：

- `messages.*` 用於前綴、佇列和群組行為。
- `agents.defaults.*` 用於區塊串流和分塊預設值。
- 頻道覆寫（`channels.whatsapp.*`、`channels.telegram.*` 等）用於上限和串流切換。

完整架構請參閱 [Configuration](/zh-Hant/gateway/configuration)。

## 傳入訊息去重

頻道可能在重新連線後重新傳遞相同的訊息。OpenClaw 會維護一個短期快取，以頻道/帳號/對象/工作階段/訊息 ID 作為鍵值，因此重複傳遞不會觸發另一次代理程式執行。

## 傳入訊息防抖

來自**相同傳送者**的快速連續訊息可以透過 `messages.inbound` 整合為單一代理程式輪次。防抖範圍限定為每個頻道 + 對話，並使用最新的訊息進行回覆串接/ID 處理。

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

- 防抖僅適用於**純文字**訊息；媒體/附件會立即排空。
- 控制指令會略過防抖，以保持其獨立性。

## 工作階段與裝置

工作階段由閘道擁有，而非由用戶端擁有。

- 直接聊天會折疊為代理程式主工作階段金鑰。
- 群組/頻道會有自己的工作階段金鑰。
- 工作階段儲存和逐字稿位於閘道主機上。

多個裝置/頻道可以對應到同一個工作階段，但歷史記錄不會完全同步回每個用戶端。建議：在長時間對話中使用一個主要裝置，以避免內容分歧。控制 UI 和 TUI 始終顯示閘道備份的工作階段逐字稿，因此它們是事實來源。

詳細資訊：[Session management](/zh-Hant/concepts/session)。

## 傳入內容與歷史背景

OpenClaw 將**提示內容 (prompt body)** 與**指令內容 (command body)** 分開：

- `Body`: 傳送給代理程式的提示文字。這可能包含通道信封和選用的歷史記錄包裝器。
- `CommandBody`: 用於指令/命令解析的原始使用者文字。
- `RawBody`: `CommandBody` 的舊版別名（為了相容性而保留）。

當通道提供歷史記錄時，它會使用一個共享的包裝器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

對於 **非直接聊天**（群組/頻道/聊天室），**目前訊息內容** 會加上傳送者標籤前綴（與歷史記錄項目使用的樣式相同）。這使得即時訊息和佇列/歷史記錄訊息在代理程式提示中保持一致。

歷史記錄緩衝區是 **僅限待處理** 的：它們包含並未觸發執行的群組訊息（例如，僅限提及的訊息），並且**排除**已經在會話記錄中的訊息。

指令剝除僅適用於 **目前訊息** 部分，以便歷史記錄保持完整。包裝歷史記錄的通道應將 `CommandBody`（或 `RawBody`）設定為原始訊息文字，並將 `Body` 保持為組合提示。
歷史記錄緩衝區可透過 `messages.groupChat.historyLimit`（全域預設值）和每個通道的覆寫設定來配置，例如 `channels.slack.historyLimit` 或
`channels.telegram.accounts.<id>.historyLimit`（設定 `0` 以停用）。

## 佇列與後續處理

如果執行已經在進行中，傳入的訊息可以被放入佇列、引導至目前的執行，或收集起來供後續輪次處理。

- 透過 `messages.queue`（和 `messages.queue.byChannel`）進行配置。
- 模式：`interrupt`、`steer`、`followup`、`collect`，以及積壓變體。

詳細資訊：[佇列](/zh-Hant/concepts/queue)。

## 串流、分塊與批次處理

區塊串流會在模型產生文字區塊時傳送部分回覆。
分塊會遵守通道文字限制，並避免分割圍欄程式碼。

主要設定：

- `agents.defaults.blockStreamingDefault` (`on|off`，預設關閉)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (閒置式批次處理)
- `agents.defaults.humanDelay` (區塊回覆之間的類人暫停)
- 頻道覆寫：`*.blockStreaming` 和 `*.blockStreamingCoalesce` (非 Telegram 頻道需要明確指定 `*.blockStreaming: true`)

詳細資訊：[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 推理可見性與 Token

OpenClaw 可以顯示或隱藏模型推理：

- `/reasoning on|off|stream` 控制可見性。
- 推理內容在由模型產生時，仍會計入 Token 使用量。
- Telegram 支援將推理串流傳送至草稿氣泡。

詳細資訊：[思考 + 推理指令](/zh-Hant/tools/thinking) 和 [Token 使用](/zh-Hant/reference/token-use)。

## 前綴、串接與回覆

外寄訊息格式設定集中在 `messages` 中：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix` (外寄前綴層疊)，加上 `channels.whatsapp.messagePrefix` (WhatsApp 內送前綴)
- 透過 `replyToMode` 與各頻道預設值進行回覆串接

詳細資訊：[設定](/zh-Hant/gateway/configuration#messages) 與頻道文件。

import en from "/components/footer/en.mdx";

<en />
