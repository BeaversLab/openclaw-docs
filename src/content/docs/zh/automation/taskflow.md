---
summary: "Task Flow 流程编排层，位于后台任务之上"
read_when:
  - You want to understand how Task Flow relates to background tasks
  - You encounter Task Flow or openclaw tasks flow in release notes or docs
  - You want to inspect or manage durable flow state
title: "Task Flow"
---

# Task Flow

Task Flow 是位于[后台任务](/zh/automation/tasks)之上的流程编排基底。它管理具有自身状态、版本跟踪和同步语义的持久化多步骤流程，而单个任务仍然是独立工作的单元。

## 何时使用 Task Flow

当工作跨越多个连续或分支步骤，并且您需要在网关重启后进行持久的进度跟踪时，请使用 Task Flow。对于单个后台操作，一个普通的[任务](/zh/automation/tasks) 就足够了。

| 场景                         | 使用                 |
| ---------------------------- | -------------------- |
| 单个后台作业                 | 普通任务             |
| 多步骤管道 (A 然后 B 然后 C) | Task Flow (托管模式) |
| 观察外部创建的任务           | Task Flow (镜像模式) |
| 一次性提醒                   | Cron 作业            |

## 同步模式

### 托管模式

Task Flow 拥有端到端的生命周期。它将任务创建为流程步骤，驱动其完成，并自动推进流程状态。

示例：一个每周报告流程，(1) 收集数据，(2) 生成报告，以及 (3) 发送报告。Task Flow 将每个步骤创建为后台任务，等待完成，然后移动到下一步。

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### 镜像模式

Task Flow 观察外部创建的任务，并在不接管任务创建所有权的情况下保持流程状态同步。当任务源自 cron 作业、CLI 命令或其他来源，并且您希望以统一视图查看其进度作为流程时，这非常有用。

示例：三个独立的 cron 作业共同构成一个“晨间运维”例程。镜像流程跟踪它们的集体进度，而不控制它们何时或如何运行。

## 持久化状态和版本跟踪

每个流程都会持久化其自身状态并跟踪版本，以便进度在网关重启后仍然保留。版本跟踪可以在多个源尝试同时推进同一流程时启用冲突检测。

## 取消行为

`openclaw tasks flow cancel` 在流程上设置一个粘性取消意图。流程中的活动任务将被取消，并且不会启动新步骤。取消意图在重启后仍然存在，因此即使网关在所有子任务终止之前重启，已取消的流程也会保持取消状态。

## CLI 命令

```bash
# List active and recent flows
openclaw tasks flow list

# Show details for a specific flow
openclaw tasks flow show <lookup>

# Cancel a running flow and its active tasks
openclaw tasks flow cancel <lookup>
```

| 命令                              | 描述                             |
| --------------------------------- | -------------------------------- |
| `openclaw tasks flow list`        | 显示具有状态和同步模式的已跟踪流 |
| `openclaw tasks flow show <id>`   | 通过流 ID 或查找键检视单个流     |
| `openclaw tasks flow cancel <id>` | 取消正在运行的流及其活动任务     |

## 流与任务的关系

流用于协调任务，而非替代任务。在其生命周期中，单个流可能会驱动多个后台任务。使用 `openclaw tasks` 检查单个任务记录，使用 `openclaw tasks flow` 检查协调流。

## 相关内容

- [后台任务](/zh/automation/tasks) — 流所协调的独立工作分类账
- [CLI: tasks](/zh/cli/tasks) —— 用于 `openclaw tasks flow` 的 CLI 命令参考
- [自动化概览](/zh/automation) — 所有自动化机制概览
- [Cron 作业](/zh/automation/cron-jobs) — 可能输入到流的计划作业
