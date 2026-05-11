---
summary: "Plugin SDK 子路徑目錄：依區域分組的 import 位置"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路徑"
---

Plugin SDK 以一組狹窄的子路徑形式暴露於 `openclaw/plugin-sdk/` 之下。
此頁面按用途列出了常用的子路徑。生成的包含 200 多個子路徑的完整列表位於 `scripts/lib/plugin-sdk-entrypoints.json`；
保留的 bundled-plugin helper 子路徑也會出現在那裡，但除非文件頁面明確推薦，否則它們屬於實作細節。

如需外掛撰寫指南，請參閱 [Plugin SDK 概觀](/zh-Hant/plugins/sdk-overview)。

## 外掛進入點

| 子路徑                         | 主要匯出                                                                                                                               |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`      | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`              | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema` |
| `plugin-sdk/config-schema`     | `OpenClawSchema`                                                                                                                       |
| `plugin-sdk/provider-entry`    | `defineSingleProviderPluginEntry`                                                                                                      |
| `plugin-sdk/migration`         | 遷移提供者項目輔助函式，例如 `createMigrationItem`、原因常數、項目狀態標記、編修輔助函式以及 `summarizeMigrationItems`                 |
| `plugin-sdk/migration-runtime` | 執行時期遷移輔助函式，例如 `copyMigrationFileItem` 和 `writeMigrationReport`                                                           |

<AccordionGroup>
  <Accordion title="Channel 子路徑">
    | 子路徑 | 主要匯出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod 網表匯出 (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
    | `plugin-sdk/setup` | 共用的設定精靈輔助函式、允許清單提示、設定狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`、`noteChannelLookupFailure`、`noteChannelLookupSummary`、`promptResolvedAllowFrom`、`splitSetupEntries`、`createAllowlistSetupWizardProxy`、`createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/動作閘道輔助函式、預設帳號後援輔助函式 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化輔助函式 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後援輔助函式 |
    | `plugin-sdk/account-helpers` | 狹隘的帳號清單/帳號動作輔助函式 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 共用的頻道設定網表基元和泛型建構器 |
    | `plugin-sdk/channel-config-schema-legacy` | 已棄用的內建頻道設定網表，僅用於內建相容性 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助函式，具有內建合約後援 |
    | `plugin-sdk/command-gating` | 狹隘的指令授權閘道輔助函式 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`、草稿串流生命週期/完成輔助函式 |
    | `plugin-sdk/inbound-envelope` | 共用的入站路由 + 信封建構器輔助函式 |
    | `plugin-sdk/inbound-reply-dispatch` | 共用的入站記錄和分派輔助函式 |
    | `plugin-sdk/messaging-targets` | 目標解析/比對輔助函式 |
    | `plugin-sdk/outbound-media` | 共用的出站媒體載入輔助函式 |
    | `plugin-sdk/outbound-send-deps` | 針對頻道轉接器的輕量級出站傳送相依性查詢 |
    | `plugin-sdk/outbound-runtime` | 出站傳遞、身分識別、傳送委派、工作階段、格式化和承載規劃輔助函式 |
    | `plugin-sdk/poll-runtime` | 狹隘的投票正規化輔助函式 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結生命週期和轉接器輔助函式 |
    | `plugin-sdk/agent-media-payload` | 舊版代理程式媒體承載建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒繫結、配對和已設定繫結輔助函式 |
    | `plugin-sdk/runtime-config-snapshot` | 執行時設定快照輔助函式 |
    | `plugin-sdk/runtime-group-policy` | 執行時群組原則解析輔助函式 |
    | `plugin-sdk/channel-status` | 共用的頻道狀態快照/摘要輔助函式 |
    | `plugin-sdk/channel-config-primitives` | 狹隘的頻道設定網表基元 |
    | `plugin-sdk/channel-config-writes` | 頻道設定寫入授權輔助函式 |
    | `plugin-sdk/channel-plugin-common` | 共用的頻道外掛程式前奏匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助函式 |
    | `plugin-sdk/group-access` | 共用的群組存取決策輔助函式 |
    | `plugin-sdk/direct-dm` | 共用的直接 DM 認證/防護輔助函式 |
    | `plugin-sdk/interactive-runtime` | 語意訊息呈現、傳遞和舊版互動式回覆輔助函式。請參閱 [訊息呈現](/zh-Hant/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 入站防抖動、提及比對、提及原則輔助函式和信封輔助函式的相容性匯出桶 |
    | `plugin-sdk/channel-inbound-debounce` | 狹隘的入站防抖動輔助函式 |
    | `plugin-sdk/channel-mention-gating` | 狹隘的提及原則和提及文字輔助函式，不包含廣泛的入站執行時表面 |
    | `plugin-sdk/channel-envelope` | 狹隘的入站信封格式化輔助函式 |
    | `plugin-sdk/channel-location` | 頻道位置內容和格式化輔助函式 |
    | `plugin-sdk/channel-logging` | 針對入站丟棄和輸入/確認失敗的頻道記錄輔助函式 |
    | `plugin-sdk/channel-send-result` | 回覆結果類型 |
    | `plugin-sdk/channel-actions` | 頻道訊息動作輔助函式，加上為外掛程式相容性而保留的已棄用原生網表輔助函式 |
    | `plugin-sdk/channel-targets` | 目標解析/比對輔助函式 |
    | `plugin-sdk/channel-contract` | 頻道合約類型 |
    | `plugin-sdk/channel-feedback` | 意見反應/反應接線 |
    | `plugin-sdk/channel-secret-runtime` | 狹隘的秘密合約輔助函式，例如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment` 和秘密目標類型 |
  </Accordion>

<Accordion title="Provider subpaths">
  | Subpath | 主要匯出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支援的 LM Studio 提供者外觀，用於設定、目錄探索和執行時期模型準備 | | `plugin-sdk/lmstudio-runtime` | 支援的 LM Studio 執行時期外觀，用於本機伺服器預設值、模型探索、請求標頭和已載入模型輔助函式 | | `plugin-sdk/provider-setup` | 精選的本機/自託管提供者設定輔助函式 | |
  `plugin-sdk/self-hosted-provider-setup` | 專注於 OpenAI 相容的自託管提供者設定輔助函式 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 監看常數 | | `plugin-sdk/provider-auth-runtime` | 用於提供者外掛的執行時期 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | API 金鑰上架/設定檔寫入輔助函式，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 標準 OAuth 驗證結果建構器
  | | `plugin-sdk/provider-auth-login` | 用於提供者外掛的共用互動式登入輔助函式 | | `plugin-sdk/provider-env-vars` | 提供者驗證環境變數查詢輔助函式 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重播原則建構器、提供者端點輔助函式，以及模型 ID 正規化輔助函式，例如 `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` |
  通用提供者 HTTP/端點功能輔助函式、提供者 HTTP 錯誤，以及音訊轉錄多部分表單輔助函式 | | `plugin-sdk/provider-web-fetch-contract` | 狹義的網頁擷取設定/選擇合約輔助函式，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | 網頁擷取提供者註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` |
  狹義的網頁搜尋設定/憑證輔助函式，適用於不需要外掛啟用接線的提供者 | | `plugin-sdk/provider-web-search-contract` | 狹義的網頁搜尋設定/憑證合約輔助函式，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及範圍限定憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | 網頁搜尋提供者註冊/快取/執行時期輔助函式 | |
  `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 結構清理 + 診斷，以及 xAI 相容性輔助函式，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及類似項目 | | `plugin-sdk/provider-stream` |
  `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝器類型，以及共用 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝器輔助函式 | | `plugin-sdk/provider-transport-runtime` | 原生提供者傳輸輔助函式，例如受保護的擷取、傳輸訊息轉換，以及可寫入的傳輸事件串流 | | `plugin-sdk/provider-onboard` |
  上架設定修補輔助函式 | | `plugin-sdk/global-singleton` | 程序本機單例/映射/快取輔助函式 | | `plugin-sdk/group-activation` | 狹義的群組啟用模式和指令解析輔助函式 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | Subpath | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`、指令註冊輔助工具（包括動態參數選單格式化）、傳送者授權輔助工具 | | `plugin-sdk/command-status` | 指令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 核准者解析和相同聊天動作授權輔助工具 | | `plugin-sdk/approval-client-runtime` |
  原生執行核准設定檔/篩選輔助工具 | | `plugin-sdk/approval-delivery-runtime` | 原生核准功能/傳遞配接器 | | `plugin-sdk/approval-gateway-runtime` | 共享核准閘道解析輔助工具 | | `plugin-sdk/approval-handler-adapter-runtime` | 用於熱通道進入點的輕量級原生核准配接器載入輔助工具 | | `plugin-sdk/approval-handler-runtime` | 更廣泛的核准處理程式執行時輔助工具；當足夠時，優先使用較窄的配接器/閘道縫隙 | |
  `plugin-sdk/approval-native-runtime` | 原生核准目標 + 帳戶綁定輔助工具 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛程式核准回覆載荷輔助工具 | | `plugin-sdk/approval-runtime` | 執行/外掛程式核准載荷輔助工具、原生核准路由/執行時輔助工具，以及結構化核准顯示輔助工具，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 狹窄的入站回覆去重重設輔助工具 | |
  `plugin-sdk/channel-contract-testing` | 狹窄的通道合約測試輔助工具，不含廣泛的測試試料桶 | | `plugin-sdk/command-auth-native` | 原生指令授權、動態參數選單格式化和原生會話目標輔助工具 | | `plugin-sdk/command-detection` | 共享指令偵測輔助工具 | | `plugin-sdk/command-primitives-runtime` | 用於熱通道路徑的輕量級指令文字述詞 | | `plugin-sdk/command-surface` | 指令主體正規化和指令介面輔助工具 | |
  `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用於通道/外掛程式秘密介面的狹窄秘密合約收集輔助工具 | | `plugin-sdk/secret-ref-runtime` | 用於秘密合約/配置解析的狹窄 `coerceSecretRef` 和 SecretRef 類型輔助工具 | | `plugin-sdk/security-runtime` | 共用信任、DM 閘道、外部內容、敏感文字編修、恆定時間秘密比較和秘密收集輔助工具 | |
  `plugin-sdk/ssrf-policy` | 主機允許清單和私人網路 SSRF 政策輔助工具 | | `plugin-sdk/ssrf-dispatcher` | 狹窄的釘選分派器輔助工具，不含廣泛的基礎設施執行時介面 | | `plugin-sdk/ssrf-runtime` | 釘選分派器、SSRF 防護擷取、SSRF 錯誤和 SSRF 政策輔助工具 | | `plugin-sdk/secret-input` | 秘密輸入解析輔助工具 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助工具和原始 websocket/主體強制轉換 | |
  `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助工具 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | 廣泛的 runtime/logging/backup/plugin-install 輔助工具 | | `plugin-sdk/runtime-env` | 狹義的 runtime env, logger, timeout, retry 和 backoff 輔助工具 | | `plugin-sdk/browser-config` | 支援的瀏覽器設定外觀，用於標準化 profile/defaults、CDP URL 解析和瀏覽器控制認證輔助工具 | | `plugin-sdk/channel-runtime-context` | 一般頻道
  runtime-context 註冊和查找輔助工具 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共用外掛程式 command/hook/http/interactive 輔助工具 | | `plugin-sdk/hook-runtime` | 共用 webhook/internal hook pipeline 輔助工具 | | `plugin-sdk/lazy-runtime` | 懶惰 runtime import/binding 輔助工具，例如 `createLazyRuntimeModule`, `createLazyRuntimeMethod` 和
  `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 處理程序 exec 輔助工具 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待、版本、參數呼叫和懶惰 command-group 輔助工具 | | `plugin-sdk/gateway-runtime` | Gateway 用戶端、gateway CLI RPC、gateway protocol 錯誤和 channel-status patch 輔助工具 | | `plugin-sdk/config-types` | 僅限型別的設定介面，用於外掛程式設定形狀，例如 `OpenClawConfig` 和
  channel/provider config 型別 | | `plugin-sdk/plugin-config-runtime` | Runtime plugin-config 查找輔助工具，例如 `requireRuntimeConfig`, `resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | 交易式設定變異輔助工具，例如 `mutateConfigFile`, `replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` |
  目前處理程序設定快照輔助工具，例如 `getRuntimeConfig`, `getRuntimeConfigSnapshot` 和測試快照設定器 | | `plugin-sdk/telegram-command-config` | Telegram command-name/description 標準化和重複/衝突檢查，即使打包的 Telegram 合約介面無法使用 | | `plugin-sdk/text-autolink-runtime` | 檔案參考自動連結偵測，不需要廣泛的 text-runtime barrel | | `plugin-sdk/approval-runtime` | Exec/plugin approval
  輔助工具、approval-capability 建構器、auth/profile 輔助工具、原生 routing/runtime 輔助工具和結構化 approval display path 格式化 | | `plugin-sdk/reply-runtime` | 共用 inbound/reply runtime 輔助工具、分塊、分派、heartbeat、reply 規劃器 | | `plugin-sdk/reply-dispatch-runtime` | 狹義 reply dispatch/finalize 和 conversation-label 輔助工具 | | `plugin-sdk/reply-history` | 共用短視窗 reply-history
  輔助工具，例如 `buildHistoryContext`, `recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 狹義 text/markdown 分塊輔助工具 | | `plugin-sdk/session-store-runtime` | Session store 路徑、session-key、updated-at 和 store 變異輔助工具 | | `plugin-sdk/cron-store-runtime` | Cron store
  路徑/載入/儲存輔助工具 | | `plugin-sdk/state-paths` | State/OAuth 目錄路徑輔助工具 | | `plugin-sdk/routing` | Route/session-key/account 繫結輔助工具，例如 `resolveAgentRoute`, `buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共用 channel/account 狀態摘要輔助工具、runtime-state 預設值和問題元資料輔助工具 | | `plugin-sdk/target-resolver-runtime` |
  共用目標解析器輔助工具 | | `plugin-sdk/string-normalization-runtime` | Slug/字串標準化輔助工具 | | `plugin-sdk/request-url` | 從 fetch/request-like 輸入擷取字串 URL | | `plugin-sdk/run-command` | 具有標準化 stdout/stderr 結果的計時命令執行程式 | | `plugin-sdk/param-readers` | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-payload` | 從工具結果物件擷取標準化 payload | | `plugin-sdk/tool-send` |
  從工具引數擷取正式傳送目標欄位 | | `plugin-sdk/temp-path` | 共用暫存下載路徑輔助工具 | | `plugin-sdk/logging-core` | 子系統記錄器和編修輔助工具 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和轉換輔助工具 | | `plugin-sdk/model-session-runtime` | Model/session 覆寫輔助工具，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` |
  Talk provider config 解析輔助工具 | | `plugin-sdk/json-store` | 小型 JSON 狀態讀寫輔助工具 | | `plugin-sdk/file-lock` | 可重入檔案鎖定輔助工具 | | `plugin-sdk/persistent-dedupe` | 磁碟支援的去重快取輔助工具 | | `plugin-sdk/acp-runtime` | ACP runtime/session 和 reply-dispatch 輔助工具 | | `plugin-sdk/acp-binding-resolve-runtime` | 唯讀 ACP 繫結解析，不需要生命週期啟動匯入 | |
  `plugin-sdk/agent-config-primitives` | 狹義 agent runtime config-schema 基本型別 | | `plugin-sdk/boolean-param` | 寬鬆的布林參數讀取器 | | `plugin-sdk/dangerous-name-runtime` | 危險名稱比對解析輔助工具 | | `plugin-sdk/device-bootstrap` | 裝置引導和配對權杖輔助工具 | | `plugin-sdk/extension-shared` | 共用被動頻道、狀態和環境代理輔助基本型別 | | `plugin-sdk/models-provider-runtime` | `/models`
  command/provider reply 輔助工具 | | `plugin-sdk/skill-commands-runtime` | 技能 command 列出輔助工具 | | `plugin-sdk/native-command-registry` | 原生命令註冊表/建置/序列化輔助工具 | | `plugin-sdk/agent-harness` | 用於低階 agent harness 的實驗性 trusted-plugin 介面：harness 型別、active-run steer/abort 輔助工具、OpenClaw 工具橋接輔助工具、runtime-plan
  工具原則輔助工具、終端結果分類、工具進度格式化/詳細資料輔助工具和嘗試結果公用程式 | | `plugin-sdk/provider-zai-endpoint` | Z.AI 端點偵測輔助工具 | | `plugin-sdk/infra-runtime` | 系統事件/heartbeat 輔助工具 | | `plugin-sdk/collection-runtime` | 小型有界快取輔助工具 | | `plugin-sdk/diagnostic-runtime` | 診斷旗標、事件和追蹤內容輔助工具 | | `plugin-sdk/error-runtime` |
  錯誤圖表、格式化、共用錯誤分類輔助工具，`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包裝的 fetch、proxy 和固定查找輔助工具 | | `plugin-sdk/runtime-fetch` | 具有分派器感知能力的 runtime fetch，不需要 proxy/guarded-fetch 匯入 | | `plugin-sdk/response-limit-runtime` | 有界回應主體讀取器，不需要廣泛的媒體 runtime 介面 | | `plugin-sdk/session-binding-runtime` |
  目前的對話繫結狀態，不需要設定的繫結路由或配對存放區 | | `plugin-sdk/session-store-runtime` | Session-store 輔助工具，不需要廣泛的設定寫入/維護匯入 | | `plugin-sdk/context-visibility-runtime` | 內容可見度解析和補充內容篩選，不需要廣泛的設定/安全性匯入 | | `plugin-sdk/string-coerce-runtime` | 狹義的基本記錄/字串強制轉換和標準化輔助工具，不需要 markdown/logging 匯入 | | `plugin-sdk/host-runtime` |
  主機名稱和 SCP 主機標準化輔助工具 | | `plugin-sdk/retry-runtime` | 重試設定和重試執行程式輔助工具 | | `plugin-sdk/agent-runtime` | Agent 目錄/身分識別/工作區輔助工具 | | `plugin-sdk/directory-runtime` | 設定支援的目錄查詢/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | 共用媒體擷取/轉換/儲存輔助程式，加上媒體載荷建構器 | | `plugin-sdk/media-store` | 精簡的媒體儲存輔助程式，例如 `saveMediaBuffer` | | `plugin-sdk/media-generation-runtime` | 共用媒體生成容錯移轉輔助程式、候選選擇以及缺少模型的訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型，加上提供者導向的圖片/音訊輔助匯出
  | | `plugin-sdk/text-runtime` | 共用文字/Markdown/記錄輔助程式，例如助理可見文字剝除、Markdown 算繪/分塊/表格輔助程式、編修輔助程式、指令標籤輔助程式，以及安全文字公用程式 | | `plugin-sdk/text-chunking` | 外寄文字分塊輔助程式 | | `plugin-sdk/speech` | 語音提供者類型，加上提供者導向的指令、註冊表、驗證和語音輔助匯出 | | `plugin-sdk/speech-core` |
  共用語音提供者類型、註冊表、指令、正規化和語音輔助匯出 | | `plugin-sdk/realtime-transcription` | 即時轉錄提供者類型、註冊表輔助程式，以及共用 WebSocket 工作階段輔助程式 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型和註冊表輔助程式 | | `plugin-sdk/image-generation` | 圖像生成提供者類型 | | `plugin-sdk/image-generation-core` | 共用圖像生成類型、容錯移轉、驗證和註冊表輔助程式 | |
  `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂生成類型、容錯移轉輔助程式、提供者查詢，以及模型參考解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共用影片生成類型、容錯移轉輔助程式、提供者查詢，以及模型參考解析 | | `plugin-sdk/webhook-targets` | Webhook
  目標註冊表和路由安裝輔助程式 | | `plugin-sdk/webhook-path` | Webhook 路徑正規化輔助程式 | | `plugin-sdk/web-media` | 共用遠端/本機媒體載入輔助程式 | | `plugin-sdk/zod` | 為外掛程式 SDK 消費者重新匯出的 `zod` | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`、`shouldAckReaction` |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於管理員/設定檔/檔案/CLI 協助程式的配套記憶體核心協助程式介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時期介面 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` |
  記憶體主機嵌入合約、註冊表存取、本機提供者以及通用批次/遠端協助程式 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` |
  記憶體主機密鑰協助程式 | | `plugin-sdk/memory-core-host-events` | 記憶體主機事件日誌協助程式 | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態協助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-files` |
  記憶體主機檔案/執行時期協助程式 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行時期協助程式的供應商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌協助程式的供應商中立別名 | | `plugin-sdk/memory-host-files` | 記憶體主機檔案/執行時期協助程式的供應商中立別名 | | `plugin-sdk/memory-host-markdown` | 用於記憶體相關外掛程式的共用管理式 Markdown 協助程式 | |
  `plugin-sdk/memory-host-search` | 用於搜尋管理員存取的作用中記憶體執行時期介面 | | `plugin-sdk/memory-host-status` | 記憶體主機狀態協助程式的供應商中立別名 | | `plugin-sdk/memory-lancedb` | 配套記憶體 LanceDB 協助程式介面 |
</Accordion>

  <Accordion title="Reserved bundled-helper subpaths">
    | Family | Current subpaths | Intended use |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | Bundled browser plugin support helpers. `browser-profiles` exports `resolveBrowserConfig`, `resolveProfile`, `ResolvedBrowserConfig`, `ResolvedBrowserProfile`, and `ResolvedBrowserTabCleanupConfig` for the normalized `browser.tabCleanup` shape. `browser-support` remains the compatibility barrel. |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | Bundled Matrix helper/runtime surface |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | Bundled LINE helper/runtime surface |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | Bundled IRC helper surface |
    | Channel-specific helpers | `plugin-sdk/googlechat`, `plugin-sdk/googlechat-runtime-shared`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu`, `plugin-sdk/feishu-conversation`, `plugin-sdk/feishu-setup`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/telegram-command-ui`, `plugin-sdk/tlon`, `plugin-sdk/twitch`, `plugin-sdk/zalo`, `plugin-sdk/zalo-setup` | Deprecated bundled channel compatibility/helper seams. New plugins should import generic SDK subpaths or plugin-local barrels. |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diagnostics-prometheus`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/memory-core`, `plugin-sdk/memory-lancedb`, `plugin-sdk/opencode`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | Bundled feature/plugin helper seams; `plugin-sdk/github-copilot-token` currently exports `DEFAULT_COPILOT_API_BASE_URL`, `deriveCopilotApiBaseUrlFromToken`, and `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 相關

- [Plugin SDK 概述](/zh-Hant/plugins/sdk-overview)
- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建構外掛](/zh-Hant/plugins/building-plugins)
