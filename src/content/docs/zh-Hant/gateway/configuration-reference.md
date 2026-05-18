---
summary: "核心 OpenClaw 金鑰、預設值及專用子系統參考連結的 Gateway 設定參考"
title: "設定參考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

`~/.openclaw/openclaw.json` 的核心配置參考。若要了解以任務為導向的概覽，請參閱 [Configuration](/zh-Hant/gateway/configuration)。

涵蓋主要的 OpenClaw 設定層面，並在子系統擁有自身更深入的參考資料時提供連結。通道 和外掛 擁有的指令目錄以及深度記憶體/QMD 調整選項位於各自的頁面上，而非此頁。

程式碼基準：

- `openclaw config schema` 會列印用於驗證和控制 UI 的即時 JSON Schema，並在可用時合併套件/外掛/通道的中繼資料
- `config.schema.lookup` 會傳回一個用於深入檢視工具的路徑範圍 Schema 節點
- `pnpm config:docs:check` / `pnpm config:docs:gen` 會針對目前的 Schema 表面驗證設定文件基準雜湊

Agent 查詢路徑：在編輯前使用 `gateway` 工具動作 `config.schema.lookup` 以取得確切的欄位層級文件和限制。請使用 [Configuration](/zh-Hant/gateway/configuration) 獲得以任務為導向的指導，並使用本頁了解更廣泛的欄位映射、預設值以及子系統參考的連結。

專屬深度參考資料：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 以及 `plugins.entries.memory-core.config.dreaming` 下的夢境配置之 [Memory configuration reference](/zh-Hant/reference/memory-config)
- 目前內建 + 附套指令目錄的 [Slash commands](/zh-Hant/tools/slash-commands)
- 擁有者通道/外掛頁面，用於通道特定的指令介面

設定格式為 **JSON5**（允許註解和結尾逗號）。所有欄位皆為選用 - 若省略，OpenClaw 會使用安全的預設值。

---

## 通道

各頻道配置金鑰已移至專用頁面 - 請參閱
[Configuration - channels](/zh-Hant/gateway/config-channels) 以了解 `channels.*`，
包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他
附套頻道（驗證、存取控制、多帳戶、提及閘門）。

## Agent 預設值、多重 Agent、工作階段與訊息

已移至專用頁面 - 請參閱
[Configuration - agents](/zh-Hant/gateway/config-agents) 以了解：

- `agents.defaults.*` (工作區、模型、思考、心跳、記憶體、媒體、技能、沙箱)
- `multiAgent.*` (多重 Agent 路由和綁定)
- `session.*` (會話生命週期、壓縮、修剪)
- `messages.*` (訊息傳遞、TTS、Markdown 渲染)
- `talk.*` (交談模式)
  - `talk.consultThinkingLevel`：Control UI 交談即時諮詢背後執行的完整 OpenClaw Agent 之思考層級覆寫
  - `talk.consultFastMode`：Control UI 交談即時諮詢的一次性快速模式覆寫
  - `talk.speechLocale`：用於 iOS/macOS 上交談語音辨識的選用 BCP 47 地區 ID
  - `talk.silenceTimeoutMs`：若未設定，交談會在發送文字記錄前保留平台預設的暫停視窗 (`700 ms on macOS and Android, 900 ms on iOS`)

## 工具與自訂提供者

工具原則、實驗性切換開關、提供者支援的工具配置，以及自訂
提供者 / 基本 URL 設定已移至專用頁面 - 請參閱
[Configuration - tools and custom providers](/zh-Hant/gateway/config-tools)。

## 模型

提供者定義、模型允許清單和自訂提供者設定位於
[Configuration - tools and custom providers](/zh-Hant/gateway/config-tools#custom-providers-and-base-urls) 中。
`models` 根節點也擁有全域模型目錄行為。

```json5
{
  models: {
    // Optional. Default: true. Requires a Gateway restart when changed.
    pricing: { enabled: false },
  },
}
```

- `models.mode`：提供者目錄行為 (`merge` 或 `replace`)。
- `models.providers`：以提供者 ID 為鍵的自訂提供者對應。
- `models.providers.*.localService`：用於
  本地模型伺服器的選用隨選進程管理器。OpenClaw 會探測已配置的健康檢查端點，在需要時啟動
  絕對路徑的 `command`，等待就緒，然後發送模型
  請求。請參閱 [Local model services](/zh-Hant/gateway/local-model-services)。
- `models.pricing.enabled`：控制在 sidecar 和通道達到 Gateway 就緒路徑後啟動的後台定價引導。當 `false` 時，
  Gateway 會跳過 OpenRouter 和 LiteLLM 定價目錄的獲取；配置的 `models.providers.*.models[].cost` 值仍然可用於本機成本估算。

## MCP

由 OpenClaw 管理的 MCP 伺服器定義位於 `mcp.servers` 之下，並由嵌入式 Pi 和其他執行適配器使用。`openclaw mcp list`、
`show`、`set` 和 `unset` 指令管理此區塊，而無需在配置編輯期間連線到
目標伺服器。

```json5
{
  mcp: {
    // Optional. Default: 600000 ms (10 minutes). Set 0 to disable idle eviction.
    sessionIdleTtlMs: 600000,
    servers: {
      docs: {
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-fetch"],
      },
      remote: {
        url: "https://example.com/mcp",
        transport: "streamable-http", // streamable-http | sse
        headers: {
          Authorization: "Bearer ${MCP_REMOTE_TOKEN}",
        },
        // Optional Codex app-server projection controls.
        codex: {
          agents: ["main"],
          defaultToolsApprovalMode: "approve", // auto | prompt | approve
        },
      },
    },
  },
}
```

- `mcp.servers`：針對公開配置 MCP 工具之執行環境的具名 stdio 或遠端 MCP 伺服器定義。
  遠端條目使用 `transport: "streamable-http"` 或 `transport: "sse"`；
  `type: "http"` 是一個 CLI 原生別名，由 `openclaw mcp set` 和
  `openclaw doctor --fix` 正規化為標準的 `transport` 欄位。
- `mcp.servers.<name>.codex`：選用的 Codex app-server 投影控制。
  此區塊僅供 Codex app-server 執行緒使用的 OpenClaw 中繼資料；它不會
  影響 ACP 工作階段、一般 Codex harness 設定，或其他執行時期轉接器。
  非空的 `codex.agents` 會將伺服器限制為列出的 OpenClaw agent ID。
  空白、空值或無效的範圍 agent 清單會被設定驗證拒絕，
  並且會由執行時期投影路徑略過，而不會變成全域設定。
  `codex.defaultToolsApprovalMode` 會發出該伺服器的 Codex 原生
  `default_tools_approval_mode`。OpenClaw 會在將原生 `mcp_servers`
  設定傳遞給 Codex 之前移除 `codex` 區塊。省略此區塊以
  讓伺服器保持對每個具有 Codex 預設 MCP 核准行為的 Codex app-server agent 投影。
- `mcp.sessionIdleTtlMs`：工作階段範圍的捆绑 MCP 執行時期的閒置 TTL。
  一次性嵌入式執行要求執行結束時的清理；此 TTL 是
  長期工作階段和未來呼叫者的最後防線。
- `mcp.*` 下的變更會透過捨棄快取的工作階段 MCP 執行時期來熱套用。
  下一次工具探索/使用會根據新設定重建它們，因此被移除的
  `mcp.servers` 項目會立即被回收，而不需等待閒置 TTL。

請參閱 [MCP](/zh-Hant/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI backends](/zh-Hant/gateway/cli-backends#bundle-mcp-overlays) 以了解執行時期行為。

## Skills

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
      allowSymlinkTargets: ["~/Projects/manager/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
      allowUploadedArchives: false,
    },
    entries: {
      "image-lab": {
        apiKey: { source: "env", provider: "default", id: "GEMINI_API_KEY" }, // or plaintext string
        env: { GEMINI_API_KEY: "GEMINI_KEY_HERE" },
      },
      peekaboo: { enabled: true },
      sag: { enabled: false },
    },
  },
}
```

- `allowBundled`：僅適用於捆绑 skills 的選用允許清單 (受管理的/工作區 skills 不受影響)。
- `load.extraDirs`：額外的共用 skill 根目錄 (優先順序最低)。
- `load.allowSymlinkTargets`：當連結位於其設定的來源根目錄之外時，skill 符號連結可以解析到的信任實際目標根目錄。
- `install.preferBrew`：當設為 true 時，如果 `brew` 可用，會在回退到其他安裝程式類型之前優先使用 Homebrew 安裝程式。
- `install.nodeManager`：`metadata.openclaw.install`
  規格的節點安裝程式偏好 (`npm` | `pnpm` | `yarn` | `bun`)。
- `install.allowUploadedArchives`：允許受信任的 `operator.admin` Gateway
  客戶端安裝透過 `skills.upload.*` 暫存的私人 zip 檔案
  （預設值：false）。這僅啟用上傳的歸檔路徑；一般的 ClawHub
  安裝不需要此設定。
- `entries.<skillKey>.enabled: false` 會停用一項技能，即使該技能已內建或安裝。
- `entries.<skillKey>.apiKey`：為聲明主要環境變數（純文字字串或 SecretRef 物件）的技能提供的便利設定。

---

## 外掛程式

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
    bundledDiscovery: "allowlist",
    deny: [],
    load: {
      paths: ["~/Projects/oss/voice-call-plugin"],
    },
    entries: {
      "voice-call": {
        enabled: true,
        hooks: {
          allowPromptInjection: false,
        },
        config: { provider: "twilio" },
      },
    },
  },
}
```

