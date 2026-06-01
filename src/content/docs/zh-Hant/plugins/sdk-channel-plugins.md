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

<Info>如果您之前尚未建立過任何 OpenClaw 外掛程式，請先閱讀 [Getting Started](/zh-Hant/plugins/building-plugins) 以了解基本的套件 結構與 manifest 設定。</Info>

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

新的頻道外掛程式也應該從 `openclaw/plugin-sdk/channel-outbound` 暴露具有 `defineChannelMessageAdapter` 的 `message` 介面卡。該介面卡聲明原生傳輸實際支援的持續性最終發送能力，並將文字/媒體發送指向與舊版 `outbound` 介面卡相同的傳輸功能。僅當合約測試證明原生副作用和回據時，才聲明某項能力。

有關完整的 API 合約、範例、能力矩陣、回據規則、即時預覽最終確定、接收確認策略、測試和遷移表，請參閱 [Channel outbound API](/zh-Hant/plugins/sdk-channel-outbound)。

如果現有的 `outbound` 介面卡已經具備正確的發送方法和能力元數據，請使用 `createChannelMessageAdapterFromOutbound(...)` 來推導 `message` 介面卡，而不是手寫另一個橋接器。

介面卡發送應返回 `MessageReceipt` 值。當相容性程式碼仍需要舊版 id 時，請使用 `listMessageReceiptPlatformIds(...)` 或 `resolveMessageReceiptPrimaryId(...)` 來推導它們，而不是在新的生命週期程式碼中保留並行的 `messageIds` 欄位。

支援預覽的頻道還應聲明 `message.live.capabilities`，並包含其擁有的確切即時生命週期，例如 `draftPreview`、`previewFinalization`、`progressUpdates`、`nativeStreaming` 或 `quietFinalization`。原地確定草稿預覽的頻道還應聲明 `message.live.finalizer.capabilities`，例如 `finalEdit`、`normalFallback`、`discardPending`、`previewReceipt` 和 `retainOnAmbiguousFailure`，並將執行時邏輯通過 `defineFinalizableLivePreviewAdapter(...)` 加上 `deliverWithFinalizableLivePreviewAdapter(...)` 進行路由。保持這些能力由 `verifyChannelMessageLiveCapabilityAdapterProofs(...)` 和 `verifyChannelMessageLiveFinalizerProofs(...)` 測試支援，以便原生預覽、進度、編輯、回退/保留、清理和回據行為不會無聲地發生偏差。

延遲平台確認的傳入接收器應聲明 `message.receive.defaultAckPolicy` 和 `supportedAckPolicies`，而不是將確認時序隱藏在監視器本機狀態中。用 `verifyChannelMessageReceiveAckPolicyAdapterProofs(...)` 覆蓋每個聲明的策略。

舊版回覆輔助函式，例如 `createChannelTurnReplyPipeline`、
`dispatchInboundReplyWithBase` 和 `recordInboundSessionAndDispatchReply`，
仍然可用於相容性分發器。請勿在新的頻道程式碼中使用這些名稱；新外掛應從 `message` 配接器、回條，以及 `openclaw/plugin-sdk/channel-outbound` 上的接收/傳送生命週期輔助函式開始。

