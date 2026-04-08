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

<Tip>**尋找操作指南？** - 第一個插件？從[快速入門](/en/plugins/building-plugins)開始 - 頻道插件？請參閱[頻道插件](/en/plugins/sdk-channel-plugins) - 提供者插件？請參閱[提供者插件](/en/plugins/sdk-provider-plugins)</Tip>

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
    | `plugin-sdk/channel-core` | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` |
    | `plugin-sdk/config-schema` | 根目錄 `openclaw.json` Zod schema 匯出 (`OpenClawSchema`) |
    | `plugin-sdk/channel-setup` | `createOptionalChannelSetupSurface`, `createOptionalChannelSetupAdapter`, `createOptionalChannelSetupWizard`，外加 `DEFAULT_ACCOUNT_ID`, `createTopLevelChannelDmPolicy`, `setSetupChannelEnabled`, `splitSetupEntries` |
    | `plugin-sdk/setup` | 共用設置精靈輔助程式、允許清單提示、設置狀態建構器 |
    | `plugin-sdk/setup-runtime` | `createPatchedAccountSetupAdapter`, `createEnvPatchedAccountSetupAdapter`, `createSetupInputPresenceValidator`, `noteChannelLookupFailure`, `noteChannelLookupSummary`, `promptResolvedAllowFrom`, `splitSetupEntries`, `createAllowlistSetupWizardProxy`, `createDelegatedSetupWizardProxy` |
    | `plugin-sdk/setup-adapter-runtime` | `createEnvPatchedAccountSetupAdapter` |
    | `plugin-sdk/setup-tools` | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` |
    | `plugin-sdk/account-core` | 多帳號配置/動作閘道輔助程式、預設帳號後備輔助程式 |
    | `plugin-sdk/account-id` | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化輔助程式 |
    | `plugin-sdk/account-resolution` | 帳號查詢 + 預設後備輔助程式 |
    | `plugin-sdk/account-helpers` | 狹義帳號清單/帳號動作輔助程式 |
    | `plugin-sdk/channel-pairing` | `createChannelPairingController` |
    | `plugin-sdk/channel-reply-pipeline` | `createChannelReplyPipeline` |
    | `plugin-sdk/channel-config-helpers` | `createHybridChannelConfigAdapter` |
    | `plugin-sdk/channel-config-schema` | 頻道配置 schema 型別 |
    | `plugin-sdk/telegram-command-config` | Telegram 自訂指令正規化/驗證輔助程式，含合約後備機制 |
    | `plugin-sdk/channel-policy` | `resolveChannelGroupRequireMention` |
    | `plugin-sdk/channel-lifecycle` | `createAccountStatusSink` |
    | `plugin-sdk/inbound-envelope` | 共用入站路由 + 信封建構器輔助程式 |
    | `plugin-sdk/inbound-reply-dispatch` | 共用入站記錄與分派輔助程式 |
    | `plugin-sdk/messaging-targets` | 目標解析/匹配輔助程式 |
    | `plugin-sdk/outbound-media` | 共用出站媒體載入輔助程式 |
    | `plugin-sdk/outbound-runtime` | 出站身分/發送委派輔助程式 |
    | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結生命週期與配接器輔助程式 |
    | `plugin-sdk/agent-media-payload` | 舊版代理媒體承載建構器 |
    | `plugin-sdk/conversation-runtime` | 對話/執行緒繫結、配對與已配置繫結輔助程式 |
    | `plugin-sdk/runtime-config-snapshot` | 執行時配置快照輔助程式 |
    | `plugin-sdk/runtime-group-policy` | 執行時群組原則解析輔助程式 |
    | `plugin-sdk/channel-status` | 共用頻道狀態快照/摘要輔助程式 |
    | `plugin-sdk/channel-config-primitives` | 狹義頻道配置 schema 基本型別 |
    | `plugin-sdk/channel-config-writes` | 頻道配置寫入授權輔助程式 |
    | `plugin-sdk/channel-plugin-common` | 共用頻道外掛程式前置匯出 |
    | `plugin-sdk/allowlist-config-edit` | 允許清單配置編輯/讀取輔助程式 |
    | `plugin-sdk/group-access` | 共用群組存取決策輔助程式 |
    | `plugin-sdk/direct-dm` | 共用直接 DM 認證/防護輔助程式 |
    | `plugin-sdk/interactive-runtime` | 互動式回覆承載正規化/簡化輔助程式 |
    | `plugin-sdk/channel-inbound` | 防抖、提及匹配、信封輔助程式 |
    | `plugin-sdk/channel-send-result` | 回覆結果型別 |
    | `plugin-sdk/channel-actions` | `createMessageToolButtonsSchema`, `createMessageToolCardSchema` |
    | `plugin-sdk/channel-targets` | 目標解析/匹配輔助程式 |
    | `plugin-sdk/channel-contract` | 頻道合約型別 |
    | `plugin-sdk/channel-feedback` | 反饋/反應連線 |
  </Accordion>

