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

<Info>如果您之前從未建置過任何 OpenClaw 外掛程式，請先閱讀 [入門指南](/zh-Hant/plugins/building-plugins) 以了解基本的套件 結構與 manifest 設定。</Info>

## 頻道外掛程式的運作方式

頻道外掛程式不需要自己的傳送/編輯/反應工具。OpenClaw 在核心中保留一個
共用的 `message` 工具。您的外掛程式擁有：

- **Config** — 帳戶解析與設定精靈
- **Security** — 私訊原則與允許清單
- **Pairing** — 私訊核准流程
- **Session 文法** — 提供者特定的對話 ID 如何對應到基礎聊天、執行緒 ID 和父項備援
- **Outbound** — 將文字、媒體和投票傳送到平台
- **Threading** — 回覆如何建立執行緒
- **Heartbeat typing** — 用於心跳傳遞目標的可選輸入/忙碌訊號

Core 擁有共用訊息工具、提示連線、外部 session-key 形狀、
通用 `:thread:` 簿記以及分派功能。

如果您的管道在入站回覆之外支援輸入指示器，請在
通道外掛程式中公開 `heartbeat.sendTyping(...)`。Core 會在
心跳模型執行開始之前，使用已解析的心跳傳遞目標來呼叫它，
並使用共用的輸入保持/清理生命週期。當平台需要明確的停止訊號時，
請新增 `heartbeat.clearTyping(...)`。

如果您的管道新增了包含媒體來源的 message-tool 參數，請透過
`describeMessageTool(...).mediaSourceParams` 公開這些參數名稱。Core 會使用
該明確清單來進行沙箱路徑正規化和出站媒體存取
策略，因此外掛程式不需要針對供應商特定的
頭像、附件或封面圖片參數設定共用核心的特殊情況。
建議回傳一個以動作為鍵的映射，例如
`{ "set-profile": ["avatarUrl", "avatarPath"] }`，如此一來，不相關的動作就不會
繼承另一個動作的媒體參數。對於有意在每個公開動作之間
共用的參數，扁平陣列仍然有效。

如果您的平台在對話 ID 內儲存了額外範圍，請使用
`messaging.resolveSessionConversation(...)` 將該剖析保留在外掛程式中。這是
將 `rawId` 映射到基礎對話 ID、選用執行緒
ID、明確 `baseConversationId` 以及任何 `parentConversationCandidates` 的
標準掛鉤。當您回傳 `parentConversationCandidates` 時，請將其從
最窄的父層到最廣/基礎對話進行排序。

在通道註冊表啟動之前需要相同剖析的打包外掛程式，也可以
公開一個頂層 `session-key-api.ts` 檔案，並帶有相符的
`resolveSessionConversation(...)` 匯出。Core 僅在執行階段外掛程式註冊表
尚無法使用時，才會使用該啟動安全的介面。

`messaging.resolveParentConversationCandidates(...)` 作為舊版相容性備選機制仍然可用，當外掛只需要在通用/原始 ID 之上使用父級備選時。如果兩個 hooks 都存在，core 會優先使用 `resolveSessionConversation(...).parentConversationCandidates`，並且只有在規範 hook 省略它們時才回退到 `resolveParentConversationCandidates(...)`。

## 核准與頻道功能

大多數頻道外掛不需要核准特定的程式碼。

