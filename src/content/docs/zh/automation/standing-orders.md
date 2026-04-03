---
summary: "为自主代理程序定义永久操作权限"
read_when:
  - Setting up autonomous agent workflows that run without per-task prompting
  - Defining what the agent can do independently vs. what needs human approval
  - Structuring multi-program agents with clear boundaries and escalation rules
title: "常备指令"
---

# 常备指令

常备指令授予您的代理针对定义程序的**永久操作权限**。无需每次都给出单独的任务指令，您可以定义具有明确范围、触发器和升级规则的程序 —— 代理在这些边界内自主执行。

这就是每周五告诉助理“发送周报”与授予常备权限的区别：“你负责周报。每周五汇编并发送，只有当出现问题时才升级处理。”

## 为什么需要常备指令？

**没有常备指令：**

- 您必须针对每项任务提示代理
- 代理在请求之间处于空闲状态
- 例行工作会被遗忘或延迟
- 您成为瓶颈

**拥有常备指令：**

- 代理在定义的边界内自主执行
- 例行工作按计划进行，无需提示
- 您只需参与异常处理和审批
- 代理有效地利用空闲时间

## 工作原理

常备指令在您的[代理工作区](/en/concepts/agent-workspace)文件中定义。推荐的方法是将其直接包含在 `AGENTS.md` 中（每次会话都会自动注入），以便代理始终掌握上下文。对于较大的配置，您也可以将其放置在专用文件（如 `standing-orders.md`）中，并从 `AGENTS.md` 中引用。

每个程序指定：

1. **范围** —— 代理被授权执行的操作
2. **触发器** —— 何时执行（计划、事件或条件）
3. **审批关口** —— 操作前需要人工签署的内容
4. **升级规则** —— 何时停止并寻求帮助

代理通过工作区引导文件在每个会话中加载这些指令（有关自动注入文件的完整列表，请参阅 [代理工作区](/en/concepts/agent-workspace)），并结合 [cron 作业](/en/automation/cron-jobs) 执行基于时间的强制执行。

<Tip>将常备指令放入 `AGENTS.md` 以确保它们在每个会话中都被加载。工作区启动程序会自动注入 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`、`BOOTSTRAP.md` 和 `MEMORY.md` —— 但不会注入子目录中的任意文件。</Tip>

## 常驻指令剖析

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

## 常驻指令 + Cron 作业

常驻指令定义了代理被授权做**什么**。[Cron 作业](/en/automation/cron-jobs) 定义了**何时**执行。它们协同工作：

```
Standing Order: "You own the daily inbox triage"
    ↓
Cron Job (8 AM daily): "Execute inbox triage per standing orders"
    ↓
Agent: Reads standing orders → executes steps → reports results
```

Cron 作业提示词应引用常驻指令，而不是重复它：

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

### 示例 1：内容与社交媒体（每周循环）

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

### 示例 2：财务运营（事件触发）

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

### 示例 3：监控与警报（持续）

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

## 执行-验证-报告模式

常驻指令在与严格的执行纪律相结合时效果最佳。常驻指令中的每个任务都应遵循此循环：

1. **执行** — 做实际的工作（不要只是确认收到指令）
2. **验证** — 确认结果正确（文件存在、消息已发送、数据已解析）
3. **报告** — 告知所有者做了什么以及验证了什么

```markdown
### Execution Rules

- Every task follows Execute-Verify-Report. No exceptions.
- "I'll do that" is not execution. Do it, then report.
- "Done" without verification is not acceptable. Prove it.
- If execution fails: retry once with adjusted approach.
- If still fails: report failure with diagnosis. Never silently fail.
- Never retry indefinitely — 3 attempts max, then escalate.
```

此模式可以防止最常见的代理故障模式：确认任务但未完成。

## 多程序架构

对于管理多项事务的代理，请将常驻指令组织为具有明确边界的独立程序：

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

每个程序应具有：

- 其自身的**触发频率**（每周、每月、事件驱动、持续）
- 其自身的**审批关卡**（某些程序需要比其他程序更多的监督）
- 清晰的**边界**（代理应知道一个程序在哪里结束，另一个程序在哪里开始）

## 最佳实践

### 要做的

- 从狭窄的权限开始，随着信任的建立逐步扩大
- 为高风险操作定义明确的审批关卡
- 包含“禁止做什么”的部分 —— 边界与权限同样重要
- 结合 Cron 作业以实现可靠的基于时间的执行
- 每周审查代理日志，以验证常驻指令得到遵守
- 随着需求的发展更新常驻指令 —— 它们是活的文档

### 避免

- 第一天就授予广泛的权限（“做任何你认为最好的事情”）
- 跳过升级规则——每个程序都需要一个“何时停止并询问”的条款
- 假设代理会记住口头指令——把所有内容都写进文件里
- 在单个程序中混合关注点——为不同领域分离程序
- 忘记使用 cron 作业强制执行——没有触发器的长期命令只是建议

## 相关

- [自动化概览](/en/automation) — 一目了然的所有自动化机制
- [Cron 作业](/en/automation/cron-jobs) — 常规指令的调度执行
- [钩子](/en/automation/hooks) — 用于代理生命周期事件的事件驱动脚本
- [Webhooks](/en/automation/webhook) — 入站 HTTP 事件触发器
- [代理工作区](/en/concepts/agent-workspace) — 常规指令的存放位置，包括自动注入的引导文件（AGENTS.md、SOUL.md 等）的完整列表
