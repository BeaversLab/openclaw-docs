---
summary: "Agent runtime (embedded pi-mono), workspace contract, and 会话 bootstrap"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent Runtime"
---

# Agent Runtime 🤖

OpenClaw 运行单个嵌入式 agent 运行时，该运行时派生自 **pi-mono**。

## Workspace (required)

OpenClaw 使用单一代理工作区目录 (`agents.defaults.workspace`) 作为工具和上下文的代理 **唯一** 工作目录 (`cwd`)。

建议：如果 `~/.openclaw/openclaw.json` 缺失，请使用 `openclaw setup` 创建它并初始化工作区文件。

完整的工作区布局 + 备份指南：[Agent workspace](/zh/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以使用 `agents.defaults.sandbox.workspaceRoot` 下的基于会话的工作区覆盖此设置（参见 [Gateway 网关 configuration](/zh/gateway/configuration)）。

## Bootstrap files (injected)

在 `agents.defaults.workspace` 内部，OpenClaw 预期这些用户可编辑文件：

- `AGENTS.md` — 操作说明 + “记忆”
- `SOUL.md` — 人格、边界、语气
- `TOOLS.md` — 用户维护的工具说明（例如 `imsg`，`sag`，约定）
- `BOOTSTRAP.md` — 一次性首次运行仪式（完成后删除）
- `IDENTITY.md` — 代理名称/氛围/表情符号
- `USER.md` — 用户资料 + 首选地址

在新会话的第一个回合，OpenClaw 将这些文件的内容直接注入到 agent 上下文中。

空白文件将被跳过。大文件会被修剪并使用标记截断，以保持提示精简（读取文件以获取完整内容）。

如果文件缺失，OpenClaw 会注入单行“缺失文件”标记（并且 `openclaw setup` 将创建一个安全的默认模板）。

`BOOTSTRAP.md` 仅为 **全新工作区** 创建（不存在其他引导文件）。如果在完成仪式后删除它，则在后续重启时不应该重新创建。

要完全禁用引导文件的创建（对于预填充的工作区），请设置：

```json5
{ agent: { skipBootstrap: true } }
```

## Built-in tools

核心工具（读取/执行/编辑/写入和相关系统工具）始终可用，但受工具策略约束。`apply_patch` 是可选的，并由 `tools.exec.applyPatch` 限制。`TOOLS.md` **不** 控制哪些工具存在；它只是关于 _你_ 希望如何使用它们的指导。

## 技能（Skills）

OpenClaw 从三个位置加载技能（如果名称冲突，工作区优先）：

- 内置（随安装附送）
- 托管/本地：`~/.openclaw/skills`
- 工作区：`<workspace>/skills`

Skills 可以通过配置/环境变量进行控制（参见 [Gateway 网关 configuration](/zh/gateway/configuration) 中的 `skills`）。

## pi-mono 集成

OpenClaw 重用了 pi-mono 代码库的部分内容（模型/工具），但**会话管理、发现和工具连接由 OpenClaw 拥有**。

- 没有 pi-coding 代理运行时。
- 不会查询 `~/.pi/agent` 或 `<workspace>/.pi` 设置。

## 会话（Sessions）

会话记录以 JSONL 格式存储在：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 是稳定的，由 OpenClaw 选择。
**不会**读取旧的 Pi/Tau 会话文件夹。

## 流式传输时的引导

当队列模式为 `steer` 时，传入的消息会被注入到当前运行中。
队列在**每次工具调用后**检查；如果存在排队的消息，
当前助手消息中的剩余工具调用将被跳过（错误工具
结果包含“Skipped due to queued user message.”），然后在下一次助手响应之前
注入排队的用户消息。

当队列模式为 `followup` 或 `collect` 时，入站消息将被保留，直到当前轮次结束，然后新的代理轮次将使用排队中的负载启动。有关模式 + 防抖/上限行为，请参见 [Queue](/zh/concepts/queue)。

分块流式传输 会在助手块完成后立即发送已完成的块；它是**默认关闭的** (`agents.defaults.blockStreamingDefault: "off"`)。
通过 `agents.defaults.blockStreamingBreak` 调整边界 (`text_end` vs `message_end`; 默认为 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制软块分块 (默认为
800–1200 字符; 优先段落中断，然后是换行; 句子最后)。
使用 `agents.defaults.blockStreamingCoalesce` 合并流式块以减少
单行垃圾信息 (发送前基于空闲的合并)。非 Telegram 频道需要
显式的 `*.blockStreaming: true` 来启用块回复。
详细的工具 摘要在工具开始时发出 (无防抖); 控制界面
在可用时通过代理事件流式传输工具输出。
更多详情: [Streaming + chunking](/zh/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）通过在**第一个** `/` 处分割进行解析。

- 在配置模型时请使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略了提供商，OpenClaw 会将输入视为 **默认提供商** 的别名或模型（仅当模型 ID 中没有 `/` 时才有效）。

## 配置 (最小)

至少设置：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）

---

_下一节：[Group Chats](/zh/channels/group-messages)_ 🦞

import zh from '/components/footer/zh.mdx';

<zh />