- Core 掌管同一聊天中的 `/approve`、共用的核准按鈕 payload 以及通用備選傳遞。
- 當頻道需要核准特定的行為時，請優先在頻道外掛上使用一個 `approvalCapability` 物件。
- `ChannelPlugin.approvals` 已被移除。請將核准傳遞/原生/渲染/驗證相關資訊放在 `approvalCapability` 上。
- `plugin.auth` 僅用於登入/登出；core 不再從該物件讀取核准驗證 hooks。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是規範的核准驗證接縫。
- 使用 `approvalCapability.getActionAvailabilityState` 來判斷同一聊天的核准驗證可用性。
- 如果您的頻道公開原生執行核准，請在啟動介面/原生客戶端狀態與同一聊天核准驗證不同時使用 `approvalCapability.getExecInitiatingSurfaceState`。Core 使用該執行特定的 hook 來區分 `enabled` 和 `disabled`，決定啟動頻道是否支援原生執行核准，並將該頻道包含在原生客戶端備選指導中。`createApproverRestrictedNativeApprovalCapability(...)` 會為常見情況填入此內容。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 來處理頻道特定的 payload 生命週期行為，例如隱藏重複的本地核准提示或在傳遞前發送輸入指示器。
- 僅將 `approvalCapability.delivery` 用於原生核准路由或備選抑制。
- 將 `approvalCapability.nativeRuntime` 用於頻道擁有的原生核准資訊。在熱頻道進入點上使用 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 保持延遲加載，它可以在需要時匯入您的執行時模組，同時仍允許 core 組裝核准生命週期。
- 僅當頻道確實需要自訂核准 payload 而非共用渲染器時，才使用 `approvalCapability.render`。
- 當通道需要透過停用路徑回覆來說明啟用原生執行核准所需的確切設定選項時，請使用 `approvalCapability.describeExecApprovalSetup`。該掛鉤會接收 `{ channel, channelLabel, accountId }`；命名帳戶通道應轉譯帳戶範圍的路徑（例如 `channels.<channel>.accounts.<id>.execApprovals.*`），而非頂層預設值。
- 如果通道可以從現有設定中推斷出穩定的類似擁有者 DM 身分，請使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createResolvedApproverActionAuthAdapter` 來限制同聊天室 `/approve`，而無需新增特定於核准的核心邏輯。
- 如果通道需要原生核准傳遞，請保持通道程式碼專注於目標正規化以及傳輸/呈現事實。使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。將通道特定的事實放在 `approvalCapability.nativeRuntime` 背後，最好透過 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，以便核心可以組合處理程序並擁有請求過濾、路由、去重、過期、閘道訂閱以及路由至其他地方的通知。`nativeRuntime` 被分割為幾個較小的縫隙：
- `availability` — 帳戶是否已設定以及是否應處理請求
- `presentation` — 將共享的核准檢視模型映射到待處理/已解決/已過期的原生載荷或最終操作
- `transport` — 準備目標以及傳送/更新/刪除原生核准訊息
- `interactions` — 原生按鈕或反應的可選綁定/解除綁定/清除操作掛鉤
- `observe` — 可選的傳遞診斷掛鉤
- 如果通道需要執行時間擁有的物件（例如客戶端、權杖、Bolt 應用程式或 webhook 接收器），請透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊它們。通用執行時間內容註冊表允許核心從通道啟動狀態引導功能驅動的處理程序，而無需新增特定於核准的包裝膠水程式碼。
- 僅在由能力驅動的接縫（seam）還不夠表達時，才使用底層的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生審核管道必須將 `accountId` 和 `approvalKind` 這兩者都透過這些輔助程式進行路由。`accountId` 將多帳號審核政策的範圍保持在正確的機器人帳號內，而 `approvalKind` 則讓執行與外掛程式審核的行為可供管道使用，無需在核心中進行硬編碼分支。
- 核心現在也擁有審核重新路由通知。管道外掛程式不應從 `createChannelNativeApprovalRuntime` 發送自己的「審核已轉至私訊 / 其他管道」後續訊息；相反，應透過共用的審核能力輔助程式公開準確的來源 + 審核者私訊路由，並讓核心在發布任何通知回起始聊天之前匯總實際傳遞狀況。
- 端對端保留已傳遞的審核 id 類型。原生客戶端不應從管道本機狀態推測或重寫執行與外掛程式審核的路由。
- 不同的審核類型可以有意地公開不同的原生介面。
  目前附帶的範例：
  - Slack 針對執行和外掛程式 id 保留了原生審核路由。
  - Matrix 針對執行和外掛程式審核保持了相同的原生私訊/管道路由和反應 UX，同時仍允許驗證依審核類型而異。
- `createApproverRestrictedNativeApprovalAdapter` 仍然作為相容性包裝程式存在，但新程式碼應優先使用能力建構器並在插件上公開 `approvalCapability`。

對於熱門管道入口點，當您只需要該系列的一部分時，請優先使用較窄的執行時子路徑：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同樣地，當您不需要更廣泛的頂層介面時，請優先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-adapter-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

關於設定特別是：

- `openclaw/plugin-sdk/setup-runtime` 涵蓋了執行期安全的設定輔助工具：
  import-safe 設定修補介面卡 (`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`)、lookup-note 輸出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 以及委派
  的設定代理建構器
- `openclaw/plugin-sdk/setup-adapter-runtime` 是 `createEnvPatchedAccountSetupAdapter` 的窄型環境感知介面卡
  接縫
- `openclaw/plugin-sdk/channel-setup` 涵蓋了選用安裝設定
  建構器以及一些設定安全的基元：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、

如果您的頻道支援環境驅動的設定或驗證，且一般啟動/設定
流程應該在執行期載入前就知道這些環境名稱，請在
外掛清單中使用 `channelEnvVars` 宣告它們。請將頻道執行期 `envVars` 或本地常數
僅保留給操作員面向的文案。

如果您的頻道可能出現在 `status`、`channels list`、`channels status` 或
SecretRef 掃描中，且時間點在外掛執行期啟動之前，請在
`package.json` 中新增 `openclaw.setupEntry`。該進入點應該可以安全地在唯讀指令
路徑中匯入，並且應該回傳這些摘要所需的頻道中介資料、設定安全的設定介面卡、狀態
介面卡以及頻道密鑰目標中介資料。請不要
從設定進入點啟動客戶端、監聽器或傳輸執行期。

`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
`splitSetupEntries`