- 從 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 以及 `plugins.load.paths` 載入。
- 探索功能接受原生 OpenClaw 外掛程式，以及相容的 Codex 套件組合和 Claude 套件組合，包括無資訊清單的 Claude 預設佈局套件組合。
- **變更組態需要重新啟動 gateway。**
- `allow`：選用的允許清單（僅載入列出的外掛程式）。`deny` 優先。
- `bundledDiscovery`：對於新組態預設為 `"allowlist"`，因此非空的
  `plugins.allow` 也會控管內建的提供者外掛程式，包括網頁搜尋
  執行時期提供者。Doctor 會為遷移的舊版允許清單
  組態寫入 `"compat"`，以便在您選擇加入之前保留現有的內建提供者行為。
- `plugins.entries.<id>.apiKey`：外掛程式層級的 API 金鑰便利欄位（當外掛程式支援時）。
- `plugins.entries.<id>.env`：外掛程式範圍的環境變數對映。
- `plugins.entries.<id>.hooks.allowPromptInjection`：當 `false` 時，核心會阻擋 `before_prompt_build` 並忽略來自舊版 `before_agent_start` 的提示變異欄位，同時保留舊版 `modelOverride` 和 `providerOverride`。適用於原生外掛程式掛鉤和支援的套件組合提供的掛鉤目錄。
- `plugins.entries.<id>.hooks.allowConversationAccess`：當 `true` 時，受信任的非打包插件可以從類型化 hook（例如 `llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize` 和 `agent_end`）讀取原始對話內容。
- `plugins.entries.<id>.subagent.allowModelOverride`：明確信任此插件以請求每次執行的 `provider` 和 `model` 覆寫，用於背景子代理執行。
- `plugins.entries.<id>.subagent.allowedModels`：受信任子代理覆寫的標準 `provider/model` 目標的可選允許清單。僅當您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.llm.allowModelOverride`：明確信任此插件以請求 `api.runtime.llm.complete` 的模型覆寫。
- `plugins.entries.<id>.llm.allowedModels`：受信任插件 LLM 完成覆寫的標準 `provider/model` 目標的可選允許清單。僅當您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.llm.allowAgentIdOverride`：明確信任此插件以針對非預設代理 ID 執行 `api.runtime.llm.complete`。
- `plugins.entries.<id>.config`：外掛程式定義的設定物件（當可用時，由原生 OpenClaw 外掛程式架構驗證）。
- 頻道外掛程式帳號/執行時設定位於 `channels.<id>` 之下，並且應由擁有該外掛程式的清單 `channelConfigs` 元資料來描述，而不是由中央 OpenClaw 選項註冊表描述。

### Codex harness 外掛程式設定

內建的 `codex` 外掛程式擁有 `plugins.entries.codex.config` 下的原生 Codex 應用伺服器 harness 設定。請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference) 以取得完整的設定介面，並參閱 [Codex harness](/zh-Hant/plugins/codex-harness) 以取得執行時模型。

`codexPlugins` 僅適用於選擇原生 Codex harness 的工作階段。它並不會為 Pi、正常的 OpenAI 提供者執行、ACP 交談綁定或任何非 Codex harness 啟用 Codex 外掛。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: true,
            plugins: {
              "google-calendar": {
                enabled: true,
                marketplaceName: "openai-curated",
                pluginName: "google-calendar",
                allow_destructive_actions: false,
              },
            },
          },
        },
      },
    },
  },
}
```

- `plugins.entries.codex.config.codexPlugins.enabled`：為 Codex harness 啟用原生 Codex 外掛/應用程式支援。預設值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`：遷移外掛應用程式誘發的預設破壞性操作策略。預設值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：當全域 `codexPlugins.enabled` 也為 true 時，啟用遷移的外掛項目。對於明確項目，預設值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：穩定的市集身分識別。V1 僅支援 `"openai-curated"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：來自遷移的穩定 Codex 外掛身分識別，例如 `"google-calendar"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：個別外掛的破壞性操作覆寫。若省略，則使用全域 `allow_destructive_actions` 值。

`codexPlugins.enabled` 是全域啟用指令。由遷移寫入的明確外掛項目是持久安裝和修復資格集。不支援 `plugins["*"]`，沒有 `install` 開關，且本機 `marketplacePath` 值故意不設為設定欄位，因為它們是主機特定的。

`app/list` 就緒檢查會快取一小時，並在過期時非同步重新整理。Codex 執行緒應用程式設定是在 Codex harness 工作階段建立時計算，而非每次輪次；變更原生外掛設定後，請使用 `/new`、`/reset` 或重新啟動閘道。

- `plugins.entries.firecrawl.config.webFetch`：Firecrawl 網頁擷取提供者設定。
  - `apiKey`：Firecrawl API 金鑰（接受 SecretRef）。會依序回退至 `plugins.entries.firecrawl.config.webSearch.apiKey`、舊版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 環境變數。
  - `baseUrl`：Firecrawl API 基礎 URL（預設：`https://api.firecrawl.dev`；自託管的覆寫必須指向私有/內部端點）。
  - `onlyMainContent`：僅從頁面提取主要內容（預設：`true`）。
  - `maxAgeMs`：最大快取有效時間，以毫秒為單位（預設：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取請求逾時時間，以秒為單位（預設：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search (Grok 網頁搜尋) 設定。
  - `enabled`：啟用 X Search 提供者。
  - `model`：用於搜尋的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：記憶體做夢 設定。請參閱 [Dreaming](/zh-Hant/concepts/dreaming) 以了解階段與閾值。
  - `enabled`：做夢主開關（預設 `false`）。
  - `frequency`：每次完整做夢掃描的 cron 頻率（預設為 `"0 3 * * *"`）。
  - `model`：選用的 Dream Diary 子代理模型覆寫。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；搭配 `allowedModels` 以限制目標。模型不可用錯誤會使用工作階段預設模型重試一次；信任或允許清單失敗不會無靜默回退。
  - 階段原則與閾值屬於實作細節（非使用者面向的設定金鑰）。
