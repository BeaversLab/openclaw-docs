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

同輪導向是預設值。當執行中收到提示訊息時，會在執行可以接受導向時將其注入至現行執行階段，因此不會啟動第二個階段執行。如果現行執行無法接受導向，OpenClaw 會等待現行執行完成後再啟動該提示。

## 佇列模式

`/queue` 控制當階段已有現行執行時，一般傳入訊息的處理方式：

- `steer`：將訊息注入至現行執行階段。Pi 會在目前助手輪次完成其工具呼叫後、進行下一次 LLM 呼叫前，傳遞所有待處理的導向訊息；Codex 應用程式伺服器會收到一個批次 `turn/steer`。如果執行未處於主動串流狀態或無法使用導向，OpenClaw 會等到現行執行結束後再啟動該提示。
- `followup`：不進行導向。將每則訊息加入佇列，以在目前執行結束後供稍後的代理程式輪次使用。
- `collect`：不進行導向。將佇列中的訊息合併為靜止視窗後的**單一**後續輪次。如果訊息目標是不同的通道/執行緒，它們會個別排清以保留路由。
- `interrupt`：中止該階段的現行執行，然後執行最新的訊息。

關於執行階段特定的時序與相依性行為，請參閱[導向佇列](/zh-Hant/concepts/queue-steering)。關於明確的 `/steer <message>` 指令，請參閱 [導向](/zh-Hant/tools/steer)。

透過 `messages.queue` 進行全域或每個通道的設定：

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

選項適用於佇列傳遞。`debounceMs` 也會在 `steer` 模式下設定 Codex 導向靜止視窗：

- `debounceMs`：排清佇列後續動作或收集批次前的靜止視窗；在 Codex `steer` 模式下，則是傳送批次 `turn/steer` 前的靜止視窗。純數字代表毫秒；單位 `ms`、`s`、`m`、`h` 和 `d` 可被 `/queue` 選項接受。
- `cap`: 每個會話的最大佇列訊息數。低於 `1` 的值將被忽略。
- `drop: "summarize"`: 預設值。根據需要丟棄最舊的佇列項目，保留精簡摘要，並將其作為合成的後續提示注入。
- `drop: "old"`: 根據需要丟棄最舊的佇列項目，但不保留摘要。
- `drop: "new"`: 當佇列已滿時拒絕最新的訊息。

預設值: `debounceMs: 500`, `cap: 20`, `drop: summarize`。

## 優先順序

對於模式選擇，OpenClaw 解析順序如下：

1. 內聯或儲存的每個會話 `/queue` 覆蓋值。
2. `messages.queue.byChannel.<channel>`。
3. `messages.queue.mode`。
4. 預設 `steer`。

對於選項，內聯或儲存的 `/queue` 選項優先於配置檔案。接著
套用特定通道的去抖動 (`messages.queue.debounceMsByChannel`)、外掛程式
去抖動預設值、全域 `messages.queue` 選項以及內建預設值。
`cap` 和 `drop` 是全域/會話選項，而非每個通道的配置
鍵值。

## 每個會話的覆蓋

- 發送 `/queue <steer|followup|collect|interrupt>` 作為獨立指令，以儲存當前會話的佇列模式。
- 選項可以組合使用：`/queue collect debounce:0.5s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 會清除會話覆蓋。

## 範圍與保證

- 適用於所有使用網關回覆管線（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、網路聊天等）的入站通道的自動回覆代理程式執行。
- 預設通道 (`main`) 對於入站 + 主要心跳是進程範圍的；設定 `agents.defaults.maxConcurrent` 以允許並行處理多個會話。
- 可能會有額外的通道（例如 `cron`、`cron-nested`、`nested`、`subagent`），以便背景工作能並行運行而不阻塞傳入回覆。獨立的 cron agent 輪次會佔用一個 `cron` 插槽，而其內部 agent 執行則使用 `cron-nested`；兩者皆使用 `cron.maxConcurrentRuns`。共享的非 cron `nested` 流程會保持其自身的通道行為。這些分離的執行會被追蹤為 [背景工作](/zh-Hant/automation/tasks)。
- 每個會話通道保證一次只有一個 agent 執行會接觸到該會話。
- 無外部相依性或背景工作執行緒；純 TypeScript + promises。

## 疑難排解

- 如果指令似乎卡住，請啟用詳細記錄並尋找「queued for ...ms」行，以確認佇列正在排空。
- 如果您需要佇列深度資訊，請啟用詳細記錄並監看佇列計時行。
- 接受輪次然後停止發出進度的 Codex app-server 執行，會被 Codex 配接器中斷，以便活動的會話通道能釋放，而不是等待外部執行逾時。
- 啟用診斷時，如果在 `diagnostics.stuckSessionWarnMs` 之後仍停留在 `processing` 且沒有觀察到回覆、工具、狀態、區塊或 ACP 進度的會話，會依目前的活動分類。活動工作會記錄為 `session.long_running`；沒有近期進度的活動工作則記錄為 `session.stalled`；`session.stuck` 是保留給沒有活動工作的過期會話維護用途，只有該路徑能釋放受影響的會話通道，讓排隊的工作排空。當會話保持不變時，重複的 `session.stuck` 診斷會退避。

## 相關

- [會話管理](/zh-Hant/concepts/session)
- [Steering queue](/zh-Hant/concepts/queue-steering)
- [Steer](/zh-Hant/tools/steer)
- [重試原則](/zh-Hant/concepts/retry)
