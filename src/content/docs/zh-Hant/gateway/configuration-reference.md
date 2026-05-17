---
summary: "核心 OpenClaw 金鑰、預設值及專用子系統參考連結的 Gateway 設定參考"
title: "設定參考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

`~/.openclaw/openclaw.json` 的核心配置參考。如需面向任務的概述，請參閱 [配置](/zh-Hant/gateway/configuration)。

涵蓋主要的 OpenClaw 設定層面，並在子系統擁有自身更深入的參考資料時提供連結。通道 和外掛 擁有的指令目錄以及深度記憶體/QMD 調整選項位於各自的頁面上，而非此頁。

程式碼基準：

- `openclaw config schema` 會列印用於驗證和控制 UI 的即時 JSON Schema，並在可用時合併套件/外掛/通道的中繼資料
- `config.schema.lookup` 會傳回一個用於深入檢視工具的路徑範圍 Schema 節點
- `pnpm config:docs:check` / `pnpm config:docs:gen` 會針對目前的 Schema 表面驗證設定文件基準雜湊

Agent 查找路徑：在編輯之前，使用 `gateway` 工具動作 `config.schema.lookup` 查看精確的欄位級文件和約束。請使用 [配置](/zh-Hant/gateway/configuration) 獲取面向任務的指導，並使用本頁面了解更廣泛的欄位映射、預設值以及子系統參考的連結。

專屬深度參考資料：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 以及 `plugins.entries.memory-core.config.dreaming` 下的夢境配置的 [記憶體配置參考](/zh-Hant/reference/memory-config)
- 目前內建 + 捆綁命令目錄的 [斜線命令](/zh-Hant/tools/slash-commands)
- 擁有者通道/外掛頁面，用於通道特定的指令介面

設定格式為 **JSON5**（允許註解和結尾逗號）。所有欄位皆為選用 - 若省略，OpenClaw 會使用安全的預設值。

---

## 通道

各通道配置金鑰已移至專用頁面 - 請參閱 [配置 - 通道](/zh-Hant/gateway/config-channels) 以了解 `channels.*`，包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 和其他捆綁通道（驗證、存取控制、多帳戶、提及閘道）。

## Agent 預設值、多重 Agent、工作階段與訊息

已移至專用頁面 - 請參閱 [配置 - 代理程式](/zh-Hant/gateway/config-agents) 以了解：

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

工具政策、實驗性切換、提供者支援的工具配置，以及自訂提供者/基礎 URL 設定已移至專用頁面 - 請參閱 [配置 - 工具和自訂提供者](/zh-Hant/gateway/config-tools)。

## 模型

提供者定義、模型允許清單和自訂提供者設定位於 [配置 - 工具和自訂提供者](/zh-Hant/gateway/config-tools#custom-providers-and-base-urls) 中。`models` 根節點也擁有全域模型目錄行為。

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
- `models.providers.*.localService`：用於本地模型伺服器的可選按需程序管理器。OpenClaw 會探測配置的健康檢查端點，在需要時啟動絕對路徑 `command`，等待就緒，然後發送模型請求。請參閱 [本地模型服務](/zh-Hant/gateway/local-model-services)。
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
      },
    },
  },
}
```

- `mcp.servers`：針對公開配置 MCP 工具之執行環境的具名 stdio 或遠端 MCP 伺服器定義。
  遠端條目使用 `transport: "streamable-http"` 或 `transport: "sse"`；
  `type: "http"` 是一個 CLI 原生別名，由 `openclaw mcp set` 和
  `openclaw doctor --fix` 正規化為標準的 `transport` 欄位。
- `mcp.sessionIdleTtlMs`：會話範圍內的捆綁 MCP 執行環境的閒置 TTL。
  一次性嵌入式執行會請求執行結束時的清理；此 TTL 是
  長效會話和未來呼叫者的最後防線。
- `mcp.*` 下的變更會透過捨棄快取的會話 MCP 執行環境進行熱套用。
  下一次工具探索/使用會根據新配置重新建立它們，因此被移除的
  `mcp.servers` 條目會立即被清理，而不是等待閒置 TTL。

請參閱 [MCP](/zh-Hant/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI 後端](/zh-Hant/gateway/cli-backends#bundle-mcp-overlays) 以了解執行環境行為。

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

- `allowBundled`：僅適用於捆綁技能的可選允許清單（受管理/工作區技能不受影響）。
- `load.extraDirs`：額外的共用技能根目錄（優先順序最低）。
- `load.allowSymlinkTargets`：當連結位於其配置的來源根目錄之外時，技能符號連結可以解析到的受信任真實目標根目錄。
- `install.preferBrew`：當為 true 時，如果 `brew` 可用，則優先使用 Homebrew 安裝程式，
  然後再回退到其他類型的安裝程式。
- `install.nodeManager`: 節點安裝程式對 `metadata.openclaw.install`
  規格的偏好設定 (`npm` | `pnpm` | `yarn` | `bun`)。
- `install.allowUploadedArchives`: 允許受信任的 `operator.admin` Gateway
  用戶端安裝透過 `skills.upload.*` 暫存的私有 zip 封存
  (預設：false)。這僅啟用上傳封存路徑；一般的 ClawHub
  安裝不需要此設定。
- `entries.<skillKey>.enabled: false` 會停用技能，即使該技能已隨附/安裝。
- `entries.<skillKey>.apiKey`: 宣告主要環境變數的技能之便利設定 (純文字字串或 SecretRef 物件)。

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
- 探索功能接受原生 OpenClaw 外掛程式，以及相容的 Codex 套件和 Claude 套件，包括無資訊清單的 Claude 預設佈局套件。
- **變更組態需要重新啟動 gateway。**
- `allow`: 可選的允許清單 (僅載入列出的外掛程式)。 `deny` 優先。
- `bundledDiscovery`: 對於新組態預設為 `"allowlist"`，因此非空的
  `plugins.allow` 也會控管隨附的提供者外掛程式，包括網路搜尋
  執行時期提供者。 Doctor 會為已遷移的舊版允許清單
  組態寫入 `"compat"`，以保留現有的隨附提供者行為，直到您選擇加入。
- `plugins.entries.<id>.apiKey`: 外掛程式層級的 API 金鑰便利欄位 (當外掛程式支援時)。
- `plugins.entries.<id>.env`: 外掛程式範圍的環境變數對應。
- `plugins.entries.<id>.hooks.allowPromptInjection`: 當 `false` 時，核心會阻擋 `before_prompt_build` 並忽略來自舊版 `before_agent_start` 的提示變異欄位，同時保留舊版 `modelOverride` 和 `providerOverride`。適用於原生外掛程式掛勾和支援的套件提供掛勾目錄。
- `plugins.entries.<id>.hooks.allowConversationAccess`：當 `true` 時，受信任的非捆綁外掛程式可以從類型化掛鉤讀取原始對話內容，例如 `llm_input`、`llm_output`、`before_model_resolve`、`before_agent_reply`、`before_agent_run`、`before_agent_finalize` 和 `agent_end`。
- `plugins.entries.<id>.subagent.allowModelOverride`：明確信任此外掛程式針對背景子代理執行請求每次執行的 `provider` 和 `model` 覆寫。
- `plugins.entries.<id>.subagent.allowedModels`：受信任子代理覆寫的標準 `provider/model` 目標的選用允許清單。僅當您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.llm.allowModelOverride`：明確信任此外掛程式針對 `api.runtime.llm.complete` 請求模型覆寫。
- `plugins.entries.<id>.llm.allowedModels`：受信任外掛程式 LLM 完成覆寫的標準 `provider/model` 目標的選用允許清單。僅當您有意允許任何模型時才使用 `"*"`。
- `plugins.entries.<id>.llm.allowAgentIdOverride`：明確信任此外掛程式針對非預設代理 ID 執行 `api.runtime.llm.complete`。
- `plugins.entries.<id>.config`：外掛程式定義的設定物件（在可用時由原生 OpenClaw 外掛程式架構驗證）。
- 通道外掛程式帳戶/執行時設定位於 `channels.<id>` 之下，並且應由擁有該外掛程式的清單 `channelConfigs` 元資料來描述，而不是由中央 OpenClaw 選項註冊表描述。

