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

<Tip>**正在尋找操作指南？** - 第一個外掛程式？從 [快速入門](/zh-Hant/plugins/building-plugins) 開始 - 頻道外掛程式？參閱 [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) - 提供者外掛程式？參閱 [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins)</Tip>

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
  <Accordion title="通道子路徑">
    | 子路徑 | 主要導出 |
    | --- | --- |
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根 `openclaw.json` Zod schema 導出 (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`, 以及 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共用的設定精靈輔助函式、允許清單提示、設定狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號設定/動作閘道輔助函式、預設帳號後備輔助函式 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`, 帳號 ID 正規化輔助函式 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後備輔助函式 |
    | `plugin-sdk/account-helpers` | 狹義帳號清單/帳號動作輔助函式 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 通道設定 Schema 型別 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助函式，含打包合約後備機制 |
    | `plugin-sdk/command-gating` | 狹義指令授權閘道輔助函式 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink`, 草稿串流生命週期/完成輔助函式 |
    | `plugin-sdk/inbound-envelope` | 共用入站路由 + 信封建構器輔助函式 |
    | `plugin-sdk/inbound-reply-dispatch` | 共用入站記錄與分派輔助函式 |
    | `plugin-sdk/messaging-targets` | 目標解析/匹配輔助函式 |
    | `plugin-sdk/outbound-media` | 共用出站媒體載入輔助函式 |
    | `plugin-sdk/outbound-runtime` | 出站身分、傳送委派與 Payload 規劃輔助函式 |
    | `plugin-sdk/poll-runtime` | 狹義投票正規化輔助函式 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結生命週期與介接器輔助函式 |
    | `plugin-sdk/agent-media-payload` | 舊版 Agent 媒體 Payload 建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒繫結、配對與已設定繫結輔助函式 |
    | `plugin-sdk/runtime-config-snapshot` | 執行時設定快照輔助函式 |
    | `plugin-sdk/runtime-group-policy` | 執行時群組原則解析輔助函式 |
    | `plugin-sdk/channel-status` | 共用通道狀態快照/摘要輔助函式 |
    | `plugin-sdk/channel-config-primitives` | 狹義通道設定 Schema 基元 |
    | `plugin-sdk/channel-config-writes` | 通道設定寫入授權輔助函式 |
    | `plugin-sdk/channel-plugin-common` | 共用通道外掛前導導出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單設定編輯/讀取輔助函式 |
    | `plugin-sdk/group-access` | 共用群組存取決策輔助函式 |
    | `plugin-sdk/direct-dm` | 共用直接 DM 認證/防護輔助函式 |
    | `plugin-sdk/interactive-runtime` | 語意訊息呈現、傳遞與舊版互動回覆輔助函式。請參閱 [訊息呈現](/zh-Hant/plugins/message-presentation) |
    | `plugin-sdk/channel-inbound` | 入站防抖動、提及匹配、提及原則輔助函式與信封輔助函式的相容性集合 |
    | `plugin-sdk/channel-mention-gating` | 狹義提及原則輔助函式，不包含廣義的入站執行時介面 |
    | `plugin-sdk/channel-location` | 通道位置內容與格式化輔助函式 |
    | `plugin-sdk/channel-logging` | 通道紀錄輔助函式，用於入站丟棄與輸入/確認失敗 |
    | `plugin-sdk/channel-send-result` | 回覆結果型別 |
    | `plugin-sdk/channel-actions` | 通道訊息動作輔助函式，加上為外掛相容性而保留的已棄用原生 Schema 輔助函式 |
    | `plugin-sdk/channel-targets` | 目標解析/匹配輔助函式 |
    | `plugin-sdk/channel-contract` | 通道合約型別 |
    | `plugin-sdk/channel-feedback` | 回饋/反應接線 |
    | `plugin-sdk/channel-secret-runtime` | 狹義秘密合約輔助函式，例如 `collectSimpleChannelFieldAssignments`, `getChannelSurface`, `pushAssignment` 與秘密目標型別 |
  </Accordion>

<Accordion title="Provider 子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | 精選的本地/自託管 Provider 設定輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 專注於 OpenAI 相容的自託管 Provider 設定輔助函式 | | `plugin-sdk/cli-backend` | CLI 後端預設值 + 看門狗常數 | | `plugin-sdk/provider-auth-runtime` | Provider 外掛的執行時 API
  金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` | API 金鑰上架/設定檔寫入輔助函式，例如 `upsertApiKeyProfile` | | `plugin-sdk/provider-auth-result` | 標準 OAuth 認證結果建構器 | | `plugin-sdk/provider-auth-login` | Provider 外掛共用的互動式登入輔助函式 | | `plugin-sdk/provider-env-vars` | Provider 認證環境變數查詢輔助函式 | | `plugin-sdk/provider-auth` |
  `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile`、`upsertApiKeyProfile`、`writeOAuthCredentials` | | `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用的重試策略建構器、Provider 端點輔助函式，以及模型 ID 正規化輔助函式，例如 `normalizeNativeXaiModelId` | |
  `plugin-sdk/provider-catalog-shared` | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 Provider HTTP/端點功能輔助函式，包括音訊轉錄 multipart 表單輔助函式 | | `plugin-sdk/provider-web-fetch-contract` | 狹義的網頁擷取 設定/選擇合約輔助函式，例如 `enablePluginInConfig`
  和 `WebFetchProviderPlugin` | | `plugin-sdk/provider-web-fetch` | 網頁擷取 Provider 註冊/快取輔助函式 | | `plugin-sdk/provider-web-search-config-contract` | 狹義的網頁搜尋 設定/憑證輔助函式，適用於不需要外掛啟用接線的 Provider | | `plugin-sdk/provider-web-search-contract` | 狹義的網頁搜尋 設定/憑證合約輔助函式，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及範圍限定的憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | 網頁搜尋 Provider 註冊/快取/執行時輔助函式 | | `plugin-sdk/provider-tools` | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 結構清理 + 診斷，以及 xAI 相容輔助函式，例如
  `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及類似功能 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝器類型，以及共用的 Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝器輔助函式 | |
  `plugin-sdk/provider-transport-runtime` | 原生 Provider 傳輸輔助函式，例如受保護的 fetch、傳輸訊息轉換，以及可寫入的傳輸事件串流 | | `plugin-sdk/provider-onboard` | 上架設定修補輔助函式 | | `plugin-sdk/global-singleton` | 程序本地的單例/映射/快取輔助函式 |
</Accordion>

<Accordion title="Auth and security subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`，指令註冊器輔助函式，傳送者授權輔助函式 | | `plugin-sdk/command-status` | 指令/說明訊息建構器，例如 `buildCommandsMessagePaginated` 和 `buildHelpMessage` | | `plugin-sdk/approval-auth-runtime` | 核准者解析與同聊天室動作授權輔助函式 | | `plugin-sdk/approval-client-runtime` |
  原生執行核准設定檔/篩選器輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 原生核准功能/傳遞配接器 | | `plugin-sdk/approval-gateway-runtime` | 共用核准閘道解析輔助函式 | | `plugin-sdk/approval-handler-adapter-runtime` | 用於熱通道進入點的輕量級原生核准配接器載入輔助函式 | | `plugin-sdk/approval-handler-runtime` | 較廣泛的核准處理器執行時輔助函式；當足以應付時，優先使用較狹窄的配接器/閘道接縫
  | | `plugin-sdk/approval-native-runtime` | 原生核准目標 + 帳號綁定輔助函式 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛核准回應承載輔助函式 | | `plugin-sdk/command-auth-native` | 原生指令授權 + 原生工作階段目標輔助函式 | | `plugin-sdk/command-detection` | 共用指令偵測輔助函式 | | `plugin-sdk/command-surface` | 指令主體正規化和指令介面輔助函式 | | `plugin-sdk/allow-from` |
  `formatAllowFromLowercase` | | `plugin-sdk/channel-secret-runtime` | 用於通道/外掛秘密介面的狹隘秘密合約收集輔助函式 | | `plugin-sdk/secret-ref-runtime` | 用於秘密合約/設定解析的狹隘 `coerceSecretRef` 和 SecretRef 型別輔助函式 | | `plugin-sdk/security-runtime` | 共用信任、DM 閘道、外部內容和秘密收集輔助函式 | | `plugin-sdk/ssrf-policy` | 主機允許清單和私人網路 SSRF 原則輔助函式 | |
  `plugin-sdk/ssrf-dispatcher` | 不包含廣泛基礎設施執行時介面的狹隘釘選調度器輔助函式 | | `plugin-sdk/ssrf-runtime` | 釘選調度器、SSRF 防護擷取和 SSRF 原則輔助函式 | | `plugin-sdk/secret-input` | 秘密輸入解析輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 請求/目標輔助函式 | | `plugin-sdk/webhook-request-guards` | 請求主體大小/逾時輔助函式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | Subpath | 主要匯出 | | --- | --- | | `plugin-sdk/runtime` | 廣泛的執行時/日誌/備份/外掛安裝輔助函式 | | `plugin-sdk/runtime-env` | 狹義執行時環境、記錄器、逾時、重試和退避輔助函式 | | `plugin-sdk/channel-runtime-context` | 通用通道執行時上下文註冊和查找輔助函式 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共享外掛指令/hook/HTTP/互動輔助函式 | |
  `plugin-sdk/hook-runtime` | 共享 webhook/內部 pipeline 輔助函式 | | `plugin-sdk/lazy-runtime` | 延遲執行時匯入/綁定輔助函式，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 處理程序執行輔助函式 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待和版本輔助函式 | | `plugin-sdk/gateway-runtime` | 閘道客戶端和通道狀態修補輔助函式
  | | `plugin-sdk/config-runtime` | 配置載入/寫入輔助函式和外掛配置查找輔助函式 | | `plugin-sdk/telegram-command-config` | Telegram 指令名稱/描述標準化和重複/衝突檢查，即使打包的 Telegram 合約介面不可用 | | `plugin-sdk/text-autolink-runtime` | 無需廣泛的 text-runtime barrel 的檔案參考自動連結檢測 | | `plugin-sdk/approval-runtime` |
  執行/外掛核准輔助函式、核准功能建構器、驗證/個人資料輔助函式、原生路由/執行時輔助函式 | | `plugin-sdk/reply-runtime` | 共享入站/回覆執行時輔助函式、分塊、分發、心跳、回覆計劃器 | | `plugin-sdk/reply-dispatch-runtime` | 狹義回覆分發/完成輔助函式 | | `plugin-sdk/reply-history` | 共享短視窗回覆歷史輔助函式，例如 `buildHistoryContext`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` |
  | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 狹義文字/Markdown 分塊輔助函式 | | `plugin-sdk/session-store-runtime` | Session 儲存路徑 + 更新時間輔助函式 | | `plugin-sdk/state-paths` | 狀態/OAuth 目錄路徑輔助函式 | | `plugin-sdk/routing` | 路由/session 鍵/帳戶綁定輔助函式，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和
  `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共享通道/帳戶狀態摘要輔助函式、執行時狀態預設值和問題元數據輔助函式 | | `plugin-sdk/target-resolver-runtime` | 共享目標解析器輔助函式 | | `plugin-sdk/string-normalization-runtime` | Slug/字串標準化輔助函式 | | `plugin-sdk/request-url` | 從 fetch/request 類似的輸入中提取字串 URL | | `plugin-sdk/run-command` |
  計時指令執行器，具有標準化的 stdout/stderr 結果 | | `plugin-sdk/param-readers` | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-payload` | 從工具結果物件中提取標準化負載 | | `plugin-sdk/tool-send` | 從工具參數中提取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 共共享臨時下載路徑輔助函式 | | `plugin-sdk/logging-core` | 子系統記錄器和編校輔助函式 | | `plugin-sdk/markdown-table-runtime` | Markdown
  表格模式輔助函式 | | `plugin-sdk/json-store` | 小型 JSON 狀態讀取/寫入輔助函式 | | `plugin-sdk/file-lock` | 可重入檔案鎖輔助函式 | | `plugin-sdk/persistent-dedupe` | 磁碟支援的去重快取輔助函式 | | `plugin-sdk/acp-runtime` | ACP 執行時/session 和回覆分發輔助函式 | | `plugin-sdk/acp-binding-resolve-runtime` | 唯讀 ACP 綁定解析，無需生命週期啟動匯入 | | `plugin-sdk/agent-config-primitives` | 狹義
  Agent 執行時配置架構基本型別 | | `plugin-sdk/boolean-param` | 寬鬆的布林參數讀取器 | | `plugin-sdk/dangerous-name-runtime` | 危險名稱匹配解析輔助函式 | | `plugin-sdk/device-bootstrap` | 裝置引導和配對 Token 輔助函式 | | `plugin-sdk/extension-shared` | 共享被動通道、狀態和環境代理輔助基本型別 | | `plugin-sdk/models-provider-runtime` | `/models` 指令/提供者回覆輔助函式 | |
  `plugin-sdk/skill-commands-runtime` | 技能指令列表輔助函式 | | `plugin-sdk/native-command-registry` | 原生指令登錄/建置/序列化輔助函式 | | `plugin-sdk/agent-harness` | 用於低階 Agent 組件的實驗性受信任外掛介面：組件類型、主動執行導向/中止輔助函式、OpenClaw 工具橋接輔助函式和嘗試結果公用程式 | | `plugin-sdk/provider-zai-endpoint` | Z.AI 端點檢測輔助函式 | | `plugin-sdk/infra-runtime` |
  系統事件/心跳輔助函式 | | `plugin-sdk/collection-runtime` | 小型有界快取輔助函式 | | `plugin-sdk/diagnostic-runtime` | 診斷標誌和事件輔助函式 | | `plugin-sdk/error-runtime` | 錯誤圖、格式化、共享錯誤分類輔助函式、`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包裝的 fetch、代理和釘選查找輔助函式 | | `plugin-sdk/runtime-fetch` | 具有分發器感知能力的執行時 fetch，無需代理/受防護 fetch
  匯入 | | `plugin-sdk/response-limit-runtime` | 有界回應主體讀取器，無需廣泛的媒體執行時介面 | | `plugin-sdk/session-binding-runtime` | 目前對話綁定狀態，無需配置的綁定路由或配對儲存 | | `plugin-sdk/session-store-runtime` | Session 儲存讀取輔助函式，無需廣泛的配置寫入/維護匯入 | | `plugin-sdk/context-visibility-runtime` | 上下文可見性解析和補充上下文過濾，無需廣泛的配置/安全性匯入 | |
  `plugin-sdk/string-coerce-runtime` | 狹義基本記錄/字串強制轉換和標準化輔助函式，無需 Markdown/日誌匯入 | | `plugin-sdk/host-runtime` | 主機名稱和 SCP 主機標準化輔助函式 | | `plugin-sdk/retry-runtime` | 重試配置和重試執行器輔助函式 | | `plugin-sdk/agent-runtime` | Agent 目錄/身分/工作區輔助函式 | | `plugin-sdk/directory-runtime` | 由配置支援的目錄查詢/去重 | | `plugin-sdk/keyed-async-queue` |
  `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | Subpath | Key exports | | --- | --- | | `plugin-sdk/media-runtime` | 共用媒體擷取/轉換/儲存輔助程式以及媒體 payload 建構器 | | `plugin-sdk/media-generation-runtime` | 共用媒體生成容錯移轉輔助程式、候選選擇以及缺少模型訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型以及面向提供者的圖片/音訊輔助匯出 | | `plugin-sdk/text-runtime` |
  共用文字/Markdown/日誌記錄輔助程式，例如助理可見文字剝離、Markdown 算繪/分塊/表格輔助程式、編校輔助程式、指令標籤輔助程式以及安全文字公用程式 | | `plugin-sdk/text-chunking` | 外寄文字分塊輔助程式 | | `plugin-sdk/speech` | 語音提供者類型以及面向提供者的指令、註冊表和驗證輔助程式 | | `plugin-sdk/speech-core` | 共用語音提供者類型、註冊表、指令和正規化輔助程式 | | `plugin-sdk/realtime-transcription`
  | 即時轉錄提供者類型、註冊表輔助程式和共用 WebSocket 會話輔助程式 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型和註冊表輔助程式 | | `plugin-sdk/image-generation` | 圖像生成提供者類型 | | `plugin-sdk/image-generation-core` | 共用圖像生成類型、容錯移轉、驗證和註冊表輔助程式 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` |
  共用音樂生成類型、容錯移轉輔助程式、提供者查詢和模型參照解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` | 共用影片生成類型、容錯移轉輔助程式、提供者查詢和模型參照解析 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表和路由安裝輔助程式 | | `plugin-sdk/webhook-path` | Webhook 路徑正規化輔助程式 | | `plugin-sdk/web-media` |
  共用遠端/本機媒體載入輔助程式 | | `plugin-sdk/zod` | 為外掛程式 SDK 消費者重新匯出的 `zod` | | `plugin-sdk/testing` | `installCommonResolveTargetErrorCases`, `shouldAckReaction` |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 針對管理員/設定/檔案/CLI 協助程式的配套記憶體核心協助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時期外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入合約、登錄存取、本機提供者，以及一般批次/遠端協助程式 |
  | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機機密協助程式 | | `plugin-sdk/memory-core-host-events` |
  記憶體主機事件日誌協助程式 | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態協助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時期協助程式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時期協助程式 | | `plugin-sdk/memory-host-core` |
  記憶體主機核心執行時期協助程式的廠商中立面別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌協助程式的廠商中立面別名 | | `plugin-sdk/memory-host-files` | 記憶體主機檔案/執行時期協助程式的廠商中立面別名 | | `plugin-sdk/memory-host-markdown` | 供記憶體相關外掛程式使用的共用管理 Markdown 協助程式 | | `plugin-sdk/memory-host-search` | 用於搜尋管理員存取的作用中記憶體執行時期外觀 | |
  `plugin-sdk/memory-host-status` | 記憶體主機狀態協助程式的廠商中立面別名 | | `plugin-sdk/memory-lancedb` | 配套的 memory-lancedb 協助介面 |
</Accordion>

  <Accordion title="保留的 bundled-helper 子路徑">
    | 系列 | 現有子路徑 | 預期用途 |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | 內建的瀏覽器插件支援輔助程式（`browser-support` 仍為相容性匯出桶） |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | 內建的 Matrix 輔助程式/執行時期介面 |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | 內建的 LINE 輔助程式/執行時期介面 |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | 內建的 IRC 輔助程式介面 |
    | Channel-specific helpers | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | 內建的頻道相容性/輔助程式縫合層 |
    | Auth/plugin-specific helpers | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | 內建的功能/插件輔助程式縫合層；`plugin-sdk/github-copilot-token` 目前匯出 `DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 註冊 API

`register(api)` 回呼函式會接收包含這些方法的 `OpenClawPluginApi` 物件：

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

| 方法                            | 註冊內容                                 |
| ------------------------------- | ---------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具 (必要或 `{ optional: true }`) |
| `api.registerCommand(def)`      | 自訂指令 (略過 LLM)                      |

### 基礎架構

| 方法                                            | 註冊內容                    |
| ----------------------------------------------- | --------------------------- |
| `api.registerHook(events, handler, opts?)`      | 事件攔截                    |
| `api.registerHttpRoute(params)`                 | Gateway HTTP 端點           |
| `api.registerGatewayMethod(name, handler)`      | Gateway RPC 方法            |
| `api.registerCli(registrar, opts?)`             | CLI 子指令                  |
| `api.registerService(service)`                  | 背景服務                    |
| `api.registerInteractiveHandler(registration)`  | 互動式處理器                |
| `api.registerEmbeddedExtensionFactory(factory)` | Pi 嵌入式執行器擴充工廠     |
| `api.registerMemoryPromptSupplement(builder)`   | 新增的記憶體相鄰提示區段    |
| `api.registerMemoryCorpusSupplement(adapter)`   | 新增的記憶體搜尋/讀取語料庫 |

保留的核心管理員命名空間 (`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`) 始終保持 `operator.admin`，即使外掛嘗試指定
更狹隘的閘道方法範圍。建議為外掛擁有的方法使用外掛專用的前綴。

當外掛在 OpenClaw 嵌入式執行期間需要 Pi 原生事件計時時，請使用 `api.registerEmbeddedExtensionFactory(...)`，例如必須在發出最終工具結果訊息之前發生的非同步 `tool_result`
重寫。這是目前的一個內建外掛縫隙 (seam)：只有內建外掛可以註冊一個，並且
它們必須在 `openclaw.plugin.json` 中宣告 `contracts.embeddedExtensionFactories: ["pi"]`。對於不需要該低階縫隙的所有事項，請保持正常的 OpenClaw 外掛攔截。

### CLI 註冊元資料

`api.registerCli(registrar, opts?)` 接受兩種頂層元資料：

- `commands`：由註冊者擁有的明確命令根
- `descriptors`：用於根 CLI 幫助、路由和延遲插件 CLI 註冊的解析時命令描述符，

如果您希望插件命令在正常的根 CLI 路徑中保持延遲加載，請提供 `descriptors` 以涵蓋該註冊器暴露的每個頂層命令根。

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

僅當您不需要延遲根 CLI 註冊時，才單獨使用 `commands`。該急切相容性路徑仍然受支援，但它不會為解析時延遲加載安裝由描述符支援的佔位符。

### CLI 後端註冊

`api.registerCliBackend(...)` 允許插件擁有本地 AI CLI 後端（例如 `codex-cli`）的預設配置。

- 後端 `id` 會成為模型參考（如 `codex-cli/gpt-5`）中的提供者前綴。
- 後端 `config` 使用與 `agents.defaults.cliBackends.<id>` 相同的形狀（shape）。
- 使用者配置仍然優先。OpenClaw 會在執行 CLI 之前，將 `agents.defaults.cliBackends.<id>` 與插件預設值合併。
- 當後端在合併後需要相容性重寫時（例如正規化舊的標誌形狀），請使用 `normalizeConfig`。

### 獨佔插槽

| 方法                                       | 註冊內容                                                                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `api.registerContextEngine(id, factory)`   | 上下文引擎（一次一個活躍）。`assemble()` 回調會接收 `availableTools` 和 `citationsMode`，以便引擎可以自訂提示詞附加內容。 |
| `api.registerMemoryCapability(capability)` | 統一記憶能力                                                                                                              |
| `api.registerMemoryPromptSection(builder)` | 記憶提示詞部分構建器                                                                                                      |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶清除計畫解析器                                                                                                        |
| `api.registerMemoryRuntime(runtime)`       | 記憶執行時適配器                                                                                                          |

### 記憶嵌入適配器

| 方法                                           | 註冊內容                     |
| ---------------------------------------------- | ---------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 用於活動插件的記憶嵌入適配器 |

- `registerMemoryCapability` 是首選的獨佔記憶插件 API。
- `registerMemoryCapability` 也可以暴露 `publicArtifacts.listArtifacts(...)`
  以便伴隨插件可以透過 `openclaw/plugin-sdk/memory-host-core` 使用導出的記憶構件，而不需要深入特定記憶插件的私有佈局。
- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是與舊版相容的專屬記憶體外掛程式 API。
- `registerMemoryEmbeddingProvider` 讓使用中的記憶體外掛程式註冊一個
  或多個嵌入配接器 ID (例如 `openai`、`gemini` 或自訂
  外掛程式定義的 ID)。
- 使用者設定 (例如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`) 會針對這些已註冊的
  配接器 ID 進行解析。

### 事件與生命週期

| 方法                                         | 作用                 |
| -------------------------------------------- | -------------------- |
| `api.on(hookName, handler, opts?)`           | 具型別的生命週期鉤子 |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼         |

### 鉤子決定語意

- `before_tool_call`：傳回 `{ block: true }` 為終止動作。一旦任何處理程序設定了它，較低優先順序的處理程序將會被跳過。
- `before_tool_call`：傳回 `{ block: false }` 被視為未作決定 (與省略 `block` 相同)，而非覆寫。
- `before_install`：傳回 `{ block: true }` 為終止動作。一旦任何處理程序設定了它，較低優先順序的處理程序將會被跳過。
- `before_install`：傳回 `{ block: false }` 被視為未作決定 (與省略 `block` 相同)，而非覆寫。
- `reply_dispatch`：傳回 `{ handled: true, ... }` 為終止動作。一旦任何處理程序聲稱分派，較低優先順序的處理程序和預設模型分派路徑將會被跳過。
- `message_sending`：傳回 `{ cancel: true }` 為終止動作。一旦任何處理程序設定了它，較低優先順序的處理程序將會被跳過。
- `message_sending`：傳回 `{ cancel: false }` 被視為未作決定 (與省略 `cancel` 相同)，而非覆寫。
- `message_received`：當您需要連入的執行緒/主題路由時，請使用具型別的 `threadId` 欄位。將 `metadata` 保留給頻道特定的額外資訊。
- `message_sending`：在回退到通道特定的 `metadata` 之前，使用類型化的 `replyToId` / `threadId` 路由欄位。
- `gateway_start`：使用 `ctx.config`、`ctx.workspaceDir` 和 `ctx.getCron?.()` 來處理閘道擁有的啟動狀態，而不是依賴內部的 `gateway:startup` hooks。

### API 物件欄位

| 欄位                     | 類型                      | 說明                                                                |
| ------------------------ | ------------------------- | ------------------------------------------------------------------- |
| `api.id`                 | `string`                  | 外掛程式 ID                                                         |
| `api.name`               | `string`                  | 顯示名稱                                                            |
| `api.version`            | `string?`                 | 外掛程式版本 (選用)                                                 |
| `api.description`        | `string?`                 | 外掛程式描述 (選用)                                                 |
| `api.source`             | `string`                  | 外掛程式來源路徑                                                    |
| `api.rootDir`            | `string?`                 | 外掛程式根目錄 (選用)                                               |
| `api.config`             | `OpenClawConfig`          | 目前的設定快照 (可用時為作用中的記憶體內部執行階段快照)             |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的外掛程式特定設定               |
| `api.runtime`            | `PluginRuntime`           | [執行階段輔助程式](/zh-Hant/plugins/sdk-runtime)                         |
| `api.logger`             | `PluginLogger`            | 範圍記錄器 (`debug`、`info`、`warn`、`error`)                       |
| `api.registrationMode`   | `PluginRegistrationMode`  | 目前的載入模式；`"setup-runtime"` 是完整項目啟動/設定之前的輕量視窗 |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於外掛程式根目錄的路徑                                      |

## 內部模組慣例

在您的外掛程式中，請使用本地 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  請勿在生產程式碼中透過 `openclaw/plugin-sdk/<your-plugin>` 匯入您自己的
  外掛程式。請透過 `./api.ts` 或
  `./runtime-api.ts` 來路由內部匯入。SDK 路徑僅供外部合約使用。
</Warning>

當 OpenClaw 正在執行時，外掛層載入的捆绑外掛程式公開介面（`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 及類似的公開進入檔案）現在會優先使用
作用中的執行時期設定快照。如果尚無執行時期快照，它們會退而求其次使用磁碟上解析出的設定檔。

當輔助函式是有意針對特定提供者、且尚不屬於通用 SDK 子路徑時，提供者外掛程式也可以公開一個狹隘的外掛程式本地合約桶。目前的捆綁範例：Anthropic 提供者將其 Claude
串流輔助函式保留在自己的公開 `api.ts` / `contract-api.ts` 縫隙中，而不是將 Anthropic beta-header 和 `service_tier` 邏輯提升至通用的
`plugin-sdk/*` 合約。

其他目前的捆綁範例：

- `@openclaw/openai-provider`：`api.ts` 匯出提供者建構器、
  預設模型輔助函式以及即時提供者建構器
- `@openclaw/openrouter-provider`：`api.ts` 匯出提供者建構器加上
  入門/設定輔助函式

<Warning>
  擴充功能的生產程式碼也應避免 `openclaw/plugin-sdk/<other-plugin>`
  匯入。如果輔助函式確實是共用的，請將其提升至中立的 SDK 子路徑
  （例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  面向功能的介面），而不是將兩個外掛程式耦合在一起。
</Warning>

## 相關

- [進入點]/en/plugins/sdk-entrypoints — `definePluginEntry` 和 `defineChannelPluginEntry` 選項
- [執行時期輔助函式]/en/plugins/sdk-runtime — 完整的 `api.runtime` 命名空間參考
- [設定與組態]/en/plugins/sdk-setup — 包裝、清單、設定結構描述
- [測試]/en/plugins/sdk-testing — 測試公用程式與 Lint 規則
- [SDK 遷移](/zh-Hant/plugins/sdk-migration) — 從已棄用的介面遷移
- [Plugin Internals](/zh-Hant/plugins/architecture) — 深度架構與能力模型
