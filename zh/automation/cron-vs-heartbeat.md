---
summary: "关于在自动化中选择心跳（heartbeat）还是定时任务（cron job）的指导"
read_when:
  - Deciding how to schedule recurring tasks
  - Setting up background monitoring or notifications
  - Optimizing token usage for periodic checks
title: "Cron vs Heartbeat"
---

# Cron vs Heartbeat：何时使用哪种

心跳和定时任务都可以让您按计划运行任务。本指南可帮助您为您的用例选择合适的机制。

## 快速决策指南

| 用例                             | 推荐方式           | 原因                                      |
| ------------------------------------ | ------------------- | ---------------------------------------- |
| 每 30 分钟检查一次收件箱             | Heartbeat           | 与其他检查合并，具有上下文感知能力             |
| 上午 9 点准时发送每日报告       | Cron (isolated)     | 需要精确的时间                              |
| 监控日历以获取即将发生的事件 | Heartbeat           | 适合定期感知                               |
| 运行每周深度分析             | Cron (isolated)     | 独立任务，可以使用不同的模型                   |
| 20 分钟后提醒我              | Cron (main, `--at`) | 具有精确计时的一次性任务                      |
| 后台项目健康检查      | Heartbeat           | 搭载在现有周期上                             |

## Heartbeat：周期性感知

心跳以固定间隔（默认：30 分钟）在**主会话（main session）**中运行。它们旨在让代理检查各项内容并提示任何重要事项。

### 何时使用心跳

- **多项周期性检查**：无需 5 个单独的 cron 作业分别检查收件箱、日历、天气、通知和项目状态，单个心跳就可以将所有这些检查批量处理。
- **上下文感知的决策**：代理拥有完整的主会话上下文，因此它可以就什么是紧急的、什么可以等待做出明智的决定。
- **对话连续性**：心跳运行共享同一个会话，因此代理会记住最近的对话，并且可以自然地进行跟进。
- **低开销监控**：一个心跳可以替代许多小的轮询任务。

### Heartbeat 的优势

- **批量处理检查**：单次代理回合即可同时审查收件箱、日历和通知。
- **减少 API 调用**：单个心跳比 5 个独立的 cron 作业成本更低。
- **上下文感知**：代理知道您一直在处理的工作，并可以相应地确定优先级。
- **智能抑制**：如果不需要关注，代理回复 `HEARTBEAT_OK` 且不传递任何消息。
- **自然计时**：根据队列负载略有漂移，这对于大多数监控来说是可以接受的。

### 心跳示例：HEARTBEAT.md 检查清单

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

代理在每次心跳时读取此内容，并在一个回合中处理所有项目。

### 配置心跳

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

有关完整配置，请参阅 [Heartbeat](/zh/en/gateway/heartbeat)。

## Cron：精确调度

Cron 作业在精确时间运行，并且可以在不影响主要上下文的情况下在独立会话中运行。
循环的整点调度会自动通过确定性的逐作业偏移量在 0-5 分钟的时间窗口内分散。

### 何时使用 cron

- **需要精确计时**：“每周一上午 9:00 发送此消息”（而不是“9 点左右”）。
- **独立任务**：不需要对话上下文的任务。
- **不同的模型/思考**：值得使用更强大模型进行的大量分析。
- **一次性提醒**：使用 `--at` “在 20 分钟后提醒我”。
- **嘈杂/频繁的任务**：可能会弄乱主会话记录的任务。
- **外部触发器**：应独立于代理是否处于其他活动状态而运行的任务。

### Cron 优势

- **精确计时**：支持时区的 5 字段或 6 字段（秒）cron 表达式。
- **内置负载分散**：循环的整点调度默认错开最多 5 分钟。
- **逐作业控制**：使用 `--stagger <duration>` 覆盖错开，或使用 `--exact` 强制精确计时。
- **会话隔离**：在 `cron:<jobId>` 中运行，不会污染主记录。
- **模型覆盖**：每个作业使用更便宜或更强大的模型。
- **传递控制**：隔离任务默认为 `announce`（摘要）；根据需要选择 `none`。
- **即时传递**：公告模式直接发布，无需等待心跳。
- **无需代理上下文**：即使主会话空闲或已压缩也能运行。
- **一次性支持**：`--at` 用于精确的未来时间戳。

### Cron 示例：每日晨报

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

此任务恰好在纽约时间上午 7:00 运行，使用 Opus 以确保质量，并将摘要直接发送到 WhatsApp。

### Cron 示例：一次性提醒

