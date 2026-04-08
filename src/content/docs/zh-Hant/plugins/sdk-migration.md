---
title: "Plugin SDK 遷移"
sidebarTitle: "遷移至 SDK"
summary: "從舊版向後相容層遷移至現代化 plugin SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

# Plugin SDK 遷移

OpenClaw 已從廣泛的向後相容層轉移到現代化的外掛架構，具有專注且有文件記錄的匯入項。如果您的插件是在新架構之前構建的，本指南將幫助您進行遷移。

## 有什麼變化

舊的插件系統提供了兩個開放的平台，允許插件從單一入口點匯入它們需要的任何東西：

- **`openclaw/plugin-sdk/compat`** — 單一匯入，重新匯出了數十個
  輔助函式。引進它是為了在構建新 plugin 架構時，讓較舊的基於 hook 的 plugins 能繼續運作。
- **`openclaw/extension-api`** — 一個橋接層，讓 plugins 能直接存取
  主機端輔助函式，例如內嵌 agent 執行器。

這兩個平台現已**棄用**。它們在運行時仍然有效，但新插件絕不能使用它們，現有插件應在下一次主要版本將其移除之前進行遷移。

<Warning>向下相容層將在未來的主要版本中被移除。 屆時，仍從這些介面匯入的外掛程式將會中斷運作。</Warning>

## 為何做出此變更

舊的方法導致了以下問題：

- **啟動緩慢** — 匯入一個輔助函數會加載數十個無關的模組
- **循環相依** — 廣泛的重新匯出使得很容易建立匯入循環
- **API 介面不明確** — 無法區分哪些匯出項是穩定的，哪些是內部的

現代化 plugin SDK 解決了這個問題：每個匯入路徑 (`openclaw/plugin-sdk/\<subpath\>`)
都是一個小型的、自包含的模組，具有明確的目的和文件化的合約。

針對打包通道的舊版提供者便捷縫隙也已移除。諸如 `openclaw/plugin-sdk/slack`、`openclaw/plugin-sdk/discord`、
`openclaw/plugin-sdk/signal`、`openclaw/plugin-sdk/whatsapp`、
通道品牌輔助縫隙，以及
`openclaw/plugin-sdk/telegram-core` 等匯入都是私有的 monorepo 捷徑，並非
穩定的 plugin 合約。請改用狹隘的通用 SDK 子路徑。在打包的
plugin 工作區內，請將提供者擁有的輔助函式保留在該 plugin 自己的
`api.ts` 或 `runtime-api.ts` 中。

目前的打包提供者範例：

- Anthropic 將 Claude 專用的串流輔助函式保留在其自己的 `api.ts` /
  `contract-api.ts` 縫隙中
- OpenAI 將提供者建構器、預設模型輔助函式和即時提供者
  建構器保留在其自己的 `api.ts` 中
- OpenRouter 將提供者建構器以及上架/配置輔助函式保留在其自己的
  `api.ts` 中

## 如何遷移

<Steps>
  <Step title="稽核 Windows 包裝函式後援行為">
    如果您的外掛程式使用 `openclaw/plugin-sdk/windows-spawn`，未解析的 Windows
    `.cmd`/`.bat` 包裝函式現在將以封閉式失敗處理，除非您明確傳遞
    `allowShellFallback: true`。

    ```typescript
    // Before
    const program = applyWindowsSpawnProgramPolicy({ candidate });

    // After
    const program = applyWindowsSpawnProgramPolicy({
      candidate,
      // Only set this for trusted compatibility callers that intentionally
      // accept shell-mediated fallback.
      allowShellFallback: true,
    });
    ```

    如果您的呼叫端並非故意依賴 shell 後援，請勿設定
    `allowShellFallback`，改為處理擲回的錯誤。

  </Step>

  <Step title="尋找已淘汰的匯入">
    搜尋您的外掛程式中來自任一已淘汰介面的匯入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替換為專注的匯入">
    舊介面匯出的每個項目都對應到一個特定的現代匯入路徑：

    ```typescript
    // Before (deprecated backwards-compatibility layer)
    import {
      createChannelReplyPipeline,
      createPluginRuntimeStore,
      resolveControlCommandGate,
    } from "openclaw/plugin-sdk/compat";

    // After (modern focused imports)
    import { createChannelReplyPipeline } from "openclaw/plugin-sdk/channel-reply-pipeline";
    import { createPluginRuntimeStore } from "openclaw/plugin-sdk/runtime-store";
    import { resolveControlCommandGate } from "openclaw/plugin-sdk/command-auth";
    ```

    對於主機端輔助程式，請使用注入的外掛程式執行時期，而非直接匯入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    相同的模式也適用於其他舊版橋接輔助程式：

    | 舊版匯入 | 現代對等項目 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | session store helpers | `api.runtime.agent.session.*` |

  </Step>

  <Step title="建置並測試">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 匯入路徑參考

