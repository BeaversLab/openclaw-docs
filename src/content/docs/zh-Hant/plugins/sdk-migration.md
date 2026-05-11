---
summary: "從舊版向後相容層遷移至現代化 Plugin SDK"
title: "Plugin SDK 遷移"
sidebarTitle: "遷移至 SDK"
read_when:
  - You see the OPENCLAW_PLUGIN_SDK_COMPAT_DEPRECATED warning
  - You see the OPENCLAW_EXTENSION_API_DEPRECATED warning
  - You used api.registerEmbeddedExtensionFactory before OpenClaw 2026.4.25
  - You are updating a plugin to the modern plugin architecture
  - You maintain an external OpenClaw plugin
---

OpenClaw 已從廣泛的向後相容層轉移到具有明確、有文件記錄之匯入項的現代化 Plugin 架構。如果您的 Plugin 是在新架構之前建構的，本指南將協助您進行遷移。

## 什麼改變了

舊的 Plugin 系統提供了兩個廣開的介面，讓 Plugin 可以從單一進入點匯入它們需要的任何東西：

- **`openclaw/plugin-sdk/compat`** — 一個單一匯入項，重新匯出了數十個輔助函式。它的引進是為了讓較舊的基於 Hook 的 Plugin 在建構新 Plugin 架構時仍能繼續運作。
- **`openclaw/extension-api`** — 一座橋樑，提供 Plugin 直接存取主機端輔助函式（如嵌入式代理程式執行器）的權限。
- **`api.registerEmbeddedExtensionFactory(...)`** — 一個已移除的僅限 Pi 的內建擴充 Hook，可用來觀察嵌入式執行器事件，例如 `tool_result`。

這些廣泛的匯入介面現已**棄用**。它們在執行時期仍然有效，但新的 Plugin 不得使用它們，且現有 Plugin 應在下一個主要版本將其移除前進行遷移。僅限 Pi 的嵌入式擴充工廠註冊 API 已被移除；請改用工具結果中介軟體。

OpenClaw 不會在引入替代方案的同一變更中移除或重新解讀有文件記錄的 Plugin 行為。破壞性合約變更必須先經過相容性配接器、診斷、文件和棄用期。這適用於 SDK 匯入、清單欄位、設定 API、Hook 和執行時期註冊行為。

<Warning>向後相容層將在未來的主要版本中移除。 屆時，仍從這些介面匯入的 Plugin 將會中斷運作。 僅限 Pi 的嵌入式擴充工廠註冊已無法載入。</Warning>

## 為何進行此變更

舊的方法導致了以下問題：

- **啟動緩慢** — 匯入一個輔助函式會載入數十個無關的模組
- **循環相依** — 廣泛的重新匯出使得建立匯入循環變得容易
- **不清晰的 API 介面** — 無法區分哪些匯出是穩定的，哪些是內部使用的

現代化的 Plugin SDK 解決了這個問題：每個匯入路徑 (`openclaw/plugin-sdk/\<subpath\>`) 都是一個小型、自包含的模組，具有明確的目的和記錄完善的合約。

針對捆套通道的舊版提供者便利縫隙 也已移除。
品牌通道的輔助縫隙是私有的 monorepo 捷徑，並非穩定的 Plugin 合約。請改用狹隘的通用 SDK 子路徑。在捆套 Plugin 工作區內，請將提供者擁有的輔助程式保留在該 Plugin 自己的 `api.ts` 或
`runtime-api.ts` 中。

目前的捆套提供者範例：

- Anthropic 將 Claude 特定的串流輔助程式保留在其自己的 `api.ts` /
  `contract-api.ts` 縫隙中
- OpenAI 將提供者建構器、預設模型輔助程式和即時提供者
  建構器保留在其自己的 `api.ts` 中
- OpenRouter 將提供者建構器以及上線/設定輔助程式保留在其自己的
  `api.ts` 中

## 相容性政策

對於外部 Plugin，相容性工作遵循以下順序：

1. 加入新合約
2. 透過相容性轉接器保持舊行為連線
3. 發出診斷或警告，指出舊路徑和替代方案
4. 在測試中涵蓋兩條路徑
5. 記錄棄用和移轉路徑
6. 僅在公佈的移轉視窗結束後移除，通常是在主要版本中

如果仍然接受清單欄位，Plugin 作者可以繼續使用它，直到
文件和診斷另有說明為止。新程式碼應優先使用記錄的
替代方案，但現有 Plugin 不應在一般的次要版本
更新中中斷。

## 如何移轉

