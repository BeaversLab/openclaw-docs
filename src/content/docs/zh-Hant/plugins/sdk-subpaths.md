---
summary: "Plugin SDK 子路徑目錄：依區域分組的 import 位置"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路徑"
---

外掛程式 SDK 以 `openclaw/plugin-sdk/` 下的一組狹窄的公用子路徑公開。此頁面按用途分類列出了常用的子路徑。生成的編譯器入口點清單位於 `scripts/lib/plugin-sdk-entrypoints.json`；套件匯出是從 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的儲存庫本機測試/內部子路徑中扣除後的公用子集。維護者可以使用 `pnpm plugin-sdk:surface` 審查公用匯出數量，並使用 `pnpm plugins:boundary-report:summary` 審查作用中保留的輔助子路徑；未使用的保留輔助匯出會導致 CI 報告失敗，而不是作為休眠的相容性債務保留在公用 SDK 中。

如需外掛程式撰寫指南，請參閱[Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)。

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

已棄用的子路徑會繼續匯出以供舊版外掛程式使用，但新程式碼應使用下列專注的 SDK 子路徑。維護清單為 `scripts/lib/plugin-sdk-deprecated-public-subpaths.json`；CI 會拒絕來自該處的套件生產環境匯入。諸如 `compat`、`config-types`、
`infra-runtime`、`text-runtime` 和 `zod` 等寬泛匯入檔案僅供相容性使用。請直接從 `zod` 匯入 `zod`。

OpenClaw 的 Vitest 支援測試輔助子路徑僅限於儲存庫本機使用，不再是套件匯出項：`agent-runtime-test-contracts`、
`channel-contract-testing`、`channel-target-testing`、`channel-test-helpers`、
`plugin-test-api`、`plugin-test-contracts`、`plugin-test-runtime`、
`provider-http-test-mocks`、`provider-test-contracts`、`test-env`、
`test-fixtures`、`test-node-mocks` 和 `testing`。

### 保留的套件外掛程式輔助子路徑

這些子路徑是其所擁有套件外掛程式專用的相容性介面，而非一般的 SDK API：`plugin-sdk/codex-mcp-projection` 和
`plugin-sdk/codex-native-task-runtime`。跨擁有者的擴充功能匯入會被套件合約防護措施阻擋。

