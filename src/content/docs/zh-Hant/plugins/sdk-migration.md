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

- **`openclaw/plugin-sdk/compat`** — 重新導出數十個
  幫助程式的單一匯入。引入它是為了讓較舊的基於掛鉤的插件在構建
  新插件架構時繼續運作。
- **`openclaw/extension-api`** — 一座橋樑，讓插件可以直接存取
  主機端幫助程式，例如嵌入式代理程式執行器。

這兩個平台現已**棄用**。它們在運行時仍然有效，但新插件絕不能使用它們，現有插件應在下一次主要版本將其移除之前進行遷移。

<Warning>向下相容層將在未來的主要版本中被移除。 屆時，仍從這些介面匯入的外掛程式將會中斷運作。</Warning>

## 為何做出此變更

舊的方法導致了以下問題：

- **啟動緩慢** — 匯入一個輔助函數會加載數十個無關的模組
- **循環相依** — 廣泛的重新匯出使得很容易建立匯入循環
- **API 介面不明確** — 無法區分哪些匯出項是穩定的，哪些是內部的

現代插件 SDK 解決了這個問題：每個匯入路徑 (`openclaw/plugin-sdk/\<subpath\>`)
都是一個小型的、自包含的模組，具有明確的目的和已記錄的合約。

針對捆綁通道的舊版提供者便捷縫線也已消失。諸如 `openclaw/plugin-sdk/slack`、`openclaw/plugin-sdk/discord`、
`openclaw/plugin-sdk/signal`、`openclaw/plugin-sdk/whatsapp`、
通道品牌幫助程式縫線以及
`openclaw/plugin-sdk/telegram-core` 等匯入都是私有的單一存放庫捷徑，並非
穩定的插件合約。請改用狹隘的通用 SDK 子路徑。在
捆綁的插件工作區內，請將提供者擁有的幫助程式保留在該插件自己的
`api.ts` 或 `runtime-api.ts` 中。

目前的打包提供者範例：

- Anthropic 將 Claude 特定的串流幫助程式保留在其自己的 `api.ts` /
  `contract-api.ts` 縫線中
- OpenAI 將提供者建構器、預設模型幫助程式和即時提供者
  建構器保留在其自己的 `api.ts` 中
- OpenRouter 將提供者建構器以及上架/設定幫助程式保留在其自己的
  `api.ts` 中

## 如何遷移

<Steps>
  <Step title="將原生審核處理程式遷移至功能事實">
    具備審核功能的頻道外掛現在透過 `approvalCapability.nativeRuntime` 加上共享的執行時間環境註冊表來公開原生審核行為。

    主要變更：

    - 將 `approvalCapability.handler.loadRuntime(...)` 取換為
      `approvalCapability.nativeRuntime`
    - 將特定於審核的授權/傳遞從舊版 `plugin.auth` /
      `plugin.approvals` 接線移至 `approvalCapability` 上
    - `ChannelPlugin.approvals` 已從公開頻道外掛合約中移除；將傳遞/原生/渲染欄位移至 `approvalCapability` 上
    - `plugin.auth` 僅保留用於頻道登入/登出流程；核心不再讀取該處的審核授權掛鉤
    - 透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊頻道擁有的執行時間物件，例如用戶端、權杖或 Bolt 應用程式
    - 請勿從原生審核處理程式發送外掛擁有的重新路由通知；核心現在擁有來自實際傳遞結果的已路由至他處通知
    - 當將 `channelRuntime` 傳入 `createChannelManager(...)` 時，請提供
      真實的 `createPluginRuntime().channel` 介面。部分存根會被拒絕。

    請參閱 `/plugins/sdk-channel-plugins` 以取得目前的審核功能佈局。

  </Step>

  <Step title="審查 Windows 包裝函式後援行為">
    如果您的外掛使用 `openclaw/plugin-sdk/windows-spawn`，除非您明確傳遞
    `allowShellFallback: true`，否則未解析的 Windows
    `.cmd`/`.bat` 包裝函式現在將以封閉方式失敗。

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

    如果您的呼叫者並非刻意依賴殼層後援，請勿設定
    `allowShellFallback`，改為處理擲回的錯誤。

  </Step>

  <Step title="尋找已棄用的匯入">
    在您的外掛中搜尋來自任一已棄用介面的匯入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="以專用匯入取代">
    舊版介面匯出的每個項目都對應到一個特定的現代匯入路徑：

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

    對於主機端輔助函數，請使用注入的外掛程式執行時，而不是直接匯入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    相同的模式也適用於其他舊版橋接輔助函數：

    | 舊版匯入 | 現代等價項目 |
    | --- | --- |
    | `resolveAgentDir` | `api.runtime.agent.resolveAgentDir` |
    | `resolveAgentWorkspaceDir` | `api.runtime.agent.resolveAgentWorkspaceDir` |
    | `resolveAgentIdentity` | `api.runtime.agent.resolveAgentIdentity` |
    | `resolveThinkingDefault` | `api.runtime.agent.resolveThinkingDefault` |
    | `resolveAgentTimeoutMs` | `api.runtime.agent.resolveAgentTimeoutMs` |
    | `ensureAgentWorkspace` | `api.runtime.agent.ensureAgentWorkspace` |
    | session store helpers | `api.runtime.agent.session.*` |

  </Step>

  <Step title="建構並測試">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 匯入路徑參考