- 完整的記憶體設定位於 [Memory configuration reference](/zh-Hant/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已啟用的 Claude 套件外掛也可以從 `settings.json` 貢獻內嵌的 Pi 預設值；OpenClaw 會將這些套用作為經過清理的代理設定，而不是原始的 OpenClaw 設定補丁。
- `plugins.slots.memory`：選擇作用中的記憶體外掛 ID，或使用 `"none"` 以停用記憶體外掛。
- `plugins.slots.contextEngine`：選取現用的 context engine 外掛程式 ID；除非您安裝並選擇另一個引擎，否則預設為 `"legacy"`。

請參閱 [外掛程式](/zh-Hant/tools/plugin)。

---

## 承諾

`commitments` 控制推斷的後續記憶：OpenClaw 可以偵測對話輪次中的簽到，並透過心跳執行傳送它們。

- `commitments.enabled`：啟用針對推斷後續承諾的隱藏 LLM 提取、儲存和心跳傳送。預設值：`false`。
- `commitments.maxPerDay`：在滾動的一天中，每個 Agent 工作階段傳送的推斷後續承諾數量上限。預設值：`3`。

請參閱 [推斷的承諾](/zh-Hant/concepts/commitments)。

---

## 瀏覽器

```json5
{
  browser: {
    enabled: true,
    evaluateEnabled: true,
    defaultProfile: "user",
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    tabCleanup: {
      enabled: true,
      idleMinutes: 120,
      maxTabsPerSession: 8,
      sweepMinutes: 5,
    },
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
      user: { driver: "existing-session", attachOnly: true, color: "#00AA00" },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
    color: "#FF4500",
    // headless: false,
    // noSandbox: false,
    // extraArgs: [],
    // executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    // attachOnly: false,
  },
}
```

- `evaluateEnabled: false` 會停用 `act:evaluate` 和 `wait --fn`。
- `tabCleanup` 會在閒置時間或當工作階段超過其上限時，回收追蹤的主要 Agent 分頁。設定 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 即可停用這些個別的清理模式。
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` 在未設定時會停用，因此瀏覽器導航預設保持嚴格模式。
- 僅在您有意信任私有網路瀏覽器導航時，才設定 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在嚴格模式下，遠端 CDP 設定檔端點 (`profiles.*.cdpUrl`) 在連線能力/探索檢查期間會受到相同的私有網路封鎖限制。
- `ssrfPolicy.allowPrivateNetwork` 作為舊版別名仍受支援。
- 在嚴格模式下，請使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 來進行明確的例外處理。
- 遠端設定檔僅支援附加功能 (停用 start/stop/reset)。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。當您希望 OpenClaw 探索 `/json/version` 時使用 HTTP(S)；當您的提供者提供直接的 DevTools WebSocket URL 時使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 適用於遠端和
  `attachOnly` CDP 連線能力以及分頁開啟請求。受管回環
  設定檔會保留本機 CDP 預設值。
- 如果外部管理的 CDP 服務可透過回環存取，請設定該
  設定檔的 `attachOnly: true`；否則 OpenClaw 會將回環連接埠視為
  本機受管理瀏覽器設定檔，並可能回報本機連接埠擁有權錯誤。
- `existing-session` 設定檔使用 Chrome MCP 而非 CDP，且可附加至
  選定的主機或透過已連線的瀏覽器節點進行附加。
- `existing-session` 設定檔可以設定 `userDataDir` 以鎖定特定的
  基於 Chromium 的瀏覽器設定檔，例如 Brave 或 Edge。
- `existing-session` 設定檔會保留目前的 Chrome MCP 路由限制：
  使用快照/參照驅動的動作而非 CSS 選擇器鎖定、單一檔案上傳
  掛鉤、無對話方塊逾時覆寫、無 `wait --load networkidle`，以及無
  `responsebody`、PDF 匯出、下載攔截或批次動作。
- 本機受管 `openclaw` 設定檔會自動指派 `cdpPort` 和 `cdpUrl`；僅需
  針對遠端 CDP 明確設定 `cdpUrl`。
- 本機受管設定檔可以設定 `executablePath` 以覆寫該設定檔的
  全域 `browser.executablePath`。使用此功能可在 Chrome 中
  執行一個設定檔，並在 Brave 中執行另一個設定檔。
- 本機受管設定檔在程序啟動後使用 `browser.localLaunchTimeoutMs` 進行 Chrome CDP HTTP
  探索，並在啟動後使用 `browser.localCdpReadyTimeoutMs` 進行
  CDP WebSocket 就緒檢查。在較慢的主機上，如果 Chrome
  成功啟動但就緒檢查與啟動程序競爭，請增加這些值。這兩個值都必須是
  不超過 `120000` 毫秒的正整數；無效的設定值將被拒絕。
- 自動偵測順序：如果預設瀏覽器基於 Chromium 則為預設瀏覽器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 都
  接受 `~` 和 `~/...` 作為您的 OS 主目錄（在 Chromium 啟動之前）。
  `existing-session` 設定檔上的個別設定檔 `userDataDir` 也會進行波浪號擴充。
- 控制服務：僅限迴路（埠號衍生自 `gateway.port`，預設為 `18791`）。
- `extraArgs` 會將額外的啟動旗標附加到本機 Chromium 啟動程序（例如
  `--disable-gpu`、視窗大小調整或偵錯旗標）。

---

## UI

```json5
{
  ui: {
    seamColor: "#FF4500",
    assistant: {
      name: "OpenClaw",
      avatar: "CB", // emoji, short text, image URL, or data URI
    },
  },
}
```

- `seamColor`：原生應用程式 UI 鉻層的強調色（對話模式氣泡色調等）。
- `assistant`：控制 UI 身份覆寫。會回退到使用中的代理程式身份。

---

## 閘道

```json5
{
  gateway: {
    mode: "local", // local | remote
    port: 18789,
    bind: "loopback",
    auth: {
      mode: "token", // none | token | password | trusted-proxy
      token: "your-token",
      // password: "your-password", // or OPENCLAW_GATEWAY_PASSWORD
      // trustedProxy: { userHeader: "x-forwarded-user" }, // for mode=trusted-proxy; see /gateway/trusted-proxy-auth
      allowTailscale: true,
      rateLimit: {
        maxAttempts: 10,
        windowMs: 60000,
        lockoutMs: 300000,
        exemptLoopback: true,
      },
    },
    tailscale: {
      mode: "off", // off | serve | funnel
      resetOnExit: false,
    },
    controlUi: {
      enabled: true,
      basePath: "/openclaw",
      // root: "dist/control-ui",
      // embedSandbox: "scripts", // strict | scripts | trusted
      // allowExternalEmbedUrls: false, // dangerous: allow absolute external http(s) embed URLs
      // chatMessageMaxWidth: "min(1280px, 82%)", // optional grouped chat message max-width
      // allowedOrigins: ["https://control.example.com"], // required for non-loopback Control UI
      // dangerouslyAllowHostHeaderOriginFallback: false, // dangerous Host-header origin fallback mode
      // allowInsecureAuth: false,
      // dangerouslyDisableDeviceAuth: false,
    },
    remote: {
      url: "ws://127.0.0.1:18789",
      transport: "ssh", // ssh | direct
      token: "your-token",
      // password: "your-password",
    },
    trustedProxies: ["10.0.0.1"],
    // Optional. Default false.
    allowRealIpFallback: false,
    nodes: {
      pairing: {
        // Optional. Default unset/disabled.
        autoApproveCidrs: ["192.168.1.0/24", "fd00:1234:5678::/64"],
      },
      allowCommands: ["canvas.navigate"],
      denyCommands: ["system.run"],
    },
    tools: {
      // Additional /tools/invoke HTTP denies
      deny: ["browser"],
      // Remove tools from the default HTTP deny list
      allow: ["gateway"],
    },
    push: {
      apns: {
        relay: {
          baseUrl: "https://relay.example.com",
          timeoutMs: 10000,
        },
      },
    },
  },
}
```

<Accordion title="Gateway 欄位詳情">

- `mode`：`local` (執行 gateway) 或 `remote` (連線至遠端 gateway)。除非設為 `local`，否則 Gateway 將拒絕啟動。
- `port`：WS + HTTP 的單一多工連接埠。優先順序：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback` (預設)、`lan` (`0.0.0.0`)、`tailnet` (僅限 Tailscale IP) 或 `custom`。
- **舊版 bind 別名**：請在 `gateway.bind` 中使用 bind 模式值 (`auto`、`loopback`、`lan`、`tailnet`、`custom`)，而非主機別名 (`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`)。
- **Docker 注意事項**：預設的 `loopback` bind 會在容器內監聽 `127.0.0.1`。使用 Docker 橋接網路 (`-p 18789:18789`) 時，流量會抵達 `eth0`，因此無法連線至 gateway。請使用 `--network host`，或設定 `bind: "lan"` (或搭配 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`) 以監聽所有介面。
- **驗證**：預設為必填。非 loopback bind 需要 gateway 驗證。實務上這意味著共用 token/密碼或具備 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向 proxy。入門精靈預設會產生一個 token。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` (包含 SecretRefs)，請將 `gateway.auth.mode` 明確設為 `token` 或 `password`。若同時設定兩者但未設定模式，啟動流程與服務安裝/修復流程將會失敗。
- `gateway.auth.mode: "none"`：明確的無驗證模式。僅用於受信任的本機 loopback 設定；入門提示刻意不提供此選項。
- `gateway.auth.mode: "trusted-proxy"`：將瀏覽器/使用者驗證委派給身分感知反向 proxy，並信任來自 `gateway.trustedProxies` 的身分標頭 (請參閱[受信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth))。此模式預設期望來源為 **非 loopback** 的 proxy；同主機 loopback 反向 proxy 需要明確設定 `gateway.auth.trustedProxy.allowLoopback = true`。內部同主機呼叫者可以使用 `gateway.auth.password` 作為本機直接後援；`gateway.auth.token` 與 trusted-proxy 模式仍互斥。
- `gateway.auth.allowTailscale`：當為 `true` 時，Tailscale Serve 身分標頭可以滿足 Control UI/WebSocket 驗證 (透過 `tailscale whois` 驗證)。HTTP API 端點**不會**使用該 Tailscale 標頭驗證；它們改為遵循 gateway 的正常 HTTP 驗證模式。此無 token 流程假設 gateway 主機受信任。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`：可選的失敗驗證限制器。針對每個用戶端 IP 和每個驗證範圍 (shared-secret 和 device-token 獨立追蹤) 套用。被封鎖的嘗試會傳回 `429` + `Retry-After`。
  - 在非同步 Tailscale Serve Control UI 路徑上，相同 `{scope, clientIp}` 的失敗嘗試會在寫入失敗前序列化。因此，來自同一用戶端的並行錯誤嘗試可能在第二次請求時就觸發限制器，而不是兩者都像一般不符的情況一樣競爭通過。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；當您刻意也希望限制 localhost 流量速率時 (用於測試設定或嚴格的 proxy 部署)，請設定 `false`。
- 來自瀏覽器來源的 WS 驗證嘗試一律會受到節流，並停用 loopback 豁免 (針對瀏覽器式 localhost 暴力破解的深度防禦)。
- 在 loopback 上，這些瀏覽器來源鎖定會依標準化的 `Origin`
  值進行隔離，因此來自一個 localhost 來源的重複失敗不會自動
  鎖定不同的來源。
- `tailscale.mode`：`serve` (僅限 tailnet，loopback bind) 或 `funnel` (公開，需要驗證)。
- `tailscale.preserveFunnel`：當 `true` 且 `tailscale.mode = "serve"` 時，OpenClaw
  會在啟動時重新套用 Serve 之前檢查 `tailscale funnel status`，如果外部設定的 Funnel 路由已涵蓋
  gateway 連接埠則跳過它。
  預設 `false`。
- `controlUi.allowedOrigins`：Gateway WebSocket 連線的明確瀏覽器來源允許清單。公開的非 loopback 瀏覽器來源需要此設定。來自 loopback、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主機的私密同來源 LAN/Tailnet UI 載入，在未啟用 Host-header 後援的情況下亦被接受。
- `controlUi.chatMessageMaxWidth`：分組 Control UI 聊天訊息的可選最大寬度。接受受限制的 CSS 寬度值，例如 `960px`、`82%`、`min(1280px, 82%)` 和 `calc(100% - 2rem)`。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危險模式，針對刻意依賴 Host-header 來源原則的部署啟用 Host-header 來源後援。
- `remote.transport`：`ssh` (預設) 或 `direct` (ws/wss)。對於 `direct`，`remote.url` 必須是 `wss://` (針對公開主機)；純文字 `ws://` 僅接受來自 loopback、LAN、link-local、`.local`、`.ts.net` 和 Tailscale CGNAT 主機。
- `remote.remotePort`：遠端 SSH 主機上的 gateway 連接埠。預設為 `18789`；當本機通道連接埠與遠端 gateway 連接埠不同時使用此設定。
- `gateway.remote.token` / `.password` 是遠端用戶端憑證欄位。它們本身不設定 gateway 驗證。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 版本在將中繼支援的註冊發佈至 gateway 後，使用的外部 APNs 中繼的基底 HTTPS URL。此 URL 必須符合編譯至 iOS 版本中的中繼 URL。
- `gateway.push.apns.relay.timeoutMs`：gateway 對中繼的傳送逾時 (毫秒)。預設為 `10000`。
- 中繼支援的註冊會委派給特定的 gateway 身分。配對的 iOS 應用程式會取得 `gateway.identity.get`，在註冊中繼時包含該身分，並將註冊範圍的傳送授權轉送至 gateway。另一個 gateway 無法重用該已儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中繼設定的暫時性環境覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：僅限開發的 loopback HTTP 中繼 URL 逃生口。生產環境中繼 URL 應維持使用 HTTPS。
- `gateway.handshakeTimeoutMs`：預先驗證 Gateway WebSocket 握手逾時 (毫秒)。預設值：`15000`。設定時 `OPENCLAW_HANDSHAKE_TIMEOUT_MS` 優先。在負載較高或效能較低的主機上，若本機用戶端可能在啟動暖機尚未完成時進行連線，請增加此數值。
- `gateway.channelHealthCheckMinutes`：通道健康監控間隔 (分鐘)。設定 `0` 以全域停用健康監控重新啟動。預設值：`5`。
- `gateway.channelStaleEventThresholdMinutes`：過時 Socket 臨界值 (分鐘)。請保持此值大於或等於 `gateway.channelHealthCheckMinutes`。預設值：`30`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶在滾動一小時內的最大健康監控重新啟動次數。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：每個通道選擇不進行健康監控重新啟動，同時保持全域監控已啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多重帳戶通道的每個帳戶覆寫。設定後，其優先順序高於通道層級的覆寫。
- 本機 gateway 呼叫路徑僅當 `gateway.auth.*` 未設定時，才能使用 `gateway.remote.*` 作為後援。
- 如果 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef 明確設定且未解析，解析會以失敗結束 (無遠端後援遮罩)。
- `trustedProxies`：終止 TLS 或注入轉送用戶端標頭的反向 Proxy IP。僅列出您控制的 proxy。Loopback 項目對於同主機 proxy/本機偵測設定 (例如 Tailscale Serve 或本機反向 proxy) 仍然有效，但它們**不會**使 loopback 要求符合 `gateway.auth.mode: "trusted-proxy"` 的資格。
- `allowRealIpFallback`：當 `true` 時，如果缺少 `X-Forwarded-For`，gateway 會接受 `X-Real-IP`。預設 `false` 以實施失敗關閉行為。
- `gateway.nodes.pairing.autoApproveCidrs`：用於自動核准無要求範圍的首次節點裝置配對的可選 CIDR/IP 允許清單。未設定時會停用。這不會自動核准操作員/瀏覽器/Control UI/WebChat 配對，也不會自動核准角色、範圍、中繼資料或公開金鑰升級。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：在配對和平台允許清單評估之後，對已宣告的節點指令進行全域允許/拒絕調整。使用 `allowCommands` 以選用危險的節點指令，例如 `camera.snap`、`camera.clip` 和 `screen.record`；`denyCommands` 會移除指令，即使平台預設或明確允許原本包含它。節點變更其已宣告的指令清單後，請拒絕並重新核准該裝置配對，以便 gateway 儲存更新的指令快照。
- `gateway.tools.deny`：針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱 (延伸預設拒絕清單)。
- `gateway.tools.allow`：從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- 管理員 HTTP RPC：預設關閉，作為 `admin-http-rpc` 外掛。啟用此外掛以註冊 `POST /api/v1/admin/rpc`。請參閱 [管理員 HTTP RPC](/zh-Hant/plugins/admin-http-rpc)。
- 聊天完成：預設停用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入強化：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空白允許清單將被視為未設定；請使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 來停用 URL 擷取。
- 選用的回應強化標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` (僅針對您控制的 HTTPS 來源設定；請參閱 [受信任代理程式驗證](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### 多重執行個體隔離

在同一台主機上使用唯一的連接埠和狀態目錄執行多個閘道：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便利旗標：`--dev` (使用 `~/.openclaw-dev` + 連接埠 `19001`)、`--profile <name>` (使用 `~/.openclaw-<name>`)。

請參閱 [多重閘道](/zh-Hant/gateway/multiple-gateways)。

### `gateway.tls`

```json5
{
  gateway: {
    tls: {
      enabled: false,
      autoGenerate: false,
      certPath: "/etc/openclaw/tls/server.crt",
      keyPath: "/etc/openclaw/tls/server.key",
      caPath: "/etc/openclaw/tls/ca-bundle.crt",
    },
  },
}
```

- `enabled`：在閘道監聽器上啟用 TLS 終止 (HTTPS/WSS) (預設值：`false`)。
- `autoGenerate`：當未設定明確的檔案時，自動生成本地自簽憑證/金鑰組；僅供本地/開發使用。
- `certPath`：TLS 憑證檔案的檔案系統路徑。
- `keyPath`：TLS 私金鑰檔案的檔案系統路徑；請保持權限限制。
- `caPath`：用於客戶端驗證或自訂信任鏈的選用 CA 套件路徑。

### `gateway.reload`

```json5
{
  gateway: {
    reload: {
      mode: "hybrid", // off | restart | hot | hybrid
      debounceMs: 500,
      deferralTimeoutMs: 300000,
    },
  },
}
```

- `mode`：控制如何在執行階段套用設定編輯。
  - `"off"`：忽略即時編輯；變更需要明確重新啟動。
  - `"restart"`：設定變更時一律重新啟動閘道程序。
  - `"hot"`：在程序內套用變更而不重新啟動。
  - `"hybrid"` (預設)：先嘗試熱重新載入；如果需要，則回退到重新啟動。
- `debounceMs`：套用設定變更前的去抖動視窗，以毫秒為單位（非負整數）。
- `deferralTimeoutMs`：在強制重新啟動或通道熱重新載入之前，等待進行中作業的可選最大時間（毫秒）。省略此設定以使用預設的有界等待（`300000`）；設定 `0` 以無限期等待並記錄週期性的仍待處理警告。

---

## Hooks

```json5
{
  hooks: {
    enabled: true,
    token: "shared-secret",
    path: "/hooks",
    maxBodyBytes: 262144,
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: true,
    allowedSessionKeyPrefixes: ["hook:", "hook:gmail:"],
    allowedAgentIds: ["hooks", "main"],
    presets: ["gmail"],
    transformsDir: "~/.openclaw/hooks/transforms",
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        agentId: "hooks",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "From: {{messages[0].from}}\nSubject: {{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "last",
        model: "openai/gpt-5.4-mini",
      },
    ],
  },
}
```

Auth：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
Query-string hook tokens 會被拒絕。

驗證與安全性注意事項：

- `hooks.enabled=true` 需要一個非空的 `hooks.token`。
- `hooks.token` 必須與 `gateway.auth.token` **不同**；重複使用 Gateway token 會被拒絕。
- `hooks.path` 不能是 `/`；請使用專用的子路徑，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果 mapping 或 preset 使用樣板化的 `sessionKey`，請設定 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。靜態 mapping 鍵不需要該選項加入。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 來自請求 payload 的 `sessionKey` 僅在 `hooks.allowRequestSessionKey=true` 時被接受（預設：`false`）。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析
  - 樣板渲染的 mapping `sessionKey` 值被視為外部提供，並且也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="對應詳情">

- `match.path` 符合 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 符合通用路徑的 Payload 欄位。
- 像 `{{messages[0].subject}}` 這樣的模板會從 Payload 讀取。
- `transform` 可以指向一個返回 Hook 動作的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，並且保持在 `hooks.transformsDir` 內（絕對路徑和路徑遍歷會被拒絕）。
  - 將 `hooks.transformsDir` 保持在 `~/.openclaw/hooks/transforms` 下；工作區技能目錄會被拒絕。如果 `openclaw doctor` 報告此路徑無效，請將轉換模組移至 hooks 轉換目錄或移除 `hooks.transformsDir`。
- `agentId` 路由至特定的 Agent；未知的 ID 會回退至預設值。
- `allowedAgentIds`：限制明確路由（`*` 或省略 = 允許所有，`[]` = 拒絕所有）。
- `defaultSessionKey`：針對沒有明確 `sessionKey` 的 Hook Agent 執行，可選的固定 Session Key。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者和模板驅動的對應 Session Key 來設定 `sessionKey`（預設值：`false`）。
- `allowedSessionKeyPrefixes`：針對明確的 `sessionKey` 值（請求 + 對應），可選的前綴允許清單，例如 `["hook:"]`。當任何對應或預設集使用模板化的 `sessionKey` 時，它會變成必填項目。
- `deliver: true` 將最終回覆發送到通道；`channel` 預設為 `last`。
- `model` 會覆寫此 Hook 執行的 LLM（如果設定了模型目錄，則必須允許）。

</Accordion>

### Gmail 整合

- 內建的 Gmail 預設集使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留該逐訊息路由，請設定 `hooks.allowRequestSessionKey: true` 並限制 `hooks.allowedSessionKeyPrefixes` 以符合 Gmail 命名空間，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，請使用靜態 `sessionKey` 覆寫預設，而不是使用預設的範本。

```json5
{
  hooks: {
    gmail: {
      account: "openclaw@gmail.com",
      topic: "projects/<project-id>/topics/gog-gmail-watch",
      subscription: "gog-gmail-watch-push",
      pushToken: "shared-push-token",
      hookUrl: "http://127.0.0.1:18789/hooks/gmail",
      includeBody: true,
      maxBytes: 20000,
      renewEveryMinutes: 720,
      serve: { bind: "127.0.0.1", port: 8788, path: "/" },
      tailscale: { mode: "funnel", path: "/gmail-pubsub" },
      model: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
      thinking: "off",
    },
  },
}
```

- 當設定時，Gateway 會在啟動時自動啟動 `gog gmail watch serve`。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以停用。
- 請勿與 Gateway 同時執行單獨的 `gog gmail watch serve`。

---

## Canvas 外掛主機

```json5
{
  plugins: {
    entries: {
      canvas: {
        config: {
          host: {
            root: "~/.openclaw/workspace/canvas",
            liveReload: true,
            // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
          },
        },
      },
    },
  },
}
```

- 在 Gateway 埠下透過 HTTP 提供可由 Agent 編輯的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 僅限本機：保持 `gateway.bind: "loopback"`（預設）。
- 非回環綁定：canvas 路由需要 Gateway 認證（權杖/密碼/受信任代理），與其他 Gateway HTTP 介面相同。
- Node WebView 通常不會傳送認證標頭；在節點配對並連線後，Gateway 會通告用於 canvas/A2UI 存取的節點範圍功能 URL。
- 功能 URL 綁定到作用中節點 WS 工作階段並會快速過期。不使用基於 IP 的後備機制。
- 將即時重載用戶端插入到提供的 HTML 中。
- 當空白時自動建立初始 `index.html`。
- 同時在 `/__openclaw__/a2ui/` 提供 A2UI。
- 變更需要重新啟動 Gateway。
- 針對大型目錄或 `EMFILE` 錯誤，請停用即時重載。

---

## 探索

### mDNS (Bonjour)

```json5
{
  discovery: {
    mdns: {
      mode: "minimal", // minimal | full | off
    },
  },
}
```

- `minimal`（當啟用內建 `bonjour` 外掛時的預設值）：從 TXT 記錄中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`；LAN 多播廣告仍需啟用內建 `bonjour` 外掛。
- `off`：在不變更外掛啟用狀態的情況下抑制 LAN 多播廣告。
- 內建 `bonjour` 外掛會在 macOS 主機上自動啟動，並在 Linux、Windows 和容器化 Gateway 部署中為選用。
- 當主機名稱是有效的 DNS 標籤時，預設為系統主機名稱，否則回退至 `openclaw`。可使用 `OPENCLAW_MDNS_HOSTNAME` 覆蓋。

