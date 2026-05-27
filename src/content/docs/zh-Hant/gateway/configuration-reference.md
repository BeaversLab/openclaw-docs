---
summary: "核心 OpenClaw 金鑰、預設值及專用子系統參考連結的 Gateway 設定參考"
title: "設定參考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

`~/.openclaw/openclaw.json` 的核心配置參考。如需面向任務的概覽，請參閱[配置](/zh-Hant/gateway/configuration)。

涵蓋主要的 OpenClaw 設定層面，並在子系統擁有自身更深入的參考資料時提供連結。通道 和外掛 擁有的指令目錄以及深度記憶體/QMD 調整選項位於各自的頁面上，而非此頁。

程式碼基準：

- `openclaw config schema` 會列印用於驗證和控制 UI 的即時 JSON Schema，並在可用時合併套件/外掛/通道的中繼資料
- `config.schema.lookup` 會傳回一個用於深入檢視工具的路徑範圍 Schema 節點
- `pnpm config:docs:check` / `pnpm config:docs:gen` 會針對目前的 Schema 表面驗證設定文件基準雜湊

Agent 查詢路徑：在編輯前，使用 `gateway` 工具動作 `config.schema.lookup` 以取得確切的欄位級文件和約束。請使用[配置](/zh-Hant/gateway/configuration)獲取面向任務的指導，並使用本頁面獲取更廣泛的欄位對應、預設值以及子系統參考的連結。

專屬深度參考資料：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 以及 `plugins.entries.memory-core.config.dreaming` 下的做夢配置的[記憶體配置參考](/zh-Hant/reference/memory-config)
- 目前內建 + 捆綁指令目錄的[斜線指令](/zh-Hant/tools/slash-commands)
- 擁有者通道/外掛頁面，用於通道特定的指令介面

設定格式為 **JSON5**（允許註解和結尾逗號）。所有欄位皆為選用 - 若省略，OpenClaw 會使用安全的預設值。

---

## 通道

各頻道配置金鑰已移至專用頁面 - 請參閱 `channels.*` 的[配置 - 頻道](/zh-Hant/gateway/config-channels)，包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他捆綁頻道（驗證、存取控制、多帳號、提及閘道）。

## Agent 預設值、多重 Agent、工作階段與訊息

已移至專用頁面 - 請參閱[配置 - Agents](/zh-Hant/gateway/config-agents) 以了解：

- `agents.defaults.*` (工作區、模型、思考、心跳、記憶體、媒體、技能、沙箱)
- `multiAgent.*` (多重 Agent 路由和綁定)
- `session.*` (會話生命週期、壓縮、修剪)
- `messages.*` (訊息傳遞、TTS、Markdown 渲染)
- `talk.*` (交談模式)
  - `talk.consultThinkingLevel`：Control UI 交談即時諮詢背後執行的完整 OpenClaw Agent 之思考層級覆寫
  - `talk.consultFastMode`：Control UI 交談即時諮詢的一次性快速模式覆寫
  - `talk.speechLocale`：用於 iOS/macOS 上交談語音辨識的選用 BCP 47 地區 ID
  - `talk.silenceTimeoutMs`：若未設定，交談會在發送文字記錄前保留平台預設的暫停視窗 (`700 ms on macOS and Android, 900 ms on iOS`)
  - `talk.realtime.consultRouting`：針對跳過 `openclaw_agent_consult` 的最終即時 Talk 轉錄的 Gateway 中繼後援

## 工具和自訂提供者

工具政策、實驗性切換開關、提供者支援的工具配置，以及自訂提供者/基本 URL 設定已移至專用頁面 - 請參閱[配置 - 工具和自訂提供者](/zh-Hant/gateway/config-tools)。

## 模型

