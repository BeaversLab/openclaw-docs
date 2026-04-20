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

<Info>如果您之前尚未建構任何 OpenClaw 外掛程式，請先閱讀 [入門指南](/en/plugins/building-plugins) 以了解基本的套件 結構和 manifest 設定。</Info>

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

如果您的頻道新增了包含媒體來源的 message-tool 參數，請透過
`describeMessageTool(...).mediaSourceParams` 公開這些參數名稱。Core 使用
該明確清單進行沙箱路徑正規化和傳出媒體存取
原則，因此外掛程式不需要針對供應商特定的
頭像、附件或封面圖片參數進行 shared-core 特殊處理。
建議傳回以動作為鍵值的對應，例如
`{ "set-profile": ["avatarUrl", "avatarPath"] }`，以便不相關的動作不會
繼承另一個動作的媒體參數。對於有意在每個公開動作之間共用的參數，扁平陣列仍然有效。

如果您的平台在對話 ID 內儲存額外範圍，請將該解析邏輯
保留在具有 `messaging.resolveSessionConversation(...)` 的外掛程式中。這是將
`rawId` 對應到基本對話 ID、選用執行緒
ID、明確的 `baseConversationId` 以及任何
`parentConversationCandidates` 的標準掛鉤。
當您傳回 `parentConversationCandidates` 時，請將它們從
最窄的父層排序到最廣泛/基本的對話。

需要在頻道註冊表啟動前進行相同解析的捆綁外掛程式，也可以公開頂層
`session-key-api.ts` 檔案並包含相符的
`resolveSessionConversation(...)` 匯出。Core 僅在執行時期外掛程式註冊表尚無法使用時，才會使用�個啟動安全的介面。

當外掛程式只需要在通用/原始 ID 上新增父層備援時，
`messaging.resolveParentConversationCandidates(...)` 仍可作為舊版相容性備援方案使用。如果兩個掛鉤都存在，Core 會優先使用
`resolveSessionConversation(...).parentConversationCandidates`，並且僅在標準掛鉤
省略它們時才備援至 `resolveParentConversationCandidates(...)`。

## 審核與頻道功能

大多數頻道外掛程式不需要審核特定的程式碼。

- Core 擁有相同聊天 `/approve`、共用的審核按鈕負載，以及通用備援傳遞機制。
- 當頻道需要審核特定的行為時，建議在頻道外掛程式中使用一個
  `approvalCapability` 物件。
- `ChannelPlugin.approvals` 已被移除。請將審核傳遞/native/render/auth 相關事實放在 `approvalCapability` 上。
- `plugin.auth` 僅用於登入/登出；核心不再從該物件讀取審核授權掛鉤。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是標準的審核授權接縫。
- 使用 `approvalCapability.getActionAvailabilityState` 來判斷相同聊天中審核授權的可用性。
- 如果您的通道公開了原生執行審核，當其啟動介面/原生客戶端狀態與相同聊天的審核授權不同時，請使用 `approvalCapability.getExecInitiatingSurfaceState`。核心會使用該特定於執行的掛鉤來區分 `enabled` 與 `disabled`，決定啟動通道是否支援原生執行審核，並將該通道包含在原生客戶端後備指引中。`createApproverRestrictedNativeApprovalCapability(...)` 會為常見情況填入此值。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 來處理通道特定的負載生命週期行為，例如隱藏重複的本機審核提示或在傳遞前發送輸入指示器。
- 僅將 `approvalCapability.delivery` 用於原生審核路由或後備抑制。
- 使用 `approvalCapability.nativeRuntime` 來處理通道擁有的原生審核事實。請在熱門通道入口點上透過 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 保持其延遲加載，這可以在按需匯入您的執行時模組的同時，讓核心組裝審核生命週期。
- 僅當通道確實需要自訂審核負載而非共用轉譯器時，才使用 `approvalCapability.render`。
- 當通道希望使用停用路徑回覆來說明啟用原生執行審核所需確切的配置設定時，請使用 `approvalCapability.describeExecApprovalSetup`。該掛鉤接收 `{ channel, channelLabel, accountId }`；具名帳戶通道應呈現帳戶範圍的路徑（例如 `channels.<channel>.accounts.<id>.execApprovals.*`），而非頂層預設值。
- 如果通道可以從現有配置推斷出穩定的類似擁有者 DM 身分，請使用來自 `openclaw/plugin-sdk/approval-runtime` 的 `createResolvedApproverActionAuthAdapter` 來限制相同聊天 `/approve`，而無需新增特定於審核的核心邏輯。
- 如果頻道需要原生的審核傳遞功能，請將頻道程式碼專注於目標標準化以及傳輸/呈現事實。使用來自 `openclaw/plugin-sdk/approval-runtime` 的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。將頻道特定的事實放在 `approvalCapability.nativeRuntime` 後面，最好透過 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，以便核心可以組裝處理程序並擁有請求過濾、路由、去重、過期、網關訂閱和路由至其他處理程序的通知。`nativeRuntime` 被拆分為幾個較小的縫隙：
- `availability` — 帳戶是否已設定以及是否應處理請求
- `presentation` — 將共享的審核視圖模型對應為待處理/已解決/已過期的原生承載或最終操作
- `transport` — 準備目標以及發送/更新/刪除原生審核訊息
- `interactions` — 針對原生按鈕或反應的可選綁定/解除綁定/清除操作掛鉤
- `observe` — 可選的傳遞診斷掛鉤
- 如果頻道需要執行時期擁有的物件，例如客戶端、權杖、Bolt 應用程式或 webhook 接收器，請透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊它們。通用的執行時期上下文註冊表讓核心可以從頻道啟動狀態引導能力驅動的處理程序，而無需新增審核特定的包裝膠水程式碼。
- 僅當能力驅動的縫隙還不夠表達時，才使用較低層級的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生審核頻道必須透過這些輔助程式路由 `accountId` 和 `approvalKind`。`accountId` 保持多帳戶審核策略限定在正確的機器人帳戶，而 `approvalKind` 使執行與外掛程式審核行為對頻道可用，而無需在核心中硬編碼分支。
- Core 現在也擁有審批重新路由通知。頻道外掛程式不應從 `createChannelNativeApprovalRuntime` 發送自己的「審批已轉至 DM / 另一個頻道」後續訊息；相反，應透過共用的審批功能協助程式公開準確的來源 + 審批者-DM 路由，並讓核心在將任何通知發回發起聊天之前彙總實際的傳遞情況。
- 端到端保留傳遞的審批 ID 類型。原生客戶端不應
  根據頻道本機狀態猜測或重寫 exec 與外掛程式審批路由。
