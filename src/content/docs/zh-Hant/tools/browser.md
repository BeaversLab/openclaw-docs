---
summary: "整合式瀏覽器控制服務 + 動作指令"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "瀏覽器（由 OpenClaw 管理）"
---

# 瀏覽器 (openclaw-managed)

OpenClaw 可以執行一個由代理程式控制的**專屬 Chrome/Brave/Edge/Chromium 設定檔**。
它與您的個人瀏覽器是隔離的，並透過 Gateway 內部的一個小型本機
控制服務進行管理（僅限回環）。

初學者觀點：

- 可以將其視為一個**獨立的、僅供代理程式使用的瀏覽器**。
- `openclaw` 設定檔**不會**碰觸您的個人瀏覽器設定檔。
- 代理程式可以在安全通道中**開啟分頁、閱讀頁面、點擊和輸入**。
- 內建的 `user` 設定檔會透過 Chrome MCP 附加至您真實且已登入的 Chrome 工作階段。

## 功能內容

- 一個名為 **openclaw** 的獨立瀏覽器設定檔（預設為橙色強調）。
- 確定性的分頁控制（列出/開啟/聚焦/關閉）。
- 代理程式動作（點擊/輸入/拖曳/選取）、快照、螢幕擷圖、PDF。
- 可選的多設定檔支援（`openclaw`、`work`、`remote`……）。

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

