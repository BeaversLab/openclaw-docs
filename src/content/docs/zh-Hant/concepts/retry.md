---
summary: "Retry policy for outbound provider calls"
read_when:
  - Updating provider retry behavior or defaults
  - Debugging provider send errors or rate limits
title: "重試政策"
---

## 目標

- 針對每次 HTTP 請求進行重試，而非針對多步驟流程。
- 透過僅重試目前步驟來保持順序。
- 避免重複非冪等操作。

## 預設值

- 嘗試次數：3
- 最大延遲上限：30000 毫秒
- 抖動：0.1 (10%)
- 供應商預設值：
  - Telegram 最小延遲：400 毫秒
  - Discord 最小延遲：500 毫秒

## 行為

### 模型供應商

- OpenClaw 允許供應商 SDK 處理正常的短期重試。
- 對於基於 Stainless 的 SDK（例如 Anthropic 和 OpenAI），可重試的回應
  (`408`, `409`, `429`, 和 `5xx`) 可能包含 `retry-after-ms` 或
  `retry-after`。當等待時間超過 60 秒時，OpenClaw 會注入
  `x-should-retry: false`，以便 SDK 立即顯示錯誤，並讓模型
  容錯移轉能輪替至其他驗證設定檔或備用模型。
- 使用 `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS=<seconds>` 覆蓋上限。
  將其設定為 `0`、`false`、`off`、`none` 或 `disabled`，以允許 SDK 在內部遵守長時間的
  `Retry-After` 休眠。

### Discord

- 僅在速率限制錯誤 (HTTP 429) 時重試。
- 盡可能使用 Discord `retry_after`，否則使用指數退避。

### Telegram

- 在暫時性錯誤 (429、逾時、連線/重設/關閉、暫時無法使用) 時重試。
- 盡可能使用 `retry_after`，否則使用指數退避。
- Markdown 解析錯誤不會重試；它們會退回到純文字。

## 組態

在 `~/.openclaw/openclaw.json` 中設定各供應商的重試政策：

```json5
{
  channels: {
    telegram: {
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
    discord: {
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

## 備註

- 重試適用於每個請求 (訊息發送、媒體上傳、反應、投票、貼圖)。
- 複合流程不會重試已完成的步驟。

## 相關

- [模型容錯移轉](/zh-Hant/concepts/model-failover)
- [指令佇列](/zh-Hant/concepts/queue)