- 僅當您也同時需要
  更重的共用設定/設定輔助工具時（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`），才使用更廣泛的 `openclaw/plugin-sdk/setup` 接縫

如果您的頻道只想在設定介面中宣傳「請先安裝此外掛程式」，請優先使用 `createOptionalChannelSetupSurface(...)`。產生的介面卡/精靈會在設定寫入和最終確認時採取封閉式失敗策略，並且會在驗證、最終確認和文件連結複製中重複使用同一個需要安裝的訊息。

對於其他熱門頻道路徑，請優先使用較狹隘的輔助程式，而非更廣泛的舊版介面：

- `openclaw/plugin-sdk/account-core`、
  `openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers`，用於多帳號設定
  和預設帳號備援
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/inbound-reply-dispatch`，用於入站路由/信封
  和記錄與分派的連線
- `openclaw/plugin-sdk/messaging-targets`，用於目標解析/比對
- `openclaw/plugin-sdk/outbound-media` 和
  `openclaw/plugin-sdk/outbound-runtime`，用於媒體載入，以及出站
  身份/發送委派和承載規劃
- 當出站路由應保留明確的 `replyToId`/`threadId`，或在基礎會話金鑰仍然相符後復原目前的 `:thread:` 會話時，
  請使用來自 `openclaw/plugin-sdk/channel-core` 的 `buildThreadAwareOutboundSessionRoute(...)`。當提供者外掛程式的平台具有原生執行緒傳遞語意時，可以覆寫優先順序、後綴行為和執行緒 ID 正規化。
- `openclaw/plugin-sdk/thread-bindings-runtime`，用於執行緒繫結生命週期
  和介面卡註冊
- `openclaw/plugin-sdk/agent-media-payload`，僅當仍然需要舊版 agent/media
  承載欄位版面配置時使用
- `openclaw/plugin-sdk/telegram-command-config`，用於 Telegram 自訂指令
  正規化、重複/衝突驗證，以及備援穩定的指令
  設定合約

僅具備驗證功能的頻道通常可以採用預設路徑：核心會處理核准，外掛程式只需公開出站/驗證功能。Matrix、Slack、Telegram 等原生核准頻道和自訂聊天傳輸應使用共用的原生輔助程式，而不應自行建立核准生命週期。

## 入站提及政策

請將入站提及處理分為兩層：

- 外掛程式擁有的證據收集
- 共用政策評估

使用 `openclaw/plugin-sdk/channel-mention-gating` 進行提及策略決策。
僅在您需要更廣泛的入站輔助集合時使用 `openclaw/plugin-sdk/channel-inbound`。

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
2. 將這些事實傳遞至 `resolveInboundMentionDecision({ facts, policy })`。
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

