---
summary: "Plugin SDK 子路徑目錄：依區域分組的 import 位置"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路徑"
---

外掛程式 SDK 以 `openclaw/plugin-sdk/` 下的一組狹窄的公用子路徑公開。此頁面按用途分類列出了常用的子路徑。生成的編譯器入口點清單位於 `scripts/lib/plugin-sdk-entrypoints.json`；套件匯出是從 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的儲存庫本機測試/內部子路徑中扣除後的公用子集。維護者可以使用 `pnpm plugin-sdk:surface` 審查公用匯出數量，並使用 `pnpm plugins:boundary-report:summary` 審查作用中保留的輔助子路徑；未使用的保留輔助匯出會導致 CI 報告失敗，而不是作為休眠的相容性債務保留在公用 SDK 中。

如需外掛程式撰寫指南，請參閱 [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)。

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
  <Accordion title="頻道子路徑">
    | 子路徑 | 主要匯出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 匯出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 針對外掛擁有 schema 的快取 JSON Schema 驗證輔助工具 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
    | `plugin-sdk/setup` | 共用的設定精靈輔助工具、設定翻譯器、允許清單提示、設定狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`、`createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`、`noteChannelLookupFailure`、`noteChannelLookupSummary`、`promptResolvedAllowFrom`、`splitSetupEntries`、`createAllowlistSetupWizardProxy`、`createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已棄用的相容性別名；請使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/動作閘門輔助工具、預設帳號後援輔助工具 |
    | `plugin-sdk/account-id``DEFAULT_ACCOUNT_ID` | %%PH:INLINE_CODE:108:3b4be1b%%、帳號 ID 正規化輔助工具 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後援輔助工具 |
    | `plugin-sdk/account-helpers` | 窄帳號清單/帳號動作輔助工具 |
    | `plugin-sdk/access-groups` | 存取群組允許清單解析和編輯過的群組診斷輔助工具 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`、`resolveChannelDmAccess`、`resolveChannelDmAllowFrom`、`resolveChannelDmPolicy`、`normalizeChannelDmPolicy`、`normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共用的頻道設定 schema 基本類型，加上 Zod 和直接 JSON/TypeBox 建構器 |
    | `plugin-sdk/bundled-channel-config-schema` | 僅供維護的內置外掛使用的內置 OpenClaw 頻道設定 schema |
    | `plugin-sdk/channel-config-schema-legacy` | 內置頻道設定 schema 的已棄用相容性別名 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助工具，附帶內置合約後援 |
    | `plugin-sdk/command-gating` | 窄指令授權閘門輔助工具 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已棄用的低階頻道入口相容性外觀。新的接收路徑應使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 實驗性高階頻道入口執行時解析器和已遷移頻道接收路徑的路由事實建構器。比起在每個外掛中組裝有效允許清單、指令允許清單和傳統投影，優先使用此項。請參閱 [頻道入口 API](/zh-Hant/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-outbound` | 訊息生命週期合約，加上回覆管道選項、收據、即時預覽/串流、生命週期輔助工具、輸出身分、載荷規劃、持久傳送和訊息傳送內容輔助工具。請參閱 [頻道輸出 API](/zh-Hant/plugins/sdk-channel-outbound)。 |
    | `plugin-sdk/channel-message` | `plugin-sdk/channel-outbound` 加上傳統回覆派發外觀的已棄用相容性別名。 |
    | `plugin-sdk/channel-message-runtime` | `plugin-sdk/channel-outbound` 加上傳統回覆派發外觀的已棄用相容性別名。 |
    | `plugin-sdk/inbound-envelope` | 共用的輸入路由 + 信封建構器輔助工具 |
    | `plugin-sdk/inbound-reply-dispatch` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-inbound` 進行輸入執行器和派發謂詞，並使用 `plugin-sdk/channel-outbound` 進行訊息傳遞輔助工具。 |
    | `plugin-sdk/messaging-targets` | 已棄用的目標解析別名；請使用 `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | 共用的輸出媒體載入輔助工具 |
    | `plugin-sdk/outbound-send-deps` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/outbound-runtime` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/poll-runtime` | 窄投票正規化輔助工具 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結生命週期和配接器輔助工具 |
    | `plugin-sdk/agent-media-payload` | 傳統代理媒體載荷建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒繫結、配對和已設定繫結輔助工具 |
    | `plugin-sdk/runtime-config-snapshot` | 執行時設定快照輔助工具 |
    | `plugin-sdk/runtime-group-policy` | 執行時群組原則解析輔助工具 |
    | `plugin-sdk/channel-status` | 共用的頻道狀態快照/摘要輔助工具 |
    | `plugin-sdk/channel-config-primitives` | 窄頻道設定 schema 基本類型 |
    | `plugin-sdk/channel-config-writes` | 頻道設定寫入授權輔助工具 |
    | `plugin-sdk/channel-plugin-common` | 共用的頻道外掛前奏匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助工具 |
    | `plugin-sdk/group-access` | 共用的群組存取決策輔助工具 |
    | `plugin-sdk/direct-dm`、`plugin-sdk/direct-dm-access` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-inbound`。 |
    | `plugin-sdk/direct-dm-guard-policy` | 窄直接 DM 加密前防護原則輔助工具 |
    | `plugin-sdk/discord` | 已棄用的 Discord 相容性外觀，用於已發布的 `@openclaw/discord@2026.3.13` 和追蹤的擁有者相容性；新外掛應使用通用頻道 SDK 子路徑 |
    | `plugin-sdk/telegram-account` | 已棄用的 Telegram 帳號解析相容性外觀，用於追蹤的擁有者相容性；新外掛應使用注入的執行時輔助工具或通用頻道 SDK 子路徑 |
    | `plugin-sdk/zalouser` | 已棄用的 Zalo Personal 相容性外觀，用於仍然匯入傳送者指令授權的已發布 Lark/Zalo 套件；新外掛應使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 語意訊息呈現、傳遞和傳統互動式回覆輔助工具。請參閱 [訊息呈現](/zh-Hant/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用於事件分類、內容建構、格式化、根目錄、防抖動、提及匹配、提及原則和輸入記錄的共用輸入輔助工具 |
    | `plugin-sdk/channel-inbound-debounce` | 窄輸入防抖動輔助工具 |
    | `plugin-sdk/channel-mention-gating` | 狹窄的提及原則、提及標記和提及文字輔助工具，不含更廣泛的輸入執行時表面 |
    | `plugin-sdk/channel-envelope`、`plugin-sdk/channel-inbound-roots`、`plugin-sdk/channel-location`、`plugin-sdk/channel-logging` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-inbound` 或 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-pairing-paths` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-pairing`。 |
    | `plugin-sdk/channel-reply-options-runtime` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-streaming` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-send-result` | 回覆結果類型 |
    | `plugin-sdk/channel-actions` | 頻道訊息動作輔助工具，加上為了外掛相容性而保留的已棄用原生 schema 輔助工具 |
    | `plugin-sdk/channel-route` | 共用路由正規化、解析器驅動的目標解析、執行緒 ID 字串化、重複資料刪除/壓縮路由金鑰、已解析目標類型和路由/目標比較輔助工具 |
    | `plugin-sdk/channel-targets` | 目標解析輔助工具；路由比較呼叫者應使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 頻道合約類型 |
    | `plugin-sdk/channel-feedback` | 回饋/反應接線 |
    | `plugin-sdk/channel-secret-runtime` | 狹窄的秘密合約輔助工具，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 和秘密目標類型 |
  </Accordion>

已棄用的頻道輔助函式系列僅為了已發佈外掛程式的相容性而保留。移除計畫如下：在外部外掛程式遷移期間保留它們，將 repo/bundled 外掛程式保持在 `channel-inbound` 和 `channel-outbound` 上，然後在下一次主要的 SDK 清理中移除這些相容性子路徑。這適用於舊的 channel message/runtime、channel streaming、direct-DM access、inbound helper splinter、reply-options 和 pairing-path 系列。

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支援的 LM Studio provider 外觀，用於設定、目錄探索和執行時期模型準備 | | `plugin-sdk/lmstudio-runtime` | 支援的 LM Studio 執行時期外觀，用於本地伺服器預設值、模型探索、請求標頭和已載入模型輔助函式 | | `plugin-sdk/provider-setup` | 精選的本地/自託管 provider
  設定輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自託管 provider 設定輔助函式 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 看門狗常數 | | `plugin-sdk/provider-auth-runtime` | 用於 provider 外掛程式的執行時期 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | API 金鑰導入/設定檔寫入輔助函式，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result`
  | 標準 OAuth auth-result 建構器 | | `plugin-sdk/provider-env-vars` | Provider auth 環境變數查詢輔助函式 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`，已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/provider-model-shared` |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享的重播原則建構器、provider 端點輔助函式，以及共享的模型 ID 標準化輔助函式 | | `plugin-sdk/provider-catalog-runtime` | Provider 目錄擴充執行時期掛鉤和外掛程式 provider 註冊縫合點，用於合約測試 | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 provider HTTP/端點功能輔助函式、provider HTTP 錯誤和音訊轉錄多部分表單輔助函式 | | `plugin-sdk/provider-web-fetch-contract` | 窄範圍 web-fetch 設定/選擇合約輔助函式，例如
  `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web-fetch provider 註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 窄範圍 web-search 設定/憑證輔助函式，適用於不需要外掛程式啟用接線的 providers | | `plugin-sdk/provider-web-search-contract` | 窄範圍 web-search 設定/憑證合約輔助函式，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和範圍憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | Web-search provider 註冊/快取/執行時期輔助函式 | | `plugin-sdk/embedding-providers` | 通用嵌入 provider 類型和讀取輔助函式，包括 `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 和 `listEmbeddingProviders(...)`；外掛程式透過
  `api.registerEmbeddingProvider(...)` 註冊 providers，因此會強制執行清單所有權 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks` 和 DeepSeek/Gemini/OpenAI 結構描述清理 + 診斷 | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 和類似項目 | | `plugin-sdk/provider-stream` |
  `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝器類型、純文字工具呼叫相容性，以及共享的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝器輔助函式 | | `plugin-sdk/provider-stream-shared` | 公共共享 provider 串流包裝器輔助函式，包括
  `composeProviderStreamWrappers`、`createPlainTextToolCallCompatWrapper`、`createPayloadPatchStreamWrapper`、`createToolStreamWrapper` 和 Anthropic/DeepSeek/OpenAI 相容串流公用程式 | | `plugin-sdk/provider-transport-runtime` | 原生 provider 傳輸輔助函式，例如受保護的 fetch、傳輸訊息轉換和可寫入傳輸事件串流 | | `plugin-sdk/provider-onboard` | Onboarding 設定修補輔助函式 | |
  `plugin-sdk/global-singleton` | 程序本地單例/映射/快取輔助函式 | | `plugin-sdk/group-activation` | 窄範圍群組啟動模式和指令解析輔助函式 |
</Accordion>

<Accordion title="驗證與安全性子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，指令註冊輔助函式，包含動態參數選單格式化、發送者授權輔助函式 | | `plugin-sdk/command-status` | 指令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 核准者解析與相同聊天動作授權輔助函式 | | `plugin-sdk/approval-client-runtime` |
  原生執行核准設定檔/篩選輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 原生核准能力/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 共用核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 用於熱通道進入點的輕量級原生核准介面卡載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 更廣泛的核准處理器執行時輔助函式；當足夠時，優先使用較窄的介面卡/閘道縫隙 | |
  `plugin-sdk/approval-native-runtime` | 原生核准目標 + 帳號綁定輔助函式及本機原生執行提示抑制 | | `plugin-sdk/approval-reaction-runtime` | 硬編碼核准反應綁定、反應提示載荷、反應目標儲存，以及用於本機原生執行提示抑制的相容性匯出 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛核准回覆載荷輔助函式 | | `plugin-sdk/approval-runtime` |
  執行/外掛核准載荷輔助函式、原生核准路由/執行時輔助函式，以及結構化核准顯示輔助函式，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 窄型入站回覆去重重設輔助函式 | | `plugin-sdk/channel-contract-testing` | 窄型通道合約測試輔助函式，不含廣泛測試桶 | | `plugin-sdk/command-auth-native` | 原生指令授權、動態參數選單格式化及原生工作階段目標輔助函式 | | `plugin-sdk/command-detection` |
  共用指令偵測輔助函式 | | `plugin-sdk/command-primitives-runtime` | 用於熱通道路徑的輕量級指令文字述詞 | | `plugin-sdk/command-surface` | 指令主體正規化及指令介面輔助函式 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用於通道/外掛秘密介面的窄型秘密合約集合輔助函式 | | `plugin-sdk/secret-ref-runtime` | 用於秘密合約/設定解析的窄型
  `coerceSecretRef` 和 SecretRef 類型輔助函式 | | `plugin-sdk/security-runtime` | 共用信任、DM 閘控、根界限檔案/路徑輔助函式，包括僅建立寫入、同步/非同步原子檔案取代、同層臨時寫入、跨裝置移動後援、私人檔案儲存輔助函式、符號連結父級守衛、外部內容、敏感文字編修、常數時間秘密比較及秘密集合輔助函式 | | `plugin-sdk/ssrf-policy` | 主機允許清單及私人網路 SSRF 政策輔助函式 | | `plugin-sdk/ssrf-dispatcher`
  | 窄型固定派發器輔助函式，不含廣泛基礎架構執行時介面 | | `plugin-sdk/ssrf-runtime` | 固定派發器、SSRF 防護擷取、SSRF 錯誤及 SSRF 政策輔助函式 | | `plugin-sdk/secret-input` | 秘密輸入剖析輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助函式及原始 websocket/body 強制轉換 | | `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助函式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | 廣泛的運行時/日誌/備份/外掛安裝輔助函式 | | `plugin-sdk/runtime-env` | 狹隘的運行時環境、日誌記錄器、逾時、重試和退避輔助函式 | | `plugin-sdk/browser-config` | 支援的瀏覽器配置外觀，用於標準化設定檔/預設值、CDD URL 解析和瀏覽器控制身份驗證輔助函式 | | `plugin-sdk/agent-harness-task-runtime` |
  使用主機發出的任務範圍，為受控制代理程式提供的一般任務生命週期和完成交付輔助函式 | | `plugin-sdk/codex-mcp-projection` | 保留的捆綁 Codex 輔助函式，用於將使用者 MCP 伺服器配置投影到 Codex 執行緒配置中；不適用於第三方外掛 | | `plugin-sdk/codex-native-task-runtime` | 私有的捆綁 Codex 輔助函式，用於原生任務鏡像/運行時佈線；不適用於第三方外掛 | | `plugin-sdk/channel-runtime-context` |
  一般頻道運行時環境註冊和查找輔助函式 | | `plugin-sdk/matrix` | 已棄用的 Matrix 相容性外觀，用於舊的第三方頻道套件；新外掛應直接匯入 `plugin-sdk/run-command` | | `plugin-sdk/mattermost` | 已棄用的 Mattermost 相容性外觀，用於舊的第三方頻道套件；新外掛應直接匯入一般 SDK 子路徑 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` |
  共用的外掛指令/hook/http/互動輔助函式 | | `plugin-sdk/hook-runtime` | 共用的 webhook/內部 hook 管線輔助函式 | | `plugin-sdk/lazy-runtime` | 延遲運行時匯入/綁定輔助函式，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 程序執行輔助函式 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、引數呼叫和延遲指令群組輔助函式 | |
  `plugin-sdk/gateway-method-runtime` | 為宣告 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的外掛 HTTP 路由保留的 Gateway 方法派發輔助函式 | | `plugin-sdk/gateway-runtime` | Gateway 客戶端、事件循環就緒的客戶端啟動輔助函式、gateway CLI RPC、gateway 協議錯誤和頻道狀態修補輔助函式 | | `plugin-sdk/config-contracts` | 專注於僅類型的配置介面，用於外掛配置形狀，例如 `OpenClawConfig`
  和頻道/提供者配置類型 | | `plugin-sdk/plugin-config-runtime` | 運行時外掛配置查找輔助函式，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | 交易式配置變更輔助函式，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 當前程序配置快照輔助函式，例如
  `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和測試快照設定器 | | `plugin-sdk/telegram-command-config` | Telegram 指令名稱/描述標準化和重複/衝突檢查，即使捆綁的 Telegram 合約介面不可用 | | `plugin-sdk/text-autolink-runtime` | 無需廣泛文字桶的檔案參考自動連結檢測 | | `plugin-sdk/approval-reaction-runtime` |
  硬編碼的核准反應綁定、反應提示負載、反應目標存放區，以及用於本機原生執行提示抑制的相容性匯出 | | `plugin-sdk/approval-runtime` | 執行/外掛核准輔助函式、核准功能建構器、驗證/設定檔輔助函式、原生路由/運行時輔助函式，以及結構化核准顯示路徑格式化 | | `plugin-sdk/reply-runtime` | 共用的傳入/回覆運行時輔助函式、分塊、派發、心跳、回覆規劃器 | | `plugin-sdk/reply-dispatch-runtime` |
  狹隘的回覆派發/完成和對話標籤輔助函式 | | `plugin-sdk/reply-history` | 共用的短視窗回覆歷史輔助函式。新的訊息輪次程式碼應使用 `createChannelHistoryWindow`；較低層級的對映輔助函式仍僅為已棄用的相容性匯出 | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 狹隘的文字/Markdown 分塊輔助函式 | | `plugin-sdk/session-store-runtime` | Session
  工作流程輔助函式 (`getSessionEntry`、`listSessionEntries`、`patchSessionEntry`、`upsertSessionEntry`)、舊版 session 存放區路徑/session-key 輔助函式、updated-at 讀取和已棄用的整個存放區變更輔助函式 | | `plugin-sdk/cron-store-runtime` | Cron 存放區路徑/載入/儲存輔助函式 | | `plugin-sdk/state-paths` | State/OAuth 目錄路徑輔助函式 | | `plugin-sdk/plugin-state-runtime` | 外掛 sidecar SQLite
  鍵值狀態類型 | | `plugin-sdk/routing` | 路由/session-key/帳戶綁定輔助函式，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共用的頻道/帳戶狀態摘要輔助函式、運行時狀態預設值和問題中繼資料輔助函式 | | `plugin-sdk/target-resolver-runtime` | 共用的目標解析器輔助函式 | | `plugin-sdk/string-normalization-runtime` |
  Slug/字串標準化輔助函式 | | `plugin-sdk/request-url` | 從類似 fetch/request 的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 具有標準化 stdout/stderr 結果的計時指令執行器 | | `plugin-sdk/param-readers` | 一般工具/CLI 參數讀取器 | | `plugin-sdk/tool-plugin` | 定義簡單的類型化 agent-tool 外掛並公開用於資訊清單生成的靜態中繼資料 | | `plugin-sdk/tool-payload` | 從工具結果物件中擷取標準化的負載 |
  | `plugin-sdk/tool-send` | 從工具引數中擷取正規的傳送目標欄位 | | `plugin-sdk/sandbox` | 沙盒後端類型和 SSH/OpenShell 指令輔助函式，包括快速失敗的執行指令預檢 | | `plugin-sdk/temp-path` | 共用的暫時下載路徑輔助函式和私有的安全暫存工作區 | | `plugin-sdk/logging-core` | 子系統日誌記錄器和編修輔助函式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和轉換輔助函式 | |
  `plugin-sdk/model-session-runtime` | 模型/session 覆寫輔助函式，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk 提供者配置解析輔助函式 | | `plugin-sdk/json-store` | 小型 JSON 狀態讀取/寫入輔助函式 | | `plugin-sdk/json-unsafe-integers` | 將不安全的整數常值保留為字串的 JSON 解析輔助函式 | | `plugin-sdk/file-lock` |
  可重入的檔案鎖定輔助函式 | | `plugin-sdk/persistent-dedupe` | 磁碟支援的去重快取輔助函式 | | `plugin-sdk/acp-runtime` | ACP 運行時/session 和回覆派發輔助函式 | | `plugin-sdk/acp-runtime-backend` | 用於啟動載入外掛的輕量級 ACP 後端註冊和回覆派發輔助函式 | | `plugin-sdk/acp-binding-resolve-runtime` | 無需生命週期啟動匯入的唯讀 ACP 綁定解析 | | `plugin-sdk/agent-config-primitives` | 狹隘的 agent
  運行時配置架構基本型別 | | `plugin-sdk/boolean-param` | 寬鬆的布林參數讀取器 | | `plugin-sdk/dangerous-name-runtime` | 危險名稱匹配解析輔助函式 | | `plugin-sdk/device-bootstrap` | 裝置啟動和配對令牌輔助函式 | | `plugin-sdk/extension-shared` | 共用的被動頻道、狀態和環境代理輔助基本型別 | | `plugin-sdk/models-provider-runtime` | `/models` 指令/提供者回覆輔助函式 | |
  `plugin-sdk/skill-commands-runtime` | 技能指令列出輔助函式 | | `plugin-sdk/native-command-registry` | 原生指令註冊表/建置/序列化輔助函式 | | `plugin-sdk/agent-harness` | 用於低階 agent 控制的實驗性受信任外掛介面：控制類型、主動執行導向/中止輔助函式、OpenClaw 工具橋接輔助函式、運行時計劃工具策略輔助函式、終端結果分類、工具進度格式化/詳細輔助函式，以及嘗試結果公用程式 | |
  `plugin-sdk/provider-zai-endpoint` | 已棄用的 Z.AI 提供者擁有的端點偵測外觀；使用 Z.AI 外掛公開 API | | `plugin-sdk/async-lock-runtime` | 用於小型運行時狀態檔案的程序本機非同步鎖定輔助函式 | | `plugin-sdk/channel-activity-runtime` | 頻道活動遙測輔助函式 | | `plugin-sdk/concurrency-runtime` | 有界的非同步任務並行輔助函式 | | `plugin-sdk/dedupe-runtime` | 記憶體中的去重快取輔助函式 | |
  `plugin-sdk/delivery-queue-runtime` | 傳出待交付排空輔助函式 | | `plugin-sdk/file-access-runtime` | 安全的本機檔案和媒體來源路徑輔助函式 | | `plugin-sdk/heartbeat-runtime` | 心跳喚醒、事件和可見性輔助函式 | | `plugin-sdk/number-runtime` | 數字強制輔助函式 | | `plugin-sdk/secure-random-runtime` | 安全令牌/UUID 輔助函式 | | `plugin-sdk/system-event-runtime` | 系統事件佇列輔助函式 | |
  `plugin-sdk/transport-ready-runtime` | 傳輸就緒等待輔助函式 | | `plugin-sdk/exec-approvals-runtime` | 執行核准政策檔案輔助函式，無需廣泛的 infra-runtime 桶 | | `plugin-sdk/infra-runtime` | 已棄用的相容性 shim；使用上述專注的運行時子路徑 | | `plugin-sdk/collection-runtime` | 小型有界快取輔助函式 | | `plugin-sdk/diagnostic-runtime` | 診斷旗標、事件和追蹤內容輔助函式 | | `plugin-sdk/error-runtime`
  | 錯誤圖表、格式化、共用錯誤分類輔助函式、`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包裝的 fetch、代理、EnvHttpProxyAgent 選項和固定查找輔助函式 | | `plugin-sdk/runtime-fetch` | 具有派發器感知能力的運行時 fetch，無需代理/受防護 fetch 匯入 | | `plugin-sdk/response-limit-runtime` | 有界的回應主體讀取器，無需廣泛的媒體運行時介面 | | `plugin-sdk/session-binding-runtime` |
  當前對話綁定狀態，無需配置的綁定路由或配對存放區 | | `plugin-sdk/session-store-runtime` | Session 存放區輔助函式，無需廣泛的配置寫入/維護匯入 | | `plugin-sdk/context-visibility-runtime` | 內容可見性解析和補充內容篩選，無需廣泛的配置/安全性匯入 | | `plugin-sdk/string-coerce-runtime` | 狹隘的基本記錄/字串強制和標準化輔助函式，無需 Markdown/日誌匯入 | | `plugin-sdk/host-runtime` | 主機名稱和 SCP
  主機標準化輔助函式 | | `plugin-sdk/retry-runtime` | 重試配置和重試執行器輔助函式 | | `plugin-sdk/agent-runtime` | Agent 目錄/身分識別/工作區輔助函式，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 和已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/directory-runtime` | 由配置支援的目錄查詢/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | 子路徑 | 主要導出 | | --- | --- | | `plugin-sdk/media-runtime` | 共享的媒體獲取/轉換/存儲輔助函數，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已棄用的 `fetchRemoteMedia`；當 URL 應轉換為 OpenClaw 媒體時，優先使用存儲輔助函數而非緩衝區讀取 | | `plugin-sdk/media-mime` | 精簡的 MIME 標準化、副檔名映射、MIME 檢測和媒體類型輔助函數 | | `plugin-sdk/media-store` |
  精簡的媒體存儲輔助函數，例如 `saveMediaBuffer` 和 `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | 共享的媒體生成故障轉移輔助函數、候選選擇以及缺失模型消息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型以及面向提供者的圖片/音訊/結構化提取輔助函數導出 | | `plugin-sdk/text-chunking` | 文字和 Markdown 分塊/渲染輔助函數、Markdown 表格轉換、指令標籤剝離和安全文字工具 | |
  `plugin-sdk/text-chunking` | 傳出文字分塊輔助函數 | | `plugin-sdk/speech` | 語音提供者類型以及面向提供者的指令、註冊表、驗證、OpenAI 相容 TTS 建構器和語音輔助函數導出 | | `plugin-sdk/speech-core` | 共享的語音提供者類型、註冊表、指令、標準化和語音輔助函數導出 | | `plugin-sdk/realtime-transcription` | 即時轉錄提供者類型、註冊表輔助函數和共享 WebSocket 會話輔助函數 | |
  `plugin-sdk/realtime-bootstrap-context` | 針對有界 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 上下文注入的即時設定檔啟動輔助函數 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型、註冊表輔助函數和共享的即時語音行為輔助函數，包括輸出活動追蹤 | | `plugin-sdk/image-generation` | 圖像生成提供者類型以及圖像資源/資料 URL 輔助函數和 OpenAI 相容圖像提供者建構器 | | `plugin-sdk/image-generation-core` |
  共享的圖像生成類型、故障轉移、身份驗證和註冊表輔助函數 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` | 共享的音樂生成類型、故障轉移輔助函數、提供者查找和模型引用解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共享的影片生成類型、故障轉移輔助函數、提供者查找和模型引用解析 | |
  `plugin-sdk/transcripts` | 共享的逐字稿來源提供者類型、註冊表輔助函數、會話描述符和發話元數據 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表和路由安裝輔助函數 | | `plugin-sdk/webhook-path` | 已棄用的相容性別名；請使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | 共享的遠端/本機媒體載入輔助函數 | | `plugin-sdk/zod` | 已棄用的相容性重新導出；請直接從 `zod` 導入 `zod` | |
  `plugin-sdk/testing` | 程式碼庫本地的已棄用相容性桶，用於舊版 OpenClaw 測試。新的程式碼庫測試應改為導入專注的本地測試子路徑，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` | | `plugin-sdk/plugin-test-api` | 程式碼庫本地的最小 `createTestPluginApi`
  輔助函數，用於直接外掛程式註冊單元測試，無需導入程式碼庫測試輔助橋接器 | | `plugin-sdk/agent-runtime-test-contracts` | 程式碼庫本地原生代理運行時適配器合約固定裝置，用於身份驗證、交付、故障轉移、工具掛鉤、提示覆蓋、架構和逐字稿投影測試 | | `plugin-sdk/channel-test-helpers` |
  程式碼庫本地的面向通道的測試輔助函數，用於通用動作/設定/狀態合約、目錄斷言、帳戶啟動生命週期、發送配置執行緒、運行時模擬、狀態問題、傳出交付和掛鉤註冊 | | `plugin-sdk/channel-target-testing` | 程式碼庫本地用於通道測試的共享目標解析錯誤案例套件 | | `plugin-sdk/plugin-test-contracts` | 程式碼庫本地的外掛程式套件、註冊、公共工件、直接導入、運行時 API 和導入副作用合約輔助函數 | |
  `plugin-sdk/provider-test-contracts` | 程式碼庫本地的提供者運行時、身份驗證、探索、上架、目錄、精靈、媒體功能、重播策略、即時 STT 即時音訊、網路搜尋/獲取和串流合約輔助函數 | | `plugin-sdk/provider-http-test-mocks` | 程式碼庫本地可選擇加入的 Vitest HTTP/身份驗證模擬，用於執行 `plugin-sdk/provider-http` 的提供者測試 | | `plugin-sdk/test-fixtures` | 程式碼庫本地通用 CLI
  運行時捕獲、沙盒上下文、技能寫入器、代理訊息、系統事件、模組重新載入、捆綁外掛程式路徑、終端文字、分塊、身份驗證權杖和類型案例固定裝置 | | `plugin-sdk/test-node-mocks` | 程式碼庫本地專注的 Node 內建模擬輔助函數，用於 Vitest `vi.mock("node:*")` 工廠內部 |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 針對管理員/設定檔/檔案/CLI 助手的捆綁式 memory-core 輔助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時層 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` |
  記憶體主機嵌入合約、註冊表存取、本機提供者以及通用批次/遠端助手。此介面上的 `registerMemoryEmbeddingProvider` 已棄用；對於新的提供者，請使用通用嵌入提供者 API。 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態助手 | |
  `plugin-sdk/memory-core-host-query` | 記憶體主機查詢助手 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機機密助手 | | `plugin-sdk/memory-core-host-events` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態助手 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時助手 | |
  `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時助手 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時助手 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行時助手的廠商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌助手的廠商中立別名 | | `plugin-sdk/memory-host-files` | 已棄用的相容性別名；請使用
  `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 供記憶體相關外掛使用的共用 managed-markdown 助手 | | `plugin-sdk/memory-host-search` | 用於 search-manager 存取的作用中記憶體執行時層 | | `plugin-sdk/memory-host-status` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    Reserved bundled-helper SDK 子路徑是針對 bundled plugin 程式碼的特定擁有者狹隘介面。它們被追蹤在 SDK 清單中，以確保套件建置和別名保持確定性，但它們並非通用的 plugin 作者 API。新的可重複使用主機合約應該使用通用的 SDK 子路徑，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和
    `plugin-sdk/plugin-config-runtime`。

    | Subpath | Owner and purpose |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | Bundled Codex plugin helper for projecting user MCP server config into Codex app-server thread config |
    | `plugin-sdk/codex-native-task-runtime` | Bundled Codex plugin helper for mirroring Codex app-server native subagents into OpenClaw task state |

  </Accordion>
</AccordionGroup>

## 相關

- [Plugin SDK 概覽](/zh-Hant/plugins/sdk-overview)
- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建構插件](/zh-Hant/plugins/building-plugins)
