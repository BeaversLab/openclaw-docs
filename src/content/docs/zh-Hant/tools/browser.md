---
summary: "整合瀏覽器控制服務 + 動作指令"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "瀏覽器 (由 OpenClaw 管理)"
---

# 瀏覽器 (openclaw-managed)

OpenClaw 可以執行一個由代理程式控制的**專屬 Chrome/Brave/Edge/Chromium 設定檔**。
它與您的個人瀏覽器是隔離的，並透過 Gateway 內部的一個小型本機
控制服務進行管理（僅限回環）。

初學者觀點：

- 可以將其視為一個**獨立的、僅供代理程式使用的瀏覽器**。
- `openclaw` 設定檔**不會**觸及您的個人瀏覽器設定檔。
- 代理程式可以在安全通道中**開啟分頁、閱讀頁面、點擊和輸入**。
- 內建的 `user` 設定檔會透過 Chrome MCP 附加至您真實已登入的 Chrome 工作階段。

## 功能內容

- 一個名為 **openclaw** 的獨立瀏覽器設定檔（預設為橙色強調）。
- 確定性的分頁控制（列出/開啟/聚焦/關閉）。
- 代理程式動作（點擊/輸入/拖曳/選取）、快照、螢幕擷圖、PDF。
- 可選的多設定檔支援 (`openclaw`、`work`、`remote` 等)。

此瀏覽器**不是**您日常使用的瀏覽器。它是用於
代理程式自動化和驗證的安全、隔離介面。

## 快速入門

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果您收到「Browser disabled」（瀏覽器已停用），請在設定中啟用它（見下文）並重新啟動
Gateway。

