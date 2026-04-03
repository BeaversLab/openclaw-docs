---
title: Lobster
summary: "OpenClaw 的类型化工作流运行时，具有可恢复的审批关卡。"
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

# Lobster

Lobster 是一个工作流程 Shell，允许 OpenClaw 将多步工具序列作为具有明确审批检查点的单一确定性操作运行。

Lobster 是位于独立后台工作之上的一个创作层。如果您遇到旧的 `ClawFlow` 术语，请将其视为围绕同一面向任务运行时区域的历史命名；当前面向操作员的 CLI 界面是 [`openclaw tasks`](/en/automation/tasks)。

## Hook

您的助手可以构建管理自身的工具。请求一个工作流，30 分钟后您就会得到一个 CLI 以及作为一次调用运行的管道。Lobster 是缺失的那一块：确定性管道、显式审批和可恢复状态。

## Why

如今，复杂的工作流需要多次往复的工具调用。每次调用都会消耗 tokens，并且 LLM 必须编排每一步。Lobster 将这种编排移入了一个类型化的运行时：

- **一次调用代替多次调用**：OpenClaw 运行一次 Lobster 工具调用并获得一个结构化结果。
- **内置审批**：副作用（发送邮件、发表评论）会暂停工作流，直到获得明确批准。
- **可恢复**：暂停的工作流会返回一个令牌；批准并恢复而无需重新运行所有内容。

## Why a DSL instead of plain programs?

Lobster 旨在保持小巧。目标不是“一种新语言”，而是一个可预测的、对 AI 友好的管道规范，具有一等公民的审批和恢复令牌。

- **内置审批/恢复**：普通程序可以提示人类，但如果没有您自己发明该运行时，它就无法使用持久令牌 _暂停和恢复_。
- **确定性 + 可审计性**：管道是数据，因此易于记录、比较差异、重放和审查。
- **受约束的 AI 表面**：微小的语法 + JSON 管道减少了“创造性”代码路径，并使验证变得现实。
- **内置安全策略**：超时、输出上限、沙箱检查和允许列表由运行时强制执行，而不是由每个脚本执行。
- **仍然可编程**：每一步都可以调用任何 CLI 或脚本。如果您想要 JS/TS，可以从代码生成 `.lobster` 文件。

## How it works

OpenClaw 在 **工具模式** 下启动本地 `lobster` CLI，并从 stdout 解析 JSON 信封。
如果管道暂停等待审批，该工具将返回一个 `resumeToken`，以便您稍后继续。

## Pattern: small CLI + JSON pipes + approvals

构建能够处理 JSON 的小型命令，然后将它们串联到一个 Lobster 调用中。（下面的示例命令名称——请替换为你自己的。）

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

如果流程请求批准，请使用令牌恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 触发工作流程；Lobster 执行步骤。批准闸门使副作用明确且可审计。

示例：将输入项映射到工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 纯 JSON LLM 步骤 (llm-task)

对于需要**结构化 LLM 步骤**的工作流程，启用可选的
`llm-task` 插件工具并从 Lobster 调用它。这使工作流程
保持确定性，同时仍允许你使用模型进行分类/摘要/起草。

启用工具：

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

在流程中使用它：

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

有关详细信息和配置选项，请参阅 [LLM Task](/en/tools/llm-task)。

## 工作流程文件 (.lobster)

Lobster 可以运行包含 `name`、`args`、`steps`、`env`、`condition` 和 `approval` 字段的 YAML/JSON 工作流程文件。在 OpenClaw 工具调用中，将 `pipeline` 设置为文件路径。

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

备注：

- `stdin: $step.stdout` 和 `stdin: $step.json` 传递上一步的输出。
- `condition` (或 `when`) 可以根据 `$step.approved` 对步骤进行门控。

## 安装 Lobster

