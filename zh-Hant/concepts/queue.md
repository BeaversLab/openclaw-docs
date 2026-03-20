---
summary: "命令佇列設計，可序列化傳入的自動回覆執行"
read_when:
  - 變更自動回覆執行或並行性
title: "Command Queue"
---

# Command Queue (2026-01-16)

我們透過一個微小的程序內佇列，序列化傳入的自動回覆執行（所有通道），以防止多個 Agent 執行發生衝突，同時仍允許跨工作階段的安全並行處理。

## 原因

- 自動回覆執行可能會很昂貴（LLM 呼叫），且當多個傳入訊息幾乎同時到達時可能會發生衝突。
- 序列化可避免競爭共享資源（工作階段檔案、日誌、CLI stdin），並降低上游速率限制的機率。

## 運作方式

- 一個具通道感知的 FIFO 佇列會以可設定的並行上限來清空每個通道（未設定的通道預設為 1；main 預設為 4，subagent 預設為 8）。
- `runEmbeddedPiAgent` 依 **工作階段金鑰** (lane `session:<key>`) 排入佇列，以保證每個工作階段只有一個活動執行。
- 每個工作階段執行隨後會排入 **全域通道** (global lane) (預設為 `main`)，因此整體並行性由 `agents.defaults.maxConcurrent` 限制。
- 當啟用詳細記錄時，如果排隊的執行在開始前等待超過約 2 秒，會發出一則簡短通知。
- 輸入指示器仍會在排隊時立即觸發（當通道支援時），因此在等待輪到我們時，使用者體驗保持不變。

## 佇列模式（每個通道）

傳入訊息可以引導目前的執行、等待後續輪次，或兩者皆做：

- `steer`：立即注入到目前的執行中 (在下一個工具邊界後取消擱置中的工具呼叫)。若非串流，則退回至後續處理。
- `followup`：排入佇列以在目前執行結束後進行下一個代理人輪次。
- `collect`：將所有排入佇列的訊息合併為 **單一** 後續輪次 (預設)。如果訊息以不同的通道/執行緒為目標，它們會個別排出以保留路由。
- `steer-backlog` (又稱 `steer+backlog`)：現在引導 **並且** 保留訊息以供後續輪次。
- `interrupt` (舊版)：中止該工作階段的活動執行，然後執行最新的訊息。
- `queue` (舊版別名)：與 `steer` 相同。

引導待辦 (Steer-backlog) 意味著您可以在被引導的執行之後獲得後續回應，因此
串流介面可能看起來像重複的內容。如果您想要
每個傳入訊息一個回應，請優先選擇 `collect`/`steer`。
將 `/queue collect` 作為獨立指令傳送 (每個工作階段) 或設定 `messages.queue.byChannel.discord: "collect"`。

預設值（當在配置中未設定時）：

- 所有介面 → `collect`

透過 `messages.queue` 進行全域或每個通道的設定：

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

選項適用於 `followup`、`collect` 和 `steer-backlog` (以及當退回到後續處理時的 `steer`)：

- `debounceMs`：在開始後續輪次之前等待安靜 (防止「繼續、繼續」)。
- `cap`：每個工作階段最多可排入佇列的訊息數。
- `drop`：溢出策略（`old`、`new`、`summarize`）。

「總結」會保留被捨棄訊息的簡短項目符號清單，並將其作為合成後續提示注入。
預設值：`debounceMs: 1000`、`cap: 20`、`drop: summarize`。

## 每個 session 的覆寫

- 傳送 `/queue <mode>` 作為獨立指令，以儲存目前階段作業的模式。
- 選項可以組合使用：`/queue collect debounce:2s cap:25 drop:summarize`
- `/queue default` 或 `/queue reset` 會清除階段作業覆寫。

## 範圍與保證

- 適用於所有使用 gateway 回應管道（WhatsApp web、Telegram、Slack、Discord、Signal、iMessage、webchat 等）的傳入頻道的自動回應代理程式運行。
- 預設通道（`main`）對於傳入 + 主要心跳是處理程序範圍；設定 `agents.defaults.maxConcurrent` 以允許並行執行多個階段作業。
- 可能會有額外通道（例如 `cron`、`subagent`），以便背景工作可以並行執行，而不會封鎖傳入回覆。
- 每個 session 的通道保證一次只有一個代理程式運行接觸給定的 session。
- 沒有外部相依性或背景工作執行緒；純 TypeScript + promises。

## 疑難排解

- 如果指令似乎卡住了，請啟用詳細日誌並尋找「queued for …ms」行，以確認佇列正在排空。
- 如果您需要佇列深度，請啟用詳細日誌並監看佇列計時行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
