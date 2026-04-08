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

<Info>如果您之前尚未构建任何 OpenClaw 插件，请先阅读 [入门指南](/en/plugins/building-plugins) 以了解基本的包 结构和清单设置。</Info>

## 渠道插件的工作原理

渠道插件不需要自己的发送/编辑/反应工具。OpenClaw 在核心中保留一个
共享的 `message` 工具。您的插件拥有：

- **配置** — 账户解析和设置向导
- **安全性** — 私信策略和允许列表
- **配对** — 私信审批流程
- **会话语法** — 特定于提供商的对话 ID 如何映射到基础聊天、线程 ID 和父级回退
- **出站** — 向平台发送文本、媒体和投票
- **线程化** — 如何对回复进行线程化

核心拥有共享消息工具、提示连接、外部会话密钥形状、
通用 `:thread:` 记账和调度。

如果您的平台在对话 ID 中存储了额外的范围，请将该解析
保留在插件中，使用 `messaging.resolveSessionConversation(...)`。这是将
`rawId` 映射到基础对话 ID、可选线程
ID、显式 `baseConversationId` 以及任何 `parentConversationCandidates` 的
规范挂钩。
当您返回 `parentConversationCandidates` 时，请将它们按从
最窄的父级到最宽/基础对话的顺序排列。

在渠道注册表启动之前需要相同解析的打包插件
也可以暴露一个顶级的 `session-key-api.ts` 文件，并带有匹配的
`resolveSessionConversation(...)` 导出。核心仅在
运行时插件注册表尚不可用时才使用该引导安全表面。

当插件只需要通用/原始 ID 之上的父级回退时，
`messaging.resolveParentConversationCandidates(...)` 仍可用作
遗留兼容性回退。如果两个挂钩都存在，核心将
首先使用 `resolveSessionConversation(...).parentConversationCandidates`，并且仅
在规范挂钩
省略它们时回退到 `resolveParentConversationCandidates(...)`。

## 审批和渠道功能

大多数渠道插件不需要特定于审批的代码。

- 核心拥有同聊 `/approve`、共享审批按钮负载和通用回退传递。
- 当渠道需要特定于审批的行为时，最好在渠道插件上使用一个 `approvalCapability` 对象。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是规范的审批认证接口。
- 如果您的渠道暴露了原生执行审批，即使原生传输完全位于 `approvalCapability.native` 之下，也要实现 `approvalCapability.getActionAvailabilityState`。核心使用该可用性钩子来区分 `enabled` 和 `disabled`，决定发起渠道是否支持原生审批，并在原生客户端回退指导中包含该渠道。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 来实现特定于渠道的有效负载生命周期行为，例如隐藏重复的本地审批提示或在发送前输入指示符。
- 仅将 `approvalCapability.delivery` 用于原生审批路由或回退抑制。
- 仅当渠道确实需要自定义审批有效负载而不是共享渲染器时，才使用 `approvalCapability.render`。
- 当渠道希望禁用路径回复来解释启用原生执行审批所需的确切配置开关时，请使用 `approvalCapability.describeExecApprovalSetup`。该钩子接收 `{ channel, channelLabel, accountId }`；命名帐户渠道应呈现帐户范围的路径（例如 `channels.<channel>.accounts.<id>.execApprovals.*`），而不是顶级默认值。
- 如果渠道可以从现有配置推断出稳定的类似所有者的私信身份，请使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createResolvedApproverActionAuthAdapter` 来限制同会话 `/approve`，而无需添加特定于审批的核心逻辑。
- 如果渠道需要原生审批传递，请保持渠道代码专注于目标规范化和传输钩子。使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver`、`createApproverRestrictedNativeApprovalCapability` 和 `createChannelNativeApprovalRuntime`，以便核心拥有请求过滤、路由、去重、过期和网关订阅。
- 原生审批渠道必须通过这些辅助程序路由 `accountId` 和 `approvalKind`。`accountId` 将多账户审批策略限定在正确的机器人账户，而 `approvalKind` 使执行与插件审批行为对渠道可用，而无需在核心中进行硬编码分支。
- 端到端保留传递的审批 id 类型。原生客户端不应从渠道本地状态猜测或重写执行与插件的审批路由。
- 不同的审批类型可以有目的地暴露不同的原生表面。当前捆绑的示例：
  - Slack 为执行和插件 id 保留了原生审批路由。
  - Matrix 仅保留执行审批的原生私信/渠道路由，并将插件审批保留在共享的同一聊天 `/approve` 路径上。
- `createApproverRestrictedNativeApprovalAdapter` 仍然作为兼容性包装器存在，但新代码应该首选功能构建器并在插件上暴露 `approvalCapability`。

对于热渠道入口，当您只需要该系列的一部分时，首选更窄的运行时子路径：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`

同样，当您不需要更广泛的通用表面时，首选 `openclaw/plugin-sdk/setup-runtime`、`openclaw/plugin-sdk/setup-adapter-runtime`、`openclaw/plugin-sdk/reply-runtime`、`openclaw/plugin-sdk/reply-dispatch-runtime`、`openclaw/plugin-sdk/reply-reference` 和 `openclaw/plugin-sdk/reply-chunking`。

具体对于设置：

- `openclaw/plugin-sdk/setup-runtime` 涵盖了运行时安全的设置辅助程序：导入安全的设置修补适配器 (`createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`)、查找说明输出、`promptResolvedAllowFrom`、`splitSetupEntries` 以及委托的设置代理构建器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是 `createEnvPatchedAccountSetupAdapter` 的窄环境感知适配器接缝
- `openclaw/plugin-sdk/channel-setup` 涵盖了可选安装的设置构建器以及一些设置安全的原语：`createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和 `splitSetupEntries`
- 仅当您还需要更繁重的共享设置/配置助手（例如 `moveSingleAccountChannelSectionToDefaultAccount(...)`）时，才使用更广泛的 `openclaw/plugin-sdk/setup` 接口。

