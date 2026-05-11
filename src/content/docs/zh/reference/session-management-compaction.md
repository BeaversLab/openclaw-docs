---
summary: "深入剖析：会话存储 + 副本、生命周期以及（自动）压缩内部机制"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding “pre-compaction” housekeeping
  - You want to implement memory flushes or silent system turns
title: "会话管理深入探讨"
---

OpenClaw 在以下领域端到端地管理会话：

- **会话路由** (入站消息如何映射到 `sessionKey`)
- **会话存储** (`sessions.json`) 及其跟踪内容
- **对话记录持久化** (`*.jsonl`) 及其结构
- **对话记录清理** (运行前的提供商特定修正)
- **上下文限制** (上下文窗口与已跟踪令牌的对比)
- **压缩** (手动和自动压缩) 以及挂钩压缩前工作的位置
- **静默维护** (不应产生用户可见输出的内存写入)

如果您想先了解更高层次的概述，请从以下内容开始：

- [会话管理](/zh/concepts/session)
- [压缩](/zh/concepts/compaction)
- [内存概述](/zh/concepts/memory)
- [内存搜索](/zh/concepts/memory-search)
- [会话修剪](/zh/concepts/session-pruning)
- [对话记录清理](/zh/reference/transcript-hygiene)

---

## 单一真实来源：Gateway(网关)

OpenClaw 的设计围绕拥有会话状态的单个 **Gateway(网关) 进程** 展开。

- UI (macOS 应用、Web 控制界面、TUI) 应查询 Gateway(网关) 以获取会话列表和令牌计数。
- 在远程模式下，会话文件位于远程主机上；“检查本地 Mac 文件”无法反映 Gateway(网关) 正在使用的内容。

---

## 两个持久化层

OpenClaw 在两层中持久化会话：

1. **会话存储 (`sessions.json`)**
   - 键/值映射：`sessionKey -> SessionEntry`
   - 小型、可变、可安全编辑（或删除条目）
   - 跟踪会话元数据（当前会话 ID、最后活动时间、切换开关、令牌计数器等）

2. **对话记录 (`<sessionId>.jsonl`)**
   - 具有树结构的仅追加对话记录（条目具有 `id` + `parentId`）
   - 存储实际的对话 + 工具调用 + 压缩摘要
   - 用于为未来的轮次重建模型上下文
   - 一旦活动对话记录超过检查点大小上限，就会跳过大型压缩前调试检查点，从而避免第二次巨大的
     `.checkpoint.*.jsonl` 复制。

---

## 磁盘位置

对于每个代理，在 Gateway(网关) 主机上：

- 存储：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcripts: `~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主题会话：`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 通过 `src/config/sessions.ts` 解析这些内容。

---

## 存储维护和磁盘控制

会话持久化具有自动维护控制（`session.maintenance`），用于 `sessions.json` 和记录副本：

- `mode`：`warn`（默认）或 `enforce`
- `pruneAfter`：过期条目的年龄截止（默认 `30d`）
- `maxEntries`：限制 `sessions.json` 中的条目数（默认 `500`）
- `rotateBytes`：当 `sessions.json` 超大时进行轮换（默认 `10mb`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 记录副本存档的保留期（默认：与 `pruneAfter` 相同；`false` 禁用清理）
- `maxDiskBytes`：可选的会话目录预算
- `highWaterBytes`：清理后的可选目标（默认 `80%` 的 `maxDiskBytes`）

正常的 Gateway(网关) 写入会对生产级上限进行批量 `maxEntries` 清理，因此存储可能会在下次高水位清理将其重写之前短暂超过配置的上限。`openclaw sessions cleanup --enforce` 仍然会立即应用配置的上限。

磁盘预算清理的执行顺序（`mode: "enforce"`）：

1. 首先移除最旧的已归档或孤立记录副本文件。
2. 如果仍高于目标，则驱逐最旧的会话条目及其记录副本文件。
3. 继续此操作，直到使用量达到或低于 `highWaterBytes`。

在 `mode: "warn"` 中，OpenClaw 会报告潜在的驱逐操作，但不会修改存储/文件。

按需运行维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 会话和运行日志

独立的 Cron 运行也会创建会话条目/记录副本，并且它们具有专用的保留控制：

- `cron.sessionRetention` (默认 `24h`) 会从会话存储中修剪旧的独立 cron 运行会话 (`false` 禁用)。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 文件 (默认值: `2_000_000` 字节和 `2000` 行)。

