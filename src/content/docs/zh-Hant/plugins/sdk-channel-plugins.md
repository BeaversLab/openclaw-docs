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

<Info>如果您以前尚未建置任何 OpenClaw 外掛程式，請先閱讀 [Getting Started](/zh-Hant/plugins/building-plugins) 以了解基本的套件 結構和 manifest 設定。</Info>

## 頻道外掛的運作方式

頻道外掛程式不需要自己的傳送/編輯/反應工具。OpenClaw 在核心中維護一個
共享的 `message` 工具。您的外掛程式擁有：

- **Config** - 帳戶解析與設定精靈
- **Security** - DM 政策與允許清單
- **Pairing** - DM 核准流程
- **Session grammar** - 提供商專屬的對話 ID 如何對應到基礎聊天、執行緒 ID 與父級後備機制
- **Outbound** - 將文字、媒體與投票傳送到平台
- **Threading** - 回覆如何以執行緒形式組織
- **Heartbeat typing** - 針對心跳傳遞目標的可選輸入/忙碌訊號

核心擁有共享的訊息工具、提示連線、外層 session-key 形狀、
通用 `:thread:` 記帳與分派。

新的通道插件還應公開帶有來自 `openclaw/plugin-sdk/channel-outbound` 的 `defineChannelMessageAdapter` 的 `message` 適配器。該適配器聲明了傳輸層實際支援的持久最終發送能力，並將文字/媒體發送指向與舊版 `outbound` 適配器相同的傳輸函數。僅當合約測試證明了本地副作用和返回的回執時，才聲明相應能力。

有關完整的 API 合約、範例、能力矩陣、回執規則、即時預覽最終確定、接收確認政策、測試和遷移表，請參閱 [通道輸出 API](/zh-Hant/plugins/sdk-channel-outbound)。

如果現有的 `outbound` 適配器已經具有正確的發送方法和能力元數據，請使用 `createChannelMessageAdapterFromOutbound(...)` 來推導 `message` 適配器，而不是手動編寫另一個橋接層。

適配器發送應返回 `MessageReceipt` 值。當相容性代碼仍然需要舊版 ID 時，請使用 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 來推導它們，而不是在新的生命週期代碼中保留並行的 `messageIds` 欄位。

支援預覽的通道還應聲明 `message.live.capabilities`，並使用其擁有的確切即時生命週期，例如 `draftPreview`、`previewFinalization`、`progressUpdates`、`nativeStreaming` 或 `quietFinalization`。就地最終確定草稿預覽的通道還應聲明 `message.live.finalizer.capabilities`，例如 `finalEdit`、`normalFallback`、`discardPending`、`previewReceipt` 和 `retainOnAmbiguousFailure`，並將運行時邏輯路由通過 `defineFinalizableLivePreviewAdapter(...)` 加上 `deliverWithFinalizableLivePreviewAdapter(...)`。確保這些能力由 `verifyChannelMessageLiveCapabilityAdapterProofs(...)` 和 `verifyChannelMessageLiveFinalizerProofs(...)` 測試支援，以便本地預覽、進度、編輯、回退/保留、清理和回執行為不會悄悄出現偏差。

延遲平台確認的輸入接收器應聲明 `message.receive.defaultAckPolicy` 和 `supportedAckPolicies`，而不是在監視器本地狀態中隱藏確認時機。使用 `verifyChannelMessageReceiveAckPolicyAdapterProofs(...)` 覆蓋每個聲明的政策。

舊版回覆輔助函式，例如 `createChannelTurnReplyPipeline`、
`dispatchInboundReplyWithBase` 和 `recordInboundSessionAndDispatchReply`，
仍然可用於相容性分發器。請勿在新的頻道程式碼中使用這些名稱；新外掛應從 `message` 配接器、回條，以及 `openclaw/plugin-sdk/channel-outbound` 上的接收/傳送生命週期輔助函式開始。

