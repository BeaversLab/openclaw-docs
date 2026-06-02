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
- [脚本清理](/zh/reference/transcript-hygiene)

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
   - 压缩检查点是压缩后的后续记录的元数据。新的压缩操作不会写入第二个 `.checkpoint.*.jsonl` 副本。

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
- `cron.runLog.keepLines` 会在每个 cron 作业中修剪保留的 SQLite 运行历史记录行（默认值：`2000`）。对于较旧的基于文件的运行日志，仍然接受 `cron.runLog.maxBytes`。

当 cron 强制创建一个新的隔离运行会话时，它会在写入新行之前清理之前的 `cron:<jobId>` 会话条目。它会携带安全的偏好设置，例如思考/快速/详细设置、标签以及显式用户选择的模型/身份验证覆盖。它会丢弃环境对话上下文，例如渠道/组路由、发送或排队策略、提升、来源和 ACP 运行时绑定，以便新的隔离运行无法从旧运行中继承过时的传递或运行时权限。

---

## 会话键 (`sessionKey`)

`sessionKey` 标识你所在的*会话存储桶*（路由 + 隔离）。

常见模式：

- 主要/直接聊天（每个代理）：`agent:<agentId>:<mainKey>`（默认 `main`）
- 组：`agent:<agentId>:<channel>:group:<id>`
- 房间/渠道 (Discord/Slack): `agent:<agentId>:<channel>:channel:<id>` 或 `...:room:<id>`
- Cron：`cron:<job.id>`
- Webhook：`hook:<uuid>`（除非被覆盖）

规范规则记录在 [/concepts/会话](/zh/concepts/session)。

---

## 会话 ID (`sessionId`)

每个 `sessionKey` 指向一个当前的 `sessionId`（即继续对话的脚本文件）。

经验法则：

- **重置** (`/new`, `/reset`) 会为该 `sessionKey` 创建一个新的 `sessionId`。
- **每日重置**（默认为网关主机当地时间凌晨 4:00）会在重置边界之后的下一条消息上创建一个新的 `sessionId`。
- **空闲过期**（`session.reset.idleMinutes` 或旧版 `session.idleMinutes`）在消息于空闲窗口后到达时创建一个新的 `sessionId`。当同时配置了每日和空闲时，先过期的那个生效。
- **系统事件**（心跳、cron 唤醒、exec 通知、网关维护）可能会修改会话行，但不会延长每日/空闲重置的新鲜度。重置轮转会在构建新的提示之前，丢弃上一个会话排队的系统事件通知。
- **父分支策略** 在创建线程或子代理分支时使用 OpenClaw 的活动分支。如果该分支过大，OpenClaw 将使用隔离上下文启动子级，而不是失败或继承不可用的历史记录。大小策略是自动的；旧版 `session.parentForkMaxTokens` 配置已被 `openclaw doctor --fix` 移除。

实现细节：该决策发生在 `initSessionState()` 中的 `src/auto-reply/reply/session.ts`。

---

## 会话存储架构（`sessions.json`）

存储的值类型是 `SessionEntry` 中的 `src/config/sessions.ts`。

关键字段（非详尽列表）：

- `sessionId`：当前转录 id（除非设置了 `sessionFile`，否则文件名由此得出）
- `sessionStartedAt`：当前 `sessionId` 的开始时间戳；每日重置
  新鲜度使用此项。旧版行可能会从 JSONL 会话头中得出它。
- `lastInteractionAt`：最后一次真实用户/渠道交互时间戳；空闲重置
  新鲜度使用此项，因此心跳、cron 和 exec 事件不会保持会话
  存活。没有此字段的旧版行会回退到恢复的会话开始
  时间以进行空闲新鲜度检查。
- `updatedAt`：最后一次存储行变更时间戳，用于列出、修剪和
  记账。它不是每日/空闲重置新鲜度的权威依据。
- `sessionFile`：可选的显式转录路径覆盖
- `chatType`：`direct | group | room`（有助于 UI 和发送策略）
- `provider`、`subject`、`room`、`space`、`displayName`：用于组/渠道标记的元数据
- 切换开关：
  - `thinkingLevel`、`verboseLevel`、`reasoningLevel`、`elevatedLevel`
  - `sendPolicy` (每个会话的覆盖)
- 模型选择：
  - `providerOverride`, `modelOverride`, `authProfileOverride`
- 令牌计数器（尽力而为 / 取决于提供商）：
  - `inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`