提供者定義、模型允許清單和自訂提供者設定位於[配置 - 工具和自訂提供者](/zh-Hant/gateway/config-tools#custom-providers-and-base-urls)中。
`models` 根目錄也擁有全域模型目錄行為。

```json5
{
  models: {
    // Optional. Default: true. Requires a Gateway restart when changed.
    pricing: { enabled: false },
  },
}
```

- `models.mode`：提供者目錄行為（`merge` 或 `replace`）。
- `models.providers`：依提供者 ID 索引的自訂提供者對應。
- `models.providers.*.localService`：本地模型服務器的可選按需進程管理器。OpenClaw 會探測已配置的健康端點，在需要時啟動絕對 `command`，等待就緒，然後發送模型請求。參閱[本地模型服務](/zh-Hant/gateway/local-model-services)。
- `models.pricing.enabled`：控制在 sidecar 和通道到達 Gateway 就緒路徑後啟動的後台定價引導。當 `false` 時，Gateway 會跳過 OpenRouter 和 LiteLLM 定價目錄的獲取；配置的 `models.providers.*.models[].cost` 值仍可用於本地成本估算。

## MCP

由 OpenClaw 管理的 MCP 伺服器定義位於 `mcp.servers` 下，並由嵌入式 Pi 和其他運行時適配器使用。`openclaw mcp list`、`show`、`set` 和 `unset` 指令可在不連接到目標伺服器的情況下管理此區塊，即使在配置編輯期間。

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

- `mcp.servers`：針對暴露已配置 MCP 工具的運行時的命名 stdio 或遠端 MCP 伺服器定義。遠端條目使用 `transport: "streamable-http"` 或 `transport: "sse"`；`type: "http"` 是一個 CLI 原生別名，`openclaw mcp set` 和 `openclaw doctor --fix` 會將其規範化為標準 `transport` 欄位。
- `mcp.servers.<name>.codex`：選用的 Codex app-server 投射控制項。
  此區塊僅供 Codex app-server 執行緒使用的 OpenClaw 元資料；它不會
  影響 ACP 工作階段、通用 Codex harness 設定，或其他執行時期轉接器。
  非空的 `codex.agents` 會將伺服器限制為列出的 OpenClaw 代理程式 ID。
  空白、空白或無效的範圍代理程式清單會被設定驗證拒絕，
  並且會在執行時期投射路徑中被省略，而不是變成全域設定。
  `codex.defaultToolsApprovalMode` 會發出該伺服器的 Codex 原生
  `default_tools_approval_mode`。OpenClaw 會在將原生 `mcp_servers` 設定
  傳遞給 Codex 之前移除 `codex`
  區塊。省略此區塊可
  讓伺服器使用 Codex 的預設 MCP 核准行為，為每個 Codex app-server 代理程式保持投射狀態。
- `mcp.sessionIdleTtlMs`：工作階段範圍內附帶 MCP 執行時期的閒置 TTL。
  單次嵌入式執行會請求執行結束時的清理；此 TTL 是
  長期工作階段和未來呼叫者的最後防線。
- `mcp.*` 下的變更會透過捨棄快取的工作階段 MCP 執行時期來熱套用。
  下一次工具探索/使用會根據新設定重新建立它們，因此移除的
  `mcp.servers` 項目會立即被清除，而無需等待閒置 TTL。

請參閱 [MCP](/zh-Hant/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI 後端](/zh-Hant/gateway/cli-backends#bundle-mcp-overlays) 以了解執行時期行為。

## 技能

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

- `allowBundled`：僅適用於附帶技能的選用允許清單（受管理/工作區技能不受影響）。
- `load.extraDirs`：額外的共享技能根目錄（優先順序最低）。
- `load.allowSymlinkTargets`：當連結位於其設定的來源根目錄之外時，
  技能符號連結可以解析的信任真實目標根目錄。
- `install.preferBrew`：當為 true 時，如果 `brew` 可用，
  則在回退到其他安裝程式類型之前，優先使用 Homebrew 安裝程式。
- `install.nodeManager`：`metadata.openclaw.install`
  規格的節點安裝程式偏好設定（`npm` | `pnpm` | `yarn` | `bun`）。
- `install.allowUploadedArchives`：允許受信任的 `operator.admin` Gateway 客戶端安裝透過 `skills.upload.*` 暫存的私有 zip 封存（預設值：false）。這僅啟用上傳封存路徑；一般的 ClawHub 安裝不需要此設定。
- `entries.<skillKey>.enabled: false` 會停用技能，即使該技能已內建或已安裝。
- `entries.<skillKey>.apiKey`：針對宣告主要環境變數（純文字字串或 SecretRef 物件）的技能所提供的便利欄位。

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
- 探索功能接受原生 OpenClaw 外掛程式，以及相容的 Codex 套件組合和 Claude 套件組合，包括無資訊清單 的 Claude 預設配置套件組合。
- **組態變更需要重新啟動閘道。**
- `allow`：選用的允許清單（僅載入列出的外掛程式）。`deny` 優先。
- `bundledDiscovery`：對於新組態預設為 `"allowlist"`，因此非空的 `plugins.allow` 也會對內建提供者外掛程式進行篩選，包括 web-search 執行階段提供者。Doctor 會為已遷移的舊版允許清單組態寫入 `"compat"`，以保留現有的內建提供者行為，直到您選擇加入。
- `plugins.entries.<id>.apiKey`：外掛程式層級 API 金鑰的便利欄位（當外掛程式支援時）。
- `plugins.entries.<id>.env`：外掛程式範圍的環境變數對應。
- `plugins.entries.<id>.hooks.allowPromptInjection`：當 `false` 時，核心會阻擋 `before_prompt_build` 並忽略來自舊版 `before_agent_start` 的提示變更欄位，同時保留舊版的 `modelOverride` 和 `providerOverride`。適用於原生外掛程式掛鉤和支援的套件組合提供之掛鉤目錄。
- `plugins.entries.<id>.hooks.allowConversationAccess`：當 `true` 時，受信任的非捆綁外掛程式可以從類型化鉤子（例如 `llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize` 和 `agent_end`）讀取原始對話內容。
- `plugins.entries.<id>.subagent.allowModelOverride`：明確信任此外掛程式，以便為背景子代理程式執行請求每次執行的 `provider` 和 `model` 覆寫。
- `plugins.entries.<id>.subagent.allowedModels`：受信任子代理程式覆寫的規範 `provider/model` 目標的可選允許清單。僅當您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.llm.allowModelOverride`：明確信任此外掛程式，以便為 `api.runtime.llm.complete` 請求模型覆寫。
- `plugins.entries.<id>.llm.allowedModels`：受信任外掛程式 LLM 完成覆寫的規範 `provider/model` 目標的可選允許清單。僅當您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.llm.allowAgentIdOverride`：明確信任此外掛程式，以便對非預設代理程式 ID 執行 `api.runtime.llm.complete`。
- `plugins.entries.<id>.config`：外掛程式定義的設定物件（在可用時由原生 OpenClaw 外掛程式架構驗證）。
- 通道外掛程式帳戶/執行時設定位於 `channels.<id>` 之下，並且應由擁有外掛程式的清單 `channelConfigs` 元數據描述，而不是由中央 OpenClaw 選項註冊表描述。

### Codex harness 外掛程式配置

隨附的 `codex` 外掛程式擁有
`plugins.entries.codex.config` 下的原生 Codex 應用程式伺服器 harness 設定。請參閱
[Codex harness 參考](/zh-Hant/plugins/codex-harness-reference) 以了解完整的配置
介面，並參閱 [Codex harness](/zh-Hant/plugins/codex-harness) 以了解執行時模型。

`codexPlugins` 僅套用於選擇原生 Codex harness 的工作階段。
它不會為 Pi、一般 OpenAI provider 執行、ACP
對話綁定或任何非 Codex harness 啟用 Codex 外掛程式。

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

- `plugins.entries.codex.config.codexPlugins.enabled`：為 Codex harness 啟用原生 Codex
  外掛程式/應用程式支援。預設值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`：
  針對已遷移外掛程式應用程式提示的預設破壞性動作原則。
  預設值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：當全域 `codexPlugins.enabled`
  也為 true 時，啟用已遷移的外掛程式項目。
  針對明確項目的預設值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：
  穩定的市集身分識別。V1 僅支援 `"openai-curated"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：來自遷移的穩定
  Codex 外掛程式身分識別，例如 `"google-calendar"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：
  各外掛程式的破壞性動作覆寫。若省略，則使用全域
  `allow_destructive_actions` 值。

`codexPlugins.enabled` 是全域啟用指令。由遷移寫入的明確外掛程式
項目是持續安裝與修復資格集合。
`plugins["*"]` 不受支援，沒有 `install` 開關，且本機
`marketplacePath` 值故意不設為設定欄位，因為它們是
主機特定的。

`app/list` 就緒檢查會快取一小時，並在過期時
以非同步方式重新整理。Codex 執行緒應用程式設定是在 Codex harness
工作階段建立時計算，而非每個回合都計算；變更原生外掛程式設定後，請使用 `/new`、`/reset` 或重新啟動
gateway。

- `plugins.entries.firecrawl.config.webFetch`：Firecrawl web-fetch provider 設定。
  - `apiKey`：Firecrawl API 金鑰（接受 SecretRef）。會依序退回至 `plugins.entries.firecrawl.config.webSearch.apiKey`、舊版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 環境變數。
  - `baseUrl`：Firecrawl API 基礎 URL（預設：`https://api.firecrawl.dev`；自託管的覆寫必須以私有/內部端點為目標）。
  - `onlyMainContent`：僅從頁面提取主要內容（預設：`true`）。
  - `maxAgeMs`：最大快取壽命（以毫秒為單位）（預設：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取請求逾時時間（以秒為單位）（預設：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search (Grok 網路搜尋) 設定。
  - `enabled`：啟用 X Search 提供者。
  - `model`：用於搜尋的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：記憶做夢設定。請參閱 [Dreaming](/zh-Hant/concepts/dreaming) 以了解階段與閾值。
  - `enabled`：做夢主開關（預設 `false`）。
  - `frequency`：每次完整做夢掃描的 cron 頻率（預設為 `"0 3 * * *"`）。
  - `model`：選用的 Dream Diary 子代理模型覆寫。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；搭配 `allowedModels` 以限制目標。模型不可用錯誤會使用工作階段預設模型重試一次；信任或允許清單失敗不會靜默地回退。
  - 階段策略與閾值是實作細節（非使用者可見的設定金鑰）。
- 完整的記憶設定位於 [Memory configuration reference](/zh-Hant/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已啟用的 Claude bundle 插件也可以從 `settings.json` 提供內嵌的 Pi 預設值；OpenClaw 會將這些值套用為經過清理的代理設定，而不是原始的 OpenClaw 設定補丁。
- `plugins.slots.memory`：選取作用中的記憶插件 ID，或使用 `"none"` 停用記憶插件。
- `plugins.slots.contextEngine`：選取使用中的語境引擎外掛程式 ID；除非您安裝並選取另一個引擎，否則預設為 `"legacy"`。

請參閱 [外掛程式](/zh-Hant/tools/plugin)。

---

## 承諾

`commitments` 控制推斷的後續記憶：OpenClaw 可以偵測交談回合中的簽到，並透過心跳執行來傳遞它們。

- `commitments.enabled`：啟用推斷後續承諾的隱藏 LLM 擷取、儲存和心跳傳遞。預設值：`false`。
- `commitments.maxPerDay`：每個 Agent 會話在滾動一天內傳遞的最大推斷後續承諾數。預設值：`3`。

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
- `tabCleanup` 會在閒置時間後或當工作階段超過其上限時，回收追蹤的主要 Agent 分頁。設定 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 即可停用這些個別的清理模式。
- 未設定時 `ssrfPolicy.dangerouslyAllowPrivateNetwork` 會停用，因此瀏覽器導航預設保持嚴格模式。
- 僅在您刻意信任私人網路瀏覽器導航時，才設定 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在嚴格模式下，遠端 CDP 設定檔端點 (`profiles.*.cdpUrl`) 在連線能力/探索檢查期間也會受到相同的私人網路封鎖。
- `ssrfPolicy.allowPrivateNetwork` 作為舊版別名仍受支援。
- 在嚴格模式下，請使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 進行明確的例外處理。
- 遠端設定檔僅支援附加模式 (已停用 start/stop/reset)。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  當您希望 OpenClaw 探索 `/json/version` 時請使用 HTTP(S)；當您的提供者給您直接的 DevTools WebSocket URL 時請使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 適用於遠端和
  `attachOnly` CDP 連線性以及分頁開啟請求。受管 loopback
  設定檔保留本機 CDP 預設值。
- 如果外部受管的 CDP 服務可透過 loopback 到達，請設定該
  設定檔的 `attachOnly: true`；否則 OpenClaw 會將 loopback 連接埠視為
  本機受管瀏覽器設定檔，並可能回報本機連接埠擁有權錯誤。
- `existing-session` 設定檔使用 Chrome MCP 而非 CDP，並可附加至
  選定的主機或透過連線的瀏覽器節點。
- `existing-session` 設定檔可以設定 `userDataDir` 來指定特定的
  Chromium 系瀏覽器設定檔，例如 Brave 或 Edge。
- `existing-session` 設定檔保持目前的 Chrome MCP 路由限制：
  快照/參照驅動的動作，而非 CSS 選擇器定位，單一檔案上傳
  掛鉤，無對話方塊逾時覆寫，無 `wait --load networkidle`，且無
  `responsebody`、PDF 匯出、下載攔截或批次動作。
- 本機受管 `openclaw` 設定檔會自動指派 `cdpPort` 和 `cdpUrl`；僅
  針對遠端 CDP 明確設定 `cdpUrl`。
- 本機受管設定檔可以設定 `executablePath` 來覆寫該設定檔的全域
  `browser.executablePath`。使用此功能可在 Chrome 中執行一個設定檔，而在 Brave 中執行另一個。
- 本機受管設定檔使用 `browser.localLaunchTimeoutMs` 進行程序啟動後的 Chrome CDP HTTP
  探索，並使用 `browser.localCdpReadyTimeoutMs` 進行
  啟動後 CDP websocket 就緒檢查。在較慢的主機上調高這些值，其中 Chrome
  啟動成功但就緒檢查與啟動程序發生競爭。兩個值都必須是
  不超過 `120000` 毫秒的正整數；無效的設定值將被拒絕。
- 自動偵測順序：如果基於 Chromium 則為預設瀏覽器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 都在 Chromium 啟動前接受 `~` 和 `~/...` 作為您的作業系統主目錄。`existing-session` 設定檔上每個設定檔的 `userDataDir` 也會進行波浪號擴展。
- 控制服務：僅限回環（連接埠衍生自 `gateway.port`，預設為 `18791`）。
- `extraArgs` 會將額外的啟動旗標附加到本機 Chromium 啟動過程中（例如 `--disable-gpu`、視窗大小或偵錯旗標）。

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

- `seamColor`：原生應用程式 UI 鉻（Talk Mode 氣泡色彩等）的強調顏色。
- `assistant`：控制 UI 身份覆寫。如果未指定，則回退至作用中代理程式的身份。

---

## Gateway

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

<Accordion title="Gateway 欄位詳細資訊">

- `mode`：`local` (執行閘道) 或 `remote` (連線至遠端閘道)。除非為 `local`，否則閘道將拒絕啟動。
- `port`：用於 WS + HTTP 的單一多工連接埠。優先順序：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback` (預設)、`lan` (`0.0.0.0`)、`tailnet` (僅限 Tailscale IP)，或 `custom`。
- **舊版綁定別名**：請在 `gateway.bind` 中使用綁定模式值 (`auto`、`loopback`、`lan`、`tailnet`、`custom`)，而非主機別名 (`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`)。
- **Docker 說明**：預設的 `loopback` 綁定會接聽容器內的 `127.0.0.1`。使用 Docker 橋接網路 (`-p 18789:18789`) 時，流量會抵達 `eth0`，因此無法存取閘道。請使用 `--network host`，或設定 `bind: "lan"` (或搭配 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`) 以接聽所有介面。
- **驗證**：預設為必填。非回送綁定需要閘道驗證。實務上這表示共享權杖/密碼，或是具備 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向代理伺服器。入門精靈預設會產生權杖。
- 如果同時設定 `gateway.auth.token` 和 `gateway.auth.password` (包括 SecretRefs)，請將 `gateway.auth.mode` 明確設為 `token` 或 `password`。若同時設定兩者但未設定模式，啟動與服務安裝/修復流程將會失敗。
- `gateway.auth.mode: "none"`：明確的無驗證模式。僅用於受信任的本機回送設定；入門提示刻意不提供此選項。
- `gateway.auth.mode: "trusted-proxy"`：將瀏覽器/使用者驗證委派給身分感知反向代理伺服器，並信任來自 `gateway.trustedProxies` 的身分標頭 (請參閱 [信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth))。此模式預設期望 **非回送** 的 Proxy 來源；同主機回送反向 Proxy 需要明確設定 `gateway.auth.trustedProxy.allowLoopback = true`。內部同主機呼叫者可以使用 `gateway.auth.password` 作為本機直接後援；`gateway.auth.token` 與信任的 Proxy 模式仍互斥。
- `gateway.auth.allowTailscale`：當 `true` 時，Tailscale Serve 身分標頭可滿足 Control UI/WebSocket 驗證 (透過 `tailscale whois` 驗證)。HTTP API 端點 **不會** 使用該 Tailscale 標頭驗證；而是遵循閘道的正常 HTTP 驗證模式。此無權杖流程假設閘道主機受信任。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`：選用的失敗驗證限制器。會針對每個用戶端 IP 和每個驗證範圍套用 (shared-secret 和 device-token 獨立追蹤)。被封鎖的嘗試會傳回 `429` + `Retry-After`。
  - 在非同步 Tailscale Serve Control UI 路徑上，同一個 `{scope, clientIp}` 的失敗嘗試會在寫入失敗前序列化。因此，來自同一用戶端的並發錯誤嘗試可能會在第二個請求時觸發限制器，而不是兩者皆作為一般不符的情況競爭通過。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；若您刻意想要對 localhost 流量也進行速率限制 (例如測試設定或嚴格的 Proxy 部署)，請設定 `false`。
- 瀏覽器來源的 WS 驗證嘗試一律會在停用回送豁免的情況下進行節流 (防禦性措施，以抵抗瀏覽器對 localhost 的暴力破解)。
- 在回送上，這些瀏覽器來源的鎖定是依正規化後的 `Origin`
  值隔離，因此來自一個 localhost 來源的重複失敗不會自動
  鎖定不同的來源。
- `tailscale.mode`：`serve` (僅限 tailnet，回送綁定) 或 `funnel` (公開，需要驗證)。
- `tailscale.preserveFunnel`：當 `true` 且 `tailscale.mode = "serve"` 時，OpenClaw
  會在啟動時重新套用 Serve 之前檢查 `tailscale funnel status`，如果外部設定的
  Funnel 路由已經涵蓋閘道連接埠，則會跳過它。
  預設為 `false`。
- `controlUi.allowedOrigins`：針對 Gateway WebSocket 連線的明確瀏覽器來源允許清單。公開的非回送瀏覽器來源必須使用。來自回送、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主機的私人同來源 LAN/Tailnet UI 載入，在不啟用 Host 標頭後援的情況下即被接受。
- `controlUi.chatMessageMaxWidth`：群組 Control UI 聊天訊息的選用最大寬度。接受受限的 CSS 寬度值，例如 `960px`、`82%`、`min(1280px, 82%)` 和 `calc(100% - 2rem)`。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危險模式，針對刻意仰賴 Host 標頭來源原則的部署啟用 Host 標頭來源後援。
- `remote.transport`：`ssh` (預設) 或 `direct` (ws/wss)。對於 `direct`，公開主機的 `remote.url` 必須為 `wss://`；純文字 `ws://` 僅接受回送、LAN、link-local、`.local`、`.ts.net` 和 Tailscale CGNAT 主機。
- `remote.remotePort`：遠端 SSH 主機上的閘道連接埠。預設為 `18789`；當本機通道連接埠與遠端閘道連接埠不同時使用。
- `gateway.remote.token` / `.password` 是遠端用戶端認證欄位。它們本身不會設定閘道驗證。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 版本在向閘道發佈支援中繼的註冊後，所使用之外部 APNs 中繼的基底 HTTPS URL。此 URL 必須符合編譯至 iOS 版本中的中繼 URL。
- `gateway.push.apns.relay.timeoutMs`：閘道至中繼的傳送逾時 (毫秒)。預設為 `10000`。
- 支援中繼的註冊會委派給特定的閘道身分。配對的 iOS 應用程式會擷取 `gateway.identity.get`，在該中繼註冊中包含該身分，並將註冊範圍的傳送權限轉發至閘道。另一個閘道無法重複使用該儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中繼設定的臨時環境變數覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：僅供開發使用的回送 HTTP 中繼 URL 逃生門。生產環境的中繼 URL 應保持使用 HTTPS。
- `gateway.handshakeTimeoutMs`：驗證前 Gateway WebSocket 握手逾時 (毫秒)。預設值：`15000`。若設定 `OPENCLAW_HANDSHAKE_TIMEOUT_MS` 則優先採用。若本機用戶端在啟動暖機尚未完成時即可連線，請在負載過高或低效能主機上增加此值。
- `gateway.channelHealthCheckMinutes`：通道健康監控間隔 (分鐘)。設定 `0` 可全域停用健康監控重新啟動。預設值：`5`。
- `gateway.channelStaleEventThresholdMinutes`：過時通訊端閾值 (分鐘)。請將此值保持在 `gateway.channelHealthCheckMinutes` 以上。預設值：`30`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶在每小時內的最大健康監控重新啟動次數。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：針對健康監控重新啟動的每個通道退出選項，同時保持全域監控啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多重帳戶通道的每個帳戶覆寫。設定後，其優先順序高於通道層級的覆寫。
- 本機閘道呼叫路徑只有在未設定 `gateway.auth.*` 時，才能將 `gateway.remote.*` 作為後援使用。
- 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定且未解析，解析將以失敗結束 (沒有遠端後援遮罩)。
- `trustedProxies`：終止 TLS 或插入轉送用戶端標頭的反向 Proxy IP。僅列出您控制的 Proxy。回送項目對於同主機 Proxy/本機偵測設定 (例如 Tailscale Serve 或本機反向 Proxy) 仍然有效，但它們 **不會** 讓回送請求有資格使用 `gateway.auth.mode: "trusted-proxy"`。
- `allowRealIpFallback`：當 `true` 時，如果缺少 `X-Forwarded-For`，閘道會接受 `X-Real-IP`。預設為 `false` 以實現封閉式失敗行為。
- `gateway.nodes.pairing.autoApproveCidrs`：用於自動核准首次節點裝置配對 (無要求範圍) 的選用 CIDR/IP 允許清單。若未設定則停用。這不會自動核准操作員/瀏覽器/Control UI/WebChat 配對，也不會自動核准角色、範圍、中繼資料或公開金鑰升級。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：配對後和平台允許清單評估後，對已宣告節點指令的全域允許/拒絕形塑。使用 `allowCommands` 以選擇啟用危險的節點指令，例如 `camera.snap`、`camera.clip` 和 `screen.record`；`denyCommands` 會移除指令，即使平台預設值或明確允許原本會包含它。節點變更已宣告的指令清單後，請拒絕並重新核准該裝置配對，以便閘道儲存更新的指令快照。
- `gateway.tools.deny`：針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱 (擴充預設拒絕清單)。
- `gateway.tools.allow`：從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- Admin HTTP RPC：預設關閉，作為 `admin-http-rpc` 外掛程式。啟用此外掛程式以註冊 `POST /api/v1/admin/rpc`。請參閱 [Admin HTTP RPC](/zh-Hant/plugins/admin-http-rpc)。
- Chat Completions：預設停用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入強化防護：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空的允許清單會被視為未設定；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 來停用 URL 擷取。
- 選用的回應強化防護標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` (僅針對您控制的 HTTPS 來源設定；請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### 多執行個體隔離

在同一台主機上使用唯一的連接埠和狀態目錄執行多個閘道：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便利旗標：`--dev` (使用 `~/.openclaw-dev` + 連接埠 `19001`)、`--profile <name>` (使用 `~/.openclaw-<name>`)。

請參閱 [Multiple Gateways](/zh-Hant/gateway/multiple-gateways)。

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

- `enabled`：在閘道監聽器 (HTTPS/WSS) 啟用 TLS 終止 (預設：`false`)。
- `autoGenerate`：在未設定明確檔案時自動產生本機自我簽署的憑證/金鑰組；僅供本機/開發使用。
- `certPath`：TLS 憑證檔案的檔案系統路徑。
- `keyPath`：TLS 私鑰檔案的檔案系統路徑；請保持權限受限制。
- `caPath`：選用的 CA 套件路徑，用於用戶端驗證或自訂信任鏈。

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

- `mode`：控制如何在執行時期套用設定編輯。
  - `"off"`：忽略即時編輯；變更需要明確重新啟動。
  - `"restart"`：設定變更時一律重新啟動閘道程序。
  - `"hot"`：在程序內套用變更而不重新啟動。
  - `"hybrid"` (預設值): 優先嘗試熱重新載入；若需要則回退到重新啟動。
- `debounceMs`: 套用設定變更前的防抖動視窗，以毫秒為單位 (非負整數)。
- `deferralTimeoutMs`: 強制重新啟動或通道熱重新載入前，等待進行中作業的可選最大時間，以毫秒為單位。省略此設定以使用預設的有界等待 (`300000`)；設定 `0` 以無限期等待並記錄週期性的仍待處理警告。

---

## 掛鉤

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

驗證: `Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
查詢字串掛鉤令牌會被拒絕。

驗證與安全性注意事項：

- `hooks.enabled=true` 需要非空白的 `hooks.token`。
- `hooks.token` 必須與 `gateway.auth.token` **不同**；重複使用 Gateway 令牌會被拒絕。
- `hooks.path` 不能是 `/`；請使用專用的子路徑，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，請限制 `hooks.allowedSessionKeyPrefixes` (例如 `["hook:"]`)。
- 如果映射或預設集使用帶有模板的 `sessionKey`，請設定 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。靜態映射鍵不需要該選擇加入設定。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 僅當 `hooks.allowRequestSessionKey=true` (預設值: `false`) 時，才會接受來自請求載荷的 `sessionKey`。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析
  - 透過模板渲染的映射 `sessionKey` 值被視為外部提供，並且也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="對應詳細資訊">

- `match.path` 會比對 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 會比對通用路徑的 payload 欄位。
- 諸如 `{{messages[0].subject}}` 的範本會從 payload 讀取。
- `transform` 可指向傳回 hook 動作的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，並且必須位於 `hooks.transformsDir` 內（絕對路徑和路徑遍歷會被拒絕）。
  - 請將 `hooks.transformsDir` 保持在 `~/.openclaw/hooks/transforms` 之下；工作區技能目錄會被拒絕。如果 `openclaw doctor` 回報此路徑無效，請將轉換模組移至 hooks transforms 目錄，或移除 `hooks.transformsDir`。
- `agentId` 會將路徑指向特定的代理程式；未知的 ID 會回退為預設值。
- `allowedAgentIds`：限制明確路由（`*` 或省略 = 允許所有，`[]` = 拒絕所有）。
- `defaultSessionKey`：針對沒有明確 `sessionKey` 的 hook 代理程式執行，所使用的選用固定 session 金鑰。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者和範本驅動的對應 session 金鑰來設定 `sessionKey`（預設值：`false`）。
- `allowedSessionKeyPrefixes`：針對明確 `sessionKey` 值（要求 + 對應）的選用字首允許清單，例如 `["hook:"]`。當任何對應或預設集使用範本化的 `sessionKey` 時，這會變成必填項目。
- `deliver: true` 會將最終回覆傳送至頻道；`channel` 預設為 `last`。
- `model` 會針對此 hook 執行覆寫 LLM（如果設定了模型目錄，則必須允許）。

</Accordion>

### Gmail 整合

- 內建的 Gmail 預設集使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留該逐訊息路由，請設定 `hooks.allowRequestSessionKey: true` 並限制 `hooks.allowedSessionKeyPrefixes` 以符合 Gmail 命名空間，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，請使用靜態 `sessionKey` 覆寫預設值，而不是使用範本化的預設值。

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

- 當經過配置時，Gateway 會在啟動時自動啟動 `gog gmail watch serve`。請設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以停用。
- 請勿在 Gateway 旁邊執行獨立的 `gog gmail watch serve`。

---

## Canvas 外掛程式主機

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

- 在 Gateway 連接埠下透過 HTTP 提供代理程式可編輯的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 僅限本機：保留 `gateway.bind: "loopback"`（預設值）。
- 非回送綁定：canvas 路由需要 Gateway 認證（令牌/密碼/受信任代理程式），與其他 Gateway HTTP 介面相同。
- Node WebViews 通常不會傳送認證標頭；在節點配對並連線後，Gateway 會針對 canvas/A2UI 存取發布節點範圍的功能 URL。
- 功能 URL 綁定至作用中的節點 WS 連線階段，且會快速過期。不使用基於 IP 的後備機制。
- 將即時重新載入用戶端插入至提供的 HTML 中。
- 當空白時自動建立入門 `index.html`。
- 也會在 `/__openclaw__/a2ui/` 提供 A2UI。
- 變更需要重新啟動 gateway。
- 對於大型目錄或 `EMFILE` 錯誤，請停用即時重新載入。

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

- `minimal`（當啟用內建 `bonjour` 外掛程式時的預設值）：從 TXT 記錄中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`；LAN 多播廣告仍需要啟用內建 `bonjour` 外掛程式。
- `off`：在不變更外掛程式啟用狀態的情況下，抑制 LAN 多播廣告。
- 內建 `bonjour` 外掛程式會在 macOS 主機上自動啟動，而在 Linux、Windows 和容器化 Gateway 部署上則為選擇性加入。
- 當主機名稱是有效的 DNS 標籤時，預設為系統主機名稱，否則回退至 `openclaw`。可使用 `OPENCLAW_MDNS_HOSTNAME` 覆寫。

### 廣域網 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下寫入單播 DNS-SD 區域。若要進行跨網路探索，請搭配 DNS 伺服器（推薦 CoreDNS）+ Tailscale 分割 DNS。

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

- 僅當程序環境中缺少該鍵時，才會套用內聯環境變數。
- `.env` 檔案：CWD `.env` + `~/.openclaw/.env` (兩者皆不會覆寫現有變數)。
- `shellEnv`：從您的登入 shell 設定檔中匯入缺少的預期鍵。
- 請參閱 [Environment](/zh-Hant/help/environment) 以了解完整的優先順序。

### 環境變數替換

使用 `${VAR_NAME}` 在任何設定字串中引用環境變數：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 僅符合大寫名稱：`[A-Z_][A-Z0-9_]*`。
- 缺少/空的變數會在載入設定時拋出錯誤。
- 使用 `$${VAR}` 逸出以取得字面值 `${VAR}`。
- 適用於 `$include`。

---

## Secrets

Secret 參照是累加的：純文字值仍然有效。

### `SecretRef`

使用一種物件形式：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

驗證：

- `provider` 模式：`^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：絕對 JSON 指標 (例如 `"/providers/openai/apiKey"`)
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `source: "exec"` id 不得包含 `.` 或 `..` 斜線分隔的路徑片段 (例如 `a/../b` 會被拒絕)

### 支援的憑證介面

- 標準矩陣：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- `secrets apply` 目標支援 `openclaw.json` 憑證路徑。
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

注意：

- `file` 提供者支援 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下 `id` 必須為 `"value"`）。
- 當無法使用 Windows ACL 驗證時，檔案和 exec 提供者路徑會以失敗關閉（fail closed）方式處理。僅對無法驗證的受信任路徑設定 `allowInsecurePath: true`。
- `exec` 提供者需要絕對的 `command` 路徑，並在 stdin/stdout 上使用協議 payload。
- 預設情況下，符號連結（symlink）指令路徑會被拒絕。設定 `allowSymlinkCommand: true` 以允許符號連結路徑，同時驗證解析後的目標路徑。
- 如果設定了 `trustedDirs`，受信任目錄檢查會套用於解析後的目標路徑。
- `exec` 子進程環境預設為最小化；請使用 `passEnv` 明確傳遞所需的變數。
- 秘密引用在啟動時會解析為記憶體中的快照，之後請求路徑僅讀取該快照。
- 啟用介面過濾會在啟動期間套用：已啟用介面上未解析的引用會導致啟動/重新載入失敗，而未啟用的介面則會被跳過並輸出診斷資訊。

---

## 認證儲存

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

- 個別代理程式的設定檔儲存於 `<agentDir>/auth-profiles.json`。
- 對於靜態憑證模式，`auth-profiles.json` 支援層級引用（`keyRef` 用於 `api_key`，`tokenRef` 用於 `token`）。
- 舊版扁平 `auth-profiles.json` 對應（例如 `{ "provider": { "apiKey": "..." } }`）並非執行時期格式；`openclaw doctor --fix` 會將其重寫為具有 `.legacy-flat.*.bak` 備份的標準 `provider:default` API 金鑰設定檔。
- OAuth 模式設定檔（`auth.profiles.<id>.mode = "oauth"`）不支援 SecretRef 支援的認證設定檔憑證。
- 靜態執行時期憑證來自記憶體中解析的快照；舊版靜態 `auth.json` 條目在被發現時會被清除。
- 從 `~/.openclaw/credentials/oauth.json` 匯入舊版 OAuth。
- 請參閱 [OAuth](/zh-Hant/concepts/oauth)。
- Secrets 執行時期行為和 `audit/configure/apply` 工具：[Secrets Management](/zh-Hant/gateway/secrets)。

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

- `billingBackoffHours`：當設定檔因真正的帳單/信用額度不足錯誤而失敗時，以小時為單位的基本退避時間（預設：`5`）。即使是在 `401`/`403` 回應上，明確的帳單文字仍可能落在這裡，但供應商特定的文字比對器仍會限制在擁有它們的供應商範圍內（例如 OpenRouter `Key limit exceeded`）。可重試的 HTTP `402` 使用量視窗或組織/工作區花費限制訊息則會保留在 `rate_limit` 路徑中。
- `billingBackoffHoursByProvider`：可選的各供應商覆寫，用於帳單退避小時數。
- `billingMaxHours`：帳單退避指數增長的小時數上限（預設：`24`）。
- `authPermanentBackoffMinutes`：高信心度 `auth_permanent` 失敗的基本退避時間，以分鐘為單位（預設：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增長的分鐘數上限（預設：`60`）。
- `failureWindowHours`：用於退避計數器的滾動視窗，以小時為單位（預設：`24`）。
- `overloadedProfileRotations`：在切換到模型後備之前，針對過載錯誤的最大同供應商驗證設定檔輪換次數（預設：`1`）。諸如 `ModelNotReadyException` 等供應商忙碌形態會落在這裡。
- `overloadedBackoffMs`：重試過載供應商/設定檔輪換前的固定延遲（預設：`0`）。
- `rateLimitedProfileRotations`：在切換到模型備援之前，針對速率限制錯誤的最大同供應商 auth-profile 輪換次數（預設值：`1`）。該速率限制區塊包含供應商形態的文字，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

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
- 設定 `logging.file` 以取得穩定的路徑。
- 當 `--verbose` 時，`consoleLevel` 會提升至 `debug`。
- `maxFileBytes`：輪換前的作用中日誌檔案大小上限（位元組；正整數；預設值：`104857600` = 100 MB）。OpenClaw 會在作用中檔案旁保留最多五個編號的存檔。
- `redactSensitive` / `redactPatterns`：針對主控台輸出、檔案日誌、OTLP 日誌記錄和持久化的會話文字紀錄的盡力遮罩。`redactSensitive: "off"` 僅停用此一般日誌/紀錄原則；UI/工具/診斷安全介面在輸出前仍會對機密進行編輯。

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

- `enabled`：檢測輸出的主控開關（預設值：`true`）。
- `flags`：啟用目標日誌輸出的旗標字串陣列（支援如 `"telegram.*"` 或 `"*"` 的萬用字元）。
- `stuckSessionWarnMs`：將長時間執行的處理會話分類為 `session.long_running`、`session.stalled` 或 `session.stuck` 的無進行時間臨界值（毫秒）。回覆、工具、狀態、區塊和 ACP 進度會重置計時器；重複的 `session.stuck` 診斷在未變更時會退避。
- `stuckSessionAbortMs`：在合格的停滯作用中工作可被終止排空以進行復原之前的無進行時間臨界值（毫秒）。若未設定，OpenClaw 會使用較安全的擴充內嵌執行視窗，至少為 5 分鐘和 3 倍的 `stuckSessionWarnMs`。
- `memoryPressureSnapshot`：當記憶體壓力達到 `critical` 時（預設值：`false`），捕獲已編輯的 OOM 前穩定性快照。設定為 `true` 以加入穩定性組合檔案的掃描/寫入，同時保留正常的記憶體壓力事件。
- `otel.enabled`：啟用 OpenTelemetry 匯出管線（預設值：`false`）。如需完整設定、訊號目錄與隱私權模型，請參閱 [OpenTelemetry export](/zh-Hant/gateway/opentelemetry)。
- `otel.endpoint`：OTel 匯出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：選用的特定訊號 OTLP 端點。設定後，會覆寫該訊號的 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（預設值）或 `"grpc"`。
- `otel.headers`：隨 OTel 匯出請求一併傳送的額外 HTTP/gRPC 中繼資料標頭。
- `otel.serviceName`：資源屬性的服務名稱。
- `otel.traces` / `otel.metrics` / `otel.logs`：啟用追蹤、指標或日誌匯出。
- `otel.sampleRate`：追蹤取樣率 `0`-`1`。
- `otel.flushIntervalMs`：定期遙測排清間隔（毫秒）。
- `otel.captureContent`：選用 OTEL span 屬性的原始內容擷取。預設為關閉。布林值 `true` 會擷取非系統訊息/工具內容；物件形式讓您可以明確啟用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs` 和 `systemPrompt`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：最新實驗性 GenAI span 提供者屬性的環境切換開關。預設情況下，span 為了相容性會保留舊版的 `gen_ai.system` 屬性；GenAI 指標則使用受限語意屬性。
- `OPENCLAW_OTEL_PRELOADED=1`：針對已註冊全域 OpenTelemetry SDK 之主機的環境切換開關。OpenClaw 將會跳過外掛擁有的 SDK 啟動/關閉，同時保持診斷監聽器處於啟用狀態。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：當未設定匹配的配置鍵時，使用的特定訊號端點環境變數。
- `cacheTrace.enabled`：記錄嵌入式執行的快取追蹤快照（預設值：`false`）。
- `cacheTrace.filePath`：快取追蹤 JSONL 的輸出路徑（預設值：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制快取追蹤輸出中包含的內容（預設均為：`true`）。

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

- `channel`：npm/git 安裝的發布管道 - `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：當閘道啟動時檢查 npm 更新（預設值：`true`）。
- `auto.enabled`：啟用套件安裝的背景自動更新（預設值：`false`）。
- `auto.stableDelayHours`：穩定版管道自動套用前的最小延遲時間，以小時為單位（預設值：`6`；最大值：`168`）。
- `auto.stableJitterHours`：額外的穩定版管道推出分散時間視窗，以小時為單位（預設值：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：Beta 版管道檢查的運行頻率，以小時為單位（預設值：`1`；最大值：`24`）。

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

- `enabled`：全域 ACP 功能開關（預設值：`true`；設定為 `false` 以隱藏 ACP 分派和生成工具）。
- `dispatch.enabled`：ACP 會話輪次分派的獨立開關（預設值：`true`）。設定為 `false` 以在阻止執行的同時保持 ACP 指令可用。
- `backend`：預設 ACP 運行時後端 ID（必須符合已註冊的 ACP 運行時插件）。
  先安裝後端插件，如果設定了 `plugins.allow`，請包含後端插件 ID（例如 `acpx`），否則 ACP 後端將無法載入。
- `defaultAgent`：當衍生未指定明確目標時的備用 ACP 目標代理 ID。
- `allowedAgents`：允許用於 ACP 運行時階段的代理 ID 白名單；空白表示沒有額外限制。
- `maxConcurrentSessions`：最大並行活躍 ACP 階段數。
- `stream.coalesceIdleMs`：串流文字的閒置排空視窗（毫秒）。
- `stream.maxChunkChars`：分割串流區塊投影前的最大區塊大小。
- `stream.repeatSuppression`：抑制每輪重複的狀態/工具行（預設：`true`）。
- `stream.deliveryMode`：`"live"` 逐步串流；`"final_only"` 緩衝直到輪次終端事件。
- `stream.hiddenBoundarySeparator`：隱藏工具事件後，可見文字之前的分隔符（預設：`"paragraph"`）。
- `stream.maxOutputChars`：每個 ACP 輪次投影的最大助理輸出字元數。
- `stream.maxSessionUpdateChars`：投影 ACP 狀態/更新行的最大字元數。
- `stream.tagVisibility`：用於串流事件的標籤名稱對布林可見性覆寫值的記錄。
- `runtime.ttlMinutes`：ACP 階段工作程序符合清理條件前的閒置 TTL（分鐘）。
- `runtime.installCommand`：初始化 ACP 運行時環境時執行的可選安裝指令。

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

- `cli.banner.taglineMode` 控制橫幅標語樣式：
  - `"random"`（預設）：輪換有趣/季節性標語。
  - `"default"`：固定的中性標語（`All your chats, one OpenClaw.`）。
  - `"off"`：無標語文字（仍顯示橫幅標題/版本）。
- 若要隱藏整個橫幅（不僅是標語），請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

---

## 精靈

由 CLI 引導式設定流程寫入的中繼資料（`onboard`、`configure`、`doctor`）：

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

## 身分

請參閱 [Agent defaults](/zh-Hant/gateway/config-agents#agent-defaults) 下的 `agents.list` 身分欄位。

---

## Bridge (舊版，已移除)

目前的組建不再包含 TCP bridge。節點透過 Gateway WebSocket 進行連線。`bridge.*` 金鑰已不再是設定架構的一部分（驗證會失敗直到移除為止；`openclaw doctor --fix` 可去除未知金鑰）。

<Accordion title="舊版 bridge 設定 (歷史參考)">

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

- `sessionRetention`：在從 `sessions.json` 修剪之前保留已完成的隔離 cron 執行階段的時間長度。同時也控制已封存之已刪除 cron 逐字稿的清理。預設值：`24h`；設定 `false` 以停用。
- `runLog.maxBytes`：修剪前每個執行記錄檔 (`cron/runs/<jobId>.jsonl`) 的最大大小。預設值：`2_000_000` 位元組。
- `runLog.keepLines`：觸發執行記錄修剪時保留的最新行數。預設值：`2000`。
- `webhookToken`：用於 cron webhook POST 傳遞 (`delivery.mode = "webhook"`) 的 bearer token，如果省略則不傳送 auth 標頭。
- `webhook`：已棄用的舊版後備 webhook URL (http/https)，僅用於仍有 `notify: true` 的已儲存工作。

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

- `maxAttempts`：一次性工作在暫時性錯誤上的最大重試次數（預設值：`3`；範圍：`0`-`10`）。
- `backoffMs`：每次重試嘗試的退避延遲陣列，以毫秒為單位（預設值：`[30000, 60000, 300000]`；1-10 個項目）。
- `retryOn`: 觸發重試的錯誤類型 - `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略此項以重試所有暫時性類型。

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

- `enabled`: 為 cron 任務啟用失敗警報 (預設值：`false`)。
- `after`: 觸發警報前的連續失敗次數 (正整數，最小值：`1`)。
- `cooldownMs`: 同一任務的重複警報之間的最小毫秒數 (非負整數)。
- `includeSkipped`: 將連續跳過的執行計入警報閾值 (預設值：`false`)。跳過的執行會單獨追蹤，並不會影響執行錯誤的退避策略。
- `mode`: 傳遞模式 - `"announce"` 透過頻道訊息發送；`"webhook"` 則發布至設定的 webhook。
- `accountId`: 用來限定警報傳遞範圍的選用帳號或頻道 ID。

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

- 所有 cron 任務之失敗通知的預設目的地。
- `mode`：`"announce"` 或 `"webhook"`；當有足夠的目標資料時，預設為 `"announce"`。
- `channel`：公告傳遞的頻道覆寫。`"last"` 表示重用最後已知的傳遞頻道。
- `to`：明確的公告目標或 webhook URL。Webhook 模式必填。
- `accountId`：用於傳遞的選用帳號覆寫。
- 個別任務的 `delivery.failureDestination` 會覆寫此全域預設值。
- 當未設定全域或個別任務的失敗目的地時，已透過 `announce` 傳遞的任務在失敗時會回退至該主要公告目標。
- `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 任務，除非該任務的主要 `delivery.mode` 是 `"webhook"`。

參閱 [Cron Jobs](/zh-Hant/automation/cron-jobs)。隔離的 cron 執行會被追蹤為 [background tasks](/zh-Hant/automation/tasks)。

---

## 媒體模型模板變數

在 `tools.media.models[].args` 中展開的模板佔位符：

| 變數               | 描述                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的傳入訊息主體                           |
| `{{RawBody}}`      | 原始主體（不包含歷史記錄/發送者包裝器）      |
| `{{BodyStripped}}` | 已移除群組提及的主體                         |
| `{{From}}`         | 發送者識別碼                                 |
| `{{To}}`           | 目標識別碼                                   |
| `{{MessageSid}}`   | 頻道訊息 ID                                  |
| `{{SessionId}}`    | 目前工作階段 UUID                            |
| `{{IsNewSession}}` | 建立新工作階段時的 `"true"`                  |
| `{{MediaUrl}}`     | 傳入媒體偽 URL                               |
| `{{MediaPath}}`    | 本機媒體路徑                                 |
| `{{MediaType}}`    | 媒體類型（image/audio/document/…）           |
| `{{Transcript}}`   | 音訊逐字稿                                   |
| `{{Prompt}}`       | 針對 CLI 項目解析的媒體提示                  |
| `{{MaxChars}}`     | 針對 CLI 項目解析的最大輸出字元數            |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群組主題（盡最大努力）                       |
| `{{GroupMembers}}` | 群組成員預覽（盡最大努力）                   |
| `{{SenderName}}`   | 發送者顯示名稱（盡最大努力）                 |
| `{{SenderE164}}`   | 發送者電話號碼（盡最大努力）                 |
| `{{Provider}}`     | 供應商提示（whatsapp、telegram、discord 等） |

---

## 設定包含 (`$include`)

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

- 單一檔案：取代包含的物件。
- 檔案陣列：按順序進行深度合併（後者覆蓋前者）。
- 相鄰鍵：在包含之後合併（覆寫包含的值）。
- 巢狀包含：最多 10 層深。
- 路徑：相對於包含該檔案的位置解析，但必須保持在頂層設定目錄（`dirname` 的 `openclaw.json`）內。僅當絕對路徑或 `../` 形式仍解析至該邊界內時才允許使用。路徑不得包含空位元組，且在解析前後必須嚴格短於 4096 個字元。
- 由 OpenClaw 擁有的寫入操作，若僅修改由單一檔案 include 支援的一個頂層區塊，將直接寫入至該被包含的檔案中。例如，`plugins install` 會更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，並保持 `openclaw.json` 不變。
- Root includes、include 陣列以及具有同層級覆寫的 includes，對於由 OpenClaw 擁有的寫入操作而言是唯讀的；這些寫入操作將以失敗告終，而非扁平化設定。
- 錯誤：針對檔案遺失、解析錯誤、迴圈 includes、無效路徑格式以及長度過長提供清晰的訊息。

---

_相關：[Configuration](/zh-Hant/gateway/configuration) · [Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [Configuration](/zh-Hant/gateway/configuration)
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