### Codex harness 外掛程式設定

內建的 `codex` 外掛程式擁有
`plugins.entries.codex.config` 之下的原生 Codex 應用程式伺服器 harness 設定。請參閱
[Codex harness 參考](/zh-Hant/plugins/codex-harness-reference) 以了解完整的設定
表面，以及 [Codex harness](/zh-Hant/plugins/codex-harness) 以了解執行時模型。

`codexPlugins` 僅適用於選擇原生 Codex harness 的階段。
它不會為 Pi、一般的 OpenAI 提供者執行、ACP
對話綁定或任何非 Codex harness 啟用 Codex 外掛。

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

- `plugins.entries.codex.config.codexPlugins.enabled`：啟用 Codex harness 的原生 Codex
  外掛/應用程式支援。預設值：`false`。
- `plugins.entries.codex.config.codexPlugins.allow_destructive_actions`：
  已遷移外掛應用程式引發的預設破壞性動作原則。
  預設值：`true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.enabled`：當全域 `codexPlugins.enabled`
  也為 true 時，啟用已遷移的外掛項目。
  對於明確項目，預設值為 `true`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.marketplaceName`：
  穩定的市集身分識別。V1 僅支援 `"openai-curated"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.pluginName`：來自遷移的
  穩定 Codex 外掛身分識別，例如 `"google-calendar"`。
- `plugins.entries.codex.config.codexPlugins.plugins.<key>.allow_destructive_actions`：
  各外掛的破壞性動作覆寫。若省略，則使用全域
  `allow_destructive_actions` 值。

`codexPlugins.enabled` 是全域啟用指令。由遷移寫入的明確外掛
項目是永久安裝和修復資格集。
不支援 `plugins["*"]`，沒有 `install` 開關，且本機
`marketplacePath` 值故意不設為設定欄位，因為它們
特定於主機。

`app/list` 就緒檢查會快取一小時，並在過期時
以非同步方式重新整理。Codex 執緒應用程式設定是在 Codex harness
階段建立時計算，而非每次輪替；在變更原生外掛設定後，請使用 `/new`、`/reset` 或重新啟動
閘道。

- `plugins.entries.firecrawl.config.webFetch`：Firecrawl web-fetch 提供者設定。
  - `apiKey`：Firecrawl API 金鑰（接受 SecretRef）。會退回至 `plugins.entries.firecrawl.config.webSearch.apiKey`、舊版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 環境變數。
  - `baseUrl`：Firecrawl API 基礎 URL（預設：`https://api.firecrawl.dev`；自託管的覆寫必須指向私有/內部端點）。
  - `onlyMainContent`：僅從頁面擷取主要內容（預設：`true`）。
  - `maxAgeMs`：最大快取壽命（以毫秒為單位）（預設：`172800000` / 2 天）。
  - `timeoutSeconds`：抓取請求逾時時間（以秒為單位）（預設：`60`）。