`api.runtime.channel.mentions` 為已依賴執行時期注入的內建頻道外掛程式公開了相同的共用提及輔助程式：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果您只需要 `implicitMentionKindWhen` 和
`resolveInboundMentionDecision`，請從
`openclaw/plugin-sdk/channel-mention-gating` 匯入，以避免載入不相關的入站執行時期輔助程式。

舊的 `resolveMentionGating*` 輔助程式作為僅相容性匯出保留在
`openclaw/plugin-sdk/channel-inbound` 上。新程式碼應使用 `resolveInboundMentionDecision({ facts, policy })`。

## 逐步指南

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="套件和資訊清單">
    建立標準外掛程式檔案。`package.json` 中的 `channel` 欄位
    是使其成為頻道外掛程式的關鍵。如需完整的套件元資料層級，
    請參閱 [外掛程式設定與設定](/zh-Hant/plugins/sdk-setup#openclaw-channel)：

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
    `ChannelPlugin` 介面有許多可選的配接器介面。從最少的開始 —— `id` 和 `setup` —— 並根據需要添加配接器。

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
      您無需手動實作低階配接器介面，只需傳遞宣告式選項，建構器就會將它們組合起來：

      | 選項 | 它連接的內容 |
      | --- | --- |
      | `security.dm` | 來自配置欄位的範圍 DM 安全性解析器 |
      | `pairing.text` | 基於文字的 DM 配對流程，含代碼交換 |
      | `threading` | 回覆模式解析器 (固定、帳戶範圍或自訂) |
      | `outbound.attachedResults` | 傳回結果中繼資料 (訊息 ID) 的傳送函式 |

      如果您需要完全控制，也可以傳遞原始配接器物件，而不是宣告式選項。
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
    可以在根幫助中顯示它們，而無需啟動完整的通道執行時，
    同時正常的完整載入仍然會取得相同的描述符以進行實際的指令
    註冊。將 `registerFull(...)` 用於僅執行時的工作。
    如果 `registerFull(...)` 註冊閘道 RPC 方法，請使用
    特定於插件的前綴。核心管理命名空間 (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) 保持保留，並且總是
    解析為 `operator.admin`。
    `defineChannelPluginEntry` 會自動處理註冊模式分割。請參閱
    [進入點](/zh-Hant/plugins/sdk-entrypoints#definechannelpluginentry) 了解所有
    選項。

  </Step>

  <Step title="新增設定入口">
    建立 `setup-entry.ts` 以便在導入期間進行輕量級載入：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    當通道停用或未設定時，OpenClaw 會載入此項目而非完整入口。這可以避免在設定流程中引入繁重的執行時代碼。詳情請參閱 [設定與組態](/zh-Hant/plugins/sdk-setup#setup-entry)。

    如果將設定安全的匯出分割至側車模組的打包工作區通道，當它們也需要明確的設定時期執行時間設定器時，可以使用來自
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
在 `src/channel.test.ts` 中撰寫並存測試：

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

    若要取得共用的測試輔助工具，請參閱 [測試](/zh-Hant/plugins/sdk-testing)。

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
  <Card title="目標解析" icon="crosshair" href="/zh-Hant/plugins/architecture#channel-target-resolution">
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="執行時輔助程式" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    TTS, STT, media, subagent via api.runtime
  </Card>
</CardGroup>

<Note>部分內建的輔助連接點（helper seams）仍然存在，以便於內建外掛程式的維護與相容性。它們並不是開發新頻道外掛程式的推薦模式；除非您直接維護該內建外掛程式系列，否則建議優先使用通用 SDK 介面中的 channel/setup/reply/runtime 子路徑。</Note>

## 下一步

- [供應商外掛程式](/zh-Hant/plugins/sdk-provider-plugins) — 如果您的外掛程式也提供模型
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 完整的子路徑匯入參考
- [SDK 測試](/zh-Hant/plugins/sdk-testing) — 測試工具與合約測試
- [外掛程式清單](/zh-Hant/plugins/manifest) — 完整的清單架構
