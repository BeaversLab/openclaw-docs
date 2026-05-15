---
summary: "核心 OpenClaw 金鑰、預設值及專用子系統參考連結的 Gateway 設定參考"
title: "設定參考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

`~/.openclaw/openclaw.json` 的核心設定參考。如需任務導向的概覽，請參閱[設定](/zh-Hant/gateway/configuration)。

涵蓋主要的 OpenClaw 設定層面，並在子系統擁有自身更深入的參考資料時提供連結。通道 和外掛 擁有的指令目錄以及深度記憶體/QMD 調整選項位於各自的頁面上，而非此頁。

程式碼基準：

- `openclaw config schema` 會列印用於驗證和控制 UI 的即時 JSON Schema，並在可用時合併套件/外掛/通道的中繼資料
- `config.schema.lookup` 會傳回一個用於深入檢視工具的路徑範圍 Schema 節點
- `pnpm config:docs:check` / `pnpm config:docs:gen` 會針對目前的 Schema 表面驗證設定文件基準雜湊

Agent 查詢路徑：在編輯前，使用 `gateway` 工具動作 `config.schema.lookup` 以取得確切的欄位層級文件和限制條件。使用[設定](/zh-Hant/gateway/configuration)取得任務導向的指引，並利用此頁面查看更廣泛的欄位對應、預設值以及子系統參考的連結。

專屬深度參考資料：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 以及 `plugins.entries.memory-core.config.dreaming` 下的夢境設定之[記憶體設定參考](/zh-Hant/reference/memory-config)
- 目前內建 + 套件命令目錄的[斜線命令](/zh-Hant/tools/slash-commands)
- 擁有者通道/外掛頁面，用於通道特定的指令介面

設定格式為 **JSON5**（允許註解和結尾逗號）。所有欄位皆為選用 - 若省略，OpenClaw 會使用安全的預設值。

---

## 通道

各通道設定金鑰已移至專用頁面 - 請參閱 `channels.*` 的[設定 - 通道](/zh-Hant/gateway/config-channels)，
包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他
套件通道（驗證、存取控制、多重帳戶、提及閘控）。

## Agent 預設值、多重 Agent、工作階段與訊息

已移至專用頁面 - 請參閱
[設定 - agents](/zh-Hant/gateway/config-agents) 以了解：

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

工具原則、實驗性切換開關、提供者支援的工具設定，以及自訂
提供者/基礎 URL 設定已移至專用頁面 - 請參閱
[Configuration - tools and custom providers](/zh-Hant/gateway/config-tools)。

## 模型

提供者定義、模型允許清單以及自訂提供者設定位於
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

- `models.mode`：提供者目錄行為 (`merge` 或 `replace`)。
- `models.providers`：以提供者 ID 為鍵的自訂提供者對應。
- `models.pricing.enabled`：控制在 Sidecar 與通道到達 Gateway 就緒路徑後啟動的背景定價啟動程序。當 `false` 時，
  Gateway 會跳過 OpenRouter 與 LiteLLM 的定價目錄擷取；設定好的
  `models.providers.*.models[].cost` 值仍可用於本地成本估算。

## MCP

