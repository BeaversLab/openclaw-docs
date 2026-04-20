---
title: "构建渠道插件"
sidebarTitle: "渠道插件"
summary: "为 OpenClaw 构建消息渠道插件的分步指南"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

# 构建渠道插件

本指南介绍了如何构建一个连接 OpenClaw 与消息平台的渠道插件。在结束时，你将拥有一个可用的渠道，具备私信安全性、配对、回复线程和出站消息功能。

<Info>如果您之前尚未构建任何 OpenClaw 插件，请先阅读 [入门指南](/zh/plugins/building-plugins) 以了解基本的包结构 和清单设置。</Info>

## 渠道插件的工作原理

渠道插件不需要自己的发送/编辑/反应工具。OpenClaw 在核心中保留了一个
共享的 `message` 工具。您的插件拥有：

- **配置** — 账户解析和设置向导
- **安全性** — 私信策略和允许列表
- **配对** — 私信审批流程
- **会话语法** — 特定于提供商的对话 ID 如何映射到基础聊天、线程 ID 和父级回退
- **出站** — 向平台发送文本、媒体和投票
- **线程化** — 如何对回复进行线程化

核心拥有共享的消息工具、提示连接、外部会话键形状、
通用的 `:thread:` 记账以及调度。

如果您的渠道添加了携带媒体源的消息工具参数，请通过 `describeMessageTool(...).mediaSourceParams` 公开这些参数名称。核心使用该显式列表进行沙箱路径规范化和出站媒体访问策略，因此插件不需要针对提供商特定的头像、附件或封面图像参数设置共享核心的特殊情况。
首选返回以操作为键的映射，例如 `{ "set-profile": ["avatarUrl", "avatarPath"] }`，这样不相关的操作就不会继承另一个操作的媒体参数。对于在每个公开操作中有意共享的参数，扁平数组仍然有效。

如果您的平台在会话 ID 内存储额外的作用域，请使用 `messaging.resolveSessionConversation(...)` 将解析保留在插件中。这是将 `rawId` 映射到基础会话 ID、可选线程 ID、显式 `baseConversationId` 以及任何 `parentConversationCandidates` 的规范钩子。当您返回 `parentConversationCandidates` 时，请保持从最窄的父级到最宽/基础会话的顺序。

需要在渠道注册表启动之前进行相同解析的捆绑插件也可以公开一个顶级 `session-key-api.ts` 文件，并带有匹配的 `resolveSessionConversation(...)` 导出。核心仅在运行时插件注册表尚未可用时使用该引导安全表面。

当插件仅需要在通用/原始 ID 之上进行父级回退时，`messaging.resolveParentConversationCandidates(...)` 仍可用作旧版兼容性回退。如果两个钩子都存在，核心优先使用 `resolveSessionConversation(...).parentConversationCandidates`，并且仅在规范钩子省略它们时才回退到 `resolveParentConversationCandidates(...)`。

## 审批和渠道能力

大多数渠道插件不需要特定于审批的代码。

