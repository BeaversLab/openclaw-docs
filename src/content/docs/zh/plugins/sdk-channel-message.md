---
summary: "用于渠道插件的消息生命周期 API，包括持久化发送、回执、实时预览、接收确认策略以及旧版迁移"
title: "渠道消息 API"
read_when:
  - You are building or refactoring a messaging channel plugin
  - You need durable final reply delivery, receipts, live preview finalization, or receive acknowledgement policy
  - You are migrating from legacy reply pipeline or inbound reply dispatch helpers
---

渠道插件应该从 `openclaw/plugin-sdk/channel-message` 中暴露一个 `message` 适配器。该适配器描述了平台支持的原生消息生命周期：

```text
receive -> route and record -> agent turn -> durable final send
send -> render batch -> platform I/O -> receipt -> lifecycle side effects
live preview -> final edit or fallback -> receipt
```

Core 拥有队列、持久化、通用重试策略、钩子、回执以及共享的 `message` 工具。插件拥有原生发送/编辑/删除调用、目标规范化、平台线程、选定的引用、通知标志、账户状态以及平台特定的副作用。

请将此页面与[构建渠道插件](/zh/plugins/sdk-channel-plugins)结合使用。

`channel-message` 子路径被有意设计得足够轻量，以便用于热插件引导文件（例如 `channel.ts`）：它暴露了适配器合约、能力证明、回执和兼容性外观，而无需加载出站传递。运行时传递助手可从 `openclaw/plugin-sdk/channel-message-runtime` 获取，适用于已经在执行异步消息 I/O 的监控/发送代码路径。

新的渠道和插件发送代码应使用来自 `openclaw/plugin-sdk/channel-message-runtime` 的消息生命周期助手：`sendDurableMessageBatch`、`withDurableMessageSendContext` 或 `deliverInboundReplyWithMessageSendContext`。`openclaw/plugin-sdk/outbound-runtime` 中较旧的 `deliverOutboundPayloads(...)` 助手是用于出站内部、恢复和旧适配器的已弃用兼容性/运行时底层。不要在新的渠道或插件发送路径中使用它。

`sendDurableMessageBatch(...)` 返回一个显式的生命周期结果：

- `sent` - 至少有一条可见的平台消息已送达。
- `suppressed` - 不应将任何平台消息视为丢失。稳定的原因包括 `cancelled_by_message_sending_hook`、`empty_after_message_sending_hook`、`no_visible_payload`、`adapter_returned_no_identity` 和旧版 `no_visible_result`。
- `partial_failed` - 在随后的负载或副作用失败之前，至少有一条平台消息已传递。结果包含已传递的回执前缀加上失败信息。
- `failed` - 未生成平台回执。

当批次混合了已发送、已抑制和失败的负载时，请使用 `payloadOutcomes`。不要通过检查旧版直接传递数组是否为空来推断 Hook 取消。

仍需要缓冲回复调度器的兼容性调度器，应使用来自 `openclaw/plugin-sdk/channel-message` 的 `createChannelMessageReplyPipeline(...)` 构建回复前缀选项，然后调用运行时的 `channel.turn.runPrepared(...)`。这样可以在不添加另一个公共轮次包装器的情况下，将会话记录和调度顺序保持在共享轮次生命周期上。

## 最小适配器

大多数新的渠道插件都可以从一个小的适配器开始：

```typescript
import { defineChannelMessageAdapter, createMessageReceiptFromOutboundResults } from "openclaw/plugin-sdk/channel-message";

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

然后将其附加到渠道插件：

```typescript
export const demoPlugin = createChatChannelPlugin({
  base: {
    id: "demo",
    message: demoMessageAdapter,
    // other channel plugin fields
  },
});
```

仅声明适配器真正保留的功能。每个声明的功能都应有一个契约测试。

## 出站桥接

如果渠道已经具有兼容的 `outbound` 适配器，则优先派生消息适配器，而不是重复发送代码：

```typescript
import { createChannelMessageAdapterFromOutbound } from "openclaw/plugin-sdk/channel-message";

