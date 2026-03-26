---
summary: "关于在自动化中选择心跳还是定时任务的指导"
read_when:
  - Deciding how to schedule recurring tasks
  - Setting up background monitoring or notifications
  - Optimizing token usage for periodic checks
title: "定时任务 vs 心跳"
---

# Cron vs Heartbeat：何时使用哪种

心跳和定时任务都可以让您按计划运行任务。本指南可帮助您为您的用例选择合适的机制。

## 快速决策指南

| 使用场景                   | 推荐方式           | 原因                           |
| -------------------------- | ------------------ | ------------------------------ |
| 每 30 分钟检查一次收件箱   | Heartbeat          | 与其他检查批量处理，感知上下文 |
| 上午 9 点准时发送日报      | Cron（独立）       | 需要精确的时间                 |
| 监控日历中的即将发生的事件 | Heartbeat          | 适合周期性感知                 |
| 运行每周深度分析           | Cron（独立）       | 独立任务，可以使用不同的模型   |
| 20 分钟后提醒我            | Cron（主，`--at`） | 具有精确时间的单次执行         |
| 后台项目健康检查           | Heartbeat          | 利用现有周期                   |

## Heartbeat：周期性感知

Heartbeat 以固定间隔（默认：30 分钟）在**主会话**中运行。它们旨在让代理检查各项事务并展示任何重要信息。

### 何时使用 heartbeat

- **多项周期性检查**：与其用 5 个独立的 cron 作业分别检查收件箱、日历、天气、通知和项目状态，不如用一个 heartbeat 将所有这些批量处理。
- **感知上下文的决策**：代理拥有完整的主会话上下文，因此它可以就哪些事项紧急、哪些可以等待做出明智决策。
- **对话连续性**：Heartbeat 运行共享同一个会话，因此代理会记住最近的对话，并可以自然地进行后续跟进。
- **低开销监控**：一个 heartbeat 可以替代许多小的轮询任务。

### Heartbeat 的优势

- **批量处理多项检查**：代理的一个回合可以一起查看收件箱、日历和通知。
- **减少 API 调用**：单次心跳比 5 个独立的 cron 作业更便宜。
- **感知上下文**：代理知道你一直在做什么，并可以据此确定优先级。
- **智能抑制**：如果不需要关注任何内容，代理会回复 `HEARTBEAT_OK` 且不会传递任何消息。
- **自然时序**：根据队列负载轻微漂移，这对于大多数监控来说是可以接受的。

### Heartbeat 示例：HEARTBEAT.md 清单

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

代理会在每次 heartbeat 时阅读此内容，并在一个回合中处理所有项目。

### 配置 heartbeat

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

有关完整配置，请参阅 [Heartbeat](/zh/gateway/heartbeat)。

## Cron：精确调度

Cron 作业在精确的时间运行，并且可以在独立的会话中运行，而不会影响主上下文。
循环的整点时间表会通过确定性的
每个作业的偏移量，在 0-5 分钟的窗口内自动分散。

### 何时使用 cron

- **需要精确计时**：“在每周一上午 9:00 发送此内容”（而不是“9点左右”）。
- **独立任务**：不需要对话上下文的任务。
- **不同的模型/思考**：值得使用更强大模型进行的大量分析。
- **一次性提醒**：使用 `--at` “在20分钟后提醒我”。
- **嘈杂/频繁的任务**：会扰乱主会话历史的任务。
- **外部触发**：无论代理是否处于其他活动状态都应运行的任务。

### Cron 的优势

- **精确计时**：支持时区的5字段或6字段（秒）cron 表达式。
- **内置负载均衡**：循环的整点时间表默认会错开最多 5 分钟。
- **每个作业的控制**：使用 `--stagger <duration>` 覆盖错开设置，或使用 `--exact` 强制精确计时。
- **会话隔离**：在 `cron:<jobId>` 中运行，不会污染主历史记录。
- **模型覆盖**：每个作业使用更便宜或更强大的模型。
- **传递控制**：隔离的作业默认为 `announce`（摘要）；根据需要选择 `none`。
- **立即传递**：公告模式直接发布，无需等待心跳。
- **不需要代理上下文**：即使主会话处于空闲或压缩状态也会运行。
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

这在纽约时间上午 7:00 准确运行，使用 Opus 保证质量，并直接向 WhatsApp 宣布摘要。

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

