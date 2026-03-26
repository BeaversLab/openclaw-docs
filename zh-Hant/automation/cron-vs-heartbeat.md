---
summary: "選擇自動化心跳與 cron 工作的指南"
read_when:
  - Deciding how to schedule recurring tasks
  - Setting up background monitoring or notifications
  - Optimizing token usage for periodic checks
title: "Cron vs Heartbeat"
---

# Cron vs Heartbeat：何時使用

Heartbeat 和 cron 工作都能讓您按排程執行任務。本指南將協助您為您的使用案例選擇適合的機制。

## 快速決策指南

| 使用案例                  | 推薦                | 原因                               |
| ------------------------- | ------------------- | ---------------------------------- |
| 每 30 分鐘檢查收件匣      | Heartbeat           | 與其他檢查批次處理，具情境感知能力 |
| 在早上 9 點整發送每日報告 | Cron (獨立)         | 需要精準的時間                     |
| 監控日曆的即將到來活動    | Heartbeat           | 自然適合週期性感知                 |
| 執行每週深度分析          | Cron (獨立)         | 獨立任務，可使用不同的模型         |
| 在 20 分鐘後提醒我        | Cron (main, `--at`) | 具精準時間的一次性執行             |
| 背景專案健康檢查          | Heartbeat           | 搭載於現有週期                     |

## 心跳：定期感知

心跳以固定間隔（預設為 30 分鐘）在**主工作階段**中執行。其設計目的是讓代理檢查各項事務並呈現任何重要資訊。

### 何時使用心跳

- **多項定期檢查**：與其使用 5 個獨立的 cron 工作來檢查收件匣、日曆、天氣、通知和專案狀態，不如使用單一心跳來批次處理所有這些項目。
- **情境感知決策**：代理擁有完整的主工作階段情境，因此能針對何事緊急、何事可等待做出明智決策。
- **對話連續性**：心跳執行共用同一個工作階段，因此代理會記住最近的對話，並能自然地進行後續追蹤。
- **低負載監控**：單一心跳即可取代許多小型輪詢任務。

### 心跳的優點

- **批次處理多項檢查**：單一代理回合即可一併檢視收件匣、日曆和通知。
- **減少 API 呼叫**：單一心跳比 5 個獨立的 cron 任務更便宜。
- **情境感知**：代理知道您一直在處理什麼，並可以據此確定優先順序。
- **智慧抑制**：如果無需注意任何事項，代理會回覆 `HEARTBEAT_OK` 且不會傳送任何訊息。
- **自然時序**：根據佇列負載略微偏移，這對於大多數監控來說是可以接受的。

### 心跳範例：HEARTBEAT.md 檢查清單

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

代理會在每次心跳時讀取此內容，並在一輪中處理所有項目。

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

請參閱 [Heartbeat](/zh-Hant/gateway/heartbeat) 以取得完整設定。

## Cron：精確排程

Cron 任務在精確時間執行，並且可以在獨立的工作階段中執行，而不會影響主要情境。
週期性的整點排程會透過 0-5 分鐘視窗內的確定性每任務偏移量自動分散。

### 何時使用 cron

- **需要精確時間**：「在每週一上午 9:00 發送此項目」（而非「大約 9 點左右」）。
- **獨立任務**：不需要對話脈絡的任務。
- **不同的模型/思考**：值得使用更強大模型進行的深度分析。
- **一次性提醒**：「在 20 分鐘後提醒我」，搭配 `--at`。
- **頻繁/干擾性任務**：會使主會話歷史變得雜亂的任務。
- **外部觸發**：無論代理是否活躍都應獨立執行的任務。

### Cron 優勢

- **精確排程**：支援時區的 5 欄位或 6 欄位（秒） cron 運算式。
- **內建負載分散**：週期性的整點排程預設會錯開最多 5 分鐘。
- **個別任務控制**：使用 `--stagger <duration>` 覆蓋錯開設定，或使用 `--exact` 強制精確時間。
- **工作階段隔離**：在 `cron:<jobId>` 中執行，不會污染主要歷史記錄。
- **模型覆寫**：針對每個工作選用更便宜或更強大的模型。
- **傳遞控制**：隔離的工作預設為 `announce`（摘要）；可根據需要選擇 `none`。
- **立即傳遞**：公告模式會直接發布，無需等待心跳。
- **不需要代理程式上下文**：即使主要工作階段處於閒置或已壓縮狀態也能執行。
- **單次執行支援**：`--at` 用於精確的未來時間戳記。

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

這會在紐約時間上午 7:00 整執行，使用 Opus 模型以確保品質，並直接將摘要發布到 WhatsApp。

### Cron 範例：單次提醒

