---
summary: "流式传输与分块行为（块回复、渠道预览流式传输、模式映射）"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "流式传输与分块"
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

- `text_delta/events`：模型流式事件（对于非流式模型可能比较稀疏）。
- `chunker`：`EmbeddedBlockChunker` 应用最小/最大边界 + 断行偏好。
- `channel send`：实际发出的消息（块回复）。

**控制选项：**

- `agents.defaults.blockStreamingDefault`：`"on"`/`"off"`（默认关闭）。
- 渠道覆盖设置：`*.blockStreaming`（以及每个账户的变体）以强制对每个渠道应用 `"on"`/`"off"`。
- `agents.defaults.blockStreamingBreak`：`"text_end"` 或 `"message_end"`。
- `agents.defaults.blockStreamingChunk`：`{ minChars, maxChars, breakPreference? }`。
- `agents.defaults.blockStreamingCoalesce`：`{ minChars?, maxChars?, idleMs? }`（在发送前合并流式传输的块）。
- 渠道硬上限：`*.textChunkLimit`（例如，`channels.whatsapp.textChunkLimit`）。
- 渠道分块模式：`*.chunkMode`（`length` 默认，`newline` 在长度分块之前按空行（段落边界）拆分）。
- Discord 软上限：`channels.discord.maxLinesPerMessage`（默认 17）拆分过长的回复以避免 UI 截断。

**边界语义：**

- `text_end`：分块器一旦发出块就立即流式传输；在每个 `text_end` 时刷新。
- `message_end`：等待直到助手消息完成，然后刷新缓冲的输出。

如果缓冲的文本超过 `maxChars`，`message_end` 仍然使用分块器，以便它可以在最后发出多个块。

### 使用分块流式传输进行媒体交付

`MEDIA:` 指令是正常的交付元数据。当分块流式传输提前发送媒体块时，OpenClaw 会记住该轮次的交付。如果最终的助手负载重复相同的媒体 URL，则最终交付会移除重复的媒体，而不是再次发送附件。

完全重复的最终有效载荷会被抑制。如果最终有效载荷在已流式传输的媒体周围添加了不同的文本，OpenClaw 仍会发送新文本，同时保持媒体只发送一次。这可以防止在代理流式传输期间发出 OpenClawTelegram`MEDIA:` 且提供商也在完成的回复中包含它时，在 Telegram 等渠道上出现重复的语音笔记或文件。

## 分块算法（下限/上限）

分块分块由 `EmbeddedBlockChunker` 实现：

- **下限：** 除非强制，否则直到缓冲区 >= `minChars` 才发出。
- **上限：** 优先在 `maxChars` 之前分割；如果强制，则在 `maxChars` 处分割。
- **中断偏好：** `paragraph` → `newline` → `sentence` → `whitespace` → 硬中断。
- **代码围栏：** 从不在围栏内分割；当在 `maxChars` 处强制分割时，关闭并重新打开围栏以保持 Markdown 有效。

`maxChars` 被限制为渠道 `textChunkLimit`，因此您不能超过每个渠道的上限。

## 合并（合并流式传输的块）

当启用分块流式传输时，OpenClaw 可以在发送之前**合并连续的分块块**。这减少了“单行垃圾信息”，同时仍提供渐进式输出。

- 合并在刷新之前等待**空闲间隔** (`idleMs`)。
- 缓冲区受 `maxChars` 限制，如果超过限制将刷新。
- `minChars` 阻止发送微小的片段，直到累积了足够的文本（最终刷新总是发送剩余文本）。
- 连接符源自 `blockStreamingChunk.breakPreference` (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → 空格)。
- 渠道覆盖可以通过 `*.blockStreamingCoalesce` 获得（包括每个账户的配置）。
- 除非被覆盖，否则 Signal/Slack/Discord 的默认合并 `minChars`SignalSlackDiscord 会提升到 1500。

## 区块之间的仿人类节奏

启用分块流式传输时，您可以在区块回复之间（第一个区块之后）添加**随机暂停**。这使得多气泡响应感觉更自然。

- 配置：`agents.defaults.humanDelay`（可通过 `agents.list[].humanDelay` 为每个代理覆盖）。
- 模式：`off`（默认），`natural`（800-2500毫秒），`custom`（`minMs`/`maxMs`）。
- 仅适用于**区块回复**，不适用于最终回复或工具摘要。

## "流式传输分块还是所有内容"