- 不同的審批類型可以有目的地公開不同的原生介面。
  目前附帶的範例：
  - Slack 會為 exec 和外掛程式 ID 保留可用的原生審批路由。
  - Matrix 為 exec
    和外掛程式審批保留相同的原生 DM/頻道路由和反應 UX，同時仍允許認證根據審批類型而有所不同。
- `createApproverRestrictedNativeApprovalAdapter` 作為相容性包裝函式仍然存在，但新程式碼應優先使用功能建構器並在外掛程式上公開 `approvalCapability`。

對於熱頻道進入點，當您僅
需要該系列的其中一部分時，請優先使用較狹窄的執行時子路徑：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同樣地，當您不需要更廣泛的總括
介面時，請優先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-adapter-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

特別是對於設定：

- `openclaw/plugin-sdk/setup-runtime` 涵蓋執行時安全的設定協助程式：
  匯入安全的設定修補配接器 (`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`)、查閱註記輸出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 和委派
  的設定代理建構器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是用於
  `createEnvPatchedAccountSetupAdapter` 的狹隘環境感知配接器
  接縫
- `openclaw/plugin-sdk/channel-setup` 涵蓋了選用安裝設定建構器以及一些設定安全的原語：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`，

如果您的頻道支援環境變數驅動的設定或身份驗證，且一般啟動/設定流程需要在執行時期載入前知道這些環境變數名稱，請在插件清單中使用 `channelEnvVars` 進行宣告。請僅將頻道執行時期 `envVars` 或本地常數用於面向操作員的文案。
`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
`splitSetupEntries`

- 僅當您還需要更重量級的共享設定/設定輔助程式（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`）時，才使用更廣泛的 `openclaw/plugin-sdk/setup` 接縫。

如果您的頻道只想在設定介面中宣傳「先安裝此外掛」，請優先選擇 `createOptionalChannelSetupSurface(...)`。產生的介面卡/精靈在設定寫入和最終確認時會以封閉方式失敗，並且它們會在驗證、最終確認和文件連結文案中重複使用相同的需要安裝訊息。

對於其他熱門頻道路徑，請優先使用狹窄的輔助函式，而非更廣泛的舊版介面：

- `openclaw/plugin-sdk/account-core`、
  `openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers` 用於多帳號設定
  和預設帳號後備
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch` 用於傳入路由/信封
  和記錄與分發連線