由 OpenClaw 管理的 MCP 伺服器定義位於 `mcp.servers` 之下，並由
內嵌的 Pi 及其他執行時期介接器所使用。`openclaw mcp list`、
`show`、`set` 和 `unset` 指令可在不於編輯設定期間連接至
目標伺服器的情況下管理此區塊。

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
      },
    },
  },
}
```

- `mcp.servers`：為公開已設定 MCP 工具的執行時期 (runtime) 提供命名的 stdio 或遠端 MCP 伺服器定義。
  遠端項目使用 `transport: "streamable-http"` 或 `transport: "sse"`；
  `type: "http"` 是一個 CLI 原生別名，`openclaw mcp set` 和
  `openclaw doctor --fix` 會將其正規化為標準的 `transport` 欄位。
- `mcp.sessionIdleTtlMs`：會話範圍內打包 MCP 執行時期的閒置 TTL。
  一次性嵌入式執行會請求執行結束時的清理；此 TTL 是針對長期存活的
  會話和未來呼叫者的最後防線。
- `mcp.*` 下的變更會透過捨棄快取的會話 MCP 執行時期來熱套用。
  下一次工具探索/使用會根據新設定重新建立它們，因此移除的
  `mcp.servers` 項目會立即被回收，而不必等待閒置 TTL。

請參閱 [MCP](/zh-Hant/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI 後端](/zh-Hant/gateway/cli-backends#bundle-mcp-overlays) 以了解執行時期行為。

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

- `allowBundled`：僅針對打包的技能的可選允許清單（受管理/工作區技能不受影響）。
- `load.extraDirs`：額外的共用技能根目錄（優先順序最低）。
- `load.allowSymlinkTargets`：當連結位於其設定的來源根目錄之外時，
  技能符號連結可解析至的受信任真實目標根目錄。
- `install.preferBrew`：當為 true 時，若 `brew` 可用，
  則在回退至其他安裝程式類型之前，優先使用 Homebrew 安裝程式。
- `install.nodeManager`：針對 `metadata.openclaw.install`
  規格的 node 安裝程式偏好設定 (`npm` | `pnpm` | `yarn` | `bun`)。
- `install.allowUploadedArchives`：允許受信任的 `operator.admin` Gateway
  客戶端安裝透過 `skills.upload.*` 暫存的私人 zip 壓縮檔
  (預設：false)。這僅啟用上傳壓縮檔的路徑；正常的 ClawHub
  安裝不需要此設定。
- `entries.<skillKey>.enabled: false` 會停用技能，即使其已打包/安裝。
- `entries.<skillKey>.apiKey`：用於宣告主要環境變數的便捷方式（純文字字串或 SecretRef 物件）。

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
- 探索功能接受原生的 OpenClaw 外掛程式，以及相容的 Codex 套件和 Claude 套件，包括無清單 (manifestless) 的 Claude 預設佈局套件。
- **設定變更需要重新啟動閘道。**
- `allow`：選用性的允許清單（僅載入列出的外掛程式）。`deny` 優先。
- `bundledDiscovery`：對於新設定預設為 `"allowlist"`，因此非空的
  `plugins.allow` 也會限制隨附的提供者外掛程式，包括網頁搜尋
  執行時期提供者。Doctor 會為遷移的舊版允許清單
  設定寫入 `"compat"`，以便在您選擇加入之前保留現有的隨附提供者行為。
- `plugins.entries.<id>.apiKey`：外掛程式層級的 API 金鑰便捷欄位（當外掛程式支援時）。
- `plugins.entries.<id>.env`：外掛程式範圍的環境變數對應。
- `plugins.entries.<id>.hooks.allowPromptInjection`：當設為 `false` 時，核心會阻擋 `before_prompt_build` 並忽略來自舊版 `before_agent_start` 的提示變異欄位，同時保留舊版的 `modelOverride` 和 `providerOverride`。適用於原生外掛程式掛鉤和支援的套件提供掛鉤目錄。
- `plugins.entries.<id>.hooks.allowConversationAccess`：當設為 `true` 時，受信任的非隨附外掛程式可以從類型化掛鉤（例如 `llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize` 和 `agent_end`）讀取原始對話內容。
- `plugins.entries.<id>.subagent.allowModelOverride`：明確信任此外掛程式，以便針對背景子代理程式執行請求每次執行的 `provider` 和 `model` 覆寫。
- `plugins.entries.<id>.subagent.allowedModels`：受信任子代理覆寫的標準 `provider/model` 目標的可選允許清單。僅當您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.llm.allowModelOverride`：明確信任此外掛程式請求 `api.runtime.llm.complete` 的模型覆寫。
- `plugins.entries.<id>.llm.allowedModels`：受信任外掛程式 LLM 完成覆寫的標準 `provider/model` 目標的可選允許清單。僅當您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.llm.allowAgentIdOverride`：明確信任此外掛程式針對非預設代理 ID 執行 `api.runtime.llm.complete`。
- `plugins.entries.<id>.config`：外掛程式定義的設定物件（如果有可用的原生 OpenClaw 外掛程式 schema，則會進行驗證）。
- 通道外掛程式帳號/執行時設定位於 `channels.<id>` 之下，應由擁有外掛程式的清單 `channelConfigs` 元資料描述，而非由中央 OpenClaw 選項註冊表描述。

### Codex 鞍座外掛程式設定

內建的 `codex` 外掛程式擁有 `plugins.entries.codex.config` 之下的原生 Codex 應用程式伺服器鞍座設定。請參閱 [Codex 鞍座參考](/zh-Hant/plugins/codex-harness-reference) 以了解完整的設定表面，並參閱 [Codex 鞍座](/zh-Hant/plugins/codex-harness) 以了解執行時模型。

`codexPlugins` 僅適用於選擇原生 Codex 鞍座的階段。它不會為 Pi、正常的 OpenAI 提供者執行、ACP 對話繫結或任何非 Codex 鞍座啟用 Codex 外掛程式。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          codexPlugins: {
            enabled: true,
            allow_destructive_actions: false,
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

- `plugins.entries.codex.config.codexPlugins.enabled`：啟用 Codex 鞍座的原生 Codex
  外掛程式/應用程式支援。預設值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`：
  已遷移外掛程式應用程式誘導的預設破壞性動作原則。
  預設值：`false`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：當全域 `codexPlugins.enabled` 也為 true 時，
  啟用已遷移的外掛程式項目。
  對於明確項目，預設值為 `true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：
  穩定的市集身分識別。V1 僅支援 `"openai-curated"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：穩定
  來自遷移的 Codex 外掛程式識別身份，例如 `"google-calendar"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：
  針對各個外掛程式的破壞性動作覆寫。若省略，則使用全域
  `allow_destructive_actions` 值。

`codexPlugins.enabled` 是全域啟用指令。由遷移寫入的明確外掛程式
條目是永久安裝與修復資格集合。
不支援 `plugins["*"]`，沒有 `install` 開關，而且本機
`marketplacePath` 值刻意不設為設定欄位，因為它們
是主機特定的。

`app/list` 就緒檢查會快取一小時，並在過期時
以非同步方式重新整理。Codex 執行緒應用程式設定是在建立 Codex harness
工作階段時計算，而非在每次輪次時計算；請在變更原生外掛程式設定後使用
`/new`、`/reset` 或重新啟動
閘道。

- `plugins.entries.firecrawl.config.webFetch`：Firecrawl web-fetch 提供者設定。
  - `apiKey`：Firecrawl API 金鑰（接受 SecretRef）。若無則回退至 `plugins.entries.firecrawl.config.webSearch.apiKey`、舊版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 環境變數。
  - `baseUrl`：Firecrawl API 基礎 URL（預設值：`https://api.firecrawl.dev`；自託管的覆寫必須以私密/內部端點為目標）。
  - `onlyMainContent`：僅從頁面擷取主要內容（預設值：`true`）。
  - `maxAgeMs`：最大快取存留時間（毫秒）（預設值：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取請求逾時時間（秒）（預設值：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search (Grok 網頁搜尋) 設定。
  - `enabled`：啟用 X Search 提供者。
  - `model`：用於搜尋的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：記憶夢境設定。請參閱 [Dreaming](/zh-Hant/concepts/dreaming) 以了解階段與臨界值。
  - `enabled`：主夢想開關（預設 `false`）。
  - `frequency`：每次完整夢想掃描的 cron 頻率（預設為 `"0 3 * * *"`）。
  - `model`：可選的 Dream Diary 子代理模型覆蓋。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；搭配 `allowedModels` 以限制目標。模型不可用錯誤會使用工作階段預設模型重試一次；信任或允許清單失敗不會無聲地回退。
  - 階段策略和閾值是實作細節（非使用者面向的設定鍵）。