### 廣域網 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下寫入單播 DNS-SD 區域。若要進行跨網路探索，請搭配 DNS 伺服器（建議使用 CoreDNS）+ Tailscale 分割 DNS。

設定：`openclaw dns setup --apply`。

---

## 環境

### `env` (內聯環境變數)

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: {
      GROQ_API_KEY: "gsk-...",
    },
    shellEnv: {
      enabled: true,
      timeoutMs: 15000,
    },
  },
}
```

- 僅當程序環境缺少該鍵時，才會套用內聯環境變數。
- `.env` 檔案：目前工作目錄 `.env` + `~/.openclaw/.env` (兩者皆不會覆蓋現有變數)。
- `shellEnv`：從您的登入 shell 設定檔匯入缺少的預期鍵。
- 請參閱 [環境](/zh-Hant/help/environment) 以瞭解完整的優先順序。

### 環境變數替換

使用 `${VAR_NAME}` 在任何設定字串中參照環境變數：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`。
- 缺少/空的變數會在載入設定時拋出錯誤。
- 使用 `$${VAR}` 跳脫以取得字面 `${VAR}`。
- 適用於 `$include`。

---

## 機密

機密參照是累加的：純文字值仍然有效。

### `SecretRef`

使用一種物件形狀：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

驗證：