- `plugins.entries.xai.config.xSearch`：xAI X Search (Grok 網路搜尋) 設定。
  - `enabled`：啟用 X Search 提供者。
  - `model`：用於搜尋的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`：記憶夢境設定。請參閱 [Dreaming](/zh-Hant/concepts/dreaming) 以了解階段與閾值。
  - `enabled`：夢境主開關（預設為 `false`）。
  - `frequency`：每次完整夢境掃描的 cron 頻率（預設為 `"0 3 * * *"`）。
  - `model`：可選的 Dream Diary 子代理模型覆寫。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；搭配 `allowedModels` 以限制目標。模型不可用錯誤會使用工作階段預設模型重試一次；信任或允許清單失敗不會無聲地回退。
  - 階段原則與閾值是實作細節（非使用者面向的設定金鑰）。
- 完整的記憶配置位於 [Memory configuration reference](/zh-Hant/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已啟用的 Claude bundle 插件也可以從 `settings.json` 提供內嵌的 Pi 預設值；OpenClaw 會將這些應用為經過清理的代理設定，而非原始的 OpenClaw 配置修補。
- `plugins.slots.memory`：選取現用的記憶插件 id，或使用 `"none"` 來停用記憶插件。
- `plugins.slots.contextEngine`：選取活躍的內容引擎外掛程式 ID；除非您安裝並選擇了其他引擎，否則預設為 `"legacy"`。

參閱 [外掛程式](/zh-Hant/tools/plugin)。

---

## 承諾

`commitments` 控制推斷的後續記憶：OpenClaw 可以從對話輪次中偵測報到，並透過心跳執行來傳送它們。

- `commitments.enabled`：啟用推斷後續承諾的隱藏 LLM 擷取、儲存和心跳傳送。預設值：`false`。
- `commitments.maxPerDay`：每個代理程式工作階段在滾動一天內傳送的最大推斷後續承諾數。預設值：`3`。

參閱 [推斷的承諾](/zh-Hant/concepts/commitments)。

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
- `tabCleanup` 會在閒置時間或工作階段超過上限時回收已追蹤的主要代理程式分頁。設定 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 以停用這些個別的清理模式。
- 未設定時會停用 `ssrfPolicy.dangerouslyAllowPrivateNetwork`，因此瀏覽器導航預設保持嚴格模式。
- 僅當您有意信任私人網路瀏覽器導航時，才設定 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在嚴格模式下，遠端 CDP 設定檔端點 (`profiles.*.cdpUrl`) 在連線能力/探索檢查期間會受到相同的私人網路封鎖限制。
- `ssrfPolicy.allowPrivateNetwork` 仍作為舊版別名受到支援。
- 在嚴格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 進行明確的例外處理。
- 遠端設定檔僅支援附加 (停用啟動/停止/重設)。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  當您希望 OpenClaw 探索 `/json/version` 時，請使用 HTTP(S)；當您的提供者提供直接的 DevTools WebSocket URL 時，請使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 適用於遠端和
  `attachOnly` CDP 連線性以及分頁開啟請求。受管理的 loopback
  設定檔會保留本機 CDP 預設值。
- 如果外部管理的 CDP 服務可透過 loopback 到達，請設定該
  設定檔的 `attachOnly: true`；否則 OpenClaw 會將 loopback 連接埠視為
  本機受管理的瀏覽器設定檔，並可能回報本機連接埠擁有權錯誤。
- `existing-session` 設定檔使用 Chrome MCP 而非 CDP，且可以在
  選定的主機上或透過已連線的瀏覽器節點進行附加。
- `existing-session` 設定檔可以設定 `userDataDir` 來指定特定的
  瀏覽器設定檔，例如 Brave 或 Edge。
- `existing-session` 設定檔會保留目前的 Chrome MCP 路由限制：
  使用快照/ref 驅動的動作而非 CSS 選擇器目標、單一檔案上傳
  掛鉤、無對話方塊逾時覆寫、無 `wait --load networkidle`，以及無
  `responsebody`、PDF 匯出、下載攔截或批次動作。
- 本機受管理的 `openclaw` 設定檔會自動指派 `cdpPort` 和 `cdpUrl`；僅
  針對遠端 CDP 明確設定 `cdpUrl`。
- 本機受管理的設定檔可以設定 `executablePath` 來覆寫該設定檔的全域
  `browser.executablePath`。使用此功能可在 Chrome 中執行一個設定檔，並在 Brave 中執行另一個。
- 本機受管理的設定檔在程序啟動後使用 `browser.localLaunchTimeoutMs` 進行 Chrome CDP HTTP
  探索，並使用 `browser.localCdpReadyTimeoutMs` 進行
  啟動後的 CDP websocket 就緒檢查。在較慢的主機上，如果 Chrome
  成功啟動但就緒檢查與啟動程序競爭，請調高這些值。兩個值都必須是
  不超過 `120000` 毫秒的正整數；無效的設定值將被拒絕。
- 自動偵測順序：如果是基於 Chromium 則為預設瀏覽器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 都接受 `~` 和 `~/...` 來代表您的 OS 主目錄，適用於 Chromium 啟動之前。`existing-session` 設定檔上個別設定檔的 `userDataDir` 也會進行波紋擴展（tilde-expanded）。
- 控制服務：僅限回環（port 派生自 `gateway.port`，預設為 `18791`）。
- `extraArgs` 會將額外的啟動標誌附加到本機 Chromium 啟動程序中（例如 `--disable-gpu`、視窗大小調整或偵錯標誌）。

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

- `seamColor`：原生應用程式 UI 鉻色的強調色（對話模式氣泡色彩等）。
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

<Accordion title="Gateway field details">

- `mode`: `local` (執行 gateway) 或 `remote` (連線到遠端 gateway)。除非是 `local`，否則 Gateway 會拒絕啟動。
- `port`: WS + HTTP 的單一多工連接埠。優先順序：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`: `auto`、`loopback` (預設)、`lan` (`0.0.0.0`)、`tailnet` (僅限 Tailscale IP) 或 `custom`。
- **Legacy bind aliases**：在 `gateway.bind` 中使用綁定模式值 (`auto`、`loopback`、`lan`、`tailnet`、`custom`)，而非主機別名 (`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`)。
- **Docker note**：預設的 `loopback` 綁定會接聽容器內的 `127.0.0.1`。使用 Docker 橋接網路 (`-p 18789:18789`) 時，流量會抵達 `eth0`，因此無法連上 gateway。請使用 `--network host`，或設定 `bind: "lan"` (或 `bind: "custom"` 搭配 `customBindHost: "0.0.0.0"`) 以接聽所有介面。
- **Auth**：預設為必填。非回送綁定需要 gateway 認證。實務上這意味著共享 token/密碼或具備 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向代理。入門精靈預設會產生 token。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` (包括 SecretRefs)，請將 `gateway.auth.mode` 明確設定為 `token` 或 `password`。若同時設定兩者卻未設定模式，啟動和服務安裝/修復流程將會失敗。
- `gateway.auth.mode: "none"`：明確的無認證模式。僅限用於受信任的本機回送設定；出於設計考量，入門提示不會提供此選項。
- `gateway.auth.mode: "trusted-proxy"`：將瀏覽器/使用者認證委派給具身分感知的反向代理，並信任來自 `gateway.trustedProxies` 的身分標頭 (請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth))。此模式預設期望**非回送** 的代理來源；同主機回送反向代理需要明確設定 `gateway.auth.trustedProxy.allowLoopback = true`。內部同主機呼叫者可以使用 `gateway.auth.password` 作為本機直接後備；`gateway.auth.token` 與 trusted-proxy 模式仍互斥。
- `gateway.auth.allowTailscale`：當 `true` 時，Tailscale Serve 身分標頭可以滿足 Control UI/WebSocket 認證 (透過 `tailscale whois` 驗證)。HTTP API 端點**不會**使用該 Tailscale 標頭認證；而是遵循 gateway 的正常 HTTP 認證模式。此無 token 流程假設 gateway 主機受信任。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`：選用的認證失敗限制器。針對每個用戶端 IP 和每個認證範圍 (shared-secret 和 device-token 會獨立追蹤) 套用。被封鎖的嘗試會傳回 `429` + `Retry-After`。
  - 在非同步 Tailscale Serve Control UI 路徑上，相同 `{scope, clientIp}` 的失敗嘗試會在寫入失敗之前序列化。因此，來自同一用戶端的並發錯誤嘗試可能在第二個請求時就觸發限制器，而不是兩者都單純作為不匹配通過。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；當您刻意希望也對本機流量進行速率限制時 (例如測試設定或嚴格的 Proxy 部署)，請設定 `false`。
