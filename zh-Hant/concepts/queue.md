---
summary: "序列化輸入自動回覆執行的指令佇列設計"
read_when:
  - Changing auto-reply execution or concurrency
title: "指令佇列"
---

# 指令佇列 (2026-01-16)

我們透過一個微小的進程內佇列來序列化輸入的自動回覆執行（所有頻道），以防止多個代理執行發生衝突，同時仍允許跨工作階段的安全平行處理。

## 為什麼

- 自動回覆執行可能成本高昂（LLM 呼叫），且當多個輸入訊息同時到達時可能會發生衝突。
- 序列化可避免競爭共享資源（工作階段檔案、日誌、CLI 標準輸入），並降低上游速率限制的機率。

## 運作方式

- 具備通道感知的 FIFO 佇列會以可設定的並行上限排出每個通道（未設定通道預設為 1；主要通道預設為 4，子代理預設為 8）。
- `runEmbeddedPiAgent` 依 **工作階段金鑰**（通道 `session:<key>`）加入佇列，以保證每個工作階段只有一個執行中的執行個體。
- 每個工作階段的執行個體接著會加入 **全域通道**（預設為 `main`），因此整體並行性會受到 `agents.defaults.maxConcurrent` 的限制。
- 啟用詳細記錄時，如果佇列中的執行個體在開始前等待超過約 2 秒，就會發出一則簡短通知。
- 輸入指示器仍會在加入佇列時立即觸發（當通道支援時），因此當我們等待輪次時，使用者體驗保持不變。

## 佇列模式（每個通道）

傳入訊息可以引導目前的執行個體、等待後續輪次，或兩者都做：

- `steer`：立即注入目前的執行個體（在下一個工具邊界之後取消擱置中的工具呼叫）。如果未串流，則回退至後續輪次。
- `followup`: 將訊息排入佇列，以便在當前執行結束後進行下一次 agent 週期。
- `collect`: 將所有佇列中的訊息合併為**單一**後續週期（預設值）。如果訊息目標是不同的通道/執行緒，它們會個別排出以保留路由。
- `steer-backlog` (亦稱 `steer+backlog`): 現在引導**並**保留訊息以進行後續週期。
- `interrupt` (舊版): 中止該 session 的活躍執行，然後執行最新的訊息。
- `queue` (舊版別名): 與 `steer` 相同。

Steer-backlog 意味著您可以在導向運行後獲得後續回應，因此串流介面可能會顯示為重複。如果您希望每條傳入訊息只獲得一個回應，請優先選擇 `collect`/`steer`。
將 `/queue collect` 作為獨立指令發送（每個會話）或設定 `messages.queue.byChannel.discord: "collect"`。

預設值（當在設定中未設定時）：

- 所有介面 → `collect`

透過 `messages.queue` 進行全域或每個頻道的設定：

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

選項適用於 `followup`、`collect` 和 `steer-backlog`（以及當 `steer` 回退到後續處理時）：

- `debounceMs`：在開始後續輪次之前等待安靜（防止「繼續、繼續」）。
- `cap`：每個會話的佇列訊息上限。
- `drop`：溢出原則（`old`、`new`、`summarize`）。

Summarize 會保留已丟棄訊息的簡短項目符號清單，並將其作為合成的後續提示注入。
預設值：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 每個工作階段的覆寫

- 傳送 `/queue <mode>` 作為獨立指令，以儲存目前工作階段的模式。
- 選項可以組合使用：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 會清除工作階段的覆寫。

## 範圍與保證

- 適用於所有使用網關回覆管道（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）的輸入頻道上的自動回覆代理程式執行。
- 預設通道（`main`）針對傳入 + 主要心跳是全程序範圍的；設定 `agents.defaults.maxConcurrent` 以允許多個會話並行。
- 可能會有額外的通道（例如 `cron`、`subagent`），讓背景工作可以並行執行，而不會阻擋傳入的回覆。
- 每個會話通道保證一次只有一個代理程式執行會接觸到指定的會話。
- 沒有外部相依性或背景工作執行緒；純 TypeScript + promises。

## 疑難排解

- 如果指令似乎卡住了，請啟用詳細記錄並尋找「queued for …ms」行，以確認佇列正在排空。
- 如果您需要佇列深度，請啟用詳細記錄並監看佇列時間行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
