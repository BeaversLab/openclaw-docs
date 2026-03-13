---
summary: "消息流、会话、排队和推理可见性"
read_when:
  - Explaining how inbound messages become replies
  - Clarifying sessions, queueing modes, or streaming behavior
  - Documenting reasoning visibility and usage implications
title: "消息"
---

# 消息

本页面综合介绍了 OpenClaw 如何处理入站消息、会话、排队、流式传输以及推理可见性。

## 消息流（概览）

```
Inbound message
  -> routing/bindings -> session key
  -> queue (if a run is active)
  -> agent run (streaming + tools)
  -> outbound replies (channel limits + chunking)
```

关键的配置项位于配置中：

- `messages.*` 用于前缀、排队和组行为。
- `agents.defaults.*` 用于块流式传输和分块默认值。
- 频道覆盖（`channels.whatsapp.*`、`channels.telegram.*` 等）用于上限和流式传输开关。

完整架构请参阅 [配置](/en/gateway/configuration)。

## 入站去重

通道在重连后可能会重新传递同一条消息。OpenClaw 会保留一个短期缓存，键为通道/账户/对等方/会话/消息 ID，以防止重复传递触发另一次代理运行。

## 入站防抖

来自**同一发送者**的快速连续消息可以通过 `messages.inbound` 批处理为单个
代理轮次。防抖范围是每个频道 + 会话，并使用最新消息进行回复线程/ID 处理。

配置（全局默认值 + 每个通道的覆盖设置）：

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

注意：

- 防抖仅适用于**仅文本**消息；媒体/附件会立即刷新。
- 控制命令会绕过防抖，以保持其独立存在。

## 会话和设备

会话归网关所有，而非归客户端所有。

- 直接聊天会合并到代理主会话密钥中。
- 群组/频道拥有各自独立的会话密钥。
- 会话存储和记录副本位于网关主机上。

多个设备/通道可以映射到同一个会话，但历史记录不会完全同步回每个客户端。建议：对于长对话，请使用一个主设备以避免上下文分歧。控制 UI 和 TUI 始终显示网关支持的会话记录副本，因此它们是事实的来源。

详情：[会话管理](/en/concepts/session)。

## 入站正文和历史上下文

OpenClaw 将 **提示正文** 与 **命令正文** 分开：

- `Body`：发送给代理的提示文本。这可能包括频道信封和
  可选的历史记录包装器。
- `CommandBody`：用于指令/命令解析的原始用户文本。
- `RawBody`：`CommandBody` 的旧别名（为兼容性而保留）。

当频道提供历史记录时，它使用共享包装器：

- `[Chat messages since your last reply - for context]`
- `[Current message - respond to this]`

对于**非直接聊天**（群组/频道/房间），**当前消息正文**会带有发送者标签前缀（与历史记录条目使用的样式相同）。这使得实时消息和排队/历史消息在代理提示中保持一致。

历史缓冲区是**仅限待处理**的：它们包含_未_触发运行的群组消息（例如，提及 gated 的消息），并**排除**已在会话记录中的消息。

指令剥离仅适用于**当前消息**部分，因此历史记录保持完整。
包装历史记录的频道应将 `CommandBody`（或
`RawBody`）设置为原始消息文本，并将 `Body` 保留为组合提示。
历史缓冲区可通过 `messages.groupChat.historyLimit`（全局默认值）和每频道覆盖进行配置，例如
`channels.slack.historyLimit` 或
`channels.telegram.accounts.<id>.historyLimit`（设置 `0` 以禁用）。

## 排队和后续处理

如果运行已处于活动状态，则可以将传入消息排队、引导至当前运行中，或为后续回合收集。

- 通过 `messages.queue`（和 `messages.queue.byChannel`）进行配置。
- 模式：`interrupt`、`steer`、`followup`、`collect` 以及积压变体。

详情：[排队](/en/concepts/queue)。

## 流式传输、分块和批处理

块流式传输在模型生成文本块时发送部分回复。分块遵守频道文本限制并避免拆分围栏代码。

关键设置：

- `agents.defaults.blockStreamingDefault`（`on|off`，默认关闭）
- `agents.defaults.blockStreamingBreak`（`text_end|message_end`）
- `agents.defaults.blockStreamingChunk`（`minChars|maxChars|breakPreference`）
- `agents.defaults.blockStreamingCoalesce`（基于空闲的批处理）
- `agents.defaults.humanDelay`（块回复之间的类人暂停）
- 通道覆盖：`*.blockStreaming` 和 `*.blockStreamingCoalesce`（非 Telegram 通道需要显式 `*.blockStreaming: true`）

详情：[流式传输 + 分块](/en/concepts/streaming)。

## 推理可见性和令牌

OpenClaw 可以公开或隐藏模型推理：

- `/reasoning on|off|stream` 控制可见性。
- 推理内容由模型生成时，仍计入令牌使用量。
- Telegram 支持将推理流式传输到草稿气泡中。

详情：[思考 + 推理指令](/en/tools/thinking) 和 [令牌使用](/en/reference/token-use)。

## 前缀、串联回复和回复

出站消息格式化集中在 `messages` 中：

- `messages.responsePrefix`、`channels.<channel>.responsePrefix` 和 `channels.<channel>.accounts.<id>.responsePrefix`（出站前缀级联），加上 `channels.whatsapp.messagePrefix`（WhatsApp 入站前缀）
- 通过 `replyToMode` 和每个通道的默认值进行回复线程化

详情：[配置](/en/gateway/configuration#messages) 和通道文档。

import zh from '/components/footer/zh.mdx';

<zh />
