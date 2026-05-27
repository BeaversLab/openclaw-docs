---
summary: "深入剖析：会话存储 + 副本、生命周期以及（自动）压缩内部机制"
read_when:
  - You need to debug session ids, transcript JSONL, or sessions.json fields
  - You are changing auto-compaction behavior or adding "pre-compaction" housekeeping
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
- [内存概览](/zh/concepts/memory)
- [内存搜索](/zh/concepts/memory-search)
- [会话修剪](/zh/concepts/session-pruning)
- [记录清理](/zh/reference/transcript-hygiene)

---

## 单一真实来源：Gateway(网关)

OpenClaw 的设计围绕拥有会话状态的单个 **Gateway(网关) 进程** 展开。

- UI (macOS 应用、Web 控制界面、TUI) 应查询 Gateway(网关) 以获取会话列表和令牌计数。
- 在远程模式下，会话文件位于远程主机上；“检查本地 Mac 文件”无法反映 Gateway(网关) 正在使用的实际内容。

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

Gateway(网关) 历史记录读取器应避免物化整个逐字稿，除非表面层明确需要任意历史访问。首页历史记录、嵌入式聊天历史记录、重启恢复以及令牌/使用情况检查使用有界的尾部读取。完整的逐字稿扫描通过异步逐字稿索引进行，该索引按文件路径加上 Gateway(网关)`mtimeMs`/`size` 进行缓存，并在并发读取器之间共享。

---

## 磁盘位置

对于每个代理，在 Gateway(网关) 主机上：

- 存储：`~/.openclaw/agents/<agentId>/sessions/sessions.json`
- 逐字稿：`~/.openclaw/agents/<agentId>/sessions/<sessionId>.jsonl`
  - Telegram 主题会话：Telegram`.../<sessionId>-topic-<threadId>.jsonl`

OpenClaw 通过 OpenClaw`src/config/sessions.ts` 解析这些路径。

---

## 存储维护和磁盘控制

会话持久化具有针对 `sessions.json`、逐字稿构件和轨迹附属文件的自动维护控制 (`session.maintenance`)：

- `mode`：`warn`（默认）或 `enforce`
- `pruneAfter`：陈旧条目的年龄截止（默认 `30d`）
- `maxEntries`：限制 `sessions.json` 中的条目数（默认 `500`）
- `resetArchiveRetention`：`*.reset.<timestamp>` 逐字稿存档的保留期（默认：与 `pruneAfter` 相同；`false` 禁用清理）
- `maxDiskBytes`：可选的会话目录预算
- `highWaterBytes`：清理后的可选目标（`80%` 的默认 `maxDiskBytes`）

常规 Gateway(网关) 写入流经每个存储区的会话写入器，该写入器在不获取运行时文件锁的情况下序列化进程内变更。热路径修补辅助程序在持有该写入器槽位时借用经过验证的可变缓存，因此不会针对每个元数据更新克隆或重新读取大型 Gateway(网关)`sessions.json` 文件。运行时代码应优先使用 `updateSessionStore(...)` 或 `updateSessionStoreEntry(...)`Gateway(网关)；直接全量存储保存是兼容性和离线维护工具。当 Gateway(网关) 可访问时，非试运行 `openclaw sessions cleanup` 和 `openclaw agents delete`Gateway(网关) 将存储变更委托给 Gateway(网关)，以便清理操作加入同一写入器队列；`--store <path>` 是用于直接文件维护的显式离线修复路径。`maxEntries`Gateway(网关) 清理仍针对生产级上限进行批处理，因此存储区可能会在下次高水位清理将其重写回之前短暂超过配置的上限。会话存储读取不会在 Gateway(网关) 启动期间修剪或限制条目；请使用写入或 `openclaw sessions cleanup --enforce` 进行清理。即使未配置磁盘预算，`openclaw sessions cleanup --enforce` 仍会立即应用配置的上限，并修剪旧的未引用的脚本、检查点和轨迹产物。

维护操作会保留持久的对外会话指针（例如群组会话和线程范围的聊天会话），但在超过配置的时长、计数或磁盘预算时，仍可移除针对 cron、hooks、heartbeat、ACP 和子代理的合成运行时条目。

OpenClaw 不再在 Gateway(网关) 写入期间创建自动 OpenClaw`sessions.json.bak.*`Gateway(网关) 轮换备份。传统的 `session.maintenance.rotateBytes` 键将被忽略，并且 `openclaw doctor --fix` 会将其从旧版配置中移除。

