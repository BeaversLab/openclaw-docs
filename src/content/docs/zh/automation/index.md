---
summary: "自动化机制概述：任务、Cron、挂钩、常设指令和任务流"
read_when:
  - Deciding how to automate work with OpenClaw
  - Choosing between heartbeat, cron, hooks, and standing orders
  - Looking for the right automation entry point
title: "自动化与任务"
---

OpenClaw 通过任务、定时作业、事件钩子和常驻指令在后台运行工作。本页面可帮助您选择正确的机制并了解它们如何协同工作。

## 快速决策指南

```mermaid
flowchart TD
    START([What do you need?]) --> Q1{Schedule work?}
    START --> Q2{Track detached work?}
    START --> Q3{Orchestrate multi-step flows?}
    START --> Q4{React to lifecycle events?}
    START --> Q5{Give the agent persistent instructions?}

    Q1 -->|Yes| Q1a{Exact timing or flexible?}
    Q1a -->|Exact| CRON["Scheduled Tasks (Cron)"]
    Q1a -->|Flexible| HEARTBEAT[Heartbeat]

    Q2 -->|Yes| TASKS[Background Tasks]
    Q3 -->|Yes| FLOW[Task Flow]
    Q4 -->|Yes| HOOKS[Hooks]
    Q5 -->|Yes| SO[Standing Orders]
```

| 用例                        | 推荐方案                   | 原因                                            |
| --------------------------- | -------------------------- | ----------------------------------------------- |
| 在上午 9 点准时发送每日报告 | 定时任务 (Cron)            | 精确计时，隔离执行                              |
| 在 20 分钟后提醒我          | 定时任务 (Cron)            | 精确计时的一次性任务 (`--at`)                   |
| 运行每周深度分析            | 定时任务 (Cron)            | 独立任务，可以使用不同的模型                    |
| 每 30 分钟检查一次收件箱    | 心跳 (Heartbeat)           | 与其他检查批量处理，具有上下文感知能力          |
| 监控日历中的即将发生的事件  | 心跳 (Heartbeat)           | 周期性感知的自然选择                            |
| 检查子代理或 ACP 运行的状态 | 后台任务                   | 任务账本会跟踪所有分离的工作                    |
| 审计运行内容与时间          | 后台任务                   | `openclaw tasks list` 和 `openclaw tasks audit` |
| 多步骤研究并汇总            | 任务流 (Task Flow)         | 具有修订跟踪的持久化编排                        |
| 在会话重置时运行脚本        | 钩子 (Hooks)               | 事件驱动，在生命周期事件时触发                  |
| 在每次工具调用时执行代码    | 插件钩子                   | 进程内钩子可以拦截工具调用                      |
| 回复前始终检查合规性        | 常驻指令 (Standing Orders) | 自动注入到每个会话中                            |

### 定时任务 (Cron) 与 心跳 (Heartbeat)

| 维度       | 定时任务 (Cron)            | 心跳 (Heartbeat)       |
| ---------- | -------------------------- | ---------------------- |
| 计时       | 精确 (cron 表达式，一次性) | 近似 (默认每 30 分钟)  |
| 会话上下文 | 全新 (隔离) 或共享         | 完整的主会话上下文     |
| 任务记录   | 始终创建                   | 从不创建               |
| 交付       | 渠道、webhook 或静默       | 在主会话中内联         |
| 最适合     | 报告、提醒、后台作业       | 收件箱检查、日历、通知 |

当您需要精确计时或隔离执行时，请使用定时任务 (Cron)。当工作能从完整会话上下文中受益且近似计时可以接受时，请使用心跳 (Heartbeat)。

## 核心概念

### 定时任务 (cron)

Cron 是 Gateway(网关) 用于精确计时的内置调度程序。它会持久化作业，在正确的时间唤醒代理，并可以将输出发送到聊天渠道或 webhook 端点。支持一次性提醒、周期性表达式和入站 webhook 触发器。

请参阅[定时任务](/zh/automation/cron-jobs)。

### 任务

后台任务分类账记录所有分离的工作：ACP 运行、子代理生成、隔离的 cron 执行以及 CLI 操作。任务是记录，而非调度器。请使用 `openclaw tasks list` 和 `openclaw tasks audit` 对其进行检查。

请参阅[后台任务](/zh/automation/tasks)。

### 任务流

任务流是后台任务之上的流程编排基础层。它通过托管和镜像同步模式、版本跟踪以及 `openclaw tasks flow list|show|cancel` 来管理持久的多步骤流程以供检查。

请参阅[任务流](/zh/automation/taskflow)。

### 常驻指令

常驻指令授予代理对已定义程序的永久操作权限。它们驻留在工作区文件中（通常为 `AGENTS.md`）并被注入到每个会话中。结合 cron 使用以实现基于时间的强制执行。

请参阅[常驻指令](/zh/automation/standing-orders)。

### 钩子

内部钩子是由代理生命周期事件
(`/new`、`/reset`、`/stop`)、会话压缩、网关启动和消息
流触发的事件驱动脚本。它们会自动从目录中发现，并可以使用
`openclaw hooks` 进行管理。对于进程内工具调用拦截，请使用
[插件钩子](/zh/plugins/hooks)。

请参阅[钩子](/zh/automation/hooks)。

### 心跳

心跳是一种周期性的主会话轮次（默认每 30 分钟一次）。它在一个具有完整会话上下文的代理轮次中批量处理多个检查（收件箱、日历、通知）。心跳轮次不会创建任务记录，也不会延长每日/空闲会话重置的新鲜度。使用 `HEARTBEAT.md` 作为小型检查清单，或者当您希望在心跳内部进行仅到期定期检查时使用 `tasks:` 块。空心跳文件跳过为 `empty-heartbeat-file`；仅到期任务模式跳过为 `no-tasks-due`。

请参阅[心跳](/zh/gateway/heartbeat)。

## 它们如何协同工作

- **Cron** 处理精确的计划（每日报告、每周审查）和一次性提醒。所有 cron 执行都会创建任务记录。
- **Heartbeat** 在每 30 分钟的一次批量轮次中处理常规监控（收件箱、日历、通知）。
- **Hooks** 使用自定义脚本对特定事件（会话重置、压缩、消息流）做出反应。插件钩子覆盖工具调用。
- **Standing orders** 为代理提供持久上下文和权限边界。
- **Task Flow** 协调单个任务之上的多步流程。
- **Tasks** 自动跟踪所有分离的工作，以便您进行检查和审计。

## 相关

- [Scheduled Tasks](/zh/automation/cron-jobs) — 精确调度和一次性提醒
- [Background Tasks](/zh/automation/tasks) — 所有分离工作的任务账本
- [Task Flow](/zh/automation/taskflow) — 持久的多步流程编排
- [Hooks](/zh/automation/hooks) — 事件驱动的生命周期脚本
- [Plugin hooks](/zh/plugins/hooks) — 进程内工具、提示、消息和生命周期钩子
- [Standing Orders](/zh/automation/standing-orders) — 持久代理指令
- [Heartbeat](/zh/gateway/heartbeat) — 定期主会话轮次
- [Configuration Reference](/zh/gateway/configuration-reference) — 所有配置键
