---
summary: "整合的瀏覽器控制服務 + 動作指令"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "瀏覽器 (OpenClaw 管理)"
---

# 瀏覽器 (openclaw-managed)

OpenClaw 可以執行一個由代理程式控制的 **專屬 Chrome/Brave/Edge/Chromium 設定檔**。
它與您的個人瀏覽器隔離，並透過閘道內部的小型本機
控制服務進行管理（僅限回環）。

初學者觀點：

- 將其視為一個 **獨立、僅供代理程式使用的瀏覽器**。
- `openclaw` 設定檔 **不會** 碰觸您的個人瀏覽器設定檔。
- 代理程式可以在安全通道中 **開啟分頁、閱讀頁面、點擊和輸入**。
- 內建的 `user` 設定檔會透過 Chrome MCP 附加至您真實且已登入的 Chrome 工作階段。

## 功能介紹

- 一個名為 **openclaw** 的獨立瀏覽器設定檔（預設為橙色強調色）。
- 確定性的分頁控制（列出/開啟/聚焦/關閉）。
- 代理程式動作（點擊/輸入/拖曳/選取）、快照、螢幕擷圖、PDF。
- 選用的多設定檔支援 (`openclaw`, `work`, `remote`, ...)。

此瀏覽器 **並非** 您日常使用的瀏覽器。它是供
代理程式自動化和驗證使用的安全隔離介面。

## 快速入門

```exec
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果您收到「瀏覽器已停用」的訊息，請在設定中啟用它（見下文）並重新啟動
閘道。

## 設定檔：`openclaw` vs `user`

- `openclaw`：受管理、隔離的瀏覽器（不需要擴充功能）。
- `user`：內建的 Chrome MCP 附加設定檔，用於您的 **真實且已登入的 Chrome**
  工作階段。

針對代理程式瀏覽器工具呼叫：

- 預設值：使用隔離的 `openclaw` 瀏覽器。
- 當現有的已登入工作階段很重要，且使用者
  在電腦前可以點擊/核准任何附加提示時，建議優先使用 `profile="user"`。
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

- 瀏覽器控制服務綁定到從 `gateway.port` 導出的回環埠（預設值：`18791`，即 gateway + 2）。
- 如果您覆蓋 Gateway 埠（`gateway.port` 或 `OPENCLAW_GATEWAY_PORT`），導出的瀏覽器埠將會移動以保持在同一個「系列」中。
- 未設定時，`cdpUrl` 預設為受管理的本機 CDP 埠。
- `remoteCdpTimeoutMs` 適用於遠端（非回環）CDP 可達性檢查。
- `remoteCdpHandshakeTimeoutMs` 適用於遠端 CDP WebSocket 可達性檢查。
- 瀏覽器導覽/開啟分頁會在導覽前進行 SSRF 防護，並在導覽後對最終的 `http(s)` URL 進行盡力的重新檢查。
- 在嚴格 SSRF 模式下，遠端 CDP 端點探索/探測（`cdpUrl`，包括 `/json/version` 查詢）也會被檢查。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 預設為 `true`（信任網路模型）。將其設定為 `false` 以進行嚴格的僅公開瀏覽。
- `browser.ssrfPolicy.allowPrivateNetwork` 作為舊版別名仍受支援，以保持相容性。
- `attachOnly: true` 表示「永遠不啟動本機瀏覽器；僅在已執行時附加」。
- `color` + 各設定檔的 `color` 會對瀏覽器 UI 著色，讓您可以看到目前作用中的是哪個設定檔。
- 預設設定檔為 `openclaw`（OpenClaw 管理的獨立瀏覽器）。使用 `defaultProfile: "user"` 以選擇加入已登入使用者瀏覽器。
- 自動偵測順序：如果是基於 Chromium 的系統預設瀏覽器，則優先選擇；否則為 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本機 `openclaw` 設定檔會自動指派 `cdpPort`/`cdpUrl` — 僅為遠端 CDP 設定這些。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而非原始 CDP。請勿為該驅動程式設定 `cdpUrl`。
- 當現有工作階段設定檔應附加到非預設的 Chromium 使用者設定檔（如 Brave 或 Edge）時，請設定 `browser.profiles.<name>.userDataDir`。

## 使用 Brave（或其他基於 Chromium 的瀏覽器）

如果您的 **系統預設** 瀏覽器是基於 Chromium 的（Chrome/Brave/Edge 等），
OpenClaw 會自動使用它。設定 `browser.executablePath` 以覆蓋
自動偵測：

CLI 範例：

```exec
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