遷移輸入授權的通道可以使用來自執行時接收路徑的實驗性 `openclaw/plugin-sdk/channel-ingress-runtime` 子路徑。該子路徑將平台查找和副作用保留在插件中，同時共享允許清單狀態解析、路由/發送者/命令/事件/啟動決策、編輯診斷以及回合准入映射。請在傳遞給解析器的描述符中保留插件身份正規化；不要從已解析的狀態或決策中序列化原始匹配值。有關 API 設計、所有權邊界和測試預期，請參閱 [Channel ingress API](/zh-Hant/plugins/sdk-channel-ingress)。

如果您的頻道支援輸入回覆之外輸入指示器，請在頻道外掛上公開 `heartbeat.sendTyping(...)`。Core 會在心跳模型執行開始之前呼叫它，並使用解析後的心跳傳送目標，以及共用的輸入保持連線/清理生命週期。當平台需要明確的停止訊號時，請新增 `heartbeat.clearTyping(...)`。

如果您的頻道新增了包含媒體來源的 message-tool 參數，請透過 `describeMessageTool(...).mediaSourceParams` 公開這些參數名稱。Core 會使用該明確清單進行沙箱路徑正規化與傳出媒體存取政策，因此外掛不需要針對供應商特定的頭像、附件或封面圖片參數使用 shared-core 特殊案例。建議傳回以動作為鍵值的 map，例如 `{ "set-profile": ["avatarUrl", "avatarPath"] }`，如此不相關的動作就不會繼承另一個動作的媒體參數。對於有意在每個公開動作間共用的參數，扁平陣列依然適用。

如果您的管道需要針對 `message(action="send")` 進行供應商特定的格式調整，請優先使用 `actions.prepareSendPayload(...)`。將原生卡片、區塊、嵌入或其他持久資料放在 `payload.channelData.<channel>` 下，並讓核心透過 outbound/message 配接器執行實際傳送。僅將 `actions.handleAction(...)` 用於傳送，作為無法序列化及重試的 Payload 的相容性後備方案。

如果您的平台在對話 ID 內儲存了額外的範圍，請在插件中使用 `messaging.resolveSessionConversation(...)` 保留該解析邏輯。這是將 `rawId` 對應至基礎對話 ID、可選執行緒 ID、明確的 `baseConversationId` 以及任何 `parentConversationCandidates` 的標準掛鉤。當您回傳 `parentConversationCandidates` 時，請將它們從最窄的父層排列到最寬/基礎的對話。

當外掛程式碼需要正規化類似路由的欄位、將子執行緒與其父路由進行比較，或從 `{ channel, to, accountId, threadId }` 建立穩定的去重金鑰時，請使用 `openclaw/plugin-sdk/channel-route`。此輔助函式會以與核心相同的方式正規化數值型執行緒 ID，因此外掛應優先使用它，而非臨時的 `String(threadId)` 比較。
具有提供者特定目標語法的外掛應公開 `messaging.resolveOutboundSessionRoute(...)`，以便核心在不需要使用解析器填充的情況下取得提供者原生的階段和執行緒身份。

在通道註冊表啟動之前需要相同解析功能的打包外掛，也可以公開頂層 `session-key-api.ts` 檔案，並帶有相符的 `resolveSessionConversation(...)` 匯出。核心僅在執行時外掛註冊表尚無法使用時，才會使用該引導安全的表面。

當外掛程式只需要在通用/原始 ID 之上取得父項後援時，`messaging.resolveParentConversationCandidates(...)` 仍可作為舊版相容性後援使用。如果這兩個 hook 都存在，核心會優先使用 `resolveSessionConversation(...).parentConversationCandidates`，並且僅在正規 hook 省略它們時才會後援至 `resolveParentConversationCandidates(...)`。

## 審核與頻道功能

大多數頻道外掛程式不需要審核專屬的程式碼。

