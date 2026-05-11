---
summary: "流式传输和分块行为（区块回复、渠道预览流式传输、模式映射）"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "流式传输和分块"
---

OpenClaw 有两个独立的流式传输层：

- **分块流式传输（渠道）：** 在助手写入时发出已完成的**区块**。这些是正常的渠道消息（而非 token 增量）。
- **预览流式传输（Telegram/Discord/Slack）：** 在生成过程中更新临时的**预览消息**。

目前向渠道消息**没有真正的 token 增量流式传输**。预览流式传输是基于消息的（发送 + 编辑/追加）。

## 分块流式传输（渠道消息）

分块流式传输在助手输出可用时，将其以粗粒度区块的形式发送。

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

- `text_delta/events`：模型流事件（对于非流式模型可能是稀疏的）。
- `chunker`：`EmbeddedBlockChunker` 应用最小/最大边界 + 断行偏好。
- `channel send`：实际发出的消息（区块回复）。

**控制选项：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 渠道覆盖：`*.blockStreaming`（以及每个账户的变体）以强制每个渠道执行 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在发送之前合并已流式传输的区块）。
- 渠道硬上限：`*.textChunkLimit`（例如 `channels.whatsapp.textChunkLimit`）。
- 渠道分块模式：`*.chunkMode`（`length` 默认，`newline` 在长度分块前按空行分割（段落边界））。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认 17）分割过高的回复以避免 UI 截断。

**边界语义：**

- `text_end`：一旦分块器发出就立即流式传输区块；在每个 `text_end` 上刷新。
- `message_end`：等待直到助手消息完成，然后刷新缓冲输出。

如果缓冲文本超过 `maxChars`，`message_end` 仍然使用分块器，因此它可以在最后发出多个块。

### 使用分块流式传输进行媒体交付

`MEDIA:` 指令是正常的交付元数据。当分块流式传输提前发送
媒体块时，OpenClaw 会记住该轮次的交付。如果最终的
助手负载重复相同的媒体 URL，则最终交付会剔除
重复的媒体，而不是再次发送附件。

完全重复的最终负载会被抑制。如果最终负载在已流式传输的媒体周围添加
了不同的文本，OpenClaw 仍会发送
新文本，同时保持媒体仅交付一次。这可以防止在 Telegram 等渠道上出现重复的语音
备注或文件，例如当代理在
流式传输期间发出 `MEDIA:`，而提供商也在完成的回复中包含它时。

## 分块算法（下限/上限）

分块分块由 `EmbeddedBlockChunker` 实现：

- **下限：** 除非被强制，否则在缓冲区 >= `minChars` 之前不发出。
- **上限：** 优先在 `maxChars` 之前分割；如果被强制，则在 `maxChars` 处分割。
- **中断优先级：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬中断。
- **代码围栏：** 从不在此围栏内分割；当在 `maxChars` 被强制时，关闭并重新打开围栏以保持 Markdown 有效。

`maxChars` 被限制为渠道 `textChunkLimit`，因此您无法超过每个渠道的上限。

## 合并（合并流式传输的块）

启用分块流式传输后，OpenClaw 可以在
发送之前**合并连续的块**。
这减少了“单行垃圾信息”，同时仍然提供
渐进式输出。

- 合并在刷新之前等待 **空闲间隙**（`idleMs`）。
- 缓冲区受 `maxChars` 限制，如果超过将刷新。
- `minChars` 防止发送细小的片段，直到积累了足够的文本
  （最后的刷新始终会发送剩余文本）。