<AccordionGroup>
  <Accordion title="Channel subpaths">
    | 子路徑 | 主要匯出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 匯出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 用於外掛自有 schema 的快取 JSON Schema 驗證輔助程式 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, 加上 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共享的設定精靈輔助程式、設定翻譯器、允許清單提示、設定狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已棄用的相容性別名；請使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/動作閘道輔助程式、預設帳號後援輔助程式 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化輔助程式 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後援輔助程式 |
    | `plugin-sdk/account-helpers` | 狹義的帳號清單/帳號動作輔助程式 |
    | `plugin-sdk/access-groups` | 存取群組允許清單解析和編輯過的群組診斷輔助程式 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共享的頻道設定 schema 原語，加上 Zod 和直接的 JSON/TypeBox 建構器 |
    | `plugin-sdk/bundled-channel-config-schema` | 僅供維護的打包外掛使用的打包 OpenClaw 頻道設定 schema |
    | `plugin-sdk/chat-channel-ids` | `BUNDLED_CHAT_CHANNEL_IDS`, `BUNDLED_CHAT_CHANNEL_ENVELOPE_PREFIXES`, `ChatChannelId`。標準的打包/官方聊天頻道 ID，以及格式器標籤/別名，供需要識別信封前綴文字而不將表格硬編碼的外掛使用。 |
    | `plugin-sdk/channel-config-schema-legacy` | 打包頻道設定 schema 的已棄用相容性別名 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助程式，並附帶打包合約後援 |
    | `plugin-sdk/command-gating` | 狹義的指令授權閘道輔助程式 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已棄用的低階頻道入口相容性外觀。新的接收路徑應使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 實驗性的高階頻道入口執行時解析器和已遷移頻道接收路徑的路由事實建構器。比起在每個外掛中組裝有效允許清單、指令允許清單和舊版投影，優先使用此項。請參閱 [Channel ingress API](/zh-Hant/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-outbound` | 訊息生命週期合約，加上回覆管線選項、收據、即時預覽/串流、生命週期輔助程式、輸出身分、載荷規劃、持久傳送和訊息傳送內容輔助程式。請參閱 [Channel outbound API](/zh-Hant/plugins/sdk-channel-outbound)。 |
    | `plugin-sdk/channel-message` | `plugin-sdk/channel-outbound` 加上舊版回覆分派外觀的已棄用相容性別名。 |
    | `plugin-sdk/channel-message-runtime` | `plugin-sdk/channel-outbound` 加上舊版回覆分派外觀的已棄用相容性別名。 |
    | `plugin-sdk/inbound-envelope` | 共享的輸入路由 + 信封建構器輔助程式 |
    | `plugin-sdk/inbound-reply-dispatch` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-inbound` 進行輸入執行器和分派謂詞，並使用 `plugin-sdk/channel-outbound` 進行訊息傳遞輔助程式。 |
    | `plugin-sdk/messaging-targets` | 已棄用的目標解析別名；請使用 `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | 共享的輸出媒體載入輔助程式 |
    | `plugin-sdk/outbound-send-deps` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/outbound-runtime` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/poll-runtime` | 狹義的投票正規化輔助程式 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結生命週期和介面卡輔助程式 |
    | `plugin-sdk/agent-media-payload` | 舊版代理媒體載荷建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒繫結、配對和設定繫結輔助程式 |
    | `plugin-sdk/runtime-config-snapshot` | 執行時設定快照輔助程式 |
    | `plugin-sdk/runtime-group-policy` | 執行時群組原則解析輔助程式 |
    | `plugin-sdk/channel-status` | 共享的頻道狀態快照/摘要輔助程式 |
    | `plugin-sdk/channel-config-primitives` | 狹義的頻道設定 schema 原語 |
    | `plugin-sdk/channel-config-writes` | 頻道設定寫入授權輔助程式 |
    | `plugin-sdk/channel-plugin-common` | 共享的頻道外掛前奏匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助程式 |
    | `plugin-sdk/group-access` | 共享的群組存取決策輔助程式 |
    | `plugin-sdk/direct-dm`, `plugin-sdk/direct-dm-access` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-inbound`。 |
    | `plugin-sdk/direct-dm-guard-policy` | 狹義的直接 DM 加密前衛政策輔助程式 |
    | `plugin-sdk/discord` | 已棄用的 Discord 相容性外觀，用於已發布的 `@openclaw/discord@2026.3.13` 和追蹤的擁有者相容性；新外掛應使用通用頻道 SDK 子路徑 |
    | `plugin-sdk/telegram-account` | 已棄用的 Telegram 帳號解析相容性外觀，用於追蹤的擁有者相容性；新外掛應使用注入的執行時輔助程式或通用頻道 SDK 子路徑 |
    | `plugin-sdk/zalouser` | 已棄用的 Zalo Personal 相容性外觀，用於仍匯入傳送者指令授權的已發布 Lark/Zalo 套件；新外掛應使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 語意訊息呈現、傳遞和舊版互動式回覆輔助程式。請參閱 [Message Presentation](/zh-Hant/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用於事件分類、內容建構、格式化、根、去反彈、提及匹配、提及政策和輸入記錄的共享輸入輔助程式 |
    | `plugin-sdk/channel-inbound-debounce` | 狹義的輸入去反彈輔助程式 |
    | `plugin-sdk/channel-mention-gating` | 狹義的提及政策、提及標記和提及文字輔助程式，不含更廣泛的輸入執行時介面 |
    | `plugin-sdk/channel-envelope`, `plugin-sdk/channel-inbound-roots`, `plugin-sdk/channel-location`, `plugin-sdk/channel-logging` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-inbound` 或 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-pairing-paths` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-pairing`。 |
    | `plugin-sdk/channel-reply-options-runtime` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-streaming` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-send-result` | 回覆結果類型 |
    | `plugin-sdk/channel-actions` | 頻道訊息動作輔助程式，加上為了外掛相容性而保留的已棄用原生 schema 輔助程式 |
    | `plugin-sdk/channel-route` | 共享的路由正規化、驅動程式目標解析、執行緒 ID 字串化、重複資料刪除/精簡路由金鑰、已解析目標類型，以及路由/目標比較輔助程式 |
    | `plugin-sdk/channel-targets` | 目標解析輔助程式；路由比較呼叫者應使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 頻道合約類型 |
    | `plugin-sdk/channel-feedback` | 反應/回饋連線 |
    | `plugin-sdk/channel-secret-runtime` | 狹義的秘密合約輔助程式，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 和秘密目標類型 |
  </Accordion>

已棄用的通道輔助系列僅為已發布外掛程式的相容性而保留。移除計畫如下：在外掛程式遷移期間保留它們，將 repo/bundled 外掛程式保留在 `channel-inbound` 和 `channel-outbound` 上，然後在下一個主要的 SDK 清理工作中移除這些相容性子路徑。這適用於舊的通道 message/runtime、channel streaming、直接 DM 存取、inbound helper splinter、reply-options 以及 pairing-path 系列。

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支援用於設定的 LM Studio provider 外觀、目錄探索及執行時模型準備 | | `plugin-sdk/lmstudio-runtime` | 支援用於本地伺服器預設值、模型探索、請求標頭和已載入模型輔助函式的 LM Studio 執行時外觀 | | `plugin-sdk/provider-setup` | 精選的本地/自託管 provider 設定輔助函式 |
  | `plugin-sdk/self-hosted-provider-setup` | 專注於 OpenAI 相容的自託管 provider 設定輔助函式 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 監看常數 | | `plugin-sdk/provider-auth-runtime` | 用於 provider 外掛的執行時 API 金鑰解析輔助函式 | | `plugin-sdk/provider-oauth-runtime` | 通用 provider OAuth 回呼類型、回呼頁面轉譯、PKCE/狀態輔助函式、授權輸入解析、權杖過期輔助函式和中止輔助函式 | |
  `plugin-sdk/provider-auth-api-key` | API 金鑰導入/設定檔寫入輔助函式，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 標準 OAuth 授權結果建構器 | | `plugin-sdk/provider-env-vars` | Provider 授權環境變數查詢輔助函式 | | `plugin-sdk/provider-auth` |
  `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`、OpenAI Codex 授權匯入輔助函式、已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享重播策略建構器、provider 端點輔助函式和共享模型 ID
  正規化輔助函式 | | `plugin-sdk/provider-catalog-runtime` | 用於合約測試的 Provider 目錄擴充執行時攔截器和外掛-provider 註冊縫合點 | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 provider
  HTTP/端點功能輔助函式、provider HTTP 錯誤和音訊轉錄多部分表單輔助函式 | | `plugin-sdk/provider-web-fetch-contract` | 精簡的 web-fetch 設定/選擇合約輔助函式，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web-fetch provider 註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 精簡的 web-search
  設定/認證輔助函式，適用於不需要外掛啟用接線的 providers | | `plugin-sdk/provider-web-search-contract` | 精簡的 web-search 設定/認證合約輔助函式，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和範圍認證設定器/取得器 | | `plugin-sdk/provider-web-search` | Web-search provider 註冊/快取/執行時輔助函式 | | `plugin-sdk/embedding-providers`
  | 通用嵌入 provider 類型和讀取輔助函式，包括 `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 和 `listEmbeddingProviders(...)`；外掛透過 `api.registerEmbeddingProvider(...)` 註冊 providers，以便強制執行清單擁有權 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks` 和 DeepSeek/Gemini/OpenAI 綱要清理 + 診斷 | | `plugin-sdk/provider-usage` |
  Provider 使用量快照類型、共享使用量擷取輔助函式和 provider 擷取器，例如 `fetchClaudeUsage` | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、資料流包裝器類型、純文字工具呼叫相容性，以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝器輔助函式 | |
  `plugin-sdk/provider-stream-shared` | 公共共享 provider 資料流包裝器輔助函式，包括 `composeProviderStreamWrappers`、`createPlainTextToolCallCompatWrapper`、`createPayloadPatchStreamWrapper`、`createToolStreamWrapper` 和 Anthropic/DeepSeek/OpenAI 相容資料流公用程式 | | `plugin-sdk/provider-transport-runtime` | 原生 provider 傳輸輔助函式，例如受防護的 fetch、傳輸訊息轉換和可寫入傳輸事件資料流 | |
  `plugin-sdk/provider-onboard` | 導入設定檔修補輔助函式 | | `plugin-sdk/global-singleton` | 程序本機單例/對應/快取輔助函式 | | `plugin-sdk/group-activation` | 精簡的群組啟動模式和命令解析輔助函式 |
</Accordion>

提供者使用量快照通常會回報一或多個配額 `windows`，每個都包含標籤、已用百分比與可選的重設時間。若提供者公開的是餘額或帳戶狀態文字，而非可重設的配額視窗，則應回傳 `summary` 並搭配空白的 `windows` 陣列，而非捏造百分比。OpenClaw 會在狀態輸出中顯示該摘要文字；僅當使用量端點失敗或未回傳可用的使用量資料時，才使用 `error`。

<Accordion title="驗證與安全性子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，指令登錄檔輔助程式，包括動態引數選單格式設定、傳送者授權輔助程式 | | `plugin-sdk/command-status` | 指令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 核准者解析與同一聊天動作授權輔助程式 | | `plugin-sdk/approval-client-runtime` |
  原生執行核准設定檔/篩選輔助程式 | | `plugin-sdk/approval-delivery-runtime` | 原生核准功能/傳遞配接器 | | `plugin-sdk/approval-gateway-runtime` | 共用核准閘道解析輔助程式 | | `plugin-sdk/approval-handler-adapter-runtime` | 用於熱通道進入點的輕量級原生核准配接器載入輔助程式 | | `plugin-sdk/approval-handler-runtime` | 廣泛的核准處理器執行時輔助程式；若狹隘的配接器/閘道縫隙已足夠，請優先使用它們 | |
  `plugin-sdk/approval-native-runtime` | 原生核准目標、帳號綁定、路由閘道、轉發後援，以及本機原生執行提示抑制輔助程式 | | `plugin-sdk/approval-reaction-runtime` | 硬式編碼的核准反應綁定、反應提示承載、反應目標存放區，以及用於本機原生執行提示抑制的相容性匯出 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛程式核准回覆承載輔助程式 | | `plugin-sdk/approval-runtime` |
  執行/外掛程式核准承載輔助程式、原生核准路由/執行時輔助程式，以及結構化核准顯示輔助程式，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 狹隘的傳入回覆重複資料移除重設輔助程式 | | `plugin-sdk/channel-contract-testing` | 狹隘的通道合約測試輔助程式，不含廣泛的測試集合 | | `plugin-sdk/command-auth-native` | 原生命令授權、動態引數選單格式設定，以及原生工作階段目標輔助程式 | |
  `plugin-sdk/command-detection` | 共用指令偵測輔助程式 | | `plugin-sdk/command-primitives-runtime` | 用於熱通道路徑的輕量級指令文字述詞 | | `plugin-sdk/command-surface` | 指令主體正規化與指令介面輔助程式 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用於通道/外掛程式秘密介面的狹隘秘密合約集合輔助程式 | | `plugin-sdk/secret-ref-runtime` |
  用於秘密合約/設定檔解析的狹隘 `coerceSecretRef` 和 SecretRef 類型輔助程式 | | `plugin-sdk/secret-provider-integration` | 僅類型 SecretRef 提供者整合資訊清單與預先設定合約，適用於發布外部秘密提供者預先設定的外掛程式 | | `plugin-sdk/security-runtime` | 共用信任、DM
  閘道、以根為界的檔案/路徑輔助程式，包括僅建立寫入、同步/非同步原子檔案取代、同層級暫存寫入、跨裝置移動後援、私人檔案存放區輔助程式、符號連結父系防護、外部內容、敏感性文字編修、恆定時間秘密比較，以及秘密集合輔助程式 | | `plugin-sdk/ssrf-policy` | 主機允許清單與私人網路 SSRF 原則輔助程式 | | `plugin-sdk/ssrf-dispatcher` | 狹隘的固定調度器輔助程式，不含廣泛的基礎設施執行時介面 | |
  `plugin-sdk/ssrf-runtime` | 固定調度器、SSRF 防護擷取、SSRF 錯誤，以及 SSRF 原則輔助程式 | | `plugin-sdk/secret-input` | 秘密輸入解析輔助程式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助程式與原始 WebSocket/主體強制轉換 | | `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助程式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/runtime` | 廣泛的 runtime/logging/backup/plugin-install 輔助函式 | | `plugin-sdk/runtime-env` | 精簡的 runtime env、logger、timeout、retry 與 backoff 輔助函式 | | `plugin-sdk/browser-config` | 支援的瀏覽器設定外觀，用於標準化的 profile/defaults、CDD URL 解析與瀏覽器控制驗證輔助函式 | | `plugin-sdk/agent-harness-task-runtime` |
  通用任務生命週期與完成交付輔助函式，適用於使用主機發出任務範圍的 harness-backed 代理程式 | | `plugin-sdk/codex-mcp-projection` | 保留的內建 Codex 輔助函式，用於將使用者 MCP 伺服器設定投影到 Codex 執行緒設定；不適用於第三方外掛 | | `plugin-sdk/codex-native-task-runtime` | 私有的內建 Codex 輔助函式，用於原生任務鏡像/runtime 接線；不適用於第三方外掛 | | `plugin-sdk/channel-runtime-context` |
  通用通道 runtime-context 註冊與查詢輔助函式 | | `plugin-sdk/matrix` | 已棄用的 Matrix 相容性外觀，用於舊版第三方通道套件；新外掛應直接匯入 `plugin-sdk/run-command` | | `plugin-sdk/mattermost` | 已棄用的 Mattermost 相容性外觀，用於舊版第三方通道套件；新外掛應直接匯入通用 SDK 子路徑 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共用的外掛
  command/hook/http/interactive 輔助函式 | | `plugin-sdk/hook-runtime` | 共用的 webhook/internal hook pipeline 輔助函式 | | `plugin-sdk/lazy-runtime` | 延遲 runtime import/binding 輔助函式，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Process exec 輔助函式 | | `plugin-sdk/cli-runtime` | CLI
  格式化、wait、version、argument-invocation 與延遲 command-group 輔助函式 | | `plugin-sdk/qa-live-transport-scenarios` | 共用的即時傳輸 QA 情境 ID、基準覆蓋率輔助函式與情境選擇輔助函式 | | `plugin-sdk/gateway-method-runtime` | 保留的 Gateway 方法分派輔助函式，適用於宣告 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的外掛 HTTP 路由 | | `plugin-sdk/gateway-runtime` | Gateway
  client、event-loop-ready client 啟動輔助函式、gateway CLI RPC、gateway protocol 錯誤與 channel-status 修補輔助函式 | | `plugin-sdk/config-contracts` | 專注於僅類型的設定介面，用於外掛設定形狀，例如 `OpenClawConfig` 與通道/提供者設定類型 | | `plugin-sdk/plugin-config-runtime` | Runtime 外掛設定查詢輔助函式，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和
  `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | 交易式設定變更輔助函式，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 目前程序設定快照輔助函式，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 與測試快照設定器 | | `plugin-sdk/telegram-command-config` | Telegram command-name/description
  標準化與重複/衝突檢查，即使內建的 Telegram contract 介面無法使用 | | `plugin-sdk/text-autolink-runtime` | 檔案參考 autolink 偵測，不包含廣泛的文字 barrel | | `plugin-sdk/approval-reaction-runtime` | 硬編碼的批准反應綁定、反應提示 payload、反應目標存放區，以及用於本機原生 exec 提示抑制的相容性匯出 | | `plugin-sdk/approval-runtime` | Exec/外掛批准輔助函式、批准功能建構器、auth/profile
  輔助函式、原生 routing/runtime 輔助函式與結構化批准顯示路徑格式化 | | `plugin-sdk/reply-runtime` | 共用的 inbound/reply runtime 輔助函式、分塊、分派、heartbeat、reply planner | | `plugin-sdk/reply-dispatch-runtime` | 精簡的 reply 分派/完成與對話標籤輔助函式 | | `plugin-sdk/reply-history` | 共用的短視窗 reply-history 輔助函式。新的 message-turn 程式碼應使用 `createChannelHistoryWindow`；低層級
  map 輔助函式僅保留作為已棄用的相容性匯出 | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 精簡的文字/markdown 分塊輔助函式 | | `plugin-sdk/session-store-runtime` | Session 工作流程輔助函式 (`getSessionEntry`、`listSessionEntries`、`patchSessionEntry`、`upsertSessionEntry`)、舊版 session store 路徑/session-key 輔助函式、updated-at
  讀取與已棄用的全存放區變更輔助函式 | | `plugin-sdk/cron-store-runtime` | Cron store 路徑/載入/儲存輔助函式 | | `plugin-sdk/state-paths` | State/OAuth 目錄路徑輔助函式 | | `plugin-sdk/plugin-state-runtime` | 外掛 sidecar SQLite 鍵值狀態類型 | | `plugin-sdk/routing` | 路由/session-key/帳號綁定輔助函式，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | |
  `plugin-sdk/status-helpers` | 共用通道/帳號狀態摘要輔助函式、runtime-state 預設值與問題中繼資料輔助函式 | | `plugin-sdk/target-resolver-runtime` | 共用目標解析器輔助函式 | | `plugin-sdk/string-normalization-runtime` | Slug/字串標準化輔助函式 | | `plugin-sdk/request-url` | 從 fetch/request-like 輸入中擷取字串 URL | | `plugin-sdk/run-command` | 具有標準化 stdout/stderr 結果的計時指令執行器 | |
  `plugin-sdk/param-readers` | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-plugin` | 定義簡單的類型化 agent-tool 外掛並公開靜態中繼資料以用於 manifest 產生 | | `plugin-sdk/tool-payload` | 從工具結果物件中擷取標準化的 payload | | `plugin-sdk/tool-send` | 從工具引數中擷取標準的傳送目標欄位 | | `plugin-sdk/sandbox` | 沙盒後端類型與 SSH/OpenShell 指令輔助函式，包括 fail-fast exec 指令 preflight | |
  `plugin-sdk/temp-path` | 共用的暫存下載路徑輔助函式與私用安全暫存工作區 | | `plugin-sdk/logging-core` | 子系統 logger 與編修輔助函式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式與轉換輔助函式 | | `plugin-sdk/model-session-runtime` | 模型/會話覆寫輔助函式，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk
  提供者設定解析輔助函式 | | `plugin-sdk/json-store` | 小型 JSON 狀態讀寫輔助函式 | | `plugin-sdk/json-unsafe-integers` | JSON 解析輔助函式，可將不安全的整數常值保留為字串 | | `plugin-sdk/file-lock` | 可重入的檔案鎖定輔助函式 | | `plugin-sdk/persistent-dedupe` | 磁碟備份的去重快取輔助函式 | | `plugin-sdk/acp-runtime` | ACP runtime/會話與 reply 分派輔助函式 | | `plugin-sdk/acp-runtime-backend` |
  輕量級 ACP 後端註冊與 reply 分派輔助函式，適用於啟動時載入的外掛 | | `plugin-sdk/acp-binding-resolve-runtime` | 唯讀 ACP 綁定解析，無需生命週期啟動匯入 | | `plugin-sdk/agent-config-primitives` | 精簡的 agent runtime 設定架構基本型別 | | `plugin-sdk/boolean-param` | 寬鬆的布林值參數讀取器 | | `plugin-sdk/dangerous-name-runtime` | 危險名稱匹配解析輔助函式 | | `plugin-sdk/device-bootstrap` |
  裝置引導與配對權杖輔助函式 | | `plugin-sdk/extension-shared` | 共用的被動通道、狀態與環境代理程式輔助基本型別 | | `plugin-sdk/models-provider-runtime` | `/models` 指令/提供者回覆輔助函式 | | `plugin-sdk/skill-commands-runtime` | 技能指令列出輔助函式 | | `plugin-sdk/native-command-registry` | 原生指令註冊/建置/序列化輔助函式 | | `plugin-sdk/agent-harness` | 實驗性受信任外掛介面，用於低層級 agent
  harness：harness 類型、active-run steer/abort 輔助函式、OpenClaw 工具橋接輔助函式、runtime-plan 工具原則輔助函式、終端機結果分類、工具進度格式化/詳細輔助函式與嘗試結果公用程式 | | `plugin-sdk/provider-zai-endpoint` | 已棄用的 Z.AI 提供者擁有的端點偵測外觀；請使用 Z.AI 外掛公用 API | | `plugin-sdk/async-lock-runtime` | 程序本機非同步鎖定輔助函式，用於小型 runtime 狀態檔案 | |
  `plugin-sdk/channel-activity-runtime` | 通道活動遙測輔助函式 | | `plugin-sdk/concurrency-runtime` | 有界的非同步任務並行輔助函式 | | `plugin-sdk/dedupe-runtime` | 記憶體內去重快取輔助函式 | | `plugin-sdk/delivery-queue-runtime` | 外送待交付排除輔助函式 | | `plugin-sdk/file-access-runtime` | 安全的本機檔案與媒體來源路徑輔助函式 | | `plugin-sdk/heartbeat-runtime` | Heartbeat
  喚醒、事件與可見性輔助函式 | | `plugin-sdk/number-runtime` | 數值強制轉換輔助函式 | | `plugin-sdk/secure-random-runtime` | 安全權杖/UUID 輔助函式 | | `plugin-sdk/system-event-runtime` | 系統事件佇列輔助函式 | | `plugin-sdk/transport-ready-runtime` | 傳輸就緒等待輔助函式 | | `plugin-sdk/exec-approvals-runtime` | Exec 批准原則檔案輔助函式，不包含廣泛的 infra-runtime barrel | |
  `plugin-sdk/infra-runtime` | 已棄用的相容性 shim；請使用上述專注的 runtime 子路徑 | | `plugin-sdk/collection-runtime` | 小型有界快取輔助函式 | | `plugin-sdk/diagnostic-runtime` | 診斷旗標、事件與追蹤內容輔助函式 | | `plugin-sdk/error-runtime` | 錯誤圖表、格式化、共用錯誤分類輔助函式、`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包裝的 fetch、proxy、EnvHttpProxyAgent
  選項與釘選查詢輔助函式 | | `plugin-sdk/runtime-fetch` | 分派器感知的 runtime fetch，無需 proxy/guarded-fetch 匯入 | | `plugin-sdk/inline-image-data-url-runtime` | 內聯圖片資料 URL 清理與簽章嗅探輔助函式，不包含廣泛的 media runtime 介面 | | `plugin-sdk/response-limit-runtime` | 有界的回應主體讀取器，不包含廣泛的 media runtime 介面 | | `plugin-sdk/session-binding-runtime` |
  目前對話綁定狀態，無需設定的綁定路由或配對存放區 | | `plugin-sdk/session-store-runtime` | Session-store 輔助函式，無需廣泛的設定寫入/維護匯入 | | `plugin-sdk/context-visibility-runtime` | 內容可見性解析與補充內容篩選，無需廣泛的設定/安全性匯入 | | `plugin-sdk/string-coerce-runtime` | 精簡的基本記錄/字串強制轉換與標準化輔助函式，無需 markdown/logging 匯入 | | `plugin-sdk/host-runtime` |
  主機名稱與 SCP 主機標準化輔助函式 | | `plugin-sdk/retry-runtime` | 重試設定與重試執行器輔助函式 | | `plugin-sdk/agent-runtime` | Agent 目錄/身分識別/工作區輔助函式，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 與已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/directory-runtime` | 設定支援的目錄查詢/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | 共用媒體擷取/轉換/儲存輔助程式，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已棄用的 `fetchRemoteMedia`；當 URL 應轉換為 OpenClaw 媒體時，優先使用儲存輔助程式而非緩衝區讀取 | | `plugin-sdk/media-mime` | 狹義 MIME 正規化、副檔名對應、MIME 偵測和媒體種類輔助程式 | | `plugin-sdk/media-store` |
  狹義媒體儲存輔助程式，例如 `saveMediaBuffer` 和 `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | 共用媒體生成故障移轉輔助程式、候選選擇和遺失模型訊息 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型，以及提供者導向的影像/音訊/結構化擷取輔助匯出 | | `plugin-sdk/text-chunking` | 文字和 Markdown 分塊/轉譯輔助程式、Markdown 表格轉換、指令標籤去除和安全文字公用程式 | |
  `plugin-sdk/text-chunking` | 出站文字分塊輔助程式 | | `plugin-sdk/speech` | 語音提供者類型，以及提供者導向的指令、註冊表、驗證、OpenAI 相容 TTS 建構器和語音輔助匯出 | | `plugin-sdk/speech-core` | 共用語音提供者類型、註冊表、指令、正規化和語音輔助匯出 | | `plugin-sdk/realtime-transcription` | 即時轉錄提供者類型、註冊表輔助程式和共用 WebSocket 會話輔助程式 | |
  `plugin-sdk/realtime-bootstrap-context` | 即時設定檔啟動輔助程式，用於有界的 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 內文注入 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型、註冊表輔助程式和共用即時語音行為輔助程式，包括輸出活動追蹤 | | `plugin-sdk/image-generation` | 影像生成提供者類型，加上影像資產/資料 URL 輔助程式和 OpenAI 相容影像提供者建構器 | | `plugin-sdk/image-generation-core` |
  共用影像生成類型、故障移轉、驗證和註冊表輔助程式 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂生成類型、故障移轉輔助程式、提供者查閱和模型參照解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共用影片生成類型、故障移轉輔助程式、提供者查閱和模型參照解析 | |
  `plugin-sdk/transcripts` | 共用逐字稿來源提供者類型、註冊表輔助程式、會話描述元和發話中繼資料 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表和路由安裝輔助程式 | | `plugin-sdk/webhook-path` | 已棄用的相容性別名；請使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | 共用遠端/本機媒體載入輔助程式 | | `plugin-sdk/zod` | 已棄用的相容性重新匯出；請直接從 `zod` 匯入 `zod` | |
  `plugin-sdk/testing` | 程式庫本機已棄用相容性匯集區，用於舊版 OpenClaw 測試。新的程式庫測試應改用專注的本機測試子路徑，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` | | `plugin-sdk/plugin-test-api` | 程式庫本機最小 `createTestPluginApi`
  輔助程式，用於直接外掛程式註冊單元測試，無需匯入程式庫測試輔助橋接器 | | `plugin-sdk/agent-runtime-test-contracts` | 程式庫本機原生代理執行時期配接器合約固定裝置，用於驗證、遞送、故障移轉、工具掛勾、提示覆疊、結構描述和逐字稿投影測試 | | `plugin-sdk/channel-test-helpers` |
  程式庫本機導向通道的測試輔助程式，用於一般動作/設定/狀態合約、目錄斷言、帳戶啟動生命週期、傳送配置執行緒、執行時期模擬物件、狀態問題、出站遞送和掛勾註冊 | | `plugin-sdk/channel-target-testing` | 程式庫本機共用目標解析錯誤案例套件，用於通道測試 | | `plugin-sdk/plugin-test-contracts` | 程式庫本機外掛程式套件、註冊、公開製件、直接匯入、執行時期 API 和匯入副作用合約輔助程式 | |
  `plugin-sdk/provider-test-contracts` | 程式庫本機提供者執行時期、驗證、探索、上架、目錄、精靈、媒體功能、重播政策、即時 STT 即時音訊、網路搜尋/擷取和串流合約輔助程式 | | `plugin-sdk/provider-http-test-mocks` | 程式庫本機選用 Vitest HTTP/驗證模擬物件，用於執行 `plugin-sdk/provider-http` 的提供者測試 | | `plugin-sdk/test-fixtures` | 程式庫本機一般 CLI
  執行時期擷取、沙箱內文、技能寫入器、代理訊息、系統事件、模組重新載入、配套外掛程式路徑、終端機文字、分塊、驗證權杖和型別案例固定裝置 | | `plugin-sdk/test-node-mocks` | 程式庫本機專注 Node 內建模擬輔助程式，用於 Vitest `vi.mock("node:*")` 工廠內部 |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於管理員/設定/檔案/CLI 協助程式的套件記憶體核心協助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時外觀 | | `plugin-sdk/memory-core-host-embedding-registry` | 輕量級記憶體嵌入提供者註冊表協助程式 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | |
  `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入合約、註冊表存取、本機提供者以及通用批次/遠端協助程式。此介面上的 `registerMemoryEmbeddingProvider` 已棄用；針對新的提供者，請使用通用嵌入提供者 API。 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | |
  `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機祕密協助程式 | | `plugin-sdk/memory-core-host-events` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態協助程式 | |
  `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時協助程式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時協助程式 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行時協助程式的廠商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌協助程式的廠商中立別名 | |
  `plugin-sdk/memory-host-files` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 用於記憶體相關外掛的共用受管理 Markdown 協助程式 | | `plugin-sdk/memory-host-search` | 用於搜尋管理員存取的作用中記憶體執行時外觀 | | `plugin-sdk/memory-host-status` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    保留的 bundled-helper SDK 子路徑是專屬擁有者的狹窄介面，用於
    打包的 plugin 程式碼。它們在 SDK 清單中進行追蹤，以確保
    套件建構和別名保持確定性，但它們並非通用的
    plugin 撰寫 API。新的可重複使用主機合約應使用通用 SDK 子路徑，
    例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和
    `plugin-sdk/plugin-config-runtime`。

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
