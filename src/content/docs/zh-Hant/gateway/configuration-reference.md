---
summary: "核心 OpenClaw 金鑰、預設值及專用子系統參考連結的 Gateway 設定參考"
title: "設定參考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

`~/.openclaw/openclaw.json` 的核心配置參考。如需以任務為導向的概述，請參閱 [Configuration](/zh-Hant/gateway/configuration)。

涵蓋主要的 OpenClaw 設定層面，並在子系統擁有自身更深入的參考資料時提供連結。通道 和外掛 擁有的指令目錄以及深度記憶體/QMD 調整選項位於各自的頁面上，而非此頁。

程式碼基準：

- `openclaw config schema` 會列印用於驗證和控制 UI 的即時 JSON Schema，並在可用時合併套件/外掛/通道的中繼資料
- `config.schema.lookup` 會傳回一個用於深入檢視工具的路徑範圍 Schema 節點
- `pnpm config:docs:check` / `pnpm config:docs:gen` 會針對目前的 Schema 表面驗證設定文件基準雜湊

Agent 查找路徑：在編輯前使用 `gateway` 工具動作 `config.schema.lookup` 以獲取精確的欄位級文檔和約束。使用 [Configuration](/zh-Hant/gateway/configuration) 獲取以任務為導向的指導，並使用本頁面以獲取更廣泛的欄位映射、預設值以及子系統參考的連結。

專屬深度參考資料：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 的 [Memory configuration reference](/zh-Hant/reference/memory-config)，以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 配置
- 目前內建 + 捆綁指令目錄的 [Slash commands](/zh-Hant/tools/slash-commands)
- 擁有者通道/外掛頁面，用於通道特定的指令介面

設定格式為 **JSON5**（允許註解和結尾逗號）。所有欄位皆為選用 - 若省略，OpenClaw 會使用安全的預設值。

---

## 通道

各通道配置鍵已移至專用頁面 - 請參閱 [Configuration - channels](/zh-Hant/gateway/config-channels) 以取得 `channels.*`，
包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 及其他
捆綁通道（身份驗證、存取控制、多帳戶、提及閘道）。

## Agent 預設值、多重 Agent、工作階段與訊息

已移至專用頁面 - 請參閱
[Configuration - agents](/zh-Hant/gateway/config-agents) 以取得：

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

工具政策、實驗性切換、供應商支援的工具配置，以及自訂
供應商/基礎 URL 設定已移至專用頁面 - 請參閱
[Configuration - tools and custom providers](/zh-Hant/gateway/config-tools)。

## 模型

