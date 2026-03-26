---
summary: "Agent 运行时、工作区合约和会话引导"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent Runtime"
---

# Agent 运行时

OpenClaw 运行一个嵌入式单一 agent 运行时。

## Workspace (required)

OpenClaw 使用单一代理工作区目录 (`agents.defaults.workspace`) 作为工具和上下文的代理 **唯一** 工作目录 (`cwd`)。

建议：如果 `~/.openclaw/openclaw.json` 缺失，请使用 `openclaw setup` 创建它并初始化工作区文件。

完整的工作区布局 + 备份指南：[Agent workspace](/zh/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以通过 `agents.defaults.sandbox.workspaceRoot` 下的每个会话工作区来覆盖此设置（请参阅 [Gateway(网关) configuration](/zh/gateway/configuration)）。

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

Skills 可以通过配置/环境进行限制（请参阅 [Gateway(网关) configuration](/zh/gateway/configuration) 中的 `skills`）。

## 运行时边界

嵌入式 agent 运行时建立在 Pi agent 核心之上（模型、工具和提示管道）。会话管理、发现、工具连接和渠道交付是该核心之上的 OpenClaw 拥有的层。

## 会话

会话记录以 JSONL 格式存储在：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 是稳定的，由 OpenClaw 选择的。
不会读取来自其他工具的旧会话文件夹。

## 流式传输时的引导

当队列模式为 `steer` 时，入站消息会被注入到当前运行中。
队列会在**每次工具调用后**进行检查；如果存在排队消息，
当前助手消息中剩余的工具调用将被跳过（错误工具
结果为“由于排队的用户消息而跳过。”），然后在下一个助手响应之前注入排队的用户
消息。

当队列模式为 `followup` 或 `collect` 时，入站消息将被保留，直到
当前回合结束，然后新的 agent 回合将使用排队的负载开始。请参阅
[Queue](/zh/concepts/queue) 了解模式 + 防抖/上限行为。

分块流式传输会在助手块完成后立即发送它们；它
**默认关闭** (`agents.defaults.blockStreamingDefault: "off"`)。
通过 `agents.defaults.blockStreamingBreak` 调整边界 (`text_end` vs `message_end`；默认为 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制软块分块 (默认为
800–1200 个字符；优先段落中断，然后是换行符；最后是句子)。
使用 `agents.defaults.blockStreamingCoalesce` 合并流式块以减少
单行刷屏 (发送前基于空闲时间的合并)。非 Telegram 渠道需要
显式的 `*.blockStreaming: true` 来启用块回复。
详细的工具摘要在工具开始时发出 (无防抖)；控制 UI
在可用时通过代理事件流式传输工具输出。
更多详情：[Streaming + chunking](/zh/concepts/streaming)。

## 模型引用

配置中的模型引用 (例如 `agents.defaults.model` 和 `agents.defaults.models`) 通过在 **第一个** `/` 处分割来解析。

- 配置模型时使用 `provider/model`。
- 如果模型 ID 本身包含 `/` (OpenRouter 风格)，请包含提供商前缀 (例如：`openrouter/moonshotai/kimi-k2`)。
- 如果省略提供商，OpenClaw 会将输入视为 **默认提供商** 的别名或模型 (仅当模型 ID 中没有 `/` 时才有效)。

## 配置 (最低要求)

至少，设置：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` (强烈推荐)

---

_下一节：[Group Chats](/zh/channels/group-messages)_ 🦞

import zh from "/components/footer/zh.mdx";

<zh />