- `provider` 模式：`^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：絕對 JSON 指標 (例如 `"/providers/openai/apiKey"`)
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `source: "exec"` id 不得包含 `.` 或 `..` 斜線分隔的路徑區段 (例如 `a/../b` 會被拒絕)

### 支援的憑證表面

- 標準矩陣：[SecretRef 憑證表面](/zh-Hant/reference/secretref-credential-surface)
- `secrets apply` 目標支援的 `openclaw.json` 憑證路徑。
- `auth-profiles.json` 參照包含在執行時期解析和稽核覆蓋範圍中。

### 秘密提供者配置

```json5
{
  secrets: {
    providers: {
      default: { source: "env" }, // optional explicit env provider
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json",
        timeoutMs: 5000,
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        passEnv: ["PATH", "VAULT_ADDR"],
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
  },
}
```

備註：

- `file` 提供者支援 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下 `id` 必須為 `"value"`）。
- 當無法使用 Windows ACL 驗證時，檔案和 exec 提供者路徑會以封閉式失敗。僅針對無法驗證的信任路徑設定 `allowInsecurePath: true`。
- `exec` 提供者需要絕對 `command` 路徑，並在 stdin/stdout 上使用協定承載。
- 依預設，會拒絕符號連結命令路徑。設定 `allowSymlinkCommand: true` 以允許符號連結路徑，同時驗證解析後的目標路徑。
- 如果設定了 `trustedDirs`，信任目錄檢查會套用至解析後的目標路徑。
- `exec` 子進程環境預設為最小化；請使用 `passEnv` 明確傳遞所需變數。
- 秘密參照會在啟動時解析為記憶體內快照，之後請求路徑僅讀取該快照。
- 啟用介面篩選會在啟動期間套用：已啟用介面上未解析的參照會導致啟動/重新載入失敗，而非啟用介面則會跳過並輸出診斷資訊。

---

## 驗證儲存

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai-codex:personal": { provider: "openai-codex", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      "openai-codex": ["openai-codex:personal"],
    },
  },
}
```

- 每個代理的設定檔儲存在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 針對靜態憑證模式支援層級參照（`keyRef` 用於 `api_key`，`tokenRef` 用於 `token`）。
- 舊版扁平 `auth-profiles.json` 對應（例如 `{ "provider": { "apiKey": "..." } }`）並非執行時期格式；`openclaw doctor --fix` 會將其重寫為具有 `.legacy-flat.*.bak` 備份的標準 `provider:default` API 金鑰設定檔。
- OAuth 模式設定檔（`auth.profiles.<id>.mode = "oauth"`）不支援由 SecretRef 支援的驗證設定檔憑證。
- 靜態執行時期憑證來自記憶體內解析快照；發現舊版靜態 `auth.json` 項目時會將其清除。
- 從 `~/.openclaw/credentials/oauth.json` 匯入舊版 OAuth。
- 請參閱 [OAuth](/zh-Hant/concepts/oauth)。
- Secrets 執行時期行為與 `audit/configure/apply` 工具：[Secrets 管理](/zh-Hant/gateway/secrets)。

### `auth.cooldowns`

```json5
{
  auth: {
    cooldowns: {
      billingBackoffHours: 5,
      billingBackoffHoursByProvider: { anthropic: 3, openai: 8 },
      billingMaxHours: 24,
      authPermanentBackoffMinutes: 10,
      authPermanentMaxMinutes: 60,
      failureWindowHours: 24,
      overloadedProfileRotations: 1,
      overloadedBackoffMs: 0,
      rateLimitedProfileRotations: 1,
    },
  },
}
```

- `billingBackoffHours`：當設定檔因真正的計費/餘額不足錯誤而失敗時，以小時計的基礎退避時間（預設值：`5`）。即使在 `401`/`403` 回應上，明確的計費文字仍可能歸類於此，但供應商特定的文字比對器仍僅限於擁有它們的供應商（例如 OpenRouter `Key limit exceeded`）。可重試的 HTTP `402` 使用量視窗或組織/工作區支出上限訊息則改為保留在 `rate_limit` 路徑中。
- `billingBackoffHoursByProvider`：選用的各供應商計費退避小時數覆寫值。
- `billingMaxHours`：計費退避指數增長以小時計的上限（預設值：`24`）。
- `authPermanentBackoffMinutes`：高信心度 `auth_permanent` 失敗的基礎退避時間，以分鐘計（預設值：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增長以分鐘計的上限（預設值：`60`）。
- `failureWindowHours`：用於退避計數器的以小時計滾動視窗（預設值：`24`）。
- `overloadedProfileRotations`：在切換到模型後援之前，針對過載錯誤的最大同供應商認證設定檔輪換次數（預設值：`1`）。供應商忙碌的形狀（例如 `ModelNotReadyException`）會歸類於此。
- `overloadedBackoffMs`：重試過載供應商/設定檔輪換前的固定延遲時間（預設值：`0`）。
- `rateLimitedProfileRotations`：在切換到模型後備之前，針對速率限制錯誤的同一供應商身分驗證設定檔輪換最大次數（預設：`1`）。該速率限制區塊包含供應商格式的文字，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

---

## 日誌記錄

```json5
{
  logging: {
    level: "info",
    file: "/tmp/openclaw/openclaw.log",
    consoleLevel: "info",
    consoleStyle: "pretty", // pretty | compact | json
    redactSensitive: "tools", // off | tools
    redactPatterns: ["\\bTOKEN\\b\\s*[=:]\\s*([\"']?)([^\\s\"']+)\\1"],
  },
}
```

- 預設日誌檔案：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`。
- 設定 `logging.file` 以使用穩定的路徑。
- 當 `--verbose` 時，`consoleLevel` 會遞增至 `debug`。
- `maxFileBytes`：輪換前作用中日誌檔案的最大大小（位元組）（正整數；預設：`104857600` = 100 MB）。OpenClaw 會在作用中檔案旁保留最多五個編號的封存檔。
- `redactSensitive` / `redactPatterns`：針對主控台輸出、檔案日誌、OTLP 日誌記錄和持久化會話逐字稿文字的盡力遮罩。`redactSensitive: "off"` 僅停用此一般日誌/逐字稿策略；UI/工具/診斷安全介面在發送前仍會對秘密進行編修。

---

## 診斷

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,
    stuckSessionAbortMs: 300000,
    memoryPressureSnapshot: false,

    otel: {
      enabled: false,
      endpoint: "https://otel-collector.example.com:4318",
      tracesEndpoint: "https://traces.example.com/v1/traces",
      metricsEndpoint: "https://metrics.example.com/v1/metrics",
      logsEndpoint: "https://logs.example.com/v1/logs",
      protocol: "http/protobuf", // http/protobuf | grpc
      headers: { "x-tenant-id": "my-org" },
      serviceName: "openclaw-gateway",
      traces: true,
      metrics: true,
      logs: false,
      sampleRate: 1.0,
      flushIntervalMs: 5000,
      captureContent: {
        enabled: false,
        inputMessages: false,
        outputMessages: false,
        toolInputs: false,
        toolOutputs: false,
        systemPrompt: false,
      },
    },

    cacheTrace: {
      enabled: false,
      filePath: "~/.openclaw/logs/cache-trace.jsonl",
      includeMessages: true,
      includePrompt: true,
      includeSystem: true,
    },
  },
}
```

- `enabled`：檢測輸出的主切換開關（預設：`true`）。
- `flags`：啟用目標日誌輸出的旗標字串陣列（支援萬用字元，如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：將長時間執行的處理會話分類為 `session.long_running`、`session.stalled` 或 `session.stuck` 的無進行進度年齡閾值（毫秒）。回覆、工具、狀態、區塊和 ACP 進度會重置計時器；重複的 `session.stuck` 診斷訊息若未變更則會退避。
- `stuckSessionAbortMs`：可中斷排除合資格停滯作用中工作以進行復原之前的無進行進度年齡閾值（毫秒）。未設定時，OpenClaw 會使用更安全的延長內嵌執行視窗，至少為 5 分鐘和 3 倍的 `stuckSessionWarnMs`。
- `memoryPressureSnapshot`：當記憶體壓力達到 `critical`（預設值：`false`）時，擷取一經過編輯的 OOM 前穩定性快照。設為 `true` 以新增穩定性套件的檔案掃描/寫入，同時保留正常的記憶體壓力事件。
- `otel.enabled`：啟用 OpenTelemetry 匯出管線（預設值：`false`）。如需完整設定、訊號目錄與隱私模型，請參閱 [OpenTelemetry export](/zh-Hant/gateway/opentelemetry)。
- `otel.endpoint`：OTel 匯出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：選用的訊號專屬 OTLP 端點。設定後，將僅針對該訊號覆寫 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（預設值）或 `"grpc"`。
- `otel.headers`：隨 OTel 匯出請求一併傳送的額外 HTTP/gRPC 中繼資料標頭。
- `otel.serviceName`：資源屬性的服務名稱。
- `otel.traces` / `otel.metrics` / `otel.logs`：啟用追蹤、指標或記錄匯出。
- `otel.sampleRate`：追蹤取樣率 `0`-`1`。
- `otel.flushIntervalMs`：定期遙測排清間隔（毫秒）。
- `otel.captureContent`：選用 OTEL span 屬性的原始內容擷取。預設為關閉。布林值 `true` 會擷取非系統訊息/工具內容；物件格式可讓您明確啟用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs` 與 `systemPrompt`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：最新實驗性 GenAI span 提供者屬性的環境切換開關。預設情況下，spans 為了相容性會保留舊版 `gen_ai.system` 屬性；GenAI 指標則使用有界的語意屬性。
- `OPENCLAW_OTEL_PRELOADED=1`：針對已註冊全域 OpenTelemetry SDK 之主機的環境切換開關。OpenClaw 將跳過外掛擁有的 SDK 啟動/關閉，同時保持診斷監聽器處於啟用狀態。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：當未設定相符的設定鍵時，所使用的特定訊號端點環境變數。
- `cacheTrace.enabled`：記錄嵌入式執行的快取追蹤快照（預設值：`false`）。
- `cacheTrace.filePath`：快取追蹤 JSONL 的輸出路徑（預設值：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制快取追蹤輸出中包含的內容（全部預設值：`true`）。

---

## 更新

```json5
{
  update: {
    channel: "stable", // stable | beta | dev
    checkOnStart: true,

    auto: {
      enabled: false,
      stableDelayHours: 6,
      stableJitterHours: 12,
      betaCheckIntervalHours: 1,
    },
  },
}
```

- `channel`：npm/git 安裝的發行管道 - `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：當閘道啟動時檢查 npm 更新（預設值：`true`）。
- `auto.enabled`：啟用套件安裝的背景自動更新（預設值：`false`）。
- `auto.stableDelayHours`：穩定版管道自動套用前的最小延遲時間（以小時為單位）（預設值：`6`；最大值：`168`）。
- `auto.stableJitterHours`：額外的穩定版管道推出散佈視窗（以小時為單位）（預設值：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：Beta 版管道檢查的執行頻率（以小時為單位）（預設值：`1`；最大值：`24`）。

---

## ACP

```json5
{
  acp: {
    enabled: true,
    dispatch: { enabled: true },
    backend: "acpx",
    defaultAgent: "main",
    allowedAgents: ["main", "ops"],
    maxConcurrentSessions: 10,

    stream: {
      coalesceIdleMs: 50,
      maxChunkChars: 1000,
      repeatSuppression: true,
      deliveryMode: "live", // live | final_only
      hiddenBoundarySeparator: "paragraph", // none | space | newline | paragraph
      maxOutputChars: 50000,
      maxSessionUpdateChars: 500,
    },

    runtime: {
      ttlMinutes: 30,
    },
  },
}
```

- `enabled`：全域 ACP 功能開關（預設值：`true`；設定為 `false` 以隱藏 ACP 分派和生成功能）。
- `dispatch.enabled`：ACP 會話輪次分派的獨立開關（預設值：`true`）。設定為 `false` 可在阻止執行的同時保持 ACP 指令可用。
- `backend`：預設 ACP 執行後端 ID（必須符合已註冊的 ACP 執行外掛）。
  請先安裝後端外掛，如果設定了 `plugins.allow`，請包含後端外掛 ID（例如 `acpx`），否則 ACP 後端將不會載入。
- `defaultAgent`：當衍生程序未指定明確目標時，使用的備用 ACP 目標代理 ID。
- `allowedAgents`：允許用於 ACP 執行階段作業的代理 ID 白名單；空白表示沒有額外限制。
- `maxConcurrentSessions`：最大並行作用中 ACP 作業數量。
- `stream.coalesceIdleMs`：串流文字的閒置排入視窗（毫秒）。
- `stream.maxChunkChars`：分割串流區塊投影前的最大區塊大小。
- `stream.repeatSuppression`：抑制每回合重複的狀態/工具行（預設：`true`）。
- `stream.deliveryMode`：`"live"` 逐步串流；`"final_only"` 緩衝直到回合終端事件。
- `stream.hiddenBoundarySeparator`：隱藏工具事件後顯示文字之前的分隔符（預設：`"paragraph"`）。
- `stream.maxOutputChars`：每 ACP 回合投影的最大助理輸出字元數。
- `stream.maxSessionUpdateChars`：投影 ACP 狀態/更新行的最大字元數。
- `stream.tagVisibility`：標籤名稱到布林值可見性覆寫的記錄，用於串流事件。
- `runtime.ttlMinutes`：ACP 作業工作者的閒置 TTL（分鐘），之後才符合清除資格。
- `runtime.installCommand`：啟動 ACP 執行環境時執行的可選安裝指令。

---

## CLI

```json5
{
  cli: {
    banner: {
      taglineMode: "off", // random | default | off
    },
  },
}
```

- `cli.banner.taglineMode` 控制橫幅標語風格：
  - `"random"`（預設）：輪換有趣/季節性標語。
  - `"default"`：固定中性標語（`All your chats, one OpenClaw.`）。
  - `"off"`：無標語文字（仍顯示橫幅標題/版本）。
- 若要隱藏整個橫幅（不僅是標語），請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

---

## 精靈

由 CLI 引導設定流程寫入的中繼資料 (`onboard`, `configure`, `doctor`)：

```json5
{
  wizard: {
    lastRunAt: "2026-01-01T00:00:00.000Z",
    lastRunVersion: "2026.1.4",
    lastRunCommit: "abc1234",
    lastRunCommand: "configure",
    lastRunMode: "local",
  },
}
```

---

## 身分識別

請參閱 [Agent defaults](/zh-Hant/gateway/config-agents#agent-defaults) 下的 `agents.list` 身分識別欄位。

---

## 橋接器 (舊版，已移除)

目前的組建不再包含 TCP 橋接器。節點透過 Gateway WebSocket 連線。`bridge.*` 金鑰已不再是配置架構的一部分 (驗證會失敗，直到將其移除；`openclaw doctor --fix` 可以移除未知的金鑰)。

<Accordion title="舊版橋接器配置 (歷史參考)">

```json
{
  "bridge": {
    "enabled": true,
    "port": 18790,
    "bind": "tailnet",
    "tls": {
      "enabled": true,
      "autoGenerate": true
    }
  }
}
```

</Accordion>

---

## Cron

```json5
{
  cron: {
    enabled: true,
    maxConcurrentRuns: 2, // cron dispatch + isolated cron agent-turn execution
    webhook: "https://example.invalid/legacy", // deprecated fallback for stored notify:true jobs
    webhookToken: "replace-with-dedicated-token", // optional bearer token for outbound webhook auth
    sessionRetention: "24h", // duration string or false
    runLog: {
      maxBytes: "2mb", // default 2_000_000 bytes
      keepLines: 2000, // default 2000
    },
  },
}
```

- `sessionRetention`：在從 `sessions.json` 清除之前，保留已完成的隔離 cron 執行階段的時間長度。同時也控制已封存且已刪除的 cron 腳本的清理作業。預設值：`24h`；設為 `false` 以停用。
- `runLog.maxBytes`：每次執行日誌檔 (`cron/runs/<jobId>.jsonl`) 在清除前的最大大小。預設值：`2_000_000` 位元組。
- `runLog.keepLines`：觸發執行日誌清除時保留的最新行數。預設值：`2000`。
- `webhookToken`：用於 cron webhook POST 傳送 (`delivery.mode = "webhook"`) 的 bearer token，如果省略則不傳送 auth 標頭。
- `webhook`：已棄用的舊版後備 webhook URL (http/https)，僅用於仍有 `notify: true` 的已儲存作業。

### `cron.retry`

```json5
{
  cron: {
    retry: {
      maxAttempts: 3,
      backoffMs: [30000, 60000, 300000],
      retryOn: ["rate_limit", "overloaded", "network", "timeout", "server_error"],
    },
  },
}
```

- `maxAttempts`：一次性作業在暫時性錯誤上的最大重試次數 (預設值：`3`；範圍：`0`-`10`)。
- `backoffMs`：每次重試嘗試的退避延遲陣列，以毫秒為單位 (預設值：`[30000, 60000, 300000]`；1-10 個項目)。
- `retryOn`：觸發重試的錯誤類型 - `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略則重試所有暫時性類型。

僅適用於一次性 cron 任務。週期性任務使用獨立的失敗處理機制。

### `cron.failureAlert`

```json5
{
  cron: {
    failureAlert: {
      enabled: false,
      after: 3,
      cooldownMs: 3600000,
      includeSkipped: false,
      mode: "announce",
      accountId: "main",
    },
  },
}
```

- `enabled`：啟用 cron 任務的失敗警報（預設值：`false`）。
- `after`：觸發警報前的連續失敗次數（正整數，最小值：`1`）。
- `cooldownMs`：對同一任務重複警報之間的最小毫秒數（非負整數）。
- `includeSkipped`：將連續跳過的執行計入警報閾值（預設值：`false`）。跳過的執行會被單獨追蹤，且不影響執行錯誤的退避。
- `mode`：傳遞模式 - `"announce"` 透過頻道訊息發送；`"webhook"` 發佈至已配置的 webhook。
- `accountId`：用於限定警報傳遞範圍的選用帳戶或頻道 ID。

### `cron.failureDestination`

```json5
{
  cron: {
    failureDestination: {
      mode: "announce",
      channel: "last",
      to: "channel:C1234567890",
      accountId: "main",
    },
  },
}
```

- 所有任務的 cron 失敗通知的預設目的地。
- `mode`：`"announce"` 或 `"webhook"`；當存在足夠的目標資料時，預設為 `"announce"`。
- `channel`：公告傳遞的頻道覆寫。`"last"` 會重用最後已知傳遞頻道。
- `to`：明確的公告目標或 webhook URL。Webhook 模式必填。
- `accountId`：用於傳遞的選用帳戶覆寫。
- 各任務的 `delivery.failureDestination` 會覆寫此全域預設值。
- 當未設定全域或個別任務的失敗目的地時，已透過 `announce` 傳遞的任務在失敗時會回退至該主要公告目標。
- 除非作業的主要 `delivery.mode` 是 `"webhook"`，否則 `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 作業。

請參閱 [Cron Jobs](/zh-Hant/automation/cron-jobs)。獨立的 cron 執行會被追蹤為 [background tasks](/zh-Hant/automation/tasks)。

---

## 媒體模型範本變數

在 `tools.media.models[].args` 中展開的範本佔位符：

| 變數               | 說明                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的傳入訊息內容                           |
| `{{RawBody}}`      | 原始內容（無歷史/發送者包裝器）              |
| `{{BodyStripped}}` | 移除群組提及的內容                           |
| `{{From}}`         | 發送者識別碼                                 |
| `{{To}}`           | 目的地識別碼                                 |
| `{{MessageSid}}`   | 頻道訊息 ID                                  |
| `{{SessionId}}`    | 目前工作階段 UUID                            |
| `{{IsNewSession}}` | 建立新工作階段時 `"true"`                    |
| `{{MediaUrl}}`     | 傳入媒體虛擬 URL                             |
| `{{MediaPath}}`    | 本機媒體路徑                                 |
| `{{MediaType}}`    | 媒體類型（image/audio/document/...）         |
| `{{Transcript}}`   | 音訊轉錄                                     |
| `{{Prompt}}`       | CLI 項目的已解析媒體提示                     |
| `{{MaxChars}}`     | CLI 項目的已解析最大輸出字元數               |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群組主題（盡力而為）                         |
| `{{GroupMembers}}` | 群組成員預覽（盡力而為）                     |
| `{{SenderName}}`   | 發送者顯示名稱（盡力而為）                   |
| `{{SenderE164}}`   | 發送者電話號碼（盡力而為）                   |
| `{{Provider}}`     | 提供者提示（whatsapp、telegram、discord 等） |

---

## Config includes (`$include`)

將設定拆分為多個檔案：

```json5
// ~/.openclaw/openclaw.json
{
  gateway: { port: 18789 },
  agents: { $include: "./agents.json5" },
  broadcast: {
    $include: ["./clients/mueller.json5", "./clients/schmidt.json5"],
  },
}
```

**合併行為：**

- 單一檔案：取代包含物件。
- 檔案陣列：按順序進行深度合併（後者覆蓋前者）。
- 同層級金鑰：在 include 之後合併（覆蓋已包含的值）。
- 巢狀 include：最多深達 10 層。
- 路徑：相對於包含它的檔案解析，但必須保持在頂層設定目錄（`dirname` 的 `openclaw.json`）內。僅當絕對/`../` 形式仍解析到該邊界內時，才允許使用。
- 由 OpenClaw 擁有的寫入操作，如果只更改由單一檔案包含支援的一個頂層區段，則會直接寫入該被包含的檔案。例如，`plugins install` 會更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，並保持 `openclaw.json` 不變。
- 根包含、包含陣列以及具有同級覆寫的包含對於 OpenClaw 擁有的寫入是唯讀的；這些寫入操作會失敗並關閉，而不是扁平化設定。
- 錯誤：針對遺失檔案、解析錯誤和循環包含的明確訊息。

---

_相關：[Configuration](/zh-Hant/gateway/configuration) · [Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [Configuration](/zh-Hant/gateway/configuration)
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