- 來自瀏覽器來源的 WS 認證嘗試總是會受到節流，並停用回送豁免 (針對瀏覽器本機暴力破解的縱深防禦)。
- 在回送上，這些瀏覽器來源鎖定會依標準化的 `Origin`
  值隔離，因此來自一個 localhost 來源的重複失敗不會自動
  鎖定不同的來源。
- `tailscale.mode`: `serve` (僅限 tailnet，回送綁定) 或 `funnel` (公開，需要認證)。
- `tailscale.preserveFunnel`: 當 `true` 且 `tailscale.mode = "serve"` 時，OpenClaw
  會在啟動時重新套用 Serve 之前檢查 `tailscale funnel status`，如果外部設定的 Funnel 路由已經涵蓋
  gateway 連接埠，則會跳過它。
  預設值為 `false`。
- `controlUi.allowedOrigins`: Gateway WebSocket 連線的明確瀏覽器來源允許清單。當預期來自非回送來源的瀏覽器用戶端時，這是必填項目。
- `controlUi.chatMessageMaxWidth`: 群組化 Control UI 聊天訊息的選用最大寬度。接受受限的 CSS 寬度值，例如 `960px`、`82%`、`min(1280px, 82%)` 和 `calc(100% - 2rem)`。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`: 危險模式，為刻意仰賴 Host 標頭來源原則的部署啟用 Host 標頭來源後援。
- `remote.transport`: `ssh` (預設) 或 `direct` (ws/wss)。對於 `direct`，`remote.url` 必須是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`: 用戶端程序環境
  緊急覆寫，允許對受信任的私人網路
  IP 使用明文 `ws://`；明文的預設值仍僅限回送。沒有 `openclaw.json`
  的對等功能，而瀏覽器私人網路設定 (例如
  `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`) 不會影響 Gateway
  WebSocket 用戶端。
