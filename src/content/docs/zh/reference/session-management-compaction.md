---
summary: "深入剖析：会话存储 + 副本、生命周期以及（自动）压缩内部机制"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "会话管理深入剖析"
---

# 会话管理与压缩（深度解析）

本文档解释了 OpenClaw 如何端到端地管理会话：

- **会话路由**（入站消息如何映射到 `sessionKey`）
- **会话存储**（`sessions.json`）及其跟踪内容
- **副本持久化**（`*.jsonl`）及其结构
- **转录整理**（运行前的特定提供者修复）
- **上下文限制**（上下文窗口 vs 跟踪的 token）
- **压缩**（手动 + 自动压缩）以及在何处挂接预压缩工作
- **静默维护**（例如不应产生用户可见输出的内存写入）

如果您想先了解更高级的概述，请从以下内容开始：

- [/concepts/会话](/en/concepts/session)
- [/concepts/compaction](/en/concepts/compaction)
- [/concepts/memory](/en/concepts/memory)
- [/concepts/memory-search](/en/concepts/memory-search)
- [/concepts/会话-pruning](/en/concepts/session-pruning)
- [/reference/transcript-hygiene](/en/reference/transcript-hygiene)

---

## 单一事实来源：Gateway(网关)

OpenClaw 的设计围绕单一 **Gateway(网关) 进程**展开，该进程拥有会话状态。

- UI（macOS 应用、Web Control UI、TUI）应向 Gateway(网关) 查询会话列表和 Token 计数。
- 在远程模式下，会话文件位于远程主机上；“检查本地 Mac 文件”无法反映 Gateway(网关) 正在使用的内容。

---

## 两个持久化层

OpenClaw 在两个层中持久化会话：

1. **会话存储 (`sessions.json`)**
   - 键/值映射：`sessionKey -> SessionEntry`
   - 小型、可变、可安全编辑（或删除条目）
   - 跟踪会话元数据（当前会话 ID、最后活动时间、切换开关、Token 计数器等）

2. **Transcript (`<sessionId>.jsonl`)**
   - 具有树结构的仅追加 Transcript（条目包含 `id` + `parentId`）
   - 存储实际对话 + 工具调用 + 压缩摘要
   - 用于为未来的轮次重建模型上下文

---

## 磁盘位置

对于每个代理，在 Gateway(网关) 主机上：

- 存储：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcripts：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主题会话：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 通过 `src/config/sessions.ts` 解析这些位置。

---

## 存储维护和磁盘控制

会话持久化具有针对 `sessions.json` 和 transcript 产物的自动维护控制 (`session.maintenance`)：

- `mode`：`warn`（默认）或 `enforce`
- `pruneAfter`：过期条目年龄截止（默认 `30d`）
- `maxEntries`：限制 `sessions.json` 中的条目数（默认 `500`）
- `rotateBytes`：当 `sessions.json` 超出大小时进行轮换（默认 `10mb`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 副本档案的保留（默认：与 `pruneAfter` 相同；`false` 禁用清理）
- `maxDiskBytes`：可选的会话目录预算
- `highWaterBytes`：清理后的可选目标（默认为 `maxDiskBytes` 的 `80%`）

磁盘预算清理的执行顺序（`mode: "enforce"`）：

1. 首先移除最旧的已归档或孤立副本文件。
2. 如果仍高于目标，则驱逐最旧的会话条目及其副本文件。
3. 持续进行，直到使用量达到或低于 `highWaterBytes`。

在 `mode: "warn"` 中，OpenClaw 会报告潜在的驱逐，但不会更改存储/文件。

按需运行维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 会话和运行日志

独立的 Cron 运行也会创建会话条目/副本，并且它们具有专门的保留控制：

- `cron.sessionRetention`（默认 `24h`）从会话存储中修剪旧的独立 Cron 运行会话（`false` 禁用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 文件（默认值：`2_000_000` 字节和 `2000` 行）。

---

