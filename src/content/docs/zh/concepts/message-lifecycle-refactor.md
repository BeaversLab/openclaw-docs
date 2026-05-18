---
summary: "统一的消息接收、发送、预览、编辑和流式传输持久化生命周期设计方案"
read_when:
  - Refactoring channel send or receive behavior
  - Changing channel turn, reply dispatch, outbound queue, preview streaming, or plugin SDK message APIs
  - Designing a new channel plugin that needs durable sends, receipts, previews, edits, or retries
title: "消息生命周期重构"
---

本页旨在将分散的渠道轮次、回复分发、预览流式传输和出站交付辅助工具替换为一个持久化的消息生命周期。

简而言之：

- 核心原语应该是 **接收** 和 **发送**，而不是 **回复**。
- 回复只是出站消息上的一个关系。
- 轮次是入站处理的一种便利手段，并非交付的所有者。
- 发送必须基于上下文：`begin`、渲染、预览或流式传输、最终发送、提交、失败。
- 接收也必须基于上下文：规范化、去重、路由、记录、分发、平台确认、失败。
- 公共插件 SDK 应精简为一个小的渠道消息接口。

## 问题

当前的渠道堆栈源于几个合理的局部需求：

- 简单的入站适配器使用 `runtime.channel.turn.run`。
- 富适配器使用 `runtime.channel.turn.runPrepared`。
- 遗留辅助工具使用 `dispatchInboundReplyWithBase`、`recordInboundSessionAndDispatchReply`、回复负载辅助工具、回复分块、回复引用以及出站运行时辅助工具。
- 预览流式传输存在于特定于渠道的分发器中。
- 最终交付的持久性正围绕现有的回复负载路径添加。

这种结构修复了局部错误，但导致 OpenClaw 拥有过多的公共概念，以及过多可能导致交付语义漂移的地方。

暴露此问题的可靠性问题是：

```text
Telegram polling update acked
  -> assistant final text exists
  -> process restarts before sendMessage succeeds
  -> final response is lost
```

目标不变性比 Telegram 更广泛：一旦核心决定存在可见的出站消息，则必须在尝试平台发送之前使意图持久化，并在成功后提交平台回执。这使得 OpenClaw 具有至少一次恢复能力。仅当适配器能够证明原生幂等性，或在重放之前根据平台状态协调发送后未知尝试时，才存在精确一次行为。

这是此次重构的最终状态，并非对当前所有路径的描述。在迁移期间，当尽力而为的队列写入失败时，现有的出站辅助工具仍可回退到直接发送。只有当持久的最终发送在失败时采用封闭策略，或通过文档明确的非持久策略显式选择退出时，重构才算完成。

## 目标

- 针对所有渠道消息接收和发送路径的单一核心生命周期。
- 在适配器声明重放安全行为后，新的消息生命周期中默认采用持久的最终发送。
- 共享的预览、编辑、流式传输、最终确定、重试、恢复和回执语义。
- 一个小型的插件 SDK 表面，便于第三方插件学习和维护。
- 在迁移期间，与现有的 `channel.turn` 调用者保持兼容。
- 为新渠道功能提供清晰的扩展点。
- 核心中不包含特定于平台的分支。
- 不包含 token-delta 渠道消息。渠道流式传输保持为消息预览、编辑、追加或已完成的块传递。
- 用于操作/系统输出的结构化 OpenClaw 源元数据，以便可见的网关故障不会作为新的提示重新进入共享的机器人启用的房间。

## 非目标

- 在第一阶段不删除 `runtime.channel.turn.*`。
- 不强制每个渠道采用相同的原生传输行为。
- 不要让核心学习 Telegram 主题、Slack 原生流、Matrix 撤回、飞书卡片、QQ 语音或 Teams 活动。
- 不要将所有内部迁移辅助工具作为稳定的 SDK API 发布。
- 不要让重试重放已完成的非幂等平台操作。

## 参考模型

Vercel Chat 拥有一个良好的公共心智模型：

- `Chat`
- `Thread`
- `Channel`
- `Message`
- 适配器方法，如 `postMessage`、`editMessage`、`deleteMessage`、
  `stream`、`startTyping` 和历史记录获取
- 用于去重、锁、队列和持久化的状态适配器

OpenClaw 应该借用其词汇，而不是复制其表面。

OpenClaw 在该模型之外还需要：

- 在直接传输调用之前，持久的出站发送意图。
- 具有 begin、commit 和 fail 的显式发送上下文。
- 了解平台确认策略的接收上下文。
- 能够在重启后存续的回执，并可驱动编辑、删除、恢复和重复项抑制。
- 一个更小的公共 SDK。捆绑插件可以使用内部运行时辅助程序，但第三方插件应该看到一个统一的消息 API。
- 特定于代理的行为：会话、转录、分块流式传输、工具进度、审批、媒体指令、静默回复和群组提及历史。

`thread.post()`OpenClaw 风格的 Promise 对 OpenClaw 来说是不够的。它们隐藏了决定发送是否可恢复的事务边界。

## 核心模型

新领域应位于内部核心命名空间下，例如 `src/channels/message/*`。

它包含四个概念：

```typescript
core.messages.receive(...)
core.messages.send(...)
core.messages.live(...)
core.messages.state(...)
```

`receive` 拥有入站生命周期。

`send` 拥有出站生命周期。

`live` 拥有预览、编辑、进度和流状态。

`state` 拥有持久意图存储、回执、幂等性、恢复、锁和去重。

## 消息术语

### 消息

规范化的消息是平台无关的：