const demoMessageAdapter = createChannelMessageAdapterFromOutbound({
  id: "demo",
  outbound: demoOutboundAdapter,
});
```

桥接将旧的出站发送结果转换为 `MessageReceipt` 值。新代码应端到端传递回执，并仅在兼容性边缘使用 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 派生旧 ID。
如果未提供接收策略，`createChannelMessageAdapterFromOutbound(...)` 将使用 `manual` 接收确认策略。这使得插件拥有的平台确认变得明确，而无需更改在通用接收上下文之外确认 Webhook、Socket 或轮询偏移量的渠道。

## 消息工具发送

共享的 `message(action="send")` 路径应使用与最终回复相同的核心传递生命周期。如果渠道需要针对工具发送的特定于提供商的调整，请实现 `actions.prepareSendPayload(...)`，而不是从 `actions.handleAction(...)` 发送。

`prepareSendPayload(...)` 接收标准化的核心 `ReplyPayload` 以及
完整的操作上下文。返回一个在 `payload.channelData.<channel>` 中包含渠道特定数据的负载，
并让核心调用 `sendMessage(...)`，
即消息生命周期运行时、预写队列、消息发送钩子、
重试、恢复和确认清理。生命周期运行时可能会在内部
调用 `deliverOutboundPayloads(...)` 作为兼容性基板，但渠道
插件不应直接调用它来实现新的发送行为。

仅当发送无法表示为持久化负载（例如因为它包含
不可序列化的组件工厂）时，才返回 `null`。为了兼容性，
核心将保留旧版插件操作回退机制，但新的渠道发送
功能应可表示为持久化负载数据。

```typescript
export const demoActions: ChannelMessageActionAdapter = {
  describeMessageTool: () => ({ actions: ["send"], capabilities: ["presentation"] }),
  prepareSendPayload: ({ ctx, payload }) => {
    if (ctx.action !== "send") {
      return null;
    }
    return {
      ...payload,
      channelData: {
        ...payload.channelData,
        demo: {
          ...(payload.channelData?.demo as object | undefined),
          nativeCard: ctx.params.card,
        },
      },
    };
  },
};
```

出站适配器随后读取 `sendPayload` 中的
`payload.channelData.demo`。
这将在插件中保留特定于平台的渲染，而核心仍然拥有
持久化、重试、恢复、钩子和确认（ack）。

准备好的 `message(action="send")` 负载和通用最终回复交付
默认使用尽力而为队列的核心交付。只有在核心验证渠道
可以协调崩溃后结果未知的发送之后，
必需的持久化队列才有效。如果适配器无法实现 `reconcileUnknownSend`，
请保持准备好的发送路径为尽力而为；核心仍将尝试预写
队列，但队列持久化或不确定的崩溃恢复不是
必需交付合同的一部分。

## 持久化最终能力

持久化最终交付是按副作用选择性加入的。只有当适配器声明
负载和交付选项所需的每项能力时，核心才会使用通用
持久化交付。

| 能力                   | 声明时机                                                 |
| ---------------------- | -------------------------------------------------------- |
| `text`                 | 适配器可以发送文本并返回回执。                           |
| `media`                | 媒体发送会为每个可见的平台消息返回回执。                 |
| `payload`              | 适配器保留富回复负载语义，而不仅仅是文本和一个媒体 URL。 |
| `replyTo`              | 原生回复目标到达平台。                                   |
| `thread`               | 原生主题、话题或渠道主题目标到达平台。                   |
| `silent`               | 通知抑制到达平台。                                       |
| `nativeQuote`          | 选定的引用元数据到达平台。                               |
| `messageSendingHooks`  | 核心消息发送挂钩可以在平台 I/O 之前取消或重写内容。      |
| `batch`                | 多部分渲染批次可作为单个持久计划重放。                   |
| `reconcileUnknownSend` | 适配器无需盲目重放即可解决 `unknown_after_send` 恢复。   |
| `afterSendSuccess`     | 渠道本地的发送后副作用仅运行一次。                       |
| `afterCommit`          | 渠道本地的提交后副作用仅运行一次。                       |

尽力而为的最终交付不需要 `reconcileUnknownSend`；当适配器保留负载的可见语义时，它使用共享生命周期，如果队列持久性不可用，则回退到直接平台 I/O。必需的持久最终交付必须明确要求 `reconcileUnknownSend`。如果适配器无法确定已开始/未知的发送是否已到达平台，请勿声明该功能；核心将在排队前拒绝必需的持久交付。

当调用者需要持久交付时，应派生需求而不是手动构建映射：

```typescript
import { deriveDurableFinalDeliveryRequirements } from "openclaw/plugin-sdk/channel-message";