## 会话密钥（`sessionKey`）

`sessionKey` 标识您所在的*对话存储桶*（路由 + 隔离）。

常见模式：

- 主/直接聊天（每个代理）：`agent:<agentId>:<mainKey>`（默认 `main`）
- 群组：`agent:<agentId>:<channel>:group:<id>`
- 房间/渠道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆盖）

规范规则记录在 [/concepts/会话](/en/concepts/session)。

---

## 会话 ID（`sessionId`）

每个 `sessionKey` 指向一个当前的 `sessionId`（继续对话的副本文件）。

经验法则：

- **重置**（`/new`、`/reset`）为该 `sessionKey` 创建一个新的 `sessionId`。
- **每日重置**（默认为网关主机本地时间凌晨 4:00）在重置边界后的下一条消息上创建一个新的 `sessionId`。
- **闲置过期**（`session.reset.idleMinutes` 或旧版 `session.idleMinutes`）在闲置窗口后收到消息时创建一个新的 `sessionId`。当同时配置了每日重置和闲置过期时，以先过期的为准。
- **线程父级分支保护**（`session.parentForkMaxTokens`，默认 `100000`）会在父会话过大时跳过父级逐字稿分支；新线程将从头开始。设置 `0` 可禁用此功能。

实现细节：决策在 `src/auto-reply/reply/session.ts` 的 `initSessionState()` 中进行。

---

## Session store schema (`sessions.json`)

存储的值类型是 `src/config/sessions.ts` 中的 `SessionEntry`。

主要字段（非详尽列表）：

- `sessionId`：当前逐字稿 ID（文件名由此派生，除非设置了 `sessionFile`）
- `updatedAt`：最后活动时间戳
- `sessionFile`：可选的显式逐字稿路径覆盖
- `chatType`：`direct | group | room`（有助于 UI 和发送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：用于群组/渠道标记的元数据
- 开关：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（每会话覆盖）
- 模型选择：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- 令牌计数器（尽力而为/取决于提供商）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：针对此会话密钥自动压缩完成的频率
- `memoryFlushAt`：上次预压缩内存刷新的时间戳
- `memoryFlushCompactionCount`：上次刷新运行时的压缩计数

存储区是可以安全编辑的，但 Gateway(网关) 是权威来源：它可能会在会话运行时重写或重新填充条目。

---

## 转录结构 (`*.jsonl`)

转录由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

该文件是 JSONL 格式：

- 第一行：会话头部 (`type: "session"`，包括 `id`、`cwd`、`timestamp`、可选的 `parentSession`)
- 随后：包含 `id` + `parentId` 的会话条目（树状结构）

值得注意的条目类型：

- `message`：用户/助手/工具结果 消息
- `custom_message`：扩展注入的*确实*进入模型上下文的消息（可以从 UI 中隐藏）
- `custom`：*不*进入模型上下文的扩展状态
- `compaction`：持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：导航树分支时的持久化摘要

OpenClaw 故意*不*“修正”转录；Gateway(网关) 使用 `SessionManager` 来读写它们。

---

## 上下文窗口与跟踪的 Token

有两个不同的概念很重要：

1. **模型上下文窗口**：每个模型的硬性上限（模型可见的 Token）
2. **会话存储计数器**：写入 `sessions.json` 的滚动统计信息（用于 /status 和仪表板）

如果您正在调整限制：

- 上下文窗口来自模型目录（并且可以通过配置覆盖）。
- 存储中的 `contextTokens` 是运行时估算/报告值；不要将其视为严格保证。

更多信息，请参阅 [/token-use](/en/reference/token-use)。

---

## 压缩：它是什么

压缩将较旧的对话摘要为记录在 `compaction` 中的持久化条目，并保留最近的邮件不变。

压缩后，后续轮次将看到：

- 压缩摘要
- `firstKeptEntryId` 之后的邮件

压缩是**持久化**的（不像会话修剪）。请参阅 [/concepts/会话-pruning](/en/concepts/session-pruning)。

