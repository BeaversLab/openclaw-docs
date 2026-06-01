---
summary: "为 OpenClaw 构建消息渠道插件的分步指南"
title: "构建渠道插件"
sidebarTitle: "渠道插件"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

本指南将介绍如何构建一个连接 OpenClaw 和消息平台的渠道插件。在完成本指南后，您将拥有一个具备私信安全、配对、回复串接和出站消息功能的可运行渠道。

<Info>如果您之前没有构建过任何 OpenClaw 插件，请先阅读 [入门指南](/zh/plugins/building-plugins) 以了解基本的包 结构和清单设置。</Info>

## 渠道插件的工作原理

通道插件不需要自己的发送/编辑/反应工具。OpenClaw 在核心中保留
一个共享的 `message` 工具。您的插件拥有：

- **配置** - 账户解析和设置向导
- **安全性** - 私信策略和允许列表
- **配对** - 私信批准流程
- **会话语法** - 提供商特定的对话 ID 如何映射到基础聊天、线程 ID 和父级回退
- **出站** - 向平台发送文本、媒体和投票
- **线程化** - 回复如何进行线程化
- **心跳输入** - 用于心跳传递目标的可选输入/忙碌信号

核心拥有共享消息工具、提示连线、外部会话键形状、
通用 `:thread:` 记账和分派。

新的渠道插件还应从 `openclaw/plugin-sdk/channel-outbound` 中公开一个带有 `defineChannelMessageAdapter` 的 `message` 适配器。该适配器声明原生传输实际支持的持久最终发送能力，并将文本/媒体发送指向与旧版 `outbound` 适配器相同的传输函数。仅当合约测试证明了原生副作用和返回的回执时，才声明某一能力。
有关完整的 API 合约、示例、能力矩阵、回执规则、实时预览最终确定、接收确认策略、测试和迁移表，请参阅[渠道出站 API](/zh/plugins/sdk-channel-outbound)。
如果现有的 `outbound` 适配器已经具有正确的发送方法和能力元数据，请使用 `createChannelMessageAdapterFromOutbound(...)` 来派生 `message` 适配器，而不是手动编写另一个桥接。
适配器发送应返回 `MessageReceipt` 值。当兼容性代码仍需要旧版 ID 时，请使用 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 派生它们，而不是在新生命周期代码中保留并行的 `messageIds` 字段。
支持预览的渠道还应声明 `message.live.capabilities`，其中包含它们拥有的确切实时生命周期，例如 `draftPreview`、`previewFinalization`、`progressUpdates`、`nativeStreaming` 或 `quietFinalization`。原地完成草稿预览的渠道还应声明 `message.live.finalizer.capabilities`，例如 `finalEdit`、`normalFallback`、`discardPending`、`previewReceipt` 和 `retainOnAmbiguousFailure`，并将运行时逻辑通过 `defineFinalizableLivePreviewAdapter(...)` 加上 `deliverWithFinalizableLivePreviewAdapter(...)` 进行路由。确保这些能力由 `verifyChannelMessageLiveCapabilityAdapterProofs(...)` 和 `verifyChannelMessageLiveFinalizerProofs(...)` 测试提供支持，以便原生预览、进度、编辑、回退/保留、清理和回执行为不会悄然产生偏差。
推迟平台确认的入站接收器应声明 `message.receive.defaultAckPolicy` 和 `supportedAckPolicies`，而不是将确认时机隐藏在监控器本地状态中。用 `verifyChannelMessageReceiveAckPolicyAdapterProofs(...)` 覆盖每个声明的策略。

用于兼容性分发的旧版回复辅助函数（如 `createChannelTurnReplyPipeline`、
`dispatchInboundReplyWithBase` 和 `recordInboundSessionAndDispatchReply`）
仍然可用。请勿在新的渠道代码中使用这些名称；新插件应从 `message` 适配器以及 `openclaw/plugin-sdk/channel-outbound` 上的回执和接收/发送生命周期辅助函数开始。

