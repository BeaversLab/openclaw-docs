---
summary: "Command queue design that serializes inbound auto-reply runs"
read_when:
  - Changing auto-reply execution or concurrency
title: "Command Queue"
---

# Command Queue (2026-01-16)

我們透過一個微小的程序內佇列，序列化傳入的自動回覆執行（所有通道），以防止多個 Agent 執行發生衝突，同時仍允許跨工作階段的安全並行處理。

## 原因

- 自動回覆執行可能會很昂貴（LLM 呼叫），且當多個傳入訊息幾乎同時到達時可能會發生衝突。
- 序列化可避免競爭共享資源（工作階段檔案、日誌、CLI stdin），並降低上游速率限制的機率。

## 運作方式

- 一個具通道感知的 FIFO 佇列會以可設定的並行上限來清空每個通道（未設定的通道預設為 1；main 預設為 4，subagent 預設為 8）。
- `runEmbeddedPiAgent` 依 **工作階段金鑰** 排隊（通道 `session:<key>`），以保證每個工作階段只有一個作用中的執行。
- 每個工作階段執行隨後會排入 **全域通道**（預設為 `main`），因此整體並行性會受到 `agents.defaults.maxConcurrent` 的限制。
- 當啟用詳細記錄時，如果排隊的執行在開始前等待超過約 2 秒，會發出一則簡短通知。
- 輸入指示器仍會在排隊時立即觸發（當通道支援時），因此在等待輪到我們時，使用者體驗保持不變。

## 佇列模式（每個通道）

傳入訊息可以引導目前的執行、等待後續輪次，或兩者皆做：

- `steer`：立即注入到目前的執行中（在下一個工具邊界後取消暫止的工具呼叫）。若未串流處理，則退回至後續處理。
- `followup`：為目前執行結束後的下一個 Agent 輪次排隊。
- `collect`：將所有排隊的訊息合併為**單一**後續輪次（預設）。如果訊息針對不同的通道/執行緒，它們會個別清空以保留路由。
- `steer-backlog`（又名 `steer+backlog`）：現在引導**並**保留訊息以進行後續輪次。
- `interrupt`（舊版）：中止該工作階段的作用中執行，然後執行最新的訊息。
- `queue`（舊版別名）：與 `steer` 相同。

Steer-backlog 意味著您可以在導向運行後獲得後續回應，因此
串流介面可能看起來像是重複的。如果您希望
每條傳入訊息只獲得一個回應，請優先使用 `collect`/`steer`。
請將 `/queue collect` 作為獨立指令傳送（每個 session）或設定 `messages.queue.byChannel.discord: "collect"`。

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

選項適用於 `followup`、`collect` 和 `steer-backlog`（以及當 `steer` 回退為後續時）：

- `debounceMs`：在開始後續輪次之前等待安靜（防止「繼續、繼續」）。
- `cap`：每個 session 的最大佇列訊息數。
- `drop`：溢位策略（`old`、`new`、`summarize`）。

Summarize 會保留已丟棄訊息的簡短項目符號清單，並將其作為合成的後續提示注入。
預設值：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 每個 session 的覆寫

- 傳送 `/queue <mode>` 作為獨立指令，以儲存當前 session 的模式。
- 選項可以組合：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 會清除 session 的覆寫。

## 範圍與保證

- 適用於所有使用 gateway 回應管道（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）的傳入頻道的自動回應代理程式運行。
- 預設通道（`main`）對於傳入 + 主要心跳是程序範圍的；設定 `agents.defaults.maxConcurrent` 以允許多個 session 並行執行。
- 可能會有額外的通道（例如 `cron`、`subagent`），以便背景工作可以並行執行而不會阻塞傳入回應。
- 每個 session 的通道保證一次只有一個代理程式運行接觸給定的 session。
- 沒有外部相依性或背景工作執行緒；純 TypeScript + promises。

## 疑難排解

- 如果指令似乎卡住了，請啟用詳細日誌並尋找「queued for …ms」行，以確認佇列正在排空。
- 如果您需要佇列深度，請啟用詳細日誌並監看佇列計時行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