如果完全缺少 `openclaw browser`，或者代理表示瀏覽器工具無法使用，請跳至[遺失瀏覽器指令或工具](/en/tools/browser#missing-browser-command-or-tool)。

## 外掛程式控制

預設的 `browser` 工具現在是隨附的套件外掛程式，預設為啟用狀態。這意味著您可以停用或取代它，而不會移除 OpenClaw 外掛程式系統的其餘部分：

```json5
{
  plugins: {
    entries: {
      browser: {
        enabled: false,
      },
    },
  },
}
```

在安裝其他提供相同 `browser` 工具名稱的外掛程式之前，請先停用隨附的套件外掛程式。預設的瀏覽器體驗需要同時具備：

- `plugins.entries.browser.enabled` 未停用
- `browser.enabled=true`

如果您僅關閉外掛程式，隨附的瀏覽器 CLI (`openclaw browser`)、Gateway 方法 (`browser.request`)、代理程式工具和預設瀏覽器控制服務都會一起消失。您的 `browser.*` 設定將保持完整，供取代的外掛程式重複使用。

隨附的瀏覽器外掛程式現在也擁有瀏覽器執行時期實作。核心僅保留共用的外掛程式 SDK 輔助程式，以及針對較舊內部匯入路徑的相容性重新匯出。實務上，移除或取代瀏覽器外掛程式套件會移除瀏覽器功能集，而不是留下第二個核心擁有的執行時期。

瀏覽器設定的變更仍然需要重新啟動 Gateway，以便隨附的外掛程式能使用新設定重新註冊其瀏覽器服務。

## 缺少瀏覽器指令或工具

如果 `openclaw browser` 在升級後突然變成未知指令，或者
代理程式回報瀏覽器工具遺失，最常見的原因是
限制性的 `plugins.allow` 列表未包含 `browser`。

錯誤設定範例：

```json5
{
  plugins: {
    allow: ["telegram"],
  },
}
```

請將 `browser` 加入到外掛允許列表來修復：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

重要注意事項：

- 當設定 `plugins.allow` 時，僅有 `browser.enabled=true` 是不夠的。
- 當設定 `plugins.allow` 時，僅有 `plugins.entries.browser.enabled=true` 也是不夠的。
- `tools.alsoAllow: ["browser"]` **並不會**載入內建的瀏覽器外掛。它只會在外掛已載入後調整工具原則。
- 如果您不需要限制性的外掛允許列表，移除 `plugins.allow` 也可以恢復預設的內建瀏覽器行為。

典型症狀：

- `openclaw browser` 是未知指令。
- `browser.request` 遺失。
- 代理程式回報瀏覽器工具無法使用或遺失。

## 設定檔：`openclaw` vs `user`

- `openclaw`：受管理、隔離的瀏覽器（不需要擴充功能）。
- `user`：內建 Chrome MCP 附加設定檔，用於您的 **真實已登入 Chrome**
  工作階段。

針對代理程式瀏覽器工具呼叫：

- 預設：使用隔離的 `openclaw` 瀏覽器。
- 當現有的登入工作階段很重要且使用者在電腦前點擊/批准任何附加提示時，
  較偏好使用 `profile="user"`。
- 當您想要特定的瀏覽器模式時，`profile` 是明確的覆寫設定。

如果您預設想要受管理模式，請設定 `browser.defaultProfile: "openclaw"`。

## 設定

瀏覽器設定位於 `~/.openclaw/openclaw.json`。

```json5
{
  browser: {
    enabled: true, // default: true
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: true, // default trusted-network mode
      // allowPrivateNetwork: true, // legacy alias
      // hostnameAllowlist: ["*.example.com", "example.com"],
      // allowedHostnames: ["localhost"],
    },
    // cdpUrl: "http://127.0.0.1:18792", // legacy single-profile override
    remoteCdpTimeoutMs: 1500, // remote CDP HTTP timeout (ms)
    remoteCdpHandshakeTimeoutMs: 3000, // remote CDP WebSocket handshake timeout (ms)
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: { cdpPort: 18801, color: "#0066CC" },
      user: {
        driver: "existing-session",
        attachOnly: true,
        color: "#00AA00",
      },
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
      remote: { cdpUrl: "http://10.0.0.42:9222", color: "#00AA00" },
    },
  },
}
```

備註：

- 瀏覽器控制服務會綁定到迴路介面的連接埠，該連接埠衍生自 `gateway.port`
  （預設：`18791`，即 gateway + 2）。
- 如果您覆寫 Gateway 連接埠（`gateway.port` 或 `OPENCLAW_GATEWAY_PORT`），
  衍生的瀏覽器連接埠會位移以保持在同一個「系列」中。
- 若未設定，`cdpUrl` 預設為受管理的本機 CDP 連接埠。
- `remoteCdpTimeoutMs` 適用於遠端（非 loopback）CDP 可達性檢查。
- `remoteCdpHandshakeTimeoutMs` 適用於遠端 CDP WebSocket 可達性檢查。
- 瀏覽器導航/開啟分頁在導航前會受到 SSRF 防護，並會在導航後盡力重新檢查最終的 `http(s)` URL。
- 在嚴格 SSRF 模式下，遠端 CDP 端點探索/探測（`cdpUrl`，包括 `/json/version` 查詢）也會受到檢查。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 預設為 `true`（受信任網路模型）。將其設為 `false` 以進行嚴格的僅公開瀏覽。
- `browser.ssrfPolicy.allowPrivateNetwork` 作為相容性的舊版別名仍受支援。
- `attachOnly: true` 表示「從不啟動本機瀏覽器；僅在瀏覽器已執行時附加」。
- `color` + 每個設定檔的 `color` 會為瀏覽器 UI 著色，讓您能看出目前是哪個設定檔處於啟用狀態。
- 預設設定檔是 `openclaw`（OpenClaw 管理的獨立瀏覽器）。使用 `defaultProfile: "user"` 以選擇使用已登入的使用者瀏覽器。
- 自動偵測順序：如果系統預設瀏覽器為 Chromium 架構則使用該瀏覽器；否則為 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本機 `openclaw` 設定檔會自動指派 `cdpPort`/`cdpUrl` — 僅針對遠端 CDP 設定這些值。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而非原始 CDP。請勿
  為該驅動程式設定 `cdpUrl`。
- 當現有工作階段設定檔
  應附加至非預設的 Chromium 使用者設定檔（例如 Brave 或 Edge）時，請設定 `browser.profiles.<name>.userDataDir`。

## 使用 Brave（或其他 Chromium 架構的瀏覽器）

如果您的 **系統預設** 瀏覽器是 Chromium 架構（Chrome/Brave/Edge 等），
OpenClaw 會自動使用它。設定 `browser.executablePath` 以覆寫
自動偵測：

CLI 範例：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
```

```json5
// macOS
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
  }
}

// Windows
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"
  }
}

