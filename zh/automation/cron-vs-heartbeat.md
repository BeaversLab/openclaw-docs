---
summary: "关于在自动化中选择心跳还是定时任务的指导"
read_when:
  - 决定如何安排周期性任务
  - 设置后台监控或通知
  - 优化定期检查的令牌使用
title: "Cron vs Heartbeat"
---

# Cron 与 Heartbeat：何时使用哪种

心跳和定时作业都允许您按计划运行任务。本指南可帮助您为您的用例选择合适的机制。

## 快速决策指南

| 用例                             | 推荐         | 原因                                      |
| ------------------------------------ | ------------------- | ---------------------------------------- |
| 每 30 分钟检查一次收件箱             | Heartbeat           | 与其他检查批量处理，具有上下文感知能力 |
| 在上午 9 点整发送日报       | Cron（隔离）     | 需要精确的时间                      |
| 监控日历以获取即将到来的事件 | Heartbeat           | 自然适合定期感知       |
| 运行每周深度分析             | Cron（隔离）     | 独立任务，可以使用不同的模型 |
| 在 20 分钟后提醒我              | Cron（主，`--at`） | 一次性定时任务             |
| 后台项目健康检查      | Heartbeat           | 搭载现有周期             |

## Heartbeat：定期感知

心跳在 **主会话** 中以固定间隔（默认：30 分钟）运行。它们旨在让智能体检查各项事务并凸显任何重要事项。

### 何时使用心跳

- **多项定期检查**：与其使用 5 个独立的定时作业来检查收件箱、日历、天气、通知和项目状态，不如使用单个心跳批量处理所有这些检查。
- **上下文感知的决策**：智能体拥有完整的主会话上下文，因此它可以就什么是紧急的、什么可以等待做出明智的决定。
- **对话连续性**：心跳运行共享同一个会话，因此智能体记得最近的对话，可以自然地进行后续跟进。
- **低开销监控**：一个心跳可以替代许多小型轮询任务。

### 心跳的优势

- **批量处理多项检查**：智能体的一次轮转可以一起审查收件箱、日历和通知。
- **减少 API 调用**：单个心跳比 5 个独立的定时作业更便宜。
- **上下文感知**：智能体知道您一直在处理什么，并可以相应地确定优先级。
- **智能抑制**：如果不需要关注任何事项，智能体会回复 `HEARTBEAT_OK` 且不会发送任何消息。
- **自然的时间安排**：根据队列负载略有漂移，这对于大多数监控来说是可以接受的。

### Heartbeat 示例：HEARTBEAT.md 检查清单

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

代理会在每次心跳时读取此内容，并在一轮中处理所有项目。

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

有关完整配置，请参阅 [Heartbeat](/zh/gateway/heartbeat)。

## Cron：精确调度

Cron 作业在精确的时间运行，并且可以在独立的会话中运行，而不会影响主上下文。
周期性的整点调度会通过每个作业确定性的偏移量在 0-5 分钟的时间窗口内自动分散。

### 何时使用 cron

- **需要精确计时**：“在每个周一上午 9:00 发送此消息”（而不是“9点左右”）。
- **独立任务**：不需要对话上下文的任务。
- **不同的模型/思考**：值得使用更强大的模型进行繁重的分析。
- **一次性提醒**：使用 `--at` “在 20 分钟后提醒我”。
- **嘈杂/频繁的任务**：会弄乱主会话历史的任务。
- **外部触发器**：无论代理是否处于其他活动状态都应运行的任务。

### Cron 优势

- **精确计时**：支持时区的 5 字段或 6 字段（秒）cron 表达式。
- **内置负载分散**：周期性的整点调度默认会错开最多 5 分钟。
- **逐作业控制**：使用 `--stagger <duration>` 覆盖错开设置，或使用 `--exact` 强制精确计时。
- **会话隔离**：在 `cron:<jobId>` 中运行，不会污染主历史记录。
- **模型覆盖**：针对每个作业使用更便宜或更强大的模型。
- **交付控制**：隔离的作业默认为 `announce`（摘要）；根据需要选择 `none`。
- **立即交付**：Announce 模式直接发布，无需等待心跳。
- **无需代理上下文**：即使主会话处于空闲或压缩状态也能运行。
- **一次性支持**：`--at` 用于精确的未来时间戳。