- 完整的記憶體配置位於 [記憶體配置參考](/zh-Hant/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已啟用的 Claude 套件插件也可以從 `settings.json` 貢獻嵌入的 Pi 預設值；OpenClaw 將其應用為經過清理的代理設定，而非原始的 OpenClaw 配置修補程式。
- `plugins.slots.memory`：選取活動的記憶體外掛程式 id，或設為 `"none"` 以停用記憶體外掛程式。
- `plugins.slots.contextEngine`：選取活動的內容引擎外掛程式 id；除非您安裝並選擇其他引擎，否則預設為 `"legacy"`。

請參閱 [插件](/zh-Hant/tools/plugin)。

---

## 承諾

`commitments` 控制推斷的後續記憶：OpenClaw 可以從對話輪次中檢測回報，並透過心跳執行傳送它們。

- `commitments.enabled`：啟用推斷後續承諾的隱藏 LLM 提取、儲存和心跳傳送。預設：`false`。
- `commitments.maxPerDay`：每個代理工作階段在滾動一天內傳送的最大推斷後續承諾數量。預設：`3`。

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
- `tabCleanup` 會在閒置時間後或當會話超過其上限時，回收受追蹤的主要代理程式分頁。設定 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 以停用這些個別的清理模式。
- 若未設定則會停用 `ssrfPolicy.dangerouslyAllowPrivateNetwork`，因此瀏覽器導航預設會保持嚴格模式。
- 僅當您刻意信任私人網路瀏覽器導航時，才設定 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在嚴格模式下，遠端 CDP 設定檔端點 (`profiles.*.cdpUrl`) 在連線能力/探索檢查期間，也會受到相同的私人網路封鎖限制。
- `ssrfPolicy.allowPrivateNetwork` 作為舊版別名仍受支援。
- 在嚴格模式下，請使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 來設定明確的例外情況。
- 遠端設定檔僅支援附加功能 (已停用 start/stop/reset)。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  當您希望 OpenClaw 探索 `/json/version` 時，請使用 HTTP(S)；當您的供應商提供直接的 DevTools WebSocket URL 時，請使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 適用於遠端和
  `attachOnly` CDP 連線能力以及開啟分頁請求。受管理的迴路
  設定檔則保留本機 CDP 預設值。
- 如果外部管理的 CDP 服務可透過迴路存取，請設定該
  設定檔的 `attachOnly: true`；否則 OpenClaw 會將該迴路連接埠視為
  本機受管理的瀏覽器設定檔，並可能回報本機連接埠擁有權錯誤。
- `existing-session` 設定檔使用 Chrome MCP 而非 CDP，且可以在
  選定的主機上或透過連線的瀏覽器節點進行附加。
- `existing-session` 設定檔可以設定 `userDataDir` 以目標指向特定的
  瀏覽器設定檔，例如 Brave 或 Edge。
- `existing-session` 設定檔保持當前的 Chrome MCP 路由限制：
  使用快照/參照驅動的操作而非 CSS 選擇器定位、單一檔案上傳
  掛鉤、無對話方塊逾時覆寫、無 `wait --load networkidle`，以及無
  `responsebody`、PDF 匯出、下載攔截或批次操作。
- 本機受管理的 `openclaw` 設定檔會自動指派 `cdpPort` 和 `cdpUrl`；僅需
  針對遠端 CDP 明確設定 `cdpUrl`。
- 本機受管理的設定檔可以設定 `executablePath` 以覆寫該設定檔的
  全域 `browser.executablePath`。使用此功能可在 Chrome 中執行一個設定檔，而在 Brave 中執行另一個。
- 本機受管理的設定檔在程序啟動後使用 `browser.localLaunchTimeoutMs` 進行 Chrome CDP HTTP
  探索，並使用 `browser.localCdpReadyTimeoutMs` 進行
  啟動後的 CDP WebSocket 就緒檢查。在 Chrome 雖然成功啟動但就緒檢查與啟動程序競爭的較慢主機上，請調高這些值。這兩個值都必須是
  不超過 `120000` 毫秒的正整數；無效的設定值將被拒絕。
- 自動偵測順序：預設瀏覽器（若為 Chromium 核心）→ Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 兩者
  都在 Chromium 啟動前接受您作業系統主目錄的 `~` 和 `~/...`。
  `existing-session` 設定檔上的各設定檔 `userDataDir` 也會進行波浪擴展。
- 控制服務：僅限回環 (port derived from `gateway.port`，預設 `18791`)。
- `extraArgs` 會將額外的啟動旗標附加到本機 Chromium 啟動程序中（例如
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

- `seamColor`：原生應用程式 UI 鉻的強調色（對話模式氣泡色彩等）。
- `assistant`：控制 UI 身分覆寫。回退至作用中的代理程式身分。

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
      url: "ws://gateway.tailnet:18789",
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

- `mode`： `local` （執行 gateway）或 `remote` （連線到遠端 gateway）。除非 `local`，否則 Gateway 拒絕啟動。
- `port`：用於 WS + HTTP 的單一多工連接埠。優先順序： `--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`： `auto`、 `loopback` （預設）、 `lan` （`0.0.0.0`）、 `tailnet` （僅限 Tailscale IP），或 `custom`。
- **舊版綁定別名**：在 `gateway.bind` 中使用綁定模式值 （`auto`、 `loopback`、 `lan`、 `tailnet`、 `custom`），而不是主機別名 （`0.0.0.0`、 `127.0.0.1`、 `localhost`、 `::`、 `::1`）。
- **Docker 說明**：預設 `loopback` 綁定會在容器內監聽 `127.0.0.1`。使用 Docker 橋接網路 （`-p 18789:18789`） 時，流量會到達 `eth0`，因此無法連上 gateway。請使用 `--network host`，或設定 `bind: "lan"` （或搭配 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`） 以監聽所有介面。
- **驗證**：預設為必填。非 loopback 綁定需要 gateway 驗證。實務上這表示共用 token/密碼，或是具備 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向代理。入門精靈預設會產生 token。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` （包括 SecretRefs），請將 `gateway.auth.mode` 明確設為 `token` 或 `password`。如果同時設定了兩者但未設定模式，啟動和服務安裝/修復流程將會失敗。
- `gateway.auth.mode: "none"`：明確的無驗證模式。僅用於受信任的本機 loopback 設定；入門提示刻意不提供此選項。
- `gateway.auth.mode: "trusted-proxy"`：將瀏覽器/使用者驗證委派給身分感知反向代理，並信任來自 `gateway.trustedProxies` 的身分標頭 （請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth)）。此模式預設期望 **非 loopback** 的代理來源；同主機 loopback 反向代理需要明確設定 `gateway.auth.trustedProxy.allowLoopback = true`。內部同主機呼叫者可以使用 `gateway.auth.password` 作為本機直接後援； `gateway.auth.token` 與 trusted-proxy 模式仍互斥。
- `gateway.auth.allowTailscale`：當 `true` 時，Tailscale Serve 身分標頭可以滿足 Control UI/WebSocket 驗證 （透過 `tailscale whois` 驗證）。HTTP API 端點 **不** 使用該 Tailscale 標頭驗證；它們改為遵循 gateway 的正常 HTTP 驗證模式。此無 token 流程假設 gateway 主機受信任。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`：可選的驗證失敗限制器。套用於每個用戶端 IP 和每個驗證範圍 （shared-secret 和 device-token 會獨立追蹤）。被封鎖的嘗試會傳回 `429` + `Retry-After`。
  - 在非同步 Tailscale Serve Control UI 路徑上，相同 `{scope, clientIp}` 的失敗嘗試會在寫入失敗前進行序列化。因此，來自同一用戶端的並行錯誤嘗試可能會在第二個請求時觸發限制器，而不是兩者都作為單純的不相符而競爭通過。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；當您有意讓 localhost 流量也受到速率限制時，請設定 `false` （適用於測試環境或嚴格的代理部署）。
- 瀏覽器來源的 WS 驗證嘗試總是會受到節流，並停用 loopback 豁免 （針對瀏覽器型 localhost 暴力破解的深度防禦）。
- 在 loopback 上，這些瀏覽器來源鎖定是根據標準化的 `Origin`
  值隔離的，因此來自一個 localhost 來源的重複失敗不會自動
  鎖定不同的來源。
- `tailscale.mode`： `serve` （僅限 tailnet，loopback 綁定）或 `funnel` （公開，需要驗證）。
- `tailscale.preserveFunnel`：當 `true` 且 `tailscale.mode = "serve"` 時，OpenClaw
  會在啟動時重新套用 Serve 之前檢查 `tailscale funnel status`，如果
  外部設定的 Funnel 路由已經涵蓋 gateway 連接埠，則會跳過它。
  預設 `false`。
- `controlUi.allowedOrigins`：Gateway WebSocket 連線的明確瀏覽器來源允許清單。當預期瀏覽器用戶端來自非 loopback 來源時為必要。
- `controlUi.chatMessageMaxWidth`：群組化 Control UI 聊天訊息的可選最大寬度。接受受限的 CSS 寬度值，例如 `960px`、 `82%`、 `min(1280px, 82%)` 和 `calc(100% - 2rem)`。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危險模式，可針對刻意依賴 Host 標頭來源原則的部署啟用 Host 標頭來源後援。
- `remote.transport`： `ssh` （預設）或 `direct` （ws/wss）。對於 `direct`， `remote.url` 必須是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：用戶端端程序環境
  緊急覆寫，允許對受信任的私密網路
  IP 進行純文字 `ws://`；純文字的預設值仍保持僅限 loopback。沒有 `openclaw.json`
  對等項目，且瀏覽器私密網路設定 （例如
  `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`） 不會影響 Gateway
  WebSocket 用戶端。