// Linux
{
  browser: {
    executablePath: "/usr/bin/brave-browser"
  }
}
```

## 本機與遠端控制

- **本機控制（預設）：** Gateway 會啟動 loopback 控制服務，並可以啟動本機瀏覽器。
- **遠端控制（node 主機）：** 在擁有瀏覽器的機器上執行 node 主機；Gateway 會將瀏覽器操作代理給它。
- **Remote CDP：** 設定 `browser.profiles.<name>.cdpUrl` (或 `browser.cdpUrl`) 以
  連接到遠端的 Chromium 瀏覽器。在此情況下，OpenClaw 將不會啟動本機瀏覽器。

停止行為因設定檔模式而異：

- 本機管理設定檔：`openclaw browser stop` 會停止 OpenClaw 啟動的瀏覽器程序
- 僅附加 和遠端 CDP 設定檔：`openclaw browser stop` 會關閉使用中的
  控制工作階段並釋放 Playwright/CDP 模擬覆寫（視口、
  色彩配置、地區設定、時區、離線模式及類似狀態），即使
  OpenClaw 並未啟動任何瀏覽器程序

遠端 CDP URL 可以包含認證：

- 查詢權杖（例如 `https://provider.example?token=<token>`）
- HTTP 基本認證（例如 `https://user:pass@provider.example`）

當呼叫 `/json/*` 端點以及連線至
CDP WebSocket 時，OpenClaw 會保留認證。對於權杖，建議優先使用環境變數或秘密管理器，
而非將其提交至設定檔。

## 節點瀏覽器代理（零設定預設值）

如果您在擁有瀏覽器的機器上執行 **節點主機**，OpenClaw 可以
在無需額外瀏覽器設定的情況下，將瀏覽器工具呼叫自動路由至該節點。
這是遠端閘道的預設路徑。

註記：

- 節點主機透過 **代理指令** 公開其本機瀏覽器控制伺服器。
- 設定檔來自節點本身的 `browser.profiles` 設定（與本機相同）。
- `nodeHost.browserProxy.allowProfiles` 是選用的。將其留空以使用舊版/預設行為：所有已設定的設定檔均可透過代理存取，包括設定檔建立/刪除路由。
- 如果您設定 `nodeHost.browserProxy.allowProfiles`，OpenClaw 會將其視為最小權限邊界：只有列入白名單的設定檔才能被指定，且永久性設定檔建立/刪除路由會在代理表層被封鎖。
- 如果您不想要它，請將其停用：
  - 在節點上：`nodeHost.browserProxy.enabled=false`
  - 在閘道上：`gateway.nodes.browser.mode="off"`

## Browserless（託管的遠端 CDP）

