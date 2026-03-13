---
title: Lobster
summary: “用于 OpenClaw 的带可恢复审批门的类型化工作流运行时。”
description: 用于 OpenClaw 的类型化工作流运行时 —— 具有审批门的可组合管道。
read_when:
  - You want deterministic multi-step workflows with explicit approvals
  - You need to resume a workflow without re-running earlier steps
---

# Lobster

Lobster 是一个工作流 Shell，允许 OpenClaw 将多步工具序列作为具有明确审批检查点的单一确定性操作运行。

## Hook

您的助手可以构建管理自身的工具。请求一个工作流，30 分钟后您就会拥有一个 CLI 以及作为单次调用运行的管道。Lobster 是缺失的一环：确定性管道、明确审批和可恢复状态。

## Why

如今，复杂的工作流需要多次反复的工具调用。每次调用都会消耗 Token，并且 LLM 必须编排每一步。Lobster 将这种编排转移到了类型化运行时中：

- **一次调用而非多次**：OpenClaw 运行一次 Lobster 工具调用并获得结构化结果。
- **内置审批**：副作用（发送邮件、发布评论）会暂停工作流，直到获得明确批准。
- **可恢复**：暂停的工作流会返回一个令牌；批准后即可恢复，而无需重新运行所有内容。

## Why a DSL instead of plain programs?

Lobster 故意设计得很小。目标不是“一种新语言”，而是一个可预测的、对 AI 友好的管道规范，具有一等公民的审批和恢复令牌。

- **内置审批/恢复**：普通程序可以提示人类，但如果没有您自己发明该运行时，它无法通过持久化令牌 _暂停和恢复_。
- **确定性 + 可审计性**：管道即数据，因此易于记录、比较差异、重放和审查。
- **受限的 AI 表面**：微小的语法 + JSON 管道减少了“创造性”代码路径，并使验证变得现实可行。
- **内置安全策略**：超时、输出上限、沙箱检查和允许列表由运行时强制执行，而不是由每个脚本执行。
- **仍然可编程**：每一步都可以调用任何 CLI 或脚本。如果您想要 JS/TS，可以从代码生成 `.lobster` 文件。

## How it works

OpenClaw 在 **工具模式** 下启动本地 `lobster` CLI 并从 stdout 解析 JSON 信封。
如果管道暂停等待批准，工具将返回 `resumeToken`，以便您稍后继续。

## 模式：小型 CLI + JSON 管道 + 批准

构建使用 JSON 通信的微型命令，然后将它们链接到单个 Lobster 调用中。（下面的示例命令名称 — 请替换为您自己的。）

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

AI 触发工作流；Lobster 执行步骤。批准门使副作用变得明确且可审计。

示例：将输入项映射到工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 仅 JSON 的 LLM 步骤 (llm-task)

对于需要 **结构化 LLM 步骤** 的工作流，启用可选的
`llm-task` 插件工具并从 Lobster 调用它。这使得工作流
保持确定性，同时仍允许您使用模型进行分类/摘要/起草。

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

有关详细信息和配置选项，请参阅 [LLM Task](/zh/en/tools/llm-task)。

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

- `stdin: $step.stdout` 和 `stdin: $step.json` 传递先前步骤的输出。
- `condition`（或 `when`）可以基于 `$step.approved` 对步骤进行门控。

## 安装 Lobster

在运行 OpenClaw Gateway 的 **同一主机** 上安装 Lobster CLI（请参阅 [Lobster 仓库](https://github.com/openclaw/lobster)），并确保 `lobster` 在 `PATH` 上。

## 启用工具

Lobster 是一个 **可选** 的插件工具（默认未启用）。

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

除非您打算在限制性允许列表模式下运行，否则请避免使用 `tools.allow: ["lobster"]`。

注意：对于可选插件，允许列表是 opt-in（选择加入）的。如果您的允许列表仅命名插件工具（如 `lobster`），OpenClaw 将保持核心工具启用。要限制核心工具，请在允许列表中包含您想要的核心工具或组。

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

一个工作流。确定性。安全。

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

在批准后继续暂停的工作流。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可选输入

- `cwd`：管道的相对工作目录（必须停留在当前进程工作目录内）。
- `timeoutMs`：如果超过此持续时间，则终止子进程（默认值：20000）。
- `maxStdoutBytes`：如果 stdout 超过此大小，则终止子进程（默认值：512000）。
- `argsJson`：传递给 `lobster run --args-json` 的 JSON 字符串（仅限工作流文件）。

## 输出信封

Lobster 返回一个具有以下三种状态之一的 JSON 信封：

- `ok` → 成功完成
- `needs_approval` → 已暂停；需要 `requiresApproval.resumeToken` 才能恢复
- `cancelled` → 已明确拒绝或取消

该工具在 `content`（漂亮的 JSON）和 `details`（原始对象）中展示信封。

## 批准

如果存在 `requiresApproval`，请检查提示并决定：

- `approve: true` → 恢复并继续副作用
- `approve: false` → 取消并完成工作流

使用 `approve --preview-from-stdin --limit N` 将 JSON 预览附加到批准请求，而无需自定义 jq/heredoc 粘合代码。恢复令牌现在很紧凑：Lobster 在其状态目录下存储工作流恢复状态，并返回一个小的令牌键。

## OpenProse

OpenProse 与 Lobster 搭配得很好：使用 `/prose` 编排多智能体准备，然后运行 Lobster 管道进行确定性批准。如果 Prose 程序需要 Lobster，请通过 `tools.subagents.tools` 为子智能体允许 `lobster` 工具。参见 [OpenProse](/zh/en/prose)。

## 安全

- **仅限本地子进程** —— 插件本身不进行网络调用。
- **无密钥** —— Lobster 不管理 OAuth；它调用负责该工作的 OpenClaw 工具。
- **感知沙箱** —— 当工具上下文处于沙箱中时被禁用。
- **加固** —— 在 `PATH` 上具有固定的可执行文件名称 (`lobster`)；强制执行超时和输出上限。

## 故障排除

- **`lobster subprocess timed out`** → 增加 `timeoutMs`，或拆分长管道。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或减小输出大小。
- **`lobster returned invalid JSON`** → 确保管道在工具模式下运行且仅打印 JSON。
- **`lobster failed (code …)`** → 在终端中运行相同的管道以检查 stderr。

## 了解更多

- [插件](/zh/tools/plugin)
- [插件工具创作](/zh/plugins/agent-tools)

## 案例研究：社区工作流

一个公开示例：“第二大脑” CLI + 管理三个 Markdown 保险库（个人、伙伴、共享）的 Lobster 管道。CLI 发出统计信息、收件箱列表和陈旧扫描的 JSON；Lobster 将这些命令链接到工作流中，例如 `weekly-review`、`inbox-triage`、`memory-consolidation` 和 `shared-task-sync`，每个都有审批关卡。AI 在可用时处理判断（分类），在不可用时回退到确定性规则。

- 主题：[https://x.com/plattenschieber/status/2014508656335770033](https://x.com/plattenschieber/status/2014508656335770033)
- 仓库：[https://github.com/bloomedai/brain-cli](https://github.com/bloomedai/brain-cli)

import zh from '/components/footer/zh.mdx';

<zh />
