---
summary: "核心 OpenClaw 金鑰、預設值及專屬子系統參考連結的 Gateway 設定參考"
title: "設定參考"
read_when:
  - You need exact field-level config semantics or defaults
  - You are validating channel, model, gateway, or tool config blocks
---

`~/.openclaw/openclaw.json` 的核心設定參考。如需面向任務的概覽，請參閱 [設定](/zh-Hant/gateway/configuration)。

涵蓋主要的 OpenClaw 設定層面，並在子系統擁有自身更深入的參考資料時提供連結。通道 和外掛 擁有的指令目錄以及深度記憶體/QMD 調整選項位於各自的頁面上，而非此頁。

程式碼基準：

- `openclaw config schema` 列印用於驗證和控制 UI 的即時 JSON Schema，並在可用時合併內建/外掛/通道的中繼資料
- `config.schema.lookup` 傳回單一路徑範圍的 schema 節點，供深入探索工具使用
- `pnpm config:docs:check` / `pnpm config:docs:gen` 根據目前的 schema 層面驗證設定文件基準雜湊

Agent 查詢路徑：在編輯前使用 `gateway` 工具動作 `config.schema.lookup` 以取得精確的欄位層級文件與限制。使用 [設定](/zh-Hant/gateway/configuration) 獲取面向任務的指引，並使用此頁面以了解更廣泛的欄位對應、預設值及子系統參考連結。

專屬深度參考資料：

- `agents.defaults.memorySearch.*`、`memory.qmd.*`、`memory.citations` 的 [記憶體設定參考](/zh-Hant/reference/memory-config)，以及 `plugins.entries.memory-core.config.dreaming` 下的 dreaming 設定
- 目前內建 + 捆綁指令目錄的 [斜線指令](/zh-Hant/tools/slash-commands)
- 擁有者通道/外掛頁面，用於通道特定的指令介面

設定格式為 **JSON5**（允許註解和尾隨逗號）。所有欄位都是選填的 — 省略時 OpenClaw 會使用安全的預設值。

---

## 通道

各通道 設定金鑰已移至專屬頁面 — 請參閱 [設定 — 通道](/zh-Hant/gateway/config-channels) 以了解 `channels.*`，包括 Slack、Discord、Telegram、WhatsApp、Matrix、iMessage 及其他捆綁通道 (驗證、存取控制、多帳戶、提及閘道)。

## Agent 預設值、多重 Agent、工作階段與訊息

已移至專屬頁面 — 請參閱 [設定 — Agent](/zh-Hant/gateway/config-agents) 以了解：

- `agents.defaults.*` (工作區、模型、思考、心跳、記憶體、媒體、技能、沙箱)
- `multiAgent.*`（多代理路由和綁定）
- `session.*`（會話生命週期、壓縮、修剪）
- `messages.*`（訊息傳遞、TTS、Markdown 渲染）
- `talk.*`（對話模式）
  - `talk.speechLocale`：iOS/macOS 上對話模式語音辨識的可選 BCP 47 地區設定 ID
  - `talk.silenceTimeoutMs`：未設定時，對話模式會在發送逐字稿之前保持平台預設的暫停視窗（`700 ms on macOS and Android, 900 ms on iOS`）

## 工具和自訂提供者

工具策略、實驗性切換開關、提供者支援的工具配置，以及自訂提供者/基礎 URL 設定已移至專屬頁面 — 請參閱
[配置 — 工具和自訂提供者](/zh-Hant/gateway/config-tools)。

## MCP

由 OpenClaw 管理的 MCP 伺服器定義位於 `mcp.servers` 之下，並由嵌入式 Pi 和其他執行時適配器使用。`openclaw mcp list`、
`show`、`set` 和 `unset` 指令會在配置編輯期間管理此區塊，而無需連線到
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

- `mcp.servers`：針對公開已配置 MCP 工具之執行時的具名 stdio 或遠端 MCP 伺服器定義。
  遠端項目使用 `transport: "streamable-http"` 或 `transport: "sse"`；
  `type: "http"` 是一個 CLI 原生別名，會被 `openclaw mcp set` 和
  `openclaw doctor --fix` 正規化為標準 `transport` 欄位。
- `mcp.sessionIdleTtlMs`：會話範圍捆綁 MCP 執行時的閒置 TTL。
  一次性嵌入式執行會請求執行結束時的清理；此 TTL 是
  長期會話和未來呼叫者的最後防線。
- `mcp.*` 下的變更會透過釋放快取的會話 MCP 執行時來熱套用。
  下一次工具探索/使用會根據新配置重新建立它們，因此移除的
  `mcp.servers` 項目會立即被回收，而無需等待閒置 TTL。