在运行 Lobster CLI 的**同一主机**上安装 OpenClaw Gateway(网关)（请参阅 [Lobster repo](https://github.com/openclaw/lobster)），并确保 `lobster` 在 `PATH` 上。

## 启用工具

Lobster 是一个**可选**的插件工具（默认未启用）。

推荐（累加，安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或按代理：

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

除非你打算在限制性允许列表模式下运行，否则请避免使用 `tools.allow: ["lobster"]`。

注意：允许列表对于可选插件是可选启用的。如果你的允许列表仅命名
了插件工具（例如 `lobster`），OpenClaw 将保持核心工具启用。若要限制核心
工具，请在允许列表中也包含你想要的核心工具或组。

## 示例：电子邮件分类

没有 Lobster 时：

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

使用 Lobster 时：

```json
{
  "action": "run",
  "pipeline": "email.triage --limit 20",
  "timeoutMs": 30000
}
```

返回 JSON 信封（截断）：

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

一个工作流程。确定性。安全。

## 工具参数

### `run`

以工具模式运行管道。

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

在批准后继续已停止的工作流。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可选输入

- `cwd`：管道的相对工作目录（必须保持在当前进程工作目录内）。
- `timeoutMs`：如果超过此持续时间，则终止子进程（默认值：20000）。
- `maxStdoutBytes`：如果标准输出超过此大小，则终止子进程（默认值：512000）。
- `argsJson`：传递给 `lobster run --args-json` 的 JSON 字符串（仅限工作流文件）。

## 输出封装

Lobster 返回具有以下三种状态之一的 JSON 封装：

- `ok` → 已成功完成
- `needs_approval` → 已暂停；需要 `requiresApproval.resumeToken` 才能恢复
- `cancelled` → 已明确拒绝或取消

该工具在 `content`（美化 JSON）和 `details`（原始对象）中均展示了封装。

## 批准

如果存在 `requiresApproval`，请检查提示并决定：

- `approve: true` → 恢复并继续副作用
- `approve: false` → 取消并结束工作流

使用 `approve --preview-from-stdin --limit N` 将 JSON 预览附加到批准请求，而无需自定义 jq/heredoc 粘合代码。恢复令牌现在更加紧凑：Lobster 将工作流恢复状态存储在其状态目录下，并返回一个小令牌密钥。

## OpenProse

OpenProse 与 Lobster 搭配得很好：使用 `/prose` 编排多代理准备工作，然后运行 Lobster 管道进行确定性批准。如果 Prose 程序需要 Lobster，请通过 `tools.subagents.tools` 为子代理允许 `lobster` 工具。请参阅 [OpenProse](/en/prose)。

## 安全性

- **仅限本地子进程** — 插件本身不进行网络调用。
- **无密钥** — Lobster 不管理 OAuth；它调用负责管理的 OpenClaw 工具。
- **感知沙箱** — 当工具上下文处于沙箱隔离状态时，此功能被禁用。
- **加固** — `PATH` 上的可执行文件名称固定（`lobster`）；强制执行超时和输出上限。

## 故障排除

- **`lobster subprocess timed out`** → 增加 `timeoutMs`，或拆分长管道。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或减小输出大小。
- **`lobster returned invalid JSON`** → 确保管道在工具模式下运行并仅输出 JSON。
- **`lobster failed (code …)`** → 在终端中运行相同的管道以检查 stderr。

## 了解更多

- [插件](/en/tools/plugin)
- [插件工具创作](/en/plugins/building-plugins#registering-agent-tools)

## 案例研究：社区工作流

一个公开示例：一个“第二大脑”CLI + Lobster 管道，用于管理三个 Markdown 仓库（个人、合作伙伴、共享）。CLI 发出统计、收件箱列表和陈旧扫描的 JSON；Lobster 将这些命令链接到工作流中，如 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync`，每个都有审批门槛。AI 在可用时处理判断（分类），在不可用时回退到确定性规则。

- 主题：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 仓库：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

## 相关

- [Cron 与 Heartbeat](/en/automation/cron-vs-heartbeat) — 调度 Lobster 工作流
- [自动化概述](/en/automation) — 所有自动化机制
- [工具概述](/en/tools) — 所有可用的代理工具