- 核心擁有相同聊天 `/approve`、共用的審核按鈕 payload 以及通用後援傳遞。
- 當頻道需要審核專屬行為時，建議在頻道外掛程式中使用一個 `approvalCapability` 物件。
- `ChannelPlugin.approvals` 已被移除。請將審核傳遞/原生/渲染/驗證事實放在 `approvalCapability` 上。
- `plugin.auth` 僅用於登入/登出；核心不再從該物件讀取審核驗證 hooks。
- `approvalCapability.authorizeActorAction` 和 `approvalCapability.getActionAvailabilityState` 是標準的授權認證縫合點。
- 使用 `approvalCapability.getActionAvailabilityState` 來表示同聊天視窗的授權認證可用性。
- 如果您的通道公開了原生的執行授權，請在發起介面/原生客戶端狀態與同聊天授權認證不同時，使用 `approvalCapability.getExecInitiatingSurfaceState`。核心會使用該特定於執行的掛鉤來區分 `enabled` 與 `disabled`，決定發起通道是否支援原生執行授權，並在原生客戶端回退指導中包含該通道。`createApproverRestrictedNativeApprovalCapability(...)` 會為常見情況填入此設定。
- 使用 `outbound.shouldSuppressLocalPayloadPrompt` 或 `outbound.beforeDeliverPayload` 來處理通道特定的 Payload 生命週期行為，例如隱藏重複的本機授權提示或在發送前輸入指示器。
- 僅將 `approvalCapability.delivery` 用於原生審核路由或後備抑制。
- 將 `approvalCapability.nativeRuntime` 用於通道擁有的原生審核事實。在熱門通道入口點上透過 `createLazyChannelApprovalNativeRuntimeAdapter(...)` 保持延遲加載，這可以按需匯入您的執行時模組，同時仍允許核心組裝審核生命週期。
- 僅當通道確實需要自訂審核負載而非共享渲染器時，才使用 `approvalCapability.render`。
- 當通道希望用停用路徑回覆來解釋啟用原生執行審核所需確切配置選項時，請使用 `approvalCapability.describeExecApprovalSetup`。該 hook 接收 `{ channel, channelLabel, accountId }`；命名帳戶通道應呈現帳戶範圍的路徑（例如 `channels.<channel>.accounts.<id>.execApprovals.*`），而非頂層預設值。
- 如果通道可以從現有配置中推斷出穩定的類似擁有者的 DM 身分，請使用 `openclaw/plugin-sdk/approval-runtime` 中的 `createResolvedApproverActionAuthAdapter` 來限制相同聊天 `/approve`，而無需新增特定於審核的核心邏輯。
- 如果自訂核准授權刻意僅允許相同聊天室的後備方案，請從 `openclaw/plugin-sdk/approval-auth-runtime` 傳回 `markImplicitSameChatApprovalAuthorization({ authorized: true })`；否則核心會將結果視為明確的核准者授權。
- 如果頻道擁有的原生回調直接解析核准，請在解析前使用 `isImplicitSameChatApprovalAuthorization(...)`，以便隱含後備方案仍會透過頻道的正常動作員授權進行。
- 如果頻道需要原生核准傳遞，請將頻道程式碼集中在目標正規化加上傳輸/呈現事實上。使用來自 `openclaw/plugin-sdk/approval-runtime` 的 `createChannelExecApprovalProfile`、`createChannelNativeOriginTargetResolver`、`createChannelApproverDmTargetResolver` 和 `createApproverRestrictedNativeApprovalCapability`。將頻道特定事實放在 `approvalCapability.nativeRuntime` 後面，最好透過 `createChannelApprovalNativeRuntimeAdapter(...)` 或 `createLazyChannelApprovalNativeRuntimeAdapter(...)`，以便核心可以組合處理程式並擁有請求過濾、路由、去重、過期、閘道訂閱以及路由至他處通知。`nativeRuntime` 被分割成幾個較小的縫隙：
- 當通道同時支援會話來源的原生傳遞和明確的審批轉發目標時，請使用來自 `openclaw/plugin-sdk/approval-native-runtime` 的 `createNativeApprovalChannelRouteGates`。該輔助函數集中了審批配置選擇、`mode` 處理、代理/會話過濾器、帳號綁定、會話目標匹配和目標清單匹配，而調用者仍擁有通道 ID、預設轉發模式、帳號查找、傳輸啟用檢查、目標正規化和回合來源目標解析。請勿使用它來建立核心擁有的通道策略預設值；請明確傳遞通道文檔中記錄的預設模式。
- `createChannelNativeOriginTargetResolver` 預設對於 `{ to, accountId, threadId }` 目標使用共用的通道路由匹配器。僅當通道具有提供者特定的等效規則（例如 Slack 時間戳前綴匹配）時，才傳遞 `targetsMatch`。
- 當通道需要在預設路由匹配器或自訂 `targetsMatch` 回調執行前對提供者 ID 進行正規化，同時保留原始目標以進行傳遞時，請將 `normalizeTargetForMatch` 傳遞給 `createChannelNativeOriginTargetResolver`。僅當解析出的傳遞目標本身需要正規化時，才使用 `normalizeTarget`。
- `availability` - 帳號是否已配置以及是否應處理請求
- `presentation` - 將共用的審批視圖模型映射到待處理/已解析/已過期的原生負載或最終操作
- `transport` - 準備目標並發送/更新/刪除原生審批訊息
- `interactions` - 用於原生按鈕或反應的可選 bind/unbind/clear-action 掛鉤，以及一個可選的 `cancelDelivered` 掛鉤。當 `deliverPending` 註冊進程內或持久狀態（例如反應目標存儲）時，實現 `cancelDelivered`，以便在處理程式停止取消交付且 `bindPending` 運行之前，或者當 `bindPending` 未返回句柄時釋放該狀態。
- `observe` - 可選的交付診斷掛鉤
- 如果通道需要運行時擁有的對象（例如客戶端、token、Bolt 應用程式或 webhook 接收器），請通過 `openclaw/plugin-sdk/channel-runtime-context` 註冊它們。通用運行時上下文註冊表允許核心從通道啟動狀態引導能力驅動的處理程式，而無需添加特定於批准的包裝膠水代碼。
- 僅當能力驅動的接縫還不夠具表現力時，才使用底層的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生批准通道必須通過這些輔助程式路由 `accountId` 和 `approvalKind`。`accountId` 將多帳戶批准策略範圍限定為正確的機器人帳戶，而 `approvalKind` 使 exec 與 plugin 批准行為可供通道使用，而無需在核心中進行硬編碼分支。
- 核心現在也擁有批准重新路由通知。通道插件不應從 `createChannelNativeApprovalRuntime` 發送自己的「批准已轉至 DM / 另一個通道」後續訊息；相反，應通過共享的批准能力輔助程式公開準確的來源 + 批准者-DM 路由，並讓核心在將任何通知發回啟動聊天之前聚合實際交付。
- 端到端保留交付的批准 ID 種類。原生客戶端不應
  根據通道本地狀態猜測或重寫 exec 與 plugin 批准路由。