- 核心拥有同聊 `/approve`、共享审批按钮有效负载和通用回退传递。
- 当渠道需要特定于审批的行为时，首选在渠道插件上使用一个 `approvalCapability` 对象。
- `ChannelPlugin.approvals` 已被移除。请将审批交付/原生/渲染/认证事实放在 `approvalCapability` 上。
- `plugin.auth` 仅用于登录/登出；核心不再从该对象读取审批认证钩子。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是规范化的审批认证接口。
- 使用 `approvalCapability.getActionAvailabilityState` 来确定同一聊天的审批认证可用性。
- 如果您的渠道暴露了原生执行审批，请在启动界面/原生客户端状态与同一聊天审批认证不同时使用 `approvalCapability.getExecInitiatingSurfaceState`。核心使用该特定于执行的钩子来区分 `enabled` 和 `disabled`，决定启动渠道是否支持原生执行审批，并将该渠道包含在原生客户端回退指导中。`createApproverRestrictedNativeApprovalCapability(...)` 会为常见情况填充此内容。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 来处理特定于渠道的有效负载生命周期行为，例如隐藏重复的本地审批提示或在发送前显示正在输入指示器。
- `approvalCapability.delivery` 仅用于原生审批路由或回退抑制。
- 使用 `approvalCapability.nativeRuntime` 来处理渠道拥有的原生审批事实。在热渠道入口点上保持其惰性加载，方法是配合使用 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，后者可以按需导入您的运行时模块，同时仍允许核心组装审批生命周期。
- 仅当渠道确实需要自定义审批有效负载而不是共享渲染器时，才使用 `approvalCapability.render`。
- 当渠道希望使用禁用路径回复来解释启用原生执行审批所需的确切配置开关时，请使用 `approvalCapability.describeExecApprovalSetup`。该钩子接收 `{ channel, channelLabel, accountId }`；命名账户渠道应渲染账户作用域路径（如 `channels.<channel>.accounts.<id>.execApprovals.*`），而不是顶级默认值。
- 如果渠道可以从现有配置推断出稳定的类所有者私信身份，请使用来自 `openclaw/plugin-sdk/approval-runtime` 的 `createResolvedApproverActionAuthAdapter` 来限制同一聊天 `/approve`，而无需添加特定于审批的核心逻辑。
- 如果渠道需要原生审批交付，请保持渠道代码专注于目标规范化以及传输/呈现事实。使用来自 `openclaw/plugin-sdk/approval-runtime` 的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。将渠道特定的事实放在 `approvalCapability.nativeRuntime` 后面，最好通过 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，以便核心代码可以组装处理程序并负责请求过滤、路由、去重、过期、网关订阅和路由到别处的通知。`nativeRuntime` 被拆分为几个较小的接口：
- `availability` — 帐户是否已配置以及是否应该处理请求
- `presentation` — 将共享审批视图模型映射到待处理/已解决/已过期的原生负载或最终操作
- `transport` — 准备目标以及发送/更新/删除原生审批消息
- `interactions` — 用于原生按钮或反应的可选绑定/解绑/清除操作钩子
- `observe` — 可选的交付诊断钩子
- 如果渠道需要运行时拥有的对象（如客户端、令牌、Bolt 应用或 Webhook 接收器），请通过 `openclaw/plugin-sdk/channel-runtime-context` 注册它们。通用运行时上下文注册表允许核心代码从渠道启动状态引导功能驱动的处理程序，而无需添加特定于审批的包装胶水代码。
- 只有当功能驱动的接口表达能力不足时，才使用较低级别的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生审批渠道必须通过这些辅助程序路由 `accountId` 和 `approvalKind`。`accountId` 将多帐户审批策略限定在正确的机器人帐户范围内，而 `approvalKind` 使执行与插件审批行为对渠道可用，而无需在核心代码中使用硬编码分支。
- Core 现在也负责审批重定向通知。渠道插件不应从 `createChannelNativeApprovalRuntime` 发送自己的“审批已转至私信 / 另一个渠道”的后续消息；相反，应通过共享的审批功能辅助程序暴露准确的源地址 + 审批者私信路由，并让 Core 在向发起聊天发回任何通知之前聚合实际的投递结果。
- 端到端保留已传递的审批 ID 类型。原生客户端不应根据渠道本地的状态猜测或重写 exec 与 plugin 审批路由。
- 不同的审批类型可以有目的地暴露不同的原生界面。
  当前捆绑的示例：
  - Slack 为 exec 和 plugin ID 保留了原生审批路由。
  - Matrix 为 exec 和 plugin 审批保持相同的原生私信/渠道路由和反应 UX，同时仍允许根据审批类型区分身份验证。
- `createApproverRestrictedNativeApprovalAdapter` 作为兼容性包装器仍然存在，但新代码应优先使用 capability 构建器并在插件上暴露 `approvalCapability`。

对于高频渠道入口点，当您只需要该系列的一部分时，请优先使用更窄的运行时子路径：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同样，当您不需要更广泛的通用接口时，请优先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-adapter-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

特别是对于设置：

- `openclaw/plugin-sdk/setup-runtime` 涵盖了运行时安全的设置辅助程序：
  导入安全的设置修补适配器（`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`）、lookup-note 输出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 以及委托的
  设置代理构建器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是 `createEnvPatchedAccountSetupAdapter` 的窄环境感知适配器
  接缝