[Browserless](https://browserless.io) 是一項託管的 Chromium 服務，透過 HTTPS 和 WebSocket 公開
CDP 連線 URL。OpenClaw 可以使用任一種形式，但
對於遠端瀏覽器設定檔，最簡單的選項是來自 Browserless 連線文件的直接 WebSocket URL。

範例：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    remoteCdpTimeoutMs: 2000,
    remoteCdpHandshakeTimeoutMs: 4000,
    profiles: {
      browserless: {
        cdpUrl: "wss://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

註記：

- 將 `<BROWSERLESS_API_KEY>` 替換為您的真實 Browserless token。
- 選擇與您的 Browserless 帳戶相符的區域端點（請參閱其文件）。
- 如果 Browserless 提供了 HTTPS 基礎 URL，您可以將其轉換為 `wss://` 以進行直接 CDP 連線，或者保留 HTTPS URL 讓 OpenClaw 自動探索 `/json/version`。

## 直接 WebSocket CDP 提供商

某些託管瀏覽器服務公開 **直接 WebSocket** 端點，而不是標準的基於 HTTP 的 CDP 探索（`/json/version`）。OpenClaw 支援這兩種方式：

- **HTTP(S) 端點** — OpenClaw 呼叫 `/json/version` 來探索 WebSocket 除錯器 URL，然後進行連線。
- **WebSocket 端點**（`ws://` / `wss://`） — OpenClaw 直接連線，跳過 `/json/version`。將其用於諸如 [Browserless](https://browserless.io)、[Browserbase](https://www.browserbase.com) 或任何提供您 WebSocket URL 的提供商等服務。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一個用於執行無頭瀏覽器的雲端平台，內建 CAPTCHA 解決、隱身模式和住宅代理。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserbase",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      browserbase: {
        cdpUrl: "wss://connect.browserbase.com?apiKey=<BROWSERBASE_API_KEY>",
        color: "#F97316",
      },
    },
  },
}
```

備註：

- [註冊](https://www.browserbase.com/sign-up) 並從 [總覽儀表板](https://www.browserbase.com/overview) 複製您的 **API 金鑰**。
- 將 `<BROWSERBASE_API_KEY>` 替換為您的真實 Browserbase API 金鑰。
- Browserbase 會在 WebSocket 連線時自動建立瀏覽器會話，因此不需要手動建立會話的步驟。
- 免費層級允許一個並行會話和每月一個瀏覽器小時。請參閱 [價格](https://www.browserbase.com/pricing) 以了解付費方案的限量。
- 請參閱 [Browserbase 文件](https://docs.browserbase.com) 以取得完整的 API 參考、SDK 指南和整合範例。

## 安全性

重點概念：

- 瀏覽器控制僅限本機回送；存取流程透過 Gateway 的驗證或節點配對。
- 獨立本機回送瀏覽器 HTTP API 僅使用 **共用金鑰驗證**：gateway token bearer 驗證、`x-openclaw-password`，或使用已設定的 gateway 密碼進行 HTTP Basic 驗證。
- Tailscale Serve 身份標頭和 `gateway.auth.mode: "trusted-proxy"` **不會** 對此獨立本機回送瀏覽器 API 進行驗證。
- 如果啟用瀏覽器控制且未配置共享密鑰身份驗證，OpenClaw 會在啟動時自動生成 `gateway.auth.token` 並將其持久化到配置中。
- 當 `gateway.auth.mode` 已經是 `password`、`none` 或 `trusted-proxy` 時，OpenClaw 不會自動生成該令牌。
- 將 Gateway 和任何節點主機保持在私有網絡 上；避免公開暴露。
- 將遠端 CDP URL/令牌視為秘密；優先使用環境變數或秘密管理器。

遠端 CDP 提示：

- 盡可能使用加密端點 (HTTPS 或 WSS) 和短期令牌。
- 避免將長期令牌直接嵌入配置檔案中。

## 設定檔 (多瀏覽器)

OpenClaw 支援多個命名設定檔 (路由配置)。設定檔可以是：

- **openclaw-managed**：一個專屬的基於 Chromium 的瀏覽器實例，擁有自己的使用者資料目錄 + CDP 連接埠
- **remote**：一個明確的 CDP URL (在其他地方運行的基於 Chromium 的瀏覽器)
- **existing session**：透過 Chrome DevTools MCP 自動連線連接到您現有的 Chrome 設定檔

預設值：

- 如果缺少 `openclaw` 設定檔，將會自動建立。
- `user` 設定檔是內建的，用於 Chrome MCP 現有會話附加。
- 除了 `user` 之外，現有會話設定檔是可選加入的；請使用 `--driver existing-session` 建立它們。
- 本機 CDP 連接埠預設從 **18800–18899** 分配。
- 刪除設定檔會將其本機資料目錄移至垃圾桶。

所有控制端點都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 透過 Chrome DevTools MCP 使用現有會話

OpenClaw 也可以透過官方 Chrome DevTools MCP 伺服器附加到正在運行的基於 Chromium 的瀏覽器設定檔。這會重複使用該瀏覽器設定檔中已開啟的分頁和登入狀態。

官方背景和設定參考：

- [Chrome for Developers: Use Chrome DevTools MCP with your browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

內建設定檔：

- `user`

可選：如果您想要不同的名稱、顏色或瀏覽器資料目錄，請建立您自己的自訂現有會話設定檔。

預設行為：

- 內建的 `user` 設定檔使用 Chrome MCP 自動連線，其目標是
  預設的本機 Google Chrome 設定檔。

若為 Brave、Edge、Chromium 或非預設的 Chrome 設定檔，請使用 `userDataDir`：

```json5
{
  browser: {
    profiles: {
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
        color: "#FB542B",
      },
    },
  },
}
```

然後在相符的瀏覽器中：

1. 開啟該瀏覽器用於遠端偵錯的檢查頁面。
2. 啟用遠端偵錯。
3. 保持瀏覽器執行，並在 OpenClaw 連線時核准連線提示。

常見的檢查頁面：

- Chrome：`chrome://inspect/#remote-debugging`
- Brave：`brave://inspect/#remote-debugging`
- Edge：`edge://inspect/#remote-debugging`

即時連線基礎測試：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功的樣貌：

- `status` 顯示 `driver: existing-session`
- `status` 顯示 `transport: chrome-mcp`
- `status` 顯示 `running: true`
- `tabs` 列出您已開啟的瀏覽器分頁
- `snapshot` 從選取的即時分頁返回參照