供應商定義、模型允許清單和自訂供應商設定位於
[Configuration - tools and custom providers](/zh-Hant/gateway/config-tools#custom-providers-and-base-urls)。
`models` 根節點也擁有全域模型目錄行為。

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
- `models.providers.*.localService`：可選的按需程序管理器，用於
  本地模型伺服器。OpenClaw 會探測設定的健康端點，在需要時啟動
  絕對路徑 `command`，等待就緒，然後發送模型
  請求。請參閱 [Local model services](/zh-Hant/gateway/local-model-services)。
- `models.pricing.enabled`：控制在 sidecar 和通道到達 Gateway 就緒路徑後啟動的後台定價引導。當 `false` 時，Gateway 會跳過 OpenRouter 和 LiteLLM 定價目錄的獲取；配置的 `models.providers.*.models[].cost` 值仍可用於本地成本估算。

## MCP

OpenClaw 管理的 MCP 伺服器定義位於 `mcp.servers` 之下，並由嵌入式 OpenClaw 和其他執行適配器使用。`openclaw mcp list`、`show`、`set` 和 `unset` 指令會管理此區塊，而在編輯設定時無需連線到目標伺服器。

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
        timeout: 20,
        connectTimeout: 5,
        supportsParallelToolCalls: true,
        headers: {
          Authorization: "Bearer ${MCP_REMOTE_TOKEN}",
        },
        auth: "oauth",
        oauth: {
          scope: "docs.read",
        },
        sslVerify: true,
        clientCert: "/path/to/client.crt",
        clientKey: "/path/to/client.key",
        toolFilter: {
          include: ["search_*"],
          exclude: ["admin_*"],
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
- `mcp.servers.<name>.enabled`：設定 `false` 以保留已儲存的伺服器定義，
  同時將其排除在嵌入式 OpenClaw MCP 探索和工具投影之外。
- `mcp.servers.<name>.timeout` / `requestTimeoutMs`：每個伺服器 MCP 要求
  的逾時時間，以秒或毫秒為單位。
- `mcp.servers.<name>.connectTimeout` / `connectionTimeoutMs`：每個伺服器
  的連線逾時時間，以秒或毫秒為單位。
- `mcp.servers.<name>.supportsParallelToolCalls`：可選的並行提示，
  供配接器決定是否發出並行的 MCP 工具呼叫。
- `mcp.servers.<name>.auth`：對於需要 OAuth 的 HTTP MCP 伺服器，
  請設定 `"oauth"`。執行 `openclaw mcp login <name>` 以將權杖儲存在 OpenClaw 狀態下。
- `mcp.servers.<name>.oauth`：可選的 OAuth 範圍、重新導向 URL 和用戶端
  中繼資料 URL 覆寫值。
- `mcp.servers.<name>.sslVerify`、`clientCert`、`clientKey`：針對私人端點
  和雙向 TLS 的 HTTP TLS 控制。
- `mcp.servers.<name>.toolFilter`：可選的每個伺服器工具選擇。`include`
  將探索到的 MCP 工具限制為符合的名稱；`exclude` 則隱藏
  符合的名稱。項目為精確的 MCP 工具名稱或簡單的 `*` 萬用字元。具備
  資源或提示的伺服器也會產生公用程式工具名稱（`resources_list`、
  `resources_read`、`prompts_list`、`prompts_get`），而這些名稱也使用
  相同的篩選器。
- `mcp.servers.<name>.codex`：可選的 Codex app-server 投影控制項。
  此區塊僅供 Codex app-server 執行緒使用的 OpenClaw 中繼資料；它不會
  影響 ACP 會話、通用 Codex 組態或其他執行時期配接器。
  非空的 `codex.agents` 會將伺服器限制為列出的 OpenClaw agent id。
  空白、空白或無效的範圍 agent 列表會被組態驗證拒絕
  並由執行時期投影路徑省略，而不會變成全域設定。
  `codex.defaultToolsApprovalMode` 會發出該伺服器 Codex 原生的
  `default_tools_approval_mode`。OpenClaw 會在將原生 `mcp_servers` 組態傳遞給 Codex 之前移除 `codex`
  區塊。省略此區塊可讓伺服器對所有具有 Codex
  預設 MCP 核准行為的 Codex app-server agent 保持投影。
- `mcp.sessionIdleTtlMs`：工作階段範圍綑綁 MCP 執行時的閒置 TTL。
  一次性嵌入式執行會要求執行結束時進行清理；此 TTL 是針對
  長壽命工作階段和未來呼叫者的安全網。
- `mcp.*` 下的變更會透過捨棄快取的工作階段 MCP 執行時來熱套用。
  下一次工具探索/使用會根據新設定重新建立它們，因此被移除的
  `mcp.servers` 項目會立即被回收，而不必等待閒置 TTL。
- 執行時探索也會透過捨棄該工作階段的快取目錄，來尊重 MCP 工具清單變更通知。
  宣告資源或提示的伺服器會取得用於列出/讀取資源以及列出/擷取
  提示的公用程式工具。重複的工具呼叫失敗會在嘗試另一次呼叫前
  短暫暫停受影響的伺服器。

請參閱 [MCP](/zh-Hant/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI backends](/zh-Hant/gateway/cli-backends#bundle-mcp-overlays) 以了解執行時行為。

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

- `allowBundled`：僅限綑綁技能的可選允許清單（受管理/工作區技能不受影響）。
- `load.extraDirs`：額外的共享技能根目錄（優先順序最低）。
- `load.allowSymlinkTargets`：當連結位於其設定的來源根目錄之外時，
  技能符號連結可解析進去的受信任真實目標根目錄。
- `install.preferBrew`：當為 true 時，如果 `brew` 可用，
  則在回退到其他安裝程式類型之前，優先使用 Homebrew 安裝程式。
- `install.nodeManager`：`metadata.openclaw.install` 規格的
  節點安裝程式偏好（`npm` | `pnpm` | `yarn` | `bun`）。
- `install.allowUploadedArchives`：允許受信任的 `operator.admin` Gateway
  用戶端安裝透過 `skills.upload.*` 暫存的私人 zip 封存
  （預設：false）。這僅啟用上傳封存路徑；一般的 ClawHub
  安裝不需要它。
- `entries.<skillKey>.enabled: false` 會停用技能，即使它已被綑綁/安裝。
- `entries.<skillKey>.apiKey`：針對宣告主要環境變數的技能所提供的便利功能（純文字字串或 SecretRef 物件）。

---

## 外掛程式

```json5
{
  plugins: {
    enabled: true,
    allow: ["voice-call"],
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

- 從 `~/.openclaw/extensions` 和 `<workspace>/.openclaw/extensions` 下的套件或套件組目錄載入，加上 `plugins.load.paths` 中列出的檔案或目錄。
- 將獨立的外掛檔案放在 `plugins.load.paths` 中；自動發現的擴充根目錄會忽略頂層 `.js`、`.mjs` 和 `.ts` 檔案，以免這些根目錄中的輔助腳本阻礙啟動。
- 探索功能接受原生 OpenClaw 外掛，以及相容的 Codex 套件組和 Claude 套件組，包括無資訊清單的 Claude 預設佈局套件組。
- **變更組態需要重新啟動閘道。**
- `allow`：選用性的允許清單（僅載入列出的外掛）。`deny` 具有優先權。
- `plugins.entries.<id>.apiKey`：外掛層級的 API 金鑰便利欄位（當外掛支援時）。
- `plugins.entries.<id>.env`：外掛範圍的環境變數對應。
- `plugins.entries.<id>.hooks.allowPromptInjection`：當 `false` 時，核心會阻擋 `before_prompt_build` 並忽略來自舊版 `before_agent_start` 的提示變異欄位，同時保留舊版的 `modelOverride` 和 `providerOverride`。適用於原生外掛掛勾和支援的套件組所提供的掛勾目錄。
- `plugins.entries.<id>.hooks.allowConversationAccess`：當 `true` 時，受信任的非套件組外掛可以從類型掛勾讀取原始對話內容，例如 `llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize` 和 `agent_end`。
- `plugins.entries.<id>.subagent.allowModelOverride`：明確信任此外掛以請求背景子代理執行的每次執行 `provider` 和 `model` 覆寫。
- `plugins.entries.<id>.subagent.allowedModels`：受信任子代理覆寫的正式 `provider/model` 目標的選用性允許清單。僅在您刻意想要允許任何模型時使用 `"*"`。
- `plugins.entries.<id>.llm.allowModelOverride`：明確信任此外掛程式為 `api.runtime.llm.complete` 請求模型覆寫。
- `plugins.entries.<id>.llm.allowedModels`：受信任外掛程式 LLM 完成覆寫的規範 `provider/model` 目標的可選允許清單。僅在您故意想要允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.llm.allowAgentIdOverride`：明確信任此外掛程式針對非預設代理程式 ID 執行 `api.runtime.llm.complete`。
- `plugins.entries.<id>.config`：外掛程式定義的設定物件（當可用時由原生 OpenClaw 外掛程式架構驗證）。
- 通道外掛程式帳戶/執行時設定位於 `channels.<id>` 之下，並且應由擁有外掛程式的清單 `channelConfigs` 中繼資料來描述，而不是由中央 OpenClaw 選項登錄檔描述。

### Codex harness 外掛程式設定

隨附的 `codex` 外掛程式在 `plugins.entries.codex.config` 下擁有原生 Codex app-server harness 設定。如需完整的設定介面，請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference)；如需執行時間模型，請參閱 [Codex harness](/zh-Hant/plugins/codex-harness)。

`codexPlugins` 僅適用於選擇原生 Codex harness 的作業階段。它不會為 OpenClaw 提供者執行、ACP 交談繫結或任何非 Codex harness 啟用 Codex 外掛程式。

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
  已遷移外掛程式應用程式誘導的預設破壞性動作原則。
  預設值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：當全域 `codexPlugins.enabled` 也為 true 時，啟用
  已遷移的外掛程式項目。針對明確項目的
  預設值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：穩定的市集身分識別。V1 支援 `"openai-curated"`、`"openai-bundled"` 和 `"openai-primary-runtime"`。請參閱 [原生 Codex 外掛程式](/zh-Hant/plugins/codex-native-plugins#manual-first-party-marketplace-entries) 以取得手動捆綁和主要執行時間的範例。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：從遷移而來的穩定 Codex 外掛程式身分識別，例如 `"google-calendar"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：各外掛程式的破壞性動作覆寫。如果省略，則使用全域 `allow_destructive_actions` 值。

`codexPlugins.enabled` 是全域啟用指令。由遷移寫入的明確外掛程式項目是持久安裝和修復資格集。不支援 `plugins["*"]`，沒有 `install` 開關，且本機 `marketplacePath` 值故意不設為設定欄位，因為它們是主機特定的。

`app/list` 就緒檢查會快取一小時，並在過期時非同步重新整理。Codex 執行緒應用程式設定是在 Codex harness 會話建立時計算的，而不是在每個回合；變更原生外掛程式設定後，請使用 `/new`、`/reset` 或重新啟動閘道。

- `plugins.entries.firecrawl.config.webFetch`：Firecrawl web-fetch 提供者設定。
  - `apiKey`：Firecrawl API 金鑰 (接受 SecretRef)。會退回到 `plugins.entries.firecrawl.config.webSearch.apiKey`、舊版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 環境變數。
  - `baseUrl`：Firecrawl API 基礎 URL (預設：`https://api.firecrawl.dev`；自託管的覆寫必須以私人/內部端點為目標)。
  - `onlyMainContent`：僅從頁面擷取主要內容 (預設：`true`)。
  - `maxAgeMs`：快取最大有效時間，以毫秒為單位（預設值：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取請求逾時時間，以秒為單位（預設值：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search (Grok 網頁搜尋) 設定。
  - `enabled`：啟用 X Search 提供者。
  - `model`：用於搜尋的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：記憶夢境設定。請參閱 [Dreaming](/zh-Hant/concepts/dreaming) 以了解階段與閾值。
  - `enabled`：夢境主開關（預設值 `false`）。
  - `frequency`：每次完整夢境掃描的 cron 頻率（預設為 `"0 3 * * *"`）。
  - `model`：選用的 Dream Diary 子代理程式模型覆寫。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；請搭配 `allowedModels` 以限制目標。模型無法使用時的錯誤會使用工作階段預設模型重試一次；信任或允許清單失敗不會以靜默方式回退。
  - 階段策略和閾值是實作細節（非使用者面向的配置鍵）。
- 完整的記憶體設定位於 [Memory configuration reference](/zh-Hant/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已啟用的 Claude 套件外掛程式也可以從 `settings.json` 貢獻內嵌的 OpenClaw 預設值；OpenClaw 會將其作為清理過的代理程式設定套用，而不是作為原始 OpenClaw 設定修補程式。
- `plugins.slots.memory`：選擇現用的記憶體外掛程式 ID，或選擇 `"none"` 以停用記憶體外掛程式。
- `plugins.slots.contextEngine`：選擇現用的內容引擎外掛程式 ID；除非您安裝並選擇另一個引擎，否則預設為 `"legacy"`。

請參閱 [Plugins](/zh-Hant/tools/plugin)。

---

## 承諾

`commitments` 控制推斷的後續記憶：OpenClaw 可以從對話輪次中檢測報到並透過心跳執行傳遞它們。

- `commitments.enabled`：針對推斷的後續承諾啟用隱藏的 LLM 提取、儲存和心跳交付。預設值：`false`。
- `commitments.maxPerDay`：每個代理程式會話在滾動一天內交付的推斷後續承諾數量上限。預設值：`3`。

請參閱[推斷的承諾](/zh-Hant/concepts/commitments)。

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
- `tabCleanup` 會在閒置時間或會話超過上限後回收已追蹤的主要代理程式分頁。設定 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 以停用這些個別的清理模式。
- 未設定時 `ssrfPolicy.dangerouslyAllowPrivateNetwork` 會停用，因此瀏覽器導航預設保持嚴格模式。
- 僅當您有意信任私人網路瀏覽器導航時，才設定 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在嚴格模式下，遠端 CDP 設定檔端點 (`profiles.*.cdpUrl`) 在可達性/探索檢查期間也會受到相同的私人網路封鎖限制。
- `ssrfPolicy.allowPrivateNetwork` 仍作為傳統別名支援。
- 在嚴格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 進行明確的例外處理。
- 遠端設定檔僅支援附加 (start/stop/reset 已停用)。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。當您希望 OpenClaw 探索 `/json/version` 時使用 HTTP(S)；當您的供應商提供直接 DevTools WebSocket URL 時使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 適用於遠端和 `attachOnly` CDP 可達性以及分頁開啟請求。受控回傳設定檔保持本機 CDP 預設值。
- 如果外部管理的 CDP 服務可透過回傳存取，請設定該設定檔的 `attachOnly: true`；否則 OpenClaw 會將該回傳連接埠視為本機受控瀏覽器設定檔，並可能回報本機連接埠擁有權錯誤。
- `existing-session` 設定檔使用 Chrome MCP 而非 CDP，並且可以附加至
  選定的主機或透過連線的瀏覽器節點。
- `existing-session` 設定檔可以設定 `userDataDir` 以指定特定的
  基於 Chromium 的瀏覽器設定檔，例如 Brave 或 Edge。
- `existing-session` 設定檔保留目前的 Chrome MCP 路由限制：
  快照/參照驅動的操作，而非 CSS 選擇器定位，單一檔案上傳
  掛鉤，無對話方塊逾時覆寫，無 `wait --load networkidle`，且無
  `responsebody`、PDF 匯出、下載攔截，或批次操作。
- 本地管理的 `openclaw` 設定檔會自動指派 `cdpPort` 和 `cdpUrl`；僅
  在遠端 CDP 時需明確設定 `cdpUrl`。
- 本地管理的設定檔可以設定 `executablePath` 來覆寫該設定檔的全域
  `browser.executablePath`。使用此功能可在 Chrome 中執行一個設定檔，而在 Brave 中執行另一個。
- 本地管理的設定檔在程序啟動後使用 `browser.localLaunchTimeoutMs` 進行 Chrome CDP HTTP
  探索，並使用 `browser.localCdpReadyTimeoutMs` 進行
  啟動後的 CDP websocket 就緒檢查。在 Chrome 成功啟動但就緒檢查與啟動程序競爭的較慢主機上，請增加這些值。兩個值都必須是
  不超過 `120000` 毫秒的正整數；無效的設定值將被拒絕。
- 自動偵測順序：預設瀏覽器（若為 Chromium 架構）→ Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 兩者
  都在 Chromium 啟動前接受 `~` 和 `~/...` 作為您的作業系統主目錄。
  `existing-session` 設定檔上的個別設定檔 `userDataDir` 也會進行波浪號展開。
- 控制服務：僅限回環 (連接埠衍生自 `gateway.port`，預設為 `18791`)。
- `extraArgs` 將額外的啟動標誌附加至本地 Chromium 啟動程序 (例如
  `--disable-gpu`、視窗大小調整或偵錯標誌)。

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

- `seamColor`：原生應用程式 UI chrome 的強調色彩 (交談模式氣泡色彩等)。
- `assistant`：控制 UI 身分覆寫。若未設定，則回退為作用中代理程式的身分。

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

<Accordion title="Gateway 字段詳解">

- `mode`：`local` (執行閘道) 或 `remote` (連線至遠端閘道)。除非設定為 `local`，否則閘道拒絕啟動。
- `port`：WS + HTTP 的單一多工連接埠。優先順序：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback` (預設)、`lan` (`0.0.0.0`)、`tailnet` (僅限 Tailscale IP) 或 `custom`。
- **舊版綁定別名**：在 `gateway.bind` 中使用綁定模式值 (`auto`、`loopback`、`lan`、`tailnet`、`custom`)，而不要使用主機別名 (`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`)。
- **Docker 註記**：預設的 `loopback` 綁定會在容器內監聽 `127.0.0.1`。使用 Docker 橋接網路 (`-p 18789:18789`) 時，流量會到達 `eth0`，導致無法連線至閘道。請使用 `--network host`，或設定 `bind: "lan"` (或搭配 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`) 以監聽所有介面。
- **驗證**：預設為必要設定。非 loopback 綁定需要閘道驗證。實務上這代表共用 token/密碼或具備 `gateway.auth.mode: "trusted-proxy"` 的具身分感知反向 Proxy。入門精靈預設會產生 token。
- 若同時設定了 `gateway.auth.token` 和 `gateway.auth.password` (包含 SecretRef)，請將 `gateway.auth.mode` 明確設定為 `token` 或 `password`。若同時設定兩者且未設定模式，啟動與服務安裝/修復流程將會失敗。
- `gateway.auth.mode: "none"`：明確的無驗證模式。僅用於受信任的本機 loopback 設定；此模式刻意不提供於入門提示中。
- `gateway.auth.mode: "trusted-proxy"`：將瀏覽器/使用者驗證委派給具身分感知的反向 Proxy，並信任來自 `gateway.trustedProxies` 的身分標頭 (請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth))。此模式預期來源為 **非 loopback** 的 Proxy；同主機的 loopback 反向 Proxy 需要明確設定 `gateway.auth.trustedProxy.allowLoopback = true`。內部同主機呼叫端可以使用 `gateway.auth.password` 作為本機直接後援；`gateway.auth.token` 與 trusted-proxy 模式仍互斥。
- `gateway.auth.allowTailscale`：當設定為 `true` 時，Tailscale Serve 身分標頭可滿足控制 UI/WebSocket 驗證 (透過 `tailscale whois` 驗證)。HTTP API 端點 **不會** 使用該 Tailscale 標頭驗證；它們改為遵循閘道的正常 HTTP 驗證模式。此無 token 流程假設閘道主機受信任。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`：選用的驗證失敗限制器。適用於每個用戶端 IP 和每個驗證範圍 (共用密碼和裝置 token 獨立追蹤)。被封鎖的嘗試會傳回 `429` + `Retry-After`。
  - 在非同步 Tailscale Serve 控制 UI 路徑上，相同 `{scope, clientIp}` 的失敗嘗試會在寫入失敗前序列化。因此，來自同一用戶端的並發錯誤嘗試可能會在第二次請求時觸發限制器，而不是兩者都像普通的不符情況一樣競爭通過。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；當您有意也要對本地主機流量進行速率限制時 (例如測試設定或嚴格的 Proxy 部署)，請設定 `false`。
- 瀏覽器來源的 WS 驗證嘗試總是會受到節流，並停用 loopback 例外 (防禦性措施，對抗基於瀏覽器的本地主機暴力破解)。
- 在 loopback 上，這些瀏覽器來源的鎖定會根據正規化的 `Origin`
  值進行隔離，因此來自一個本地主機來源的重複失敗不會自動
  鎖定不同的來源。
- `tailscale.mode`：`serve` (僅限 tailnet，loopback 綁定) 或 `funnel` (公開，需要驗證)。
- `tailscale.serviceName`：Serve 模式的選用 Tailscale Service 名稱，例如
  `svc:openclaw`。設定後，OpenClaw 會將其傳遞給 `tailscale serve
--service`，使控制 UI 可以透過具名 Service 而非裝置主機名稱公開。此值必須使用 Tailscale 的 `svc:<dns-label>`
  Service 名稱格式；啟動時會回報衍生的 Service URL。
- `tailscale.preserveFunnel`：當 `true` 且 `tailscale.mode = "serve"` 時，OpenClaw
  會在啟動時重新套用 Serve 之前檢查 `tailscale funnel status`，如果外部設定的 Funnel 路由已經涵蓋閘道連接埠，則會跳過它。
  預設為 `false`。
- `controlUi.allowedOrigins`：Gateway WebSocket 連線的明確瀏覽器來源允許清單。對於公開的非 loopback 瀏覽器來源為必要設定。來自 loopback、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主機的私人同來源 LAN/Tailnet UI 載入皆可在未啟用 Host-header 情境下接受。
- `controlUi.chatMessageMaxWidth`：群組化控制 UI 聊天訊息的選用最大寬度。接受受限的 CSS 寬度值，例如 `960px`、`82%`、`min(1280px, 82%)` 和 `calc(100% - 2rem)`。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危險模式，會對刻意依賴 Host-header 來源原則的部署啟用 Host-header 來源後援。
- `remote.transport`：`ssh` (預設) 或 `direct` (ws/wss)。對於 `direct`，公開主機的 `remote.url` 必須為 `wss://`；純文字 `ws://` 僅接受用於 loopback、LAN、link-local、`.local`、`.ts.net` 和 Tailscale CGNAT 主機。
- `remote.remotePort`：遠端 SSH 主機上的閘道連接埠。預設為 `18789`；當本機通道連接埠與遠端閘道連接埠不同時使用。
- `gateway.remote.token` / `.password` 是遠端用戶端憑證欄位。它們本身並不設定閘道驗證。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 版本在將支援轉送的註冊發佈至閘道後，所使用的外部 APNs 轉送站基底 HTTPS URL。此 URL 必須與編譯至 iOS 版本中的轉送站 URL 相符。
- `gateway.push.apns.relay.timeoutMs`：閘道至轉送站的傳送逾時時間 (毫秒)。預設為 `10000`。
- 支援轉送的註冊會委派給特定的閘道身分。配對的 iOS 應用程式會取得 `gateway.identity.get`，在轉送站註冊中包含該身分，並將註冊範圍的傳送授權轉發至閘道。其他閘道無法重複使用該儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述轉送站設定的暫時環境覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：僅供開發使用的 loopback HTTP 轉送站 URL 逃生門。正式環境的轉送站 URL 應維持使用 HTTPS。
- `gateway.handshakeTimeoutMs`：預先驗證的 Gateway WebSocket 握手逾時時間 (毫秒)。預設值：`15000`。若設定，`OPENCLAW_HANDSHAKE_TIMEOUT_MS` 優先。在負載較重或低效能的主機上，若本機用戶端可能在啟動預熱尚未完成時進行連線，請增加此值。
- `gateway.channelHealthCheckMinutes`：頻道健康監控間隔 (分鐘)。設定 `0` 以全域停用健康監控重新啟動。預設值：`5`。
- `gateway.channelStaleEventThresholdMinutes`：過時 Socket 臨界值 (分鐘)。請將此值保持在 `gateway.channelHealthCheckMinutes` 以上。預設值：`30`。
- `gateway.channelMaxRestartsPerHour`：每個頻道/帳戶在滾動一小時內的最大健康監控重新啟動次數。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：針對健康監控重新啟動的各頻道退出選項，同時保持全域監控啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多重帳戶頻道的各帳戶覆寫。設定後，會優先於頻道層級覆寫。
- 本機閘道呼叫路徑僅能在未設定 `gateway.auth.*` 時，將 `gateway.remote.*` 作為後援使用。
- 若 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef 明確設定但未解析，解析將會失敗並封閉 (不會有遠端後援遮罩)。
- `trustedProxies`：終止 TLS 或注入轉送用戶端標頭的反向 Proxy IP。請僅列出您控制的 Proxy。Loopback 項目對於同主機 Proxy/本機偵測設定 (例如 Tailscale Serve 或本機反向 Proxy) 仍然有效，但它們 **不會** 讓 loopback 要求有資格使用 `gateway.auth.mode: "trusted-proxy"`。
- `allowRealIpFallback`：當 `true` 時，如果缺少 `X-Forwarded-For`，閘道會接受 `X-Real-IP`。預設為 `false` 以實施封閉式失敗行為。
- `gateway.nodes.pairing.autoApproveCidrs`：選用的 CIDR/IP 允許清單，用於自動核准無要求範圍的首次節點裝置配對。未設定時停用。這不會自動核准操作員/瀏覽器/控制 UI/WebChat 配對，也不會自動核准角色、範圍、中繼資料或公開金鑰升級。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：配對後和平台允許清單評估後，針對已宣告節點指令的全域允許/拒絕塑形。使用 `allowCommands` 以選用危險的節點指令，例如 `camera.snap`、`camera.clip` 和 `screen.record`；`denyCommands` 會移除指令，即使平台預設或明確允許原本會包含它。在節點變更其已宣告指令清單後，請拒絕並重新核准該裝置配對，讓閘道儲存更新的指令快照。
- `gateway.tools.deny`：針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱 (延伸預設拒絕清單)。
- `gateway.tools.allow`：從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- Admin HTTP RPC：預設關閉，作為 `admin-http-rpc` 外掛程式。啟用此外掛程式以註冊 `POST /api/v1/admin/rpc`。請參閱 [Admin HTTP RPC](/zh-Hant/plugins/admin-http-rpc)。
- Chat Completions：預設停用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入防護：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空白的允許清單會被視為未設定；請使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 來停用 URL 擷取。
- 選用的回應防護標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` (僅針對您控制的 HTTPS 來源進行設定；請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### 多執行個體隔離

在單一主機上使用唯一連接埠和狀態目錄執行多個閘道：

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

- `enabled`：啟用閘道監聽器上的 TLS 終止 (HTTPS/WSS) (預設：`false`)。
- `autoGenerate`：當未設定明確的檔案時，會自動產生本機自簽憑證/金鑰對；僅供本機/開發使用。
- `certPath`：TLS 憑證檔案的檔案系統路徑。
- `keyPath`：TLS 私鑰檔案的檔案系統路徑；請保持權限受限。
- `caPath`：用於用戶端驗證或自訂信任鏈的選用 CA bundle 路徑。

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
  - `"hybrid"` (預設)：先嘗試熱重新載入；如有需要則回退到重新啟動。
- `debounceMs`：套用設定變更前的防手震時間視窗，以毫秒為單位 (非負整數)。
- `deferralTimeoutMs`：在強制重啟或通道熱重新載入之前，等待進行中作業的可選最大時間（毫秒）。省略它以使用預設的有界等待（`300000`）；將其設為 `0` 以無限期等待並定期記錄仍在擱置的警告。

---

## 鉤子

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
查詢字串 hook 權杖會被拒絕。

驗證與安全性注意事項：

- `hooks.enabled=true` 需要一個非空的 `hooks.token`。
- `hooks.token` 應與作用中的 Gateway 共用金鑰驗證（`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`）有所區別；當偵測到重複使用時，啟動日誌會記錄非致命的安全性警告。
- `openclaw security audit` 將 hook/Gateway 驗證的重複使用標記為關鍵發現，包括僅在稽核時間提供的 Gateway 密碼驗證（`--auth password --password <password>`）。執行 `openclaw doctor --fix` 以輪換持續存在的被重複使用之 `hooks.token`，然後更新外部 hook 發送者以使用新的 hook 權杖。
- `hooks.path` 不能是 `/`；請使用專用的子路徑，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果映射或預設集使用模板化的 `sessionKey`，請設定 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。靜態映射金鑰不需要該選用加入。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 僅當 `hooks.allowRequestSessionKey=true` 時（預設值：`false`），才會接受來自請求載荷的 `sessionKey`。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析
  - 模板渲染的映射 `sessionKey` 值被視為外部提供，並且也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="對應細節">

- `match.path` 符合 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 符合通用路徑的 payload 欄位。
- 像 `{{messages[0].subject}}` 這類的樣板會從 payload 讀取。
- `transform` 可以指向返回 hook action 的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，且必須保持在 `hooks.transformsDir` 之內（絕對路徑和穿越路徑會被拒絕）。
  - 請將 `hooks.transformsDir` 保留在 `~/.openclaw/hooks/transforms` 之下；工作區技能目錄會被拒絕。如果 `openclaw doctor` 回報此路徑無效，請將轉換模組移至 hooks transforms 目錄，或移除 `hooks.transformsDir`。
- `agentId` 路由至特定代理程式；未知的 ID 會回退至預設代理程式。
- `allowedAgentIds`：限制有效的代理程式路由，包括當省略 `agentId` 時的預設代理程式路徑（`*` 或省略 = 允許全部，`[]` = 拒絕全部）。
- `defaultSessionKey`：用於沒有明確 `sessionKey` 的 hook 代理程式執行的可選固定 session 鍵。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者和樣板驅動的對應 session 鍵來設定 `sessionKey`（預設值：`false`）。
- `allowedSessionKeyPrefixes`：明確 `sessionKey` 值（請求 + 對應）的可選前綴允許清單，例如 `["hook:"]`。當任何對應或預設集使用樣板化 `sessionKey` 時，它就會變為必填項目。
- `deliver: true` 將最終回覆傳送至頻道；`channel` 預設為 `last`。
- `model` 覆寫此 hook 執行的 LLM（如果設定了模型目錄，則必須允許）。

</Accordion>

### Gmail 整合

- 內建的 Gmail 預設使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留該每訊息路由，請設定 `hooks.allowRequestSessionKey: true` 並限制 `hooks.allowedSessionKeyPrefixes` 以符合 Gmail 命名空間，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，請使用靜態的 `sessionKey` 覆寫預設設定，而不是使用預設的樣板。

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

- Gateway 在設定後會於啟動時自動啟動 `gog gmail watch serve`。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以停用。
- 請勿在 Gateway 旁邊單獨執行 `gog gmail watch serve`。

---

## Canvas 插件主機

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

- 透過 Gateway 連接埠提供代理可編輯的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 僅限本機：保留 `gateway.bind: "loopback"`（預設值）。
- 非回環綁定：Canvas 路由需要 Gateway 驗證（權杖/密碼/trusted-proxy），與其他 Gateway HTTP 表面相同。
- Node WebViews 通常不會發送驗證標頭；在節點配對並連線後，Gateway 會公布針對節點範圍的 Canvas/A2UI 存取功能 URL。
- 功能 URL 繫結至作用中的節點 WS 會話並且會快速過期。不使用基於 IP 的後備機制。
- 將熱重載用戶端注入至提供的 HTML 中。
- 當為空時，自動建立入門 `index.html`。
- 同時在 `/__openclaw__/a2ui/` 提供 A2UI。
- 變更需要重新啟動 Gateway。
- 針對大型目錄或 `EMFILE` 錯誤，請停用即時重新載入。

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

- `minimal`（當啟用內建的 `bonjour` 外掛時的預設值）：從 TXT 記錄中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`；LAN 多播廣告仍需啟用內建的 `bonjour` 外掛。
- `off`：在不更改外掛啟用狀態的情況下，抑制 LAN 多播廣告。
- 內建的 `bonjour` 外掛會在 macOS 主機上自動啟動，而在 Linux、Windows 和容器化的 Gateway 部署上則為選擇性加入。
- 當系統主機名稱為有效的 DNS 標籤時，主機名稱預設為系統主機名稱，否則回退至 `openclaw`。使用 `OPENCLAW_MDNS_HOSTNAME` 覆寫。

### 廣域網路 (DNS-SD)

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

### `env`（內聯環境變數）

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

- 僅當程序環境中缺少該金鑰時，才會套用內聯環境變數。
- `.env` 檔案：CWD `.env` + `~/.openclaw/.env`（兩者皆不會覆寫現有的變數）。
- `shellEnv`：從您的登入 shell 設定檔匯入時缺少預期的金鑰。
- 請參閱 [Environment](/zh-Hant/help/environment) 以了解完整的優先順序。

### 環境變數替換

使用 `${VAR_NAME}` 在任何設定字串中參照環境變數：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 僅符合大寫名稱：`[A-Z_][A-Z0-9_]*`。
- 缺少或空的變數會在載入設定時拋出錯誤。
- 使用 `$${VAR}` 跳脫以表示字面上的 `${VAR}`。
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
- `source: "file"` id：絕對 JSON 指標（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$`（支援 AWS 樣式的 `secret#json_key` 選取器）
- `source: "exec"` id 不得包含 `.` 或 `..` 斜線分隔的路徑區段（例如 `a/../b` 會被拒絕）

### 支援的憑證層面

- 標準矩陣：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- `secrets apply` 目標支援 `openclaw.json` 憑證路徑。
- `auth-profiles.json` 參照包含在執行階段解析和稽核覆蓋範圍中。

### Secret providers config

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
- 當無法使用 Windows ACL 驗證時，檔案和 exec 提供者路徑會以封閉式失敗處理。僅對無法驗證的受信任路徑設定 `allowInsecurePath: true`。
- `exec` 提供者需要絕對的 `command` 路徑，並在 stdin/stdout 上使用協議 payload。
- 依預設，會拒絕符號連結命令路徑。設定 `allowSymlinkCommand: true` 以允許符號連結路徑，同時驗證解析後的目標路徑。
- 如果設定了 `trustedDirs`，受信任目錄檢查會套用至解析後的目標路徑。
- `exec` 子環境預設為最小化；請使用 `passEnv` 明確傳遞所需的變數。
- Secret refs 會在啟用時解析為記憶體內部快照，然後請求路徑僅讀取該快照。
- 啟用期間會套用啟用介面篩選：已啟用介面上未解析的 refs 會導致啟動/重新載入失敗，而非啟用介面則會略過並輸出診斷資訊。

---

## Auth storage

```json5
{
  auth: {
    profiles: {
      "anthropic:default": { provider: "anthropic", mode: "api_key" },
      "anthropic:work": { provider: "anthropic", mode: "api_key" },
      "openai:personal": { provider: "openai", mode: "oauth" },
    },
    order: {
      anthropic: ["anthropic:default", "anthropic:work"],
      openai: ["openai:personal"],
    },
  },
}
```

- 個別 Agent 的設定檔儲存在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 支援值級別參照（`keyRef` 用於 `api_key`，`tokenRef` 用於 `token`），適用於靜態憑證模式。
- 舊版扁平 `auth-profiles.json` 映射（例如 `{ "provider": { "apiKey": "..." } }`）並非執行時期格式；`openclaw doctor --fix` 會將其重寫為標準 `provider:default` API 金鑰設定檔，並保留 `.legacy-flat.*.bak` 備份。
- OAuth 模式設定檔（`auth.profiles.<id>.mode = "oauth"`）不支援由 SecretRef 支援的 auth-profile 憑證。
- 靜態執行時期憑證來自記憶體中解析的快照；當發現舊版靜態 `auth.json` 項目時會將其清除。
- 來自 `~/.openclaw/credentials/oauth.json` 的舊版 OAuth 匯入。
- 請參閱 [OAuth](/zh-Hant/concepts/oauth)。
- Secrets 執行時期行為與 `audit/configure/apply` 工具：[Secrets Management](/zh-Hant/gateway/secrets)。

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

- `billingBackoffHours`：當設定檔因真實帳單/餘額不足錯誤而失敗時，以小時為單位的基本退避時間（預設：`5`）。即使在 `401`/`403` 回應上，明確的帳單文字仍可能落入此處，但特定供應商的文字匹配器仍僅限於擁有它們的供應商（例如 OpenRouter `Key limit exceeded`）。可重試的 HTTP `402` 使用量視窗或組織/工作區支出限制訊息則會保留在 `rate_limit` 路徑中。
- `billingBackoffHoursByProvider`：針對帳單退避小時數的可選個別供應商覆寫。
- `billingMaxHours`：帳單退避指數增長的小時數上限（預設：`24`）。
- `authPermanentBackoffMinutes`：高置信度 `auth_permanent` 失敗的基礎退避時間（以分鐘為單位）（預設值：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增長的上限（以分鐘為單位）（預設值：`60`）。
- `failureWindowHours`：用於退避計數器的滾動視窗（以小時為單位）（預設值：`24`）。
- `overloadedProfileRotations`：在切換到模型後備之前，針對超載錯誤的相同供應商授權設定檔輪替的最大次數（預設值：`1`）。諸如 `ModelNotReadyException` 等供應商忙碌類型都歸類於此。
- `overloadedBackoffMs`：重試超載的供應商/設定檔輪替前的固定延遲（預設值：`0`）。
- `rateLimitedProfileRotations`：在切換到模型後備之前，針對速率限制錯誤的相同供應商授權設定檔輪替的最大次數（預設值：`1`）。該速率限制存儲桶包含諸如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted` 等供應商格式的文字。

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
- 設定 `logging.file` 以使用穩定路徑。
- 當 `--verbose` 時，`consoleLevel` 會增加至 `debug`。
- `maxFileBytes`：輪替前的最大作用中日誌檔案大小（以位元組為單位）（正整數；預設值：`104857600` = 100 MB）。OpenClaw 會在作用中檔案旁保留最多五個編號的存檔。
- `redactSensitive` / `redactPatterns`：針對主控台輸出、檔案日誌、OTLP 日誌記錄和持久化的會話逐字稿文字的盡力遮罩。`redactSensitive: "off"` 僅停用此一般日誌/逐字稿策略；UI/工具/診斷安全性介面在發出前仍會編輯機密。

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
        toolDefinitions: false,
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

- `enabled`：檢測輸出的主開關（預設值：`true`）。
- `flags`：用於啟用目標日誌輸出的旗標字串陣列（支援像 `"telegram.*"` 或 `"*"` 這類的萬用字元）。
- `stuckSessionWarnMs`：以毫秒為單位的無進行時間閾值，用於將長時間執行的處理工作階段分類為 `session.long_running`、`session.stalled` 或 `session.stuck`。回覆、工具、狀態、區塊和 ACP 進度會重置計時器；重複的 `session.stuck` 診斷若未變更則會退避。
- `stuckSessionAbortMs`：以毫秒為單位的無進行時間閾值，之後符合條件的停滯活動工作可能會被中止排空以進行復原。若未設定，OpenClaw 會使用更安全的延伸內嵌執行時間視窗，至少 5 分鐘且為 `stuckSessionWarnMs` 的 3 倍。
- `memoryPressureSnapshot`：當記憶體壓力達到 `critical`（預設：`false`）時，擷取修訂前的 OOM 穩定性快照。設為 `true` 可在保持正常記憶體壓力事件的同時，新增穩定性套件檔案掃描/寫入。
- `otel.enabled`：啟用 OpenTelemetry 匯出管線（預設：`false`）。如需完整設定、訊號目錄和隱私模型，請參閱 [OpenTelemetry export](/zh-Hant/gateway/opentelemetry)。
- `otel.endpoint`：OTel 匯出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：選用的訊號專屬 OTLP 端點。設定時，它們僅針對該訊號覆寫 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（預設）或 `"grpc"`。
- `otel.headers`：隨 OTel 匯出要求傳送的額外 HTTP/gRPC 中繼資料標頭。
- `otel.serviceName`：資源屬性的服務名稱。
- `otel.traces` / `otel.metrics` / `otel.logs`：啟用追蹤、指標或日誌匯出。
- `otel.sampleRate`：追蹤採樣率 `0`-`1`。
- `otel.flushIntervalMs`：定期遙測排清間隔，單位為毫秒。
- `otel.captureContent`：選用的 OTEL span 屬性原始內容擷取功能。預設為關閉。布林值 `true` 擷取非系統訊息/工具內容；物件形式讓您可以明確啟用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs`、`systemPrompt` 和 `toolDefinitions`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：最新實驗性 GenAI 推論 span 形狀的環境開關，包括 `{gen_ai.operation.name} {gen_ai.request.model}` span 名稱、`CLIENT` span 類型，以及 `gen_ai.provider.name` 取代舊有的 `gen_ai.system`。預設情況下，為了相容性，span 保留 `openclaw.model.call` 和 `gen_ai.system`；GenAI 指標使用有界的語意屬性。
- `OPENCLAW_OTEL_PRELOADED=1`：適用於已註冊全域 OpenTelemetry SDK 之主機的環境開關。OpenClaw 接著會跳過外掛擁有的 SDK 啟動/關閉，同時保持診斷監聽器處於啟用狀態。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：當未設定相符的設定鍵時使用的特定訊號端點環境變數。
- `cacheTrace.enabled`：記錄內嵌執行的快取追蹤快照（預設：`false`）。
- `cacheTrace.filePath`：快取追蹤 JSONL 的輸出路徑（預設：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制快取追蹤輸出中包含的內容（預設皆為 `true`）。

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

- `channel`：npm/git 安裝的發行通道 - `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：當閘道啟動時檢查 npm 更新（預設值：`true`）。
- `auto.enabled`：啟用套件安裝的背景自動更新（預設值：`false`）。
- `auto.stableDelayHours`：穩定版通道自動套用前的最小延遲小時數（預設值：`6`；最大值：`168`）。
- `auto.stableJitterHours`：額外的穩定版通道發布分佈視窗（小時）（預設值：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：測試版通道檢查的執行頻率（小時）（預設值：`1`；最大值：`24`）。

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

- `enabled`：全域 ACP 功能開關（預設值：`true`；設定 `false` 以隱藏 ACP 分派和生成功能）。
- `dispatch.enabled`：ACP 會話回合分派的獨立開關（預設值：`true`）。設定 `false` 可在阻止執行的同時保持 ACP 指令可用。
- `backend`：預設的 ACP 執行時後端 ID（必須符合已註冊的 ACP 執行時外掛）。
  請先安裝後端外掛，且如果設定了 `plugins.allow`，請包含後端外掛 ID（例如 `acpx`），否則 ACP 後端將不會載入。
- `defaultAgent`：當生成未指定明確目標時的備用 ACP 目標代理程式 ID。
- `allowedAgents`：允許用於 ACP 執行時會話的代理程式 ID 白名單；空值表示無額外限制。
- `maxConcurrentSessions`：最大並行作用中 ACP 會話數。
- `stream.coalesceIdleMs`：串流文字的閒置排清視窗（毫秒）。
- `stream.maxChunkChars`：分割串流區塊投影前的最大區塊大小。
- `stream.repeatSuppression`：隱藏每回合重複的狀態/工具列（預設值：`true`）。
- `stream.deliveryMode`：`"live"` 串流輸出；`"final_only"` 緩衝直到回合終端事件。
- `stream.hiddenBoundarySeparator`：隱藏工具事件後可見文字前的分隔符（預設值：`"paragraph"`）。
- `stream.maxOutputChars`：每個 ACP 回合預測的助理輸出字元數上限。
- `stream.maxSessionUpdateChars`：預測的 ACP 狀態/更新行的字元數上限。
- `stream.tagVisibility`：標籤名稱記錄至串流事件的布林可見性覆寫。
- `runtime.ttlMinutes`：ACP session worker 在符合清理資格前的閒置 TTL（分鐘）。
- `runtime.installCommand`：初始化 ACP 執行環境時執行的可選安裝指令。

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
  - `"random"`（預設值）：輪換有趣/季節性標語。
  - `"default"`：固定的中性標語（`All your chats, one OpenClaw.`）。
  - `"off"`：無標語文字（仍會顯示橫幅標題/版本）。
- 若要隱藏整個橫幅（不僅是標語），請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

---

## 精靈

由 CLI 導引設定流程寫入的中繼資料（`onboard`、`configure`、`doctor`）：

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

## 橋接器（舊版，已移除）

目前的版本組建不再包含 TCP 橋接器。節點透過 Gateway WebSocket 連線。`bridge.*` 金鑰不再是設定架構的一部分（必須移除否則驗證會失敗；`openclaw doctor --fix` 可移除未知金鑰）。

<Accordion title="舊版橋接器配置（歷史參考）">

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
    maxConcurrentRuns: 8, // default; cron dispatch + isolated cron agent-turn execution
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

- `sessionRetention`：從 `sessions.json` 修剪前保留已完成的隔離 cron 執行 session 的時間長度。同時控制已封存之已刪除 cron 逐字稿的清理。預設值：`24h`；設為 `false` 可停用。
- `runLog.maxBytes`：接受此設定以與較舊的檔案備份 cron 執行記錄相容。預設值：`2_000_000` 位元組。
- `runLog.keepLines`：每個工作保留的最新 SQLite 執行歷史記錄列數。預設值：`2000`。
- `webhookToken`：用於 cron webhook POST 傳遞的 bearer token (`delivery.mode = "webhook"`)，如果省略則不發送授權標頭。
- `webhook`：`openclaw doctor --fix` 使用的已棄用舊版後備 webhook URL (http/https)，用於遷移仍有 `notify: true` 的已儲存工作；執行時傳遞使用每個工作的 `delivery.mode="webhook"` 加上 `delivery.to`，或在保留公告傳遞時使用 `delivery.completionDestination`。

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

- `maxAttempts`：cron 工作在暫時性錯誤上的最大重試次數（預設值：`3`；範圍：`0`-`10`）。
- `backoffMs`：每次重試嘗試的退避延遲陣列，單位為毫秒（預設值：`[30000, 60000, 300000]`；1-10 個項目）。
- `retryOn`：觸發重試的錯誤類型 - `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略以重試所有暫時性類型。

一次性任務會保持啟用狀態，直到重試次數耗盡，然後在保留最終錯誤狀態的同時停用。週期性任務使用相同的暫時性重試策略，在排定的下一個時段前經過退避後再次執行；永久性錯誤或耗盡的暫時性重試會退回到帶有錯誤退避的正常週期性排程。

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

- `enabled`：啟用 cron 工作的失敗警示（預設值：`false`）。
- `after`：觸發警示前的連續失敗次數（正整數，最小值：`1`）。
- `cooldownMs`：同一工作的重複警示之間的最小毫秒數（非負整數）。
- `includeSkipped`：將連續跳過的執行計入警示臨界值（預設值：`false`）。跳過的執行會單獨追蹤，不會影響執行錯誤退避。
- `mode`：傳遞模式 - `"announce"` 透過通道訊息發送；`"webhook"` 發布至已配置的 webhook。
- `accountId`：用於限制警示傳遞範圍的選用帳戶或通道 ID。

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

- 所有任務的 cron 失敗通知之預設目的地。
- `mode`：`"announce"` 或 `"webhook"`；當有足夠的目標資料時，預設為 `"announce"`。
- `channel`：公告傳遞的頻道覆寫。`"last"` 會重用最後已知的傳遞頻道。
- `to`：明確的公告目標或 webhook URL。Webhook 模式必填。
- `accountId`：傳遞的選用帳號覆寫。
- 每個作業的 `delivery.failureDestination` 會覆寫此全域預設值。
- 當未設定全域或每個作業的失敗目的地時，已透過 `announce` 傳遞的作業會在失敗時回退至該主要公告目標。
- `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 作業，除非作業的主要 `delivery.mode` 是 `"webhook"`。

請參閱 [Cron Jobs](/zh-Hant/automation/cron-jobs)。獨立的 cron 執行會被追蹤為 [背景任務](/zh-Hant/automation/tasks)。

---

## 媒體模型範本變數

在 `tools.media.models[].args` 中展開的範本預留位置：

| 變數               | 描述                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的傳入訊息內容                           |
| `{{RawBody}}`      | 原始內容（無歷史/傳送者包裝器）              |
| `{{BodyStripped}}` | 移除群組提及的內容                           |
| `{{From}}`         | 傳送者識別碼                                 |
| `{{To}}`           | 目的地識別碼                                 |
| `{{MessageSid}}`   | 頻道訊息 ID                                  |
| `{{SessionId}}`    | 目前工作階段 UUID                            |
| `{{IsNewSession}}` | 建立新工作階段時的 `"true"`                  |
| `{{MediaUrl}}`     | 傳入媒體虛擬 URL                             |
| `{{MediaPath}}`    | 本機媒體路徑                                 |
| `{{MediaType}}`    | 媒體類型（image/audio/document/…）           |
| `{{Transcript}}`   | 音訊文字紀錄                                 |
| `{{Prompt}}`       | CLI 項目的解析媒體提示                       |
| `{{MaxChars}}`     | CLI 項目的解析最大輸出字元數                 |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群組主題（盡力而為）                         |
| `{{GroupMembers}}` | 群組成員預覽（盡力而為）                     |
| `{{SenderName}}`   | 寄件者顯示名稱（盡力而為）                   |
| `{{SenderE164}}`   | 寄件者電話號碼（盡力而為）                   |
| `{{Provider}}`     | 提供者提示（whatsapp、telegram、discord 等） |

---

## 組態包含 (`$include`)

將配置拆分為多個檔案：

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

- 單一檔案：替換包含它的物件。
- 檔案陣列：按順序進行深層合併（後面的覆蓋前面的）。
- 同層級鍵：在包含之後合併（覆蓋包含的值）。
- 巢狀包含：最多深 10 層。
- 路徑：相對於引入該檔案的位置解析，但必須保持在頂層配置目錄（`dirname` 的 `openclaw.json`）內。僅當解析結果仍在該邊界內時，才允許使用絕對/`../` 形式。路徑不得包含空位元組，且在解析前後的長度必須嚴格短於 4096 個字元。
- 屬於 OpenClaw 的寫入操作，若僅更改由單一檔案包含支援的一個頂層區段，則會直接寫入該被包含的檔案。例如，`plugins install` 會更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，並保持 `openclaw.json` 不變。
- 對於 OpenClaw 擁有的寫入操作，根層級包含、包含陣列以及具有同層級覆蓋的包含均為唯讀；這些寫入操作將以「失敗關閉」的方式處理，而不是將配置扁平化。
- 錯誤：針對檔案缺失、解析錯誤、循環包含、無效路徑格式和過長長度提供清楚的訊息。

---

_相關：[Configuration](/zh-Hant/gateway/configuration) · [Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [Configuration](/zh-Hant/gateway/configuration)
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
