---
summary: "選擇 heartbeat 或 cron 工作進行自動化的指導方針"
read_when:
  - Deciding how to schedule recurring tasks
  - Setting up background monitoring or notifications
  - Optimizing token usage for periodic checks
title: "Cron vs Heartbeat"
---

# Cron vs Heartbeat：何時使用哪一個

Heartbeat 和 cron 工作都讓您可以按排程執行任務。本指南協助您為您的使用案例選擇正確的機制。

## 快速決策指南

| 使用案例                       | 建議                | 原因                               |
| ------------------------------ | ------------------- | ---------------------------------- |
| 每 30 分鐘檢查收件匣           | Heartbeat           | 與其他檢查批次處理，具情境感知能力 |
| 在上午 9 點整發送每日報告      | Cron (獨立)         | 需要精確時間                       |
| 監控行事曆以留意即將到來的事件 | Heartbeat           | 定期感知的自然選擇                 |
| 執行每週深度分析               | Cron (獨立)         | 獨立任務，可使用不同的模型         |
| 在 20 分鐘後提醒我             | Cron (main, `--at`) | 精確定時的單次執行                 |
| 背景專案健康檢查               | Heartbeat           | 搭載現有週期                       |

## Heartbeat：定期感知

Heartbeat 會以固定的間隔（預設為 30 分鐘）在 **main session** 中執行。它們是為了讓代理檢查各項事務並標示出任何重要內容而設計的。

### 何時使用 heartbeat

- **多項定期檢查**：與其用 5 個獨立的 cron 工作分別檢查收件匣、行事曆、天氣、通知和專案狀態，不如用單一 heartbeat 將這些全部批次處理。
- **具情境感知的決策**：代理擁有完整的 main session 情境，因此可以針對何者緊急、何者可以等待做出明智的決定。
- **對話連續性**：Heartbeat 執行共用同一個 session，因此代理會記得最近的對話，並能自然地進行後續追蹤。
- **低監控負擔**：一個 heartbeat 即可取代許多小型輪詢任務。

### Heartbeat 優點

- **批次處理多項檢查**：代理的一個回合就能一起檢視收件匣、行事曆和通知。
- **減少 API 呼叫**：單一 heartbeat 比 5 個獨立的 cron 工作更便宜。
- **具情境感知**：代理知道您一直在進行的工作，並能據此排列優先順序。
- **智慧抑制**：如果沒有需要留意的事項，代理會回覆 `HEARTBEAT_OK` 且不會傳送任何訊息。
- **自然時序**：根據佇列負載稍微偏移，這對大多數監控來說沒有問題。

### Heartbeat 範例：HEARTBEAT.md 檢查清單

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

Agent 會在每次心跳時讀取此內容，並在一輪中處理所有項目。

### 設定心跳

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // interval
        target: "last", // explicit alert delivery target (default is "none")
        activeHours: { start: "08:00", end: "22:00" }, // optional
      },
    },
  },
}
```

請參閱 [Heartbeat](/en/gateway/heartbeat) 以取得完整設定。

## Cron：精確排程

Cron 工作會在精確的時間執行，並且可以在獨立的階段中執行，而不會影響主要語境。
週期性的整點排程會根據每個工作 0-5 分鐘視窗內的決定性偏移量自動分散。

### 何時使用 cron

- **需要精確時間**：「在每週一上午 9:00 發送此項目」（而非「9 點左右的某個時間」）。
- **獨立工作**：不需要對話語境的工作。
- **不同的模型/思考**：值得使用更強大模型進行的繁重分析。
- **一次性提醒**：使用 `--at` 的「20 分鐘後提醒我」。
- **繁雜/頻繁的工作**：會干擾主要階段紀錄的工作。
- **外部觸發**：無論 Agent 是否處於活躍狀態都應獨立執行的工作。

### Cron 優點

- **精確計時**：支援時區的 5 欄位或 6 欄位（秒） cron 表達式。
- **內建負載分散**：週期性的整點排程預設最多會錯開 5 分鐘。
- **個別工作控制**：使用 `--stagger <duration>` 覆蓋錯開設定，或使用 `--exact` 強制精確計時。
- **階段隔離**：在 `cron:<jobId>` 中執行，不會污染主要紀錄。
- **模型覆寫**：針對每個工作使用更便宜或更強大的模型。
- **傳遞控制**：獨立工作預設為 `announce` (摘要)；可依需求選擇 `none`。
- **立即傳遞**：Announce 模式會直接發布，無需等待心跳。
- **無需 Agent 語境**：即使主要階段閒置或已壓縮也能執行。
- **一次性支援**：使用 `--at` 進行精確的未來時間戳記。

### Cron 範例：每日早晨簡報

```bash
openclaw cron add \
  --name "Morning briefing" \
  --cron "0 7 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Generate today's briefing: weather, calendar, top emails, news summary." \
  --model opus \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

這會在紐約時間上午 7:00 準確執行，使用 Opus 確保品質，並直接向 WhatsApp 宣布摘要。

### Cron 範例：一次性提醒

```bash
openclaw cron add \
  --name "Meeting reminder" \
  --at "20m" \
  --session main \
  --system-event "Reminder: standup meeting starts in 10 minutes." \
  --wake now \
  --delete-after-run
```