如果完全缺少 `openclaw browser`，或者 Agent 表示瀏覽器工具無法使用，請跳至[缺少瀏覽器指令或工具](/zh-Hant/tools/browser#missing-browser-command-or-tool)。

## 外掛程式控制

預設的 `browser` 工具現在是內建的外掛程式，預設為啟用狀態。這意味著您可以停用或取代它，而不需要移除 OpenClaw 外掛程式系統的其餘部分：

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

在安裝另一個提供相同 `browser` 工具名稱的外掛程式之前，請先停用內建的外掛程式。預設的瀏覽器體驗需要兩者：

- `plugins.entries.browser.enabled` 未停用
- `browser.enabled=true`

如果您只關閉外掛程式，內建的瀏覽器 CLI (`openclaw browser`)、閘道方法 (`browser.request`)、代理程式工具以及預設的瀏覽器控制服務將會一起消失。您的 `browser.*` 設定將保持完整，供取代的外掛程式重複使用。

隨附的瀏覽器外掛程式現在也擁有瀏覽器執行時期實作。核心僅保留共用的外掛程式 SDK 輔助程式，以及針對較舊內部匯入路徑的相容性重新匯出。實務上，移除或取代瀏覽器外掛程式套件會移除瀏覽器功能集，而不是留下第二個核心擁有的執行時期。

瀏覽器設定的變更仍然需要重新啟動 Gateway，以便隨附的外掛程式能使用新設定重新註冊其瀏覽器服務。

## 缺少瀏覽器指令或工具

如果在升級後 `openclaw browser` 突然變成未知的指令，或者代理程式回報瀏覽器工具遺失，最常見的原因是具有限制性的 `plugins.allow` 清單未包含 `browser`。

錯誤設定範例：

```json5
{
  plugins: {
    allow: ["telegram"],
  },
}
```

請透過將 `browser` 新增至外掛程式允許清單來修正此問題：

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
- `tools.alsoAllow: ["browser"]` **不會**載入內建的瀏覽器外掛程式。它只會在外掛程式載入後調整工具原則。
- 如果您不需要限制性插件允許清單，移除 `plugins.allow` 也會還原預設的內建瀏覽器行為。

典型症狀：

- `openclaw browser` 是未知的指令。
- `browser.request` 遺失。
- 代理程式回報瀏覽器工具無法使用或遺失。

## 設定檔：`openclaw` vs `user`

- `openclaw`：受管理、獨立的瀏覽器（不需要擴充功能）。
- `user`：針對您 **真實且已登入的 Chrome** 工作階段的內建 Chrome MCP 附加設定檔。

針對代理程式瀏覽器工具呼叫：

- 預設：使用獨立的 `openclaw` 瀏覽器。
- 當現有的登入工作階段很重要，且使用者能在電腦前點擊/核准任何附加提示時，請優先使用 `profile="user"`。
- 當您想要特定的瀏覽器模式時，`profile` 是明確的覆寫選項。

如果您預設想要受管理模式，請設定 `browser.defaultProfile: "openclaw"`。

## 設定

瀏覽器設定位於 `~/.openclaw/openclaw.json`。

```json5
{
  browser: {
    enabled: true, // default: true
    ssrfPolicy: {
      // dangerouslyAllowPrivateNetwork: true, // opt in only for trusted private-network access
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

- 瀏覽器控制服務會繫結至從 `gateway.port` 衍生的連接埠（預設：`18791`，即 gateway + 2）。
- 如果您覆寫 Gateway 連接埠（`gateway.port` 或 `OPENCLAW_GATEWAY_PORT`），衍生的瀏覽器連接埠會位移以保持在同一個「系列」中。
- 當未設定時，`cdpUrl` 預設為受管理的本機 CDP 連接埠。
- `remoteCdpTimeoutMs` 適用於遠端（非 loopback）CDP 連線能力檢查。
- `remoteCdpHandshakeTimeoutMs` 適用於遠端 CDP WebSocket 連線能力檢查。
- 瀏覽器導覽/開啟分頁在導覽前會受到 SSRF 防護，並在導覽後對最終的 `http(s)` URL 進行盡力的重新檢查。
- 在嚴格 SSRF 模式下，遠端 CDP 端點探索/探測（`cdpUrl`，包括 `/json/version` 查詢）也會受到檢查。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 預設為停用。僅在您有意信任私有網路瀏覽器存取時，將其設為 `true`。
- `browser.ssrfPolicy.allowPrivateNetwork` 為了相容性，仍作為舊版別名受到支援。
- `attachOnly: true` 表示「絕不啟動本機瀏覽器；僅在已執行時附加」。
- `color` + 每個設定檔 `color` 會為瀏覽器 UI 著色，讓您可以看到目前使用的是哪個設定檔。
- 預設設定檔為 `openclaw` (OpenClaw 管理的獨立瀏覽器)。使用 `defaultProfile: "user"` 以選擇使用已登入使用者的瀏覽器。
- 自動偵測順序：如果系統預設瀏覽器為 Chromium 架構則使用該瀏覽器；否則為 Chrome → Brave → Edge → Chromium → Chrome Canary。
- 本機 `openclaw` 設定檔會自動指派 `cdpPort`/`cdpUrl` — 僅針對遠端 CDP 設定這些值。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而非原始 CDP。請勿
  為該驅動程式設定 `cdpUrl`。
- 當現有工作階段設定檔
  應連接到非預設的 Chromium 使用者設定檔 (例如 Brave 或 Edge) 時，請設定 `browser.profiles.<name>.userDataDir`。

## 使用 Brave（或其他 Chromium 架構的瀏覽器）

如果您的 **系統預設** 瀏覽器是基於 Chromium 的 (Chrome/Brave/Edge 等)，
OpenClaw 將會自動使用它。設定 `browser.executablePath` 以覆寫
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
- **遠端 CDP：** 設定 `browser.profiles.<name>.cdpUrl` (或 `browser.cdpUrl`) 以
  連接到遠端的基於 Chromium 瀏覽器。在這種情況下，OpenClaw 將不會啟動本機瀏覽器。

停止行為因設定檔模式而異：

- 本機受管理設定檔：`openclaw browser stop` 會停止
  OpenClaw 啟動的瀏覽器程序
- 僅附加 和遠端 CDP 設定檔：`openclaw browser stop` 會關閉使用中的
  控制工作階段並釋放 Playwright/CDP 模擬覆寫 (視口、
  色彩配置、地區設定、時區、離線模式和類似狀態)，
  即使 OpenClaw 並未啟動任何瀏覽器程序

遠端 CDP URL 可以包含認證：

- 查詢權杖 (例如 `https://provider.example?token=<token>`)
- HTTP Basic 驗證 (例如 `https://user:pass@provider.example`)

當呼叫 `/json/*` 端點以及連接
到 CDP WebSocket 時，OpenClaw 會保留驗證資訊。建議優先使用環境變數或密鑰管理工具來處理
權杖，而非將其提交至設定檔中。

## 節點瀏覽器代理（零設定預設值）

如果您在擁有瀏覽器的機器上執行 **節點主機**，OpenClaw 可以
在無需額外瀏覽器設定的情況下，將瀏覽器工具呼叫自動路由至該節點。
這是遠端閘道的預設路徑。

註記：

- 節點主機透過 **代理指令** 公開其本機瀏覽器控制伺服器。
- 設定檔來自節點本身的 `browser.profiles` 設定 (與本機相同)。
- `nodeHost.browserProxy.allowProfiles` 是選用的。將其留空以使用舊版/預設行為：所有已設定的設定檔均可透過代理存取，包括設定檔的建立/刪除路由。
- 如果您設定 `nodeHost.browserProxy.allowProfiles`，OpenClaw 會將其視為最低權限邊界：僅允許針對列入白名單的設定檔，並且在代理介面上阻擋持久化設定檔的建立/刪除路由。
- 如果您不想要它，請將其停用：
  - 在節點上：`nodeHost.browserProxy.enabled=false`
  - 在閘道上：`gateway.nodes.browser.mode="off"`

## Browserless（託管的遠端 CDP）

[Browserless](https://browserless.io) 是一個託管的 Chromium 服務，透過 HTTPS 和 WebSocket 公開 CDP 連接 URL。OpenClaw 可以使用任一種形式，但對於遠端瀏覽器設定檔，最簡單的選項是來自 Browserless 連接文件的直接 WebSocket URL。

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

- 將 `<BROWSERLESS_API_KEY>` 替換為您真實的 Browserless 權杖。
- 選擇與您的 Browserless 帳戶相符的區域端點（請參閱其文件）。
- 如果 Browserless 提供您 HTTPS 基礎 URL，您可以將其轉換為
  `wss://` 以進行直接 CDP 連線，或者保留 HTTPS URL 並讓 OpenClaw
  自動探索 `/json/version`。

## 直接 WebSocket CDP 提供商

某些託管瀏覽器服務公開 **直接 WebSocket** 端點，而不是標準的基於 HTTP 的 CDP 探索 (`/json/version`)。OpenClaw 接受三種 CDP URL 形狀並自動選擇正確的連接策略：

- **HTTP(S) 探索** — `http://host[:port]` 或 `https://host[:port]`。
  OpenClaw 呼叫 `/json/version` 來探索 WebSocket 除錯器 URL，然後
  進行連接。沒有 WebSocket 備援方案。
- **直接 WebSocket 端點** — `ws://host[:port]/devtools/<kind>/<id>` 或
  `wss://...` 並帶有 `/devtools/browser|page|worker|shared_worker|service_worker/<id>`
  路徑。OpenClaw 透過 WebSocket 握手直接連接並完全跳過
  `/json/version`。
- **純 WebSocket 根目錄** — `ws://host[:port]` 或 `wss://host[:port]` 且沒有
  `/devtools/...` 路徑 (例如 [Browserless](https://browserless.io),
  [Browserbase](https://www.browserbase.com))。OpenClaw 首先嘗試 HTTP
  `/json/version` 探索 (將協定正規化為 `http`/`https`)；
  如果探索傳回 `webSocketDebuggerUrl` 則使用該 URL，否則 OpenClaw
  會退回到在純根目錄進行直接 WebSocket 握手。這涵蓋了
  類 Chrome 風格的遠端除錯連接埠和僅限 WebSocket 的提供者。

指向本機 Chrome 執行個體且沒有 `/devtools/...` 路徑的純 `ws://host:port` / `wss://host:port` 透過優先探索的備援機制獲得支援 — Chrome 僅在接受來自 `/json/version` 傳回的特定瀏覽器或目標路徑上接受 WebSocket 升級，因此僅使用純根目錄握手會失敗。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一個雲端平台，用於執行
具備內建驗證碼解決、隱身模式和住宅代理的
無頭瀏覽器。

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

- [註冊](https://www.browserbase.com/sign-up) 並從 [總覽儀表板](https://www.browserbase.com/overview)
  複製您的 **API 金鑰**。
- 將 `<BROWSERBASE_API_KEY>` 替換為您真實的 Browserbase API 金鑰。
- Browserbase 會在連接 WebSocket 時自動建立瀏覽器階段，因此
  不需要手動建立階段。
- 免費方案允許一個並行階段和每月一個瀏覽器小時。
  請參閱 [價格](https://www.browserbase.com/pricing) 以了解付費方案的額度。
- 請參閱 [Browserbase 文件](https://docs.browserbase.com) 以取得完整的 API
  參考、SDK 指南和整合範例。

## 安全性

重點：

- 瀏覽器控制僅限回送；存取流程透過 Gateway 的認證或節點配對進行。
- 獨立的回送瀏覽器 HTTP API **僅使用共享金鑰認證**：
  gateway token bearer auth、`x-openclaw-password`，或使用已設定的 gateway 密碼進行 HTTP Basic 認證。
- Tailscale Serve 身分標頭和 `gateway.auth.mode: "trusted-proxy"`
  **不會**對此獨立回送瀏覽器 API 進行認證。
- 如果啟用了瀏覽器控制且未設定共享金鑰認證，OpenClaw
  會在啟動時自動產生 `gateway.auth.token` 並將其儲存至設定中。
- 當 `gateway.auth.mode` 已經是
  `password`、`none` 或 `trusted-proxy` 時，
  OpenClaw **不會**自動產生該 token。
- 將 Gateway 和任何節點主機保持在私人網路上 (Tailscale)；避免公開曝光。
- 將遠端 CDP URL/token 視為機密；優先使用環境變數或機密管理員。

遠端 CDP 提示：

- 盡可能優先使用加密端點 (HTTPS 或 WSS) 和短期 token。
- 避免將長期有效的 token 直接內嵌於設定檔中。

## 設定檔 (多瀏覽器)

OpenClaw 支援多個命名設定檔 (路由設定)。設定檔可以是：

- **openclaw-managed**：專屬的基於 Chromium 的瀏覽器執行個體，擁有自己的使用者資料目錄和 CDP 連接埠
- **remote**：明確的 CDP URL (在其他地方執行的基於 Chromium 的瀏覽器)
- **現有工作階段**：透過 Chrome DevTools MCP 自動連線連線到您現有的 Chrome 設定檔

預設值：

- 如果 `openclaw` 設定檔不存在，將會自動建立。
- 內建的 `user` 設定檔專用於 Chrome MCP 現有工作階段連接。
- 除了 `user` 之外，現有工作階段設定檔屬於選用功能；請使用 `--driver existing-session` 來建立。
- 本機 CDP 連接埠預設從 **18800–18899** 分配。
- 刪除設定檔會將其本機資料目錄移至垃圾桶。

所有控制端點都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 透過 Chrome DevTools MCP 連接現有工作階段

OpenClaw 也可以透過官方 Chrome DevTools MCP 伺服器附加到正在執行的 Chromium 瀏覽器設定檔。
這會重複使用該瀏覽器設定檔中已開啟的分頁和登入狀態。

官方背景與設定參考資料：

- [Chrome for Developers: Use Chrome DevTools MCP with your browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

內建設定檔：

- `user`

選用：如果您想要不同的名稱、顏色或瀏覽器資料目錄，可以建立您自己的自訂現有工作階段設定檔。

預設行為：

- 內建的 `user` 設定檔使用 Chrome MCP 自動連線，該功能會以
  本機預設的 Google Chrome 設定檔為目標。

若是使用 Brave、Edge、Chromium 或非預設的 Chrome 設定檔，請使用 `userDataDir`：

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

1. 開啟該瀏覽器用於遠端偵錯的 inspect 頁面。
2. 啟用遠端偵錯。
3. 保持瀏覽器執行，並在 OpenClaw 附加時核准連線提示。

常見 inspect 頁面：

- Chrome：`chrome://inspect/#remote-debugging`
- Brave：`brave://inspect/#remote-debugging`
- Edge：`edge://inspect/#remote-debugging`

即時附加冒煙測試：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功時的樣貌：

- `status` 顯示 `driver: existing-session`
- `status` 顯示 `transport: chrome-mcp`
- `status` 顯示 `running: true`
- `tabs` 列出您已開啟的瀏覽器分頁
- `snapshot` 從選取的即時分頁返回 refs

如果附加無法作用，請檢查：

- 目標 Chromium 瀏覽器版本為 `144+`
- 已在該瀏覽器的檢查頁面中啟用遠端偵錯
- 瀏覽器已顯示，且您已接受附加同意提示
- `openclaw doctor` 會遷移舊的擴充功能式瀏覽器設定，並檢查
  預設自動連線設定檔是否在本機安裝了 Chrome，但它無法
  為您啟用瀏覽器端的遠端偵錯

Agent 使用方式：

- 當您需要使用者的登入瀏覽器狀態時，請使用 `profile="user"`。
- 如果您使用自訂的現有工作階段設定檔，請傳入該明確的設定檔名稱。
- 僅當使用者在電腦前以批准附加提示時，才選擇此模式。
- Gateway 或節點主機可以產生 `npx chrome-devtools-mcp@latest --autoConnect`

備註：

- 此途徑的風險高於隔離的 `openclaw` 設定檔，因為它可以在
  您已登入的瀏覽器工作階段中進行操作。
- OpenClaw 不會為此驅動程式啟動瀏覽器；它僅附加至
  現有的工作階段。
- OpenClaw 在此使用官方 Chrome DevTools MCP `--autoConnect` 流程。如果
  設定了 `userDataDir`，OpenClaw 會將其傳遞以目標該明確的
  Chromium 使用者資料目錄。
- 現有工作階段的螢幕擷圖支援頁面擷取和來自快照的 `--ref` 元素
  擷取，但不支援 CSS `--element` 選擇器。
- 現有工作階段的頁面螢幕擷圖可透過 Chrome MCP 在無 Playwright 的情況下運作。
  基於 Ref 的元素螢幕擷圖 (`--ref`) 也可在那裡運作，但 `--full-page`
  不能與 `--ref` 或 `--element` 結合使用。
- 現有工作階段的動作仍然比受管理的瀏覽器
  途徑更有限：
  - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要
    快照 refs 而非 CSS 選擇器
  - `click` 僅限左鍵（無按鈕覆寫或修飾鍵）
  - `type` 不支援 `slowly=true`；請使用 `fill` 或 `press`
  - `press` 不支援 `delayMs`
  - `hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不
    支援每次呼叫的逾時覆寫
  - `select` 目前僅支援單一數值
- 現有工作階段 `wait --url` 支援精確、子字串和 glob 模式，
  就像其他瀏覽器驅動程式一樣。目前尚未支援 `wait --load networkidle`。
- 現有工作階段上傳掛鉤需要 `ref` 或 `inputRef`，一次支援
  一個檔案，並且不支援 CSS `element` 定位。
- 現有工作階段對話方塊掛鉤不支援逾時覆寫。
- 某些功能仍需要受管理的瀏覽器路徑，包括批次
  動作、PDF 匯出、下載攔截和 `responsebody`。
- 現有工作階段可以附加至選取的主機或透過連線的
  瀏覽器節點。如果 Chrome 位於其他地方且未連線瀏覽器節點，請
  改用遠端 CDP 或節點主機。

## 隔離保證

- **專用使用者資料目錄**：絕不會接觸您的個人瀏覽器設定檔。
- **專用連接埠**：避免 `9222` 以防止與開發工作流程發生衝突。
- **確定性分頁控制**：透過 `targetId` 鎖定分頁，而非「上一個分頁」。

## 瀏覽器選擇

在本地啟動時，OpenClaw 會選擇第一個可用的：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 覆寫。

平台：

- macOS：檢查 `/Applications` 和 `~/Applications`。
- Linux：尋找 `google-chrome`、`brave`、`microsoft-edge`、`chromium` 等等。
- Windows：檢查常見的安裝位置。

## 控制 API (選用)

僅限於本地整合，Gateway 會公開一個小型回環 HTTP API：

- 狀態/啟動/停止：`GET /`, `POST /start`, `POST /stop`
- 分頁：`GET /tabs`, `POST /tabs/open`, `POST /tabs/focus`, `DELETE /tabs/:targetId`
- 快照/截圖：`GET /snapshot`, `POST /screenshot`
- 操作：`POST /navigate`, `POST /act`
- Hooks：`POST /hooks/file-chooser`, `POST /hooks/dialog`
- 下載：`POST /download`, `POST /wait/download`
- 偵錯：`GET /console`, `POST /pdf`
- 偵錯：`GET /errors`, `GET /requests`, `POST /trace/start`, `POST /trace/stop`, `POST /highlight`
- 網路：`POST /response/body`
- 狀態：`GET /cookies`, `POST /cookies/set`, `POST /cookies/clear`
- 狀態：`GET /storage/:kind`, `POST /storage/:kind/set`, `POST /storage/:kind/clear`
- 設定：`POST /set/offline`, `POST /set/headers`, `POST /set/credentials`, `POST /set/geolocation`, `POST /set/media`, `POST /set/timezone`, `POST /set/locale`, `POST /set/device`

所有端點都接受 `?profile=<name>`。

如果設定了 shared-secret 閘道驗證，瀏覽器 HTTP 路由也需要驗證：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用該密碼進行 HTTP Basic 驗證

備註：

- 此獨立的 loopback 瀏覽器 API **不會**使用 trusted-proxy 或 Tailscale Serve 身份標頭。
- 如果 `gateway.auth.mode` 為 `none` 或 `trusted-proxy`，這些 loopback 瀏覽器路由不會繼承那些承載身分的模式；請將它們保持為僅限 loopback。

### `/act` 錯誤合約

`POST /act` 使用結構化錯誤回應來處理路由層級的驗證和原則失敗：

```json
{ "error": "<message>", "code": "ACT_*" }
```

目前的 `code` 值：

- `ACT_KIND_REQUIRED` (HTTP 400)：`kind` 缺失或無法識別。
- `ACT_INVALID_REQUEST` (HTTP 400)：動作承載未通過正規化或驗證。
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400)：`selector` 與不支援的動作種類一起使用。
- `ACT_EVALUATE_DISABLED` (HTTP 403)：`evaluate` (或 `wait --fn`) 已被設定停用。
- `ACT_TARGET_ID_MISMATCH` (HTTP 403)：頂層或批次 `targetId` 與請求目標衝突。
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501)：不支援對既有 session 概要檔執行此動作。

其他執行階段失敗可能仍會傳回 `{ "error": "<message>" }` 而不包含
`code` 欄位。

### Playwright 需求

某些功能 (導覽/動作/AI 快照/角色快照、元素截圖、PDF) 需要 Playwright。如果未安裝 Playwright，這些端點會傳回清楚的 501 錯誤。

沒有 Playwright 時仍可運作的功能：

- ARIA 快照
- 當每個分頁的 CDP WebSocket 可用時，針對受管理的 `openclaw` 瀏覽器擷取頁面截圖
- 針對 `existing-session` / Chrome MCP 概要檔擷取頁面截圖
- 從快照輸出取得基於 `existing-session` ref 的截圖 (`--ref`)

仍然需要 Playwright 的功能：

- `navigate`
- `act`
- AI 快照 / 角色快照
- CSS 選擇器元素截圖 (`--element`)
- 完整瀏覽器 PDF 匯出

元素截圖也會拒絕 `--full-page`；路由會傳回 `fullPage is
not supported for element screenshots`。

如果您看到 `Playwright is not available in this gateway build`，請安裝完整的
Playwright 套件 (而非 `playwright-core`) 並重新啟動 gateway，或重新安裝
含瀏覽器支援的 OpenClaw。

#### Docker Playwright 安裝

如果您的 Gateway 在 Docker 中執行，請避免使用 `npx playwright` (npm 覆寫衝突)。
請改用內建的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

若要保存瀏覽器下載內容，請設定 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`），並確保 `/home/node` 透過
`OPENCLAW_HOME_VOLUME` 或綁定掛載被保存。請參閱 [Docker](/zh-Hant/install/docker)。

## 運作方式（內部）

高階流程：

- 一個小型的 **控制伺服器 (control server)** 接受 HTTP 請求。
- 它透過 **CDP** 連接到基於 Chromium 的瀏覽器 (Chrome/Brave/Edge/Chromium)。
- 對於進階動作 (點擊/輸入/快照/PDF)，它在 CDP 之上使用 **Playwright**。
- 當缺少 Playwright 時，僅可使用非 Playwright 操作。

此設計讓代理程式保持在一個穩定、確定的介面上，同時允許您交換本機/遠端瀏覽器和設定檔。

## CLI 快速參考

所有指令都接受 `--browser-profile <name>` 以指定特定的設定檔。
所有指令也接受 `--json` 以取得機器可讀的輸出（穩定的載荷）。

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

生命週期註記：

- 對於僅附加和遠端 CDP 設定檔，`openclaw browser stop` 在測試後
  仍然是正確的清理指令。它會關閉作用中的控制工作階段並
  清除暫時的模擬覆寫，而不是終止底層
  瀏覽器。
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

註記：

- `upload` 和 `dialog` 是**準備** 呼叫；在觸發選擇器/對話框的點擊/按壓
  之前執行它們。
- 下載和追蹤輸出路徑限制在 OpenClaw 暫存根目錄中：
  - 追蹤： `/tmp/openclaw` (後備： `${os.tmpdir()}/openclaw`)
  - 下載： `/tmp/openclaw/downloads` (後備： `${os.tmpdir()}/openclaw/downloads`)
- 上傳路徑限制在 OpenClaw 暫存上傳根目錄中：
  - 上傳： `/tmp/openclaw/uploads` (後備： `${os.tmpdir()}/openclaw/uploads`)
- `upload` 也可以透過 `--input-ref` 或 `--element` 直接設定檔案輸入。
- `snapshot`：
  - `--format ai` (安裝 Playwright 時的預設值)：傳回帶有數字參照 (`aria-ref="<n>"`) 的 AI 快照。
  - `--format aria`：返回無障礙樹（無 ref；僅供檢查）。
  - `--efficient`（或 `--mode efficient`）：精簡角色快照預設（interactive + compact + depth + lower maxChars）。
  - 組態預設值（僅適用於工具/CLI）：設定 `browser.snapshotDefaults.mode: "efficient"` 以在呼叫端未傳遞模式時使用高效快照（請參閱 [Gateway 組態](/zh-Hant/gateway/configuration-reference#browser)）。
  - 角色快照選項（`--interactive`、`--compact`、`--depth`、`--selector`）會強制執行具有像 `ref=e12` 這類 ref 的角色型快照。
  - `--frame "<iframe selector>"` 將角色快照的範圍限制在 iframe（與像 `e12` 這類角色 ref 搭配使用）。
  - `--interactive` 輸出一個扁平、易於挑選的互動元素列表（最適合驅動動作）。
  - `--labels` 新增僅限視口的螢幕截圖，並覆蓋 ref 標籤（列印 `MEDIA:<path>`）。
- `click`/`type`/等需要來自 `snapshot` 的 `ref`（可以是數值 `12` 或角色 ref `e12`）。
  對於動作，刻意不支援 CSS 選擇器。

## 快照與參照

OpenClaw 支援兩種「快照」樣式：

- **AI 快照（數值參照）**：`openclaw browser snapshot`（預設值；`--format ai`）
  - 輸出：包含數值參照的文字快照。
  - 動作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在內部，參照是透過 Playwright 的 `aria-ref` 解析的。

- **角色快照（像 `e12` 這類角色參照）**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 輸出：具有 `[ref=e12]`（以及選用的 `[nth=1]`）的角色型列表/樹狀結構。
  - 動作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在內部，參照是透過 `getByRole(...)` 解析的（重複項則加上 `nth()`）。
  - 新增 `--labels` 以包含帶有重疊 `e12` 標籤的視口螢幕截圖。

參照行為：

- 參照在導覽期間**不穩定**；如果發生錯誤，請重新執行 `snapshot` 並使用新的參照。
- 如果角色快照是使用 `--frame` 拍攝的，角色參照將限定於該 iframe，直到下一個角色快照為止。

## 等待增強功能

您除了等待時間/文字之外，還可以等待：

- 等待 URL（Playwright 支援 glob 模式）：
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

當動作失敗時（例如「不可見」、「嚴格模式違規」、「被覆蓋」）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在互動模式下優先使用角色參照）
3. 如果仍然失敗：`openclaw browser highlight <ref>` 以查看 Playwright 正在以什麼為目標
4. 如果頁面行為異常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 進行深度除錯：記錄追蹤：
   - `openclaw browser trace start`
   - 重現問題
   - `openclaw browser trace stop` (列印 `TRACE:<path>`)

## JSON 輸出

`--json` 適用於腳本和結構化工具。

範例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包含 `refs` 以及一個小的 `stats` 區塊（行/字元/參照/互動），以便工具可以推斷負載大小和密度。

## 狀態與環境控制項

這些對於「讓網站表現得像 X」的工作流程很有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- Storage：`storage local|session get|set|clear`
- Offline：`set offline on|off`
- Headers：`set headers --headers-json '{"X-Debug":"1"}'`（舊版 `set headers --json '{"X-Debug":"1"}'` 仍受支援）
- HTTP 基本驗證：`set credentials user pass` (或 `--clear`)
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"` (或 `--clear`)
- 媒體：`set media dark|light|no-preference|none`
- 時區 / 地區設定：`set timezone ...`、`set locale ...`
- 裝置 / 檢視區：
  - `set device "iPhone 14"` (Playwright 裝置預設)
  - `set viewport 1280 720`

## 安全性與隱私

- OpenClaw 瀏覽器設定檔可能包含已登入的工作階段；請將其視為敏感資料。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  會在頁面上下文中執行任意的 JavaScript。提示詞注入可以引導這個過程。如果不需要，請使用 `browser.evaluateEnabled=false` 將其停用。
- 關於登入和反機器人注意事項 (X/Twitter 等)，請參閱[瀏覽器登入 + X/Twitter 發文](/zh-Hant/tools/browser-login)。
- 請保持 Gateway/節點主機的私密性 (僅限 loopback 或 tailnet)。
- 遠端 CDP 端點功能強大；請使用通道並加以保護。

嚴格模式範例 (預設封鎖私人/內部目的地)：

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

關於 Linux 特定問題 (特別是 snap Chromium)，請參閱
[瀏覽器疑難排解](/zh-Hant/tools/browser-linux-troubleshooting)。

關於 WSL2 Gateway + Windows Chrome 分割主機設定，請參閱
[WSL2 + Windows + 遠端 Chrome CDP 疑難排解](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

### CDP 啟動失敗與導覽 SSRF 封鎖

這些是不同的失敗類別，它們指向不同的程式碼路徑。

- **CDP 啟動或就緒失敗** 表示 OpenClaw 無法確認瀏覽器控制平面是否正常。
- **導覽 SSRF 封鎖** 表示瀏覽器控制平面正常，但頁面導覽目標遭到原則拒絕。

常見範例：

- CDP 啟動或就緒失敗：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
- 導覽 SSRF 封鎖：
  - `open`、`navigate`、快照 或分頁開啟流程失敗，並顯示瀏覽器/網路原則錯誤，而 `start` 和 `tabs` 仍然正常運作

請使用這個最小順序來區分這兩者：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何閱讀結果：

- 如果 `start` 失敗並出現 `not reachable after start`，請先對 CDP 準備狀態進行故障排除。
- 如果 `start` 成功但 `tabs` 失敗，控制平面仍然不健康。將此視為 CDP 連線性問題，而非頁面導航問題。
- 如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失敗，則瀏覽器控制平面已啟動，故障出在導航策略或目標頁面。
- 如果 `start`、`tabs` 和 `open` 全部成功，則基本的管理瀏覽器控制路徑狀態良好。

重要的行為細節：

- 即使您未配置 `browser.ssrfPolicy`，瀏覽器配置也預設為「失敗關閉」的 SSRF 策略物件。
- 對於本機回送 `openclaw` 管理設定檔，CDP 健康檢查會刻意略過針對 OpenClaw 自身本機控制平面的瀏覽器 SSRF 連線性強制執行。
- 導航保護是分開的。成功的 `start` 或 `tabs` 結果並不表示後續的 `open` 或 `navigate` 目標是允許的。

安全性指導原則：

- 預設情況下**請勿**放寬瀏覽器 SSRF 策略。
- 優先使用狹隘的主機例外（例如 `hostnameAllowlist` 或 `allowedHostnames`），而不是廣泛的私人網路存取。
- 僅在刻意信任、需要並已審查私人網路瀏覽器存取的環境中使用 `dangerouslyAllowPrivateNetwork: true`。

範例：導航被封鎖，控制平面健康

- `start` 成功
- `tabs` 成功
- `open http://internal.example` 失敗

這通常表示瀏覽器啟動正常，導航目標需要策略審查。

範例：在導航變得重要之前啟動被封鎖

- `start` 失敗並出現 `not reachable after start`
- `tabs` 也失敗或無法執行

這指向瀏覽器啟動或 CDP 連線性問題，而非頁面 URL 允許清單問題。

## Agent 工具 + 控制運作方式

Agent 獲得**一個用於瀏覽器自動化的工具**：

- `browser` — status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

對應方式：

- `browser snapshot` 會回傳一個穩定的 UI 樹 (AI 或 ARIA)。
- `browser act` 使用快照 `ref` ID 來進行點擊/輸入/拖曳/選取。
- `browser screenshot` 擷取像素 (完整頁面或元素)。
- `browser` 接受：
  - `profile` 以選擇命名的瀏覽器設定檔 (openclaw、chrome 或 remote CDP)。
  - `target` (`sandbox` | `host` | `node`) 以選擇瀏覽器的所在位置。
  - 在沙盒化工作階段中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙盒化工作階段預設為 `sandbox`，非沙盒工作階段預設為 `host`。
  - 如果連接了具備瀏覽器功能的節點，除非您釘選 `target="host"` 或 `target="node"`，否則該工具可能會自動路由至該節點。

這能保持 Agent 的確定性，並避免脆弱的選取器。

## 相關

- [工具總覽](/zh-Hant/tools) — 所有可用的 Agent 工具
- [沙盒機制](/zh-Hant/gateway/sandboxing) — 沙盒環境中的瀏覽器控制
- [安全性](/zh-Hant/gateway/security) — 瀏覽器控制的風險與加固
