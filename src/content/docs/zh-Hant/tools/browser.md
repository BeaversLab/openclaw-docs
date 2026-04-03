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

如果完全缺少 `openclaw browser`，或者代理程式表示瀏覽器工具無法使用，請跳至 [缺少瀏覽器指令或工具](/en/tools/browser#missing-browser-command-or-tool)。

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

Remote CDP URLs 可以包含認證資訊：

- Query tokens (例如 `https://provider.example?token=<token>`)
- HTTP Basic auth (例如 `https://user:pass@provider.example`)

OpenClaw 在呼叫 `/json/*` 端點以及連線
到 CDP WebSocket 時會保留認證資訊。對於 token，建議優先使用環境變數或機密管理工具，
而不是將其提交到設定檔中。

## Node 瀏覽器代理 (零設定預設值)

如果您在擁有瀏覽器的機器上執行 **node host**，OpenClaw 可以
在不進行任何額外瀏覽器設定的情況下，將瀏覽器工具呼叫自動路由到該節點。
這是遠端 gateway 的預設路徑。

備註：

- Node host 透過 **proxy command** 公開其本機瀏覽器控制伺服器。
- Profiles 來自於節點自己的 `browser.profiles` 設定 (與本機相同)。
- `nodeHost.browserProxy.allowProfiles` 是選用的。將其留空以使用傳統/預設行為：所有設定的 profiles 均可透過 proxy 存取，包括 profile 建立/刪除路由。
- 如果您設定了 `nodeHost.browserProxy.allowProfiles`，OpenClaw 會將其視為最低權限邊界：僅允許存取白名單中的 profiles，並且在 proxy 表面上阻擋持久性 profile 的建立/刪除路由。
- 如果您不想要這項功能，可以將其停用：
  - 在節點上： `nodeHost.browserProxy.enabled=false`
  - 在 gateway 上： `gateway.nodes.browser.mode="off"`

## Browserless (託管的遠端 CDP)

[Browserless](https://browserless.io) 是一項託管的 Chromium 服務，透過 HTTPS 和 WebSocket 公開
CDP 連線 URL。OpenClaw 可以使用任一種形式，但
對於遠端瀏覽器 profile，最簡單的選項是來自 Browserless 連線文件的直接 WebSocket URL。

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

備註：

- 將 `<BROWSERLESS_API_KEY>` 取換為您真實的 Browserless token。
- 選擇符合您 Browserless 帳戶的區域端點 (請參閱其文件)。
- 如果 Browserless 提供給您一個 HTTPS 基礎 URL，您可以將其轉換為
  `wss://` 以進行直接 CDP 連線，或者保留 HTTPS URL 並讓 OpenClaw
  自動探索 `/json/version`。

## 直接 WebSocket CDP 提供者

某些託管的瀏覽器服務公開的是 **直接 WebSocket** 端點，而不是
標準的基於 HTTP 的 CDP 探索 (`/json/version`)。OpenClaw 兩者都支援：

- **HTTP(S) 端點** — OpenClaw 呼叫 `/json/version` 來探索
  WebSocket 除錯器 URL，然後進行連線。
- **WebSocket 端點** (`ws://` / `wss://`) — OpenClaw 直接連線，
  跳過 `/json/version`。將此用於
  [Browserless](https://browserless.io)、
  [Browserbase](https://www.browserbase.com) 或任何提供您
  WebSocket URL 的提供商。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一個用於執行
無頭瀏覽器的雲端平台，具有內建的 CAPTCHA 解決、隱身模式和住家
代理。

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
- 將 `<BROWSERBASE_API_KEY>` 替換為您真實的 Browserbase API 金鑰。
- Browserbase 會在 WebSocket 連線時自動建立瀏覽器連線階段，因此
  不需要手動建立連線階段。
- 免費層級允許一個併發連線階段和每月一個瀏覽器小時。
  請參閱 [定價](https://www.browserbase.com/pricing) 以了解付費方案的限量。
- 請參閱 [Browserbase 文件](https://docs.browserbase.com) 以獲得完整的 API
  參考資料、SDK 指南和整合範例。

## 安全性

重點概念：

- 瀏覽器控制僅限回送；存取流程透過 Gateway 的驗證或節點配對。
- 如果啟用了瀏覽器控制且未設定驗證，OpenClaw 會在啟動時自動產生 `gateway.auth.token` 並將其保存至設定中。
- 將 Gateway 和任何節點主機保持在私人網路上；避免公開暴露。
- 將遠端 CDP URL/權杖視為機密；優先使用環境變數或機密管理器。

遠端 CDP 提示：

- 盡可能優先使用加密端點 (HTTPS 或 WSS) 和短期權杖。
- 避免直接在設定檔中嵌入長期權杖。

## 設定檔 (多瀏覽器)

OpenClaw 支援多個具名設定檔 (路由設定)。設定檔可以是：

- **openclaw-managed**：一個專屬的基於 Chromium 的瀏覽器執行個體，擁有自己的使用者資料目錄 + CDP 連接埠
- **remote**：一個明確的 CDP URL（在其他地方執行的基於 Chromium 的瀏覽器）
- **existing session**：您現有的 Chrome 設定檔，透過 Chrome DevTools MCP 自動連線

預設值：

- 如果缺少 `openclaw` 設定檔，則會自動建立。
- `user` 設定檔是內建的，用於 Chrome MCP 現有會話附加。
- 除了 `user` 之外，現有會話設定檔是選擇加入的；請使用 `--driver existing-session` 建立它們。
- 本機 CDP 連接埠預設從 **18800–18899** 分配。
- 刪除設定檔會將其本機資料目錄移至垃圾桶。

所有控制端點都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 透過 Chrome DevTools MCP 連線現有會話

OpenClaw 也可以透過官方 Chrome DevTools MCP 伺服器附加到正在執行的基於 Chromium 的瀏覽器設定檔。這會重複使用該瀏覽器設定檔中已開啟的分頁和登入狀態。

官方背景和設定參考：

- [Chrome for Developers: Use Chrome DevTools MCP with your browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

內建設定檔：

- `user`

選用：如果您想要不同的名稱、顏色或瀏覽器資料目錄，請建立您自己的自訂現有會話設定檔。

預設行為：

- 內建的 `user` 設定檔使用 Chrome MCP 自動連線，其目標是預設的本機 Google Chrome 設定檔。

對於 Brave、Edge、Chromium 或非預設的 Chrome 設定檔，請使用 `userDataDir`：

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

然後在對應的瀏覽器中：

1. 開啟該瀏覽器的檢查頁面以進行遠端偵錯。
2. 啟用遠端偵錯。
3. 讓瀏覽器保持執行，並在 OpenClaw 附加時批准連線提示。

常見的檢查頁面：

- Chrome：`chrome://inspect/#remote-debugging`
- Brave：`brave://inspect/#remote-debugging`
- Edge：`edge://inspect/#remote-debugging`

即時附加測試：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功的樣子：

- `status` 顯示 `driver: existing-session`
- `status` 顯示 `transport: chrome-mcp`
- `status` 顯示 `running: true`
- `tabs` 列出您已開啟的瀏覽器分頁
- `snapshot` 從選定的即時分頁返回參照

如果附加無法運作，請檢查：

- 目標 Chromium 系瀏覽器版本為 `144+`
- 已在該瀏覽器的檢查頁面中啟用遠端偵錯
- 瀏覽器已顯示，且您已接受附加同意提示
- `openclaw doctor` 會遷移舊的擴充功能式瀏覽器設定，並檢查本機是否
  已安裝 Chrome 以用於預設的自動連線設定檔，但
  它無法為您啟用瀏覽器端的遠端偵錯

Agent 使用方式：

- 當您需要使用者的已登入瀏覽器狀態時，請使用 `profile="user"`。
- 如果您使用自訂的 existing-session 設定檔，請傳入該明確的設定檔名稱。
- 僅當使用者在電腦前以批准附加提示時，才選擇此模式。
- Gateway 或節點主機可以產生 `npx chrome-devtools-mcp@latest --autoConnect`

注意事項：

- 此途徑的風險高於隔離的 `openclaw` 設定檔，因為它可以
  在您已登入的瀏覽器工作階段中運作。
- OpenClaw 不會為此驅動程式啟動瀏覽器；它僅附加至
  現有的工作階段。
- OpenClaw 在此使用官方的 Chrome DevTools MCP `--autoConnect` 流程。如果
  設定了 `userDataDir`，OpenClaw 會將其傳遞以鎖定該
  明確的 Chromium 使用者資料目錄。
- Existing-session 截圖支援頁面擷取和來自快照的 `--ref` 元素
  擷取，但不支援 CSS `--element` 選擇器。
- Existing-session `wait --url` 支援精確、子字串和 glob 模式，
  就像其他瀏覽器驅動程式一樣。`wait --load networkidle` 尚未支援。
- 某些功能仍然需要受控瀏覽器途徑，例如 PDF 匯出和
  下載攔截。
- Existing-session 是主機本機的。如果 Chrome 位於不同的機器或
  不同的網路命名空間，請改用遠端 CDP 或節點主機。

## 隔離保證

- **專用使用者資料目錄**：絕不會觸及您的個人瀏覽器設定檔。
- **專用連接埠**：避免 `9222` 以防止與開發工作流程衝突。
- **確定性分頁控制**：透過 `targetId` 指定分頁，而非「最後一個分頁」。

## 瀏覽器選擇

在本地啟動時，OpenClaw 會選擇第一個可用的：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 進行覆蓋。

平台：

- macOS：檢查 `/Applications` 和 `~/Applications`。
- Linux：尋找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等。
- Windows：檢查常見的安裝位置。

## 控制 API (選用)

僅適用於本機整合，閘道會公開一個小型迴路 HTTP API：

- 狀態/啟動/停止：`GET /`、`POST /start`、`POST /stop`
- 分頁： `GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- 快照/螢幕截圖：`GET /snapshot`，`POST /screenshot`
- 動作：`POST /navigate`，`POST /act`
- 鉤子 (Hooks): `POST /hooks/file-chooser`, `POST /hooks/dialog`
- 下載 (Downloads): `POST /download`, `POST /wait/download`
- 除錯：`GET /console`，`POST /pdf`
- Debugging: `GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- 網路：`POST /response/body`
- 狀態：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 狀態：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 設定：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端點都接受 `?profile=<name>`。

如果配置了 gateway auth，瀏覽器 HTTP 路由也需要進行身份驗證：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用該密碼進行 HTTP Basic 驗證

### Playwright 需求

某些功能（導航/動作/AI 快照/角色快照、元素截圖、PDF）需要
Playwright。如果未安裝 Playwright，這些端點會返回明確的 501
錯誤。ARIA 快照和基本截圖在 OpenClaw 管理的 Chrome 上仍然有效。

如果你看到 `Playwright is not available in this gateway build`，請安裝完整的
Playwright 套件（而不是 `playwright-core`）並重新啟動 gateway，或者重新安裝
支援瀏覽器的 OpenClaw。

#### Docker Playwright 安裝

如果您的 Gateway 在 Docker 中運行，請避免使用 `npx playwright`（npm 覆蓋衝突）。
改用隨附的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

若要保存瀏覽器下載內容，請設定 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`），並確保 `/home/node` 透過
`OPENCLAW_HOME_VOLUME` 或 bind mount 來保存。請參閱 [Docker](/en/install/docker)。

## 運作方式（內部）

高層級流程：

- 一個小型的**控制伺服器**接受 HTTP 請求。
- 它透過 **CDP** 連接到基於 Chromium 的瀏覽器（Chrome/Brave/Edge/Chromium）。
- 針對進階操作（點擊/輸入/快照/PDF），它會在 CDP 之上使用 **Playwright**。
- 當缺少 Playwright 時，僅提供非 Playwright 的操作。

此設計讓代理保持在穩定、確定的介面上，同時允許您切換本機/遠端瀏覽器和設定檔。

## CLI 快速參考

所有指令都接受 `--browser-profile <name>` 以指定特定設定檔。
所有指令也都接受 `--json` 以取得機器可讀的輸出（穩定載荷）。

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

- `upload` 和 `dialog` 是**準備**呼叫；在觸發選擇器/對話框的點擊/按壓之前執行它們。
- 下載和追蹤輸出路徑被限制在 OpenClaw 暫存根目錄中：
  - 追蹤：`/tmp/openclaw`（後備：`${os.tmpdir()}/openclaw`）
  - downloads: `/tmp/openclaw/downloads` (fallback: `${os.tmpdir()}/openclaw/downloads`)
- 上傳路徑被限制在 OpenClaw 的臨時上傳根目錄：
  - uploads: `/tmp/openclaw/uploads` (fallback: `${os.tmpdir()}/openclaw/uploads`)
- `upload` 也可以透過 `--input-ref` 或 `--element` 直接設定檔案輸入。
- `snapshot`:
  - `--format ai` (安裝 Playwright 時的預設值)：傳回帶有數字參照 (`aria-ref="<n>"`) 的 AI 快照。
  - `--format aria`：傳回無障礙樹 (無參照；僅供檢查)。
  - `--efficient` (或 `--mode efficient`)：精簡角色快照預設 (互動 + 精簡 + 深度 + 較低的 maxChars)。
  - 設定預設值 (僅限工具/CLI)：設定 `browser.snapshotDefaults.mode: "efficient"` 以在呼叫者未傳遞模式時使用高效快照 (請參閱 [Gateway configuration](/en/gateway/configuration-reference#browser))。
  - 角色快照選項 (`--interactive`, `--compact`, `--depth`, `--selector`) 會強制使用基於角色的快照，並帶有像 `ref=e12` 這樣的參照。
  - `--frame "<iframe selector>"` 將角色快照範圍限制在 iframe (與像 `e12` 這樣的角色參照配對)。
  - `--interactive` 輸出一個扁平、易於選擇的互動元素列表 (最適合驅動操作)。
  - `--labels` 新增僅限視口的螢幕截圖，並覆蓋參照標籤 (列印 `MEDIA:<path>`)。
- `click`/`type`/等需要來自 `snapshot` 的 `ref` (數字 `12` 或角色參照 `e12`)。
  操作不支援 CSS 選擇器。

## 快照與參照

OpenClaw 支援兩種「快照」風格：

- **AI 快照 (數字參照)**：`openclaw browser snapshot` (預設；`--format ai`)
  - 輸出：包含數字參照的文字快照。
  - 動作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在內部，ref 是透過 Playwright 的 `aria-ref` 解析的。

- **Role snapshot (role refs like `e12`)**：`openclaw browser snapshot --interactive` (或 `--compact`、`--depth`、`--selector`、`--frame`)
  - 輸出：包含 `[ref=e12]` (以及可選的 `[nth=1]`) 的角色型列表/樹狀結構。
  - 動作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在內部，ref 是透過 `getByRole(...)` 解析的 (針對重複項則加上 `nth()`)。
  - 新增 `--labels` 以包含帶有疊加 `e12` 標籤的視口截圖。

Ref 行為：

- Ref **在導航之間不穩定**；如果某些操作失敗，請重新執行 `snapshot` 並使用新的 ref。
- 如果 role snapshot 是使用 `--frame` 拍攝的，role refs 的作用範圍將限定在該 iframe 內，直到下一次 role snapshot。

## Wait power-ups

您等待的條件可以不僅限於時間/文字：

- 等待 URL (Playwright 支援的 glob 模式)：
  - `openclaw browser wait --url "**/dash"`
- 等待載入狀態：
  - `openclaw browser wait --load networkidle`
- 等待 JS 述詞 (predicate)：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待選擇器變為可見：
  - `openclaw browser wait "#main"`

這些條件可以組合使用：

```bash
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## Debug workflows

當動作失敗時 (例如「not visible」、「strict mode violation」、「covered」)：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>` (在互動模式下建議優先使用 role refs)
3. 如果仍然失敗：`openclaw browser highlight <ref>` 以查看 Playwright 的鎖定目標
4. 如果頁面行為異常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 若要進行深度除錯：請記錄追蹤：
   - `openclaw browser trace start`
   - 重現該問題
   - `openclaw browser trace stop` (會列印 `TRACE:<path>`)

## JSON 輸出

`--json` 適用於腳本編寫和結構化工具。

範例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包含 `refs` 以及一個小的 `stats` 區塊（行/字元/參照/互動），以便工具能夠推斷負載大小和密度。

## 狀態與環境控制項

這些對於「讓網站表現得像 X」的工作流程很有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- Storage：`storage local|session get|set|clear`
- Offline：`set offline on|off`
- Headers：`set headers --headers-json '{"X-Debug":"1"}'`（舊版 `set headers --json '{"X-Debug":"1"}'` 仍受支援）
- HTTP 基本身份驗證：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒體：`set media dark|light|no-preference|none`
- 時區 / 語言地區：`set timezone ...`、`set locale ...`
- 裝置 / 檢視區：
  - `set device "iPhone 14"`（Playwright 裝置預設）
  - `set viewport 1280 720`

## 安全與隱私

- openclaw 瀏覽器設定檔可能包含已登入的工作階段；請將其視為敏感資料處理。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  會在頁面上下文中執行任意的 JavaScript。提示詞注入可以操縱
  此行為。如果您不需要，可以使用 `browser.evaluateEnabled=false` 將其停用。
- 關於登入和反機器人提示（X/Twitter 等），請參閱 [瀏覽器登入 + X/Twitter 發布](/en/tools/browser-login)。
- 請將 Gateway/node 主機保持私密（僅限 loopback 或 tailnet）。
- 遠端 CDP 端點功能強大；請進行通道傳輸並保護它們。

嚴格模式範例（預設封鎖私有/內部目標）：

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

關於 Linux 特有的問題（尤其是 snap Chromium），請參閱
[瀏覽器疑難排解](/en/tools/browser-linux-troubleshooting)。

關於 WSL2 Gateway + Windows Chrome 分割主機設定，請參閱
[WSL2 + Windows + 遠端 Chrome CDP 疑難排解](/en/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

## Agent 工具 + 控制運作方式

Agent 獲得 **一個工具** 用於瀏覽器自動化：

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

對應方式：

- `browser snapshot` 回傳一個穩定的 UI 樹（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 來點擊/輸入/拖曳/選取。
- `browser screenshot` 擷取像素（完整頁面或元素）。
- `browser` 接受：
  - `profile` 來選擇命名的瀏覽器設定檔（openclaw、chrome 或 remote CDP）。
  - `target` (`sandbox` | `host` | `node`) 來選擇瀏覽器的所在位置。
  - 在沙盒化工作階段中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略了 `target`：沙盒化工作階段預設為 `sandbox`，非沙盒工作階段預設為 `host`。
  - 如果連接了具備瀏覽器能力的節點，除非您固定 `target="host"` 或 `target="node"`，否則工具可能會自動路由到該節點。

這能保持代理程式的確定性，並避免脆弱的選擇器。

## 相關

- [工具概覽](/en/tools) — 所有可用的代理程式工具
- [沙盒化](/en/gateway/sandboxing) — 沙盒環境中的瀏覽器控制
- [安全性](/en/gateway/security) — 瀏覽器控制的風險與防護
