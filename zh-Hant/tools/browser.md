---
summary: "整合的瀏覽器控制服務 + 動作指令"
read_when:
  - 新增代理程式控制的瀏覽器自動化
  - 偵錯 openclaw 為何干擾您自己的 Chrome
  - 在 macOS 應用程式中實作瀏覽器設定 + 生命週期
title: "瀏覽器 (OpenClaw 管理)"
---

# 瀏覽器 (openclaw 管理)

OpenClaw 可以執行一個由代理程式控制的 **專屬 Chrome/Brave/Edge/Chromium 設定檔**。
它與您的個人瀏覽器隔離，並透過 Gateway 內部的一個小型本機
控制服務進行管理（僅限回環）。

初學者觀點：

- 將其視為一個 **獨立的、僅供代理程式使用的瀏覽器**。
- `openclaw` 設定檔 **不會** 碰觸您的個人瀏覽器設定檔。
- 代理程式可以在一個安全的通道中 **開啟分頁、閱讀頁面、點擊和輸入**。
- 內建的 `user` 設定檔會透過 Chrome MCP 附加至您真實且已登入的 Chrome 工作階段。

## 您會獲得什麼

- 一個名為 **openclaw** 的獨立瀏覽器設定檔（預設為橘色強調）。
- 確定性的分頁控制 (list/open/focus/close)。
- 代理程式動作 (click/type/drag/select)、快照、螢幕截圖、PDF。
- 可選的多重設定檔支援 (`openclaw`、`work`、`remote`，...)。

此瀏覽器 **並非** 您的日常主力瀏覽器。它是用於
代理程式自動化和驗證的安全、隔離介面。

## 快速開始

```bash
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果您收到「Browser disabled」，請在設定中啟用它（見下文）並重新啟動
Gateway。

## 設定檔：`openclaw` vs `user`

- `openclaw`：受管理的隔離瀏覽器（不需要擴充功能）。
- `user`：內建的 Chrome MCP 附加設定檔，用於您 **真實且已登入的 Chrome**
  工作階段。

針對代理程式瀏覽器工具呼叫：

- 預設：使用隔離的 `openclaw` 瀏覽器。
- 當現有的登入工作階段很重要，且使用者
  在電腦前點擊/批准任何附加提示時，建議優先使用 `profile="user"`。
- 當您想要特定的瀏覽器模式時，`profile` 是明確的覆寫選項。

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

- 瀏覽器控制服務會綁定到由 `gateway.port` 導出的迴路位址（loopback）連接埠
  （預設值：`18791`，即閘道 + 2）。
- 如果您覆寫閘道連接埠（`gateway.port` 或 `OPENCLAW_GATEWAY_PORT`），
  導出的瀏覽器連接埠會進行偏移，以保持在同一個「系列」中。
- 當未設定時，`cdpUrl` 預設為受管理的本機 CDP 連接埠。
- `remoteCdpTimeoutMs` 適用於遠端（非迴路） CDP 可達性檢查。
- `remoteCdpHandshakeTimeoutMs` 適用於遠端 CDP WebSocket 可達性檢查。
- 瀏覽器導航/開啟分頁會在導航前進行 SSRF 防護，並在導航後盡力重新檢查最終的 `http(s)` URL。
- 在嚴格 SSRF 模式下，也會檢查遠端 CDP 端點探索/探測（`cdpUrl`，包括 `/json/version` 查找）。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 預設為 `true`（受信任網路模型）。將其設定為 `false` 以進行嚴格的僅公開瀏覽。
- `browser.ssrfPolicy.allowPrivateNetwork` 作為相容性的舊版別名仍受支援。
- `attachOnly: true` 表示「永不啟動本機瀏覽器；僅在已執行時附加。」
- `color` + 各設定檔的 `color` 會對瀏覽器 UI 著色，讓您可以看到目前使用的是哪個設定檔。
- 預設設定檔為 `openclaw`（由 OpenClaw 管理的獨立瀏覽器）。使用 `defaultProfile: "user"` 以選用已登入的使用者瀏覽器。
- 自動偵測順序：如果系統預設瀏覽器是基於 Chromium 則優先使用；否則為 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本機 `openclaw` 設定檔會自動指派 `cdpPort`/`cdpUrl` —— 僅針對遠端 CDP 設定這些值。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而非原始 CDP。請勿
  為該驅動程式設定 `cdpUrl`。
- 當現有階段設定檔應附加到非預設的 Chromium 使用者設定檔（例如 Brave 或 Edge）時，請設定 `browser.profiles.<name>.userDataDir`。

## 使用 Brave（或其他基於 Chromium 的瀏覽器）

如果您的 **系統預設** 瀏覽器是基於 Chromium 的（Chrome/Brave/Edge 等），
OpenClaw 將自動使用它。設定 `browser.executablePath` 以覆寫
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

- **本機控制（預設）：** Gateway 會啟動迴路控制服務並可以啟動本機瀏覽器。
- **遠端控制（node host）：** 在擁有瀏覽器的機器上執行 node host；Gateway 會將瀏覽器動作代理至該處。
- **遠端 CDP：** 設定 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`） 以
  連線至遠端的基於 Chromium 之瀏覽器。在此情況下，OpenClaw 將不會啟動本機瀏覽器。