<Accordion title="通用匯入路徑表">
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準外掛程式進入點輔助程式 | `definePluginEntry` | | `plugin-sdk/core` | 用於頻道進入點定義/建構器的舊版覆蓋式重新匯出 | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置匯架構匯出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 單一提供者進入點輔助程式 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 專注的頻道進入點定義和建構器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | 共用設定精靈輔助程式 | 允許清單提示、設定狀態建構器 | | `plugin-sdk/setup-runtime` | 設定時執行階段輔助程式 |
  安全匯入的設定修補介面卡、查詢備註輔助程式、`promptResolvedAllowFrom`、`splitSetupEntries`、委派設定代理程式 | | `plugin-sdk/setup-adapter-runtime` | 設定介面卡輔助程式 | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | 設定工具輔助程式 | `formatCliCommand`, `detectBinary`, `extractArchive`, `resolveBrewExecutable`, `formatDocsLink`, `CONFIG_DIR` | | `plugin-sdk/account-core`
  | 多帳號輔助程式 | 帳號清單/配置/動作閘道輔助程式 | | `plugin-sdk/account-id` | 帳號 ID 輔助程式 | `DEFAULT_ACCOUNT_ID`、帳號 ID 正規化 | | `plugin-sdk/account-resolution` | 帳號查詢輔助程式 | 帳號查詢 + 預設後援輔助程式 | | `plugin-sdk/account-helpers` | 狹窄帳號輔助程式 | 帳號清單/帳號動作輔助程式 | | `plugin-sdk/channel-setup` | 設定精靈介面卡 |
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` | | `plugin-sdk/channel-pairing` | DM 配對基本類型 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回覆前綴 + 打字狀態接線 | `createChannelReplyPipeline`
  | | `plugin-sdk/channel-config-helpers` | 配置介面卡工廠 | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | 配置架構建構器 | 頻道配置架構類型 | | `plugin-sdk/telegram-command-config` | Telegram 指令配置輔助程式 | 指令名稱正規化、描述修剪、重複/衝突驗證 | | `plugin-sdk/channel-policy` | 群組/DM 政策解析 | `resolveChannelGroupRequireMention` | |
  `plugin-sdk/channel-lifecycle` | 帳號狀態追蹤 | `createAccountStatusSink` | | `plugin-sdk/inbound-envelope` | 傳入信封輔助程式 | 共用路由 + 信封建構器輔助程式 | | `plugin-sdk/inbound-reply-dispatch` | 傳入回覆輔助程式 | 共用記錄和分派輔助程式 | | `plugin-sdk/messaging-targets` | 訊息目標解析 | 目標解析/比對輔助程式 | | `plugin-sdk/outbound-media` | 傳出媒體輔助程式 | 共用傳出媒體載入 | |
  `plugin-sdk/outbound-runtime` | 傳出執行階段輔助程式 | 傳出身分識別/傳送委派輔助程式 | | `plugin-sdk/thread-bindings-runtime` | 執行緒綁定輔助程式 | 執行緒綁定生命週期和介面卡輔助程式 | | `plugin-sdk/agent-media-payload` | 舊版媒體承載輔助程式 | 用於舊版欄位配置的 Agent 媒體承載建構器 | | `plugin-sdk/channel-runtime` | 已淘汰的相容性填充層 | 僅限舊版頻道執行階段公用程式 | |
  `plugin-sdk/channel-send-result` | 傳送結果類型 | 回覆結果類型 | | `plugin-sdk/runtime-store` | 持久性外掛程式儲存 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 廣泛執行階段輔助程式 | 執行階段/記錄/備份/外掛程式安裝輔助程式 | | `plugin-sdk/runtime-env` | 狹窄執行階段環境輔助程式 | 記錄器/執行階段環境、逾時、重試和退避輔助程式 | | `plugin-sdk/plugin-runtime` |
  共用外掛程式執行階段輔助程式 | 外掛程式指令/Hooks/HTTP/互動式輔助程式 | | `plugin-sdk/hook-runtime` | Hook 管線輔助程式 | 共用 Webhook/內部 Hook 管線輔助程式 | | `plugin-sdk/lazy-runtime` | 延遲執行階段輔助程式 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` |
  處理序輔助程式 | 共用 exec 輔助程式 | | `plugin-sdk/cli-runtime` | CLI 執行階段輔助程式 | 指令格式化、等待、版本輔助程式 | | `plugin-sdk/gateway-runtime` | 閘道輔助程式 | 閘道用戶端和頻道狀態修補輔助程式 | | `plugin-sdk/config-runtime` | 配置輔助程式 | 配置載入/寫入輔助程式 | | `plugin-sdk/telegram-command-config` | Telegram 指令輔助程式 | 當隨附的 Telegram 合約介面無法使用時，提供後援穩定的
  Telegram 指令驗證輔助程式 | | `plugin-sdk/approval-runtime` | 核准提示輔助程式 | Exec/外掛程式核准承載、核准功能/設定檔輔助程式、原生核准路由/執行階段輔助程式 | | `plugin-sdk/approval-auth-runtime` | 核准驗證輔助程式 | 核准者解析、相同聊天動作驗證 | | `plugin-sdk/approval-client-runtime` | 核准用戶端輔助程式 | 原生 exec 核准設定檔/篩選輔助程式 | | `plugin-sdk/approval-delivery-runtime` |
  核准傳遞輔助程式 | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-native-runtime` | 核准目標輔助程式 | 原生核准目標/帳號綁定輔助程式 | | `plugin-sdk/approval-reply-runtime` | 核准回覆輔助程式 | Exec/外掛程式核准回覆承載輔助程式 | | `plugin-sdk/security-runtime` | 安全性輔助程式 | 共用信任、DM 閘道、外部內容和祕密收集輔助程式 | | `plugin-sdk/ssrf-policy` | SSRF 政策輔助程式 |
  主機允許清單和私人網路政策輔助程式 | | `plugin-sdk/ssrf-runtime` | SSRF 執行階段輔助程式 | 釘選分派器、受保護提取、SSRF 政策輔助程式 | | `plugin-sdk/collection-runtime` | 有界限快取輔助程式 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 診斷閘道輔助程式 | `isDiagnosticFlagEnabled`、`isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 錯誤格式化輔助程式 |
  `formatUncaughtError`、`isApprovalNotFoundError`、錯誤圖表輔助程式 | | `plugin-sdk/fetch-runtime` | 包裝的提取/代理輔助程式 | `resolveFetch`、代理輔助程式 | | `plugin-sdk/host-runtime` | 主機正規化輔助程式 | `normalizeHostname`、`normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重試輔助程式 | `RetryConfig`、`retryAsync`、政策執行程式 | | `plugin-sdk/allow-from` | 允許清單格式化 |
  `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | 允許清單輸入對應 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘道和指令介面輔助程式 | `resolveControlCommandGate`、傳送者授權輔助程式、指令登錄輔助程式 | | `plugin-sdk/secret-input` | 祕密輸入解析 | 祕密輸入輔助程式 | | `plugin-sdk/webhook-ingress` | Webhook 要求輔助程式 | Webhook 目標公用程式 | |
  `plugin-sdk/webhook-request-guards` | Webhook 內文防護輔助程式 | 要求內文讀取/限制輔助程式 | | `plugin-sdk/reply-runtime` | 共用回覆執行階段 | 傳入分派、心跳、回覆規劃器、區塊分割 | | `plugin-sdk/reply-dispatch-runtime` | 狹窄回覆分派輔助程式 | 完成化 + 提供者分派輔助程式 | | `plugin-sdk/reply-history` | 回覆歷程輔助程式 |
  `buildHistoryContext`、`buildPendingHistoryContextFromMap`、`recordPendingHistoryEntry`、`clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回覆參照規劃 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回覆區塊輔助程式 | 文字/Markdown 區塊分割輔助程式 | | `plugin-sdk/session-store-runtime` | 工作階段儲存輔助程式 | 儲存路徑 + 更新於輔助程式 | |
  `plugin-sdk/state-paths` | 狀態路徑輔助程式 | 狀態和 OAuth 目錄輔助程式 | | `plugin-sdk/routing` | 路由/工作階段金鑰輔助程式 | `resolveAgentRoute`、`buildAgentSessionKey`、`resolveDefaultAgentBoundAccountId`、工作階段金鑰正規化輔助程式 | | `plugin-sdk/status-helpers` | 頻道狀態輔助程式 | 頻道/帳號狀態摘要建構器、執行階段狀態預設值、問題中繼資料輔助程式 | | `plugin-sdk/target-resolver-runtime` |
  目標解析程式輔助程式 | 共用目標解析程式輔助程式 | | `plugin-sdk/string-normalization-runtime` | 字串正規化輔助程式 | Slug/字串正規化輔助程式 | | `plugin-sdk/request-url` | 要求 URL 輔助程式 | 從類似要求的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令輔助程式 | 具有已正規化標準輸出/標準錯誤的計時指令執行程式 | | `plugin-sdk/param-readers` | 參數讀取器 | 通用工具/CLI 參數讀取器 | |
  `plugin-sdk/tool-send` | 工具傳送擷取 | 從工具引數中擷取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 暫存路徑輔助程式 | 共用暫存下載路徑輔助程式 | | `plugin-sdk/logging-core` | 記錄輔助程式 | 子系統記錄器和編修輔助程式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格輔助程式 | Markdown 表格模式輔助程式 | | `plugin-sdk/reply-payload` | 訊息回覆類型 | 回覆承載類型 | |
  `plugin-sdk/provider-setup` | 精選的本機/自託管提供者設定輔助程式 | 自託管提供者探索/配置輔助程式 | | `plugin-sdk/self-hosted-provider-setup` | 專注於 OpenAI 相容的自託管提供者設定輔助程式 | 相同的自託管提供者探索/配置輔助程式 | | `plugin-sdk/provider-auth-runtime` | 提供者執行階段驗證輔助程式 | 執行階段 API 金鑰解析輔助程式 | | `plugin-sdk/provider-auth-api-key` | 提供者 API 金鑰設定輔助程式 |
  API 金鑰上架/設定檔寫入輔助程式 | | `plugin-sdk/provider-auth-result` | 提供者驗證結果輔助程式 | 標準 OAuth 驗證結果建構器 | | `plugin-sdk/provider-auth-login` | 提供者互動式登入輔助程式 | 共用互動式登入輔助程式 | | `plugin-sdk/provider-env-vars` | 提供者環境變數輔助程式 | 提供者驗證環境變數查詢輔助程式 | | `plugin-sdk/provider-model-shared` | 共用提供者模型/重播輔助程式 |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重播政策建構器、提供者端點輔助程式和模型 ID 正規化輔助程式 | | `plugin-sdk/provider-catalog-shared` | 共用提供者目錄輔助程式 | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` |
  提供者上架修補程式 | 上架配置輔助程式 | | `plugin-sdk/provider-http` | 提供者 HTTP 輔助程式 | 一般提供者 HTTP/端點功能輔助程式 | | `plugin-sdk/provider-web-fetch` | 提供者 Web 擷取輔助程式 | Web 擷取提供者註冊/快取輔助程式 | | `plugin-sdk/provider-web-search` | 提供者 Web 搜尋輔助程式 | Web 搜尋提供者註冊/快取/配置輔助程式 | | `plugin-sdk/provider-tools` | 提供者工具/架構相容性輔助程式 |
  `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 架構清理 + 診斷，以及 xAI 相容性輔助程式，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | 提供者使用量輔助程式 | `fetchClaudeUsage`、`fetchGeminiUsage`、`fetchGithubCopilotUsage` 和其他提供者使用量輔助程式 | | `plugin-sdk/provider-stream` | 提供者資料流包裝函式輔助程式 |
  `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、資料流包裝函式類型，以及共用的 Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝函式輔助程式 | | `plugin-sdk/keyed-async-queue` | 排序的非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共用媒體輔助程式 | 媒體擷取/轉換/儲存輔助程式加上媒體承載建構器 | |
  `plugin-sdk/media-understanding` | 媒體理解輔助程式 | 媒體理解提供者類型，加上提供者端影像/音訊輔助程式匯出 | | `plugin-sdk/text-runtime` | 共用文字輔助程式 | 助手可見文字剝離、Markdown 轉譯/區塊分割/表格輔助程式、編修輔助程式、指示標籤輔助程式、安全文字公用程式，以及相關的文字/記錄輔助程式 | | `plugin-sdk/text-chunking` | 文字區塊分割輔助程式 | 傳出文字區塊分割輔助程式 | | `plugin-sdk/speech` |
  語音輔助程式 | 語音提供者類型，加上提供者端指示、登錄和驗證輔助程式 | | `plugin-sdk/speech-core` | 共用語音核心 | 語音提供者類型、登錄、指示、正規化 | | `plugin-sdk/realtime-transcription` | 即時轉錄輔助程式 | 提供者類型和登錄輔助程式 | | `plugin-sdk/realtime-voice` | 即時語音輔助程式 | 提供者類型和登錄輔助程式 | | `plugin-sdk/image-generation-core` | 共用影像產生核心 |
  影像產生類型、容錯移轉、驗證和登錄輔助程式 | | `plugin-sdk/music-generation` | 音樂產生輔助程式 | 音樂產生提供者/要求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂產生核心 | 音樂產生類型、容錯移轉輔助程式、提供者查詢和模型參照解析 | | `plugin-sdk/video-generation` | 影片產生輔助程式 | 影片產生提供者/要求/結果類型 | | `plugin-sdk/video-generation-core` | 共用影片產生核心 |
  影片產生類型、容錯移轉輔助程式、提供者查詢和模型參照解析 | | `plugin-sdk/interactive-runtime` | 互動式回覆輔助程式 | 互動式回覆承載正規化/簡化 | | `plugin-sdk/channel-config-primitives` | 頻道配置基本元素 | 狹窄頻道配置架構基本元素 | | `plugin-sdk/channel-config-writes` | 頻道配置寫入輔助程式 | 頻道配置寫入授權輔助程式 | | `plugin-sdk/channel-plugin-common` | 共用頻道前奏 |
  共用頻道外掛程式前奏匯出 | | `plugin-sdk/channel-status` | 頻道狀態輔助程式 | 共用頻道狀態快照/摘要輔助程式 | | `plugin-sdk/allowlist-config-edit` | 允許清單配置輔助程式 | 允許清單配置編輯/讀取輔助程式 | | `plugin-sdk/group-access` | 群組存取輔助程式 | 共用群組存取決策輔助程式 | | `plugin-sdk/direct-dm` | 直接 DM 輔助程式 | 共用直接 DM 驗證/防護輔助程式 | | `plugin-sdk/extension-shared` |
  共用擴充功能輔助程式 | 被動頻道/狀態輔助程式基本元素 | | `plugin-sdk/webhook-targets` | Webhook 目標輔助程式 | Webhook 目標登錄和路由安裝輔助程式 | | `plugin-sdk/webhook-path` | Webhook 路徑輔助程式 | Webhook 路徑正規化輔助程式 | | `plugin-sdk/web-media` | 共用 Web 媒體輔助程式 | 遠端/本機媒體載入輔助程式 | | `plugin-sdk/zod` | Zod 重新匯出 | 重新匯出 `zod` 給外掛程式 SDK 消費者使用 | |
  `plugin-sdk/memory-core` | 隨附的 memory-core 輔助程式 | 記憶體管理員/配置/檔案/CLI 輔助程式介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體引擎執行階段外觀 | 記憶體索引/搜尋執行階段外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎 | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機內嵌引擎 | 記憶體主機內嵌引擎匯出 | |
  `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎 | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎 | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態輔助程式 | 記憶體主機多模態輔助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢輔助程式 | 記憶體主機查詢輔助程式 | |
  `plugin-sdk/memory-core-host-secret` | 記憶體主機祕密輔助程式 | 記憶體主機祕密輔助程式 | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態輔助程式 | 記憶體主機狀態輔助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行階段 | 記憶體主機 CLI 執行階段輔助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行階段 | 記憶體主機核心執行階段輔助程式 | |
  `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行階段輔助程式 | 記憶體主機檔案/執行階段輔助程式 | | `plugin-sdk/memory-lancedb` | 隨附的 memory-lancedb 輔助程式 | Memory-lancedb 輔助程式介面 | | `plugin-sdk/testing` | 測試公用程式 | 測試輔助程式和模擬物件 |
