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

<Info>如果您之前尚未建置任何 OpenClaw 外掛程式，請先閱讀 [入門指南](/en/plugins/building-plugins) 以了解基本的套件 結構與 manifest 設定。</Info>

## 頻道外掛程式的運作方式

頻道外掛程式不需要自己的傳送/編輯/反應工具。OpenClaw 在核心中保留一個
共用的 `message` 工具。您的外掛程式擁有：

- **Config** — 帳戶解析與設定精靈
- **Security** — 私訊原則與允許清單
- **Pairing** — 私訊核准流程
- **Session 文法** — 提供者特定的對話 ID 如何對應到基礎聊天、執行緒 ID 和父項備援
- **Outbound** — 將文字、媒體和投票傳送到平台
- **Threading** — 回覆如何建立執行緒

核心擁有共用的訊息工具、提示連接、外層會話金鑰形狀、
通用 `:thread:` 簿記與分派。

如果您的平台在對話 ID 內儲存額外範圍，請使用 `messaging.resolveSessionConversation(...)` 將該解析保留在外掛程式中。這是將 `rawId` 對應到基底對話 ID、選用執行緒
ID、明確 `baseConversationId` 和任何 `parentConversationCandidates` 的
標準掛勾。
當您傳回 `parentConversationCandidates` 時，請將它們從
最窄的父層到最廣/基底對話進行排序。

需要相同解析的套件外掛程式，在頻道註冊表啟動前，
也可以公開頂層 `session-key-api.ts` 檔案與相符的
`resolveSessionConversation(...)` 匯出。核心僅在執行時外掛程式註冊表尚未
可用時，才使用�個啟動安全的介面。

`messaging.resolveParentConversationCandidates(...)` 仍可作為舊版相容性後援，
當外掛程式只需要在通用/原始 ID 之上加入父層後援時。如果兩個掛勾都存在，核心會先使用
`resolveSessionConversation(...).parentConversationCandidates`，且僅在標準掛勾
省略它們時才後援到 `resolveParentConversationCandidates(...)`。

## 審核與頻道功能

大多數頻道外掛程式不需要特定於審核的程式碼。

- 核心擁有同聊天 `/approve`、共用的核准按鈕酬載，以及通用後援傳送。
- 當頻道需要核准特定行為時，請在頻道外掛程式上使用一個 `approvalCapability` 物件。
- `ChannelPlugin.approvals` 已移除。將核准傳送/原生/轉譯/驗證事實放在 `approvalCapability` 上。
- `plugin.auth` 僅用於登入/登出；核心不再從該物件讀取核准授權掛鉤 (auth hooks)。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是標準的核准授權縫合點。
- 使用 `approvalCapability.getActionAvailabilityState` 來處理相同聊天 (same-chat) 的核准授權可用性。
- 如果您的頻道公開了原生執行核准，且當它與相同聊天核准授權不同時，請使用 `approvalCapability.getExecInitiatingSurfaceState` 來代表起始介面/原生用戶端狀態。核心會使用該特定於執行的掛鉤來區分 `enabled` 和 `disabled`，決定起始頻道是否支援原生執行核准，並將該頻道包含在原生用戶端後備指引中。`createApproverRestrictedNativeApprovalCapability(...)` 會為常見情況填入此項。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 來處理特定頻道的 Payload 生命週期行為，例如隱藏重複的本地核准提示或在傳遞前發送輸入指示器。
- 僅將 `approvalCapability.delivery` 用於原生核准路由或抑制後備機制。
- 將 `approvalCapability.nativeRuntime` 用於頻道擁有的原生核准事實。在熱門頻道進入點上使用 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 保持其延遲載入 (lazy)，它可以在需要時匯入您的執行時期模組，同時仍讓核心組裝核准生命週期。
- 僅當頻道確實需要自訂核准 Payload 而非共用轉譯器時，才使用 `approvalCapability.render`。
- 當頻道希望禁用路徑回覆來解釋啟用原生執行核准所需的确切配置選項時，請使用 `approvalCapability.describeExecApprovalSetup`。該掛鉤接收 `{ channel, channelLabel, accountId }`；命名帳戶頻道應該呈現帳戶範圍的路徑 (例如 `channels.<channel>.accounts.<id>.execApprovals.*`)，而不是頂層預設值。
- 如果頻道可以從現有配置推斷出穩定的類似擁有者 DM 身份，請使用來自 `openclaw/plugin-sdk/approval-runtime` 的 `createResolvedApproverActionAuthAdapter` 來限制相同聊天的 `/approve`，而無需新增特定於核准的核心邏輯。
- 如果通道需要原生審批傳遞，請保持通道程式碼專注於目標正規化加上傳輸/呈現事實。使用來自 `openclaw/plugin-sdk/approval-runtime` 的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。將通道特定的事實放在 `approvalCapability.nativeRuntime` 後面，最好透過 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，以便核心可以組裝處理程序並擁有請求過濾、路由、去重、過期、網關訂閱和路由至別處通知。`nativeRuntime` 分為幾個較小的縫隙：
- `availability` — 帳戶是否已配置以及是否應處理請求
- `presentation` — 將共享的審批視圖模型映射到待處理/已解決/已過期的原生載荷或最終操作
- `transport` — 準備目標加上發送/更新/刪除原生審批訊息
- `interactions` — 可選的原生按鈕或反應綁定/解除綁定/清除操作掛鉤
- `observe` — 可選的傳遞診斷掛鉤
- 如果通道需要運行時擁有的物件，例如客戶端、權杖、Bolt 應用程式或 webhook 接收器，請透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊它們。通用運行時上下文註冊表允許核心從通道啟動狀態引導功能驅動的處理程序，而無需添加特定於審批的包裝膠水程式碼。
- 只有當功能驅動的縫隙還不夠表達時，才使用較低層級的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生審批通道必須透過這些輔助程式路由 `accountId` 和 `approvalKind`。`accountId` 將多帳戶審批策略範圍限制在正確的機器人帳戶，而 `approvalKind` 使執行與外掛程式審控行為可用於通道，而核心中沒有硬編碼分支。
- Core 現在也擁有批准重新導向的通知。頻道外掛不應從 `createChannelNativeApprovalRuntime` 發送自己的「批准已發送至 DM / 另一個頻道」後續訊息；相反，應透過共用的批准功能輔助器公開準確的來源 + 批准者 DM 路由，並讓 Core 在將任何通知發回發起的聊天之前匯總實際的遞送情況。
- 端到端保留已遞送的批准 ID 種類。原生客戶端不應
  從頻道本機狀態中猜測或重寫 exec 與 plugin 批准路由。