---

## 自动压缩何时发生（Pi 运行时）

在嵌入式 Pi 代理中，自动压缩在两种情况下触发：

1. **溢出恢复**：模型返回上下文溢出错误 → 压缩 → 重试。
2. **阈值维护**：在成功的一轮之后，当：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的上下文窗口
- `reserveTokens` 是为提示和下一个模型输出预留的余量

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

- 如果 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 会提高它。
- 默认下限是 `20000` 个令牌。
- 设置 `agents.defaults.compaction.reserveTokensFloor: 0` 以禁用下限。
- 如果已经更高，OpenClaw 则保持不变。

原因：在压缩变得不可避免之前，为多轮“内务处理”（如内存写入）留出足够的余量。

实现：`ensurePiCompactionReserveTokens()` 中的 `src/agents/pi-settings.ts`
（从 `src/agents/pi-embedded-runner.ts` 调用）。

---

## 用户可见的界面

您可以通过以下方式观察压缩和会话状态：

- `/status`（在任何聊天会话中）
- `openclaw status` (CLI)
- `openclaw sessions` / `sessions --json`
- 详细模式：`🧹 Auto-compaction complete` + 压缩计数

---

## 静默内务处理 (`NO_REPLY`)

OpenClaw 支持用于后台任务的“静默”轮次，在这些任务中用户不应看到中间输出。

约定：

- 助手以其输出以 `NO_REPLY` 开头，以表示“不向用户发送回复”。
- OpenClaw 在交付层剥离/抑制了此内容。

截至 `2026.1.10`，OpenClaw 还会在部分块以 `NO_REPLY` 开头时抑制**草稿/打字流（draft/typing streaming）**，以便静默操作不会在轮次中途泄漏部分输出。

---

## 预压缩“内存刷新”（已实现）

目标：在自动压缩发生之前，运行一个静默代理轮次，将持久化状态写入磁盘（例如代理工作区中的 `memory/YYYY-MM-DD.md`），以便压缩无法删除关键上下文。

OpenClaw 使用**阈值前刷新（pre-threshold flush）**方法：

1. 监控会话上下文使用情况。
2. 当它超过“软阈值”（低于 Pi 的压缩阈值）时，向代理运行静默的“立即写入内存”指令。
3. 使用 `NO_REPLY` 以便用户看不到任何内容。

配置（`agents.defaults.compaction.memoryFlush`）：

- `enabled`（默认：`true`）
- `softThresholdTokens`（默认：`4000`）
- `prompt`（刷新轮次的用户消息）
- `systemPrompt`（为刷新轮次附加的额外系统提示）

注意事项：

- 默认提示/系统提示包含一个 `NO_REPLY` 提示以抑制交付。
- 刷新在每个压缩周期运行一次（在 `sessions.json` 中跟踪）。
- 刷新仅针对嵌入式 Pi 会话运行（CLI 后端会跳过它）。
- 当会话工作区是只读的（`workspaceAccess: "ro"` 或 `"none"`）时，将跳过刷新。
- 有关工作区文件布局和写入模式，请参阅[内存](/en/concepts/memory)。

Pi 还在扩展 API 中公开了一个 `session_before_compact` 钩子，但 OpenClaw 的刷新逻辑目前位于 Gateway(网关) 端。

---

## 故障排查清单

- 会话密钥错误？首先从 [/concepts/会话](/en/concepts/session) 开始，并确认 `sessionKey` 中的 `/status`。
- 存储与记录不匹配？确认 Gateway(网关) 主机和 `openclaw status` 中的存储路径。
- 压缩垃圾信息？检查：
  - 模型上下文窗口（太小）
  - 压缩设置（`reserveTokens` 对于模型窗口来说过高会导致更早的压缩）
  - 工具结果膨胀：启用/调整会话修剪
- 静默轮次泄漏？确认回复以 `NO_REPLY`（精确标记）开头，并且您所在的版本包含流抑制修复。
