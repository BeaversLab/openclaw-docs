---
title: "Session 管理深度解析"
summary: "深度解析：会话存储 + 转录、生命周期与（自动）压缩内部机制"
read_when:
  - 需要调试 session id、transcript JSONL 或 sessions.json 字段
  - 正在修改自动压缩行为或添加“压缩前”清理
  - 想实现记忆写入或静默系统回合
---
# 会话管理与压缩（深度解析）

本文解释 OpenClaw 端到端如何管理会话：

- **会话路由**（入站消息如何映射到 `sessionKey`）
- **会话存储**（`sessions.json`）及其跟踪内容
- **转录持久化**（`*.jsonl`）及结构
- **转录清理**（运行前的 provider 特定修正）
- **上下文限制**（上下文窗口 vs 追踪 token）
- **压缩**（手动 + 自动压缩）及压缩前工作挂钩点
- **静默清理**（例如不应产生用户可见输出的记忆写入）

如需更高层概览，请先看：
- [/concepts/session](/zh/concepts/session)
- [/concepts/compaction](/zh/concepts/compaction)
- [/concepts/session-pruning](/zh/concepts/session-pruning)
- [/reference/transcript-hygiene](/zh/reference/transcript-hygiene)

---

## 事实来源：Gateway

OpenClaw 围绕单一 **Gateway 进程** 设计，它拥有会话状态。

- UI（macOS app、web Control UI、TUI）应通过 Gateway 查询会话列表与 token 计数。
- 远程模式下，会话文件在远程主机；“查看本地 Mac 文件”不会反映 Gateway 实际使用的内容。

---

## 两层持久化

OpenClaw 使用两层持久化会话：

1) **会话存储（`sessions.json`）**
   - 键/值映射：`sessionKey -> SessionEntry`
   - 体积小、可变、可安全编辑（或删除条目）
   - 跟踪会话元数据（当前 session id、最近活动、开关、token 计数等）

2) **转录（`<sessionId>.jsonl`）**
   - 追加式转录，树结构（条目含 `id` + `parentId`）
   - 存储实际对话 + 工具调用 + 压缩摘要
   - 用于重建后续回合的模型上下文

---

## 磁盘位置

每个 agent 在 Gateway 主机上：

- 存储：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 转录：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram topic 会话：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 通过 `src/config/sessions.ts` 解析这些路径。

---

## 会话键（`sessionKey`）

`sessionKey` 标识你处于哪个“会话桶”（路由 + 隔离）。

常见模式：

- 主/直聊（按 agent）：`agent:<agentId>:<mainKey>`（默认 `main`）
- 群聊：`agent:<agentId>:<channel>:group:<id>`
- 房间/频道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆盖）

规范规则见 [/concepts/session](/zh/concepts/session)。

---

## 会话 id（`sessionId`）

每个 `sessionKey` 指向当前 `sessionId`（继续对话的转录文件）。

经验规则：
- **Reset**（`/new`、`/reset`）会为该 `sessionKey` 创建新的 `sessionId`。
- **日重置**（默认 Gateway 主机本地时间凌晨 4:00）会在重置边界后的下一条消息创建新的 `sessionId`。
- **空闲过期**（`session.reset.idleMinutes` 或旧的 `session.idleMinutes`）会在空闲窗口后收到消息时创建新 `sessionId`。若同时设置日重置与空闲过期，以先到者为准。

实现细节：决策发生在 `src/auto-reply/reply/session.ts` 的 `initSessionState()`。

---

## 会话存储 schema（`sessions.json`）

存储值类型为 `src/config/sessions.ts` 中的 `SessionEntry`。

关键字段（非穷举）：

- `sessionId`：当前转录 id（若未设置 `sessionFile`，文件名由此派生）
- `updatedAt`：最近活动时间戳
- `sessionFile`：可选的转录路径覆盖
- `chatType`：`direct | group | room`（用于 UI 与发送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：用于群/频道标签的元数据
- 开关：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（按会话覆盖）
- 模型选择：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- Token 计数（尽力而为 / 依赖 provider）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：该 session key 完成自动压缩的次数
- `memoryFlushAt`：上次压缩前记忆写入的时间戳
- `memoryFlushCompactionCount`：上次写入发生时的 compaction 计数

该存储可安全编辑，但 Gateway 具有最终权威：会话运行时可能重写或重建条目。

---

## 转录结构（`*.jsonl`）

转录由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

文件为 JSONL：
- 第一行：会话头（`type: "session"`，包含 `id`、`cwd`、`timestamp`、可选 `parentSession`）
- 之后：带 `id` + `parentId` 的会话条目（树结构）

关键条目类型：
- `message`：用户/助手/toolResult 消息
- `custom_message`：扩展注入的消息，**会** 进入模型上下文（可在 UI 中隐藏）
- `custom`：扩展状态，**不会** 进入模型上下文
- `compaction`：持久化压缩摘要，包含 `firstKeptEntryId` 与 `tokensBefore`
- `branch_summary`：在树分支导航时持久化的摘要