```typescript
type ChannelMessage = {
  id: string;
  channel: string;
  accountId?: string;
  direction: "inbound" | "outbound";
  target: MessageTarget;
  sender?: MessageActor;
  body?: MessageBody;
  attachments?: MessageAttachment[];
  relation?: MessageRelation;
  origin?: MessageOrigin;
  timestamp?: number;
  raw?: unknown;
};
```

### 目标

目标描述了消息所在的位置：

```typescript
type MessageTarget = {
  kind: "direct" | "group" | "channel" | "thread";
  id: string;
  label?: string;
  spaceId?: string;
  parentId?: string;
  threadId?: string;
  nativeChannelId?: string;
};
```

### 关系

回复是一种关系，而非 API 根：

```typescript
type MessageRelation =
  | {
      kind: "reply";
      inboundMessageId?: string;
      replyToId?: string;
      threadId?: string;
      quote?: MessageQuote;
    }
  | {
      kind: "followup";
      sessionKey?: string;
      previousMessageId?: string;
    }
  | {
      kind: "broadcast";
      reason?: string;
    }
  | {
      kind: "system";
      reason: "approval" | "task" | "hook" | "cron" | "subagent" | "message_tool" | "cli" | "control_ui" | "automation" | "error";
    };
```

这使得同一条发送路径可以处理普通回复、cron 通知、审批提示、任务完成、消息工具发送、CLI 或 Control UI 发送、子代理结果以及自动化发送。

### 来源

来源描述了谁产生了消息以及 OpenClaw 应如何处理该消息的回显。它与关系是分开的：一条消息可以是对用户的回复，但仍可以是 OpenClaw 发起的操作输出。

```typescript
type MessageOrigin =
  | {
      source: "openclaw";
      schemaVersion: 1;
      kind: "gateway_failure";
      code: "agent_failed_before_reply" | "missing_api_key" | "model_login_expired";
      echoPolicy: "drop_bot_room_echo";
    }
  | {
      source: "user" | "external_bot" | "platform" | "unknown";
    };
```

Core 拥有 OpenClaw 发起输出的含义。Channels 拥有如何将该来源编码到其传输中的权限。

第一个必需的用途是网关故障输出。人类仍然应该看到诸如“Agent failed before reply”（代理在回复前失败）或“Missing API key”（缺少 OpenClaw 密钥）之类的消息，但在启用 `allowBots` 时，带标记的 OpenClaw 操作输出绝不能在共享房间中被接受为机器人创作的输入。

### 回执 (Receipt)

回执是一等公民：

```typescript
type MessageReceipt = {
  primaryPlatformMessageId?: string;
  platformMessageIds: string[];
  parts: MessageReceiptPart[];
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  sentAt: number;
  raw?: unknown;
};

type MessageReceiptPart = {
  platformMessageId: string;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  index: number;
  threadId?: string;
  replyToId?: string;
  editToken?: string;
  deleteToken?: string;
  url?: string;
  raw?: unknown;
};
```

回执是从持久化意图到未来编辑、删除、预览完成、重复抑制和恢复的桥梁。

回执可以描述一条平台消息或多部分交付。分块文本、媒体加文本、语音加文本以及卡片回退必须在保留所有平台 ID 的同时，仍为主 ID 提供用于线程化和后续编辑的访问接口。

## 接收上下文

接收不应只是一个简单的辅助函数调用。核心需要一个了解去重、路由、会话记录和平台确认策略的上下文。

```typescript
type MessageReceiveContext = {
  id: string;
  channel: string;
  accountId?: string;
  input: ChannelMessage;
  ack: ReceiveAckController;
  route: MessageRouteController;
  session: MessageSessionController;
  log: MessageLifecycleLogger;

  dedupe(): Promise<ReceiveDedupeResult>;
  resolve(): Promise<ResolvedInboundMessage>;
  record(resolved: ResolvedInboundMessage): Promise<RecordResult>;
  dispatch(recorded: RecordResult): Promise<DispatchResult>;
  commit(result: DispatchResult): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

接收流程：

```text
platform event
  -> begin receive context
  -> normalize
  -> classify
  -> dedupe and self-echo gate
  -> route and authorize
  -> record inbound session metadata
  -> dispatch agent run
  -> durable outbound sends happen through send context
  -> commit receive
  -> ack platform when policy allows