### Cron 示例：每日晨间简报

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

此任务在纽约时间上午 7:00 准确运行，使用 Opus 以保证质量，并将摘要直接发布到 WhatsApp。

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

有关完整的 CLI 参考，请参阅 [Cron jobs](/zh/automation/cron-jobs)。

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

最高效的设置是**结合两者**使用：

1. **Heartbeat** 在每 30 分钟的一次批量轮次中处理例行监控（收件箱、日历、通知）。
2. **Cron** 处理精确的时间表（每日报告、每周回顾）和一次性提醒。

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

## Lobster：带有审批的确定性工作流

Lobster 是需要确定性执行和显式审批的 **多步骤工具管道** 的工作流运行时。
当任务不仅仅是单次智能体轮次，并且您希望拥有带有人类检查点的可恢复工作流时，请使用它。

### 何时适合 Lobster

- **多步骤自动化**：您需要固定的工具调用管道，而不是一次性的提示。
- **审批门禁**：副作用应暂停，直到您批准，然后恢复。
- **可恢复运行**：继续暂停的工作流而无需重新运行之前的步骤。

### 如何与 heartbeat 和 cron 配合使用

- **Heartbeat/cron** 决定运行 _何时_ 发生。
- **Lobster** 定义一旦运行开始 _发生哪些步骤_。

对于计划工作流，请使用 cron 或 heartbeat 触发调用 Lobster 的智能体轮次。
对于临时工作流，请直接调用 Lobster。

### 操作说明（来自代码）

- Lobster 以工具模式作为 **本地子进程**（`lobster` CLI）运行，并返回 **JSON 信封**。
- 如果工具返回 `needs_approval`，则使用 `resumeToken` 和 `approve` 标志恢复。
- 该工具是一个 **可选插件**；建议通过 `tools.alsoAllow: ["lobster"]` 以叠加方式启用。
- Lobster 期望 `lobster` CLI 在 `PATH` 上可用。

有关完整用法和示例，请参阅 [Lobster](/zh/tools/lobster)。

## 主会话与独立会话

Heartbeat 和 cron 都可以与主会话交互，但方式不同：

|         | Heartbeat                       | Cron (main)              | Cron (isolated)                                 |
| ------- | ------------------------------- | ------------------------ | ----------------------------------------------- |
| 会话 | Main                            | Main (via system event)  | `cron:<jobId>` or custom 会话                |
| 历史记录 | Shared                          | Shared                   | Fresh each run (isolated) / Persistent (custom) |
| 上下文 | Full                            | Full                     | None (isolated) / Cumulative (custom)           |
| 模型   | 主会话模型              | 主会话模型       | Can override                                    |
| 输出  | Delivered if not `HEARTBEAT_OK` | Heartbeat prompt + event | 公告摘要（默认）                      |

### 何时使用主会话 cron

当您想要以下内容时，请使用 `--session main` 配合 `--system-event`：

- 提醒/事件出现在主会话上下文中
- 代理在下次心跳期间处理它，并拥有完整上下文
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
- 直接将摘要公告到渠道
- 不弄乱主会话的历史记录

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
| 心跳 (Heartbeat)       | 每 N 分钟一轮；随 HEARTBEAT.md 大小缩放 |
| Cron（主会话）     | 将事件添加到下一次心跳（无隔离轮）         |
| Cron（隔离） | 每个作业完整的代理轮；可以使用更便宜的模型          |

**提示**：

- 保持 `HEARTBEAT.md` 较小，以最大限度地减少 token 开销。
- 将相似的检查批量处理到心跳中，而不是多个 cron 作业。
- 如果您只想要内部处理，请在心跳上使用 `target: "none"`。
- 对常规任务使用带有更便宜模型的隔离 cron。

## 相关

- [心跳 (Heartbeat)](/zh/gateway/heartbeat) - 完整的心跳配置
- [Cron 作业](/zh/automation/cron-jobs) - 完整的 cron CLI 和 API 参考
- [系统](/zh/cli/system) - 系统事件 + 心跳控制

import en from "/components/footer/en.mdx";

<en />
