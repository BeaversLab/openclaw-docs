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

一個重要的區別：

- **Heartbeat** 是一個排程的 **main-session turn（主會話輪次）** — 不會建立任務記錄。
- **Cron (main)** 是一個排程進入主會話的 **系統事件** — 建立一個帶有 `silent` 通知原則的任務記錄。
- **Cron (isolated)** 是一個排程的 **背景執行** — 建立一個在 `openclaw tasks` 中追蹤的任務記錄。

所有 cron 工作的執行（main 和 isolated）都會建立[任務記錄](/en/automation/tasks)。Heartbeat 輪次則不會。主會話 cron 任務預設使用 `silent` 通知原則，因此它們不會產生通知。

## 快速決策指南

| 使用案例                     | 推薦                | 原因                           |
| ---------------------------- | ------------------- | ------------------------------ |
| 每 30 分鐘檢查收件匣         | Heartbeat           | 與其他檢查批次處理，具情境感知 |
| 在早上 9 點整傳送每日報告    | Cron (isolated)     | 需要精確的時間                 |
| 監控日曆以查看即將到來的事件 | Heartbeat           | 週期性感知的自然選擇           |
| 每週執行深度分析             | Cron (isolated)     | 獨立任務，可使用不同的模型     |
| 在 20 分鐘後提醒我           | Cron (main, `--at`) | 精確時間的單次執行             |
| 背景專案健康檢查             | Heartbeat           | 依附於現有循環                 |

## Heartbeat：週期性感知

Heartbeats 以固定間隔（預設：30 分鐘）在 **主會話** 中執行。它們的設計目的是讓代理檢查各項事物並浮現任何重要事項。

### 何時使用 heartbeat

- **多項週期性檢查**：與其使用 5 個獨立的 cron 工作分別檢查收件匣、日曆、天氣、通知和專案狀態，單一 heartbeat 可以將所有這些批次處理。
- **情境感知決策**：代理擁有完整的主會話情境，因此它可以對什麼是緊急的、什麼可以等待做出聰明的決策。
- **對話連續性**：Heartbeat 執行共用同一個會話，因此代理記得最近的對話並可以自然地跟進。
- **低負載監控**：一個 heartbeat 可以取代許多小型輪詢任務。

### Heartbeat 優勢

- **批次處理多項檢查**：單一代理輪次可以一起檢閱收件匣、日曆和通知。
- **減少 API 呼叫**：單一 heartbeat 比 5 個獨立的 cron 工作更便宜。
- **情境感知**：代理知道您一直在做什麼，並可以相應地確定優先順序。
- **智慧抑制**：如果無需關注，代理會回覆 `HEARTBEAT_OK` 且不會傳送任何訊息。
- **自然時序**：根據佇列負載輕微漂移，這對大多數監控來說是可以接受的。
- **無任務記錄**：heartbeat 回合會保留在主會話歷史中（請參閱 [背景任務](/en/automation/tasks)）。

### Heartbeat 範例：HEARTBEAT.md 檢查清單

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

代理會在每次 heartbeat 時讀取此檔案，並在一個回合中處理所有項目。

### 設定 heartbeat

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

Cron 任務在精確的時間執行，且可在獨立的會話中執行，而不會影響主要內容。
每小時的週期性排程會根據每個任務的決定性偏移量，在 0-5 分鐘的視窗內自動分散。

### 何時使用 cron

- **需要精確時間**：「每週一上午 9:00 傳送此訊息」（而非「9 點左右的某個時間」）。
- **獨立任務**：不需要對話內容的任務。
- **不同的模型/思考**：值得使用更強大模型進行的繁重分析。
- **一次性提醒**：使用 `--at` 設定「20 分鐘後提醒我」。
- **頻繁/雜亂的任務**：會讓主會話歷史變得雜亂的任務。
- **外部觸發**：無論代理是否活躍都應獨立執行的任務。

### Cron 優點

- **精確時間**：支援時區的 5 欄位或 6 欄位（秒） cron 表達式。
- **內建負載分散**：週期性的每小時排程預設會錯開最多 5 分鐘。
- **個別任務控制**：使用 `--stagger <duration>` 覆寫錯開，或使用 `--exact` 強制精確時間。
- **會話隔離**：在 `cron:<jobId>` 中執行，不會汙染主歷史。
- **模型覆寫**：每個任務可以使用更便宜或更強大的模型。
- **傳遞控制**：獨立任務預設為 `announce` (摘要)；可根據需要選擇 `none`。
- **立即傳遞**：公告模式會直接發布，無需等待 heartbeat。
- **無需代理內容**：即使主會話處於閒置或已壓縮狀態也能執行。
- **一次性支援**：使用 `--at` 進行精確的未來時間戳記設定。
- **工作追蹤**：獨立的工作會建立可在 `openclaw tasks` 和 `openclaw tasks audit` 中檢視的 [背景工作](/en/automation/tasks) 記錄。