- `gateway.remote.token` / `.password` 是遠端用戶端認證欄位。它們本身不會設定 gateway 認證。
- `gateway.push.apns.relay.baseUrl`: 官方/TestFlight iOS 版本在將中繼支援的註冊發佈到 gateway 之後，所使用之外部 APNs 中繼的基底 HTTPS URL。此 URL 必須符合編譯至 iOS 版本中的中繼 URL。
- `gateway.push.apns.relay.timeoutMs`: gateway 到中繼的發送逾時 (毫秒)。預設值為 `10000`。
- 中繼支援的註冊會委派給特定的 gateway 身分。配對的 iOS 應用程式會取得 `gateway.identity.get`，在該中繼註冊中包含該身分，並將註冊範圍的發送授權轉送到 gateway。另一個 gateway 無法重用該儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`: 上述中繼設定的暫時環境覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`: 僅供開發使用的回送 HTTP 中繼 URL 緊急後門。正式中繼 URL 應維持使用 HTTPS。
- `gateway.handshakeTimeoutMs`: 前認證 Gateway WebSocket 交握逾時 (毫秒)。預設值：`15000`。若已設定，`OPENCLAW_HANDSHAKE_TIMEOUT_MS` 優先採用。在負載過重或低效能的主機上，本機用戶端可以在啟動暖機仍在進行時連線，請增加此值。
- `gateway.channelHealthCheckMinutes`: 頻道健康監控間隔 (分鐘)。設定 `0` 以全域停用健康監控重新啟動。預設值：`5`。
- `gateway.channelStaleEventThresholdMinutes`: 停滯 socket 閾值 (分鐘)。請保持此值大於或等於 `gateway.channelHealthCheckMinutes`。預設值：`30`。
- `gateway.channelMaxRestartsPerHour`: 每個頻道/帳戶在滾動一小時內的健康監控重新啟動次數上限。預設值：`10`。
- `channels.<provider>.healthMonitor.enabled`: 每個頻道的健康監控重新啟動選擇退出，同時保持全域監控啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`: 多帳戶頻道的每個帳戶覆寫。設定時，會優先於頻道層級的覆寫。
- 本機 gateway 呼叫路徑只能在 `gateway.auth.*` 未設定時將 `gateway.remote.*` 作為後備。
- 如果 `gateway.auth.token` / `gateway.auth.password` 是透過 SecretRef 明確設定但無法解析，解析將會失敗封閉 (不會有遠端後援遮蔽)。
- `trustedProxies`: 終止 TLS 或注入轉送用戶端標頭的反向 Proxy IP。僅列出您控制的 Proxy。回送項目對於同主機 Proxy/本機偵測設定 (例如 Tailscale Serve 或本機反向 Proxy) 仍然有效，但這些項目**不會**讓回送請求有資格使用 `gateway.auth.mode: "trusted-proxy"`。
- `allowRealIpFallback`: 當 `true` 時，如果缺少 `X-Forwarded-For`，gateway 會接受 `X-Real-IP`。預設值為 `false` 以實施失敗封閉行為。
- `gateway.nodes.pairing.autoApproveCidrs`: 用於自動核准首次節點裝置配對且無請求範圍的選用 CIDR/IP 允許清單。未設定時停用。這不會自動核准操作員/瀏覽器/Control UI/WebChat 配對，也不會自動核准角色、範圍、中繼資料或公開金鑰升級。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`: 在配對和平台允許清單評估後，宣告節點指令的全域允許/拒絕成形。使用 `allowCommands` 以選用危險的節點指令，例如 `camera.snap`、`camera.clip` 和 `screen.record`；`denyCommands` 會移除指令，即使平台預設或明確允許原本會包含它。節點變更其宣告的指令清單後，請拒絕並重新核准該裝置配對，以便 gateway 儲存更新的指令快照。
- `gateway.tools.deny`: 針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱 (延伸預設拒絕清單)。
- `gateway.tools.allow`: 從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- Chat Completions：預設為停用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入防護：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空白允許清單被視為未設定；使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 來停用 URL 擷取。
- 選用的回應防護標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` (僅針對您控制的 HTTPS 來源設定；請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### 多重實體隔離

在單一主機上執行多個閘道，並使用唯一的連接埠和狀態目錄：

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

- `enabled`：啟用閘道監聽器上的 TLS 終止 (HTTPS/WSS) (預設值：`false`)。
- `autoGenerate`：當未設定明確檔案時，自動產生本機自我簽署憑證/金鑰組；僅供本機/開發使用。
- `certPath`：TLS 憑證檔案的檔案系統路徑。
- `keyPath`：TLS 私鑰檔案的檔案系統路徑；請保持權限限制。
- `caPath`：用於用戶端驗證或自訂信任鏈的選用 CA 套件路徑。

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
  - `"restart"`：在設定變更時一律重新啟動閘道程序。
  - `"hot"`：在程序內套用變更而不重新啟動。
  - `"hybrid"` (預設值)：先嘗試熱重新載入；如果需要則退回到重新啟動。
- `debounceMs`：套用設定變更前的防震動視窗，單位為毫秒 (非負整數)。
- `deferralTimeoutMs`：可選的等待時間（毫秒），用於在強制重啟或通道熱重載之前等待進行中的操作。省略此項以使用預設的有界等待（`300000`）；設定 `0` 以無限期等待並記錄週期性的仍待處理警告。

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
查詢字串鉤子令牌會被拒絕。

驗證與安全注意事項：

- `hooks.enabled=true` 需要非空的 `hooks.token`。
- `hooks.token` 必須與 `gateway.auth.token` **不同**；重複使用 Gateway 令牌會被拒絕。
- `hooks.path` 不能是 `/`；請使用專用的子路徑，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果映射或預設集使用模板化的 `sessionKey`，請設定 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。靜態映射鍵不需要此選擇加入。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 僅當 `hooks.allowRequestSessionKey=true` 時（預設：`false`），才接受請求載荷中的 `sessionKey`。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析
  - 模板渲染的映射 `sessionKey` 值被視為外部提供，也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="對應詳細資訊">

- `match.path` 會比對 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 會比對通用路徑的 payload 欄位。
- 像 `{{messages[0].subject}}` 這類的範本會從 payload 讀取資料。
- `transform` 可以指向一個返回 hook 動作的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，且必須位於 `hooks.transformsDir` 之內（絕對路徑和路徑遍歷會被拒絕）。
  - 請將 `hooks.transformsDir` 保持在 `~/.openclaw/hooks/transforms` 之下；不允許使用工作區技能目錄。如果 `openclaw doctor` 回報此路徑無效，請將轉換模組移至 hooks transforms 目錄，或移除 `hooks.transformsDir`。
- `agentId` 會將路由導向至特定代理程式；未知的 ID 會回退為預設值。
- `allowedAgentIds`：限制明確路由（`*` 或省略 = 允許全部，`[]` = 拒絕全部）。
- `defaultSessionKey`：用於沒有明確 `sessionKey` 的 hook 代理程式執行作業的可選固定 session 金鑰。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者和範本驅動的對應 session 金鑰設定 `sessionKey`（預設值：`false`）。
- `allowedSessionKeyPrefixes`：明確 `sessionKey` 值（請求 + 對應）的可選前綴允許清單，例如 `["hook:"]`。當任何對應或預設集使用範本化 `sessionKey` 時，此項即為必要項目。
- `deliver: true` 會將最終回覆傳送至頻道；`channel` 預設為 `last`。
- `model` 會為此 hook 執行覆寫 LLM（如果已設定模型目錄，則必須允許此操作）。

</Accordion>

### Gmail 整合

- 內建的 Gmail 預設集使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留該每則訊息路由，請設定 `hooks.allowRequestSessionKey: true` 並將 `hooks.allowedSessionKeyPrefixes` 限制為符合 Gmail 命名空間，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，請使用靜態的 `sessionKey` 覆寫預設集，而不是使用範本預設值。

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

- Gateway 在設定時會在啟動時自動啟動 `gog gmail watch serve`。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以停用。
- 請勿在 Gateway 旁邊單獨執行 `gog gmail watch serve`。

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

- 透過 Gateway 連接埠提供代理程式可編輯的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 僅限本機：保持 `gateway.bind: "loopback"` (預設值)。
- 非回送綁定：canvas 路由需要 Gateway 驗證 (權杖/密碼/受信任代理程式)，與其他 Gateway HTTP 介面相同。
- Node WebViews 通常不會傳送驗證標頭；在節點配對並連接後，Gateway 會公告用於 canvas/A2UI 存取的節點範圍功能 URL。
- 功能 URL 綁定到作用中的節點 WS 工作階段，並且會很快過期。不使用 IP 備援機制。
- 將即時重新載入用戶端注入到提供的 HTML 中。
- 如果為空，會自動建立入門 `index.html`。
- 同時也會在 `/__openclaw__/a2ui/` 提供 A2UI。
- 變更需要重新啟動 gateway。
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

- `minimal` (啟用內建 `bonjour` 外掛程式時的預設值)：從 TXT 記錄中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`；LAN 多播公告仍需啟用內建 `bonjour` 外掛程式。
- `off`：在不變更外掛程式啟用狀態的情況下抑制 LAN 多播公告。
- 內建 `bonjour` 外掛程式會在 macOS 主機上自動啟動，而在 Linux、Windows 和容器化 Gateway 部署中則為選擇性加入。
- 主機名稱預設為系統主機名稱（當其為有效的 DNS 標籤時），否則回退至 `openclaw`。可使用 `OPENCLAW_MDNS_HOSTNAME` 覆寫。