- 连接器派生自 `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → 空格)。
- 可以通过 `*.blockStreamingCoalesce` 进行频道覆盖（包括每个账户的配置）。
- 除非被覆盖，否则对于 Signal/Slack/Discord，默认的合并 `minChars` 会提升至 1500。

## 区块之间的仿人类节奏

启用分块流式传输时，您可以在区块回复之间（第一个区块之后）添加**随机暂停**。这使得多气泡响应感觉更自然。

- 配置：`agents.defaults.humanDelay`（可通过 `agents.list[].humanDelay` 按代理覆盖）。
- 模式：`off`（默认），`natural`（800–2500ms），`custom`（`minMs`/`maxMs`）。
- 仅适用于**区块回复**，不适用于最终回复或工具摘要。

## "流式传输分块还是所有内容"

这映射到：

- **流式传输分块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（边走边发）。非 Telegram 频道还需要 `*.blockStreaming: true`。
- **在结束时流式传输所有内容：** `blockStreamingBreak: "message_end"`（刷新一次，如果非常长则可能是多个分块）。
- **无分块流式传输：** `blockStreamingDefault: "off"`（仅最终回复）。

**频道注意：** 除非明确将 `*.blockStreaming` 设置为 `true`，否则分块流式传输为**关闭**状态。频道可以在没有区块回复的情况下流式传输实时预览
(`channels.<channel>.streaming`)。

配置位置提醒：`blockStreaming*` 默认值位于 `agents.defaults` 下，而不是根配置中。

## 预览流式传输模式

规范键：`channels.<channel>.streaming`

模式：

- `off`：禁用预览流式传输。
- `partial`：用最新文本替换单个预览。
- `block`：以分块/追加步骤进行预览更新。
- `progress`：在生成过程中显示进度/状态预览，完成时显示最终答案。

### 频道映射

| 频道       | `off` | `partial` | `block` | `progress`       |
| ---------- | ----- | --------- | ------- | ---------------- |
| Telegram   | ✅    | ✅        | ✅      | 映射到 `partial` |
| Discord    | ✅    | ✅        | ✅      | 映射到 `partial` |
| Slack      | ✅    | ✅        | ✅      | ✅               |
| Mattermost | ✅    | ✅        | ✅      | ✅               |

仅限 Slack：

- 当 `channels.slack.streaming.mode="partial"` 时，`channels.slack.streaming.nativeTransport` 会切换 Slack 原生流式传输 API 调用（默认：`true`）。
- Slack 原生流式传输和 Slack 助手线程状态需要回复线程目标；顶级私信不会显示该线程样式的预览。

旧版密钥迁移：

- Telegram：通过 doctor/config 兼容性路径检测并迁移旧版 `streamMode` 和标量/布尔 `streaming` 值至 `streaming.mode`。
- Discord：`streamMode` + 布尔 `streaming` 会自动迁移到 `streaming` 枚举。
- Slack：`streamMode` 自动迁移到 `streaming.mode`；布尔 `streaming` 自动迁移到 `streaming.mode` 以及 `streaming.nativeTransport`；旧版 `nativeStreaming` 自动迁移到 `streaming.nativeTransport`。

### 运行时行为

Telegram：

- 在私信和群组/主题中使用 `sendMessage` + `editMessageText` 预览更新。
- 当预览显示约一分钟后，发送新的最终消息而不是原地编辑，然后清理预览，以便 Telegram 的时间戳反映回复完成。
- 当显式启用 Telegram 分块流式传输时，将跳过预览流式传输（以避免双重流式传输）。
- `/reasoning stream` 可以将推理内容写入预览。

Discord：

- 使用发送 + 编辑预览消息。
- `block` 模式使用草稿分块（`draftChunk`）。
- 当显式启用 Discord 分块流式传输时，将跳过预览流式传输。
- 最终媒体、错误和显式回复负载会取消待处理的预览，而不会刷新新的草稿，然后使用正常发送方式。

Slack：

- `partial` 在可用时可以使用 Slack 原生流式传输（`chat.startStream`/`append`/`stop`）。
- `block` 使用追加风格的草稿预览。
- `progress` 使用状态预览文本，然后是最终答案。
- 原生和草稿预览流式传输会抑制该轮次的块回复，因此 Slack 回复仅通过一个发送路径进行流式传输。
- 最终媒体/错误负载和进度终结不会创建一次性草稿消息；只有可以编辑预览的文本/块终结才会刷新待处理的草稿文本。

Mattermost：

- 将思考、工具活动和部分回复文本流式传输到单个草稿预览帖子中，当最终答案可以安全发送时，该帖子会在原位完成。
- 如果预览帖子在完成时被删除或以其他方式不可用，则回退到发送新的最终帖子。
- 最终媒体/错误负载会在正常发送之前取消待处理的预览更新，而不是刷新临时预览帖子。

Matrix：

- 当最终文本可以复用预览事件时，草稿预览会在原位完成。
- 仅媒体、错误和回复目标不匹配的终结会在正常发送之前取消待处理的预览更新；已经可见的过时预览将被撤回。

### 工具进度预览更新

预览流式传输还可以包含 **工具进度** 更新——简短的状态行，如“正在搜索网络”、“正在读取文件”或“正在调用工具”——它们在工具运行时出现在同一条预览消息中，位于最终回复之前。这可以使多步骤工具轮次在视觉上保持活跃，而不是在第一次思考预览和最终答案之间保持静默。

支持的平台：

- **Discord**、**Slack** 和 **Telegram** 默认情况下，当预览流式传输处于活动状态时，会将工具进度流式传输到实时预览编辑中。
- Telegram 自 `v2026.4.22` 版本发布时已启用工具进度预览更新；保持启用状态可保留该发布行为。
- **Mattermost** 已将工具活动合并到其单个草稿预览帖子中（见上文）。
- 工具进度编辑遵循当前的预览流式传输模式；当预览流式传输为 `off` 或当分块流式传输已接管该消息时，它们将被跳过。
- 若要保留预览流式传输但隐藏工具进度行，请为该渠道将 `streaming.preview.toolProgress` 设置为 `false`。若要完全禁用预览编辑，请将 `streaming.mode` 设置为 `off`。

示例：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": false
        }
      }
    }
  }
}
```

## 相关

- [消息](/zh/concepts/messages) — 消息生命周期和投递
- [重试](/zh/concepts/retry) — 投递失败时的重试行为
- [渠道](/zh/channels) — 各渠道的流式传输支持
