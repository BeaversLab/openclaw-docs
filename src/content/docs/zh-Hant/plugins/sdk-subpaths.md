---
summary: "Plugin SDK 子路徑目錄：依區域分組的 import 位置"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路徑"
---

外掛程式 SDK 以 `openclaw/plugin-sdk/` 下的一組狹窄的公用子路徑公開。此頁面按用途分類列出了常用的子路徑。生成的編譯器入口點清單位於 `scripts/lib/plugin-sdk-entrypoints.json`；套件匯出是從 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的儲存庫本機測試/內部子路徑中扣除後的公用子集。維護者可以使用 `pnpm plugin-sdk:surface` 審查公用匯出數量，並使用 `pnpm plugins:boundary-report:summary` 審查作用中保留的輔助子路徑；未使用的保留輔助匯出會導致 CI 報告失敗，而不是作為休眠的相容性債務保留在公用 SDK 中。

如需外掛程式撰寫指南，請參閱 [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)。

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
  <Accordion title="Channel subpaths">
    | 子路徑 | 主要匯出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`、 `defineSetupPluginEntry`、 `createChatChannelPlugin`、 `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 匯出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 針對外掛擁有之 schema 的快取 JSON Schema 驗證輔助工具 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`、 `createOptionalChannelSetupAdapter`、 `createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`、 `createTopLevelChannelDmPolicy`、 `setSetupChannelEnabled`、 `splitSetupEntries` |
    | `plugin-sdk/setup` | 共用的設定精靈輔助工具、設定翻譯器、允許清單提示、設定狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`、 `createPatchedAccountSetupAdapter`、 `createEnvPatchedAccountSetupAdapter`、 `createSetupInputPresenceValidator`、 `noteChannelLookupFailure`、 `noteChannelLookupSummary`、 `promptResolvedAllowFrom`、 `splitSetupEntries`、 `createAllowlistSetupWizardProxy`、 `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已棄用的相容性別名；請使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`、 `detectBinary`、 `extractArchive`、 `resolveBrewExecutable`、 `formatDocsLink`、 `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/動作閘道輔助工具、預設帳號後援輔助工具 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化輔助工具 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後援輔助工具 |
    | `plugin-sdk/account-helpers` | 窄帳號清單/帳號動作輔助工具 |
    | `plugin-sdk/access-groups` | 存取群組允許清單解析與修飾群組診斷輔助工具 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 舊版回覆管線輔助工具。新的頻道回覆管線程式碼應使用 `plugin-sdk/channel-message` 中的 `createChannelMessageReplyPipeline` 和 `resolveChannelMessageSourceReplyDeliveryMode`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`、 `resolveChannelDmAccess`、 `resolveChannelDmAllowFrom`、 `resolveChannelDmPolicy`、 `normalizeChannelDmPolicy`、 `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共用的頻道設定 schema 基本型別，加上 Zod 和直接 JSON/TypeBox 建構器 |
    | `plugin-sdk/bundled-channel-config-schema` | 僅供維護中綑綁外掛使用的綑綁 OpenClaw 頻道設定 schemas |
    | `plugin-sdk/channel-config-schema-legacy` | 綑綁頻道設定 schemas 的已棄用相容性別名 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助工具，含綑綁合約後援 |
    | `plugin-sdk/command-gating` | 窄指令授權閘道輔助工具 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已棄用的低階頻道入口相容性外觀。新的接收路徑應使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 供已遷移頻道接收路徑使用的實驗性高階頻道入口執行時解析器和路由事實建構器。比起在各個外掛中組裝有效允許清單、指令允許清單和舊版投影，優先使用此項。請參閱 [Channel ingress API](/zh-Hant/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`、 `createChannelRunQueue`，以及舊版草稿串流生命週期輔助工具。新的預覽完成程式碼應使用 `plugin-sdk/channel-message`。 |
    | `plugin-sdk/channel-message` | 輕量級訊息生命週期合約輔助工具，例如 `defineChannelMessageAdapter`、 `createChannelMessageAdapterFromOutbound`、 `createChannelMessageReplyPipeline`、 `createReplyPrefixContext`、 `resolveChannelMessageSourceReplyDeliveryMode`、持久最終功能衍生、針對傳送/接收/副作用功能的功能證明輔助工具、 `MessageReceiveContext`、接收確認原則證明、 `defineFinalizableLivePreviewAdapter`、 `deliverWithFinalizableLivePreviewAdapter`、即時預覽和即時完成器功能證明、持久恢復狀態、 `RenderedMessageBatch`、訊息接收類型，以及接收 ID 輔助工具。請參閱 [Channel message API](/zh-Hant/plugins/sdk-channel-message)。舊版回覆分派外觀僅供相容性使用。 |
    | `plugin-sdk/channel-message-runtime` | 可能載入出站傳送的執行時傳遞輔助工具，包括 `deliverInboundReplyWithMessageSendContext`、 `sendDurableMessageBatch` 和 `withDurableMessageSendContext`。已棄用的回覆分派橋接器仍可供相容性分派器匯入。請從監控/傳送執行時模組使用，而非熱外掛啟動檔案。 |
    | `plugin-sdk/inbound-envelope` | 共用入站路由 + 信封建構器輔助工具 |
    | `plugin-sdk/inbound-reply-dispatch` | 舊版共用入站記錄與分派輔助工具、可見/最終分派述詞，以及針對已備妥頻道分派器的已棄用 `deliverDurableInboundReplyPayload` 相容性。新的頻道接收/分派程式碼應從 `plugin-sdk/channel-message-runtime` 匯入執行時生命週期輔助工具。 |
    | `plugin-sdk/messaging-targets` | 目標解析/比對輔助工具 |
    | `plugin-sdk/outbound-media` | 共用出站媒體載入輔助工具 |
    | `plugin-sdk/outbound-send-deps` | 供頻道轉接器使用的輕量級出站傳送相依性查詢 |
    | `plugin-sdk/outbound-runtime` | 出站身分、傳送委派、工作階段、格式化和承載規劃輔助工具。諸如 `deliverOutboundPayloads` 之類的直接傳遞輔助工具是已棄用的相容性基底；對於新的傳送路徑，請使用 `plugin-sdk/channel-message-runtime`。 |
    | `plugin-sdk/poll-runtime` | 窄投票正規化輔助工具 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒綁定生命週期與轉接器輔助工具 |
    | `plugin-sdk/agent-media-payload` | 舊版代理程式媒體承載建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒綁定、配對和已設定綁定輔助工具 |
    | `plugin-sdk/runtime-config-snapshot` | 執行時設定快照輔助工具 |
    | `plugin-sdk/runtime-group-policy` | 執行時群組原則解析輔助工具 |
    | `plugin-sdk/channel-status` | 共用頻道狀態快照/摘要輔助工具 |
    | `plugin-sdk/channel-config-primitives` | 窄頻道設定-schema 基本型別 |
    | `plugin-sdk/channel-config-writes` | 頻道設定寫入授權輔助工具 |
    | `plugin-sdk/channel-plugin-common` | 共用頻道外掛前奏匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助工具 |
    | `plugin-sdk/group-access` | 共用群組存取決策輔助工具 |
    | `plugin-sdk/direct-dm` | 共用直接 DM 授權/防護輔助工具 |
    | `plugin-sdk/discord` | 針對已發布 `@openclaw/discord@2026.3.13` 的已棄用 Discord 相容性外觀，以及追蹤的擁有者相容性；新外掛應使用通用頻道 SDK 子路徑 |
    | `plugin-sdk/telegram-account` | 針對追蹤的擁有者相容性之已棄用 Telegram 帳號解析相容性外觀；新外掛應使用已插入的執行時輔助工具或通用頻道 SDK 子路徑 |
    | `plugin-sdk/zalouser` | 針對仍匯入傳送者指令授權的已發布 Lark/Zalo 套件之已棄用 Zalo Personal 相容性外觀；新外掛應使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 語意訊息呈現、傳遞，以及舊版互動式回覆輔助工具。請參閱 [Message Presentation](/zh-Hant/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 供事件分類、內容建置、防彈跳、提及比對、提及原則和信封格式化使用的共用入站輔助工具 |
    | `plugin-sdk/channel-inbound-debounce` | 窄入站防彈跳輔助工具 |
    | `plugin-sdk/channel-mention-gating` | 不包含廣義入站執行時介面的窄提及原則、提及標記和提及文字輔助工具 |
    | `plugin-sdk/channel-envelope` | 窄入站信封格式化輔助工具 |
    | `plugin-sdk/channel-location` | 頻道位置內容與格式化輔助工具 |
    | `plugin-sdk/channel-logging` | 供入站丟棄和輸入/確認失敗使用的頻道記錄輔助工具 |
    | `plugin-sdk/channel-send-result` | 回覆結果類型 |
    | `plugin-sdk/channel-actions` | 頻道訊息動作輔助工具，以及為外掛相容性而保留的已棄用原生 schema 輔助工具 |
    | `plugin-sdk/channel-route` | 共用路由正規化、驅動器驅動目標解析、執行緒 ID 字串化、重複資料刪除/精簡路由金鑰、已解析目標類型，以及路由/目標比較輔助工具 |
    | `plugin-sdk/channel-targets` | 目標解析輔助工具；路由比較呼叫端應使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 頻道合約類型 |
    | `plugin-sdk/channel-feedback` | 意見回饋/反應連接 |
    | `plugin-sdk/channel-secret-runtime` | 窄秘密合約輔助工具，例如 `collectSimpleChannelFieldAssignments`、 `getChannelSurface`、 `pushAssignment` 和秘密目標類型 |
  </Accordion>

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支援的 LM Studio provider facade，用於設定、catalog 探索及執行時模型準備 | | `plugin-sdk/lmstudio-runtime` | 支援的 LM Studio 執行時 facade，用於本機伺服器預設值、模型探索、請求標頭及已載入模型輔助函式 | | `plugin-sdk/provider-setup` | 精選的本機/自託管 provider
  設定輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 專注於相容 OpenAI 的自託管 provider 設定輔助函式 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + watchdog 常數 | | `plugin-sdk/provider-auth-runtime` | 供外掛使用的執行時 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | API 金鑰 onboarding/profile 寫入輔助函式，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result`
  | 標準 OAuth auth-result builder | | `plugin-sdk/provider-env-vars` | Provider auth env-var 查閱輔助函式 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`，以及已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/provider-model-shared` |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用的 replay-policy builders、provider-endpoint 輔助函式及共用的 model-id 正規化輔助函式 | | `plugin-sdk/provider-catalog-runtime` | Provider catalog 擴充執行時 hook 與 plugin-provider registry 縫合點，用於合約測試 | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 provider HTTP/endpoint 能力輔助函式、provider HTTP 錯誤及音訊轉錄 multipart form 輔助函式 | | `plugin-sdk/provider-web-fetch-contract` | 狹隘的 web-fetch config/selection
  合約輔助函式，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web-fetch provider 註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 狹隘的 web-search config/credential 輔助函式，適用於不需要 plugin-enable 連線的 providers | | `plugin-sdk/provider-web-search-contract` | 狹隘的 web-search config/credential 合約輔助函式，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及限定範圍的 credential setters/getters | | `plugin-sdk/provider-web-search` | Web-search provider 註冊/快取/執行時輔助函式 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`，以及 Gemini schema 清理 + 診斷 | | `plugin-sdk/provider-usage` |
  `fetchClaudeUsage` 及類似項目 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、stream wrapper types，以及共用的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot wrapper 輔助函式 | | `plugin-sdk/provider-transport-runtime` | 原生 provider 傳輸輔助函式，例如 guarded
  fetch、transport message transforms 及可寫入的 transport event streams | | `plugin-sdk/provider-onboard` | Onboarding config 修補輔助函式 | | `plugin-sdk/global-singleton` | Process-local singleton/map/cache 輔助函式 | | `plugin-sdk/group-activation` | 狹隘的群組啟用模式與指令解析輔助函式 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，指令註冊輔助函式，包括動態參數選單格式設定、發送者授權輔助函式 | | `plugin-sdk/command-status` | 指令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 核准者解析與同聊天室動作授權輔助函式 | | `plugin-sdk/approval-client-runtime` |
  原生執行核准設定檔/篩選器輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 原生核准能力/遞送配接器 | | `plugin-sdk/approval-gateway-runtime` | 共用核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 用於熱通道進入點的輕量級原生核准配接器載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 較廣泛的核准處理器執行時輔助函式；若足夠使用，請優先使用較狹窄的配接器/閘道介面
  | | `plugin-sdk/approval-native-runtime` | 原生核准目標 + 帳號綁定輔助函式 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛核准回覆承載輔助函式 | | `plugin-sdk/approval-runtime` | 執行/外掛核准承載輔助函式、原生核准路由/執行時輔助函式，以及結構化核准顯示輔助函式，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 狹窄的傳入回覆去重重設輔助函式 | |
  `plugin-sdk/channel-contract-testing` | 狹窄的通道合約測試輔助函式，不包含廣泛的測試 barrel | | `plugin-sdk/command-auth-native` | 原生命令授權、動態參數選單格式設定，以及原生工作階段目標輔助函式 | | `plugin-sdk/command-detection` | 共用指令偵測輔助函式 | | `plugin-sdk/command-primitives-runtime` | 用於熱通道路徑的輕量級指令文字述詞 | | `plugin-sdk/command-surface` |
  指令主體正規化與指令介面輔助函式 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用於通道/外掛密碼介面的狹窄密碼合約集合輔助函式 | | `plugin-sdk/secret-ref-runtime` | 用於密碼合約/設定解析的狹窄 `coerceSecretRef` 與 SecretRef 類型輔助函式 | | `plugin-sdk/security-runtime` | 共用信任、DM 閘道、以 root
  為界的檔案/路徑輔助函式，包括僅建立寫入、同步/非同步原子檔案替換、同層臨時寫入、跨裝置移動後援、私人檔案儲存輔助函式、符號連結父項守衛、外部內容、敏感文字編修、恆定時間密碼比較，以及密碼集合輔助函式 | | `plugin-sdk/ssrf-policy` | 主機允許清單與私人網路 SSRF 原則輔助函式 | | `plugin-sdk/ssrf-dispatcher` | 狹窄的釘選派發器輔助函式，不包含廣泛的基礎設施執行時介面 | | `plugin-sdk/ssrf-runtime` |
  釘選派發器、SSRF 防護擷取、SSRF 錯誤與 SSRF 原則輔助函式 | | `plugin-sdk/secret-input` | 密碼輸入解析輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助函式與原始 websocket/body 強制轉換 | | `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助函式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | 廣泛的運行時/日誌/備份/外掛安裝輔助函式 | | `plugin-sdk/runtime-env` | 窄範圍的運行時環境、日誌記錄器、逾時、重試和退避輔助函式 | | `plugin-sdk/browser-config` | 支援的瀏覽器配置外觀，用於標準化設定檔/預設值、CDD URL 解析和瀏覽器控制驗證輔助函式 | | `plugin-sdk/codex-mcp-projection` | 保留的內建 Codex 輔助函式，用於將使用者 MCP
  伺服器配置投射到 Codex 執行緒配置；不適用於第三方外掛 | | `plugin-sdk/codex-native-task-runtime` | 保留的內建 Codex 輔助函式，用於原生任務鏡像/運行時佈線；不適用於第三方外掛 | | `plugin-sdk/channel-runtime-context` | 通用通道運行時上下文註冊和查詢輔助函式 | | `plugin-sdk/matrix` | 已棄用的 Matrix 相容性外觀，用於較舊的第三方通道套件；新外掛應直接匯入 `plugin-sdk/run-command` | |
  `plugin-sdk/mattermost` | 已棄用的 Mattermost 相容性外觀，用於較舊的第三方通道套件；新外掛應直接匯入通用 SDK 子路徑 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共用的外掛指令/hook/HTTP/互動輔助函式 | | `plugin-sdk/hook-runtime` | 共用的 webhook/內部 hook 管道輔助函式 | | `plugin-sdk/lazy-runtime``createLazyRuntimeModule` |
  延遲運行時匯入/綁定輔助函式，例如 %%PH:INLINE_CODE:347:7d3a8e4%%、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 程序執行輔助函式 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、引數呼叫和延遲指令群組輔助函式 | | `plugin-sdk/gateway-method-runtime` | 保留的 Gateway 方法分派輔助函式，用於宣告 `contracts.gatewayMethodDispatch:
  ["authenticated-request"]` 的外掛 HTTP 路由 | | `plugin-sdk/gateway-runtime` | Gateway 客戶端、事件循環就緒的客戶端啟動輔助函式、gateway CLI RPC、gateway 協定錯誤和通道狀態修補輔助函式 | | `plugin-sdk/config-contracts` | 專注的僅限型別配置介面，用於外掛配置形狀，例如 `OpenClawConfig` 和通道/提供者配置型別 | | `plugin-sdk/plugin-config-runtime` | 運行時外掛配置查詢輔助函式，例如
  `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | 交易式配置變更輔助函式，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 當前程序配置快照輔助函式，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和測試快照設定器 | | `plugin-sdk/telegram-command-config` |
  Telegram 指令名稱/描述標準化和重複/衝突檢查，即使內建的 Telegram 合約介面不可用 | | `plugin-sdk/text-autolink-runtime` | 檔案參考自動連結偵測，不需要廣泛的文字 barrel | | `plugin-sdk/approval-runtime` | 執行/外掛核准輔助函式、核准功能建構器、驗證/設定檔輔助函式、原生路由/運行時輔助函式，以及結構化核准顯示路徑格式化 | | `plugin-sdk/reply-runtime` |
  共用的傳入/回覆運行時輔助函式、分塊、分派、心跳、回覆規劃器 | | `plugin-sdk/reply-dispatch-runtime` | 窄範圍的回覆分派/完成和對話標籤輔助函式 | | `plugin-sdk/reply-history` | 共用的短視窗回覆歷史輔助函式。新的訊息輪次程式碼應使用 `createChannelHistoryWindow`；較低層級的映射輔助函式仍保持為已棄用的相容性匯出 | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | |
  `plugin-sdk/reply-chunking` | 窄範圍的文字/markdown 分塊輔助函式 | | `plugin-sdk/session-store-runtime` | 工作階段存放區路徑、工作階段金鑰、更新時間和存放區變更輔助函式 | | `plugin-sdk/cron-store-runtime` | Cron 存放區路徑/載入/儲存輔助函式 | | `plugin-sdk/state-paths` | 狀態/OAuth 目錄路徑輔助函式 | | `plugin-sdk/routing` | 路由/工作階段金鑰/帳戶綁定輔助函式，例如
  `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共用的通道/帳戶狀態摘要輔助函式、運行時狀態預設值和問題元資料輔助函式 | | `plugin-sdk/target-resolver-runtime` | 共用的目標解析器輔助函式 | | `plugin-sdk/string-normalization-runtime` | Slug/字串標準化輔助函式 | | `plugin-sdk/request-url` | 從類似 fetch/request 的輸入中提取字串
  URL | | `plugin-sdk/run-command` | 計時指令執行器，具有標準化的 stdout/stderr 結果 | | `plugin-sdk/param-readers` | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-plugin` | 定義一個簡單的型別化 agent-tool 外掛並公開靜態元資料用於資訊清單產生 | | `plugin-sdk/tool-payload` | 從工具結果物件中提取標準化負載 | | `plugin-sdk/tool-send` | 從工具引數中提取標準傳送目標欄位 | | `plugin-sdk/temp-path` |
  共用的暫存下載路徑輔助函式和私人安全暫存工作區 | | `plugin-sdk/logging-core` | 子系統日誌記錄器和編修輔助函式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和轉換輔助函式 | | `plugin-sdk/model-session-runtime` | 模型/工作階段覆寫輔助函式，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk 提供者配置解析輔助函式 | |
  `plugin-sdk/json-store` | 小型 JSON 狀態讀取/寫入輔助函式 | | `plugin-sdk/file-lock` | 可重入的檔案鎖定輔助函式 | | `plugin-sdk/persistent-dedupe` | 磁碟支援的去重快取輔助函式 | | `plugin-sdk/acp-runtime` | ACP 運行時/工作階段和回覆分派輔助函式 | | `plugin-sdk/acp-runtime-backend` | 輕量級 ACP 後端註冊和回覆分派輔助函式，用於啟動時載入的外掛 | | `plugin-sdk/acp-binding-resolve-runtime` | 唯讀
  ACP 綁定解析，不需要生命週期啟動匯入 | | `plugin-sdk/agent-config-primitives` | 窄範圍的 agent 運行時配置架構原語 | | `plugin-sdk/boolean-param` | 寬鬆的布林參數讀取器 | | `plugin-sdk/dangerous-name-runtime` | 危險名稱匹配解析輔助函式 | | `plugin-sdk/device-bootstrap` | 裝置引導和配對權杖輔助函式 | | `plugin-sdk/extension-shared` | 共用的被動通道、狀態和環境代理輔助原語 | |
  `plugin-sdk/models-provider-runtime` | `/models` 指令/提供者回覆輔助函式 | | `plugin-sdk/skill-commands-runtime` | 技能指令列表輔助函式 | | `plugin-sdk/native-command-registry` | 原生指令登錄/建置/序列化輔助函式 | | `plugin-sdk/agent-harness` | 實驗性的信任外掛介面，用於低階 agent 載具：載具型別、主動執行導向/中止輔助函式、OpenClaw
  工具橋接輔助函式、運行時計畫工具原則輔助函式、終端結果分類、工具進度格式化/細節輔助函式，以及嘗試結果公用程式 | | `plugin-sdk/provider-zai-endpoint` | 已棄用的 Z.AI 提供者擁有的端點偵測外觀；請使用 Z.AI 外掛公用 API | | `plugin-sdk/async-lock-runtime` | 程序本機非同步鎖定輔助函式，用於小型運行時狀態檔案 | | `plugin-sdk/channel-activity-runtime` | 通道活動遙測輔助函式 | |
  `plugin-sdk/concurrency-runtime` | 有界非同步任務並行輔助函式 | | `plugin-sdk/dedupe-runtime` | 記憶體內去重快取輔助函式 | | `plugin-sdk/delivery-queue-runtime` | 外寄擱置傳送清空輔助函式 | | `plugin-sdk/file-access-runtime` | 安全的本機檔案和媒體來源路徑輔助函式 | | `plugin-sdk/heartbeat-runtime` | 心跳喚醒、事件和可見性輔助函式 | | `plugin-sdk/number-runtime` | 數字強制轉換輔助函式 | |
  `plugin-sdk/secure-random-runtime` | 安全權杖/UUID 輔助函式 | | `plugin-sdk/system-event-runtime` | 系統事件佇列輔助函式 | | `plugin-sdk/transport-ready-runtime` | 傳輸就緒等待輔助函式 | | `plugin-sdk/infra-runtime` | 已棄用的相容性 shim；請使用上述專注的運行時子路徑 | | `plugin-sdk/collection-runtime` | 小型有界快取輔助函式 | | `plugin-sdk/diagnostic-runtime` |
  診斷旗標、事件和追蹤上下文輔助函式 | | `plugin-sdk/error-runtime` | 錯誤圖表、格式化、共用錯誤分類輔助函式，`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包裝的 fetch、代理、EnvHttpProxyAgent 選項和固定查詢輔助函式 | | `plugin-sdk/runtime-fetch` | 具有分派器感知能力的運行時 fetch，不需要代理/guarded-fetch 匯入 | | `plugin-sdk/response-limit-runtime` |
  有界回應主體讀取器，不需要廣泛的媒體運行時介面 | | `plugin-sdk/session-binding-runtime` | 當前對話綁定狀態，不需要配置的綁定路由或配對存放區 | | `plugin-sdk/session-store-runtime` | 工作階段存放區輔助函式，不需要廣泛的配置寫入/維護匯入 | | `plugin-sdk/context-visibility-runtime` | 上下文可見性解析和補充上下文篩選，不需要廣泛的配置/安全性匯入 | | `plugin-sdk/string-coerce-runtime` |
  窄範圍的基本記錄/字串強制轉換和標準化輔助函式，不需要 markdown/日誌記錄匯入 | | `plugin-sdk/host-runtime` | 主機名稱和 SCP 主機標準化輔助函式 | | `plugin-sdk/retry-runtime` | 重試配置和重試執行器輔助函式 | | `plugin-sdk/agent-runtime` | Agent 目錄/身分識別/工作區輔助函式，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 和已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | |
  `plugin-sdk/directory-runtime` | 支援配置的目錄查詢/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | 共用媒體擷取/轉換/儲存輔助函式，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 以及已棄用的 `fetchRemoteMedia`；當 URL 應轉換為 OpenClaw 媒體時，優先使用儲存輔助函式而非緩衝區讀取 | | `plugin-sdk/media-mime` | 窄型 MIME 正規化、副檔名對應、MIME 偵測與媒體類型輔助函式 | | `plugin-sdk/media-store` |
  窄型媒體儲存輔助函式，例如 `saveMediaBuffer` 與 `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | 共用媒體生成故障轉移輔助函式、候選選取與缺失模型訊息 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型，以及提供者導向的圖像/音訊/結構化擷取輔助函式匯出 | | `plugin-sdk/text-chunking` | 文字與 Markdown 分塊/渲染輔助函式、Markdown 表格轉換、指令標籤移除，以及安全文字工具 | |
  `plugin-sdk/text-chunking` | 出站文字分塊輔助函式 | | `plugin-sdk/speech` | 語音提供者類型，以及提供者導向的指令、註冊表、驗證、OpenAI 相容 TTS 建構器與語音輔助函式匯出 | | `plugin-sdk/speech-core` | 共用語音提供者類型、註冊表、指令、正規化與語音輔助函式匯出 | | `plugin-sdk/realtime-transcription` | 即時轉錄提供者類型、註冊表輔助函式，以及共用 WebSocket 會話輔助函式 | |
  `plugin-sdk/realtime-voice` | 即時語音提供者類型與註冊表輔助函式 | | `plugin-sdk/image-generation` | 圖像生成提供者類型，以及圖像資源/資料 URL 輔助函式與 OpenAI 相容圖像提供者建構器 | | `plugin-sdk/image-generation-core` | 共用圖像生成類型、故障轉移、驗證與註冊表輔助函式 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` |
  共用音樂生成類型、故障轉移輔助函式、提供者查詢與模型參考解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共用影片生成類型、故障轉移輔助函式、提供者查詢與模型參考解析 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表與路由安裝輔助函式 | | `plugin-sdk/webhook-path` | 已棄用的相容性別名；請使用 `plugin-sdk/webhook-ingress` | |
  `plugin-sdk/web-media` | 共用遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | 已棄用的相容性重新匯出；請直接從 `zod` 匯入 `zod` | | `plugin-sdk/testing` | 供應程式庫內部使用的已棄用相容性 barrel，用於舊版 OpenClaw 測試。新的程式庫測試應改用匯入聚焦的本地測試子路徑，例如
  `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` | | `plugin-sdk/plugin-test-api` | 供應程式庫內部使用的極簡 `createTestPluginApi` 輔助函式，用於直接外掛程式註冊單元測試，無須匯入程式庫測試輔助橋接層 | | `plugin-sdk/agent-runtime-test-contracts` | 供應程式庫內部使用的原生
  agent-runtime 介面卡合約固定裝置，用於驗證、傳遞、故障轉移、工具掛鉤、提示重疊、結構描述與文字記錄投影測試 | | `plugin-sdk/channel-test-helpers` | 供應程式庫內部使用的通道導向測試輔助函式，用於通用動作/設定/狀態合約、目錄斷言、帳戶啟動生命週期、傳送設定執行緒、執行時期模擬物件、狀態問題、出站傳遞與掛鉤註冊 | | `plugin-sdk/channel-target-testing` |
  供應程式庫內部使用的共用目標解析錯誤案例測試組，用於通道測試 | | `plugin-sdk/plugin-test-contracts` | 供應程式庫內部使用的外掛程式套件、註冊、公開構件、直接匯入、執行時期 API 與匯入副作用合約輔助函式 | | `plugin-sdk/provider-test-contracts` | 供應程式庫內部使用的提供者執行時期、驗證、探索、上線、目錄、精靈、媒體能力、重播原則、即時 STT 即時音訊、網路搜尋/擷取與串流合約輔助函式 | |
  `plugin-sdk/provider-http-test-mocks` | 供應程式庫內部使用的選用式 Vitest HTTP/驗證模擬物件，用於執行 `plugin-sdk/provider-http` 的提供者測試 | | `plugin-sdk/test-fixtures` | 供應程式庫內部使用的通用 CLI 執行時期擷取、沙箱內容、技能寫入器、代理訊息、系統事件、模組重新載入、隨附外掛程式路徑、終端文字、分塊、驗證權杖與型別案例固定裝置 | | `plugin-sdk/test-node-mocks` | 供應程式庫內部使用的聚焦型
  Node 內建模擬輔助函式，用於 Vitest `vi.mock("node:*")` 工廠內部 |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於管理員/設定/檔案/CLI 協助程式的捆綁記憶體核心協助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋運行時外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入式合約、登錄存取、本機提供者及通用批次/遠端協助程式 | |
  `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機秘密協助程式 | | `plugin-sdk/memory-core-host-events` |
  已棄用的相容性別名；請使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態協助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 運行時協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心運行時協助程式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/運行時協助程式 | | `plugin-sdk/memory-host-core` |
  記憶體主機核心運行時協助程式的供應商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌協助程式的供應商中立別名 | | `plugin-sdk/memory-host-files` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 供記憶體相關外掛程式使用的共享受控 Markdown 協助程式 | | `plugin-sdk/memory-host-search` |
  用於搜尋管理員存取的作用中記憶體運行時外觀 | | `plugin-sdk/memory-host-status` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    保留的 bundled-helper SDK 子路徑是針對 bundled plugin 代碼的特定擁有者窄介面。它們被追蹤在 SDK 庫存中，以保持 package 構建和別名解析的確定性，但它們並非通用的插件編寫 API。新的可重用主機合約應使用通用 SDK 子路徑，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和
    `plugin-sdk/plugin-config-runtime`。

    | 子路徑 | 擁有者與用途 |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | Bundled Codex plugin helper，用於將使用者的 MCP 伺服器設定映射到 Codex app-server 執行緒設定 |
    | `plugin-sdk/codex-native-task-runtime` | Bundled Codex plugin helper，用於將 Codex app-server 原生子代理鏡像到 OpenClaw 任務狀態 |

  </Accordion>
</AccordionGroup>

## 相關

- [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)
- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置插件](/zh-Hant/plugins/building-plugins)