- `gateway.remote.token` / `.password` 是遠端用戶端認證欄位。它們本身不會設定 gateway 驗證。
- `gateway.push.apns.relay.baseUrl`：官方/TestFlight iOS 版本在將中繼支援的註冊發佈到 gateway 後，所使用的外部 APNs 中繼的基礎 HTTPS URL。此 URL 必須符合編譯至 iOS 版本中的中繼 URL。
- `gateway.push.apns.relay.timeoutMs`：gateway 到中繼的傳送逾時 （以毫秒為單位）。預設為 `10000`。
- 中繼支援的註冊會委派給特定的 gateway 身分。配對的 iOS 應用程式會取得 `gateway.identity.get`，在該中繼註冊中包含該身分，並將註冊範圍的傳送授權轉發給 gateway。另一個 gateway 無法重複使用該儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述中繼設定的暫時環境覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：僅限開發的 loopback HTTP 中繼 URL 緊急出口。正式中繼 URL 應保持使用 HTTPS。
- `gateway.handshakeTimeoutMs`：預先驗證 Gateway WebSocket 交握逾時 （以毫秒為單位）。預設值： `15000`。設定時 `OPENCLAW_HANDSHAKE_TIMEOUT_MS` 優先。在負載過高或低效能主機上，若本機用戶端可能在啟動預熱仍在進行時連線，請增加此值。
- `gateway.channelHealthCheckMinutes`：頻道健康監控間隔 （以分鐘為單位）。設定 `0` 以全域停用健康監控重新啟動。預設值： `5`。
- `gateway.channelStaleEventThresholdMinutes`：陳舊 socket 閾值 （以分鐘為單位）。請將此值保持大於或等於 `gateway.channelHealthCheckMinutes`。預設值： `30`。
- `gateway.channelMaxRestartsPerHour`：每個頻道/帳戶在滾動一小時內的最大健康監控重新啟動次數。預設值： `10`。
- `channels.<provider>.healthMonitor.enabled`：在保持全域監控啟用的同時，針對健康監控重新啟動的每個頻道選擇退出。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多重帳戶頻道的每個帳戶覆寫。設定時，它會優先於頻道層級的覆寫。
- 本機 gateway 呼叫路徑僅當 `gateway.auth.*` 未設定時，才能使用 `gateway.remote.*` 作為後援。
- 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但未解析，解析會以失敗關閉 （沒有遠端後援遮罩）。
- `trustedProxies`：終止 TLS 或注入轉送用戶端標頭的反向 proxy IP。僅列出您控制的 proxy。Loopback 項目對於同主機 proxy/本機偵測設定 （例如 Tailscale Serve 或本機反向 proxy） 仍然有效，但它們 **不** 會使 loopback 要求符合 `gateway.auth.mode: "trusted-proxy"` 的資格。
- `allowRealIpFallback`：當 `true` 時，如果缺少 `X-Forwarded-For`，gateway 會接受 `X-Real-IP`。預設 `false` 以實施失敗關閉行為。
- `gateway.nodes.pairing.autoApproveCidrs`：用於自動核准首次節點裝置配對且無要求範圍的可選 CIDR/IP 允許清單。未設定時會停用。這不會自動核准操作員/瀏覽器/Control UI/WebChat 配對，也不會自動核准角色、範圍、中繼資料或公開金鑰升級。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：在配對和平台允許清單評估之後，對已宣告節點指令的全域允許/拒絕塑形。使用 `allowCommands` 以選擇加入危險的節點指令，例如 `camera.snap`、 `camera.clip` 和 `screen.record`； `denyCommands` 會移除指令，即使平台預設或明確允許原本會包含它。節點變更其已宣告指令清單後，請拒絕並重新核准該裝置配對，以便 gateway 儲存更新的指令快照。
- `gateway.tools.deny`：針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱 （擴充預設拒絕清單）。
- `gateway.tools.allow`：從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- 聊天完成：預設為停用。請使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入加固：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空的白名單會被視為未設定；請使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 來停用 URL 擷取。
- 選用的回應加固標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` (僅針對您控制的 HTTPS 來源設定；請參閱 [受信任的 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### 多執行個體隔離

在單一主機上使用唯一的連接埠和狀態目錄執行多個閘道：

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json \
OPENCLAW_STATE_DIR=~/.openclaw-a \
openclaw gateway --port 19001
```

