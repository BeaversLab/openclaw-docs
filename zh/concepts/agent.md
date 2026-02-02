---
summary: "Agent runtime（嵌入式 p-mono）、workspace 约定与会话引导"
read_when:
  - 需要修改 agent runtime、workspace bootstrap 或会话行为
title: "Agent Runtime"
---
# Agent Runtime 🤖

OpenClaw 运行一个源自 **p-mono** 的嵌入式 agent runtime。

## Workspace（必需）

OpenClaw 使用单一 agent workspace 目录（`agents.defaults.workspace`）作为 agent 的**唯一**工作目录（`cwd`），用于工具与上下文。

建议：使用 `openclaw setup` 在缺失时创建 `~/.openclaw/openclaw.json` 并初始化 workspace 文件。

完整 workspace 布局与备份指南见：[Agent workspace](/zh/concepts/agent-workspace)

若启用 `agents.defaults.sandbox`，非主会话可使用
`agents.defaults.sandbox.workspaceRoot` 下的按会话 workspace（见
[Gateway configuration](/zh/gateway/configuration)）。

## Bootstrap 文件（注入）

在 `agents.defaults.workspace` 中，OpenClaw 期望这些用户可编辑文件：
- `AGENTS.md` — 操作说明 + “memory”
- `SOUL.md` — persona、边界、语气
- `TOOLS.md` — 用户维护的工具说明（例如 `imsg`、`sag`、约定）
- `BOOTSTRAP.md` — 一次性首次运行仪式（完成后删除）
- `IDENTITY.md` — agent 名称/风格/emoji
- `USER.md` — 用户档案 + 首选称呼

在新会话的第一回合，OpenClaw 会将这些文件的内容直接注入 agent 上下文。

空文件会被跳过。大文件会被裁剪并截断（带标记）以保持提示精简（完整内容请阅读文件本身）。

如果文件缺失，OpenClaw 会注入一行 “missing file” 标记（`openclaw setup` 会创建安全的默认模板）。

`BOOTSTRAP.md` 只会在 **全新 workspace**（不存在其他 bootstrap 文件）时创建。完成仪式后删除它，后续重启不应再生成。

若要完全禁用 bootstrap 文件创建（用于预先填充的 workspace），设置：

```json5
{ agent: { skipBootstrap: true } }
```

## 内置工具

核心工具（read/exec/edit/write 及相关系统工具）始终可用，但受工具策略限制。
`apply_patch` 是可选的，并由 `tools.exec.applyPatch` 控制。
`TOOLS.md` **不** 控制工具是否存在；它只是你希望如何使用工具的指南。

## Skills

OpenClaw 从三个位置加载技能（重名时 workspace 优先）：
- Bundled（随安装提供）
- Managed/local：`~/.openclaw/skills`
- Workspace：`<workspace>/skills`

技能可由配置/环境 gating（见 [Gateway configuration](/zh/gateway/configuration) 中的 `skills`）。

## p-mono 集成

OpenClaw 复用 p-mono 的部分代码（models/tools），但 **会话管理、发现与工具接线由 OpenClaw 负责**。

- 不使用 p-coding agent runtime。
- 不读取 `~/.pi/agent` 或 `<workspace>/.pi` 设置。

## Sessions

会话转录以 JSONL 存储于：
- `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

Session ID 由 OpenClaw 选择并保持稳定。
不会读取旧的 Pi/Tau 会话目录。

## 流式输出中的转向（steer）

当队列模式为 `steer` 时，入站消息会注入当前运行。
队列会在 **每次工具调用后** 检查；若存在排队消息，当前 assistant 消息剩余的工具调用将被跳过（返回错误工具结果，内容为 "Skipped due to queued user message."），然后在下一次 assistant 回复前注入排队的用户消息。

当队列模式为 `followup` 或 `collect` 时，入站消息会被暂存，直到当前回合结束，然后以排队 payload 启动新的 agent 回合。见 [Queue](/zh/concepts/queue) 了解模式与 debounce/cap 行为。

Block streaming 会在 assistant block 完成时立即发送；默认 **关闭**（`agents.defaults.blockStreamingDefault: "off"`）。
可通过 `agents.defaults.blockStreamingBreak` 调整边界（`text_end` 或 `message_end`；默认 `text_end`）。
通过 `agents.defaults.blockStreamingChunk` 控制软分块（默认 800–1200 字符；优先段落，其次换行，最后句子）。
使用 `agents.defaults.blockStreamingCoalesce` 合并流式 chunk 以减少单行刷屏（基于 idle 的合并再发送）。非 Telegram 频道需要显式 `*.blockStreaming: true` 才启用块回复。
Verbose 工具摘要在工具启动时发出（无 debounce）；Control UI 在可用时通过 agent 事件流式输出工具内容。
更多细节见 [Streaming + chunking](/zh/concepts/streaming)。

## Model refs

配置中的 model refs（例如 `agents.defaults.model` 与 `agents.defaults.models`）按 **第一个** `/` 分割。

- 配置模型时使用 `provider/model`。
- 若模型 ID 本身包含 `/`（OpenRouter 风格），请包含 provider 前缀（例：`openrouter/moonshotai/kimi-k2`）。
- 若省略 provider，OpenClaw 会将输入视为 alias 或 **默认 provider** 的模型（仅当模型 ID 中不含 `/` 时有效）。

## Configuration（最小）

最少需要设置：
- `agents.defaults.workspace`
- `channels.whatsapp.allowFrom`（强烈推荐）

---

*下一篇：[Group Chats](/zh/concepts/group-messages)* 🦞
