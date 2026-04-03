---
title: "建構頻道外掛程式"
sidebarTitle: "頻道外掛程式"
summary: "為 OpenClaw 建構訊息頻道外掛程式的逐步指南"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

# 建構頻道外掛程式

本指南將逐步引導您建構一個將 OpenClaw 連結至訊息平台的頻道外掛程式。完成後，您將擁有一個具備私訊安全性、配對、回覆串接以及傳出訊息功能的運作中頻道。

<Info>如果您之前從未建構過任何 OpenClaw 外掛程式，請先閱讀 [Getting Started](/en/plugins/building-plugins) 以了解基本的套件 結構與 manifest 設定。</Info>

## 頻道外掛程式的運作方式

頻道外掛程式不需要自己的傳送/編輯/反應工具。OpenClaw 在核心中保留一個
共用的 `message` 工具。您的外掛程式擁有：

- **Config** — 帳戶解析與設定精靈
- **Security** — 私訊原則與允許清單
- **Pairing** — 私訊核准流程
- **Session 文法** — 提供者特定的對話 ID 如何對應到基礎聊天、執行緒 ID 和父項備援
- **Outbound** — 將文字、媒體和投票傳送到平台
- **Threading** — 回覆如何建立執行緒

核心擁有共用的訊息工具、提示連線、外層 session-key 形狀、
泛型 `:thread:` 簿記以及分派。

如果您的平台在對話 ID 內儲存額外的範圍，請將該解析邏輯
保留在外掛程式中，使用 `messaging.resolveSessionConversation(...)`。這是將
`rawId` 對應到基礎對話 ID、選用執行緒
ID、明確的 `baseConversationId` 以及任何 `parentConversationCandidates` 的
標準掛鉤。當您傳回 `parentConversationCandidates` 時，請將它們從
最窄的父項到最寬/基礎對話進行排序。

需要在頻道登錄檔啟動前進行相同解析的打包外掛程式，
也可以公開頂層 `session-key-api.ts` 檔案並搭配
`resolveSessionConversation(...)` 匯出。核心僅在執行時外掛程式登錄檔
尚無法使用時，才會使用該引導安全的介面。

當外掛程式只需要在泛型/原始 ID 之上設定父項備援時，
`messaging.resolveParentConversationCandidates(...)` 仍可作為舊版相容性備援方案。
如果兩個掛鉤都存在，核心會優先使用
`resolveSessionConversation(...).parentConversationCandidates`，並僅在標準掛鉤
省略它們時才備援到 `resolveParentConversationCandidates(...)`。

## 審核與頻道功能

大多數頻道外掛程式不需要特定於審核的程式碼。

- 核心擁有同聊天 `/approve`、共用的審核按鈕 payload 以及泛型備援傳遞。
- 僅當審核驗證與一般聊天驗證不同時，才使用
  `auth.authorizeActorAction` 或 `auth.getActionAvailabilityState`。
- 針對頻道特定的載荷生命週期行為，例如隱藏重複的本機核准提示或傳送前傳送正在輸入指示器，請使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload`。
- 僅將 `approvals.delivery` 用於原生核准路由或後援抑制。
- 僅當頻道確實需要自訂核准載荷而非共享渲染器時，才使用 `approvals.render`。
- 如果頻道可以從現有設定中推斷穩定的類似擁有者 DM 身分，請使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createResolvedApproverActionAuthAdapter` 來限制相同聊天 `/approve`，而無需新增特定於核准的核心邏輯。

對於 Slack、Matrix、Microsoft Teams 和類似的聊天頻道，預設路徑通常就足夠了：核心處理核准，而外掛只需公開正常的出站和驗證功能。

## 逐步指南

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="套件與清單">
    建立標準外掛檔案。`package.json` 中的 `channel` 欄位是讓這成為頻道外掛的關鍵：

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

  <Step title="建構通道外掛物件">
    `ChannelPlugin` 介面有許多選用的配接器表面。從最少的選項開始 — `id` 和 `setup` — 並根據您的需求加入配接器。

    建立 `src/channel.ts`：

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

    <Accordion title="createChatChannelPlugin 為您做什麼">
      不需要手動實作低階配接器介面，您傳遞宣告式選項，建構器會將其組合起來：

      | 選項 | 它連接什麼 |
      | --- | --- |
      | `security.dm` | 從設定欄位取得範圍 DM 安全性解析器 |
      | `pairing.text` | 基於文字的 DM 配對流程，包含代碼交換 |
      | `threading` | 回覆模式解析器 (固定、帳戶範圍或自訂) |
      | `outbound.attachedResults` | 傳回結果中繼資料 (訊息 ID) 的傳送函式 |

      如果您需要完全控制，您也可以傳遞原始配接器物件來取代宣告式選項。
    </Accordion>

  </Step>

  <Step title="連結進入點">
    建立 `index.ts`：

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

    將通道擁有的 CLI 描述符放在 `registerCliMetadata(...)` 中，這樣 OpenClaw 就可以啟動完整的通道執行時段，在根據層級的說明中顯示它們，而正常的完整載入仍然會擷取相同的描述符以進行實際的指令註冊。將 `registerFull(...)` 保留給僅限執行時段的工作。`defineChannelPluginEntry` 會自動處理註冊模式分割。請參閱 [Entry Points](/en/plugins/sdk-entrypoints#definechannelpluginentry) 以了解所有選項。

  </Step>

  <Step title="新增設定進入點">
    建立 `setup-entry.ts` 以在入職期間進行輕量級載入：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    當通道停用或未設定時，OpenClaw 會載入此項目而非完整進入點。這可以避免在設定流程中載入繁重的執行時段程式碼。詳情請參閱 [Setup and Config](/en/plugins/sdk-setup#setup-entry)。

  </Step>

  <Step title="處理傳入訊息">
    您的外掛程式需要從平台接收訊息並將其轉發給
    OpenClaw。典型模式是一個驗證請求並透過您頻道的傳入處理程式分發請求的 webhook：

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
      傳入訊息的處理方式取決於特定頻道。每個頻道外掛程式都擁有
      自己的傳入管道。請查看捆綁的頻道外掛程式
      (例如 Microsoft Teams 或 Google Chat 外掛程式套件) 以了解實際模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="測試">
在 `src/channel.test.ts` 中編寫同置測試：

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

    有關共享測試輔助程式，請參閱 [Testing](/en/plugins/sdk-testing)。

  </Step>
</Steps>

## 檔案結構

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

## 進階主題

<CardGroup cols={2}>
  <Card title="執行緒選項" icon="git-branch" href="/en/plugins/sdk-entrypoints#registration-mode">
    固定、帳戶範圍或自訂回覆模式
  </Card>
  <Card title="訊息工具整合" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 與動作發現
  </Card>
  <Card title="目標解析" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="執行時期輔助程式" icon="settings" href="/en/plugins/sdk-runtime">
    透過 api.runtime 使用 TTS、STT、媒體、subagent
  </Card>
</CardGroup>

## 後續步驟

- [提供者外掛程式](/en/plugins/sdk-provider-plugins) — 如果您的外掛程式也提供模型
- [SDK 概覽](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [SDK 測試](/en/plugins/sdk-testing) — 測試工具與合約測試
- [外掛程式清單](/en/plugins/manifest) — 完整的清單架構