```bash
openclaw cron add \
  --name "Meeting reminder" \
  --at "20m" \
  --session main \
  --system-event "Reminder: standup meeting starts in 10 minutes." \
  --wake now \
  --delete-after-run
```

有关完整的 CLI 参考，请参阅 [Cron 作业](/zh/en/automation/cron-jobs)。

## 决策流程图

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

## 结合两者使用

最高效的设置是**结合两者**：

1. **心跳**每 30 分钟在一个批次回合中处理例行监控（收件箱、日历、通知）。
2. **Cron** 处理精确的计划（每日报告、每周回顾）和一次性提醒。

### 示例：高效自动化设置

**HEARTBEAT.md**（每 30 分钟检查一次）：

```md
# Heartbeat checklist

- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Cron 作业**（精确计时）：

```bash
# Daily morning briefing at 7am
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce

# Weekly project review on Mondays at 9am
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster：带审批的确定性工作流

Lobster 是用于**多步骤工具管道**的工作流运行时，需要确定性执行和明确审批。
当任务不仅仅是单一代理回合，并且您希望具有人工检查点的可恢复工作流时，请使用它。

### Lobster 适用场景

- **多步骤自动化**：您需要固定的工具调用管道，而不是一次性提示。
- **审批闸门**：副作用应暂停，直到您批准，然后恢复。
- **可恢复运行**：继续暂停的工作流而无需重新运行先前的步骤。

### 如何与心跳和 cron 配合使用

- **心跳/cron** 决定运行_何时_发生。
- **Lobster** 定义运行开始后发生_哪些步骤_。

对于计划工作流，使用 cron 或 heartbeat 触发调用 Lobster 的代理回合。
对于临时工作流，直接调用 Lobster。

### 操作说明（来自代码）

- Lobster 在工具模式下作为**本地子进程**（`lobster` CLI）运行，并返回一个 **JSON 信封**。
- 如果工具返回 `needs_approval`，您可以使用 `resumeToken` 和 `approve` 标志恢复。
- 该工具是一个**可选插件**；建议通过 `tools.alsoAllow: ["lobster"]` 附加启用。
- Lobster 期望 `PATH` 上有 `lobster` CLI 可用。

有关完整用法和示例，请参阅 [Lobster](/zh/en/tools/lobster)。

## 主会话与隔离会话

心跳和 cron 都可以与主会话交互，但方式不同：

|         | Heartbeat                       | Cron (main)              | Cron (isolated)            |
| ------- | ------------------------------- | ------------------------ | -------------------------- |
| Session | Main                            | Main (via system event)  | `cron:<jobId>`             |
| History | Shared                          | Shared                   | Fresh each run             |
| Context | Full                            | Full                     | None (starts clean)        |
| Model   | Main session model              | Main session model       | Can override               |
| Output  | Delivered if not `HEARTBEAT_OK` | Heartbeat prompt + event | Announce summary (default) |

### 何时使用主会话 cron

当您想要以下内容时，请使用带有 `--system-event` 的 `--session main`：

- 提醒/事件出现在主会话上下文中
- 代理在下一个心跳期间使用完整的上下文来处理它
- 没有单独的隔离运行

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何时使用隔离 cron

当您想要以下内容时，请使用 `--session isolated`：

- 没有先前上下文的全新开始
- 不同的模型或思考设置
- 直接将摘要宣布到频道
- 不会弄乱主会话的历史记录

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

| 机制       | 成本概况                                            |
| --------------- | ------------------------------------------------------- |
| Heartbeat       | 每 N 分钟一个轮次；随 HEARTBEAT.md 大小扩展 |
| Cron (main)     | 将事件添加到下一次心跳（无独立轮次）         |
| Cron (isolated) | 每个作业一个完整的代理轮次；可使用更便宜的模型          |

**提示**：

- 保持 `HEARTBEAT.md` 较小以最小化 Token 开销。
- 将类似的检查合并到心跳中，而不是使用多个 Cron 作业。
- 如果您只需要内部处理，请在心跳上使用 `target: "none"`。
- 对于例行任务，使用带有更便宜模型的独立 Cron。

## 相关

- [Heartbeat](/zh/en/gateway/heartbeat) - 完整的心跳配置
- [Cron jobs](/zh/en/automation/cron-jobs) - 完整的 Cron CLI 和 API 参考
- [System](/zh/en/cli/system) - 系统事件 + 心跳控制

import zh from '/components/footer/zh.mdx';

<zh />