OpenClaw **不会** 主动“修复”转录；Gateway 使用 `SessionManager` 读写它们。

---

## 上下文窗口 vs 追踪 token

有两个概念需要区分：

1) **模型上下文窗口**：每个模型的硬上限（模型可见 token 数）
2) **会话存储计数器**：写入 `sessions.json` 的滚动统计（用于 /status 与 dashboard）

调参时注意：
- 上下文窗口来自模型目录（可在配置中覆盖）。
- 存储中的 `contextTokens` 是运行时估算/报告值，不应视为严格保证。

更多参见 [/token-use](/zh/token-use)。

---

## 压缩：它是什么

压缩会将较早对话摘要为转录中的 `compaction` 条目，并保留近期消息。

压缩后，后续回合可见：
- 压缩摘要
- `firstKeptEntryId` 之后的消息

压缩是 **持久化** 的（不同于会话修剪）。参见 [/concepts/session-pruning](/zh/concepts/session-pruning)。

---

## 自动压缩何时发生（Pi runtime）

在内置 Pi agent 中，自动压缩在两种情况下触发：

1) **溢出恢复**：模型返回上下文溢出错误 → 压缩 → 重试。
2) **阈值维护**：成功回合后，当：

`contextTokens > contextWindow - reserveTokens`

其中：
- `contextWindow` 为模型上下文窗口
- `reserveTokens` 为提示 + 下一次模型输出预留的头部空间

这是 Pi runtime 语义（OpenClaw 消费事件，但由 Pi 决定何时压缩）。

---

## 压缩设置（`reserveTokens`、`keepRecentTokens`）

Pi 的压缩设置位于 Pi settings：

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000
  }
}
```

OpenClaw 还为内置运行增加安全下限：

- 若 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 会提高它。
- 默认下限为 `20000` tokens。
- 设置 `agents.defaults.compaction.reserveTokensFloor: 0` 可禁用该下限。
- 若已高于下限，OpenClaw 不会修改。

原因：在压缩不可避免之前，留出足够空间进行多回合“清理”（如记忆写入）。

实现：`src/agents/pi-settings.ts` 中的 `ensurePiCompactionReserveTokens()`
（由 `src/agents/pi-embedded-runner.ts` 调用）。

---

## 用户可见界面

你可以通过以下方式观察压缩与会话状态：

- `/status`（任意聊天会话）
- `openclaw status`（CLI）
- `openclaw sessions` / `sessions --json`
- 详细模式：`🧹 Auto-compaction complete` + compaction 计数

---

## 静默清理（`NO_REPLY`）

OpenClaw 支持“静默”回合，用于不应让用户看到中间输出的后台任务。

约定：
- 助手输出以 `NO_REPLY` 开头，表示“不要向用户发送回复”。
- OpenClaw 在发送层会剥离/抑制该内容。

自 `2026.1.10` 起，OpenClaw 也会在 **草稿/typing 流** 中抑制以 `NO_REPLY` 开头的部分输出，避免静默操作在回合中泄漏。

---

## 压缩前“记忆写入”（已实现）

目标：在自动压缩发生前运行一个静默的代理回合，将持久状态写入磁盘
（例如 agent 工作区的 `memory/YYYY-MM-DD.md`），避免压缩抹掉关键上下文。

OpenClaw 使用 **阈值前写入** 策略：

1) 监控会话上下文用量。
2) 当超过“软阈值”（低于 Pi 的压缩阈值）时，运行静默的“现在写入记忆”指令。
3) 使用 `NO_REPLY`，让用户不可见。

配置（`agents.defaults.compaction.memoryFlush`）：
- `enabled`（默认：`true`）
- `softThresholdTokens`（默认：`4000`）
- `prompt`（写入回合的用户消息）
- `systemPrompt`（写入回合追加的系统提示）

说明：
- 默认 prompt/system prompt 中包含 `NO_REPLY` 提示，以抑制发送。
- 每个压缩周期只运行一次写入（在 `sessions.json` 中跟踪）。
- 仅对内置 Pi 会话运行（CLI backend 会跳过）。
- 当会话工作区只读时会跳过（`workspaceAccess: "ro"` 或 `"none"`）。
- 工作区文件布局与写入模式参见 [Memory](/zh/concepts/memory)。

Pi 也在扩展 API 中提供 `session_before_compact` 钩子，但 OpenClaw 目前的写入逻辑在 Gateway 侧。

---

## 故障排查清单

- session key 错误？从 [/concepts/session](/zh/concepts/session) 入手，并在 `/status` 中确认 `sessionKey`。
- 存储 vs 转录不一致？确认 Gateway 主机与 `openclaw status` 中的存储路径。
- 压缩过于频繁？检查：
  - 模型上下文窗口（是否过小）
  - 压缩设置（`reserveTokens` 过高会导致提前压缩）
  - 工具结果膨胀：启用/调整会话修剪
- 静默回合泄漏？确认回复以 `NO_REPLY`（精确 token）开头，且版本包含流式抑制修复。