<Accordion title="常見匯入路徑表">
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準外掛程式輔助程式 | `definePluginEntry` | | `plugin-sdk/core` | 舊版通道條目定義/建置器的統一重新匯出 | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置架構匯出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 單一供應商條目輔助程式 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 專注的通道條目定義和建置器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | 共用設定精靈輔助程式 | 允許清單提示、設定狀態建置器 | | `plugin-sdk/setup-runtime` | 設定期間執行階段輔助程式 |
  可安全匯入的設定修補程式介面卡、查找便條輔助程式、`promptResolvedAllowFrom`、`splitSetupEntries`、委派設定代理程式 | | `plugin-sdk/setup-adapter-runtime` | 設定介面卡輔助程式 | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | 設定工具輔助程式 | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` | |
  `plugin-sdk/account-core` | 多帳戶輔助程式 | 帳戶清單/設定/動作閘道輔助程式 | | `plugin-sdk/account-id` | 帳戶 ID 輔助程式 | `DEFAULT_ACCOUNT_ID`、帳戶 ID 正規化 | | `plugin-sdk/account-resolution` | 帳戶查找輔助程式 | 帳戶查找 + 預設後援輔助程式 | | `plugin-sdk/account-helpers` | 狹窄帳戶輔助程式 | 帳戶清單/帳戶動作輔助程式 | | `plugin-sdk/channel-setup` | 設定精靈介面卡 |
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，以及 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` | | `plugin-sdk/channel-pairing` | DM 配對基本元件 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回覆前置詞 + 輸入接線 | `createChannelReplyPipeline` |
  | `plugin-sdk/channel-config-helpers` | 配置介面卡工廠 | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | 配置架構建置器 | 通道配置架構類型 | | `plugin-sdk/telegram-command-config` | Telegram 指令配置輔助程式 | 指令名稱正規化、描述修剪、重複/衝突驗證 | | `plugin-sdk/channel-policy` | 群組/DM 政策解析 | `resolveChannelGroupRequireMention` | |
  `plugin-sdk/channel-lifecycle` | 帳戶狀態追蹤 | `createAccountStatusSink` | | `plugin-sdk/inbound-envelope` | 傳入信封輔助程式 | 共用路由 + 信封建置器輔助程式 | | `plugin-sdk/inbound-reply-dispatch` | 傳入回覆輔助程式 | 共用記錄和分派輔助程式 | | `plugin-sdk/messaging-targets` | 訊息目標解析 | 目標解析/比對輔助程式 | | `plugin-sdk/outbound-media` | 傳出媒體輔助程式 | 共用傳出媒體載入 | |
  `plugin-sdk/outbound-runtime` | 傳出執行階段輔助程式 | 傳出身分/傳送委派輔助程式 | | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結輔助程式 | 執行緒繫結生命週期和介面卡輔助程式 | | `plugin-sdk/agent-media-payload` | 舊版媒體載荷輔助程式 | 用於舊版欄位配置的代理程式媒體載荷建置器 | | `plugin-sdk/channel-runtime` | 已棄用的相容性填充層 | 僅限舊版通道執行階段公用程式 | |
  `plugin-sdk/channel-send-result` | 傳送結果類型 | 回覆結果類型 | | `plugin-sdk/runtime-store` | 持久性外掛程式儲存 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 廣泛執行階段輔助程式 | 執行階段/記錄/備份/外掛程式安裝輔助程式 | | `plugin-sdk/runtime-env` | 狹窄執行階段環境輔助程式 | 記錄器/執行階段環境、逾時、重試和退避輔助程式 | | `plugin-sdk/plugin-runtime` |
  共用外掛程式執行階段輔助程式 | 外掛程式指令/掛勾/HTTP/互動式輔助程式 | | `plugin-sdk/hook-runtime` | 掛勾管線輔助程式 | 共用 Webhook/內部掛勾管線輔助程式 | | `plugin-sdk/lazy-runtime` | 延遲執行階段輔助程式 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` |
  程序輔助程式 | 共用執行輔助程式 | | `plugin-sdk/cli-runtime` | CLI 執行階段輔助程式 | 指令格式化、等待、版本輔助程式 | | `plugin-sdk/gateway-runtime` | 閘道輔助程式 | 閘道用戶端和通道狀態修補輔助程式 | | `plugin-sdk/config-runtime` | 配置輔助程式 | 配置載入/寫入輔助程式 | | `plugin-sdk/telegram-command-config` | Telegram 指令輔助程式 | 當內建的 Telegram 合約介面無法使用時，提供穩定後援的
  Telegram 指令驗證輔助程式 | | `plugin-sdk/approval-runtime` | 核准提示輔助程式 | 執行/外掛程式核准載荷、核准功能/設定檔輔助程式、原生核准路由/執行階段輔助程式 | | `plugin-sdk/approval-auth-runtime` | 核准驗證輔助程式 | 核准者解析、相同聊天動作驗證 | | `plugin-sdk/approval-client-runtime` | 核准用戶端輔助程式 | 原生執行核准設定檔/篩選輔助程式 | | `plugin-sdk/approval-delivery-runtime` |
  核准傳遞輔助程式 | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 核准閘道輔助程式 | 共用核准閘道解析輔助程式 | | `plugin-sdk/approval-handler-adapter-runtime` | 核准介面卡輔助程式 | 用於熱通道進入點的輕量級原生核准介面卡載入輔助程式 | | `plugin-sdk/approval-handler-runtime` | 核准處理程式輔助程式 |
  更廣泛的核准處理程式執行階段輔助程式；當足夠時，優先使用較狹窄的介面卡/閘道接縫 | | `plugin-sdk/approval-native-runtime` | 核准目標輔助程式 | 原生核准目標/帳戶繫結輔助程式 | | `plugin-sdk/approval-reply-runtime` | 核准回覆輔助程式 | 執行/外掛程式核准回覆載荷輔助程式 | | `plugin-sdk/channel-runtime-context` | 通道執行階段內容輔助程式 | 泛型通道執行階段內容註冊/取得/監看輔助程式 | |
  `plugin-sdk/security-runtime` | 安全性輔助程式 | 共用信任、DM 閘道、外部內容和祕密收集輔助程式 | | `plugin-sdk/ssrf-policy` | SSRF 政策輔助程式 | 主機允許清單和私人網路政策輔助程式 | | `plugin-sdk/ssrf-runtime` | SSRF 執行階段輔助程式 | 釘選分派器、受防護擷取、SSRF 政策輔助程式 | | `plugin-sdk/collection-runtime` | 有界快取輔助程式 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` |
  診斷閘道輔助程式 | `isDiagnosticFlagEnabled`、`isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 錯誤格式設定輔助程式 | `formatUncaughtError`、`isApprovalNotFoundError`、錯誤圖形輔助程式 | | `plugin-sdk/fetch-runtime` | 包裝的擷取/代理輔助程式 | `resolveFetch`、代理輔助程式 | | `plugin-sdk/host-runtime` | 主機正規化輔助程式 | `normalizeHostname`、`normalizeScpRemoteHost` | |
  `plugin-sdk/retry-runtime` | 重試輔助程式 | `RetryConfig`、`retryAsync`、政策執行程式 | | `plugin-sdk/allow-from` | 允許清單格式設定 | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | 允許清單輸入對應 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘道和指令介面輔助程式 | `resolveControlCommandGate`、傳送者授權輔助程式、指令登錄輔助程式 | |
  `plugin-sdk/command-status` | 指令狀態/說明轉譯器 | `buildCommandsMessage`、`buildCommandsMessagePaginated`、`buildHelpMessage` | | `plugin-sdk/secret-input` | 祕密輸入解析 | 祕密輸入輔助程式 | | `plugin-sdk/webhook-ingress` | Webhook 要求輔助程式 | Webhook 目標公用程式 | | `plugin-sdk/webhook-request-guards` | Webhook 內文守護輔助程式 | 要求內文讀取/限制輔助程式 | | `plugin-sdk/reply-runtime` |
  共用回覆執行階段 | 傳入分派、心跳、回覆規劃器、分塊 | | `plugin-sdk/reply-dispatch-runtime` | 狹窄回覆分派輔助程式 | 完成 + 供應商分派輔助程式 | | `plugin-sdk/reply-history` | 回覆歷史輔助程式 | `buildHistoryContext`、`buildPendingHistoryContextFromMap`、`recordPendingHistoryEntry`、`clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回覆參考規劃 | `createReplyReferencePlanner` | |
  `plugin-sdk/reply-chunking` | 回覆區塊輔助程式 | 文字/Markdown 分塊輔助程式 | | `plugin-sdk/session-store-runtime` | 工作階段儲存輔助程式 | 儲存路徑 + 更新時間輔助程式 | | `plugin-sdk/state-paths` | 狀態路徑輔助程式 | 狀態和 OAuth 目錄輔助程式 | | `plugin-sdk/routing` | 路由/工作階段金鑰輔助程式 |
  `resolveAgentRoute`、`buildAgentSessionKey`、`resolveDefaultAgentBoundAccountId`、工作階段金鑰正規化輔助程式 | | `plugin-sdk/status-helpers` | 通道狀態輔助程式 | 通道/帳戶狀態摘要建置器、執行階段狀態預設值、問題元資料輔助程式 | | `plugin-sdk/target-resolver-runtime` | 目標解析器輔助程式 | 共用目標解析器輔助程式 | | `plugin-sdk/string-normalization-runtime` | 字串正規化輔助程式 |
  Slug/字串正規化輔助程式 | | `plugin-sdk/request-url` | 要求 URL 輔助程式 | 從類似要求的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令輔助程式 | 具有標準化 stdout/stderr 的計時指令執行程式 | | `plugin-sdk/param-readers` | 參數讀取器 | 常用工具/CLI 參數讀取器 | | `plugin-sdk/tool-payload` | 工具載荷擷取 | 從工具結果物件中擷取標準化載荷 | | `plugin-sdk/tool-send` | 工具傳送擷取 |
  從工具引數中擷取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 暫存路徑輔助程式 | 共用暫存下載路徑輔助程式 | | `plugin-sdk/logging-core` | 記錄輔助程式 | 子系統記錄器和編修輔助程式 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格輔助程式 | Markdown 表格模式輔助程式 | | `plugin-sdk/reply-payload` | 訊息回覆類型 | 回覆載荷類型 | | `plugin-sdk/provider-setup` |
  精選的本機/自我託管供應商設定輔助程式 | 自我託管供應商探索/配置輔助程式 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自我託管供應商設定輔助程式 | 相同的自我託管供應商探索/配置輔助程式 | | `plugin-sdk/provider-auth-runtime` | 供應商執行階段驗證輔助程式 | 執行階段 API 金鑰解析輔助程式 | | `plugin-sdk/provider-auth-api-key` | 供應商 API 金鑰設定輔助程式 | API
  金鑰上架/設定檔寫入輔助程式 | | `plugin-sdk/provider-auth-result` | 供應商驗證結果輔助程式 | 標準 OAuth 驗證結果建置器 | | `plugin-sdk/provider-auth-login` | 供應商互動式登入輔助程式 | 共用互動式登入輔助程式 | | `plugin-sdk/provider-env-vars` | 供應商環境變數輔助程式 | 供應商驗證環境變數查找輔助程式 | | `plugin-sdk/provider-model-shared` | 共用供應商模型/重播輔助程式 |
  `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重播政策建置器、供應商端點輔助程式和模型 ID 正規化輔助程式 | | `plugin-sdk/provider-catalog-shared` | 共用供應商型錄輔助程式 | `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` |
  供應商上架修補程式 | 上架配置輔助程式 | | `plugin-sdk/provider-http` | 供應商 HTTP 輔助程式 | 泛型供應商 HTTP/端點功能輔助程式 | | `plugin-sdk/provider-web-fetch` | 供應商 Web 擷取輔助程式 | Web 擷取供應商註冊/快取輔助程式 | | `plugin-sdk/provider-web-search-config-contract` | 供應商網頁搜尋配置輔助程式 | 針對不需要外掛程式啟用接線的供應商，提供狹隘網頁搜尋配置/憑證輔助程式 | |
  `plugin-sdk/provider-web-search-contract` | 供應商網頁搜尋合約輔助程式 | 狹隘網頁搜尋配置/憑證合約輔助程式，例如 `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和範圍憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | 供應商網頁搜尋輔助程式 | 網頁搜尋供應商註冊/快取/執行階段輔助程式 | | `plugin-sdk/provider-tools` |
  供應商工具/架構相容輔助程式 | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 架構清理 + 診斷，以及 xAI 相容輔助程式，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | 供應商使用量輔助程式 | `fetchClaudeUsage`、`fetchGeminiUsage`、`fetchGithubCopilotUsage` 和其他供應商使用量輔助程式 | | `plugin-sdk/provider-stream` |
  供應商串流包裝函式輔助程式 | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝函式類型，以及共用的 Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝函式輔助程式 | | `plugin-sdk/keyed-async-queue` | 有序非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共用媒體輔助程式 |
  媒體擷取/轉換/儲存輔助程式以及媒體載荷建置器 | | `plugin-sdk/media-generation-runtime` | 共用媒體產生輔助程式 | 共用容錯移轉輔助程式、候選選取，以及用於圖片/影片/音樂產生的遺失模型訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解輔助程式 | 媒體理解供應商類型以及供應商導向的圖片/音訊輔助程式匯出 | | `plugin-sdk/text-runtime` | 共用文字輔助程式 | 助理可見文字剝離、Markdown
  轉譯/分塊/表格輔助程式、編修輔助程式、指令標籤輔助程式、安全文字公用程式和相關文字/記錄輔助程式 | | `plugin-sdk/text-chunking` | 文字分塊輔助程式 | 傳出文字分塊輔助程式 | | `plugin-sdk/speech` | 語音輔助程式 | 語音供應商類型以及供應商導向的指令、登錄和驗證輔助程式 | | `plugin-sdk/speech-core` | 共用語音核心 | 語音供應商類型、登錄、指令、正規化 | | `plugin-sdk/realtime-transcription` |
  即時轉錄輔助程式 | 供應商類型和登錄輔助程式 | | `plugin-sdk/realtime-voice` | 即時語音輔助程式 | 供應商類型和登錄輔助程式 | | `plugin-sdk/image-generation-core` | 共用圖片產生核心 | 圖片產生類型、容錯移轉、驗證和登錄輔助程式 | | `plugin-sdk/music-generation` | 音樂產生輔助程式 | 音樂產生供應商/要求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂產生核心 |
  音樂產生類型、容錯移轉輔助程式、供應商查找和模型參照解析 | | `plugin-sdk/video-generation` | 影片產生輔助程式 | 影片產生供應商/要求/結果類型 | | `plugin-sdk/video-generation-core` | 共用影片產生核心 | 影片產生類型、容錯移轉輔助程式、供應商查找和模型參照解析 | | `plugin-sdk/interactive-runtime` | 互動式回覆輔助程式 | 互動式回覆載荷正規化/縮減 | | `plugin-sdk/channel-config-primitives` |
  通道配置基本元件 | 狹隘通道配置架構基本元件 | | `plugin-sdk/channel-config-writes` | 通道配置寫入輔助程式 | 通道配置寫入授權輔助程式 | | `plugin-sdk/channel-plugin-common` | 共用通道前奏 | 共用通道外掛程式前奏匯出 | | `plugin-sdk/channel-status` | 通道狀態輔助程式 | 共用通道狀態快照/摘要輔助程式 | | `plugin-sdk/allowlist-config-edit` | 允許清單配置輔助程式 | 允許清單配置編輯/讀取輔助程式 | |
  `plugin-sdk/group-access` | 群組存取輔助程式 | 共用群組存取決策輔助程式 | | `plugin-sdk/direct-dm` | 直接 DM 輔助程式 | 共用直接 DM 驗證/守護輔助程式 | | `plugin-sdk/extension-shared` | 共用擴充輔助程式 | 被動通道/狀態和環境代理輔助基本元件 | | `plugin-sdk/webhook-targets` | Webhook 目標輔助程式 | Webhook 目標登錄和路由安裝輔助程式 | | `plugin-sdk/webhook-path` | Webhook 路徑輔助程式 | Webhook
  路徑正規化輔助程式 | | `plugin-sdk/web-media` | 共用 Web 媒體輔助程式 | 遠端/本機媒體載入輔助程式 | | `plugin-sdk/zod` | Zod 重新匯出 | 為外掛程式 SDK 使用者重新匯出的 `zod` | | `plugin-sdk/memory-core` | 內建記憶體核心輔助程式 | 記憶體管理員/配置/檔案/CLI 輔助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體引擎執行階段外觀 | 記憶體索引/搜尋執行階段外觀 | |
  `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎 | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入引擎 | 記憶體主機嵌入引擎匯出 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎 | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎 | 記憶體主機儲存引擎匯出 | |
  `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態輔助程式 | 記憶體主機多模態輔助程式 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢輔助程式 | 記憶體主機查詢輔助程式 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機祕密輔助程式 | 記憶體主機祕密輔助程式 | | `plugin-sdk/memory-core-host-events` | 記憶體主機事件日誌輔助程式 | 記憶體主機事件日誌輔助程式 | |
  `plugin-sdk/memory-core-host-status` | 記憶體主機狀態輔助程式 | 記憶體主機狀態輔助程式 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行階段 | 記憶體主機 CLI 執行階段輔助程式 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行階段 | 記憶體主機核心執行階段輔助程式 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行階段輔助程式 |
  記憶體主機檔案/執行階段輔助程式 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行階段別名 | 記憶體主機核心執行階段輔助程式的廠商中繼別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌別名 | 記憶體主機事件日誌輔助程式的廠商中繼別名 | | `plugin-sdk/memory-host-files` | 記憶體主機檔案/執行階段別名 | 記憶體主機檔案/執行階段輔助程式的廠商中繼別名 | | `plugin-sdk/memory-host-markdown` |
  受控 Markdown 輔助程式 | 用於記憶體相鄰外掛程式的共用受控 Markdown 輔助程式 | | `plugin-sdk/memory-host-search` | 主動記憶體搜尋外觀 | 延遲主動記憶體搜尋管理員執行階段外觀 | | `plugin-sdk/memory-host-status` | 記憶體主機狀態別名 | 記憶體主機狀態輔助程式的廠商中繼別名 | | `plugin-sdk/memory-lancedb` | 內建記憶體 lancedb 輔助程式 | 記憶體 lancedb 輔助介面 | | `plugin-sdk/testing` | 測試公用程式 |
  測試輔助程式和模擬物件 |
