---
summary: "关于在自动化中选择 heartbeat 与 cron 任务的指南"
read_when:
  - 决定如何调度周期性任务
  - 设置后台监控或通知
  - 优化周期性检查的 token 使用
title: "Cron 与 Heartbeat"
---

# Cron vs Heartbeat：何时使用哪一种

Heartbeat 和 cron 任务都能按计划运行任务。本指南帮助你为用例选择合适的机制。

## 快速决策指南

| 使用场景                             | 推荐                       | 原因                                      |
| ------------------------------------ | -------------------------- | ----------------------------------------- |
| 每 30 分钟检查收件箱                  | Heartbeat                  | 与其他检查一起批处理，具备上下文感知      |
| 每天早上 9 点准时发送报告             | Cron（隔离）               | 需要精确时间                              |
| 监控日历中的即将发生事件              | Heartbeat                  | 适合周期性意识维护                        |
| 每周进行深度分析                      | Cron（隔离）               | 独立任务，可用不同模型                    |
| 20 分钟后提醒我                       | Cron（主会话，`--at`）     | 一次性提醒，时间精确                      |
| 后台项目健康检查                      | Heartbeat                  | 借用已有周期                              |

## Heartbeat：周期性意识

Heartbeat 在**主会话**中按固定间隔运行（默认：30 分钟）。它让代理定期检查重要事项并提醒你。

### 何时使用 heartbeat

- **多个周期性检查**：与其为收件箱、日历、天气、通知、项目状态分别建 5 个 cron 任务，不如用一次 heartbeat 批量完成。
- **上下文感知决策**：代理拥有主会话完整上下文，能判断什么紧急、什么可以稍后处理。
- **对话连续性**：Heartbeat 共享同一会话，代理记得最近对话，可自然跟进。
- **低开销监控**：一次 heartbeat 替代多个小型轮询任务。

### Heartbeat 优势

- **批量检查**：一次代理回合即可一起检查收件箱、日历、通知等。
- **降低 API 调用**：一次 heartbeat 比 5 个独立 cron 任务更省。
- **上下文感知**：代理知道你最近在做什么，能更好地排序优先级。
- **智能抑制**：若无须提醒，代理返回 `HEARTBEAT_OK`，不会发送消息。
- **自然节奏**：会根据队列负载略有漂移，多数监控场景完全可接受。

### Heartbeat 示例：HEARTBEAT.md 清单

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

代理会在每次 heartbeat 中读取该文件，并在一个回合内处理全部项目。

### 配置 heartbeat

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // interval
        target: "last", // where to deliver alerts
        activeHours: { start: "08:00", end: "22:00" }, // optional
      },
    },
  },
}
```

参见 [Heartbeat](/zh/gateway/heartbeat) 获取完整配置。

## Cron：精确调度

Cron 任务在**精确时间**运行，并且可以在隔离会话中执行，不影响主会话上下文。

### 何时使用 cron

- **需要精确时间**："每周一 9:00 AM 发送"（不是"大概 9 点左右"）。
- **独立任务**：不需要对话上下文的任务。
- **不同模型/思考**：需要更强模型的重度分析。
- **一次性提醒**：用 `--at` 实现"20 分钟后提醒我"。
- **高频/噪声任务**：会让主会话历史变得嘈杂的任务。
- **外部触发**：应独立运行、不依赖代理其他活动的任务。

### Cron 优势

- **精确时间**：支持 5 段 cron 表达式与时区。
- **会话隔离**：在 `cron:<jobId>` 中运行，不污染主会话历史。
- **模型覆盖**：每个任务可选更省或更强模型。
- **投递控制**：可直接投递到指定渠道；默认仍会在主会话发布摘要（可配置）。
- **无需上下文**：即使主会话空闲或被压缩，仍会运行。
- **一次性支持**：`--at` 支持精确未来时间戳。

### Cron 示例：每日晨报

```bash
openclaw cron add \
  --name "Morning briefing" \
  --cron "0 7 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Generate today's briefing: weather, calendar, top emails, news summary." \
  --model opus \
  --deliver \
  --channel whatsapp \
  --to "+15551234567"
```

它会在纽约时间早上 7:00 准时运行，使用 Opus 以提高质量，并直接投递到 WhatsApp。

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

参见 [Cron jobs](/zh/automation/cron-jobs) 获取完整 CLI 参考。

## 决策流程图

```
任务是否需要在精确时间运行？
  YES -> Use cron
  NO  -> Continue...

任务是否需要与主会话隔离？
  YES -> Use cron (isolated)
  NO  -> Continue...

