---
summary: "runtime.渠道.turn -- 共享的入站轮次内核，用于记录、分发和终结代理轮次，供内置和第三方渠道插件使用"
title: "渠道轮次内核"
sidebarTitle: "渠道轮次"
read_when:
  - You are building a channel plugin and want the shared inbound turn lifecycle
  - You are migrating a channel monitor off hand-rolled record/dispatch glue
  - You need to understand admission, ingest, classify, preflight, resolve, record, dispatch, and finalize stages
---

渠道轮次内核是一个共享的入站状态机，它将标准化的平台事件转换为代理轮次。渠道插件提供平台事实和交付回调。核心拥有编排权：摄取、分类、预检、解析、授权、组装、记录、分发和终结。

当您的插件位于入站消息热路径上时，请使用此功能。对于非消息事件（斜杠命令、模态框、按钮交互、生命周期事件、反应、语音状态），请将其保留在插件本地。内核仅拥有可能成为代理文本轮次的事件。

<Info>通过注入的插件运行时作为 `runtime.channel.turn.*` 可以到达内核。插件运行时类型从 `openclaw/plugin-sdk/core` 导出，因此第三方原生插件可以像内置渠道插件一样使用这些入口点。</Info>

## 为什么使用共享内核

渠道插件重复相同的入站流程：标准化、路由、门控、构建上下文、记录会话元数据、分发代理轮次、终结交付状态。如果没有共享内核，对提及门控、仅工具可见回复、会话元数据、挂起历史或分发终结的更改必须逐个渠道应用。

内核有意将四个概念分开：

- `ConversationFacts`：消息来自哪里
- `RouteFacts`：哪个代理和会话应该处理它
- `ReplyPlanFacts`：可见回复应该去哪里
- `MessageFacts`：代理应该看到什么正文和补充上下文

Slack 私信、Telegram 主题、Matrix 线程和 Feishu 主题会话实际上都区分了这些概念。将它们视为一个标识符会导致随时间推移产生偏差。

## 阶段生命周期

无论渠道如何，内核都运行相同的固定流水线：

1. `ingest` -- 适配器将原始平台事件转换为 `NormalizedTurnInput`
2. `classify` -- 适配器声明此事件是否可以启动代理轮次
3. `preflight` -- 适配器执行去重、自身回显、填充、防抖、解密、部分事实预填充
4. `resolve` -- 适配器返回一个完全组装好的轮次（路由、回复计划、消息、交付）
5. `authorize` -- 将私信、群组、提及和命令策略应用于组装好的事实
6. `assemble` -- 通过 `buildContext` 从事实构建的 `FinalizedMsgContext`
7. `record` -- 入站会话元数据和最后一条路由已持久化
8. `dispatch` -- 代理轮次通过缓冲块调度器执行
9. `finalize` -- 即使在分发错误时，适配器的 `onFinalize` 也会运行

