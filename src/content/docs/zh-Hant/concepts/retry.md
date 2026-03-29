---
summary: "Retry policy for outbound provider calls"
read_when:
  - Updating provider retry behavior or defaults
  - Debugging provider send errors or rate limits
title: "Retry Policy"
---

# 重試政策

## 目標

- 針對每個 HTTP 請求重試，而非針對多步驟流程。
- 僅重試當前步驟以維持順序。
- 避免重複非等冪操作。

## 預設值

- 嘗試次數：3
- 最大延遲上限：30000 毫秒
- 抖動：0.1 (10%)
- 提供者預設值：
  - Telegram 最小延遲：400 毫秒
  - Discord 最小延遲：500 毫秒

## 行為

### Discord

- 僅在速率限制錯誤 (HTTP 429) 時重試。
- 盡可能使用 Discord `retry_after`，否則使用指數退避。

### Telegram

- 在暫時性錯誤 (429、逾時、連線/重置/關閉、暫時無法使用) 時重試。
- 盡可能使用 `retry_after`，否則使用指數退避。
- Markdown 剖析錯誤不會重試；會回退為純文字。

## 設定

在 `~/.openclaw/openclaw.json` 中為每個提供者設定重試政策：

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

- 重試適用於每個請求 (傳送訊息、上傳媒體、回應、投票、貼圖)。
- 複合流程不會重試已完成的步驟。
