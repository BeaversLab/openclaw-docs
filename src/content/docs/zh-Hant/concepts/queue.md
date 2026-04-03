---
summary: "序列化傳入自動回覆執行的命令佇列設計"
read_when:
  - Changing auto-reply execution or concurrency
title: "命令佇列"
---

# 命令佇列 (2026-01-16)

我們透過一個微小的行程內佇列來序列化傳入的自動回覆執行（所有通道），以防止多個代理程式執行發生衝突，同時仍允許在會話之間安全地平行處理。

## 為什麼

- 自動回覆執行可能耗費資源（LLM 呼叫），且當多個傳入訊息幾乎同時到達時可能會發生衝突。
- 序列化可以避免競爭共用資源（會話檔案、日誌、CLI stdin），並降低上游速率限制的機率。

## 運作方式

- 一個具通道感知的先進先出 (FIFO) 佇列會以可設定的並行上限來排空每個通道（未設定的通道預設為 1；主要預設為 4，子代理程式預設為 8）。
- `runEmbeddedPiAgent` 依 **會話金鑰** 排入佇列（通道 `session:<key>`），以保證每個會話只有一個執行中的執行個體。
- 然後，每個會話執行會被排入 **全域通道**（預設為 `main`），因此整體並行性會受到 `agents.defaults.maxConcurrent` 的限制。
- 啟用詳細記錄時，如果在開始前等待超過約 2 秒，排入佇列的執行會發出一則簡短通知。
- 輸入指示器仍會在排入佇列時立即觸發（當通道支援時），因此在輪候時使用者體驗不變。

## 佇列模式（每個通道）

傳入訊息可以引導目前的執行、等待後續輪次，或兩者皆做：

- `steer`：立即注入到目前的執行中（在下一個工具邊界後取消待處理的工具呼叫）。若未串流，則退回到後續輪次。
- `followup`：在目前的執行結束後，為下一個代理程式輪次排入佇列。
- `collect`：將所有排入佇列的訊息合併為**單一**後續輪次（預設）。如果訊息目標是不同的通道/執行緒，它們會個別排空以保留路由。
- `steer-backlog` (aka `steer+backlog`)：現在引導**並**保留訊息以供後續輪次使用。
- `interrupt` (legacy)：中止該會話的使用中執行，然後執行最新的訊息。
- `queue` (legacy alias)：與 `steer` 相同。

Steer-backlog 意味著您可以在導向運行之後獲得後續回應，因此串流介面可能會看起來像重複的內容。如果您希望每條傳入訊息只收到一個回應，請優先選擇 `collect`/`steer`。
將 `/queue collect` 作為獨立命令傳送（每個 session）或設定 `messages.queue.byChannel.discord: "collect"`。

預設值（當在配置中未設定時）：

- 所有介面 → `collect`

透過 `messages.queue` 進行全域或每個頻道的配置：

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

選項適用於 `followup`、`collect` 和 `steer-backlog`（以及當 `steer` 退回到後續回應時）：

- `debounceMs`：在開始後續輪次之前等待安靜（防止「繼續、繼續」）。
- `cap`：每個 session 的最大佇列訊息數。
- `drop`：溢出策略 (`old`、`new`、`summarize`)。

「Summarize」會保留已丟棄訊息的簡短項目符號列表，並將其作為合成後續提示注入。
預設值：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 每個 session 的覆寫

- 將 `/queue <mode>` 作為獨立命令傳送，以儲存當前 session 的模式。
- 選項可以組合使用：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 會清除 session 覆寫。

## 範圍與保證

- 適用於所有使用網關回覆管道的傳入頻道上的自動回覆代理程式運行（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）。
- 預設通道 (`main`) 對於傳入 + 主要心跳是程序範圍的；設定 `agents.defaults.maxConcurrent` 以允許多個 session 並行運行。
- 可能會有額外的通道（例如 `cron`、`subagent`），以便背景工作可以並行執行，而不會阻擋傳入的回覆。這些分離的執行會被追蹤為 [background tasks](/en/automation/tasks)。
- 每個 session 的通道保證一次只有一個代理程式運行接觸給定的 session。
- 無外部依賴或背景工作執行緒；純 TypeScript + promises。

## 疑難排解

- 如果指令似乎卡住了，請啟用詳細日誌並尋找「queued for …ms」行以確認佇列是否正在排空。
- 如果您需要佇列深度，請啟用詳細日誌並監控佇列計時行。
