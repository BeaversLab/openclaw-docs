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

如果启用了 `agents.defaults.sandbox`，非主会话可以使用 `agents.defaults.sandbox.workspaceRoot`Gateway(网关) 下的逐会话工作区来覆盖此项（请参阅 [Gateway(网关) configuration](/zh/gateway/configuration)）。

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

在工作区被观察到后，OpenClaw 还会为工作区路径保留一个状态目录证明标记。如果最近已验证的工作区消失或被清除，启动过程将拒绝静默重新播種 OpenClaw`BOOTSTRAP.md`；请恢复工作区或使用完整的机载重置，以便同时清除工作区和标记。

要完全禁用引导文件的创建（针对预播種的工作区），请设置：

```json5
{ agents: { defaults: { skipBootstrap: true } } }
```

## 内置工具

核心工具（读取/执行/编辑/写入及相关系统工具）始终可用，但受工具策略约束。`apply_patch` 是可选的，并由 `tools.exec.applyPatch` 控制。`TOOLS.md` **不**控制存在哪些工具；它是关于您希望如何使用它们的指南。

## Skills

OpenClaw 从以下位置加载 Skills（优先级从高到低）：

- 工作区：`<workspace>/skills`
- 项目代理 Skills：`<workspace>/.agents/skills`
- 个人代理 Skills：`~/.agents/skills`
- 托管/本地：`~/.openclaw/skills`
- 捆绑（随安装一起提供）
- 额外的 Skill 文件夹：`skills.load.extraDirs`

Skill 根目录可以包含分组文件夹，例如 `<workspace>/skills/personal/foo/SKILL.md`；Skill 仍以其扁平的 frontmatter 名称公开，例如 `foo`。

Skills 可以通过配置/环境进行限制（请参阅 [Gateway(网关) configuration](/zh/gateway/configuration) 中的 `skills`Gateway(网关)）。

## 运行时边界

嵌入式代理运行时归 OpenClaw 所有：模型发现、工具连接、提示组装、会话管理和渠道交付共享一个集成的运行时表面。

## 会话

会话记录作为 JSONL 存储在：

- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 是稳定的，由 OpenClaw 选择。
不会读取来自其他工具的旧会话文件夹。

## 流式传输时进行引导

运行中途到达的入站提示默认会被引导到当前运行中。
引导会在**当前助手轮次完成执行其工具调用后**、下一次 LLM 调用之前传递，并且不再跳过当前助手消息中剩余的工具调用。

`/queue steer` 是默认的活动运行行为。`/queue followup` 和
`/queue collect` 会让消息等待后续轮次而不是进行引导。
`/queue interrupt` 则会中止当前活动运行。有关队列和边界行为，请参阅 [队列](/zh/concepts/queue)
和 [引导队列](/zh/concepts/queue-steering)。

分块流式传输会在完成的助手块完成后立即发送；它**默认关闭** (`agents.defaults.blockStreamingDefault: "off"`)。
可以通过 `agents.defaults.blockStreamingBreak` 调整边界 (`text_end` 对比 `message_end`；默认为 text_end)。
使用 `agents.defaults.blockStreamingChunk` 控制软分块 (默认为
800-1200 个字符；优先段落分隔，然后是换行符；最后是句子)。
使用 `agents.defaults.blockStreamingCoalesce` 合并流式传输的块以减少
单行垃圾信息 (发送前基于空闲时间的合并)。非 Telegram 渠道需要
显式设置 `*.blockStreaming: true` 才能启用块回复。
详细的工具摘要会在工具开始时发出（无去抖动）；控制 UI
会在可用时通过代理事件流式传输工具输出。
更多详情：[流式传输 + 分块](/zh/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 和 `agents.defaults.models`）通过在**第一个** `/` 处分割来进行解析。

- 配置模型时请使用 `provider/model`。
- 如果模型 ID 本身包含 `/` (OpenRouter 风格)，请包含提供商前缀（例如：`openrouter/moonshotai/kimi-k2`）。
- 如果您省略提供商，OpenClaw 会首先尝试别名，然后尝试为该确切模型 ID 进行唯一配置提供商匹配，最后才回退到配置的默认提供商。如果该提供商不再暴露配置的默认模型，OpenClaw 将回退到第一个配置的提供商/模型，而不是显示已过时的已移除提供商默认值。

## 配置（最小）

至少设置：

- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）

---

_下一步：[群聊](/zh/channels/group-messages)_ 🦞

## 相关

- [代理工作区](/zh/concepts/agent-workspace)
- [多代理路由](/zh/concepts/multi-agent)
- [会话管理](/zh/concepts/session)
