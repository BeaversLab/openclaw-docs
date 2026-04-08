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

<Info>如果您之前尚未建立任何 OpenClaw 外掛程式，請先閱讀 [Getting Started](/en/plugins/building-plugins) 以了解基本套件 結構和清單設定。</Info>

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
- 當頻道需要特定於審核的行為時，請在頻道外掛程式上優先使用一個 `approvalCapability` 物件。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是標準的審核授權接縫。
- 如果您的頻道公開原生執行審核，請實作 `approvalCapability.getActionAvailabilityState`，即使原生傳輸完全位於 `approvalCapability.native` 之下。Core 使用該可用性掛鉤來區分 `enabled` 與 `disabled`，決定起始頻道是否支援原生審核，並將該頻道包含在原生客戶端回退指引中。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 來處理特定於頻道的載荷生命週期行為，例如隱藏重複的本地審核提示或在傳遞之前發送輸入指示器。
- 僅將 `approvalCapability.delivery` 用於原生審核路由或回退抑制。
- 僅當頻道確實需要自訂審核載荷而非共用轉譯器時，才使用 `approvalCapability.render`。
- 當頻道希望在停用路徑回覆中說明啟用原生執行審核所需的确切設定旋鈕時，請使用 `approvalCapability.describeExecApprovalSetup`。該掛鉤接收 `{ channel, channelLabel, accountId }`；具名帳戶頻道應轉譯帳戶範圍的路徑（例如 `channels.<channel>.accounts.<id>.execApprovals.*`），而非頂層預設值。
- 如果頻道可以從現有設定推斷穩定的類似擁有者的 DM 身分，請使用 `createResolvedApproverActionAuthAdapter` 來自 `openclaw/plugin-sdk/approval-runtime` 以限制相同聊天中的 `/approve`，而無需新增特定於審核的核心邏輯。
- 如果頻道需要原生審核傳遞，請將頻道程式碼專注於目標正規化和傳輸掛鉤。使用來自 `openclaw/plugin-sdk/approval-runtime` 的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver`、`createApproverRestrictedNativeApprovalCapability` 和 `createChannelNativeApprovalRuntime`，以便 Core 擁有請求過濾、路由、去重、過期和閘道訂閱。
- 原生審核通道必須透過這些輔助函式路由 `accountId` 和 `approvalKind`。`accountId` 將多帳號審核策略限定在正確的機器人帳號，而 `approvalKind` 則讓執行與外掛程式審核的行為對通道可用，而不需要在核心中硬編碼分支。
- 端對端保留傳遞的審核 ID 類型。原生客戶端不應
  根據通道本機狀態猜測或重寫執行與外掛程式審核的路由。
- 不同的審核類型可以刻意公開不同的原生介面。
  目前內建的範例包括：
  - Slack 讓原生審核路由同時適用於執行 ID 和外掛程式 ID。
  - Matrix 僅對執行審核保留原生 DM/通道路由，並將
    外掛程式審核保留在共用的相同聊天 `/approve` 路徑上。
- `createApproverRestrictedNativeApprovalAdapter` 仍作為相容性包裝函式存在，但新程式碼應優先使用功能建構器並在外掛程式上公開 `approvalCapability`。

對於熱門通道進入點，當您僅需要
該系列的一部分時，請優先使用較狹窄的執行時子路徑：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`

同樣地，當您不需要廣泛的
總括介面時，請優先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-adapter-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

特別是對於設定：

- `openclaw/plugin-sdk/setup-runtime` 涵蓋執行時安全的設定輔助函式：
  可安全匯入的設定修補介面卡 (`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`)、查詢備註輸出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 和委派的
  設定代理建構器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是 `createEnvPatchedAccountSetupAdapter` 的狹義
  環境感知介面卡縫隙
- `openclaw/plugin-sdk/channel-setup` 涵蓋了可選安裝的設定
  建構器以及一些設定安全的原語：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、
  `createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
  `createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
  `splitSetupEntries`
- 僅當您同時需要更重型的共享設定/配置輔助工具（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`）時，才使用更廣泛的 `openclaw/plugin-sdk/setup` 接縫

如果您的通道只想在設定介面中宣傳「先安裝此外掛」，請優先使用 `createOptionalChannelSetupSurface(...)`。產生的
配接器/精靈在配置寫入和完成時會失敗關閉，並且它們在驗證、完成和文件連結
複製中重複使用相同的「需要安裝」訊息。

對於其他熱門通道路徑，請優先使用較狹窄的輔助工具，而不是更廣泛的舊版介面：

- `openclaw/plugin-sdk/account-core`、
  `openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers` 用於多帳戶配置和
  預設帳戶後備
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch` 用於入站路由/信封和
  記錄與分派連線