这映射到：

- **流式传输分块：** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"`（即时发送）。非 Telegram 渠道还需要 `*.blockStreaming: true`。
- **在末尾流式传输所有内容：** `blockStreamingBreak: "message_end"`（刷新一次，如果非常长则可能是多个分块）。
- **无分块流式传输：** `blockStreamingDefault: "off"`（仅最终回复）。

**渠道注意：** 除非明确将 `*.blockStreaming` 设置为 `true`，否则分块流式传输是**关闭的**。渠道可以流式传输实时预览（`channels.<channel>.streaming`）而无需分块回复。

配置位置提醒：`blockStreaming*` 默认值位于 `agents.defaults` 下，而不是根配置中。

## 预览流式传输模式

规范键：`channels.<channel>.streaming`

模式：

- `off`：禁用预览流式传输。
- `partial`：被最新文本替换单个预览。
- `block`：以分块/追加步骤更新预览。
- `progress`：生成过程中的进度/状态预览，完成时的最终答案。

`streaming.mode: "block"` 是一种适用于可编辑渠道（如 Discord 和 Telegram）的预览流式传输模式。它不会在那里启用渠道分块传递。当您需要正常的分块回复时，请使用 `streaming.block.enabled` 或传统的 `blockStreaming` 渠道键。Microsoft Teams 是例外：它没有草稿-预览分块传输机制，因此 `streaming.mode: "block"` 映射到 Teams 分块传递，而不是原生的部分/进度流式传输。

### 渠道映射

| 渠道       | `off` | `partial` | `block` | `progress`       |
| ---------- | ----- | --------- | ------- | ---------------- |
| Telegram   | ✅    | ✅        | ✅      | 可编辑的进度草稿 |
| Discord    | ✅    | ✅        | ✅      | 可编辑的进度草稿 |
| Slack      | ✅    | ✅        | ✅      | ✅               |
| Mattermost | ✅    | ✅        | ✅      | ✅               |
| MS Teams   | ✅    | ✅        | ✅      | 原生进度流       |

Slack-专属：

- 当 `channels.slack.streaming.mode="partial"` 时，`channels.slack.streaming.nativeTransport` 切换 Slack 原生流式 API 调用（默认：`true`）。
- Slack 原生流式传输和 Slack 助手线程状态需要一个回复线程目标。顶级私信不会显示该线程样式的预览，但它们仍可使用 Slack 草稿预览帖子和编辑。

旧版密钥迁移：

- Telegram：doctor/config 兼容性路径会检测并迁移旧版 `streamMode` 和标量/布尔 `streaming` 值为 `streaming.mode`。
- Discord：`streamMode` + 布尔 `streaming` 仍然是 `streaming` 枚举的运行时别名；运行 `openclaw doctor --fix` 以重写持久化配置。
- Slack：`streamMode` 仍然是 `streaming.mode` 的运行时别名；布尔 `streaming` 仍然是 `streaming.mode` 加上 `streaming.nativeTransport` 的运行时别名；旧版 `nativeStreaming` 仍然是 `streaming.nativeTransport` 的运行时别名。运行 `openclaw doctor --fix` 以重写持久化配置。

### 运行时行为

Telegram：

- 在私信和群组/话题中使用 `sendMessage` + `editMessageText` 预览更新。
- 最终文本原地编辑活动的预览；长最终结果复用该消息作为第一个分块，并仅发送剩余的分块。
- `progress` 模式将工具进度保留在可编辑的状态草稿中，在完成时清除该草稿，并通过正常传送发送最终答案。
- 如果在完成的文本得到确认之前最终编辑失败，OpenClaw 将使用正常的最终交付方式，并清理过时的预览。
- 当明确启用 Telegram 分块流式传输时，会跳过预览流式传输（以避免双重流式传输）。
- `/reasoning stream` 可以将推理内容写入临时预览，该预览将在最终交付后删除。

Discord：

- 使用发送 + 编辑预览消息。
- `block` 模式使用草稿分块 (`draftChunk`)。
- 当明确启用 Discord 分块流式传输时，会跳过预览流式传输。
- 最终的媒体、错误和显式回复负载会取消待处理的预览，而无需刷新新草稿，然后使用正常交付。

Slack：

