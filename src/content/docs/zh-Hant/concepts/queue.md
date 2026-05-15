---
summary: "自動回覆佇列模式、預設值及每個工作階段的覆寫"
read_when:
  - Changing auto-reply execution or concurrency
  - Explaining /queue modes or message steering behavior
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

## 預設值

若未設定，所有輸入通道介面皆使用：

- `mode: "steer"`
- `debounceMs: 500`
- `cap: 20`
- `drop: "summarize"`

`steer` 是預設值，因為它能在不啟動第二個工作階段執行的情況下，保持目前模型回合的回應能力。它會排除所有在下一個模型邊界之前抵達的導向訊息。如果目前的執行無法接受導向，OpenClaw 會退回到後續的佇列項目。

## 佇列模式

輸入訊息可以導向目前的執行、等待後續回合，或兩者皆做：

- `steer`：將導向訊息排入目前執行時期的佇列中。Pi 會在目前的助理回合執行完其工具呼叫後、下一個 LLM 呼叫之前，傳遞所有擱置中的導向訊息；Codex 應用程式伺服器會收到一個批次處理的 `turn/steer`。如果執行未主動進行串流或導向無法使用，OpenClaw 會退回到後續的佇列項目。
- `queue` (legacy)：舊的一次一個導向方式。Pi 會在每個模型邊界傳遞一個已排程的導向訊息；Codex 應用程式伺服器會收到個別的 `turn/steer` 請求。除非您需要先前的序列化行為，否則建議使用 `steer`。
- `followup`：將每則訊息排入佇列，以便在目前執行結束後進行稍後的代理程式回合。
- `collect`：在靜止視窗之後，將已排程的訊息合併為**單一**後續回合。如果訊息目標是不同的通道/執行緒，它們會個別排除以保留路由。
- `steer-backlog` (aka `steer+backlog`)：現在進行導向**並**保留相同的訊息以供後續回合使用。
- `interrupt` (legacy)：中止該工作階段的主動執行，然後執行最新的訊息。

導向備份意味著您可以在導向的執行之後獲得後續回應，因此串流介面可能會看起來像重複。如果您希望每則輸入訊息都有一個回應，建議優先使用 `collect`/`steer`。

關於執行時特定的時間和依賴行為，請參閱
[Steering queue](/zh-Hant/concepts/queue-steering)。關於明確的 `/steer <message>`
指令，請參閱 [Steer](/zh-Hant/tools/steer)。

透過 `messages.queue` 進行全域或每個頻道的配置：

```json5
{
  messages: {
    queue: {
      mode: "steer",
      debounceMs: 500,
      cap: 20,
      drop: "summarize",
      byChannel: { discord: "collect" },
    },
  },
}
```

## 佇列選項

選項適用於 `followup`、`collect` 和 `steer-backlog`（以及當轉向退回到 followup 時的 `steer` 或舊版 `queue`）：

- `debounceMs`：在排空佇列的後續追蹤之前的安靜時間視窗。純數字代表毫秒；`/queue` 選項接受單位 `ms`、`s`、`m`、`h` 和 `d`。
- `cap`：每個工作階段的最大佇列訊息數。低於 `1` 的值將被忽略。
- `drop: "summarize"`：預設值。視需要捨棄最舊的佇列條目，保留精簡摘要，並將其作為合成的後續追蹤提示注入。
- `drop: "old"`：視需要捨棄最舊的佇列條目，但不保留摘要。
- `drop: "new"`：當佇列已滿時，拒絕最新的訊息。

預設值：`debounceMs: 500`、`cap: 20`、`drop: summarize`。

## 優先順序

對於模式選擇，OpenClaw 解析如下：

1. 內聯或儲存的每個工作階段 `/queue` 覆蓋值。
2. `messages.queue.byChannel.<channel>`。
3. `messages.queue.mode`。
4. 預設 `steer`。

對於選項，內聯或儲存的 `/queue` 選項優先於配置。接著
會應用特定頻道的防抖動（`messages.queue.debounceMsByChannel`）、外掛程式
防抖動預設值、全域 `messages.queue` 選項以及內建預設值。
`cap` 和 `drop` 是全域/工作階段選項，而非每個頻道的配置
金鑰。

## 每個工作階段的覆寫

- 將 `/queue <mode>` 作為獨立命令傳送，以儲存目前會話的模式。
- 選項可以組合使用：`/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 會清除會話覆寫。

## 範圍與保證

- 適用於所有使用閘道回覆管道（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、網路聊天等）的入站通道的自動回覆代理執行。
- 預設通道（`main`）針對入站 + 主要心跳在整個程序範圍內有效；設定 `agents.defaults.maxConcurrent` 以允許並行執行多個會話。
- 可能存在額外的通道（例如 `cron`、`cron-nested`、`nested`、`subagent`），以便背景作業可以並行執行而不阻塞入站回覆。隔離的 cron agent 輪次會佔用一個 `cron` 插槽，而其內部代理執行則使用 `cron-nested`；這兩者都使用 `cron.maxConcurrentRuns`。共享的非 cron `nested` 流程會保留其自己的通道行為。這些分離的執行會被追蹤為[背景任務](/zh-Hant/automation/tasks)。
- 每個會話的通道保證一次只有一個代理執行會接觸到特定的會話。
- 沒有外部相依性或背景工作執行緒；純 TypeScript + promises。

## 疑難排解

- 如果命令似乎卡住了，請啟用詳細日誌並尋找「queued for ...ms」行，以確認佇列正在排空。
- 如果您需要瞭解佇列深度，請啟用詳細日誌並監看佇列計時行。
- 接受一個輪次然後停止發出進度的 Codex app-server 執行會被 Codex 配接器中斷，以便作用中的會話通道可以釋放，而不是等待外部執行逾時。
- 當啟用診斷時，停留在 `processing` 超過 `diagnostics.stuckSessionWarnMs` 且未觀察到回覆、工具、狀態、區塊或 ACP 進度的會話會根據當前活動進行分類。正在進行的工作記錄為 `session.long_running`；正在進行但沒有最近進度的工作記錄為 `session.stalled`；`session.stuck` 保留給沒有正在進行工作的過時會務管理，只有該路徑可以釋放受影響的會務通道，以便排隊的工作排出。當會務保持不變時，重複的 `session.stuck` 診斷會進行退避。

## 相關

- [會務管理](/zh-Hant/concepts/session)
- [導向佇列](/zh-Hant/concepts/queue-steering)
- [導向](/zh-Hant/tools/steer)
- [重試原則](/zh-Hant/concepts/retry)