<Steps>
  <Step title="遷移執行時配置載入/寫入輔助程式">
    隨附外掛應停止直接呼叫
    `api.runtime.config.loadConfig()` 和
    `api.runtime.config.writeConfigFile(...)`。應優先使用已傳入至當前呼叫路徑的配置。需要目前程序快照的長期處理常式可以使用 `api.runtime.config.current()`。長期執行的代理程式工具應在 `execute` 內部使用工具上下文的 `ctx.getRuntimeConfig()`，以便在寫入配置之前建立的工具仍能看到重新整理後的執行時配置。

    配置寫入必須透過交易式輔助程式進行，並選擇寫入後策略：

    ```typescript
    await api.runtime.config.mutateConfigFile({
      afterWrite: { mode: "auto" },
      mutate(draft) {
        draft.plugins ??= {};
      },
    });
    ```

    當呼叫者知道變更需要乾淨的閘道重新啟動時，請使用 `afterWrite: { mode: "restart", reason: "..." }`；僅當呼叫者擁有後續處理並刻意想要抑制重新載入計劃程式時，才使用 `afterWrite: { mode: "none", reason: "..." }`。變異結果包含用於測試和記錄的類型化 `followUp` 摘要；閘道仍負責應用或排程重新啟動。`loadConfig` 和 `writeConfigFile` 作為已棄用的相容性輔助程式保留，供遷移期間的外掛外掛使用，並會使用 `runtime-config-load-write` 相容性代碼發出一次警告。隨附外掛和儲存庫執行時程式碼受 `pnpm check:deprecated-internal-config-api` 和 `pnpm check:no-runtime-action-load-config` 中的掃描器防護措施保護：新的生產外掛使用將完全失敗，直接配置寫入將失敗，閘道伺服器方法必須使用請求執行時快照，執行時通道 send/action/client 輔助程式必須從其邊界接收配置，且長期執行的執行時模組不允許任何周圍的 `loadConfig()` 呼叫。

    新的外掛程式碼還應避免匯入廣泛的 `openclaw/plugin-sdk/config-runtime` 相容性統合。請使用符合作業需求的狹窄 SDK 子路徑：

    | 需求 | 匯入 |
    | --- | --- |
    | 配置類型，例如 `OpenClawConfig` | `openclaw/plugin-sdk/config-types` |
    | 已載入的配置斷言和外掛入口配置查找 | `openclaw/plugin-sdk/plugin-config-runtime` |
    | 目前執行時快照讀取 | `openclaw/plugin-sdk/runtime-config-snapshot` |
    | 配置寫入 | `openclaw/plugin-sdk/config-mutation` |
    | 會話儲存輔助程式 | `openclaw/plugin-sdk/session-store-runtime` |
    | Markdown 表格配置 | `openclaw/plugin-sdk/markdown-table-runtime` |
    | 群組原則執行時輔助程式 | `openclaw/plugin-sdk/runtime-group-policy` |
    | 秘密輸入解析 | `openclaw/plugin-sdk/secret-input-runtime` |
    | 模型/會話覆寫 | `openclaw/plugin-sdk/model-session-runtime` |

    隨附外掛及其測試針對廣泛統合進行了掃描器防護，因此匯入和模擬僅限於其所需的行為。廣泛統合仍存在以維持外部相容性，但新程式碼不應依賴它。

  </Step>

  <Step title="將 Pi 工具結果擴充功能遷移至中介軟體">
    隨附外掛程式必須將僅限 Pi 的
    `api.registerEmbeddedExtensionFactory(...)` 工具結果處理常式替換為
    與執行階段無關的中介軟體。

    ```typescript
    // Pi and Codex runtime dynamic tools
    api.registerAgentToolResultMiddleware(async (event) => {
      return compactToolResult(event);
    }, {
      runtimes: ["pi", "codex"],
    });
    ```

    同時更新外掛程式清單：

    ```json
    {
      "contracts": {
        "agentToolResultMiddleware": ["pi", "codex"]
      }
    }
    ```

    外部外掛程式無法註冊工具結果中介軟體，因為它可以在模型看到之前
    重寫高信任度工具輸出。

  </Step>

  <Step title="將 approval-native 處理常式遷移至 capability facts">
    具有審核功能的頻道外掛程式現在透過
    `approvalCapability.nativeRuntime` 以及共用的執行階段內容登錄檔來
    公開原生審核行為。

    主要變更：

    - 將 `approvalCapability.handler.loadRuntime(...)` 替換為
      `approvalCapability.nativeRuntime`
    - 將審核特定的認證/傳遞機制從舊版 `plugin.auth` /
      `plugin.approvals` 連線移至 `approvalCapability`
    - `ChannelPlugin.approvals` 已從公開的頻道外掛程式
      合約中移除；將傳遞/原生/呈現欄位移至 `approvalCapability`
    - `plugin.auth` 僅保留給頻道登入/登出流程；核心
      不再讀取那裡的審核認證勾點
    - 透過 `openclaw/plugin-sdk/channel-runtime-context` 註冊頻道擁有的執行階段物件，例如用戶端、權杖或 Bolt
      應用程式
    - 請勿從原生審核處理常式傳送外掛程式擁有的重新路由通知；
      核心現在擁有來自實際傳遞結果的已路由至其他位置通知
    - 將 `channelRuntime` 傳入 `createChannelManager(...)` 時，提供
      真實的 `createPluginRuntime().channel` 介面。部分存根會被拒絕。

    請參閱 `/plugins/sdk-channel-plugins` 以了解目前的審核功能
    配置。

  </Step>

  <Step title="稽核 Windows 包裝函式後備行為">
    如果您的外掛使用 `openclaw/plugin-sdk/windows-spawn`，未解析的 Windows
    `.cmd`/`.bat` 包裝函式現在會以封閉式失敗，除非您明確傳遞
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

    如果您的呼叫端並非刻意依賴 shell 後備機制，請不要設定
    `allowShellFallback`，改為處理擲回的錯誤。

  </Step>

  <Step title="尋找已淘汰的匯入">
    搜尋您的外掛中來自任一已淘汰介面的匯入：

    ```bash
    grep -r "plugin-sdk/compat" my-plugin/
    grep -r "plugin-sdk/config-runtime" my-plugin/
    grep -r "openclaw/extension-api" my-plugin/
    ```

  </Step>

  <Step title="替換為專注式匯入">
    舊介面匯出的每個項目都對應到特定的現代匯入路徑：

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

    對於主機端協助程式，請使用注入的外掛執行時期，而不是直接匯入：

    ```typescript
    // Before (deprecated extension-api bridge)
    import { runEmbeddedPiAgent } from "openclaw/extension-api";
    const result = await runEmbeddedPiAgent({ sessionId, prompt });

    // After (injected runtime)
    const result = await api.runtime.agent.runEmbeddedPiAgent({ sessionId, prompt });
    ```

    同樣的模式也適用於其他舊版橋接協助程式：

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

  <Step title="建置與測試">
    ```bash
    pnpm build
    pnpm test -- my-plugin/
    ```
  </Step>
</Steps>

## 匯入路徑參考