<Accordion title="Provider 子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/provider-entry` | `defineSingleProviderPluginEntry` | | `plugin-sdk/provider-setup` | 精選的本機/自託管 Provider 設定輔助函式 | | `plugin-sdk/self-hosted-provider-setup` | 專注於 OpenAI 相容的自託管 Provider 設定輔助函式 | | `plugin-sdk/provider-auth-runtime` | Provider 插件的執行時期 API 金鑰解析輔助函式 | | `plugin-sdk/provider-auth-api-key` |
  API 金鑰上架/設定檔寫入輔助函式 | | `plugin-sdk/provider-auth-result` | 標準 OAuth 認證結果建構器 | | `plugin-sdk/provider-auth-login` | Provider 插件共用的互動式登入輔助函式 | | `plugin-sdk/provider-env-vars` | Provider 認證環境變數查詢輔助函式 | | `plugin-sdk/provider-auth` | `createProviderApiKeyAuthMethod`、`ensureApiKeyFromOptionEnvOrPrompt`、`upsertAuthProfile` | |
  `plugin-sdk/provider-model-shared` | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用的重播策略建構器、Provider 端點輔助函式，以及模型 ID 正規化輔助函式（例如 `normalizeNativeXaiModelId`）| | `plugin-sdk/provider-catalog-shared` |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-http` | 通用 Provider HTTP/端點功能輔助函式 | | `plugin-sdk/provider-web-fetch` | Web-fetch Provider 註冊/快取輔助函式 | | `plugin-sdk/provider-web-search` | Web-search Provider 註冊/快取/設定輔助函式 | | `plugin-sdk/provider-tools` |
  `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini schema 清理與診斷，以及 xAI 相容輔助函式（例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat`）| | `plugin-sdk/provider-usage` | `fetchClaudeUsage` 及類似功能 | | `plugin-sdk/provider-stream` | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝器類型，以及共用的
  Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝輔助函式 | | `plugin-sdk/provider-onboard` | 上架設定修補輔助函式 | | `plugin-sdk/global-singleton` | 程序本機單例/映射/快取輔助函式 |
</Accordion>

<Accordion title="身份驗證與安全性子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/command-auth` | `resolveControlCommandGate`、命令登錄器輔助函式、發送者授權輔助函式 | | `plugin-sdk/approval-auth-runtime` | Approver 解析與相同聊天動作授權輔助函式 | | `plugin-sdk/approval-client-runtime` | 原生執行核准設定檔/篩選器輔助函式 | | `plugin-sdk/approval-delivery-runtime` | 原生核准功能/交付適配器 | |
  `plugin-sdk/approval-native-runtime` | 原生核准目標 + 帳號綁定輔助函式 | | `plugin-sdk/approval-reply-runtime` | 執行/外掛程式核准回應承載輔助函式 | | `plugin-sdk/command-auth-native` | 原生命令授權 + 原生工作階段目標輔助函式 | | `plugin-sdk/command-detection` | 共用命令偵測輔助函式 | | `plugin-sdk/command-surface` | 命令主體正規化與命令介面輔助函式 | | `plugin-sdk/allow-from` |
  `formatAllowFromLowercase` | | `plugin-sdk/security-runtime` | 共用信任、DM 閘道、外部內容與秘密收集輔助函式 | | `plugin-sdk/ssrf-policy` | 主機允許清單與私人網路 SSRF 原則輔助函式 | | `plugin-sdk/ssrf-runtime` | 釘選分派器、SSRF 防護擷取與 SSRF 原則輔助函式 | | `plugin-sdk/secret-input` | 秘密輸入剖析輔助函式 | | `plugin-sdk/webhook-ingress` | Webhook 要求/目標輔助函式 | |
  `plugin-sdk/webhook-request-guards` | 要求主體大小/逾時輔助函式 |
