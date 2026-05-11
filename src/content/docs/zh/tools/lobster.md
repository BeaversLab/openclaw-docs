---
summary: "适用于 OpenClaw 的类型化工作流运行时，具有可恢复的批准关卡。"
title: Lobster
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

Lobster 是一个工作流 Shell，允许 OpenClaw 将多步骤工具序列作为单一确定性操作运行，并具有明确的批准检查点。

Lobster 是位于独立后台工作之上的一个编写层。有关个别任务之上的流程编排，请参阅 [Task Flow](/zh/automation/taskflow) (`openclaw tasks flow`)。有关任务活动分类账，请参阅 [`openclaw tasks`](/zh/automation/tasks)。

## Hook

你的助手可以构建管理自身的工具。请求一个工作流，30 分钟后你就会得到一个 CLI 和作为一次调用运行的管道。Lobster 是缺失的那一块：确定性管道、明确的批准和可恢复的状态。

## Why

如今，复杂的工作流需要多次来回的工具调用。每次调用都会消耗 token，而 LLM 必须编排每一个步骤。Lobster 将这种编排移入类型化运行时：

- **一次调用代替多次**：OpenClaw 运行一次 Lobster 工具调用并获得结构化结果。
- **内置批准**：副作用（发送电子邮件、发布评论）会暂停工作流，直到被明确批准。
- **可恢复**：暂停的工作流返回一个 token；批准并恢复而无需重新运行所有内容。

## Why a DSL instead of plain programs?

Lobster 故意设计得很小。目标不是“一种新语言”，而是一个可预测的、AI 友好的管道规范，具有一流的批准和恢复 token。

- **内置批准/恢复**：普通程序可以提示人类，但如果没有你自己发明该运行时，它就无法使用持久的 token _暂停并恢复_。
- **确定性 + 可审计性**：管道是数据，因此易于记录、比较差异、重放和审查。
- **受约束的 AI 表面**：微小的语法 + JSON 管道减少了“创造性”代码路径，并使验证变得现实。
- **内置安全策略**：超时、输出上限、沙箱检查和允许列表由运行时强制执行，而不是由每个脚本强制执行。
- **仍然可编程**：每个步骤都可以调用任何 CLI 或脚本。如果你想要 JS/TS，可以从代码生成 `.lobster` 文件。

## How it works

OpenClaw 使用嵌入式运行器**进程内**运行 Lobster 工作流。不会生成外部 OpenClaw 子进程；工作流引擎在网关进程内执行并直接返回 JSON 信封。
如果管道暂停等待批准，工具会返回一个 `resumeToken`，以便您稍后继续。

## 模式：小型 CLI + JSON 管道 + 批准

构建能够输出 JSON 的微型命令，然后将它们链接到单个 Lobster 调用中。（以下是示例命令名称 — 请替换为您自己的名称。）

```bash
inbox list --json
inbox categorize --json
inbox apply --json
```

```json
{
  "action": "run",
  "pipeline": "exec --json --shell 'inbox list --json' | exec --stdin json --shell 'inbox categorize --json' | exec --stdin json --shell 'inbox apply --json' | approve --preview-from-stdin --limit 5 --prompt 'Apply changes?'",
  "timeoutMs": 30000
}
```

如果管道请求批准，请使用令牌恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 触发工作流；Lobster 执行步骤。批准网关确保副作用是明确的且可审计的。

示例：将输入项映射到工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 仅 JSON 的 LLM 步骤 (llm-task)

对于需要**结构化 LLM 步骤**的工作流，启用可选的
`llm-task` 插件工具并从 Lobster 调用它。这保持了工作流
的确定性，同时仍允许您使用模型进行分类/摘要/起草。

启用该工具：

```json
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  },
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}
```

在管道中使用它：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
  "thinking": "low",
  "input": { "subject": "Hello", "body": "Can you help?" },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}'
```

有关详细信息和配置选项，请参阅 [LLM Task](/zh/tools/llm-task)。

## 工作流文件 (.lobster)

Lobster 可以运行包含 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 字段的 YAML/JSON 工作流文件。在 OpenClaw 工具调用中，将 `pipeline` 设置为文件路径。

```yaml
name: inbox-triage
args:
  tag:
    default: "family"
steps:
  - id: collect
    command: inbox list --json
  - id: categorize
    command: inbox categorize --json
    stdin: $collect.stdout
  - id: approve
    command: inbox apply --approve
    stdin: $categorize.stdout
    approval: required
  - id: execute
    command: inbox apply --execute
    stdin: $categorize.stdout
    condition: $approve.approved