便利旗標：`--dev` (使用 `~/.openclaw-dev` + 連接埠 `19001`)、`--profile <name>` (使用 `~/.openclaw-<name>`)。

請參閱 [多個閘道](/zh-Hant/gateway/multiple-gateways)。

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

- `enabled`：在閘道監聽器啟用 TLS 終止 (HTTPS/WSS) (預設：`false`)。
- `autoGenerate`：當未設定明確的檔案時，會自動產生本機自我簽署的憑證/金鑰對；僅供本機/開發使用。
- `certPath`：TLS 憑證檔案的檔案系統路徑。
- `keyPath`：TLS 私鑰檔案的檔案系統路徑；請保持權限受到限制。
- `caPath`：用戶端驗證或自訂信任鏈的選用 CA 套件路徑。

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
  - `"hybrid"` (預設)：先嘗試熱重新載入；如果需要則回退到重新啟動。
- `debounceMs`：套用設定變更前的防震視窗 (單位為毫秒，非負整數)。
- `deferralTimeoutMs`：可選的等待進行中作業的最大時間（毫秒），之後將強制重新啟動或通道熱重載。若省略此項，則使用預設的有界等待（`300000`）；設定 `0` 可無限期等待並定期記錄仍待處理的警告。

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
查詢字串 hook 權杖會被拒絕。

驗證與安全注意事項：

- `hooks.enabled=true` 需要非空的 `hooks.token`。
- `hooks.token` 必須與 `gateway.auth.token` **不同**；重複使用 Gateway 權杖會被拒絕。
- `hooks.path` 不能是 `/`；請使用專用的子路徑，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果對應或預設集使用樣板化的 `sessionKey`，請設定 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。靜態對應鍵不需要該選項。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 僅當 `hooks.allowRequestSessionKey=true` 時，才接受來自請求承載的 `sessionKey`（預設值：`false`）。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析
  - 樣板渲染的對應 `sessionKey` 值被視為外部提供，且也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="對應細節">

- `match.path` 會比對 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 會比對通用路徑的 payload 欄位。
- 像是 `{{messages[0].subject}}` 這樣的樣板會從 payload 中讀取。
- `transform` 可以指向一個回傳 hook 動作的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，且必須位於 `hooks.transformsDir` 內（絕對路徑和路徑遍歷會被拒絕）。
  - 請將 `hooks.transformsDir` 保留在 `~/.openclaw/hooks/transforms` 下；工作區技能目錄會被拒絕。如果 `openclaw doctor` 回報此路徑無效，請將轉換模組移至 hooks transforms 目錄，或移除 `hooks.transformsDir`。
- `agentId` 會路由到特定的代理程式；未知的 ID 會回退為預設值。
- `allowedAgentIds`：限制明確路由（`*` 或省略 = 允許全部，`[]` = 拒絕全部）。
- `defaultSessionKey`：針對沒有明確 `sessionKey` 的 hook 代理程式執行，這是可選的固定 session 金鑰。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者和樣板驅動的對應 session 金鑰來設定 `sessionKey`（預設值：`false`）。
- `allowedSessionKeyPrefixes`：針對明確 `sessionKey` 值（請求 + 對應）的可選前綴允許清單，例如 `["hook:"]`。當任何對應或預設集使用樣板化的 `sessionKey` 時，這會變成必填項目。
- `deliver: true` 將最終回覆傳送至頻道；`channel` 預設為 `last`。
- `model` 會覆寫此 hook 執行的 LLM（如果設定了模型目錄，則必須被允許）。

</Accordion>

### Gmail 整合

- 內建的 Gmail 預設集使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留該每個訊息的路由，請設定 `hooks.allowRequestSessionKey: true` 並限制 `hooks.allowedSessionKeyPrefixes` 以符合 Gmail 命名空間，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，請使用靜態 `sessionKey` 覆蓋預設，而不是使用模板預設。

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
- 不要在 Gateway 旁邊單獨執行另一個 `gog gmail watch serve`。

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