</Accordion>

<Accordion title="Runtime and storage subpaths">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/runtime` | 廣泛的執行時期/日誌/備份/外掛安裝輔助函式 | | `plugin-sdk/runtime-env` | 狹義的執行時期環境、記錄器、逾時、重試與退避輔助函式 | | `plugin-sdk/runtime-store` | `createPluginRuntimeStore` | | `plugin-sdk/plugin-runtime` | 共用的外掛指令/hook/http/互動輔助函式 | | `plugin-sdk/hook-runtime` | 共用的 webhook/內部 pipeline 輔助函式 | |
  `plugin-sdk/lazy-runtime` | 懶載入執行時期匯入/綁定輔助函式，例如 `createLazyRuntimeModule`、`createLazyRuntimeMethod` 和 `createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 程序執行輔助函式 | | `plugin-sdk/cli-runtime` | CLI 格式化、等待與版本輔助函式 | | `plugin-sdk/gateway-runtime` | 閘道用戶端與通道狀態修補輔助函式 | | `plugin-sdk/config-runtime` | 設定載入/寫入輔助函式 | |
  `plugin-sdk/telegram-command-config` | Telegram 指令名稱/描述正規化與重複/衝突檢查，即使內建的 Telegram 合約介面不可用 | | `plugin-sdk/approval-runtime` | 執行/外掛核准輔助函式、核准能力建構器、驗證/個人資料輔助函式、原生路由/執行時期輔助函式 | | `plugin-sdk/reply-runtime` | 共用的傳入/回覆執行時期輔助函式、分塊、分派、心跳、回覆規劃器 | | `plugin-sdk/reply-dispatch-runtime` |
  狹義的回覆分派/完成輔助函式 | | `plugin-sdk/reply-history` | 共用的短視窗回覆歷史輔助函式，例如 `buildHistoryContext`、`recordPendingHistoryEntry` 和 `clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 狹義的文字/Markdown 分塊輔助函式 | | `plugin-sdk/session-store-runtime` | Session 儲存路徑 + updated-at 輔助函式 | |
  `plugin-sdk/state-paths` | 狀態/OAuth 目錄路徑輔助函式 | | `plugin-sdk/routing` | 路由/會話金鑰/帳號綁定輔助函式，例如 `resolveAgentRoute`、`buildAgentSessionKey` 和 `resolveDefaultAgentBoundAccountId` | | `plugin-sdk/status-helpers` | 共用的通道/帳號狀態摘要輔助函式、執行時期狀態預設值與問題中繼資料輔助函式 | | `plugin-sdk/target-resolver-runtime` | 共用的目標解析器輔助函式 | |
  `plugin-sdk/string-normalization-runtime` | Slug/字串正規化輔助函式 | | `plugin-sdk/request-url` | 從 fetch/request 類輸入中擷取字串 URL | | `plugin-sdk/run-command` | 具有標準化 stdout/stderr 結果的計時指令執行器 | | `plugin-sdk/param-readers` | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-send` | 從工具參數中擷取標準發送目標欄位 | | `plugin-sdk/temp-path` | 共用的暫存下載路徑輔助函式 | |
  `plugin-sdk/logging-core` | 子系統記錄器與編校輔助函式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格模式輔助函式 | | `plugin-sdk/json-store` | 小型 JSON 狀態讀寫輔助函式 | | `plugin-sdk/file-lock` | 可重入的檔案鎖定輔助函式 | | `plugin-sdk/persistent-dedupe` | 磁碟支援的去重快取輔助函式 | | `plugin-sdk/acp-runtime` | ACP 執行時期/會話與回覆分派輔助函式 | |
  `plugin-sdk/agent-config-primitives` | 狹義的 Agent 執行時期設定結構基本型別 | | `plugin-sdk/boolean-param` | 寬鬆的布林參數讀取器 | | `plugin-sdk/dangerous-name-runtime` | 危險名稱匹配解析輔助函式 | | `plugin-sdk/device-bootstrap` | 裝置引導與配對 Token 輔助函式 | | `plugin-sdk/extension-shared` | 共用的被動通道與狀態輔助基本型別 | | `plugin-sdk/models-provider-runtime` | `/models`
  指令/提供者回覆輔助函式 | | `plugin-sdk/skill-commands-runtime` | 技能指令列出輔助函式 | | `plugin-sdk/native-command-registry` | 原生指令註冊表/建置/序列化輔助函式 | | `plugin-sdk/provider-zai-endpoint` | Z.AI 端點偵測輔助函式 | | `plugin-sdk/infra-runtime` | 系統事件/心跳輔助函式 | | `plugin-sdk/collection-runtime` | 小型有界快取輔助函式 | | `plugin-sdk/diagnostic-runtime` |
  診斷旗標與事件輔助函式 | | `plugin-sdk/error-runtime` | 錯誤圖、格式化、共用錯誤分類輔助函式、`isApprovalNotFoundError` | | `plugin-sdk/fetch-runtime` | 包裝的 fetch、代理與固定查詢輔助函式 | | `plugin-sdk/host-runtime` | 主機名稱與 SCP 主機正規化輔助函式 | | `plugin-sdk/retry-runtime` | 重試設定與重試執行器輔助函式 | | `plugin-sdk/agent-runtime` | Agent 目錄/身分/工作區輔助函式 | |
  `plugin-sdk/directory-runtime` | 設定支援的目錄查詢/去重 | | `plugin-sdk/keyed-async-queue` | `KeyedAsyncQueue` |