- 不同的批准種類可以有目的地暴露不同的原生表面。
  當前捆綁的範例：
  - Slack 為 exec 和 plugin ID 保留可用的原生批准路由。
  - Matrix 為 exec
    和 plugin 批准保持相同的原生 DM/通道路由和反應 UX，同時仍允許身份驗證根據批准種類而有所不同。
- `createApproverRestrictedNativeApprovalAdapter` 仍作為相容性包裝器存在，但新程式碼應優先使用功能建構器，並在插件上公開 `approvalCapability`。

對於熱門通道進入點，當您僅需要該系列中的某一部分時，請優先使用較狹隘的運行時子路徑：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同樣地，當您不需要更廣泛的總括介面時，請優先使用 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

針對設定：

- `openclaw/plugin-sdk/setup-runtime` 涵蓋了運行時安全的設定輔助程式：
  `createSetupTranslator`、匯入安全的設定修補配接器（`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`）、查詢備註輸出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 以及委派
  的設定代理建構器
- `openclaw/plugin-sdk/setup-runtime` 包含用於
  `createEnvPatchedAccountSetupAdapter` 的環境感知配接器接縫
- `openclaw/plugin-sdk/channel-setup` 涵蓋了可選安裝的設定
  建構器以及一些設定安全的原語：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`，

如果您的通道支援環境驅動的設定或驗證，且通用的啟動/設定流程應在運行時載入之前知道這些環境變數名稱，請在插件清單中使用 `channelEnvVars` 宣告它們。請將通道運行時 `envVars` 或本地常數僅保留給操作員面向的複本。

如果您的頻道可能出現在 `status`、`channels list`、`channels status` 或 SecretRef 掃描中（在插件運行時啟動之前），請在 `package.json` 中新增 `openclaw.setupEntry`。該入口點在唯讀指令路徑中引入應該是安全的，並且應該傳回這些摘要所需的頻道元資料、設定安全的組態介面卡、狀態介面卡和頻道密碼目標元資料。請勿從設定入口啟動用戶端、接聽程式或傳輸運行時。

同樣保持主要頻道匯入路徑的精簡。探索功能可以評估該入口和頻道插件模組以註冊功能，而無需啟動頻道。諸如 `channel-plugin-api.ts` 之類的檔案應匯出頻道插件物件，而不匯入設定精靈、傳輸用戶端、通訊端接聽程式、子處理程序啟動器或服務啟動模組。將這些運行時元件放在從 `registerFull(...)`、運行時設定器或延遲功能介面卡載入的模組中。

`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
`splitSetupEntries`

