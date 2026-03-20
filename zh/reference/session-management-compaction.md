---
summary: "深入探讨：会话存储 + 副本、生命周期及（自动）压缩内部机制"
read_when:
  - 你需要调试会话 ID、副本 JSONL 或 sessions. 字段
  - 你正在更改自动压缩行为或添加“预压缩”维护
  - 你想要实现内存刷新或静默系统轮次
title: "会话管理深入探讨"
---

# 会话管理与压缩（深入探讨）

本文档解释了 OpenClaw 如何端到端地管理会话：

- **会话路由**（传入消息如何映射到 `sessionKey`）
- **会话存储**（`sessions.json`）及其跟踪的内容
- **副本持久化**（`*.jsonl`）及其结构
- **副本整理**（运行前提供商特定的修正）
- **上下文限制**（上下文窗口 vs 跟踪的 token）
- **压缩**（手动 + 自动压缩）以及挂钩预压缩工作的位置
- **静默维护**（例如不应产生用户可见输出的内存写入）

如果你想先了解更高层次的概述，请从以下开始：

- [/concepts/会话](/zh/concepts/session)
- [/concepts/compaction](/zh/concepts/compaction)
- [/concepts/会话-pruning](/zh/concepts/session-pruning)
- [/reference/transcript-hygiene](/zh/reference/transcript-hygiene)

---

## 事实来源：Gateway

OpenClaw 围绕拥有会话状态的单个 **Gateway(网关) 进程** 设计。

- UI（macOS 应用、Web 控制界面、TUI）应查询 Gateway(网关) 以获取会话列表和 token 计数。
- 在远程模式下，会话文件位于远程主机上；“检查本地 Mac 文件”无法反映 Gateway(网关) 正在使用的实际内容。

---

## 两个持久化层

OpenClaw 在两个层中持久化会话：

1. **会话存储 (`sessions.json`)**
   - 键/值映射：`sessionKey -> SessionEntry`
   - 小型、可变、可安全编辑（或删除条目）
   - 跟踪会话元数据（当前会话 ID、上次活动、切换开关、token 计数器等）

2. **副本 (`<sessionId>.jsonl`)**
   - 具有树结构的仅追加副本（条目具有 `id` + `parentId`）
   - 存储实际对话 + 工具调用 + 压缩摘要
   - 用于为未来的轮次重建模型上下文

---

## 磁盘位置

每个 Agent，在 Gateway(网关) 主机上：

- 存储：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 记录：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主题会话：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 通过 `src/config/sessions.ts` 解析这些内容。

---

## 存储维护和磁盘控制

会话持久化具有针对 `sessions.json` 和记录文件的自动维护控制（`session.maintenance`）：

- `mode`：`warn`（默认）或 `enforce`
- `pruneAfter`：过期条目的时间限制（默认 `30d`）
- `maxEntries`：限制 `sessions.json` 中的条目（默认 `500`）
- `rotateBytes`：当 `sessions.json` 超大时轮换（默认 `10mb`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 记录归档的保留期（默认：与 `pruneAfter` 相同；`false` 禁用清理）
- `maxDiskBytes`：可选的会话目录预算
- `highWaterBytes`：清理后的可选目标（默认 `80%` of `maxDiskBytes`）

磁盘预算清理的执行顺序（`mode: "enforce"`）：

1. 首先删除最旧的归档或孤立的记录文件。
2. 如果仍高于目标，则逐出最旧的会话条目及其记录文件。
3. 持续执行，直到使用量达到或低于 `highWaterBytes`。

在 `mode: "warn"` 中，OpenClaw 报告潜在的逐出操作，但不会修改存储/文件。

按需运行维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 会话和运行日志

独立的 Cron 运行也会创建会话条目/记录，并且它们有专用的保留控制：

- `cron.sessionRetention`（默认 `24h`）从会话存储中清除旧的独立 Cron 运行会话（`false` 禁用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 裁剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 文件（默认值：`2_000_000` 字节和 `2000` 行）。

---

## 会话密钥 (`sessionKey`)