- `openclaw/plugin-sdk/channel-setup` 涵盖了可选安装的设置构建器以及一些设置安全的原语：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`，

如果您的渠道支持环境变量驱动的设置或身份验证，并且通用的启动/配置流程需要在运行时加载之前知道这些环境变量名称，请使用 `channelEnvVars` 在插件清单中声明它们。请仅将渠道运行时 `envVars` 或本地常量用于面向操作员的文案。
`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
`splitSetupEntries`

- 仅当您还需要更繁重的共享设置/配置辅助程序（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`）时，才使用更广泛的 `openclaw/plugin-sdk/setup` 接口。

如果您的渠道只想在设置界面中提示“先安装此插件”，请首选 `createOptionalChannelSetupSurface(...)`。生成的适配器/向导在配置写入和最终确定时会失败关闭，并且它们在验证、最终确定和文档链接文案中重用相同的需要安装的消息。

对于其他热门渠道路径，请首选较窄的辅助程序，而不是更广泛的旧版接口：

- `openclaw/plugin-sdk/account-core`、
  `openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers` 用于多账户配置
  和默认账户回退
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch` 用于入站路由/信封
  和记录分发连线
- `openclaw/plugin-sdk/messaging-targets` 用于目标解析/匹配
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime` 用于媒体加载以及出站
  身份/发送委托
- `openclaw/plugin-sdk/thread-bindings-runtime` 用于线程绑定生命周期
  和适配器注册
- 仅当仍然需要旧版代理/媒体有效负载字段布局时才使用 `openclaw/plugin-sdk/agent-media-payload`
- `openclaw/plugin-sdk/telegram-command-config` 用于 Telegram 自定义命令
  标准化、重复/冲突验证以及回退稳定的命令
  配置协定

仅认证渠道通常可以使用默认路径：核心处理审批，插件只需暴露出站/认证功能。原生审批渠道（如 Matrix、Slack、Telegram 以及自定义聊天传输）应使用共享的原生辅助函数，而不是自行实现审批生命周期。

## 入站提及策略

将入站提及处理分为两层：

- 插件拥有的证据收集
- 共享策略评估

使用 `openclaw/plugin-sdk/channel-mention-gating` 进行提及策略决策。
仅在您需要更广泛的入站辅助集合时，才使用 `openclaw/plugin-sdk/channel-inbound`。

适合插件本地逻辑：

- 回复机器人检测
- 引用机器人检测
- 线程参与检查
- 服务/系统消息排除
- 证明机器人参与所需的原生平台缓存

适合共享辅助函数：

- `requireMention`
- 显式提及结果
- 隐式提及允许列表
- 命令绕过
- 最终跳过决策

首选流程：

1. 计算本地提及事实。
2. 将这些事实传递到 `resolveInboundMentionDecision({ facts, policy })` 中。
3. 在您的入站关卡中使用 `decision.effectiveWasMentioned`、`decision.shouldBypassMention` 和 `decision.shouldSkip`。

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

`api.runtime.channel.mentions` 为已经依赖运行时注入的捆绑渠道插件公开了相同的共享提及辅助函数：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果您只需要 `implicitMentionKindWhen` 和
`resolveInboundMentionDecision`，请从
`openclaw/plugin-sdk/channel-mention-gating` 导入，以避免加载不相关的入站
运行时辅助函数。

较旧的 `resolveMentionGating*` 辅助函数仅作为兼容性导出保留在
`openclaw/plugin-sdk/channel-inbound` 上。新代码
应使用 `resolveInboundMentionDecision({ facts, policy })`。

## 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package and manifest">
    创建标准插件文件。`package.json` 中的 `channel` 字段
    使其成为渠道插件。有关完整的包元数据表面，
    请参阅 [插件设置和配置](/zh/plugins/sdk-setup#openclaw-channel)：

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
        "properties": {
          "acme-chat": {
            "type": "object",
            "properties": {
              "token": { "type": "string" },
              "allowFrom": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        }
      }
    }
    ```
    </CodeGroup>

  </Step>

  <Step title="构建渠道插件对象">
    `ChannelPlugin` 接口有许多可选的适配器表面。从最少的
    开始 — `id` 和 `setup` — 并根据需要添加适配器。

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

    <Accordion title="createChatChannelPlugin 为您做了什么">
      无需手动实现低级适配器接口，您传递
      声明式选项，构建器会将它们组合起来：

      | 选项 | 它连接的内容 |
      | --- | --- |
      | `security.dm` | 来自配置字段的作用域私信安全解析器 |
      | `pairing.text` | 基于文本的带代码交换的私信配对流程 |
      | `threading` | 回复模式解析器（固定、账户作用域或自定义） |
      | `outbound.attachedResults` | 返回结果元数据（消息 ID）的发送函数 |

      如果您需要完全控制，也可以传递原始适配器对象
      来代替声明式选项。
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
    可以在不激活完整渠道运行时的情况下在根帮助中显示它们，
    而正常的完整加载仍然会获取相同的描述符以进行实际命令
    注册。保留 `registerFull(...)` 用于仅运行时的工作。
    如果 `registerFull(...)` 注册网关 RPC 方法，请使用
    插件特定的前缀。核心管理员命名空间（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）保持保留，并始终
    解析为 `operator.admin`。
    `defineChannelPluginEntry` 自动处理注册模式拆分。请参阅
    [入口点](/zh/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有
    选项。

  </Step>

  <Step title="添加 setup 入口">
    创建 `setup-entry.ts` 以便在新手引导期间进行轻量级加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当渠道被禁用或未配置时，OpenClaw 会加载此入口而不是完整入口。这可以避免在设置流程中引入繁重的运行时代码。有关详细信息，请参阅 [Setup and Config](/zh/plugins/sdk-setup#setup-entry)。

    将设置安全的导出拆分到附属模块的捆绑工作区渠道，如果还需要显式的设置时运行时设置器，可以使用来自 `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="处理入站消息">
    您的插件需要接收来自平台的消息并将其转发给
    OpenClaw。典型的模式是验证请求并通过
    您的渠道的入站处理程序对其进行分发的 webhook：

    ```typescript
    registerFull(api) {
      api.registerHttpRoute({
        path: "/acme-chat/webhook",
        auth: "plugin", // plugin-managed auth (verify signatures yourself)
        handler: async (req, res) => {
          const event = parseWebhookPayload(req);

          // Your inbound handler dispatches the message to OpenClaw.
          // The exact wiring depends on your platform SDK —
          // see a real example in the bundled Microsoft Teams or Google Chat plugin package.
          await handleAcmeChatInbound(api, event);

          res.statusCode = 200;
          res.end("ok");
          return true;
        },
      });
    }
    ```

    <Note>
      入站消息处理是特定于渠道的。每个渠道插件都拥有
      自己的入站管道。查看捆绑的渠道插件
      （例如 Microsoft Teams 或 Google Chat 插件包）以获取真实的模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="测试">
在 `src/channel.test.ts` 中编写并列测试：

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

    有关共享测试助手，请参阅 [Testing](/zh/plugins/sdk-testing)。

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
  <Card title="回复串选项" icon="git-branch" href="/zh/plugins/sdk-entrypoints#registration-mode">
    固定、账户范围或自定义回复模式
  </Card>
  <Card title="消息工具集成" icon="puzzle" href="/zh/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和 action discovery
  </Card>
  <Card title="目标解析" icon="crosshair" href="/zh/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="运行时辅助工具" icon="settings" href="/zh/plugins/sdk-runtime">
    TTS, STT, media, subagent via api.runtime
  </Card>
</CardGroup>

<Note>部分捆绑的辅助接缝仍然存在，用于捆绑插件的维护和兼容性。对于新的渠道插件，这不是推荐的模式；除非您直接维护该捆绑插件系列，否则请首选来自通用 SDK 表面的通用 渠道/setup/reply/runtime 子路径。</Note>

## 后续步骤

- [提供商插件](/zh/plugins/sdk-provider-plugins) — 如果您的插件还提供模型
- [SDK 概览](/zh/plugins/sdk-overview) — 完整的子路径导入参考
- [SDK 测试](/zh/plugins/sdk-testing) — 测试工具和合约测试
- [插件清单](/zh/plugins/manifest) — 完整的清单架构
