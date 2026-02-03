---
title: "Lobster"
summary: "用于 OpenClaw 的强类型工作流运行时，带可恢复的审批关卡。"
description: 用于 OpenClaw 的强类型工作流运行时 —— 可组合管线与审批关卡。
read_when:
  - 你需要带明确审批的确定性多步工作流
  - 你需要在不重复前面步骤的情况下恢复工作流
---

# Lobster

Lobster 是一个工作流 shell，让 OpenClaw 以单个确定性操作运行多步工具序列，并提供明确的审批检查点。

## Hook

你的助手可以构建管理自身的工具。提出一个工作流需求，30 分钟后你就能得到一套 CLI + 一次调用即可运行的管线。Lobster 是缺失的一块：确定性管线、明确审批、可恢复状态。

## Why

如今复杂工作流需要大量来回工具调用。每次调用都消耗 tokens，LLM 必须编排每一步。Lobster 将编排转移到强类型运行时：

- **一次调用而非多次**：OpenClaw 运行一次 Lobster 工具调用并获得结构化结果。
- **内置审批**：有副作用的步骤（发送邮件、发布评论）会暂停工作流，直到明确批准。
- **可恢复**：被暂停的工作流返回 token；批准后可恢复，无需重跑所有步骤。

## 为什么用 DSL 而不是普通程序？

Lobster 刻意保持小而可控。目标不是“新语言”，而是可预测、对 AI 友好的管线规范，内置审批与恢复 token。

- **批准/恢复内置**：普通程序可以询问人类，但无法在不自建运行时的情况下 _暂停并恢复_ 并持有持久 token。
- **确定性 + 可审计**：管线是数据，易于记录、diff、回放与审阅。
- **对 AI 的受限面**：小语法 + JSON 管道减少“创意”代码路径，使校验可行。
- **安全策略内置**：超时、输出上限、沙箱检查与 allowlist 由运行时强制，而不是每个脚本自行处理。
- **仍可编程**：每一步可调用任意 CLI 或脚本。若想用 JS/TS，可从代码生成 `.lobster` 文件。

## 工作原理

OpenClaw 在 **工具模式** 下启动本地 `lobster` CLI，并从 stdout 解析 JSON 信封。
若管线因审批暂停，工具会返回 `resumeToken`，便于稍后恢复。

## 模式：小 CLI + JSON 管道 + 审批

构建会输出 JSON 的小命令，再把它们串成一个 Lobster 调用。（以下命令名仅示例，可替换。）

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

若管线请求审批，用 token 恢复：

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

AI 触发工作流；Lobster 执行步骤。审批关卡保证副作用可控、可审计。

示例：把输入项映射为工具调用：

```bash
gog.gmail.search --query 'newer_than:1d' \
  | openclaw.invoke --tool message --action send --each --item-key message --args-json '{"provider":"telegram","to":"..."}'
```

## 仅 JSON 的 LLM 步骤（llm-task）

对需要 **结构化 LLM 步骤** 的工作流，启用可选的 `llm-task` 插件工具并从 Lobster 调用。这样既保持工作流确定性，又能用模型完成分类/摘要/草稿。

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

在管线中使用：