- 透過 Gateway 連接埠下的 HTTP 提供代理程式可編輯的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 僅限本地：保持 `gateway.bind: "loopback"`（預設值）。
- 非回送綁定：canvas 路由需要 Gateway 驗證（token/password/trusted-proxy），與其他 Gateway HTTP 介面相同。
- Node WebViews 通常不會發送驗證標頭；在節點配對並連接後，Gateway 會公告節點範圍的功能 URL 以供 canvas/A2UI 存取。
- 功能 URL 綁定到作用中的節點 WS 工作階段，並會快速過期。不使用基於 IP 的後備機制。
- 將即時重新載入用戶端注入到提供的 HTML 中。
- 當為空時，自動建立初始 `index.html`。
- 同時在 `/__openclaw__/a2ui/` 提供 A2UI。
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

- `minimal`（當啟用內建的 `bonjour` 外掛程式時為預設）：從 TXT 記錄中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`；LAN 多播公告仍需啟用內建的 `bonjour` 外掛程式。
- `off`：在不變更外掛程式啟用狀態的情況下抑制 LAN 多播公告。
- 內建的 `bonjour` 外掛程式會在 macOS 主機上自動啟動，並在 Linux、Windows 和容器化 Gateway 部署上為選用。
- 當系統主機名稱是有效的 DNS 標籤時，主機名稱預設為系統主機名稱，否則回退至 `openclaw`。可以使用 `OPENCLAW_MDNS_HOSTNAME` 覆蓋。

### 廣域網 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下寫入單播 DNS-SD 區域。對於跨網路探索，請搭配 DNS 伺服器（建議使用 CoreDNS）+ Tailscale 分割 DNS。

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

- 僅在程序環境缺少該鍵時才套用內聯環境變數。
- `.env` 檔案：CWD `.env` + `~/.openclaw/.env` (兩者都不會覆蓋現有變數)。
- `shellEnv`：從您的登入 shell 設定檔匯入缺少的預期鍵。
- 有關完整的優先順序，請參閱 [環境](/zh-Hant/help/environment)。

### 環境變數替換

使用 `${VAR_NAME}` 在任何設定字串中引用環境變數：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`。
- 缺少/空白的變數會在載入設定時拋出錯誤。
- 使用 `$${VAR}` 跳脫以取得字面意義的 `${VAR}`。
- 適用於 `$include`。

---

## 密鑰

密鑰參照是累加的：純文字值仍然有效。

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
- `source: "exec"` id 不得包含 `.` 或 `..` 斜線分隔路徑區段 (例如 `a/../b` 會被拒絕)

### 支援的憑證介面

- 標準矩陣：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- `secrets apply` 目標支援的 `openclaw.json` 憑證路徑。
- `auth-profiles.json` 參照包含在執行時期解析和審計覆蓋範圍內。

### Secret providers 配置

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

- `file` provider 支援 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下，`id` 必須是 `"value"`）。
- 當無法使用 Windows ACL 驗證時，File 和 exec provider 路徑會以失敗關閉（fail closed）方式處理。僅針對無法驗證的信任路徑設定 `allowInsecurePath: true`。
- `exec` provider 需要絕對的 `command` 路徑，並在 stdin/stdout 上使用協議 payloads。
- 預設情況下，符號連結（symlink）指令路徑會被拒絕。設定 `allowSymlinkCommand: true` 以允許符號連結路徑，同時驗證解析後的目標路徑。
- 如果設定了 `trustedDirs`，信任目錄（trusted-dir）檢查會套用於解析後的目標路徑。
- `exec` 子進程環境預設為最小化；請使用 `passEnv` 明確傳遞所需的變數。
- Secret refs 會在啟用時解析為記憶體內部快照，然後請求路徑僅讀取該快照。
- 啟用介面過濾（Active-surface filtering）會在啟用期間套用：已啟用介面上未解析的 refs 將導致啟動/重新載入失敗，而未啟用的介面則會被跳過並輸出診斷資訊。

---

## Auth 儲存

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

- Per-agent profiles 儲存於 `<agentDir>/auth-profiles.json`。
- 對於靜態憑證模式，`auth-profiles.json` 支援值層級的 refs（`api_key` 為 `keyRef`，`token` 為 `tokenRef`）。
- 舊版的扁平 `auth-profiles.json` 映射（如 `{ "provider": { "apiKey": "..." } }`）並非執行時期格式；`openclaw doctor --fix` 會將其重寫為具備 `.legacy-flat.*.bak` 備份的標準 `provider:default` API-key profiles。
- OAuth 模式 profiles（`auth.profiles.<id>.mode = "oauth"`）不支援由 SecretRef 支援的 auth-profile 憑證。
- 靜態執行時期憑證來自記憶體內解析的快照；發現舊版靜態 `auth.json` 項目時會將其清除。
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

- `billingBackoffHours`：當設定檔因真正的計費/餘額不足錯誤而失敗時，以小時為單位的基本退避時間（預設值：`5`）。即使是在 `401`/`403` 回應上，明確的計費文字仍可能歸屬於此處，但提供者特定的文字比對器仍僅限於擁有它們的提供者（例如 OpenRouter `Key limit exceeded`）。可重試的 HTTP `402` 使用量視窗或組織/工作區支出上限訊息則保留在 `rate_limit` 路徑中。
- `billingBackoffHoursByProvider`：針對計費退避小時數的可選每個提供者覆寫值。
- `billingMaxHours`：計費退避指數增長的小時數上限（預設值：`24`）。
- `authPermanentBackoffMinutes`：高信心度 `auth_permanent` 失敗的基本退避時間，以分鐘為單位（預設值：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增長的分鐘數上限（預設值：`60`）。
- `failureWindowHours`：用於退避計數器的滾動視窗，以小時為單位（預設值：`24`）。
- `overloadedProfileRotations`：在切換到模型備援之前，針對過載錯誤的最大同提供者認證設定檔輪替次數（預設值：`1`）。諸如 `ModelNotReadyException` 等提供者忙碌形態歸屬於此處。
- `overloadedBackoffMs`：在重試過載的提供者/設定檔輪替之前的固定延遲（預設值：`0`）。
- `rateLimitedProfileRotations`：在切換到模型備援之前，針對速率限制錯誤，相同提供者身份設定檔的最大輪換次數（預設值：`1`）。該速率限制儲存區包含提供者格式的文字，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

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
- `maxFileBytes`：輪換前的活動日誌檔案大小上限（以位元組為單位的正整數；預設值：`104857600` = 100 MB）。OpenClaw 會在活動檔案旁保留最多五個編號的存檔。
- `redactSensitive` / `redactPatterns`：針對主控台輸出、檔案日誌、OTLP 日誌記錄和持續化的工作階段文字記錄所進行的盡力遮罩。`redactSensitive: "off"` 僅會停用此一般日誌/記錄原則；UI/工具/診斷安全介面在發出資訊前仍會對機密進行編修。

