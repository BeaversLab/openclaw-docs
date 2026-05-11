---
summary: "為 OpenClaw 建構訊息頻道外掛的逐步指南"
title: "建構頻道外掛"
sidebarTitle: "頻道外掛"
read_when:
  - You are building a new messaging channel plugin
  - You want to connect OpenClaw to a messaging platform
  - You need to understand the ChannelPlugin adapter surface
---

本指南將引導您建構一個連接 OpenClaw 與訊息平台的頻道外掛。完成後，您將擁有一個具備 DM 安全性、配對、回覆串接以及外發訊息功能的運作中頻道。

<Info>如果您尚未建構過任何 OpenClaw 外掛，請先閱讀 [入門指南](/zh-Hant/plugins/building-plugins) 以了解基本的套件 結構和 manifest 設定。</Info>

## 頻道外掛的運作方式

頻道外掛不需要自己的傳送/編輯/反應工具。OpenClaw 在核心中保留一個
共用的 `message` 工具。您的外掛擁有：

- **設定 (Config)** — 帳號解析與設定精靈
- **安全性 (Security)** — DM 政策與允許清單
- **配對 (Pairing)** — DM 核准流程
- **會話文法 (Session grammar)** — 提供商特定的對話 ID 如何映射到基本聊天、執行緒 ID 和父級後援
- **外發 (Outbound)** — 傳送文字、媒體和投票到平台
- **串接 (Threading)** — 回覆如何進行串接
- **心跳輸入 (Heartbeat typing)** — 針對心跳傳遞目標的可選輸入/忙碌訊號

核心擁有共用的訊息工具、提示連接、外層會話金鑰形狀、
通用 `:thread:` 簿記與分派。

如果您的頻道在傳入回覆之外支援輸入指示器，請在頻道外掛上公開
`heartbeat.sendTyping(...)`。核心會在心跳模型執行開始前呼叫它並傳入解析後的心跳傳遞目標，
並使用共用的輸入保持啟動/清理生命週期。當平台需要明確的停止訊號時，請新增 `heartbeat.clearTyping(...)`。

如果您的頻道新增了攜帶媒體來源的訊息工具參數，請透過
`describeMessageTool(...).mediaSourceParams` 公開這些參數名稱。核心會
使用該明確清單進行沙盒路徑正規化和外發媒體存取
政策，因此外掛不需要針對提供商特定的
頭像、附件或封面圖片參數使用共用核心的特殊案例。
建議返回動作鍵值的映射，例如
`{ "set-profile": ["avatarUrl", "avatarPath"] }`，以免不相關的動作
繼承另一個動作的媒體引數。對於有意在每個公開動作之間共用的參數，扁平陣列仍然適用。

如果您的平台在交談 ID 中儲存了額外的作用域，請將該解析保留在 `messaging.resolveSessionConversation(...)` 中的插件內。這是將 `rawId` 對應到基礎交談 ID、可選線程 ID、明確的 `baseConversationId` 以及任何 `parentConversationCandidates` 的標準掛鉤。當您返回 `parentConversationCandidates` 時，請按從最狹窄的父級到最廣泛/基礎交談的順序排列。

需要在通道註冊表啟動之前進行相同解析的打包插件，也可以公開具有匹配的 `resolveSessionConversation(...)` 匯出的頂層 `session-key-api.ts` 檔案。Core 僅在執行時插件註冊表尚不可用時，才使用此啟動安全介面。

當插件僅需要在通用/原始 ID 之上進行父級回退時，`messaging.resolveParentConversationCandidates(...)` 仍可作為舊版相容性回退使用。如果兩個掛鉤都存在，Core 會優先使用 `resolveSessionConversation(...).parentConversationCandidates`，並且僅在標準掛鉤省略這些掛鉤時才回退到 `resolveParentConversationCandidates(...)`。

## 審核與通道功能

大多數通道插件都不需要特定於審核的程式碼。

