---
title: "Plugin SDK 概觀"
sidebarTitle: "SDK 概觀"
summary: "匯入對應表、註冊 API 參考資料，以及 SDK 架構"
read_when:
  - You need to know which SDK subpath to import from
  - You want a reference for all registration methods on OpenClawPluginApi
  - You are looking up a specific SDK export
---

# Plugin SDK 概觀

Plugin SDK 是外掛與核心之間的型別合約。此頁面是關於**要匯入什麼**以及**您可以註冊什麼**的參考。

<Tip>**正在尋找操作指南？** - 第一個外掛程式？從[入門指南](/en/plugins/building-plugins)開始 - 頻道外掛程式？請參閱[頻道外掛程式](/en/plugins/sdk-channel-plugins) - 提供者外掛程式？請參閱[提供者外掛程式](/en/plugins/sdk-provider-plugins)</Tip>

## 匯入慣例

請務必從特定的子路徑匯入：

```typescript
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
```

每個子路徑都是一個小型的、獨立的模組。這能保持快速啟動並防止循環依賴問題。對於特定於頻道的入口/構建輔助工具，請優先使用 `openclaw/plugin-sdk/channel-core`；將 `openclaw/plugin-sdk/core` 用於更廣泛的綜合介面和共享輔助工具，例如 `buildChannelConfigSchema`。

請勿新增或依賴以提供者命名的便利縫合層（convenience seams），例如 `openclaw/plugin-sdk/slack`、`openclaw/plugin-sdk/discord`、`openclaw/plugin-sdk/signal`、`openclaw/plugin-sdk/whatsapp` 或以頻道命名的輔助縫合層。捆綁插件應在其自己的 `api.ts` 或 `runtime-api.ts` 桶中組合通用的 SDK 子路徑，而核心應使用那些插件的本地桶，或者在需求真正跨頻道時新增狹窄的通用 SDK 合約。

生成的匯出映射仍然包含一小組捆綁插件輔助縫合層，例如 `plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。這些子路徑僅用於捆綁插件的維護和相容性；它們被有意地從下方的通用表中省略，並不是推薦的新第三方插件匯入路徑。

## 子路徑參考

最常用的子路徑，按用途分組。生成的 200 多個子路徑的完整清單位於 `scripts/lib/plugin-sdk-entrypoints.json` 中。

保留的捆綁插件輔助子路徑仍然出現在該生成的清單中。除非文檔頁面明確將某個子路徑推廣為公開，否則請將其視為實作細節/相容性介面。

### 插件入口

| 子路徑                      | 主要匯出                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin-sdk/plugin-entry`   | `definePluginEntry`                                                                                                                    |
| `plugin-sdk/core`           | `defineChannelPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase`、`defineSetupPluginEntry`、`buildChannelConfigSchema` |
| `plugin-sdk/config-schema`  | `OpenClawSchema`                                                                                                                       |
| `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry`                                                                                                      |