---

## 診斷

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,
    stuckSessionAbortMs: 600000,

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

- `enabled`：檢測輸出總開關（預設值：`true`）。
- `flags`：啟用目標日誌輸出的旗標字串陣列（支援萬用字元，例如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：將長時間執行的處理工作階段分類為 `session.long_running`、`session.stalled` 或 `session.stuck` 的無進度時間閾值（毫秒）。回覆、工具、狀態、區塊和 ACP 進度會重置計時器；若 `session.stuck` 診斷結果重複且未變更，則會進行退避。
- `stuckSessionAbortMs`：在可能對符合條件的停滯活動工作進行中止排空以進行復原之前的無進度時間閾值（毫秒）。若未設定，OpenClaw 會使用較安全的擴充嵌入式執行視窗，至少為 10 分鐘且為 `stuckSessionWarnMs` 的 5 倍。
- `otel.enabled`：啟用 OpenTelemetry 匯出管線（預設值：`false`）。如需完整的設定、訊號目錄和隱私模型，請參閱 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。
- `otel.endpoint`：OTel 匯出器的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：可選的訊號專屬 OTLP 端點。設定後，將僅覆蓋該訊號的 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（預設值）或 `"grpc"`。
- `otel.headers`：隨 OTel 匯出請求發送的額外 HTTP/gRPC 元資料標頭。
- `otel.serviceName`：資源屬性的服務名稱。
- `otel.traces` / `otel.metrics` / `otel.logs`：啟用追蹤、指標或日誌匯出。
- `otel.sampleRate`：追蹤採樣率 `0`-`1`。
- `otel.flushIntervalMs`：定期遙測清除間隔（毫秒）。
- `otel.captureContent`：選擇啟用 OTEL span 屬性的原始內容擷取。預設為關閉。布林值 `true` 會擷取非系統訊息/工具內容；物件形式可讓您明確啟用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs` 和 `systemPrompt`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：最新實驗性 GenAI span 提供者屬性的環境切換開關。預設情況下，span 會保留傳統的 `gen_ai.system` 屬性以維持相容性；GenAI 指標使用有界語意屬性。
- `OPENCLAW_OTEL_PRELOADED=1`：已註冊全域 OpenTelemetry SDK 的主機之環境切換開關。此時 OpenClaw 會跳過外掛擁有的 SDK 啟動/關閉，同時保持診斷監聽器為啟用狀態。
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

- `channel`：npm/git 安裝的發布通道 - `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：閘道啟動時檢查 npm 更新（預設值：`true`）。
- `auto.enabled`：啟用套件安裝的背景自動更新（預設值：`false`）。
- `auto.stableDelayHours`：穩定通道自動套用前的最小延遲小時數（預設值：`6`；最大值：`168`）。
- `auto.stableJitterHours`：額外的穩定通道推出分散視窗（小時）（預設值：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：Beta 通道檢查的執行頻率（小時）（預設值：`1`；最大值：`24`）。

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
- `dispatch.enabled`：ACP 會話回合分派的獨立開關（預設值：`true`）。設定為 `false` 可在阻止執行的同時保留 ACP 指令的可用性。
- `backend`：預設的 ACP 執行時後端 ID（必須符合已註冊的 ACP 執行時外掛）。
  請先安裝後端外掛，如果設定了 `plugins.allow`，則需包含後端外掛 ID（例如 `acpx`），否則 ACP 後端將無法載入。
- `defaultAgent`：當產生的實體未指定明確目標時，使用的備援 ACP 目標代理程式 ID。
- `allowedAgents`：允許用於 ACP 執行時階段的代理程式 ID 白名單；空白表示無額外限制。
- `maxConcurrentSessions`：最大同時啟用的 ACP 階段數量。
- `stream.coalesceIdleMs`：串流文字的閒置排達視窗（毫秒）。
- `stream.maxChunkChars`：分割串流區塊投影前的最大區塊大小。
- `stream.repeatSuppression`：抑制每回合重複的狀態/工具行（預設值：`true`）。
- `stream.deliveryMode`：`"live"` 漸進式串流；`"final_only"` 緩衝直到回合終端事件。
- `stream.hiddenBoundarySeparator`：隱藏工具事件之後，可見文字之前的分隔符號（預設值：`"paragraph"`）。
- `stream.maxOutputChars`：每個 ACP 回合所投影的最大助理輸出字元數。
- `stream.maxSessionUpdateChars`：投影的 ACP 狀態/更新行的最大字元數。
- `stream.tagVisibility`：標籤名稱對應至布林值可見性覆寫的記錄，用於串流事件。
- `runtime.ttlMinutes`：ACP 階段工作者的閒置 TTL（分鐘），之後將符合清理資格。
- `runtime.installCommand`：初始化 ACP 執行時環境時執行的可選安裝指令。

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
  - `"random"`（預設值）：輪換的有趣/季節性標語。
  - `"default"`：固定的中性標語（`All your chats, one OpenClaw.`）。
  - `"off"`：無標語文字（仍顯示橫幅標題/版本）。
- 若要隱藏整個橫幅（不僅是標語），請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

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