正在遷移入站授權的頻道可以使用執行時期接收路徑中的實驗性
`openclaw/plugin-sdk/channel-ingress-runtime` 子路徑。該子路徑將平台查詢和副作用保留在外掛中，同時
共用允許清單狀態解析、路由/傳送者/指令/事件/啟用
決策、編輯診斷以及回合准入對應。請將外掛身分識別正規化保留在您傳遞給解析器的描述符中；請勿
序列化來自已解析狀態或決策的原始符合值。請參閱
[Channel ingress API](/zh-Hant/plugins/sdk-channel-ingress) 以了解 API 設計、
擁有權邊界和測試預期。

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
- `createChannelNativeOriginTargetResolver` 預設針對 `{ to, accountId, threadId }` 目標使用共享的通道路由匹配器。僅當通道具有供應商特定的等效性規則（例如 Slack 時間戳記前綴匹配）時，才傳遞 `targetsMatch`。
- 當通道需要在預設路由匹配器或自訂 `targetsMatch` 回呼執行之前對供應商 ID 進行正規化，同時保留原始目標以進行傳遞時，請將 `normalizeTargetForMatch` 傳遞給 `createChannelNativeOriginTargetResolver`。僅當解析出的傳遞目標本身需要進行正規化時，才使用 `normalizeTarget`。
- `availability` - 帳號是否已設定以及是否應處理請求
- `presentation` - 將共享的核准視圖模型映射為待處理/已解析/已過期的原生承載或最終動作
- `transport` - 準備目標加上傳送/更新/刪除原生核准訊息
- `interactions` - 針對原生按鈕或反應的可選綁定/解除綁定/清除動作掛勾，以及一個可選的 `cancelDelivered` 掛勾。當 `deliverPending` 註冊處理程序內或持久狀態（例如反應目標儲存）時，請實作 `cancelDelivered`，以便在處理程序停止於 `bindPending` 執行前取消傳遞，或當 `bindPending` 未傳回控制代碼時，能夠釋放該狀態
- `observe` - 可選的傳遞診斷掛勾
- 如果通道需要執行時期擁有的物件（例如用戶端、權杖、Bolt 應用程式或 webhook 接收器），請透過 `openclaw/plugin-sdk/channel-runtime-context` 進行註冊。通用執行時期內容登錄檔可讓核心從通道啟動狀態啟動驅動能力的處理程序，而無需新增特定於核准的包裝膠水程式碼。
- 僅當驅動能力的接縫還不夠具表達性時，才使用底層的 `createChannelApprovalHandler` 或 `createChannelNativeApprovalRuntime`。
- 原生審批通道必須將 `accountId` 和 `approvalKind` 都透過這些輔助函式進行路由。`accountId` 將多帳號審批策略保持在正確的機器人帳號範圍內，而 `approvalKind` 則讓執行與外掛審批行為對通道可用，而無需在核心中進行硬式編碼分支。
- 核心現在也擁有審批重新路由通知。通道外掛不應從 `createChannelNativeApprovalRuntime` 發送自己的「審批已轉至 DM / 另一個通道」後續訊息；相反地，應透過共享審批能力輔助函式揭露準確的來源 + 審批者 DM 路由，並讓核心在將任何通知發回給發起的聊天之前彙總實際傳遞。
- 端對端保留傳遞的審批 ID 類型。原生客戶端不應根據通道本機狀態推測或重寫執行與外掛審批路由。
- 不同的審批類型可以刻意揭露不同的原生介面。
  目前內建的範例：
  - Slack 讓執行和外掛 ID 都能使用原生審批路由。
  - Matrix 對於執行和外掛審批保持相同的原生 DM/通道路由和互動 UX，同時仍允許驗證依審批類型而異。
- `createApproverRestrictedNativeApprovalAdapter` 作為相容性包裝函式仍然存在，但新程式碼應偏好使用能力建構器，並在外掛上揭露 `approvalCapability`。

對於熱門通道進入點，當您只需要該系列的其中一部分時，請偏好使用較窄的執行時子路徑：

- `openclaw/plugin-sdk/approval-auth-runtime`
- `openclaw/plugin-sdk/approval-client-runtime`
- `openclaw/plugin-sdk/approval-delivery-runtime`
- `openclaw/plugin-sdk/approval-gateway-runtime`
- `openclaw/plugin-sdk/approval-handler-adapter-runtime`
- `openclaw/plugin-sdk/approval-handler-runtime`
- `openclaw/plugin-sdk/approval-native-runtime`
- `openclaw/plugin-sdk/approval-reply-runtime`
- `openclaw/plugin-sdk/channel-runtime-context`

同樣地，當您不需要更廣泛的總括介面時，請偏好 `openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/setup-runtime`、
`openclaw/plugin-sdk/reply-runtime`、
`openclaw/plugin-sdk/reply-dispatch-runtime`、
`openclaw/plugin-sdk/reply-reference` 和
`openclaw/plugin-sdk/reply-chunking`。

特別針對設定：