有关完整的 CLI 参考，请参阅 [Cron 作业](/zh/automation/cron-jobs)。

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

## 结合使用两者

最高效的设置是**结合使用两者**：

1. **Heartbeat** 在每 30 分钟的一次批量轮次中处理常规监控（收件箱、日历、通知）。
2. **Cron** 处理精确的计划（每日报告、每周审查）和一次性提醒。

### 示例：高效的自动化设置

**HEARTBEAT.md**（每 30 分钟检查一次）：

```md
# Heartbeat checklist

- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Cron jobs**（精确计时）：

```bash
# Daily morning briefing at 7am
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce

# Weekly project review on Mondays at 9am
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster：具有审批权限的确定性工作流

Lobster 是需要确定性执行和明确审批的**多步骤工具管道**的工作流运行时。
当任务不仅仅是单次代理轮次，并且您希望获得具有人工检查点的可恢复工作流时，请使用它。

### 当 Lobster 适用时

- **多步骤自动化**：您需要一个固定的工具调用管道，而不是一次性的提示。
- **审批关卡**：副作用应暂停直到您批准，然后恢复。
- **可恢复运行**：继续暂停的工作流而无需重新运行之前的步骤。

### 它如何与 heartbeat 和 cron 配合使用

- **Heartbeat/cron** 决定运行发生的*时间*。
- **Lobster** 定义了运行开始后发生的步骤。

对于计划的工作流，使用 cron 或 heartbeat 触发调用 Lobster 的代理轮次。
对于临时工作流，直接调用 Lobster。

### 操作说明（来自代码）

- Lobster 作为 **本地子进程**（`lobster` CLI）在工具模式下运行，并返回 **JSON 信封**。
- 如果工具返回 `needs_approval`，您将使用 `resumeToken` 和 `approve` 标志继续。
- 该工具是一个**可选插件**；建议通过 `tools.alsoAllow: ["lobster"]` 以叠加方式启用它（推荐）。
- Lobster 期望 `PATH` 上有可用的 `lobster` CLI。

有关完整用法和示例，请参阅 [Lobster](/zh/tools/lobster)。

## 主会话与隔离会话

Heartbeat 和 cron 都可以与主会话交互，但方式不同：

|          | Heartbeat                      | Cron（主）         | Cron（隔离）                         |
| -------- | ------------------------------ | ------------------ | ------------------------------------ |
| 会话     | 主                             | 主（通过系统事件） | `cron:<jobId>` 或自定义会话          |
| 历史记录 | 共享                           | 共享               | 每次运行全新（隔离）/ 持久（自定义） |
| 上下文   | 完整                           | 完整               | 无（隔离）/ 累积（自定义）           |
| 模型     | 主会话模型                     | 主会话模型         | 可覆盖                               |
| 输出     | 如果未被 `HEARTBEAT_OK` 则传送 | 心跳提示词 + 事件  | 公告摘要（默认）                     |

### 何时使用主会话定时任务

当您想要以下内容时，请将 `--session main` 与 `--system-event` 配合使用：

- 提醒/事件出现在主会话上下文中
- 代理在下次心跳时利用完整上下文对其进行处理
- 无需单独的隔离运行

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何时使用隔离定时任务

当您想要以下内容时，请使用 `--session isolated`：

- 没有先前上下文的全新开始
- 不同的模型或思考设置
- 将摘要直接公告到渠道
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

| 机制             | 成本概况                                     |
| ---------------- | -------------------------------------------- |
| 心跳             | 每 N 分钟一轮；随 HEARTBEAT.md 大小缩放      |
| 定时任务（主）   | 将事件添加到下一次心跳（无隔离轮次）         |
| 定时任务（隔离） | 每个作业完整的代理轮次；可以使用更便宜的模型 |

**提示**：

- 保持 `HEARTBEAT.md` 较小以最小化 token 开销。
- 将类似的检查批量处理到心跳中，而不是使用多个定时任务。
- 如果您只需要内部处理，请在心跳上使用 `target: "none"`。
- 对于例行任务，使用隔离定时任务配合更便宜的模型。

## 相关

- [心跳](/zh/gateway/heartbeat) - 完整的心跳配置
- [Cron 作业](/zh/automation/cron-jobs) - 完整的 cron CLI 和 API 参考
- [系统](/zh/cli/system) - 系统事件 + 心跳控制

import zh from "/components/footer/zh.mdx";

<zh />