`sessionKey` 标识你所在的*对话存储桶*（路由 + 隔离）。

常见模式：

- 主/直接聊天（每个代理）：`agent:<agentId>:<mainKey>`（默认 `main`）
- 群组：`agent:<agentId>:<channel>:group:<id>`
- 房间/渠道 (Discord/Slack)：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆盖）

规范规则记录在 [/concepts/会话](/zh/concepts/session) 中。

---

## 会话 ID (`sessionId`)

每个 `sessionKey` 指向一个当前的 `sessionId`（继续对话的转录文件）。

经验法则：

- **重置** (`/new`, `/reset`) 会为该 `sessionKey` 创建一个新的 `sessionId`。
- **每日重置**（默认为网关主机当地时间凌晨 4:00）会在重置边界后的下一条消息创建一个新的 `sessionId`。
- **空闲过期** (`session.reset.idleMinutes` 或旧版 `session.idleMinutes`) 会在空闲窗口后有消息到达时创建一个新的 `sessionId`。当同时配置了每日和空闲时，以先到期者为准。
- **线程父级分支保护** (`session.parentForkMaxTokens`，默认 `100000`) 会在父会话过大时跳过父转录分支；新线程将从头开始。设置 `0` 以禁用。

实现细节：决定发生在 `src/auto-reply/reply/session.ts` 的 `initSessionState()` 中。

---

## 会话存储模式 (`sessions.json`)

存储的值类型是 `src/config/sessions.ts` 中的 `SessionEntry`。

关键字段（非详尽）：

- `sessionId`：当前会话 ID（除非设置了 `sessionFile`，否则文件名由此得出）
- `updatedAt`：上次活动时间戳
- `sessionFile`：可选的显式会话路径覆盖
- `chatType`：`direct | group | room`（有助于 UI 和发送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：用于组/渠道标签的元数据
- 切换选项：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（每次会话覆盖）
- 模型选择：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- Token 计数器（尽力而为 / 取决于提供商）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：自动压缩针对此会话密钥完成的频率
- `memoryFlushAt`：上次预压缩内存刷新的时间戳
- `memoryFlushCompactionCount`：上次刷新运行时的压缩计数

存储区可以安全编辑，但 Gateway(网关) 拥有最高权限：它可能会在会话运行时重写或重新填充条目。

---

## 会话记录结构（`*.jsonl`）

会话记录由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

该文件为 JSONL 格式：

- 第一行：会话头（`type: "session"`，包含 `id`、`cwd`、`timestamp`，可选的 `parentSession`）
- 随后是：带有 `id` + `parentId`（树）的会话条目

值得注意的条目类型：

- `message`：用户/助手/工具结果消息
- `custom_message`：扩展注入的、*确实*会进入模型上下文的消息（可以在 UI 中隐藏）
- `custom`：不进入模型上下文的扩展状态
- `compaction`：持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：在导航树分支时持久化的摘要

OpenClaw 故意**不**“修正”文稿；Gateway 使用 `SessionManager` 对其进行读写。

---

## 上下文窗口与追踪的 token

有两个不同的概念很重要：

1. **模型上下文窗口**：每个模型的硬性上限（模型可见的 token）
2. **会话存储计数器**：写入 `sessions.json` 的滚动统计信息（用于 /status 和仪表板）

如果您正在调整限制：

- 上下文窗口来自模型目录（并且可以通过配置覆盖）。
- 存储中的 `contextTokens` 是一个运行时估算/报告值；不要将其视为严格保证。

欲了解更多信息，请参阅 [/token-use](/zh/reference/token-use)。

---

## 压缩：它是什么

压缩将较旧的对话总结为文稿中持久化的 `compaction` 条目，并保持最近的消息完整。

压缩后，未来的轮次将看到：

- 压缩摘要
- `firstKeptEntryId` 之后的消息

压缩是**持久化**的（与会话修剪不同）。请参阅 [/concepts/会话-pruning](/zh/concepts/session-pruning)。

---

## 自动压缩何时发生（Pi 运行时）

在嵌入式 Pi 代理中，自动压缩在以下两种情况下触发：

