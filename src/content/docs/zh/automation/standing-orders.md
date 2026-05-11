---
summary: "为自主代理程序定义永久操作权限"
read_when:
  - Setting up autonomous agent workflows that run without per-task prompting
  - Defining what the agent can do independently vs. what needs human approval
  - Structuring multi-program agents with clear boundaries and escalation rules
title: "长期指令"
---

长期指令授予您的智能体对特定程序的**永久操作权限**。与其每次都下达单独的任务指令，不如定义出具有明确范围、触发条件和升级规则的程序 —— 智能体便可在这些边界内自主执行。

这就是每周五告诉助手“发送周报”与授予长期权限的区别：“周报由你全权负责。每周五整理并发送，只有在出现问题时才上报。”

## 为何使用长期指令

**没有长期指令时：**

- 您必须为每一项任务都提示智能体
- 智能体在请求之间处于闲置状态
- 例行工作容易被遗忘或拖延
- 您成为瓶颈

**拥有长期指令时：**

- 智能体在定义的边界内自主执行
- 例行工作按计划进行，无需提示
- 您仅在例外情况和审批环节介入
- 智能体利用闲置时间高效产出

## 工作原理

长期指令在您的[智能体工作区](/zh/concepts/agent-workspace)文件中定义。推荐的做法是将其直接包含在 `AGENTS.md` 中（该文件会在每次会话中自动注入），以便智能体始终掌握这些上下文。对于较大的配置，您也可以将其放置在专用文件中（例如 `standing-orders.md`），并从 `AGENTS.md` 引用它。

每个程序指定：

1. **范围** —— 智能体被授权执行的操作
2. **触发条件** —— 何时执行（计划、事件或条件）
3. **审批关卡** —— 在采取行动前哪些事项需要人工签字确认
4. **升级规则** —— 何时停止并请求帮助

智能体通过工作区启动文件在每个会话中加载这些指令（有关自动注入文件的完整列表，请参阅[智能体工作区](/zh/concepts/agent-workspace)），并结合 [cron 作业](/zh/automation/cron-jobs) 进行基于时间的强制执行，从而据此执行任务。

<Tip>将常备指令放入 `AGENTS.md` 以确保它们在每次会话中都会被加载。工作区启动会自动注入 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md` — 但不会注入子目录中的任意文件。</Tip>

## 常备指令剖析

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
- Do not skip delivery if metrics look bad — report accurately
```

## 常备指令结合 Cron 作业

常备指令定义了代理被授权做**什么**。[Cron 作业](/zh/automation/cron-jobs) 定义了**何时**发生。它们协同工作：

```
Standing Order: "You own the daily inbox triage"
    ↓
Cron Job (8 AM daily): "Execute inbox triage per standing orders"
    ↓
Agent: Reads standing orders → executes steps → reports results
```

Cron 作业提示词应引用常备指令，而不是重复它：

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

## 示例

### 示例 1：内容和社交媒体（每周周期）

```markdown
## Program: Content & Social Media

**Authority:** Draft content, schedule posts, compile engagement reports
**Approval gate:** All posts require owner review for first 30 days, then standing approval
**Trigger:** Weekly cycle (Monday review → mid-week drafts → Friday brief)

### Weekly cycle

- **Monday:** Review platform metrics and audience engagement
- **Tuesday–Thursday:** Draft social posts, create blog content
- **Friday:** Compile weekly marketing brief → deliver to owner

### Content rules

- Voice must match the brand (see SOUL.md or brand voice guide)
- Never identify as AI in public-facing content
- Include metrics when available
- Focus on value to audience, not self-promotion
```

### 示例 2：财务运营（事件触发）

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

### 示例 3：监控和警报（持续）

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

## 执行-验证-报告模式

常备指令在与严格的执行纪律相结合时效果最佳。常备指令中的每一项任务都应遵循此循环：

1. **执行** — 执行实际工作（不仅仅是确认指令）
2. **验证** — 确认结果正确（文件存在、消息已发送、数据已解析）
3. **报告** — 告知所有者完成了什么工作以及验证了什么

```markdown
### Execution rules

- Every task follows Execute-Verify-Report. No exceptions.
- "I'll do that" is not execution. Do it, then report.
- "Done" without verification is not acceptable. Prove it.
- If execution fails: retry once with adjusted approach.
- If still fails: report failure with diagnosis. Never silently fail.
- Never retry indefinitely — 3 attempts max, then escalate.
```

此模式可防止最常见的代理失败模式：确认任务但未完成。

## 多程序架构

对于管理多个关注点的代理，请将常备指令组织为具有清晰边界的独立程序：

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

每个程序应包含：

- 其自身的**触发频率**（每周、每月、事件驱动、持续）
- 其自身的**审批关卡**（某些程序需要比其他程序更多的监督）
- 清晰的**边界**（代理应知道一个程序在哪里结束，另一个程序从哪里开始）

## 最佳实践

### 应做事项

- 从狭窄的权限开始，随着信任的建立而扩展
- 为高风险操作定义明确的审批关卡
- 包含“不可做事项”部分 —— 边界与权限同样重要
- 结合 Cron 作业以实现可靠的基于时间的执行
- 每周检查代理日志以验证常备指令是否被遵循
- 随着需求的发展更新常备指令 —— 它们是活的文档

### 避免事项

- 在第一天就给予广泛的权限（“做任何你认为最好的事情”）
- 跳过升级规则——每个程序都需要一个“何时停止并询问”的条款
- 假设代理会记住口头指令——把所有内容都写在文件里
- 在单个程序中混合关注点——为不同域设置单独的程序
- 忘记用 cron 作业来执行——没有触发器的常设指令只会变成建议

## 相关内容

- [自动化和任务](/zh/automation)：一目了然的所有自动化机制。
- [Cron 作业](/zh/automation/cron-jobs)：常设指令的定时执行。
- [钩子](/zh/automation/hooks)：针对代理生命周期事件的事件驱动脚本。
- [Webhook](/zh/automation/cron-jobs#webhooks)：入站 HTTP 事件触发器。
- [代理工作区](/zh/concepts/agent-workspace)：常设指令的存放位置，包括自动注入的引导文件的完整列表（`AGENTS.md`、`SOUL.md` 等）。
