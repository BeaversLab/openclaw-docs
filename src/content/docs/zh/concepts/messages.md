---
summary: "消息流、会话、排队和推理可见性"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "消息"
---

OpenClaw 通过一系列流程处理入站消息，包括会话解析、排队、流式传输、工具执行和推理可见性。本页面描绘了从入站消息到回复的路径。

## 消息流（高层级）

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

关键配置项位于配置中：

- `messages.*` 用于前缀、排队和群组行为。
- `agents.defaults.*` 用于分块流式传输和分块默认值。
- 渠道覆盖（`channels.whatsapp.*`、`channels.telegram.*` 等）用于上限和流式传输开关。

完整架构请参阅 [配置](/zh/gateway/configuration)。

## 入站去重

渠道在重连后可能会重新传递同一条消息。OpenClaw 会保留一个短期缓存，其键包含渠道/账号/对端/会话/消息 ID，以防止重复投递触发另一次代理运行。

## 入站防抖

来自 **同一发送者** 的快速连续消息可以通过 `messages.inbound` 合并为单个代理回合。防抖的范围是按渠道 + 会话划分的，并使用最新的消息进行回复串接/ID 处理。

配置（全局默认值 + 各渠道覆盖）：

```json5
{
  messages: {
    inbound: {
      debounceMs: 2000,
      byChannel: {
        whatsapp: 5000,
        slack: 1500,
        discord: 1500,
      },
    },
  },
}
```

说明：

- 防抖仅适用于 **纯文本** 消息；媒体/附件会立即刷新。
- 控制命令会绕过防抖，使其保持独立 —— **除非** 渠道明确选择加入同一发送者的私信合并功能（例如 [BlueBubbles `coalesceSameSenderDms`](/zh/channels/bluebubbles#coalescing-split-send-dms-command--url-in-one-composition)），在此情况下，私信命令会在防抖窗口内等待，以便分批发送的载荷可以加入同一个代理回合。

## 会话和设备

会话归网关所有，而非归客户端所有。

- 直接聊天会合并到代理主会话键。
- 群组/渠道拥有各自的会话键。
- 会话存储和文字记录位于网关主机上。

多个设备/渠道可以映射到同一个会话，但历史记录不会完全同步回每个客户端。建议：对于长对话，请使用一个主设备以避免上下文分歧。控制 UI 和 TUI 始终显示网关支持的会话文字记录，因此它们是事实来源。

详情：[会话管理](/zh/concepts/session)。

## 工具结果元数据

工具结果 `content` 是模型可见的结果。工具结果 `details` 是
用于 UI 渲染、诊断、媒体交付和插件的运行时元数据。

OpenClaw 保持了这一界限的明确：

- 在提供商重放和压缩输入之前，`toolResult.details` 会被剥离。
- 持久化的会话记录仅保留有界的 `details`；超大的元数据
  会被替换为标记为 `persistedDetailsTruncated: true` 的精简摘要。
- 插件和工具应将模型必须读取的文本放入 `content`，而不仅仅是
  在 `details` 中。

## 入站消息体和历史上下文

OpenClaw 将 **提示词主体（prompt body）** 与 **命令主体（command body）** 分开：

- `Body`：发送给代理的提示词文本。这可能包括渠道信封和
  可选的历史记录包装器。
- `CommandBody`：用于指令/命令解析的原始用户文本。
- `RawBody`：`CommandBody` 的旧版别名（保留以兼容）。

当渠道提供历史记录时，它使用共享的包装器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

对于 **非直接聊天**（群组/频道/房间），**当前消息主体** 会加上
发送者标签前缀（与历史记录条目使用的样式相同）。这使得实时和排队/历史
消息在代理提示词中保持一致。

历史记录缓冲区是 **仅待处理** 的：它们包括 _未_
触发运行的群组消息（例如，提及门控的消息），并 **排除**
已经在会话记录中的消息。

指令剥离仅适用于 **当前消息** 部分，以便历史记录
保持完整。包装历史记录的渠道应将 `CommandBody`（或
`RawBody`）设置为原始消息文本，并保持 `Body` 为组合提示词。
历史记录缓冲区可通过 `messages.groupChat.historyLimit`（全局
默认值）和特定渠道覆盖配置，如 `channels.slack.historyLimit` 或
`channels.telegram.accounts.<id>.historyLimit`（设置 `0` 以禁用）。

## 排队和后续跟进

如果一次运行正在进行，传入的消息可以被排队、引导到当前运行中，或被收集以进行后续轮次。

- 通过 `messages.queue`（以及 `messages.queue.byChannel`）进行配置。
- 模式：`interrupt`、`steer`、`followup`、`collect`，以及积压变体。

详情：[队列处理](/zh/concepts/queue)。

## 流式传输、分块和批处理

分块流式传输在模型生成文本块时发送部分回复。分块功能遵守渠道文本限制，并避免分割围栏代码块。

关键设置：

- `agents.defaults.blockStreamingDefault`（`on|off`，默认关闭）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk`（`minChars|maxChars|breakPreference`）
- `agents.defaults.blockStreamingCoalesce`（基于空闲的批处理）
- `agents.defaults.humanDelay`（块回复之间类似人类的暂停）
- 渠道覆盖：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 渠道需要显式设置 `*.blockStreaming: true`）

详情：[流式传输 + 分块](/zh/concepts/streaming)。

## 推理可见性和 Token

OpenClaw 可以显示或隐藏模型推理：

- `/reasoning on|off|stream` 控制可见性。
- 当模型生成推理内容时，该内容仍计入 Token 使用量。
- Telegram 支持将推理流发送到草稿气泡中。

详情：[思考 + 推理指令](/zh/tools/thinking) 和 [Token 使用](/zh/reference/token-use)。

## 前缀、会话线程和回复

出站消息格式化集中在 `messages` 中：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（出站前缀级联），以及 `channels.whatsapp.messagePrefix`（WhatsApp 入站前缀）
- 通过 `replyToMode` 和各渠道默认值进行回复线程化

详情：[配置](/zh/gateway/config-agents#messages) 和渠道文档。

## 静默回复

确切的静默令牌 `NO_REPLY` / `no_reply` 意味着“不发送用户可见的回复”。
当一个回合也有待处理的工具媒体（例如生成的 TTS 音频）时，OpenClaw
会去除静默文本，但仍会发送媒体附件。
OpenClaw 根据对话类型解析该行为：

- 直接对话默认不允许静默，并将单纯的静默
  回复重写为简短的可视回退。
- 群组/频道默认允许静默。
- 内部编排默认允许静默。

OpenClaw 也在非直接对话中任何助手回复之前发生的内部运行器故障使用静默回复，因此群组/频道不会看到
网关错误样板文本。直接聊天默认显示紧凑的故障文本；
仅当 `/verbose` 为 `on` 或 `full` 时才显示原始运行器详细信息。

默认值位于 `agents.defaults.silentReply` 和
`agents.defaults.silentReplyRewrite` 之下；`surfaces.<id>.silentReply` 和
`surfaces.<id>.silentReplyRewrite` 可以针对每个界面覆盖它们。

当父会话有一个或多个待处理的生成的子代理运行时，单纯的
静默回复将在所有界面上被丢弃而不是被重写，因此
父会话将保持静默，直到子完成事件发送真正的回复。

## 相关

- [Streaming](/zh/concepts/streaming) — 实时消息传递
- [Retry](/zh/concepts/retry) — 消息传递重试行为
- [Queue](/zh/concepts/queue) — 消息处理队列
- [Channels](/zh/channels) — 消息平台集成