如果連線無法運作，請檢查：

- 目標的 Chromium 型瀏覽器版本為 `144+`
- 在該瀏覽器的檢查頁面中已啟用遠端偵錯
- 瀏覽器已顯示且您已接受連線同意提示
- `openclaw doctor` 會遷移舊的擴充功能型瀏覽器設定，並檢查
  本機是否已安裝 Chrome 以供預設自動連線設定檔使用，但它
  無法為您啟用瀏覽器端的遠端偵錯

Agent 使用方式：

- 當您需要使用者的已登入瀏覽器狀態時，請使用 `profile="user"`。
- 如果您使用自訂的現有工作階段設定檔，請傳入該明確的設定檔名稱。
- 僅當使用者位於電腦前以核准連線
  提示時，才選擇此模式。
- Gateway 或節點主機可以產生 `npx chrome-devtools-mcp@latest --autoConnect`

備註：

- 此路徑的風險高於隔離的 `openclaw` 設定檔，因為它
  可在您已登入的瀏覽器工作階段中執行動作。
- OpenClaw 不會為此驅動程式啟動瀏覽器；它僅會連線至
  現有的工作階段。
- OpenClaw 在此使用官方的 Chrome DevTools MCP `--autoConnect` 流程。如果
  設定了 `userDataDir`，OpenClaw 會將其傳入，以目標指向該
  明確的 Chromium 使用者資料目錄。