当 cron 强制创建一个新的独立运行会话时，它会在写入新行之前清理之前的 `cron:<jobId>` 会话条目。它会保留安全的偏好设置，例如 thinking/fast/verbose 设置、标签和显式用户选择的 模型/auth 覆盖项。它会丢弃环境对话上下文，例如 渠道/组 路由、发送或队列策略、提升、来源以及 ACP 运行时绑定，这样全新的独立运行就不会从旧运行中继承过时的传递或运行时权限。

---

## 会话密钥 (`sessionKey`)

`sessionKey` 标识你所在的*对话存储桶* (路由 + 隔离)。

常见模式：

- 主/直接聊天 (每个代理): `agent:<agentId>:<mainKey>` (默认 `main`)
- 组: `agent:<agentId>:<channel>:group:<id>`
- 房间/渠道 (Discord/Slack): `agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron: `cron:<job.id>`
- Webhook: `hook:<uuid>` (除非被覆盖)

规范规则记录于 [/concepts/会话](/zh/concepts/session)。

---

## 会话 ID (`sessionId`)

每个 `sessionKey` 指向一个当前的 `sessionId` (继续对话的转录文件)。

经验法则：

- **重置** (`/new`, `/reset`) 会为该 `sessionKey` 创建一个新的 `sessionId`。
- **每日重置** (默认为网关主机当地时间凌晨 4:00) 会在重置边界后的下一条消息上创建一个新的 `sessionId`。
- **空闲过期**（`session.reset.idleMinutes` 或旧版 `session.idleMinutes`）在消息于空闲窗口后到达时创建一个新的 `sessionId`。当同时配置了每日和空闲时，以先过期者为准。
- **系统事件**（心跳、定时任务唤醒、执行通知、网管记账）可能会更改会话行，但不会延长每日/空闲重置的新鲜度。重置轮换会在构建新的提示之前，丢弃为上一个会话排队的系统事件通知。
- **线程父分支保护**（`session.parentForkMaxTokens`，默认 `100000`）在父会话已经过大时跳过父逐字稿分支；新线程将从头开始。设置 `0` 可将其禁用。

实现细节：该决定发生在 `src/auto-reply/reply/session.ts` 的 `initSessionState()` 中。

---

## 会话存储架构（`sessions.json`）

存储的值类型是 `src/config/sessions.ts` 中的 `SessionEntry`。

主要字段（非详尽列表）：

- `sessionId`：当前逐字稿 ID（除非设置了 `sessionFile`，否则文件名派生自此）
- `sessionStartedAt`：当前 `sessionId` 的开始时间戳；每日重置
  新鲜度使用此时间。旧行可能会从 JSONL 会话头中派生它。
- `lastInteractionAt`：最后一次真实的用户/渠道交互时间戳；空闲重置
  新鲜度使用此时间，因此心跳、定时任务和执行事件不会保持会话
  处于活动状态。没有此字段的旧行会回退到恢复的会话开始
  时间用于空闲新鲜度。
- `updatedAt`：最后一次存储行变更时间戳，用于列出、修剪和
  记账。它不是每日/空闲重置新鲜度的权威依据。
- `sessionFile`：可选的显式逐字稿路径覆盖
- `chatType`：`direct | group | room`（有助于 UI 和发送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：用于群组/渠道标记的元数据
- 开关：
  - `thinkingLevel`，`verboseLevel`，`reasoningLevel`，`elevatedLevel`
  - `sendPolicy`（每个会话的覆盖）
- 模型选择：
  - `providerOverride`，`modelOverride`，`authProfileOverride`
- Token 计数（尽力而为 / 取决于提供商）：
  - `inputTokens`，`outputTokens`，`totalTokens`，`contextTokens`
- `compactionCount`：针对此会话密钥完成自动压缩的频率
- `memoryFlushAt`：上次预压缩内存刷新的时间戳
- `memoryFlushCompactionCount`：上次刷新运行时的压缩计数

存储是可以安全编辑的，但 Gateway(网关) 是权威来源：它可能会在会话运行时重写或重新填充条目。

---

## 脚本结构（`*.jsonl`）

脚本由 `@mariozechner/pi-coding-agent` 的 `SessionManager` 管理。

该文件为 JSONL 格式：

- 第一行：会话头（`type: "session"`，包括 `id`、`cwd`、`timestamp`，可选的 `parentSession`）
- 接下来：带有 `id` + `parentId`（树）的会话条目

值得注意的条目类型：

- `message`：用户/助手/工具结果消息
- `custom_message`：扩展注入的消息，*确实*进入模型上下文（可以从 UI 中隐藏）
- `custom`：*不*进入模型上下文的扩展状态
- `compaction`：带有 `firstKeptEntryId` 和 `tokensBefore` 的持久化压缩摘要
- `branch_summary`：导航树分支时的持久化摘要

OpenClaw 故意**不**“修复”脚本；Gateway(网关) 使用 `SessionManager` 来读取/写入它们。

---

## 上下文窗口与跟踪的 Token

有两个不同的概念很重要：

1. **模型上下文窗口**：每个模型的硬上限（模型可见的 Token）
2. **会话存储计数器**：写入 `sessions.json` 的滚动统计数据（用于 /status 和仪表板）

如果你正在调整限制：

- 上下文窗口来自模型目录（并且可以通过配置覆盖）。
- 存储中的 `contextTokens` 是一个运行时估算/报告值；不要将其视为严格的保证。

有关更多信息，请参阅 [/token-use](/zh/reference/token-use)。

---

## 压缩：它是什么

压缩将较旧的对话汇总为记录中的一个持久化 `compaction` 条目，并保持最近的消息完整。

压缩后，未来的轮次将看到：

- 压缩摘要
- `firstKeptEntryId` 之后的消息

压缩是**持久化的**（与会话修剪不同）。请参阅 [/concepts/会话-pruning](/zh/concepts/session-pruning)。

## 压缩块边界和工具配对

当 OpenClaw 将长记录拆分为压缩块时，它会保持助手工具调用与其匹配的 `toolResult` 条目成对出现。

- 如果按标记份额拆分的位置位于工具调用及其结果之间，OpenClaw 会将边界移动到助手工具调用消息，而不是将这一对分开。
- 如果尾随的工具结果块否则会使块超过目标，OpenClaw 将保留该挂起的工具块，并保持未汇总的尾部完整。
- 中止/错误的工具调用块不会保持挂起的拆分状态。

---

## 何时发生自动压缩（Pi 运行时）

在嵌入式 Pi 代理中，自动压缩在两种情况下触发：

1. **溢出恢复**：模型返回上下文溢出错误
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the 模型`, `ollama error: context length
exceeded`, 以及类似的提供商格式的变体) → 压缩 → 重试。
2. **阈值维护**：在成功的轮次之后，当：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的上下文窗口
- `reserveTokens` 是为提示词和下一个模型输出保留的余量