```lobster
openclaw.invoke --tool llm-task --action json --args-json '{
  "prompt": "Given the input email, return intent and draft.",
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

详情与配置选项见 [LLM Task](/zh/tools/llm-task)。

## 工作流文件（.lobster）

Lobster 可运行 YAML/JSON 工作流文件，支持 `name`、`args`、`steps`、`env`、`condition`、`approval` 字段。在 OpenClaw 工具调用中，将 `pipeline` 设为文件路径。

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

说明：

- `stdin: $step.stdout` 与 `stdin: $step.json` 用于传递上一步输出。
- `condition`（或 `when`）可根据 `$step.approved` 门控步骤。

## 安装 Lobster

在运行 OpenClaw Gateway 的 **同一主机** 上安装 Lobster CLI（见 [Lobster repo](https://github.com/openclaw/lobster)），并确保 `lobster` 在 `PATH` 中。
如需使用自定义二进制路径，请在工具调用中传入 **绝对路径** `lobsterPath`。

## 启用工具

Lobster 是 **可选** 插件工具（默认不启用）。

推荐（增量且安全）：

```json
{
  "tools": {
    "alsoAllow": ["lobster"]
  }
}
```

或按 agent：

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

避免使用 `tools.allow: ["lobster"]`，除非你希望在严格 allowlist 模式下运行。

注意：可选插件的 allowlist 为 opt-in。如果 allowlist 仅包含插件工具（如 `lobster`），OpenClaw 会保持核心工具启用。若要限制核心工具，也需把相应核心工具或组加入 allowlist。

## 示例：邮件分拣

没有 Lobster：

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

一次工作流。确定性。安全。

## 工具参数

### `run`

以工具模式运行管线。

```json
{
  "action": "run",
  "pipeline": "gog.gmail.search --query 'newer_than:1d' | email.triage",
  "cwd": "/path/to/workspace",
  "timeoutMs": 30000,
  "maxStdoutBytes": 512000
}
```

带参数运行工作流文件：

```json
{
  "action": "run",
  "pipeline": "/path/to/inbox-triage.lobster",
  "argsJson": "{\"tag\":\"family\"}"
}
```

### `resume`

审批后继续已暂停的工作流。

```json
{
  "action": "resume",
  "token": "<resumeToken>",
  "approve": true
}
```

### 可选输入

- `lobsterPath`：Lobster 二进制的绝对路径（省略则使用 `PATH`）。
- `cwd`：管线工作目录（默认为当前进程工作目录）。
- `timeoutMs`：超时终止子进程（默认：20000）。
- `maxStdoutBytes`：stdout 超过此大小即终止（默认：512000）。
- `argsJson`：传给 `lobster run --args-json` 的 JSON 字符串（仅工作流文件）。

## 输出信封

Lobster 返回三种状态之一的 JSON 信封：

- `ok` → 成功完成
- `needs_approval` → 已暂停；恢复需 `requiresApproval.resumeToken`
- `cancelled` → 明确拒绝或取消

工具会同时在 `content`（格式化 JSON）与 `details`（原始对象）中提供该信封。

## 审批

若存在 `requiresApproval`，请查看提示并决定：

- `approve: true` → 恢复并继续副作用步骤
- `approve: false` → 取消并结束工作流

使用 `approve --preview-from-stdin --limit N` 可在无需自定义 jq/heredoc 的情况下为审批请求附带 JSON 预览。恢复 token 现在更紧凑：Lobster 在状态目录中存储恢复状态，并返回一个小 token key。

## OpenProse

OpenProse 与 Lobster 配合良好：用 `/prose` 编排多 agent 准备，然后运行 Lobster 管线进行确定性审批。若 Prose 程序需要 Lobster，请通过 `tools.subagents.tools` 允许子 agent 使用 `lobster` 工具。见 [OpenProse](/zh/prose)。

## 安全

- **仅本地子进程** —— 插件本身不发起网络请求。
- **不管理密钥** —— Lobster 不处理 OAuth；它调用会处理 OAuth 的 OpenClaw 工具。
- **沙箱感知** —— 当工具上下文处于沙箱时禁用。
- **强化** —— 若指定 `lobsterPath` 必须为绝对路径；超时与输出上限强制执行。

## 排错

- **`lobster subprocess timed out`** → 增加 `timeoutMs`，或拆分长管线。
- **`lobster output exceeded maxStdoutBytes`** → 提高 `maxStdoutBytes` 或减小输出。
- **`lobster returned invalid JSON`** → 确保管线以工具模式运行且只输出 JSON。
- **`lobster failed (code …)`** → 在终端运行同一管线检查 stderr。

## 了解更多

- [插件](/zh/plugin)
- [插件工具编写](/zh/plugins/agent-tools)

## 案例：社区工作流

公开示例：一个“第二大脑”CLI + Lobster 管线管理三个 Markdown vault（个人、伴侣、共享）。CLI 输出 JSON 统计、收件箱列表与陈旧扫描；Lobster 将这些命令串成 `weekly-review`、`inbox-triage`、`memory-consolidation` 与 `shared-task-sync` 等工作流，并加入审批关卡。AI 可用时负责判断（分类），不可用时回退到确定性规则。

- Thread: https://x.com/plattenschieber/status/2014508656335770033
- Repo: https://github.com/bloomedai/brain-cli