记录变更会在记录文件上使用会话写入锁。获取锁最多等待 `session.writeLock.acquireTimeoutMs`，然后才会提示忙碌会话错误；默认值为 `60000` 毫秒。仅当在慢速机器上合法的准备工作、清理、压缩或记录镜像工作争用时间更长时，才调高此值。`session.writeLock.staleMs` 控制何时可以将现有锁视为过期并重新声明；默认值为 `1800000` 毫秒。`session.writeLock.maxHoldMs` 控制进程内看门狗释放阈值；默认值为 `300000` 毫秒。紧急环境覆盖变量为 `OPENCLAW_SESSION_WRITE_LOCK_ACQUIRE_TIMEOUT_MS`、`OPENCLAW_SESSION_WRITE_LOCK_STALE_MS` 和 `OPENCLAW_SESSION_WRITE_LOCK_MAX_HOLD_MS`。

磁盘预算清理的执行顺序 (`mode: "enforce"`)：

1. 首先移除最旧的已存档、孤立的 transcript 或孤立的轨迹工件。
2. 如果仍高于目标，则驱逐最旧的会话条目及其 transcript/trajectory 文件。
3. 继续直到使用量处于或低于 `highWaterBytes`。

在 `mode: "warn"`OpenClaw 中，OpenClaw 会报告潜在的驱逐操作，但不会更改存储/文件。

按需运行维护：

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --enforce
```

---

## Cron 会话和运行日志

独立的 cron 运行也会创建会话条目/transcripts，并且它们具有专门的保留控制：

- `cron.sessionRetention`（默认 `24h`）从会话存储中修剪旧的独立 cron 运行会话（`false` 禁用）。
- `cron.runLog.maxBytes` + `cron.runLog.keepLines` 修剪 `~/.openclaw/cron/runs/<jobId>.jsonl` 文件（默认值：`2_000_000` 字节和 `2000` 行）。

当 cron 强制创建一个新的独立运行会话时，它会在写入新行之前清理之前的 `cron:<jobId>` 会话条目。它会保留安全的偏好设置，例如 thinking/fast/verbose 设置、标签以及用户明确选择的模型/身份验证覆盖。它会丢弃环境对话上下文，例如渠道/组路由、发送或队列策略、提升、来源以及 ACP 运行时绑定，这样新的独立运行就无法从较旧的运行中继承过时的传递或运行时权限。

---

## 会话密钥 (`sessionKey`)

`sessionKey` 标识您处于*哪个对话存储桶*（路由 + 隔离）。

常见模式：

- 主/直接聊天（每个代理）：`agent:<agentId>:<mainKey>`（默认 `main`）
- 组：`agent:<agentId>:<channel>:group:<id>`
- 房间/渠道（Discord/Slack）：`agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆盖）

规范规则记录在 [/concepts/会话](/zh/concepts/session)。

---

## 会话 ID (`sessionId`)

每个 `sessionKey` 指向一个当前的 `sessionId`（继续对话的记录文件）。

经验法则：

- **重置** (`/new`, `/reset`) 会为该 `sessionKey` 创建一个新的 `sessionId`。
- **每日重置**（默认为网关主机当地时间凌晨 4:00）会在重置边界后的下一条消息上创建一个新的 `sessionId`。
- **空闲过期** (`session.reset.idleMinutes` 或旧版 `session.idleMinutes`) 会在消息在空闲窗口后到达时创建一个新的 `sessionId`。当同时配置了每日和空闲时，以先过期的为准。
- **系统事件**（心跳、cron 唤醒、exec 通知、网关维护）可能会修改会话行，但不会延长每日/空闲重置的新鲜度。重置轮转会在构建新的提示之前，丢弃上一个会话排队的系统事件通知。
- **父级分支策略** 在创建线程或子代理分支时使用 PI 的活动分支。如果该分支过大，OpenClaw 将使用隔离上下文启动子进程，而不是失败或继承无法使用的历史记录。大小策略是自动的；旧的 OpenClaw`session.parentForkMaxTokens` 配置已被 `openclaw doctor --fix` 移除。

实现细节：该决策发生在 `src/auto-reply/reply/session.ts` 的 `initSessionState()` 中。

---

## 会话存储架构 (`sessions.json`)

存储的值类型是 `src/config/sessions.ts` 中的 `SessionEntry`。

关键字段（非详尽列表）：

