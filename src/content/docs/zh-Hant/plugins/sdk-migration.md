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

  <Step title="建置並測試">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 匯入路徑參考

<Accordion title="通用匯入路徑表">
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準插件輔助入口 | `definePluginEntry` | | `plugin-sdk/core` | 用於頻道入口定義/建構器的舊版統一重新匯出 | `defineChannelPluginEntry`, `createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置架構匯出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 單一提供者入口輔助 | `defineSingleProviderPluginEntry`
  | | `plugin-sdk/channel-core` | 專注的頻道入口定義和建構器 | `defineChannelPluginEntry`, `defineSetupPluginEntry`, `createChatChannelPlugin`, `createChannelPluginBase` | | `plugin-sdk/setup` | 共用設定精靈輔助 | 允許清單提示、設定狀態建構器 | | `plugin-sdk/setup-runtime` | 設定階段執行時輔助 | 安全匯入的設定修補介面卡、查閱記事輔助、`promptResolvedAllowFrom`、`splitSetupEntries`、委派設定代理 |
  | `plugin-sdk/setup-adapter-runtime` | 設定介面卡輔助 | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | 設定工具輔助 | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` | | `plugin-sdk/account-core` | 多帳號輔助 | 帳號清單/配置/動作閘道輔助 | | `plugin-sdk/account-id` | 帳號 ID 輔助 | `DEFAULT_ACCOUNT_ID`、帳號 ID
  正規化 | | `plugin-sdk/account-resolution` | 帳號查閱輔助 | 帳號查閱 + 預設後援輔助 | | `plugin-sdk/account-helpers` | 狹義帳號輔助 | 帳號清單/帳號動作輔助 | | `plugin-sdk/channel-setup` | 設定精靈介面卡 | `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，加上
  `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` | | `plugin-sdk/channel-pairing` | DM 配對原語 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回覆前綴 + 輸入佈線 | `createChannelReplyPipeline` | | `plugin-sdk/channel-config-helpers` | 配置介面卡工廠 | `createHybridChannelConfigAdapter` | |
  `plugin-sdk/channel-config-schema` | 配置架構建構器 | 頻道配置架構類型 | | `plugin-sdk/telegram-command-config` | Telegram 指令配置輔助 | 指令名稱正規化、描述修剪、重複/衝突驗證 | | `plugin-sdk/channel-policy` | 群組/DM 原則解析 | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 帳號狀態和草稿串流生命週期輔助 | `createAccountStatusSink`、草稿預覽最終化輔助 | |
  `plugin-sdk/inbound-envelope` | 進行信封輔助 | 共用路由 + 信封建構器輔助 | | `plugin-sdk/inbound-reply-dispatch` | 進行回覆輔助 | 共用記錄與分派輔助 | | `plugin-sdk/messaging-targets` | 訊息目標解析 | 目標解析/比對輔助 | | `plugin-sdk/outbound-media` | 傳出媒體輔助 | 共用傳出媒體載入 | | `plugin-sdk/outbound-runtime` | 傳出執行時輔助 | 傳出身分/傳送委派和負載規劃輔助 | |
  `plugin-sdk/thread-bindings-runtime` | 執行緒綁定輔助 | 執行緒綁定生命週期和介面卡輔助 | | `plugin-sdk/agent-media-payload` | 舊版媒體負載輔助 | 用於舊版欄位配置的代理媒體負載建構器 | | `plugin-sdk/channel-runtime` | 已棄用的相容性填充層 | 僅限舊版頻道執行時公用程式 | | `plugin-sdk/channel-send-result` | 傳送結果類型 | 回覆結果類型 | | `plugin-sdk/runtime-store` | 持續性插件儲存 |
  `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 廣義執行時輔助 | 執行時/日誌/備份/插件安裝輔助 | | `plugin-sdk/runtime-env` | 狹義執行時環境輔助 | 紀錄器/執行時環境、逾時、重試和退避輔助 | | `plugin-sdk/plugin-runtime` | 共用插件執行時輔助 | 插件指令/攔截器/HTTP/互動式輔助 | | `plugin-sdk/hook-runtime` | 攔截器管線輔助 | 共用 Webhook/內部攔截器管線輔助 | | `plugin-sdk/lazy-runtime` |
  延遲執行時輔助 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 程序輔助 | 共用執行輔助 | | `plugin-sdk/cli-runtime` | CLI 執行時輔助 | 指令格式化、等待、版本輔助 | | `plugin-sdk/gateway-runtime` | 閘道輔助 | 閘道用戶端和頻道狀態修補輔助 | |
  `plugin-sdk/config-runtime` | 配置輔助 | 配置載入/寫入輔助 | | `plugin-sdk/telegram-command-config` | Telegram 指令輔助 | 當內建的 Telegram 合約介面無法使用時，提供具有後援穩定性的 Telegram 指令驗證輔助 | | `plugin-sdk/approval-runtime` | 核准提示輔助 | 執行/插件核准負載、核准功能/設定檔輔助、原生核准路由/執行時輔助 | | `plugin-sdk/approval-auth-runtime` | 核准驗證輔助 |
  核准者解析、相同聊天動作驗證 | | `plugin-sdk/approval-client-runtime` | 核准用戶端輔助 | 原生執行核准設定檔/篩選輔助 | | `plugin-sdk/approval-delivery-runtime` | 核准傳遞輔助 | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 核准閘道輔助 | 共用核准閘道解析輔助 | | `plugin-sdk/approval-handler-adapter-runtime` | 核准介面卡輔助 | 用於熱頻道入口點的輕量級原生核准介面卡載入輔助 |
  | `plugin-sdk/approval-handler-runtime` | 核准處理程式輔助 | 更廣泛的核准處理程式執行時輔助；當介面卡/閘道縫隙足夠時，優先使用它們 | | `plugin-sdk/approval-native-runtime` | 核准目標輔助 | 原生核准目標/帳號綁定輔助 | | `plugin-sdk/approval-reply-runtime` | 核准回覆輔助 | 執行/插件核准回覆負載輔助 | | `plugin-sdk/channel-runtime-context` | 頻道執行時內容輔助 | 通用頻道執行時內容註冊/取得/監看輔助
  | | `plugin-sdk/security-runtime` | 安全性輔助 | 共用信任、DM 閘道、外部內容和機密收集輔助 | | `plugin-sdk/ssrf-policy` | SSRF 原則輔助 | 主機允許清單和私人網路原則輔助 | | `plugin-sdk/ssrf-runtime` | SSRF 執行時輔助 | 釘選分派器、防護擷取、SSRF 原則輔助 | | `plugin-sdk/collection-runtime` | 有界快取輔助 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` | 診斷閘道輔助 |
  `isDiagnosticFlagEnabled`、`isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 錯誤格式化輔助 | `formatUncaughtError`、`isApprovalNotFoundError`、錯誤圖輔助 | | `plugin-sdk/fetch-runtime` | 包裝的擷取/代理輔助 | `resolveFetch`、代理輔助 | | `plugin-sdk/host-runtime` | 主機正規化輔助 | `normalizeHostname`、`normalizeScpRemoteHost` | | `plugin-sdk/retry-runtime` | 重試輔助 |
  `RetryConfig`、`retryAsync`、原則執行器 | | `plugin-sdk/allow-from` | 允許清單格式化 | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | 允許清單輸入對應 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘道和指令介面輔助 | `resolveControlCommandGate`、傳送者驗證輔助、指令註冊表輔助 | | `plugin-sdk/command-status` | 指令狀態/說明渲染器 |
  `buildCommandsMessage`、`buildCommandsMessagePaginated`、`buildHelpMessage` | | `plugin-sdk/secret-input` | 機密輸入解析 | 機密輸入輔助 | | `plugin-sdk/webhook-ingress` | Webhook 要求輔助 | Webhook 目標公用程式 | | `plugin-sdk/webhook-request-guards` | Webhook 內文防護輔助 | 要求內文讀取/限制輔助 | | `plugin-sdk/reply-runtime` | 共用回覆執行時 | 進行分派、心跳、回覆規劃、區塊分割 | |
  `plugin-sdk/reply-dispatch-runtime` | 狹義回覆分派輔助 | 最終化 + 提供者分派輔助 | | `plugin-sdk/reply-history` | 回覆歷程輔助 | `buildHistoryContext`、`buildPendingHistoryContextFromMap`、`recordPendingHistoryEntry`、`clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回覆參考規劃 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回覆區塊輔助 | 文字/Markdown
  區塊分割輔助 | | `plugin-sdk/session-store-runtime` | 工作階段儲存輔助 | 儲存路徑 + 更新時間輔助 | | `plugin-sdk/state-paths` | 狀態路徑輔助 | 狀態和 OAuth 目錄輔助 | | `plugin-sdk/routing` | 路由/工作階段金鑰輔助 | `resolveAgentRoute`、`buildAgentSessionKey`、`resolveDefaultAgentBoundAccountId`、工作階段金鑰正規化輔助 | | `plugin-sdk/status-helpers` | 頻道狀態輔助 |
  頻道/帳號狀態摘要建構器、執行時狀態預設值、問題中繼資料輔助 | | `plugin-sdk/target-resolver-runtime` | 目標解析器輔助 | 共用目標解析器輔助 | | `plugin-sdk/string-normalization-runtime` | 字串正規化輔助 | Slug/字串正規化輔助 | | `plugin-sdk/request-url` | 要求 URL 輔助 | 從類似要求的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令輔助 | 具有正規化 stdout/stderr 的計時指令執行器 | |
  `plugin-sdk/param-readers` | 參數讀取器 | 通用工具/CLI 參數讀取器 | | `plugin-sdk/tool-payload` | 工具負載擷取 | 從工具結果物件中擷取正規化的負載 | | `plugin-sdk/tool-send` | 工具傳送擷取 | 從工具參數中擷取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 暫存路徑輔助 | 共用暫存下載路徑輔助 | | `plugin-sdk/logging-core` | 紀錄輔助 | 子系統紀錄器和編修輔助 | | `plugin-sdk/markdown-table-runtime` |
  Markdown 表格輔助 | Markdown 表格模式輔助 | | `plugin-sdk/reply-payload` | 訊息回覆類型 | 回覆負載類型 | | `plugin-sdk/provider-setup` | 精選的本機/自我託管提供者設定輔助 | 自我託管提供者探索/配置輔助 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容自我託管提供者設定輔助 | 相同的自我託管提供者探索/配置輔助 | | `plugin-sdk/provider-auth-runtime` | 提供者執行時驗證輔助 | 執行時 API
  金鑰解析輔助 | | `plugin-sdk/provider-auth-api-key` | 提供者 API 金鑰設定輔助 | API 金鑰上架/設定檔寫入輔助 | | `plugin-sdk/provider-auth-result` | 提供者驗證結果輔助 | 標準 OAuth 驗證結果建構器 | | `plugin-sdk/provider-auth-login` | 提供者互動式登入輔助 | 共用互動式登入輔助 | | `plugin-sdk/provider-env-vars` | 提供者環境變數輔助 | 提供者驗證環境變數查閱輔助 | |
  `plugin-sdk/provider-model-shared` | 共用提供者模型/重播輔助 | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重播原則建構器、提供者端點輔助和模型 ID 正規化輔助 | | `plugin-sdk/provider-catalog-shared` | 共用提供者目錄輔助 |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 提供者上架修補程式 | 上架配置輔助 | | `plugin-sdk/provider-http` | 提供者 HTTP 輔助 | 通用提供者 HTTP/端點功能輔助，包括音訊轉錄多部分表單輔助 | | `plugin-sdk/provider-web-fetch` | 提供者 Web 擷取輔助 | Web
  擷取提供者註冊/快取輔助 | | `plugin-sdk/provider-web-search-config-contract` | 提供者 Web 搜尋配置輔助 | 針對不需要插件啟用佈線的提供者，提供狹義的 Web 搜尋配置/憑證輔助 | | `plugin-sdk/provider-web-search-contract` | 提供者 Web 搜尋合約輔助 | 狹義的 Web 搜尋配置/憑證合約輔助，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig`，以及範圍憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | 提供者 Web 搜尋輔助 | Web 搜尋提供者註冊/快取/執行時輔助 | | `plugin-sdk/provider-tools` | 提供者工具/架構相容輔助 | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 架構清理 + 診斷，以及 xAI
  相容輔助，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | 提供者使用量輔助 | `fetchClaudeUsage`、`fetchGeminiUsage`、`fetchGithubCopilotUsage`，以及其他提供者使用量輔助 | | `plugin-sdk/provider-stream` | 提供者串流包裝函式輔助 | `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝函式類型，以及共用
  Anthropic/Bedrock/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝函式輔助 | | `plugin-sdk/provider-transport-runtime` | 提供者傳輸輔助 | 原生提供者傳輸輔助，例如防護擷取、傳輸訊息轉換和可寫入傳輸事件串流 | | `plugin-sdk/keyed-async-queue` | 排序的非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共用媒體輔助 | 媒體擷取/轉換/儲存輔助加上媒體負載建構器 | |
  `plugin-sdk/media-generation-runtime` | 共用媒體生成輔助 | 用於影像/影片/音樂生成的共用故障轉移輔助、候選選取和遺失模型訊息傳遞 | | `plugin-sdk/media-understanding` | 媒體理解輔助 | 媒體理解提供者類型加上提供者面向的影像/音訊輔助匯出 | | `plugin-sdk/text-runtime` | 共用文字輔助 | 助理可見文字剝離、Markdown 渲染/區塊分割/表格輔助、編修輔助、指令標籤輔助、安全文字公用程式，以及相關的文字/紀錄輔助
  | | `plugin-sdk/text-chunking` | 文字區塊分割輔助 | 傳出文字區塊分割輔助 | | `plugin-sdk/speech` | 語音輔助 | 語音提供者類型加上提供者面向的指令、註冊表和驗證輔助 | | `plugin-sdk/speech-core` | 共用語音核心 | 語音提供者類型、註冊表、指令、正規化 | | `plugin-sdk/realtime-transcription` | 即時轉錄輔助 | 提供者類型、註冊表輔助和共用 WebSocket 工作階段輔助 | | `plugin-sdk/realtime-voice` |
  即時語音輔助 | 提供者類型和註冊表輔助 | | `plugin-sdk/image-generation-core` | 共用影像生成核心 | 影像生成類型、故障轉移、驗證和註冊表輔助 | | `plugin-sdk/music-generation` | 音樂生成輔助 | 音樂生成提供者/要求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂生成核心 | 音樂生成類型、故障轉移輔助、提供者查閱和模型參考解析 | | `plugin-sdk/video-generation` | 影片生成輔助 |
  影片生成提供者/要求/結果類型 | | `plugin-sdk/video-generation-core` | 共用影片生成核心 | 影片生成類型、故障轉移輔助、提供者查閱和模型參考解析 | | `plugin-sdk/interactive-runtime` | 互動式回覆輔助 | 互動式回覆負載正規化/簡化 | | `plugin-sdk/channel-config-primitives` | 頻道配置原語 | 狹義頻道配置架構原語 | | `plugin-sdk/channel-config-writes` | 頻道配置寫入輔助 | 頻道配置寫入驗證輔助 | |
  `plugin-sdk/channel-plugin-common` | 共用頻道前奏 | 共用頻道插件前奏匯出 | | `plugin-sdk/channel-status` | 頻道狀態輔助 | 共用頻道狀態快照/摘要輔助 | | `plugin-sdk/allowlist-config-edit` | 允許清單配置輔助 | 允許清單配置編輯/讀取輔助 | | `plugin-sdk/group-access` | 群組存取輔助 | 共用群組存取決策輔助 | | `plugin-sdk/direct-dm` | 直接 DM 輔助 | 共用直接 DM 驗證/防護輔助 | |
  `plugin-sdk/extension-shared` | 共用擴充功能輔助 | 被動頻道/狀態和環境代理輔助原語 | | `plugin-sdk/webhook-targets` | Webhook 目標輔助 | Webhook 目標註冊表和路由安裝輔助 | | `plugin-sdk/webhook-path` | Webhook 路徑輔助 | Webhook 路徑正規化輔助 | | `plugin-sdk/web-media` | 共用 Web 媒體輔助 | 遠端/本機媒體載入輔助 | | `plugin-sdk/zod` | Zod 重新匯出 | 針對插件 SDK 使用者的重新匯出 `zod` | |
  `plugin-sdk/memory-core` | 捆綁的記憶體核心輔助 | 記憶體管理器/配置/檔案/CLI 輔助介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體引擎執行時外觀 | 記憶體索引/搜尋執行時外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎 | 記憶體主機基礎引擎匯出 | | `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機嵌入引擎 |
  記憶體嵌入合約、註冊表存取、本機提供者和通用批次/遠端輔助；具體的遠端提供者位於其擁有的插件中 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎 | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎 | 記憶體主機儲存引擎匯出 | | `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態輔助 | 記憶體主機多模態輔助 | |
  `plugin-sdk/memory-core-host-query` | 記憶體主機查詢輔助 | 記憶體主機查詢輔助 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機機密輔助 | 記憶體主機機密輔助 | | `plugin-sdk/memory-core-host-events` | 記憶體主機事件日誌輔助 | 記憶體主機事件日誌輔助 | | `plugin-sdk/memory-core-host-status` | 記憶體主機狀態輔助 | 記憶體主機狀態輔助 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI
  執行時 | 記憶體主機 CLI 執行時輔助 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時 | 記憶體主機核心執行時輔助 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時輔助 | 記憶體主機檔案/執行時輔助 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行時別名 | 記憶體主機核心執行時輔助的廠商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌別名
  | 記憶體主機事件日誌輔助的廠商中立別名 | | `plugin-sdk/memory-host-files` | 記憶體主機檔案/執行時別名 | 記憶體主機檔案/執行時輔助的廠商中立別名 | | `plugin-sdk/memory-host-markdown` | 受控 Markdown 輔助 | 針對記憶體相關插件的共用受控 Markdown 輔助 | | `plugin-sdk/memory-host-search` | 主動記憶體搜尋外觀 | 延遲主動記憶體搜尋管理員執行時外觀 | | `plugin-sdk/memory-host-status` | 記憶體主機狀態別名
  | 記憶體主機狀態輔助的廠商中立別名 | | `plugin-sdk/memory-lancedb` | 捆綁的記憶體 lancedb 輔助 | 記憶體 lancedb 輔助介面 | | `plugin-sdk/testing` | 測試公用程式 | 測試輔助和模擬物件 |
</Accordion>

此表格刻意僅列出常見的遷移子集，而非完整的 SDK 表面。包含 200 多個進入點的完整清單位於 `scripts/lib/plugin-sdk-entrypoints.json`。

該清單仍包含一些內建外掛程式的輔助縫隙，例如 `plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。這些項目為了內建外掛程式的維護與相容性而保留匯出，但刻意從常見遷移表格中省略，並非新外掛程式碼的建議目標。

