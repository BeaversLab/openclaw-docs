---
summary: "Plugin SDK 子路徑目錄：依區域分組的 import 位置"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路徑"
---

外掛程式 SDK 以 `openclaw/plugin-sdk/` 下的一組狹窄的公用子路徑公開。此頁面按用途分類列出了常用的子路徑。生成的編譯器入口點清單位於 `scripts/lib/plugin-sdk-entrypoints.json`；套件匯出是從 `scripts/lib/plugin-sdk-private-local-only-subpaths.json` 中列出的儲存庫本機測試/內部子路徑中扣除後的公用子集。維護者可以使用 `pnpm plugin-sdk:surface` 審查公用匯出數量，並使用 `pnpm plugins:boundary-report:summary` 審查作用中保留的輔助子路徑；未使用的保留輔助匯出會導致 CI 報告失敗，而不是作為休眠的相容性債務保留在公用 SDK 中。

關於外掛程式撰寫指南，請參閱 [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)。

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
  <Accordion title="通道子路徑">
    | 子路徑 | 主要匯出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 匯出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 針對插件擁有 schema 的快取 JSON Schema 驗證輔助程式 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，外加 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共用設定精靈輔助程式、設定翻譯器、允許清單提示、設定狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createSetupTranslator`, `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | 已棄用的相容性別名；請使用 `plugin-sdk/setup-runtime` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/動作閘道輔助程式、預設帳號後援輔助程式 |
    | `plugin-sdk/account-id``DEFAULT_ACCOUNT_ID` | %%PH:INLINE_CODE:108:3b4be1b%%，帳號 ID 正規化輔助程式 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後援輔助程式 |
    | `plugin-sdk/account-helpers` | 狹義帳號清單/帳號動作輔助程式 |
    | `plugin-sdk/access-groups` | 存取群組允許清單解析與遮蔽群組診斷輔助程式 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共用通道設定 schema 基元，外加 Zod 與直接 JSON/TypeBox 建構器 |
    | `plugin-sdk/bundled-channel-config-schema` | 僅供維護的內建插件使用的內建 OpenClaw 通道設定 schemas |
    | `plugin-sdk/channel-config-schema-legacy` | 已棄用的相容性別名，用於內建通道設定 schemas |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助程式，含內建合約後援 |
    | `plugin-sdk/command-gating` | 狹義指令授權閘道輔助程式 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已棄用的低階通道入口相容性外觀。新的接收路徑應使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 實驗性的高階通道入口執行階段解析器與路由事實建構器，用於已遷移的通道接收路徑。相比在每個插件中組裝有效允許清單、指令允許清單與舊版投影，建議優先使用此項。請參閱 [通道入口 API](/zh-Hant/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-outbound` | 訊息生命週期合約，外加回覆管線選項、收據、即時預覽/串流、生命週期輔助程式、輸出身分、承載規劃、持久傳送與訊息傳送內容輔助程式。請參閱 [通道輸出 API](/zh-Hant/plugins/sdk-channel-outbound)。 |
    | `plugin-sdk/channel-message` | 已棄用的相容性別名，指向 `plugin-sdk/channel-outbound` 外加舊版回覆分派外觀。 |
    | `plugin-sdk/channel-message-runtime` | 已棄用的相容性別名，指向 `plugin-sdk/channel-outbound` 外加舊版回覆分派外觀。 |
    | `plugin-sdk/inbound-envelope` | 共用入口路由 + 信封建構器輔助程式 |
    | `plugin-sdk/inbound-reply-dispatch` | 已棄用的相容性外觀。入口執行器與分派述詞請使用 `plugin-sdk/channel-inbound`；訊息傳遞輔助程式則請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/messaging-targets` | 已棄用的目標解析別名；請使用 `plugin-sdk/channel-targets` |
    | `plugin-sdk/outbound-media` | 共用輸出媒體載入輔助程式 |
    | `plugin-sdk/outbound-send-deps` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/outbound-runtime` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/poll-runtime` | 狹義投票正規化輔助程式 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒綁定生命週期與轉接器輔助程式 |
    | `plugin-sdk/agent-media-payload` | 舊版代理媒體承載建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒綁定、配對與已設定綁定輔助程式 |
    | `plugin-sdk/runtime-config-snapshot` | 執行階段設定快照輔助程式 |
    | `plugin-sdk/runtime-group-policy` | 執行階段群組原則解析輔助程式 |
    | `plugin-sdk/channel-status` | 共用通道狀態快照/摘要輔助程式 |
    | `plugin-sdk/channel-config-primitives` | 狹義通道設定 schema 基元 |
    | `plugin-sdk/channel-config-writes` | 通道設定寫入授權輔助程式 |
    | `plugin-sdk/channel-plugin-common` | 共用通道插件前奏匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助程式 |
    | `plugin-sdk/group-access` | 共用群組存取決策輔助程式 |
    | `plugin-sdk/direct-dm`, `plugin-sdk/direct-dm-access` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-inbound`。 |
    | `plugin-sdk/direct-dm-guard-policy` | 狹義直接 DM 加密前防護原則輔助程式 |
    | `plugin-sdk/discord` | 已棄用的 Discord 相容性外觀，用於已發布的 `@openclaw/discord@2026.3.13` 與追蹤的擁有者相容性；新插件應使用通用通道 SDK 子路徑 |
    | `plugin-sdk/telegram-account` | 已棄用的 Telegram 帳號解析相容性外觀，用於追蹤的擁有者相容性；新插件應使用注入的執行階段輔助程式或通用通道 SDK 子路徑 |
    | `plugin-sdk/zalouser` | 已棄用的 Zalo Personal 相容性外觀，用於仍匯入發送者指令授權的已發布 Lark/Zalo 套件；新插件應使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 語意訊息呈現、傳遞與舊版互動式回覆輔助程式。請參閱 [訊息呈現](/zh-Hant/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 共用入口輔助程式，用於事件分類、內容建構、格式化、根、防抖動、提及相符、提及原則與入口記錄 |
    | `plugin-sdk/channel-inbound-debounce` | 狹義入口防抖動輔助程式 |
    | `plugin-sdk/channel-mention-gating` | 狹義提及原則、提及標記與提及文字輔助程式，不含更廣泛的入口執行階段層面 |
    | `plugin-sdk/channel-envelope`, `plugin-sdk/channel-inbound-roots`, `plugin-sdk/channel-location`, `plugin-sdk/channel-logging` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-inbound` 或 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-pairing-paths` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-pairing`。 |
    | `plugin-sdk/channel-reply-options-runtime` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-streaming` | 已棄用的相容性外觀。請使用 `plugin-sdk/channel-outbound`。 |
    | `plugin-sdk/channel-send-result` | 回覆結果類型 |
    | `plugin-sdk/channel-actions` | 通道訊息動作輔助程式，外加為保持外掛程式相容性而保留的已棄用原生 schema 輔助程式 |
    | `plugin-sdk/channel-route` | 共用路由正規化、解析器驅動的目標解析、執行緒 ID 字串化、去重/精簡路由金鑰、已解析目標類型與路由/目標比較輔助程式 |
    | `plugin-sdk/channel-targets` | 目標解析輔助程式；路由比較呼叫者應使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 通道合約類型 |
    | `plugin-sdk/channel-feedback` | 意見反應/反應連線 |
    | `plugin-sdk/channel-secret-runtime` | 狹義密碼合約輔助程式，例如 `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment`，以及密碼目標類型 |
  </Accordion>

已棄用的頻道輔助函式系列僅為了已發佈外掛程式的相容性而保留。移除計畫如下：在外部外掛程式遷移期間保留它們，將 repo/bundled 外掛程式保持在 `channel-inbound` 和 `channel-outbound` 上，然後在下一次主要的 SDK 清理中移除這些相容性子路徑。這適用於舊的 channel message/runtime、channel streaming、direct-DM access、inbound helper splinter、reply-options 和 pairing-path 系列。

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支援的 LM Studio Provider 外觀層，用於設定、目錄探索與執行時期模型準備 | | `plugin-sdk/lmstudio-runtime` | 支援的 LM Studio 執行時期外觀層，用於本機伺服器預設值、模型探索、請求標頭與已載入模型輔助工具 | | `plugin-sdk/provider-setup` | 精選的本機/自託管 Provider
  設定輔助工具 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自託管 Provider 設定輔助工具 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 監控常數 | | `plugin-sdk/provider-auth-runtime` | 供 Provider 插件使用的執行時期 API 金鑰解析輔助工具 | | `plugin-sdk/provider-oauth-runtime` | 通用 Provider OAuth 回呼型別、回呼頁面呈現、PKCE/state
  輔助工具、授權輸入解析、權杖到期輔助工具與中止輔助工具 | | `plugin-sdk/provider-auth-api-key` | API 金鑰導入/設定檔寫入輔助工具，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 標準 OAuth 授權結果建構器 | | `plugin-sdk/provider-env-vars` | Provider 授權環境變數查詢輔助工具 | | `plugin-sdk/provider-auth` |
  `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`、OpenAI Codex 授權匯入輔助工具，已淘汰的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共享重試原則建構器、Provider 端點輔助工具與共享模型 ID
  正規化輔助工具 | | `plugin-sdk/provider-catalog-runtime` | Provider 目錄擴充執行時期掛勾與契約測試的 Plugin-Provider 註冊縫合點 | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 Provider
  HTTP/端點功能輔助工具、Provider HTTP 錯誤與音訊轉錄多部分表單輔助工具 | | `plugin-sdk/provider-web-fetch-contract` | 精簡的 web-fetch 設定/選擇契約輔助工具，例如 `enablePluginInConfig` 與 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web-fetch Provider 註冊/快取輔助工具 | | `plugin-sdk/provider-web-search-config-contract` | 精簡的 web-search 設定/認證輔助工具，適用於不需要
  plugin-enable 連線的 Providers | | `plugin-sdk/provider-web-search-contract` | 精簡的 web-search 設定/認證契約輔助工具，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 與範圍認證設定器/取得器 | | `plugin-sdk/provider-web-search` | Web-search Provider 註冊/快取/執行時期輔助工具 | | `plugin-sdk/embedding-providers` | 通用嵌入 Provider
  型別與讀取輔助工具，包括 `EmbeddingProviderAdapter`、`getEmbeddingProvider(...)` 與 `listEmbeddingProviders(...)`；插件透過 `api.registerEmbeddingProvider(...)` 註冊 Providers 以強制執行資訊清單擁有權 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks` 與 DeepSeek/Gemini/OpenAI 結構描述清理 + 診斷 | | `plugin-sdk/provider-usage` | `fetchClaudeUsage`
  與類似項目 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝器型別、純文字工具呼叫相容性，以及共享 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝器輔助工具 | | `plugin-sdk/provider-stream-shared` | 公共共享 Provider 串流包裝器輔助工具，包括
  `composeProviderStreamWrappers`、`createPlainTextToolCallCompatWrapper`、`createPayloadPatchStreamWrapper`、`createToolStreamWrapper` 與 Anthropic/DeepSeek/OpenAI 相容串流公用程式 | | `plugin-sdk/provider-transport-runtime` | 原生 Provider 傳輸輔助工具，例如受防護的 fetch、傳輸訊息轉換與可寫入傳輸事件串流 | | `plugin-sdk/provider-onboard` | 導入設定檔修補輔助工具 | |
  `plugin-sdk/global-singleton` | 程序本機單例/映射/快取輔助工具 | | `plugin-sdk/group-activation` | 精簡群組啟用模式與指令解析輔助工具 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，指令註冊輔助函式，包括動態引數選單格式化、傳送者授權輔助函式 | | `plugin-sdk/command-status` | 指令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 核准者解析和相同聊天動作授權輔助函式 | | `plugin-sdk/approval-client-runtime` |
  原生執行核准設定檔/篩選輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 共享核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 用於熱通道入口點的輕量級原生核准介面卡載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 更廣泛的核准處理器執行時輔助函式；當介面卡/閘道邊界足夠時，請優先使用較窄的邊界 |
  | `plugin-sdk/approval-native-runtime` | 原生核准目標、帳號綁定、路由閘道、轉發後備，以及本地原生執行提示抑制輔助函式 | | `plugin-sdk/approval-reaction-runtime` | 硬編碼核准反應綁定、反應提示載荷、反應目標儲存，以及本地原生執行提示抑制的相容性匯出 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛核准回覆載荷輔助函式 | | `plugin-sdk/approval-runtime` |
  執行/外掛核准載荷輔助函式、原生核准路由/執行時輔助函式，以及結構化核准顯示輔助函式，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 窄向內联回覆去重重設輔助函式 | | `plugin-sdk/channel-contract-testing` | 窄向通道合約測試輔助函式，不包含廣泛的測試集合 | | `plugin-sdk/command-auth-native` | 原生指令授權、動態引數選單格式化和原生會話目標輔助函式 | | `plugin-sdk/command-detection`
  | 共享指令偵測輔助函式 | | `plugin-sdk/command-primitives-runtime` | 用於熱通道路徑的輕量級指令文字述詞 | | `plugin-sdk/command-surface` | 指令主體正規化和指令介面輔助函式 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用於通道/外掛密鑰介面的窄向密鑰合約集合輔助函式 | | `plugin-sdk/secret-ref-runtime` | 用於密鑰合約/設定解析的窄向
  `coerceSecretRef` 和 SecretRef 類型輔助函式 | | `plugin-sdk/secret-provider-integration` | 僅類型 SecretRef 提供者整合清單和預設合約，適用於發佈外部密鑰提供者預設的外掛 | | `plugin-sdk/security-runtime` | 共用信任、DM 閘道、以 root
  為界的檔案/路徑輔助函式，包括僅建立寫入、同步/非同步原子檔案替換、同層級暫存寫入、跨裝置移動後備、私人檔案儲存輔助函式、符號連結父級防護、外部內容、敏感文字編修、恆定時間密鑰比較和密鑰集合輔助函式 | | `plugin-sdk/ssrf-policy` | 主機允許清單和私人網路 SSRF 策略輔助函式 | | `plugin-sdk/ssrf-dispatcher` | 窄向釘選調度器輔助函式，不包含廣泛的基建執行時介面 | | `plugin-sdk/ssrf-runtime` |
  釘選調度器、SSRF 防護擷取、SSRF 錯誤和 SSRF 策略輔助函式 | | `plugin-sdk/secret-input` | 密鑰輸入解析輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助函式和原始 websocket/body 強制轉換 | | `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助函式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/runtime` | 廣泛的執行時/日誌/備份/外掛安裝輔助函式 | | `plugin-sdk/runtime-env` | 狹隘的執行時環境、記錄器、逾時、重試與退避輔助函式 | | `plugin-sdk/browser-config` | 支援的瀏覽器設定外觀，用於標準化的設定檔/預設值、CDD URL 解析以及瀏覽器控制認證輔助函式 | | `plugin-sdk/agent-harness-task-runtime` |
  通用任務生命週期與完成傳遞輔助函式，供使用主機發出任務範圍的支援代理使用 | | `plugin-sdk/codex-mcp-projection` | 保留的捆綁 Codex 輔助函式，用於將使用者 MCP 伺服器設定投射至 Codex 執行緒設定；不適用於第三方外掛 | | `plugin-sdk/codex-native-task-runtime` | 私有的捆綁 Codex 輔助函式，用於原生任務鏡像/執行時接線；不適用於第三方外掛 | | `plugin-sdk/channel-runtime-context` |
  通用頻道執行時環境註冊與查找輔助函式 | | `plugin-sdk/matrix` | 已棄用的 Matrix 相容性外觀，用於舊版第三方頻道套件；新外掛應直接匯入 `plugin-sdk/run-command` | | `plugin-sdk/mattermost` | 已棄用的 Mattermost 相容性外觀，用於舊版第三方頻道套件；新外掛應直接匯入通用 SDK 子路徑 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` |
  共用的外掛指令/鉤子/HTTP/互動輔助函式 | | `plugin-sdk/hook-runtime` | 共用的 Webhook/內部子管線輔助函式 | | `plugin-sdk/lazy-runtime``createLazyRuntimeModule` | 延遲執行時匯入/綁定輔助函式，例如 %%PH:INLINE_CODE:316:7d3a8e4%%、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 程序執行輔助函式 | | `plugin-sdk/cli-runtime` | CLI
  格式化、等待、版本、引數叫用以及延遲指令群組輔助函式 | | `plugin-sdk/qa-live-transport-scenarios` | 共用的即時傳輸 QA 情境 ID、基線覆蓋率輔助函式以及情境選擇輔助函式 | | `plugin-sdk/gateway-method-runtime` | 保留的 Gateway 方法分派輔助函式，用於宣告 `contracts.gatewayMethodDispatch: ["authenticated-request"]` 的外掛 HTTP 路由 | | `plugin-sdk/gateway-runtime` | Gateway
  用戶端、事件循環就緒的用戶端啟動輔助函式、gateway CLI RPC、gateway 協定錯誤以及頻道狀態修補輔助函式 | | `plugin-sdk/config-contracts` | 專注的僅型別設定層級，用於外掛設定形狀，例如 `OpenClawConfig` 以及頻道/提供者設定類型 | | `plugin-sdk/plugin-config-runtime` | 執行時外掛設定查找輔助函式，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` | |
  `plugin-sdk/config-mutation` | 交易式設定變更輔助函式，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 目前程序設定快照輔助函式，例如 `getRuntimeConfig`、`getRuntimeConfigSnapshot` 以及測試快照設定器 | | `plugin-sdk/telegram-command-config` | Telegram 指令名稱/描述標準化以及重複/衝突檢查，即使捆綁的 Telegram 合約介面無法使用 | |
  `plugin-sdk/text-autolink-runtime` | 檔案參照自動連結檢測，無需廣泛的文字桶 | | `plugin-sdk/approval-reaction-runtime` | 硬編碼的核准反應綁定、反應提示負載、反應目標存放區，以及用於抑制本機原生執行提示的相容性匯出 | | `plugin-sdk/approval-runtime` | 執行/外掛核准輔助函式、核准功能建構器、認證/設定檔輔助函式、原生路由/執行時輔助函式以及結構化核准顯示路徑格式化 | | `plugin-sdk/reply-runtime` |
  共用的傳入/回覆執行時輔助函式、分塊、分派、心跳、回覆規劃器 | | `plugin-sdk/reply-dispatch-runtime` | 狹隘的回覆分派/完成以及對話標籤輔助函式 | | `plugin-sdk/reply-history` | 共用的短視窗回覆歷史輔助函式。新的訊息輪替程式碼應使用 `createChannelHistoryWindow`；低階地圖輔助函式仍保持已棄用的相容性匯出 | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking`
  | 狹隘的文字/Markdown 分塊輔助函式 | | `plugin-sdk/session-store-runtime` | Session 工作流程輔助函式 (`getSessionEntry`、`listSessionEntries`、`patchSessionEntry`、`upsertSessionEntry`)、舊版 session 存放區路徑/session 金鑰輔助函式、更新時間讀取以及已棄用的全存放區變更輔助函式 | | `plugin-sdk/cron-store-runtime` | Cron 存放區路徑/載入/儲存輔助函式 | | `plugin-sdk/state-paths` | State/OAuth
  目錄路徑輔助函式 | | `plugin-sdk/plugin-state-runtime` | 外掛側車 SQLite 金鑰狀態類型 | | `plugin-sdk/routing` | 路由/session 金鑰/帳戶綁定輔助函式，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共用的頻道/帳戶狀態摘要輔助函式、執行時狀態預設值以及問題中繼資料輔助函式 | | `plugin-sdk/target-resolver-runtime` |
  共用的目標解析器輔助函式 | | `plugin-sdk/string-normalization-runtime` | Slug/字串標準化輔助函式 | | `plugin-sdk/request-url` | 從 fetch/request 類似輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令執行器，具有標準化的 stdout/stderr 結果 | | `plugin-sdk/param-readers` | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-plugin` | 定義簡單的型別代理工具外掛並公開靜態中繼資料以用於資訊清單產生
  | | `plugin-sdk/tool-payload` | 從工具結果物件中擷取標準化的負載 | | `plugin-sdk/tool-send` | 從工具引數中擷取標準傳送目標欄位 | | `plugin-sdk/sandbox` | 沙箱後端類型與 SSH/OpenShell 指令輔助函式，包括快速失敗的執行指令飛前檢查 | | `plugin-sdk/temp-path` | 共用的暫存下載路徑輔助函式與私有的安全暫存工作區 | | `plugin-sdk/logging-core` | 子系統記錄器與編修輔助函式 | |
  `plugin-sdk/markdown-table-runtime` | Markdown 表格模式與轉換輔助函式 | | `plugin-sdk/model-session-runtime` | 模型/session 覆寫輔助函式，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk 提供者設定解析輔助函式 | | `plugin-sdk/json-store` | 小型 JSON 狀態讀取/寫入輔助函式 | | `plugin-sdk/json-unsafe-integers` | JSON
  解析輔助函式，可將不安全的整數常值保留為字串 | | `plugin-sdk/file-lock` | 可重入的檔案鎖定輔助函式 | | `plugin-sdk/persistent-dedupe` | 磁碟支援的去重快取輔助函式 | | `plugin-sdk/acp-runtime` | ACP 執行時/session 與回覆分派輔助函式 | | `plugin-sdk/acp-runtime-backend` | 輕量級 ACP 後端註冊與回覆分派輔助函式，用於啟動載入的外掛 | | `plugin-sdk/acp-binding-resolve-runtime` | 唯讀 ACP
  綁定解析，無需生命週期啟動匯入 | | `plugin-sdk/agent-config-primitives` | 狹隘的代理執行時設定架構基本類型 | | `plugin-sdk/boolean-param` | 寬鬆的布林參數讀取器 | | `plugin-sdk/dangerous-name-runtime` | 危險名稱匹配解析輔助函式 | | `plugin-sdk/device-bootstrap` | 裝置啟動與配對權杖輔助函式 | | `plugin-sdk/extension-shared` | 共用的被動頻道、狀態與環境代理輔助基本類型 | |
  `plugin-sdk/models-provider-runtime` | `/models` 指令/提供者回覆輔助函式 | | `plugin-sdk/skill-commands-runtime` | 技能指令列出輔助函式 | | `plugin-sdk/native-command-registry` | 原生指令登錄/建置/序列化輔助函式 | | `plugin-sdk/agent-harness` | 實驗性的信任外掛層級，用於低階代理工具：工具類型、主動執行導向/中止輔助函式、OpenClaw
  工具橋接輔助函式、執行時計劃工具原則輔助函式、終端機結果分類、工具進度格式化/詳細資訊輔助函式以及嘗試結果公用程式 | | `plugin-sdk/provider-zai-endpoint` | 已棄用的 Z.AI 提供者擁有的端點檢測外觀；請使用 Z.AI 外掛公開 API | | `plugin-sdk/async-lock-runtime` | 程序本機非同步鎖定輔助函式，用於小型執行時狀態檔案 | | `plugin-sdk/channel-activity-runtime` | 頻道活動遙測輔助函式 | |
  `plugin-sdk/concurrency-runtime` | 有界的非同步任務並存輔助函式 | | `plugin-sdk/dedupe-runtime` | 記憶體內去重快取輔助函式 | | `plugin-sdk/delivery-queue-runtime` | 傳出擱置傳遞排空輔助函式 | | `plugin-sdk/file-access-runtime` | 安全的本機檔案與媒體來源路徑輔助函式 | | `plugin-sdk/heartbeat-runtime` | 心跳喚醒、事件與可見性輔助函式 | | `plugin-sdk/number-runtime` | 數字強制輔助函式 | |
  `plugin-sdk/secure-random-runtime` | 安全權杖/UUID 輔助函式 | | `plugin-sdk/system-event-runtime` | 系統事件佇列輔助函式 | | `plugin-sdk/transport-ready-runtime` | 傳輸就緒等待輔助函式 | | `plugin-sdk/exec-approvals-runtime` | 執行核准原則檔案輔助函式，無需廣泛的基礎架構執行時桶 | | `plugin-sdk/infra-runtime` | 已棄用的相容性填充；請使用上述專注的執行時子路徑 | | `plugin-sdk/collection-runtime`
  | 小型有界快取輔助函式 | | `plugin-sdk/diagnostic-runtime` | 診斷旗標、事件與追蹤內容輔助函式 | | `plugin-sdk/error-runtime` | 錯誤圖表、格式化、共用錯誤分類輔助函式、`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包裝的 fetch、代理、EnvHttpProxyAgent 選項與釘選查找輔助函式 | | `plugin-sdk/runtime-fetch` | 具備分派器感知能力的執行時 fetch，無需代理/防護式 fetch 匯入 | |
  `plugin-sdk/inline-image-data-url-runtime` | 內嵌圖片資料 URL 清理程式與簽章嗅探輔助函式，無需廣泛的媒體執行時層級 | | `plugin-sdk/response-limit-runtime` | 有界的回應主體讀取器，無需廣泛的媒體執行時層級 | | `plugin-sdk/session-binding-runtime` | 目前對話綁定狀態，無需設定的綁定路由或配對存放區 | | `plugin-sdk/session-store-runtime` | Session 存放區輔助函式，無需廣泛的設定寫入/維護匯入 | |
  `plugin-sdk/context-visibility-runtime` | 內容可見性解析與補充內容篩選，無需廣泛的設定/安全性匯入 | | `plugin-sdk/string-coerce-runtime` | 狹隘的基本類型記錄/字串強制與標準化輔助函式，無需 Markdown/日誌匯入 | | `plugin-sdk/host-runtime` | 主機名稱與 SCP 主機標準化輔助函式 | | `plugin-sdk/retry-runtime` | 重試設定與重試執行器輔助函式 | | `plugin-sdk/agent-runtime` |
  代理目錄/身分識別/工作區輔助函式，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 和已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | | `plugin-sdk/directory-runtime` | 設定支援的目錄查詢/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/media-runtime` | 共用的媒體擷取/轉換/儲存輔助程式，包括 `saveRemoteMedia`、`saveResponseMedia`、`readRemoteMediaBuffer` 和已棄用的 `fetchRemoteMedia`；當 URL 應轉換為 OpenClaw 媒體時，優先使用儲存輔助程式而非緩衝區讀取 | | `plugin-sdk/media-mime` | 狹義的 MIME 正規化、副檔名映射、MIME 偵測和媒體類型輔助程式 | | `plugin-sdk/media-store` |
  狹義的媒體儲存輔助程式，例如 `saveMediaBuffer` 和 `saveMediaStream` | | `plugin-sdk/media-generation-runtime` | 共用的媒體生成容錯移轉輔助程式、候選選擇和遺失模型訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型，以及面向提供者的圖像/音訊/結構化擷取輔助匯出 | | `plugin-sdk/text-chunking` | 文字和 Markdown 分塊/呈現輔助程式、Markdown 表格轉換、指令標籤移除和安全文字工具 | |
  `plugin-sdk/text-chunking` | 外寄文字分塊輔助程式 | | `plugin-sdk/speech` | 語音提供者類型，以及面向提供者的指令、註冊表、驗證、相容 OpenAI 的 TTS 建構器和語音輔助匯出 | | `plugin-sdk/speech-core` | 共用的語音提供者類型、註冊表、指令、正規化和語音輔助匯出 | | `plugin-sdk/realtime-transcription` | 即時轉錄提供者類型、註冊表輔助程式和共用的 WebSocket 會話輔助程式 | |
  `plugin-sdk/realtime-bootstrap-context` | 用於有界 `IDENTITY.md`、`USER.md` 和 `SOUL.md` 語境注入的即時設定檔啟動輔助程式 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型、註冊表輔助程式和共用的即時語音行為輔助程式，包括輸出活動追蹤 | | `plugin-sdk/image-generation` | 圖像生成提供者類型，以及圖像資源/資料 URL 輔助程式和相容 OpenAI 的圖像提供者建構器 | | `plugin-sdk/image-generation-core` |
  共用的圖像生成類型、容錯移轉、驗證和註冊表輔助程式 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` | 共用的音樂生成類型、容錯移轉輔助程式、提供者查找和模型參考解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共用的影片生成類型、容錯移轉輔助程式、提供者查找和模型參考解析 | |
  `plugin-sdk/transcripts` | 共用的轉錄來源提供者類型、註冊表輔助程式、會話描述器和語音元資料 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表和路由安裝輔助程式 | | `plugin-sdk/webhook-path` | 已棄用的相容性別名；請使用 `plugin-sdk/webhook-ingress` | | `plugin-sdk/web-media` | 共用的遠端/本機媒體載入輔助程式 | | `plugin-sdk/zod` | 已棄用的相容性重新匯出；請直接從 `zod` 匯入 `zod` | |
  `plugin-sdk/testing` | 僅限於儲存庫內部的已棄用相容性桶，用於舊版 OpenClaw 測試。新的儲存庫測試應改為匯入專注的本機測試子路徑，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` | | `plugin-sdk/plugin-test-api` | 僅限於儲存庫內部的最小 `createTestPluginApi`
  輔助程式，用於在不匯入儲存庫測試輔助橋接器的情況下進行直接外掛註冊單元測試 | | `plugin-sdk/agent-runtime-test-contracts` | 僅限於儲存庫內部的原生代理執行時適配器合約夾具，用於驗證、交付、容錯移轉、工具掛勾、提示覆蓋、架構和轉錄投影測試 | | `plugin-sdk/channel-test-helpers` |
  僅限於儲存庫內部的導向通道測試輔助程式，用於通用動作/設定/狀態合約、目錄斷言、帳戶啟動生命週期、傳送配置執行緒、執行時模擬、狀態問題、外寄交付和掛勾註冊 | | `plugin-sdk/channel-target-testing` | 僅限於儲存庫內部的共用的目標解析錯誤案例套件，用於通道測試 | | `plugin-sdk/plugin-test-contracts` | 僅限於儲存庫內部的外掛套件、註冊、公用成品、直接匯入、執行時 API 和匯入副作用合約輔助程式 | |
  `plugin-sdk/provider-test-contracts` | 僅限於儲存庫內部的提供者執行時、驗證、探索、上架、目錄、精靈、媒體能力、重播原則、即時 STT 即時音訊、網路搜尋/擷取和串流合約輔助程式 | | `plugin-sdk/provider-http-test-mocks` | 僅限於儲存庫內部的選用 Vitest HTTP/驗證模擬，用於執行 `plugin-sdk/provider-http` 的提供者測試 | | `plugin-sdk/test-fixtures` | 僅限於儲存庫內部的通用 CLI
  執行時擷取、沙箱語境、技能寫入器、代理訊息、系統事件、模組重新載入、捆綁外掛路徑、終端文字、分塊、驗證權杖和型別案例夾具 | | `plugin-sdk/test-node-mocks` | 僅限於儲存庫內部的專注 Node 內建模擬輔助程式，用於在 Vitest `vi.mock("node:*")` 工廠內部使用 |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於 manager/config/file/CLI 助手的打包 memory-core 助手介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時期外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` |
  記憶體主機嵌入合約、登錄存取、本機提供者和通用批次/遠端助手。此介面上的 `registerMemoryEmbeddingProvider` 已棄用；對於新的提供者，請使用通用嵌入提供者 API。 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態助手 | |
  `plugin-sdk/memory-core-host-query` | 記憶體主機查詢助手 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機機密助手 | | `plugin-sdk/memory-core-host-events` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-host-events` | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態助手 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時期助手 | |
  `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時期助手 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時期助手 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行時期助手的廠商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌助手的廠商中立別名 | | `plugin-sdk/memory-host-files` | 已棄用的相容性別名；請使用
  `plugin-sdk/memory-core-host-runtime-files` | | `plugin-sdk/memory-host-markdown` | 用於記憶體相關外掛的共用 managed-markdown 助手 | | `plugin-sdk/memory-host-search` | 用於搜尋管理器存取的作用中記憶體執行時期外觀 | | `plugin-sdk/memory-host-status` | 已棄用的相容性別名；請使用 `plugin-sdk/memory-core-host-status` |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    保留的 bundled-helper SDK 子路徑是針對 bundled plugin code 的特定擁有者介面。它們在 SDK 清單中進行追蹤，以確保 package builds 和 aliasing 保持確定性，但它們並非通用的 plugin authoring APIs。新的可重複使用 host contracts 應使用通用 SDK 子路徑，例如 `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。

    | 子路徑 | 擁有者與用途 |
    | --- | --- |
    | `plugin-sdk/codex-mcp-projection` | Bundled Codex plugin helper，用於將使用者 MCP server config 投射到 Codex app-server thread config |
    | `plugin-sdk/codex-native-task-runtime` | Bundled Codex plugin helper，用於將 Codex app-server native subagents 鏡射到 OpenClaw task state |

  </Accordion>
</AccordionGroup>

## 相關

- [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)
- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建構外掛](/zh-Hant/plugins/building-plugins)