### Cron 範例：每日早間簡報

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

這會在紐約時間上午 7:00 準時執行，使用 Opus 以確保品質，並將摘要直接發送到 WhatsApp。

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

## 結合使用兩者

最有效率的設定會**同時使用兩者**：

1. **Heartbeat** 在每 30 分鐘的一次批次輪次中處理常規監控（收件匣、行事曆、通知）。
2. **Cron** 處理精確排程（每日報告、每週審查）和一次性提醒。

### 範例：高效率的自動化設定

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

## Lobster：具審核程序的確定性工作流程

Lobster 是 **多步驟工具管線** 的工作流程執行環境，適用於需要確定性執行和明確審核的情境。
當任務超過單一代理輪次，且您希望擁有具有人類檢查點的可恢復工作流程時，請使用它。

### 適合使用 Lobster 的時機

- **多步驟自動化**：您需要固定的工具呼叫管線，而非一次性提示。
- **審核閘門**：副作用應暫停直到您核准，然後再恢復。
- **可恢復的執行**：繼續暫停的工作流程，無需重新執行先前的步驟。

### 它如何與 heartbeat 和 cron 搭配

- **Heartbeat/cron** 決定執行*何時*發生。
- **Lobster** 定義一旦執行開始後*發生什麼步驟*。

對於已排程的工作流程，請使用 cron 或 heartbeat 來觸發呼叫 Lobster 的代理輪次。
對於臨時工作流程，請直接呼叫 Lobster。

### 操作說明（來自程式碼）

- Lobster 在工具模式下以 **本機子程序** (`lobster` CLI) 執行，並傳回 **JSON 信封**。
- 如果工具傳回 `needs_approval`，請使用 `resumeToken` 和 `approve` 旗標恢復。
- 該工具是一個 **選用外掛程式**；建議透過 `tools.alsoAllow: ["lobster"]` 以附加方式啟用它。
- Lobster 預期 `lobster` CLI 可在 `PATH` 上使用。

請參閱 [Lobster](/en/tools/lobster) 以取得完整的使用方式和範例。

## 主工作階段 vs 隔離工作階段

心跳 和 cron 都可以與主工作階段互動，但方式不同：

|                              | 心跳                       | Cron (主)         | Cron (隔離)                           |
| ---------------------------- | -------------------------- | ----------------- | ------------------------------------- |
| 工作階段                     | 主                         | 主 (透過系統事件) | `cron:<jobId>` 或自訂工作階段         |
| 歷史記錄                     | 共用                       | 共用              | 每次執行皆全新 (隔離) / 持續性 (自訂) |
| 上下文                       | 完整                       | 完整              | 無 (隔離) / 累積 (自訂)               |
| 模型                         | 主工作階段模型             | 主工作階段模型    | 可覆寫                                |
| 輸出                         | 若非 `HEARTBEAT_OK` 則傳送 | 心跳提示詞 + 事件 | 發布摘要 (預設)                       |
| [任務](/en/automation/tasks) | 無任務記錄                 | 任務記錄 (靜默)   | 任務記錄 (於 `openclaw tasks` 中可見) |

### 何時使用主工作階段 cron

當您想要以下結果時，請搭配 `--system-event` 使用 `--session main`：

- 提醒/事件出現在主工作階段上下文中
- 代理程式在下次具備完整上下文的心跳時處理它
- 無額外的隔離執行

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何時使用隔離 cron

當您想要以下結果時，請使用 `--session isolated`：

- 沒有先前上下文的乾淨開始
- 不同的模型或思考設定
- 直接向頻道發布摘要
- 不會混淆主工作階段的歷史記錄

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

| 機制        | 成本概況                                       |
| ----------- | ---------------------------------------------- |
| 心跳        | 每 N 分鐘一個回合；隨 HEARTBEAT.md 大小擴展    |
| Cron (主)   | 將事件加入下次心跳 (無隔離回合)                |
| Cron (隔離) | 每個工作完整的代理程式回合；可使用較便宜的模型 |

**提示**：

- 保持 `HEARTBEAT.md` 短小以將 token 開銷降至最低。
- 將類似的檢查合併到心跳中，而非使用多個 cron 工作。
- 如果您只想要內部處理，請在心跳上使用 `target: "none"`。
- 針對例行任務，使用具有較便宜模型的隔離 cron。

## 相關

- [自動化概覽](/en/automation) — 自動化機制一覽
- [心跳](/en/gateway/heartbeat) — 完整的心跳設定
- [Cron 工作](/en/automation/cron-jobs) — 完整的 cron CLI 和 API 參考
- [背景任務](/en/automation/tasks) — 任務分類帳、稽核和生命週期
- [系統](/en/cli/system) — 系統事件 + 心跳控制