### 廣域 (DNS-SD)

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

### `env` (內嵌環境變數)

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

- 僅當程序環境中缺少該鍵時，才會套用內嵌環境變數。
- `.env` 檔案：CWD `.env` + `~/.openclaw/.env` (兩者皆不會覆寫現有變數)。
- `shellEnv`：從您的登入 shell 設定檔匯入缺少的預期鍵。
- 請參閱 [環境](/zh-Hant/help/environment) 以了解完整的優先順序。

### 環境變數替換

使用 `${VAR_NAME}` 在任何設定字串中參照環境變數：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 僅比對大寫名稱：`[A-Z_][A-Z0-9_]*`。
- 遺漏或空的變數會在載入設定時擲回錯誤。
- 使用 `$${VAR}` 逸出以取得字面值 `${VAR}`。
- 適用於 `$include`。

---

## 機密

機密參照具有累加性：純文字值仍然有效。

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

### 支援的憑證介面

- 標準矩陣：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- `secrets apply` 目標支援 `openclaw.json` 憑證路徑。
- `auth-profiles.json` 參照包含在執行時期解析與稽核涵蓋範圍中。

### 秘密提供者設定

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

- `file` 提供者支援 `mode: "json"` 和 `mode: "singleValue"`（在 singleValue 模式下，`id` 必須是 `"value"`）。
- 當無法使用 Windows ACL 驗證時，檔案和 exec 提供者路徑會以失敗關閉（fail closed）方式處理。僅針對無法驗證的受信任路徑設定 `allowInsecurePath: true`。
- `exec` 提供者需要絕對的 `command` 路徑，並在 stdin/stdout 上使用協議負載（payloads）。
- 預設情況下，符號連結（symlink）指令路徑會被拒絕。設定 `allowSymlinkCommand: true` 以允許符號連結路徑，同時驗證解析後的目標路徑。
- 如果已設定 `trustedDirs`，受信任目錄檢查會套用至解析後的目標路徑。
- `exec` 子進程環境預設為最小化；請使用 `passEnv` 明確傳遞所需的變數。
- 秘密參照在啟用時會解析為記憶體中的快照，隨後請求路徑僅讀取該快照。
- 啟用介面過濾會在啟用期間套用：已啟用介面上未解析的參照會導致啟動/重新載入失敗，而未啟用的介面則會被跳過並輸出診斷資訊。

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

- 每個 Agent 的設定檔儲存在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 針對靜態認證模式支援值級別的參照（`keyRef` 用於 `api_key`，`tokenRef` 用於 `token`）。
- 舊版扁平 `auth-profiles.json` 對應（例如 `{ "provider": { "apiKey": "..." } }`）並非執行時期格式；`openclaw doctor --fix` 會將其重寫為具有 `.legacy-flat.*.bak` 備份的正式 `provider:default` API 金鑰設定檔。
- OAuth 模式設定檔（`auth.profiles.<id>.mode = "oauth"`）不支援由 SecretRef 支援的認證設定檔憑證。
- 靜態執行時期憑證來自於記憶體中解析的快照；當發現舊版靜態 `auth.json` 項目時會將其清除。
- 從 `~/.openclaw/credentials/oauth.json` 匯入舊版 OAuth。
- 請參閱 [OAuth](/zh-Hant/concepts/oauth)。
- Secrets 運行時行為與 `audit/configure/apply` 工具：[Secrets 管理](/zh-Hant/gateway/secrets)。

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

- `billingBackoffHours`：當設定檔因真正的計費/餘額不足錯誤而失敗時，以小時為單位的基本退避時間（預設值：`5`）。明確的計費文字即使在 `401`/`403` 回應中也可能歸類於此，但供應商特定的文字匹配器仍僅限於擁有它們的供應商（例如 OpenRouter `Key limit exceeded`）。可重試的 HTTP `402` 使用量視窗或組織/工作區花費限制訊息則會保留在 `rate_limit` 路徑中。
- `billingBackoffHoursByProvider`：各供應商的計費退避小時數可選覆寫值。
- `billingMaxHours`：計費退避指數增長的小時數上限（預設值：`24`）。
- `authPermanentBackoffMinutes`：高信心度 `auth_permanent` 失敗的基本退避時間（以分鐘為單位）（預設值：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避增長的分鐘數上限（預設值：`60`）。
- `failureWindowHours`：用於退避計數器的滾動視窗（以小時為單位）（預設值：`24`）。
- `overloadedProfileRotations`：在切換到模型備援之前，針對過載錯誤進行同供應商認證設定檔輪換的最大次數（預設值：`1`）。供應商忙碌類型（例如 `ModelNotReadyException`）會歸類於此。
- `overloadedBackoffMs`：重試過載的供應商/設定檔輪換前的固定延遲（預設值：`0`）。
- `rateLimitedProfileRotations`：在切換到模型備援之前，針對速率限制錯誤的同供應商驗證設定檔最大輪換次數（預設值：`1`）。該速率限制區塊包含供應商特定的文字，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

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
- 當 `--verbose` 時，`consoleLevel` 會增加至 `debug`。
- `maxFileBytes`：輪換前的活動日誌檔案最大大小（以位元組為單位）（正整數；預設值：`104857600` = 100 MB）。OpenClaw 會在活動檔案旁保留最多五個編號的存檔。
- `redactSensitive` / `redactPatterns`：針對主控台輸出、檔案日誌、OTLP 日誌記錄和持久化的會話逐字稿文字，進行盡力而為的遮罩。`redactSensitive: "off"` 僅會停用此一般日誌/逐字稿策略；UI/工具/診斷安全介面在發送前仍會對秘密進行編修。

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