- 僅當您還需要更繁重的共享設定/組態輔助程式（例如
  `moveSingleAccountChannelSectionToDefaultAccount(...)`）時，才使用更廣泛的 `openclaw/plugin-sdk/setup` 縫隙

如果您的頻道只想在設定介面中宣傳「先安裝此插件」，請偏好使用 `createOptionalChannelSetupSurface(...)`。產生的介面卡/精靈會在組態寫入和定案時失敗關閉，並且它們在驗證、定案和文件連結複製中重複使用相同的需要安裝訊息。

對於其他熱門頻道路徑，請偏好使用狹窄輔助程式，而不是更廣泛的舊版介面：

- `openclaw/plugin-sdk/account-core`、
  `openclaw/plugin-sdk/account-id`、
  `openclaw/plugin-sdk/account-resolution` 和
  `openclaw/plugin-sdk/account-helpers`，用於多帳戶組態
  和預設帳戶後備
- `openclaw/plugin-sdk/inbound-envelope` 和
  `openclaw/plugin-sdk/channel-inbound`，用於入站路由/信封
  和記錄與分派連線
- `openclaw/plugin-sdk/channel-targets`，用於目標解析輔助程式
- `openclaw/plugin-sdk/outbound-media` 用於媒體加載，以及
  `openclaw/plugin-sdk/channel-outbound` 用於傳出身分/發送委託
  和負載規劃
- `buildThreadAwareOutboundSessionRoute(...)` 來自
  `openclaw/plugin-sdk/channel-core`，當傳出路由應保留
  明確的 `replyToId`/`threadId` 或在基礎會話金鑰仍匹配時
  恢復目前的 `:thread:` 會話。當提供者平台
  具有原生傳遞語意時，提供者外掛可以覆寫
  優先順序、後綴行為和執行緒 ID 標準化。
- `openclaw/plugin-sdk/thread-bindings-runtime` 用於執行緒綁定生命週期
  和配接器註冊
- `openclaw/plugin-sdk/agent-media-payload` 僅在仍需要
  舊版代理/媒體負載欄位佈局時