迁移入站授权的渠道可以使用运行时接收路径中的实验性
`openclaw/plugin-sdk/channel-ingress-runtime` 子路径。该子路径将平台查找和副作用保留在插件中，同时
共享允许列表状态解析、路由/发送者/命令/事件/激活
决策、编辑后的诊断和轮次准入映射。请将插件身份标准化保留在传递给解析器的描述符中；请勿
序列化来自已解析状态或决策的原始匹配值。请参阅
[渠道入口 API](/zh/plugins/sdk-channel-ingress) 以了解 API 设计、
所有权边界和测试预期。

如果您的渠道支持入站回复之外的输入指示器，请在渠道插件上公开
`heartbeat.sendTyping(...)`。Core 会在心跳模型运行开始之前使用已解析的
心跳传递目标调用它，并使用共享的输入保活/清理生命周期。当平台需要
显式停止信号时，添加 `heartbeat.clearTyping(...)`。

如果您的渠道添加了承载媒体源的消息工具参数，请通过
`describeMessageTool(...).mediaSourceParams` 公开这些
参数名称。Core 使用该显式列表进行沙盒路径标准化和出站媒体访问
策略，因此插件不需要为提供商特定的
头像、附件或封面图像参数处理共享核心的特殊情况。
最好返回一个以操作为键的映射，例如
`{ "set-profile": ["avatarUrl", "avatarPath"] }`，这样不相关的操作就不会
继承另一个操作的媒体参数。对于在每个公开操作中
有意共享的参数，平面数组仍然有效。

如果您的渠道需要针对 `message(action="send")` 进行特定于提供商的调整，请优先使用 `actions.prepareSendPayload(...)`。将原生卡片、块、嵌入或其他持久化数据放在 `payload.channelData.<channel>` 下，让核心通过出站/消息适配器执行实际发送。仅将 `actions.handleAction(...)` 用于发送，作为无法序列化和重试的有效载荷的兼容性回退方案。

如果您的平台在对话 ID 内存储了额外的作用域，请使用 `messaging.resolveSessionConversation(...)` 在插件中保留该解析逻辑。这是将 `rawId` 映射到基础对话 ID、可选线程 ID、显式 `baseConversationId` 以及任何 `parentConversationCandidates` 的规范挂钩。当您返回 `parentConversationCandidates` 时，请按从最窄的父级到最宽/基础对话的顺序排列它们。

当插件代码需要规范化类似路由的字段、比较子线程与其父路由，或从 `{ channel, to, accountId, threadId }` 构建稳定的去重键时，请使用 `openclaw/plugin-sdk/channel-route`。该辅助函数以与核心相同的方式规范化数字线程 ID，因此插件应优先使用它，而不是临时的 `String(threadId)` 比较。

具有提供商特定目标语法的插件应公开 `messaging.resolveOutboundSessionRoute(...)`，以便核心无需使用解析器垫片即可获取提供商原生的会话和线程身份。

在渠道注册表启动之前需要相同解析的捆绑插件也可以暴露一个顶级 `session-key-api.ts` 文件，并带有匹配的 `resolveSessionConversation(...)` 导出。核心仅在运行时插件注册表尚不可用时才使用该引导安全表面。

`messaging.resolveParentConversationCandidates(...)` 仍然可用作传统兼容性回退方案，当插件只需要在通用/原始 ID 之上进行父级回退时。如果两个挂钩都存在，核心首先使用 `resolveSessionConversation(...).parentConversationCandidates`，并且仅当规范挂钩省略它们时才回退到 `resolveParentConversationCandidates(...)`。

## 审批和渠道功能

大多数渠道插件不需要特定于审批的代码。