- `compactionCount`: 针对该会话键完成自动压缩的频率
- `memoryFlushAt`: 上次预压缩内存刷新的时间戳
- `memoryFlushCompactionCount`: 上次刷新运行时的压缩计数

该存储区可以安全编辑，但 Gateway(网关) 是权威来源：当会话运行时，它可能会重写或重新填充条目。

---

## 脚本结构 (`*.jsonl`)

脚本由 `openclaw/plugin-sdk/agent-sessions` 的 `SessionManager` 管理。

该文件是 JSONL：

- 第一行：会话标头 (`type: "session"`，包括 `id`、`cwd`、`timestamp`，可选的 `parentSession`)
- 然后：包含 `id` + `parentId` 的会话条目（树状结构）

值得注意的条目类型：

- `message`: 用户/助手/工具结果 消息
- `custom_message`: 确实会进入模型上下文的扩展注入消息（可以对 UI 隐藏）
- `custom`: 不会进入模型上下文的扩展状态
- `compaction`: 持久化的压缩摘要，包含 `firstKeptEntryId` 和 `tokensBefore`
- `branch_summary`: 导航树分支时的持久化摘要

OpenClaw 故意“不”修复脚本；Gateway(网关) 使用 `SessionManager` 来读写它们。

---

## 上下文窗口与跟踪的 Token

有两个不同的概念很重要：

1. **模型上下文窗口**：每个模型的硬性上限（模型可见的 Token）
2. **会话存储计数器**：写入 `sessions.json` 的滚动统计信息（用于 /status 和仪表板）

如果您正在调整限制：

- 上下文窗口来自模型目录（并且可以通过配置覆盖）。
- 存储中的 `contextTokens` 是一个运行时估算/报告值；不要将其视为严格保证。

欲了解更多信息，请参阅 [/token-use](/zh/reference/token-use)。

---

## 压缩：它是什么

压缩会将较旧的对话总结为脚本中的一个持久化 `compaction` 条目，并保持最近的消息完整。

压缩后，未来的轮次将看到：

- 压缩摘要
- `firstKeptEntryId` 之后的消息

AGENTS.md 部分在压缩后的重新注入是通过 `agents.defaults.compaction.postCompactionSections` 选择加入的；当未设置或为 `[]`OpenClaw 时，OpenClaw 不会在压缩摘要之上附加 AGENTS.md 摘录。

压缩是**持久性**的（与会话修剪不同）。请参阅 [/concepts/会话-pruning](/zh/concepts/session-pruning)。

## 压缩块边界和工具配对

当 OpenClaw 将长转录拆分为压缩块时，它会将助手工具调用与其匹配的 OpenClaw`toolResult` 条目保持配对。

- 如果基于 Token 分配的拆分位于工具调用及其结果之间，OpenClaw 会将边界移动到助手工具调用消息，而不是将两者分开。
- 如果尾部的工具结果块会导致块超过目标，OpenClaw 将保留该待处理的工具块，并保持未汇总的尾部完整。
- 中止/错误的工具调用块不会使待处理的拆分保持打开状态。

---

## 自动压缩发生时（OpenClaw 运行时）

在嵌入式 OpenClaw 代理中，自动压缩在两种情况下触发：

1. **溢出恢复**：模型返回上下文溢出错误
   (`request_too_large`, `context length exceeded`, `input exceeds the maximum
number of tokens`, `input token count exceeds the maximum number of input
tokens`, `input is too long for the 模型`, `OpenClawOpenClawOpenClawollama error: context length
exceeded`, 以及类似的提供商格式变体) → 压缩 → 重试。
   当提供商报告尝试的 token 计数时，OpenClaw 会将该观察到的计数转发到溢出恢复压缩中。如果提供商确认溢出但未公开可解析的计数，OpenClaw 会将最小超预算的合成计数传递给压缩引擎和诊断。
   如果溢出恢复仍然失败，OpenClaw 会向用户显示明确指导，并保留当前会话映射，而不是静默地将会话密钥轮换到新的会话 ID。下一步由操作员控制：
   重试消息，运行 `/compact`，或者在首选新会话时运行 `/new`。
2. **阈值维护**：在一次成功的轮次之后，当：

`contextTokens > contextWindow - reserveTokens`

其中：

- `contextWindow` 是模型的上下文窗口
- `reserveTokens` 是为提示词 + 下一个模型输出保留的余量

这些是 OpenClaw 运行时语义。

