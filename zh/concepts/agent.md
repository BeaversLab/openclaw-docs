---
summary: "Agent 运行时（内嵌 p-mono）、工作区契约与会话引导"
read_when:
  - 修改 Agent 运行时、工作区引导或会话行为时
---
# Agent 运行时 🤖

OpenClaw 运行一个源自 **p-mono** 的单一内嵌 Agent 运行时。

## 工作区（必需）

OpenClaw 使用单一的 Agent 工作区目录 (`agents.defaults.workspace`) 作为工具和上下文的**唯一**工作目录 (`cwd`)。

建议：使用 `openclaw setup` 在缺失时创建 `~/.openclaw/openclaw.json` 并初始化工作区文件。

工作区完整结构与备份指南：[Agent workspace](/zh/concepts/agent-workspace)

如果启用 `agents.defaults.sandbox`，非主会话可在 `agents.defaults.sandbox.workspaceRoot` 下使用按会话划分的工作区来覆盖此设置（见
[Gateway configuration](/zh/gateway/configuration)）。

## 引导文件（注入）

在 `agents.defaults.workspace` 内，OpenClaw 期望以下用户可编辑文件：
- `AGENTS.md` - 操作说明 + memory
- `SOUL.md` - persona、边界、语气
- `TOOLS.md` - 用户维护的工具备注（例如 `imsg`、`sag`、约定）
- `BOOTSTRAP.md` - 一次性的首次运行仪式（完成后删除）
- `IDENTITY.md` - Agent 名称/氛围/emoji
- `USER.md` - 用户画像 + 首选称呼

在新会话的首个回合，OpenClaw 会将这些文件的内容直接注入到 Agent 上下文中。

空文件会被跳过。大文件会被裁剪并截断，同时附带标记以保持提示词精简（完整内容请查看文件本身）。

如果文件缺失，OpenClaw 会注入一行“missing file”标记（且 `openclaw setup` 会创建安全的默认模板）。

`BOOTSTRAP.md` 仅在**全新工作区**（没有其他引导文件）时创建。若在完成仪式后删除它，后续重启不应再创建。

要完全禁用引导文件创建（用于预置工作区），设置：

```json5
{ agent: { skipBootstrap: true } }
```

## 内置工具

核心工具（read/exec/edit/write 及相关系统工具）始终可用，但受工具策略约束。
`apply_patch` 为可选项，由 `tools.exec.applyPatch` 进行门控。`TOOLS.md` **不会**控制
哪些工具存在；它只是你希望工具如何使用的指导。

## Skills

OpenClaw 从三个位置加载 skills（同名冲突时以 workspace 为准）：
- Bundled（随安装包提供）
- Managed/local: `~/.openclaw/skills`
- Workspace: `<workspace>/skills`

Skills 可由配置/环境变量门控（见 [Gateway configuration](/zh/gateway/configuration) 中的 `skills`）。

## p-mono 集成

OpenClaw 复用了 p-mono 代码库中的部分内容（models/tools），但**会话管理、发现与工具连线由 OpenClaw 自主负责**。

- 不使用 p-coding 的 agent 运行时。
- 不读取 `~/.pi/agent` 或 `<workspace>/.pi` 的设置。

## 会话

会话转录以 JSONL 形式存储在：
- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

会话 ID 由 OpenClaw 选择且保持稳定。
不会读取旧的 Pi/Tau 会话目录。

## 流式期间的引导

当队列模式为 `steer` 时，入站消息会注入到当前运行中。
队列会在**每次工具调用后**检查；若有排队消息存在，当前 assistant 消息中剩余的工具调用会被跳过
（错误工具结果为 "Skipped due to queued user message."），然后在下一次 assistant 响应之前注入排队的用户消息。

当队列模式为 `followup` 或 `collect` 时，入站消息会被暂存直到当前回合结束，随后以排队载荷启动新的 agent 回合。
有关模式与去抖/容量行为，参见 [Queue](/zh/concepts/queue)。

Block streaming 会在 assistant 块完成时立即发送；它**默认关闭**（`agents.defaults.blockStreamingDefault: "off"`）。
可通过 `agents.defaults.blockStreamingBreak` 调整边界（`text_end` vs `message_end`，默认 text_end）。
使用 `agents.defaults.blockStreamingChunk` 控制软分块（默认 800-1200 字符；优先段落换行，其次换行，最后按句子）。
通过 `agents.defaults.blockStreamingCoalesce` 合并流式块以减少单行刷屏（基于空闲的发送前合并）。
非 Telegram 渠道需要显式设置 `*.blockStreaming: true` 才启用块回复。
Verbose 的工具摘要会在工具开始时输出（无去抖）；Control UI 在可用时通过 agent 事件流式输出工具结果。
更多细节：[Streaming + chunking](/zh/concepts/streaming)。

## 模型引用

配置中的模型引用（例如 `agents.defaults.model` 与 `agents.defaults.models`）会按**第一个** `/` 分割解析。

- 配置模型时使用 `provider/model`。
- 如果模型 ID 本身包含 `/`（OpenRouter 风格），请包含 provider 前缀（示例：`openrouter/moonshotai/kimi-k2`）。
- 如果省略 provider，OpenClaw 会将输入视作别名或**默认 provider** 的模型（仅在模型 ID 中没有 `/` 时生效）。

## 配置（最低要求）

至少设置：
- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈建议）

---

*下一步: [群聊](/zh/concepts/group-messages)* 🦞
