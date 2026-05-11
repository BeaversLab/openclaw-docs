---
summary: "序列化傳入自動回覆執行的命令佇列設計"
read_when:
  - Changing auto-reply execution or concurrency
title: "指令佇列"
---

我們透過一個微小的進程內佇列序列化傳入的自動回覆執行（所有通道），以防止多個代理執行發生衝突，同時仍允許跨會話的安全平行處理。

## 為什麼

- 自動回覆執行可能耗費資源（LLM 呼叫），且當多個傳入訊息同時抵達時可能會發生衝突。
- 序列化可避免競爭共用資源（工作階段檔案、記錄檔、CLI 標準輸入），並降低上游速率限制的機率。

## 運作方式

- 具通道意識的先進先出（FIFO）佇列會以可設定的並行上限來排空每個通道（未設定通道的預設值為 1；主要預設為 4，子代理預設為 8）。
- `runEmbeddedPiAgent` 依 **工作階段金鑰**（通道 `session:<key>`）加入佇列，以保證每個工作階段只有一個活動執行。
- 每個工作階段執行隨後會被加入 **全域通道**（預設為 `main`）的佇列，因此整體並行數會受限於 `agents.defaults.maxConcurrent`。
- 啟用詳細記錄時，如果佇列中的執行在開始前等待超過約 2 秒，就會發出簡短通知。
- 輸入指示器仍會在加入佇列時立即觸發（當通道支援時），因此當我們等待輪次時使用者體驗不會改變。

## 佇列模式（每個通道）

傳入訊息可以引導當前執行、等待後續輪次，或兩者都做：

- `steer`：立即注入當前執行（在下一個工具邊界後取消待處理的工具呼叫）。如果不是串流，則回退至後續處理。
- `followup`：在當前執行結束後為下一個代理輪次加入佇列。
- `collect`：將所有佇列中的訊息合併為**單一**後續輪次（預設值）。如果訊息目標是不同的通道/執行緒，它們會個別排空以保留路由。
- `steer-backlog`（也稱為 `steer+backlog`）：現在引導**並**保留訊息以供後續輪次。
- `interrupt`（舊版）：中止該工作階段的活動執行，然後執行最新的訊息。
- `queue`（舊版別名）：與 `steer` 相同。

Steer-backlog 表示您可以在導向執行後獲得後續回應，因此串流表面可能看起來像重複項。如果您希望每個傳入訊息只獲得一個回應，請優先使用 `collect`/`steer`。
將 `/queue collect` 作為獨立指令發送（每個 session）或設定 `messages.queue.byChannel.discord: "collect"`。

預設值（當在設定中未設定時）：

- 所有表面 → `collect`

透過 `messages.queue` 全域設定或每個頻道設定：

```json5
{
  messages: {
    queue: {
      mode: "collect",
      debounceMs: 1000,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## 佇列選項

選項適用於 `followup`、`collect` 和 `steer-backlog`（以及當 `steer` 退回至後續追蹤時）：

- `debounceMs`：在開始後續追蹤輪次之前等待安靜（防止「繼續，繼續」）。
- `cap`：每個 session 的最大佇列訊息數。
- `drop`：溢出策略（`old`、`new`、`summarize`）。

Summarize 會保留已丟棄訊息的簡短項目符號清單，並將其作為合成後續追蹤提示詞注入。
預設值：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 每個 session 的覆寫

- 將 `/queue <mode>` 作為獨立指令發送，以儲存目前 session 的模式。
- 選項可以組合：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 會清除 session 覆寫。

## 範圍與保證

- 適用於所有使用閘道回覆管道（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）的傳入頻道之自動回覆 agent 執行。
- 預設通道（`main`）對於傳入 + 主要心跳是程序範圍的；設定 `agents.defaults.maxConcurrent` 以允許並行的多個 session。
- 可能存在額外的通道（例如 `cron`、`cron-nested`、`nested`、`subagent`），以便背景工作可以並行執行而不會阻擋入站回覆。隔離的 cron agent 輪次會佔用一個 `cron` 插槽，而其內部 agent 執行則使用 `cron-nested`；兩者都使用 `cron.maxConcurrentRuns`。共用的非 cron `nested` 流程會保持其自己的通道行為。這些分離的執行會被追蹤為 [background tasks](/zh-Hant/automation/tasks)。
- 每個會話的通道保證一次只有一個 agent 執行會接觸到給定的會話。
- 沒有外部依賴或背景工作執行緒；純 TypeScript + promises。

## 疑難排解

- 如果指令似乎卡住了，請啟用詳細日誌並尋找「queued for …ms」行，以確認佇列正在排空。
- 如果您需要了解佇列深度，請啟用詳細日誌並監看佇列計時行。

## 相關

- [Session management](/zh-Hant/concepts/session)
- [Retry policy](/zh-Hant/concepts/retry)