<Accordion title="常見匯入路徑表">
  | 匯入路徑 | 用途 | 主要匯出 | | --- | --- | --- | | `plugin-sdk/plugin-entry` | 標準外掛程式進入點輔助工具 | `definePluginEntry` | | `plugin-sdk/core` | 用於頻道進入點定義/建構器的舊版統一重新匯出 | `defineChannelPluginEntry`、`createChatChannelPlugin` | | `plugin-sdk/config-schema` | 根配置架構匯出 | `OpenClawSchema` | | `plugin-sdk/provider-entry` | 單一提供者進入點輔助工具 |
  `defineSingleProviderPluginEntry` | | `plugin-sdk/channel-core` | 專注的頻道進入點定義和建構器 | `defineChannelPluginEntry`、`defineSetupPluginEntry`、`createChatChannelPlugin`、`createChannelPluginBase` | | `plugin-sdk/setup` | 共用設定精靈輔助工具 | 允許清單提示、設定狀態建構器 | | `plugin-sdk/setup-runtime` | 設定階段執行時期輔助工具 |
  匯入安全的設定修補程式介面卡、查閱記錄輔助工具、`promptResolvedAllowFrom`、`splitSetupEntries`、委派設定代理程式 | | `plugin-sdk/setup-adapter-runtime` | 設定介面卡輔助工具 | `createEnvPatchedAccountSetupAdapter` | | `plugin-sdk/setup-tools` | 設定工具輔助工具 | `formatCliCommand`、`detectBinary`、`extractArchive`、`resolveBrewExecutable`、`formatDocsLink`、`CONFIG_DIR` | |
  `plugin-sdk/account-core` | 多帳戶輔助工具 | 帳戶清單/配置/操作閘門輔助工具 | | `plugin-sdk/account-id` | 帳戶 ID 輔助工具 | `DEFAULT_ACCOUNT_ID`、帳戶 ID 正規化 | | `plugin-sdk/account-resolution` | 帳戶查閱輔助工具 | 帳戶查閱 + 預設後備輔助工具 | | `plugin-sdk/account-helpers` | 狹窄帳戶輔助工具 | 帳戶清單/帳戶動作輔助工具 | | `plugin-sdk/channel-setup` | 設定精靈介面卡 |
  `createOptionalChannelSetupSurface`、`createOptionalChannelSetupAdapter`、`createOptionalChannelSetupWizard`，加上 `DEFAULT_ACCOUNT_ID`、`createTopLevelChannelDmPolicy`、`setSetupChannelEnabled`、`splitSetupEntries` | | `plugin-sdk/channel-pairing` | DM 配對基本元素 | `createChannelPairingController` | | `plugin-sdk/channel-reply-pipeline` | 回覆前綴 + 輸入連線 | `createChannelReplyPipeline` | |
  `plugin-sdk/channel-config-helpers` | 配置介面卡工廠 | `createHybridChannelConfigAdapter` | | `plugin-sdk/channel-config-schema` | 配置架構建構器 | 僅包含共用頻道配置架構基本元素和通用建構器 | | `plugin-sdk/channel-config-schema-legacy` | 已淘汰的配套配置架構 | 僅限配套相容性；新外掛程式必須定義外掛程式本機架構 | | `plugin-sdk/telegram-command-config` | Telegram 指令配置輔助工具 |
  指令名稱正規化、描述修剪、重複/衝突驗證 | | `plugin-sdk/channel-policy` | 群組/DM 原則解析 | `resolveChannelGroupRequireMention` | | `plugin-sdk/channel-lifecycle` | 帳戶狀態和草稿串流生命週期輔助工具 | `createAccountStatusSink`、草稿預覽最終化輔助工具 | | `plugin-sdk/inbound-envelope` | 進入封套輔助工具 | 共用路由 + 封套建構器輔助工具 | | `plugin-sdk/inbound-reply-dispatch` | 進入回覆輔助工具 |
  共用記錄和分派輔助工具 | | `plugin-sdk/messaging-targets` | 傳訊目標解析 | 目標解析/比對輔助工具 | | `plugin-sdk/outbound-media` | 傳出媒體輔助工具 | 共用傳出媒體載入 | | `plugin-sdk/outbound-send-deps` | 傳出傳送相依性輔助工具 | 輕量級 `resolveOutboundSendDep` 查閱，無須匯入完整傳出執行時期 | | `plugin-sdk/outbound-runtime` | 傳出執行時期輔助工具 |
  傳出傳遞、身分識別/傳送委派、工作階段、格式設定和載荷規劃輔助工具 | | `plugin-sdk/thread-bindings-runtime` | 執行緒繫結輔助工具 | 執行緒繫結生命週期和介面卡輔助工具 | | `plugin-sdk/agent-media-payload` | 舊版媒體載荷輔助工具 | 用於舊版欄位配置的代理程式媒體載荷建構器 | | `plugin-sdk/channel-runtime` | 已淘汰的相容性填充層 | 僅限舊版頻道執行時期公用程式 | | `plugin-sdk/channel-send-result` |
  傳送結果類型 | 回覆結果類型 | | `plugin-sdk/runtime-store` | 持久化外掛程式儲存空間 | `createPluginRuntimeStore` | | `plugin-sdk/runtime` | 廣泛執行時期輔助工具 | 執行時期/記錄/備份/外掛程式安裝輔助工具 | | `plugin-sdk/runtime-env` | 狹窄執行時期環境輔助工具 | 記錄器/執行時期環境、逾時、重試和退避輔助工具 | | `plugin-sdk/plugin-runtime` | 共用外掛程式執行時期輔助工具 |
  外掛程式指令/勾點/HTTP/互動輔助工具 | | `plugin-sdk/hook-runtime` | 勾點管線輔助工具 | 共用 Webhook/內部勾點管線輔助工具 | | `plugin-sdk/lazy-runtime` | 延遲執行時期輔助工具 | `createLazyRuntimeModule`、`createLazyRuntimeMethod`、`createLazyRuntimeMethodBinder`、`createLazyRuntimeNamedExport`、`createLazyRuntimeSurface` | | `plugin-sdk/process-runtime` | 處理程序輔助工具 | 共用執行輔助工具 | |
  `plugin-sdk/cli-runtime` | CLI 執行時期輔助工具 | 指令格式設定、等待、版本輔助工具 | | `plugin-sdk/gateway-runtime` | 閘道輔助工具 | 閘道用戶端和頻道狀態修補輔助工具 | | `plugin-sdk/config-runtime` | 配置輔助工具 | 配置載入/寫入輔助工具 | | `plugin-sdk/telegram-command-config` | Telegram 指令輔助工具 | 當配套的 Telegram 合約介面無法使用時，穩定後備的 Telegram 指令驗證輔助工具 | |
  `plugin-sdk/approval-runtime` | 核准提示輔助工具 | 執行/外掛程式核准載荷、核准功能/設定檔輔助工具、原生核准路由/執行時期輔助工具，以及結構化核准顯示路徑格式設定 | | `plugin-sdk/approval-auth-runtime` | 核准驗證輔助工具 | 核准者解析、相同聊天動作驗證 | | `plugin-sdk/approval-client-runtime` | 核准用戶端輔助工具 | 原生執行核准設定檔/篩選輔助工具 | | `plugin-sdk/approval-delivery-runtime` |
  核准傳遞輔助工具 | 原生核准功能/傳遞介面卡 | | `plugin-sdk/approval-gateway-runtime` | 核准閘道輔助工具 | 共用核准閘道解析輔助工具 | | `plugin-sdk/approval-handler-adapter-runtime` | 核准介面卡輔助工具 | 用於熱頻道進入點的輕量級原生核准介面卡載入輔助工具 | | `plugin-sdk/approval-handler-runtime` | 核准處理程式輔助工具 |
  更廣泛的核准處理程式執行時期輔助工具；當足以應付時，建議使用較狹窄的介面卡/閘道縫隙 | | `plugin-sdk/approval-native-runtime` | 核准目標輔助工具 | 原生核准目標/帳戶繫結輔助工具 | | `plugin-sdk/approval-reply-runtime` | 核准回覆輔助工具 | 執行/外掛程式核准回覆載荷輔助工具 | | `plugin-sdk/channel-runtime-context` | 頻道執行時期內容輔助工具 | 泛型頻道執行時期內容註冊/取得/監看輔助工具 | |
  `plugin-sdk/security-runtime` | 安全性輔助工具 | 共用信任、DM 閘門、外部內容和祕密收集輔助工具 | | `plugin-sdk/ssrf-policy` | SSRF 原則輔助工具 | 主機允許清單和私人網路原則輔助工具 | | `plugin-sdk/ssrf-runtime` | SSRF 執行時期輔助工具 | 釘選分派器、防護擷取、SSRF 原則輔助工具 | | `plugin-sdk/collection-runtime` | 有界快取輔助工具 | `pruneMapToMaxSize` | | `plugin-sdk/diagnostic-runtime` |
  診斷閘門輔助工具 | `isDiagnosticFlagEnabled`、`isDiagnosticsEnabled` | | `plugin-sdk/error-runtime` | 錯誤格式設定輔助工具 | `formatUncaughtError`、`isApprovalNotFoundError`、錯誤圖形輔助工具 | | `plugin-sdk/fetch-runtime` | 包裝的擷取/ Proxy 輔助工具 | `resolveFetch`、Proxy 輔助工具 | | `plugin-sdk/host-runtime` | 主機正規化輔助工具 | `normalizeHostname`、`normalizeScpRemoteHost` | |
  `plugin-sdk/retry-runtime` | 重試輔助工具 | `RetryConfig`、`retryAsync`、原則執行器 | | `plugin-sdk/allow-from` | 允許清單格式設定 | `formatAllowFromLowercase` | | `plugin-sdk/allowlist-resolution` | 允許清單輸入對應 | `mapAllowlistResolutionInputs` | | `plugin-sdk/command-auth` | 指令閘門和指令介面輔助工具 |
  `resolveControlCommandGate`、寄件者授權輔助工具，包含動態引數選單格式設定的指令登錄輔助工具 | | `plugin-sdk/command-status` | 指令狀態/說明轉譯器 | `buildCommandsMessage`、`buildCommandsMessagePaginated`、`buildHelpMessage` | | `plugin-sdk/secret-input` | 祕密輸入解析 | 祕密輸入輔助工具 | | `plugin-sdk/webhook-ingress` | Webhook 要求輔助工具 | Webhook 目標公用程式 | |
  `plugin-sdk/webhook-request-guards` | Webhook 主體防護輔助工具 | 要求主體讀取/限制輔助工具 | | `plugin-sdk/reply-runtime` | 共用回覆執行時期 | 進入分派、心跳、回覆規劃器、分塊 | | `plugin-sdk/reply-dispatch-runtime` | 狹窄回覆分派輔助工具 | 最終化、提供者分派和對話標籤輔助工具 | | `plugin-sdk/reply-history` | 回覆記錄輔助工具 |
  `buildHistoryContext`、`buildPendingHistoryContextFromMap`、`recordPendingHistoryEntry`、`clearHistoryEntriesIfEnabled` | | `plugin-sdk/reply-reference` | 回覆參照規劃 | `createReplyReferencePlanner` | | `plugin-sdk/reply-chunking` | 回覆分塊輔助工具 | 文字/Markdown 分塊輔助工具 | | `plugin-sdk/session-store-runtime` | 工作階段存放區輔助工具 | 存放區路徑 + 更新時間輔助工具 | |
  `plugin-sdk/state-paths` | 狀態路徑輔助工具 | 狀態和 OAuth 目錄輔助工具 | | `plugin-sdk/routing` | 路由/工作階段金鑰輔助工具 | `resolveAgentRoute`、`buildAgentSessionKey`、`resolveDefaultAgentBoundAccountId`、工作階段金鑰正規化輔助工具 | | `plugin-sdk/status-helpers` | 頻道狀態輔助工具 | 頻道/帳戶狀態摘要建構器、執行時期狀態預設值、問題中繼資料輔助工具 | | `plugin-sdk/target-resolver-runtime` |
  目標解析器輔助工具 | 共用目標解析器輔助工具 | | `plugin-sdk/string-normalization-runtime` | 字串正規化輔助工具 | Slug/字串正規化輔助工具 | | `plugin-sdk/request-url` | 要求 URL 輔助工具 | 從要求類似的輸入中擷取字串 URL | | `plugin-sdk/run-command` | 計時指令輔助工具 | 計時指令執行器，具有正規化的標準輸出/標準錯誤 | | `plugin-sdk/param-readers` | 參數讀取器 | 通用工具/CLI 參數讀取器 | |
  `plugin-sdk/tool-payload` | 工具載荷擷取 | 從工具結果物件中擷取正規化的載荷 | | `plugin-sdk/tool-send` | 工具傳送擷取 | 從工具引數中擷取標準傳送目標欄位 | | `plugin-sdk/temp-path` | 暫存路徑輔助工具 | 共用暫存下載路徑輔助工具 | | `plugin-sdk/logging-core` | 記錄輔助工具 | 子系統記錄器和編修輔助工具 | | `plugin-sdk/markdown-table-runtime` | Markdown 表格輔助工具 | Markdown 表格模式輔助工具 | |
  `plugin-sdk/reply-payload` | 訊息回覆類型 | 回覆載荷類型 | | `plugin-sdk/provider-setup` | 精選的本機/託管提供者設定輔助工具 | 託管提供者探索/配置輔助工具 | | `plugin-sdk/self-hosted-provider-setup` | 專注的 OpenAI 相容託管提供者設定輔助工具 | 相同的託管提供者探索/配置輔助工具 | | `plugin-sdk/provider-auth-runtime` | 提供者執行時期驗證輔助工具 | 執行時期 API 金鑰解析輔助工具 | |
  `plugin-sdk/provider-auth-api-key` | 提供者 API 金鑰設定輔助工具 | API 金鑰上架/設定檔寫入輔助工具 | | `plugin-sdk/provider-auth-result` | 提供者驗證結果輔助工具 | 標準 OAuth 驗證結果建構器 | | `plugin-sdk/provider-auth-login` | 提供者互動式登入輔助工具 | 共用互動式登入輔助工具 | | `plugin-sdk/provider-selection-runtime` | 提供者選取輔助工具 | 已設定或自動提供者選取和原始提供者配置合併 | |
  `plugin-sdk/provider-env-vars` | 提供者環境變數輔助工具 | 提供者驗證環境變數查閱輔助工具 | | `plugin-sdk/provider-model-shared` | 共用提供者模型/重播輔助工具 | `ProviderReplayFamily`、`buildProviderReplayFamilyHooks`、`normalizeModelCompat`、共用重播原則建構器、提供者端點輔助工具和模型 ID 正規化輔助工具 | | `plugin-sdk/provider-catalog-shared` | 共用提供者目錄輔助工具 |
  `findCatalogTemplate`、`buildSingleProviderApiKeyCatalog`、`supportsNativeStreamingUsageCompat`、`applyProviderNativeStreamingUsageCompat` | | `plugin-sdk/provider-onboard` | 提供者上架修補程式 | 上架配置輔助工具 | | `plugin-sdk/provider-http` | 提供者 HTTP 輔助工具 | 泛型提供者 HTTP/端點功能輔助工具，包括音訊轉錄多部分表單輔助工具 | | `plugin-sdk/provider-web-fetch` | 提供者網頁擷取輔助工具 |
  網頁擷取提供者註冊/快取輔助工具 | | `plugin-sdk/provider-web-search-config-contract` | 提供者網頁搜尋配置輔助工具 | 針對不需要外掛程式啟用連線的提供者之狹窄網頁搜尋配置/憑證輔助工具 | | `plugin-sdk/provider-web-search-contract` | 提供者網頁搜尋合約輔助工具 | 狹窄網頁搜尋配置/憑證合約輔助工具，例如
  `createWebSearchProviderContractFields`、`enablePluginInConfig`、`resolveProviderWebSearchPluginConfig` 和範圍憑證設定器/取得器 | | `plugin-sdk/provider-web-search` | 提供者網頁搜尋輔助工具 | 網頁搜尋提供者註冊/快取/執行時期輔助工具 | | `plugin-sdk/provider-tools` | 提供者工具/架構相容性輔助工具 | `ProviderToolCompatFamily`、`buildProviderToolCompatFamilyHooks`、Gemini 架構清理 + 診斷，以及 xAI
  相容性輔助工具，例如 `resolveXaiModelCompatPatch` / `applyXaiModelCompat` | | `plugin-sdk/provider-usage` | 提供者使用量輔助工具 | `fetchClaudeUsage`、`fetchGeminiUsage`、`fetchGithubCopilotUsage` 和其他提供者使用量輔助工具 | | `plugin-sdk/provider-stream` | 提供者串流包裝函式輔助工具 |
  `ProviderStreamFamily`、`buildProviderStreamFamilyHooks`、`composeProviderStreamWrappers`、串流包裝函式類型，以及共用的 Anthropic/Bedrock/DeepSeek V4/Google/Kilocode/Moonshot/OpenAI/OpenRouter/Z.A.I/MiniMax/Copilot 包裝函式輔助工具 | | `plugin-sdk/provider-transport-runtime` | 提供者傳輸輔助工具 | 原生提供者傳輸輔助工具，例如防護擷取、傳輸訊息轉換和可寫入傳輸事件串流 | |
  `plugin-sdk/keyed-async-queue` | 已排序的非同步佇列 | `KeyedAsyncQueue` | | `plugin-sdk/media-runtime` | 共用媒體輔助工具 | 媒體擷取/轉換/儲存輔助工具加上媒體載荷建構器 | | `plugin-sdk/media-generation-runtime` | 共用媒體生成輔助工具 | 共用容錯移轉輔助工具、候選選取，以及用於圖片/視訊/音樂生成的遺漏模型傳訊 | | `plugin-sdk/media-understanding` | 媒體理解輔助工具 |
  媒體理解提供者類型加上提供者導向的圖片/音訊輔助工具匯出 | | `plugin-sdk/text-runtime` | 共用文字輔助工具 | 助理可見文字剝除、Markdown 轉譯/分塊/表格輔助工具、編修輔助工具、指示標籤輔助工具、安全文字公用程式，以及相關的文字/記錄輔助工具 | | `plugin-sdk/text-chunking` | 文字分塊輔助工具 | 傳出文字分塊輔助工具 | | `plugin-sdk/speech` | 語音輔助工具 |
  語音提供者類型加上提供者導向的指示、登錄和驗證輔助工具 | | `plugin-sdk/speech-core` | 共用語音核心 | 語音提供者類型、登錄、指示、正規化 | | `plugin-sdk/realtime-transcription` | 即時轉錄輔助工具 | 提供者類型、登錄輔助工具和共用 WebSocket 工作階段輔助工具 | | `plugin-sdk/realtime-voice` | 即時語音輔助工具 | 提供者類型、登錄/解析輔助工具和橋接器工作階段輔助工具 | |
  `plugin-sdk/image-generation-core` | 共用圖片生成核心 | 圖片生成類型、容錯移轉、驗證和登錄輔助工具 | | `plugin-sdk/music-generation` | 音樂生成輔助工具 | 音樂生成提供者/要求/結果類型 | | `plugin-sdk/music-generation-core` | 共用音樂生成核心 | 音樂生成類型、容錯移轉輔助工具、提供者查閱和模型參照解析 | | `plugin-sdk/video-generation` | 視訊生成輔助工具 | 視訊生成提供者/要求/結果類型 | |
  `plugin-sdk/video-generation-core` | 共用視訊生成核心 | 視訊生成類型、容錯移轉輔助工具、提供者查閱和模型參照解析 | | `plugin-sdk/interactive-runtime` | 互動式回覆輔助工具 | 互動式回覆載荷正規化/簡化 | | `plugin-sdk/channel-config-primitives` | 頻道配置基本元素 | 狹窄頻道配置架構基本元素 | | `plugin-sdk/channel-config-writes` | 頻道配置寫入輔助工具 | 頻道配置寫入授權輔助工具 | |
  `plugin-sdk/channel-plugin-common` | 共用頻道前奏 | 共用頻道外掛程式前奏匯出 | | `plugin-sdk/channel-status` | 頻道狀態輔助工具 | 共用頻道狀態快照/摘要輔助工具 | | `plugin-sdk/allowlist-config-edit` | 允許清單配置輔助工具 | 允許清單配置編輯/讀取輔助工具 | | `plugin-sdk/group-access` | 群組存取輔助工具 | 共用群組存取決策輔助工具 | | `plugin-sdk/direct-dm` | 直接 DM 輔助工具 | 共用直接 DM
  驗證/防護輔助工具 | | `plugin-sdk/extension-shared` | 共用擴充功能輔助工具 | 被動頻道/狀態和環境 Proxy 輔助工具基本元素 | | `plugin-sdk/webhook-targets` | Webhook 目標輔助工具 | Webhook 目標登錄和路由安裝輔助工具 | | `plugin-sdk/webhook-path` | Webhook 路徑輔助工具 | Webhook 路徑正規化輔助工具 | | `plugin-sdk/web-media` | 共用網頁媒體輔助工具 | 遠端/本機媒體載入輔助工具 | | `plugin-sdk/zod` |
  Zod 重新匯出 | 重新匯出的 `zod`，供外掛程式 SDK 消費者使用 | | `plugin-sdk/memory-core` | 配套記憶體核心輔助工具 | 記憶體管理員/配置/檔案/CLI 輔助工具介面 | | `plugin-sdk/memory-core-engine-runtime` | 記憶體引擎執行時期外觀 | 記憶體索引/搜尋執行時期外觀 | | `plugin-sdk/memory-core-host-engine-foundation` | 記憶體主機基礎引擎 | 記憶體主機基礎引擎匯出 | |
  `plugin-sdk/memory-core-host-engine-embeddings` | 記憶體主機內嵌引擎 | 記憶體內嵌合約、登錄存取、本機提供者和泛型批次/遠端輔助工具；具體的遠端提供者位於其所屬的外掛程式中 | | `plugin-sdk/memory-core-host-engine-qmd` | 記憶體主機 QMD 引擎 | 記憶體主機 QMD 引擎匯出 | | `plugin-sdk/memory-core-host-engine-storage` | 記憶體主機儲存引擎 | 記憶體主機儲存引擎匯出 | |
  `plugin-sdk/memory-core-host-multimodal` | 記憶體主機多模態輔助工具 | 記憶體主機多模態輔助工具 | | `plugin-sdk/memory-core-host-query` | 記憶體主機查詢輔助工具 | 記憶體主機查詢輔助工具 | | `plugin-sdk/memory-core-host-secret` | 記憶體主機祕密輔助工具 | 記憶體主機祕密輔助工具 | | `plugin-sdk/memory-core-host-events` | 記憶體主機事件日誌輔助工具 | 記憶體主機事件日誌輔助工具 | |
  `plugin-sdk/memory-core-host-status` | 記憶體主機狀態輔助工具 | 記憶體主機狀態輔助工具 | | `plugin-sdk/memory-core-host-runtime-cli` | 記憶體主機 CLI 執行時期 | 記憶體主機 CLI 執行時期輔助工具 | | `plugin-sdk/memory-core-host-runtime-core` | 記憶體主機核心執行時期 | 記憶體主機核心執行時期輔助工具 | | `plugin-sdk/memory-core-host-runtime-files` | 記憶體主機檔案/執行時期輔助工具 |
  記憶體主機檔案/執行時期輔助工具 | | `plugin-sdk/memory-host-core` | 記憶體主機核心執行時期別名 | 記憶體主機核心執行時期輔助工具的廠商中立別名 | | `plugin-sdk/memory-host-events` | 記憶體主機事件日誌別名 | 記憶體主機事件日誌輔助工具的廠商中立別名 | | `plugin-sdk/memory-host-files` | 記憶體主機檔案/執行時期別名 | 記憶體主機檔案/執行時期輔助工具的廠商中立別名 | | `plugin-sdk/memory-host-markdown` |
  受控 Markdown 輔助工具 | 適用於記憶體鄰近外掛程式的共用受控 Markdown 輔助工具 | | `plugin-sdk/memory-host-search` | 使用中記憶體搜尋外觀 | 延遲使用中記憶體搜尋管理員執行時期外觀 | | `plugin-sdk/memory-host-status` | 記憶體主機狀態別名 | 記憶體主機狀態輔助工具的廠商中立別名 | | `plugin-sdk/memory-lancedb` | 配套記憶體 LanceDB 輔助工具 | 記憶體 LanceDB 輔助工具介面 | | `plugin-sdk/testing` |
  測試公用程式 | 測試輔助工具和模擬物件 |
