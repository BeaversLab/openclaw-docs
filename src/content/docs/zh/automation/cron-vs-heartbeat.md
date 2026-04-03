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

一个重要的区别：

- **Heartbeat** 是一个定时的 **主会话轮次** —— 不创建任务记录。
- **Cron (main)** 是一个进入主会话的定时 **系统事件** —— 创建一个带有 `silent` 通知策略的任务记录。
- **Cron (isolated)** 是一个定时的 **后台运行** —— 创建一个在 `openclaw tasks` 中跟踪的任务记录。

所有 cron 作业执行（主和隔离）都会创建 [任务记录](/en/automation/tasks)。Heartbeat 轮次则不会。主会话 cron 任务默认使用 `silent` 通知策略，因此它们不会生成通知。

## 快速决策指南

| 用例                       | 推荐                | 原因                                   |
| -------------------------- | ------------------- | -------------------------------------- |
| 每 30 分钟检查一次收件箱   | Heartbeat           | 与其他检查批量处理，具有上下文感知能力 |
| 上午 9 点准时发送日报      | Cron (isolated)     | 需要精确计时                           |
| 监控日历中的即将发生的事件 | Heartbeat           | 自然适合周期性感知                     |
| 运行每周深度分析           | Cron (isolated)     | 独立任务，可以使用不同的模型           |
| 在 20 分钟后提醒我         | Cron (main, `--at`) | 精确计时的单次任务                     |
| 后台项目健康检查           | Heartbeat           | 依附于现有周期                         |

## Heartbeat：周期性感知

Heartbeat 以固定间隔（默认：30 分钟）在 **主会话** 中运行。它们旨在让代理检查事务并显现任何重要事项。

### 何时使用 heartbeat

- **多项周期性检查**：与其用 5 个独立的 cron 作业分别检查收件箱、日历、天气、通知和项目状态，不如用单个 heartbeat 将所有这些批量处理。
- **上下文感知的决策**：代理拥有完整的主会话上下文，因此它可以就什么是紧急的、什么可以等待做出明智的决策。
- **对话连续性**：Heartbeat 运行共享同一个会话，因此代理会记住最近的对话并可以自然地跟进。
- **低开销监控**：一个 heartbeat 可以取代许多小型轮询任务。

### Heartbeat 优势

- **批量执行多项检查**：一个代理轮次可以同时查看收件箱、日历和通知。
- **减少 API 调用**：单个 heartbeat 比 5 个隔离的 cron 作业更便宜。
- **上下文感知**：代理知道您一直在处理什么，并可以据此确定优先级。
- **智能抑制**：如果不需要关注，Agent 会回复 `HEARTBEAT_OK` 且不发送任何消息。
- **自然时机**：根据队列负载稍有漂移，这对于大多数监控来说是可以接受的。
- **无任务记录**：heartbeat 轮次保留在主会话（main-会话）历史记录中（参见 [后台任务](/en/automation/tasks)）。

### Heartbeat 示例：HEARTBEAT.md 检查清单

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

Agent 在每次 heartbeat 时读取此内容，并在一轮中处理所有项目。

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

有关完整配置，请参见 [Heartbeat](/en/gateway/heartbeat)。

## Cron：精确调度

Cron 作业在精确的时间运行，并且可以在隔离的会话中运行，而不会影响主上下文。
循环的整点调度会根据确定性
的每个作业偏移量，在 0-5 分钟的时间窗口内自动分散。

### 何时使用 cron

- **需要精确计时**：“在每周一上午 9:00 发送此消息”（而不是“9 点左右”）。
- **独立任务**：不需要对话上下文的任务。
- **不同的模型/思考**：值得使用更强大的模型进行的大量分析。
- **一次性提醒**：使用 `--at` “在 20 分钟后提醒我”。
- **嘈杂/频繁的任务**：会扰乱主会话历史记录的任务。
- **外部触发器**：无论 Agent 是否处于活跃状态都应独立运行的任务。

### Cron 优势

- **精确计时**：支持时区的 5 字段或 6 字段（秒）cron 表达式。
- **内置负载分散**：循环的整点调度默认情况下会错开最多 5 分钟。
- **每作业控制**：使用 `--stagger <duration>` 覆盖错开设置，或使用 `--exact` 强制精确计时。
- **会话隔离**：在 `cron:<jobId>` 中运行，不会污染主历史记录。
- **模型覆盖**：每个作业可以使用更便宜或更强大的模型。
- **交付控制**：隔离作业默认为 `announce`（摘要）；根据需要选择 `none`。
- **即时交付**：公告模式直接发布，无需等待 heartbeat。
- **无需 Agent 上下文**：即使主会话处于空闲或已压缩状态也能运行。
- **一次性支持**：`--at` 用于精确的未来时间戳。
- **任务跟踪**：独立的作业会创建 [后台任务](/en/automation/tasks) 记录，这些记录在 `openclaw tasks` 和 `openclaw tasks audit` 中可见。

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

