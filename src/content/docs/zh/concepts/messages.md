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

有关完整架构，请参阅 [配置](/zh/gateway/configuration)。

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
- 控制命令绕过防抖，因此它们保持独立。明确选择加入同一发送者私信合并的渠道可以在防抖窗口内保留私信命令，以便分批发送的负载可以加入同一个代理轮次。

## 会话和设备

会话归网关所有，而非归客户端所有。

- 直接聊天会合并到代理主会话键。
- 群组/渠道拥有各自的会话键。
- 会话存储和文字记录位于网关主机上。

多个设备/渠道可以映射到同一个会话，但历史记录不会完全同步回每个客户端。建议：对于长对话，请使用一个主设备以避免上下文分歧。控制 UI 和 TUI 始终显示网关支持的会话文字记录，因此它们是事实来源。

详情：[会话管理](/zh/concepts/session)。

## 工具结果元数据

工具结果 `content` 是模型可见的结果。工具结果 `details` 是用于UI渲染、诊断、媒体传递和插件的运行时元数据。

OpenClaw 保持了这一界限的明确：

- `toolResult.details` 在提供商重放和压缩输入之前会被剥离。
- 持久化的会话记录仅保留有界的 `details`；过大的元数据将被替换为标记为 `persistedDetailsTruncated: true` 的紧凑摘要。
- 插件和工具应将模型必须阅读的文本放在 `content` 中，而不仅仅是 `details`。

## 入站消息体和历史上下文

OpenClaw 将 **提示词主体（prompt body）** 与 **命令主体（command body）** 分开：

- `BodyForAgent`：当前消息的主要面向模型的文本。渠道插件应将其集中在发送者当前的提示文本上。
- `Body`：遗留的提示回退。这可能包括渠道包层和可选的历史包装器，但当 `BodyForAgent` 可用时，当前的渠道不应将其作为主要的模型输入。
- `CommandBody`：用于指令/命令解析的原始用户文本。
- `RawBody`：`CommandBody` 的遗留别名（为兼容性而保留）。

当渠道提供历史记录时，它使用共享的包装器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

对于**非直接聊天**（群组/频道/房间），**当前消息正文**会带有发送者标签前缀（与历史记录条目使用的样式相同）。这使实时和排队/历史消息在代理提示中保持一致。

历史缓冲区是**仅待处理**的：它们包括未触发运行的群组消息（例如，提及门控的消息），并且**排除**已经在会话记录中的消息。

指令剥离仅适用于**当前消息**部分，因此
历史记录保持完整。封装历史记录的渠道应将 `CommandBody`（或
`RawBody`）设置为原始消息文本，并保持 `Body` 为组合提示词。
结构化的历史记录、回复、转发和渠道元数据在提示词组装期间被渲染为
用户角色的不受信任上下文块。
历史记录缓冲区可通过 `messages.groupChat.historyLimit`（全局
默认值）和特定渠道覆盖（如 `channels.slack.historyLimit` 或
`channels.telegram.accounts.<id>.historyLimit`，设置 `0` 以禁用）进行配置。

## 队列与后续处理

如果运行已处于活动状态，则传入消息可以排队、引导至当前
运行，或收集以进行后续回合。

- 通过 `messages.queue`（和 `messages.queue.byChannel`）进行配置。
- 默认模式为 `steer`，当引导回退到
  排队的后续传递时，具有 500ms 的后续防抖。
- 模式包括：`steer`、`followup`、`collect`、`steer-backlog`、`interrupt`，以及
  传统的逐个 `queue` 模式。

详情：[命令队列](/zh/concepts/queue) 和 [引导队列](/zh/concepts/queue-steering)。

## 渠道运行所有权

渠道插件可以在消息进入会话队列之前保持顺序、对输入进行防抖并应用传输
背压。它们不应在代理回合本身周围施加单独的超时。
一旦消息被路由到会话，长时间运行的工作将由会话、工具和运行时
生命周期管理，因此所有渠道都能一致地报告和从缓慢的回合中恢复。

## 流式传输、分块和批处理

分块流式传输在模型生成文本块时发送部分回复。
分块操作遵循渠道文本限制，并避免分割围栏代码。

关键设置：

- `agents.defaults.blockStreamingDefault` (`on|off`，默认关闭)
- `agents.defaults.blockStreamingBreak` (`text_end|message_end`)
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (基于空闲的批处理)
- `agents.defaults.humanDelay` (块回复之间类似人类的停顿)
- 渠道覆盖：`*.blockStreaming` 和 `*.blockStreamingCoalesce` (非 Telegram 渠道需要显式的 `*.blockStreaming: true`)

详情：[流式传输 + 分块](/zh/concepts/streaming)。

## 推理可见性和令牌

OpenClaw 可以公开或隐藏模型推理：

- `/reasoning on|off|stream` 控制可见性。
- 推理内容在由模型生成时仍计入令牌使用量。
- Telegram 支持将推理流式传输到一个临时的草稿气泡中，该气泡在最终交付后会被删除；使用 `/reasoning on` 进行持久的推理输出。

详情：[思考 + 推理指令](/zh/tools/thinking) 和 [令牌使用](/zh/reference/token-use)。

## 前缀、会话线程和回复

出站消息格式化集中在 `messages` 中：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix` (出站前缀级联)，加上 `channels.whatsapp.messagePrefix` (WhatsApp 入站前缀)
- 通过 `replyToMode` 和每个渠道的默认值进行回复会话线程化

详情：[配置](/zh/gateway/config-agents#messages) 和渠道文档。

## 静默回复

确切的静默令牌 `NO_REPLY` / `no_reply` 意味着“不发送用户可见的回复”。
当一轮对话也有待处理的工具媒体（例如生成的 TTS 音频）时，OpenClaw
会去除静默文本，但仍发送媒体附件。
OpenClaw 根据对话类型解析该行为：

- 直接对话默认不允许静默，并将纯粹的静默回复
  重写为简短的可视回退。
- 群组/渠道默认允许静默。
- 内部编排默认允许静默。

OpenClaw 还会在非直接聊天中，在生成任何助手回复之前发生的内部运行器失败时使用静默回复，以便群组/频道不会看到网关错误样板文本。直接聊天默认显示紧凑的失败文本；仅当 OpenClaw`/verbose` 为 `on` 或 `full` 时才显示原始运行器详细信息。

默认值位于 `agents.defaults.silentReply` 和 `agents.defaults.silentReplyRewrite` 之下；`surfaces.<id>.silentReply` 和 `surfaces.<id>.silentReplyRewrite` 可以针对每个表面覆盖它们。

当父会话有一个或多个待处理的生成的子代理运行时，纯静默回复将在所有表面上被丢弃，而不是被重写，因此父会话将保持安静，直到子完成事件传递实际回复。

## 相关

- [消息生命周期重构](/zh/concepts/message-lifecycle-refactor) - 目标持久化发送和接收设计
- [流式传输](/zh/concepts/streaming) — 实时消息传递
- [重试](/zh/concepts/retry) — 消息传递重试行为
- [队列](/zh/concepts/queue) — 消息处理队列
- [频道](/zh/channels) — 消息平台集成