这些是 Pi 运行时语义（OpenClaw 消费事件，但由 Pi 决定何时压缩）。

当设置了 `agents.defaults.compaction.maxActiveTranscriptBytes` 且活动转录文件达到该大小时，OpenClaw 也可以在开启下一次运行之前触发预检本地压缩。这是针对本地重新打开成本的文件大小保护，而非原始归档：OpenClaw 仍会运行正常的语义压缩，并且它需要 `truncateAfterCompaction`，以便压缩后的摘要能成为新的后续转录文件。

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

OpenClaw 还会对嵌入式运行强制执行安全下限：

- 如果是 `compaction.reserveTokens < reserveTokensFloor`，OpenClaw 会将其提高。
- 默认下限是 `20000` 个令牌。
- 设置 `agents.defaults.compaction.reserveTokensFloor: 0` 以禁用该下限。
- 如果它已经更高，OpenClaw 将保持原样。
- 手动 `/compact` 会遵守显式的 `agents.defaults.compaction.keepRecentTokens`
  并保留 Pi 的近期尾部切分点。如果没有显式的保留预算，
  手动压缩仍将是一个硬检查点，重建的上下文将从新摘要开始。
- 将 `agents.defaults.compaction.maxActiveTranscriptBytes` 设置为字节值或
  字符串（如 `"20mb"`），以便在活动转录文件变大时，在轮次之前运行本地压缩。此保护仅在
  `truncateAfterCompaction` 也启用时才有效。将其保留未设置或设置 `0` 以
  禁用。
- 当启用 `agents.defaults.compaction.truncateAfterCompaction` 时，
  OpenClaw 会在压缩后将活动转录轮换为压缩后的后续 JSONL。旧的完整转录将保持归档状态，并从压缩检查点链接，而不是就地重写。

原因：在压缩变得不可避免之前，为多轮“内务处理”（如内存写入）留出足够的余量。

实现：`src/agents/pi-settings.ts` 中的 `ensurePiCompactionReserveTokens()`
（从 `src/agents/pi-embedded-runner.ts` 调用）。

---

## 可插拔压缩提供程序

插件可以通过插件 API 上的 `registerCompactionProvider()` 注册压缩提供商。当 `agents.defaults.compaction.provider` 设置为已注册的提供商 ID 时，安全保护扩展会将摘要任务委托给该提供商，而不是内置的 `summarizeInStages` 流程。