- `openclaw/plugin-sdk/messaging-targets` 用於目標解析/比對
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime` 用於媒體載入以及
  傳出身分識別/發送委派
- `openclaw/plugin-sdk/thread-bindings-runtime` 用於執行緒繫結生命週期
  和介面卡註冊
- 僅當仍然需要舊版代理程式/媒體承載欄位佈局時，才使用 `openclaw/plugin-sdk/agent-media-payload`
- `openclaw/plugin-sdk/telegram-command-config` 用於 Telegram 自訂指令
  正規化、重複/衝突驗證，以及後備穩定的指令
  設定合約

僅限驗證的通道通常可以停用於預設路徑：核心處理審批，而外掛僅公開傳出/驗證功能。Matrix、Slack、Telegram 和自訂聊天傳輸等原生審批通道應使用共享的原生輔助程式，而不是自行實作審批生命週期。

## 傳入提及原則

將傳入提及處理分成兩層：

- 外掛擁有的證據收集
- 共享原則評估

將 `openclaw/plugin-sdk/channel-inbound` 用於共享層。

適合外掛本機邏輯的情況：

- 回覆機器人偵測
- 引用機器人偵測
- 執行緒參與檢查
- 服務/系統訊息排除
- 證明機器人參與所需的原生平台快取

適合共享輔助程式的情況：

- `requireMention`
- 明確提及結果
- 隱含提及允許清單
- 指令繞過
- 最終略過決策

首選流程：

1. 計算本機提及事實。
2. 將這些事實傳入 `resolveInboundMentionDecision({ facts, policy })`。
3. 在您的傳入閘道中使用 `decision.effectiveWasMentioned`、`decision.shouldBypassMention` 和 `decision.shouldSkip`。

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

`api.runtime.channel.mentions` 為已依賴執行時期插入的捆綁通道外掛公開相同的共享提及輔助程式：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

較舊的 `resolveMentionGating*` 輔助程式仍保留在
`openclaw/plugin-sdk/channel-inbound` 上，僅作為相容性匯出。新程式碼
應使用 `resolveInboundMentionDecision({ facts, policy })`。

## 逐步解說

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="套件和清單">
    建立標準外掛檔案。`package.json` 中的 `channel` 欄位
    使其成為通道外掛。如需完整的套件中繼資料介面，
    請參閱 [外掛設定與設定](/en/plugins/sdk-setup#openclaw-channel)：

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

  <Step title="建構通道插件物件">
    `ChannelPlugin` 介面有許多可選的介面卡表面。從最小需求開始
    — `id` 和 `setup` — 並根據您的需求加入介面卡。

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
      您無需手動實作低階介面卡介面，只需傳遞宣告式選項，
      建構器會將其組合起來：

      | 選項 | 它連接什麼 |
      | --- | --- |
      | `security.dm` | 來自配置欄位的範圍 DM 安全性解析器 |
      | `pairing.text` | 基於文字的 DM 配對流程，包含代碼交換 |
      | `threading` | 回覆模式解析器 (固定、帳戶範圍或自訂) |
      | `outbound.attachedResults` | 傳回結果元資料 (訊息 ID) 的傳送函式 |

      如果您需要完全控制，也可以傳遞原始介面卡物件，而不是宣告式選項。
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
    可以在根目錄幫助中顯示它們，而無需啟動完整的通道執行時，
    同時正常的完整載入仍會選取相同的描述符以進行實際的命令
    註冊。將 `registerFull(...)` 保留給僅限執行時的工作。
    如果 `registerFull(...)` 註冊了閘道 RPC 方法，請使用
    外掛特定的前綴。核心管理命名空間 (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) 保留給系統使用，且始終
    解析為 `operator.admin`。
    `defineChannelPluginEntry` 會自動處理註冊模式分割。請參閱
    [進入點](/en/plugins/sdk-entrypoints#definechannelpluginentry) 以了解所有
    選項。

  </Step>

  <Step title="Add a setup entry">
    建立 `setup-entry.ts` 以在引導過程中進行輕量級載入：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    當管道已停用或未設定時，OpenClaw 會載入此項而非完整的進入點。這可以避免在設定流程中載入沉重的執行時程式碼。詳情請參閱 [Setup and Config](/en/plugins/sdk-setup#setup-entry)。

    將設定安全的匯出分割到附屬模組的打包工作區管道，若同時需要明確的設定時期執行時設定器，可以使用來自 `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="Handle inbound messages">
    您的外掛需要從平台接收訊息並將其轉發給 OpenClaw。典型的模式是使用一個驗證請求並透過管道的入站處理器進行分派的 webhook：

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
      入站訊息處理因管道而異。每個管道外掛都擁有自己的入站管道。請查看打包的管道外掛（例如 Microsoft Teams 或 Google Chat 外掛套件）以了解實際模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Test">
在 `src/channel.test.ts` 中撰寫並置測試：

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

    若為共用測試輔助工具，請參閱 [Testing](/en/plugins/sdk-testing)。

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
  <Card title="目標解析" icon="crosshair" href="/en/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="執行時期輔助程式" icon="settings" href="/en/plugins/sdk-runtime">
    TTS, STT, media, subagent via api.runtime
  </Card>
</CardGroup>

<Note>部分捆綁的輔助接縫仍然存在，用於捆綁外掛程式的維護和相容性。它們不是新通道外掛程式的推薦模式；除非您直接維護該捆綁外掛程式系列，否則請優先使用通用 SDK 介面上的 channel/setup/reply/runtime 子路徑。</Note>

## 後續步驟

- [提供者外掛程式](/en/plugins/sdk-provider-plugins) — 如果您的外掛程式也提供模型
- [SDK 概覽](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [SDK 測試](/en/plugins/sdk-testing) — 測試公用程式和合約測試
- [外掛程式清單](/en/plugins/manifest) — 完整的清單架構