</Accordion>

<Accordion title="Capability and testing subpaths">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/media-runtime` | 共用的媒體擷取/轉換/儲存輔助函式，以及媒體承載建構器 | | `plugin-sdk/media-understanding` | 媒體理解提供者類型，以及提供者面向的圖片/音訊輔助匯出 | | `plugin-sdk/text-runtime` | 共用的文字/Markdown/記錄輔助函式，例如助理可見文字剝除、Markdown 轉譯/分塊/表格輔助函式、編輯輔助函式、指令標籤輔助函式和安全文字工具 | |
  `plugin-sdk/text-chunking` | 外寄文字分塊輔助函式 | | `plugin-sdk/speech` | 語音提供者類型，以及提供者面向的指令、註冊和驗證輔助函式 | | `plugin-sdk/speech-core` | 共用的語音提供者類型、註冊、指令和正規化輔助函式 | | `plugin-sdk/realtime-transcription` | 即時轉錄提供者類型和註冊輔助函式 | | `plugin-sdk/realtime-voice` | 即時語音提供者類型和註冊輔助函式 | | `plugin-sdk/image-generation` |
  圖像生成提供者類型 | | `plugin-sdk/image-generation-core` | 共用的圖像生成類型、容錯移轉、驗證和註冊輔助函式 | | `plugin-sdk/music-generation` | 音樂生成提供者/請求/結果類型 | | `plugin-sdk/music-generation-core` | 共用的音樂生成類型、容錯移轉輔助函式、提供者查詢和模型參考解析 | | `plugin-sdk/video-generation` | 影片生成提供者/請求/結果類型 | | `plugin-sdk/video-generation-core` |
  共用的影片生成類型、容錯移轉輔助函式、提供者查詢和模型參考解析 | | `plugin-sdk/webhook-targets` | Webhook 目標註冊表和路由安裝輔助函式 | | `plugin-sdk/webhook-path` | Webhook 路徑正規化輔助函式 | | `plugin-sdk/web-media` | 共用的遠端/本機媒體載入輔助函式 | | `plugin-sdk/zod` | 供外掛程式 SDK 消費者使用的重新匯出 `zod` | | `plugin-sdk/testing` |
  `installCommonResolveTargetErrorCases`、`shouldAckReaction` |
</Accordion>

<Accordion title="記憶體子路徑">
  | 子路徑 | 主要匯出 | | --- | --- | | `plugin-sdk/memory-core` | 用於 manager/config/file/CLI 協助程式的套件 memory-core 協助程式表面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體索引/搜尋執行時外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入引擎匯出 | |
  `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態協助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢協助程式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機機密協助程式 | | `plugin-sdk/memory-core-host-status` |
  記憶體主機狀態協助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時協助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時協助程式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時協助程式 | | `plugin-sdk/memory-lancedb` | 套件 memory-lancedb 協助程式表面 |
