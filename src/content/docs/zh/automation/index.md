---
summary: "自动化机制概述：任务、Cron、挂钩、常设指令和任务流"
read_when:
  - Deciding how to automate work with OpenClaw
  - Choosing between heartbeat, cron, commitments, hooks, and standing orders
  - Looking for the right automation entry point
title: "自动化和任务"
---

OpenClaw 通过任务、预定作业、推断承诺、事件挂钩和常驻指令在后台运行工作。本页面帮助您选择正确的机制并了解它们如何协同工作。

## 快速决策指南

```mermaid
flowchart TD
    START([What do you need?]) --> Q1{Schedule work?}
    START --> Q2{Track detached work?}
    START --> Q3{Orchestrate multi-step flows?}
    START --> Q4{React to lifecycle events?}
    START --> Q5{Give the agent persistent instructions?}
    START --> Q6{Remember a natural follow-up?}

    Q1 -->|Yes| Q1a{Exact timing or flexible?}
    Q1a -->|Exact| CRON["Scheduled Tasks (Cron)"]
    Q1a -->|Flexible| HEARTBEAT[Heartbeat]

    Q2 -->|Yes| TASKS[Background Tasks]
    Q3 -->|Yes| FLOW[Task Flow]
    Q4 -->|Yes| HOOKS[Hooks]
    Q5 -->|Yes| SO[Standing Orders]
    Q6 -->|Yes| COMMITMENTS[Inferred Commitments]
```

| 用例                               | 推荐方案         | 原因                                            |
| ---------------------------------- | ---------------- | ----------------------------------------------- |
| 在上午 9 点准时发送每日报告        | 定时任务 (Cron)  | 精确计时，隔离执行                              |
| 在 20 分钟后提醒我                 | 定时任务 (Cron)  | 精确计时的一次性任务 (`--at`)                   |
| 运行每周深度分析                   | 定时任务 (Cron)  | 独立任务，可以使用不同的模型                    |
| 每 30 分钟检查一次收件箱           | 心跳 (Heartbeat) | 与其他检查批量处理，具有上下文感知能力          |
| 监控日历中的即将发生的事件         | 心跳 (Heartbeat) | 周期性感知的自然选择                            |
| 在提及的面试后跟进                 | 推断承诺         | 类似记忆的后续跟进，无确切提醒请求              |
| 在用户上下文之后进行温和的关怀检查 | 推断承诺         | 作用于同一代理和渠道                            |
| 检查子代理或 ACP 运行的状态        | 后台任务         | 任务账本跟踪所有独立工作                        |
| 审计运行的内容和时间               | 后台任务         | `openclaw tasks list` 和 `openclaw tasks audit` |
| 多步骤研究然后总结                 | 任务流           | 具有修订跟踪的持久化编排                        |
| 在会话重置时运行脚本               | 挂钩             | 事件驱动，在生命周期事件时触发                  |
| 在每次工具调用时执行代码           | 插件挂钩         | 进程内挂钩可以拦截工具调用                      |
| 回复前始终检查合规性               | 常驻指令         | 自动注入到每个会话中                            |

### 预定任务 与 心跳

| 维度       | 预定任务                   | 心跳                   |
| ---------- | -------------------------- | ---------------------- |
| 时机       | 精确 (cron 表达式，一次性) | 近似 (默认每 30 分钟)  |
| 会话上下文 | 全新 (隔离) 或 共享        | 完整的主会话上下文     |
| 任务记录   | 始终创建                   | 从不创建               |
| 交付       | 渠道、webhook 或 静默      | 在主会话中内联         |
| 最适用于   | 报告、提醒、后台作业       | 收件箱检查、日历、通知 |

当您需要精确计时或隔离执行时，请使用预定任务。当工作受益于完整的会话上下文且近似计时即可时，请使用心跳。

## 核心概念

### 预定任务

Cron 是 Gateway(网关) 内置的精确计时调度器。它持久化作业，在正确的时间唤醒代理，并可以将输出发送到聊天渠道或 webhook 端点。支持一次性提醒、周期性表达式和入站 webhook 触发器。

