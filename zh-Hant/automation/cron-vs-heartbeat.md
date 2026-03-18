---
summary: "選擇自動化心跳與 cron 排程工作的指引"
read_when:
  - Deciding how to schedule recurring tasks
  - Setting up background monitoring or notifications
  - Optimizing token usage for periodic checks
title: "Cron vs Heartbeat"
---

# Cron vs Heartbeat：何時使用何者

心跳與 cron 排程工作都能讓您依排程執行任務。本指南將協助您為您的使用案例選擇合適的機制。

## 快速決策指南

| 使用案例                  | 建議方式             | 原因                               |
| ------------------------- | -------------------- | ---------------------------------- |
| 每 30 分鐘檢查收件匣      | 心跳                 | 與其他檢查批次處理，具情境感知能力 |
| 早上 9 點準時傳送每日報告 | Cron（獨立）         | 需要精確的時間點                   |
| 監控行事曆的即將來臨活動  | 心跳                 | 非常適合週期性感知                 |
| 執行每週深度分析          | Cron（獨立）         | 獨立任務，可使用不同的模型         |
| 在 20 分鐘後提醒我        | Cron（主要，`--at`） | 精確時間的單次任務                 |
| 背景專案健康檢查          | 心跳                 | 利用現有週期順便執行               |

## 心跳：週期性感知

心跳會以固定的間隔（預設：30 分鐘）在**主要工作階段**中執行。它們的設計目的是讓代理檢查各項事務並突顯任何重要事項。

### 何時使用心跳

- **多項週期性檢查**：與其使用 5 個獨立的 cron 排程工作分別檢查收件匣、行事曆、天氣、通知和專案狀態，不如用單一心跳將這些全部批次處理。
- **具情境感知的決策**：代理擁有完整的主要工作階段情境，因此能做出明智的判斷，決定什麼事情緊急、什麼事情可以等待。
- **對話連續性**：心跳的執行共用同一個工作階段，因此代理會記得最近的對話內容，並能自然地進行後續處理。
- **低負載監控**：單一心跳即可取代許多小型輪詢任務。

### 心跳優點

- **批次處理多項檢查**：單一代理輪次就能同時檢視收件匣、行事曆和通知。
- **減少 API 呼叫**：單一心跳的成本比 5 個獨立的 cron 排程工作更低。
- **具情境感知**：代理知道您一直在處理的事情，並能據此決定優先順序。
- **智慧抑制**：若無需注意任何事項，代理會回覆 `HEARTBEAT_OK` 且不會傳送任何訊息。
- **自然的時間點**：會根據佇列負載輕微漂移，這對大多數監控來說是可以接受的。

### 心跳範例：HEARTBEAT.md 檢查清單

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

代理會在每次心跳時讀取此內容，並在一個輪次中處理所有項目。

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

完整設定請參閱 [Heartbeat](/zh-Hant/gateway/heartbeat)。

## Cron：精確排程

Cron 作業會在精確的時間執行，並且可以在獨立的會話中執行，而不影響主要情境。
週期性整點排程會透過決定性
的每項作業偏移量，在 0-5 分鐘的視窗內自動分散。

### 何時使用 cron

- **需要精確時間**：「在每週一上午 9:00 傳送此項目」（而非「大約 9 點左右的某個時間」）。
- **獨立任務**：不需要對話情境的任務。
- **不同的模型/思考**：值得使用更強大模型的繁重分析工作。
- **一次性提醒**：使用 `--at` 的「在 20 分鐘後提醒我」。
- **頻繁/雜亂的任務**：會讓主要會話記錄變得雜亂的任務。
- **外部觸發**：無論代理是否活躍都應獨立執行的任務。

### Cron 優點

- **精確計時**：支援時區的 5 欄位或 6 欄位（秒） cron 運算式。
- **內建負載分散**：週期性整點排程預設會錯開最多 5 分鐘。
- **每項作業控制**：使用 `--stagger <duration>` 覆寫錯開設定，或使用 `--exact` 強制精確計時。
- **會話隔離**：在 `cron:<jobId>` 中執行，不會汙染主要記錄。
- **模型覆寫**：針對每項作業使用較便宜或更強大的模型。
- **傳遞控制**：獨立作業預設為 `announce`（摘要）；視需要選擇 `none`。
- **立即傳遞**：公告模式會直接發布，無需等待心跳。
- **無需代理情境**：即使主要會話處於閒置或已壓縮狀態也能執行。
- **一次性支援**：使用 `--at` 進行精確的未來時間戳記。

