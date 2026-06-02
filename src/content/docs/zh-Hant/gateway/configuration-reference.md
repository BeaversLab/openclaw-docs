---
summary: "核心 OpenClaw 金鑰、預設值及專用子系統參考連結的 Gateway 設定參考"
title: "設定參考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

`~/.openclaw/openclaw.json` 的核心配置參考。若需任務導向的概述，請參閱 [Configuration](/zh-Hant/gateway/configuration)。

涵蓋主要的 OpenClaw 設定層面，並在子系統擁有自身更深入的參考資料時提供連結。通道 和外掛 擁有的指令目錄以及深度記憶體/QMD 調整選項位於各自的頁面上，而非此頁。

程式碼基準：

- `openclaw config schema` 會列印用於驗證和控制 UI 的即時 JSON Schema，並在可用時合併套件/外掛/通道的中繼資料
- `config.schema.lookup` 會傳回一個用於深入檢視工具的路徑範圍 Schema 節點
- `pnpm config:docs:check` / `pnpm config:docs:gen` 會針對目前的 Schema 表面驗證設定文件基準雜湊

Agent 查詢路徑：在編輯前使用 `gateway` 工具動作 `config.schema.lookup` 以取得確切的欄位級文件和約束。使用 [Configuration](/zh-Hant/gateway/configuration) 獲取任務導向的指引，並使用本頁查看更廣泛的欄位對應、預設值以及子系統參考的連結。

專屬深度參考資料：

- [Memory configuration reference](/zh-Hant/reference/memory-config) 適用於 `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 配置
- [Slash commands](/zh-Hant/tools/slash-commands) 適用於目前的內建 + 捆綁命令目錄
- 擁有者通道/外掛頁面，用於通道特定的指令介面

設定格式為 **JSON5**（允許註解和結尾逗號）。所有欄位皆為選用 - 若省略，OpenClaw 會使用安全的預設值。

---

## 通道

個別頻道配置鍵已移至專用頁面 — 請參閱
[Configuration - channels](/zh-Hant/gateway/config-channels) 以查看 `channels.*`，
包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 及其他
捆綁頻道（驗證、存取控制、多帳戶、提及閘道）。

## Agent 預設值、多重 Agent、工作階段與訊息

已移至專用頁面 — 請參閱
[Configuration - agents](/zh-Hant/gateway/config-agents) 以查看：

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

工具原則、實驗性切換、提供者支援的工具配置，以及自訂
提供者 / 基本 URL 設定已移至專用頁面 — 請參閱
[Configuration - tools and custom providers](/zh-Hant/gateway/config-tools)。

## 模型

提供者定義、模型允許清單和自訂提供者設定位於
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
- `models.providers.*.localService`：本機模型伺服器的選用隨選程序管理員。
  OpenClaw 會探測已配置的健康檢查端點，在需要時啟動絕對
  `command`，等待就緒，然後發送模型
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
[CLI 後端](/zh-Hant/gateway/cli-backends#bundle-mcp-overlays) 以了解執行時行為。

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

內建的 `codex` 外掛程式擁有 `plugins.entries.codex.config` 下的原生 Codex app-server harness 設定。請參閱 [Codex harness 參考](/zh-Hant/plugins/codex-harness-reference) 以了解完整的設定介面，以及 [Codex harness](/zh-Hant/plugins/codex-harness) 以了解執行時模型。

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
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：
  穩定的市集身分識別。V1 僅支援 `"openai-curated"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：從遷移而來的穩定
  Codex 外掛程式身分識別，例如 `"google-calendar"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：
  逐外掛程式破壞性動作覆寫。若省略，則使用全域
  `allow_destructive_actions` 值。

`codexPlugins.enabled` 是全域啟用指令。由遷移寫入的顯式外掛程式項目是持久化的安裝與修復資格集。
不支援 `plugins["*"]`，沒有 `install` 開關，且本機
`marketplacePath` 值故意不設為組態欄位，因為它們
是特定於主機的。

`app/list` 就緒檢查會快取一小時，並在過期時非同步重新整理。Codex 執行緒應用程式組態是在 Codex 鞍座
工作階段建立時計算，而非每次輪詢；在變更原生外掛程式組態後，請使用 `/new`、`/reset` 或重新啟動閘道。

- `plugins.entries.firecrawl.config.webFetch`：Firecrawl 網頁擷取提供者設定。
  - `apiKey`：Firecrawl API 金鑰（接受 SecretRef）。若無則回退至 `plugins.entries.firecrawl.config.webSearch.apiKey`、舊版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 環境變數。
  - `baseUrl`：Firecrawl API 基礎 URL（預設：`https://api.firecrawl.dev`；自託管的覆寫必須以私人/內部端點為目標）。
  - `onlyMainContent`：僅擷取頁面的主要內容（預設：`true`）。
  - `maxAgeMs`：快取最大保留時間，以毫秒為單位（預設：`172800000` / 2 天）。
  - `timeoutSeconds`：擷取請求逾時時間，以秒為單位（預設：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search (Grok 網路搜尋) 設定。
  - `enabled`：啟用 X Search 提供者。
  - `model`：用於搜尋的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：記憶體夢境設定。請參閱 [Dreaming](/zh-Hant/concepts/dreaming) 以了解階段與閾值。
  - `enabled`：夢境主開關（預設 `false`）。
  - `frequency`：每次完整夢想掃描的 cron 頻率（預設為 `"0 3 * * *"`）。
  - `model`：可選的夢想日記子代理模型覆寫。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；搭配 `allowedModels` 以限制目標。模型不可用錯誤會使用會話預設模型重試一次；信任或允許清單失敗不會無提示回退。
  - 階段策略和閾值是實作細節（非使用者面向的配置鍵）。
