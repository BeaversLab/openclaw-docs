---
summary: "為自主代理程式定義永久運作權限"
read_when:
  - Setting up autonomous agent workflows that run without per-task prompting
  - Defining what the agent can do independently vs. what needs human approval
  - Structuring multi-program agents with clear boundaries and escalation rules
title: "常駐指令"
---

# 常駐指令

常駐指令授予您的代理程式針對特定程式的**永久運作權限**。與其每次都下達個別任務指令，不如定義範圍明確的程式、觸發條件和升級規則 — 讓代理程式在這些範圍內自主執行。

這就是每週五告訴您的助理「發送週報」與授予常駐權限之間的區別：「你是週報的負責人。每週五彙整、發送，並且只有在看起來有異常時才升級回報。」

## 為什麼需要常駐指令？

**沒有常駐指令：**

- 您必須為每個任務對代理程式發出提示
- 代理程式在請求之間處於閒置狀態
- 例行工作被遺忘或延遲
- 您成為了瓶頸

**有了常駐指令：**

- 代理程式在定義的範圍內自主執行
- 例行工作按計畫進行，無需提示
- 您僅需介入處理異常和審批
- 代理程式能夠有效地利用閒置時間

## 運作方式

常駐指令定義在您的[代理程式工作區](/en/concepts/agent-workspace)檔案中。建議的做法是直接將其包含在 `AGENTS.md` 中（每個階段會自動注入），以便代理程式始終掌握這些內容。對於較大的配置，您也可以將其放置在專用檔案（如 `standing-orders.md`）中，並從 `AGENTS.md` 引用它。

每個程式指定：

1. **範圍** — 代理程式獲授權執行的內容
2. **觸發條件** — 何時執行（時間表、事件或條件）
3. **審批閘門** — 採取行動前需要哪些人類簽核
4. **升級規則** — 何時停止並尋求協助

代理程式會透過工作區引導檔案在每個階段載入這些指令（有關自動注入檔案的完整列表，請參閱 [Agent Workspace](/en/concepts/agent-workspace)），並結合 [cron jobs](/en/automation/cron-jobs) 進行基於時間的強制執行。

<Tip>將常備指令置於 `AGENTS.md` 以確保每個工作階段都會載入它們。工作區啟動程序會自動注入 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md` —— 但不會包含子目錄中的任意檔案。</Tip>

## 常駐指令剖析

```markdown
## Program: Weekly Status Report

**Authority:** Compile data, generate report, deliver to stakeholders
**Trigger:** Every Friday at 4 PM (enforced via cron job)
**Approval gate:** None for standard reports. Flag anomalies for human review.
**Escalation:** If data source is unavailable or metrics look unusual (>2σ from norm)

### Execution Steps

1. Pull metrics from configured sources
2. Compare to prior week and targets
3. Generate report in Reports/weekly/YYYY-MM-DD.md
4. Deliver summary via configured channel
5. Log completion to Agent/Logs/

### What NOT to Do

- Do not send reports to external parties
- Do not modify source data
- Do not skip delivery if metrics look bad — report accurately
```

## 常駐指令 + Cron 作業

常駐指令定義了代理被授權執行 **什麼**。[Cron 作業](/en/automation/cron-jobs) 則定義了發生的 **時間**。它們協同運作：

```
Standing Order: "You own the daily inbox triage"
    ↓
Cron Job (8 AM daily): "Execute inbox triage per standing orders"
    ↓
Agent: Reads standing orders → executes steps → reports results
```

Cron 作業提示應引用常駐指令，而不是重複它：

```bash
openclaw cron add \
  --name daily-inbox-triage \
  --cron "0 8 * * 1-5" \
  --tz America/New_York \
  --timeout-seconds 300 \
  --announce \
  --channel bluebubbles \
  --to "+1XXXXXXXXXX" \
  --message "Execute daily inbox triage per standing orders. Check mail for new alerts. Parse, categorize, and persist each item. Report summary to owner. Escalate unknowns."
```

## 範例

### 範例 1：內容與社群媒體（每週循環）

```markdown
## Program: Content & Social Media

