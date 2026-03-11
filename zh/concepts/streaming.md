---
summary: "流式传输 + 分块行为（块回复、草稿流式传输、限制）"
read_when:
  - "Explaining how streaming or chunking works on channels"
  - "Changing block streaming or channel chunking behavior"
  - "Debugging duplicate/early block replies or draft streaming"
title: "流式传输和分块"
---

# 流式传输 + 分块

OpenClaw 有两个独立的"流式传输"层：

- **块流式传输（频道）：**在助手写入时发送已完成的**块**。这些是正常的频道消息（不是 token 增量）。
- **类似 token 的流式传输（仅 Telegram）：**在生成时使用部分文本更新**草稿气泡**；最终消息在结束时发送。

目前**没有真正的 token 流式传输**到外部频道消息。Telegram 草稿流式传输是唯一的部分流式传输界面。

## 块流式传输（频道消息）

块流式传输在助手输出可用时以粗块发送。

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

- `text_delta/events`：模型流事件（对于非流式模型可能很稀疏）。
- `chunker`：`EmbeddedBlockChunker` 应用最小/最大边界 + 分段偏好。
- `channel send`：实际出站消息（块回复）。

**控制：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 频道覆盖：`*.blockStreaming`（以及按账户的变体）以强制每个频道的 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在发送之前合并流式块）。
- 频道硬上限：`*.textChunkLimit`（例如，`channels.whatsapp.textChunkLimit`）。
- 频道分块模式：`*.chunkMode`（`length` 默认，`newline` 在长度分块之前在空行（段落边界）上分割）。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认 17）分割高大的回复以避免 UI 裁剪。

**边界语义：**

- `text_end`：在分块器发出时立即流式传输块；在每个 `text_end` 上刷新。
- `message_end`：等待助手消息完成，然后刷新缓冲的输出。

`message_end` 仍然使用分块器（如果缓冲文本超过 `maxChars`），因此它可以在结束时发出多个块。

## 分块算法（低/高边界）
块分块由 `EmbeddedBlockChunker` 实现：

- **下限：**在缓冲区 >= `minChars` 之前不发出（除非强制）。
- **上限：**在 `maxChars` 之前优先分段；如果强制，在 `maxChars` 分段。
- **分段偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬分段。
- **代码围栏：**永远不要在围栏内分割；在 `maxChars` 强制时，关闭 + 重新打开围栏以保持 Markdown 有效。

`maxChars` 被限制为频道 `textChunkLimit`，因此您不能超过每个频道的上限。

## 合并（合并流式块）

当启用块流式传输时，OpenClaw 可以在发送之前**合并连续的块**。
这减少了"单行垃圾信息"，同时仍然提供渐进式输出。

- 合并等待**空闲间隙**（`idleMs`）然后刷新。
- 缓冲区受 `maxChars` 限制，如果超过将刷新。
- `minChars` 防止小片段发送，直到积累足够的文本
  （最终刷新总是发送剩余文本）。
- 连接符派生自 `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`，`newline` → `\n`，`sentence` → 空格)。
- 频道覆盖可通过 `*.blockStreamingCoalesce` 获得（包括按账户的配置）。
- 默认合并 `minChars` 对于 Signal/Slack/Discord 增加到 1500，除非被覆盖。

## 块之间类似人类的节奏

当启用块流式传输时，您可以在块回复之间添加**随机暂停**
（第一个块之后）。这使得多气泡响应感觉更自然。

- 配置：`agents.defaults.humanDelay`（通过 `agents.list[].humanDelay` 按代理覆盖）。
- 模式：`off`（默认），`natural`（800–2500ms），`custom`（`minMs`/`maxMs`）。
- 仅适用于**块回复**，不适用于最终回复或工具摘要。

## "流式传输块或所有内容"

这对应于：

- **流式传输块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（随行进行发送）。非 Telegram 频道还需要 `*.blockStreaming: true`。
- **在结束时流式传输所有内容：** `blockStreamingBreak: "message_end"`（刷新一次，如果很长可能有多个块）。
- **无块流式传输：** `blockStreamingDefault: "off"`（仅最终回复）。

**频道说明：** 对于非 Telegram 频道，除非
明确将 `*.blockStreaming` 设置为 `true`，否则块流式传输为**关闭**。
Telegram 可以流式传输草稿
（`channels.telegram.streamMode`）而不需要块回复。
配置位置提醒：`blockStreaming*` 默认值位于
`agents.defaults` 下，而不是根配置。

## Telegram 草稿流式传输（类似 token）

Telegram 是唯一具有草稿流式传输的频道：

- 在**带有主题的私人聊天**中使用 Bot API `sendMessageDraft`。
- `channels.telegram.streamMode: "partial" | "block" | "off"`。
  - `partial`：使用最新的流式文本更新草稿。
  - `block`：在分块中更新草稿（相同的分块器规则）。
  - `off`：无草稿流式传输。
- 草稿块配置（仅适用于 `streamMode: "block"`）：`channels.telegram.draftChunk`（默认值：`minChars: 200`，`maxChars: 800`）。
- 草稿流式传输与块流式传输是分开的；块回复默认关闭，仅在非 Telegram 频道上通过 `*.blockStreaming: true` 启用。
- 最终回复仍然是一条正常消息。
- `/reasoning stream` 将推理写入草稿气泡（仅 Telegram）。

当草稿流式传输处于活动状态时，OpenClaw 禁用该回复的块流式传输以避免双重流式传输。

```
Telegram (private + topics)
  └─ sendMessageDraft (draft bubble)
       ├─ streamMode=partial → update latest text
       └─ streamMode=block   → chunker updates draft
  └─ final reply → normal message
```

图例：

- `sendMessageDraft`：Telegram 草稿气泡（不是真实消息）。
- `final reply`：正常的 Telegram 消息发送。