- `sessionId`：当前记录 ID（除非设置了 `sessionFile`，否则文件名由此派生）
- `sessionStartedAt`：当前 `sessionId` 的开始时间戳；每日重置
  新鲜度使用此值。旧行可能从 JSONL 会话头部派生它。
- `lastInteractionAt`：最后一次真实用户/渠道交互时间戳；空闲重置
  新鲜度使用此值，因此心跳、cron 和 exec 事件不会保持会话
  存活。没有此字段的旧行将回退到恢复的会话开始
  时间以进行空闲新鲜度检查。
- `updatedAt`：最后一次存储行变更时间戳，用于列出、修剪和
  记账。它不是每日/空闲重置新鲜度的权威依据。
- `sessionFile`：可选的显式记录路径覆盖
- `chatType`：`direct | group | room`（有助于 UI 和发送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：用于群组/渠道标签的元数据
- 切换开关：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy`（每个会话的覆盖）
- 模型选择：
  - `providerOverride`、`modelOverride`、`authProfileOverride`
- 令牌计数器（尽力而为 / 取决于提供商）：
  - `inputTokens`、`outputTokens`、`totalTokens`、`contextTokens`
- `compactionCount`：该会话键完成自动压缩的频率
- `memoryFlushAt`：上次预压缩内存刷新的时间戳
- `memoryFlushCompactionCount`：上次刷新运行时的压缩计数

该存储区可以安全编辑，但 Gateway(网关) 是权威来源：当会话运行时，它可能会重写或重新填充条目。

---

## Transcript 结构 (`*.jsonl`)

Transcript 由 `@earendil-works/pi-coding-agent` 的 `SessionManager` 管理。

该文件是 JSONL：

- 第一行：会话标头 (`type: "session"`，包括 `id`、`cwd`、`timestamp`、可选的 `parentSession`)
- 然后：带有 `id` + `parentId`（树）的会话条目

值得注意的条目类型：

- `message`：用户/助手/工具结果 消息
- `custom_message`：扩展注入的、*会*进入模型上下文的消息（可对 UI 隐藏）
- `custom`：*不*进入模型上下文的扩展状态
- `compaction`：持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`：导航树分支时的持久化摘要

OpenClaw 故意*不*“修正”transcript；Gateway 使用 OpenClawGateway(网关)`SessionManager` 来读取/写入它们。

---

## 上下文窗口与跟踪的 Token

有两个不同的概念很重要：

1. **模型上下文窗口**：每个模型的硬性上限（模型可见的 Token）
2. **会话存储计数器**：写入 `sessions.json` 的滚动统计信息（用于 /status 和仪表板）

如果您正在调整限制：

- 上下文窗口来自模型目录（并且可以通过配置覆盖）。
- 存储中的 `contextTokens` 是一个运行时估算/报告值；不要将其视为严格的保证。

更多信息，请参阅 [/token-use](/zh/reference/token-use)。

---

## 压缩：它是什么

压缩将较旧的对话摘要为 transcript 中持久化的 `compaction` 条目，并保持最近的消息完整。

压缩后，未来的轮次将看到：

- 压缩摘要
- `firstKeptEntryId` 之后的消息

压缩是**持久性**的（与会话修剪不同）。请参阅 [/concepts/会话-pruning](/zh/concepts/session-pruning)。

## 压缩块边界和工具配对

当 OpenClaw 将长 transcript 拆分为压缩块时，它会确保
助手工具调用与其匹配的 OpenClaw`toolResult` 条目保持配对。

- 如果令牌共享分割点位于工具调用及其结果之间，OpenClaw 会将边界移动到助手工具调用消息，而不是将这对消息分开。
- 如果尾部的工具结果块会导致分块超过目标大小，OpenClaw 会保留该挂起的工具块，并保持未摘要的尾部完整。
- 中止/错误的工具调用块不会保持挂起的分割状态。

---

## 当自动压缩发生时（Pi 运行时）

在嵌入式 Pi 代理中，自动压缩在以下两种情况下触发：

