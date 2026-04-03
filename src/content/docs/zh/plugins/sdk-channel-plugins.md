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

<Info>如果您之前从未构建过任何 OpenClaw 插件，请先阅读 [入门指南](/en/plugins/building-plugins) 以了解基本的包 结构和清单设置。</Info>

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
- 仅当审批身份验证与正常聊天身份验证不同时，才使用
  `auth.authorizeActorAction` 或 `auth.getActionAvailabilityState`。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 处理特定于渠道的负载生命周期行为，例如隐藏重复的本地审批提示或在发送之前发送输入指示器。
- 仅将 `approvals.delivery` 用于原生审批路由或回退抑制。
- 仅当渠道确实需要自定义审批负载而非共享渲染器时，才使用 `approvals.render`。
- 如果渠道可以从现有配置推断出稳定的类似所有者的私信身份，请从 `openclaw/plugin-sdk/approval-runtime` 使用 `createResolvedApproverActionAuthAdapter` 来限制同一会话中的 `/approve`，而无需添加特定于审批的核心逻辑。

对于 Slack、Matrix、Microsoft Teams 和类似的聊天渠道，默认路径通常就足够了：核心处理审批，插件只需公开正常的出站和身份验证功能。

## 演练

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="包和清单">
    创建标准插件文件。`package.json` 中的 `channel` 字段
    是使其成为渠道插件的关键：

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
    `ChannelPlugin` 接口有许多可选的适配器接口。从最少的开始——`id` 和 `setup`——然后根据需要添加适配器。

    创建 `src/channel.ts`：

    ```typescript src/channel.ts
    import {
      createChatChannelPlugin,
      createChannelPluginBase,
    } from "openclaw/plugin-sdk/core";
    import type { OpenClawConfig } from "openclaw/plugin-sdk/core";
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
      您无需手动实现低级适配器接口，只需传递声明式选项，构建器会将它们组合起来：

      | 选项 | 它连接的内容 |
      | --- | --- |
      | `security.dm` | 来自配置字段的范围限定私信安全解析器 |
      | `pairing.text` | 基于文本的带代码交换的私信配对流程 |
      | `threading` | 回复模式解析器（固定、账户范围或自定义）|
      | `outbound.attachedResults` | 返回结果元数据（消息 ID）的发送函数 |

      如果您需要完全控制，也可以传递原始适配器对象而不是声明式选项。
    </Accordion>

  </Step>

  <Step title="连接入口点">
    创建 `index.ts`：

    ```typescript index.ts
    import { defineChannelPluginEntry } from "openclaw/plugin-sdk/core";
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

    将渠道拥有的 CLI 描述符放在 `registerCliMetadata(...)` 中，以便 OpenClaw 可以在不激活完整渠道运行时的情况下在根帮助中显示它们，而正常的完整加载仍然会获取相同的描述符以进行实际的命令注册。保留 `registerFull(...)` 用于仅运行时的工作。`defineChannelPluginEntry` 会自动处理注册模式的拆分。有关所有选项，请参阅[入口点](/en/plugins/sdk-entrypoints#definechannelpluginentry)。

  </Step>

  <Step title="添加设置入口">
    创建 `setup-entry.ts` 以便在新手引导期间进行轻量级加载：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    当渠道被禁用或未配置时，OpenClaw 会加载此入口而不是完整入口。这避免了在设置流程中引入繁重的运行时代码。有关详细信息，请参阅[设置和配置](/en/plugins/sdk-setup#setup-entry)。

  </Step>

  <Step title="Handle inbound messages">
    您的插件需要从平台接收消息并将其转发给
    OpenClaw。典型模式是一个验证请求并通过您的渠道的入站处理程序进行分发的 webhook：

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
      入站消息处理是特定于渠道的。每个渠道插件拥有
      其自己的入站管道。查看捆绑的渠道插件
      （例如 Microsoft Teams 或 Google Chat 插件包）以获取实际模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Test">
在 `src/channel.test.ts` 中编写同地测试：

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

    有关共享测试帮助程序，请参阅 [Testing](/en/plugins/sdk-testing)。

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
  <Card title="Threading options" icon="git-branch" href="/en/plugins/sdk-entrypoints#registration-mode">
    固定、帐户范围或自定义回复模式
  </Card>
  <Card title="Message 工具 integration" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和操作发现
  </Card>
  <Card title="Target resolution" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Runtime helpers" icon="settings" href="/en/plugins/sdk-runtime">
    TTS、STT、媒体、通过 api.runtime 进行的子代理
  </Card>
</CardGroup>

## 后续步骤

- [Provider Plugins](/en/plugins/sdk-provider-plugins) — 如果您的插件还提供模型
- [SDK Overview](/en/plugins/sdk-overview) — 完整的子路径导入参考
- [SDK Testing](/en/plugins/sdk-testing) — 测试工具和合约测试
- [Plugin Manifest](/en/plugins/manifest) — 完整的清单架构