</Accordion>

此表格特意列出了常見的遷移子集，而非完整的 SDK
介面。包含 200 多個進入點的完整清單位於
`scripts/lib/plugin-sdk-entrypoints.json`。

該清單仍包含一些內掛輔助接縫，例如
`plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、
`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。這些出於內掛維護和相容性原因仍會匯出，但
刻意從常見遷移表格中省略，並非新掛程式碼的建議目標。

相同的規則適用於其他 bundled-helper 系列，例如：

- 瀏覽器支援輔助程式：`plugin-sdk/browser-cdp`、`plugin-sdk/browser-config-runtime`、`plugin-sdk/browser-config-support`、`plugin-sdk/browser-control-auth`、`plugin-sdk/browser-node-runtime`、`plugin-sdk/browser-profiles`、`plugin-sdk/browser-security-runtime`、`plugin-sdk/browser-setup-tools`、`plugin-sdk/browser-support`
- Matrix：`plugin-sdk/matrix*`
- LINE：`plugin-sdk/line*`
- IRC：`plugin-sdk/irc*`
- 內掛輔助/外掛介面，例如 `plugin-sdk/googlechat`、
  `plugin-sdk/zalouser`、`plugin-sdk/bluebubbles*`、
  `plugin-sdk/mattermost*`、`plugin-sdk/msteams`、
  `plugin-sdk/nextcloud-talk`、`plugin-sdk/nostr`、`plugin-sdk/tlon`、
  `plugin-sdk/twitch`、
  `plugin-sdk/github-copilot-login`、`plugin-sdk/github-copilot-token`、
  `plugin-sdk/diagnostics-otel`、`plugin-sdk/diffs`、`plugin-sdk/llm-task`、
  `plugin-sdk/thread-ownership` 和 `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` 目前公開狹窄的 token-helper