- Core 擁有同一個交談中的 `/approve`、共享的審核按鈕 Payload 以及通用的回退傳遞功能。
- 當通道需要特定於審核的行為時，請在通道插件上使用一個 `approvalCapability` 物件。
- `ChannelPlugin.approvals` 已被移除。請將審核傳遞/原生/渲染/認證事實放在 `approvalCapability` 上。
- `plugin.auth` 僅用於登入/登出；Core 不再從該物件讀取審核認證掛鉤。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是標準的審核認證介面。
- 請使用 `approvalCapability.getActionAvailabilityState` 來處理同一個交談中的審核認證可用性。
- 如果您的頻道公開了原生執行核准，請使用 `approvalCapability.getExecInitiatingSurfaceState` 作為起始介面/原生客戶端狀態，當其與同聊天室核准授權不同時。核心會使用該執行特定的 hook 來區分 `enabled` 與 `disabled`，決定起始頻道是否支援原生執行核准，並將該頻道包含在原生客戶端後備指南中。`createApproverRestrictedNativeApprovalCapability(...)` 會為常見情況填入此項。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 來處理頻道特定的載荷生命週期行為，例如隱藏重複的本機核准提示或在遞送前發送輸入指示器。
- 僅將 `approvalCapability.delivery` 用於原生核准路由或後備抑制。
- 將 `approvalCapability.nativeRuntime` 用於頻道擁有的原生核准事實。請在熱頻道進入點上透過 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 保持其延遲加載，它可以在需要時匯入您的執行時模組，同時仍讓核心組裝核准生命週期。
- 僅當頻道確實需要自訂核准載荷而非共用渲染器時，才使用 `approvalCapability.render`。
- 當頻道希望停用路徑回覆以解釋啟用原生執行核准所需的确切配置旋鈕時，請使用 `approvalCapability.describeExecApprovalSetup`。該 hook 會接收 `{ channel, channelLabel, accountId }`；命名帳戶頻道應該渲染帳戶範圍的路徑，例如 `channels.<channel>.accounts.<id>.execApprovals.*`，而不是頂層預設值。
- 如果頻道可以從現有配置中推斷出穩定的類似擁有者 DM 身份，請使用來自 `openclaw/plugin-sdk/approval-runtime` 的 `createResolvedApproverActionAuthAdapter` 來限制同聊天室 `/approve`，而無需新增特定於核准的核心邏輯。
- 如果通道需要原生的審批傳遞，請保持通道程式碼專注於目標正規化以及傳輸/呈現事實。使用來自 `openclaw/plugin-sdk/approval-runtime` 的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。將通道特定的事實放在 `approvalCapability.nativeRuntime` 背後，最好透過 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，以便核心可以組裝處理程式並擁有請求過濾、路由、去重、過期、閘道訂閱和路由至他處通知。`nativeRuntime` 被拆分為幾個較小的縫隙：
- `availability` — 帳戶是否已配置以及是否應處理請求
- `presentation` — 將共用的審批檢視模型映射為待處理/已解決/已過期的原生 Payload 或最終操作
- `transport` — 準備目標以及發送/更新/刪除原生審批訊息
- `interactions` — 用於原生按鈕或反應的可選綁定/解除綁定/清除操作掛鉤
- `observe` — 可選的傳遞診斷掛鉤
- 如果通道需要執行時期擁有的物件（例如客戶端、權杖、Bolt 應用程式或 Webhook 接收器），請透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊它們。通用的執行時期內容註冊表讓核心可以從通道啟動狀態引導功能驅動的處理程式，而無需添加審批專用的包裝膠水。
- 只有在功能驅動的縫隙表達能力不足時，才使用較低層級的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生審批通道必須透過這些輔助函式路由 `accountId` 和 `approvalKind`。`accountId` 確保多帳戶審批政策範圍限定於正確的機器人帳戶，而 `approvalKind` 確保執行與外掛審批行為可供通道使用，而不需要在核心中進行硬編碼分支。
- Core 現在也負責審批重新導向通知。通道外掛不應從 `createChannelNativeApprovalRuntime` 發送自己的「審批已轉移至 DM / 其他通道」後續訊息；反之，應透過共用的審批功能助手公開準確的來源 + 審批者 DM 路由，並讓 Core 在發送任何通知回起始聊天之前彙總實際的傳遞結果。
- 端到端保留已傳遞的審批 ID 類型。原生客戶端不應根據通道本機狀態來猜測或重寫 exec 與 plugin 審批路由。
- 不同的審批類型可以有目的地公開不同的原生介面。目前內建的範例：
  - Slack 為 exec 和 plugin ID 保留了可用的原生審批路由。
  - Matrix 對 exec 和 plugin 審批保持相同的原生 DM/通道路由和反應 UX，同時仍允許授權根據審批類型而有所不同。