</Accordion>

此表格特意為常見的遷移子集，而非完整的 SDK
表面。包含 200 多個進入點的完整清單位於
`scripts/lib/plugin-sdk-entrypoints.json`。

該清單仍包含一些內建外掛程式的輔助縫隙，例如
`plugin-sdk/feishu`、`plugin-sdk/feishu-setup`、`plugin-sdk/zalo`、
`plugin-sdk/zalo-setup` 和 `plugin-sdk/matrix*`。這些仍然被匯出以用於
內建外掛程式的維護和相容性，但它們被刻意
從常見遷移表格中省略，並非
新外掛程式代碼的推薦目標。

同樣的規則也適用於其他內建輔助系列，例如：

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
  `plugin-sdk/diagnostics-otel`、`plugin-sdk/diagnostics-prometheus`、
  `plugin-sdk/diffs`、`plugin-sdk/llm-task`、`plugin-sdk/thread-ownership`
  以及 `plugin-sdk/voice-call`

`plugin-sdk/github-copilot-token` 目前公開了狹窄的 token-helper
表面 `DEFAULT_COPILOT_API_BASE_URL`、
`deriveCopilotApiBaseUrlFromToken` 和 `resolveCopilotApiToken`。

使用符合作業的最狹窄匯入。如果您找不到匯出，
請檢查 `src/plugin-sdk/` 的來源或在 Discord 中詢問。