- `openclaw/plugin-sdk/telegram-command-config` 用於 Telegram 自訂指令
  標準化、重複/衝突驗證，以及備援穩定的指令
  設定合約

僅認證通道通常可以在預設路徑停止：核心處理審核，而外掛僅公開傳出/認證功能。原生審核通道（如 Matrix、Slack、Telegram 和自訂聊天傳輸）應使用共用的原生輔助程式，而不是自行建立審核生命週期。

## 傳入提及原則

將傳入提及處理分為兩層：

- 外掛擁有的證據收集
- 共用原則評估

使用 `openclaw/plugin-sdk/channel-mention-gating` 進行提及原則決策。
僅在您需要更廣泛的傳入
輔助程式集合時，才使用 `openclaw/plugin-sdk/channel-inbound`。

適合外掛本機邏輯：

- 回覆機器人偵測
- 引用機器人偵測
- 執行緒參與檢查
- 服務/系統訊息排除
- 證明機器人參與所需的原生平台快取

適合共用輔助程式：

- `requireMention`
- 明確提及結果
- 隱含提及允許清單
- 指令略過
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

`api.runtime.channel.mentions` 為已依賴執行時注入的內建頻道外掛，公開了相同的共享提及輔助函式：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果您只需要 `implicitMentionKindWhen` 和
`resolveInboundMentionDecision`，請從
`openclaw/plugin-sdk/channel-mention-gating` 匯入，以避免載入不相關的入站執行時輔助函式。

使用 `resolveInboundMentionDecision({ facts, policy })` 進行提及閘道處理。