</Accordion>

  <Accordion title="保留的 bundled-helper 子路徑">
    | 系列 | 當前子路徑 | 預期用途 |
    | --- | --- | --- |
    | Browser | `plugin-sdk/browser-cdp`, `plugin-sdk/browser-config-runtime`, `plugin-sdk/browser-config-support`, `plugin-sdk/browser-control-auth`, `plugin-sdk/browser-node-runtime`, `plugin-sdk/browser-profiles`, `plugin-sdk/browser-security-runtime`, `plugin-sdk/browser-setup-tools`, `plugin-sdk/browser-support` | 捆綁的瀏覽器外掛支援輔助程式（`browser-support` 保持為相容性匯入檔） |
    | Matrix | `plugin-sdk/matrix`, `plugin-sdk/matrix-helper`, `plugin-sdk/matrix-runtime-heavy`, `plugin-sdk/matrix-runtime-shared`, `plugin-sdk/matrix-runtime-surface`, `plugin-sdk/matrix-surface`, `plugin-sdk/matrix-thread-bindings` | 捆綁的 Matrix 輔助/執行時介面 |
    | Line | `plugin-sdk/line`, `plugin-sdk/line-core`, `plugin-sdk/line-runtime`, `plugin-sdk/line-surface` | 捆綁的 LINE 輔助/執行時介面 |
    | IRC | `plugin-sdk/irc`, `plugin-sdk/irc-surface` | 捆綁的 IRC 輔助介面 |
    | 特定頻道輔助程式 | `plugin-sdk/googlechat`, `plugin-sdk/zalouser`, `plugin-sdk/bluebubbles`, `plugin-sdk/bluebubbles-policy`, `plugin-sdk/mattermost`, `plugin-sdk/mattermost-policy`, `plugin-sdk/feishu-conversation`, `plugin-sdk/msteams`, `plugin-sdk/nextcloud-talk`, `plugin-sdk/nostr`, `plugin-sdk/tlon`, `plugin-sdk/twitch` | 捆綁的頻道相容性/輔助程式介面 |
    | Auth/外掛特定輔助程式 | `plugin-sdk/github-copilot-login`, `plugin-sdk/github-copilot-token`, `plugin-sdk/diagnostics-otel`, `plugin-sdk/diffs`, `plugin-sdk/llm-task`, `plugin-sdk/thread-ownership`, `plugin-sdk/voice-call` | 捆綁的功能/外掛輔助程式介面；`plugin-sdk/github-copilot-token` 目前匯出 `DEFAULT_COPILOT_API_BASE_URL`、`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken` |
  </Accordion>
</AccordionGroup>

## 註冊 API

`register(api)` 回呼函式會接收包含這些方法的 `OpenClawPluginApi` 物件：

### 功能註冊

| 方法                                             | 註冊內容              |
| ------------------------------------------------ | --------------------- |
| `api.registerProvider(...)`                      | 文字推斷 (LLM)        |
| `api.registerChannel(...)`                       | 訊息傳遞頻道          |
| `api.registerSpeechProvider(...)`                | 文字轉語音 / STT 合成 |
| `api.registerRealtimeTranscriptionProvider(...)` | 串流即時轉錄          |
| `api.registerRealtimeVoiceProvider(...)`         | 雙向即時語音工作階段  |
| `api.registerMediaUnderstandingProvider(...)`    | 圖片/音訊/影片分析    |
| `api.registerImageGenerationProvider(...)`       | 圖片生成              |
| `api.registerMusicGenerationProvider(...)`       | 音樂生成              |
| `api.registerVideoGenerationProvider(...)`       | 影片生成              |
| `api.registerWebFetchProvider(...)`              | Web 擷取/爬取提供者   |
| `api.registerWebSearchProvider(...)`             | 網路搜尋              |

### 工具與指令

