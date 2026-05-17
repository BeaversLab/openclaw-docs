---
summary: "Plugin SDK 子路徑目錄：依區域分組的 import 位置"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路徑"
---

外掛程式 SDK 以 `openclaw/plugin-sdk/` 下的一組狹窄的公用子路徑公開。此頁面按用途分類列出了常用的子路徑。生成的編譯器入口點清單位於 `scripts/lib/plugin-sdk-entrypoints.json`；套件匯出是從 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的儲存庫本機測試/內部子路徑中扣除後的公用子集。維護者可以使用 `pnpm plugin-sdk:surface` 審查公用匯出數量，並使用 `pnpm plugins:boundary-report:summary` 審查作用中保留的輔助子路徑；未使用的保留輔助匯出會導致 CI 報告失敗，而不是作為休眠的相容性債務保留在公用 SDK 中。

關於外掛程式撰寫指南，請參閱 [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)。

## 外掛進入點

| 子路徑                         | 主要匯出                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                                    |
| `plugin-sdk/core`              | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`, `buildJsonChannelConfigSchema` |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                                                       |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                                                      |
| `plugin-sdk/migration`         | 遷移提供者項目輔助工具，例如 `createMigrationItem`、原因常數、項目狀態標記、編修輔助工具以及 `summarizeMigrationItems`                                                 |
| `plugin-sdk/migration-runtime` | 執行時期遷移輔助工具，例如 `copyMigrationFileItem`、`withCachedMigrationConfigRuntime` 和 `writeMigrationReport`                                                       |

### 已棄用的相容性和測試輔助工具

這些子路徑保留作為較舊外掛程式和 OpenClaw 測試套件的套件匯出，但新程式碼不應從它們新增匯入：`agent-runtime-test-contracts`、`channel-contract-testing`、`channel-target-testing`、`channel-test-helpers`、`plugin-test-api`、`plugin-test-contracts`、`provider-http-test-mocks`、`provider-test-contracts`、`test-env`、`test-fixtures`、`test-node-mocks`、`testing`、`channel-runtime`、`compat`、`config-types`、`infra-runtime`、`text-runtime` 和 `zod`。在新外掛程式碼中，請直接從 `zod` 匯入 `zod`。`plugin-test-runtime` 仍然是一個有效的專注測試輔助子路徑。

### 保留的綑綁外掛輔助子路徑

這些子路徑是外掛程式擁有的相容性介面，保留給其擁有的綑綁外掛程式使用，而非一般的 SDK API：`plugin-sdk/codex-mcp-projection` 和 `plugin-sdk/codex-native-task-runtime`。跨擁有者的擴充匯入會被套件合約防護機制封鎖。

### 已棄用的未使用公開子路徑

這些公開子路徑已存在至少一個月，且目前沒有打包擴充功能的正式匯入。為了相容性，它們仍可匯入，但新的外掛程式碼應改用專注且被積極使用的 SDK 子路徑：`agent-config-primitives`、`channel-config-schema-legacy`、
`channel-reply-pipeline`、`channel-runtime`、`channel-secret-runtime`、
`command-auth`、`compat`、`config-runtime`、`config-schema`、`discord`、
`group-access`、`infra-runtime`、`matrix`、`mattermost`、
`media-generation-runtime-shared`、`memory-core-engine-runtime`、
`memory-core-host-multimodal`、`memory-core-host-query`、
`music-generation-core`、`self-hosted-provider-setup`、`telegram-account`、
`telegram-command-config` 和 `zalouser`。

### 已棄用的罕見公開子路徑

目前僅被一兩個打包外掛擁有者使用的公開子路徑，在新的外掛程式碼中也被視為已棄用。為了相容性，它們保留為套件匯出，但新程式碼應優先選用積極共用的 SDK 縫隙或外掛擁有的套件 API。維護者在 `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` 中追蹤確切的集合，並使用 `pnpm plugin-sdk:surface` 追蹤目前的配額。

### 已棄用的寬泛匯出檔案

這些廣泛的重新匯出 barrel 檔案仍可供 OpenClaw 原始碼和相容性檢查建置使用，但新程式碼應優先使用專注的 SDK 子路徑：
`agent-runtime`、`channel-lifecycle`、`channel-runtime`、`cli-runtime`、
`compat`、`config-types`、`conversation-runtime`、`hook-runtime`、
`infra-runtime`、`media-runtime`、`plugin-runtime`、`security-runtime` 和
`text-runtime`。`channel-runtime`、`compat`、`config-types`、`infra-runtime`
和 `text-runtime` 僅為了向後相容性而保留為 package exports；請改用
專注的 channel/runtime 子路徑，即 `config-contracts`、`string-coerce-runtime`、
`text-chunking`、`text-utility-runtime` 和 `logging-core`。

<AccordionGroup>
  <Accordion title="頻道子路徑">
    | 子路徑 | 主要匯出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 匯出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 外掛擁有 schema 的快取 JSON Schema 驗證輔助函式 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共用設定精靈輔助函式、允許清單提示、設定狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已棄用的相容性別名；請使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/操作閘道輔助函式、預設帳號後援輔助函式 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化輔助函式 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後援輔助函式 |
    | `plugin-sdk/account-helpers` | 狹窄的帳號列表/帳號操作輔助函式 |
    | `plugin-sdk/access-groups` | 存取群組允許清單解析與編輯群組診斷輔助函式 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 舊版回覆管線輔助函式。新的頻道回覆管線程式碼應使用 `createChannelMessageReplyPipeline` 與 `resolveChannelMessageSourceReplyDeliveryMode` (來自 `plugin-sdk/channel-message`)。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共用頻道設定 schema 基本型別，加上 Zod 與直接 JSON/TypeBox 建構器 |
    | `plugin-sdk/bundled-channel-config-schema` | 僅供維護中內建外掛使用的內建 OpenClaw 頻道設定 schemas |
    | `plugin-sdk/channel-config-schema-legacy` | 已棄用的內建頻道設定 schema 相容性別名 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助函式，含內建合約後援 |
    | `plugin-sdk/command-gating` | 狹窄的指令授權閘道輔助函式 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已棄用的低階頻道入口相容性外觀。新的接收路徑應使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 實驗性的高階頻道入口執行時解析器與路由事實建構器，用於已遷移的頻道接收路徑。相比在每個外掛中自行組裝有效允許清單、指令允許清單與舊版投影，建議優先使用此處。請參閱 [Channel ingress API](/zh-Hant/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, `createChannelRunQueue`，以及舊版草稿串流生命週期輔助函式。新的預覽定稿程式碼應使用 `plugin-sdk/channel-message`。 |
    | `plugin-sdk/channel-message` | 輕量級訊息生命週期合約輔助函式，例如 `defineChannelMessageAdapter`, `createChannelMessageAdapterFromOutbound`, `createChannelMessageReplyPipeline`, `createReplyPrefixContext`, `resolveChannelMessageSourceReplyDeliveryMode`、持久最終能力衍生、用於發送/接收/副作用能力的能力證明輔助函式、`MessageReceiveContext`、接收確認原則證明、`defineFinalizableLivePreviewAdapter`、`deliverWithFinalizableLivePreviewAdapter`、即時預覽與即時定稿器能力證明、持久恢復狀態、`RenderedMessageBatch`、訊息接收類型與接收 ID 輔助函式。請參閱 [Channel message API](/zh-Hant/plugins/sdk-channel-message)。舊版回覆發送外觀僅供相容性保留並已棄用。 |
    | `plugin-sdk/channel-message-runtime` | 可能載入出站傳送的執行時傳送輔助函式，包括 `deliverInboundReplyWithMessageSendContext`, `sendDurableMessageBatch` 與 `withDurableMessageSendContext`。已棄用的回覆發送橋接器仍可供相容性發送器匯入。請從監控/發送執行時模組使用，而非熱外掛啟動檔案。 |
    | `plugin-sdk/inbound-envelope` | 共用入站路由 + 信封建構器輔助函式 |
    | `plugin-sdk/inbound-reply-dispatch` | 舊版共用入站記錄與發送輔助函式、可見/最終發送述詞，以及為已準備頻道發送器提供的已棄用 `deliverDurableInboundReplyPayload` 相容性。新的頻道接收/發送程式碼應從 `plugin-sdk/channel-message-runtime` 匯入執行時生命週期輔助函式。 |
    | `plugin-sdk/messaging-targets` | 目標解析/匹配輔助函式 |
    | `plugin-sdk/outbound-media` | 共用出站媒體載入輔助函式 |
    | `plugin-sdk/outbound-send-deps` | 供頻道介接卡使用的輕量級出站發送相依性查詢 |
    | `plugin-sdk/outbound-runtime` | 出站身分、發送委派、工作階段、格式化與承載規劃輔助函式。直接傳送輔助函式 (如 `deliverOutboundPayloads`) 為已棄用的相容性基底；新的發送路徑請使用 `plugin-sdk/channel-message-runtime`。 |
    | `plugin-sdk/poll-runtime` | 狹窄的投票正規化輔助函式 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒綁定生命週期與介接卡輔助函式 |
    | `plugin-sdk/agent-media-payload` | 舊版代理程式媒體承載建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒綁定、配對與已設定綁定輔助函式 |
    | `plugin-sdk/runtime-config-snapshot` | 執行時設定快照輔助函式 |
    | `plugin-sdk/runtime-group-policy` | 執行時群組原則解析輔助函式 |
    | `plugin-sdk/channel-status` | 共用頻道狀態快照/摘要輔助函式 |
    | `plugin-sdk/channel-config-primitives` | 狹窄的頻道設定 schema 基本型別 |
    | `plugin-sdk/channel-config-writes` | 頻道設定寫入授權輔助函式 |
    | `plugin-sdk/channel-plugin-common` | 共用頻道外掛前導匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助函式 |
    | `plugin-sdk/group-access` | 共用群組存取決策輔助函式 |
    | `plugin-sdk/direct-dm` | 共用直接 DM 認證/防護輔助函式 |
    | `plugin-sdk/discord` | 已棄用的 Discord 相容性外觀，用於已發布的 `@openclaw/discord@2026.3.13` 與追蹤的擁有者相容性；新外掛應使用通用頻道 SDK 子路徑 |
    | `plugin-sdk/telegram-account` | 已棄用的 Telegram 帳號解析相容性外觀，用於追蹤的擁有者相容性；新外掛應使用注入的執行時輔助函式或通用頻道 SDK 子路徑 |
    | `plugin-sdk/zalouser` | 已棄用的 Zalo Personal 相容性外觀，用於仍匯入發送者指令授權的已發布 Lark/Zalo 套件；新外掛應使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 語意訊息呈現、傳送與舊版互動式回覆輔助函式。請參閱 [Message Presentation](/zh-Hant/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 入站去彈、提及匹配、提及原則輔助函式與信封輔助函式的相容性集合桶 |
    | `plugin-sdk/channel-inbound-debounce` | 狹窄的入站去彈輔助函式 |
    | `plugin-sdk/channel-mention-gating` | 狹窄的提及原則、提及標記與提及文字輔助函式 (不包含較廣泛的入站執行時介面) |
    | `plugin-sdk/channel-envelope` | 狹窄的入站信封格式化輔助函式 |
    | `plugin-sdk/channel-location` | 頻道位置內容與格式化輔助函式 |
    | `plugin-sdk/channel-logging` | 供入站丟棄與輸入/確認失敗使用的頻道日誌輔助函式 |
    | `plugin-sdk/channel-send-result` | 回覆結果型別 |
    | `plugin-sdk/channel-actions` | 頻道訊息操作輔助函式，加上為外掛相容性保留的已棄用原生 schema 輔助函式 |
    | `plugin-sdk/channel-route` | 共用路由正規化、解析器驅動的目標解析、執行緒 ID 字串化、路由鍵去重/壓縮、已解析目標型別與路由/目標比較輔助函式 |
    | `plugin-sdk/channel-targets` | 目標解析輔助函式；路由比較的呼叫端應使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 頻道合約型別 |
    | `plugin-sdk/channel-feedback` | 意見反應/反應接線 |
    | `plugin-sdk/channel-secret-runtime` | 狹窄的祕密合約輔助函式，例如 `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment`，以及祕密目標型別 |
  </Accordion>

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支援用於設定、目錄探索和執行時模型準備的 LM Studio provider facade | | `plugin-sdk/lmstudio-runtime` | 支援用於本地伺服器預設值、模型探索、請求標頭和已載入模型輔助函式的 LM Studio 執行時 facade | | `plugin-sdk/provider-setup` | 精選的本地/自託管 provider
  設定輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自託管 provider 設定輔助函式 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + watchdog 常數 | | `plugin-sdk/provider-auth-runtime` | 用於 provider 外掛的執行時 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | API 金鑰入門/設定檔寫入輔助函式，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` |
  標準 OAuth auth-result builder | | `plugin-sdk/provider-env-vars` | Provider auth 環境變數查詢輔助函式 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`、已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/provider-model-shared` |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用的 replay-policy builders、provider-endpoint 輔助函式，以及共用的 model-id 正規化輔助函式 | | `plugin-sdk/provider-catalog-runtime` | Provider 目錄擴充執行時 hook 和用於合約測試的外掛 provider 註冊縫隙 | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 provider HTTP/端點能力輔助函式、provider HTTP 錯誤，以及音訊轉錄 multipart form 輔助函式 | | `plugin-sdk/provider-web-fetch-contract` | 狹義的 web-fetch 設定/選擇合約輔助函式，例如
  `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web-fetch provider 註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 針對不需要外掛啟用連線的 providers 的狹義 web-search 設定/憑證輔助函式 | | `plugin-sdk/provider-web-search-contract` | 狹義的 web-search 設定/憑證合約輔助函式，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及範圍限定憑證的 setters/getters | | `plugin-sdk/provider-web-search` | Web-search provider 註冊/快取/執行時輔助函式 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks` 以及 Gemini schema 清理 + 診斷 | | `plugin-sdk/provider-usage` |
  `fetchClaudeUsage` 及類似內容 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、stream wrapper types，以及共用的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot wrapper 輔助函式 | | `plugin-sdk/provider-transport-runtime` | 原生 provider 傳輸輔助函式，例如受防護的
  fetch、傳輸訊息轉換和可寫入的傳輸事件串流 | | `plugin-sdk/provider-onboard` | Onboarding 設定修補輔助函式 | | `plugin-sdk/global-singleton` | 程序本地的 singleton/map/cache 輔助函式 | | `plugin-sdk/group-activation` | 狹義的群組啟用模式和命令解析輔助函式 |