- `partial` 可以在可用时使用 Slack 原生流式传输 (`chat.startStream`/`append`/`stop`)。
- `block` 使用追加式草稿预览。
- `progress` 使用状态预览文本，然后是最终答案。
- 没有回复线程的顶级私信使用草稿预览帖子和编辑，而不是 Slack 原生流式传输。
- 原生和草稿预览流式传输会抑制该轮次的块回复，因此 Slack 回复仅通过一条交付路径流式传输。
- 最终的媒体/错误负载和进度最终结果不会创建一次性草稿消息；只有可以编辑预览的文本/块最终结果才会刷新待处理的草稿文本。

Mattermost：

- 将思考、工具活动和部分回复文本流式传输到单个草稿预览帖子中，当最终答案可以安全发送时，该帖子会在原位完成。
- 如果在最终确定时预览帖子已被删除或无法使用，则回退到发送新的最终帖子。
- 最终的媒体/错误负载会在正常交付之前取消待处理的预览更新，而不是刷新临时预览帖子。

Matrix：

- 当最终文本可以重用预览事件时，草稿预览会在原位完成。
- 仅包含媒体、错误以及回复目标不匹配的最终结果会在正常投递之前取消待处理的预览更新；已显示的陈旧预览将被撤回。

### 工具进度预览更新

预览流式传输还可以包含 **工具-progress** 更新——例如“正在搜索网络”、“正在读取文件”或“正在调用工具”之类的简短状态行——这些内容会在工具运行期间显示在同一条预览消息中，且位于最终回复之前。在 Codex 应用服务器模式下，Codex 前言/评论消息也使用同一条预览路径，因此简短的“我正在检查...”进度说明可以流入可编辑的草稿，而不会成为最终答案的一部分。这使得多步工具调用在视觉上保持活跃，而不是在最初的思维预览和最终答案之间保持沉默。

支持的平台：

- **Discord**、**Slack**、**Telegram** 和 **Matrix** 在激活预览流式传输时，默认会将 工具-progress 和 Codex 前言更新流式传输到实时预览编辑中。Microsoft Teams 在个人聊天中使用其原生进度流。
- Telegram 自 `v2026.4.22` 版本发布以来默认启用了工具进度预览更新；保持启用状态可以保留该发布版本的行为。
- **Mattermost** 已经将工具活动合并到其唯一的草稿预览帖子中（见上文）。
- 工具进度编辑遵循活动的预览流式传输模式；当预览流式传输为 `off` 或分块流式传输已接管消息时，它们将被跳过。在 Telegram 上，`streaming.mode: "off"` 为仅限最终结果模式：普通的进度闲聊也会被抑制，而不是作为独立状态消息投递，而批准提示、媒体负载和错误仍会正常路由。
- 要保留预览流但隐藏工具进度行，请针对该渠道将 `streaming.preview.toolProgress` 设置为 `false`。要在隐藏命令/exec 文本的同时保持工具进度行可见，请将 `streaming.preview.commandText` 设置为 `"status"` 或将 `streaming.progress.commandText` 设置为 `"status"`；默认值为 `"raw"`，以保留已发布的行为。此策略由使用 OpenClaw 紧凑进度渲染器的草稿/进度渠道共享，包括 Discord、Matrix、Microsoft Teams、Mattermost、Slack 草稿预览和 Telegram。要完全禁用预览编辑，请将 `streaming.mode` 设置为 `off`。
- Telegram 选中的引用回复是一个例外：当 `replyToMode` 不为 `"off"` 且存在选中的引用文本时，OpenClaw 将跳过该回合的答案预览流，因此无法渲染工具进度预览行。没有选中引用文本的当前消息回复仍然保留预览流。详情请参阅 [Telegram 渠道文档](/zh/channels/telegram)。

保持进度行可见但隐藏原始命令/exec 文本：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

在其他紧凑进度渠道键下使用相同的结构，例如 `channels.discord`、`channels.matrix`、`channels.msteams`、`channels.mattermost` 或 Slack 草稿预览。对于进度草稿模式，请将相同的策略置于 `streaming.progress` 下：

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

## 相关

- [消息生命周期重构](/zh/concepts/message-lifecycle-refactor) - 目标共享预览、编辑、流和最终设计
- [进度草稿](/zh/concepts/progress-drafts) - 在长回合期间更新的可见工作进度消息
- [消息](/zh/concepts/messages) - 消息生命周期和传递
- [重试](/zh/concepts/retry) - 传递失败时的重试行为
- [渠道](/zh/channels) - 每个渠道的流式传输支持
