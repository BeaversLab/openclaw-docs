---
summary: "為自主代理程式定義永久運作權限"
read_when:
  - Setting up autonomous agent workflows that run without per-task prompting
  - Defining what the agent can do independently vs. what needs human approval
  - Structuring multi-program agents with clear boundaries and escalation rules
title: "常駐指令"
---

常規指令授予您的代理人在既定程式下的**永久運作權限**。與其每次都給予單獨的任務指示，您不如定義具有明確範圍、觸發條件和升級規則的程式——代理人會在這些界限內自主執行。

這就是每週五告訴助理「發送週報」與授予常駐權限之間的差別：「你負責週報。每週五彙整並發送，只有在看起來有異常時才升級回報。」

## 為什麼需要常駐指令

**沒有常駐指令：**

- 您必須為每個任務提示代理
- 代理在請求之間處於閒置狀態
- 例行工作會被遺忘或延遲
- 您成為了瓶頸

**有了常駐指令：**

- 代理在既定範圍內自主執行
- 例行工作按時執行，無需提示
- 您只需介入處理例外情況和審核批准
- 代理能有效地利用空閒時間

## 運作方式

常駐指令定義在您的 [agent workspace](/zh-Hant/concepts/agent-workspace) 檔案中。建議的做法是直接將其包含在 `AGENTS.md` 中（該檔案會在每個工作階段自動注入），以便代理始終掌握其上下文。對於較大的配置，您也可以將其放置在專用檔案（如 `standing-orders.md`）中，並從 `AGENTS.md` 引用它。

每個程式指定：

1. **範圍** —— 代理人獲授權執行的內容
2. **觸發條件** —— 何時執行（排程、事件或條件）
3. **審核閘門** —— 在採取行動前需要哪些人工簽核
4. **升級規則** —— 何時停止並請求協助

代理會透過工作區引導檔案在每個工作階段載入這些指令（有關自動注入檔案的完整列表，請參閱 [Agent Workspace](/zh-Hant/concepts/agent-workspace)），並結合 [cron jobs](/zh-Hant/automation/cron-jobs) 進行基於時間的強制執行，對其進行執行。

<Tip>將常規指令放在 `AGENTS.md` 中，以確保它們在每個工作階段都會被載入。工作區啟動程序會自動注入 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md` —— 但不會注入子目錄中的任意檔案。</Tip>

## 常駐指令剖析

```markdown
## Program: Weekly Status Report

**Authority:** Compile data, generate report, deliver to stakeholders
**Trigger:** Every Friday at 4 PM (enforced via cron job)
**Approval gate:** None for standard reports. Flag anomalies for human review.
**Escalation:** If data source is unavailable or metrics look unusual (>2σ from norm)

### Execution steps

1. Pull metrics from configured sources
2. Compare to prior week and targets
3. Generate report in Reports/weekly/YYYY-MM-DD.md
4. Deliver summary via configured channel
5. Log completion to Agent/Logs/

### What NOT to do

- Do not send reports to external parties
- Do not modify source data
- Do not skip delivery if metrics look bad - report accurately
```

## 常駐指令加上 cron 排程工作

常駐指令定義了代理被授權做**什麼**。[Cron 排程工作](/zh-Hant/automation/cron-jobs) 則定義了**何時**執行。它們協同運作：

```
Standing Order: "You own the daily inbox triage"
    ↓
Cron Job (8 AM daily): "Execute inbox triage per standing orders"
    ↓
Agent: Reads standing orders → executes steps → reports results
```

Cron 排程工作的提示應該參照常駐指令，而不是複製它：

```bash
openclaw cron add \
  --name daily-inbox-triage \
  --cron "0 8 * * 1-5" \
  --tz America/New_York \
  --timeout-seconds 300 \
  --announce \
  --channel imessage \
  --to "+1XXXXXXXXXX" \
  --message "Execute daily inbox triage per standing orders. Check mail for new alerts. Parse, categorize, and persist each item. Report summary to owner. Escalate unknowns."
```

## 範例

### 範例 1：內容與社群媒體（每週週期）

```markdown
## Program: Content & Social Media

**Authority:** Draft content, schedule posts, compile engagement reports
**Approval gate:** All posts require owner review for first 30 days, then standing approval
**Trigger:** Weekly cycle (Monday review → mid-week drafts → Friday brief)

### Weekly cycle

- **Monday:** Review platform metrics and audience engagement
- **Tuesday-Thursday:** Draft social posts, create blog content
- **Friday:** Compile weekly marketing brief → deliver to owner

### Content rules

