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

<Tip>**正在尋找操作指南？** - 第一個外掛程式？從[開始使用](/en/plugins/building-plugins)開始 - 頻道外掛程式？請參閱[頻道外掛程式](/en/plugins/sdk-channel-plugins) - 提供者外掛程式？請參閱[提供者外掛程式](/en/plugins/sdk-provider-plugins)</Tip>

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
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | 經選錄的本機/自託管提供者設定輔助工具 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自託管提供者設定輔助工具 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 看門狗常數 | | `plugin-sdk/provider-auth-runtime` | 提供者外掛的執行時期 API
  金鑰解析輔助工具 | | `plugin-sdk/provider-auth-api-key` | API 金鑰上線/設定檔寫入輔助工具，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 標準 OAuth 驗證結果建構器 | | `plugin-sdk/provider-auth-login` | 提供者外掛的共用互動式登入輔助工具 | | `plugin-sdk/provider-env-vars` | 提供者驗證環境變數查找輔助工具 | | `plugin-sdk/provider-auth` |
  `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重試原則建構器、提供者端點輔助工具，以及模型 ID 正規化輔助工具，例如 `normalizeNativeXaiModelId` | |
  `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 一般提供者 HTTP/端點功能輔助工具 | | `plugin-sdk/provider-web-fetch-contract` | 精簡的網頁擷取設定/選取合約輔助工具，例如 `enablePluginInConfig` 和 `WebFetchProviderPlugin` | |
  `plugin-sdk/provider-web-fetch` | 網頁擷取提供者註冊/快取輔助工具 | | `plugin-sdk/provider-web-search-contract` | 精簡的網頁搜尋設定/憑證合約輔助工具，例如 `enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及範圍憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | 網頁搜尋提供者註冊/快取/執行時期輔助工具 | | `plugin-sdk/provider-tools` |
  `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 結構描述清理 + 診斷，以及 xAI 相容輔助工具，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及類似工具 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝器類型，以及共用的
  Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝器輔助工具 | | `plugin-sdk/provider-onboard` | 上線設定檔修補輔助工具 | | `plugin-sdk/global-singleton` | 程序本機單例/對應/快取輔助工具 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`、指令登錄區輔助函式、發送者授權輔助函式 | | `plugin-sdk/approval-auth-runtime` | Approver 解析與相同聊天動作授權輔助函式 | | `plugin-sdk/approval-client-runtime` | 原生執行核准設定檔/篩選器輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 原生核准功能/傳遞介面卡 | |
  `plugin-sdk/approval-gateway-runtime` | 共用核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 針對熱通道進入點的輕量級原生核准介面卡載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 更廣泛的核准處理器執行時輔助函式；當足夠時，偏好使用較窄的介面卡/閘道縫隙 | | `plugin-sdk/approval-native-runtime` | 原生核准目標 + 帳號綁定輔助函式 | |
  `plugin-sdk/approval-reply-runtime` | 執行/外掛程式核准回覆承載輔助函式 | | `plugin-sdk/command-auth-native` | 原生指令授權 + 原生工作階段目標輔助函式 | | `plugin-sdk/command-detection` | 共用指令偵測輔助函式 | | `plugin-sdk/command-surface` | 指令主體正規化與指令介面輔助函式 | | `plugin-sdk/allow-from` | `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` |
  針對通道/外掛程式秘密介面的狹義秘密合約集合輔助函式 | | `plugin-sdk/secret-ref-runtime` | 針對秘密合約/設定解析的狹義 `coerceSecretRef` 和 SecretRef 型別輔助函式 | | `plugin-sdk/security-runtime` | 共用信任、DM 閘道、外部內容和秘密集合輔助函式 | | `plugin-sdk/ssrf-policy` | 主機允許清單和私人網路 SSRF 原則輔助函式 | | `plugin-sdk/ssrf-runtime` | 固定調度器、SSRF 防護擷取和 SSRF 原則輔助函式 | |
  `plugin-sdk/secret-input` | 秘密輸入解析輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助函式 | | `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助函式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/runtime` | Broad runtime/logging/backup/plugin-install helpers | | `plugin-sdk/runtime-env` | Narrow runtime env, logger, timeout, retry, and backoff helpers | | `plugin-sdk/channel-runtime-context` | Generic channel runtime-context registration and lookup helpers | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | |
  `plugin-sdk/plugin-runtime` | Shared plugin command/hook/http/interactive helpers | | `plugin-sdk/hook-runtime` | Shared webhook/internal hook pipeline helpers | | `plugin-sdk/lazy-runtime` | Lazy runtime import/binding helpers such as `createLazyRuntimeModule`, `createLazyRuntimeMethod`, and `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | Process exec helpers | |
  `plugin-sdk/cli-runtime` | CLI formatting, wait, and version helpers | | `plugin-sdk/gateway-runtime` | Gateway client and channel-status patch helpers | | `plugin-sdk/config-runtime` | Config load/write helpers | | `plugin-sdk/telegram-command-config` | Telegram command-name/description normalization and duplicate/conflict checks, even when the bundled Telegram contract surface is unavailable |
  | `plugin-sdk/approval-runtime` | Exec/plugin approval helpers, approval-capability builders, auth/profile helpers, native routing/runtime helpers | | `plugin-sdk/reply-runtime` | Shared inbound/reply runtime helpers, chunking, dispatch, heartbeat, reply planner | | `plugin-sdk/reply-dispatch-runtime` | Narrow reply dispatch/finalize helpers | | `plugin-sdk/reply-history` | Shared short-window
  reply-history helpers such as `buildHistoryContext`, `recordPendingHistoryEntry`, and `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | Narrow text/markdown chunking helpers | | `plugin-sdk/session-store-runtime` | Session store path + updated-at helpers | | `plugin-sdk/state-paths` | State/OAuth dir path helpers | |
  `plugin-sdk/routing` | Route/session-key/account binding helpers such as `resolveAgentRoute`, `buildAgentSessionKey`, and `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | Shared channel/account status summary helpers, runtime-state defaults, and issue metadata helpers | | `plugin-sdk/target-resolver-runtime` | Shared target resolver helpers | |
  `plugin-sdk/string-normalization-runtime` | Slug/string normalization helpers | | `plugin-sdk/request-url` | Extract string URLs from fetch/request-like inputs | | `plugin-sdk/run-command` | Timed command runner with normalized stdout/stderr results | | `plugin-sdk/param-readers` | Common tool/CLI param readers | | `plugin-sdk/tool-send` | Extract canonical send target fields from tool args | |
  `plugin-sdk/temp-path` | Shared temp-download path helpers | | `plugin-sdk/logging-core` | Subsystem logger and redaction helpers | | `plugin-sdk/markdown-table-runtime` | Markdown table mode helpers | | `plugin-sdk/json-store` | Small JSON state read/write helpers | | `plugin-sdk/file-lock` | Re-entrant file-lock helpers | | `plugin-sdk/persistent-dedupe` | Disk-backed dedupe cache helpers | |
  `plugin-sdk/acp-runtime` | ACP runtime/session and reply-dispatch helpers | | `plugin-sdk/agent-config-primitives` | Narrow agent runtime config-schema primitives | | `plugin-sdk/boolean-param` | Loose boolean param reader | | `plugin-sdk/dangerous-name-runtime` | Dangerous-name matching resolution helpers | | `plugin-sdk/device-bootstrap` | Device bootstrap and pairing token helpers | |
  `plugin-sdk/extension-shared` | Shared passive-channel, status, and ambient proxy helper primitives | | `plugin-sdk/models-provider-runtime` | `/models` command/provider reply helpers | | `plugin-sdk/skill-commands-runtime` | Skill command listing helpers | | `plugin-sdk/native-command-registry` | Native command registry/build/serialize helpers | | `plugin-sdk/provider-zai-endpoint` | Z.AI
  endpoint detection helpers | | `plugin-sdk/infra-runtime` | System event/heartbeat helpers | | `plugin-sdk/collection-runtime` | Small bounded cache helpers | | `plugin-sdk/diagnostic-runtime` | Diagnostic flag and event helpers | | `plugin-sdk/error-runtime` | Error graph, formatting, shared error classification helpers, `isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | Wrapped fetch,
  proxy, and pinned lookup helpers | | `plugin-sdk/host-runtime` | Hostname and SCP host normalization helpers | | `plugin-sdk/retry-runtime` | Retry config and retry runner helpers | | `plugin-sdk/agent-runtime` | Agent dir/identity/workspace helpers | | `plugin-sdk/directory-runtime` | Config-backed directory query/dedup | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | 共享媒體獲取/轉換/儲存輔助函式以及媒體負載建構器 | | `plugin-sdk/media-generation-runtime` | 共享媒體生成容錯移轉輔助函式、候選選擇以及缺少模型訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型以及供提供者使用的影像/音訊輔助匯出 | | `plugin-sdk/text-runtime` |
  共享文字/Markdown/記錄輔助函式，例如助理可見文字剝離、Markdown 呈現/分塊/表格輔助函式、編輯輔助函式、指令標籤輔助函式和安全文字工具 | | `plugin-sdk/text-chunking` | 外寄文字分塊輔助函式 | | `plugin-sdk/speech` | 語音提供者類型以及供提供者使用的指令、註冊和驗證輔助函式 | | `plugin-sdk/speech-core` | 共享語音提供者類型、註冊、指令和正規化輔助函式 | | `plugin-sdk/realtime-transcription` |
  即時轉錄提供者類型和註冊輔助函式 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型和註冊輔助函式 | | `plugin-sdk/image-generation` | 影像生成提供者類型 | | `plugin-sdk/image-generation-core` | 共享影像生成類型、容錯移轉、驗證和註冊輔助函式 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` |
  共享音樂生成類型、容錯移轉輔助函式、提供者查詢和模型參照解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共享影片生成類型、容錯移轉輔助函式、提供者查詢和模型參照解析 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊和路由安裝輔助函式 | | `plugin-sdk/webhook-path` | Webhook 路徑正規化輔助函式 | | `plugin-sdk/web-media` |
  共享遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | 供外掛 SDK 使用者使用的重新匯出 `zod` | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`、`shouldAckReaction` |
</Accordion>

<Accordion title="Memory 子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於管理員/設定/檔案/CLI 協助程式的打包 memory-core 協助程式介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時期外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入引擎匯出 | |
  `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機機密協助程式 | | `plugin-sdk/memory-core-host-events` |
  記憶體主機事件日誌協助程式 | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態協助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時期協助程式 | | `plugin-sdk/memory-host-core` |
  記憶體主機核心執行時期協助程式的廠商中立交換名稱 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌協助程式的廠商中立交換名稱 | | `plugin-sdk/memory-host-files` | 記憶體主機檔案/執行時期協助程式的廠商中立交換名稱 | | `plugin-sdk/memory-host-markdown` | 用於記憶體相關外掛的共享 managed-markdown 協助程式 | | `plugin-sdk/memory-host-search` | 用於搜尋管理員存取的現用記憶體執行時期外觀 | |
  `plugin-sdk/memory-host-status` | 記憶體主機狀態協助程式的廠商中立交換名稱 | | `plugin-sdk/memory-lancedb` | 打包的 memory-lancedb 協助程式介面 |