| 方法                            | 註冊內容                                 |
| ------------------------------- | ---------------------------------------- |
| `api.registerTool(tool, opts?)` | Agent 工具 (必要或 `{ optional: true }`) |
| `api.registerCommand(def)`      | 自訂指令 (略過 LLM)                      |

### 基礎架構

| 方法                                           | 註冊內容          |
| ---------------------------------------------- | ----------------- |
| `api.registerHook(events, handler, opts?)`     | 事件勾點          |
| `api.registerHttpRoute(params)`                | Gateway HTTP 端點 |
| `api.registerGatewayMethod(name, handler)`     | Gateway RPC 方法  |
| `api.registerCli(registrar, opts?)`            | CLI 子指令        |
| `api.registerService(service)`                 | 背景服務          |
| `api.registerInteractiveHandler(registration)` | 互動式處理程式    |

保留的核心管理命名空間 (`config.*`、`exec.approvals.*`、`wizard.*`、
`update.*`) 即使外掛嘗試指派範圍較窄的 Gateway 方法，也會保持 `operator.admin`。對於外掛擁有的方法，建議使用外掛特定的前綴。

### CLI 註冊元資料

`api.registerCli(registrar, opts?)` 接受兩種頂層元資料：

- `commands`：由註冊者擁有的明確指令根
- `descriptors`：用於根 CLI 說明、路由和延遲外掛 CLI 註冊的解析時期指令描述元

如果您希望外掛程式指令在一般根 CLI 路徑中保持延遲載入，請提供 `descriptors`，涵蓋該註冊器暴露的每個頂層指令根。

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

僅在您不需要延遲根 CLI 註冊時，才單獨使用 `commands`。該急切相容路徑仍受支援，但不會安裝描述符支援的預留位置以進行解析時的延遲載入。

### 獨佔插槽

| 方法                                       | 註冊內容                     |
| ------------------------------------------ | ---------------------------- |
| `api.registerContextEngine(id, factory)`   | Context 引擎（一次一個啟用） |
| `api.registerMemoryPromptSection(builder)` | 記憶體提示區段建構器         |
| `api.registerMemoryFlushPlan(resolver)`    | 記憶體清除計畫解析器         |
| `api.registerMemoryRuntime(runtime)`       | 記憶體執行時期配接器         |

### 記憶體嵌入配接器

| 方法                                           | 註冊內容                         |
| ---------------------------------------------- | -------------------------------- |
| `api.registerMemoryEmbeddingProvider(adapter)` | 作用中外掛程式的記憶體嵌入配接器 |

- `registerMemoryPromptSection`、`registerMemoryFlushPlan` 和
  `registerMemoryRuntime` 是記憶體外掛程式專用的。
- `registerMemoryEmbeddingProvider` 允許作用中的記憶體外掛程式註冊一個
  或多個嵌入配接器 ID（例如 `openai`、`gemini` 或自訂
  外掛程式定義的 ID）。
- 使用者設定（如 `agents.defaults.memorySearch.provider` 和
  `agents.defaults.memorySearch.fallback`）會根據這些已註冊的
  配接器 ID 進行解析。

### 事件與生命週期

| 方法                                         | 功能                |
| -------------------------------------------- | ------------------- |
| `api.on(hookName, handler, opts?)`           | 型別化生命週期 Hook |
| `api.onConversationBindingResolved(handler)` | 對話綁定回呼        |

### Hook 決策語意

- `before_tool_call`：傳回 `{ block: true }` 即為終止。一旦任何處理程式設定它，較低優先順序的處理程式將被跳過。
- `before_tool_call`：傳回 `{ block: false }` 被視為未作決定（等同於省略 `block`），而非覆寫。
- `before_install`：傳回 `{ block: true }` 即為終止。一旦任何處理程式設定它，較低優先順序的處理程式將被跳過。
- `before_install`：傳回 `{ block: false }` 被視為未作決定（等同於省略 `block`），而非覆寫。
- `reply_dispatch`：返回 `{ handled: true, ... }` 即終止。一旦任何處理程序聲明了調度，較低優先級的處理程序和預設模型調度路徑都會被跳過。
- `message_sending`：返回 `{ cancel: true }` 即終止。一旦任何處理程序設定了它，較低優先級的處理程序會被跳過。
- `message_sending`：返回 `{ cancel: false }` 被視為未做出決定（與省略 `cancel` 相同），而不是覆寫。

