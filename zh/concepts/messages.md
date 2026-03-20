---
summary: "消息流、会话、排队以及推理可见性"
read_when:
  - 解释入站消息如何转变为回复
  - 阐明会话、排队模式或流式传输行为
  - 记录推理可见性及使用影响
title: "Messages"
---

# Messages

本页面将 OpenClaw 如何处理入站消息、会话、排队、流式传输以及推理可见性联系起来。

## Message flow (high level)

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

关键配置项位于配置中：

- `messages.*` 用于前缀、排队和群组行为。
- `agents.defaults.*` 用于分块流式传输和分块默认设置。
- 渠道覆盖（`channels.whatsapp.*`、`channels.telegram.*` 等）用于限制和流式传输开关。

完整架构请参阅 [Configuration](/zh/gateway/configuration)。

## Inbound dedupe

渠道在重连后可能会重新投递同一条消息。OpenClaw 保留一个短期缓存，以渠道/账户/对端/会话/消息 ID 作为键，因此重复投递不会触发另一次代理运行。

## Inbound debouncing

来自**同一发送者**的连续快速消息可以通过 `messages.inbound` 批处理为单个代理回合。防抖范围限定为每个渠道 + 会话，并使用最新消息进行回复线程/ID 处理。

配置（全局默认值 + 每个渠道的覆盖）：

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

备注：

- 防抖仅适用于**纯文本**消息；媒体/附件会立即刷新。
- 控制命令会绕过防抖，以保持其独立性。

## Sessions and devices

会话归网关所有，而非客户端。

- 直接聊天折叠为代理主会话键。
- 群组/渠道拥有各自的会话键。
- 会话存储和文字记录位于网关主机上。

多个设备/渠道可以映射到同一会话，但历史记录不会完全同步回每个客户端。建议：对于长对话，请使用一个主设备以避免上下文不一致。Control UI 和 TUI 始终显示网关支持的会话记录，因此它们是事实来源。

详情：[Session management](/zh/concepts/session)。

## Inbound bodies and history context

OpenClaw 将 **prompt body** 与 **command body** 分离：

- `Body`: 发送给代理的提示文本。这可能包含渠道信封和可选的历史包装器。
- `CommandBody`: 用于指令/命令解析的原始用户文本。
- `RawBody`: `CommandBody` 的旧别名（为了兼容性而保留）。

当渠道提供历史记录时，它使用一个共享的包装器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

对于**非直接聊天**（群组/频道/房间），**当前消息正文**会加上发送者标签前缀（与历史记录条目使用的样式相同）。这使实时消息和排队/历史消息在代理提示中保持一致。

历史缓冲区是**仅限待处理**的：它们包括未触发运行的群组消息（例如，提及门控的消息），并**排除**已在会话记录中的消息。

指令剥离仅适用于**当前消息**部分，因此历史记录保持完整。包装历史记录的渠道应将 `CommandBody`（或 `RawBody`）设置为原始消息文本，并将 `Body` 保留为组合提示。历史缓冲区可通过 `messages.groupChat.historyLimit`（全局默认）和每渠道覆盖（如 `channels.slack.historyLimit` 或 `channels.telegram.accounts.<id>.historyLimit`，设置 `0` 以禁用）进行配置。

## 排队和后续跟进

如果一个运行已在活动状态，入站消息可以排队、引导进入当前运行，或为后续回合收集。

- 通过 `messages.queue`（和 `messages.queue.byChannel`）进行配置。
- 模式：`interrupt`、`steer`、`followup`、`collect`，以及积压变体。

详情：[排队](/zh/concepts/queue)。

## 流式传输、分块和批处理

分块流式传输在模型生成文本块时发送部分回复。分块遵守渠道文本限制并避免拆分围栏代码。

关键设置：

- `agents.defaults.blockStreamingDefault`（`on|off`，默认关闭）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk` (`minChars|maxChars|breakPreference`)
- `agents.defaults.blockStreamingCoalesce` (基于空闲的批处理)
- `agents.defaults.humanDelay` (块回复之间类似人类的暂停)
- 渠道覆盖：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 渠道需要显式设置 `*.blockStreaming: true`）

详细信息：[Streaming + chunking](/zh/concepts/streaming)。

## 推理可见性和令牌

OpenClaw 可以暴露或隐藏模型的推理过程：

- `/reasoning on|off|stream` 控制可见性。
- 推理内容在由模型生成时仍计入令牌使用量。
- Telegram 支持将推理流传输到草稿气泡中。

详细信息：[Thinking + reasoning directives](/zh/tools/thinking) 和 [Token use](/zh/reference/token-use)。

## 前缀、线索和回复

出站消息格式集中在 `messages` 中：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（出站前缀级联），以及 `channels.whatsapp.messagePrefix`（WhatsApp 入站前缀）
- 通过 `replyToMode` 和每个渠道的默认值进行回复线索编排

详细信息：[Configuration](/zh/gateway/configuration#messages) 和渠道文档。

import en from "/components/footer/en.mdx";

<en />