</Accordion>

此表格刻意為常見的遷移子集，而非完整的 SDK 表面。完整的 200 多個進入點列表位於 `scripts/lib/plugin-sdk-entrypoints.json`。

該列表仍包含一些 bundled-plugin helper seams，例如 `plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。這些項目仍然為 bundled-plugin 的維護和相容性而匯出，但它們刻意從常見遷移表格中省略，並不是新外掛程式碼的建議目標。

相同的規則也適用於其他 bundled-helper 系列團體，例如：

- 瀏覽器支援輔助程式：`plugin-sdk/browser-cdp`、`plugin-sdk/browser-config-runtime`、`plugin-sdk/browser-config-support`、`plugin-sdk/browser-control-auth`、`plugin-sdk/browser-node-runtime`、`plugin-sdk/browser-profiles`、`plugin-sdk/browser-security-runtime`、`plugin-sdk/browser-setup-tools`、`plugin-sdk/browser-support`
- Matrix：`plugin-sdk/matrix*`
- LINE：`plugin-sdk/line*`
- IRC：`plugin-sdk/irc*`
- bundled helper/plugin surfaces，例如 `plugin-sdk/googlechat`、
  `plugin-sdk/zalouser`、`plugin-sdk/bluebubbles*`、
  `plugin-sdk/mattermost*`、`plugin-sdk/msteams`、
  `plugin-sdk/nextcloud-talk`、`plugin-sdk/nostr`、`plugin-sdk/tlon`、
  `plugin-sdk/twitch`、
  `plugin-sdk/github-copilot-login`、`plugin-sdk/github-copilot-token`、
  `plugin-sdk/diagnostics-otel`、`plugin-sdk/diffs`、`plugin-sdk/llm-task`、
  `plugin-sdk/thread-ownership` 和 `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` 目前公開狹窄的 token-helper 表面 `DEFAULT_COPILOT_API_BASE_URL`、
`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken`。

請使用符合任務最狹窄的匯入。如果您找不到匯出項目，請檢查 `src/plugin-sdk/` 中的來源或在 Discord 上詢問。

## 移除時間表

| 時間               | 發生情況                                           |
| ------------------ | -------------------------------------------------- |
| **現在**           | 已棄用的表面會發出執行階段警告                     |
| **下一個主要版本** | 已棄用的介面將被移除；仍使用它們的外掛程式將會失敗 |

所有核心外掛程式已經完成遷移。外部外掛程式應在下一次主要版本發布前完成遷移。

## 暫時隱藏警告

在進行遷移作業時，請設定這些環境變數：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

這只是一個臨時的應變措施，並非永久解決方案。

## 相關連結

- [快速入門](/en/plugins/building-plugins) — 建構您的第一個外掛程式
- [SDK 概覽](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [頻道外掛程式](/en/plugins/sdk-channel-plugins) — 建構頻道外掛程式
- [提供者外掛程式](/en/plugins/sdk-provider-plugins) — 建構提供者外掛程式
- [外掛程式內部運作](/en/plugins/architecture) — 架構深度解析
- [外掛程式清單](/en/plugins/manifest) — 清單架構參考