- `enabled`：檢測輸出的總開關（預設值：`true`）。
- `flags`：啟用特定日誌輸出的旗標字串陣列（支援萬用字元，例如 `"telegram.*"` 或 `"*"`）。
- `stuckSessionWarnMs`：用於將長時間執行的處理會話分類為 `session.long_running`、`session.stalled` 或 `session.stuck` 的無進行年齡閾值（以毫秒為單位）。回覆、工具、狀態、區塊和 ACP 進度會重置計時器；重複的 `session.stuck` 診斷若未變更則會退避。
- `stuckSessionAbortMs`：在允許中止並排除停滞的活動工作以進行復原之前的無進行年齡閾值（以毫秒為單位）。若未設定，OpenClaw 將使用較安全的擴充內嵌執行視窗，時間至少為 10 分鐘且為 `stuckSessionWarnMs` 的 5 倍。
- `otel.enabled`：啟用 OpenTelemetry 匯出管線（預設：`false`）。如需完整組態、訊號目錄和隱私模型，請參閱 [OpenTelemetry 匯出](/zh-Hant/gateway/opentelemetry)。
- `otel.endpoint`：OTel 匯出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：選用的特定訊號 OTLP 端點。設定後，僅對該訊號覆寫 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（預設）或 `"grpc"`。
- `otel.headers`：隨 OTel 匯出要求傳送的額外 HTTP/gRPC 中繼資料標頭。
- `otel.serviceName`：資源屬性的服務名稱。
- `otel.traces` / `otel.metrics` / `otel.logs`：啟用追蹤、指標或日誌匯出。
- `otel.sampleRate`：追蹤取樣率 `0`-`1`。
- `otel.flushIntervalMs`：定期遙測排清間隔（毫秒）。
- `otel.captureContent`：選用於 OTEL span 屬性的原始內容擷取。預設為關閉。布林值 `true` 會擷取非系統訊息/工具內容；物件形式可讓您明確啟用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs` 和 `systemPrompt`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：最新實驗性 GenAI span 提供者屬性的環境切換開關。預設情況下，為了相容性，span 會保留舊版 `gen_ai.system` 屬性；GenAI 指標則使用有界的語意屬性。
- `OPENCLAW_OTEL_PRELOADED=1`：適用於已註冊全域 OpenTelemetry SDK 之主機的環境切換開關。OpenClaw 將會跳過外掛擁有的 SDK 啟動/關閉，同時保持診斷監聽器為啟用狀態。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：當未設定相符的配置鍵時使用的訊號特定端點環境變數。
- `cacheTrace.enabled`：記錄嵌入式執行的快取追蹤快照（預設值：`false`）。
- `cacheTrace.filePath`：快取追蹤 JSONL 的輸出路徑（預設值：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`）。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制快取追蹤輸出中包含的內容（預設值均為：`true`）。

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
- `checkOnStart`：閘道啟動時檢查 npm 更新（預設值：`true`）。
- `auto.enabled`：為套件安裝啟用背景自動更新（預設值：`false`）。
- `auto.stableDelayHours`：穩定通道自動套用前的最小延遲小時數（預設值：`6`；最大值：`168`）。
- `auto.stableJitterHours`：額外的穩定通道發佈散佈視窗（以小時為單位）（預設值：`12`；最大值：`168`）。
- `auto.betaCheckIntervalHours`：測試通道檢查的執行頻率（以小時為單位）（預設值：`1`；最大值：`24`）。

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

- `enabled`：全域 ACP 功能閘門（預設值：`true`；設定為 `false` 以隱藏 ACP 分派和生成功能）。
- `dispatch.enabled`：ACP 會話輪次分派的獨立閘門（預設值：`true`）。設定 `false` 以在阻斷執行的同時保留 ACP 指令的可用性。
- `backend`：預設的 ACP 執行階段後端 ID（必須符合已註冊的 ACP 執行階段外掛）。
  請先安裝後端外掛，如果設定了 `plugins.allow`，請包含後端外掛 ID（例如 `acpx`），否則 ACP 後端將無法載入。
- `defaultAgent`：當衍生程序未指定明確目標時使用的備用 ACP 目標代理程式 ID。
- `allowedAgents`：允許用於 ACP 執行階段會話的代理程式 ID 白名單；留空表示沒有額外限制。
- `maxConcurrentSessions`：最大同時啟用的 ACP 會話數。
- `stream.coalesceIdleMs`：串流文字的閒置排清視窗（毫秒）。
- `stream.maxChunkChars`：在分割串流區塊投影前的最大區塊大小。
- `stream.repeatSuppression`：抑制每輪重複的狀態/工具行（預設：`true`）。
- `stream.deliveryMode`：`"live"` 累加式串流；`"final_only"` 緩衝直到輪次終端事件。
- `stream.hiddenBoundarySeparator`：在隱藏工具事件後，可見文字之前的分隔符（預設：`"paragraph"`）。
- `stream.maxOutputChars`：每個 ACP 輪次投影的最大助理輸出字元數。
- `stream.maxSessionUpdateChars`：投影的 ACP 狀態/更新行的最大字元數。
- `stream.tagVisibility`：標籤名稱對布林值可見性覆寫的記錄，用於串流事件。
- `runtime.ttlMinutes`：ACP 會話工作器在符合清理資格前的閒置 TTL（分鐘）。
- `runtime.installCommand`：初始化 ACP 執行階段環境時執行的選用安裝指令。

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
  - `"random"`（預設）：輪換的有趣/季節性標語。
  - `"default"`：固定的中性標語（`All your chats, one OpenClaw.`）。
  - `"off"`：無標語文字（仍會顯示橫幅標題/版本）。
