---
summary: "Streaming + chunking behavior (block replies, 渠道 preview streaming, mode mapping)"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing 分块流式传输 or 渠道 chunking behavior
  - Debugging duplicate/early block replies or 渠道 preview streaming
title: "Streaming and Chunking"
---

# Streaming + chunking

OpenClaw 有两个独立的流式传输层：

- **分块流式传输 (channels):** 在助手写入时发出完成的 **blocks**。这些是正常的渠道消息（而不是 token 增量）。
- **Preview streaming (Telegram/Discord/Slack):** 在生成过程中更新临时的 **preview message**。

目前，向渠道消息**没有真正的 token 增量流式传输**。预览流式传输是基于消息的（发送 + 编辑/追加）。

## 分块流式传输 (渠道 messages)

分块流式传输 会在助手输出可用时，以粗略的块（chunks）形式发送。

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

Legend:

- `text_delta/events`: 模型流事件（对于非流式模型可能比较稀疏）。
- `chunker`: `EmbeddedBlockChunker` 应用最小/最大边界 + 分段偏好。
- `channel send`: 实际的出站消息（块回复）。

**Controls:**

- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"`（默认关闭）。
- 渠道覆盖：`*.blockStreaming`（以及每个账户的变体）以强制每个渠道启用 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`: `"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`: `{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`: `{ minChars?, maxChars?, idleMs? }`（在发送之前合并流式块）。
- 渠道硬上限：`*.textChunkLimit`（例如，`channels.whatsapp.textChunkLimit`）。
- 渠道分块模式：`*.chunkMode`（`length` 默认，`newline` 在长度分块之前在空行（段落边界）处拆分）。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认 17）拆分高大的回复以避免 UI 剪裁。

**Boundary semantics:**

- `text_end`: 分块器一旦发出块就立即流式传输；在每次 `text_end` 时刷新。
- `message_end`: 等待助手消息完成，然后刷新缓冲输出。

`message_end` 如果缓冲文本超过 `maxChars`，仍会使用分块器，以便在结束时发出多个块。

## 分块算法（低/高界限）

块分块由 `EmbeddedBlockChunker` 实现：

- **低界限：** 在缓冲区 >= `minChars` 之前不发出（除非被迫）。
- **高界限：** 优先在 `maxChars` 之前拆分；如果被迫，则在 `maxChars` 处拆分。
- **拆分偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬换行。
- **代码围栏：** 永远不要在围栏内拆分；当被迫在 `maxChars` 处拆分时，关闭并重新打开围栏以保持 Markdown 有效。

`maxChars` 被限制为渠道 `textChunkLimit`，因此您不能超过每个渠道的上限。

## 合并（合并流式传输的块）

启用块流式传输时，OpenClaw 可以在发送之前 **合并连续的块块**。这减少了“单行垃圾信息”，同时仍然提供渐进式输出。

- 合并会在刷新前等待 **空闲间隙**（`idleMs`）。
- 缓冲区上限为 `maxChars`，如果超过此限制则会刷新。
- `minChars` 阻止发送微小的片段，直到积累了足够的文本
  （最终刷新总是发送剩余的文本）。
- 连接符源自 `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → 空格)。
- 可以通过 `*.blockStreamingCoalesce` 覆盖渠道设置（包括每个账户的配置）。
- 默认合并 `minChars` 在 Signal/Slack/Discord 上被提升至 1500，除非被覆盖。

## 块之间的类似人类的节奏

启用分块流式传输后，您可以在块回复之间（在第一个块之后）添加**随机暂停**。这使得多气泡回复感觉更自然。

- 配置：`agents.defaults.humanDelay`（可通过 `agents.list[].humanDelay` 针对每个代理进行覆盖）。
- 模式：`off`（默认）、`natural`（800–2500ms）、`custom`（`minMs`/`maxMs`）。
- 仅适用于**块回复**，不适用于最终回复或工具摘要。

## "流式传输分块或所有内容"

这对应于：

- **流式传输分块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（逐步发送）。非 Telegram Telegram 渠道还需要 `*.blockStreaming: true`。
- **在末尾流式传输所有内容：** `blockStreamingBreak: "message_end"`（一次性刷新，如果很长可能会有多个分块）。
- **无块流式传输：** `blockStreamingDefault: "off"`（仅最终回复）。

**渠道说明：** 除非明确将 `*.blockStreaming` 设置为 `true`，否则**关闭**块流式传输。渠道可以在没有块回复的情况下流式传输实时预览（`channels.<channel>.streaming`）。

配置位置提醒：`blockStreaming*` 默认值位于 `agents.defaults` 下，而不是根配置中。

## 预览流式传输模式

规范键：`channels.<channel>.streaming`

模式：

- `off`：禁用预览流式传输。
- `partial`：被最新文本替换的单个预览。
- `block`：预览以分块/追加步骤更新。
- `progress`：生成过程中的进度/状态预览，完成时的最终答案。

### 渠道映射

| 渠道  | `off` | `partial` | `block` | `progress`        |
| -------- | ----- | --------- | ------- | ----------------- |
| Telegram | ✅    | ✅        | ✅      | 映射到 `partial` |
| Discord  | ✅    | ✅        | ✅      | 映射到 `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅                |

Slack 专用：

- 当 `streaming=partial`（默认：`true`）时，`channels.slack.nativeStreaming` 会切换 Slack 原生流式传输 API 调用。

旧版键迁移：

- Telegram：`streamMode` + 布尔值 `streaming` 自动迁移到 `streaming` 枚举。
- Discord：`streamMode` + 布尔值 `streaming` 自动迁移到 `streaming` 枚举。
- Slack：`streamMode` 自动迁移到 `streaming` 枚举；布尔值 `streaming` 自动迁移到 `nativeStreaming`。

### 运行时行为

Telegram：

- 在私信和群组/主题中使用 `sendMessage` + `editMessageText` 预览更新。
- 当明确启用 Telegram 分块流式传输时，将跳过预览流式传输（以避免双重流式传输）。
- `/reasoning stream` 可以将推理内容写入预览。

Discord：

- 使用发送 + 编辑预览消息。
- `block` 模式使用草稿分块（`draftChunk`）。
- 当明确启用 Discord 分块流式传输时，将跳过预览流式传输。

Slack：

- 如果可用，`partial` 可以使用 Slack 原生流式传输（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加式草稿预览。
- `progress` 使用状态预览文本，然后是最终答案。

import en from "/components/footer/en.mdx";

<en />