- 不同的批准種類可以有意地公開不同的原生介面。
  目前內建的範例：
  - Slack 針對 exec 和 plugin ID 保留了原生批准路由。
  - Matrix 針對 exec
    和 plugin 批准保持了相同的原生 DM/頻道路由和反應 UX，同時仍允許驗證依批准種類而異。
- `createApproverRestrictedNativeApprovalAdapter` 作為相容性包裝器仍然存在，但新程式碼應偏好使用功能建構器並在插件上公開 `approvalCapability`。

對於熱門頻道進入點，當您只需要該系列的一部分時，請優先使用較窄的執行時期子路徑：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同樣地，當您不需要更廣泛的整體介面時，請優先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-adapter-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

特別針對設定：

- `openclaw/plugin-sdk/setup-runtime` 涵蓋了執行時期安全的設定輔助器：
  匯入安全的設定修補介面卡 (`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`)、查找備註輸出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 以及委派的
  設定代理建構器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是 `createEnvPatchedAccountSetupAdapter` 的狹窄環境感知介面卡
  縫隙
- `openclaw/plugin-sdk/channel-setup` 涵蓋了可選安裝的設定
  建構器以及一些設定安全的原語：
  `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`,

如果您的頻道支援環境變數驅動的設定或驗證，且通用的啟動/設定
流程應在執行時期載入前知道這些環境變數名稱，請在
外掛清單中使用 `channelEnvVars` 宣告它們。請僅將頻道執行時期 `envVars` 或本地
常數用於操作員面向的複製內容。
`createOptionalChannelSetupWizard`, `DEFAULT_ACCOUNT_ID`,
`createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, 以及
`splitSetupEntries`

- 僅當您同時需要
  更重量級的共享設定/設定輔助程式（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`）時，才使用更廣泛的 `openclaw/plugin-sdk/setup` 接口

如果您的頻道只想在設定
介面中宣傳「請先安裝此外掛」，請優先使用 `createOptionalChannelSetupSurface(...)`。產生的
配接器/精靈在設定寫入和完成時會以封閉方式失敗，並且它們會在驗證、完成和文件連結
複製內容中重複使用相同的需要安裝訊息。

對於其他熱門頻道路徑，請優先使用較狹窄的輔助程式，而非更廣泛的舊版
介面：

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution`, 和
  `openclaw/plugin-sdk/account-helpers` 用於多帳號設定
  和預設帳號後援
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch` 用於傳入路由/信封
  和記錄與分派接線