- 若要隱藏整個橫幅（不僅是標語），請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

---

## 精靈

由 CLI 引導式設定流程寫入的中繼資料 (`onboard`, `configure`, `doctor`)：

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

目前版本不再包含 TCP 橋接器。節點透過 Gateway WebSocket 連線。`bridge.*` 金鑰已不再屬於配置綱要的一部分 (必須移除否則驗證會失敗；`openclaw doctor --fix` 可移除未知金鑰)。

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

- `sessionRetention`：在從 `sessions.json` 清除之前，保留已完成的隔離 cron 執行階段的時間長度。同時也控制已封存之已刪除 cron 腳本的清理。預設值：`24h`；設定為 `false` 以停用。
- `runLog.maxBytes`：每次執行記錄檔的最大大小 (`cron/runs/<jobId>.jsonl`)，超過則進行清除。預設值：`2_000_000` 位元組。
- `runLog.keepLines`：觸發執行記錄清除時保留的最新行數。預設值：`2000`。
- `webhookToken`：用於 cron webhook POST 遞送 (`delivery.mode = "webhook"`) 的 bearer token，若省略則不發送 auth 標頭。
- `webhook`：已棄用的舊版備用 webhook URL (http/https)，僅用於仍有 `notify: true` 的已儲存工作。

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

- `maxAttempts`：一次性工作在暫時性錯誤上的最大重試次數 (預設值：`3`；範圍：`0`-`10`)。
- `backoffMs`：每次重試嘗試的退避延遲陣列，單位為毫秒 (預設值：`[30000, 60000, 300000]`；1-10 個項目)。
- `retryOn`: 觸發重試的錯誤類型 - `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略以重試所有暫時性類型。

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

- `enabled`: 啟用 cron 工作的失敗警示（預設：`false`）。
- `after`: 觸發警示前的連續失敗次數（正整數，最小值：`1`）。
- `cooldownMs`: 同一工作重複警示之間的最小毫秒數（非負整數）。
- `includeSkipped`: 將連續跳過的執行計入警示閾值（預設：`false`）。跳過的執行會單獨追蹤，且不會影響執行錯誤的退避策略。
- `mode`: 傳遞模式 - `"announce"` 透過通道訊息傳送；`"webhook"` 發布至設定的 webhook。
- `accountId`: 用於限定警示傳遞範圍的選用帳戶或通道 ID。

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

- 所有工作 cron 失敗通知的預設目的地。
- `mode`: `"announce"` 或 `"webhook"`；當存在足夠的目標資料時，預設為 `"announce"`。
- `channel`: 公告傳遞的通道覆寫。`"last"` 會重複使用最後已知傳遞通道。
- `to`: 明確的公告目標或 webhook URL。Webhook 模式為必填。
- `accountId`: 用於傳遞的選用帳戶覆寫。
- 各工作的 `delivery.failureDestination` 會覆寫此全域預設值。
- 當未設定全域或各工作的失敗目的地時，已透過 `announce` 傳遞的工作在失敗時會退回使用該主要公告目標。
- `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 任務，除非該任務的主要 `delivery.mode` 是 `"webhook"`。

請參閱 [Cron Jobs](/zh-Hant/automation/cron-jobs)。隔離的 cron 執行會被追蹤為 [background tasks](/zh-Hant/automation/tasks)。

---

## 媒體模型模板變數

在 `tools.media.models[].args` 中展開的模板佔位符：

| 變數               | 描述                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的傳入訊息內容                           |
| `{{RawBody}}`      | 原始內容（不含歷史/發送者包裝器）            |
| `{{BodyStripped}}` | 已移除群組提及的內容                         |
| `{{From}}`         | 發送者識別碼                                 |
| `{{To}}`           | 目的地識別碼                                 |
| `{{MessageSid}}`   | 頻道訊息 ID                                  |
| `{{SessionId}}`    | 目前工作階段 UUID                            |
| `{{IsNewSession}}` | 建立新工作階段時為 `"true"`                  |
| `{{MediaUrl}}`     | 傳入媒體偽 URL                               |
| `{{MediaPath}}`    | 本機媒體路徑                                 |
| `{{MediaType}}`    | 媒體類型（影像/音訊/文件/...）               |
| `{{Transcript}}`   | 音訊逐字稿                                   |
| `{{Prompt}}`       | CLI 項目的解析媒體提示                       |
| `{{MaxChars}}`     | CLI 項目的解析最大輸出字元數                 |
| `{{ChatType}}`     | `"direct"` 或 `"group"`                      |
| `{{GroupSubject}}` | 群組主題（盡力而為）                         |
| `{{GroupMembers}}` | 群組成員預覽（盡力而為）                     |
| `{{SenderName}}`   | 發送者顯示名稱（盡力而為）                   |
| `{{SenderE164}}`   | 發送者電話號碼（盡力而為）                   |
| `{{Provider}}`     | 提供者提示（whatsapp、telegram、discord 等） |

---

## 設定包含 (`$include`)

將設定分割為多個檔案：

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
- 檔案陣列：依序深度合併（後者覆寫前者）。
- 同層級鍵：在包含之後合併（覆寫包含的值）。
- 巢狀包含：最多深達 10 層。
- 路徑：相對於引入檔案解析，但必須保持在頂層配置目錄（`openclaw.json` 的 `dirname`）內。僅當絕對/`../` 形式仍解析到該邊界內時才允許使用。
- OpenClaw 擁有的寫入操作，如果僅更改由單一檔案引入支援的一個頂層部分，則會直接寫入該引入檔案。例如，`plugins install` 會更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }` 並保持 `openclaw.json` 不變。
- 對於 OpenClaw 擁有的寫入操作，根引入、引入陣列以及具有同層級覆寫的引入均為唯讀；這些寫入操作將會失敗（封閉式處理），而不是扁平化配置。
- 錯誤：針對缺少檔案、解析錯誤和循環引入提供清晰的訊息。

---

_相關：[Configuration](/zh-Hant/gateway/configuration) · [Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [Configuration](/zh-Hant/gateway/configuration)
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
