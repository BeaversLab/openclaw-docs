---
summary: "API渠道插件的外发消息生命周期 API：适配器、回执、持久化发送、实时预览和回复管道辅助工具"
title: "API渠道外发 API"
read_when:
  - You are building or refactoring a messaging channel plugin send path
  - You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy
  - You are migrating from channel-message, channel-message-runtime, or legacy reply dispatch helpers
---

渠道插件应从
`openclaw/plugin-sdk/channel-outbound` 公开外发消息行为。使用
`openclaw/plugin-sdk/channel-inbound` 进行接收/上下文/分发编排。

核心负责队列、持久性、通用重试策略、钩子、回执以及
共享的 `message` 工具。插件负责原生发送/编辑/删除调用、目标
规范化、平台线程、选定的引用、通知标志、账户
状态以及平台特定的副作用。

## 适配器

大多数插件定义一个 `message` 适配器：

```ts
import { defineChannelMessageAdapter, createMessageReceiptFromOutboundResults } from "openclaw/plugin-sdk/channel-outbound";

export const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  durableFinal: {
    capabilities: {
      text: true,
      replyTo: true,
      thread: true,
      messageSendingHooks: true,
    },
  },
  send: {
    text: async ({ cfg, to, text, accountId, replyToId, threadId, signal }) => {
      const sent = await sendDemoMessage({
        cfg,
        to,
        text,
        accountId: accountId ?? undefined,
        replyToId: replyToId ?? undefined,
        threadId: threadId == null ? undefined : String(threadId),
        signal,
      });

      return {
        receipt: createMessageReceiptFromOutboundResults({
          results: [{ channel: "demo", messageId: sent.id, conversationId: to }],
          kind: "text",
          threadId: threadId == null ? undefined : String(threadId),
          replyToId: replyToId ?? undefined,
        }),
      };
    },
  },
});
```

仅声明原生传输实际保留的功能。使用从此子路径导出的
契约辅助工具覆盖每个声明的发送、回执、实时预览和接收确认功能。

## 现有外发适配器

如果该渠道已经具有兼容的 `outbound` 适配器，请派生消息
适配器而不是重复发送代码：

```ts
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-outbound";

export const messageAdapter = createChannelMessageAdapterFromOutbound({
  id: "demo",
  outbound,
  durableFinal: {
    capabilities: {
      text: true,
      media: true,
    },
  },
});
```

## 持久化发送

运行时发送辅助工具也位于 `channel-outbound` 上：

- `sendDurableMessageBatch(...)`
- `withDurableMessageSendContext(...)`
- `deliverInboundReplyWithMessageSendContext(...)`
- 草稿流式传输/进度辅助工具，例如 `resolveChannelStreamingPreviewChunk(...)`

`sendDurableMessageBatch(...)` 返回一个显式结果：

- `sent`：至少传递了一条可见的平台消息。
- `suppressed`：不应将任何平台消息视为丢失。
- `partial_failed`：在后续
  负载或副作用失败之前，至少传递了一条平台消息。
- `failed`：未生成平台回执。

当批次混合已发送、已抑制和失败的负载时，请使用 `payloadOutcomes`。
不要从空的旧版直接传递结果推断钩子取消。

## 兼容性分发

入站回复分发应通过 `channel-inbound` 中的 `dispatchChannelInboundReply(...)` 组装。保持平台投递在投递适配器中；对于消息适配器、持久发送、回执、实时预览和回复流水线选项，请使用 `channel-outbound`。