参见 [预定任务](/zh/automation/cron-jobs)。

### 任务

后台任务账本会跟踪所有分离的工作：ACP 运行、子代理生成、独立的 cron 执行和 CLI 操作。任务是记录，而不是调度器。使用 CLI`openclaw tasks list` 和 `openclaw tasks audit` 来检查它们。

参见 [后台任务](/zh/automation/tasks)。

### 推断承诺

承诺是可选的、短期的后续记忆。OpenClaw 从正常对话中推断出它们，将其范围限定为相同的代理和渠道，并通过心跳传递到期检查。用户请求的确切提醒仍属于 cron。

参见 [推断承诺](/zh/concepts/commitments)。

### 任务流

任务流是后台任务之上的流程编排基质。它管理具有托管和镜像同步模式、修订跟踪以及 `openclaw tasks flow list|show|cancel` 用于检查的持久多步骤流程。

参见 [任务流](/zh/automation/taskflow)。

### 常备指令

常备指令授予代理针对已定义程序的永久操作权限。它们驻留在工作区文件中（通常为 `AGENTS.md`）并被注入到每个会话中。与 cron 结合使用以实现基于时间的强制执行。

参见 [常备指令](/zh/automation/standing-orders)。

### 钩子

内部钩子是由代理生命周期事件（`/new`、`/reset`、`/stop`）、会话压缩、网关启动和消息流触发的事件驱动脚本。它们会从目录中自动发现，并可以使用 `openclaw hooks` 进行管理。对于进程内工具调用拦截，请使用[插件钩子](/zh/plugins/hooks)。

参见 [钩子](/zh/automation/hooks)。

### 心跳

Heartbeat 是定期的主会话轮次（默认每 30 分钟一次）。它在一个具有完整会话上下文的代理轮次中批量处理多项检查（收件箱、日历、通知）。Heartbeat 轮次不会创建任务记录，也不会延长每日/空闲会话重置的新鲜度。对于小型检查清单，请使用 `HEARTBEAT.md`，或者当您希望在 heartbeat 内部进行仅到期（due-only）的定期检查时，使用 `tasks:` 块。空的 heartbeat 文件会作为 `empty-heartbeat-file` 跳过；仅到期任务模式会作为 `no-tasks-due` 跳过。当 cron 工作处于活动状态或排队时，Heartbeat 会延迟，并且当子代理或嵌套通道繁忙时，`heartbeat.skipWhenBusy` 也可以延迟它们。

请参阅 [Heartbeat](/zh/gateway/heartbeat)。

## 它们如何协同工作

- **Cron** 处理精确的计划（每日报告、每周审查）和一次性提醒。所有 cron 执行都会创建任务记录。
- **Heartbeat** 每 30 分钟在一个批量轮次中处理例行监控（收件箱、日历、通知）。
- **Hooks** 使用自定义脚本对特定事件（会话重置、压缩、消息流）做出反应。插件钩子覆盖工具调用。
- **Standing orders** 为代理提供持久上下文和权限边界。
- **Task Flow** 在单个任务之上协调多步流程。
- **Tasks** 自动跟踪所有分离的工作，以便您检查和审计。

## 相关

- [Scheduled Tasks](/zh/automation/cron-jobs) — 精确调度和一次性提醒
- [Inferred Commitments](/zh/concepts/commitments) — 类似记忆的后续跟进检查
- [Background Tasks](/zh/automation/tasks) — 所有分离工作的任务账本
- [Task Flow](/zh/automation/taskflow) — 持久的多步流程编排
- [Hooks](/zh/automation/hooks) — 事件驱动的生命周期脚本
- [Plugin hooks](/zh/plugins/hooks) — 进程内工具、提示、消息和生命周期钩子
- [Standing Orders](/zh/automation/standing-orders) — 持久的代理指令
- [Heartbeat](/zh/gateway/heartbeat) — 定期的主会话轮次
- [Configuration Reference](/zh/gateway/configuration-reference) — 所有配置键