```

确认 不是一回事。接收契约必须将这些信号分离开来：

- **传输确认：** 告知平台 webhook 或 socket OpenClaw 已接受事件信封。某些平台在分发前需要此操作。
- **轮询偏移量确认：** 推进游标，以便不会再次获取同一事件。这绝不能推进到无法恢复的工作之后。
- **入站记录确认：** 确认 OpenClaw 已持久化足够的入站元数据以对重新投递进行去重和路由。
- **用户可见的回执：** 可选的已读/状态/输入行为；绝不是持久性边界。

`ReceiveAckPolicy` 仅控制传输或轮询确认。绝不能将其重复用于已读回执或状态反应。

在机器人授权之前，当渠道可以解码消息来源元数据时，接收必须应用共享的 OpenClaw 回显策略：

```typescript
function shouldDropOpenClawEcho(params: { origin?: MessageOrigin; isBotAuthor: boolean; isRoomish: boolean }): boolean {
  return params.isBotAuthor && params.isRoomish && params.origin?.source === "openclaw" && params.origin.kind === "gateway_failure" && params.origin.echoPolicy === "drop_bot_room_echo";
}
```

此丢弃是基于标签的，而不是基于文本的。一条具有相同的可见网关故障文本但没有 OpenClaw 来源元数据的机器人创作房间消息，仍然会经过正常的 `allowBots` 授权。

确认策略是显式的：

```typescript
type ReceiveAckPolicy = { kind: "immediate"; reason: "webhook-timeout" | "platform-contract" } | { kind: "after-record" } | { kind: "after-durable-send" } | { kind: "manual" };
```

Telegram 轮询现在使用接收上下文确认策略来处理其持久化的重启水位线。跟踪器仍然在更新进入中间件链时观察 grammY 更新，但 OpenClaw 仅在成功分派后持久化安全完成的更新 ID，从而使失败或待处理的较低更新在重启后可以重放。Telegram 的上游 TelegramgrammYOpenClawTelegram`getUpdates`OpenClaw 获取偏移量仍由轮询库控制，因此如果我们需要超出 OpenClaw 重启水位线的平台级重新投递，更深层次的削减是完全持久的轮询源。Webhook 平台可能需要立即 HTTP 确认，但它们仍然需要入站去重和持久的出站发送意图，因为 webhook 可以重新投递。

## 发送上下文

发送也是基于上下文的：

```typescript
type MessageSendContext = {
  id: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  intent: DurableSendIntent;
  attempt: number;
  signal: AbortSignal;
  previousReceipt?: MessageReceipt;
  preview?: LiveMessageState;
  log: MessageLifecycleLogger;

  render(): Promise<RenderedMessageBatch>;
  previewUpdate(rendered: RenderedMessageBatch): Promise<LiveMessageState>;
  send(rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit(receipt: MessageReceipt, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  delete(receipt: MessageReceipt): Promise<void>;
  commit(receipt: MessageReceipt): Promise<void>;
  fail(error: unknown): Promise<void>;
};
```

首选编排：

```typescript
await core.messages.withSendContext(message, async (ctx) => {
  const rendered = await ctx.render();

  if (ctx.preview?.canFinalizeInPlace) {
    return await ctx.edit(ctx.preview.receipt, rendered);
  }

  return await ctx.send(rendered);
});
```

该辅助函数展开为：

```text
begin durable intent
  -> render
  -> optional preview/edit/stream work
  -> mark sending
  -> final platform send or final edit
  -> mark committing with raw receipt
  -> commit receipt
  -> ack durable intent
  -> fail durable intent on classified failure
```

意图必须存在于传输 I/O 之前。在开始之后但在提交之前重启是可恢复的。

危险的边界是在平台成功之后和回执提交之前。如果进程在那里终止，OpenClaw 无法知道平台消息是否存在，除非适配器提供原生幂等性或回执对帐路径。这些尝试必须在 OpenClaw`unknown_after_send` 中恢复，而不是盲目重放。没有对帐的渠道可能仅当重复可见的消息是该渠道和关系可接受的、有文档记录的权衡时，才选择至少一次重放。当前的 SDK 对帐桥要求适配器声明 `reconcileUnknownSend`，然后询问 `durableFinal.reconcileUnknownSend` 将未知条目分类为 `sent`、`not_sent` 或 `unresolved`；只有 `not_sent` 允许重放，未解决的条目保持终端状态或仅重试对帐检查。

持久性策略必须是显式的：

```typescript
type MessageDurabilityPolicy = "required" | "best_effort" | "disabled";
```

`required` 意味着核心在无法写入持久化意图时必须失败关闭。当持久化不可用时，`best_effort` 可以通过。`disabled` 保持旧的直接发送行为。在迁移期间，传统包装器和公共兼容性辅助工具默认为 `disabled`；它们绝不能仅仅因为渠道具有通用出站适配器就推断出 `required`。

发送上下文还拥有渠道本地的发送后效果。如果持久化传递绕过了之前附加到渠道直接发送路径的本地行为，则迁移是不安全的。示例包括自回显抑制缓存、线程参与标记、本机编辑锚点、模型签名渲染以及特定于平台的重复保护。这些效果必须迁移到发送适配器、渲染适配器或命名发送上下文钩子中，然后该渠道才能启用持久的通用最终传递。

发送辅助工具必须将回执一直返回给它们的调用者。持久化包装器不能吞并消息 ID 或用 `undefined` 替换渠道传递结果；缓冲调度器使用这些 ID 作为线程锚点、后续编辑、预览最终确定和重复抑制。

回退发送对批处理进行操作，而不是对单个有效负载进行操作。静默回复重写、媒体回退、卡片回退和块投影都可能产生多条可传递消息，因此发送上下文必须传递整个投影批次，或者明确说明为什么只有一个有效负载是有效的。

```typescript
type RenderedMessageBatch = {
  units: RenderedMessageUnit[];
  atomicity: "all_or_retry_remaining" | "best_effort_parts";
  idempotencyKey: string;
};

type RenderedMessageUnit = {
  index: number;
  kind: "text" | "media" | "voice" | "card" | "preview" | "unknown";
  payload: unknown;
  required: boolean;
};
```

当此类回退是持久的时，整个投影批次必须由一个持久发送意图或另一个原子批次计划表示。逐个记录每个有效负载是不够的：有效负载之间的崩溃可能会留下部分可见的回退，而其余有效负载没有持久记录。恢复必须知道哪些单元已经有回执，并且仅重放缺失的单元或将批次标记为 `unknown_after_send`，直到适配器协调它。

## 实时上下文

预览、编辑、进度和流行为应该是一个可选加入的生命周期。

```typescript
type MessageLiveAdapter = {
  begin?(ctx: MessageSendContext): Promise<LiveMessageState>;
  update?(ctx: MessageSendContext, state: LiveMessageState, update: LiveMessageUpdate): Promise<LiveMessageState>;
  finalize?(ctx: MessageSendContext, state: LiveMessageState, final: RenderedMessageBatch): Promise<MessageReceipt>;
  cancel?(ctx: MessageSendContext, state: LiveMessageState, reason: LiveCancelReason): Promise<void>;
};
```

实时状态足够持久，可以恢复或抑制重复项：

```typescript
type LiveMessageState = {
  mode: "partial" | "block" | "progress" | "native";
  receipt?: MessageReceipt;
  visibleSince?: number;
  canFinalizeInPlace: boolean;
  lastRenderedHash?: string;
  staleAfterMs?: number;
};
```

这应该涵盖当前行为：

- Telegram 发送加编辑预览，在预览过期后使用新的最终版本。
- Discord 发送加编辑预览，在媒体/错误/显式回复时取消。
- Slack 根据主题形状使用原生流或草稿预览。
- Mattermost 草稿帖子定稿。
- Matrix 草稿事件定稿，或在不匹配时撤回。
- Teams 原生进度流。
- QQ 机器人流或累积回退。

## 适配器接口

公共 SDK 目标应该是一个子路径：

```typescript
import { defineChannelMessageAdapter } from "openclaw/plugin-sdk/channel-message";
```

目标形状：

```typescript
type ChannelMessageAdapter = {
  receive?: MessageReceiveAdapter;
  send: MessageSendAdapter;
  live?: MessageLiveAdapter;
  origin?: MessageOriginAdapter;
  render?: MessageRenderAdapter;
  capabilities: MessageCapabilities;
};
```

发送适配器：

```typescript
type MessageSendAdapter = {
  send(ctx: MessageSendContext, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  edit?(ctx: MessageSendContext, receipt: MessageReceipt, rendered: RenderedMessageBatch): Promise<MessageReceipt>;
  delete?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  classifyError?(ctx: MessageSendContext, error: unknown): DeliveryFailureKind;
  reconcileUnknownSend?(ctx: MessageSendContext): Promise<MessageReceipt | null>;
  afterSendSuccess?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
  afterCommit?(ctx: MessageSendContext, receipt: MessageReceipt): Promise<void>;
};
```

接收适配器：

```typescript
type MessageReceiveAdapter<TRaw = unknown> = {
  normalize(raw: TRaw, ctx: MessageNormalizeContext): Promise<ChannelMessage>;
  classify?(message: ChannelMessage): Promise<MessageEventClass>;
  preflight?(message: ChannelMessage, event: MessageEventClass): Promise<MessagePreflightResult>;
  ackPolicy?(message: ChannelMessage, event: MessageEventClass): ReceiveAckPolicy;
};
```

在预检授权之前，核心必须运行共享的 OpenClaw 回显谓词，每当 OpenClaw`origin.decode`OpenClaw 返回 OpenClaw 来源元数据时。接收适配器提供平台事实，例如机器作者和房间形状；核心拥有丢弃决策和排序，因此渠道不需要重新实现文本过滤器。

来源适配器：

```typescript
type MessageOriginAdapter<TRaw = unknown, TNative = unknown> = {
  encode?(origin: MessageOrigin): TNative | undefined;
  decode?(raw: TRaw): MessageOrigin | undefined;
};
```

核心设置 `MessageOrigin`Slack。渠道仅将其与原生传输元数据相互转换。Slack 将其映射到 `chat.postMessage({ metadata })` 和入站 `message.metadata`Matrix；Matrix 可以将其映射到额外的事件内容；没有原生元数据的渠道可以在这是最佳近似值时使用回执/出站注册表。

功能：

```typescript
type MessageCapabilities = {
  text: { maxLength?: number; chunking?: boolean };
  attachments?: {
    upload: boolean;
    remoteUrl: boolean;
    voice?: boolean;
  };
  threads?: {
    reply: boolean;
    topic?: boolean;
    nativeThread?: boolean;
  };
  live?: {
    edit: boolean;
    delete: boolean;
    nativeStream?: boolean;
    progress?: boolean;
  };
  delivery?: {
    idempotencyKey?: boolean;
    retryAfter?: boolean;
    receiptRequired?: boolean;
  };
};
```

## 公共 SDK 减量

新的公共接口应该吸收或弃用这些概念区域：

- `reply-runtime`
- `reply-dispatch-runtime`
- `reply-reference`
- `reply-chunking`
- `reply-payload`
- `inbound-reply-dispatch`
- `channel-reply-pipeline`
- 大多数 `outbound-runtime` 的公共使用
- 临时的草稿流生命周期辅助函数

兼容性子路径可以作为包装器保留，但新的第三方插件不应该需要它们。

打包插件在迁移期间可以通过保留的运行时子路径保留内部辅助导入。一旦 `plugin-sdk/channel-message` 存在，公共文档应引导插件作者使用它。

## 与渠道轮次的关系

`runtime.channel.turn.*` 在迁移期间应保持不变。

它应该成为一个兼容性适配器：

```text
channel.turn.run
  -> messages.receive context
  -> session dispatch
  -> messages.send context for visible output
```

`channel.turn.runPrepared` 在最初阶段也应保留：

```text
channel-owned dispatcher
  -> messages.receive record/finalize bridge
  -> messages.live for preview/progress
  -> messages.send for final delivery
```

在所有捆绑插件和已知的第三方兼容性路径都桥接完成后，
`channel.turn` 可以被弃用。在发布 SDK 迁移路径以及证明旧插件仍能
正常工作或因版本错误明确失败的契约测试之前，不应移除它。

## 兼容性保障

在迁移期间，对于任何现有的投递回调具有超出“发送此负载”之外副作用的
渠道，通用持久化投递均默认为可选加入。

遗留入口点默认是非持久化的：

- `channel.turn.run` 和 `dispatchAssembledChannelTurn` 使用渠道的
  投递回调，除非该渠道显式提供了经过审计的持久化策略/选项对象。
- `channel.turn.runPrepared` 保持由渠道拥有，直到准备好的调度器
  显式调用发送上下文。
- 诸如 `recordInboundSessionAndDispatchReply`、
  `dispatchInboundReplyWithBase` 等公共兼容性辅助函数，以及直接私信（私信）辅助函数，绝不会在调用者提供的 `deliver` 或 `reply` 回调之前注入通用
  持久化投递逻辑。

对于迁移桥接类型，`durable: undefined` 意味着“非持久化”。
持久化路径只能通过显式的策略/选项值来启用。`durable:
false` 可以保留作为兼容性写法，但实现不应要求每个未迁移的渠道都添加它。

当前的桥接代码必须保持持久化决策的明确性：

- 持久化最终投递返回一个可区分的状态。`handled_visible` 和
  `handled_no_send` 是终结状态；`unsupported` 和 `not_applicable` 可能
  回退到渠道拥有的投递；`failed` 会传播发送失败。
- 通用持久化最终投递受适配器能力（如静默投递、回复目标保留、原生引用保留
  和消息发送钩子）的限制。如果缺少功能对等性，应选择渠道拥有的投递，
  而不是会改变用户可见行为的通用发送。
- 由队列支持的持久化发送会暴露一个发送意图引用。现有的 `pendingFinalDelivery*` 会话字段可以在转换期间携带意图 ID；最终状态是一个 `MessageSendIntent` 存储，而不是冻结的回复文本加上临时的上下文字段。

在满足以下所有条件之前，不要为渠道启用通用的持久化路径：

- 通用发送适配器执行与旧的直接路径相同的渲染和传输行为。
- 发送后的本地副作用通过发送上下文保留。
- 适配器返回回执或包含所有平台消息 ID 的发送结果。
- 准备好的分发器路径要么调用新的发送上下文，要么被记录为在持久化保证之外。
- 回退发送处理每一个投影的有效载荷，而不仅仅是第一个。
- 持久化回退发送将整个投影的有效载荷数组记录为一个可重放的意图或批次计划。

需要保留的具体迁移风险：

- iMessage 监视器发送记录在成功发送后会将已发送消息存储在回显缓存中。持久化的最终发送仍必须填充该缓存，否则 OpenClaw 可能会将其自己的最终回复作为入站用户消息重新摄取。
- Tlon 附加一个可选的模型签名，并在群组回复后记录参与的线程。通用持久化发送不得绕过这些效果；要么将它们移入 Tlon 的渲染/发送/完成适配器，要么让 Tlon 保留在渠道拥有的路径上。
- Discord 和其他准备好的分发器已经拥有直接发送和预览行为。在它们的准备好的分发器明确通过发送上下文路由最终消息之前，它们不受组装回合持久化保证的覆盖。
- Telegram 静默回退发送必须传递完整的投影有效载荷数组。单有效载荷的快捷方式可能会在投影后丢弃额外的回退有效载荷。
- LINE、Zalo、Nostr 以及其他现有的组装/辅助路径可能包含回复令牌处理、媒体代理、已发送消息缓存、加载/状态清理或仅回调的目标。它们应继续使用渠道拥有的交付，直到这些语义由发送适配器表示并通过测试验证。
- 直接私信辅助函数可能拥有一个回复回调，该回调是唯一正确的传输目标。通用出站绝不能从 `OriginatingTo` 或 `To` 猜测并跳过该回调。
- OpenClaw 网关的故障输出必须对人类保持可见，但标记为机器人编写的房间回显必须在 `allowBots` 授权之前被丢弃。渠道不得使用可见文本前缀过滤器来实现这一点，除非作为临时的紧急补救措施；持久化契约是结构化的来源元数据。

## 内部存储

持久化队列应存储消息发送意图，而不是回复载荷。

```typescript
type DurableSendIntent = {
  id: string;
  idempotencyKey: string;
  channel: string;
  accountId?: string;
  message: ChannelMessage;
  batch?: RenderedMessageBatch;
  liveState?: LiveMessageState;
  status: "pending" | "sending" | "committing" | "unknown_after_send" | "sent" | "failed" | "cancelled";
  attempt: number;
  nextAttemptAt?: number;
  receipt?: MessageReceipt;
  partialReceipt?: MessageReceipt;
  failure?: DeliveryFailure;
  createdAt: number;
  updatedAt: number;
};
```

恢复循环：

```text
load pending or sending intents
  -> acquire idempotency lock
  -> skip if receipt already committed
  -> reconstruct send context
  -> render if needed
  -> reconcile unknown_after_send if needed
  -> call adapter send/edit/finalize
  -> commit receipt, mark unknown_after_send, or schedule retry
```

队列应保留足够的身份信息，以便在重启后通过相同的账户、线程、目标、格式化策略和媒体规则进行重放。

## 故障类别

渠道适配器将传输故障分类为封闭类别：

```typescript
type DeliveryFailureKind = "transient" | "rate_limit" | "auth" | "permission" | "not_found" | "invalid_payload" | "conflict" | "cancelled" | "unknown";
```

核心策略：

- 重试 `transient` 和 `rate_limit`。
- 除非存在渲染回退，否则不要重试 `invalid_payload`。
- 在配置更改之前，不要重试 `auth` 或 `permission`。
- 对于 `not_found`，当渠道声明安全时，允许实时完成从编辑回退到全新发送。
- 对于 `conflict`，使用回执/幂等规则来决定消息是否已存在。
- 在适配器可能已完成平台 I/O 但在回执提交之前的任何错误都会变成 `unknown_after_send`，除非适配器能证明平台操作未发生。

## 渠道映射

| 渠道            | 目标迁移                                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Telegram        | 接收确认策略加上持久化的最终发送。实时适配器负责发送加编辑预览、陈旧预览最终发送、主题、引用回复预览跳过、媒体回退以及重试后处理。                                                                                                           |
| Discord         | 发送适配器封装现有的持久化负载传递。实时适配器负责草稿编辑、进度草稿、媒体/错误预览取消、回复目标保留以及消息 ID 回执。审计共享房间中机器人生成的网关失败回显；如果 Discord 无法在普通消息上传递源元数据，则使用出站注册表或其他原生等效项。 |
| Slack           | 发送适配器处理普通聊天帖子。实时适配器在线程形状支持时选择原生流，否则选择草稿预览。回执保留线程时间戳。源适配器将 OpenClaw 网关失败映射到 Slack `chat.postMessage.metadata`，并在 `allowBots` 授权之前丢弃标记的机器人房间回显。            |
| WhatsApp        | 发送适配器负责具有持久化最终意图的文本/媒体发送。接收适配器处理群组提及和发送者身份。在 WhatsApp 拥有可编辑的传输之前，实时适配器可以保持缺席。                                                                                              |
| Matrix          | 实时适配器负责草稿事件编辑、定稿、删除、加密媒体约束以及回复目标不匹配回退。接收适配器负责加密事件补全和去重。源适配器应将 OpenClaw 网关失败源编码到 Matrix 事件内容中，并在 `allowBots` 处理之前丢弃已配置的机器人房间回显。                |
| Mattermost      | 实时适配器负责一个草稿帖子、进度/工具折叠、原地定稿以及全新发送回退。                                                                                                                                                                        |
| Microsoft Teams | 实时适配器拥有原生进度和块流行为。发送适配器拥有活动和附件/卡片回执。                                                                                                                                                                        |
| Feishu          | 渲染适配器负责文本/卡片/原始渲染。实时适配器负责流式卡片和重复最终抑制。发送适配器负责评论、主题会话、媒体和语音抑制。                                                                                                                       |
| QQ Bot          | 实时适配器负责 C2C 流式传输、累加器超时和回退最终发送。渲染适配器负责媒体标签和文本转语音。                                                                                                                                                  |
| Signal          | 简单的接收加发送适配器。除非 signal-cli 添加可靠的编辑支持，否则没有实时适配器。                                                                                                                                                             |
| iMessage        | 简单的接收加发送适配器。iMessage 发送必须在持久化最终结果绕过监视器传递之前，保留监视器回显缓存（echo-cache）的填充。                                                                                                                        |
| Google Chat     | 简单的接收加发送适配器，将线程关系映射到空间和线程 ID。审查 `allowBots=true` 房间中标记了 OpenClaw 网关失败回显的行为。                                                                                                                      |
| LINE            | 简单的接收加发送适配器，将回复令牌（reply-token）约束建模为目标/关系能力。                                                                                                                                                                   |
| Nextcloud Talk  | SDK 接收桥接加发送适配器。                                                                                                                                                                                                                   |
| IRC             | 简单的接收加发送适配器，没有持久化编辑回执。                                                                                                                                                                                                 |
| Nostr           | 用于加密私信的接收加发送适配器；回执是事件 ID。                                                                                                                                                                                              |
| QA 频道         | 针对接收、发送、实时、重试和恢复行为的契约测试适配器。                                                                                                                                                                                       |
| Synology Chat   | 简单的接收加发送适配器。                                                                                                                                                                                                                     |
| Tlon            | 发送适配器必须在启用通用持久化最终传递之前，保留模型签名渲染和参与线程跟踪。                                                                                                                                                                 |
| Twitch          | 带有速率限制分类的简单接收加发送适配器。                                                                                                                                                                                                     |
| Zalo            | 简单的接收加发送适配器。                                                                                                                                                                                                                     |
| Zalo Personal   | 简单的接收加发送适配器。                                                                                                                                                                                                                     |

## 迁移计划

### 第一阶段：内部消息域

- 为消息、目标、关系、来源、回执、能力、持久化意图、接收上下文、发送上下文、实时上下文和故障类添加 `src/channels/message/*` 类型。
- 将 `origin?: MessageOrigin` 添加到当前回复传递使用的迁移桥接负载类型中，然后随着重构替换回复负载，将该字段移动到 `ChannelMessage` 和渲染消息类型。
- 在适配器和测试验证了形状之前，请保持其内部性。
- 为状态转换和序列化添加纯单元测试。

### 第二阶段：持久化发送核心

- 将现有的出站队列从回复负载持久化迁移到持久化消息发送意图。
- 让持久化发送意图携带投影负载数组或批处理计划，而不仅仅是一个回复负载。
- 通过兼容性转换保留当前的队列恢复行为。
- 让 `deliverOutboundPayloads` 调用 `messages.send`。
- 在适配器声明重放安全之后，使最终发送的持久性成为默认设置，并且当持久化意图无法写入新消息生命周期时，以封闭失败（fail closed）方式处理。在此阶段，现有的渠道轮次（渠道-turn）和 SDK 兼容路径默认保持直接发送模式。
- 一致地记录回执。
- 将回执和投递结果返回给原始调度器调用者，而不是将持久化发送视为终端副作用。
- 通过持久化发送意图保留消息来源，以便恢复、重放和分块发送保留 OpenClaw 的操作来源。

### 阶段 3：渠道轮次桥接（Channel Turn Bridge）

- 在 `messages.receive` 和 `messages.send` 之上重新实现 `channel.turn.run` 和 `dispatchAssembledChannelTurn`。
- 保持当前事实（fact）类型的稳定性。
- 默认保留旧行为。只有当组装轮次渠道的适配器明确选择使用重放安全的持久性策略时，该渠道才会变得持久化。
- 将 `durable: false` 作为兼容性逃生舱（escape hatch），用于完成原生编辑且尚无法安全重放的路径，但不要依赖 `false` 标记来保护未迁移的渠道。
- 仅在新消息生命周期中默认组装轮次的持久性，且需在渠道映射证明通用发送路径保留了旧的渠道投递语义之后。

### 阶段 4：准备好的调度器桥接（Prepared Dispatcher Bridge）

- 用发送上下文桥接替换 `deliverDurableInboundReplyPayload`。
- 保留旧的辅助程序作为包装器。
- 首先迁移 Telegram、WhatsApp、Slack、Signal、iMessage 和 Discord，因为它们已经具备了持久化最终（durable-final）工作或更简单的发送路径。
- 在所有准备好的调度器明确选择加入发送上下文之前，将其视为未覆盖。文档和更新日志条目必须说明“组装的渠道轮次”或命名已迁移的渠道路径，而不是声称所有自动最终回复。
- 保持 `recordInboundSessionAndDispatchReply`、direct-私信 辅助函数和类似的公共兼容辅助函数的行为不变。它们稍后可能会暴露显式的发送上下文（send-context）选择加入，但在调用方拥有的交付回调之前，绝不能自动尝试通用的持久化交付。

### 阶段 5：统一的实时生命周期

- 构建 `messages.live`，并配备两个验证适配器：
  - Telegram 用于发送、编辑以及过期的最终发送。
  - Matrix 用于草稿定稿以及撤回回退。
- 然后迁移 Discord、Slack、Mattermost、Teams、QQ 机器人和飞书。
- 只有在每个渠道都有对等测试（parity tests）之后，才能删除重复的预览定稿代码。

### 阶段 6：公共 SDK

- 添加 `openclaw/plugin-sdk/channel-message`。
- 将其记录为首选的渠道插件 API。
- 更新包导出、入口清单、生成的 API 基线以及插件 SDK 文档。
- 在 渠道-message SDK 表面中包含 `MessageOrigin`、origin 编码/解码钩子以及共享的 `shouldDropOpenClawEcho` 谓词。
- 为旧的子路径保留兼容性包装器。
- 在捆绑插件迁移后，在文档中将命名的 reply SDK 辅助函数标记为已弃用。

### 阶段 7：所有发送方

将所有非回复的出站生产者移动到 `messages.send` 上：

- cron 和心跳通知
- 任务完成
- 钩子结果
- 审批提示和审批结果
- 消息工具发送
- 子代理完成公告
- 显式的 CLI 或控制 UI 发送
- 自动化/广播路径

在这一步，模型不再是“代理回复”，而是变成“OpenClaw 发送消息”。

### 阶段 8：弃用 Turn

- 在至少一个兼容性窗口期内，将 `channel.turn` 作为包装器保留。
- 发布迁移说明。
- 针对旧导入运行插件 SDK 兼容性测试。
- 只有在没有任何捆绑插件需要旧内部辅助函数，且第三方合约有了稳定的替代方案之后，才能移除或隐藏这些旧的内部辅助函数。

## 测试计划

单元测试：

- 持久化发送意图的序列化和恢复。
- 幂等性密钥重用和重复抑制。
- 回执提交和重放跳过。
- `unknown_after_send` 恢复，当适配器支持协调时，在重放之前进行协调。
- 故障分类策略。
- 接收确认策略排序。
- 针对回复、跟进、系统和广播发送的关系映射。
- Gateway(网关) 失败源工厂和 `shouldDropOpenClawEcho` 谓词。
- 通过负载规范化、分块、持久化队列序列化和恢复来保留来源。

集成测试：

- `channel.turn.run` 简单适配器仍然记录和发送。
- 除非渠道明确选择加入，否则传统的组装事件传递不会变得持久。
- `channel.turn.runPrepared` 网桥仍然记录并完成。
- 公共兼容性助手默认调用调用者拥有的交付回调，并且在这些回调之前不进行通用发送。
- 持久化回退交付在重启后重放整个投影的负载数组，并且不能在早期崩溃后不记录后面的负载。
- 持久的组装事件传递会将平台消息 ID 返回给缓冲分发器。
- 当持久化交付被禁用或不可用时，自定义交付钩子仍然返回平台消息 ID。
- 最终回复在助手完成和平台发送之间的重启后保留。
- 预览草稿在被允许时原地完成。
- 当媒体/错误/回复目标不匹配需要正常交付时，预览草稿被取消或编辑。
- 分块流式传输和预览流式传输不会同时传递相同的文本。
- 早期流式传输的媒体不会在最终交付中重复。

渠道测试：

- Telegram 主题回复，其轮询确认延迟到接收上下文的安全完成水位线。
- Telegram 轮询恢复，用于持久化的安全完成偏移量模型所覆盖的已接受但未传递的更新。
- Telegram 过期预览发送新的最终版本并清理预览。
- Telegram 静默回退发送每个投影的回退负载。
- Telegram 静默回退持久性以原子方式记录完整的投影回退数组，而不是每次循环迭代记录一个单负载持久化意图。
- Discord 在媒体/错误/显式回复时取消预览。
- Discord 准备好的调度器最终结果在文档或更新日志声称 Discord 最终回复持久性之前，通过发送上下文进行路由。
- iMessage 持久性最终发送填充监视器的已发送消息回显缓存。
- LINE、Zalo 和 Nostr 的旧版传递路径不会被通用持久性发送绕过，直到存在它们的适配器对等测试。
- Direct-私信/Nostr 回调传递保持权威性，除非显式迁移到完整消息目标和重放安全发送适配器。
- Slack 标记的 OpenClaw 网关失败消息保持对外可见，标记的机器人房间回显在 SlackOpenClaw`allowBots` 之前丢弃，并且具有相同可见文本的未标记机器人消息仍遵循正常的机器人授权。
- Slack 原生流在顶级私信中回退到草稿预览。
- Matrix 预览定稿和撤回回退。
- 来自配置的机器人帐户的 Matrix 标记 OpenClaw 网关失败房间回显在 MatrixOpenClaw`allowBots` 处理之前丢弃。
- Discord 和 Google Chat 共享房间网关失败级联审计在声称那里的通用保护之前覆盖 DiscordGoogle Chat`allowBots` 模式。
- Mattermost 草稿定稿和新鲜发送回退。
- Teams 原生进度定稿。
- Feishu 重复最终抑制。
- QQ 机器人累加器超时回退。
- Tlon 持久性最终发送保留模型签名渲染和参与的线程跟踪。
- WhatsApp、Signal、iMessage、Google Chat、LINE、IRC、Nostr、Nextcloud Talk、Synology Chat、Tlon、Twitch、Zalo 和 Zalo Personal 的简单持久性最终发送。

验证：

- 开发过程中针对特定的 Vitest 文件。
- Testbox 中的 `pnpm check:changed` 用于完整的变更覆盖范围。
- 在完成整个重构落地之前或公开 SDK/导出变更之后，在 Testbox 中进行更广泛的 `pnpm check`。
- 在移除兼容性封装之前，对至少一个支持编辑的渠道和一个仅发送的简单渠道进行实时或 qa-渠道 冒烟测试。

## 未解决的问题

- Telegram 是否最终应将 grammY 运行器源替换为完全持久的轮询源，该源可以控制平台级别的重新传递，而不仅仅是 OpenClaw 的持久化重启水印。
- 持久的实时预览状态是应该存储在与最终发送意图相同的队列记录中，还是存储在同级实时状态存储中。
- 在 `plugin-sdk/channel-message` 发布后，兼容性封装应保留文档多长时间。
- 第三方插件应该直接实现接收适配器，还是仅通过 `defineChannelMessageAdapter` 提供规范化/发送/实时钩子。
- 哪些回执字段可以安全地在公共 SDK 中公开，哪些仅限于内部运行时状态。
- 诸如自身回显缓存和参与线程标记之类的副作用，应该被建模为发送上下文钩子、适配器拥有的最终化步骤，还是回执订阅者。
- 哪些渠道具有原生来源元数据，哪些需要持久的出站注册表，以及哪些渠道无法提供可靠的跨机器人回显抑制。

## 验收标准

- 每个捆绑的消息渠道都通过 `messages.send` 发送最终可见输出。
- 每个入站消息渠道都通过 `messages.receive` 或文档化的兼容性封装进入。
- 每个预览/编辑/流式渠道都使用 `messages.live` 进行草稿状态处理和最终确定。
- `channel.turn` 仅是一个封装。
- 命名的 Reply SDK 辅助函数是兼容性导出，不是推荐路径。
- 持久恢复可以在重启后重播挂起的最终发送，而不会丢失最终响应或重复已提交的发送；平台结果未知的发送在重播之前会进行协调，或者在该适配器的文档中标注为至少一次。
- 当无法写入持久化意图时，持久化最终发送会以失败关闭，除非调用方明确选择了有文档记录的非持久化模式。
- 传统的渠道轮次和 SDK 兼容性辅助程序默认为直接的渠道自有交付；通用持久化发送仅作为明确的可选项提供。
- 回执为多部分交付保留所有平台消息 ID，并为线程/编辑便利保留一个主 ID。
- 在替换直接交付回调之前，持久化包装器会保留渠道本地副作用。
- 在准备好的分发器的最终交付路径明确使用发送上下文之前，它们不被视为持久化。
- 回退交付处理每个预测的有效载荷。
- 持久化回退交付在一个可重放意图或批处理计划中记录每个预测的有效载荷。
- OpenClaw 发起的网关故障输出对人类可见，但在声明支持源合约的渠道上，标记为机器人创作的房间回声会在机器人授权之前被丢弃。
- 文档解释了发送、接收、实时、状态、回执、关系、故障策略、迁移和测试覆盖率。

## 相关

- [消息](/zh/concepts/messages)
- [流式传输和分块](/zh/concepts/streaming)
- [进度草稿](/zh/concepts/progress-drafts)
- [重试策略](/zh/concepts/retry)
- [渠道轮次内核](/zh/plugins/sdk-channel-turn)