<AccordionGroup>
  <Accordion title="頻道子路徑">
    | 子路徑 | 主要匯出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根`openclaw.json` Zod schema 匯出 (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` |
    | `plugin-sdk/setup` | 共用設定精靈輔助函式、允許清單提示、設定狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`、`createEnvPatchedAccountSetupAdapter`、`createSetupInputPresenceValidator`、`noteChannelLookupFailure`、`noteChannelLookupSummary`、`promptResolvedAllowFrom`、`splitSetupEntries`、`createAllowlistSetupWizardProxy`、`createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/操作閘道輔助函式、預設帳號後援輔助函式 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化輔助函式 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後援輔助函式 |
    | `plugin-sdk/account-helpers` | 狹義帳號清單/帳號操作輔助函式 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 頻道設定 schema 型別 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助函式，含配套合約後援 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/inbound-envelope` | 共用入站路由 + 信封建構器輔助函式 |
    | `plugin-sdk/inbound-reply-dispatch` | 共用入站記錄與分派輔助函式 |
    | `plugin-sdk/messaging-targets` | 目標解析/匹配輔助函式 |
    | `plugin-sdk/outbound-media` | 共用出站媒體載入輔助函式 |
    | `plugin-sdk/outbound-runtime` | 出站身分/發送委派輔助函式 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結生命週期與配接器輔助函式 |
    | `plugin-sdk/agent-media-payload` | 舊版代理媒體 Payload 建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒繫結、配對與設定繫結輔助函式 |
    | `plugin-sdk/runtime-config-snapshot` | 執行時期設定快照輔助函式 |
    | `plugin-sdk/runtime-group-policy` | 執行時期群組原則解析輔助函式 |
    | `plugin-sdk/channel-status` | 共用頻道狀態快照/摘要輔助函式 |
    | `plugin-sdk/channel-config-primitives` | 狹義頻道設定 schema 原語 |
    | `plugin-sdk/channel-config-writes` | 頻道設定寫入授權輔助函式 |
    | `plugin-sdk/channel-plugin-common` | 共用頻道外掛前導匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助函式 |
    | `plugin-sdk/group-access` | 共用群組存取決策輔助函式 |
    | `plugin-sdk/direct-dm` | 共用直接 DM 認證/防護輔助函式 |
    | `plugin-sdk/interactive-runtime` | 互動回覆 Payload 正規化/簡化輔助函式 |
    | `plugin-sdk/channel-inbound` | 入站防抖、提及匹配、提及原則輔助函式與信封輔助函式 |
    | `plugin-sdk/channel-send-result` | 回覆結果型別 |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`、`createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | 目標解析/匹配輔助函式 |
    | `plugin-sdk/channel-contract` | 頻道合約型別 |
    | `plugin-sdk/channel-feedback` | 回饋/反應接線 |
    | `plugin-sdk/channel-secret-runtime` | 狹義秘密合約輔助函式，如 `collectSimpleChannelFieldAssignments`、`getChannelSurface`、`pushAssignment`，以及秘密目標型別 |
  </Accordion>

<Accordion title="Provider 子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | 精選的本機/自託管 Provider 設定輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自託管 Provider 設定輔助函式 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 監看常數 | | `plugin-sdk/provider-auth-runtime` | Provider 外掛的執行時 API
  金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | API 金鑰上架/設定檔寫入輔助函式，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 標準 OAuth 認證結果建構器 | | `plugin-sdk/provider-auth-login` | Provider 外掛的共用互動式登入輔助函式 | | `plugin-sdk/provider-env-vars` | Provider 認證環境變數查找輔助函式 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`,
  `ensureApiKeyFromOptionEnvOrPrompt`, `upsertAuthProfile`, `upsertApiKeyProfile`, `writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`, `buildProviderReplayFamilyHooks`, `normalizeModelCompat`, 共用的重試策略建構器, Provider 端點輔助函式, 以及模型 ID 正規化輔助函式，例如 `normalizeNativeXaiModelId` | | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`, `buildSingleProviderApiKeyCatalog`, `supportsNativeStreamingUsageCompat`, `applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 Provider HTTP/端點能力輔助函式 | | `plugin-sdk/provider-web-fetch-contract` | 狹義的網頁擷取設定/選取合約輔助函式，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | 網頁擷取
  Provider 註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 狹義的網頁搜尋設定/憑證輔助函式，適用於不需要外掛啟用接線的 Providers | | `plugin-sdk/provider-web-search-contract` | 狹義的網頁搜尋設定/憑證合約輔助函式，例如 `createWebSearchProviderContractFields`, `enablePluginInConfig`, `resolveProviderWebSearchPluginConfig`, 以及範圍化的憑證設定器/取得器 | |
  `plugin-sdk/provider-web-search` | 網頁搜尋 Provider 註冊/快取/執行時輔助函式 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`, `buildProviderToolCompatFamilyHooks`, Gemini 結構描述清理 + 診斷, 以及 xAI 相容輔助函式，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及類似功能 | | `plugin-sdk/provider-stream` |
  `ProviderStreamFamily`, `buildProviderStreamFamilyHooks`, `composeProviderStreamWrappers`, 串流包裝器類型, 以及共用的 Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝輔助函式 | | `plugin-sdk/provider-onboard` | 上架設定檔修補輔助函式 | | `plugin-sdk/global-singleton` | 程序本地的單例/映射/快取輔助函式 |
</Accordion>

<Accordion title="驗證與安全性子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`、指令登錄輔助函式、發送者授權輔助函式 | | `plugin-sdk/command-status` | 指令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 核准者解析與同聊天室動作授權輔助函式 | | `plugin-sdk/approval-client-runtime` | 原生執行核准設定檔/篩選輔助函式
  | | `plugin-sdk/approval-delivery-runtime` | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 共用核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 用於熱頻道進入點的輕量級原生核准介面卡載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 更廣泛的核准處理程式執行時輔助函式；若足夠，建議優先使用較狹窄的介面卡/閘道縫隙 | |
  `plugin-sdk/approval-native-runtime` | 原生核准目標 + 帳號綁定輔助函式 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛核准回應承載輔助函式 | | `plugin-sdk/command-auth-native` | 原生指令驗證 + 原生階段目標輔助函式 | | `plugin-sdk/command-detection` | 共用指令偵測輔助函式 | | `plugin-sdk/command-surface` | 指令主體正規化與指令介面輔助函式 | | `plugin-sdk/allow-from` |
  `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用於頻道/外掛秘密介面的狹隘秘密合約收集輔助函式 | | `plugin-sdk/secret-ref-runtime` | 用於秘密合約/設定解析的狹隘 `coerceSecretRef` 與 SecretRef 型別輔助函式 | | `plugin-sdk/security-runtime` | 共用信任、DM 閘道、外部內容與秘密收集輔助函式 | | `plugin-sdk/ssrf-policy` | 主機允許清單與私人網路 SSRF 原則輔助函式 | |
  `plugin-sdk/ssrf-runtime` | 固定分派器、SSRF 防護擷取與 SSRF 原則輔助函式 | | `plugin-sdk/secret-input` | 秘密輸入解析輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助函式 | | `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助函式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | Broad runtime/logging/backup/plugin-install helpers | | `plugin-sdk/runtime-env` | Narrow runtime env, logger, timeout, retry, and backoff helpers | | `plugin-sdk/channel-runtime-context` | Generic channel runtime-context registration and lookup helpers | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | |
  `plugin-sdk/plugin-runtime` | Shared plugin command/hook/http/interactive helpers | | `plugin-sdk/hook-runtime` | Shared webhook/internal hook pipeline helpers | | `plugin-sdk/lazy-runtime` | Lazy runtime import/binding helpers such as `createLazyRuntimeModule`, `createLazyRuntimeMethod`, and `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Process exec helpers | |
  `plugin-sdk/cli-runtime` | CLI formatting, wait, and version helpers | | `plugin-sdk/gateway-runtime` | Gateway client and channel-status patch helpers | | `plugin-sdk/config-runtime` | Config load/write helpers | | `plugin-sdk/telegram-command-config` | Telegram command-name/description normalization and duplicate/conflict checks, even when the bundled Telegram contract surface is unavailable |
  | `plugin-sdk/approval-runtime` | Exec/plugin approval helpers, approval-capability builders, auth/profile helpers, native routing/runtime helpers | | `plugin-sdk/reply-runtime` | Shared inbound/reply runtime helpers, chunking, dispatch, heartbeat, reply planner | | `plugin-sdk/reply-dispatch-runtime` | Narrow reply dispatch/finalize helpers | | `plugin-sdk/reply-history` | Shared short-window
  reply-history helpers such as `buildHistoryContext`, `recordPendingHistoryEntry`, and `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Narrow text/markdown chunking helpers | | `plugin-sdk/session-store-runtime` | Session store path + updated-at helpers | | `plugin-sdk/state-paths` | State/OAuth dir path helpers | |
  `plugin-sdk/routing` | Route/session-key/account binding helpers such as `resolveAgentRoute`, `buildAgentSessionKey`, and `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Shared channel/account status summary helpers, runtime-state defaults, and issue metadata helpers | | `plugin-sdk/target-resolver-runtime` | Shared target resolver helpers | |
  `plugin-sdk/string-normalization-runtime` | Slug/string normalization helpers | | `plugin-sdk/request-url` | Extract string URLs from fetch/request-like inputs | | `plugin-sdk/run-command` | Timed command runner with normalized stdout/stderr results | | `plugin-sdk/param-readers` | Common tool/CLI param readers | | `plugin-sdk/tool-payload` | Extract normalized payloads from tool result objects
  | | `plugin-sdk/tool-send` | Extract canonical send target fields from tool args | | `plugin-sdk/temp-path` | Shared temp-download path helpers | | `plugin-sdk/logging-core` | Subsystem logger and redaction helpers | | `plugin-sdk/markdown-table-runtime` | Markdown table mode helpers | | `plugin-sdk/json-store` | Small JSON state read/write helpers | | `plugin-sdk/file-lock` | Re-entrant
  file-lock helpers | | `plugin-sdk/persistent-dedupe` | Disk-backed dedupe cache helpers | | `plugin-sdk/acp-runtime` | ACP runtime/session and reply-dispatch helpers | | `plugin-sdk/agent-config-primitives` | Narrow agent runtime config-schema primitives | | `plugin-sdk/boolean-param` | Loose boolean param reader | | `plugin-sdk/dangerous-name-runtime` | Dangerous-name matching resolution
  helpers | | `plugin-sdk/device-bootstrap` | Device bootstrap and pairing token helpers | | `plugin-sdk/extension-shared` | Shared passive-channel, status, and ambient proxy helper primitives | | `plugin-sdk/models-provider-runtime` | `/models` command/provider reply helpers | | `plugin-sdk/skill-commands-runtime` | Skill command listing helpers | | `plugin-sdk/native-command-registry` | Native
  command registry/build/serialize helpers | | `plugin-sdk/agent-harness` | Experimental trusted-plugin surface for low-level agent harnesses: harness types, active-run steer/abort helpers, OpenClaw tool bridge helpers, and attempt result utilities | | `plugin-sdk/provider-zai-endpoint` | Z.AI endpoint detection helpers | | `plugin-sdk/infra-runtime` | System event/heartbeat helpers | |
  `plugin-sdk/collection-runtime` | Small bounded cache helpers | | `plugin-sdk/diagnostic-runtime` | Diagnostic flag and event helpers | | `plugin-sdk/error-runtime` | Error graph, formatting, shared error classification helpers, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Wrapped fetch, proxy, and pinned lookup helpers | | `plugin-sdk/host-runtime` | Hostname and SCP host
  normalization helpers | | `plugin-sdk/retry-runtime` | Retry config and retry runner helpers | | `plugin-sdk/agent-runtime` | Agent dir/identity/workspace helpers | | `plugin-sdk/directory-runtime` | Config-backed directory query/dedup | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | 共用的媒體擷取/轉換/儲存輔助函式，加上媒體負載建構器 | | `plugin-sdk/media-generation-runtime` | 共用的媒體生成容錯移轉輔助函式、候選選取以及遺漏模型訊息 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型，加上提供者面向的影像/音訊輔助匯出 | | `plugin-sdk/text-runtime` |
  共用的文字/markdown/記錄輔助函式，例如助理可見文字剝離、markdown 算繪/分塊/表格輔助函式、編修輔助函式、指令標籤輔助函式和安全文字公用程式 | | `plugin-sdk/text-chunking` | 外寄文字分塊輔助函式 | | `plugin-sdk/speech` | 語音提供者類型，加上提供者面向的指令、註冊表和驗證輔助函式 | | `plugin-sdk/speech-core` | 共用的語音提供者類型、註冊表、指令和正規化輔助函式 | | `plugin-sdk/realtime-transcription`
  | 即時轉錄提供者類型和註冊表輔助函式 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型和註冊表輔助函式 | | `plugin-sdk/image-generation` | 影像生成提供者類型 | | `plugin-sdk/image-generation-core` | 共用的影像生成類型、容錯移轉、驗證和註冊表輔助函式 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` |
  共用的音樂生成類型、容錯移轉輔助函式、提供者查詢和模型參照解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共用的影片生成類型、容錯移轉輔助函式、提供者查詢和模型參照解析 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表和路由安裝輔助函式 | | `plugin-sdk/webhook-path` | Webhook 路徑正規化輔助函式 | | `plugin-sdk/web-media` |
  共用的遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | 重新匯出的 `zod`，供外掛 SDK 消費者使用 | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於管理員/設定/檔案/CLI 協助程式的配套記憶體核心 (memory-core) 協助程式介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時期外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入式引擎匯出 | |
  `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機機密協助程式 | | `plugin-sdk/memory-core-host-events` |
  記憶體主機事件日誌協助程式 | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態協助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時期協助程式 | | `plugin-sdk/memory-host-core` |
  記憶體主機核心執行時期協助程式的供應商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌協助程式的供應商中立別名 | | `plugin-sdk/memory-host-files` | 記憶體主機檔案/執行時期協助程式的供應商中立別名 | | `plugin-sdk/memory-host-markdown` | 用於記憶體相鄰外掛程式的共用 managed-markdown 協助程式 | | `plugin-sdk/memory-host-search` | 用於搜尋管理員存取的作用中記憶體執行時期外觀 | |
  `plugin-sdk/memory-host-status` | 記憶體主機狀態協助程式的供應商中立別名 | | `plugin-sdk/memory-lancedb` | 配套 memory-lancedb 協助程式介面 |
</Accordion>

  <Accordion title="保留的捆綁輔助子路徑">
    | 系列 | 當前子路徑 | 預期用途 |
    | --- | --- | --- |
    | 瀏覽器 | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | 捆綁的瀏覽器外掛程式支援輔助程式（`browser-support` 保持為相容性匯出點） |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | 捆綁的 Matrix 輔助程式/執行時介面 |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | 捆綁的 LINE 輔助程式/執行時介面 |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | 捆綁的 IRC 輔助程式介面 |
    | 特定頻道輔助程式 | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | 捆綁的頻道相容性/輔助程式接縫 |
    | 驗證/外掛程式特定輔助程式 | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | 捆綁的功能/外掛程式輔助程式接縫；`plugin-sdk/github-copilot-token` 目前匯出 `DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 註冊 API

`register(api)` 回呼函式會接收一個包含這些方法的 `OpenClawPluginApi` 物件：

### 功能註冊

| 方法                                             | 註冊內容              |
| ------------------------------------------------ | --------------------- |
| `api.registerProvider(...)`                      | 文字推斷 (LLM)        |
| `api.registerAgentHarness(...)`                  | 實驗性低階代理執行器  |
| `api.registerCliBackend(...)`                    | 本機 CLI 推論後端     |
| `api.registerChannel(...)`                       | 訊息頻道              |
| `api.registerSpeechProvider(...)`                | 文字轉語音 / STT 合成 |
| `api.registerRealtimeTranscriptionProvider(...)` | 串流即時轉錄          |
| `api.registerRealtimeVoiceProvider(...)`         | 雙向即時語音會話      |
| `api.registerMediaUnderstandingProvider(...)`    | 影像/音訊/影片分析    |
| `api.registerImageGenerationProvider(...)`       | 影像生成              |
| `api.registerMusicGenerationProvider(...)`       | 音樂生成              |
| `api.registerVideoGenerationProvider(...)`       | 影片生成              |
| `api.registerWebFetchProvider(...)`              | 網路擷取 / 爬取提供者 |
| `api.registerWebSearchProvider(...)`             | 網路搜尋              |

### 工具與指令

| 方法                            | 註冊內容                               |
| ------------------------------- | -------------------------------------- |
| `api.registerTool(tool, opts?)` | 代理工具 (必要或 `{ optional: true }`) |
| `api.registerCommand(def)`      | 自訂指令 (略過 LLM)                    |

### 基礎架構

| 方法                                           | 註冊內容                    |
| ---------------------------------------------- | --------------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件攔截                    |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端點           |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法            |
| `api.registerCli(registrar, opts?)`            | CLI 子指令                  |
| `api.registerService(service)`                 | 背景服務                    |
| `api.registerInteractiveHandler(registration)` | 互動式處理器                |
| `api.registerMemoryPromptSupplement(builder)`  | 新增式記憶體相關提示區段    |
| `api.registerMemoryCorpusSupplement(adapter)`  | 新增式記憶體搜尋/讀取語料庫 |

保留的核心管理命名空間 (`config.*`、 `exec.approvals.*`、 `wizard.*`、
`update.*`) 即使外掛嘗試指派
更狹隘的 gateway 方法範圍，仍會保持 `operator.admin`。外掛擁有的方法建議優先使用外掛特定的前綴。

### CLI 註冊元資料

`api.registerCli(registrar, opts?)` 接受兩種頂層元資料：

- `commands`：註冊者擁有的明確指令根
- `descriptors`：用於根 CLI 說明、路由和延遲插件 CLI 註冊的解析時指令描述符

如果您希望插件指令在正常的根 CLI 路徑中保持延遲加載，請提供 `descriptors`，涵蓋該註冊器暴露的每個頂層指令根。

```typescript
api.registerCli(
  async ({ program }) => {
    const { registerMatrixCli } = await import("./src/cli.js");
    registerMatrixCli({ program });
  },
  {
    descriptors: [
      {
        name: "matrix",
        description: "Manage Matrix accounts, verification, devices, and profile state",
        hasSubcommands: true,
      },
    ],
  },
);
```

僅當您不需要延遲根 CLI 註冊時，才單獨使用 `commands`。該急切兼容性路徑仍然受支援，但它不會為解析時延遲加載安裝基於描述符的佔位符。

### CLI 後端註冊

`api.registerCliBackend(...)` 允許插件擁有本地 AI CLI 後端（例如 `codex-cli`）的預設配置。

- 後端 `id` 會成為模型參照（如 `codex-cli/gpt-5`）中的提供者前綴。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的形狀。
- 使用者配置仍然優先。OpenClaw 會在執行 CLI 之前，將 `agents.defaults.cliBackends.<id>` 合併到插件預設配置之上。
- 當後端在合併後需要兼容性重寫（例如正規化舊的旗標形狀）時，請使用 `normalizeConfig`。

### 專有插槽

| 方法                                       | 註冊內容                                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次啟用一個）。`assemble()` 回調接收 `availableTools` 和 `citationsMode`，以便引擎可以自定義提示詞添加。 |
| `api.registerMemoryCapability(capability)` | 統一記憶功能                                                                                                          |
| `api.registerMemoryPromptSection(builder)` | 記憶提示區段構建器                                                                                                    |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶清除計畫解析器                                                                                                    |
| `api.registerMemoryRuntime(runtime)`       | 記憶運行時適配器                                                                                                      |

### 記憶嵌入適配器

| 方法                                           | 註冊內容                     |
| ---------------------------------------------- | ---------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 用於活動插件的記憶嵌入適配器 |

- `registerMemoryCapability` 是首選的專有記憶插件 API。
- `registerMemoryCapability` 也可以暴露 `publicArtifacts.listArtifacts(...)`，以便伴隨插件可以通過 `openclaw/plugin-sdk/memory-host-core` 消費導出的記憶工件，而不是直接訪問特定記憶插件的私有佈局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是舊版相容的專屬記憶體外掛 API。
- `registerMemoryEmbeddingProvider` 讓現用的記憶體外掛註冊一個或多個嵌入配接器 ID（例如 `openai`、`gemini` 或自訂外掛定義的 ID）。
- 使用者設定（例如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）會根據這些已註冊的配接器 ID 進行解析。

### 事件與生命週期

| 方法                                         | 功能說明            |
| -------------------------------------------- | ------------------- |
| `api.on(hookName, handler, opts?)`           | 具型別生命週期 Hook |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼        |

### Hook 決策語意

- `before_tool_call`：返回 `{ block: true }` 即為終止。一旦任何處理程式設定了該值，將會跳過較低優先順序的處理程式。
- `before_tool_call`：返回 `{ block: false }` 視為未作決策（等同於省略 `block`），而非覆寫。
- `before_install`：返回 `{ block: true }` 即為終止。一旦任何處理程式設定了該值，將會跳過較低優先順序的處理程式。
- `before_install`：返回 `{ block: false }` 視為未作決策（等同於省略 `block`），而非覆寫。
- `reply_dispatch`：返回 `{ handled: true, ... }` 即為終止。一旦任何處理程式宣告了分派，將會跳過較低優先順序的處理程式和預設模型分派路徑。
- `message_sending`：返回 `{ cancel: true }` 即為終止。一旦任何處理程式設定了該值，將會跳過較低優先順序的處理程式。
- `message_sending`：返回 `{ cancel: false }` 視為未作決策（等同於省略 `cancel`），而非覆寫。

### API 物件欄位

| 欄位                     | 型別                      | 描述                                                                |
| ------------------------ | ------------------------- | ------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 外掛 ID                                                             |
| `api.name`               | `string`                  | 顯示名稱                                                            |
| `api.version`            | `string?`                 | 外掛版本（選用）                                                    |
| `api.description`        | `string?`                 | Plugin 描述（可選）                                                 |
| `api.source`             | `string`                  | Plugin 來源路徑                                                     |
| `api.rootDir`            | `string?`                 | Plugin 根目錄（可選）                                               |
| `api.config`             | `OpenClawConfig`          | 當前配置快照（可用時為活躍的記憶體運行時快照）                      |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的 Plugin 特定配置               |
| `api.runtime`            | `PluginRuntime`           | [運行時輔助函數](/en/plugins/sdk-runtime)                           |
| `api.logger`             | `PluginLogger`            | 作用域日誌記錄器（`debug`、`info`、`warn`、`error`）                |
| `api.registrationMode`   | `PluginRegistrationMode`  | 當前加載模式；`"setup-runtime"` 是完整條目啟動/設定之前的輕量級視窗 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於 Plugin 根目錄的路徑                                      |

## 內部模組慣例

在你的 Plugin 內部，使用本地 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  永遠不要在生產程式碼中透過 `openclaw/plugin-sdk/<your-plugin>` 匯入你自己的
  Plugin。請透過 `./api.ts` 或
  `./runtime-api.ts` 路由內部匯入。SDK 路徑僅用於外部合約。
</Warning>

Facade 加載的捆綁 Plugin 公開介面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 和類似的公開進入檔案）現在在 OpenClaw 運行時
偏好使用活躍的運行時配置快照。如果尚未存在運行時快照，則回退到磁碟上的解析配置檔案。

當輔助函式是專門針對特定提供者，且尚不屬於通用 SDK 子路徑時，Provider 插件也可以暴露一個狹窄的插件本地合約匯入檔。當前內建的範例：Anthropic 提供者將其 Claude 串流輔助函式保留在其自己的公開 `api.ts` / `contract-api.ts` 縫隙中，而不是將 Anthropic beta-header 和 `service_tier` 邏輯推廣到通用的 `plugin-sdk/*` 合約中。

其他當前內建的範例：

- `@openclaw/openai-provider`：`api.ts` 匯出 provider builders、default-model 輔助函式以及 realtime provider builders
- `@openclaw/openrouter-provider`：`api.ts` 匯出 provider builder 以及 onboarding/config 輔助函式

<Warning>
  擴充功能的生產環境程式碼也應避免 `openclaw/plugin-sdk/<other-plugin>` 匯入。如果輔助函式確實是共用的，請將其推廣到中立的 SDK 子路徑，例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他以功能為導向的介面，而不是將兩個插件耦合在一起。
</Warning>

## 相關

- [Entry Points](/en/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry` 選項
- [Runtime Helpers](/en/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空間參考
- [Setup and Config](/en/plugins/sdk-setup) — 打包、清單、配置架構
- [Testing](/en/plugins/sdk-testing) — 測試工具程式與 lint 規則
- [SDK Migration](/en/plugins/sdk-migration) — 從已棄用的介面遷移
- [Plugin Internals](/en/plugins/architecture) — 深度架構與功能模型