```bash
openclaw cron add \
  --name "Meeting reminder" \
  --at "20m" \
  --session main \
  --system-event "Reminder: standup meeting starts in 10 minutes." \
  --wake now \
  --delete-after-run
```

請參閱 [Cron jobs](/zh-Hant/automation/cron-jobs) 以取得完整的 CLI 參考資料。

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

最有效率的設定會**同時使用兩者**：

1. **Heartbeat** 處理例行監控（收件匣、行事曆、通知），每 30 分鐘在一次批次回合中完成。
2. **Cron** 處理精確排程（每日報告、每週檢視）和一次性提醒。

### 範例：高效自動化設定

**HEARTBEAT.md**（每 30 分鐘檢查一次）：

```md
# Heartbeat checklist

- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Cron jobs**（精確的時機）：

```bash
# Daily morning briefing at 7am
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce

# Weekly project review on Mondays at 9am
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster：具備審核功能的確定性工作流程

Lobster 是 **多步驟工具管線** 的工作流程執行環境，需要確定性執行和明確審核。
當任務超過單一代理回合，且您希望具備人工檢查點的可恢復工作流程時，請使用它。

### 何時適用 Lobster

- **多步驟自動化**：您需要固定的工具呼叫管線，而非一次性提示。
- **審核閘門**：副作用應暫停直到您批准，然後再繼續。
- **可恢復的執行**：繼續暫停的工作流程，無需重新執行先前的步驟。

### 它如何與 heartbeat 和 cron 搭配

- **Heartbeat/cron** 決定執行「何時」發生。
- **Lobster** 定義執行開始後發生的「步驟」。

對於排程的工作流程，請使用 cron 或 heartbeat 來觸發呼叫 Lobster 的 agent 週期。
對於臨時工作流程，請直接呼叫 Lobster。

### 操作說明 (來自程式碼)

- Lobster 以工具模式作為 **本機子處理程序** (`lobster` CLI) 執行，並傳回 **JSON 信封**。
- 如果工具傳回 `needs_approval`，您應使用 `resumeToken` 和 `approve` 旗標恢復。
- 此工具是 **選用插件**；建議透過 `tools.alsoAllow: ["lobster"]` 以累加方式啟用它。
- Lobster 預期 `lobster` CLI 可用於 `PATH`。

請參閱 [Lobster](/zh-Hant/tools/lobster) 以取得完整用法和範例。

## 主工作階段與獨立工作階段

心跳和 Cron 都可以與主會話互動，但方式不同：

|      | 心跳                       | Cron (main)       | Cron (isolated)                     |
| ---- | -------------------------- | ----------------- | ----------------------------------- |
| 會話 | 主                         | 主 (透過系統事件) | `cron:<jobId>` 或自訂會話           |
| 歷史 | 共用                       | 共用              | 每次執行皆全新 (隔離) / 持續 (自訂) |
| 脈絡 | 完整                       | 完整              | 無 (隔離) / 累積 (自訂)             |
| 模型 | 主會話模型                 | 主會話模型        | 可覆寫                              |
| 輸出 | 若非 `HEARTBEAT_OK` 則傳送 | 心跳提示 + 事件   | 宣佈摘要 (預設)                     |

### 何時使用主會話 Cron

當您希望以下情況時，請將 `--session main` 與 `--system-event` 搭配使用：

- 提醒/事件出現在主會話脈絡中
- 代理程式在下次心跳時使用完整脈絡處理它
- 無額外的隔離執行

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何時使用隔離 Cron

當您希望以下情況時，請使用 `--session isolated`：

- 一張沒有先前脈絡的白紙
- 不同的模型或思考設定
- 直接向頻道發布摘要
- 不會弄亂主會話的歷史記錄

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

| 機制          | 成本概況                                    |
| ------------- | ------------------------------------------- |
| Heartbeat     | 每 N 分鐘一個輪次；隨 HEARTBEAT.md 大小擴展 |
| Cron (主會話) | 將事件加入到下一次 heartbeat（無獨立輪次）  |
| Cron (獨立)   | 每個作業完整的代理輪次；可使用較便宜的模型  |

**提示**：

- 保持 `HEARTBEAT.md` 小巧以最小化 token 開銷。
- 將類似的檢查批處理到 heartbeat 中，而不是使用多個 cron 作業。
- 如果您只想進行內部處理，請在 heartbeat 上使用 `target: "none"`。
- 對於例行任務，請使用獨立 cron 搭配較便宜的模型。

## 相關

- [Heartbeat](/zh-Hant/gateway/heartbeat) - 完整的 heartbeat 設定
- [Cron jobs](/zh-Hant/automation/cron-jobs) - 完整的 cron CLI 和 API 參考
- [System](/zh-Hant/cli/system) - 系統事件 + heartbeat 控制項

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