- **本機控制（預設）：** 閘道會啟動回送控制服務，並可以啟動本機瀏覽器。
- **遠端控制（節點主機）：** 在擁有瀏覽器的機器上執行節點主機；閘道會將瀏覽器動作代理至該主機。
- **遠端 CDP：** 設定 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`） 以
  附加至遠端基於 Chromium 的瀏覽器。在這種情況下，OpenClaw 將不會啟動本機瀏覽器。

遠端 CDP URL 可以包含驗證資訊：

- 查詢參數（例如 `https://provider.example?token=<token>`）
- HTTP 基本驗證（例如 `https://user:pass@provider.example`）

當呼叫 `/json/*` 端點以及連接
至 CDP WebSocket 時，OpenClaw 會保留驗證資訊。對於權杖，建議優先使用環境變數或密鑰管理服務，
而非將其提交至設定檔中。

## 節點瀏覽器代理（零設定預設值）

如果您在擁有瀏覽器的機器上執行 **節點主機**，OpenClaw 可以
自動將瀏覽器工具呼叫路由至該節點，而無需額外的瀏覽器設定。
這是遠端閘道的預設路徑。

備註：

- 節點主機透過 **代理指令** 公開其本機瀏覽器控制伺服器。
- 設定檔來自節點自身的 `browser.profiles` 設定（與本機相同）。
- 如果您不想要此功能，請停用：
  - 在節點上：`nodeHost.browserProxy.enabled=false`
  - 在閘道上：`gateway.nodes.browser.mode="off"`

## Browserless（託管遠端 CDP）