如果您的渠道只想在设置界面中宣传“先安装此插件”，请首选 `createOptionalChannelSetupSurface(...)`。生成的适配器/向导在配置写入和最终确认时默认失败（fail closed），并且在验证、最终确认和文档链接复制中重复使用相同的“需安装”消息。

对于其他热路径渠道，首选窄辅助函数而不是更广泛的遗留接口：

- `openclaw/plugin-sdk/account-core`、`openclaw/plugin-sdk/account-id`、`openclaw/plugin-sdk/account-resolution` 和 `openclaw/plugin-sdk/account-helpers` 用于多账户配置和默认账户回退
- `openclaw/plugin-sdk/inbound-envelope` 和 `openclaw/plugin-sdk/inbound-reply-dispatch` 用于入站路由/信封以及记录和分发连接
- `openclaw/plugin-sdk/messaging-targets` 用于目标解析/匹配
- `openclaw/plugin-sdk/outbound-media` 和 `openclaw/plugin-sdk/outbound-runtime` 用于媒体加载以及出站身份/发送委托
- `openclaw/plugin-sdk/thread-bindings-runtime` 用于线程绑定生命周期和适配器注册
- 仅当仍然需要遗留的 agent/media 负载字段布局时，才使用 `openclaw/plugin-sdk/agent-media-payload`
- `openclaw/plugin-sdk/telegram-command-config` 用于 Telegram 自定义命令标准化、重复/冲突验证以及回退稳定的命令配置契约

仅包含身份验证的渠道通常可以在默认路径停止：核心处理审批，插件只需暴露出站/身份验证功能。原生审批渠道（如 Matrix、Slack、Telegram 和自定义聊天传输）应使用共享的原生助手，而不是自己实现审批生命周期。

## 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package and manifest">
    创建标准的插件文件。`package.json` 中的 `channel` 字段
    使其成为一个渠道插件。有关完整的包元数据表面，
    请参阅 [Plugin Setup and Config](/en/plugins/sdk-setup#openclawchannel)。

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

  <Step title="Build the 渠道 plugin object">
    `ChannelPlugin` 接口有许多可选的适配器表面。从
    最基础的开始 —— `id` 和 `setup` —— 并根据需要添加适配器。

    创建 `src/channel.ts`。

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

    <Accordion title="What createChatChannelPlugin does for you">
      您无需手动实现底层适配器接口，只需传递
      声明式选项，构建器会将它们组合起来。

      | Option | What it wires |
      | --- | --- |
      | `security.dm` | Scoped 私信 security resolver from config fields |
      | `pairing.text` | Text-based 私信 pairing flow with code exchange |
      | `threading` | Reply-to-mode resolver (fixed, account-scoped, or custom) |
      | `outbound.attachedResults` | Send functions that return result metadata (message IDs) |

      如果您需要完全控制，也可以传递原始适配器对象来代替声明式选项。
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
    可以在不激活完整渠道运行时的情况下在根帮助中显示它们，而正常的完整加载仍然会获取相同的描述符以进行实际的命令
    注册。将 `registerFull(...)` 用于仅运行时的工作。
    如果 `registerFull(...)` 注册网关 RPC 方法，请使用
    插件特定的前缀。核心管理命名空间（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）保持保留状态，并且始终
    解析为 `operator.admin`。
    `defineChannelPluginEntry` 会自动处理注册模式的拆分。请参阅
    [入口点](/en/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有
    选项。

  </Step>

  <Step title="添加设置入口">
    创建 `setup-entry.ts` 以便在 OpenClaw 期间进行轻量级加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当渠道被禁用或未配置时，OpenClaw 会加载此入口而不是完整入口。这避免了在设置流程中引入繁重的运行时代码。有关详细信息，请参阅 [设置和配置](/en/plugins/sdk-setup#setup-entry)。

  </Step>

  <Step title="处理传入消息">
    您的插件需要从平台接收消息并将其转发给
    OpenClaw。典型的模式是验证请求并通过渠道的传入处理程序分发它的 webhook：

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
      传入消息处理是特定于渠道的。每个渠道插件都拥有
      自己的传入管道。查看打包的渠道插件
      （例如 Microsoft Teams 或 Google Chat 插件包）以获取实际模式。
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

    有关共享测试助手，请参阅 [测试](/en/plugins/sdk-testing)。

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
  <Card title="线程选项" icon="git-branch" href="/en/plugins/sdk-entrypoints#registration-mode">
    固定、账户范围或自定义回复模式
  </Card>
  <Card title="消息工具集成" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和操作发现
  </Card>
  <Card title="目标解析" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType、looksLikeId、resolveTarget
  </Card>
  <Card title="运行时辅助工具" icon="settings" href="/en/plugins/sdk-runtime">
    通过 api.runtime 实现的 TTS、STT、媒体和子代理
  </Card>
</CardGroup>

<Note>为了维护捆绑插件及其兼容性，仍然存在一些捆绑的辅助接口。对于新的渠道插件，这并不是推荐的模式；除非您直接维护该捆绑插件系列，否则首选通用 SDK 表面中的 渠道/setup/reply/runtime 子路径。</Note>

## 后续步骤

- [提供商插件](/en/plugins/sdk-provider-plugins) — 如果您的插件也提供模型
- [SDK 概述](/en/plugins/sdk-overview) — 完整的子路径导入参考
- [SDK 测试](/en/plugins/sdk-testing) — 测试工具和合约测试
- [插件清单](/en/plugins/manifest) — 完整的清单架构