請參閱 [Agent defaults](/zh-Hant/gateway/config-agents#agent-defaults) 下的 `agents.list` 身分識別欄位。

---

## 橋接器（舊版，已移除）

目前的版本不再包含 TCP 橋接器。節點透過 Gateway WebSocket 連線。`bridge.*` 金鑰已不再屬於設定結構描述的一部分（必須移除否則驗證會失敗；`openclaw doctor --fix` 可用來移除未知金鑰）。

<Accordion title="舊版橋接器設定（歷史參考）">

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

- `sessionRetention`：從 `sessions.json` 修剪前保留已完成的獨立 cron 執行工作階段的時間長短。同時也控制已刪除 cron 逐字稿封存的清理作業。預設值：`24h`；設為 `false` 以停用。
- `runLog.maxBytes`：每次執行日誌檔案（`cron/runs/<jobId>.jsonl`）在修剪前的最大大小。預設值：`2_000_000` 位元組。
- `runLog.keepLines`：觸發執行日誌修剪時保留的最新行數。預設值：`2000`。
- `webhookToken`：用於 cron webhook POST 傳遞（`delivery.mode = "webhook"`）的持有人權杖，如果省略則不傳送驗證標頭。
- `webhook`：已淘汰的舊版後備 webhook URL (http/https)，僅用於仍有 `notify: true` 的已儲存工作。

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
- `backoffMs`：每次重試嘗試的退避延遲陣列（以毫秒為單位）（預設值：`[30000, 60000, 300000]`；1-10 個項目）。
- `retryOn`：觸發重試的錯誤類型 - `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略此項以重試所有暫時性類型。

僅適用於一次性 cron 工作。週期性工作使用獨立的失敗處理機制。

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

- `enabled`：啟用 cron 工作的失敗警示（預設：`false`）。
- `after`：觸發警示前的連續失敗次數（正整數，最小值：`1`）。
- `cooldownMs`：同一工作重複警示之間的最小毫秒數（非負整數）。
- `includeSkipped`：將連續跳過的執行次數計入警示臨界值（預設：`false`）。跳過的執行會單獨追蹤，不會影響執行錯誤的退避。
- `mode`：傳送模式 - `"announce"` 透過頻道訊息傳送；`"webhook"` 發佈至設定的 webhook。
- `accountId`：用來限定警示傳送範圍的選用帳戶或頻道 ID。

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

- 所有工作中 cron 失敗通知的預設目的地。
- `mode`：`"announce"` 或 `"webhook"`；當存在足夠的目標資料時，預設為 `"announce"`。
- `channel`：公告傳送的頻道覆寫。`"last"` 會重複使用最後已知的傳送頻道。
- `to`：明確的公告目標或 webhook URL。在 webhook 模式下為必填。
- `accountId`：用於傳送的選用帳戶覆寫。
- 個別工作的 `delivery.failureDestination` 會覆寫此全域預設值。
- 當未設定全域或個別工作的失敗目的地時，已透過 `announce` 傳送的工作會在失敗時退回至該主要公告目標。
- 除非作業的主要 `delivery.mode` 是 `"webhook"`，否則 `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 作業。

參閱 [Cron Jobs](/zh-Hant/automation/cron-jobs)。隔離的 cron 執行會被追蹤為 [background tasks](/zh-Hant/automation/tasks)。

---

## 媒體模型模板變數

在 `tools.media.models[].args` 中展開的模板佔位符：

| 變數               | 描述                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的傳入訊息主體                           |
| `{{RawBody}}`      | 原始主體（無歷史記錄/傳送者包裝器）          |
| `{{BodyStripped}}` | 移除群組提及後的主體                         |
| `{{From}}`         | 傳送者識別碼                                 |
| `{{To}}`           | 目的地識別碼                                 |
| `{{MessageSid}}`   | 頻道訊息 ID                                  |
| `{{SessionId}}`    | 目前工作階段 UUID                            |
| `{{IsNewSession}}` | 建立新工作階段時的 `"true"`                  |
| `{{MediaUrl}}`     | 傳入媒體虛擬 URL                             |
| `{{MediaPath}}`    | 本機媒體路徑                                 |
| `{{MediaType}}`    | 媒體類型（影像/音訊/文件/…）                 |
| `{{Transcript}}`   | 音訊逐字稿                                   |
| `{{Prompt}}`       | CLI 項目的已解析媒體提示                     |
| `{{MaxChars}}`     | CLI 項目的已解析最大輸出字元數               |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群組主旨（盡力而為）                         |
| `{{GroupMembers}}` | 群組成員預覽（盡力而為）                     |
| `{{SenderName}}`   | 傳送者顯示名稱（盡力而為）                   |
| `{{SenderE164}}`   | 傳送者電話號碼（盡力而為）                   |
| `{{Provider}}`     | 提供者提示（whatsapp、telegram、discord 等） |

---

## 設定組包含 (`$include`)

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
- 檔案陣列：依序深度合併（後者覆蓋前者）。
- 同層級金鑰：在包含之後合併（覆蓋包含的值）。
- 巢狀包含：最多深達 10 層。
- 路徑：相對於包含該檔案的路徑解析，但必須保持在頂層設定目錄（`dirname` 的 `openclaw.json`）內。僅當解析結果仍在該邊界內時，才允許使用絕對路徑/`../` 形式。
- OpenClaw 擁有的寫入操作，如果僅更改由單一檔案包含支援的一個頂層區段，則會直接寫入該被包含的檔案。例如，`plugins install` 會更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，並保持 `openclaw.json` 不變。
- 對於 OpenClaw 擁有的寫入操作，根層級包含、包含陣列以及具有同層級覆寫的包含均為唯讀；這些寫入操作將失敗（封閉式），而不是扁平化設定。
- 錯誤：針對檔案遺失、解析錯誤和循環包含提供明確的訊息。

---

_相關：[Configuration](/zh-Hant/gateway/configuration) · [Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [Configuration](/zh-Hant/gateway/configuration)
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