相同的規則適用於其他 bundled-helper 系列，例如：

- 瀏覽器支援輔助程式：`plugin-sdk/browser-cdp`、`plugin-sdk/browser-config-runtime`、`plugin-sdk/browser-config-support`、`plugin-sdk/browser-control-auth`、`plugin-sdk/browser-node-runtime`、`plugin-sdk/browser-profiles`、`plugin-sdk/browser-security-runtime`、`plugin-sdk/browser-setup-tools`、`plugin-sdk/browser-support`
- Matrix：`plugin-sdk/matrix*`
- LINE：`plugin-sdk/line*`
- IRC：`plugin-sdk/irc*`
- 內建輔助程式/外掛程式表面，例如 `plugin-sdk/googlechat`、
  `plugin-sdk/zalouser`、`plugin-sdk/bluebubbles*`、
  `plugin-sdk/mattermost*`、`plugin-sdk/msteams`、
  `plugin-sdk/nextcloud-talk`、`plugin-sdk/nostr`、`plugin-sdk/tlon`、
  `plugin-sdk/twitch`、
  `plugin-sdk/github-copilot-login`、`plugin-sdk/github-copilot-token`、
  `plugin-sdk/diagnostics-otel`、`plugin-sdk/diffs`、`plugin-sdk/llm-task`、
  `plugin-sdk/thread-ownership` 和 `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` 目前公開了狹隘的 token-helper
表面 `DEFAULT_COPILOT_API_BASE_URL`、
`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken`。

請使用符合工作需求的最狹隘匯入。如果您找不到匯出項目，請查看 `src/plugin-sdk/` 的原始碼或在 Discord 中發問。

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

- [開始使用](/zh-Hant/plugins/building-plugins) — 建構您的第一個外掛程式
- [SDK 概覽](/zh-Hant/plugins/sdk-overview) — 完整的子路徑匯入參考
- [頻道外掛程式](/zh-Hant/plugins/sdk-channel-plugins) — 建置頻道外掛程式
- [提供者外掛程式](/zh-Hant/plugins/sdk-provider-plugins) — 建置提供者外掛程式
- [Plugin Internals](/zh-Hant/plugins/architecture) — 架構深入解析
- [外掛程式資訊清單](/zh-Hant/plugins/manifest) — 資訊清單架構參考