請參閱 [Cron jobs](/en/automation/cron-jobs) 以取得完整的 CLI 參考資料。

## 決策流程圖

```
Does the task need to run at an EXACT time?
  YES -> Use cron
  NO  -> Continue...

Does the task need isolation from main session?
  YES -> Use cron (isolated)
  NO  -> Continue...

Can this task be batched with other periodic checks?
  YES -> Use heartbeat (add to HEARTBEAT.md)
  NO  -> Use cron

Is this a one-shot reminder?
  YES -> Use cron with --at
  NO  -> Continue...

Does it need a different model or thinking level?
  YES -> Use cron (isolated) with --model/--thinking
  NO  -> Use heartbeat
```

## 結合兩者

最有效率的設定會使用**兩者**：

1. **Heartbeat** 在每 30 分鐘的一次批次回合中處理例行監控（收件匣、行事曆、通知）。
2. **Cron** 處理精確排程（每日報告、每週檢討）和一次性提醒。

### 範例：高效能自動化設定

**HEARTBEAT.md**（每 30 分鐘檢查一次）：

```md
# Heartbeat checklist

- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Cron jobs**（精確計時）：

```bash
# Daily morning briefing at 7am
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce

# Weekly project review on Mondays at 9am
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster：具有審核流程的確定性工作流程

Lobster 是需要確定性執行和明確審核的**多步驟工具管線**的工作流程執行時。
當任務超過單一代理回合，且您希望擁有具有人類檢查點的可恢復工作流程時，請使用它。

### 何時適合使用 Lobster

- **多步驟自動化**：您需要固定的工具呼叫管線，而非一次性提示。
- **審核閘門**：副作用應暫停直到您批准，然後再恢復。
- **可恢復執行**：繼續已暫停的工作流程，無需重新執行先前的步驟。

### 它如何與 heartbeat 和 cron 搭配

- **Heartbeat/cron** 決定執行何時發生。
- **Lobster** 定義執行開始後發生的步驟。

對於排程的工作流程，請使用 cron 或 heartbeat 觸發呼叫 Lobster 的代理回合。
對於臨時工作流程，請直接呼叫 Lobster。

### 操作說明（來自程式碼）

- Lobster 在工具模式下以**本地子程序**（`lobster` CLI）運行，並傳回 **JSON 封包**。
- 如果工具傳回 `needs_approval`，您使用 `resumeToken` 和 `approve` 標誌恢復。
- 該工具是**可選外掛程式**；透過 `tools.alsoAllow: ["lobster"]` 累加啟用它（建議）。
- Lobster 預期 `lobster` CLI 可在 `PATH` 上使用。

參閱 [Lobster](/en/tools/lobster) 以了解完整用法和範例。

## 主會話 vs 隔離會話

Heartbeat 和 cron 都可以與主會話互動，但方式不同：

|          | Heartbeat                  | Cron (main)           | Cron (isolated)                         |
| -------- | -------------------------- | --------------------- | --------------------------------------- |
| 會話     | 主                         | 主（透過系統事件）    | `cron:<jobId>` 或自訂會話               |
| 歷史記錄 | 共享                       | 共享                  | 每次執行皆全新（隔離） / 持久化（自訂） |
| 語境     | 完整                       | 完整                  | 無（隔離） / 累積（自訂）               |
| 模型     | 主會話模型                 | 主會話模型            | 可覆寫                                  |
| 輸出     | 若非 `HEARTBEAT_OK` 則傳送 | Heartbeat 提示 + 事件 | 公布摘要 (預設)                         |

### 何時使用主會話 cron

當您想要以下情況時，請將 `--session main` 與 `--system-event` 搭配使用：

- 提醒/事件顯示於主會話上下文中
- 代理程式在下次心跳時以完整上下文處理它
- 無需額外的獨立執行

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何時使用獨立 cron

當您想要以下情況時，請使用 `--session isolated`：

- 一張乾淨的記錄，沒有先前的上下文
- 不同的模型或思考設定
- 直接將摘要公布到頻道
- 不會使主會話混亂的歷史記錄

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 0" \
  --session isolated \
  --message "Weekly codebase analysis..." \
  --model opus \
  --thinking high \
  --announce
```

## 成本考量

| 機制          | 成本概況                                           |
| ------------- | -------------------------------------------------- |
| 心跳          | 每 N 分鐘一次輪次；隨 HEARTBEAT.md 大小擴展        |
| Cron (主會話) | 將事件加入下次心跳 (無獨立輪次)                    |
| Cron (獨立)   | 每項工作一個完整的代理程式輪次；可使用更便宜的模型 |

**提示**：

- 保持 `HEARTBEAT.md` 精簡，以最小化 token 開銷。
- 將類似的檢查批次處理放入心跳中，而非多個 cron 工作。
- 如果您只需要內部處理，請在心跳上使用 `target: "none"`。
- 對於例行任務，請搭配更便宜的模型使用獨立 cron。

## 相關

- [心跳](/en/gateway/heartbeat) - 完整的心跳設定
- [Cron 工作](/en/automation/cron-jobs) - 完整的 cron CLI 和 API 參考
- [系統](/en/cli/system) - 系統事件 + 心跳控制