- 現有工作階段的螢幕擷圖支援頁面擷取以及從快照中擷取 `--ref` 元素，但不支援 CSS `--element` 選擇器。
- 現有工作階段的頁面螢幕擷圖可透過 Chrome MCP 在不使用 Playwright 的情況下運作。基於參考的元素螢幕擷圖 (`--ref`) 也可在那裡運作，但 `--full-page` 不能與 `--ref` 或 `--element` 結合使用。
- 現有工作階段的動作仍比受管理瀏覽器路徑受到更多限制：
  - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要快照參考，而非 CSS 選擇器
  - `click` 僅限左鍵 (沒有按鍵覆寫或修飾鍵)
  - `type` 不支援 `slowly=true`；請使用 `fill` 或 `press`
  - `press` 不支援 `delayMs`
  - `hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支援每次呼叫的逾時覆寫
  - `select` 目前僅支援單一值
- 現有工作階段 `wait --url` 支援精確、子字串和全域模式，就像其他瀏覽器驅動程式一樣。尚不支援 `wait --load networkidle`。
- 現有工作階段的上傳掛鉤需要 `ref` 或 `inputRef`，一次支援一個檔案，且不支援 CSS `element` 定位。
- 現有工作階段的對話方塊掛鉤不支援逾時覆寫。
- 某些功能仍需要受管理瀏覽器路徑，包括批次動作、PDF 匯出、下載攔截和 `responsebody`。
- 現有工作階段是主機本地的。如果 Chrome 位於不同的機器或不同的網路命名空間中，請改用遠端 CDP 或節點主機。

## 隔離保證

- **專用使用者資料目錄**：絕不會觸及您的個人瀏覽器設定檔。
- **專用連接埠**：避免使用 `9222` 以防止與開發工作流程發生衝突。
- **確定性分頁控制**：透過 `targetId` 鎖定目標分頁，而非「最後一個分頁」。

## 瀏覽器選擇

當在本機啟動時，OpenClaw 會選擇第一個可用的瀏覽器：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 覆寫。

平台：

- macOS：檢查 `/Applications` 和 `~/Applications`。
- Linux：尋找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等。
- Windows：檢查常見的安裝位置。

## 控制 API (選用)

僅供本機整合使用，Gateway 會公開一個小型迴路 HTTP API：

- 狀態/啟動/停止：`GET /`、`POST /start`、`POST /stop`
- 分頁：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/擷圖：`GET /snapshot`、`POST /screenshot`
- 動作：`POST /navigate`、`POST /act`
- 掛鉤：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下載：`POST /download`、`POST /wait/download`
- 偵錯：`GET /console`、`POST /pdf`
- 偵錯：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 網路：`POST /response/body`
- 狀態：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 狀態：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 設定：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端點都接受 `?profile=<name>`。

如果配置了共享金鑰 gateway 身份驗證，瀏覽器 HTTP 路由也需要身份驗證：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用該密碼進行 HTTP 基本身份驗證

備註：

- 此獨立 loopback 瀏覽器 API **不會**使用 trusted-proxy 或
  Tailscale Serve 身份標頭。
- 如果 `gateway.auth.mode` 為 `none` 或 `trusted-proxy`，這些 loopback 瀏覽器
  路由不會繼承這些承載身分的模式；請保持其僅限 loopback 存取。

### Playwright 需求

某些功能（導航/操作/AI 快照/角色快照、元素截圖、
PDF）需要 Playwright。如果未安裝 Playwright，這些端點將返回
明確的 501 錯誤。

沒有 Playwright 仍然可以運作的功能：

- ARIA 快照
- 當有分頁 CDP WebSocket 可用時，針對受管理的 `openclaw` 瀏覽器的頁面截圖
- 針對 `existing-session` / Chrome MCP 設定檔的頁面截圖
- 來自快照輸出的 `existing-session` ref-based 截圖 (`--ref`)

仍然需要 Playwright 的功能：

- `navigate`
- `act`
- AI 快照 / 角色快照
- CSS 選擇器元素截圖 (`--element`)
- 完整瀏覽器 PDF 匯出

元素截圖也會拒絕 `--full-page`；路由會返回 `fullPage is
not supported for element screenshots`。

如果您看到 `Playwright is not available in this gateway build`，請安裝完整的
Playwright 套件（而不是 `playwright-core`）並重新啟動 gateway，或重新安裝
包含瀏覽器支援的 OpenClaw。

#### Docker Playwright 安裝

如果您的 Gateway 在 Docker 中運行，請避免 `npx playwright`（npm 覆蓋衝突）。
請改用捆綁的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

若要保存瀏覽器下載內容，請設定 `PLAYWRIGHT_BROWSERS_PATH` (例如
`/home/node/.cache/ms-playwright`) 並確保 `/home/node` 透過
`OPENCLAW_HOME_VOLUME` 或綁定掛載 (bind mount) 保存。請參閱 [Docker](/en/install/docker)。

## 運作方式 (內部)

高層級流程：

- 一個小型的 **控制伺服器 (control server)** 接受 HTTP 請求。
- 它透過 **CDP** 連線至基於 Chromium 的瀏覽器 (Chrome/Brave/Edge/Chromium)。
- 針對進階操作 (點擊/輸入/快照/PDF)，它會在 CDP 之上使用
  **Playwright**。
- 當缺少 Playwright 時，僅可使用非 Playwright 操作。

這項設計讓 Agent 保持在穩定、確定的介面上，同時允許
您交換本機/遠端瀏覽器和設定檔。

## CLI 快速參考

所有指令都接受 `--browser-profile <name>` 以指定特定的設定檔。
所有指令也接受 `--json` 以取得機器可讀的輸出 (穩定的負載)。

基礎：

- `openclaw browser status`
- `openclaw browser start`
- `openclaw browser stop`
- `openclaw browser tabs`
- `openclaw browser tab`
- `openclaw browser tab new`
- `openclaw browser tab select 2`
- `openclaw browser tab close 2`
- `openclaw browser open https://example.com`
- `openclaw browser focus abcd1234`
- `openclaw browser close abcd1234`

檢查：

- `openclaw browser screenshot`
- `openclaw browser screenshot --full-page`
- `openclaw browser screenshot --ref 12`
- `openclaw browser screenshot --ref e12`
- `openclaw browser snapshot`
- `openclaw browser snapshot --format aria --limit 200`
- `openclaw browser snapshot --interactive --compact --depth 6`
- `openclaw browser snapshot --efficient`
- `openclaw browser snapshot --labels`
- `openclaw browser snapshot --selector "#main" --interactive`
- `openclaw browser snapshot --frame "iframe#main" --interactive`
- `openclaw browser console --level error`

生命週期備註：

- 對於僅附加和遠端 CDP 設定檔，`openclaw browser stop` 仍是測試後
  正確的清理指令。它會關閉作用中的控制工作階段並
  清除暫時模擬覆寫，而不是終止底層
  瀏覽器。
- `openclaw browser errors --clear`
- `openclaw browser requests --filter api --clear`
- `openclaw browser pdf`
- `openclaw browser responsebody "**/api" --max-chars 5000`

操作：

