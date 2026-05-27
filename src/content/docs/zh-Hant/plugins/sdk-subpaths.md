---
summary: "Plugin SDK 子路徑目錄：依區域分組的 import 位置"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路徑"
---

外掛程式 SDK 以 `openclaw/plugin-sdk/` 下的一組狹窄的公用子路徑公開。此頁面按用途分類列出了常用的子路徑。生成的編譯器入口點清單位於 `scripts/lib/plugin-sdk-entrypoints.json`；套件匯出是從 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的儲存庫本機測試/內部子路徑中扣除後的公用子集。維護者可以使用 `pnpm plugin-sdk:surface` 審查公用匯出數量，並使用 `pnpm plugins:boundary-report:summary` 審查作用中保留的輔助子路徑；未使用的保留輔助匯出會導致 CI 報告失敗，而不是作為休眠的相容性債務保留在公用 SDK 中。

若要查看外掛程式撰寫指南，請參閱 [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)。

## 外掛進入點

| 子路徑                         | 主要匯出                                                                                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                                                    |
| `plugin-sdk/core`              | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`, `buildJsonChannelConfigSchema` |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                                                       |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                                                      |
| `plugin-sdk/migration`         | 遷移提供者項目輔助工具，例如 `createMigrationItem`、原因常數、項目狀態標記、編修輔助工具以及 `summarizeMigrationItems`                                                 |
| `plugin-sdk/migration-runtime` | 執行時期遷移輔助工具，例如 `copyMigrationFileItem`、`withCachedMigrationConfigRuntime` 和 `writeMigrationReport`                                                       |
| `plugin-sdk/health`            | Doctor 健康檢查註冊、偵測、修復、選取、嚴重性以及適用於套件健康檢查使用者的問題類型                                                                                    |

### 已棄用的相容性和測試輔助程式

這些子路徑保留作為較舊的外掛程式和 OpenClaw 測試套件的套件匯出，但新程式碼不應從其進行匯入：`agent-runtime-test-contracts`、`channel-contract-testing`、`channel-target-testing`、`channel-test-helpers`、`plugin-test-api`、`plugin-test-contracts`、`provider-http-test-mocks`、`provider-test-contracts`、`test-env`、`test-fixtures`、`test-node-mocks`、`testing`、`channel-runtime`、`compat`、`config-types`、`infra-runtime`、`text-runtime` 和 `zod`。在新的外掛程式碼中，請直接從 `zod` 匯入 `zod`。`plugin-test-runtime` 仍是現用專注測試輔助子路徑。

### 保留的套件外掛輔助子路徑

這些子路徑是其擁有套件外掛程式的擁有者相容性介面，而非一般的 SDK API：`plugin-sdk/codex-mcp-projection` 和 `plugin-sdk/codex-native-task-runtime`。跨擁有者擴充匯入會被套件合約防護機制阻擋。

### 已棄用的未使用公開子路徑

這些公開子路徑已存在至少一個月，且目前沒有內建擴充功能的正式匯入使用。為了相容性，它們仍然可以匯入，但新的外掛程式碼應改用專注且實際被使用的 SDK 子路徑：`agent-config-primitives`、`channel-config-schema-legacy`、`channel-reply-pipeline`、`channel-runtime`、`channel-secret-runtime`、`command-auth`、`compat`、`config-runtime`、`config-schema`、`discord`、`group-access`、`infra-runtime`、`matrix`、`mattermost`、`media-generation-runtime-shared`、`memory-core-engine-runtime`、`memory-core-host-multimodal`、`memory-core-host-query`、`music-generation-core`、`self-hosted-provider-setup`、`telegram-account`、`telegram-command-config` 和 `zalouser`。

### 已棄用的罕見公開子路徑

目前僅被一兩個內建外掛擁有者使用的公開子路徑，也對新的外掛程式碼標記為已棄用。為了相容性，它們仍保留為套件匯出，但新程式碼應優先使用實際共用的 SDK 介面或外掛擁有的套件 API。維護者在 `scripts/lib/plugin-sdk-deprecated-public-subpaths.json` 中追蹤確切的集合，並透過 `pnpm plugin-sdk:surface` 追蹤目前的配額。

### 已棄用的廣泛彙總匯出

這些廣泛的重新導出 barrel 仍可為 OpenClaw 原始碼和相容性檢查進行建置，但新程式碼應優先使用專注的 SDK 子路徑：`agent-runtime`、`channel-lifecycle`、`channel-runtime`、`cli-runtime`、`compat`、`config-types`、`conversation-runtime`、`hook-runtime`、`infra-runtime`、`media-runtime`、`plugin-runtime`、`security-runtime` 和 `text-runtime`。`channel-runtime`、`compat`、`config-types`、`infra-runtime` 和 `text-runtime` 僅為了向後相容性而保留為 package 匯出；請改用專注的 channel/runtime 子路徑 `config-contracts`、`string-coerce-runtime`、`text-chunking`、`text-utility-runtime` 和 `logging-core`。

<AccordionGroup>
  <Accordion title="Channel subpaths">
    | Subpath | Key exports |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod 匯出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 外掛程式擁有 Schema 的快取 JSON Schema 驗證輔助函式 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, 加上 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享設置精靈輔助函式、設置翻譯器、允許清單提示、設置狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已棄用的相容性別名；請使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/動作閘道輔助函式、預設帳號後備輔助函式 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化輔助函式 |
    | `plugin-sdk/account-resolution` | 帳號查閱 + 預設後備輔助函式 |
    | `plugin-sdk/account-helpers` | 精簡帳號清單/帳號動作輔助函式 |
    | `plugin-sdk/access-groups` | 存取群組允許清單解析與編輯群組診斷輔助函式 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 舊版回覆管道輔助函式。新的頻道回覆管道程式碼應使用來自 `plugin-sdk/channel-message` 的 `createChannelMessageReplyPipeline` 和 `resolveChannelMessageSourceReplyDeliveryMode`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共享頻道設定 Schema 基本型別，加上 Zod 與直接 JSON/TypeBox 建構器 |
    | `plugin-sdk/bundled-channel-config-schema` | 僅供維護的內綁外掛使用的內綑 OpenClaw 頻道設定 Schemas |
    | `plugin-sdk/channel-config-schema-legacy` | 內綑頻道設定 Schemas 的已棄用相容性別名 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助函式，並內綑合約後備 |
    | `plugin-sdk/command-gating` | 精簡指令授權閘道輔助函式 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已棄用的低階頻道入口相容性外觀。新的接收路徑應使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 用於遷移頻道接收路徑的實驗性高階頻道入口執行階段解析器與路由事實建構器。優先使用此方式，而非在各個外掛中組裝有效的允許清單、指令允許清單和舊版投影。請參閱 [Channel ingress API](/zh-Hant/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, `createChannelRunQueue`，以及舊版草稿串流生命週期輔助函式。新的預覽最終處理程式碼應使用 `plugin-sdk/channel-message`。 |
    | `plugin-sdk/channel-message` | 輕量的訊息生命週期合約輔助函式，例如 `defineChannelMessageAdapter`、`createChannelMessageAdapterFromOutbound`、`createChannelMessageReplyPipeline`、`createReplyPrefixContext`、`resolveChannelMessageSourceReplyDeliveryMode`、持續最終能力推導、用於傳送/接收/副作用能力的能力證明輔助函式、`MessageReceiveContext`、接收確認原則證明、`defineFinalizableLivePreviewAdapter`、`deliverWithFinalizableLivePreviewAdapter`、即時預覽與即時完成器能力證明、持續復原狀態、`RenderedMessageBatch`、訊息接收類型以及接收 ID 輔助函式。請參閱 [Channel message API](/zh-Hant/plugins/sdk-channel-message)。舊版回覆分派外觀僅供相容性使用並已棄用。 |
    | `plugin-sdk/channel-message-runtime` | 可能會載入傳出傳送的執行階段傳遞輔助函式，包括 `deliverInboundReplyWithMessageSendContext`、`sendDurableMessageBatch` 和 `withDurableMessageSendContext`。已棄用的回覆分派橋接器仍可匯入，但僅限相容性分派器使用。請從監控/傳送執行階段模組使用，而非熱外掛程式啟動檔案。 |
    | `plugin-sdk/inbound-envelope` | 共享傳入路由 + 信封建構器輔助函式 |
    | `plugin-sdk/inbound-reply-dispatch` | 舊版共享傳入記錄與分派輔助函式、可見/最終分派述詞，以及為已準備的頻道分派器提供已棄用的 `deliverDurableInboundReplyPayload` 相容性。新的頻道接收/分派程式碼應從 `plugin-sdk/channel-message-runtime` 匯入執行階段生命週期輔助函式。 |
    | `plugin-sdk/messaging-targets` | 已棄用的目標解析別名；請使用 `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | 共享傳出媒體載入輔助函式 |
    | `plugin-sdk/outbound-send-deps` | 頻道配接器的輕量傳出傳送相依性查閱 |
    | `plugin-sdk/outbound-runtime` | 傳出身分、傳送委派、工作階段、格式設定與承載規劃輔助函式。直接傳遞輔助函式 (例如 `deliverOutboundPayloads`) 為已棄用的相容性基質；新的傳送路徑應使用 `plugin-sdk/channel-message-runtime`。 |
    | `plugin-sdk/poll-runtime` | 精簡投票正規化輔助函式 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結生命週期與配接器輔助函式 |
    | `plugin-sdk/agent-media-payload` | 舊版代理媒體承載建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒繫結、配對與已設定繫結輔助函式 |
    | `plugin-sdk/runtime-config-snapshot` | 執行階段設定快照輔助函式 |
    | `plugin-sdk/runtime-group-policy` | 執行階段群組原則解析輔助函式 |
    | `plugin-sdk/channel-status` | 共享頻道狀態快照/摘要輔助函式 |
    | `plugin-sdk/channel-config-primitives` | 精簡頻道設定 Schema 基本型別 |
    | `plugin-sdk/channel-config-writes` | 頻道設定寫入授權輔助函式 |
    | `plugin-sdk/channel-plugin-common` | 共享頻道外掛程式前導匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助函式 |
    | `plugin-sdk/group-access` | 共享群組存取決策輔助函式 |
    | `plugin-sdk/direct-dm` | 共享直接 DM 驗證/防護輔助函式 |
    | `plugin-sdk/discord` | 已棄用的 Discord 相容性外觀，用於已發布的 `@openclaw/discord@2026.3.13` 以及追蹤的擁有者相容性；新外掛程式應使用一般頻道 SDK 子路徑 |
    | `plugin-sdk/telegram-account` | 已棄用的 Telegram 帳號解析相容性外觀，用於追蹤的擁有者相容性；新外掛程式應使用插入的執行階段輔助函式或一般頻道 SDK 子路徑 |
    | `plugin-sdk/zalouser` | 已棄用的 Zalo Personal 相容性外觀，用於已發布且仍匯入傳送者指令授權的 Lark/Zalo 套件；新外掛程式應使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 語意訊息呈現、傳遞與舊版互動式回覆輔助函式。請參閱 [Message Presentation](/zh-Hant/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用於事件分類、內容建構、防彈跳、提及比對、提及原則與信封格式設定的共享傳入輔助函式 |
    | `plugin-sdk/channel-inbound-debounce` | 精簡傳入防彈跳輔助函式 |
    | `plugin-sdk/channel-mention-gating` | 精簡提及原則、提及標記與提及文字輔助函式，不包含較廣泛的傳入執行階段介面 |
    | `plugin-sdk/channel-envelope` | 精簡傳入信封格式設定輔助函式 |
    | `plugin-sdk/channel-location` | 頻道位置內容與格式設定輔助函式 |
    | `plugin-sdk/channel-logging` | 用於傳入捨棄與輸入/確認失敗的頻道記錄輔助函式 |
    | `plugin-sdk/channel-send-result` | 回覆結果類型 |
    | `plugin-sdk/channel-actions` | 頻道訊息動作輔助函式，加上為外掛程式相容性而保留的已棄用原生 Schema 輔助函式 |
    | `plugin-sdk/channel-route` | 共享路由正規化、解析器驅動的目標解析、執行緒 ID 字串化、去重/精簡路由金鑰、已解析目標類型，以及路由/目標比較輔助函式 |
    | `plugin-sdk/channel-targets` | 目標解析輔助函式；路由比較呼叫端應使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 頻道合約類型 |
    | `plugin-sdk/channel-feedback` | 意見反應/反應連線 |
    | `plugin-sdk/channel-secret-runtime` | 精簡密碼合約輔助函式，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment`，以及密碼目標類型 |
  </Accordion>

<Accordion title="供應商子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支援的 LM Studio 供應商外觀，用於設定、目錄探索和執行時模型準備 | | `plugin-sdk/lmstudio-runtime` | 支援的 LM Studio 執行時外觀，用於本機伺服器預設值、模型探索、請求標頭和已載入模型輔助函式 | | `plugin-sdk/provider-setup` | 精選的本機/自託管供應商設定輔助函式 | |
  `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自託管供應商設定輔助函式 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 監控常數 | | `plugin-sdk/provider-auth-runtime` | 供應商外掛的執行時 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | API 金鑰上架/設定檔寫入輔助函式，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 標準 OAuth 驗證結果建構器 | |
  `plugin-sdk/provider-env-vars` | 供應商驗證環境變數查找輔助函式 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`，已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/provider-model-shared` |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享重播原則建構器、供應商端點輔助函式，以及共享模型 ID 正規化輔助函式 | | `plugin-sdk/provider-catalog-runtime` | 供應商目錄擴充執行時 Hook 和外掛供應商註冊縫合點，用於合約測試 | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用供應商 HTTP/端點功能輔助函式、供應商 HTTP 錯誤和音訊轉錄多部分表單輔助函式 | | `plugin-sdk/provider-web-fetch-contract` | 精簡的 web-fetch 設定/選取合約輔助函式，例如
  `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web-fetch 供應商註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 精簡的 web-search 設定/憑證輔助函式，適用於不需要外掛啟用連線的供應商 | | `plugin-sdk/provider-web-search-contract` | 精簡的 web-search 設定/憑證合約輔助函式，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和範圍憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | Web-search 供應商註冊/快取/執行時輔助函式 | | `plugin-sdk/embedding-providers` | 通用嵌入供應商類型和讀取輔助函式，包括 `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 和 `listEmbeddingProviders(...)`；外掛透過
  `api.registerEmbeddingProvider(...)` 註冊供應商，以強制執行清單擁有權 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`，以及 DeepSeek/Gemini/OpenAI 結構清理 + 診斷 | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 和類似項目 | | `plugin-sdk/provider-stream` |
  `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝器類型，以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝器輔助函式 | | `plugin-sdk/provider-transport-runtime` | 原生供應商傳輸輔助函式，例如受防護的 fetch、傳輸訊息轉換和可寫入傳輸事件串流 | | `plugin-sdk/provider-onboard` |
  上架設定修補輔助函式 | | `plugin-sdk/global-singleton` | 程序本機單例/映射/快取輔助函式 | | `plugin-sdk/group-activation` | 精簡群組啟動模式和指令剖析輔助函式 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`、指令註冊輔助函式，包括動態引數選單格式設定與傳送者授權輔助函式 | | `plugin-sdk/command-status` | 指令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 與 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 審核者解析與相同聊天動作授權輔助函式 | | `plugin-sdk/approval-client-runtime` |
  原生執行審核設定檔/篩選輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 原生審核能力/傳遞配接器 | | `plugin-sdk/approval-gateway-runtime` | 共用審核閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 針對熱通道進入點的輕量級原生審核配接器載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 更廣泛的審核處理器執行階段輔助函式；若足夠使用，建議優先使用較窄的配接器/閘道介面
  | | `plugin-sdk/approval-native-runtime` | 原生審核目標與帳號綁定輔助函式 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛程式審核回覆載荷輔助函式 | | `plugin-sdk/approval-runtime` | 執行/外掛程式審核載荷輔助函式、原生審核路由/執行階段輔助函式，以及結構化審核顯示輔助函式（例如 `formatApprovalDisplayPath`） | | `plugin-sdk/reply-dedupe` | 窄向傳入回覆去重重設輔助函式 | |
  `plugin-sdk/channel-contract-testing` | 不包含廣泛測試匯入桶的窄向通道合約測試輔助函式 | | `plugin-sdk/command-auth-native` | 原生指令授權、動態引數選單格式設定，以及原生工作階段目標輔助函式 | | `plugin-sdk/command-detection` | 共用指令偵測輔助函式 | | `plugin-sdk/command-primitives-runtime` | 針對熱通道路徑的輕量級指令文字述詞 | | `plugin-sdk/command-surface` | 指令主體正規化與指令介面輔助函式
  | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 針對通道/外掛程式密碼介面的窄向密碼合約集合輔助函式 | | `plugin-sdk/secret-ref-runtime` | 用於密碼合約/設定解析的窄向 `coerceSecretRef` 與 SecretRef 類型輔助函式 | | `plugin-sdk/security-runtime` | 共用信任、DM
  閘控、根綁定檔案/路徑輔助函式，包括僅建立寫入、同步/非同步原子檔案替換、同層級暫存寫入、跨裝置移動後援、私人檔案存放輔助函式、符號連結父項防護、外部內容、敏感文字塗銷、常數時間密碼比對與密碼集合輔助函式 | | `plugin-sdk/ssrf-policy` | 主機允許清單與私人網路 SSRF 原則輔助函式 | | `plugin-sdk/ssrf-dispatcher` | 不包含廣泛基礎架構執行階段介面的窄向固定派發器輔助函式 | | `plugin-sdk/ssrf-runtime` |
  固定派發器、SSRF 防護擷取、SSRF 錯誤與 SSRF 原則輔助函式 | | `plugin-sdk/secret-input` | 密碼輸入解析輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助函式與原始 websocket/body 強制轉換 | | `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助函式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | Broad runtime/logging/backup/plugin-install helpers | | `plugin-sdk/runtime-env` | Narrow runtime env, logger, timeout, retry, and backoff helpers | | `plugin-sdk/browser-config` | Supported browser config facade for normalized profile/defaults, CDP URL parsing, and browser-control auth helpers | |
  `plugin-sdk/agent-harness-task-runtime` | Generic task lifecycle and completion delivery helpers for harness-backed agents using a host-issued task scope | | `plugin-sdk/codex-mcp-projection` | Reserved bundled Codex helper for projecting user MCP server config into Codex thread config; not for third-party plugins | | `plugin-sdk/codex-native-task-runtime` | Private bundled Codex helper for
  native task mirror/runtime wiring; not for third-party plugins | | `plugin-sdk/channel-runtime-context` | Generic channel runtime-context registration and lookup helpers | | `plugin-sdk/matrix` | Deprecated Matrix compatibility facade for older third-party channel packages; new plugins should import `plugin-sdk/run-command` directly | | `plugin-sdk/mattermost` | Deprecated Mattermost
  compatibility facade for older third-party channel packages; new plugins should import generic SDK subpaths directly | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | Shared plugin command/hook/http/interactive helpers | | `plugin-sdk/hook-runtime` | Shared webhook/internal hook pipeline helpers | | `plugin-sdk/lazy-runtime` | Lazy runtime
  import/binding helpers such as `createLazyRuntimeModule`, `createLazyRuntimeMethod`, and `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Process exec helpers | | `plugin-sdk/cli-runtime` | CLI formatting, wait, version, argument-invocation, and lazy command-group helpers | | `plugin-sdk/gateway-method-runtime` | Reserved Gateway method dispatch helper for plugin HTTP routes that
  declare `contracts.gatewayMethodDispatch: ["authenticated-request"]` | | `plugin-sdk/gateway-runtime` | Gateway client, event-loop-ready client start helper, gateway CLI RPC, gateway protocol errors, and channel-status patch helpers | | `plugin-sdk/config-contracts` | Focused type-only config surface for plugin config shapes such as `OpenClawConfig` and channel/provider config types | |
  `plugin-sdk/plugin-config-runtime` | Runtime plugin-config lookup helpers such as `requireRuntimeConfig`, `resolvePluginConfigObject`, and `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | Transactional config mutation helpers such as `mutateConfigFile`, `replaceConfigFile`, and `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | Current process config snapshot helpers
  such as `getRuntimeConfig`, `getRuntimeConfigSnapshot`, and test snapshot setters | | `plugin-sdk/telegram-command-config` | Telegram command-name/description normalization and duplicate/conflict checks, even when the bundled Telegram contract surface is unavailable | | `plugin-sdk/text-autolink-runtime` | File-reference autolink detection without the broad text barrel | |
  `plugin-sdk/approval-runtime` | Exec/plugin approval helpers, approval-capability builders, auth/profile helpers, native routing/runtime helpers, and structured approval display path formatting | | `plugin-sdk/reply-runtime` | Shared inbound/reply runtime helpers, chunking, dispatch, heartbeat, reply planner | | `plugin-sdk/reply-dispatch-runtime` | Narrow reply dispatch/finalize and
  conversation-label helpers | | `plugin-sdk/reply-history` | Shared short-window reply-history helpers. New message-turn code should use `createChannelHistoryWindow`; lower-level map helpers remain deprecated compatibility exports only | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Narrow text/markdown chunking helpers | |
  `plugin-sdk/session-store-runtime` | Session workflow helpers (`getSessionEntry`, `listSessionEntries`, `patchSessionEntry`, `upsertSessionEntry`), legacy session store path/session-key helpers, updated-at reads, and deprecated whole-store mutation helpers | | `plugin-sdk/cron-store-runtime` | Cron store path/load/save helpers | | `plugin-sdk/state-paths` | State/OAuth dir path helpers | |
  `plugin-sdk/routing` | Route/session-key/account binding helpers such as `resolveAgentRoute`, `buildAgentSessionKey`, and `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Shared channel/account status summary helpers, runtime-state defaults, and issue metadata helpers | | `plugin-sdk/target-resolver-runtime` | Shared target resolver helpers | |
  `plugin-sdk/string-normalization-runtime` | Slug/string normalization helpers | | `plugin-sdk/request-url` | Extract string URLs from fetch/request-like inputs | | `plugin-sdk/run-command` | Timed command runner with normalized stdout/stderr results | | `plugin-sdk/param-readers` | Common tool/CLI param readers | | `plugin-sdk/tool-plugin` | Define a simple typed agent-tool plugin and expose
  static metadata for manifest generation | | `plugin-sdk/tool-payload` | Extract normalized payloads from tool result objects | | `plugin-sdk/tool-send` | Extract canonical send target fields from tool args | | `plugin-sdk/temp-path` | Shared temp-download path helpers and private secure temp workspaces | | `plugin-sdk/logging-core` | Subsystem logger and redaction helpers | |
  `plugin-sdk/markdown-table-runtime` | Markdown table mode and conversion helpers | | `plugin-sdk/model-session-runtime` | Model/session override helpers such as `applyModelOverrideToSessionEntry` and `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk provider config resolution helpers | | `plugin-sdk/json-store` | Small JSON state read/write helpers | |
  `plugin-sdk/file-lock` | Re-entrant file-lock helpers | | `plugin-sdk/persistent-dedupe` | Disk-backed dedupe cache helpers | | `plugin-sdk/acp-runtime` | ACP runtime/session and reply-dispatch helpers | | `plugin-sdk/acp-runtime-backend` | Lightweight ACP backend registration and reply-dispatch helpers for startup-loaded plugins | | `plugin-sdk/acp-binding-resolve-runtime` | Read-only ACP
  binding resolution without lifecycle startup imports | | `plugin-sdk/agent-config-primitives` | Narrow agent runtime config-schema primitives | | `plugin-sdk/boolean-param` | Loose boolean param reader | | `plugin-sdk/dangerous-name-runtime` | Dangerous-name matching resolution helpers | | `plugin-sdk/device-bootstrap` | Device bootstrap and pairing token helpers | |
  `plugin-sdk/extension-shared` | Shared passive-channel, status, and ambient proxy helper primitives | | `plugin-sdk/models-provider-runtime` | `/models` command/provider reply helpers | | `plugin-sdk/skill-commands-runtime` | Skill command listing helpers | | `plugin-sdk/native-command-registry` | Native command registry/build/serialize helpers | | `plugin-sdk/agent-harness` | Experimental
  trusted-plugin surface for low-level agent harnesses: harness types, active-run steer/abort helpers, OpenClaw tool bridge helpers, runtime-plan tool policy helpers, terminal outcome classification, tool progress formatting/detail helpers, and attempt result utilities | | `plugin-sdk/provider-zai-endpoint` | Deprecated Z.AI provider-owned endpoint detection facade; use the Z.AI plugin public API
  | | `plugin-sdk/async-lock-runtime` | Process-local async lock helper for small runtime state files | | `plugin-sdk/channel-activity-runtime` | Channel activity telemetry helper | | `plugin-sdk/concurrency-runtime` | Bounded async task concurrency helper | | `plugin-sdk/dedupe-runtime` | In-memory dedupe cache helpers | | `plugin-sdk/delivery-queue-runtime` | Outbound pending-delivery drain
  helper | | `plugin-sdk/file-access-runtime` | Safe local-file and media-source path helpers | | `plugin-sdk/heartbeat-runtime` | Heartbeat wake, event, and visibility helpers | | `plugin-sdk/number-runtime` | Numeric coercion helper | | `plugin-sdk/secure-random-runtime` | Secure token/UUID helpers | | `plugin-sdk/system-event-runtime` | System event queue helpers | |
  `plugin-sdk/transport-ready-runtime` | Transport readiness wait helper | | `plugin-sdk/infra-runtime` | Deprecated compatibility shim; use the focused runtime subpaths above | | `plugin-sdk/collection-runtime` | Small bounded cache helpers | | `plugin-sdk/diagnostic-runtime` | Diagnostic flag, event, and trace-context helpers | | `plugin-sdk/error-runtime` | Error graph, formatting, shared error
  classification helpers, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Wrapped fetch, proxy, EnvHttpProxyAgent option, and pinned lookup helpers | | `plugin-sdk/runtime-fetch` | Dispatcher-aware runtime fetch without proxy/guarded-fetch imports | | `plugin-sdk/response-limit-runtime` | Bounded response-body reader without the broad media runtime surface | |
  `plugin-sdk/session-binding-runtime` | Current conversation binding state without configured binding routing or pairing stores | | `plugin-sdk/session-store-runtime` | Session-store helpers without broad config writes/maintenance imports | | `plugin-sdk/context-visibility-runtime` | Context visibility resolution and supplemental context filtering without broad config/security imports | |
  `plugin-sdk/string-coerce-runtime` | Narrow primitive record/string coercion and normalization helpers without markdown/logging imports | | `plugin-sdk/host-runtime` | Hostname and SCP host normalization helpers | | `plugin-sdk/retry-runtime` | Retry config and retry runner helpers | | `plugin-sdk/agent-runtime` | Agent dir/identity/workspace helpers, including `resolveAgentDir`,
  `resolveDefaultAgentDir`, and deprecated `resolveOpenClawAgentDir` compatibility export | | `plugin-sdk/directory-runtime` | Config-backed directory query/dedup | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/media-runtime` | 共用的媒體擷取/轉換/儲存輔助工具，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已棄用的 `fetchRemoteMedia`；當 URL 應變成 OpenClaw 媒體時，優先使用儲存輔助工具而非緩衝區讀取 | | `plugin-sdk/media-mime` | 精簡的 MIME 正規化、副檔名對應、MIME 偵測和媒體類型輔助工具 | | `plugin-sdk/media-store` |
  精簡的媒體儲存輔助工具，例如 `saveMediaBuffer` 和 `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | 共用的媒體生成容錯移轉輔助工具、候選選取和遺失模型訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型，以及提供者導向的影像/音訊/結構化擷取輔助工具匯出 | | `plugin-sdk/meeting-notes` | 會議筆記來源提供者類型、註冊表輔助工具和提供者 ID 正規化 | |
  `plugin-sdk/text-chunking` | 文字和 Markdown 分塊/呈現輔助工具、Markdown 表格轉換、指令標籤移除和安全文字公用程式 | | `plugin-sdk/text-chunking` | 外寄文字分塊輔助工具 | | `plugin-sdk/speech` | 語音提供者類型，以及提供者導向的指令、註冊表、驗證、OpenAI 相容 TTS 建構器和語音輔助工具匯出 | | `plugin-sdk/speech-core` | 共用的語音提供者類型、註冊表、指令、正規化和語音輔助工具匯出 | |
  `plugin-sdk/realtime-transcription` | 即時轉錄提供者類型、註冊表輔助工具和共用的 WebSocket 會話輔助工具 | | `plugin-sdk/realtime-bootstrap-context` | 針對有界 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 語境插入的即時設定檔啟動輔助工具 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型和註冊表輔助工具 | | `plugin-sdk/image-generation` | 影像生成提供者類型，以及影像資產/資料 URL 輔助工具和 OpenAI
  相容的影像提供者建構器 | | `plugin-sdk/image-generation-core` | 共用的影像生成類型、容錯移轉、驗證和註冊表輔助工具 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` | 共用的音樂生成類型、容錯移轉輔助工具、提供者查詢和模型參考解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` |
  共用的影片生成類型、容錯移轉輔助工具、提供者查詢和模型參考解析 | | `plugin-sdk/meeting-notes` | 共用的會議筆記來源提供者類型、註冊表輔助工具、會話描述子和發話元資料 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表和路由安裝輔助工具 | | `plugin-sdk/webhook-path` | 已棄用的相容性別名；請使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | 共用的遠端/本機媒體載入輔助工具 | |
  `plugin-sdk/zod` | 已棄用的相容性重新匯出；請直接從 `zod` 匯入 `zod` | | `plugin-sdk/testing` | 存儲庫本地的已棄用相容性匯出桶，用於舊版 OpenClaw 測試。新的存儲庫測試應改為匯入專注的本機測試子路徑，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` | |
  `plugin-sdk/plugin-test-api` | 存儲庫本地的最小化 `createTestPluginApi` 輔助工具，用於直接的外掛註冊單元測試，無需匯入存儲庫測試輔助橋接器 | | `plugin-sdk/agent-runtime-test-contracts` | 存儲庫本地的原生代理執行時介面卡合約固定裝置，用於驗證、傳遞、容錯移轉、工具勾點、提示覆蓋、綱要和轉錄投影測試 | | `plugin-sdk/channel-test-helpers` |
  存儲庫本地的導向通道測試輔助工具，用於通用動作/設定/狀態合約、目錄斷言、帳戶啟動生命週期、傳送設定執行緒、執行時模擬、狀態問題、外寄傳遞和勾點註冊 | | `plugin-sdk/channel-target-testing` | 存儲庫本地的共用目標解析錯誤案例套件，用於通道測試 | | `plugin-sdk/plugin-test-contracts` | 存儲庫本地的外掛套件、註冊、公開產出、直接匯入、執行時 API 和匯入副作用合約輔助工具 | |
  `plugin-sdk/provider-test-contracts` | 存儲庫本地的提供者執行時、驗證、探索、上架、目錄、精靈、媒體功能、重播原則、即時 STT 即時音訊、網路搜尋/擷取和串流合約輔助工具 | | `plugin-sdk/provider-http-test-mocks` | 存儲庫本地的選用 Vitest HTTP/驗證模擬，用於執行 `plugin-sdk/provider-http` 的提供者測試 | | `plugin-sdk/test-fixtures` | 存儲庫本地的通用 CLI
  執行時擷取、沙箱語境、技能寫入器、代理訊息、系統事件、模組重新載入、組合外掛路徑、終端機文字、分塊、驗證權杖和型別案例固定裝置 | | `plugin-sdk/test-node-mocks` | 存儲庫本地的專注 Node 內建模擬輔助工具，用於 Vitest `vi.mock("node:*")` 工廠內部 |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於管理員/設定/檔案/CLI 協助程式的配套記憶體核心協助程式介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時期外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` |
  記憶體主機嵌入式合約、登錄存取、本機提供者以及一般批次/遠端協助程式 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` |
  記憶體主機祕密協助程式 | | `plugin-sdk/memory-core-host-events` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態協助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-files`
  | 記憶體主機檔案/執行時期協助程式 | | `plugin-sdk/memory-host-core` | 用於記憶體主機核心執行時期協助程式的供應商中立別名 | | `plugin-sdk/memory-host-events` | 用於記憶體主機事件日誌協助程式的供應商中立別名 | | `plugin-sdk/memory-host-files` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 用於記憶體相關外掛程式的共用管理 Markdown
  協助程式 | | `plugin-sdk/memory-host-search` | 用於搜尋管理員存取的作用中記憶體執行時期外觀 | | `plugin-sdk/memory-host-status` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    Reserved bundled-helper SDK subpaths are narrow owner-specific surfaces for
    bundled plugin code. They are tracked in the SDK inventory so package
    builds and aliasing stay deterministic, but they are not general plugin
    authoring APIs. New reusable host contracts should use generic SDK subpaths
    such as `plugin-sdk/gateway-runtime`, `plugin-sdk/security-runtime`, and
    `plugin-sdk/plugin-config-runtime`.

    | Subpath | Owner and purpose |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | Bundled Codex plugin helper for projecting user MCP server config into Codex app-server thread config |
    | `plugin-sdk/codex-native-task-runtime` | Bundled Codex plugin helper for mirroring Codex app-server native subagents into OpenClaw task state |

  </Accordion>
</AccordionGroup>

## 相關

- [Plugin SDK 概覽](/zh-Hant/plugins/sdk-overview)
- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛程式](/zh-Hant/plugins/building-plugins)