- `createApproverRestrictedNativeApprovalAdapter` 作為相容性包裝器仍然存在，但新程式碼應優先使用功能建構器並在外掛上公開 `approvalCapability`。

對於熱通道進入點，當您只需要該系列的一部分時，請優先使用較狹窄的執行時子路徑：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同樣地，當您不需要更廣泛的統合介面時，請優先使用 `openclaw/plugin-sdk/setup-runtime`、`openclaw/plugin-sdk/setup-adapter-runtime`、`openclaw/plugin-sdk/reply-runtime`、`openclaw/plugin-sdk/reply-dispatch-runtime`、`openclaw/plugin-sdk/reply-reference` 和 `openclaw/plugin-sdk/reply-chunking`。

特別是對於設定：

- `openclaw/plugin-sdk/setup-runtime` 涵蓋了執行時安全的設定助手：匯入安全的設定修補配接器 (`createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`)、查找備註輸出、`promptResolvedAllowFrom`、`splitSetupEntries` 以及委派的設定代理建構器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是 `createEnvPatchedAccountSetupAdapter` 的狹隘環境感知配接器縫合點
- `openclaw/plugin-sdk/channel-setup` 涵蓋了選用安裝設定建構器以及一些設定安全的基元：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`，

如果您的頻道支援環境變數驅動的設定或驗證，且通用啟動/設定流程應該在執行時期載入前得知那些環境變數名稱，請在插件清單中使用 `channelEnvVars` 宣告它們。請將頻道執行時期的 `envVars` 或本機常數僅保留給操作員閱讀的文案。

如果您的頻道可能出現在 `status`、`channels list`、`channels status` 或 SecretRef 掃描中（在插件執行時期啟動之前），請在 `package.json` 中新增 `openclaw.setupEntry`。該進入點應該可以在唯讀指令路徑中安全匯入，並且應該傳回這些摘要所需的頻道中繼資料、設定安全的設定配接器、狀態配接器以及頻道密鑰目標中繼資料。請勿從設定進入點啟動用戶端、監聽器或傳輸執行時期。

同樣請保持主要頻道進入點的匯入路徑精簡。探索功能可以評估進入點和頻道插件模組以註冊功能，而無需啟動頻道。諸如 `channel-plugin-api.ts` 的檔案應該匯出頻道插件物件，而不匯入設定精靈、傳輸用戶端、通訊端監聽器、子程序啟動器或服務啟動模組。請將這些執行時期部分放在從 `registerFull(...)`、執行時期設定器或延遲功能配接器載入的模組中。

`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 以及
`splitSetupEntries`

- 僅當您同時需要
  更重量級的共享設定/設定輔助程式（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`）時，才使用更廣泛的 `openclaw/plugin-sdk/setup` 接縫

如果您的頻道只想在設定介面中宣傳「請先安裝此插件」，請偏好使用 `createOptionalChannelSetupSurface(...)`。產生的配接器/精靈會在設定寫入和最終確認時封閉式失敗，並且它們會在驗證、最終確認和文件連結文案中重複使用相同的「需要安裝」訊息。

對於其他熱門頻道路徑，請優先使用較狹隘的輔助程式，而非更廣泛的舊版介面：

- `openclaw/plugin-sdk/account-core`,
  `openclaw/plugin-sdk/account-id`,
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers` 用於多帳號配置和
  預設帳號後備機制
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch` 用於入站路由/信封和
  記錄與分發的連線
- `openclaw/plugin-sdk/messaging-targets` 用於目標解析/匹配
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime` 用於媒體載入，以及出站
  身份/發送委派和負載規劃