1. **溢出恢复**：模型返回上下文溢出错误
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the 模型`, `ollama error: context length
exceeded`, 以及类似的提供商特定变体) → 压缩 → 重试。
   如果溢出恢复仍然失败，OpenClaw 会向用户提供明确的指导，并保留当前的会话映射，而不是静默地将
   会话密钥轮换到新的会话 ID。下一步由操作员控制：
   重试消息，运行 `/compact`，或者在需要全新会话时运行 `/new`。
2. **阈值维护**：在一次成功的轮次之后，当满足以下条件时：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的上下文窗口
- `reserveTokens` 是为提示词和下一个模型输出保留的余量

这些是 Pi 运行时语义（OpenClaw 消费事件，但 Pi 决定何时进行压缩）。

当设置了 `agents.defaults.compaction.maxActiveTranscriptBytes` 且
活动记录文件达到该大小时，OpenClaw 也可以在开始下一次运行之前触发起飞前本地压缩。
这是针对本地重新打开成本的文件大小保护，而非原始归档：OpenClaw 仍然运行正常的语义压缩，
并且它需要 `truncateAfterCompaction` 以便压缩后的摘要可以成为
新的后继记录。

对于嵌入式 Pi 运行，`agents.defaults.compaction.midTurnPrecheck.enabled: true`OpenClaw 增加了一个可选的工具循环守卫。在追加工具结果之后和下一次模型调用之前，OpenClaw 使用轮次开始时使用的相同预检预算逻辑来估算提示词压力。如果上下文不再适合，该守卫不会在 Pi 的 `transformContext` 挂钩内部进行压缩。它会引发一个结构化的轮次中预检信号，停止当前的提示词提交，并允许外部运行循环使用现有的恢复路径：如果足够的话，截断过大的工具结果，或者触发配置的压缩模式并重试。该选项默认禁用，并且与 `default` 和 `safeguard` 压缩模式都兼容，包括提供商支持的保护压缩。这独立于 `maxActiveTranscriptBytes`：字节大小守卫在轮次开始之前运行，而轮次中预检在嵌入式 Pi 工具循环中追加新的工具结果之后更晚的时间运行。

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

- 如果 `compaction.reserveTokens < reserveTokensFloor`OpenClaw，OpenClaw 会增加它。
- 默认下限是 `20000` 个令牌。
- 设置 `agents.defaults.compaction.reserveTokensFloor: 0` 以禁用下限。
- 如果它已经更高，OpenClaw 将保持原样。
- 手动 `/compact` 遵守显式的 `agents.defaults.compaction.keepRecentTokens` 并保留 Pi 的近期尾部切断点。如果没有显式的保留预算，手动压缩仍然是一个硬检查点，重建的上下文从新的摘要开始。
- 设置 `agents.defaults.compaction.midTurnPrecheck.enabled: true` 以在新的工具结果之后和下一次模型调用之前运行可选的工具循环预检。这只是一个触发器；摘要生成仍然使用配置的压缩路径。它独立于 `maxActiveTranscriptBytes`，后者是一个轮次开始时的活动对话字节大小守卫。
- 将 `agents.defaults.compaction.maxActiveTranscriptBytes` 设置为字节值或字符串（例如 `"20mb"`），以便在活动对话变大时在轮次之前运行本地压缩。仅当 `truncateAfterCompaction` 也启用时，此守卫才有效。保持未设置或设置 `0` 以禁用它。
- 当启用 `agents.defaults.compaction.truncateAfterCompaction`OpenClaw 时，OpenClaw 会在压缩后将活动记录轮换为压缩后的后续 JSONL。旧的完整记录保持存档状态，并从压缩检查点链接，而不是就地重写。

原因：在压缩变得不可避免之前，为多轮次“内部维护”（如内存写入）留出足够的余量。

实现：`ensurePiCompactionReserveTokens()` 位于 `src/agents/pi-settings.ts` 中（从 `src/agents/pi-embedded-runner.ts` 调用）。

---

## 可插拔压缩提供商

插件可以通过插件 API 上的 `registerCompactionProvider()`API 注册压缩提供商。当 `agents.defaults.compaction.provider` 设置为已注册的提供商 ID 时，防护扩展会将摘要委托给该提供商，而不是使用内置的 `summarizeInStages` 流程。

- `provider`LLM：已注册压缩提供商插件的 ID。留空以使用默认的 LLM 摘要。
- 设置 `provider` 会强制启用 `mode: "safeguard"`。
- 提供商接收与内置路径相同的压缩指令和标识符保留策略。
- 保护措施仍会在提供商输出后保留最近轮次和拆分轮次的后缀上下文。
- 内置保护摘要会使用新消息重新提炼先前的摘要，
  而不是逐字保留完整的先前摘要。
- 防护模式默认启用摘要质量审计；设置 `qualityGuard.enabled: false` 以跳过“输出格式错误时重试”的行为。
- 如果提供商失败或返回空结果，OpenClaw 将自动回退到内置的 LLM 摘要。
- 中止/超时信号将被重新抛出（而不是被吞没），以尊重调用者的取消请求。

来源：`src/plugins/compaction-provider.ts`，`src/agents/pi-hooks/compaction-safeguard.ts`。

---

## 用户可见界面

您可以通过以下方式观察压缩和会话状态：

- `/status`（在任何聊天会话中）
- `openclaw status`CLI (CLI)
- `openclaw sessions` / `sessions --json`
- Gateway(网关) 日志（Gateway(网关)`pnpm gateway:watch` 或 `openclaw logs --follow`）：`embedded run auto-compaction start` + `complete`
- 详细模式：`🧹 Auto-compaction complete` + 压缩计数

---

## 静默维护（`NO_REPLY`）

OpenClaw 支持用于后台任务的“静默”轮次，其中用户不应看到中间输出。

约定：

- 助手会以确切的静默令牌 `NO_REPLY` / `no_reply` 开始其输出，以表示“不向用户发送回复”。
- OpenClaw 会在交付层中剥离/抑制它。
- 精确的静默令牌抑制不区分大小写，因此当整个有效载荷仅为静默令牌时，`NO_REPLY` 和 `no_reply` 均有效。
- 这仅适用于真正的后台/无交付轮次；它不是普通可操作用户请求的捷径。

从 `2026.1.10`OpenClaw 开始，当部分数据块以 `NO_REPLY` 开头时，OpenClaw 还会抑制 **draft/typing streaming**，这样静默操作就不会在一轮对话中途泄露部分输出。

---

## 预压缩“内存刷新”（已实现）

目标：在自动压缩发生之前，运行一次静默的代理轮次，将持久化状态写入磁盘（例如代理工作区中的 `memory/YYYY-MM-DD.md`），这样压缩就不会删除关键上下文。

OpenClaw 使用 **预阈值刷新** 方法：

1. 监控会话上下文的使用情况。
2. 当它跨越一个“软阈值”（低于 Pi 的压缩阈值）时，向代理运行一个静默的“立即写入内存”指令。
3. 使用精确的静默令牌 `NO_REPLY` / `no_reply`，这样用户什么都看不到。

配置 (`agents.defaults.compaction.memoryFlush`)：

- `enabled`（默认值：`true`）
- `model`（可选的精确提供商/模型覆盖，用于刷新轮次，例如 `ollama/qwen3:8b`）
- `softThresholdTokens`（默认值：`4000`）
- `prompt`（刷新轮次的用户消息）
- `systemPrompt`（为刷新轮次附加的额外系统提示）

注意：

- 默认提示/系统提示包含一个 `NO_REPLY` 提示以抑制传送。
- 当设置了 `model` 时，刷新轮次使用该模型而不继承活动会话回退链，因此仅限本地的维护不会静默回退到付费对话模型。
- 刷新在每个压缩周期运行一次（在 `sessions.json` 中跟踪）。
- 清理仅针对嵌入式 Pi 会话运行（CLI 后端会跳过它）。
- 当会话工作区是只读时（`workspaceAccess: "ro"` 或 `"none"`），刷新将被跳过。
- 有关工作区文件布局和写入模式，请参阅 [Memory](/zh/concepts/memory)。

Pi 还在扩展 API 中公开了 `session_before_compact`APIOpenClawGateway(网关) 钩子，但 OpenClaw 的刷新逻辑目前位于 Gateway(网关) 端。

---

## 故障排查清单

- 会话密钥错误？从 [/concepts/会话](/zh/concepts/session) 开始，并确认 `/status` 中的 `sessionKey`。
- 存储与转录不匹配？请从 Gateway(网关)`openclaw status` 确认 Gateway(网关) 主机和存储路径。
- 压缩垃圾信息？请检查：
  - 模型上下文窗口（太小）
  - 压缩设置（`reserveTokens` 对于模型窗口来说过高可能会导致更早的压缩）
  - 工具结果膨胀：启用/调优会话修剪
- 静默回合泄露？确认回复以 `NO_REPLY` 开头（不区分大小写的精确令牌），并且您使用的构建版本包含流式抑制修复。

## 相关

- [会话管理](/zh/concepts/session)
- [会话修剪](/zh/concepts/session-pruning)
- [上下文引擎](/zh/concepts/context-engine)