- `provider`：已注册的压缩提供商插件的 ID。保留未设置状态以使用默认 LLM 摘要。
- 设置 `provider` 会强制执行 `mode: "safeguard"`。
- 提供商接收与内置路径相同的压缩指令和标识符保留策略。
- 安全保护机制仍会在提供商输出后保留最近轮次和分割轮次的后缀上下文。
- 内置安全保护摘要会使用新消息重新提炼先前的摘要，
  而不是逐字保留完整的先前摘要。
- 安全保护模式默认启用摘要质量审核；设置
  `qualityGuard.enabled: false` 以跳过“输出格式错误时重试”的行为。
- 如果提供商失败或返回空结果，OpenClaw 会自动回退到内置 LLM 摘要。
- 中止/超时信号会被重新抛出（而不是被吞没），以尊重调用者的取消请求。

来源：`src/plugins/compaction-provider.ts`，`src/agents/pi-hooks/compaction-safeguard.ts`。

---

## 用户可见的表面

您可以通过以下方式观察压缩和会话状态：

- `/status`（在任何聊天会话中）
- `openclaw status`（CLI）
- `openclaw sessions` / `sessions --json`
- 详细模式：`🧹 Auto-compaction complete` + 压缩计数

---

## 静默维护（`NO_REPLY`）

OpenClaw 支持用于后台任务的“静默”轮次，在这些任务中用户不应看到中间输出。

约定：

- 助手会以精确的静默令牌 `NO_REPLY` /
  `no_reply` 开始其输出，以表示“不向用户发送回复”。
- OpenClaw 会在交付层将其剥离/抑制。
- 精确的静默令牌抑制不区分大小写，因此当整个负载仅是静默令牌时，`NO_REPLY` 和
  `no_reply` 均有效。
- 这仅用于真正的后台/非交付轮次；它不是普通可操作用户请求的捷径。

自 `2026.1.10` 起，当部分块以 `NO_REPLY` 开头时，OpenClaw 也会抑制 **草稿/输入流传输（draft/typing streaming）**，这样静默操作就不会在轮次中途泄漏部分输出。

---

## 压缩前“内存刷新”（已实现）

目标：在自动压缩发生之前，运行一个静默的代理轮次，将持久化状态写入磁盘（例如代理工作区中的 `memory/YYYY-MM-DD.md`），以便压缩无法擦除关键上下文。

OpenClaw 使用 **阈值前刷新（pre-threshold flush）** 方法：

1. 监控会话上下文使用情况。
2. 当它超过“软阈值”（低于 Pi 的压缩阈值）时，向代理运行一个静默的“立即写入内存”指令。
3. 使用精确的静默令牌 `NO_REPLY` / `no_reply`，以便用户什么都看不到。

配置（`agents.defaults.compaction.memoryFlush`）：

- `enabled`（默认值：`true`）
- `softThresholdTokens`（默认值：`4000`）
- `prompt`（刷新轮次的用户消息）
- `systemPrompt`（为刷新轮次附加的额外系统提示词）

说明：

- 默认提示词/系统提示词包含一个 `NO_REPLY` 提示以抑制交付。
- 每个压缩周期刷新运行一次（在 `sessions.json` 中跟踪）。
- 刷新仅针对嵌入式 Pi 会话运行（CLI 后端会跳过它）。
- 当会话工作区是只读时（`workspaceAccess: "ro"` 或 `"none"`），将跳过刷新。
- 有关工作区文件布局和写入模式，请参阅 [Memory](/zh/concepts/memory)。

Pi 还在扩展 API 中暴露了一个 `session_before_compact` 挂钩，但 OpenClaw 的刷新逻辑目前位于 Gateway 端。

---

## 故障排查清单

- 会话密钥错误？首先从 [/concepts/会话](/zh/concepts/session) 开始，并确认 `sessionKey` 中的 `/status`。
- 存储与记录不匹配？从 `openclaw status` 确认 Gateway 主机和存储路径。
- 压缩垃圾信息？检查：
  - 模型上下文窗口（太小）
  - 压缩设置（`reserveTokens` 相对于模型窗口设置得过高会导致更早的压缩）
  - 工具结果膨胀：启用/调整会话修剪
- 静默轮次泄漏？请确认回复以 `NO_REPLY` 开头（不区分大小写的精确令牌），并且您使用的版本包含流式抑制修复。

## 相关

- [会话管理](/zh/concepts/session)
- [会话修剪](/zh/concepts/session-pruning)
- [上下文引擎](/zh/concepts/context-engine)