遠端 CDP URL 可以包含認證：

- Query 權杖（例如 `https://provider.example?token=<token>`）
- HTTP Basic auth（例如 `https://user:pass@provider.example`）

當呼叫 `/json/*` 端點以及連線
至 CDP WebSocket 時，OpenClaw 會保留該認證。對於權杖，建議優先使用環境變數或密鑰管理工具，
而不要將其提交至設定檔中。

## 節點瀏覽器代理（零設定預設值）

如果您在擁有瀏覽器的機器上執行 **node host**，OpenClaw 可以
在不需任何額外瀏覽器設定的情況下，將瀏覽器工具呼叫自動路由至該節點。
這是遠端 gateway 的預設路徑。

備註：

- Node host 透過 **proxy command** 公開其本機瀏覽器控制伺服器。
- 設定檔來自於節點本身的 `browser.profiles` 設定（與本機相同）。
- 如果您不想要此功能，請停用：
  - 在節點上：`nodeHost.browserProxy.enabled=false`
  - 在 gateway 上：`gateway.nodes.browser.mode="off"`

## Browserless（託管的遠端 CDP）

[Browserless](https://browserless.io) 是一項託管的 Chromium 服務，透過 HTTPS
公開 CDP 端點。您可以將 OpenClaw 瀏覽器設定檔指向
Browserless 的區域端點，並使用您的 API 金鑰進行驗證。

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
        cdpUrl: "https://production-sfo.browserless.io?token=<BROWSERLESS_API_KEY>",
        color: "#00AA00",
      },
    },
  },
}
```

備註：

- 請將 `<BROWSERLESS_API_KEY>` 替換為您真實的 Browserless 權杖。
- 請選擇符合您 Browserless 帳戶的區域端點（請參閱其文件）。

## 直接 WebSocket CDP 提供者

某些託管瀏覽器服務公開的是 **直接 WebSocket** 端點，而非
標準的基於 HTTP 的 CDP 探索（`/json/version`）。OpenClaw 支援這兩種方式：

- **HTTP(S) 端點**（例如 Browserless）— OpenClaw 呼叫 `/json/version` 來
  發現 WebSocket 偵錯器 URL，然後進行連線。
- **WebSocket 端點** (`ws://` / `wss://`) — OpenClaw 直接連線，
  跳過 `/json/version`。對於像
  [Browserbase](https://www.browserbase.com) 這類或任何提供
  WebSocket URL 的服務，請使用此方式。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一個執行
無頭瀏覽器的雲端平台，內建 CAPTCHA 解決、隱身模式和住宅
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

- [註冊](https://www.browserbase.com/sign-up) 並從 [Overview dashboard](https://www.browserbase.com/overview) 複製您的 **API Key**。
- 將 `<BROWSERBASE_API_KEY>` 替換為您真實的 Browserbase API 金鑰。
- Browserbase 會在 WebSocket 連線時自動建立瀏覽器階段，因此
  不需要手動建立階段。
- 免費方案允許每月一個並行階段和一個瀏覽器小時。
  請參閱 [pricing](https://www.browserbase.com/pricing) 了解付費方案限制。
- 請參閱 [Browserbase docs](https://docs.browserbase.com) 以取得完整的 API
  參考、SDK 指南和整合範例。

## 安全性

關鍵概念：

- 瀏覽器控制僅限本機回送；存取流程會透過 Gateway 的認證或節點配對。
- 如果啟用了瀏覽器控制且未設定認證，OpenClaw 會在啟動時自動產生 `gateway.auth.token` 並將其保存至設定中。
- 將 Gateway 和任何節點主機保持在私人網路（Tailscale）上；避免公開暴露。
- 將遠端 CDP URL/權杖視為機密；優先使用環境變數或機密管理員。

遠端 CDP 提示：

- 盡可能優先使用加密端點（HTTPS 或 WSS）和短期權杖。
- 避免將長期權杖直接嵌入設定檔中。

## 設定檔（多瀏覽器）

OpenClaw 支援多個命名設定檔（路由設定）。設定檔可以是：

- **openclaw-managed**：一個專屬的 Chromium 瀏覽器執行個體，擁有自己的使用者資料目錄 + CDP 連接埠
- **remote**：一個明確的 CDP URL（在別處執行的 Chromium 瀏覽器）
- **existing session**：您現有的 Chrome 設定檔，透過 Chrome DevTools MCP 自動連線

預設值：

- 如果缺少 `openclaw` 設定檔，會自動建立。
- `user` 設定檔是內建的，用於連接現有的 Chrome MCP 工作階段。
- 除了 `user` 之外，現有工作階段設定檔屬於選用功能；請使用 `--driver existing-session` 建立它們。
- 本機 CDP 連接埠預設從 **18800–18899** 分配。
- 刪除設定檔會將其本機資料目錄移至垃圾桶。

所有控制端點都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 透過 Chrome DevTools MCP 連接現有工作階段

OpenClaw 也可以透過官方 Chrome DevTools MCP 伺服器連接到正在執行的 Chromium 型瀏覽器設定檔。這會重複使用該瀏覽器設定檔中已開啟的分頁和登入狀態。

官方背景和設定參考資料：

- [Chrome for Developers: Use Chrome DevTools MCP with your browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

內建設定檔：

- `user`

選用：如果您想要不同的名稱、顏色或瀏覽器資料目錄，請建立您自己的自訂現有工作階段設定檔。

預設行為：

- 內建的 `user` 設定檔使用 Chrome MCP 自動連接，其目標是預設的本機 Google Chrome 設定檔。

針對 Brave、Edge、Chromium 或非預設的 Chrome 設定檔，請使用 `userDataDir`：

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

1. 開啟該瀏覽器用於遠端除錯的 inspect 頁面。
2. 啟用遠端除錯。
3. 讓瀏覽器保持執行，並在 OpenClaw 連接時核准連線提示。

常見的 inspect 頁面：

- Chrome： `chrome://inspect/#remote-debugging`
- Brave： `brave://inspect/#remote-debugging`
- Edge： `edge://inspect/#remote-debugging`

即時連接冒煙測試：

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
- `snapshot` 從選取的即時分頁返回參考

如果連接不起作用，請檢查以下事項：

- 目標 Chromium 型瀏覽器版本為 `144+`
- 該瀏覽器的檢查頁面中已啟用遠端偵錯
- 瀏覽器已顯示，且您已接受附加同意提示
- `openclaw doctor` 會遷移舊的擴充功能型瀏覽器設定，並檢查預設自動連線設定檔的本機是否已安裝 Chrome，但它無法為您啟用瀏覽器端遠端偵錯

Agent 使用方式：

- 當您需要使用者的登入瀏覽器狀態時，請使用 `profile="user"`。
- 如果您使用自訂的現有工作階段設定檔，請傳入該明確的設定檔名稱。
- 僅當使用者在電腦前以批准附加提示時，才選擇此模式。
- Gateway 或節點主機可以產生 `npx chrome-devtools-mcp@latest --autoConnect`

備註：

- 此路徑的風險高於隔離的 `openclaw` 設定檔，因為它可以在您已登入的瀏覽器工作階段中執行操作。
- OpenClaw 不會為此驅動程式啟動瀏覽器；它僅附加至現有的工作階段。
- OpenClaw 在此使用官方 Chrome DevTools MCP `--autoConnect` 流程。如果設定了 `userDataDir`，OpenClaw 會將其傳遞以鎖定該特定的 Chromium 使用者資料目錄。
- 現有工作階段的擷圖支援頁面擷取和來自快照的 `--ref` 元素擷取，但不支援 CSS `--element` 選擇器。
- 現有工作階段 `wait --url` 支援精確、子字串和 glob 模式，就像其他瀏覽器驅動程式一樣。尚不支援 `wait --load networkidle`。
- 某些功能仍需要受控瀏覽器路徑，例如 PDF 匯出和下載攔截。
- 現有工作階段是主機本機的。如果 Chrome 位於不同的機器或不同的網路命名空間，請改用遠端 CDP 或節點主機。

## 隔離保證

- **專屬使用者資料目錄**：絕不會觸及您的個人瀏覽器設定檔。
- **專屬連接埠**：避免 `9222` 以防止與開發工作流程發生衝突。
- **確定性分頁控制**：透過 `targetId` 鎖定分頁，而非「上一個分頁」。

## 瀏覽器選擇

在本機啟動時，OpenClaw 會選擇第一個可用的：

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

## 控制 API (可選)

僅限本地整合，Gateway 會公開一個小型迴路 HTTP API：

- 狀態/啟動/停止：`GET /`、`POST /start`、`POST /stop`
- 分頁：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/截圖：`GET /snapshot`、`POST /screenshot`
- 動作：`POST /navigate`、`POST /act`
- 掛鉤：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下載：`POST /download`、`POST /wait/download`
- 除錯：`GET /console`、`POST /pdf`
- 除錯：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 網路：`POST /response/body`
- 狀態：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 狀態：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 設定：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端點都接受 `?profile=<name>`。

如果設定瞭 gateway 驗證，瀏覽器 HTTP 路由也需要驗證：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用該密碼進行 HTTP Basic 驗證

### Playwright 需求

某些功能（導覽/動作/AI 快照/角色快照、元素截圖、PDF）需要
Playwright。如果未安裝 Playwright，這些端點會傳回清楚的 501
錯誤。ARIA 快照和基本截圖仍然適用於 openclaw 管理的 Chrome。

如果您看到 `Playwright is not available in this gateway build`，請安裝完整的
Playwright 套件（而非 `playwright-core`）並重新啟動閘道，或是重新安裝
支援瀏覽器的 OpenClaw。

#### Docker Playwright 安裝

如果您的閘道在 Docker 中執行，請避免使用 `npx playwright`（npm 覆寫衝突）。
請改用隨附的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

若要保存瀏覽器下載內容，請設定 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`）並確保 `/home/node` 透過
`OPENCLAW_HOME_VOLUME` 或綁定掛載來保存。請參閱 [Docker](/zh-Hant/install/docker)。

## 運作方式（內部）

高層級流程：

- 一個小型的 **控制伺服器 (control server)** 接受 HTTP 請求。
- 它透過 **CDP** 連接到基於 Chromium 的瀏覽器（Chrome/Brave/Edge/Chromium）。
- 對於進階動作（點擊/輸入/快照/PDF），它會在 CDP
  之上使用 **Playwright**。
- 當缺少 Playwright 時，僅能使用非 Playwright 的操作。

這種設計讓代理保持在穩定、確定的介面上，同時允許
您交換本機/遠端瀏覽器和設定檔。

## CLI 快速參考

所有指令都接受 `--browser-profile <name>` 以指定特定的設定檔。
所有指令也都接受 `--json` 以取得機器可讀的輸出（穩定的載荷）。

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

動作：

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

- `upload` 和 `dialog` 是 **準備** 呼叫；請在觸發選擇器/對話框的點擊/按壓之前執行它們。
- 下載和追蹤輸出路徑限制在 OpenClaw 暫存根目錄下：
  - 追蹤：`/tmp/openclaw` (後備：`${os.tmpdir()}/openclaw`)
  - 下載：`/tmp/openclaw/downloads` (後備：`${os.tmpdir()}/openclaw/downloads`)
- 上傳路徑限制在 OpenClaw 暫存上傳根目錄下：
  - uploads: `/tmp/openclaw/uploads` (fallback: `${os.tmpdir()}/openclaw/uploads`)
- `upload` 也可以透過 `--input-ref` 或 `--element` 直接設定檔案輸入。
- `snapshot`：
  - `--format ai` (安裝 Playwright 時的預設值)：傳回包含數字參照 (`aria-ref="<n>"`) 的 AI 快照。
  - `--format aria`：傳輔助功能樹 (無參照；僅供檢查)。
  - `--efficient` (或 `--mode efficient`)：精簡角色快照預設 (interactive + compact + depth + lower maxChars)。
  - 組態預設值 (僅限工具/CLI)：設定 `browser.snapshotDefaults.mode: "efficient"` 以在呼叫者未傳遞模式時使用高效快照 (請參閱 [Gateway configuration](/zh-Hant/gateway/configuration#browser-openclaw-managed-browser))。
  - 角色快照選項 (`--interactive`, `--compact`, `--depth`, `--selector`) 會強制使用以角色為基礎的快照，並包含類似 `ref=e12` 的參照。
  - `--frame "<iframe selector>"` 將角色快照範圍限定於 iframe (與類似 `e12` 的角色參照搭配使用)。
  - `--interactive` 輸出扁平且易於選擇的互動元素清單 (最適合驅動動作)。
  - `--labels` 新增僅限視區的螢幕擷圖，並覆蓋參照標籤 (列印 `MEDIA:<path>`)。
- `click`/`type`/etc 需要來自 `snapshot` 的 `ref` (數字 `12` 或角色參照 `e12`)。
  動作刻意不支援 CSS 選擇器。

## 快照與參照

OpenClaw 支援兩種「快照」樣式：

- **AI snapshot (numeric refs)**： `openclaw browser snapshot` (預設； `--format ai`)
  - 輸出：包含數字參照的文字快照。
  - 動作： `openclaw browser click 12`, `openclaw browser type 23 "hello"`。
  - 在內部，參照是透過 Playwright 的 `aria-ref` 解析。

- **角色快照（如 `e12` 的角色引用）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 輸出：一個基於角色的清單/樹狀結構，包含 `[ref=e12]`（以及可選的 `[nth=1]`）。
  - 動作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在內部，引用是透過 `getByRole(...)` 解析的（若是重複項則加上 `nth()`）。
  - 加入 `--labels` 以包含帶有疊加 `e12` 標籤的視口截圖。

引用行為：

- 引用**在導航之間並不穩定**；如果操作失敗，請重新執行 `snapshot` 並使用新的引用。
- 如果角色快照是使用 `--frame` 拍攝的，則角色引用的作用範圍限制在該 iframe 內，直到下一次角色快照。

## 等待加強功能

您可以等待的不僅僅是時間/文字：

- 等待 URL（支援 Playwright 的萬用字元）：
  - `openclaw browser wait --url "**/dash"`
- 等待載入狀態：
  - `openclaw browser wait --load networkidle`
- 等待 JS 條件：
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

當動作失敗時（例如「不可見」、「嚴格模式違規」、「被覆蓋」）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在互動模式下偏好使用角色引用）
3. 如果仍然失敗：`openclaw browser highlight <ref>` 以查看 Playwright 的目標是什麼
4. 如果頁面行為異常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 若要進行深度除錯：記錄追蹤：
   - `openclaw browser trace start`
   - 重現問題
   - `openclaw browser trace stop`（會印出 `TRACE:<path>`）

## JSON 輸出

`--json` 是用於腳本撰寫和結構化工具的。

範例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包含 `refs` 以及一個小型的 `stats` 區塊（行/字元/引用/互動），以便工具能夠評估負載大小和密度。

## 狀態與環境設定

這些對於「讓網站表現得像 X」的工作流程非常有用：

- Cookies: `cookies`, `cookies set`, `cookies clear`
- Storage: `storage local|session get|set|clear`
- Offline: `set offline on|off`
- Headers: `set headers --headers-json '{"X-Debug":"1"}'` (舊版的 `set headers --json '{"X-Debug":"1"}'` 仍受支援)
- HTTP basic auth: `set credentials user pass` (或 `--clear`)
- Geolocation: `set geo <lat> <lon> --origin "https://example.com"` (或 `--clear`)
- Media: `set media dark|light|no-preference|none`
- Timezone / locale: `set timezone ...`, `set locale ...`
- Device / viewport:
  - `set device "iPhone 14"` (Playwright 裝置預設值)
  - `set viewport 1280 720`

## 安全性與隱私

- openclaw 瀏覽器設定檔可能包含已登入的會話；請將其視為敏感資料。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  會在頁面上下文中執行任意的 JavaScript。提示注入可能會操控此行為。如果您不需要，請使用 `browser.evaluateEnabled=false` 將其停用。
- 關於登入和反機器人注意事項 (X/Twitter 等)，請參閱 [Browser login + X/Twitter posting](/zh-Hant/tools/browser-login)。
- 請保持 Gateway/node 主機的隱私 (僅限 loopback 或 tailnet)。
- 遠端 CDP 端點功能強大；請透過通道傳輸並加以保護。

嚴格模式範例 (預設封鎖私人/內部目標)：

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

關於 Linux 特有的問題 (特別是 snap Chromium)，請參閱
[Browser troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)。

關於 WSL2 Gateway + Windows Chrome 分散式主機設定，請參閱
[WSL2 + Windows + remote Chrome CDP troubleshooting](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

## Agent 工具 + 控制運作方式

Agent 獲得 **一個工具** 來進行瀏覽器自動化：

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

對應方式如下：

- `browser snapshot` 會傳回穩定的 UI 樹狀結構 (AI 或 ARIA)。
- `browser act` 使用快照 `ref` ID 來進行點擊/輸入/拖曳/選取。
- `browser screenshot` 捕獲像素（完整頁面或元素）。
- `browser` 接受：
  - `profile` 用於選擇命名的瀏覽器設定檔（openclaw、chrome 或 remote CDP）。
  - `target` (`sandbox` | `host` | `node`) 用於選擇瀏覽器的位置。
  - 在沙盒會話中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙盒會話預設為 `sandbox`，非沙盒會話預設為 `host`。
  - 如果連接了具備瀏覽器功能的節點，工具可能會自動路由到該節點，除非您固定 `target="host"` 或 `target="node"`。

這可以保持代理的確定性，並避免脆弱的選擇器。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