## 逐步指南

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="套件和清單">
    建立標準的外掛檔案。`package.json` 中的
    `channel` 欄位是讓這成為頻道外掛的關鍵。若要完整的套件中繼資料表面，
    請參閱 [外掛設定與組態](/zh-Hant/plugins/sdk-setup#openclaw-channel)：

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
    非頻道帳號設定且由外掛擁有的設定。`channelConfigs`
    會驗證 `channels.acme-chat`，這是外掛執行時載入前，由設定結構描述、設定和 UI 表面使用的冷路徑來源。

  </Step>

  <Step title="建置頻道外掛物件">
    `ChannelPlugin` 介面有許多可選的介面卡表面。從最少的開始——`id` 和 `setup`——並根據需要新增介面卡。

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

    對於同時接受標準頂層 DM 金鑰和舊版巢狀金鑰的頻道，請使用 `plugin-sdk/channel-config-helpers` 中的輔助函式：`resolveChannelDmAccess`、`resolveChannelDmPolicy`、`resolveChannelDmAllowFrom` 和 `normalizeChannelDmPolicy` 會將帳戶本機值保持在繼承的根值之前。透過 `normalizeLegacyDmAliases` 將相同的解析器與 doctor 修復配對，以便執行時和遷移讀取相同的合約。

    <Accordion title="createChatChannelPlugin 為您做什麼">
      您無需手動實作低階介面卡介面，而是傳遞宣告式選項，然後建構器會將其組合起來：

      | 選項 | 連線內容 |
      | --- | --- |
      | `security.dm` | 來自配置欄位的範圍 DM 安全性解析器 |
      | `pairing.text` | 基於文字的 DM 配對流程，包含代碼交換 |
      | `threading` | 回覆模式解析器（固定、帳戶範圍或自訂）|
      | `outbound.attachedResults` | 傳回結果中繼資料（訊息 ID）的傳送函式 |

      如果您需要完全控制，也可以傳遞原始介面卡物件來代替宣告式選項。

      原始輸出介面卡可以定義 `chunker(text, limit, ctx)` 函式。
      可選的 `ctx.formatting` 攜帶傳遞時格式化決策，例如 `maxLinesPerMessage`；在傳送之前應用它，以便透過共用的輸出傳遞一次性解析回覆串接和區塊邊界。傳送內容還包含 `replyToIdSource`（`implicit` 或 `explicit`），當解析了原生回覆目標時，因此輔助函式可以保留明確的回覆標籤，而不消耗隱含的一次性回覆位置。
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

    將通道擁有的 CLI 描述符放在 `registerCliMetadata(...)` 中，這樣 OpenClaw 就可以在不啟動完整通道執行時的情況下，在根層級說明中顯示它們，而正常的完整載入仍會擷取相同的描述符以進行實際的指令註冊。將 `registerFull(...)` 保留給僅執行時的工作。
    如果 `registerFull(...)` 註冊了閘道 RPC 方法，請使用外掛特定的前綴。核心管理命名空間（`config.*`、
    `exec.approvals.*`、`wizard.*`、`update.*`）保留給系統使用，並且總是解析為 `operator.admin`。
    `defineChannelPluginEntry` 會自動處理註冊模式的分割。請參閱
    [進入點](/zh-Hant/plugins/sdk-entrypoints#definechannelpluginentry) 以了解所有選項。

  </Step>

  <Step title="新增設定進入點">
    建立 `setup-entry.ts` 以在入職期間進行輕量級載入：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    當通道停用或未設定時，OpenClaw 會載入此項而非完整進入點。這可避免在設定流程中載入沉重的執行時代碼。詳情請參閱 [設定與配置](/zh-Hant/plugins/sdk-setup#setup-entry)。

    將設定安全的匯出分割到側車模組的捆綁工作區通道，如果還需要明確的設定時執行時設定器，可以使用來自
    `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="處理傳入訊息">
    您的外掛需要接收來自平台的訊息並將其轉發給
    OpenClaw。典型的模式是驗證請求並透過通道的傳入處理程式將其分派的 webhook：

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
    ```

    <Note>
      傳入訊息處理視通道而定。每個通道外掛都擁有自己的傳入管線。請查看捆綁的通道外掛
      （例如 Microsoft Teams 或 Google Chat 外掛套件）以了解實際模式。
    </Note>

  </Step>

<a id="step-6-test"></a>
<Step title="Test">
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

    如需共享測試輔助函數，請參閱 [測試](/zh-Hant/plugins/sdk-testing)。

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
  <Card title="Threading options" icon="git-branch" href="/zh-Hant/plugins/sdk-entrypoints#registration-mode">
    固定、帳戶範圍或自訂回覆模式
  </Card>
  <Card title="Message tool integration" icon="puzzle" href="/zh-Hant/plugins/architecture#channel-plugins-and-the-shared-message-tool">
    describeMessageTool 與動作探索
  </Card>
  <Card title="Target resolution" icon="crosshair" href="/zh-Hant/plugins/architecture-internals#channel-target-resolution">
    inferTargetChatType、looksLikeId、resolveTarget
  </Card>
  <Card title="Runtime helpers" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    透過 api.runtime 進行 TTS、STT、媒體、subagent
  </Card>
  <Card title="Channel inbound API" icon="bolt" href="/zh-Hant/plugins/sdk-channel-inbound">
    共用入站事件生命週期：ingest、resolve、record、dispatch、finalize
  </Card>
</CardGroup>

<Note>某些內建的輔助縫隙仍然存在，用於內建外掛程式的維護與相容性。它們並非新頻道外掛程式的推薦模式；除非您直接維護該內建外掛程式系列，否則建議優先使用來自通用 SDK 介面的通用 channel/setup/reply/runtime 子路徑。</Note>

## 下一步

- [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins) - 如果您的外掛程式也提供模型
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) - 完整的子路徑匯入參考
- [SDK 測試](/zh-Hant/plugins/sdk-testing) - 測試工具與合約測試
- [外掛程式 Manifest](/zh-Hant/plugins/manifest) - 完整的 manifest 綱要

## 相關

- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
- [Agent harness 外掛程式](/zh-Hant/plugins/sdk-agent-harness)