const requiredCapabilities = deriveDurableFinalDeliveryRequirements({
  payload,
  replyToId,
  threadId,
  silent,
  payloadTransport: true,
  extraCapabilities: {
    nativeQuote: hasSelectedQuote(payload),
  },
});
```

默认需要 `messageSendingHooks`。仅为故意无法运行全局消息发送挂钩的路径设置 `messageSendingHooks: false`。

## 持久发送契约

持久最终发送具有比旧版渠道自有交付更严格的语义：

- 在平台 I/O 之前创建持久意图。
- 如果持久交付返回已处理的结果，则不要回退到旧版发送。
- 将挂钩取消和无发送结果视为终止。
- 将 `unsupported` 仅视为前意图结果。
- 对于必需的持久性，如果队列无法记录平台发送已开始，请在平台 I/O 之前失败。
- 对于必需的最终交付和必需的准备消息工具发送，预检 `reconcileUnknownSend`；恢复必须能够确认已发送的消息，或者仅在适配器证明原始发送未发生后才重放。
- 对于 `best_effort`，队列写入失败可能会回退到直接的平台 I/O。
- 将中止信号转发到媒体加载和平台发送。
- 在队列确认后运行提交后挂钩；直接尽力回退在成功执行平台 I/O 后运行它们，因为没有持久化队列提交。
- 为每个可见的平台消息 ID 返回回执。
- 当平台可以检查不确定的发送是否已到达用户时，请使用 `reconcileUnknownSend`。

此约定避免了崩溃后的重复发送，并避免了绕过消息发送取消挂钩。

## 回执

`MessageReceipt` 是关于平台接受内容的新的内部记录：

```typescript
type MessageReceipt = {
  primaryPlatformMessageId?: string;
  platformMessageIds: string[];
  parts: MessageReceiptPart[];
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  sentAt: number;
  raw?: readonly MessageReceiptSourceResult[];
};
```

在调整现有发送结果时，请使用 `createMessageReceiptFromOutboundResults(...)`。当实时预览消息变为最终回执时，请使用 `createPreviewMessageReceipt(...)`。避免添加新的所有者本地 `messageIds` 字段。在兼容性边缘仍会生成旧的 `ChannelDeliveryResult.messageIds`。

## 实时预览

流式传输草稿预览或进度更新的通道应声明实时功能：

```typescript
const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  live: {
    capabilities: {
      draftPreview: true,
      previewFinalization: true,
      progressUpdates: true,
      quietFinalization: true,
    },
    finalizer: {
      capabilities: {
        finalEdit: true,
        normalFallback: true,
        discardPending: true,
        previewReceipt: true,
        retainOnAmbiguousFailure: true,
      },
    },
  },
});
```

使用 `defineFinalizableLivePreviewAdapter(...)` 和
`deliverWithFinalizableLivePreviewAdapter(...)` 进行运行时最终确定。最终确定器决定最终回复是就地编辑预览、发送正常回退、丢弃待处理的预览状态、保留模糊的失败编辑而不重复消息，还是返回最终回执。

## 接收确认策略

控制平台确认时间的入站接收器应声明接收策略：

```typescript
const demoMessageAdapter = defineChannelMessageAdapter({
  id: "demo",
  receive: {
    defaultAckPolicy: "after_agent_dispatch",
    supportedAckPolicies: ["after_receive_record", "after_agent_dispatch"],
  },
});
```

未声明接收策略的适配器默认为：

```typescript
{
  receive: {
    defaultAckPolicy: "manual",
    supportedAckPolicies: ["manual"],
  },
}
```

当平台没有需要延迟的确认、在异步处理之前已经确认，或者需要特定于协议的响应语义时，请使用默认值。仅当接收器实际使用接收上下文稍后移动平台确认时，才声明分阶段策略之一。

策略：

| 策略                   | 使用时机                                     |
| ---------------------- | -------------------------------------------- |
| `after_receive_record` | 可以在解析并记录入站事件后确认平台。         |
| `after_agent_dispatch` | 平台应等待，直到代理分派已被接受。           |
| `after_durable_send`   | 平台应等待，直到最终传递具有持久化决策。     |
| `manual`               | 插件拥有确认权，因为平台语义不匹配通用阶段。 |

在延迟确认状态的接收器中使用 `createMessageReceiveContext(...)`，并在接收器需要测试阶段是否满足配置的策略时使用 `shouldAckMessageAfterStage(...)`。

## 合约测试

能力声明是插件合约的一部分。请用测试来支持它们：

```typescript
import { verifyChannelMessageAdapterCapabilityProofs, verifyChannelMessageLiveCapabilityAdapterProofs, verifyChannelMessageLiveFinalizerProofs, verifyChannelMessageReceiveAckPolicyAdapterProofs } from "openclaw/plugin-sdk/channel-message";