### API 物件欄位

| 欄位                     | 類型                      | 描述                                                                       |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------- |
| `api.id`                 | `string`                  | Plugin id                                                                  |
| `api.name`               | `string`                  | 顯示名稱                                                                   |
| `api.version`            | `string?`                 | Plugin version (optional)                                                  |
| `api.description`        | `string?`                 | Plugin description (optional)                                              |
| `api.source`             | `string`                  | Plugin source path                                                         |
| `api.rootDir`            | `string?`                 | Plugin root directory (optional)                                           |
| `api.config`             | `OpenClawConfig`          | Current config snapshot (active in-memory runtime snapshot when available) |
| `api.pluginConfig`       | `Record<string, unknown>` | 來自 `plugins.entries.<id>.config` 的 Plugin 特定設定                      |
| `api.runtime`            | `PluginRuntime`           | [Runtime helpers](/en/plugins/sdk-runtime)                                 |
| `api.logger`             | `PluginLogger`            | Scoped logger (`debug`、`info`、`warn`、`error`)                           |
| `api.registrationMode`   | `PluginRegistrationMode`  | 當前載入模式；`"setup-runtime"` 是輕量級的完整進入啟動/設定視窗            |
| `api.resolvePath(input)` | `(string) => string`      | 解析相對於 Plugin 根目錄的路徑                                             |

## 內部模組慣例

在您的 Plugin 中，使用本地 barrel 檔案進行內部匯入：

```
my-plugin/
  api.ts            # Public exports for external consumers
  runtime-api.ts    # Internal-only runtime exports
  index.ts          # Plugin entry point
  setup-entry.ts    # Lightweight setup-only entry (optional)
```

<Warning>
  切勿從生產程式碼中透過 `openclaw/plugin-sdk/<your-plugin>` 匯入您自己的
  外掛。請透過 `./api.ts` 或
  `./runtime-api.ts` 來路由內部匯入。SDK 路徑僅供外部契約使用。
</Warning>

外掛載入的打包外掛公用表面 (`api.ts`、`runtime-api.ts`、
`index.ts`、`setup-entry.ts` 及類似的公用進入檔案) 現在會在 OpenClaw 已執行時優先使用有效的執行時段設定快照。如果執行時段快照尚不存在，則會退回到磁碟上解析後的設定檔。

當輔助函式刻意針對特定提供者且尚未屬於通用 SDK 子路徑時，提供者外掛也可以公開狹義的外掛本機契約桶。目前的打包範例：Anthropic 提供者將其 Claude 串流輔助函式保留在其自己的公用 `api.ts` / `contract-api.ts` 接縫中，而不是將 Anthropic beta 標頭和 `service_tier` 邏輯提升到通用的
`plugin-sdk/*` 契約中。

其他目前的打包範例：

- `@openclaw/openai-provider`：`api.ts` 匯出提供者建構器、
  預設模型輔助函式以及即時提供者建構器
- `@openclaw/openrouter-provider`：`api.ts` 匯出提供者建構器以及
  上手/設定輔助函式

<Warning>
  擴充功能的生產程式碼也應避免 `openclaw/plugin-sdk/<other-plugin>`
  匯入。如果輔助函式確實是共享的，請將其提升到中立的 SDK 子路徑，
  例如 `openclaw/plugin-sdk/speech`、`.../provider-model-shared` 或其他
  以功能為導向的表面，而不是將兩個外掛耦合在一起。
</Warning>

## 相關

- [進入點](/en/plugins/sdk-entrypoints) — `definePluginEntry` 與 `defineChannelPluginEntry` 選項
- [執行時段輔助函式](/en/plugins/sdk-runtime) — 完整的 `api.runtime` 命名空間參考
- [設定與組態](/en/plugins/sdk-setup) — 打包、資訊清單、設定架構
- [測試](/en/plugins/sdk-testing) — 測試公用程式與 Lint 規則
- [SDK 遷移](/en/plugins/sdk-migration) — 從已棄用的介面遷移
- [Plugin 內部機制](/en/plugins/architecture) — 深層架構與能力模型