此任务在纽约时间上午 7:00 准确运行，使用 Opus 以保证质量，并将摘要直接发送到 WhatsApp。

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

请参阅 [Cron 作业](/en/automation/cron-jobs) 以获取完整的 CLI 参考。

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

最高效的设置是**同时使用两者**：

1. **Heartbeat** 处理常规监控（收件箱、日历、通知），每 30 分钟进行一次批量处理。
2. **Cron** 处理精确的计划（每日报告、每周复盘）和一次性提醒。

### 示例：高效的自动化设置

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

## Lobster：具有审批功能的确定性工作流

Lobster 是 **多步骤工具管道** 的工作流运行时，需要确定性执行和显式审批。
当任务不仅仅是单次 agent 轮次，并且您需要一个包含人工检查点的可恢复工作流时，请使用它。

### 何时适合 Lobster

- **多步骤自动化**：您需要固定的工具调用管道，而不是一次性的提示。
- **审批门控**：副作用应暂停直到您批准，然后恢复。
- **可恢复运行**：继续暂停的工作流，而无需重新运行之前的步骤。

### 如何与 heartbeat 和 cron 配合使用

- **Heartbeat/cron** 决定运行发生的*时间*。
- **Lobster** 定义运行开始后发生的*步骤*。

对于计划工作流，请使用 cron 或 heartbeat 触发调用 Lobster 的 agent 轮次。
对于临时工作流，请直接调用 Lobster。

### 操作说明（来自代码）

- Lobster 作为 **本地子进程**（`lobster` CLI）在工具模式下运行，并返回 **JSON 信封**。
- 如果工具返回 `needs_approval`，则使用 `resumeToken` 和 `approve` 标志继续。
- 该工具是一个 **可选插件**；建议通过 `tools.alsoAllow: ["lobster"]` 附加启用它（推荐）。
- Lobster 期望 `lobster` CLI 在 `PATH` 上可用。

有关完整用法和示例，请参阅 [Lobster](/en/tools/lobster)。

## 主会话与隔离会话

Heartbeat 和 Cron 都可以与主会话交互，但方式不同：

|                              | Heartbeat                      | Cron（主）            | Cron（隔离）                           |
| ---------------------------- | ------------------------------ | --------------------- | -------------------------------------- |
| 会话                         | 主                             | 主（通过系统事件）    | `cron:<jobId>` 或自定义会话            |
| 历史记录                     | 共享                           | 共享                  | 每次运行全新（隔离）/ 持久化（自定义） |
| 上下文                       | 完整                           | 完整                  | 无（隔离）/ 累积（自定义）             |
| 模型                         | 主会话模型                     | 主会话模型            | 可以覆盖                               |
| 输出                         | 如果不是 `HEARTBEAT_OK` 则交付 | Heartbeat 提示 + 事件 | 宣布摘要（默认）                       |
| [任务](/en/automation/tasks) | 无任务记录                     | 任务记录（静默）      | 任务记录（在 `openclaw tasks` 中可见） |

### 何时使用主会话 cron

当您需要时，请将 `--session main` 与 `--system-event` 结合使用：

- 提醒/事件出现在主会话上下文中
- 代理在下一个心跳期间利用完整上下文处理它
- 没有单独的隔离运行

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何时使用隔离的 cron

当您想要以下内容时，使用 `--session isolated`：

- 没有先前上下文的全新开端
- 不同的模型或思考设置
- 直接向渠道公布摘要
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

| 机制        | 成本概况                                         |
| ----------- | ------------------------------------------------ |
| Heartbeat   | 每 N 分钟一轮；随 HEARTBEAT.md 大小扩展          |
| Cron (主)   | 将事件添加到下一次心跳（无独立轮次）             |
| Cron (独立) | 每个作业一个完整的代理轮次；可以使用更便宜的模型 |

**提示**：

- 保持 `HEARTBEAT.md` 较小以最小化 token 开销。
- 将类似的检查合并到心跳中，而不是使用多个 cron 作业。
- 如果您只希望进行内部处理，请在心跳上使用 `target: "none"`。
- 对于日常任务，请使用独立的 cron 和更便宜的模型。

## 相关

- [自动化概览](/en/automation) — 快速了解所有自动化机制
- [Heartbeat](/en/gateway/heartbeat) — 完整的 heartbeat 配置
- [Cron jobs](/en/automation/cron-jobs) — 完整的 cron CLI 和 API 参考
- [后台任务](/en/automation/tasks) — 任务账本、审计和生命周期
- [系统](/en/cli/system) — 系统事件 + 心跳控制