- 核心拥有同聊天 `/approve`、共享审批按钮有效载荷和通用回退交付。
- 当渠道需要特定于审批的行为时，首选在渠道插件上使用一个 `approvalCapability` 对象。
- `ChannelPlugin.approvals` 已被移除。请将审批 delivery/native/render/auth 事实放在 `approvalCapability` 上。
- `plugin.auth` 仅用于登录/登出；核心不再从该对象读取审批 auth hooks。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是规范的审批 auth 接口。
- 使用 `approvalCapability.getActionAvailabilityState` 来处理同聊审批 auth 可用性。
- 如果您的渠道公开了原生执行审批，并且启动界面/原生客户端状态与同聊审批 auth 不同，请使用 `approvalCapability.getExecInitiatingSurfaceState`。核心使用该特定于执行的 hook 来区分 `enabled` 和 `disabled`，决定启动渠道是否支持原生执行审批，并将该渠道包含在原生客户端回退指导中。`createApproverRestrictedNativeApprovalCapability(...)` 会在常见情况下自动填充此项。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 来处理特定于渠道的 payload 生命周期行为，例如隐藏重复的本地审批提示或在发送前输入指示器。
- 仅将 `approvalCapability.delivery` 用于原生审批路由或回退抑制。
- 使用 `approvalCapability.nativeRuntime` 来获取渠道拥有的原生审批事实。在热渠道入口点上通过 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 保持其延迟加载，这可以按需导入您的运行时模块，同时仍允许核心组装审批生命周期。
- 仅当渠道确实需要自定义审批 payload 而不是共享渲染器时，才使用 `approvalCapability.render`。
- 当渠道希望在禁用路径回复中解释启用原生执行审批所需的确切配置旋钮时，请使用 `approvalCapability.describeExecApprovalSetup`。该 hook 接收 `{ channel, channelLabel, accountId }`；命名账户渠道应渲染账户作用域路径（例如 `channels.<channel>.accounts.<id>.execApprovals.*`），而不是顶级默认值。
- 如果渠道可以从现有配置中推断出稳定的类似所有者的私信身份，请使用来自 `openclaw/plugin-sdk/approval-runtime` 的 `createResolvedApproverActionAuthAdapter` 来限制同一聊天中的 `/approve`，而无需添加特定于审批的核心逻辑。
- 如果自定义审批授权有意仅允许同聊回退，请从 `openclaw/plugin-sdk/approval-auth-runtime` 返回 `markImplicitSameChatApprovalAuthorization({ authorized: true })`；否则核心会将结果视为显式审批者授权。
- 如果渠道拥有的原生回调直接解析审批，请在解析之前使用 `isImplicitSameChatApprovalAuthorization(...)`，以便隐式回退仍然经过渠道的正常参与者授权。
- 如果渠道需要原生审批交付，请将渠道代码集中在目标标准化以及传输/呈现事实上。使用 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`，它们来自 `openclaw/plugin-sdk/approval-runtime`。将渠道特定的事实放在 `approvalCapability.nativeRuntime` 之后，最好通过 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，以便核心可以组装处理程序并拥有请求过滤、路由、去重、过期、网关订阅和路由到别处的通知。`nativeRuntime` 被拆分为几个较小的接缝：
- `createChannelNativeOriginTargetResolver` 默认对 `{ to, accountId, threadId }` 目标使用共享的渠道路由匹配器。仅当渠道具有特定于提供商的等效规则（例如 Slack 时间戳前缀匹配）时，才传递 `targetsMatch`。
- 当渠道需要在默认路由匹配器或自定义 `targetsMatch` 回调运行之前规范化提供商 ID，同时保留用于传递的原始目标时，请将 `normalizeTargetForMatch` 传递给 `createChannelNativeOriginTargetResolver`。仅当解析出的传递目标本身需要规范化时，才使用 `normalizeTarget`。
- `availability` - 账户是否已配置以及是否应处理请求
- `presentation` - 将共享审批视图模型映射为待处理/已解决/已过期的原生负载或最终操作
- `transport` - 准备目标以及发送/更新/删除原生审批消息
- `interactions` - 用于原生按钮或表情反应的可选 bind/unbind/clear-action 钩子，以及一个可选的 `cancelDelivered` 钩子。当 `deliverPending` 注册进程内或持久状态（例如反应目标存储）时，请实现 `cancelDelivered`，以便在处理程序停止取消传递且 `bindPending` 运行之前，或者当 `bindPending` 未返回句柄时释放该状态。
- `observe` - 可选的传递诊断钩子
- 如果渠道需要运行时拥有的对象（例如客户端、令牌、Bolt 应用或 Webhook 接收器），请通过 `openclaw/plugin-sdk/channel-runtime-context` 注册它们。通用运行时上下文注册表允许核心从渠道启动状态引导能力驱动的处理程序，而无需添加特定于审批的包装粘合代码。
- 仅当能力驱动的接缝尚不够灵活时，才使用较低级别的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生审批渠道必须通过这些辅助程序来同时处理 `accountId` 和 `approvalKind`。`accountId` 确保多账号审批策略限定于正确的机器人账号，而 `approvalKind` 则使渠道无需在核心代码中硬编码分支即可使用 exec 与插件审批行为。
- 核心现在也负责处理审批重定向通知。渠道插件不应从 `createChannelNativeApprovalRuntime` 发送自己的“审批已转至私信/其他渠道”的后续消息；相反，应通过共享审批能力辅助程序暴露准确的来源和审批人私信路由，并让核心在向发起聊天发回任何通知之前汇总实际发送情况。
- 端到端保留已传递的审批 id 类型。原生客户端不应根据渠道本地状态猜测或重写 exec 与插件审批路由。
- 不同的审批类型可以有目的地暴露不同的原生界面。当前包含的示例：
  - Slack 为 exec 和 plugin id 保留了可用的原生审批路由。
  - Matrix 为 exec 和插件审批保留了相同的原生私信/渠道路由和交互体验，同时仍允许根据审批类型区分认证。
- `createApproverRestrictedNativeApprovalAdapter` 仍作为兼容性包装器存在，但新代码应优先使用能力构建器并在插件上暴露 `approvalCapability`。

对于高频渠道入口点，当您只需要该系列中的某一部分时，请优先使用更窄的运行时子路径：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同样，当您不需要更广泛的通用界面时，请优先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

专门针对设置：

- `openclaw/plugin-sdk/setup-runtime` 涵盖了运行时安全的设置助手：
  `createSetupTranslator`，导入安全的设置修补适配器（`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`），查找备注输出，
  `promptResolvedAllowFrom`，`splitSetupEntries`，以及委托的
  设置代理构建器
- `openclaw/plugin-sdk/setup-runtime` 包含 `createEnvPatchedAccountSetupAdapter` 的环境感知适配器接缝
- `openclaw/plugin-sdk/channel-setup` 涵盖了可选安装的设置
  构建器以及一些设置安全的基元：
  `createOptionalChannelSetupSurface`，`createOptionalChannelSetupAdapter`，

如果您的渠道支持环境驱动的设置或身份验证，并且通用启动/配置流程应在运行时加载之前知道这些环境名称，请在插件清单中使用 `channelEnvVars` 声明它们。保持渠道运行时 `envVars` 或仅用于面向操作员的副本的本地常量。

如果您的渠道可以在插件运行时启动之前出现在 `status`、`channels list`、`channels status` 或 SecretRef 扫描中，请在 `package.json` 中添加 `openclaw.setupEntry`。该入口点在只读命令路径中导入应该是安全的，并且应返回这些摘要所需的渠道元数据、设置安全的配置适配器、状态适配器和渠道密钥目标元数据。不要从设置入口启动客户端、侦听器或传输运行时。

保持主渠道条目导入路径也尽可能狭窄。设备发现可以评估该条目和渠道插件模块以注册功能，而无需激活渠道。诸如 `channel-plugin-api.ts` 之类的文件应导出渠道插件对象，而无需导入设置向导、传输客户端、套接字侦听器、子进程启动器或服务启动模块。将这些运行时部分放入从 `registerFull(...)`、运行时设置器或惰性功能适配器加载的模块中。

`createOptionalChannelSetupWizard`，`DEFAULT_ACCOUNT_ID`，
`createTopLevelChannelDmPolicy`，`setSetupChannelEnabled`，以及
`splitSetupEntries`

- 仅当您还需要更繁重的共享设置/配置助手（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`）时，才使用更广泛的 `openclaw/plugin-sdk/setup` seam