請參閱 [MCP](/zh-Hant/cli/mcp#openclaw-as-an-mcp-client-registry) 和
[CLI 後端](/zh-Hant/gateway/cli-backends#bundle-mcp-overlays) 以了解執行時行為。

## 技能

```json5
{
  skills: {
    allowBundled: ["gemini", "peekaboo"],
    load: {
      extraDirs: ["~/Projects/agent-scripts/skills"],
    },
    install: {
      preferBrew: true,
      nodeManager: "npm", // npm | pnpm | yarn | bun
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

- `allowBundled`：僅適用於內建技能的可選允許清單（受管理/工作區技能不受影響）。
- `load.extraDirs`：額外的共享技能根目錄（優先級最低）。
- `install.preferBrew`：當為 true 時，如果 `brew` 可用，則優先使用 Homebrew 安裝程式，然後再回退到其他類型的安裝程式。
- `install.nodeManager`：`metadata.openclaw.install` 規格的節點安裝程式偏好設定（`npm` | `pnpm` | `yarn` | `bun`）。
- `entries.<skillKey>.enabled: false` 即使已內建/安裝仍會停用技能。
- `entries.<skillKey>.apiKey`：針對宣告主要環境變數的技能之便利欄位（純文字字串或 SecretRef 物件）。

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

- 從 `~/.openclaw/extensions`、`<workspace>/.openclaw/extensions` 以及 `plugins.load.paths` 載入。
- 探索功能接受原生 OpenClaw 外掛程式以及相容的 Codex 套件和 Claude 套件，包括無清單的 Claude 預設佈局套件。
- **變更組態需要重新啟動閘道。**
- `allow`：可選的允許清單（僅載入列出的外掛程式）。`deny` 優先。
- `plugins.entries.<id>.apiKey`：外掛程式層級的 API 金鑰便利欄位（當外掛程式支援時）。
- `plugins.entries.<id>.env`：外掛程式範圍的環境變數對應。
- `plugins.entries.<id>.hooks.allowPromptInjection`：當 `false` 時，核心會阻擋 `before_prompt_build` 並忽略來自舊版 `before_agent_start` 的提示變更欄位，同時保留舊版 `modelOverride` 和 `providerOverride`。適用於原生外掛程式掛鉤和支援的套件提供掛鉤目錄。
- `plugins.entries.<id>.hooks.allowConversationAccess`：當 `true` 時，受信任的非內建外掛程式可以從類型掛鉤讀取原始對話內容，例如 `llm_input`、`llm_output`、`before_agent_finalize` 和 `agent_end`。
- `plugins.entries.<id>.subagent.allowModelOverride`: 明確信任此外掛程式針對背景子代理程式執行請求每次執行的 `provider` 和 `model` 覆寫。
- `plugins.entries.<id>.subagent.allowedModels`: 信任子代理程式覆寫的標準 `provider/model` 目標選用允許清單。僅在您有意允許任何模型時使用 `"*"`。
- `plugins.entries.<id>.config`: 外掛程式定義的設定物件（若有提供，則由原生 OpenClaw 外掛程式架構驗證）。
- 通道外掛程式帳號/執行時設定位於 `channels.<id>` 之下，且應由擁有此外掛程式的清單 `channelConfigs` 元資料描述，而非由中央 OpenClaw 選項登錄檔描述。
- `plugins.entries.firecrawl.config.webFetch`: Firecrawl 網頁擷取提供者設定。
  - `apiKey`: Firecrawl API 金鑰（接受 SecretRef）。若未提供，則回退至 `plugins.entries.firecrawl.config.webSearch.apiKey`、舊版 `tools.web.fetch.firecrawl.apiKey` 或 `FIRECRAWL_API_KEY` 環境變數。
  - `baseUrl`: Firecrawl API 基礎 URL（預設值：`https://api.firecrawl.dev`）。
  - `onlyMainContent`: 僅擷取頁面的主要內容（預設值：`true`）。
  - `maxAgeMs`: 最大快取有效期限，以毫秒為單位（預設值：`172800000` / 2 天）。
  - `timeoutSeconds`: 擷取請求逾時時間，以秒為單位（預設值：`60`）。
- `plugins.entries.xai.config.xSearch`: xAI X Search (Grok 網頁搜尋) 設定。
  - `enabled`: 啟用 X Search 提供者。
  - `model`: 用於搜尋的 Grok 模型（例如 `"grok-4-1-fast"`）。
- `plugins.entries.memory-core.config.dreaming`: 記憶夢境設定。請參閱 [Dreaming](/zh-Hant/concepts/dreaming) 以了解階段與閾值。
  - `enabled`: 夢境主開關（預設值 `false`）。
  - `frequency`: 每次完整夢境掃描的 cron 頻率（預設為 `"0 3 * * *"`）。
  - `model`：可選的 Dream Diary 子代理模型覆蓋。需要 `plugins.entries.memory-core.subagent.allowModelOverride: true`；與 `allowedModels` 配對以限制目標。
  - phase policy 和 thresholds 是實現細節（非面向用戶的配置鍵）。
- 完整的記憶配置位於 [Memory configuration reference](/zh-Hant/reference/memory-config)：
  - `agents.defaults.memorySearch.*`
  - `memory.backend`
  - `memory.citations`
  - `memory.qmd.*`
  - `plugins.entries.memory-core.config.dreaming`
- 已啟用的 Claude bundle 插件也可以從 `settings.json` 貢獻嵌入式 Pi 預設值；OpenClaw 將這些應用為經過清理的代理設置，而不是原始的 OpenClaw 配置補丁。
- `plugins.slots.memory`：選擇活動記憶插件 id，或選擇 `"none"` 以禁用記憶插件。
- `plugins.slots.contextEngine`：選擇活動上下文引擎插件 id；除非您安裝並選擇了其他引擎，否則默認為 `"legacy"`。

參見 [Plugins](/zh-Hant/tools/plugin)。

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

- `evaluateEnabled: false` 會禁用 `act:evaluate` 和 `wait --fn`。
- `tabCleanup` 會在閒置時間或會話超過上限後回收被追蹤的主要代理標籤頁。設置 `idleMinutes: 0` 或 `maxTabsPerSession: 0` 以
  禁用這些單獨的清理模式。
- `ssrfPolicy.dangerouslyAllowPrivateNetwork` 在未設置時被禁用，因此瀏覽器導航默認保持嚴格模式。
- 僅當您有意信任私有網絡瀏覽器導航時，才設置 `ssrfPolicy.dangerouslyAllowPrivateNetwork: true`。
- 在嚴格模式下，遠程 CDP 配置文件端點 (`profiles.*.cdpUrl`) 在可達性/發現檢查期間也會受到相同的私有網絡阻止限制。
- `ssrfPolicy.allowPrivateNetwork` 作為傳統別名仍受支持。
- 在嚴格模式下，使用 `ssrfPolicy.hostnameAllowlist` 和 `ssrfPolicy.allowedHostnames` 進行顯式例外處理。
- 遠程配置文件僅支持附加（已禁用 start/stop/reset）。
- `profiles.*.cdpUrl` 接受 `http://`、`https://`、`ws://` 和 `wss://`。
  當您希望 OpenClaw 探索 `/json/version` 時使用 HTTP(S)；當您的提供者提供直接的 DevTools WebSocket URL 時使用 WS(S)。
- `remoteCdpTimeoutMs` 和 `remoteCdpHandshakeTimeoutMs` 適用於遠端和
  `attachOnly` CDP 連線性以及分頁開啟請求。受管理的 loopback
  設定檔保留本機 CDP 預設值。
- 如果外部管理的 CDP 服務可透過 loopback 存取，請設定該
  設定檔的 `attachOnly: true`；否則 OpenClaw 會將 loopback 連接埠視為
  本機受管理的瀏覽器設定檔，並可能回報本機連接埠擁有權錯誤。
- `existing-session` 設定檔使用 Chrome MCP 而非 CDP，且可以附加至
  選定的主機或透過連線的瀏覽器節點。
- `existing-session` 設定檔可以設定 `userDataDir` 以針對特定的
  Chromium 瀏覽器設定檔，例如 Brave 或 Edge。
- `existing-session` 設定檔保留目前的 Chrome MCP 路由限制：
  透過快照/ref 驅動的操作而非 CSS 選擇器定位、單一檔案上傳
  掛鉤、無對話方塊逾時覆寫、無 `wait --load networkidle`，且無
  `responsebody`、PDF 匯出、下載攔截或批次操作。
- 本機受管理的 `openclaw` 設定檔會自動指派 `cdpPort` 和 `cdpUrl`；僅
  針對遠端 CDP 明確設定 `cdpUrl`。
- 本機受管理的設定檔可以設定 `executablePath` 以覆寫該設定檔的全域
  `browser.executablePath`。使用此功能可在 Chrome 中執行一個設定檔，並在 Brave 中執行另一個。
- 本機受管理的設定檔使用 `browser.localLaunchTimeoutMs` 進行程序啟動後的 Chrome CDP HTTP
  探索，並使用 `browser.localCdpReadyTimeoutMs` 進行
  啟動後的 CDP websocket 就緒檢查。在 Chrome 成功啟動但就緒檢查與啟動程序競爭的較慢主機上，請增加這些值。兩個值都必須是
  不超過 `120000` 毫秒的正整數；無效的設定值將被拒絕。
- 自動偵測順序：如果是基於 Chromium 的瀏覽器則使用預設瀏覽器 → Chrome → Brave → Edge → Chromium → Chrome Canary。
- `browser.executablePath` 和 `browser.profiles.<name>.executablePath` 兩者
  都在 Chromium 啟動前接受 `~` 和 `~/...` 作為您的作業系統主目錄。
  `existing-session` 設定檔上的每個設定檔 `userDataDir` 也會進行波紋號擴展 (tilde-expanded)。
- 控制服務：僅限迴路連線 (port 從 `gateway.port` 推導，預設為 `18791`)。
- `extraArgs` 會將額外的啟動旗標附加到本地 Chromium 啟動程序中 (例如
  `--disable-gpu`、視窗大小調整或偵錯旗標)。

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

- `seamColor`：原生應用程式 UI chrome 的強調色 (對話模式氣泡色調等)。
- `assistant`：控制 UI 身分覆寫。回退至啟用中的代理程式身分。

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

<Accordion title="Gateway 字段詳情">

- `mode`：`local`（執行 gateway）或 `remote`（連接到遠端 gateway）。除非 `local`，否則 Gateway 拒絕啟動。
- `port`：用於 WS + HTTP 的單一多工連接埠。優先順序：`--port` > `OPENCLAW_GATEWAY_PORT` > `gateway.port` > `18789`。
- `bind`：`auto`、`loopback`（預設）、`lan`（`0.0.0.0`）、`tailnet`（僅 Tailscale IP）或 `custom`。
- **舊版綁定別名**：在 `gateway.bind` 中使用綁定模式值（`auto`、`loopback`、`lan`、`tailnet`、`custom`），而非主機別名（`0.0.0.0`、`127.0.0.1`、`localhost`、`::`、`::1`）。
- **Docker 說明**：預設的 `loopback` 綁定會在容器內監聽 `127.0.0.1`。使用 Docker 橋接網路（`-p 18789:18789`）時，流量會到達 `eth0`，因此無法連線到 gateway。請使用 `--network host`，或設定 `bind: "lan"`（或搭配 `customBindHost: "0.0.0.0"` 的 `bind: "custom"`）以監聽所有介面。
- **驗證**：預設為必填。非回送綁定需要 gateway 驗證。實務上，這表示共用 token/密碼或具有 `gateway.auth.mode: "trusted-proxy"` 的身分感知反向 Proxy。入門精靈預設會產生 token。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`（包括 SecretRefs），請將 `gateway.auth.mode` 明確設定為 `token` 或 `password`。當同時設定這兩者且未設定模式時，啟動和服務安裝/修復流程會失敗。
- `gateway.auth.mode: "none"`：明確的無驗證模式。僅用於受信任的本機回送設定；入門提示刻意不提供此選項。
- `gateway.auth.mode: "trusted-proxy"`：將驗證委派給身分感知反向 Proxy，並信任來自 `gateway.trustedProxies` 的身分標頭（請參閱[受信任 Proxy 驗證](/zh-Hant/gateway/trusted-proxy-auth)）。此模式期望 **非回送** Proxy 來源；同主機回送反向 Proxy 不符合受信任 Proxy 驗證的條件。
- `gateway.auth.allowTailscale`：當 `true` 時，Tailscale Serve 身分標頭可以滿足控制 UI/WebSocket 驗證（透過 `tailscale whois` 驗證）。HTTP API 端點 **不** 使用該 Tailscale 標頭驗證；它們改為遵循 gateway 的標準 HTTP 驗證模式。此無 token 流程假設 gateway 主機受信任。當 `tailscale.mode = "serve"` 時，預設為 `true`。
- `gateway.auth.rateLimit`：選用的驗證失敗限制器。套用於每個用戶端 IP 和每個驗證範圍（共用祕密和裝置 token 會分別追蹤）。遭到封鎖的嘗試會傳回 `429` + `Retry-After`。
  - 在非同步 Tailscale Serve 控制 UI 路徑上，相同 `{scope, clientIp}` 的失敗嘗試會在失敗寫入前序列化。因此，來自同一用戶端的並行錯誤嘗試可能在第二次請求時觸發限制器，而不是兩次都作為一般的不相符而競爭。
  - `gateway.auth.rateLimit.exemptLoopback` 預設為 `true`；當您有意也要對 localhost 流量進行速率限制時（適用於測試環境或嚴格的 Proxy 部署），請設定 `false`。
- 瀏覽器來源的 WS 驗證嘗試一律會受到節流，並停用回送豁免（針對瀏覽器式 localhost 暴力破解的縱深防禦）。
- 在回送上，那些瀏覽器來源的鎖定是依正規化的 `Origin` 值隔離，因此來自一個 localhost 來源的重複失敗不會自動鎖定不同的來源。
- `tailscale.mode`：`serve`（僅 tailnet，回送綁定）或 `funnel`（公開，需要驗證）。
- `controlUi.allowedOrigins`：Gateway WebSocket 連線的明確瀏覽器來源允許清單。當預期來自非回送來源的瀏覽器用戶端時為必要。
- `controlUi.dangerouslyAllowHostHeaderOriginFallback`：危險模式，為刻意依賴 Host 標頭來源原則的部署啟用 Host 標頭來源後援。
- `remote.transport`：`ssh`（預設）或 `direct`（ws/wss）。對於 `direct`，`remote.url` 必須是 `ws://` 或 `wss://`。
- `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`：用戶端處理程序環境緊急覆寫，允許對受信任的私人網路 IP 使用純文字 `ws://`；純文字的預設值仍維持僅限回送。沒有 `openclaw.json` 的對等項目，而瀏覽器私人網路設定（例如 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork`）不會影響 Gateway WebSocket 用戶端。
- `gateway.remote.token` / `.password` 是遠端用戶端憑證欄位。它們本身不設定 gateway 驗證。
- `gateway.push.apns.relay.baseUrl`：供官方/TestFlight iOS 版本使用的 APNs 外部轉送基底 HTTPS URL，在將轉送註冊發佈至 gateway 之後使用。此 URL 必須符合編譯至 iOS 版本中的轉送 URL。
- `gateway.push.apns.relay.timeoutMs`：gateway 至轉送的傳送逾時（毫秒）。預設為 `10000`。
- 轉送註冊是委派給特定的 gateway 身分。配對的 iOS 應用程式會擷取 `gateway.identity.get`，在轉送註冊中包含該身分，並將註冊範圍的傳送授權轉送至 gateway。另一個 gateway 無法重複使用該儲存的註冊。
- `OPENCLAW_APNS_RELAY_BASE_URL` / `OPENCLAW_APNS_RELAY_TIMEOUT_MS`：上述轉送設定的暫時性環境覆寫。
- `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true`：僅供開發使用的回送 HTTP 轉送 URL 緊急應變方式。生產環境轉送 URL 應維持使用 HTTPS。
- `gateway.channelHealthCheckMinutes`：通道健康監控間隔（分鐘）。設定 `0` 以全域停用健康監控重新啟動。預設：`5`。
- `gateway.channelStaleEventThresholdMinutes`：過時 Socket 臨界值（分鐘）。請將此保持大於或等於 `gateway.channelHealthCheckMinutes`。預設：`30`。
- `gateway.channelMaxRestartsPerHour`：每個通道/帳戶在滾動一小時內的健康監控重新啟動次數上限。預設：`10`。
- `channels.<provider>.healthMonitor.enabled`：每個通道停用健康監控重新啟動，同時保持全域監控啟用。
- `channels.<provider>.accounts.<accountId>.healthMonitor.enabled`：多帳戶通道的每個帳戶覆寫。設定後，優先順序高於通道層級覆寫。
- 本機 gateway 呼叫路徑僅能在 `gateway.auth.*` 未設定時，將 `gateway.remote.*` 作為後援。
- 如果 `gateway.auth.token` / `gateway.auth.password` 透過 SecretRef 明確設定但未解析，解析會以封閉式失敗（無遠端後援遮罩）。
- `trustedProxies`：終止 TLS 或注入轉送用戶端標頭的反向 Proxy IP。請僅列出您控制的 Proxy。回送項目在同主機 Proxy/本機偵測設定（例如 Tailscale Serve 或本機反向 Proxy）中仍然有效，但它們 **不** 會讓回送請求符合 `gateway.auth.mode: "trusted-proxy"` 的資格。
- `allowRealIpFallback`：當 `true` 時，如果缺少 `X-Forwarded-For`，gateway 會接受 `X-Real-IP`。預設為 `false` 以實施封閉式失敗行為。
- `gateway.nodes.pairing.autoApproveCidrs`：選用的 CIDR/IP 允許清單，用於自動核准首次節點裝置配對（無要求的範圍）。未設定時會停用。這不會自動核准操作員/瀏覽器/控制 UI/WebChat 配對，也不會自動核准角色、範圍、中繼資料或公開金鑰升級。
- `gateway.nodes.allowCommands` / `gateway.nodes.denyCommands`：配對和允許清單評估後，對已宣告節點指令的全域允許/拒絕控制。
- `gateway.tools.deny`：針對 HTTP `POST /tools/invoke` 封鎖的額外工具名稱（擴充預設拒絕清單）。
- `gateway.tools.allow`：從預設 HTTP 拒絕清單中移除工具名稱。

</Accordion>

### OpenAI 相容端點

- Chat Completions：預設停用。使用 `gateway.http.endpoints.chatCompletions.enabled: true` 啟用。
- Responses API：`gateway.http.endpoints.responses.enabled`。
- Responses URL 輸入強化防護：
  - `gateway.http.endpoints.responses.maxUrlParts`
  - `gateway.http.endpoints.responses.files.urlAllowlist`
  - `gateway.http.endpoints.responses.images.urlAllowlist`
    空白允許清單視為未設定；請使用 `gateway.http.endpoints.responses.files.allowUrl=false`
    和/或 `gateway.http.endpoints.responses.images.allowUrl=false` 來停用 URL 擷取。
- 選用的回應強化防護標頭：
  - `gateway.http.securityHeaders.strictTransportSecurity` (僅為您控制的 HTTPS 起源設定；請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth#tls-termination-and-hsts))

### 多執行實例隔離

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

- `enabled`：在閘道監聽器啟用 TLS 終止 (HTTPS/WSS) (預設：`false`)。
- `autoGenerate`：若未設定明確的檔案，則自動產生本機自我簽署憑證/金鑰對；僅供本機/開發使用。
- `certPath`：TLS 憑證檔案的檔案系統路徑。
- `keyPath`：TLS 私鑰檔案的檔案系統路徑；請保持權限受限。
- `caPath`：用戶端驗證或自訂信任鏈的選用 CA �合路徑。

### `gateway.reload`

```json5
{
  gateway: {
    reload: {
      mode: "hybrid", // off | restart | hot | hybrid
      debounceMs: 500,
      deferralTimeoutMs: 0,
    },
  },
}
```

- `mode`：控制如何在執行時期套用設定變更。
  - `"off"`：忽略即時編輯；變更需要明確重新啟動。
  - `"restart"`：設定變更時一律重新啟動閘道程序。
  - `"hot"`：在程序中套用變更，無需重新啟動。
  - `"hybrid"` (預設)：先嘗試熱重新載入；若需要則回退到重新啟動。
- `debounceMs`：套用設定變更前的防震動視窗 (毫秒) (非負整數)。
- `deferralTimeoutMs`：在強制重啟之前，等待進行中操作的選用最大時間（毫秒）。省略此項或將 `0` 設定為無限等待，並定期記錄仍待處理的警告。

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

- `hooks.enabled=true` 需要一個非空的 `hooks.token`。
- `hooks.token` 必須與 `gateway.auth.token` **不同**；重複使用 Gateway 權杖會被拒絕。
- `hooks.path` 不能是 `/`；請使用專用的子路徑，例如 `/hooks`。
- 如果 `hooks.allowRequestSessionKey=true`，請限制 `hooks.allowedSessionKeyPrefixes`（例如 `["hook:"]`）。
- 如果對應或預設集使用範本化的 `sessionKey`，請設定 `hooks.allowedSessionKeyPrefixes` 和 `hooks.allowRequestSessionKey=true`。靜態對應鍵不需要該選項。

**端點：**

- `POST /hooks/wake` → `{ text, mode?: "now"|"next-heartbeat" }`
- `POST /hooks/agent` → `{ message, name?, agentId?, sessionKey?, wakeMode?, deliver?, channel?, to?, model?, thinking?, timeoutSeconds? }`
  - 僅當 `hooks.allowRequestSessionKey=true` 時，才接受來自請求內容的 `sessionKey`（預設值：`false`）。
- `POST /hooks/<name>` → 透過 `hooks.mappings` 解析
  - 範本渲染的對應 `sessionKey` 值被視為外部提供，且也需要 `hooks.allowRequestSessionKey=true`。

<Accordion title="對應詳細資訊">

- `match.path` 匹配 `/hooks` 之後的子路徑（例如 `/hooks/gmail` → `gmail`）。
- `match.source` 匹配通用路徑的 payload 欄位。
- 像 `{{messages[0].subject}}` 這樣的範本會從 payload 中讀取。
- `transform` 可以指向返回 hook 動作的 JS/TS 模組。
  - `transform.module` 必須是相對路徑，且必須保持在 `hooks.transformsDir` 內（絕對路徑和路徑遍歷會被拒絕）。
- `agentId` 路由至特定的 agent；未知的 ID 會回退至預設值。
- `allowedAgentIds`：限制明確路由（`*` 或省略 = 允許所有，`[]` = 拒絕所有）。
- `defaultSessionKey`：用於沒有明確 `sessionKey` 的 hook 執行的可選固定 session 金鑰。
- `allowRequestSessionKey`：允許 `/hooks/agent` 呼叫者和範本驅動的對應 session 金鑰設定 `sessionKey`（預設值：`false`）。
- `allowedSessionKeyPrefixes`：明確 `sessionKey` 值（請求 + 對應）的可選前綴允許清單，例如 `["hook:"]`。當任何對應或預設集使用範本化的 `sessionKey` 時，此變為必填。
- `deliver: true` 將最終回覆發送至頻道；`channel` 預設為 `last`。
- `model` 覆寫此 hook 執行的 LLM（如果設定了模型目錄，則必須被允許）。

</Accordion>

### Gmail 整合

- 內建的 Gmail 預設集使用 `sessionKey: "hook:gmail:{{messages[0].id}}"`。
- 如果您保留該每訊息路由，請設定 `hooks.allowRequestSessionKey: true` 並將 `hooks.allowedSessionKeyPrefixes` 限制為符合 Gmail 命名空間，例如 `["hook:", "hook:gmail:"]`。
- 如果您需要 `hooks.allowRequestSessionKey: false`，請使用靜態的 `sessionKey` 覆寫預設集，而不是使用範本化的預設值。

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

- Gateway 在配置時會在開機時自動啟動 `gog gmail watch serve`。設定 `OPENCLAW_SKIP_GMAIL_WATCHER=1` 以停用。
- 請勿在 Gateway 旁邊另行執行 `gog gmail watch serve`。

---

## Canvas host

```json5
{
  canvasHost: {
    root: "~/.openclaw/workspace/canvas",
    liveReload: true,
    // enabled: false, // or OPENCLAW_SKIP_CANVAS_HOST=1
  },
}
```

- 透過 Gateway 埠在 HTTP 上提供代理程式可編輯的 HTML/CSS/JS 和 A2UI：
  - `http://<gateway-host>:<gateway.port>/__openclaw__/canvas/`
  - `http://<gateway-host>:<gateway.port>/__openclaw__/a2ui/`
- 僅限本機：保留 `gateway.bind: "loopback"`（預設值）。
- 非迴路綁定：canvas 路由需要 Gateway 驗證（token/password/trusted-proxy），與其他 Gateway HTTP 介面相同。
- Node WebViews 通常不會傳送驗證標頭；在節點配對並連線後，Gateway 會廣播節點範圍的功能 URL 以供 canvas/A2UI 存取。
- 功能 URL 綁定至作用中的節點 WS 會話並會快速過期。不使用基於 IP 的後援機制。
- 將 live-reload 客戶端注入到提供的 HTML 中。
- 當空白時自動建立初始 `index.html`。
- 同時也在 `/__openclaw__/a2ui/` 提供 A2UI。
- 變更需要重新啟動 gateway。
- 對於大型目錄或 `EMFILE` 錯誤，請停用 live reload。

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

- `minimal`（預設值）：從 TXT 記錄中省略 `cliPath` + `sshPort`。
- `full`：包含 `cliPath` + `sshPort`。
- 當系統主機名稱是有效的 DNS 標籤時，主機名稱預設為系統主機名稱，否則回退至 `openclaw`。使用 `OPENCLAW_MDNS_HOSTNAME` 覆蓋。

### 廣域網路 (DNS-SD)

```json5
{
  discovery: {
    wideArea: { enabled: true },
  },
}
```

在 `~/.openclaw/dns/` 下寫入單播 DNS-SD 區域。若要進行跨網路探索，請搭配 DNS 伺服器（建議使用 CoreDNS）+ Tailscale split DNS。

設定：`openclaw dns setup --apply`。

---

## 環境

### `env` (inline env vars)

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

- 僅在程序環境缺少金鑰時才會套用 inline env vars。
- `.env` 檔案：CWD `.env` + `~/.openclaw/.env`（兩者皆不會覆蓋現有的變數）。
- `shellEnv`：從您的登入 shell 設定檔匯入缺少的預期金鑰。
- 查看 [Environment](/zh-Hant/help/environment) 以了解完整的優先順序。

### 環境變數替換

在任一配置字串中使用 `${VAR_NAME}` 引用環境變數：

```json5
{
  gateway: {
    auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" },
  },
}
```

- 僅匹配大寫名稱：`[A-Z_][A-Z0-9_]*`。
- 遺失或空的變數會在載入配置時拋出錯誤。
- 使用 `$${VAR}` 跳脫以取得字面值 `${VAR}`。
- 適用於 `$include`。

---

## 密鑰

密鑰引用是累加的：純文字值仍然有效。

### `SecretRef`

使用一種物件形狀：

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

驗證：

- `provider` 模式：`^[a-z][a-z0-9_-]{0,63}$`
- `source: "env"` id 模式：`^[A-Z][A-Z0-9_]{0,127}$`
- `source: "file"` id：絕對 JSON 指標（例如 `"/providers/openai/apiKey"`）
- `source: "exec"` id 模式：`^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `source: "exec"` id 不得包含 `.` 或 `..` 斜線分隔路徑區段（例如 `a/../b` 會被拒絕）

### 支援的憑證表面

- 標準矩陣：[SecretRef Credential Surface](/zh-Hant/reference/secretref-credential-surface)
- `secrets apply` 目標支援 `openclaw.json` 憑證路徑。
- `auth-profiles.json` 引用包含在執行時期解析和稽核覆蓋範圍內。

### 密鑰提供者配置

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

- `file` 提供者支援 `mode: "json"` 和 `mode: "singleValue"`（在單一值模式下 `id` 必須是 `"value"`）。
- 當 Windows ACL 驗證無法使用時，檔案和執行提供者路徑會以封閉失敗處理。僅對無法驗證的信任路徑設定 `allowInsecurePath: true`。
- `exec` 提供者需要絕對 `command` 路徑，並在 stdin/stdout 上使用協議承載。
- 預設情況下，符號連結指令路徑會被拒絕。設定 `allowSymlinkCommand: true` 以在驗證解析後的目標路徑時允許符號連結路徑。
- 如果設定了 `trustedDirs`，信任目錄檢查會套用至解析後的目標路徑。
- `exec` 子環境預設為最小化；請使用 `passEnv` 明確傳遞所需的變數。
- Secret 參照會在啟用時解析為記憶體內快照，然後請求路徑僅讀取該快照。
- 啟用期間會套用啟用介面篩選：已啟用介面上未解析的參照會導致啟動/重新載入失敗，而非啟用的介面則會被跳過並輸出診斷資訊。

---

## Auth storage

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

- 每個代理的配置文件儲存在 `<agentDir>/auth-profiles.json`。
- `auth-profiles.json` 支援靜態憑證模式的值層級參照（`api_key` 使用 `keyRef`，`token` 使用 `tokenRef`）。
- OAuth 模式的配置文件 (`auth.profiles.<id>.mode = "oauth"`) 不支援由 SecretRef 支援的 auth-profile 憑證。
- 靜態執行時憑證來自記憶體內解析的快照；傳統靜態 `auth.json` 條目在發現時會被清除。
- 從 `~/.openclaw/credentials/oauth.json` 匯入傳統 OAuth。
- 請參閱 [OAuth](/zh-Hant/concepts/oauth)。
- Secrets 執行時行為和 `audit/configure/apply` 工具：[Secrets Management](/zh-Hant/gateway/secrets)。

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

- `billingBackoffHours`：當配置檔案因真正的帳單/額度不足錯誤而失敗時，以小時為單位的基本退避時間（預設值：`5`）。即使在 `401`/`403` 回應上，明確的帳單文字仍然可能落在這裡，但提供者特定的文字比對器僅限於擁有它們的提供者（例如 OpenRouter `Key limit exceeded`）。可重試的 HTTP `402` 使用量視窗或組織/工作區支出限制訊息則會停留在 `rate_limit` 路徑中。
- `billingBackoffHoursByProvider`：可選的針對各提供者的帳單退避小時數覆寫。
- `billingMaxHours`：帳單退避指數增長的小時數上限（預設值：`24`）。
- `authPermanentBackoffMinutes`：高信度 `auth_permanent` 失敗的基礎退避時間（以分鐘為單位）（預設值：`10`）。
- `authPermanentMaxMinutes`：`auth_permanent` 退避時間增長的上限（以分鐘為單位）（預設值：`60`）。
- `failureWindowHours`：用於退避計數器的滾動視窗（以小時為單位）（預設值：`24`）。
- `overloadedProfileRotations`：在切換到模型回退之前，針對過載錯誤的相同提供者 auth-profile 輪替次數上限（預設值：`1`）。提供者忙碌的形態（如 `ModelNotReadyException`）屬於此類。
- `overloadedBackoffMs`：在重試過載的提供者/設定檔輪替之前的固定延遲（預設值：`0`）。
- `rateLimitedProfileRotations`：在切換到模型回退之前，針對速率限制錯誤的相同提供者 auth-profile 輪替次數上限（預設值：`1`）。該速率限制儲存桶包含提供者形態的文字，例如 `Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded` 和 `resource exhausted`。

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
- 設定 `logging.file` 以獲得穩定的路徑。
- 當 `--verbose` 時，`consoleLevel` 會遞增到 `debug`。
- `maxFileBytes`：輪替前的作用中日誌檔案大小上限（以位元組為單位）（正整數；預設值：`104857600` = 100 MB）。OpenClaw 會在作用中檔案旁保留最多五個編號的封存檔案。
- `redactSensitive` / `redactPatterns`：針對主控台輸出、檔案日誌、OTLP 日誌記錄和持久化的會話逐字稿文字盡力遮罩。

---

## 診斷

```json5
{
  diagnostics: {
    enabled: true,
    flags: ["telegram.*"],
    stuckSessionWarnMs: 30000,

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

- `enabled`：檢測輸出的主切換開關（預設值：`true`）。
- `flags`：用於啟用特定日誌輸出的旗標字串陣列（支援如 `"telegram.*"` 或 `"*"` 的萬用字元）。
- `stuckSessionWarnMs`：當階段 (session) 處於處理中狀態時，發出卡住階段警告的時間閾值（單位為毫秒）。
- `otel.enabled`：啟用 OpenTelemetry 匯出管線（預設值：`false`）。如需完整的配置、訊號目錄和隱私權模型，請參閱 [OpenTelemetry export](/zh-Hant/gateway/opentelemetry)。
- `otel.endpoint`：OTel 匯出的收集器 URL。
- `otel.tracesEndpoint` / `otel.metricsEndpoint` / `otel.logsEndpoint`：選用的特定訊號 OTLP 端點。設定後，僅會針對該訊號覆寫 `otel.endpoint`。
- `otel.protocol`：`"http/protobuf"`（預設）或 `"grpc"`。
- `otel.headers`：隨 OTel 匯出要求一併發送的額外 HTTP/gRPC 中繼資料標頭。
- `otel.serviceName`：資源屬性的服務名稱。
- `otel.traces` / `otel.metrics` / `otel.logs`：啟用追蹤、指標或日誌匯出。
- `otel.sampleRate`：追蹤採樣率 `0`–`1`。
- `otel.flushIntervalMs`：定期遙測排清間隔（毫秒）。
- `otel.captureContent`：選用於 OTEL 範圍屬性的原始內容擷取功能。預設為關閉。布林值 `true` 會擷取非系統訊息/工具內容；物件形式讓您可以明確啟用 `inputMessages`、`outputMessages`、`toolInputs`、`toolOutputs` 和 `systemPrompt`。
- `OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental`：最新實驗性 GenAI 範圍提供者屬性的環境切換開關。預設情況下，範圍會保留舊版 `gen_ai.system` 屬性以維持相容性；GenAI 指標則使用有限語意屬性。
- `OPENCLAW_OTEL_PRELOADED=1`：針對已註冊全域 OpenTelemetry SDK 之主機的環境切換開關。OpenClaw 將跳過外掛擁有的 SDK 啟動/關閉，同時保持診斷監聽器處於啟用狀態。
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`、`OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` 和 `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT`：當未設定對應的配置鍵時，使用的特定訊號端點環境變數。
- `cacheTrace.enabled`：記錄嵌入式執行的快取追蹤快照 (預設：`false`)。
- `cacheTrace.filePath`：快取追蹤 JSONL 的輸出路徑 (預設：`$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`)。
- `cacheTrace.includeMessages` / `includePrompt` / `includeSystem`：控制快取追蹤輸出中包含的內容 (全部預設為：`true`)。

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

- `channel`：npm/git 安裝的發行通道 — `"stable"`、`"beta"` 或 `"dev"`。
- `checkOnStart`：當閘道啟動時檢查 npm 更新 (預設：`true`)。
- `auto.enabled`：啟用套件安裝的背景自動更新 (預設：`false`)。
- `auto.stableDelayHours`：穩定版通道自動套用前的最短延遲小時數 (預設：`6`；最大值：`168`)。
- `auto.stableJitterHours`：額外的穩定版通道推出分散視窗小時數 (預設：`12`；最大值：`168`)。
- `auto.betaCheckIntervalHours`：Beta 版通道檢查的運行頻率小時數 (預設：`1`；最大值：`24`)。

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

- `enabled`：全域 ACP 功能閘道 (預設：`true`；設定 `false` 以隱藏 ACP 分派和生成功能)。
- `dispatch.enabled`：ACP 會話輪次分派的獨立閘道 (預設：`true`)。設定 `false` 可在阻止執行的同時保持 ACP 指令可用。
- `backend`：預設 ACP 執行時後端 ID（必須符合已註冊的 ACP 執行時插件）。
  如果設定了 `plugins.allow`，請包含後端插件 ID（例如 `acpx`），否則內建的預設插件將不會載入。
- `defaultAgent`：當衍生未指定明確目標時的備用 ACP 目標代理程式 ID。
- `allowedAgents`：允許用於 ACP 執行時工作階段的代理程式 ID 白名單；空白表示沒有額外限制。
- `maxConcurrentSessions`：最大同時活躍 ACP 工作階段數。
- `stream.coalesceIdleMs`：串流文字的閒置排達視窗（毫秒）。
- `stream.maxChunkChars`：分割串流區塊投影前的最大區塊大小。
- `stream.repeatSuppression`：抑制每回合重複的狀態/工具行（預設：`true`）。
- `stream.deliveryMode`：`"live"` 漸進式串流；`"final_only"` 緩衝直到回合終端事件。
- `stream.hiddenBoundarySeparator`：隱藏工具事件後可見文字之前的分隔符（預設：`"paragraph"`）。
- `stream.maxOutputChars`：每個 ACP 回合投影的最大助理輸出字元數。
- `stream.maxSessionUpdateChars`：投影的 ACP 狀態/更新行的最大字元數。
- `stream.tagVisibility`：標籤名稱至布林值可見性覆寫的記錄，用於串流事件。
- `runtime.ttlMinutes`：ACP 工作階段工作者的閒置 TTL（分鐘），之後才符合清理資格。
- `runtime.installCommand`：啟動 ACP 執行時環境時執行的可選安裝指令。

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
  - `"off"`：無標語文字（仍會顯示橫幅標題/版本）。
- 若要隱藏整個橫幅（不只是標語），請設定環境變數 `OPENCLAW_HIDE_BANNER=1`。

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

## 身份

請參閱 [Agent defaults](/zh-Hant/gateway/config-agents#agent-defaults) 下的 `agents.list` 身份欄位。

---

## 橋接器 (舊版，已移除)

目前版本不再包含 TCP 橋接器。節點透過 Gateway WebSocket 連線。`bridge.*` 金鑰不再是設定結構描述的一部分 (必須移除否則驗證會失敗；`openclaw doctor --fix` 可移除未知金鑰)。

<Accordion title="舊版橋接器設定 (歷史參考)">

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

- `sessionRetention`：在從 `sessions.json` 修剪前保留已完成的隔離 cron 執行階段的時間長度。同時控制已封存之已刪除 cron 逐字稿的清理。預設值：`24h`；設定 `false` 以停用。
- `runLog.maxBytes`：修剪前每個執行記錄檔 (`cron/runs/<jobId>.jsonl`) 的最大大小。預設值：`2_000_000` 位元組。
- `runLog.keepLines`：觸發執行記錄修剪時保留的最新行數。預設值：`2000`。
- `webhookToken`：用於 cron webhook POST 傳遞 (`delivery.mode = "webhook"`) 的 bearer token，如果省略則不發送 auth 標頭。
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

- `maxAttempts`：暫時性錯誤時一次性工作的最大重試次數 (預設值：`3`；範圍：`0`–`10`)。
- `backoffMs`：每次重試嘗試的退避延遲毫秒數陣列 (預設值：`[30000, 60000, 300000]`；1–10 個項目)。
- `retryOn`: 觸發重試的錯誤類型 — `"rate_limit"`、`"overloaded"`、`"network"`、`"timeout"`、`"server_error"`。省略以重試所有暫時性類型。

僅適用於一次性 cron 工作。循環工作使用獨立的失敗處理機制。

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
- `includeSkipped`: 將連續跳過的執行計入警示閾值（預設：`false`）。跳過的執行會單獨追蹤，並不會影響執行錯誤的退避。
- `mode`: 傳遞模式 — `"announce"` 透過頻道訊息傳送；`"webhook"` 發布至設定的 webhook。
- `accountId`: 用於限制警示傳遞範圍的選用帳號或頻道 ID。

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

- 所有工作之 cron 失敗通知的預設目的地。
- `mode`: `"announce"` 或 `"webhook"`；當存在足夠的目標資料時，預設為 `"announce"`。
- `channel`: 公告傳遞的頻道覆寫。`"last"` 會重用最後已知的傳遞頻道。
- `to`: 明確的公告目標或 webhook URL。Webhook 模式必填。
- `accountId`: 傳遞的選用帳號覆寫。
- 各個工作的 `delivery.failureDestination` 會覆寫此全域預設值。
- 當未設定全域或各工作的失敗目的地時，已透過 `announce` 傳遞的工作在失敗時會備援至該主要公告目標。
- `delivery.failureDestination` 僅支援 `sessionTarget="isolated"` 任務，除非該任務的主要 `delivery.mode` 是 `"webhook"`。

請參閱 [Cron Jobs](/zh-Hant/automation/cron-jobs)。獨立的 cron 執行會被追蹤為 [background tasks](/zh-Hant/automation/tasks)。

---

## 媒體模型模板變數

在 `tools.media.models[].args` 中展開的模板預留位置：

| 變數               | 描述                                         |
| ------------------ | -------------------------------------------- |
| `{{Body}}`         | 完整的傳入訊息主體                           |
| `{{RawBody}}`      | 原始主體（無歷史/發送者包裝器）              |
| `{{BodyStripped}}` | 已移除群組提及的主體                         |
| `{{From}}`         | 發送者識別碼                                 |
| `{{To}}`           | 目的地識別碼                                 |
| `{{MessageSid}}`   | 頻道訊息 ID                                  |
| `{{SessionId}}`    | 目前的工作階段 UUID                          |
| `{{IsNewSession}}` | 建立新工作階段時的 `"true"`                  |
| `{{MediaUrl}}`     | 傳入媒體虛擬 URL                             |
| `{{MediaPath}}`    | 本機媒體路徑                                 |
| `{{MediaType}}`    | 媒體類型（圖片/音訊/文件/…）                 |
| `{{Transcript}}`   | 音訊逐字稿                                   |
| `{{Prompt}}`       | CLI 項目的解析媒體提示詞                     |
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
- 檔案陣列：按順序進行深度合併（後面的會覆蓋前面的）。
- 相鄰金鑰：在包含之後合併（覆蓋包含的值）。
- 巢狀包含：最多 10 層深。
- 路徑：相對於包含檔案解析，但必須保持在頂層設定目錄內（`dirname` of `openclaw.json`）。只有在解析結果仍位於該邊界內時，才允許使用絕對/`../` 形式。
- 由 OpenClaw 擁有的寫入操作，如果僅變更由單一檔案 include 支援的頂層區段，則會直接寫入該被 include 的檔案。例如，`plugins install` 會更新 `plugins.json5` 中的 `plugins: { $include: "./plugins.json5" }`，並保持 `openclaw.json` 不變。
- 對於由 OpenClaw 擁有的寫入操作，根層級 include、include 陣列以及具有同層級覆寫的 include 均為唯讀；這些寫入操作將失敗關閉，而不是扁平化設定。
- 錯誤：針對遺失檔案、解析錯誤和迴圈 include 提供明確的訊息。

---

_相關：[Configuration](/zh-Hant/gateway/configuration) · [Configuration Examples](/zh-Hant/gateway/configuration-examples) · [Doctor](/zh-Hant/gateway/doctor)_

## 相關

- [Configuration](/zh-Hant/gateway/configuration)
- [Configuration examples](/zh-Hant/gateway/configuration-examples)
