---
summary: "位于后台任务之上的 Task Flow 编排层"
read_when:
  - You want to understand how Task Flow relates to background tasks
  - You encounter Task Flow or openclaw tasks flow in release notes or docs
  - You want to inspect or manage durable flow state
title: "Task flow"
---

Task Flow 是位于[后台任务](/zh/automation/tasks)之上的流程编排基底。它管理具有自身状态、修订跟踪和同步语义的持久多步流程，而各个任务仍然是分离工作的单元。

## 何时使用 Task Flow

当工作跨越多个顺序或分支步骤，并且需要在网关重启之间进行持久进度跟踪时，请使用 Task Flow。对于单一后台操作，普通的[任务](/zh/automation/tasks)就足够了。

| 场景                          | 使用                  |
| ----------------------------- | --------------------- |
| 单一后台作业                  | 普通任务              |
| 多步流水线（A 然后 B 然后 C） | Task Flow（托管模式） |
| 观察外部创建的任务            | Task Flow（镜像模式） |
| 一次性提醒                    | Cron 作业             |

## 可靠的计划工作流模式

对于市场情报简报等定期工作流，请将计划、编排和可靠性检查视为不同的层：

1. 使用[计划任务](/zh/automation/cron-jobs)进行计时。
2. 当工作流应基于先前的上下文构建时，使用持久的 cron 会话。
3. 使用 [Lobster](/zh/tools/lobster) 进行确定性步骤、批准门和恢复令牌处理。
4. 使用 Task Flow 跟跨子任务、等待、重试和网关重启的多步运行。

示例 cron 形状：

```bash
openclaw cron add \
  --name "Market intelligence brief" \
  --cron "0 7 * * 1-5" \
  --tz "America/New_York" \
  --session session:market-intel \
  --message "Run the market-intel Lobster workflow. Verify source freshness before summarizing." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

当定期工作流需要精心设计的历史记录、先前运行摘要或常驻上下文时，请使用 `session:<id>` 而不是 `isolated`。当每次运行都应从头开始且所有必需状态在工作流中均为显式时，请使用 `isolated`。

在工作流内部，将可靠性检查置于 LLM 摘要步骤之前：

```yaml
name: market-intel-brief
steps:
  - id: preflight
    command: market-intel check --json
  - id: collect
    command: market-intel collect --json
    stdin: $preflight.json
  - id: summarize
    command: market-intel summarize --json
    stdin: $collect.json
  - id: approve
    command: market-intel deliver --preview
    stdin: $summarize.json
    approval: required
  - id: deliver
    command: market-intel deliver --execute
    stdin: $summarize.json
    condition: $approve.approved
```

建议的预检检查：

- 浏览器可用性和配置文件选择，例如对于托管状态使用 `openclaw`，或者在需要已登录 Chrome 会话时使用 `user`。请参阅[浏览器](/zh/tools/browser)。
- 每个源的 API 凭据和配额。
- 所需端点的网络可达性。
- 为代理启用的必需工具，例如 `lobster`、`browser` 和 `llm-task`。
- 为 cron 配置了失败目标，以便预检失败可见。请参阅 [计划任务](/zh/automation/cron-jobs#delivery-and-output)。

推荐的每个收集项的数据来源字段：

```json
{
  "sourceUrl": "https://example.com/report",
  "retrievedAt": "2026-04-24T12:00:00Z",
  "asOf": "2026-04-24",
  "title": "Example report",
  "content": "..."
}
```

让工作流在汇总之前拒绝或标记过时项目。LLM 步骤应仅接收结构化 JSON，并应要求在其输出中保留 `sourceUrl`、`retrievedAt` 和 `asOf`。当您需要工作流内经过架构验证的模型步骤时，请使用 [LLM 任务](/zh/tools/llm-task)。

对于可复用的团队或社区工作流，请将 CLI、`.lobster` 文件以及任何设置说明打包为技能或插件，并通过 [ClawHub](/zh/clawhub) 发布。请在该包中保留特定于工作流的防护措施，除非插件 API 缺少所需的通用功能。

## 同步模式

### 托管模式

Task Flow 全权拥有生命周期。它创建任务作为流步骤，驱动它们完成，并自动推进流状态。

示例：每周报告流程，(1) 收集数据，(2) 生成报告，(3) 发送报告。Task Flow 将每个步骤创建为后台任务，等待完成，然后移动到下一步。

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### 镜像模式

Task Flow 观察外部创建的任务，并使流状态保持同步，而不拥有任务创建权。当任务源于 cron 作业、CLI 命令或其他来源，并且您希望统一查看其作为流的进度时，这非常有用。

示例：三个独立的 cron 作业，共同构成“晨间运维”例程。镜像流程跟踪它们的集体进度，而不控制它们运行的时间或方式。

## 持久化状态和版本跟踪

每个流都会持久化其自身的状态并跟踪修订，因此进度可以在网关重启后得以保留。当多个源尝试同时推进同一个流时，修订跟踪能够检测冲突。
流注册表使用 SQLite 并进行有限的预写日志维护，包括定期和关机时的检查点，因此长时间运行的网关不会保留无限增多的 `registry.sqlite-wal` 附属文件。

## 取消行为

`openclaw tasks flow cancel` 在流上设置一个粘性的取消意图。流中的活动任务会被取消，并且不会启动任何新步骤。取消意图在重启后依然存在，因此即使网关在所有子任务终止之前重启，已取消的流仍将保持取消状态。

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
| `openclaw tasks flow list`        | 显示已跟踪的流及其状态和同步模式 |
| `openclaw tasks flow show <id>`   | 通过流 ID 或查找键检查单个流     |
| `openclaw tasks flow cancel <id>` | 取消正在运行的流及其活动任务     |

## 流与任务的关系

流协调任务，而不是取代任务。在其生命周期中，单个流可能会驱动多个后台任务。使用 `openclaw tasks` 检查单个任务记录，使用 `openclaw tasks flow` 检查协调流。

## 相关

- [后台任务](/zh/automation/tasks) — 流所协调的分离工作账本
- [CLI: tasks](/zh/cli/tasks) — `openclaw tasks flow` 的 CLI 命令参考
- [自动化概述](/zh/automation) — 所有自动化机制概览
- [Cron 作业](/zh/automation/cron-jobs) — 可能输入到流中的计划作业