当设置了 OpenClaw`agents.defaults.compaction.maxActiveTranscriptBytes`OpenClaw 且活动记录文件达到该大小时，OpenClaw 还可以在开启下一次运行之前触发预检本地压缩。这是针对本地重新打开成本的文件大小保护，而不是原始归档：OpenClaw 仍会运行正常的语义压缩，并且它需要 `truncateAfterCompaction`，以便压缩后的摘要可以成为新的后续记录。

对于嵌入式 OpenClaw 运行，OpenClaw`agents.defaults.compaction.midTurnPrecheck.enabled: true`OpenClawOpenClaw 添加了一个可选加入的工具循环保护。在追加工具结果之后和下一次模型调用之前，OpenClaw 使用在轮次开始时使用的相同预检预算逻辑来估计提示压力。如果上下文不再适合，保护不会在 OpenClaw 运行时的 `transformContext` 挂钩内进行压缩。它会引发结构化的轮中预检信号，停止当前的提示提交，并让外部运行循环使用现有的恢复路径：截断过大的工具结果（如果足够的话），或触发配置的压缩模式并重试。该选项默认禁用，并且与 `default` 和 `safeguard` 压缩模式一起工作，包括提供商支持的安全保护压缩。这独立于 `maxActiveTranscriptBytes`OpenClaw：字节大小保护在轮次开启之前运行，而轮中预检在嵌入式 OpenClaw 工具循环中追加新工具结果后更晚运行。

---

## 压缩设置 (`reserveTokens`, `keepRecentTokens`)

OpenClaw 运行时的压缩设置位于代理设置中：

```json5
{
  compaction: {
    enabled: true,
    reserveTokens: 16384,
    keepRecentTokens: 20000,
  },
}
```

OpenClaw 还为嵌入式运行强制执行安全下限：

- 如果 `compaction.reserveTokens < reserveTokensFloor`OpenClaw，OpenClaw 会增加它。
- 默认下限是 `20000` 个标记。
- 设置 `agents.defaults.compaction.reserveTokensFloor: 0` 以禁用下限。
- 如果它已经更高，OpenClaw 将保持原样。
- 手动 `/compact` 遵守显式的 `agents.defaults.compaction.keepRecentTokens`OpenClaw 并保留 OpenClaw 运行时的近期尾部切断点。如果没有显式的保留预算，手动压缩仍然是一个硬检查点，重建的上下文从新摘要开始。
- 设置 `agents.defaults.compaction.midTurnPrecheck.enabled: true` 以在新的工具结果之后、下一次模型调用之前运行可选的工具循环预检查。这只是一个触发器；摘要生成仍使用配置的压缩路径。它与 `maxActiveTranscriptBytes` 无关，后者是回合开始时的活动记录字节大小保护机制。
- 将 `agents.defaults.compaction.maxActiveTranscriptBytes` 设置为字节值或字符串（如 `"20mb"`），以便在活动记录变大时在回合开始前运行本地压缩。仅当 `truncateAfterCompaction` 也启用时，此保护机制才会生效。保持其未设置或将其设置为 `0` 以禁用。
- 当启用 `agents.defaults.compaction.truncateAfterCompaction`OpenClaw 时，OpenClaw 会在压缩后将活动记录轮换为压缩后的后续 JSONL。分支/恢复检查点操作使用该压缩后的后续文件；遗留的压缩前检查点文件在被引用时仍可读取。

原因：在压缩变得不可避免之前，为多轮“内务处理”（如内存写入）留出足够的余量。

实现：`ensureAgentCompactionReserveTokens()` 在 `src/agents/agent-settings.ts` 中（由 `src/agents/embedded-agent-runner.ts` 调用）。

---

## 可插拔压缩提供商

插件可以通过插件 API 上的 `registerCompactionProvider()`API 注册压缩提供商。当 `agents.defaults.compaction.provider` 设置为已注册的提供商 ID 时，安全扩展会将摘要生成委托给该提供商，而不是内置的 `summarizeInStages` 管道。

- `provider`LLM：已注册的压缩提供商插件的 ID。保持未设置以使用默认的 LLM 摘要生成。
- 设置 `provider` 会强制启用 `mode: "safeguard"`。
- 提供商会收到与内置路径相同的压缩指令和标识符保留策略。
- 保护措施仍然会在提供商输出后保留最近轮次和分割轮次的后缀上下文。
- 内置保护摘要生成会结合新消息重新提取之前的摘要，
  而不是逐字保留完整的先前摘要。