- `openclaw browser navigate https://example.com`
- `openclaw browser resize 1280 720`
- `openclaw browser click 12 --double`
- `openclaw browser click e12 --double`
- `openclaw browser type 23 "hello" --submit`
- `openclaw browser press Enter`
- `openclaw browser hover 44`
- `openclaw browser scrollintoview e12`
- `openclaw browser drag 10 11`
- `openclaw browser select 9 OptionA OptionB`
- `openclaw browser download e12 report.pdf`
- `openclaw browser waitfordownload report.pdf`
- `openclaw browser upload /tmp/openclaw/uploads/file.pdf`
- `openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'`
- `openclaw browser dialog --accept`
- `openclaw browser wait --text "Done"`
- `openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"`
- `openclaw browser evaluate --fn '(el) => el.textContent' --ref 7`
- `openclaw browser highlight e12`
- `openclaw browser trace start`
- `openclaw browser trace stop`

狀態：

- `openclaw browser cookies`
- `openclaw browser cookies set session abc123 --url "https://example.com"`
- `openclaw browser cookies clear`
- `openclaw browser storage local get`
- `openclaw browser storage local set theme dark`
- `openclaw browser storage session clear`
- `openclaw browser set offline on`
- `openclaw browser set headers --headers-json '{"X-Debug":"1"}'`
- `openclaw browser set credentials user pass`
- `openclaw browser set credentials --clear`
- `openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"`
- `openclaw browser set geo --clear`
- `openclaw browser set media dark`
- `openclaw browser set timezone America/New_York`
- `openclaw browser set locale en-US`
- `openclaw browser set device "iPhone 14"`

備註：

- `upload` 和 `dialog` 是**準備 (arming)** 呼叫；在觸發選擇器/對話框的點擊/按下之前執行它們。
- 下載和追蹤輸出路徑被限制在 OpenClaw 暫存根目錄中：
  - 追蹤：`/tmp/openclaw` (後備：`${os.tmpdir()}/openclaw`)
  - 下載：`/tmp/openclaw/downloads` (後備：`${os.tmpdir()}/openclaw/downloads`)
- 上傳路徑被限制在 OpenClaw 暫存上傳根目錄中：
  - 上傳：`/tmp/openclaw/uploads` (後備：`${os.tmpdir()}/openclaw/uploads`)