任务能否与其他周期性检查合并？
  YES -> Use heartbeat (add to HEARTBEAT.md)
  NO  -> Use cron

这是一次性提醒吗？
  YES -> Use cron with --at
  NO  -> Continue...

是否需要不同模型或思考等级？
  YES -> Use cron (isolated) with --model/--thinking
  NO  -> Use heartbeat
```

## 组合使用

最有效的配置是**两者结合**：

1. **Heartbeat** 负责常规监控（收件箱、日历、通知），每 30 分钟合并一次。
2. **Cron** 负责精确计划（日报、周报）与一次性提醒。

### 示例：高效自动化配置

**HEARTBEAT.md**（每 30 分钟检查一次）：

```md
# Heartbeat checklist

- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Cron 任务**（精确时间）：

```bash
# Daily morning briefing at 7am
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --deliver

# Weekly project review on Mondays at 9am
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster：带审批的确定性工作流

Lobster 是用于**多步骤工具流水线**的工作流运行时，强调确定性执行与显式审批。
当任务超过一次代理回合，且你希望可恢复、有人类检查点的流程时，使用它。

### Lobster 适用场景

- **多步骤自动化**：需要固定的工具调用流水线，而不是一次性提示。
- **审批关卡**：有副作用的步骤需要暂停等待批准，然后继续。
- **可恢复运行**：可以从暂停处继续，不会重复早期步骤。

### 它如何与 heartbeat 和 cron 配合

- **Heartbeat/Cron** 决定_何时_触发一次运行。
- **Lobster** 定义运行时_具体步骤_是什么。

在定时工作流中，使用 cron 或 heartbeat 触发一个代理回合，再由该回合调用 Lobster。
对于临时工作流，直接调用 Lobster 即可。

### 操作说明（来自代码）

- Lobster 以工具模式作为**本地子进程**运行（`lobster` CLI），并返回**JSON 包装**。
- 若工具返回 `needs_approval`，可用 `resumeToken` 与 `approve` 继续。
- 该工具是**可选插件**；推荐通过 `tools.alsoAllow: ["lobster"]` 以增量方式启用。
- 若传入 `lobsterPath`，必须是**绝对路径**。

参见 [Lobster](/zh/tools/lobster) 获取完整用法与示例。

## 主会话 vs 隔离会话

Heartbeat 和 cron 都能与主会话交互，但方式不同：

|         | Heartbeat                   | Cron（主会话）              | Cron（隔离）           |
| ------- | --------------------------- | --------------------------- | ---------------------- |
| 会话    | 主会话                      | 主会话（通过 system event）  | `cron:<jobId>`         |
| 历史    | 共享                        | 共享                        | 每次新建               |
| 上下文  | 完整                        | 完整                        | 无（从零开始）         |
| 模型    | 主会话模型                  | 主会话模型                  | 可覆盖                |
| 输出    | 非 `HEARTBEAT_OK` 时投递    | Heartbeat 提示 + 事件       | 默认摘要回主会话       |

### 何时使用主会话 cron

当你希望：
- 提醒/事件出现在主会话上下文中
- 代理在下一次 heartbeat 中用完整上下文处理
- 不需要独立隔离运行

请使用 `--session main` 配合 `--system-event`：

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### 何时使用隔离 cron

当你需要：
- 一次干净的上下文
- 不同模型或思考设置
- 直接投递到指定渠道（默认仍回主会话摘要）
- 不污染主会话历史

可用 `--session isolated`：

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 0" \
  --session isolated \
  --message "Weekly codebase analysis..." \
  --model opus \
  --thinking high \
  --deliver
```

## 成本考量

| 机制            | 成本特征                                                 |
| --------------- | -------------------------------------------------------- |
| Heartbeat       | 每 N 分钟一个回合；规模与 HEARTBEAT.md 大小相关           |
| Cron（主会话）  | 只将事件加入下一次 heartbeat（无隔离回合）                |
| Cron（隔离）    | 每个任务一次完整代理回合；可用更省模型                    |

**小贴士**：

- 保持 `HEARTBEAT.md` 精简以减少 token 开销。
- 将类似检查合并到 heartbeat 中，而不是多个 cron 任务。
- 若只需内部处理，可将 heartbeat 的 `target: "none"`。
- 常规任务可用隔离 cron 搭配更省模型。

## 相关

- [Heartbeat](/zh/gateway/heartbeat) - 完整 heartbeat 配置
- [Cron jobs](/zh/automation/cron-jobs) - 完整 cron CLI 与 API 参考
- [System](/zh/cli/system) - system event + heartbeat 控制
