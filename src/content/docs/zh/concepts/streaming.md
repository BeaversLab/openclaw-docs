---
summary: "流式传输和分块行为（块回复、频道预览流式传输、模式映射）"
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

- `text_delta/events`：模型流式事件（对于非流式模型可能较为稀疏）。
- `chunker`：`EmbeddedBlockChunker` 应用最小/最大边界 + 断点偏好。
- `channel send`：实际出站消息（块回复）。

**控制项：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 频道覆盖：`*.blockStreaming`（以及按帐户变体）可强制每个频道使用 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在发送前合并流式块）。
- 频道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 频道分块模式：`*.chunkMode`（`length` 默认，`newline` 在长度分块前于空行（段落边界）处分割）。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认为 17）分割高大的回复以避免 UI 裁剪。

**边界语义：**

- `text_end`：在分块器发出时立即流式传输块；在每个 `text_end` 上刷新。
- `message_end`：等待直到助手消息完成，然后刷新缓冲输出。

`message_end` 如果缓冲文本超过 `maxChars` 仍会使用分块器，因此它可以在末尾发出多个块。

## 分块算法（低/高边界）

块分块由 `EmbeddedBlockChunker` 实现：

- **低边界：**在缓冲区 >= `minChars` 之前不发出（除非强制）。
- **上限：** 优先在 `maxChars` 之前拆分；如果被迫拆分，则在 `maxChars` 处拆分。
- **中断偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬中断。
- **代码围栏：** 永远不在围栏内拆分；如果在 `maxChars` 处被迫拆分，则关闭并重新打开围栏以保持 Markdown 有效。

`maxChars` 被限制为频道 `textChunkLimit`，因此你不能超过每个频道的上限。

## 合并（合并流式块）

启用块流式传输时，OpenClaw 可以在发送之前**合并连续的块块**。
这减少了“单行刷屏”，同时仍然提供
渐进式输出。

- 合并会在刷新前等待 **空闲间隙** (`idleMs`)。
- 缓冲区受 `maxChars` 限制，如果超过该限制则会刷新。
- `minChars` 防止发送微小的片段，直到积累足够的文本（最终刷新总是会发送剩余的文本）。
- 连接符派生自 `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → 空格)。
- 可以通过 `*.blockStreamingCoalesce` 进行频道覆盖（包括每个账户的配置）。
- 默认合并 `minChars` 对于 Signal/Slack/Discord 被提升至 1500，除非被覆盖。

## 块之间的拟人化节奏

启用分块流式传输后，您可以在块回复之间添加**随机暂停**（在第一个块之后）。这使得多气泡响应感觉更自然。

- 配置：`agents.defaults.humanDelay`（通过 `agents.list[].humanDelay` 对每个代理进行覆盖）。
- 模式：`off`（默认），`natural`（800–2500ms），`custom`（`minMs`/`maxMs`）。
- 仅适用于**块回复**，不适用于最终回复或工具摘要。

## "流式传输块或所有内容"

这对应于：

- **流式分块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` （即时发送）。非 Telegram 频道还需要 `*.blockStreaming: true`。
- **在结束时流式传输所有内容：** `blockStreamingBreak: "message_end"`（刷新一次，如果非常长则可能是多个分块）。
- **无分块流式传输：** `blockStreamingDefault: "off"`（仅最终回复）。

**频道注意：** 除非
`*.blockStreaming` 被显式设置为 `true`，否则分块流式传输是**关闭的**。频道可以流式传输实时预览
(`channels.<channel>.streaming`) 而无需块回复。

配置位置提醒：`blockStreaming*` 默认值位于
`agents.defaults` 下，而不是根配置中。

## 预览流式传输模式

规范键：`channels.<channel>.streaming`

模式：

- `off`：禁用预览流式传输。
- `partial`：会被最新文本替换单个预览。
- `block`：预览更新以分块/追加步骤进行。
- `progress`：生成过程中的进度/状态预览，完成时的最终答案。