it("backs declared message capabilities", async () => {
  await expect(
    verifyChannelMessageAdapterCapabilityProofs({
      adapterName: "demo",
      adapter: demoMessageAdapter,
      proofs: {
        text: async () => {
          const result = await demoMessageAdapter.send!.text!(textCtx);
          expect(result.receipt.platformMessageIds).toContain("msg-1");
        },
        replyTo: async () => {
          await demoMessageAdapter.send!.text!({ ...textCtx, replyToId: "parent-1" });
          expect(sendDemoMessage).toHaveBeenCalledWith(
            expect.objectContaining({
              replyToId: "parent-1",
            }),
          );
        },
        messageSendingHooks: () => {
          expect(demoMessageAdapter.durableFinal!.capabilities!.messageSendingHooks).toBe(true);
        },
      },
    }),
  ).resolves.toContainEqual({ capability: "text", status: "verified" });
});
```

当适配器声明这些功能时，添加实时和接收证明套件。缺少的证明应导致测试失败，而不是默默地扩大持久化范围。

## 已弃用的兼容性 API

这些 API 仍可导入以供第三方兼容。不要在新的渠道代码中使用它们。

| 已弃用的 API                                 | 替代方案                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `openclaw/plugin-sdk/channel-reply-pipeline` | `openclaw/plugin-sdk/channel-message`                                                                                |
| `createChannelTurnReplyPipeline(...)`        | 用于兼容性分发的 `createChannelMessageReplyPipeline(...)`，或用于新渠道代码的 `message` 适配器                       |
| `buildChannelMessageReplyDispatchBase(...)`  | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或用于新渠道代码的 `message` 适配器   |
| `dispatchChannelMessageReplyWithBase(...)`   | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或用于新渠道代码的 `message` 适配器   |
| `recordChannelMessageReplyDispatch(...)`     | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或用于新渠道代码的 `message` 适配器   |
| `deliverOutboundPayloads(...)`               | 来自 `channel-message-runtime` 的 `sendDurableMessageBatch(...)` 或 `deliverInboundReplyWithMessageSendContext(...)` |
| `deliverDurableInboundReplyPayload(...)`     | 来自 `openclaw/plugin-sdk/channel-message-runtime` 的 `deliverInboundReplyWithMessageSendContext(...)`               |
| `dispatchInboundReplyWithBase(...)`          | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或用于新渠道代码的 `message` 适配器   |
| `recordInboundSessionAndDispatchReply(...)`  | `createChannelMessageReplyPipeline(...)` 加上 `channel.turn.runPrepared(...)`，或用于新渠道代码的 `message` 适配器   |
| `resolveChannelSourceReplyDeliveryMode(...)` | `resolveChannelMessageSourceReplyDeliveryMode(...)`                                                                  |
| `deliverFinalizableDraftPreview(...)`        | `defineFinalizableLivePreviewAdapter(...)` 加上 `deliverWithFinalizableLivePreviewAdapter(...)`                      |
| `DraftPreviewFinalizerDraft`                 | `LivePreviewFinalizerDraft`                                                                                          |
| `DraftPreviewFinalizerResult`                | `LivePreviewFinalizerResult`                                                                                         |

兼容性调度器仍可通过消息外观使用 `createReplyPrefixContext(...)`、
`createReplyPrefixOptions(...)` 和 `createTypingCallbacks(...)`。新的生命周期代码应避免使用旧的
`channel-reply-pipeline` 子路径。

## 迁移检查清单

1. 向渠道插件添加 `message: defineChannelMessageAdapter(...)` 或
   `message: createChannelMessageAdapterFromOutbound(...)`。
2. 从文本、媒体和负载发送中返回 `MessageReceipt`。
3. 仅声明受原生行为和测试支持的功能。
4. 用 `deriveDurableFinalDeliveryRequirements(...)` 替换手写的持久化需求映射。
5. 当渠道就地编辑草稿消息时，通过实时预览辅助工具移动预览最终确定操作。
6. 仅当接收方确实可以延迟平台确认时，才声明接收确认策略。
7. 仅在兼容性边缘保留旧版回复分发辅助工具。