## 目前已停用的功能

適用於整個 Plugin SDK、提供者合約、執行時期介面和清單的更精細廢棄項目。每一項目前仍然可以運作，但會在未來的主要版本中移除。每個項目下方的條目會將舊 API 對應到其正式的取代項目。

<AccordionGroup>
  <Accordion title="command-auth help builders → command-status">
    **舊版 (`openclaw/plugin-sdk/command-auth`)**：`buildCommandsMessage`、
    `buildCommandsMessagePaginated`、`buildHelpMessage`。

    **新版 (`openclaw/plugin-sdk/command-status`)**：相同的簽章、相同的
    匯出 —— 只是從更精細的子路徑匯入。`command-auth`
    將它們作為相容性存根重新匯出。

    ```typescript
    // Before
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-auth";

    // After
    import { buildHelpMessage } from "openclaw/plugin-sdk/command-status";
    ```

  </Accordion>

  <Accordion title="Mention gating helpers → resolveInboundMentionDecision">
    **舊版**：`resolveInboundMentionRequirement({ facts, policy })` 和
    `shouldDropInboundForMention(...)` 來自
    `openclaw/plugin-sdk/channel-inbound` 或
    `openclaw/plugin-sdk/channel-mention-gating`。

    **新版**：`resolveInboundMentionDecision({ facts, policy })` —— 傳回
    單一決策物件，而不是兩個分開的呼叫。

    下游頻道外掛（Slack、Discord、Matrix、MS Teams）已經
    進行切換。

  </Accordion>

  <Accordion title="Channel runtime shim and channel actions helpers">
    `openclaw/plugin-sdk/channel-runtime` 是舊版
    頻道外掛的相容性存根。請勿從新程式碼匯入它；請使用
    `openclaw/plugin-sdk/channel-runtime-context` 來註冊執行時期
    物件。

    `channelActions*` 助手在 `openclaw/plugin-sdk/channel-actions` 中已
    與原始「actions」頻道匯出一起被廢棄。改透過語意化的 `presentation` 介面來公開功能 —— 頻道外掛
    宣告它們呈現的內容（卡片、按鈕、選擇器），而不是它們接受的原始動作名稱。

  </Accordion>

  <Accordion title="網路搜尋提供者工具() 輔助函式 → 外掛程式上的 createTool()">
    **舊版**：從 `openclaw/plugin-sdk/provider-web-search` 匯入 `tool()` factory。

    **新版**：直接在提供者外掛程式上實作 `createTool(...)`。
    OpenClaw 不再需要 SDK 輔助函式來註冊工具包裝器。

  </Accordion>

  <Accordion title="純文字通道封套 → BodyForAgent">
    **舊版**：使用 `formatInboundEnvelope(...)` (和
    `ChannelMessageForAgent.channelEnvelope`) 從傳入通道訊息建構扁平的純文字提示詞
    封套。

    **新版**：使用 `BodyForAgent` 加上結構化使用者情境區塊。通道
    外掛程式將路由元資料 (執行緒、主題、回覆、反應) 作為
    欄位附加，而不是將其串連成提示詞字串。
    `formatAgentEnvelope(...)` 輔助函式仍然支援用於合成
    面向助理的封套，但傳入純文字封套即將
    淘汰。

    受影響的區域：`inbound_claim`、`message_received` 以及任何自訂
    通道外掛程式，只要是對 `channelEnvelope` 文字進行後處理者。

  </Accordion>

  <Accordion title="提供者探索類型 → 提供者目錄類型">
    四個探索類型別名現在是目錄時期類型的
    薄層包裝器：

    | 舊版別名                 | 新類型                  |
    | ------------------------- | ------------------------- |
    | `ProviderDiscoveryOrder`  | `ProviderCatalogOrder`    |
    | `ProviderDiscoveryContext`| `ProviderCatalogContext`  |
    | `ProviderDiscoveryResult` | `ProviderCatalogResult`   |
    | `ProviderPluginDiscovery` | `ProviderPluginCatalog`   |

    此外還有舊版 `ProviderCapabilities` 靜態包 — 提供者外掛程式
    應透過提供者執行時期合約來附加功能事實，
    而非透過靜態物件。

  </Accordion>

  <Accordion title="Thinking policy hooks → resolveThinkingProfile">
    **舊版**（在 `ProviderThinkingPolicy` 上的三個獨立 hooks）：
    `isBinaryThinking(ctx)`、`supportsXHighThinking(ctx)` 和
    `resolveDefaultThinkingLevel(ctx)`。

    **新版**：單一 `resolveThinkingProfile(ctx)`，它返回一個
    `ProviderThinkingProfile`，其中包含標準 `id`、可選 `label` 和
    排序的等級列表。OpenClaw 會根據設定檔等級自動降級過時的儲存值。

    請實作一個 hook 而非三個。舊版 hooks 在淘汰期間仍可運作，但不會與設定檔結果組合。

  </Accordion>

  <Accordion title="External OAuth provider fallback → contracts.externalAuthProviders">
    **舊版**：實作 `resolveExternalOAuthProfiles(...)` 但未在
    外掛清單中宣告提供者。

    **新版**：在外掛清單中宣告 `contracts.externalAuthProviders`，
    **並**實作 `resolveExternalAuthProfiles(...)`。舊的「auth
    fallback」路徑會在執行時發出警告，且將會被移除。

    ```json
    {
      "contracts": {
        "externalAuthProviders": ["anthropic", "openai"]
      }
    }
    ```

  </Accordion>

  <Accordion title="Provider env-var lookup → setup.providers[].envVars">
    **舊版**清單欄位：`providerAuthEnvVars: { anthropic: ["ANTHROPIC_API_KEY"] }`。

    **新版**：將相同的環境變數查找對應到清單中的 `setup.providers[].envVars`
    上。這將設定/狀態環境元資料整合在一個地方，並避免僅為了回應環境變數
    查找而啟動外掛執行時期。

    `providerAuthEnvVars` 透過相容性介面卡維持支援，
    直到淘汰窗口結束。

  </Accordion>

  <Accordion title="Memory plugin registration → registerMemoryCapability">
    **舊版**：三個分開的呼叫 —
    `api.registerMemoryPromptSection(...)`,
    `api.registerMemoryFlushPlan(...)`,
    `api.registerMemoryRuntime(...)`。

    **新版**：在 memory-state API 上的一個呼叫 —
    `registerMemoryCapability(pluginId, { promptBuilder, flushPlanResolver, runtime })`。

    相同的插槽，單一註冊呼叫。附加的記憶體輔助函式
    (`registerMemoryPromptSupplement`, `registerMemoryCorpusSupplement`,
    `registerMemoryEmbeddingProvider`) 不受影響。

  </Accordion>

  <Accordion title="Subagent session messages types renamed">
    兩個仍從 `src/plugins/runtime/types.ts` 匯出的舊版類型別名：

    | 舊版                           | 新版                             |
    | ----------------------------- | ------------------------------- |
    | `SubagentReadSessionParams`   | `SubagentGetSessionMessagesParams` |
    | `SubagentReadSessionResult`   | `SubagentGetSessionMessagesResult` |

    執行時期方法 `readSession` 已棄用，建議改用
    `getSessionMessages`。簽名相同；舊方法會呼叫新方法。

  </Accordion>

  <Accordion title="runtime.tasks.flow → runtime.tasks.flows">
    **舊版**：`runtime.tasks.flow` (單數) 傳回即時任務流程存取器。

    **新版**：`runtime.tasks.flows` (複數) 傳回基於 DTO 的 TaskFlow 存取，
    這是匯入安全的，不需要載入完整的任務執行時期。

    ```typescript
    // Before
    const flow = api.runtime.tasks.flow(ctx);
    // After
    const flows = api.runtime.tasks.flows(ctx);
    ```

  </Accordion>