```

注意：

- `stdin: $step.stdout` 和 `stdin: $step.json` 传递上一步骤的输出。
- `condition`（或 `when`）可以根据 `$step.approved` 对步骤进行设限。

## 安装 Lobster

捆绑的 Lobster 工作流在进程内运行；不需要单独的 `lobster` 二进制文件。嵌入式运行器随 Lobster 插件一起提供。

如果您需要独立的 Lobster CLI 进行开发或外部管道，请从 [Lobster repo](https://github.com/openclaw/lobster) 安装它，并确保 `lobster` 在 `PATH` 中。

## 启用工具

Lobster 是一个**可选**插件工具（默认未启用）。

推荐（添加项，安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或者针对每个代理：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": {
          "alsoAllow": ["lobster"]
        }
      }
    ]
  }
}
```

除非您打算在限制性白名单模式下运行，否则请避免使用 `tools.allow: ["lobster"]`。

<Note>白名单对于可选插件是可选启用的。如果您的白名单仅命名了插件工具（如 `lobster`），OpenClaw 将保持核心工具启用。要限制核心工具，请在白名单中也包含您想要的核心工具或组。</Note>

## 示例：电子邮件分类

不使用 Lobster：

```
User: "Check my email and draft replies"
→ openclaw calls gmail.list
→ LLM summarizes
→ User: "draft replies to #2 and #5"
→ LLM drafts
→ User: "send #2"
→ openclaw calls gmail.send
(repeat daily, no memory of what was triaged)
```

使用 Lobster：

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

返回一个 JSON 信封（截断）：

```json
{
  "ok": true,
  "status": "needs_approval",
  "output": [{ "summary": "5 need replies, 2 need action" }],
  "requiresApproval": {
    "type": "approval_request",
    "prompt": "Send 2 draft replies?",
    "items": [],
    "resumeToken": "..."
  }
}
```

用户批准 → 恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

单一工作流。确定性。安全。

## 工具参数

### `run`

在工具模式下运行管道。

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

使用参数运行工作流文件：

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

在批准后继续暂停的工作流。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可选输入

- `cwd`: 管道的相对工作目录（必须保持在网关工作目录内）。
- `timeoutMs`: 如果工作流超过此持续时间则中止（默认值：20000）。
- `maxStdoutBytes`: 如果输出超过此大小则中止工作流（默认值：512000）。
- `argsJson`: 传递给 `lobster run --args-json` 的 JSON 字符串（仅限工作流文件）。

## 输出信封

Lobster 返回具有以下三种状态之一的 JSON 信封：

- `ok` → 成功完成
- `needs_approval` → 已暂停；需要 `requiresApproval.resumeToken` 才能恢复
- `cancelled` → 已明确拒绝或取消

该工具同时在 `content`（美化 JSON）和 `details`（原始对象）中展示信封。

## 批准

如果存在 `requiresApproval`，请检查提示并决定：

- `approve: true` → 恢复并继续副作用
- `approve: false` → 取消并完成工作流

使用 `approve --preview-from-stdin --limit N` 将 JSON 预览附加到批准请求，而无需自定义 jq/heredoc 粘合代码。恢复令牌现在很紧凑：Lobster 将工作流恢复状态存储在其状态目录下，并返回一个小令牌键。

## OpenProse

OpenProse 与 Lobster 搭配得很好：使用 `/prose` 来编排多智能体准备工作，然后运行 Lobster 管道进行确定性审批。如果一个 Prose 程序需要 Lobster，请通过 `tools.subagents.tools` 为子智能体允许 `lobster` 工具。参见 [OpenProse](/zh/prose)。

## 安全性

- **仅在本地进程中** — 工作流在网关进程内执行；插件本身不进行网络调用。
- **无密钥** — Lobster 不管理 OAuth；它调用负责此操作的 OpenClaw 工具。
- **感知沙箱** — 当工具上下文处于沙箱隔离状态时禁用。
- **加固** — 由嵌入式运行器强制执行超时和输出上限。

## 故障排除

- **`lobster timed out`** → 增加 `timeoutMs`，或拆分长管道。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或减少输出大小。
- **`lobster returned invalid JSON`** → 确保管道在工具模式下运行，并且仅打印 JSON。
- **`lobster failed`** → 检查网关日志以获取嵌入式运行器错误详细信息。

## 了解更多

- [插件](/zh/tools/plugin)
- [插件工具创作](/zh/plugins/building-plugins#registering-agent-tools)

## 案例研究：社区工作流

一个公开示例：一个“第二大脑” CLI + Lobster 管道，用于管理三个 Markdown 保险库（个人、合作伙伴、共享）。该 CLI 发出用于统计、收件箱列表和陈旧扫描的 JSON；Lobster 将这些命令链接到工作流中，例如 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync`，每个都有审批关卡。AI 在可用时处理判断（分类），否则回退到确定性规则。

- 主题：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 代码仓库：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相关

- [自动化与任务](/zh/automation) — 调度 Lobster 工作流
- [自动化概述](/zh/automation) — 所有自动化机制
- [工具概述](/zh/tools) — 所有可用的智能体工具