- `openclaw/plugin-sdk/setup-runtime` 涵蓋了執行時期安全的設定輔助函式：
  `createSetupTranslator`、匯入安全的設定修補配接器 (`createPatchedAccountSetupAdapter`、
  `createEnvPatchedAccountSetupAdapter`、
  `createSetupInputPresenceValidator`)、lookup-note 輸出、
  `promptResolvedAllowFrom`、`splitSetupEntries` 以及委派
  的設定代理建構器
- `openclaw/plugin-sdk/setup-runtime` 包含了 `createEnvPatchedAccountSetupAdapter` 的環境感知配接器縫隙
- `openclaw/plugin-sdk/channel-setup` 涵蓋了可選安裝的設定
  建構器以及幾個設定安全的基元：
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`，

如果您的頻道支援環境驅動的設定或驗證，且一般的啟動/設定流程應在執行時期載入前就知道那些環境變數名稱，請在插件清單中使用 `channelEnvVars` 宣告它們。請僅將頻道執行時期的 `envVars` 或本機常數用於操作員面向的複製內容。

如果您的頻道可以在插件執行時期啟動前出現在 `status`、`channels list`、`channels status` 或
SecretRef 掃描中，請在 `package.json` 中新增 `openclaw.setupEntry`。該進入點應該可以安全地在唯讀指令路徑中匯入，並且應該回傳這些摘要所需的頻道中繼資料、設定安全的設定配接器、狀態配接器以及頻道密鑰目標中繼資料。請勿從設定進入點啟動客戶端、監聽器或傳輸執行時期。

請保持主要頻道進入點的匯入路徑精簡。探索機制可以評估進入點和頻道插件模組以註冊功能，而無需啟動頻道。諸如 `channel-plugin-api.ts` 之類的檔案應該匯出頻道
插件物件，而不匯入設定精靈、傳輸客戶端、通訊端
監聽器、子程序啟動器或服務啟動模組。請將這些執行時期
部分放在從 `registerFull(...)`、執行時期設定器或延遲
功能配接器載入的模組中。

`createOptionalChannelSetupWizard`、`DEFAULT_ACCOUNT_ID`、
`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled` 和
`splitSetupEntries`

- 僅當您同時需要較繁重的共用設定/設定輔助程式時，才使用較廣泛的 `openclaw/plugin-sdk/setup` seam，例如 `moveSingleAccountChannelSectionToDefaultAccount(...)`

如果您的頻道只想在設定介面上宣傳「先安裝此外掛程式」，請偏好使用 `createOptionalChannelSetupSurface(...)`。產生的配接器/精靈在設定寫入和完成時會採取封閉式失敗，並且在驗證、完成和文件連結複製之間重複使用相同的安裝必要訊息。

對於其他熱門頻道路徑，請偏好使用狹窄的輔助程式，而非較廣泛的舊版介面：

- `openclaw/plugin-sdk/account-core`、`openclaw/plugin-sdk/account-id`、`openclaw/plugin-sdk/account-resolution` 和 `openclaw/plugin-sdk/account-helpers` 用於多帳戶設定和預設帳戶後援
- `openclaw/plugin-sdk/inbound-envelope` 和 `openclaw/plugin-sdk/channel-inbound` 用於傳入路由/信封和記錄與分派連線
- `openclaw/plugin-sdk/channel-targets` 用於目標解析輔助程式
- `openclaw/plugin-sdk/outbound-media` 用於媒體載入，以及 `openclaw/plugin-sdk/channel-outbound` 用於傳出身分識別/傳送委派和負載規劃
- 當傳出路由應保留明確的 `replyToId`/`threadId`，或在基底會話金鑰仍相符時恢復目前的 `:thread:` 會話時，請從 `openclaw/plugin-sdk/channel-core` 使用 `buildThreadAwareOutboundSessionRoute(...)`。當提供者外掛程式的平台具備原生執行緒傳遞語意時，它們可以覆寫優先順序、後置詞行為和執行緒 ID 正規化。
- `openclaw/plugin-sdk/thread-bindings-runtime` 用於執行緒繫結生命週期和配接器註冊
- 僅當仍然需要舊版代理程式/媒體負載欄位版面配置時，才使用 `openclaw/plugin-sdk/agent-media-payload`
- `openclaw/plugin-sdk/telegram-command-config` 用於 Telegram 自訂指令正規化、重複/衝突驗證，以及後援穩定指令設定合約

僅驗證頻道通常可以在預設路徑停止：核心處理核准，外掛程式僅公開傳出/驗證功能。原生核准頻道（例如 Matrix、Slack、Telegram 和自訂聊天傳輸）應該使用共用的原生輔助程式，而不是自行推出核准生命週期。

## 傳入提及原則

將傳入提及處理保持分為兩個層級：

- 外掛程式擁有的證據收集
- 共享原則評估

將 `openclaw/plugin-sdk/channel-mention-gating` 用於提及原則決策。
僅當您需要更廣泛的傳入輔助工具庫時，才使用 `openclaw/plugin-sdk/channel-inbound`。

適用於外掛程式本機邏輯：

- 回覆機器人偵測
- 引用機器人偵測
- 執行緒參與檢查
- 服務/系統訊息排除
- 證明機器人參與所需的平台原生快取

適用於共享輔助工具：

- `requireMention`
- 明確提及結果
- 隱含提及允許清單
- 指令略過
- 最終略過決策

首選流程：

1. 計算本機提及事實。
2. 將這些事實傳遞給 `resolveInboundMentionDecision({ facts, policy })`。
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

`api.runtime.channel.mentions` 為已經依賴執行時期插入的隨附通道外掛程式公開相同的共享提及輔助工具：

- `buildMentionRegexes`
- `matchesMentionPatterns`
- `matchesMentionWithExplicit`
- `implicitMentionKindWhen`
- `resolveInboundMentionDecision`

如果您只需要 `implicitMentionKindWhen` 和
`resolveInboundMentionDecision`，請從
`openclaw/plugin-sdk/channel-mention-gating` 匯入，以避免載入無關的傳入
執行時期輔助工具。

使用 `resolveInboundMentionDecision({ facts, policy })` 進行提及閘道控制。

## 逐步指南

<Steps>
  <a id="step-1-package-and-manifest"></a>
  <Step title="Package and manifest">
    建立標準外掛程式檔案。`package.json` 中的 `channel` 欄位
    是使其成為通道外掛程式的關鍵。如需完整的套件元資料介面，
    請參閱 [外掛程式設定與設定檔](/zh-Hant/plugins/sdk-setup#openclaw-channel)：

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
    不屬於通道帳號設定檔的外掛程式擁有設定。`channelConfigs`
    會驗證 `channels.acme-chat`，並且是設定檔結構描述、設定和
    UI 介面在外掛程式執行時期載入之前使用的冷路徑來源。

  </Step>

  <Step title="建構頻道外掛物件">
    `ChannelPlugin` 介面有許多可選的介面卡表面。請從最基本的部分開始——`id` 和 `setup`——然後根據需要新增介面卡。

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

    對於同時接受標準頂層 DM 金鑰和舊版巢狀金鑰的頻道，請使用 `plugin-sdk/channel-config-helpers` 中的輔助函式：`resolveChannelDmAccess`、`resolveChannelDmPolicy`、`resolveChannelDmAllowFrom` 和 `normalizeChannelDmPolicy` 會將帳戶本地的值保持在繼承的根值之前。透過 `normalizeLegacyDmAliases` 將相同的解析器與 doctor 修復配對，以便執行時和遷移讀取相同的合約。

    <Accordion title="createChatChannelPlugin 為您做什麼">
      您無需手動實作低階介面卡介面，只需傳遞宣告式選項，建構器就會將它們組合起來：

      | 選項 | 它連接什麼 |
      | --- | --- |
      | `security.dm` | 來自設定欄位的範圍 DM 安全性解析器 |
      | `pairing.text` | 基於文字的 DM 配對流程，含程式碼交換 |
      | `threading` | 回覆模式解析器 (固定、帳戶範圍或自訂) |
      | `outbound.attachedResults` | 傳回結果中繼資料 (訊息 ID) 的傳送函式 |

      如果您需要完全控制，也可以傳遞原始介面卡物件來代替宣告式選項。

      原始輸出介面卡可以定義 `chunker(text, limit, ctx)` 函式。
      可選的 `ctx.formatting` 携帶傳送時的格式決策，例如 `maxLinesPerMessage`；請在傳送前套用它，以便回覆主題和區塊邊界由共用的輸出傳遞解析一次。
      當解析了原生回覆目標時，傳送內容也包含 `replyToIdSource` (`implicit` 或 `explicit`)，因此輔助函式可以保留明確的回覆標籤，而不消耗隱含的一次性回援位置。
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
    而正常的完整載入仍然會獲取相同的描述符以進行實際的命令
    註冊。將 `registerFull(...)` 用於僅限運行時的工作。
    如果 `registerFull(...)` 註冊網關 RPC 方法，請使用
    外掛特定的前綴。核心管理命名空間 (`config.*`,
    `exec.approvals.*`, `wizard.*`, `update.*`) 保留並且總是
    解析為 `operator.admin`。
    `defineChannelPluginEntry` 會自動處理註冊模式的分割。請參閱
    [Entry Points](/zh-Hant/plugins/sdk-entrypoints#definechannelpluginentry) 以了解所有
    選項。

  </Step>

  <Step title="新增設定進入點">
    建立 `setup-entry.ts` 以便在引導過程中進行輕量級載入：

    ```typescript setup-entry.ts
    import { defineSetupPluginEntry } from "openclaw/plugin-sdk/channel-core";
    import { acmeChatPlugin } from "./src/channel.js";

    export default defineSetupPluginEntry(acmeChatPlugin);
    ```

    當通道被停用或未設定時，OpenClaw 會載入此項目而非完整進入點。
    這避免了在設定流程中引入繁重的運行時代碼。
    詳情請參閱 [Setup and Config](/zh-Hant/plugins/sdk-setup#setup-entry)。

    將設定安全的匯出分割到側車模組的捆綁工作區通道，如果它們同時需要
    明確的設定時運行時設定器，可以使用來自
    `openclaw/plugin-sdk/channel-entry-contract` 的 `defineBundledChannelSetupEntry(...)`。

  </Step>

  <Step title="處理傳入訊息">
    您的外掛需要從平台接收訊息並將其轉發給
    OpenClaw。典型的模式是一個驗證請求並
    通過您通道的傳入處理程序分發它的 webhook：

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
      傳入訊息處理因通道而異。每個通道外掛擁有
      其自己的傳入管道。請查看捆綁的通道外掛
      (例如 Microsoft Teams 或 Google Chat 外掛套件) 以了解實際模式。
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

    若需共享測試輔助程式，請參閱 [測試](/zh-Hant/plugins/sdk-testing)。

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
    inferTargetChatType, looksLikeId, resolveTarget
  </Card>
  <Card title="Runtime helpers" icon="settings" href="/zh-Hant/plugins/sdk-runtime">
    透過 api.runtime 進行 TTS、STT、媒體、subagent
  </Card>
  <Card title="Channel inbound API" icon="bolt" href="/zh-Hant/plugins/sdk-channel-inbound">
    共用輸入事件生命週期：ingest、resolve、record、dispatch、finalize
  </Card>
</CardGroup>

<Note>部分附帶的輔助縫隙仍然存在於附帶外掛的維護與相容性用途。它們不是新頻道外掛的推薦模式；除非您直接維護該附帶外掛系列，否則請優先使用通用 SDK 表面中的 channel/setup/reply/runtime 子路徑。</Note>

## 後續步驟

- [供應商外掛](/zh-Hant/plugins/sdk-provider-plugins) - 如果您的外掛也提供模型
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) - 完整的子路徑匯入參考
- [SDK 測試](/zh-Hant/plugins/sdk-testing) - 測試工具與合約測試
- [外掛清單](/zh-Hant/plugins/manifest) - 完整的清單架構

## 相關

- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
- [Agent harness 外掛程式](/zh-Hant/plugins/sdk-agent-harness)
