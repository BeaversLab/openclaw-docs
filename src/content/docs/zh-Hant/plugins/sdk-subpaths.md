---
summary: "Plugin SDK 子路徑目錄：依區域分組的 import 位置"
read_when:
  - Choosing the right plugin-sdk subpath for a plugin import
  - Auditing bundled-plugin subpaths and helper surfaces
title: "Plugin SDK 子路徑"
---

Plugin SDK 以一組特定的子路徑形式暴露在 `openclaw/plugin-sdk/` 下。本頁面按用途分類列出了常用的子路徑。生成的包含 200 多個子路徑的完整列表位於 `scripts/lib/plugin-sdk-entrypoints.json`；保留的 bundled-plugin 輔助子路徑也出現在那裡，除非文檔頁面明確推薦它們，否則它們只是實現細節。維護者可以使用 `pnpm plugins:boundary-report:summary` 審計活動的保留輔助子路徑；未使用的保留輔助匯出會導致 CI 報告失敗，而不是作為休眠的相容性債務留在公共 SDK 中。

有關插件編寫指南，請參閱 [Plugin SDK overview](/zh-Hant/plugins/sdk-overview)。

## 外掛進入點

| 子路徑                                    | 主要匯出                                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`                 | `definePluginEntry`                                                                                                                                                    |
| `plugin-sdk/core`                         | `defineChannelPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase`, `defineSetupPluginEntry`, `buildChannelConfigSchema`, `buildJsonChannelConfigSchema` |
| `plugin-sdk/config-schema`                | `OpenClawSchema`                                                                                                                                                       |
| `plugin-sdk/provider-entry`               | `defineSingleProviderPluginEntry`                                                                                                                                      |
| `plugin-sdk/testing`                      | 用於遺留插件測試的廣泛相容性匯出；對於新的擴展測試，首選專用的測試子路徑                                                                                               |
| `plugin-sdk/plugin-test-api`              | 用於直接插件註冊單元測試的最小化 `OpenClawPluginApi` 模擬建構器                                                                                                        |
| `plugin-sdk/agent-runtime-test-contracts` | 用於認證配置文件、傳遞抑制、回退分類、工具鉤子、提示覆蓋、架構和記錄修復的原生 agent-runtime 適配器契約 fixtures                                                       |
| `plugin-sdk/channel-test-helpers`         | 頻道帳戶生命週期、目錄、發送配置、運行時模擬、鉤子、捆綁頻道入口、信封時間戳、配對回覆和通用頻道契約測試輔助程式                                                       |
| `plugin-sdk/channel-target-testing`       | 共享頻道目標解析錯誤情況測試套件                                                                                                                                       |
| `plugin-sdk/plugin-test-contracts`        | 插件註冊、包清單、公共工件、運行時 API、導入副作用和直接導入契約輔助程式                                                                                               |
| `plugin-sdk/plugin-test-runtime`          | 用於測試的插件運行時、註冊表、提供者註冊、設定精靈和運行時任務流 fixtures                                                                                              |
| `plugin-sdk/provider-test-contracts`      | Provider runtime、auth、discovery、onboard、catalog、media capability、replay policy、realtime STT live-audio、web-search/fetch 以及 wizard contract 輔助函式          |
| `plugin-sdk/provider-http-test-mocks`     | 供執行 `plugin-sdk/provider-http` 的 provider 測試選用的 Vitest HTTP/auth 模擬                                                                                         |
| `plugin-sdk/test-env`                     | 測試環境、fetch/network、一次性 HTTP server、incoming request、live-test、暫存檔案系統以及時間控制測試裝置                                                             |
| `plugin-sdk/test-fixtures`                | 通用 CLI、sandbox、skill、agent-message、system-event、模組重載、bundled plugin 路徑、terminal、chunking、auth-token 以及 typed-case 測試裝置                          |
| `plugin-sdk/test-node-mocks`              | 專注於 Node 內建模擬的輔助函式，用於 Vitest `vi.mock("node:*")` 工廠內部                                                                                               |
| `plugin-sdk/migration`                    | 遷移 provider item 輔助函式，例如 `createMigrationItem`、reason 常數、item status 標記、redaction 輔助函式以及 `summarizeMigrationItems`                               |
| `plugin-sdk/migration-runtime`            | 執行時期遷移輔助函式，例如 `copyMigrationFileItem`、`withCachedMigrationConfigRuntime` 和 `writeMigrationReport`                                                       |

<AccordionGroup>
  <Accordion title="頻道子路徑">
    | 子路徑 | 主要匯出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 匯出 (`OpenClawSchema`) |
    | `plugin-sdk/json-schema-runtime` | 外掛擁有 Schema 的快取 JSON Schema 驗證輔助程式 |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共用設定精靈輔助程式、允許清單提示、設定狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/動作閘道輔助程式、預設帳號後備輔助程式 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化輔助程式 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後備輔助程式 |
    | `plugin-sdk/account-helpers` | 狹義帳號清單/帳號動作輔助程式 |
    | `plugin-sdk/access-groups` | 存取群組允許清單解析和編輯群組診斷輔助程式 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | 舊版回覆管線輔助程式。新的頻道回覆管線程式碼應使用來自 `plugin-sdk/channel-message` 的 `createChannelMessageReplyPipeline` 和 `resolveChannelMessageSourceReplyDeliveryMode`。 |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter`, `resolveChannelDmAccess`, `resolveChannelDmAllowFrom`, `resolveChannelDmPolicy`, `normalizeChannelDmPolicy`, `normalizeLegacyDmAliases` |
    | `plugin-sdk/channel-config-schema` | 共用頻道設定 Schema 基元，加上 Zod 和直接 JSON/TypeBox 建構器 |
    | `plugin-sdk/bundled-channel-config-schema` | 僅限於維護中內建外掛的內建 OpenClaw 頻道設定 Schema |
    | `plugin-sdk/channel-config-schema-legacy` | 內建頻道設定 Schema 的已棄用相容性別名 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助程式，具有內建合約後備 |
    | `plugin-sdk/command-gating` | 狹義指令授權閘道輔助程式 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-ingress` | 已棄用的低階頻道輸入相容性外觀。新的接收路徑應使用 `plugin-sdk/channel-ingress-runtime`。 |
    | `plugin-sdk/channel-ingress-runtime` | 實驗性高階頻道輸入執行時解析器和路由事實建構器，用於已遷移的頻道接收路徑。優先使用此項，而不是在每個外掛中組裝有效允許清單、指令允許清單和舊版投影。請參閱 [頻道輸入 API](/zh-Hant/plugins/sdk-channel-ingress)。 |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, `createChannelRunQueue` 和舊版草稿流生命週期輔助程式。新的預覽完成程式碼應使用 `plugin-sdk/channel-message`。 |
    | `plugin-sdk/channel-message` | 廉價訊息生命週期合約輔助程式，例如 `defineChannelMessageAdapter`, `createChannelMessageAdapterFromOutbound`, `createChannelMessageReplyPipeline`, `createReplyPrefixContext`, `resolveChannelMessageSourceReplyDeliveryMode`、持久最終能力衍生、用於發送/接收/副作用能力的能力證明輔助程式、`MessageReceiveContext`、接收確認原則證明、`defineFinalizableLivePreviewAdapter`、`deliverWithFinalizableLivePreviewAdapter`、即時預覽和即時完成器能力證明、持久恢復狀態、`RenderedMessageBatch`、訊息接收類型和接收 ID 輔助程式。請參閱 [頻道訊息 API](/zh-Hant/plugins/sdk-channel-message)。舊版回覆分派外觀僅用於已棄用的相容性。 |
    | `plugin-sdk/channel-message-runtime` | 可能會載入輸出傳送的執行時傳送輔助程式，包括 `deliverInboundReplyWithMessageSendContext`, `sendDurableMessageBatch` 和 `withDurableMessageSendContext`。已棄用的回覆分派橋接器仍可匯入，僅供相容性分派器使用。請從監控/發送執行時模組使用，而不是熱外掛啟動檔案。 |
    | `plugin-sdk/inbound-envelope` | 共用輸入路由 + 信封建構器輔助程式 |
    | `plugin-sdk/inbound-reply-dispatch` | 舊版共用輸入記錄和分派輔助程式、可見/最終分派述詞，以及為準備好的頻道分派器提供的已棄用 `deliverDurableInboundReplyPayload` 相容性。新的頻道接收/分派程式碼應從 `plugin-sdk/channel-message-runtime` 匯入執行時生命週期輔助程式。 |
    | `plugin-sdk/messaging-targets` | 目標解析/比對輔助程式 |
    | `plugin-sdk/outbound-media` | 共用輸出媒體載入輔助程式 |
    | `plugin-sdk/outbound-send-deps` | 用於頻道介接器的輕量級輸出發送相依性查詢 |
    | `plugin-sdk/outbound-runtime` | 輸出身分識別、發送委派、工作階段、格式化和承載規劃輔助程式。諸如 `deliverOutboundPayloads` 之類的直接傳送輔助程式是已棄用的相容性基質；對於新的發送路徑，請使用 `plugin-sdk/channel-message-runtime`。 |
    | `plugin-sdk/poll-runtime` | 狹義投票正規化輔助程式 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結生命週期和介接器輔助程式 |
    | `plugin-sdk/agent-media-payload` | 舊版代理程式媒體承載建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒繫結、配對和已設定繫結輔助程式 |
    | `plugin-sdk/runtime-config-snapshot` | 執行時設定快照輔助程式 |
    | `plugin-sdk/runtime-group-policy` | 執行時群組原則解析輔助程式 |
    | `plugin-sdk/channel-status` | 共用頻道狀態快照/摘要輔助程式 |
    | `plugin-sdk/channel-config-primitives` | 狹義頻道設定 Schema 基元 |
    | `plugin-sdk/channel-config-writes` | 頻道設定寫入授權輔助程式 |
    | `plugin-sdk/channel-plugin-common` | 共用頻道外掛前奏匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助程式 |
    | `plugin-sdk/group-access` | 共用群組存取決策輔助程式 |
    | `plugin-sdk/direct-dm` | 共用直接 DM 認證/防護輔助程式 |
    | `plugin-sdk/discord` | 已棄用的 Discord 相容性外觀，用於已發布的 `@openclaw/discord@2026.3.13` 和追蹤的擁有者相容性；新外掛應使用通用頻道 SDK 子路徑 |
    | `plugin-sdk/telegram-account` | 已棄用的 Telegram 帳號解析相容性外觀，用於追蹤的擁有者相容性；新外掛應使用注入的執行時輔助程式或通用頻道 SDK 子路徑 |
    | `plugin-sdk/zalouser` | 已棄用的 Zalo Personal 相容性外觀，用於仍匯入傳送者指令授權的已發布 Lark/Zalo 套件；新外掛應使用 `plugin-sdk/command-auth` |
    | `plugin-sdk/interactive-runtime` | 語意訊息呈現、傳送和舊版互動式回覆輔助程式。請參閱 [訊息呈現](/zh-Hant/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 用於輸入防抖、提及比對、提及原則輔助程式和信封輔助程式的相容性匯總 |
    | `plugin-sdk/channel-inbound-debounce` | 狹義輸入防抖輔助程式 |
    | `plugin-sdk/channel-mention-gating` | 狹義提及原則、提及標記和提及文字輔助程式，不包含廣泛的輸入執行時介面 |
    | `plugin-sdk/channel-envelope` | 狹義輸入信封格式化輔助程式 |
    | `plugin-sdk/channel-location` | 頻道位置內容和格式化輔助程式 |
    | `plugin-sdk/channel-logging` | 用於輸入丟棄和輸入/確認失敗的頻道記錄輔助程式 |
    | `plugin-sdk/channel-send-result` | 回覆結果類型 |
    | `plugin-sdk/channel-actions` | 頻道訊息動作輔助程式，加上為外掛相容性而保留的已棄用原生 Schema 輔助程式 |
    | `plugin-sdk/channel-route` | 共用路由正規化、解析器驅動的目標解析、執行緒 ID 字串化、去重/壓縮路由金鑰、已解析目標類型，以及路由/目標比對輔助程式 |
    | `plugin-sdk/channel-targets` | 目標解析輔助程式；路由比對呼叫端應使用 `plugin-sdk/channel-route` |
    | `plugin-sdk/channel-contract` | 頻道合約類型 |
    | `plugin-sdk/channel-feedback` | 意見回應/反應連線 |
    | `plugin-sdk/channel-secret-runtime` | 狹義密碼合約輔助程式，例如 `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` 和密碼目標類型 |
  </Accordion>

<Accordion title="Provider subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/lmstudio` | 支援 LM Studio provider 外觀，用於設定、目錄探索和執行時模型準備 | | `plugin-sdk/lmstudio-runtime` | 支援 LM Studio 執行時外觀，用於本機伺服器預設值、模型探索、請求標頭和已載入模型輔助函式 | | `plugin-sdk/provider-setup` | 精選的本機/自託管 provider 設定輔助函式 |
  | `plugin-sdk/self-hosted-provider-setup` | 專注於 OpenAI 相容的自託管 provider 設定輔助函式 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 監控常數 | | `plugin-sdk/provider-auth-runtime` | 供 provider 外掛使用的執行時 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | API 金鑰上架/設定檔寫入輔助函式，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 標準 OAuth
  認證結果建構器 | | `plugin-sdk/provider-auth-login` | 供 provider 外掛使用的共用互動式登入輔助函式 | | `plugin-sdk/provider-env-vars` | Provider 認證環境變數查詢輔助函式 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials`、已棄用的 `resolveOpenClawAgentDir` 相容性匯出 | |
  `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重試策略建構器、provider 端點輔助函式，以及模型 ID 正規化輔助函式，例如 `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-runtime` | Provider 目錄增強執行時攔截器和外掛 provider 註冊縫合，用於合約測試 | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`buildManifestModelProviderConfig`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 provider HTTP/端點功能輔助函式、provider HTTP 錯誤，以及音訊轉錄多部分表單輔助函式 | | `plugin-sdk/provider-web-fetch-contract` | 狹義的 web-fetch 設定/選擇合約輔助函式，例如
  `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | Web-fetch provider 註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 狹義的 web-search 設定/憑證輔助函式，適用於不需要外掛啟用接線的 providers | | `plugin-sdk/provider-web-search-contract` | 狹義的 web-search 設定/憑證合約輔助函式，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及範圍憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | Web-search provider 註冊/快取/執行時輔助函式 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 結構描述清理 + 診斷，以及 xAI 相容性輔助函式，例如
  `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及類似項目 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝器類型，以及共用的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝器輔助函式 | |
  `plugin-sdk/provider-transport-runtime` | 原生 provider 傳輸輔助函式，例如受保護的 fetch、傳輸訊息轉換和可寫入傳輸事件串流 | | `plugin-sdk/provider-onboard` | 上架設定修補輔助函式 | | `plugin-sdk/global-singleton` | 程序本機單例/對應/快取輔助函式 | | `plugin-sdk/group-activation` | 狹義群組啟動模式和指令解析輔助函式 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，包括動態參數選單格式設定的命令註冊輔助程式、傳送者授權輔助程式 | | `plugin-sdk/command-status` | 命令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 核准者解析和相同聊天動作授權輔助程式 | | `plugin-sdk/approval-client-runtime` |
  原生執行核准設定檔/篩選輔助程式 | | `plugin-sdk/approval-delivery-runtime` | 原生核准功能/交付介面卡 | | `plugin-sdk/approval-gateway-runtime` | 共用核准閘道解析輔助程式 | | `plugin-sdk/approval-handler-adapter-runtime` | 用於熱通道進入點的輕量級原生核准介面卡載入輔助程式 | | `plugin-sdk/approval-handler-runtime` | 更廣泛的核准處理程序執行時輔助程式；當足夠時，請優先使用較窄的介面卡/閘道接縫 | |
  `plugin-sdk/approval-native-runtime` | 原生核准目標 + 帳號綁定輔助程式 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛程式核准回應承載輔助程式 | | `plugin-sdk/approval-runtime` | 執行/外掛程式核准承載輔助程式、原生核准路由/執行時輔助程式，以及結構化核准顯示輔助程式，例如 `formatApprovalDisplayPath` | | `plugin-sdk/reply-dedupe` | 狹窄的傳入回應去重重設輔助程式 | |
  `plugin-sdk/channel-contract-testing` | 狹窄的通道合約測試輔助程式，不包含廣泛的測試桶 | | `plugin-sdk/command-auth-native` | 原生命令授權、動態參數選單格式設定和原生會話目標輔助程式 | | `plugin-sdk/command-detection` | 共用命令偵測輔助程式 | | `plugin-sdk/command-primitives-runtime` | 用於熱通道路徑的輕量級命令文字述詞 | | `plugin-sdk/command-surface` | 命令主體正規化和命令介面輔助程式 | |
  `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用於通道/外掛程式機密介面的狹窄機密合約集合輔助程式 | | `plugin-sdk/secret-ref-runtime` | 用於機密合約/設定剖析的狹窄 `coerceSecretRef` 和 SecretRef 型別輔助程式 | | `plugin-sdk/security-runtime` | 共用信任、DM
  閘控、根邊界檔案/路徑輔助程式，包括僅建立寫入、同步/非同步原子檔案取代、同層級暫存寫入、跨裝置移動後援、私人檔案存放區輔助程式、符號連結父系守衛、外部內容、敏感文字編修、常數時間機密比較和機密集合輔助程式 | | `plugin-sdk/ssrf-policy` | 主機允許清單和私人網路 SSRF 原則輔助程式 | | `plugin-sdk/ssrf-dispatcher` | 狹窄的釘選分派器輔助程式，不包含廣泛的基礎設施執行時介面 | | `plugin-sdk/ssrf-runtime`
  | 釘選分派器、SSRF 守衛擷取、SSRF 錯誤和 SSRF 原則輔助程式 | | `plugin-sdk/secret-input` | 機密輸入剖析輔助程式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助程式和原始 websocket/主體強制轉換 | | `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助程式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | 廣泛的 runtime/logging/backup/plugin-install 輔助函數 | | `plugin-sdk/runtime-env` | 狹窄的 runtime env、logger、timeout、retry 和 backoff 輔助函數 | | `plugin-sdk/browser-config` | 支援的瀏覽器配置外觀，用於標準化的 profile/defaults、CDP URL 解析和 browser-control auth 輔助函數 | | `plugin-sdk/channel-runtime-context` | 通用通道
  runtime-context 註冊和查找輔助函數 | | `plugin-sdk/matrix` | 已棄用的 Matrix 相容性外觀，用於舊的第三方通道套件；新外掛應直接 import `plugin-sdk/run-command` | | `plugin-sdk/mattermost` | 已棄用的 Mattermost 相容性外觀，用於舊的第三方通道套件；新外掛應直接 import 通用 SDK 子路徑 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共享的 plugin
  command/hook/http/interactive 輔助函數 | | `plugin-sdk/hook-runtime` | 共享的 webhook/internal hook pipeline 輔助函數 | | `plugin-sdk/lazy-runtime` | Lazy runtime import/binding 輔助函數，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Process exec 輔助函數 | | `plugin-sdk/cli-runtime` | CLI
  格式化、wait、version、argument-invocation 和 lazy command-group 輔助函數 | | `plugin-sdk/gateway-runtime` | Gateway client、event-loop-ready client start helper、gateway CLI RPC、gateway protocol errors 和 channel-status patch 輔助函數 | | `plugin-sdk/config-types` | 僅限類型的配置表面，用於外掛配置形狀（例如 `OpenClawConfig`）以及 channel/provider 配置類型 | |
  `plugin-sdk/plugin-config-runtime` | Runtime plugin-config 查找輔助函數，例如 `requireRuntimeConfig`、`resolvePluginConfigObject` 和 `resolveLivePluginConfigObject` | | `plugin-sdk/config-mutation` | 交易式配置變異輔助函數，例如 `mutateConfigFile`、`replaceConfigFile` 和 `logConfigUpdated` | | `plugin-sdk/runtime-config-snapshot` | 當前進程配置快照輔助函數，例如
  `getRuntimeConfig`、`getRuntimeConfigSnapshot` 和測試快照設定器 | | `plugin-sdk/telegram-command-config` | Telegram command-name/description 標準化和重複/衝突檢查，即使 bundled Telegram contract surface 不可用 | | `plugin-sdk/text-autolink-runtime` | 檔案參考自動連結檢測，不需要廣泛的 text-runtime barrel | | `plugin-sdk/approval-runtime` | Exec/plugin 核准輔助函數、approval-capability
  建構器、auth/profile 輔助函數、native routing/runtime 輔助函數和結構化核准顯示路徑格式化 | | `plugin-sdk/reply-runtime` | 共享 inbound/reply runtime 輔助函數、chunking、dispatch、heartbeat、reply planner | | `plugin-sdk/reply-dispatch-runtime` | 狹窄的 reply dispatch/finalize 和 conversation-label 輔助函數 | | `plugin-sdk/reply-history` | 共享的短視窗 reply-history 輔助函數和標記，例如
  `buildHistoryContext`、`HISTORY_CONTEXT_MARKER`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 狹窄的 text/markdown chunking 輔助函數 | | `plugin-sdk/session-store-runtime` | Session store path、session-key、updated-at 和 store mutation 輔助函數 | | `plugin-sdk/cron-store-runtime` |
  Cron store path/load/save 輔助函數 | | `plugin-sdk/state-paths` | State/OAuth dir path 輔助函數 | | `plugin-sdk/routing` | Route/session-key/account binding 輔助函數，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共享的 channel/account status summary 輔助函數、runtime-state defaults 和 issue metadata 輔助函數 | |
  `plugin-sdk/target-resolver-runtime` | 共享的 target resolver 輔助函數 | | `plugin-sdk/string-normalization-runtime` | Slug/string 標準化輔助函數 | | `plugin-sdk/request-url` | 從 fetch/request-like 輸入中提取字串 URL | | `plugin-sdk/run-command` | 計時命令執行器，具有標準化的 stdout/stderr 結果 | | `plugin-sdk/param-readers` | 通用 tool/CLI 參數讀取器 | | `plugin-sdk/tool-payload` | 從 tool
  result 物件中提取標準化的 payload | | `plugin-sdk/tool-send` | 從 tool args 中提取正準的 send target 欄位 | | `plugin-sdk/temp-path` | 共享的 temp-download path 輔助函數和私人安全 temp 工作區 | | `plugin-sdk/logging-core` | 子系統 logger 和編修輔助函數 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式和轉換輔助函數 | | `plugin-sdk/model-session-runtime` | Model/session
  覆寫輔助函數，例如 `applyModelOverrideToSessionEntry` 和 `resolveAgentMaxConcurrent` | | `plugin-sdk/talk-config-runtime` | Talk provider 配置解析輔助函數 | | `plugin-sdk/json-store` | 小型 JSON 狀態讀寫輔助函數 | | `plugin-sdk/file-lock` | 可重入檔案鎖定輔助函數 | | `plugin-sdk/persistent-dedupe` | 磁碟支援的刪重快取輔助函數 | | `plugin-sdk/acp-runtime` | ACP runtime/session 和 reply-dispatch
  輔助函數 | | `plugin-sdk/acp-runtime-backend` | 輕量級 ACP 後端註冊和 reply-dispatch 輔助函數，用於啟動時載入的外掛 | | `plugin-sdk/acp-binding-resolve-runtime` | 唯讀 ACP binding 解析，不需要生命週期啟動 imports | | `plugin-sdk/agent-config-primitives` | 狹窄的 agent runtime config-schema 基元 | | `plugin-sdk/boolean-param` | 寬鬆的布林參數讀取器 | | `plugin-sdk/dangerous-name-runtime` |
  危險名稱匹配解析輔助函數 | | `plugin-sdk/device-bootstrap` | 裝置引導和配對權杖輔助函數 | | `plugin-sdk/extension-shared` | 共享的被動通道、狀態和環境代理輔助基元 | | `plugin-sdk/models-provider-runtime` | `/models` command/provider reply 輔助函數 | | `plugin-sdk/skill-commands-runtime` | Skill 命令列表輔助函數 | | `plugin-sdk/native-command-registry` | 原生命令註冊表/建置/序列化輔助函數 | |
  `plugin-sdk/agent-harness` | 實驗性的 trusted-plugin 表面，用於低階 agent harness：harness 類型、active-run steer/abort 輔助函數、OpenClaw tool bridge 輔助函數、runtime-plan tool policy 輔助函數、終端結果分類、tool progress formatting/detail 輔助函數和嘗試結果實用程式 | | `plugin-sdk/provider-zai-endpoint` | Z.AI 端點檢測輔助函數 | | `plugin-sdk/async-lock-runtime` |
  程序本機非同步鎖定輔助函數，用於小型 runtime 狀態檔案 | | `plugin-sdk/channel-activity-runtime` | 通道活動遙測輔助函數 | | `plugin-sdk/concurrency-runtime` | 有界非同步工作並發輔助函數 | | `plugin-sdk/dedupe-runtime` | 記憶體內刪重快取輔助函數 | | `plugin-sdk/delivery-queue-runtime` | Outbound pending-delivery 排空輔助函數 | | `plugin-sdk/file-access-runtime` |
  安全的本機檔案和媒體來源路徑輔助函數 | | `plugin-sdk/heartbeat-runtime` | Heartbeat wake、event 和可見性輔助函數 | | `plugin-sdk/number-runtime` | 數字強制轉換輔助函數 | | `plugin-sdk/secure-random-runtime` | 安全權杖/UUID 輔助函數 | | `plugin-sdk/system-event-runtime` | 系統事件佇列輔助函數 | | `plugin-sdk/transport-ready-runtime` | 傳輸就緒等待輔助函數 | | `plugin-sdk/infra-runtime` |
  已棄用的相容性 shim；請使用上述專注的 runtime 子路徑 | | `plugin-sdk/collection-runtime` | 小型有界快取輔助函數 | | `plugin-sdk/diagnostic-runtime` | 診斷標誌、事件和追蹤內容輔助函數 | | `plugin-sdk/error-runtime` | 錯誤圖表、格式化、共享錯誤分類輔助函數、`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包裝的 fetch、proxy、EnvHttpProxyAgent 選項和固定查找輔助函數 | |
  `plugin-sdk/runtime-fetch` | Dispatcher 感知的 runtime fetch，不需要 proxy/guarded-fetch imports | | `plugin-sdk/response-limit-runtime` | 有界回應主體讀取器，不需要廣泛的 media runtime surface | | `plugin-sdk/session-binding-runtime` | 當前對話綁定狀態，不需要配置的綁定路由或配對儲存 | | `plugin-sdk/session-store-runtime` | Session-store 輔助函數，不需要廣泛的 config writes/maintenance imports
  | | `plugin-sdk/context-visibility-runtime` | 內容可見性解析和補充內容過濾，不需要廣泛的 config/security imports | | `plugin-sdk/string-coerce-runtime` | 狹窄的基元記錄/字串強制轉換和標準化輔助函數，不需要 markdown/logging imports | | `plugin-sdk/host-runtime` | 主機名稱和 SCP 主機標準化輔助函數 | | `plugin-sdk/retry-runtime` | 重試配置和重試執行器輔助函數 | | `plugin-sdk/agent-runtime` | Agent
  dir/identity/workspace 輔助函數，包括 `resolveAgentDir`、`resolveDefaultAgentDir` 和已棄用的 `resolveOpenClawAgentDir` 相容性 export | | `plugin-sdk/directory-runtime` | Config-backed 目錄查詢/刪重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="功能和測試子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/media-runtime` | 共享的媒體擷取/轉換/儲存輔助函式、基於 ffprobe 的影片尺寸探測以及媒體 Payload 建構器 | | `plugin-sdk/media-mime` | 窄化的 MIME 正規化、副檔名對應、MIME 偵測和媒體種類輔助函式 | | `plugin-sdk/media-store` | 窄化的媒體儲存輔助函式，例如 `saveMediaBuffer` | | `plugin-sdk/media-generation-runtime` |
  共享的媒體生成容錯移轉輔助函式、候選選擇以及缺少模型的訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型，以及提供者面向的圖片/音訊輔助匯出 | | `plugin-sdk/text-runtime` | 共享的文字/Markdown/日誌輔助函式，例如助理可見文字剝離、Markdown 渲染/分塊/表格輔助函式、編修輔助函式、指令標籤輔助函式和安全文字工具 | | `plugin-sdk/text-chunking` | 外寄文字分塊輔助函式 | |
  `plugin-sdk/speech` | 語音提供者類型，以及提供者面向的指令、註冊表、驗證、OpenAI 相容 TTS 建構器和語音輔助匯出 | | `plugin-sdk/speech-core` | 共享的語音提供者類型、註冊表、指令、正規化和語音輔助匯出 | | `plugin-sdk/realtime-transcription` | 即時轉錄提供者類型、註冊表輔助函式和共享的 WebSocket 會話輔助函式 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型和註冊表輔助函式 | |
  `plugin-sdk/image-generation` | 影像生成提供者類型，以及影像資產/資料 URL 輔助函式和 OpenAI 相容影像提供者建構器 | | `plugin-sdk/image-generation-core` | 共享的影像生成類型、容錯移轉、驗證和註冊表輔助函式 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` | 共享的音樂生成類型、容錯移轉輔助函式、提供者查詢和模型參照解析 | |
  `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共享的影片生成類型、容錯移轉輔助函式、提供者查詢和模型參照解析 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表和路由安裝輔助函式 | | `plugin-sdk/webhook-path` | Webhook 路徑正規化輔助函式 | | `plugin-sdk/web-media` | 共享的遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | 供外掛 SDK
  使用者使用的重新匯出 `zod` | | `plugin-sdk/testing` | 用於舊版外掛測試的廣泛相容性匯出桶。新的擴充功能測試應改為匯入專注的 SDK 子路徑，例如 `plugin-sdk/agent-runtime-test-contracts`、`plugin-sdk/plugin-test-runtime`、`plugin-sdk/channel-test-helpers`、`plugin-sdk/test-env` 或 `plugin-sdk/test-fixtures` | | `plugin-sdk/plugin-test-api` | 最小化的 `createTestPluginApi`
  輔助函式，用於直接外掛註冊單元測試，無需匯入 repo 測試輔助橋接器 | | `plugin-sdk/agent-runtime-test-contracts` | 原生 agent-runtime 介面卡合約固定裝置，用於驗證、遞送、容錯移轉、工具掛鉤、提示覆蓋、Schema 和轉錄投影測試 | | `plugin-sdk/channel-test-helpers` | 面向通道的測試輔助函式，用於通用動作/設定/狀態合約、目錄斷言、帳戶啟動生命週期、傳送設定執行緒、運行時模擬、狀態問題、外寄遞送和掛鉤註冊 |
  | `plugin-sdk/channel-target-testing` | 用於通道測試的共享目標解析錯誤案例套件 | | `plugin-sdk/plugin-test-contracts` | 外掛套件、註冊、公開成品、直接匯入、運行時 API 和匯入副作用合約輔助函式 | | `plugin-sdk/provider-test-contracts` | 提供者運行時、驗證、探索、上架、目錄、精靈、媒體功能、重播原則、即時 STT 即時音訊、網路搜尋/擷取和串流合約輔助函式 | | `plugin-sdk/provider-http-test-mocks` |
  供執行 `plugin-sdk/provider-http` 的提供者測試使用的選用 Vitest HTTP/驗證模擬 | | `plugin-sdk/test-fixtures` | 通用 CLI 運行時擷取、沙箱上下文、技能寫入器、代理訊息、系統事件、模組重新載入、捆绑外掛路徑、終端文字、分塊、驗證權杖和型別案例固定裝置 | | `plugin-sdk/test-node-mocks` | 專注的 Node 內建模擬輔助函式，用於 Vitest `vi.mock("node:*")` 工廠內部 |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於 manager/config/file/CLI 協助程式的打包記憶體核心 協助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時期外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入合約、登錄存取、本機提供者及通用批次/遠端協助程式 |
  | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機機密協助程式 | | `plugin-sdk/memory-core-host-events` |
  記憶體主機事件日誌協助程式 | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態協助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時期協助程式 | | `plugin-sdk/memory-host-core` |
  記憶體主機核心執行時期協助程式的供應商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌協助程式的供應商中立別名 | | `plugin-sdk/memory-host-files` | 記憶體主機檔案/執行時期協助程式的供應商中立別名 | | `plugin-sdk/memory-host-markdown` | 用於記憶體相鄰外掛程式的共享管理 Markdown 協助程式 | | `plugin-sdk/memory-host-search` | 用於搜尋管理器 存取的使用中記憶體執行時期外觀 | |
  `plugin-sdk/memory-host-status` | 記憶體主機狀態協助程式的供應商中立別名 |
</Accordion>

  <Accordion title="保留的打包協助程式子路徑">
    目前沒有保留的打包協助程式 SDK 子路徑。擁有者特定的協助程式位於
    擁有外掛程式的套件內，而可重複使用的主機合約則使用通用 SDK 子路徑，例如
    `plugin-sdk/gateway-runtime`、`plugin-sdk/security-runtime` 和 `plugin-sdk/plugin-config-runtime`。
  </Accordion>
</AccordionGroup>

## 相關

- [Plugin SDK 概覽](/zh-Hant/plugins/sdk-overview)
- [Plugin SDK 設定](/zh-Hant/plugins/sdk-setup)
- [建置外掛](/zh-Hant/plugins/building-plugins)