如果您的渠道只想在设置界面中提示“先安装此插件”，请首选 `createOptionalChannelSetupSurface(...)`。生成的适配器/向导在配置写入和完成时是默认拒绝的，并且它们在验证、完成和文档链接复制中重复使用相同的“需要安装”消息。

对于其他热门渠道路径，请优先使用较窄的助手，而非更广泛的旧版界面：

- `openclaw/plugin-sdk/account-core`、
  `openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers` 用于多账户配置
  和默认账户回退
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/channel-inbound` 用于入站路由/信封
  以及记录和调度连线
- `openclaw/plugin-sdk/channel-targets` 用于目标解析助手
- `openclaw/plugin-sdk/outbound-media` 用于媒体加载，
  `openclaw/plugin-sdk/channel-outbound` 用于出站身份/发送委托
  和负载规划
- 当出站路由应保留显式 `replyToId`/`threadId` 或在基础会话密钥仍然匹配后恢复当前 `:thread:` 会话时，请从 `openclaw/plugin-sdk/channel-core` 使用 `buildThreadAwareOutboundSessionRoute(...)`。当其平台具有原生线程传递语义时，提供商插件可以覆盖优先级、后缀行为和线程 ID 标准化。
- `openclaw/plugin-sdk/thread-bindings-runtime` 用于线程绑定生命周期
  和适配器注册
- `openclaw/plugin-sdk/agent-media-payload` 仅在仍然需要旧版代理/媒体
  负载字段布局时使用
- `openclaw/plugin-sdk/telegram-command-config` 用于 Telegram 自定义命令
  标准化、重复/冲突验证以及回退稳定的命令
  配置合约

仅身份验证的渠道通常可以停留在默认路径上：核心处理审批，插件只需暴露出站/身份验证功能。原生审批渠道（如 Matrix、Slack、Telegram）和自定义聊天传输应使用共享的原生辅助工具，而不是自行构建审批生命周期。

## 入站提及策略

将入站提及处理分为两层：

- 插件拥有的证据收集
- 共享策略评估

使用 `openclaw/plugin-sdk/channel-mention-gating` 进行提及策略决策。
仅在需要更广泛的入站辅助工具集合时，才使用 `openclaw/plugin-sdk/channel-inbound`。

适合插件本地逻辑：

- 回复机器人检测
- 引用机器人检测
- 线程参与检查
- 服务/系统消息排除
- 证明机器人参与所需的原生平台缓存

适合共享辅助工具：

- `requireMention`
- 显式提及结果
- 隐式提及允许列表
- 命令绕过
- 最终跳过决策

首选流程：

1. 计算本地提及事实。
2. 将这些事实传递给 `resolveInboundMentionDecision({ facts, policy })`。
3. 在你的入站网关中使用 `decision.effectiveWasMentioned`、`decision.shouldBypassMention` 和 `decision.shouldSkip`。

```typescript
import { implicitMentionKindWhen, matchesMentionWithExplicit, resolveInboundMentionDecision } from "openclaw/plugin-sdk/channel-inbound";