- `openclaw/plugin-sdk/messaging-targets` 用於目標解析/比對
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime` 用於媒體載入以及出站
  身份/發送委派
- `openclaw/plugin-sdk/thread-bindings-runtime` 用於執行緒繫結生命週期
  和配接器註冊
- `openclaw/plugin-sdk/agent-media-payload` 僅當仍然需要舊版 agent/media
  載荷欄位佈局時
- `openclaw/plugin-sdk/telegram-command-config` 用於 Telegram 自訂指令
  正規化、重複/衝突驗證，以及後備穩定的指令
  配置契約

僅限驗證的通道通常可以在預設路徑停止：核心處理核准，此外掛僅公開出站/驗證功能。原生核准通道（如 Matrix、Slack、Telegram 和自訂聊天傳輸）應使用共享的原生輔助工具，而不是自行構建核准生命週期。

## 逐步演練

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="套件與清單">
    建立標準的外掛程式檔案。`package.json` 中的 `channel` 欄位
    是讓此成為頻道外掛的關鍵。若要了解完整的套件元資料表面，
    請參閱 [外掛程式設定與組態](/en/plugins/sdk-setup#openclawchannel)：

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

  <Step title="建構頻道外掛物件">
    `ChannelPlugin` 介面有許多選用的介接卡表面。請從
    最小需求開始 — `id` 和 `setup` — 並根據您的需求新增介接卡。

    建立 `src/channel.ts`：

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

    <Accordion title="createChatChannelPlugin 為您做什麼">
      您無需手動實作低階介接卡介面，只需傳入
      宣告式選項，建構器就會將它們組合起來：

      | 選項 | 它連接的功能 |
      | --- | --- |
      | `security.dm` | 從組態欄位衍生的範圍 DM 安全性解析器 |
      | `pairing.text` | 基於文字的 DM 配對流程，透過代碼交換 |
      | `threading` | 回覆模式解析器 (固定、帳戶範圍或自訂) |
      | `outbound.attachedResults` | 傳回結果元資料 (訊息 ID) 的傳送函式 |

      如果您需要完全控制，也可以傳入原始介接卡物件來取代宣告式選項。
    </Accordion>

  </Step>

  <Step title="連接進入點">
    建立 `index.ts`：

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

    將通道擁有的 CLI 描述符放在 `registerCliMetadata(...)` 中，以便 OpenClaw
    可以在根幫助中顯示它們，而無需啟動完整的通道運行時，
    而正常的完整載入仍會選取相同的描述符以進行實際指令
    註冊。將 `registerFull(...)` 保留給僅運行時的工作。
    如果 `registerFull(...)` 註冊閘道 RPC 方法，請使用
    外掛特定的前綴。核心管理命名空間（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）保持保留狀態並且始終
    解析為 `operator.admin`。
    `defineChannelPluginEntry` 會自動處理註冊模式分割。請參閱
    [進入點](/en/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有
    選項。

  </Step>

  <Step title="新增設定進入點">
    建立 `setup-entry.ts` 以在引導過程中進行輕量級載入：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    當通道被停用
    或未設定時，OpenClaw 會載入此項而非完整的進入點。這避免了在設定流程中載入繁重的運行時程式碼。
    詳情請參閱 [設定與組態](/en/plugins/sdk-setup#setup-entry)。

  </Step>

  <Step title="處理傳入訊息">
    您的外掛需要從平台接收訊息並將其轉發給
    OpenClaw。典型的模式是一個驗證請求並
    通過通道的傳入處理程式分發請求的 webhook：

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
      傳入訊息處理是特定於通道的。每個通道外掛擁有
      其自己的傳入管線。請查看捆綁的通道外掛
      （例如 Microsoft Teams 或 Google Chat 外掛套件）以了解實際模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="測試">
在 `src/channel.test.ts` 中撰寫同位置測試：

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

    若要了解共享測試輔助程式，請參閱 [測試](/en/plugins/sdk-testing)。

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
    describeMessageTool 與動作探索
  </Card>
  <Card title="目標解析" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType、looksLikeId、resolveTarget
  </Card>
  <Card title="執行時期輔助程式" icon="settings" href="/en/plugins/sdk-runtime">
    透過 api.runtime 使用 TTS、STT、媒體、子代理程式
  </Card>
</CardGroup>

<Note>部分內建的輔助縫隙仍然存在，用於內建外掛程式的維護與相容性。這些並非新通道外掛程式的建議模式；除非您直接維護該內建外掛程式系列，否則建議優先使用來自通用 SDK 表面的通用 channel/setup/reply/runtime 子路徑。</Note>

## 下一步

- [提供者外掛程式](/en/plugins/sdk-provider-plugins) — 如果您的外掛程式也提供模型
- [SDK 概覽](/en/plugins/sdk-overview) — 完整子路徑匯入參考
- [SDK 測試](/en/plugins/sdk-testing) — 測試工具與合約測試
- [外掛程式清單](/en/plugins/manifest) — 完整清單架構
