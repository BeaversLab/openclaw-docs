---
summary: "Agent 运行时、工作区合约和会话引导"
read_when:
  - Changing agent runtime, workspace bootstrap, or session behavior
title: "Agent runtime"
---

OpenClaw 运行一个**单一的嵌入式代理运行时** —— 每个 Gateway(网关) 一个代理进程，拥有自己的工作区、引导文件和会话存储。本页面涵盖了该运行时协议：工作区必须包含什么、哪些文件会被注入，以及会话如何基于其进行引导。

## 工作区（必需）

OpenClaw 使用单个代理工作区目录 (`agents.defaults.workspace`) 作为代理用于工具和上下文的**唯一**工作目录 (`cwd`)。

建议：使用 `openclaw setup` 创建 `~/.openclaw/openclaw.json`（如果缺失）并初始化工作区文件。

完整的工作区布局 + 备份指南：[Agent workspace](/zh/concepts/agent-workspace)

如果启用了 `agents.defaults.sandbox`，非主会话可以通过 `agents.defaults.sandbox.workspaceRoot`Gateway(网关) 下的基于会话的工作区来覆盖此设置（请参阅 [Gateway configuration](/zh/gateway/configuration)）。

## 引导文件（注入）

在 `agents.defaults.workspace` 内部，OpenClaw 期望这些用户可编辑的文件：

- `AGENTS.md` - 操作指令 + “记忆”
- `SOUL.md` - 人格、边界、语气
- `TOOLS.md` - 用户维护的工具说明（例如 `imsg`、`sag`、约定）
- `BOOTSTRAP.md` - 一次性首次运行仪式（完成后删除）
- `IDENTITY.md` - 代理名称/氛围/表情符号
- `USER.md` - 用户资料 + 首选地址

在新会话的第一轮中，OpenClaw 会将这些文件的内容注入到系统提示词的项目上下文中。

空白文件将被跳过。大文件将被修剪并使用标记截断，以保持提示精简（读取文件以获取完整内容）。

如果文件缺失，OpenClaw 会注入一行“missing file”标记（并且 `openclaw setup` 将创建一个安全的默认模板）。

`BOOTSTRAP.md` 仅针对**全新的工作区**创建（不存在其他引导文件）。在其待处理期间，OpenClaw 会将其保留在项目上下文中，并添加针对初始仪式的系统提示词引导，而不是将其复制到用户消息中。如果你在完成仪式后将其删除，则在后续重启时不应该重新创建它。

要完全禁用启动文件创建（对于预填充的工作区），请设置：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 内置工具

核心工具（read/exec/edit/write 和相关系统工具）始终可用，但受工具策略约束。`apply_patch` 是可选的，并由 `tools.exec.applyPatch` 控制。`TOOLS.md` 并**不**控制存在哪些工具；它是关于*你*希望如何使用它们的指导。

## Skills

OpenClaw 从以下位置加载 skills（优先级从高到低）：

- 工作区：`<workspace>/skills`
- 项目代理 skills：`<workspace>/.agents/skills`
- 个人代理 skills：`~/.agents/skills`
- 托管/本地：`~/.openclaw/skills`
- 捆绑（随安装附带）
- 额外的 skill 文件夹：`skills.load.extraDirs`

Skill 根目录可以包含分组的文件夹，例如 `<workspace>/skills/personal/foo/SKILL.md`；该 Skill 仍然通过其扁平的 frontmatter 名称公开，例如 `foo`。

Skills 可以通过 config/env 进行控制（请参阅 [Gateway configuration](/zh/gateway/configuration) 中的 `skills`Gateway(网关)）。

## Runtime boundaries

嵌入式 agent 运行时归 OpenClaw 所有：模型发现、工具连接、提示组装、会话管理和渠道传递共享一个集成的运行时表面。

## Sessions

会话记录作为 JSONL 存储在：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 是稳定的，由 OpenClaw 选择。
不会读取来自其他工具的旧版会话文件夹。

## Steering while streaming

在运行期间到达的入站提示默认会被引导到当前运行中。
引导操作在**当前助手轮次完成执行其工具调用之后**、下一次 LLM 调用之前传递，并且不再跳过当前助手消息中的剩余工具调用。

`/queue steer` 是默认的活跃运行行为。`/queue followup` 和
`/queue collect` 使消息等待后续轮次而不是进行引导。
`/queue interrupt` 则中止活跃运行。请参阅 [Queue](/zh/concepts/queue)
和 [Steering queue](/zh/concepts/queue-steering) 了解队列和边界行为。

分块流式传输在助手块完成后立即发送它们；它**默认关闭** (`agents.defaults.blockStreamingDefault: "off"`)。
通过 `agents.defaults.blockStreamingBreak` 调整边界 (`text_end` 对比 `message_end`；默认为 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制软块分块（默认为
800-1200 字符；优先段落中断，然后是换行；最后是句子）。
使用 `agents.defaults.blockStreamingCoalesce` 合并流块以减少
单行垃圾信息（发送前基于空闲的合并）。非 Telegram 渠道需要
显式的 `*.blockStreaming: true` 来启用块回复。
详细的工具摘要会在工具开始时发出（无防抖）；控制 UI
在可用时通过代理事件流式传输工具输出。
更多详情：[Streaming + chunking](/zh/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）通过在**第一个** `/` 处分割来解析。

- 配置模型时使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会先尝试别名，然后尝试该确切模型 ID 的唯一已配置提供商匹配，只有在那之后才会回退
  到配置的默认提供商。如果该提供商不再公开
  配置的默认模型，OpenClaw 将回退到第一个配置的
  提供商/模型，而不是显示过时的已移除提供商的默认值。

## 配置（最小）

至少，设置：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom` （强烈推荐）

---

_下一页：[Group Chats](/zh/channels/group-messages)_ 🦞

## 相关

- [Agent workspace](/zh/concepts/agent-workspace)
- [Multi-agent routing](/zh/concepts/multi-agent)
- [Session management](/zh/concepts/session)