const mentionMatch = matchesMentionWithExplicit(text, {
  mentionRegexes,
  mentionPatterns,
});

const facts = {
  canDetectMention: true,
  wasMentioned: mentionMatch.matched,
  hasAnyMention: mentionMatch.hasExplicitMention,
  implicitMentionKinds: [...implicitMentionKindWhen("reply_to_bot", isReplyToBot), ...implicitMentionKindWhen("quoted_bot", isQuoteOfBot)],
};

const decision = resolveInboundMentionDecision({
  facts,
  policy: {
    isGroup,
    requireMention,
    allowedImplicitMentionKinds: requireExplicitMention ? [] : ["reply_to_bot", "quoted_bot"],
    allowTextCommands,
    hasControlCommand,
    commandAuthorized,
  },
});

if (decision.shouldSkip) return;
```

`api.runtime.channel.mentions` 为捆绑的渠道插件暴露相同的共享提及辅助工具，这些插件已依赖于运行时注入：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果只需要 `implicitMentionKindWhen` 和
`resolveInboundMentionDecision`，请从
`openclaw/plugin-sdk/channel-mention-gating` 导入，以避免加载不相关的入站
运行时辅助工具。

使用 `resolveInboundMentionDecision({ facts, policy })` 进行提及拦截。

## 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package and manifest">
    创建标准的插件文件。`package.json` 中的 `channel` 字段
    是将其定义为渠道插件的关键。有关完整的包元数据结构，
    请参阅 [Plugin Setup and Config](/zh/plugins/sdk-setup#openclaw-channel)：

    <CodeGroup>
    ```json package.json
    {
      "name": "@myorg/openclaw-acme-chat",
      "version": "1.0.0",
      "type": "module",
      "openclaw": {
        "extensions": ["./index.ts"],
        "setupEntry": "./setup-entry.ts",
        "channel": {
          "id": "acme-chat",
          "label": "Acme Chat",
          "blurb": "Connect OpenClaw to Acme Chat."
        }
      }
    }
    ```

    ```json openclaw.plugin.json
    {
      "id": "acme-chat",
      "kind": "channel",
      "channels": ["acme-chat"],
      "name": "Acme Chat",
      "description": "Acme Chat channel plugin",
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {}
      },
      "channelConfigs": {
        "acme-chat": {
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          },
          "uiHints": {
            "token": {
              "label": "Bot token",
              "sensitive": true
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

    `configSchema` 验证 `plugins.entries.acme-chat.config`。请将其用于
    不属于渠道账户配置的插件自有设置。`channelConfigs`
    验证 `channels.acme-chat`，并且是配置架构、设置和 UI 界面在插件运行时加载之前使用的冷路径来源。

  </Step>

  <Step title="构建渠道插件对象">
    `ChannelPlugin` 接口有许多可选的适配器表面。从最小配置开始—— `id` 和 `setup` —— 并根据需要添加适配器。

    创建 `src/channel.ts`：

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/channel-core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatApi } from "./client.js"; // your platform API client

    type ResolvedAccount = {
      accountId: string | null;
      token: string;
      allowFrom: string[];
      dmPolicy: string | undefined;
    };

    function resolveAccount(
      cfg: OpenClawConfig,
      accountId?: string | null,
    ): ResolvedAccount {
      const section = (cfg.channels as Record<string, any>)?.["acme-chat"];
      const token = section?.token;
      if (!token) throw new Error("acme-chat: token is required");
      return {
        accountId: accountId ?? null,
        token,
        allowFrom: section?.allowFrom ?? [],
        dmPolicy: section?.dmSecurity,
      };
    }

    export const acmeChatPlugin = createChatChannelPlugin<ResolvedAccount>({
      base: createChannelPluginBase({
        id: "acme-chat",
        setup: {
          resolveAccount,
          inspectAccount(cfg, accountId) {
            const section =
              (cfg.channels as Record<string, any>)?.["acme-chat"];
            return {
              enabled: Boolean(section?.token),
              configured: Boolean(section?.token),
              tokenStatus: section?.token ? "available" : "missing",
            };
          },
        },
      }),

      // DM security: who can message the bot
      security: {
        dm: {
          channelKey: "acme-chat",
          resolvePolicy: (account) => account.dmPolicy,
          resolveAllowFrom: (account) => account.allowFrom,
          defaultPolicy: "allowlist",
        },
      },

      // Pairing: approval flow for new DM contacts
      pairing: {
        text: {
          idLabel: "Acme Chat username",
          message: "Send this code to verify your identity:",
          notify: async ({ target, code }) => {
            await acmeChatApi.sendDm(target, `Pairing code: ${code}`);
          },
        },
      },

      // Threading: how replies are delivered
      threading: { topLevelReplyToMode: "reply" },

      // Outbound: send messages to the platform
      outbound: {
        attachedResults: {
          sendText: async (params) => {
            const result = await acmeChatApi.sendMessage(
              params.to,
              params.text,
            );
            return { messageId: result.id };
          },
        },
        base: {
          sendMedia: async (params) => {
            await acmeChatApi.sendFile(params.to, params.filePath);
          },
        },
      },
    });
    ```

    对于接受规范顶级私信密钥和旧版嵌套密钥的渠道，请使用 `plugin-sdk/channel-config-helpers` 中的辅助函数： `resolveChannelDmAccess`、`resolveChannelDmPolicy`、`resolveChannelDmAllowFrom` 和 `normalizeChannelDmPolicy` 使账户本地值优先于继承的根值。通过 `normalizeLegacyDmAliases` 将相同的解析器与 doctor 修复配对，以便运行时和迁移读取相同的契约。

    <Accordion title="createChatChannelPlugin 为您做什么">
      您无需手动实现低级适配器接口，而是传递声明式选项，构建器会将它们组合起来：

      | 选项 | 它连接的内容 |
      | --- | --- |
      | `security.dm` | 来自配置字段的作用域私信安全解析器 |
      | `pairing.text` | 基于文本的私信配对流程，附带代码交换 |
      | `threading` | 回复模式解析器（固定、账户作用域或自定义） |
      | `outbound.attachedResults` | 返回结果元数据（消息 ID）的发送函数 |

      如果需要完全控制，您也可以传递原始适配器对象来代替声明式选项。

      原始出站适配器可以定义 `chunker(text, limit, ctx)` 函数。
      可选的 `ctx.formatting` 携带交付时的格式化决策，
      例如 `maxLinesPerMessage`；在发送之前应用它，以便通过共享出站交付一次性解决回复线程和块边界。
      当解析了原生回复目标时，发送上下文还包括 `replyToIdSource`（`implicit` 或 `explicit`），
      因此负载辅助程序可以保留显式回复标签，而无需消耗隐式的一次性回复槽。
    </Accordion>

  </Step>

  <Step title="连接入口点">
    创建 `index.ts`：

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineChannelPluginEntry({
      id: "acme-chat",
      name: "Acme Chat",
      description: "Acme Chat channel plugin",
      plugin: acmeChatPlugin,
      registerCliMetadata(api) {
        api.registerCli(
          ({ program }) => {
            program
              .command("acme-chat")
              .description("Acme Chat management");
          },
          {
            descriptors: [
              {
                name: "acme-chat",
                description: "Acme Chat management",
                hasSubcommands: false,
              },
            ],
          },
        );
      },
      registerFull(api) {
        api.registerGatewayMethod(/* ... */);
      },
    });
    ```

    将渠道拥有的 CLI 描述符放在 `registerCliMetadata(...)` 中，以便 OpenClaw
    可以在根帮助中显示它们，而无需激活完整的渠道运行时，
    而正常的完整加载仍然会提取相同的描述符以进行真正的命令
    注册。将 `registerFull(...)` 仅用于运行时工作。
    如果 `registerFull(...)` 注册网关 RPC 方法，请使用
    特定于插件的前缀。核心管理命名空间（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）保持保留状态，并且始终
    解析为 `operator.admin`。
    `defineChannelPluginEntry` 会自动处理注册模式拆分。请参阅
    [入口点](/zh/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有
    选项。

  </Step>

  <Step title="添加设置入口">
    创建 `setup-entry.ts` 以便在  期间进行轻量级加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当渠道被禁用或未配置时，OpenClaw 会加载此入口而不是完整入口。
    这样可以避免在设置流程中引入繁重的运行时代码。
    有关详细信息，请参阅[设置和配置](/zh/plugins/sdk-setup#setup-entry)。

    将设置安全的导出拆分到 sidecar 模块中的捆绑工作区渠道可以使用
    `defineBundledChannelSetupEntry(...)`（来自
    `openclaw/plugin-sdk/channel-entry-contract`），
    当它们还需要显式的设置时运行时设置器时。

  </Step>

  <Step title="处理入站消息">
    您的插件需要从平台接收消息并将其转发给
    OpenClaw。典型的模式是一个验证请求并通过您的渠道入站处理程序进行分发的 webhook：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK -
          // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```Microsoft TeamsGoogle Chat

    <Note>
      入站消息处理是特定于渠道的。每个渠道插件都拥有自己的入站管道。查看捆绑的渠道插件（例如 Microsoft Teams 或 Google Chat 插件包）以了解实际模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="测试">
在 `src/channel.test.ts` 中编写同置测试：

    ```typescript src/channel.test.ts
    import { describe, it, expect } from "vitest";
    import { acmeChatPlugin } from "./channel.js";

    describe("acme-chat plugin", () => {
      it("resolves account from config", () => {
        const cfg = {
          channels: {
            "acme-chat": { token: "test-token", allowFrom: ["user1"] },
          },
        } as any;
        const account = acmeChatPlugin.setup!.resolveAccount(cfg, undefined);
        expect(account.token).toBe("test-token");
      });

      it("inspects account without materializing secrets", () => {
        const cfg = {
          channels: { "acme-chat": { token: "test-token" } },
        } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(true);
        expect(result.tokenStatus).toBe("available");
      });

      it("reports missing config", () => {
        const cfg = { channels: {} } as any;
        const result = acmeChatPlugin.setup!.inspectAccount!(cfg, undefined);
        expect(result.configured).toBe(false);
      });
    });
    ```

    ```bash
    pnpm test -- <bundled-plugin-root>/acme-chat/
    ```

    有关共享测试辅助工具，请参阅 [Testing](/zh/plugins/sdk-testing)。

</Step>
</Steps>

## 文件结构

```
<bundled-plugin-root>/acme-chat/
├── package.json              # openclaw.channel metadata
├── openclaw.plugin.json      # Manifest with config schema
├── index.ts                  # defineChannelPluginEntry
├── setup-entry.ts            # defineSetupPluginEntry
├── api.ts                    # Public exports (optional)
├── runtime-api.ts            # Internal runtime exports (optional)
└── src/
    ├── channel.ts            # ChannelPlugin via createChatChannelPlugin
    ├── channel.test.ts       # Tests
    ├── client.ts             # Platform API client
    └── runtime.ts            # Runtime store (if needed)
```

## 高级主题

<CardGroup cols={2}>
  <Card title="Threading options" icon="git-branch" href="/zh/plugins/sdk-entrypoints#registration-mode">
    固定、账户范围或自定义回复模式
  </Card>
  <Card title="消息工具集成" icon="puzzle" href="/zh/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和操作发现
  </Card>
  <Card title="目标解析" icon="crosshair" href="/zh/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType、looksLikeId、resolveTarget
  </Card>
  <Card title="Runtime helpers" icon="settings" href="/zh/plugins/sdk-runtime">
    通过 api.runtime 使用 TTS、STT、媒体、子代理
  </Card>
  <Card title="渠道入站 API" icon="bolt" href="/zh/plugins/sdk-channel-inbound">
    共享入站事件生命周期：摄取、解析、记录、分发、完成
  </Card>
</CardGroup>

<Note>一些捆绑的辅助接缝仍然存在，用于捆绑插件的维护和 兼容性。它们不是新渠道插件的推荐模式； 除非您直接维护该捆绑插件系列，否则首选来自通用 SDK 表面的通用 渠道/setup/reply/runtime 子路径。</Note>

## 后续步骤

- [提供商插件](/zh/plugins/sdk-provider-plugins) - 如果您的插件还提供模型
- [SDK 概述](/zh/plugins/sdk-overview) - 完整的子路径导入参考
- [SDK 测试](/zh/plugins/sdk-testing) - 测试工具和契约测试
- [插件清单](/zh/plugins/manifest) - 完整的清单架构

## 相关

- [插件 SDK 设置](/zh/plugins/sdk-setup)
- [构建插件](/zh/plugins/building-plugins)
- [Agent harness 插件](/zh/plugins/sdk-agent-harness)