- 安全保护模式默认启用摘要质量审计；设置 `qualityGuard.enabled: false` 可跳过“输出格式错误时重试”的行为。
- 如果提供商失败或返回空结果，OpenClaw 将自动回退到内置的 LLM 摘要生成。
- 中止/超时信号会被重新抛出（而不被吞没），以尊重调用者的取消操作。

来源：`src/plugins/compaction-provider.ts`，`src/agents/agent-hooks/compaction-safeguard.ts`。

---

## 用户可见界面

您可以通过以下方式观察压缩和会话状态：

- `/status`（在任何聊天会话中）
- `openclaw status`CLI (CLI)
- `openclaw sessions` / `sessions --json`
- Gateway(网关) 日志 (Gateway(网关)`pnpm gateway:watch` 或 `openclaw logs --follow`)：`embedded run auto-compaction start` + `complete`
- 详细模式：`🧹 Auto-compaction complete` + 压缩计数

---

## 静默维护 (`NO_REPLY`)

OpenClaw 支持用于后台任务的“静默”轮次，在这些任务中用户不应看到中间输出。

约定：

- 助手以其输出以确切的静默令牌 `NO_REPLY` /
  `no_reply` 开头，以表示“不向用户传递回复”。
- OpenClaw 在传递层中剥离/抑制此内容。
- 确切的静默令牌抑制不区分大小写，因此当整个有效载荷仅为静默令牌时，`NO_REPLY` 和
  `no_reply` 均有效。
- 这仅适用于真正的后台/无传递轮次；它不是普通可行的用户请求的捷径。

自 `2026.1.10`OpenClaw 起，当部分块以 `NO_REPLY` 开头时，OpenClaw 还会抑制 **草稿/输入流式传输**，因此静默操作不会在回合中途泄漏部分输出。

---

## 压缩前的“内存刷新”（已实现）

目标：在自动压缩发生之前，运行一个静默的代理回合，将持久化状态写入磁盘（例如，代理工作区中的 `memory/YYYY-MM-DD.md`），以便压缩无法擦除关键上下文。

OpenClaw 使用 **阈值前刷新（pre-threshold flush）** 方法：

1. 监控会话上下文使用情况。
2. 当它超过“软阈值”（低于 OpenClaw 运行时的压缩阈值）时，向代理运行一个静默的“立即写入内存”指令。
3. 使用确切的静默令牌 `NO_REPLY` / `no_reply`，以便用户
   什么也看不到。

配置 (`agents.defaults.compaction.memoryFlush`)：

- `enabled`（默认值：`true`）
- `model`（用于刷新回合的可选确切提供商/模型覆盖，例如 `ollama/qwen3:8b`）
- `softThresholdTokens`（默认值：`4000`）
- `prompt`（刷新回合的用户消息）
- `systemPrompt`（为刷新回合附加的额外系统提示）

注意事项：

- 默认提示/系统提示包含一个 `NO_REPLY` 提示以抑制
  传递。
- 当设置了 `model` 时，刷新回合使用该模型而不继承活动会话回退链，因此仅限本地的维护不会静默回退到付费对话模型。
- 刷新在每个压缩周期运行一次（在 `sessions.json` 中跟踪）。
- 刷新仅针对嵌入的 OpenClaw 会话运行 (CLI 后端会跳过它)。
- 当会话工作区为只读（`workspaceAccess: "ro"` 或 `"none"`）时，将跳过刷新。
- 有关工作区文件布局和写入模式，请参阅 [Memory](/zh/concepts/memory)。

OpenClaw 还在扩展 API 中公开了 OpenClaw`session_before_compact`APIOpenClawGateway(网关) 钩子，但目前 OpenClaw 的刷新逻辑位于 Gateway(网关) 侧。

---

## 故障排除清单

- 会话密钥错误？首先从 [/concepts/会话](/zh/concepts/session) 开始，并确认 `sessionKey` 中的 `/status`。
- 存储与记录不匹配？请从 Gateway(网关)`openclaw status` 确认 Gateway(网关) 主机和存储路径。
- 压缩垃圾信息？检查：
  - 模型上下文窗口 (太小)
  - 压缩设置（对于模型窗口 `reserveTokens` 太高可能会导致较早的压缩）
  - 工具结果膨胀：启用/调整会话剪枝
- 静默回合泄漏？请确认回复以 `NO_REPLY` 开头（不区分大小写的精确令牌），并且您使用的版本包含流抑制修复。

## 相关

- [会话管理](/zh/concepts/session)
- [会话修剪](/zh/concepts/session-pruning)
- [上下文引擎](/zh/concepts/context-engine)