**Authority:** Draft content, schedule posts, compile engagement reports
**Approval gate:** All posts require owner review for first 30 days, then standing approval
**Trigger:** Weekly cycle (Monday review → mid-week drafts → Friday brief)

### Weekly Cycle

- **Monday:** Review platform metrics and audience engagement
- **Tuesday–Thursday:** Draft social posts, create blog content
- **Friday:** Compile weekly marketing brief → deliver to owner

### Content Rules

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

### When New Data Arrives

1. Detect new file in designated input directory
2. Parse and categorize all transactions
3. Compare against budget targets
4. Flag: unusual items, threshold breaches, new recurring charges
5. Generate report in designated output directory
6. Deliver summary to owner via configured channel

### Escalation Rules

- Single item > $500: immediate alert
- Category > budget by 20%: flag in report
- Unrecognizable transaction: ask owner for categorization
- Failed processing after 2 retries: report failure, do not guess
```

### 範例 3：監控與警示（持續性）

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

### Response Matrix

| Condition        | Action                   | Escalate?                |
| ---------------- | ------------------------ | ------------------------ |
| Service down     | Restart automatically    | Only if restart fails 2x |
| Disk space < 10% | Alert owner              | Yes                      |
| Stale task > 24h | Remind owner             | No                       |
| Channel offline  | Log and retry next cycle | If offline > 2 hours     |
```

## 執行-驗證-報告模式

常駐指令在結合嚴格的執行紀律時效果最佳。常駐指令中的每個任務都應遵循此循環：

1. **執行** — 執行實際工作（不要只是確認收到指令）
2. **驗證** — 確認結果正確（檔案存在、訊息已傳送、資料已解析）
3. **報告** — 告訴所有者做了什麼以及驗證了什麼

```markdown
### Execution Rules

- Every task follows Execute-Verify-Report. No exceptions.
- "I'll do that" is not execution. Do it, then report.
- "Done" without verification is not acceptable. Prove it.
- If execution fails: retry once with adjusted approach.
- If still fails: report failure with diagnosis. Never silently fail.
- Never retry indefinitely — 3 attempts max, then escalate.
```

此模式可防止代理程式最常見的失敗模式：確認任務但未完成它。

## 多程式架構

對於管理多項事務的代理程式，請將常駐指令組織為具有明確邊界的獨立程式：

```markdown
# Standing Orders

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

每個程式應該具備：

- 屬於自己的 **觸發節奏**（每週、每月、事件驅動、持續性）
- 屬於自己的 **審批閘門**（某些程式比其他程式需要更多監督）
- 明確的**邊界**（代理應該知道一個程式結束和另一個程式開始的地方）

## 最佳實踐

### 應做

- 從狹窄的權限開始，並隨著信任的建立而擴展
- 為高風險操作定義明確的審批閘門
- 包含「不要做什麼」的部分——邊界與許可權同等重要
- 結合 cron 作業以進行可靠的基於時間的執行
- 每週審查代理日誌以驗證是否遵守常駐指令
- 隨著需求的發展更新常駐指令——它們是活文件

### 避免

- 第一天就賦予廣泛權限（「做任何你認為最好的事」）
- 跳過升級規則 —— 每個程式都需要一個「何時停止並請示」的條款
- 假設代理會記住口頭指示 —— 將所有內容寫入檔案中
- 在單一程式中混合關注點 —— 將不同領域分開為不同程式
- 忘記使用 cron 工作來執行 —— 沒有觸發條件的常駐命令只是建議

## 相關

- [Automation & Tasks](/en/automation) — 所有自動化機制一覽
- [Cron Jobs](/en/automation/cron-jobs) — 常規任務的排程強制執行
- [Hooks](/en/automation/hooks) — 代理生命週期事件的事件驅動腳本
- [Webhooks](/en/automation/cron-jobs#webhooks) — 傳入 HTTP 事件觸發程序
- [Agent Workspace](/en/concepts/agent-workspace) — 常規任務的存放位置，包括自動注入的引導檔案完整列表（AGENTS.md、SOUL.md 等）