- 當出站路由應保留顯式
  `replyToId`/`threadId`，或當基礎會話金鑰仍然匹配時恢復目前的
  `:thread:` 會話時，從
  `openclaw/plugin-sdk/channel-core` 呼叫 `buildThreadAwareOutboundSessionRoute(...)`。當其平台具有原生執行緒傳遞語意時，提供者外掛可以覆寫優先順序、後綴行為和執行緒 ID 標準化。
- `openclaw/plugin-sdk/thread-bindings-runtime` 用於執行緒綁定生命週期
  和適配器註冊
- 僅當仍然需要舊版代理/媒體
  負載欄位佈局時才使用 `openclaw/plugin-sdk/agent-media-payload`
- `openclaw/plugin-sdk/telegram-command-config` 用於 Telegram 自訂指令
  標準化、重複/衝突驗證，以及後備穩定的指令
  配置合約

僅具備驗證功能的頻道通常可以採用預設路徑：核心會處理核准，外掛程式只需公開出站/驗證功能。Matrix、Slack、Telegram 等原生核准頻道和自訂聊天傳輸應使用共用的原生輔助程式，而不應自行建立核准生命週期。

## 入站提及政策

請將入站提及處理分為兩層：

- 外掛程式擁有的證據收集
- 共用政策評估

使用 `openclaw/plugin-sdk/channel-mention-gating` 進行提及策略決策。
僅當您需要更廣泛的入站
輔助模組匯總時才使用 `openclaw/plugin-sdk/channel-inbound`。

適合外掛程式本機邏輯：

- 回覆機器人偵測
- 引用機器人偵測
- 執行緒參與檢查
- 服務/系統訊息排除
- 證明機器人參與所需的平台原生快取

適合共用輔助程式：

- `requireMention`
- 明確提及結果
- 隱含提及允許清單
- 指令略過
- 最終略過決策

建議流程：

1. 計算本機提及事實。
2. 將這些事實傳入 `resolveInboundMentionDecision({ facts, policy })`。
3. 在您的入站閘道中使用 `decision.effectiveWasMentioned`、`decision.shouldBypassMention` 和 `decision.shouldSkip`。

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

`api.runtime.channel.mentions` 為已經依賴執行時注入的
捆綁通道外掛公開相同的共享提及輔助函式：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果您僅需要 `implicitMentionKindWhen` 和
`resolveInboundMentionDecision`，請從
`openclaw/plugin-sdk/channel-mention-gating` 匯入，以避免載入不相關的入站
執行時輔助函式。

較舊的 `resolveMentionGating*` 協助程式仍然保留在
`openclaw/plugin-sdk/channel-inbound` 上，僅作為相容性匯出。新程式碼
應該使用 `resolveInboundMentionDecision({ facts, policy })`。