</Accordion>

  <Accordion title="保留的捆绑輔助子路徑">
    | 系列 | 目前的子路徑 | 預期用途 |
    | --- | --- | --- |
    | 瀏覽器 | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | 捆綁的瀏覽器外掛支援輔助程式 (`browser-support` 保持為相容性桶) |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | 捆綁的 Matrix 輔助/執行時層面 |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | 捆綁的 LINE 輔助/執行時層面 |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | 捆綁的 IRC 輔助層面 |
    | 特定頻道輔助程式 | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | 捆綁的頻道相容性/輔助縫合層 |
    | 驗證/外掛特定輔助程式 | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | 捆綁的功能/外掛輔助縫合層；`plugin-sdk/github-copilot-token` 目前匯出 `DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 註冊 API

`register(api)` 回呼會收到一個包含這些方法的 `OpenClawPluginApi` 物件：

### 功能註冊

| 方法                                             | 註冊內容              |
| ------------------------------------------------ | --------------------- |
| `api.registerProvider(...)`                      | 文字推斷 (LLM)        |
| `api.registerCliBackend(...)`                    | 本機 CLI 推理後端     |
| `api.registerChannel(...)`                       | 訊息頻道              |
| `api.registerSpeechProvider(...)`                | 文字轉語音 / STT 合成 |
| `api.registerRealtimeTranscriptionProvider(...)` | 串流即時轉錄          |
| `api.registerRealtimeVoiceProvider(...)`         | 雙工即時語音工作階段  |
| `api.registerMediaUnderstandingProvider(...)`    | 影像/音訊/視訊分析    |
| `api.registerImageGenerationProvider(...)`       | 影像生成              |
| `api.registerMusicGenerationProvider(...)`       | 音樂生成              |
| `api.registerVideoGenerationProvider(...)`       | 視訊生成              |
| `api.registerWebFetchProvider(...)`              | Web 擷取 / 爬取提供者 |
| `api.registerWebSearchProvider(...)`             | Web 搜尋              |

### 工具與指令

| 方法                            | 註冊內容                                 |
| ------------------------------- | ---------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具 (必填或 `{ optional: true }`) |
| `api.registerCommand(def)`      | 自訂指令 (繞過 LLM)                      |

### 基礎架構

| 方法                                           | 註冊內容                |
| ---------------------------------------------- | ----------------------- |
| `api.registerHook(events, handler, opts?)`     | 事件鉤子                |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端點       |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法        |
| `api.registerCli(registrar, opts?)`            | CLI 子指令              |
| `api.registerService(service)`                 | 背景服務                |
| `api.registerInteractiveHandler(registration)` | 互動式處理程序          |
| `api.registerMemoryPromptSupplement(builder)`  | 新增記憶相關提示區段    |
| `api.registerMemoryCorpusSupplement(adapter)`  | 新增記憶搜尋/讀取語料庫 |

保留的核心管理命名空間 (`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`) 即使外掛嘗試指定較狹隘的 gateway 方法範圍，仍會保持 `operator.admin`。建議為外掛擁有的方法使用外掛專屬前綴。

### CLI 註冊中繼資料

`api.registerCli(registrar, opts?)` 接受兩種頂層中繼資料：

- `commands`：由註冊者擁有的明確指令根目錄
- `descriptors`：用於根 CLI 說明、路由和延遲外掛 CLI 註冊的剖析時間指令描述器

如果您希望外掛程式指令在一般的根 CLI 路徑中保持延遲載入，請提供 `descriptors` 以涵蓋該註冊器公開的每個頂層指令根。

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

僅在您不需要延遲根 CLI 註冊時，才單獨使用 `commands`。詶急切相容性路徑仍受支援，但它不會安裝描述符支援的預留位置以用於解析時的延遲載入。

### CLI 後端註冊

`api.registerCliBackend(...)` 讓外掛程式擁有本機 AI CLI 後端（例如 `codex-cli`）的預設設定。

- 後端 `id` 會成為模型參照（例如 `codex-cli/gpt-5`）中的提供者前綴。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的結構。
- 使用者設定仍具有優先權。OpenClaw 會在執行 CLI 之前，將 `agents.defaults.cliBackends.<id>` 合併到外掛程式預設值之上。
- 當後端在合併後需要相容性重寫（例如正規化舊的旗標結構）時，請使用 `normalizeConfig`。

### 獨佔插槽

| 方法                                       | 註冊內容                 |
| ------------------------------------------ | ------------------------ |
| `api.registerContextEngine(id, factory)`   | 語境引擎（一次啟用一個） |
| `api.registerMemoryCapability(capability)` | 統一記憶體能力           |
| `api.registerMemoryPromptSection(builder)` | 記憶體提示區塊建構器     |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶體清除計畫解析器     |
| `api.registerMemoryRuntime(runtime)`       | 記憶體執行時適配器       |

### 記憶體嵌入適配器

| 方法                                           | 註冊內容                         |
| ---------------------------------------------- | -------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 作用中外掛程式的記憶體嵌入適配器 |

- `registerMemoryCapability` 是首選的獨佔記憶體外掛 API。
- `registerMemoryCapability` 也可以公開 `publicArtifacts.listArtifacts(...)`，以便伴隨外掛程式可以透過 `openclaw/plugin-sdk/memory-host-core` 取用匯出的記憶體成品，而不必深入特定記憶體外掛程式的私有佈局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和 `registerMemoryRuntime` 是舊版相容的獨佔記憶體外掛 API。
- `registerMemoryEmbeddingProvider` 讓啟用的記憶體外掛程式註冊一個
  或多個嵌入適配器 ID（例如 `openai`、`gemini`，或自訂
  外掛程式定義的 ID）。
- 使用者設定（例如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）會根據這些已註冊的
  適配器 ID 進行解析。

### 事件與生命週期

| 方法                                         | 作用               |
| -------------------------------------------- | ------------------ |
| `api.on(hookName, handler, opts?)`           | 類型化生命週期掛鉤 |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼       |

### 掛鉤決策語意

- `before_tool_call`：傳回 `{ block: true }` 即為終止。一旦任何處理程序設定了此值，將跳過優先順序較低的處理程序。
- `before_tool_call`：傳回 `{ block: false }` 被視為未作決定（與省略 `block` 相同），而非覆寫。
- `before_install`：傳回 `{ block: true }` 即為終止。一旦任何處理程序設定了此值，將跳過優先順序較低的處理程序。
- `before_install`：傳回 `{ block: false }` 被視為未作決定（與省略 `block` 相同），而非覆寫。
- `reply_dispatch`：傳回 `{ handled: true, ... }` 即為終止。一旦任何處理程序宣告了分派，將跳過優先順序較低的處理程序和預設模型分派路徑。
- `message_sending`：傳回 `{ cancel: true }` 即為終止。一旦任何處理程序設定了此值，將跳過優先順序較低的處理程序。
- `message_sending`：傳回 `{ cancel: false }` 被視為未作決定（與省略 `cancel` 相同），而非覆寫。

### API 物件欄位

| 欄位                     | 類型                      | 描述                                                              |
| ------------------------ | ------------------------- | ----------------------------------------------------------------- |
| `api.id`                 | `string`                  | 外掛程式 ID                                                       |
| `api.name`               | `string`                  | 顯示名稱                                                          |
| `api.version`            | `string?`                 | 外掛程式版本（選用）                                              |
| `api.description`        | `string?`                 | 外掛程式描述（選用）                                              |
| `api.source`             | `string`                  | Plugin 來源路徑                                                   |
| `api.rootDir`            | `string?`                 | Plugin 根目錄（選用）                                             |
| `api.config`             | `OpenClawConfig`          | 目前配置快照（可用時為活躍的記憶體內執行時快照）                  |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的 Plugin 專用配置             |
| `api.runtime`            | `PluginRuntime`           | [執行時輔助程式](/en/plugins/sdk-runtime)                         |
| `api.logger`             | `PluginLogger`            | 作用域日誌記錄器（`debug`、`info`、`warn`、`error`）              |
| `api.registrationMode`   | `PluginRegistrationMode`  | 目前載入模式；`"setup-runtime"` 是輕量級的完整進入啟動/設定前視窗 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於 Plugin 根目錄的路徑                                    |

## 內部模組慣例

在您的 Plugin 內部，請使用本地 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  決不要在生產環境程式碼中透過 `openclaw/plugin-sdk/<your-plugin>`
  匯入您自己的 Plugin。請透過 `./api.ts` 或
  `./runtime-api.ts` 路由內部匯入。SDK 路徑僅用於外部合約。
</Warning>

外觀載入的打包 Plugin 公開表面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 和類似的公開進入檔案）現在會在 OpenClaw 正在執行時優先使用
活躍的執行時配置快照。如果尚未存在執行時快照，它們將回退到磁碟上的已解析配置檔案。

當輔助函式專屬於特定提供者，且尚不屬於通用 SDK 子路徑時，提供者外掛程式也可以公開一個狹隘的僅限外掛程式本地的合約桶。目前內建的範例：Anthropic 提供者將其 Claude 串流輔助函式保留在其自己的公開 `api.ts` / `contract-api.ts` 縫隙中，而不是將 Anthropic beta-header 和 `service_tier` 邏輯推廣到通用的 `plugin-sdk/*` 合約中。

其他目前內建的範例：

- `@openclaw/openai-provider`：`api.ts` 匯出提供者建構器、
  預設模型輔助函式以及即時提供者建構器
- `@openclaw/openrouter-provider`：`api.ts` 匯出提供者建構器以及
  入門/設定輔助函式

<Warning>
  擴充功能的生產環境程式碼也應避免 `openclaw/plugin-sdk/<other-plugin>`
  匯入。如果輔助函式確實是共用的，請將其提升至中立的 SDK 子路徑，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  以功能為導向的介面，而不是將兩個外掛程式耦合在一起。
</Warning>

## 相關

- [進入點](/en/plugins/sdk-entrypoints) — `definePluginEntry` 和 `defineChannelPluginEntry` 選項
- [執行時期輔助函式](/en/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空間參考
- [設定與組態](/en/plugins/sdk-setup) — 打包、清單、設定結構描述
- [測試](/en/plugins/sdk-testing) — 測試工具與 Lint 規則
- [SDK 遷移](/en/plugins/sdk-migration) — 從已淘汰的介面遷移
- [外掛程式內部](/en/plugins/architecture) — 深度架構與功能模型
