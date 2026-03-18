---
summary: "訊息流程、工作階段、佇列以及推理可見性"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "訊息"
---

# 訊息

本頁面彙整了 OpenClaw 如何處理傳入訊息、工作階段、佇列、串流以及推理可見性。

## 訊息流程（高層級）

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

主要的控制位元位於配置中：

- `messages.*` 用於前綴、佇列和群組行為。
- `agents.defaults.*` 用於區塊串流和分塊預設值。
- 通道覆寫（`channels.whatsapp.*`、`channels.telegram.*` 等）用於上限和串流切換。

完整的架構請參閱 [配置](/zh-Hant/gateway/configuration)。

## 傳入訊息去重

通道在重新連線後可能會重新傳遞相同的訊息。OpenClaw 會維護一個短期快取，並以通道/帳戶/對象/工作階段/訊息 ID 作為鍵值，以確保重複的傳遞不會觸發另一次代理執行。

## 傳入訊息防彈跳

來自**同一發送者**的快速連續訊息可以透過 `messages.inbound` 批次處理為單一代理輪次。防彈跳的範圍是以每個通道 + 對話為基礎，並使用最新的訊息進行回覆串接/ID 處理。

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

- 防彈跳僅適用於**純文字**訊息；媒體/附件會立即排清。
- 控制指令會略過防彈跳，使其保持獨立。

## 工作階段與裝置

工作階段歸閘道所有，而非歸用戶端所有。

- 直接聊天會合併為代理主工作階段金鑰。
- 群組/通道則有自己的工作階段金鑰。
- 工作階段存放區和文字記錄位於閘道主機上。

多個裝置/通道可以對應到同一個工作階段，但歷史記錄不會完全同步回每個用戶端。建議：在長時間的對話中使用一個主要裝置，以避免語境分歧。控制 UI 和 TUI 始終顯示閘道備份的工作階段文字記錄，因此它們是真相來源。

詳細資訊：[工作階段管理](/zh-Hant/concepts/session)。

## 傳入內文與歷史語境

OpenClaw 將**提示內文**與**指令內文**分開：

- `Body`：傳送給代理的提示文字。這可能包含通道信封和可選的歷史記錄包裝器。
- `CommandBody`：用於指令/命令解析的原始使用者文字。
- `RawBody`：`CommandBody` 的舊版別名（為相容性而保留）。

當頻道提供歷史記錄時，它使用一個通用的包裝器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

對於 **非直接聊天**（群組/頻道/房間），**目前訊息主體** 會加上發送者標籤前綴（與歷史記錄項目使用的樣式相同）。這保持了即時訊息和佇列/歷史訊息在代理提示中的一致性。

歷史緩衝區是 **僅限待處理** 的：它們包含未觸發執行的群組訊息（例如，提及門控的訊息），並 **排除** 已在會話逐字稿中的訊息。

指令剝離僅適用於 **目前訊息** 部分，因此歷史記錄保持完整。包裝歷史記錄的頻道應將 `CommandBody`（或 `RawBody`）設定為原始訊息文字，並將 `Body` 保留為組合提示。歷史緩衝區可透過 `messages.groupChat.historyLimit`（全域預設值）和每個頻道的覆寫來配置，例如 `channels.slack.historyLimit` 或 `channels.telegram.accounts.<id>.historyLimit`（設定 `0` 以停用）。

## 佇列與後續處理

如果執行已在進行中，傳入訊息可以加入佇列、導向目前的執行，或收集以供後續回合使用。

- 透過 `messages.queue`（和 `messages.queue.byChannel`）進行配置。
- 模式：`interrupt`、`steer`、`followup`、`collect`，以及積壓變體。

詳情：[佇列處理](/zh-Hant/concepts/queue)。

## 串流、分塊與批次處理

區塊串流在模型產生文字區塊時發送部分回覆。分塊遵守頻道文字限制，並避免分割圍欄程式碼。

關鍵設定：

- `agents.defaults.blockStreamingDefault`（`on|off`，預設關閉）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk`（`minChars|maxChars|breakPreference`）
- `agents.defaults.blockStreamingCoalesce`（基於閒置的批次處理）
- `agents.defaults.humanDelay`（區塊回覆之間的類人類暫停）
- 頻道覆寫：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 頻道需要明確的 `*.blockStreaming: true`）

詳細資訊：[串流 + 分塊](/zh-Hant/concepts/streaming)。

## 推理可見性和 token

OpenClaw 可以顯示或隱藏模型推理：

- `/reasoning on|off|stream` 控制可見性。
- 當推理內容由模型生成時，仍會計入 token 使用量。
- Telegram 支援將推理串流輸出到草稿氣泡中。

詳細資訊：[思考 + 推理指令](/zh-Hant/tools/thinking) 和 [Token 使用](/zh-Hant/reference/token-use)。

## 前綴、串聯和回覆

出站訊息格式化集中在 `messages` 中：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（出站前綴串聯），以及 `channels.whatsapp.messagePrefix`（WhatsApp 入站前綴）
- 透過 `replyToMode` 和各頻道預設值進行回覆串聯

詳細資訊：[設定](/zh-Hant/gateway/configuration#messages) 和頻道文件。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