</Accordion>

<Accordion title="驗證與安全性子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`、指令註冊輔助函式，包括動態參數選單格式化與傳送者授權輔助函式 | | `plugin-sdk/command-status` | 指令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 與 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 核准者解析與同個聊天室動作授權輔助函式 | | `plugin-sdk/approval-client-runtime` |
  原生執行核准設定檔/過濾器輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 原生核准能力/交付介面卡 | | `plugin-sdk/approval-gateway-runtime` | 共用核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 針對熱通道進入點的輕量級原生核准介面卡載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 較廣泛的核准處理器執行時輔助函式；當足夠時，優先使用較狹窄的介面卡/閘道接縫 | |
  `plugin-sdk/approval-native-runtime` | 原生核准目標與帳號繫結輔助函式 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛核准回應有效負載輔助函式 | | `plugin-sdk/approval-runtime` | 執行/外掛核准有效負載輔助函式、原生核准路由/執行時輔助函式，以及結構化核准顯示輔助函式，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 狹窄的入站回應去重重設輔助函式 | |
  `plugin-sdk/channel-contract-testing` | 狹窄的通道合約測試輔助函式，不含廣泛的測試匯入檔 | | `plugin-sdk/command-auth-native` | 原生指令授權、動態參數選單格式化與原生工作階段目標輔助函式 | | `plugin-sdk/command-detection` | 共用指令偵測輔助函式 | | `plugin-sdk/command-primitives-runtime` | 針對熱通道路徑的輕量級指令文字述詞 | | `plugin-sdk/command-surface` | 指令主體正規化與指令介面輔助函式 | |
  `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 針對通道/外掛機密介面的狹窄機密合約集合輔助函式 | | `plugin-sdk/secret-ref-runtime` | 針對機密合約/設定解析的狹窄 `coerceSecretRef` 與 SecretRef 型別輔助函式 | | `plugin-sdk/security-runtime` | 共用信任、DM 閘控、以 root
  為界的檔案/路徑輔助函式，包括僅建立寫入、同步/非同步原子檔案取代、同層級暫存寫入、跨裝置移動後援、私有檔案儲存輔助函式、符號連結父層防護、外部內容、敏感文字編修、常數時間機密比較與機密集合輔助函式 | | `plugin-sdk/ssrf-policy` | 主機允許清單與私有網路 SSRF 原則輔助函式 | | `plugin-sdk/ssrf-dispatcher` | 不含廣泛基礎架構執行時介面的狹窄釘選派發器輔助函式 | | `plugin-sdk/ssrf-runtime` |
  釘選派發器、SSRF 防護擷取、SSRF 錯誤與 SSRF 原則輔助函式 | | `plugin-sdk/secret-input` | 機密輸入解析輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助函式與原始 websocket/主體強制轉換 | | `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助函式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | 廣泛的 runtime/logging/backup/plugin-install 輔助程式 | | `plugin-sdk/runtime-env` | 狹義的 runtime 環境、logger、逾時、重試與退避輔助程式 | | `plugin-sdk/browser-config` | 用於已標準化 profile/defaults、CDD URL 解析與瀏覽器控制認證輔助程式的支援瀏覽器 config 外觀 | | `plugin-sdk/codex-mcp-projection` | 保留的內建 Codex
  輔助程式，用於將使用者 MCP server config 投射至 Codex thread config；不適用於第三方外掛 | | `plugin-sdk/codex-native-task-runtime` | 保留的內建 Codex 輔助程式，用於原生任務鏡像/runtime 連線；不適用於第三方外掛 | | `plugin-sdk/channel-runtime-context` | 泛型 channel runtime-context 註冊與查詢輔助程式 | | `plugin-sdk/matrix` | 已淘汰的 Matrix 相容性外觀，用於舊版第三方 channel
  套件；新外掛應直接匯入 `plugin-sdk/run-command` | | `plugin-sdk/mattermost` | 已淘汰的 Mattermost 相容性外觀，用於舊版第三方 channel 套件；新外掛應直接匯入泛型 SDK 子路徑 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共用的外掛 command/hook/http/interactive 輔助程式 | | `plugin-sdk/hook-runtime` | 共用的 webhook/internal hook 管線輔助程式 | |
  `plugin-sdk/lazy-runtime` | 延遲 runtime import/binding 輔助程式，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 與 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Process exec 輔助程式 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、引數叫用與延遲 command 群組輔助程式 | | `plugin-sdk/gateway-runtime` | Gateway 用戶端、就緒於事件迴圈的用戶端啟動輔助程式、gateway
  CLI RPC、gateway 協定錯誤與 channel 狀態修補輔助程式 | | `plugin-sdk/config-contracts` | 僅限類型的專用 config 表面，用於外掛 config 形狀，例如 `OpenClawConfig` 與 channel/provider config 類型 | | `plugin-sdk/plugin-config-runtime` | Runtime 外掛-config 查詢輔助程式，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 與 `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` |
  交易式 config 變更輔助程式，例如 `mutateConfigFile`、`replaceConfigFile` 與 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 目前 process config 快照輔助程式，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 與測試快照設定器 | | `plugin-sdk/telegram-command-config` | Telegram 指令名稱/描述標準化與重複/衝突檢查，即使內建的 Telegram contract 表面無法使用 | |
  `plugin-sdk/text-autolink-runtime` | 無需廣泛 text barrel 的檔案參照自動連結偵測 | | `plugin-sdk/approval-runtime` | Exec/外掛核准輔助程式、核准功能建構器、auth/profile 輔助程式、原生 routing/runtime 輔助程式與結構化核准顯示路徑格式化 | | `plugin-sdk/reply-runtime` | 共用的 inbound/reply runtime 輔助程式、分塊、分派、心跳、reply 規劃器 | | `plugin-sdk/reply-dispatch-runtime` | 狹義的 reply
  分派/完成與對話標籤輔助程式 | | `plugin-sdk/reply-history` | 共用的短視窗 reply 歷史輔助程式與標記，例如 `buildHistoryContext`、`HISTORY_CONTEXT_MARKER`、`recordPendingHistoryEntry` 與 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 狹義的 text/markdown 分塊輔助程式 | | `plugin-sdk/session-store-runtime` | Session
  store 路徑、session 金鑰、updated-at 與 store 變更輔助程式 | | `plugin-sdk/cron-store-runtime` | Cron store 路徑/載入/儲存輔助程式 | | `plugin-sdk/state-paths` | State/OAuth 目錄路徑輔助程式 | | `plugin-sdk/routing` | Route/session 金鑰/account 繫結輔助程式，例如 `resolveAgentRoute`、`buildAgentSessionKey` 與 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共用的
  channel/account 狀態摘要輔助程式、runtime-state 預設值與 issue metadata 輔助程式 | | `plugin-sdk/target-resolver-runtime` | 共用的 target 解析器輔助程式 | | `plugin-sdk/string-normalization-runtime` | Slug/字串標準化輔助程式 | | `plugin-sdk/request-url` | 從 fetch/request 類似輸入中擷取字串 URL | | `plugin-sdk/run-command` | 具有已標準化 stdout/stderr 結果的計時指令執行器 | |
  `plugin-sdk/param-readers` | 常見 tool/CLI 參數讀取器 | | `plugin-sdk/tool-payload` | 從 tool 結果物件中擷取已標準化 payload | | `plugin-sdk/tool-send` | 從 tool 引數中擷取正規傳送 target 欄位 | | `plugin-sdk/temp-path` | 共用的暫存下載路徑輔助程式與私用安全暫存工作區 | | `plugin-sdk/logging-core` | 子系統 logger 與編修輔助程式 | | `plugin-sdk/markdown-table-runtime` | Markdown
  表格模式與轉換輔助程式 | | `plugin-sdk/model-session-runtime` | Model/session 覆寫輔助程式，例如 `applyModelOverrideToSessionEntry` 與 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk provider config 解析輔助程式 | | `plugin-sdk/json-store` | 小型 JSON 狀態讀寫輔助程式 | | `plugin-sdk/file-lock` | 可重入的檔案鎖定輔助程式 | | `plugin-sdk/persistent-dedupe` |
  磁碟支援的去重快取輔助程式 | | `plugin-sdk/acp-runtime` | ACP runtime/session 與 reply 分派輔助程式 | | `plugin-sdk/acp-runtime-backend` | 輕量級 ACP 後端註冊與 reply 分派輔助程式，適用於啟動時載入的外掛 | | `plugin-sdk/acp-binding-resolve-runtime` | 唯讀 ACP 繫結解析，無需生命週期啟動 import | | `plugin-sdk/agent-config-primitives` | 狹義的 agent runtime config-schema 基本型別 | |
  `plugin-sdk/boolean-param` | 寬鬆的布林參數讀取器 | | `plugin-sdk/dangerous-name-runtime` | 危險名稱比對解析輔助程式 | | `plugin-sdk/device-bootstrap` | 裝置開機與配對權杖輔助程式 | | `plugin-sdk/extension-shared` | 共用的被動 channel、狀態與環境代理程式輔助基本型別 | | `plugin-sdk/models-provider-runtime` | `/models` command/provider reply 輔助程式 | | `plugin-sdk/skill-commands-runtime` |
  Skill 指令列表輔助程式 | | `plugin-sdk/native-command-registry` | 原生命令 registry/建置/序列化輔助程式 | | `plugin-sdk/agent-harness` | 實驗性的信任外掛表面，用於低階 agent harness：harness 類型、active-run steer/中止輔助程式、OpenClaw tool 橋接輔助程式、runtime-plan tool 原則輔助程式、終端機結果分類、tool 進度格式化/詳細資訊輔助程式與嘗試結果公用程式 | | `plugin-sdk/provider-zai-endpoint` |
  已淘汰的 Z.AI provider 擁有的端點偵測外觀；請使用 Z.AI 外掛公開 API | | `plugin-sdk/async-lock-runtime` | 用於小型 runtime 狀態檔案的 process 本地非同步鎖定輔助程式 | | `plugin-sdk/channel-activity-runtime` | Channel 活動遙測輔助程式 | | `plugin-sdk/concurrency-runtime` | 有界的非同步任務並行輔助程式 | | `plugin-sdk/dedupe-runtime` | 記憶體內去重快取輔助程式 | |
  `plugin-sdk/delivery-queue-runtime` | 傳出待傳遞耗盡輔助程式 | | `plugin-sdk/file-access-runtime` | 安全的本機檔案與媒體來源路徑輔助程式 | | `plugin-sdk/heartbeat-runtime` | 心跳喚醒、事件與可見性輔助程式 | | `plugin-sdk/number-runtime` | 數值強制輔助程式 | | `plugin-sdk/secure-random-runtime` | 安全權杖/UUID 輔助程式 | | `plugin-sdk/system-event-runtime` | 系統事件佇列輔助程式 | |
  `plugin-sdk/transport-ready-runtime` | 傳輸就緒等待輔助程式 | | `plugin-sdk/infra-runtime` | 已淘汰的相容性 shim；請使用上述專注的 runtime 子路徑 | | `plugin-sdk/collection-runtime` | 小型有界快取輔助程式 | | `plugin-sdk/diagnostic-runtime` | 診斷旗標、事件與追蹤內容輔助程式 | | `plugin-sdk/error-runtime` | 錯誤圖、格式化、共用錯誤分類輔助程式，`isApprovalNotFoundError` | |
  `plugin-sdk/fetch-runtime` | 已包裝的 fetch、代理程式、EnvHttpProxyAgent 選項與已固定查詢輔助程式 | | `plugin-sdk/runtime-fetch` | 具備分派器感知能力的 runtime fetch，無需 proxy/guarded-fetch import | | `plugin-sdk/response-limit-runtime` | 有界的回應本文讀取器，無需廣泛的 media runtime 表面 | | `plugin-sdk/session-binding-runtime` | 目前的對話繫結狀態，無需已設定的繫結路由或配對 store | |
  `plugin-sdk/session-store-runtime` | Session-store 輔助程式，無需廣泛的 config 寫入/維護 import | | `plugin-sdk/context-visibility-runtime` | 內容可見性解析與補充內容篩選，無需廣泛的 config/security import | | `plugin-sdk/string-coerce-runtime` | 狹義的基本 record/字串強制與標準化輔助程式，無需 markdown/logging import | | `plugin-sdk/host-runtime` | 主機名稱與 SCP 主機標準化輔助程式 | |
  `plugin-sdk/retry-runtime` | 重試 config 與重試執行器輔助程式 | | `plugin-sdk/agent-runtime` | Agent 目錄/身分/工作區輔助程式，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 與已淘汰的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/directory-runtime` | Config 支援的目錄查詢/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | 共用的媒體擷取/轉換/儲存輔助函式，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已棄用的 `fetchRemoteMedia`；當 URL 應變成 OpenClaw 媒體時，優先使用儲存輔助函式而非緩衝區讀取 | | `plugin-sdk/media-mime` | 狹隘的 MIME 正規化、副檔名對應、MIME 偵測與媒體類型輔助函式 | | `plugin-sdk/media-store` |
  狹隘的媒體儲存輔助函式，例如 `saveMediaBuffer` 和 `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | 共用的媒體生成故障轉移輔助函式、候選選擇與遺失模型訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型，以及提供者導向的圖片/音訊/結構化擷取輔助函式匯出 | | `plugin-sdk/text-chunking` | 文字與 Markdown 分塊/渲染輔助函式、Markdown 表格轉換、指令標籤移除與安全文字工具 | |
  `plugin-sdk/text-chunking` | 外寄文字分塊輔助函式 | | `plugin-sdk/speech` | 語音提供者類型，以及提供者導向的指令、註冊表、驗證、OpenAI 相容 TTS 建構器與語音輔助函式匯出 | | `plugin-sdk/speech-core` | 共用的語音提供者類型、註冊表、指令、正規化與語音輔助函式匯出 | | `plugin-sdk/realtime-transcription` | 即時轉錄提供者類型、註冊表輔助函式與共用的 WebSocket 會話輔助函式 | |
  `plugin-sdk/realtime-voice` | 即時語音提供者類型與註冊表輔助函式 | | `plugin-sdk/image-generation` | 影像生成提供者類型，以及影像資產/資料 URL 輔助函式與 OpenAI 相容的影像提供者建構器 | | `plugin-sdk/image-generation-core` | 共用的影像生成類型、故障轉移、驗證與註冊表輔助函式 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` |
  共用的音樂生成類型、故障轉移輔助函式、提供者查詢與模型參考解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共用的影片生成類型、故障轉移輔助函式、提供者查詢與模型參考解析 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表與路由安裝輔助函式 | | `plugin-sdk/webhook-path` | 已棄用的相容性別名；請使用 `plugin-sdk/webhook-ingress` | |
  `plugin-sdk/web-media` | 共用的遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | 已棄用的相容性重新匯出；請直接從 `zod` 匯入 `zod` | | `plugin-sdk/testing` | 僅限程式庫內部使用的已棄用相容性桶，用於舊版 OpenClaw 測試。新的程式庫測試應改為匯入專注的本機測試子路徑，例如
  `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` | | `plugin-sdk/plugin-test-api` | 僅限程式庫內部使用的最小化 `createTestPluginApi` 輔助函式，用於直接外掛註冊單元測試，無需匯入程式庫測試輔助橋接器 | | `plugin-sdk/agent-runtime-test-contracts` | 僅限程式庫內部使用的原生
  agent-runtime 介面卡合約固定裝置，用於驗證、傳遞、故障轉移、工具掛勾、提示覆蓋、綱要與文字記錄投影測試 | | `plugin-sdk/channel-test-helpers` | 僅限程式庫內部使用的通道導向測試輔助函式，用於通用動作/設定/狀態合約、目錄斷言、帳戶啟動生命週期、發送配置執行緒、執行時期模擬、狀態問題、外寄傳遞與掛勾註冊 | | `plugin-sdk/channel-target-testing` |
  僅限程式庫內部使用的共用目標解析錯誤案例套件，用於通道測試 | | `plugin-sdk/plugin-test-contracts` | 僅限程式庫內部使用的外掛套件、註冊、公開成果、直接匯入、執行時期 API 與匯入副作用合約輔助函式 | | `plugin-sdk/provider-test-contracts` | 僅限程式庫內部使用的提供者執行時期、驗證、探索、上架、目錄、精靈、媒體能力、重播原則、即時 STT 即時音訊、網路搜尋/擷取與串流合約輔助函式 | |
  `plugin-sdk/provider-http-test-mocks` | 僅限程式庫內部使用的選用 Vitest HTTP/驗證模擬，用於執行 `plugin-sdk/provider-http` 的提供者測試 | | `plugin-sdk/test-fixtures` | 僅限程式庫內部使用的通用 CLI 執行時期擷取、沙箱環境、技能寫入器、代理程式訊息、系統事件、模組重新載入、打包外掛路徑、終端機文字、分塊、驗證權杖與型別案例固定裝置 | | `plugin-sdk/test-node-mocks` | 僅限程式庫內部使用的專注 Node
  內建模擬輔助函式，用於 Vitest `vi.mock("node:*")` 工廠內部 |
</Accordion>

<Accordion title="Memory 子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於 manager/config/file/CLI 助手的捆綁 memory-core 助手介面 | | `plugin-sdk/memory-core-engine-runtime` | Memory 索引/搜尋執行時期外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | Memory 主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | Memory 主機嵌入合約、登錄存取、本機提供者以及通用批次/遠端助手 |
  | `plugin-sdk/memory-core-host-engine-qmd` | Memory 主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | Memory 主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | Memory 主機多模態助手 | | `plugin-sdk/memory-core-host-query` | Memory 主機查詢助手 | | `plugin-sdk/memory-core-host-secret` | Memory 主機秘密助手 | | `plugin-sdk/memory-core-host-events` |
  已棄用的相容性別名；請使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | Memory 主機狀態助手 | | `plugin-sdk/memory-core-host-runtime-cli` | Memory 主機 CLI 執行時期助手 | | `plugin-sdk/memory-core-host-runtime-core` | Memory 主機核心執行時期助手 | | `plugin-sdk/memory-core-host-runtime-files` | Memory 主機檔案/執行時期助手 | | `plugin-sdk/memory-host-core` | Memory
  主機核心執行時期助手的廠商中立別名 | | `plugin-sdk/memory-host-events` | Memory 主機事件日誌助手的廠商中立別名 | | `plugin-sdk/memory-host-files` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 供 memory 相關外掛程式使用的共用 managed-markdown 助手 | | `plugin-sdk/memory-host-search` | 用於 search-manager 存取的作用中 memory
  執行時期外觀 | | `plugin-sdk/memory-host-status` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="保留的 bundled-helper 子路徑">
    保留的 bundled-helper SDK 子路徑是用於 bundled 插件代碼的特定擁有者介面。它們在 SDK 清單中被追蹤，以確保套件建構和別名保持確定性，但它們不是通用的插件撰寫 API。新的可重用主機合約應該使用通用 SDK 子路徑，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

    | Subpath | Owner and purpose |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | Bundled Codex plugin helper for projecting user MCP server config into Codex app-server thread config |
    | `plugin-sdk/codex-native-task-runtime` | Bundled Codex plugin helper for mirroring Codex app-server native subagents into OpenClaw task state |

  </Accordion>
</AccordionGroup>

## 相關

- [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)
- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