- `openclaw/plugin-sdk/messaging-targets` 用於目標解析/比對
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime` 用於媒體載入以及傳出
  身分/發送委派
- `openclaw/plugin-sdk/thread-bindings-runtime` 用於執行緒繫結生命週期
  和配接器註冊
- 僅當仍需要舊版代理程式/媒體
  負載欄位佈局時，才使用 `openclaw/plugin-sdk/agent-media-payload`
- `openclaw/plugin-sdk/telegram-command-config` 用於 Telegram 自訂指令
  正規化、重複/衝突驗證，以及後援穩定的指令
  設定合約

Auth-only channels can usually stop at the default path: core handles approvals and the plugin just exposes outbound/auth capabilities. Native approval channels such as Matrix, Slack, Telegram, and custom chat transports should use the shared native helpers instead of rolling their own approval lifecycle.

## Inbound mention policy

Keep inbound mention handling split in two layers:

- plugin-owned evidence gathering
- shared policy evaluation

Use `openclaw/plugin-sdk/channel-inbound` for the shared layer.

Good fit for plugin-local logic:

- reply-to-bot detection
- quoted-bot detection
- thread-participation checks
- service/system-message exclusions
- platform-native caches needed to prove bot participation

Good fit for the shared helper:

- `requireMention`
- explicit mention result
- implicit mention allowlist
- command bypass
- final skip decision

Preferred flow:

1. Compute local mention facts.
2. Pass those facts into `resolveInboundMentionDecision({ facts, policy })`.
3. Use `decision.effectiveWasMentioned`, `decision.shouldBypassMention`, and `decision.shouldSkip` in your inbound gate.

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

`api.runtime.channel.mentions` exposes the same shared mention helpers for
bundled channel plugins that already depend on runtime injection:

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

The older `resolveMentionGating*` helpers remain on
`openclaw/plugin-sdk/channel-inbound` as compatibility exports only. New code
should use `resolveInboundMentionDecision({ facts, policy })`.

## Walkthrough

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="套件與清單">
    建立標準的外掛程式檔案。`package.json` 中的 `channel` 欄位
    讓這成為一個頻道外掛。如需完整的套件中介資料表面，
    請參閱 [外掛程式設定與配置](/en/plugins/sdk-setup#openclaw-channel)：

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

  <Step title="建立通道外掛物件">
    `ChannelPlugin` 介面有許多選用的介面卡層面。從最簡單的
    開始 — `id` 和 `setup` — 並根據您的需求加入介面卡。

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

    <Accordion title="createChatChannelPlugin 為您做些什麼">
      您無需手動實作低階介面卡介面，只需傳遞宣告式選項，建構器就會將其組合起來：

      | 選項 | 連接的內容 |
      | --- | --- |
      | `security.dm` | 來自設定欄位的範圍 DM 安全性解析器 |
      | `pairing.text` | 基於文字並使用代碼交換的 DM 配對流程 |
      | `threading` | 回覆模式解析器 (固定、帳戶範圍或自訂) |
      | `outbound.attachedResults` | 傳回結果中繼資料 (訊息 ID) 的傳送函式 |

      如果您需要完全控制，也可以傳遞原始介面卡物件來取代宣告式選項。
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
    能夠在根目錄說明中顯示它們，而無需啟動完整的通道執行時；
    同時，一般的完整載入仍會擷取相同的描述符以進行真正的指令
    註冊。請將 `registerFull(...)` 保留給僅限執行時的工作。
    如果 `registerFull(...)` 註冊了閘道 RPC 方法，請使用
    外掛專用的前綴。核心管理命名空間 (`config.*`,
    `exec.approvals.*`、`wizard.*`、`update.*`) 則保留使用，並且總是
    解析為 `operator.admin`。
    `defineChannelPluginEntry` 會自動處理註冊模式的分割。請參閱
    [進入點](/en/plugins/sdk-entrypoints#definechannelpluginentry) 以了解所有
    選項。

  </Step>

  <Step title="Add a setup entry">
    建立 `setup-entry.ts` 以便在入職期間進行輕量級載入：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    當頻道被停用或未設定時，OpenClaw 會載入此項目而非完整的進入點。這可以避免在設定流程中載入沉重的執行時代碼。詳情請參閱[設定與組態](/en/plugins/sdk-setup#setup-entry)。

  </Step>

  <Step title="Handle inbound messages">
    您的外掛程式需要接收來自平台的訊息並將其轉發至
    OpenClaw。典型的模式是一個驗證請求並透過
    您頻道的入站處理程序派發請求的 webhook：

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
      入站訊息處理因頻道而異。每個頻道外掛程式都擁有
      自己的入站管道。請查看隨附的頻道外掛程式
      （例如 Microsoft Teams 或 Google Chat 外掛程式套件）以取得實際模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Test">
在 `src/channel.test.ts` 中撰寫同置測試：

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

    若要取得共用的測試輔助程式，請參閱[測試](/en/plugins/sdk-testing)。

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
  <Card title="Threading options" icon="git-branch" href="/en/plugins/sdk-entrypoints#registration-mode">
    固定、帳號範圍或自訂回覆模式
  </Card>
  <Card title="Message tool integration" icon="puzzle" href="/en/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 與動作探索
  </Card>
  <Card title="Target resolution" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType、looksLikeId、resolveTarget
  </Card>
  <Card title="Runtime helpers" icon="settings" href="/en/plugins/sdk-runtime">
    透過 api.runtime 進行 TTS、STT、媒體與 subagent
  </Card>
</CardGroup>

<Note>部分捆綁的 helper seams 仍然存在，以維護捆綁外掛程式及其相容性。 這並非新型通道外掛程式的推薦模式；除非您直接維護該捆綁外掛程式系列， 否則請優先採用來自通用 SDK 介面的通用 channel/setup/reply/runtime 子路徑。</Note>

## Next steps

- [Provider Plugins](/en/plugins/sdk-provider-plugins) — 如果您的插件也提供模型
- [SDK Overview](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [SDK Testing](/en/plugins/sdk-testing) — 測試工具與合約測試
- [Plugin Manifest](/en/plugins/manifest) — 完整的 manifest 結構描述
