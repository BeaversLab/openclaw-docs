---
summary: "Agent runtime (embedded pi-mono), workspace contract, and 会话 bootstrap"
read_when:
  - Changing agent runtime, workspace bootstrap, or 会话 behavior
title: "Agent Runtime"
---

# Agent Runtime 🤖

OpenClaw 运行单个嵌入式 agent 运行时，该运行时派生自 **pi-mono**。

## Workspace (required)

OpenClaw 使用单个代理工作区目录 (`agents.defaults.workspace`) 作为代理用于工具和上下文的**唯一**工作目录 (`cwd`)。

建议：使用 `openclaw setup` 创建 `~/.openclaw/openclaw.json`（如果缺失）并初始化工作区文件。

完整的工作区布局 + 备份指南：[Agent workspace](/zh/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以通过 `agents.defaults.sandbox.workspaceRoot` 下的特定会话工作区覆盖此设置（请参阅
[Gateway 配置](/zh/gateway/configuration)）。

## Bootstrap files (injected)

在 `agents.defaults.workspace` 内部，OpenClaw 期望包含以下用户可编辑的文件：

- `AGENTS.md` — 操作说明 + “记忆”
- `SOUL.md` — 人设、边界、语气
- `TOOLS.md` — 用户维护的工具说明（例如 `imsg`、`sag`、约定）
- `BOOTSTRAP.md` — 一次性首次运行仪式（完成后删除）
- `IDENTITY.md` — 代理名称/氛围/表情符号
- `USER.md` — 用户资料 + 首选称呼

在新会话的第一个回合，OpenClaw 将这些文件的内容直接注入到 agent 上下文中。

空白文件将被跳过。大文件会被修剪并使用标记截断，以保持提示精简（读取文件以获取完整内容）。

如果文件缺失，OpenClaw 会注入一行“缺失文件”标记（并且 `openclaw setup` 将创建一个安全的默认模板）。

`BOOTSTRAP.md` 仅针对**全新的工作区**创建（不存在其他引导文件）。如果在完成仪式后将其删除，则在后续重启时不应该重新创建它。

要完全禁用引导文件的创建（对于预填充的工作区），请设置：

```json5
{ agent: { skipBootstrap: true } }
```

## Built-in tools

核心工具（read/exec/edit/write 和相关系统工具）始终可用，但受工具策略约束。`apply_patch` 是可选的，并由
`tools.exec.applyPatch` 控制。`TOOLS.md` **不**控制存在哪些工具；它是关于*你*希望如何使用它们的指南。

## 技能（Skills）

OpenClaw 从三个位置加载技能（如果名称冲突，工作区优先）：

- 内置（随安装附送）
- 托管/本地： `~/.openclaw/skills`
- 工作区： `<workspace>/skills`

Skills 可以通过 config/env 进行限制（参见 [Gateway(网关) configuration](/zh/gateway/configuration) 中的 `skills`）。

## pi-mono 集成

OpenClaw 重用了 pi-mono 代码库的部分内容（模型/工具），但**会话管理、发现和工具连接由 OpenClaw 拥有**。

- 没有 pi-coding 代理运行时。
- 不会查询任何 `~/.pi/agent` 或 `<workspace>/.pi` 设置。

## 会话（Sessions）

会话记录以 JSONL 格式存储在：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 是稳定的，由 OpenClaw 选择。
不会读取旧的 Pi/Tau 会话文件夹。

## 流式传输时的引导

当队列模式为 `steer` 时，入站消息会被注入到当前运行中。
队列会在**每次工具调用之后**检查；如果存在排队的消息，
当前助手消息中剩余的工具调用将被跳过（工具错误结果
为“由于排队的用户消息而跳过。”），然后在下一个助手响应之前注入排队的用户
消息。

当队列模式为 `followup` 或 `collect` 时，入站消息将一直保留，直到
当前回合结束，然后新的代理回合将使用排队的负载开始。请参阅
[Queue](/zh/concepts/queue) 了解模式 + 防抖/上限行为。

分块流式传输会在完成助手块后立即发送；它
**默认关闭** (`agents.defaults.blockStreamingDefault: "off"`)。
通过 `agents.defaults.blockStreamingBreak` 调整边界 (`text_end` vs `message_end`; 默认为 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制软块分块（默认为
800–1200 字符；首选段落分隔，然后是换行符；最后是句子）。
使用 `agents.defaults.blockStreamingCoalesce` 合并流式块以减少
单行垃圾信息（发送前基于空闲的合并）。非 Telegram 渠道需要
显式的 `*.blockStreaming: true` 来启用块回复。
详细的工具摘要在工具开始时发出（无防抖）；控制 UI
在可用时通过代理事件流式传输工具输出。
更多详情：[Streaming + chunking](/zh/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）通过在**第一个** `/` 处分割来解析。

- 配置模型时请使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会将输入视为别​​名或**默认提供商**的模型（仅在模型 ID 中没有 `/` 时有效）。

## 配置 (最小)

至少设置：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）

---

_下一节：[Group Chats](/zh/channels/group-messages)_ 🦞

import zh from "/components/footer/zh.mdx";

<zh />