1. **溢出恢复**：模型返回上下文溢出错误 → 压缩 → 重试。
2. **阈值维护**：在成功的一轮之后，当满足以下条件时：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的上下文窗口
- `reserveTokens` 是为提示和下一个模型输出保留的余量

这些是 Pi 运行时的语义（OpenClaw 消费事件，但 Pi 决定何时压缩）。

---

## 压缩设置 (`reserveTokens`, `keepRecentTokens`)

Pi 的压缩设置位于 Pi 设置中：

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw 还为嵌入式运行强制执行一个安全下限：

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 会将其提升。
- 默认下限为 `20000` 个 token。
- 将 `agents.defaults.compaction.reserveTokensFloor: 0` 设置为禁用下限。
- 如果当前值已经更高，OpenClaw 将保持不变。

原因：在压缩变得不可避免之前，为多轮“维护”（如内存写入）留出足够的余量。

实现：`src/agents/pi-settings.ts` 中的 `ensurePiCompactionReserveTokens()`
（从 `src/agents/pi-embedded-runner.ts` 调用）。

---

## 用户可见的界面

您可以通过以下方式观察压缩和会话状态：

- `/status`（在任何聊天会话中）
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- 详细模式：`🧹 Auto-compaction complete` + 压缩计数

---

## 静默维护 (`NO_REPLY`)

OpenClaw 支持用于后台任务的“静默”轮次，在此期间用户不应看到中间输出。

约定：

- 助手以 `NO_REPLY` 开头输出，以表示“不向用户传递回复”。
- OpenClaw 在交付层剥离/抑制此内容。

自 `2026.1.10` 起，当部分数据块以 `NO_REPLY` 开头时，OpenClaw 还会抑制 **草稿/打字流式传输**，以防止静默操作在轮次中途泄露部分输出。

---

## 压缩前“内存刷新”（已实现）

目标：在自动压缩发生之前，运行一个静默的代理轮次，将持久化
状态写入磁盘（例如代理工作区中的 `memory/YYYY-MM-DD.md`），以防止压缩
擦除关键上下文。

OpenClaw 使用 **预阈值刷新** 方法：

1. 监控会话上下文使用情况。
2. 当超过“软阈值”（低于 Pi 的压缩阈值）时，向代理运行静默的
   “立即写入内存”指令。
3. 使用 `NO_REPLY` 以便用户什么也看不到。

配置 (`agents.defaults.compaction.memoryFlush`)：

- `enabled`（默认值：`true`）
- `softThresholdTokens`（默认值：`4000`）
- `prompt`（刷新轮次的用户消息）
- `systemPrompt`（为刷新轮次附加的额外系统提示词）

说明：

- 默认提示词/系统提示词包含一个 `NO_REPLY` 提示以抑制发送。
- 该刷新操作在每个压缩周期运行一次（在 `sessions.json` 中跟踪）。
- 该刷新操作仅针对嵌入式 Pi 会话运行（CLI 后端会跳过它）。
- 当会话工作区为只读时（`workspaceAccess: "ro"` 或 `"none"`），将跳过该刷新操作。
- 有关工作区文件布局和写入模式，请参阅 [Memory](/zh/concepts/memory)。

Pi 还在扩展 API 中暴露了一个 `session_before_compact` 钩子，但 OpenClaw 的刷新逻辑目前位于 Gateway(网关) 端。

---

## 故障排查清单

- 会话密钥错误？请从 [/concepts/会话](/zh/concepts/session) 开始，并确认 `/status` 中的 `sessionKey`。
- 存储与记录不匹配？请从 `openclaw status` 确认 Gateway(网关) 主机和存储路径。
- 压缩垃圾信息？检查：
  - 模型上下文窗口（太小）
  - 压缩设置（`reserveTokens` 相对于模型窗口过高可能导致提前压缩）
  - 工具结果膨胀：启用/调整会话修剪
- 静默回合泄漏？请确认回复以 `NO_REPLY`（精确标记）开头，并且您使用的版本包含流式抑制修复。

import zh from "/components/footer/zh.mdx";

<zh />