- 完整的記憶體配置位於 [記憶體配置參考](/zh-Hant/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已啟用的 Claude 套件插件也可以從 `settings.json` 貢獻內嵌的 OpenClaw 預設值；OpenClaw 會將這些作為已清理的代理設定套用，而不是作為原始 OpenClaw 配置補丁。
- `plugins.slots.memory`：選擇作用中的記憶體插件 ID，或使用 `"none"` 停用記憶體插件。
- `plugins.slots.contextEngine`：選擇作用中的內容引擎插件 ID；除非您安裝並選擇其他引擎，否則預設為 `"legacy"`。

參見 [插件](/zh-Hant/tools/plugin)。

---

## 承諾

`commitments` 控制推斷的後續記憶：OpenClaw 可以從對話輪次中檢測打卡並透過心跳執行來傳遞它們。

- `commitments.enabled`：啟用推斷後續承諾的隱藏 LLM 提取、儲存和心跳傳遞。預設值：`false`。
- `commitments.maxPerDay`：在滾動的一天中，每個代理會話傳遞的最大推斷後續承諾數。預設值：`3`。

參見 [推斷承諾](/zh-Hant/concepts/commitments)。

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
- `tabCleanup` 會在閒置時間或會話超過上限時回收追蹤的主要代理程式分頁。設定 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 以停用個別的清理模式。
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` 在未設定時會停用，因此瀏覽器導航預設保持嚴格模式。
- 僅在您有意信任私人網路瀏覽器導航時，才設定 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在嚴格模式下，遠端 CDP 設定檔端點 (`profiles.*.cdpUrl`) 在連線性/探索檢查期間會受到相同的私人網路封鎖限制。
- `ssrfPolicy.allowPrivateNetwork` 作為舊版別名仍受支援。
- 在嚴格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 來指定例外。
- 遠端設定檔僅支援附加 (start/stop/reset 已停用)。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  當您希望 OpenClaw 探索 `/json/version` 時，請使用 HTTP(S)；當您的提供商提供直接的 DevTools WebSocket URL 時，請使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 適用於遠端和
  `attachOnly` CDP 連線性以及開啟分頁請求。受管理的 loopback
  設定檔會保留本機 CDP 預設值。
- 如果外部管理的 CDP 服務可透過 loopback 存取，請設定該設定檔的 `attachOnly: true`；否則 OpenClaw 會將 loopback 連接埠視為本機受管理的瀏覽器設定檔，並可能回報本機連接埠擁有權錯誤。
- `existing-session` 設定檔使用 Chrome MCP 而非 CDP，且可在選定的主機或透過連線的瀏覽器節點進行附加。
- `existing-session` 設定檔可以設定 `userDataDir` 以鎖定特定的
  以 Chromium 為基礎的瀏覽器設定檔，例如 Brave 或 Edge。
- `existing-session` 設定檔保持目前的 Chrome MCP 路由限制：
  基於快照/參照的動作而非 CSS 選擇器定位、單一檔案上傳
  掛鉤、無對話方塊逾時覆寫、無 `wait --load networkidle`，且無
  `responsebody`、PDF 匯出、下載攔截或批次動作。
- 本機管理的 `openclaw` 設定檔會自動指派 `cdpPort` 和 `cdpUrl`；僅需為遠端 CDP 明確設定 `cdpUrl`。
- 本機管理的設定檔可以設定 `executablePath` 來覆寫該設定檔的全域
  `browser.executablePath`。使用此功能可在 Chrome 中執行一個設定檔，
  並在 Brave 中執行另一個。
- 本機管理的設定檔在程序啟動後使用 `browser.localLaunchTimeoutMs` 進行 Chrome CDP HTTP
  探索，並使用 `browser.localCdpReadyTimeoutMs` 進行
  啟動後的 CDP websocket 就緒檢查。在 Chrome 成功啟動但就緒檢查與啟動程序競爭的較慢主機上，請提高這些值。這兩個值都必須是
  不超過 `120000` 毫秒的正整數；無效的設定值將被拒絕。
- 自動偵測順序：預設瀏覽器（若為 Chromium 架構）→ Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 兩者皆
  在 Chromium 啟動前接受您 OS 主目錄的 `~` 和 `~/...`。
  `existing-session` 設定檔上每個設定檔的 `userDataDir` 也會進行波紋展開。
- 控制服務：僅限回送（連接埠衍生自 `gateway.port`，預設為 `18791`）。
- `extraArgs` 會將額外的啟動旗標附加至本機 Chromium 啟動程序（例如
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

- `seamColor`：原生應用程式 UI chrome 的強調色（對話模式氣泡色調等）。
- `assistant`：控制 UI 身份覆寫。若未設定，則回退至作用中的代理程式身份。

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

<Accordion title="閘道欄位詳細資訊">

- `mode`：`local` (執行閘道) 或 `remote` (連線至遠端閘道)。除非設定為 `local`，否則閘道會拒絕啟動。
- `port`：用於 WS + HTTP 的單一多工連接埠。優先順序：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback` (預設)、`lan` (`0.0.0.0`)、`tailnet` (僅限 Tailscale IP) 或 `custom`。
- **舊版綁定別名**：請在 `gateway.bind` 中使用綁定模式值 (`auto`、`loopback`、`lan`、`tailnet`、`custom`)，而不要使用主機別名 (`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`)。
- **Docker 說明**：預設 `loopback` 綁定會接聽容器內的 `127.0.0.1`。使用 Docker 橋接網路 (`-p 18789:18789`) 時，流量會到達 `eth0`，因此閘道無法存取。請使用 `--network host`，或設定 `bind: "lan"` (或搭配 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`) 以接聽所有介面。
- **驗證**：預設為必填。非 loopback 綁定需要閘道驗證。實務上這意味著共用 token/密碼或具備 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向 Proxy。上架精靈預設會產生一個 token。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` (包含 SecretRefs)，請將 `gateway.auth.mode` 明確設定為 `token` 或 `password`。如果同時設定了這兩者但未設定模式，啟動和服務安裝/修復流程將會失敗。
- `gateway.auth.mode: "none"`：明確的無驗證模式。僅用於受信任的本機 loopback 設定；上架提示刻意不提供此選項。
- `gateway.auth.mode: "trusted-proxy"`：將瀏覽器/使用者驗證委派給身分感知反向 Proxy，並信任來自 `gateway.trustedProxies` 的身分標頭 (請參閱 [受信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth))。此模式預設期望 **非 loopback** 的 Proxy 來源；同主機 loopback 反向 Proxy 需要明確的 `gateway.auth.trustedProxy.allowLoopback = true`。內部同主機呼叫者可以使用 `gateway.auth.password` 作為本機直接後援；`gateway.auth.token` 與受信任 Proxy 模式仍然互斥。
- `gateway.auth.allowTailscale`：當 `true` 時，Tailscale Serve 身分標頭可以滿足 Control UI/WebSocket 驗證 (透過 `tailscale whois` 驗證)。HTTP API 端點 **不會** 使用該 Tailscale 標頭驗證；它們改為遵循閘道的正常 HTTP 驗證模式。此無 token 流程假設閘道主機受信任。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`：可選的驗證失敗限制器。適用於每個用戶端 IP 和每個驗證範圍 (共用金鑰和裝置 token 分別追蹤)。被封鎖的嘗試會傳回 `429` + `Retry-After`。
  - 在非同步 Tailscale Serve Control UI 路徑上，相同 `{scope, clientIp}` 的失敗嘗試會在寫入失敗之前進行序列化。因此，來自同一用戶端的並行錯誤嘗試可能會在第二個請求時觸發限制器，而不是兩者都作為單純的不符而競爭通過。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；當您有意要對 localhost 流量也進行速率限制時 (例如測試設定或嚴格的 Proxy 部署)，請設定 `false`。
- 來自瀏覽器來源的 WS 驗證嘗試總是會受到節流，並停用 loopback 例外 (針對瀏覽器式 localhost 暴力破解的縱深防禦)。
- 在 loopback 上，那些瀏覽器來源的封鎖是依據標準化的 `Origin` 值隔離，因此來自一個 localhost 來源的重複失敗不會自動封鎖不同的來源。
- `tailscale.mode`：`serve` (僅限 tailnet，loopback 綁定) 或 `funnel` (公開，需要驗證)。
- `tailscale.preserveFunnel`：當 `true` 且 `tailscale.mode = "serve"` 時，OpenClaw 會在啟動時重新套用 Serve 之前檢查 `tailscale funnel status`，如果外部設定的 Funnel 路由已經涵蓋了閘道連接埠，則跳過它。預設 `false`。
- `controlUi.allowedOrigins`：用於閘道 WebSocket 連線的明確瀏覽器來源允許清單。公開非 loopback 瀏覽器來源所必需。來自 loopback、RFC1918/link-local、`.local`、`.ts.net` 或 Tailscale CGNAT 主機的私人同來源 LAN/Tailnet UI 載入會在未啟用 Host 標頭後援的情況下被接受。
- `controlUi.chatMessageMaxWidth`：分組 Control UI 聊天訊息的可選最大寬度。接受受限的 CSS 寬度值，例如 `960px`、`82%`、`min(1280px, 82%)` 和 `calc(100% - 2rem)`。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危險模式，可為刻意依賴 Host 標頭來源原則的部署啟用 Host 標頭來源後援。
- `remote.transport`：`ssh` (預設) 或 `direct` (ws/wss)。對於 `direct`，公開主機的 `remote.url` 必須是 `wss://`；純文字 `ws://` 僅接受 loopback、LAN、link-local、`.local`、`.ts.net` 和 Tailscale CGNAT 主機。
- `remote.remotePort`：遠端 SSH 主機上的閘道連接埠。預設為 `18789`；當本機通道連接埠與遠端閘道連接埠不同時使用此設定。
- `gateway.remote.token` / `.password` 是遠端用戶端憑證欄位。它們本身不會設定閘道驗證。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 版本在將中繼備份註冊發佈至閘道後，所使用之外部 APNs 中繼的基礎 HTTPS URL。此 URL 必須符合編譯至 iOS 版本中的中繼 URL。
- `gateway.push.apns.relay.timeoutMs`：閘道至中繼的傳送逾時 (以毫秒為單位)。預設為 `10000`。
- 中繼備份註冊會委派給特定的閘道身分。配對的 iOS 應用程式會擷取 `gateway.identity.get`，在註冊中繼時包含該身分，並將註冊範圍的傳送授權轉送至閘道。另一個閘道無法重複使用該儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中繼設定的暫時環境變數覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：僅供開發使用的 loopback HTTP 中繼 URL 緊急出口。正式中繼 URL 應保持使用 HTTPS。
- `gateway.handshakeTimeoutMs`：預先驗證閘道 WebSocket 握手逾時 (以毫秒為單位)。預設值：`15000`。設定 `OPENCLAW_HANDSHAKE_TIMEOUT_MS` 時優先順序較高。在負載過高或低效能的主機上，當本機用戶端可以在啟動預熱尚未完成時進行連線，請增加此值。
- `gateway.channelHealthCheckMinutes`：通道健康監控間隔 (以分鐘為單位)。設定 `0` 以全域停用健康監控重新啟動。預設值：`5`。
- `gateway.channelStaleEventThresholdMinutes`：過時 Socket 臨界值 (以分鐘為單位)。請將此值保持大於或等於 `gateway.channelHealthCheckMinutes`。預設值：`30`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶在滾動一小時內的最大健康監控重新啟動次數。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全域監控啟用的同時，針對健康監控重新啟動的每個通道選擇退出。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多帳戶通道的每個帳戶覆寫。設定後，其優先順序高於通道層級的覆寫。
- 本機閘道呼叫路徑僅能在未設定 `gateway.auth.*` 時，將 `gateway.remote.*` 作為後援使用。
- 如果透過 SecretRef 明確設定 `gateway.auth.token` / `gateway.auth.password` 且未解析，解析將會失敗關閉 (不會遮蔽遠端後援)。
- `trustedProxies`：終止 TLS 或注入轉送用戶端標頭的反向 Proxy IP。僅列出您控制的 Proxy。Loopback 項目對於同主機 Proxy/本機偵測設定 (例如 Tailscale Serve 或本機反向 Proxy) 仍然有效，但它們 **不會** 讓 loopback 要求有資格使用 `gateway.auth.mode: "trusted-proxy"`。
- `allowRealIpFallback`：當 `true` 時，如果缺少 `X-Forwarded-For`，閘道會接受 `X-Real-IP`。預設 `false` 以實施失敗關閉行為。
- `gateway.nodes.pairing.autoApproveCidrs`：用於自動核准首次節點裝置配對且無要求範圍的可選 CIDR/IP 允許清單。未設定時會停用。這不會自動核准操作員/瀏覽器/Control UI/WebChat 配對，也不會自動核准角色、範圍、中繼資料或公開金鑰升級。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：在配對和平台允許清單評估之後，針對宣告節點指令的全域允許/拒絕塑形。使用 `allowCommands` 以選用危險的節點指令，例如 `camera.snap`、`camera.clip` 和 `screen.record`；`denyCommands` 會移除指令，即使平台預設值或明確允許會包含該指令。節點變更其宣告的指令清單後，請拒絕並重新核准該裝置配對，以便閘道儲存更新的指令快照。
- `gateway.tools.deny`：針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱 (擴充預設拒絕清單)。
- `gateway.tools.allow`：從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- Admin HTTP RPC：預設關閉，為 `admin-http-rpc` 外掛程式。啟用此外掛程式以註冊 `POST /api/v1/admin/rpc`。請參閱 [Admin HTTP RPC](/zh-Hant/plugins/admin-http-rpc)。
- Chat Completions：預設停用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入防護：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空白允許清單視為未設定；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 來停用 URL 擷取。
- 選用的回應防護標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` (僅針對您控制的 HTTPS 來源設定；請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### 多執行個體隔離

在單一主機上使用唯一連接埠和狀態目錄執行多個閘道：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便利標誌：`--dev` (使用 `~/.openclaw-dev` + 連接埠 `19001`)、`--profile <name>` (使用 `~/.openclaw-<name>`)。

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

- `enabled`：在閘道監聽器上啟用 TLS 終止 (HTTPS/WSS) (預設：`false`)。
- `autoGenerate`：當未設定明確的檔案時，自動產生本機自我簽署憑證/金鑰組；僅供本機/開發使用。
- `certPath`：TLS 憑證檔案的檔案系統路徑。
- `keyPath`：TLS 私鑰檔案的檔案系統路徑；請保持權限限制。
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

- `mode`：控制如何在執行階段套用設定編輯。
  - `"off"`：忽略即時編輯；變更需要明確重新啟動。
  - `"restart"`：設定變更時一律重新啟動閘道程序。
  - `"hot"`：在程序內套用變更而不重新啟動。
  - `"hybrid"`（預設值）：先嘗試熱重載；如果需要，則回退到重新啟動。
- `debounceMs`：套用設定變更前的防抖視窗，單位為毫秒（非負整數）。
- `deferralTimeoutMs`：在強制重新啟動或通道熱重載之前，等待進行中作業的可選最長時間（毫秒）。省略此項以使用預設的有界等待（`300000`）；設定 `0` 以無限期等待並記錄週期性的「仍待處理」警告。

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

驗證：`Authorization: Bearer <token>` 或 `x-openclaw-token: <token>`。
查詢字串鉤子令牌會被拒絕。

驗證與安全性注意事項：

- `hooks.enabled=true` 需要一個非空的 `hooks.token`。
- `hooks.token` 必須與 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 不同；重複使用 Gateway 令牌將導致啟動驗證失敗。
- `openclaw security audit``hooks.token` 也會將重複使用有效的 Gateway 密碼驗證（`gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，或 `--auth password --password <password>`）標記為嚴重發現；密碼模式重複使用仍與啟動相容，應透過輪替其中一個金鑰來修復。
- `hooks.path` 不能是 `/`；請使用專用的子路徑，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果對應或預設集使用範本化的 `sessionKey`，請設定 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。靜態對應金鑰不需要該選擇加入設定。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 僅當 `hooks.allowRequestSessionKey=true` 時（預設值：`false`），才接受來自請求載荷的 `sessionKey`。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析
  - 樣板渲染的對應 `sessionKey` 值被視為外部提供，並且也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="對應細節">

- `match.path` 會比對 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 會比對通用路徑的 payload 欄位。
- 像 `{{messages[0].subject}}` 這類的模板會從 payload 中讀取。
- `transform` 可以指向一個返回 hook action 的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，且必須停留在 `hooks.transformsDir` 內（絕對路徑和路徑遍歷會被拒絕）。
  - 請將 `hooks.transformsDir` 保持在 `~/.openclaw/hooks/transforms` 下；工作區技能目錄會被拒絕。如果 `openclaw doctor` 回報此路徑無效，請將轉換模組移至 hooks transforms 目錄中，或移除 `hooks.transformsDir`。
- `agentId` 將路由傳送至特定的代理；未知的 ID 會退回至預設代理。
- `allowedAgentIds`：限制有效的代理路由，包括省略 `agentId` 時的 default-agent 路徑（`*` 或省略 = 允許全部，`[]` = 拒絕全部）。
- `defaultSessionKey`：選用的固定 session 金鑰，用於沒有明確 `sessionKey` 的 hook 代理執行。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者和模板驅動的對應 session 金鑰來設定 `sessionKey`（預設值：`false`）。
- `allowedSessionKeyPrefixes`：明確 `sessionKey` 值（請求 + 對應）的選用前綴允許清單，例如 `["hook:"]`。當任何對應或預設集使用模板化的 `sessionKey` 時，此項即變為必要。
- `deliver: true` 將最終回覆傳送至通道；`channel` 預設為 `last`。
- `model` 覆寫此 hook 執行的 LLM（若設定了模型目錄，則必須被允許）。

</Accordion>

### Gmail 整合

- 內建的 Gmail 預設使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留該逐訊息路由，請設定 `hooks.allowRequestSessionKey: true` 並限制 `hooks.allowedSessionKeyPrefixes` 以符合 Gmail 命名空間，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，請使用靜態的 `sessionKey` 覆寫預設，而非使用樣板化的預設值。

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

- 設定後，Gateway 會在啟動時自動啟動 `gog gmail watch serve`。請設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以停用此功能。
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
- 僅限本機：保持 `gateway.bind: "loopback"`（預設值）。
- 非回環綁定：Canvas 路由需要 Gateway 驗證（權杖/密碼/trusted-proxy），與其他 Gateway HTTP 表面相同。
- Node WebViews 通常不會發送驗證標頭；在節點配對並連線後，Gateway 會公布針對節點範圍的 Canvas/A2UI 存取功能 URL。
- 功能 URL 繫結至作用中的節點 WS 會話並且會快速過期。不使用基於 IP 的後備機制。
- 將熱重載用戶端注入至提供的 HTML 中。
- 若為空，會自動建立初始 `index.html`。
- 同時在 `/__openclaw__/a2ui/` 提供 A2UI。
- 變更需要重新啟動 Gateway。
- 對於大型目錄或 `EMFILE` 錯誤，請停用熱重載。

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

- `minimal`（當啟用內建 `bonjour` 插件時的預設值）：從 TXT 記錄中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`；LAN 多播廣告仍需啟用內建 `bonjour` 插件。
- `off`：抑制 LAN 多播廣告而不變更插件啟用狀態。
- 內建 `bonjour` 插件會在 macOS 主機上自動啟動，並在 Linux、Windows 和容器化 Gateway 部署上為選用。
- 主機名稱預設為系統主機名稱（當其為有效的 DNS 標籤時），若無效則回退為 `openclaw`。可使用 `OPENCLAW_MDNS_HOSTNAME` 覆寫。

### 廣域網路 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下寫入單播 DNS-SD 區域。若要進行跨網路探索，請搭配 DNS 伺服器（建議使用 CoreDNS）與 Tailscale 分割 DNS。

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

- 僅當程序環境中缺少該金鑰時，才會套用內聯環境變數。
- `.env` 檔案：CWD `.env` + `~/.openclaw/.env` (兩者都不會覆寫既有變數)。
- `shellEnv`：從您的登入 shell 設定檔匯入缺少的預期金鑰。
- 關於完整的優先順序，請參閱 [環境](/zh-Hant/help/environment)。

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
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,255}$` (支援 AWS 風格的 `secret#json_key` 選擇器)
- `source: "exec"` id 不得包含 `.` 或 `..` 斜線分隔路徑區段 (例如 `a/../b` 會被拒絕)

### 支援的憑證層面

- 標準矩陣：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- `secrets apply` 以支援的 `openclaw.json` 憑證路徑為目標。
- `auth-profiles.json` refs 包含在運行時解析和稽核覆蓋範圍中。

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

- `file` provider 支援 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下 `id` 必須為 `"value"`）。
- 當無法使用 Windows ACL 驗證時，File 和 exec provider 路徑會以失敗封閉的方式處理。僅對無法驗證的受信任路徑設定 `allowInsecurePath: true`。
- `exec` provider 需要絕對 `command` 路徑，並在 stdin/stdout 上使用協議 payload。
- 根據預設，會拒絕符號連結命令路徑。設定 `allowSymlinkCommand: true` 以允許符號連結路徑，同時驗證解析後的目標路徑。
- 如果設定了 `trustedDirs`，受信任目錄檢查會套用至解析後的目標路徑。
- 根據預設，`exec` 子進程環境是精簡的；請使用 `passEnv` 明確傳遞所需變數。
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

- 個別 agent 設定檔儲存於 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 支援靜態憑證模式的值層級 refs（針對 `api_key` 使用 `keyRef`，針對 `token` 使用 `tokenRef`）。
- 舊版扁平 `auth-profiles.json` 對應（例如 `{ "provider": { "apiKey": "..." } }`）並非執行時期格式；`openclaw doctor --fix` 會將其重寫為具有 `.legacy-flat.*.bak` 備份的標準 `provider:default` API-key 設定檔。
- OAuth 模式設定檔（`auth.profiles.<id>.mode = "oauth"`）不支援 SecretRef 支援的 auth-profile 憑證。
- 靜態執行時期憑證來自記憶體內部解析快照；舊版靜態 `auth.json` 項目在發現時會被清除。
- 從 `~/.openclaw/credentials/oauth.json` 匯入的舊版 OAuth。
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

- `billingBackoffHours`：當設定檔因真正的帳單/信用額度不足錯誤而失敗時，以小時為單位的基礎退避時間（預設值：`5`）。即使在 `401`/`403` 回應上，明確的帳單文字仍可能出現在此處，但提供者特定的文字比對器仍僅限於擁有它們的提供者（例如 OpenRouter `Key limit exceeded`）。可重試的 HTTP `402` 使用量視窗或組織/工作區花費限制訊息則會保留在 `rate_limit` 路徑中。
- `billingBackoffHoursByProvider`：可選的各提供者帳單退避小時數覆寫。
- `billingMaxHours`：帳單退避指數增長的小時數上限（預設值：`24`）。
- `authPermanentBackoffMinutes`：高信心度 `auth_permanent` 失敗的基礎退避分鐘數（預設值：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增長的分鐘數上限（預設值：`60`）。
- `failureWindowHours`：用於退避計數器的滾動視窗（小時）（預設值：`24`）。
- `overloadedProfileRotations`：在切換到模型備援之前，針對過載錯誤的相同提供者 auth-profile 輪換次數上限（預設值：`1`）。例如 `ModelNotReadyException` 等提供者忙碌形狀會落入此處。
- `overloadedBackoffMs`：重試過載提供者/設定檔輪換前的固定延遲（預設值：`0`）。
- `rateLimitedProfileRotations`：在切換到模型備援之前，針對速率限制錯誤的同一供應商 auth-profile 輪換次數上限（預設值：`1`）。該速率限制區塊包含供應商格式的文字，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

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
- 當 `--verbose` 時，`consoleLevel` 會增加到 `debug`。
- `maxFileBytes`：輪換前的活躍日誌檔案大小上限（位元組）（正整數；預設值：`104857600` = 100 MB）。OpenClaw 會在活躍檔案旁保留最多五個編號的存檔。
- `redactSensitive` / `redactPatterns`：針對主控台輸出、檔案日誌、OTLP 日誌記錄和持久化會話逐字稿文字的最佳遮蔽嘗試。`redactSensitive: "off"` 僅停用此一般日誌/逐字稿策略；UI/工具/診斷安全介面在發送前仍會對機密進行編輯。

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

- `enabled`：檢測輸出的主切換開關（預設值：`true`）。
- `flags`：啟用特定日誌輸出的旗標字串陣列（支援如 `"telegram.*"` 或 `"*"` 的萬用字元）。
- `stuckSessionWarnMs`：將長時間執行的處理會話分類為 `session.long_running`、`session.stalled` 或 `session.stuck` 的無進行時間閾值（毫秒）。回覆、工具、狀態、區塊和 ACP 進度會重置計時器；重複的 `session.stuck` 診斷若未變更則會退避。
- `stuckSessionAbortMs`：符合條件的停滯活躍工作可能被中止排空以進行復原前的無進行時間閾值（毫秒）。若未設定，OpenClaw 會使用更安全的延伸內嵌執行視窗，至少為 5 分鐘且為 3 倍 `stuckSessionWarnMs`。
- `memoryPressureSnapshot`：當記憶體壓力達到 `critical` 時（預設值：`false`），擷取經過編輯的 OOM 前穩定性快照。設定為 `true` 可在保持正常記憶體壓力事件的同時，新增穩定性套件檔案的掃描/寫入。
- `otel.enabled`：啟用 OpenTelemetry 匯出管線（預設值：`false`）。如需完整組態、訊號目錄和隱私模型，請參閱 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。
- `otel.endpoint`：OTel 匯出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：選用的特定訊號 OTLP 端點。設定時，僅針對該訊號覆寫 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（預設值）或 `"grpc"`。
- `otel.headers`：隨 OTel 匯出請求發送的額外 HTTP/gRPC 中繼資料標頭。
- `otel.serviceName`：資源屬性的服務名稱。
- `otel.traces` / `otel.metrics` / `otel.logs`：啟用追蹤、指標或記錄匯出。
- `otel.sampleRate`：追蹤取樣率 `0`-`1`。
- `otel.flushIntervalMs`：定期遙測排清間隔（毫秒）。
- `otel.captureContent`：選用 OTEL span 屬性的原始內容擷取。預設為關閉。布林值 `true` 會擷取非系統訊息/工具內容；物件形式可讓您明確啟用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs`、`systemPrompt` 和 `toolDefinitions`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：用於切換最新實驗性 GenAI 推理 span 形狀的環境變數，包括 `{gen_ai.operation.name} {gen_ai.request.model}` span 名稱、`CLIENT` span 種類，以及 `gen_ai.provider.name` 而非傳統的 `gen_ai.system`。預設情況下，為了相容性，span 會保留 `openclaw.model.call` 和 `gen_ai.system`；GenAI 指標使用有邊界的語義屬性。
- `OPENCLAW_OTEL_PRELOADED=1`：針對已註冊全域 OpenTelemetry SDK 之主機的環境切換開關。OpenClaw 將會跳過外掛擁有的 SDK 啟動/關閉，同時保持診斷監聽器處於啟用狀態。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：當未設定相符的設定鍵時，使用的特定訊號端點環境變數。
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

- `channel`：npm/git 安裝的發行通道 - `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：當閘道啟動時檢查 npm 更新（預設值：`true`）。
- `auto.enabled`：啟用套件安裝的背景自動更新（預設值：`false`）。
- `auto.stableDelayHours`：穩定通道自動套用前的最小延遲小時數（預設值：`6`；最大值：`168`）。
- `auto.stableJitterHours`：額外的穩定通道推出分散視窗（小時）（預設值：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：測試通道檢查的執行頻率，以小時為單位（預設值：`1`；最大值：`24`）。

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

- `enabled`：ACP 功能的全域開關（預設值：`true`；設為 `false` 可隱藏 ACP 分派和生成功能）。
- `dispatch.enabled`：ACP 會話回合分派的獨立開關（預設值：`true`）。設為 `false` 可在阻擋執行的同時保留 ACP 指令的可用性。
- `backend`：預設的 ACP 執行後端 ID（必須符合已註冊的 ACP 執行外掛程式）。
  請先安裝後端外掛程式，如果設定了 `plugins.allow`，則必須包含後端外掛程式 ID（例如 `acpx`），否則 ACP 後端將無法載入。
- `defaultAgent`：當生成作業未指定明確目標時使用的 ACP 備用目標代理程式 ID。
- `allowedAgents`：允許用於 ACP 執行階段會話的代理程式 ID 允許清單；留空表示沒有額外限制。
- `maxConcurrentSessions`：同時作用中的 ACP 會話數量上限。
- `stream.coalesceIdleMs`：串流文字的閒置排清時間視窗，以毫秒為單位。
- `stream.maxChunkChars`：分割串流區塊投影前的區塊大小上限。
- `stream.repeatSuppression`：每回合抑制重複的狀態/工具行（預設值：`true`）。
- `stream.deliveryMode`：`"live"` 會逐步串流；`"final_only"` 則緩衝直到回合終端事件。
- `stream.hiddenBoundarySeparator`：隱藏工具事件之後、可見文字之前的分隔符號（預設值：`"paragraph"`）。
- `stream.maxOutputChars`：每個 ACP 回合投影的助理輸出字元數上限。
- `stream.maxSessionUpdateChars`：投影的 ACP 狀態/更新行字元數上限。
- `stream.tagVisibility`：標籤名稱對應至布林值可見性覆寫的記錄，用於串流事件。
- `runtime.ttlMinutes`：ACP 會話工作程式的閒置 TTL，以分鐘為單位，過後即符合清理資格。
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
  - `"random"`（預設值）：輪換顯示幽默/節慶標語。
  - `"default"`：固定的中性標語（`All your chats, one OpenClaw.`）。
  - `"off"`：不顯示標語文字（橫幅標題/版本仍會顯示）。
- 若要隱藏整個橫幅（不只是標語），請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

---

## 精靈

由 CLI 引導設定流程寫入的中繼資料（`onboard`、`configure`、`doctor`）：

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

請參閱 [Agent defaults](/zh-Hant/gateway/config-agents#agent-defaults) 下的 `agents.list` 身分欄位。

---

## 橋接器（舊版，已移除）

目前版本不再包含 TCP 橋接器。節點透過 Gateway WebSocket 連線。`bridge.*` 金鑰不再是配置架構的一部分（驗證會失敗直到將其移除；`openclaw doctor --fix` 可以移除未知金鑰）。

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

- `sessionRetention`：在從 `sessions.json` 清除之前，保留已完成的獨立 cron 執行階段的時間長度。同時也會控制已歸檔之已刪除 cron 腳本的清理。預設值：`24h`；設為 `false` 以停用。
- `runLog.maxBytes`：為了與較舊的檔案支援 cron 執行記錄相容而接受。預設值：`2_000_000` 位元組。
- `runLog.keepLines`：每個工作保留的最新 SQLite 執行記錄列數。預設值：`2000`。
- `webhookToken`：用於 cron webhook POST 傳遞的 bearer token（`delivery.mode = "webhook"`），如果省略則不傳送授權標頭。
- `webhook`：已棄用的舊版後備 webhook URL (http/https)，僅用於仍具有 `notify: true` 的已儲存工作。

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

- `maxAttempts`：針對暫時性錯誤的 cron 任務最大重試次數（預設：`3`；範圍：`0`-`10`）。
- `backoffMs`：每次重試嘗試的退避延遲陣列，單位為毫秒（預設：`[30000, 60000, 300000]`；1-10 個項目）。
- `retryOn`：觸發重試的錯誤類型 - `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。若省略則重試所有暫時性類型。

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

- `enabled`：啟用 cron 任務的失敗警示（預設：`false`）。
- `after`：觸發警示前的連續失敗次數（正整數，最小值：`1`）。
- `cooldownMs`：針對同一任務重複警示之間的最小毫秒數（非負整數）。
- `includeSkipped`：將連續跳過的執行計入警示閾值（預設：`false`）。跳過的執行會單獨追蹤，且不影響執行錯誤退避。
- `mode`：傳遞模式 - `"announce"` 透過頻道訊息傳送；`"webhook"` 發布至設定的 webhook。
- `accountId`：用於限定警示傳遞範圍的選用帳戶或頻道 ID。

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
- `mode`：`"announce"` 或 `"webhook"`；當存在足夠的目標資料時，預設為 `"announce"`。
- `channel`：公告傳遞的頻道覆寫。`"last"` 會重複使用最後已知的傳遞頻道。
- `to`：明確的公告目標或 webhook URL。Webhook 模式必填。
- `accountId`：傳遞的選用帳戶覆寫。
- 個別工作的 `delivery.failureDestination` 會覆寫此全域預設值。
- 當未設定全域或個別工作的失敗目的地時，已透過 `announce` 傳遞的工作會在失敗時回退至該主要公告目標。
- `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 工作，除非工作的主要 `delivery.mode` 為 `"webhook"`。

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

## 配置包含 (`$include`)

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
- 路徑：相對於包含檔案解析，但必須保持在頂層配置目錄內（`dirname` 的 `openclaw.json`）。只有在解析後仍位於該邊界內時，才允許使用絕對/`../` 格式。路徑不得包含 null 位元組，且在解析前後的長度必須嚴格短於 4096 個字元。
- 如果 OpenClaw 擁有的寫入操作僅更改由單一檔案包含支援的一個頂層區段，則會直接寫入到該包含的檔案中。例如，`plugins install` 會更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，並保持 `openclaw.json` 不變。
- 對於 OpenClaw 擁有的寫入操作，根層級包含、包含陣列以及具有同層級覆蓋的包含均為唯讀；這些寫入操作將以「失敗關閉」的方式處理，而不是將配置扁平化。
- 錯誤：針對檔案缺失、解析錯誤、循環包含、無效路徑格式和過長長度提供清楚的訊息。

---

_相關：[配置](/zh-Hant/gateway/configuration) · [配置範例](/zh-Hant/gateway/configuration-examples) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [配置](/zh-Hant/gateway/configuration)
- [配置範例](/zh-Hant/gateway/configuration-examples)