### Cron 範例：每日晨間簡報

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

這會在紐約時間上午 7:00 整執行，使用 Opus 以確保品質，並直接將摘要發布到 WhatsApp。

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

完整的 CLI 參考請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs)。

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

最高效的設定會**同時使用兩者**：

1. **Heartbeat** 處理例行監控（收件匣、日曆、通知），每 30 分鐘以單一批次輪詢進行。
2. **Cron** 處理精確排程（每日報告、每週審查）和一次性提醒。

### 範例：高效自動化設定

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

## Lobster：具審核機制的確定性工作流程

Lobster 是 **多步驟工具管線** 的工作流程執行時，適用於需要確定性執行與明確審核的情況。
當任務超出單一 Agent 輪詢範圍，且您希望具備人工檢查點的可恢復工作流程時，請使用它。

### 適合使用 Lobster 的時機

- **多步驟自動化**：您需要固定的工具呼叫管線，而非一次性提示。
- **審核閘門**：副作用應暫停直到您審核通過，然後再繼續。
- **可恢復執行**：繼續暫停的工作流程，無需重新執行先前的步驟。

### 如何與 heartbeat 和 cron 搭配

- **Heartbeat/cron** 決定執行發生的「時機」。
- **Lobster** 定義執行開始後的「執行步驟」。

對於排程工作流程，請使用 cron 或 heartbeat 來觸發呼叫 Lobster 的 Agent 輪詢。
對於臨時工作流程，請直接呼叫 Lobster。

### 操作說明（來自程式碼）

- Lobster 以工具模式作為 **本地子行程**（`lobster` CLI）執行，並傳回 **JSON 封包**。
- 如果工具傳回 `needs_approval`，您將使用 `resumeToken` 和 `approve` 旗標來恢復。
- 此工具是 **選用插件**；建議透過 `tools.alsoAllow: ["lobster"]` 以累加方式啟用（建議）。
- Lobster 預期 `lobster` CLI 須在 `PATH` 上可用。

參閱 [Lobster](/zh-Hant/tools/lobster) 以了解完整用法與範例。

## 主工作階段 vs 獨立工作階段

Heartbeat 和 cron 都可以與主工作階段互動，但方式不同：

|          | Heartbeat                  | Cron (main)           | Cron (isolated)                       |
| -------- | -------------------------- | --------------------- | ------------------------------------- |
| 工作階段 | 主                         | 主 (透過系統事件)     | `cron:<jobId>` 或自訂工作階段         |
| 紀錄     | 共用                       | 共用                  | 每次執行皆全新 (獨立) / 持久化 (自訂) |
| Context  | 完整                       | 完整                  | 無 (獨立) / 累積 (自訂)               |
| 模型     | 主工作階段模型             | 主工作階段模型        | 可覆寫                                |
| 輸出     | 若非 `HEARTBEAT_OK` 則傳送 | Heartbeat 提示 + 事件 | 公告摘要（預設）                      |

### 何時使用主會話 cron

當您想要以下結果時，請使用 `--session main` 搭配 `--system-event`：

- 提醒/事件出現在主會話上下文中
- 代理在下一個心跳期間處理它，並具備完整上下文
- 無額外的獨立執行

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何時使用獨立 cron

當您想要以下結果時，請使用 `--session isolated`：

- 沒有先前上下文的乾淨環境
- 不同的模型或思考設定
- 直接將摘要公告傳送至頻道
- 不會雜亂主會話的歷史紀錄

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

| 機制             | 成本概況                                    |
| ---------------- | ------------------------------------------- |
| 心跳 (Heartbeat) | 每 N 分鐘一輪；成本隨 HEARTBEAT.md 大小調整 |
| Cron (主)        | 將事件加入下一個心跳（無獨立輪次）          |
| Cron (獨立)      | 每項工作完整的代理輪次；可使用較便宜的模型  |

**提示**：

- 保持 `HEARTBEAT.md` 簡短以將 token 開銷降至最低。
- 將相似的檢查批次處理至心跳，而非多個 cron 工作。
- 如果您只想要內部處理，請在心跳上使用 `target: "none"`。
- 針對例行任務，搭配較便宜的模型使用獨立 cron。

## 相關

- [Heartbeat](/zh-Hant/gateway/heartbeat) - 完整心跳設定
- [Cron jobs](/zh-Hant/automation/cron-jobs) - 完整 cron CLI 和 API 參考
- [System](/zh-Hant/cli/system) - 系統事件 + 心跳控制

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