- Voice must match the brand (see SOUL.md or brand voice guide)
- Never identify as AI in public-facing content
- Include metrics when available
- Focus on value to audience, not self-promotion
```

### 範例 2：財務營運（事件觸發）

```markdown
## Program: Financial Processing

**Authority:** Process transaction data, generate reports, send summaries
**Approval gate:** None for analysis. Recommendations require owner approval.
**Trigger:** New data file detected OR scheduled monthly cycle

### When new data arrives

1. Detect new file in designated input directory
2. Parse and categorize all transactions
3. Compare against budget targets
4. Flag: unusual items, threshold breaches, new recurring charges
5. Generate report in designated output directory
6. Deliver summary to owner via configured channel

### Escalation rules

- Single item > $500: immediate alert
- Category > budget by 20%: flag in report
- Unrecognizable transaction: ask owner for categorization
- Failed processing after 2 retries: report failure, do not guess
```

### 範例 3：監控與警報（持續進行）

```markdown
## Program: System Monitoring

**Authority:** Check system health, restart services, send alerts
**Approval gate:** Restart services automatically. Escalate if restart fails twice.
**Trigger:** Every heartbeat cycle

### Checks

- Service health endpoints responding
- Disk space above threshold
- Pending tasks not stale (>24 hours)
- Delivery channels operational

### Response matrix

| Condition        | Action                   | Escalate?                |
| ---------------- | ------------------------ | ------------------------ |
| Service down     | Restart automatically    | Only if restart fails 2x |
| Disk space < 10% | Alert owner              | Yes                      |
| Stale task > 24h | Remind owner             | No                       |
| Channel offline  | Log and retry next cycle | If offline > 2 hours     |
```

## 執行-驗證-回報模式

常駐指令若結合嚴格的執行紀律，效果最佳。常駐指令中的每個任務都應遵循此循環：

1. **執行** —— 執行實際工作（不要只是確認指令）
2. **驗證** —— 確認結果正確（檔案存在、訊息已送出、資料已解析）
3. **報告** —— 告知擁有者執行了什麼以及驗證了什麼

```markdown
### Execution rules

- Every task follows Execute-Verify-Report. No exceptions.
- "I'll do that" is not execution. Do it, then report.
- "Done" without verification is not acceptable. Prove it.
- If execution fails: retry once with adjusted approach.
- If still fails: report failure with diagnosis. Never silently fail.
- Never retry indefinitely - 3 attempts max, then escalate.
```

此模式能避免最常見的代理失敗模式：確認了任務卻未完成。

## 多程式架構

對於管理多項事務的代理，請將常駐指令組織為具有明確邊界的獨立程式：

```markdown
## Program 1: [Domain A] (Weekly)

...

## Program 2: [Domain B] (Monthly + On-Demand)

...

## Program 3: [Domain C] (As-Needed)

...

## Escalation Rules (All Programs)

- [Common escalation criteria]
- [Approval gates that apply across programs]
```

每個程式應具備：

- 自己的 **觸發頻率**（每週、每月、事件驅動、持續進行）
- 自己的 **審核閘門**（部分程式比其他程式需要更多監督）
- 明確的 **邊界**（代理應知道一個程式在哪裡結束，另一個程式從哪裡開始）

## 最佳實踐

### 應做

- 從狹小的權限開始，並隨著信任建立而擴大
- 為高風險行動定義明確的審核閘門
- 包含「不可做什麼」章節 —— 界限與權限同樣重要
- 結合 cron 排程工作以進行可靠的定時執行
- 每週審查代理日誌，以驗證常駐指令是否被遵循
- 隨著需求演進更新常規指令 —— 它們是活的文件

### 避免

- 第一天就賦予廣泛權限（「做任何你認為最好的事」）
- 省略升級規則 —— 每個程式都需要「何時停止並請求」的條款
- 假設代理人會記住口頭指示 —— 將一切寫入檔案中
- 在單一程式中混合關注點 —— 為不同領域使用分開的程式
- 忘記透過 cron 工作強制執行 —— 沒有觸發條件的常規指令只會變成建議

## 相關內容

- [Automation and tasks](/zh-Hant/automation)：一覽所有自動化機制。
- [Cron jobs](/zh-Hant/automation/cron-jobs)：常備指示的排程強制執行。
- [Hooks](/zh-Hant/automation/hooks)：用於代理程式生命週期事件的事件驅動腳本。
- [Webhooks](/zh-Hant/automation/cron-jobs#webhooks)：傳入的 HTTP 事件觸發器。
- [Agent workspace](/zh-Hant/concepts/agent-workspace)：常備指示的所在地，包括自動注入的引導檔案完整清單（`AGENTS.md`、`SOUL.md` 等）。
