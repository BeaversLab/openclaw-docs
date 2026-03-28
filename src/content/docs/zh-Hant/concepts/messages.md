---
summary: "訊息流、工作階段、佇列以及推理可見性"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "訊息"
---

# 訊息

本頁說明 OpenClaw 如何處理傳入訊息、工作階段、佇列、串流以及推理可見性。

## 訊息流（高層級）

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

主要控制項位於設定中：

- `messages.*` 用於前綴、佇列和群組行為。
- `agents.defaults.*` 用於區塊串流和分塊預設值。
- 頻道覆寫（`channels.whatsapp.*`、`channels.telegram.*` 等）用於上限和串流切換。

請參閱 [設定](/zh-Hant/gateway/configuration) 以取得完整的架構。

## 傳入去重

通道在重新連接後可以重新傳遞相同的訊息。OpenClaw 會維護一個短期快取，以通道/帳號/對等方/會話/訊息 ID 為鍵值，因此重複的傳遞不會觸發另一次代理程式的執行。

## 輸入防彈跳

來自**同一發送者**的快速連續訊息可以透過 `messages.inbound` 合併為單一代理程式輪次。防彈跳範圍限定為每個通道 + 對話，並使用最新訊息進行回覆串接/ID 處理。

配置（全域預設值 + 各通道覆寫）：

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

- 防彈跳僅適用於**純文字**訊息；媒體/附件會立即排程處理。
- 控制命令會略過防彈跳，以保持其獨立性。

## 會話與裝置

會話由閘道擁有，而非由用戶端擁有。

- 直接聊天會合併為代理程式主會話金鑰。
- 群組/頻道則有自己的會話金鑰。
- 會話儲存和對話紀錄位於閘道主機上。

多個裝置/頻道可以對應到同一個會話，但歷史記錄不會完全同步回每個用戶端。建議：使用一個主要裝置進行長時間對話，以避免語境分歧。控制 UI 和 TUI 始終顯示閘道備份的會話記錄，因此它們是真相來源。

詳情：[會話管理](/zh-Hant/concepts/session)。

## 輸入內容與歷史語境

OpenClaw 將 **提示詞主體 (prompt body)** 與 **指令主體 (command body)** 分開：

- `Body`：傳送給代理程式的提示詞文字。這可能包含頻道包層和可選的歷史記錄包裝器。
- `CommandBody`：用於解析指令/指令的原始使用者文字。
- `RawBody`：`CommandBody` 的舊式別名（為了相容性而保留）。

當頻道提供歷史記錄時，它使用共用的包裝器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

對於**非直接聊天**（群組/頻道/房間），**目前訊息內容**會以傳送者標籤為前綴（與歷史紀錄項目使用的樣式相同）。這能確保即時訊息與佇列/歷史訊息在代理提示中的一致性。

歷史緩衝區**僅包含待處理項目**：包括並未觸發執行的群組訊息（例如，提及閘道的訊息），並**排除**已存在於對話紀錄中的訊息。

指令移除僅適用於 **current message** 部分，因此歷史記錄保持不變。封裝歷史記錄的頻道應將 `CommandBody`（或 `RawBody`）設定為原始訊息文字，並將 `Body` 保留為組合提示。歷史記錄緩衝區可透過 `messages.groupChat.historyLimit`（全域預設值）以及每個頻道的覆寫值來設定，例如 `channels.slack.historyLimit` 或 `channels.telegram.accounts.<id>.historyLimit`（將 `0` 設定為停用）。

## 佇列與後續處理

如果執行已經在使用中，傳入訊息可以加入佇列、引導至目前執行中，或是收集供後續回合使用。

- 透過 `messages.queue`（以及 `messages.queue.byChannel`）進行設定。
- 模式：`interrupt`、`steer`、`followup`、`collect`，以及積壓變體。

詳情：[佇列](/zh-Hant/concepts/queue)。

## 串流、分塊與批次處理

區塊串流會在模型產生文字區塊時發送部分回覆。分塊會遵守頻道文字限制，並避免分割圍欄程式碼。

關鍵設定：

- `agents.defaults.blockStreamingDefault` (`on|off`，預設為關閉)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (基於閒置的批次處理)
- `agents.defaults.humanDelay` (區塊回覆之間擬人化的暫停)
- 頻道覆寫：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 頻道需要明確指定 `*.blockStreaming: true`）

詳情：[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 推理可見性與 Token

OpenClaw 可以顯示或隱藏模型推理：

- `/reasoning on|off|stream` 控制可見性。
- 推理內容在由模型產生時仍會計入 Token 使用量。
- Telegram 支援將推理串流輸送到草稿氣泡中。

詳情：[思考 + 推理指令](/zh-Hant/tools/thinking) 和 [Token 使用](/zh-Hant/reference/token-use)。

## 前綴、串接與回覆

外發訊息格式化集中於 `messages`：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（出站前綴串聯），以及 `channels.whatsapp.messagePrefix`（WhatsApp 入站前綴）
- 透過 `replyToMode` 和各頻道預設值進行回覆串接

詳情：[Configuration](/zh-Hant/gateway/configuration-reference#messages) 與頻道文件。