当提供 `log` 回调时，每个阶段都会发出一个结构化日志事件。请参阅 [Observability](#observability)。

## 准入类型

当轮次被拦截时，内核不会抛出异常。它返回一个 `ChannelTurnAdmission`：

| 类型          | 时机                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `dispatch`    | 轮次被准许。代理轮次运行并执行可见的回复路径。                                                       |
| `observeOnly` | 轮次端到端运行，但交付适配器不发送任何可见内容。用于广播观察者代理和其他被动多代理流程。             |
| `handled`     | 平台事件在本地被消费（生命周期、反应、按钮、模态框）。内核跳过分发。                                 |
| `drop`        | 跳过路径。可选地，`recordHistory: true` 将消息保留在挂起的群组历史记录中，以便未来的提及具有上下文。 |

准入可能来自 `classify`（事件类别表明它不能启动轮次）、来自 `preflight`（去重、自身回显、具有历史记录的缺失提及），或来自 `resolveTurn` 本身。

## 入口点

运行时公开了三个首选入口点，以便适配器可以在与渠道匹配的级别进行选择加入。

```typescript
runtime.channel.turn.run(...)             // adapter-driven full pipeline
runtime.channel.turn.runAssembled(...)    // already-built context + delivery adapter
runtime.channel.turn.runPrepared(...)     // channel owns dispatch; kernel runs record + finalize
runtime.channel.turn.buildContext(...)    // pure facts to FinalizedMsgContext mapping
```

为了保持与插件 SDK 的兼容性，保留了两个较旧的运行时辅助工具：

```typescript
runtime.channel.turn.runResolved(...)      // deprecated compatibility alias; prefer run
runtime.channel.turn.dispatchAssembled(...) // deprecated compatibility alias; prefer runAssembled
```

### run

当您的渠道可以将其入站流表示为 `ChannelTurnAdapter<TRaw>` 时使用。该适配器具有用于 `ingest`、可选的 `classify`、可选的 `preflight`、强制的 `resolveTurn` 和可选的 `onFinalize` 的回调。

```typescript
await runtime.channel.turn.run({
  channel: "tlon",
  accountId,
  raw: platformEvent,
  adapter: {
    ingest(raw) {
      return {
        id: raw.messageId,
        timestamp: raw.timestamp,
        rawText: raw.body,
        textForAgent: raw.body,
      };
    },
    classify(input) {
      return { kind: "message", canStartAgentTurn: input.rawText.length > 0 };
    },
    async preflight(input, eventClass) {
      if (await isDuplicate(input.id)) {
        return { admission: { kind: "drop", reason: "dedupe" } };
      }
      return {};
    },
    resolveTurn(input) {
      return buildAssembledTurn(input);
    },
    onFinalize(result) {
      clearPendingGroupHistory(result);
    },
  },
});
```

当渠道的适配器逻辑较少，并且受益于通过 hooks 拥有生命周期时，`run` 是合适的选择。

### runAssembled

当渠道已经解析了路由，构建了 `FinalizedMsgContext`，
并且只需要共享的 record、reply-pipeline、dispatch 和 finalize
排序时使用。这是简单的捆绑入站路径的首选形式，否则将重复 `createChannelMessageReplyPipeline(...)` 和
`runPrepared(...)` 样板代码。

```typescript
await runtime.channel.turn.runAssembled({
  cfg,
  channel: "irc",
  accountId,
  agentId: route.agentId,
  routeSessionKey: route.sessionKey,
  storePath,
  ctxPayload,
  recordInboundSession: runtime.channel.session.recordInboundSession,
  dispatchReplyWithBufferedBlockDispatcher: runtime.channel.reply.dispatchReplyWithBufferedBlockDispatcher,
  delivery: {
    deliver: async (payload) => {
      await sendPlatformReply(payload);
    },
    onError: (err, info) => {
      runtime.error?.(`reply ${info.kind} failed: ${String(err)}`);
    },
  },
});
```

当唯一由渠道拥有的 dispatch 行为是最终负载传递加上可选的输入中、回复选项、持久传递或错误日志记录时，请选择 `runAssembled` 而不是 `runPrepared`。

### runPrepared

当渠道具有复杂的本地分发器，包含必须保持渠道拥有的预览、重试、编辑或线程引导时使用。内核仍然在分发之前记录入站会话，并提供统一的 `DispatchedChannelTurnResult`。

```typescript
const { dispatchResult } = await runtime.channel.turn.runPrepared({
  channel: "matrix",
  accountId,
  routeSessionKey,
  storePath,
  ctxPayload,
  recordInboundSession,
  record: {
    onRecordError,
    updateLastRoute,
  },
  onPreDispatchFailure: async (err) => {
    await stopStatusReactions();
  },
  runDispatch: async () => {
    return await runMatrixOwnedDispatcher();
  },
});
```

富渠道（Matrix、Mattermost、Microsoft Teams、Feishu、QQ Bot）使用 `runPrepared`，因为它们的分发器编排了内核绝不能了解的平台特定行为。

### buildContext

一个将 fact bundles 映射到 `FinalizedMsgContext` 的纯函数。当您的渠道手动构建部分管道但希望保持一致的 context shape 时使用它。

```typescript
const ctxPayload = runtime.channel.turn.buildContext({
  channel: "googlechat",
  accountId,
  messageId,
  timestamp,
  from,
  sender,
  conversation,
  route,
  reply,
  message,
  access,
  media,
  supplemental,
});
```

当为 `run` 组装回合时，`buildContext` 在 `resolveTurn` 回调内部也很有用。

<Note>诸如 `dispatchInboundReplyWithBase` 之类的已弃用 SDK 助手仍然通过 assembled-turn 助手进行桥接。新的插件代码应该使用 `run` 或 `runPrepared`。</Note>

## Fact types

内核从适配器消耗的这些事实是平台无关的。在将它们交给内核之前，请将平台对象转换为这些形状。

### NormalizedTurnInput

| 字段              | 目的                                                 |
| ----------------- | ---------------------------------------------------- |
| `id`              | 用于去重和日志的稳定消息 ID                          |
| `timestamp`       | 可选的纪元毫秒数                                     |
| `rawText`         | 从平台接收的正文                                     |
| `textForAgent`    | 可选的供代理使用的清理后的正文（去除提及、修剪输入） |
| `textForCommands` | 用于 `/command` 解析的可选正文                       |
| `raw`             | 可选的透传引用，用于需要原始对象的适配器回调         |

### ChannelEventClass

| 字段                   | 目的                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| `kind`                 | `message`, `command`, `interaction`, `reaction`, `lifecycle`, `unknown` |
| `canStartAgentTurn`    | 如果为 false，内核返回 `{ kind: "handled" }`                            |
| `requiresImmediateAck` | 给需要在分发前进行 ACK 的适配器的提示                                   |

### SenderFacts

| 字段           | 目的                                          |
| -------------- | --------------------------------------------- |
| `id`           | 稳定的平台发送者 ID                           |
| `name`         | 显示名称                                      |
| `username`     | 如果与 `name` 不同，则为句柄                  |
| `tag`          | Discord 风格的标识符或平台标签                |
| `roles`        | 角色 ID，用于成员角色白名单匹配               |
| `isBot`        | 当发送者是已知机器人时为 true（内核用于丢弃） |
| `isSelf`       | 当发送者是配置的代理本身时为 true             |
| `displayLabel` | 用于信封文本的预渲染标签                      |

### ConversationFacts

| 字段              | 目的                                                  |
| ----------------- | ----------------------------------------------------- |
| `kind`            | `direct`, `group` 或 `channel`                        |
| `id`              | 用于路由的对话 ID                                     |
| `label`           | 信封的人工可读标签                                    |
| `spaceId`         | 可选的外部空间标识符（Slack 工作区，Matrix 主服务器） |
| `parentId`        | 当这是一个话题线程时的外部对话 ID                     |
| `threadId`        | 当此消息在话题线程内时的线程 ID                       |
| `nativeChannelId` | 与路由 ID 不同时的平台原生渠道 ID                     |
| `routePeer`       | 用于 `resolveAgentRoute` 查找的对等端                 |

### RouteFacts

| 字段                    | 用途                                   |
| ----------------------- | -------------------------------------- |
| `agentId`               | 应处理此轮次的 Agent                   |
| `accountId`             | 可选覆盖（多账户渠道）                 |
| `routeSessionKey`       | 用于路由的会话密钥                     |
| `dispatchSessionKey`    | 在分发时使用且与路由密钥不同的会话密钥 |
| `persistedSessionKey`   | 写入持久化会话元数据的会话密钥         |
| `parentSessionKey`      | 分支/话题线程会话的父级                |
| `modelParentSessionKey` | 分支会话的模型端父级                   |
| `mainSessionKey`        | 用于直接对话的主要 私信 所有者固定项   |
| `createIfMissing`       | 允许 record 步骤创建缺失的会话行       |

### ReplyPlanFacts

| 字段                      | 用途                                             |
| ------------------------- | ------------------------------------------------ |
| `to`                      | 写入上下文 `To` 的逻辑回复目标                   |
| `originatingTo`           | 原始上下文目标（`OriginatingTo`）                |
| `nativeChannelId`         | 用于发送的平台原生渠道 ID                        |
| `replyTarget`             | 如果与 `to` 不同，则为最终可见回复目标           |
| `deliveryTarget`          | 较低级别的发送覆盖                               |
| `replyToId`               | 引用/锚定消息 ID                                 |
| `replyToIdFull`           | 当平台同时具备两者时的完整形式引用 ID            |
| `messageThreadId`         | 发送时的线程 ID                                  |
| `threadParentId`          | 线程的父消息 ID                                  |
| `sourceReplyDeliveryMode` | `thread`、`reply`、`channel`、`direct` 或 `none` |

### AccessFacts

`AccessFacts` 携带了授权阶段所需的布尔值。身份匹配保留在渠道中：内核仅消费结果。

| 字段       | 用途                                               |
| ---------- | -------------------------------------------------- |
| `dm`       | 私信允许/配对/拒绝决策以及 `allowFrom` 列表        |
| `group`    | 群组策略、路由允许、发送者允许、允许列表、提及要求 |
| `commands` | 跨已配置授权器的命令授权                           |
| `mentions` | 是否可以进行提及检测以及是否提及了 agent           |

### MessageFacts

| 字段             | 用途                                 |
| ---------------- | ------------------------------------ |
| `body`           | 最终信封主体（已格式化）             |
| `rawBody`        | 原始入站主体                         |
| `bodyForAgent`   | Agent 看到的主体                     |
| `commandBody`    | 用于命令解析的主体                   |
| `envelopeFrom`   | 信封的预渲染发送者标签               |
| `senderLabel`    | 渲染发送者的可选覆盖                 |
| `preview`        | 用于日志的简短编辑预览               |
| `inboundHistory` | 当渠道保留缓冲区时的近期入站历史条目 |

### SupplementalContextFacts

补充上下文涵盖引用、转发和线程引导上下文。内核应用已配置的 `contextVisibility` 策略。渠道适配器仅提供事实和 `senderAllowed` 标志，以便跨渠道策略保持一致。

### InboundMediaFacts

媒体采用事实形态。平台下载、身份验证、SSRF 策略、CDN 规则和解密保留在渠道本地。内核将事实映射到 `MediaPath`、`MediaUrl`、`MediaType`、`MediaPaths`、`MediaUrls`、`MediaTypes` 和 `MediaTranscribedIndexes` 中。

## 适配器契约

对于完整的 `run`，适配器形状如下：

```typescript
type ChannelTurnAdapter<TRaw> = {
  ingest(raw: TRaw): Promise<NormalizedTurnInput | null> | NormalizedTurnInput | null;
  classify?(input: NormalizedTurnInput): Promise<ChannelEventClass> | ChannelEventClass;
  preflight?(input: NormalizedTurnInput, eventClass: ChannelEventClass): Promise<PreflightFacts | ChannelTurnAdmission | null | undefined>;
  resolveTurn(input: NormalizedTurnInput, eventClass: ChannelEventClass, preflight: PreflightFacts): Promise<ChannelTurnResolved> | ChannelTurnResolved;
  onFinalize?(result: ChannelTurnResult): Promise<void> | void;
};
```

`resolveTurn` 返回一个 `ChannelTurnResolved`，这是一个带有可选准入类型的 `AssembledChannelTurn`。返回 `{ admission: { kind: "observeOnly" } }` 会运行该轮次而不产生可见输出。适配器仍然拥有交付回调；它只是在该轮次中变为空操作（no-op）。

`onFinalize` 在每个结果上运行，包括分发错误。使用它来清除待处理的组历史记录、移除确认反应、停止状态指示器以及刷新本地状态。

## 交付适配器

内核不直接调用平台。渠道将 `ChannelTurnDeliveryAdapter` 交给内核：

```typescript
type ChannelTurnDeliveryAdapter = {
  deliver(payload: ReplyPayload, info: ChannelDeliveryInfo): Promise<ChannelDeliveryResult | void>;
  onError?(err: unknown, info: { kind: string }): void;
  durable?: false | DurableInboundReplyDeliveryOptions;
};

type ChannelDeliveryResult = {
  messageIds?: string[];
  receipt?: MessageReceipt;
  threadId?: string;
  replyToId?: string;
  visibleReplySent?: boolean;
};
```

`deliver` 每个缓冲的回复块调用一次。在消息生命周期迁移期间，组装的渠道轮次交付默认由渠道拥有：省略 `durable` 字段意味着内核必须直接调用 `deliver`，且不得通过通用出站交付路由。仅在审核渠道以证明通用发送路径保留了旧的交付行为（包括回复/线程目标、媒体处理、已发送消息/自身回显缓存、状态清理和返回的消息 ID）之后，才设置 `durable`。`durable: false` 仍然是“使用渠道拥有的回调”的兼容拼写，但未迁移的渠道不需要添加它。当渠道拥有平台消息 ID 时返回它们，以便调度程序可以保留线程锚点并编辑后续块；较新的交付路径还应返回 `receipt`，以便恢复、预览最终确定和重复抑制可以摆脱 `messageIds`。对于仅观察的轮次，返回 `{ visibleReplySent: false }` 或使用 `createNoopChannelTurnDeliveryAdapter()`。

使用 `runPrepared` 且拥有完全由渠道拥有的分发器的渠道没有 `ChannelTurnDeliveryAdapter`。这些分发器默认情况下不是持久的。在它们明确选择加入新的发送上下文（包含完整目标、重放安全适配器、接收契约和渠道副作用挂钩）之前，它们应保持其直接传递路径。

诸如 `recordInboundSessionAndDispatchReply`、`dispatchInboundReplyWithBase` 之类的公共兼容性助手以及直接私信（direct-私信）助手在迁移期间必须保持行为不变。它们不应在调用方拥有的 `deliver` 或 `reply` 回调之前调用通用持久化传递。

## 记录选项

记录阶段封装了 `recordInboundSession`。大多数渠道可以使用默认值。通过 `record` 覆盖：

```typescript
record: {
  groupResolution,
  createIfMissing: true,
  updateLastRoute,
  onRecordError: (err) => log.warn("record failed", err),
  trackSessionMetaTask: (task) => pendingTasks.push(task),
}
```

分发器等待记录阶段。如果记录抛出错误，内核将运行 `onPreDispatchFailure`（当提供给 `runPrepared` 时）并重新抛出错误。

## 可观测性

当提供 `log` 回调时，每个阶段都会发出一个结构化事件：

```typescript
await runtime.channel.turn.run({
  channel: "twitch",
  accountId,
  raw,
  adapter,
  log: (event) => {
    runtime.log?.debug?.(`turn.${event.stage}:${event.event}`, {
      channel: event.channel,
      accountId: event.accountId,
      messageId: event.messageId,
      sessionKey: event.sessionKey,
      admission: event.admission,
      reason: event.reason,
    });
  },
});
```

已记录的阶段：`ingest`、`classify`、`preflight`、`resolve`、`authorize`、`assemble`、`record`、`dispatch`、`finalize`。避免记录原始正文；使用 `MessageFacts.preview` 获取简短的编辑预览。

## 保留在渠道本地的内容

内核负责编排。渠道仍然负责：

- 平台传输（网关、REST、websocket、轮询、webhooks）
- 身份解析和显示名称匹配
- 原生命令、斜杠命令、自动完成、模态框、按钮、语音状态
- 卡片、模态框和自适应卡片渲染
- 媒体授权、CDN 规则、加密媒体、转录
- 编辑、反应、编辑和在线状态 API
- 回填和平台端历史记录获取
- 需要平台特定验证的配对流程

如果两个渠道开始针对其中某一项需要相同的助手，请提取一个共享的 SDK 助手，而不是将其推送到内核中。

## 稳定性

`runtime.channel.turn.*` 是公共插件运行时表面的一部分。事实类型（`SenderFacts`、`ConversationFacts`、`RouteFacts`、`ReplyPlanFacts`、`AccessFacts`、`MessageFacts`、`SupplementalContextFacts`、`InboundMediaFacts`）和准入形状（`ChannelTurnAdmission`、`ChannelEventClass`）可以通过 `openclaw/plugin-sdk/core` 中的 `PluginRuntime` 访问。

向后兼容性规则适用：新的事实字段是累加的，准入种类（admission kinds）不重命名，且入口点名称保持稳定。需要非累加更改的新渠道需求必须通过插件 SDK 迁移流程。

## 相关

- [消息生命周期重构](/zh/concepts/message-lifecycle-refactor)，用于计划中的将封装此内核的发送/接收/实时（send/receive/live）生命周期
- [构建渠道插件](/zh/plugins/sdk-channel-plugins)，了解更广泛的渠道插件协议
- [插件运行时辅助工具](/zh/plugins/sdk-runtime)，用于其他 `runtime.*` 表面
- [插件内部机制](/zh/plugins/architecture-internals)，了解加载管道和注册机制