- `upload` 也可以透過 `--input-ref` 或 `--element` 直接設定檔案輸入。
- `snapshot`：
  - `--format ai` (安裝 Playwright 時的預設值)：傳回帶有數字參照 (`aria-ref="<n>"`) 的 AI 快照。
  - `--format aria`：傳回無障礙樹（無參照；僅供檢查）。
  - `--efficient`（或 `--mode efficient`）：精簡角色快照預設（互動 + 精簡 + 深度 + 較低 maxChars）。
  - 設定預設值（僅限工具/CLI）：設定 `browser.snapshotDefaults.mode: "efficient"` 以在呼叫者未傳遞模式時使用有效率的快照（請參閱 [Gateway 設定](/en/gateway/configuration-reference#browser)）。
  - 角色快照選項（`--interactive`、`--compact`、`--depth`、`--selector`）會強制使用包含如 `ref=e12` 等參照的基礎角色快照。
  - `--frame "<iframe selector>"` 將角色快照的範圍限制在 iframe（與如 `e12` 的角色參照配對）。
  - `--interactive` 輸出一個扁平、易於挑選的互動元素列表（最適合用於驅動動作）。
  - `--labels` 加入僅限視口的螢幕截圖，並覆蓋參照標籤（列印 `MEDIA:<path>`）。
- `click`/`type`/等需要一個來自 `snapshot` 的 `ref`（可以是數字 `12` 或角色參照 `e12`）。
  動作刻意不支援 CSS 選擇器。

## 快照與參照

OpenClaw 支援兩種「快照」樣式：

- **AI 快照（數字參照）**：`openclaw browser snapshot`（預設；`--format ai`）
  - 輸出：包含數字參照的文字快照。
  - 動作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在內部，參照是透過 Playwright 的 `aria-ref` 解析的。

- **角色快照（如 `e12` 的角色參照）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 輸出：帶有 `[ref=e12]`（以及選用的 `[nth=1]`）的基礎角色列表/樹。
  - 動作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在內部，該 ref 是透過 `getByRole(...)` 解析的（對於重複項則加上 `nth()`）。
  - 新增 `--labels` 以包含帶有覆蓋層 `e12` 標籤的視口截圖。

Ref 行為：

- Ref 在頁面導航之間**不穩定**；如果操作失敗，請重新執行 `snapshot` 並使用新的 ref。
- 如果角色快照是使用 `--frame` 拍攝的，則角色 ref 的作用域限定為該 iframe，直到下一個角色快照為止。

## 等待強化功能

您可以等待的不僅僅是時間/文字：

- 等待 URL（Playwright 支援的 glob 模式）：
  - `openclaw browser wait --url "**/dash"`
- 等待載入狀態：
  - `openclaw browser wait --load networkidle`
- 等待 JS 述詞：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待選擇器變為可見：
  - `openclaw browser wait "#main"`

這些可以組合使用：

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## 除錯工作流程

當動作失敗時（例如「not visible」、「strict mode violation」、「covered」）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在互動模式下建議優先使用 role refs）
3. 如果仍然失敗：`openclaw browser highlight <ref>` 以查看 Playwright 的目標
4. 如果頁面行為異常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 進行深度除錯：記錄追蹤：
   - `openclaw browser trace start`
   - 重現問題
   - `openclaw browser trace stop`（列印 `TRACE:<path>`）

## JSON 輸出

`--json` 用於腳本和結構化工具。

範例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包含 `refs` 以及一個小型的 `stats` 區塊（行/字元/refs/互動），以便工具可以推斷負載大小和密度。

## 狀態與環境設定

這些對於「讓網站表現得像 X」的工作流程很有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- Storage：`storage local|session get|set|clear`
- 離線：`set offline on|off`
- 標頭：`set headers --headers-json '{"X-Debug":"1"}'`（舊版 `set headers --json '{"X-Debug":"1"}'` 仍受支援）
- HTTP 基本身份驗證：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒體：`set media dark|light|no-preference|none`
- 時區 / 語言地區：`set timezone ...`，`set locale ...`
- 裝置 / 檢視區：
  - `set device "iPhone 14"`（Playwright 裝置預設）
  - `set viewport 1280 720`

## 安全與隱私

- openclaw 瀏覽器設定檔可能包含已登入的工作階段；請將其視為敏感資料。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  會在頁面上下文中執行任意的 JavaScript。提示注入可能會操縱
  這一點。如果您不需要它，請使用 `browser.evaluateEnabled=false` 來停用它。
- 關於登入和防機器人說明（X/Twitter 等），請參閱 [Browser login + X/Twitter posting](/en/tools/browser-login)。
- 請保持 Gateway/node 主機為私有（僅限 loopback 或 tailnet）。
- 遠端 CDP 端點非常強大；請將其置於隧道並加以保護。

嚴格模式範例（預設封鎖私有/內部目的地）：

```json5
{
  browser: {
    ssrfPolicy: {
      dangerouslyAllowPrivateNetwork: false,
      hostnameAllowlist: ["*.example.com", "example.com"],
      allowedHostnames: ["localhost"], // optional exact allow
    },
  },
}
```

## 疑難排解

關於 Linux 特定問題（特別是 snap Chromium），請參閱
[Browser troubleshooting](/en/tools/browser-linux-troubleshooting)。

關於 WSL2 Gateway + Windows Chrome 分割主機設定，請參閱
[WSL2 + Windows + remote Chrome CDP troubleshooting](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

## Agent 工具 + 控制運作方式

Agent 會獲得**一個工具**用於瀏覽器自動化：

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

運作對應方式：

- `browser snapshot` 會傳回穩定的 UI 樹狀結構（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 來進行點擊/輸入/拖曳/選取。
- `browser screenshot` 會擷取像素（完整頁面或元素）。
- `browser` 接受：
  - `profile` 以選擇具名的瀏覽器設定檔（openclaw、chrome 或遠端 CDP）。
  - `target` (`sandbox` | `host` | `node`) 以選擇瀏覽器的所在位置。
  - 在沙箱化工作階段中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙箱化工作階段預設為 `sandbox`，非沙箱工作階段預設為 `host`。
  - 如果連接了支援瀏覽器的節點，該工具可能會自動路由到該節點，除非您指定了 `target="host"` 或 `target="node"`。

這能保持 Agent 的確定性，並避免脆弱的選擇器。

## 相關

- [工具概覽](/en/tools) — 所有可用的 Agent 工具
- [沙箱機制](/en/gateway/sandboxing) — 在沙箱環境中的瀏覽器控制
- [安全性](/en/gateway/security) — 瀏覽器控制的風險與強化防護
