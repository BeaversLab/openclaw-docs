---
summary: "選擇 heartbeat 與 cron 工作進行自動化操作的指導"
read_when:
  - 決定如何排程週期性任務
  - 設定背景監控或通知
  - 最佳化定期檢查的 token 使用量
title: "Cron vs Heartbeat"
---

# Cron vs Heartbeat：何時使用哪一種

Heartbeat 和 cron 工作都可以讓您依照排程執行任務。本指南協助您為您的使用案例選擇合適的機制。

## 快速決策指南

| 使用案例                    | 建議                | 原因                             |
| --------------------------- | ------------------- | -------------------------------- |
| 每 30 分鐘檢查一次收件匣    | Heartbeat           | 與其他檢查批次處理，具備情境感知 |
| 在上午 9 點準時發送每日報告 | Cron (獨立)         | 需要精確時間                     |
| 監控行事曆的即將到來的事件  | Heartbeat           | 定期感知的自然選擇               |
| 執行每週深度分析            | Cron (獨立)         | 獨立任務，可以使用不同的模型     |
| 在 20 分鐘後提醒我          | Cron (main, `--at`) | 具有精確時間的一次性任務         |
| 背景專案健康狀況檢查        | Heartbeat           | 搭載現有週期                     |

## Heartbeat：定期感知

Heartbeat 在**主會話 (main session)** 中以固定的時間間隔執行 (預設：30 分鐘)。它們旨在讓代理 檢查各項事務並呈現重要資訊。

### 何時使用 heartbeat

- **多項定期檢查**：與其使用 5 個獨立的 cron 工作分別檢查收件匣、行事曆、天氣、通知和專案狀態，不如使用單一 heartbeat 將這些全部批次處理。
- **具備情境感知的決策**：代理 擁有完整的主會語情境，因此可以針對何事緊急、何事可等待做出聰明的決策。
- **對話連續性**：Heartbeat 執行共用同一個會話，因此代理 會記得最近的對話並能自然地後續追蹤。
- **低負載監控**：一個 heartbeat 可以取代許多小型輪詢 任務。

### Heartbeat 優勢

- **批次處理多項檢查**：代理 的一次執行可以同時檢視收件匣、行事曆和通知。
- **減少 API 呼叫**：單一 heartbeat 比起 5 個獨立的 cron 工作更省成本。
- **具備情境感知**：代理 知道您一直在處理什麼，並能相應地排列優先順序。
- **智慧抑制**：如果沒有需要留意的事項，代理 會回覆 `HEARTBEAT_OK` 且不會傳送訊息。
- **自然時機**：會根據佇列負載輕微偏移，這對大多數監控來說是可以接受的。

### Heartbeat 範例：HEARTBEAT.md 檢查清單

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

Cron 工作會在精確的時間執行，並且可以在獨立的會話中執行，而不會影響主要內容。
每小時週期性排程會透過決定性（deterministic）的每個工作偏移量，
自動分散在 0 到 5 分鐘的時間視窗內。

### 何時使用 cron

- **需要精確時間**：「在每週一上午 9:00 發送這個」（而不是「9 點左右的某個時間」）。
- **獨立工作**：不需要對話內容的工作。
- **不同的模型/思考**：值得使用更強大模型進行的重型分析。
- **一次性提醒**：使用 `--at`「在 20 分鐘後提醒我」。
- **高頻/雜亂的工作**：會使主要會話歷史雜亂的工作。
- **外部觸發**：應獨立於代理是否處於活躍狀態而執行的工作。

### Cron 優點

- **精確時間**：支援時區的 5 欄位或 6 欄位（秒）cron 表達式。
- **內建負載分散**：每小時週期性排程預設會錯開最多 5 分鐘。
- **單一工作控制**：使用 `--stagger <duration>` 覆蓋錯開時間，或使用 `--exact` 強制精確時間。
- **會話隔離**：在 `cron:<jobId>` 中執行，不會污染主要歷史。
- **模型覆寫**：針對每個工作使用更便宜或更強大的模型。
- **傳遞控制**：獨立工作預設為 `announce` (摘要)；可視需要選擇 `none`。
- **立即傳遞**：公告模式會直接發布，無需等待心跳。
- **無需代理內容**：即使主要會話處於閒置或已壓縮狀態也能執行。
- **一次性支援**：使用 `--at` 來設定精確的未來時間戳記。

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