## 逐步指南

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package and manifest">
    建立標準的外掛程式檔案。`package.json` 中的 `channel` 欄位
    是讓這成為頻道外掛程式的關鍵。若要查看完整的套件中繼資料介面，
    請參閱 [Plugin Setup and Config](/zh-Hant/plugins/sdk-setup#openclaw-channel)：

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

    `configSchema` 會驗證 `plugins.entries.acme-chat.config`。請將其用於
    不屬於頻道帳號設定的外掛程式自有設定。`channelConfigs`
    會驗證 `channels.acme-chat`，並且是在外掛程式執行時載入之前，由設定架構、設定和 UI 介面使用的冷路徑來源。

  </Step>

  <Step title="建構通道外掛程式物件">
    `ChannelPlugin` 介面有許多選用的配接器介面。從
    最小需求開始 — `id` 和 `setup` — 並根據需要加入配接器。

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
      您無需手動實作低階配接器介面，只需傳遞宣告式選項，
      建構器會將其組合起來：

      | 選項 | 連線內容 |
      | --- | --- |
      | `security.dm` | 從設定欄位產生的範圍限定的 DM 安全性解析器 |
      | `pairing.text` | 基於文字且包含代碼交換的 DM 配對流程 |
      | `threading` | 回覆模式解析器 (固定、帳號範圍或自訂) |
      | `outbound.attachedResults` | 傳回結果中繼資料 (訊息 ID) 的傳送函式 |

      如果您需要完全控制，也可以傳遞原始配接器物件
      而非宣告式選項。

      原始輸出配接器可以定義 `chunker(text, limit, ctx)` 函式。
      選用的 `ctx.formatting` 包含傳送時期的格式決策，
      例如 `maxLinesPerMessage`；請在傳送前套用它，以便回覆主題
      和區塊邊界由共用的輸出傳遞服務解析一次。
      當解析出原生回覆目標時，傳送內容也會包含 `replyToIdSource` (`implicit` 或 `explicit`)，
      因此輔助函式可以保留明確的回覆標籤，而不消耗隱含的一次性回覆槽位。
    </Accordion>

  </Step>

  <Step title="連接入口點">
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

    將通道擁有的 CLI 描述子放在 `registerCliMetadata(...)` 中，以便 OpenClaw
    可以在根層級說明中顯示它們，而無需啟動完整的通道執行時，
    同時正常的完整載入仍會取得相同的描述子以進行實際的指令
    註冊。將 `registerFull(...)` 保留給僅限執行時的工作。
    如果 `registerFull(...)` 註冊了 Gateway RPC 方法，請使用
    外掛特定的前綴。核心管理命名空間（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）保持保留狀態，並且始終
    解析為 `operator.admin`。
    `defineChannelPluginEntry` 會自動處理註冊模式的分割。請參閱
    [Entry Points](/zh-Hant/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有
    選項。

  </Step>

  <Step title="新增設定入口">
    建立 `setup-entry.ts` 以在導入過程中進行輕量級載入：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    當通道停用或未設定時，OpenClaw 會載入此檔案而非完整的入口。
    這可避免在設定流程中載入繁重的執行時代碼。
    詳情請參閱 [Setup and Config](/zh-Hant/plugins/sdk-setup#setup-entry)。

    將設定安全的匯出分割到側車模組的捆綁工作區通道，
    當它們也需要明確的設定時執行時設定器時，可以使用來自
    `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="處理傳入訊息">
    您的外掛需要從平台接收訊息並將其轉發給
    OpenClaw。典型的模式是一個驗證請求並透過通道的傳入處理器分派它的 webhook：

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
      自己的傳入管線。請查看打包的通道外掛
      (例如 Microsoft Teams 或 Google Chat 外掛套件) 以了解真實模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="測試">
在 `src/channel.test.ts` 中編寫並置的測試：

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

    有關共享測試輔助工具，請參閱 [Testing](/zh-Hant/plugins/sdk-testing)。

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
  <Card title="執行緒選項" icon="git-branch" href="/zh-Hant/plugins/sdk-entrypoints#registration-mode">
    固定、帳戶範圍或自訂回覆模式
  </Card>
  <Card title="訊息工具整合" icon="puzzle" href="/zh-Hant/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 和動作探索
  </Card>
  <Card title="目標解析" icon="crosshair" href="/zh-Hant/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="執行時輔助程式" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    TTS, STT, media, subagent via api.runtime
  </Card>
</CardGroup>

<Note>部分內建的輔助連接點（helper seams）仍然存在，以便於內建外掛程式的維護與相容性。它們並不是開發新頻道外掛程式的推薦模式；除非您直接維護該內建外掛程式系列，否則建議優先使用通用 SDK 介面中的 channel/setup/reply/runtime 子路徑。</Note>

## 下一步

- [Provider Plugins](/zh-Hant/plugins/sdk-provider-plugins) — 如果您的外掛也提供模型
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 完整子路徑匯入參考
- [SDK 測試](/zh-Hant/plugins/sdk-testing) — 測試工具程式與合約測試
- [外掛程式清單](/zh-Hant/plugins/manifest) — 完整清單架構

## 相關

- [外掛程式 SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
- [Agent harness 外掛程式](/zh-Hant/plugins/sdk-agent-harness)