<Accordion title="Embedded extension factories → agent tool-result middleware">已於上方的「如何遷移 → 將 Pi 工具結果擴充功能遷移至中介軟體」中說明。為完整性起見在此列出：僅限 Pi 的已移除 `api.registerEmbeddedExtensionFactory(...)` 路徑已被 `api.registerAgentToolResultMiddleware(...)` 取代，並在 `contracts.agentToolResultMiddleware` 中明確列出執行時期清單。</Accordion>

  <Accordion title="OpenClawSchemaType 別名 → OpenClawConfig">
    `OpenClawSchemaType` 從 `openclaw/plugin-sdk` 重新匯出 現在是
    `OpenClawConfig` 的單行別名。建議使用正式名稱。

    ```typescript
    // Before
    import type { OpenClawSchemaType } from "openclaw/plugin-sdk";
    // After
    import type { OpenClawConfig } from "openclaw/plugin-sdk/config-schema";
    ```

  </Accordion>
</AccordionGroup>

<Note>擴充功能層級的棄用項（在 `extensions/` 下的封裝通道/提供者外掛內部）會在其各自的 `api.ts` 和 `runtime-api.ts` barrels 中追蹤。它們不會影響第三方外掛合約，且未在此列出。如果您直接使用封裝外掛的 local barrel，請在升級前閱讀該 barrel 中的棄用註解。</Note>