### 通道映射

| 通道       | `off` | `partial` | `block` | `progress`       |
| ---------- | ----- | --------- | ------- | ---------------- |
| Telegram   | ✅    | ✅        | ✅      | 映射到 `partial` |
| Discord    | ✅    | ✅        | ✅      | 映射到 `partial` |
| Slack      | ✅    | ✅        | ✅      | ✅               |
| Mattermost | ✅    | ✅        | ✅      | ✅               |

Slack-only:

- `channels.slack.streaming.nativeTransport` 切换 Slack 原生流式传输 API 调用，当 `channels.slack.streaming.mode="partial"`（默认：`true`）。
- Slack 原生流式传输和 Slack 助手线程状态需要一个回复线程目标；顶层私信不显示该线程风格的预览。

旧版键迁移：

- Telegram：`streamMode` + 布尔值 `streaming` 自动迁移到 `streaming` 枚举。
- Discord：`streamMode` + 布尔值 `streaming` 自动迁移到 `streaming` 枚举。
- Slack：`streamMode` 自动迁移到 `streaming.mode`；布尔值 `streaming` 自动迁移到 `streaming.mode` 加上 `streaming.nativeTransport`；传统的 `nativeStreaming` 自动迁移到 `streaming.nativeTransport`。

### 运行时行为

Telegram：

- 在私信和群组/主题中，使用 `sendMessage` + `editMessageText` 预览更新。
- 当明确启用 Telegram 分块流式传输时，将跳过预览流式传输（以避免双重流式传输）。
- `/reasoning stream` 可以将推理内容写入预览。

Discord：

- 使用发送 + 编辑预览消息。
- `block` 模式使用草稿分块（`draftChunk`）。
- 当明确启用 Discord 分块流式传输时，将跳过预览流式传输。
- 最终媒体、错误和显式回复载荷会取消待处理的预览，而不会刷新新草稿，然后使用正常投递方式。

Slack：

- `partial` 可以在可用时使用 Slack 原生流式传输（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加式草稿预览。
- `progress` 使用状态预览文本，然后是最终答案。
- 最终媒体/错误载荷和进度终结器不会创建一次性草稿消息；只有可以编辑预览的文本/块终结器才会刷新待处理的草稿文本。

Mattermost：

- 将思考、工具活动和部分回复文本流式传输到单个草稿预览帖子中，当最终答案可以安全发送时，该帖子会在原位完成。
- 如果在最终确定时预览帖子已被删除或因其他原因不可用，则回退到发送一条新的最终帖子。
- 最终媒体/错误负载在正常交付之前取消挂起的预览更新，而不是刷新临时预览帖子。

Matrix：

- 当最终文本可以复用预览事件时，草稿预览会在原位完成。
- 仅媒体、错误和回复目标不匹配的最终消息会在正常交付之前取消挂起的预览更新；已可见的过时预览将被撤回。

### 工具进度预览更新

预览流还可以包含 **工具进度** 更新 —— 即简短的状态行，例如“正在搜索网络”、“正在读取文件”或“正在调用工具” —— 它们在工具运行期间出现在同一条预览消息中，位于最终回复之前。这使得多步骤工具轮次在视觉上保持活跃，而不是在第一次思考预览和最终答案之间保持沉默。

支持的平台：

- **Discord**、**Slack** 和 **Telegram** 将工具进度流式传输到实时预览编辑中。
- **Mattermost** 已经将工具活动折叠到其单个草稿预览帖子中（见上文）。
- 工具进度编辑遵循活动的预览流式传输模式；当预览流式传输为 `off` 或当分块流式传输已接管消息时，它们将被跳过。

## 相关

- [消息](/zh/concepts/messages) — 消息生命周期和传递
- [重试](/zh/concepts/retry) — 传递失败时的重试行为
- [渠道](/zh/channels) — 每个渠道的流式传输支持
