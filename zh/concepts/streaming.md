---
summary: "流式传输与分块行为（块回复、频道预览流式传输、模式映射）"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "流式传输与分块"
---

# 流式传输 + 分块

OpenClaw 有两个独立的流式传输层：

- **块流式传输（频道）：** 当助手写入时发送已完成的**块**。这些是普通的频道消息（不是 token 增量）。
- **预览流式传输（Telegram/Discord/Slack）：** 在生成过程中更新临时的**预览消息**。

目前，向频道消息**没有真正的 token 增量流式传输**。预览流式传输是基于消息的（发送 + 编辑/追加）。

## 块流式传输（频道消息）

块流式传输会在助手输出可用时，以粗粒度的块形式发送。

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

图例：

- `text_delta/events`：模型流事件（对于非流式模型可能较为稀疏）。
- `chunker`：`EmbeddedBlockChunker` 应用最小/最大边界 + 换行偏好。
- `channel send`：实际发出的消息（块回复）。

**控制项：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 频道覆盖设置：`*.blockStreaming`（以及每个账户的变体）用于在每个频道强制执行 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在发送前合并流式传输的块）。
- 频道硬性上限：`*.textChunkLimit`（例如，`channels.whatsapp.textChunkLimit`）。
- 频道分块模式：`*.chunkMode`（`length` 默认，`newline` 在长度分块前按空行（段落边界）拆分）。
- Discord 软性上限：`channels.discord.maxLinesPerMessage`（默认 17）拆分过长的回复以避免 UI 裁剪。

**边界语义：**

- `text_end`：一旦分块器发出即流式传输块；在每个 `text_end` 上刷新。
- `message_end`：等待直到助手消息完成，然后刷新缓冲输出。

`message_end` 如果缓冲文本超过 `maxChars` 仍会使用分块器，因此它可以在最后发出多个块。

## 分块算法（低/高边界）

块分块由 `EmbeddedBlockChunker` 实现：

- **下限：** 除非强制，否则在缓冲区 >= `minChars` 之前不发送。
- **上限：** 优先在 `maxChars` 之前拆分；如果强制，则在 `maxChars` 处拆分。
- **拆分优先级：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬拆分。
- **代码围栏：** 绝不在围栏内拆分；如果在 `maxChars` 处强制拆分，则关闭并重新打开围栏以保持 Markdown 有效。

`maxChars` 被限制为通道 `textChunkLimit`，因此您不能超过每个通道的上限。

## 合并（合并流式块）

启用块流式传输时，OpenClaw 可以在发送之前**合并连续的块块**。
这减少了“单行刷屏”，同时仍然提供
渐进式输出。

- 合并在刷新前等待 **空闲间隙** (`idleMs`)。
- 缓冲区受 `maxChars` 限制，如果超过限制则会刷新。
- `minChars` 防止发送微小的片段，直到积累了足够的文本
  （最终刷新始终发送剩余文本）。
- 连接符源自 `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → 空格)。
- 可以通过 `*.blockStreamingCoalesce` 进行通道覆盖（包括每个帐户的配置）。
- 除非被覆盖，否则 Signal/Slack/Discord 的默认合并 `minChars` 会提升到 1500。

## 块之间的拟人化节奏

启用块流式传输时，您可以在
块回复之间添加 **随机暂停**（在第一个块之后）。这使得多气泡响应感觉
更自然。

- 配置：`agents.defaults.humanDelay`（通过 `agents.list[].humanDelay` 覆盖每个代理）。
- 模式：`off`（默认），`natural`（800–2500ms），`custom` (`minMs`/`maxMs`)。
- 仅适用于 **块回复**，不适用于最终回复或工具摘要。

## “流式传输块或所有内容”

这映射到：

- **流式传输分块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（随写随发）。非 Telegram 频道还需要 `*.blockStreaming: true`。
- **结束时传输所有内容：** `blockStreamingBreak: "message_end"`（一次性刷新，如果很长可能会有多个分块）。
- **无块流式传输：** `blockStreamingDefault: "off"`（仅最终回复）。

**频道说明：** 除非将 `*.blockStreaming` 显式设置为 `true`，否则块流式传输处于**关闭状态**。频道可以流式传输实时预览 (`channels.<channel>.streaming`) 而无需块回复。

配置位置提醒：`blockStreaming*` 默认值位于 `agents.defaults` 下，而不是根配置中。

## 预览流式传输模式

规范键：`channels.<channel>.streaming`

模式：

- `off`：禁用预览流式传输。
- `partial`：被最新文本替换单个预览。
- `block`：预览以分块/追加步骤更新。
- `progress`：生成期间的进度/状态预览，完成时显示最终答案。

### 频道映射

| 频道    | `off` | `partial` | `block` | `progress`        |
| -------- | ----- | --------- | ------- | ----------------- |
| Telegram | ✅    | ✅        | ✅      | 映射到 `partial` |
| Discord  | ✅    | ✅        | ✅      | 映射到 `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅                |

仅限 Slack：

- 当 `streaming=partial`（默认值：`true`）时，`channels.slack.nativeStreaming` 会切换 Slack 原生流式传输 API 调用。

旧键迁移：

- Telegram：`streamMode` + 布尔值 `streaming` 自动迁移到 `streaming` 枚举。
- Discord：`streamMode` + 布尔值 `streaming` 自动迁移到 `streaming` 枚举。
- Slack：`streamMode` 自动迁移到 `streaming` 枚举；布尔值 `streaming` 自动迁移到 `nativeStreaming`。

### 运行时行为

Telegram：

- 在私信和群组/话题中使用 `sendMessage` + `editMessageText` 预览更新。
- 当显式启用 Telegram 块流式传输时，将跳过预览流式传输（以避免双重流式传输）。
- `/reasoning stream` 可以将推理过程写入预览。

Discord：

- 使用发送 + 编辑预览消息。
- `block` 模式使用草稿分块（`draftChunk`）。
- 当明确启用 Discord 块流式传输时，将跳过预览流式传输。

Slack：

- `partial` 可以在可用时使用 Slack 原生流式传输（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加式草稿预览。
- `progress` 使用状态预览文本，然后是最终答案。

import zh from '/components/footer/zh.mdx';

<zh />