[Browserless](https://browserless.io) 是一個透過 HTTPS 公開
CDP 端點的託管 Chromium 服務。您可以將 OpenClaw 瀏覽器設定檔指向
Browserless 區域端點，並使用您的 API 金鑰進行驗證。

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

- 請將 `<BROWSERLESS_API_KEY>` 取換為您真實的 Browserless 權杖。
- 選擇符合您 Browserless 帳戶的區域端點（請參閱其文件）。

## 直接 WebSocket CDP 提供者

某些託管瀏覽器服務公開 **直接 WebSocket** 端點，而非
標準的基於 HTTP 的 CDP 探索（`/json/version`）。OpenClaw 支援這兩種方式：

- **HTTP(S) 端點**（例如 Browserless）— OpenClaw 呼叫 `/json/version` 來
  探索 WebSocket 除錯器 URL，然後進行連線。
- **WebSocket 端點**（`ws://` / `wss://`）— OpenClaw 直接連線，
  跳過 `/json/version`。將此用於
  [Browserbase](https://www.browserbase.com) 或任何提供您
  WebSocket URL 的供應商。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一個用於執行
無頭瀏覽器的雲端平台，內建 CAPTCHA 解決方案、隱身模式和住宅
代理伺服器。

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

- [註冊](https://www.browserbase.com/sign-up) 並從 [總覽儀表板](https://www.browserbase.com/overview) 複製您的 **API 金鑰**
  。
- 將 `<BROWSERBASE_API_KEY>` 替換為您真實的 Browserbase API 金鑰。
- Browserbase 會在 WebSocket 連線時自動建立瀏覽器工作階段，因此
  不需要手動建立工作階段的步驟。
- 免費層級允許一個並行工作階段和每個月一個瀏覽器小時。
  請參閱 [價格](https://www.browserbase.com/pricing) 以了解付費方案的限製。
- 請參閱 [Browserbase 文件](https://docs.browserbase.com) 以取得完整的 API
  參考、SDK 指南和整合範例。

## 安全性

重點：

- 瀏覽器控制僅限本地回送 (loopback-only)；存取流程會經過 Gateway 的驗證或節點配對。
- 如果啟用了瀏覽器控制且未設定驗證，OpenClaw 會在啟動時自動生成 `gateway.auth.token` 並將其保存至設定中。
- 請將 Gateway 和任何節點主機保持在私人網路（Tailscale）上；避免公開暴露。
- 請將遠端 CDP URL/權杖視為機密；優先使用環境變數或機密管理器。

遠端 CDP 提示：

- 盡可能偏好加密端點 (HTTPS 或 WSS) 和短期權杖。
- 避免將長期權杖直接嵌入設定檔中。

## 設定檔（多瀏覽器）

OpenClaw 支援多個命名設定檔（路由設定）。設定檔可以是：

- **openclaw-managed**：一個專屬的基於 Chromium 的瀏覽器執行個體，擁有自己的使用者資料目錄 + CDP 連接埠
- **remote**：一個明確的 CDP URL（在其他地方執行的基於 Chromium 的瀏覽器）
- **existing session**：您現有的 Chrome 設定檔，透過 Chrome DevTools MCP 自動連線

預設值：

- 如果缺少 `openclaw` 設定檔，將會自動建立。
- `user` 設定檔是內建用於 Chrome MCP 現有會話連結的。
- 除了 `user` 之外，現有會話設定檔是選用的；請使用 `--driver existing-session` 建立它們。
- 本機 CDP 連接埠預設從 **18800–18899** 分配。
- 刪除設定檔會將其本機資料目錄移至垃圾桶。

所有控制端點都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 透過 Chrome DevTools MCP 進行現有會話連結

OpenClaw 也可以透過官方 Chrome DevTools MCP 伺服器連結到正在執行的 Chromium 瀏覽器設定檔。這會重複使用該瀏覽器設定檔中已開啟的分頁和登入狀態。

官方背景和設定參考：

- [Chrome for Developers: Use Chrome DevTools MCP with your browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

內建設定檔：

- `user`

選用：如果您想要不同的名稱、顏色或瀏覽器資料目錄，請建立您自己的自訂現有會話設定檔。

預設行為：

- 內建的 `user` 設定檔使用 Chrome MCP 自動連線，該功能針對
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

然後在對應的瀏覽器中：

1. 開啟該瀏覽器用於遠端除錯的檢查頁面。
2. 啟用遠端除錯。
3. 保持瀏覽器執行，並在 OpenClaw 連結時批准連線提示。

常見檢查頁面：

- Chrome: `chrome://inspect/#remote-debugging`
- Brave: `brave://inspect/#remote-debugging`
- Edge: `edge://inspect/#remote-debugging`

即時連結冒煙測試：

```exec
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
- `snapshot` 從選取的即時分頁返回參照

如果連結無法運作，請檢查以下項目：

- 目標 Chromium 瀏覽器版本為 `144+`
- 已在該瀏覽器的檢查頁面中啟用遠端偵錯
- 瀏覽器已顯示，且您接受了附加連線的同意提示
- `openclaw doctor` 會遷移舊的擴充功能型瀏覽器設定，並檢查本機是否安裝了
  Chrome 以用於預設的自動連線設定檔，但它無法
  為您啟用瀏覽器端的遠端偵錯

Agent 使用方式：

- 當您需要使用者的登入瀏覽器狀態時，請使用 `profile="user"`。
- 如果您使用自訂的既有工作階段設定檔，請傳入該明確的設定檔名稱。
- 僅當使用者在電腦前以批准附加連線
  提示時，才選擇此模式。
- Gateway 或節點主機可以產生 `npx chrome-devtools-mcp@latest --autoConnect`

備註：

- 此途徑比隔離的 `openclaw` 設定檔風險更高，因為它
  可以在您已登入的瀏覽器工作階段中進行操作。
- OpenClaw 不會為此驅動程式啟動瀏覽器；它僅附加至
  現有的工作階段。
- OpenClaw 在此使用官方的 Chrome DevTools MCP `--autoConnect` 流程。如果
  設定了 `userDataDir`，OpenClaw 會將其傳遞以鎖定該明確的
  Chromium 使用者資料目錄。
- 既有工作階段的螢幕截圖支援頁面擷取和來自快照的 `--ref` 元素
  擷取，但不支援 CSS `--element` 選擇器。
- 既有工作階段 `wait --url` 支援精確、子字串和 Glob 模式
  ，就像其他瀏覽器驅動程式一樣。尚不支援 `wait --load networkidle`。
- 某些功能仍需要受管理的瀏覽器途徑，例如 PDF 匯出和
  下載攔截。
- 既有工作階段僅限主機本機。如果 Chrome 位於不同的機器或
  不同的網路命名空間，請改用遠端 CDP 或節點主機。

## 隔離保證

- **專用使用者資料目錄**：絕不會接觸您的個人瀏覽器設定檔。
- **專用連接埠**：避免 `9222` 以防止與開發工作流程發生衝突。
- **確定性分頁控制**：透過 `targetId` 鎖定分頁，而非「最後一個分頁」。

## 瀏覽器選擇

當在本機啟動時，OpenClaw 會選擇第一個可用的：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 覆蓋。

平台：

- macOS: 檢查 `/Applications` 和 `~/Applications`。
- Linux: 尋找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等。
- Windows: 檢查常見的安裝位置。

## Control API (optional)

僅適用於本機整合，Gateway 會公開一個小型 loopback HTTP API：

- 狀態/啟動/停止: `GET /`、`POST /start`、`POST /stop`
- 分頁: `GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/螢幕截圖: `GET /snapshot`、`POST /screenshot`
- 動作: `POST /navigate`、`POST /act`
- Hooks: `POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下載: `POST /download`、`POST /wait/download`
- 偵錯: `GET /console`、`POST /pdf`
- 偵錯: `GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 網路: `POST /response/body`
- 狀態: `GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 狀態: `GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 設定: `POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端點皆接受 `?profile=<name>`。

如果設定了一般 Gateway 驗證，瀏覽器 HTTP 路由也需要驗證：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用該密碼進行 HTTP Basic auth

### Playwright 需求

某些功能（導航/動作/AI 快照/角色快照、元素截圖、PDF）需要
Playwright。如果未安裝 Playwright，這些端點會回傳明確的 501
錯誤。ARIA 快照和基本截圖仍可在 OpenClaw 管理的 Chrome 上運作。

如果您看到 `Playwright is not available in this gateway build`，請安裝完整的
Playwright 套件（而非 `playwright-core`）並重新啟動 gateway，或重新安裝
支援瀏覽器的 OpenClaw。

#### Docker Playwright 安裝

如果您的 Gateway 在 Docker 中執行，請避免使用 `npx playwright`（npm 覆寫衝突）。
請改用隨附的 CLI：

```exec
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

要保存瀏覽器下載內容，請設定 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`）並確保 `/home/node` 透過
`OPENCLAW_HOME_VOLUME` 或繫結掛載保存。請參閱 [Docker](/zh-Hant/install/docker)。

## 運作方式 (內部)

高層級流程：

- 一個小型的 **控制伺服器 (control server)** 接受 HTTP 請求。
- 它透過 **CDP** 連線至基於 Chromium 的瀏覽器 (Chrome/Brave/Edge/Chromium)。
- 對於進階動作 (點擊/輸入/快照/PDF)，它會在 CDP
  之上使用 **Playwright**。
- 當缺少 Playwright 時，僅提供非 Playwright 的操作。

這項設計讓代理程式保持在穩定、確定的介面上，同時讓
您可以交換本地/遠端瀏覽器和設定檔。

## CLI 快速參考

所有指令都接受 `--browser-profile <name>` 以指定特定設定檔。
所有指令也接受 `--json` 以取得機器可讀的輸出 (穩定的酬載)。

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

- `upload` 和 `dialog` 是**準備**呼叫；請在觸發選擇器/對話框的點擊/按壓之前執行它們。
- 下載和追蹤輸出路徑被限制在 OpenClaw 暫存根目錄：
  - 追蹤：`/tmp/openclaw` (備選：`${os.tmpdir()}/openclaw`)
  - 下載：`/tmp/openclaw/downloads` (備選：`${os.tmpdir()}/openclaw/downloads`)
- 上傳路徑被限制在 OpenClaw 暫存上傳根目錄：
  - uploads: `/tmp/openclaw/uploads` (fallback: `${os.tmpdir()}/openclaw/uploads`)
- `upload` 也可以透過 `--input-ref` 或 `--element` 直接設定檔案輸入。
- `snapshot`：
  - `--format ai` (安裝 Playwright 時的預設值)：傳回包含數字參照的 AI 快照 (`aria-ref="<n>"`)。
  - `--format aria`：傳回無障礙樹 (無參照；僅供檢查)。
  - `--efficient` (或 `--mode efficient`)：精簡角色快照預設組 (互動 + 精簡 + 深度 + 較低 maxChars)。
  - 設定預設值 (僅限工具/CLI)：設定 `browser.snapshotDefaults.mode: "efficient"` 以在呼叫者未傳遞模式時使用高效快照 (請參閱 [Gateway configuration](/zh-Hant/gateway/configuration-reference#browser))。
  - 角色快照選項 (`--interactive`, `--compact`, `--depth`, `--selector`) 會強制使用具有 `ref=e12` 類似參照的角色快照。
  - `--frame "<iframe selector>"` 將角色快照範圍限制在 iframe (與 `e12` 之類的角色參照配對)。
  - `--interactive` 輸出平整且易於選取的互動元素清單 (最適合驅動動作)。
  - `--labels` 新增僅限視口的螢幕截圖，並覆疋參照標籤 (列印 `MEDIA:<path>`)。
- `click`/`type`/etc 需要來自 `snapshot` 的 `ref` (可以是數字 `12` 或角色參照 `e12`)。
  動作刻意不支援 CSS 選擇器。

## 快照與參照

OpenClaw 支援兩種「快照」樣式：

- **AI 快照 (數字參照)**：`openclaw browser snapshot` (預設值；`--format ai`)
  - 輸出：包含數字參照的文字快照。
  - 動作：`openclaw browser click 12`, `openclaw browser type 23 "hello"`。
  - 在內部，參照是透過 Playwright 的 `aria-ref` 解析。

- **角色快照（角色引用如 `e12`）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 輸出：一個基於角色的清單/樹狀結構，包含 `[ref=e12]`（以及可選的 `[nth=1]`）。
  - 動作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在內部，引用是透過 `getByRole(...)` 解析的（對於重複項則加上 `nth()`）。
  - 新增 `--labels` 以包含視口截圖，並覆蓋 `e12` 標籤。

引用行為：

- 引用在導航之間**不穩定**；如果操作失敗，請重新執行 `snapshot` 並使用新的引用。
- 如果角色快照是使用 `--frame` 拍攝的，則角色引用的作用域限於該 iframe，直到下一個角色快照為止。

## 等待增強功能

您可以等待的不僅僅是時間/文字：

- 等待 URL（支援 Playwright 的 glob 模式）：
  - `openclaw browser wait --url "**/dash"`
- 等待載入狀態：
  - `openclaw browser wait --load networkidle`
- 等待 JS 述詞：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待選擇器變為可見：
  - `openclaw browser wait "#main"`

這些可以組合使用：

```exec
openclaw browser wait "#main" \
  --url "**/dash" \
  --load networkidle \
  --fn "window.ready===true" \
  --timeout-ms 15000
```

## 偵錯工作流程

當動作失敗時（例如「不可見」、「嚴格模式違規」、「被覆蓋」）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在互動模式下建議優先使用角色引用）
3. 如果仍然失敗：`openclaw browser highlight <ref>` 以查看 Playwright 的目標是什麼
4. 如果頁面行為異常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 進行深度偵錯：記錄追蹤：
   - `openclaw browser trace start`
   - 重現問題
   - `openclaw browser trace stop`（列印 `TRACE:<path>`）

## JSON 輸出

`--json` 用於腳本和結構化工具。

範例：

```exec
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包含 `refs` 加上包含少量 `stats` 區塊（行/字元/引用/互動），以便工具可以評估負載大小和密度。

## 狀態與環境控制選項

這些選項適用於「讓網站表現得像 X」的工作流程：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- Storage：`storage local|session get|set|clear`
- Offline：`set offline on|off`
- Headers：`set headers --headers-json '{"X-Debug":"1"}'`（舊版 `set headers --json '{"X-Debug":"1"}'` 仍受支援）
- HTTP basic auth：`set credentials user pass`（或 `--clear`）
- Geolocation：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- Media：`set media dark|light|no-preference|none`
- 時區 / 語言地區：`set timezone ...`、`set locale ...`
- 裝置 / 檢視區：
  - `set device "iPhone 14"`（Playwright 裝置預設）
  - `set viewport 1280 720`

## 安全與隱私

- OpenClaw 的瀏覽器設定檔可能包含已登入的工作階段；請將其視為敏感資料處理。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  會在頁面上下文中執行任意的 JavaScript。提示注入可能會操控
  這一點。如果您不需要此功能，請使用 `browser.evaluateEnabled=false` 將其停用。
- 關於登入和防機器人提示（X/Twitter 等），請參閱 [Browser login + X/Twitter posting](/zh-Hant/tools/browser-login)。
- 請保持 Gateway/節點主機為私有（僅限 loopback 或 tailnet）。
- 遠端 CDP 端點功能強大；請將其置於通道中並加以保護。

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

關於 Linux 特有的問題（特別是 snap Chromium），請參閱
[Browser troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)。

關於 WSL2 Gateway + Windows Chrome 分割主機設定，請參閱
[WSL2 + Windows + remote Chrome CDP troubleshooting](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

## Agent 工具 + 控制運作方式

Agent 會取得**一個工具**用於瀏覽器自動化：

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

對應方式：

- `browser snapshot` 會傳回穩定的 UI 樹（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 來進行點選/輸入/拖曳/選取。
- `browser screenshot` 擷取像素（完整頁面或元素）。
- `browser` 接受：
  - `profile` 用於選擇命名的瀏覽器設定檔（openclaw、chrome 或遠端 CDP）。
  - `target` (`sandbox` | `host` | `node`) 用於選擇瀏覽器的位置。
  - 在沙盒化工作階段中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙盒化工作階段預設為 `sandbox`，非沙盒工作階段預設為 `host`。
  - 如果連接了具備瀏覽器功能的節點，除非您固定 `target="host"` 或 `target="node"`，否則工具可能會自動路由至該節點。

這保持了代理程式的確定性，並避免脆弱的選擇器。