這會在紐約時間早上 7:00 準時執行，使用 Opus 以確保品質，並直接將摘要發布至 WhatsApp。

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

## 結合使用兩者

最有效率的設定會**同時使用兩者**：

1. **Heartbeat** 處理例行監控（收件匣、行事曆、通知），每 30 分鐘進行一次批次回合。
2. **Cron** 處理精確排程（每日報告、每週審查）和一次性提醒。

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

## Lobster：具備審核機制的確定性工作流程

Lobster 是 **多步驟工具管線** 的工作流程執行環境，適用於需要確定性執行和明確審核的情境。
當任務超過單一代理回合，且您希望具備有人類檢查點的可恢復工作流程時，請使用它。

### 適用 Lobster 的情境

- **多步驟自動化**：您需要固定的工具呼叫管線，而非一次性提示。
- **審核閘門**：副作用應暫停直到您批准，然後再繼續。
- **可恢復的執行**：繼續暫停的工作流程，無需重新執行先前的步驟。

### 如何與 heartbeat 和 cron 搭配

- **Heartbeat/cron** 決定執行發生的*時間*。
- **Lobster** 定義執行開始後發生的*步驟*。

對於排程的工作流程，請使用 cron 或 heartbeat 來觸發呼叫 Lobster 的代理回合。
對於臨時的工作流程，請直接呼叫 Lobster。

### 操作說明（來自程式碼）

- Lobster 作為 **本地子程序** (`lobster` CLI) 在工具模式下執行，並返回 **JSON 封包**。
- 如果工具返回 `needs_approval`，請使用 `resumeToken` 和 `approve` 標誌來繼續。
- 該工具是一個 **選用插件**；建議透過 `tools.alsoAllow: ["lobster"]` 增加式地啟用它。
- Lobster 預期 `lobster` CLI 可在 `PATH` 上使用。

請參閱 [Lobster](/zh-Hant/tools/lobster) 以了解完整用法和範例。

## 主會話 vs 隔離會話

Heartbeat 和 cron 都可以與主會話互動，但方式不同：

|      | Heartbeat                  | Cron (main)           | Cron (isolated)                        |
| ---- | -------------------------- | --------------------- | -------------------------------------- |
| 會話 | 主                         | 主（透過系統事件）    | `cron:<jobId>` 或自訂會話              |
| 記錄 | 共享                       | 共享                  | 每次執行皆全新（隔離）/ 持久化（自訂） |
| 脈絡 | 完整                       | 完整                  | 無（隔離）/ 累積（自訂）               |
| 模型 | 主會話模型                 | 主會話模型            | 可覆寫                                 |
| 輸出 | 若非 `HEARTBEAT_OK` 則傳送 | Heartbeat 提示 + 事件 | 公告摘要（預設）                       |

### 何時使用主會話 cron

當您想要以下內容時，請搭配 `--system-event` 使用 `--session main`：

- 提醒/事件顯示於主會話語境中
- 代理程式在下一次心跳期間以完整語境處理它
- 無獨立的隔離執行

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何時使用隔離 cron

當您想要以下內容時，請使用 `--session isolated`：

- 一張沒有先前語境的淨白畫布
- 不同的模型或思考設定
- 將摘要直接公告到頻道
- 不會讓主會話變得雜亂的歷史記錄

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

| 機制         | 成本概況                                           |
| ------------ | -------------------------------------------------- |
| 心跳         | 每 N 分鐘一回合；隨 HEARTBEAT.md 大小縮放          |
| Cron（主）   | 將事件加入到下一次心跳（無隔離回合）               |
| Cron（隔離） | 每項作業一個完整的代理程式回合；可使用較便宜的模型 |

**提示**：

- 維持 `HEARTBEAT.md` 較小以將 token 開銷降至最低。
- 將類似的檢查批次合併到心跳中，而非多個 cron 作業。
- 如果您只想要內部處理，請在心跳上使用 `target: "none"`。
- 使用隔離 cron 搭配較便宜的模型來執行例行任務。

## 相關

- [Heartbeat](/zh-Hant/gateway/heartbeat) - 完整的心跳設定
- [Cron jobs](/zh-Hant/automation/cron-jobs) - 完整的 cron CLI 與 API 參考
- [System](/zh-Hant/cli/system) - 系統事件 + 心跳控制

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