## 移除時間表

| 時間               | 發生什麼事                                     |
| ------------------ | ---------------------------------------------- |
| **現在**           | 已棄用的介面會發出執行時期警告                 |
| **下一個主要版本** | 已棄用的介面將被移除；仍使用它們的外掛將會失效 |

所有核心外掛都已經完成遷移。外部外掛應在下一個主要版本發布前完成遷移。

## 暫時隱藏警告

在您進行遷移時，請設定這些環境變數：

```bash
OPENCLAW_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING=1 openclaw gateway run
OPENCLAW_SUPPRESS_EXTENSION_API_WARNING=1 openclaw gateway run
```

這是一個暫時的緊急應變手段，而非永久解決方案。

## 相關

- [入門指南](/zh-Hant/plugins/building-plugins) — 建構您的第一個外掛
- [SDK 概觀](/zh-Hant/plugins/sdk-overview) — 完整的子路徑匯入參考
- [通道外掛](/zh-Hant/plugins/sdk-channel-plugins) — 建構通道外掛
- [提供者外掛](/zh-Hant/plugins/sdk-provider-plugins) — 建構提供者外掛
- [外掛內部運作](/zh-Hant/plugins/architecture) — 架構深度解析
- [外掛清單](/zh-Hant/plugins/manifest) — 清單架構參考