介面 `DEFAULT_COPILOT_API_BASE_URL`、
`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken`。

使用符合作業需求的最狹窄匯入。如果您找不到匯出項目，
請查看 `src/plugin-sdk/` 的原始碼或在 Discord 中發問。

## 移除時間表

| 時間               | 發生什麼事                                         |
| ------------------ | -------------------------------------------------- |
| **現在**           | 已棄用的介面會發出執行階段警告                     |
| **下一個主要版本** | 已棄用的介面將被移除；仍使用它們的外掛程式將會失效 |

所有核心外掛程式都已完成遷移。外部外掛程式應在下一個主要版本發布前完成遷移。

## 暫時隱藏警告

在您進行遷移時，請設定這些環境變數：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

這是一個暫時的應急措施，並非永久解決方案。

## 相關

- [入門指南](/en/plugins/building-plugins) — 建構您的第一個外掛
- [SDK 概覽](/en/plugins/sdk-overview) — 完整的子路徑匯入參考
- [頻道外掛程式](/en/plugins/sdk-channel-plugins) — 建置頻道外掛程式
- [提供者外掛程式](/en/plugins/sdk-provider-plugins) — 建置提供者外掛程式
- [外掛程式內部機制](/en/plugins/architecture) — 架構深度解析
- [外掛程式清單](/en/plugins/manifest) — 清單架構參考
