---
summary: "整合的瀏覽器控制服務 + 操作指令"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "瀏覽器 (由 OpenClaw 管理)"
---

OpenClaw 可以執行一個由代理程式控制的**專屬 Chrome/Brave/Edge/Chromium 設定檔**。
它與您的個人瀏覽器隔離，並透過閘道內部的一個小型本機
控制服務進行管理（僅限迴路）。

初學者觀點：

- 將其視為一個**獨立、僅供代理程式使用的瀏覽器**。
- `openclaw` 設定檔**不會**碰觸您的個人瀏覽器設定檔。
- 代理程式可以在安全的通道中**開啟分頁、閱讀頁面、點擊和輸入**。
- 內建的 `user` 設定檔會透過 Chrome MCP 連接到您真實且已登入的 Chrome 工作階段。

## 您將獲得

- 一個名為 **openclaw** 的獨立瀏覽器設定檔（預設為橘色主題）。
- 確定性分頁控制（列出/開啟/聚焦/關閉）。
- 代理程式動作（點擊/輸入/拖曳/選取）、快照、螢幕截圖、PDF。
- 一個隨附的 `browser-automation` 技能，當瀏覽器
  外掛程式啟用時，會教導代理程式有關快照、
  穩定分頁、過時參照和手動阻擋器復原迴圈的知識。
- 選用的多設定檔支援（`openclaw`、`work`、`remote`，...）。

此瀏覽器**不是**您日常使用的瀏覽器。它是用於
代理程式自動化和驗證的安全、隔離介面。

## 快速入門

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw doctor --deep
openclaw browser --browser-profile openclaw status
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

如果您收到「Browser disabled」（瀏覽器已停用）的訊息，請在設定中啟用它（見下文）並重新啟動
Gateway。

如果完全缺少 `openclaw browser`，或者代理表示瀏覽器工具無法使用，請跳至 [Missing browser command or tool](/zh-Hant/tools/browser#missing-browser-command-or-tool)。

## 外掛程式控制

預設的 `browser` 工具是一個隨附的外掛程式。停用它以便用另一個註冊相同 `browser` 工具名稱的外掛程式來取代它：

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

預設值同時需要 `plugins.entries.browser.enabled` **以及** `browser.enabled=true`。僅停用外掛程式會將 `openclaw browser` CLI、`browser.request` 閘道方法、代理程式工具和控制服務作為一個單元移除；您的 `browser.*` 設定會保持完整以便替換。

瀏覽器設定的變更需要重新啟動閘道，以便外掛程式能重新註冊其服務。

## 代理程式指引

工具配置檔注意：`tools.profile: "coding"` 包含 `web_search` 和
`web_fetch`，但不包含完整的 `browser` 工具。如果代理或生成的子代理應使用瀏覽器自動化，請在配置檔階段新增 browser：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

對於單一代理，請使用 `agents.list[].tools.alsoAllow: ["browser"]`。
單獨使用 `tools.subagents.tools.allow: ["browser"]` 是不夠的，因為子代理策略是在配置檔過濾之後套用的。

瀏覽器外掛程式提供兩個層級的代理指引：

- `browser` 工具描述攜帶了精簡的始終啟用契約：選擇正確的配置檔，將引用保持在同一個分頁上，使用 `tabId`/標籤進行分頁定位，並載入瀏覽器技能以進行多步驟工作。
- 隨附的 `browser-automation` 技能攜帶了更長的操作循環：
  首先檢查狀態/分頁，標記任務分頁，操作前建立快照，UI 變更後重新建立快照，
  恢復過時引用一次，並將登入/2FA/驗證碼或
  攝影機/麥克風封鎖程序回報為手動操作，而不是進行猜測。

當外掛程式啟用時，隨附的技能會列在代理的可用技能中。完整的技能指令會按需載入，因此常規回合不需支付完整的 token 成本。

## 遺失瀏覽器指令或工具

如果升級後 `openclaw browser` 未知、`browser.request` 遺失，或者代理回報瀏覽器工具不可用，通常原因是 `plugins.allow` 清單遺漏了 `browser` 且沒有根層級的 `browser` 設定區塊存在。請新增它：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

明確的根層級 `browser` 區塊，例如 `browser.enabled=true` 或 `browser.profiles.<name>`，即使在限制性的 `plugins.allow` 下也會啟動隨附的瀏覽器外掛程式，符合頻道設定行為。`plugins.entries.browser.enabled=true` 和 `tools.alsoAllow: ["browser"]` 本身不能取代允許清單成員資格。完全移除 `plugins.allow` 也會恢復預設值。

## 配置檔：`openclaw` vs `user`

- `openclaw`：受管理、隔離的瀏覽器（不需要擴充功能）。
- `user`：內建 Chrome MCP 附加設定檔，用於您的**真實已登入 Chrome** 工作階段。

針對代理程式瀏覽器工具呼叫：

- 預設：使用隔離的 `openclaw` 瀏覽器。
- 當現有的登入工作階段很重要，且使用者位於電腦前以點擊/核准任何附加提示時，建議優先使用 `profile="user"`。
- 當您想要特定的瀏覽器模式時，`profile` 是明確的覆蓋選項。

如果您希望預設使用受管理模式，請設定 `browser.defaultProfile: "openclaw"`。

## 組態

瀏覽器設定位於 `~/.openclaw/openclaw.json` 中。

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
    localLaunchTimeoutMs: 15000, // local managed Chrome discovery timeout (ms)
    localCdpReadyTimeoutMs: 8000, // local managed post-launch CDP readiness timeout (ms)
    actionTimeoutMs: 60000, // default browser act timeout (ms)
    tabCleanup: {
      enabled: true, // default: true
      idleMinutes: 120, // set 0 to disable idle cleanup
      maxTabsPerSession: 8, // set 0 to disable the per-session cap
      sweepMinutes: 5,
    },
    defaultProfile: "openclaw",
    color: "#FF4500",
    headless: false,
    noSandbox: false,
    attachOnly: false,
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    profiles: {
      openclaw: { cdpPort: 18800, color: "#FF4500" },
      work: {
        cdpPort: 18801,
        color: "#0066CC",
        headless: true,
        executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      },
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

<AccordionGroup>

<Accordion title="連接埠與可連線性">

- 控制服務會綁定到從 `gateway.port` 推導出的連接埠上的 loopback（預設 `18791` = gateway + 2）。覆寫 `gateway.port` 或 `OPENCLAW_GATEWAY_PORT` 會將同一系列中的推導連接埠進行位移。
- 本地 `openclaw` 設定檔會自動指派 `cdpPort`/`cdpUrl`；僅針對遠端 CDP 設定這些值。若未設定 `cdpUrl`，預設為受管理的本地 CDP 連接埠。
- `remoteCdpTimeoutMs` 適用於遠端和 `attachOnly` CDP HTTP 可連線性
  檢查以及開啟分頁的 HTTP 請求；`remoteCdpHandshakeTimeoutMs` 適用於
  其 CDP WebSocket 握手。
- `localLaunchTimeoutMs` 是本地啟動的受管理 Chrome
  程序公開其 CDP HTTP 端點的預算時間。`localCdpReadyTimeoutMs` 是在發現程序後，
  CDP websocket 就緒狀態的後續預算時間。
  在 Raspberry Pi、低階 VPS 或 Chromium 啟動較慢的舊硬體上，請增加這些數值。數值必須是不超過 `120000` 毫秒的正整數；無效的
  設定值會被拒絕。
- 針對每個設定檔，重複的受管理 Chrome 啟動/就緒失敗會觸發熔斷機制。在連續發生多次失敗後，OpenClaw 會暫時暫停新的啟動嘗試，而不是在每次瀏覽器工具呼叫時都生成 Chromium。請修復啟動問題、若不需要則停用瀏覽器，或在修復後重新啟動 Gateway。
- 當呼叫端未傳遞 `timeoutMs` 時，`actionTimeoutMs` 是瀏覽器 `act` 請求的預設預算時間。用戶端傳輸層會增加一個小的緩衝時間，以便長時間等待可以完成，而不會在 HTTP 邊界發生逾時。
- `tabCleanup` 是針對主要代理程式瀏覽器階段所開啟分頁的盡力而為清理。子代理程式、cron 和 ACP 生命週期清理仍會在階段結束時關閉其明確追蹤的分頁；主要階段會保持作用中分頁可重複使用，然後在背景中關閉閒置或多餘的追蹤分頁。

</Accordion>

<Accordion title="SSRF 政策">

- 瀏覽器導航和開啟分頁在導航前會受到 SSRF 防護，並在導航後對最終的 `http(s)` URL 進行盡力的重新檢查。
- 在嚴格 SSRF 模式下，遠端 CDP 端點探索和 `/json/version` 探測（`cdpUrl`）也會被檢查。
- Gateway/Provider 的 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY` 環境變數不會自動代理 OpenClaw 管理的瀏覽器。受管理的 Chrome 預設直接啟動，因此 Provider 的代理設定不會削弱瀏覽器的 SSRF 檢查。
- 若要代理受管理的瀏覽器本身，請透過 `browser.extraArgs` 傳遞明確的 Chrome 代理標誌，例如 `--proxy-server=...` 或 `--proxy-pac-url=...`。除非有意啟用私有網路瀏覽器存取權，否則嚴格 SSRF 模式會阻擋明確的瀏覽器代理路由。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 預設為關閉；僅在有意信任私有網路瀏覽器存取權時才啟用。
- `browser.ssrfPolicy.allowPrivateNetwork` 仍作為舊版別名受到支援。

</Accordion>

<Accordion title="設定檔行為">

- `attachOnly: true` 表示永不啟動本機瀏覽器；僅在已有瀏覽器執行時附加。
- `headless` 可全域設定或針對各個本機受管理設定檔設定。個別設定檔的值會覆寫 `browser.headless`，因此一個本機啟動的設定檔可保持無頭模式，而另一個則保持可見。
- `POST /start?headless=true` 和 `openclaw browser start --headless` 會請求
  為本機受管理設定檔進行一次性無頭啟動，而無需重寫
  `browser.headless` 或設定檔配置。由於 OpenClaw 不會啟動
  這些瀏覽器程序，因此現有工作階段、僅附加和
  遠端 CDP 設定檔會拒絕此覆寫。
- 在沒有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主機上，當環境或設定檔/全域
  配置未明確選擇有頭模式時，本機受管理設定檔
  會自動預設為無頭模式。`openclaw browser status --json`
  將 `headlessSource` 回報為 `env`、`profile`、`config`、
  `request`、`linux-display-fallback` 或 `default`。
- `OPENCLAW_BROWSER_HEADLESS=1` 強制當前程序的本機受管理啟動使用無頭模式。
  `OPENCLAW_BROWSER_HEADLESS=0` 強制一般啟動使用有頭模式，並在沒有顯示伺服器的 Linux 主機上傳回可採取動作的錯誤；
  對於該次啟動，明確的 `start --headless` 請求仍會優先生效。
- `executablePath` 可全域設定或針對各個本機受管理設定檔設定。個別設定檔的值會覆寫 `browser.executablePath`，因此不同的受管理設定檔可啟動不同的 Chromium 系瀏覽器。這兩種形式都接受 `~` 作為您的作業系統主目錄。
- `color` (頂層和各設定檔) 會對瀏覽器 UI 著色，讓您可以看到作用中的是哪個設定檔。
- 預設設定檔為 `openclaw` (受管理的獨立模式)。使用 `defaultProfile: "user"` 以選用已登入使用者的瀏覽器。
- 自動偵測順序：若系統預設瀏覽器為 Chromium 系則使用該瀏覽器；否則為 Chrome → Brave → Edge → Chromium → Chrome Canary。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而非原始 CDP。請勿為該驅動程式設定 `cdpUrl`。
- 當現有工作階段設定檔應附加至非預設的 Chromium 使用者設定檔 (Brave、Edge 等) 時，請設定 `browser.profiles.<name>.userDataDir`。此路徑也接受 `~` 作為您的作業系統主目錄。

</Accordion>

</AccordionGroup>

## 使用 Brave 或其他基於 Chromium 的瀏覽器

如果您的**系統預設**瀏覽器是基於 Chromium 的（Chrome/Brave/Edge/等），
OpenClaw 會自動使用它。設定 `browser.executablePath` 以覆蓋
自動偵測。頂層和個別設定檔的 `executablePath` 值接受您作業系統主目錄的 `~`：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

或在設定中針對各平台進行設定：

<Tabs>
  <Tab title="macOS">
```json5
{
  browser: {
    executablePath: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  },
}
```
  </Tab>
  <Tab title="Windows">
```json5
{
  browser: {
    executablePath: "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  },
}
```
  </Tab>
  <Tab title="Linux">
```json5
{
  browser: {
    executablePath: "/usr/bin/brave-browser",
  },
}
```
  </Tab>
</Tabs>

個別設定檔的 `executablePath` 僅影響 OpenClaw 啟動的本機受管理設定檔。`existing-session` 設定檔則會改為附加到已執行的瀏覽器，而遠端 CDP 設定檔則使用 `cdpUrl` 背後的瀏覽器。

## 本機控制與遠端控制

- **本機控制（預設）：** 閘道會啟動回送控制服務，並可以啟動本機瀏覽器。
- **遠端控制（節點主機）：** 在擁有瀏覽器的機器上執行節點主機；閘道會將瀏覽器動作代理給它。
- **遠端 CDP：** 設定 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）以
  附加到遠端基於 Chromium 的瀏覽器。在這種情況下，OpenClaw 將不會啟動本機瀏覽器。
- 對於回送上的外部受管理 CDP 服務（例如發布至 `127.0.0.1` 的 Docker 中
  的 Browserless），請同時設定 `attachOnly: true`。沒有 `attachOnly` 的回送 CDP
  會被視為本機 OpenClaw 受管理的瀏覽器設定檔。
- `headless` 僅影響 OpenClaw 啟動的本機受管理設定檔。它不會重新啟動或變更現有工作階段或遠端 CDP 瀏覽器。
- `executablePath` 遵循相同的地機受管理設定檔規則。在執行中的本機受管理設定檔上變更它會將該設定檔標記為重新啟動/協調，以便下次啟動時使用新的執行檔。

停止行為因設定檔模式而異：

- 本機受管理設定檔： `openclaw browser stop` 會停止 OpenClaw 啟動的瀏覽器程序
- attach-only 和遠端 CDP 設定檔：`openclaw browser stop` 會關閉現有的
  控制工作階段並釋放 Playwright/CDP 模擬覆寫（視口、
  色彩配置、地區、時區、離線模式和類似狀態），即使
  OpenClaw 並未啟動任何瀏覽器程序

遠端 CDP URL 可以包含認證資訊：

- 查詢權杖（例如 `https://provider.example?token=<token>`）
- HTTP 基本認證（例如 `https://user:pass@provider.example`）

OpenClaw 在呼叫 `/json/*` 端點以及連線
到 CDP WebSocket 時會保留認證資訊。對於權杖，建議優先使用環境變數或秘密管理工具，
而不要將其提交到設定檔中。

## Node 瀏覽器代理程式（零設定預設值）

如果您在擁有瀏覽器的機器上執行 **node host**，OpenClaw 可以
在沒有任何額外瀏覽器設定的情況下，將瀏覽器工具呼叫自動路由傳送至該節點。
這是遠端閘道的預設路徑。

備註：

- 節點主機透過 **proxy command** 公開其本機瀏覽器控制伺服器。
- 設定檔來自節點自己的 `browser.profiles` 設定（與本機相同）。
- `nodeHost.browserProxy.allowProfiles` 是選用的。將其保留空白以使用舊版/預設行為：所有已設定的設定檔仍可透過代理程式存取，包括設定檔的建立/刪除路由。
- 如果您設定 `nodeHost.browserProxy.allowProfiles`，OpenClaw 會將其視為最小權限邊界：只有加入允許清單的設定檔才能被指定，且持續性設定檔的建立/刪除路由會在代理程式介面上被封鎖。
- 如果您不想要它，請將其停用：
  - 在節點上：`nodeHost.browserProxy.enabled=false`
  - 在閘道上：`gateway.nodes.browser.mode="off"`

## Browserless（託管的遠端 CDP）

[Browserless](https://browserless.io) 是一個託管的 Chromium 服務，透過 HTTPS 和 WebSocket 公開 CDP 連線 URL。OpenClaw 可以使用任何一種形式，但對於遠端瀏覽器設定檔，最簡單的選項是來自 Browserless 連線文件中的直接 WebSocket URL。

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

- 將 `<BROWSERLESS_API_KEY>` 取代為您真實的 Browserless 權杖。
- 選擇符合您 Browserless 帳戶的區域端點（請參閱其文件）。
- 如果 Browserless 提供的是 HTTPS 基礎 URL，您可以將其轉換為
  `wss://` 以建立直接的 CDP 連線，或者保留 HTTPS URL 並讓 OpenClaw
  自行探索 `/json/version`。

### 相同主機上的 Browserless Docker

當 Browserless 在 Docker 中自行託管且 OpenClaw 在主機上運行時，請將
Browserless 視為外部管理的 CDP 服務：

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "browserless",
    profiles: {
      browserless: {
        cdpUrl: "ws://127.0.0.1:3000",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}
```

`browser.profiles.browserless.cdpUrl` 中的位址必須能從 OpenClaw 程序存取。
Browserless 也必須廣播一個符合的可存取端點；將 Browserless 的
`EXTERNAL` 設定為該個對 OpenClaw 公開的 WebSocket 基礎位址，例如
`ws://127.0.0.1:3000`、`ws://browserless:3000`，或一個穩定的私人 Docker
網路位址。如果 `/json/version` 返回的 `webSocketDebuggerUrl` 指向
OpenClaw 無法到達的位址，CDP HTTP 可能顯示正常，但 WebSocket
附加連線仍然會失敗。

對於回環 Browserless 設定檔，請勿將 `attachOnly` 保持未設定。如果沒有
`attachOnly`，OpenClaw 會將回環連接埠視為本機管理的瀏覽器設定檔，並可能報告該連接埠正在使用中但並非由 OpenClaw 擁有。

## 直接 WebSocket CDP 提供者

部分託管瀏覽器服務會公開 **直接 WebSocket** 端點，而不是
標準的基於 HTTP 的 CDP 探索 (`/json/version`)。OpenClaw 接受三種
CDP URL 格式並自動選擇正確的連線策略：

- **HTTP(S) 探索** - `http://host[:port]` 或 `https://host[:port]`。
  OpenClaw 呼叫 `/json/version` 來探索 WebSocket 偵錯器 URL，然後
  進行連線。沒有 WebSocket 備援方案。
- **直接 WebSocket 端點** - 帶有 `/devtools/browser|page|worker|shared_worker|service_worker/<id>`
  路徑的 `ws://host[:port]/devtools/<kind>/<id>` 或
  `wss://...`。OpenClaw 透過 WebSocket 交握直接連線，並完全
  跳過 `/json/version`。
- **純 WebSocket 根路徑** - 沒有 `/devtools/...` 路徑的 `ws://host[:port]` 或 `wss://host[:port]`（例如 [Browserless](https://browserless.io)、[Browserbase](https://www.browserbase.com)）。OpenClaw 首先嘗試 HTTP `/json/version` 探索（將協議標準化為 `http`/`https`）；如果探索返回 `webSocketDebuggerUrl`，則使用它，否則 OpenClaw 會回退到純根路徑的直接 WebSocket 握手。如果公佈的 WebSocket 端點拒絕 CDP 握手，但設定的純根路徑接受它，OpenClaw 也會回退到該根路徑。這使得指向本機 Chrome 的純 `ws://` 仍然可以連線，因為 Chrome 只接受來自 `/json/version` 的特定目標路徑上的 WebSocket 升級，而託管提供商當其探索端點公佈不適合 Playwright CDP 的短期 URL 時，仍然可以使用其根 WebSocket 端點。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一個用於執行無頭瀏覽器的雲端平台，具有內建的 CAPTCHA 解決、隱身模式和住宅代理。

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
- Browserbase 會在 WebSocket 連接時自動建立瀏覽器會話，因此不需要
  手動建立會話的步驟。
- 免費層級允許每月一個並行會話和一個瀏覽器小時。請參閱 [pricing](https://www.browserbase.com/pricing) 以了解付費方案的限制。
- 請參閱 [Browserbase docs](https://docs.browserbase.com) 以獲取完整的 API 參考、SDK 指南和整合範例。

## 安全性

重點概念：

- 瀏覽器控制僅限本機回送；存取流程透過 Gateway 的驗證或節點配對。
- 獨立迴路瀏覽器 HTTP API 僅使用 **共享金鑰認證**：
  gateway token bearer auth、`x-openclaw-password`，或使用
  配置的 gateway 密碼進行 HTTP Basic auth。
- Tailscale Serve 身份標頭和 `gateway.auth.mode: "trusted-proxy"` 並**不**對此獨立回瀏覽器 API 進行驗證。
- 如果啟用瀏覽器控制且未配置共用的金鑰驗證，OpenClaw 將為該次啟動產生一個僅限執行時期的 gateway token。如果客戶端需要一個在重新啟動之間保持穩定的金鑰，請明確配置 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。
- 當 `gateway.auth.mode` 已經是 `password`、`none` 或 `trusted-proxy` 時，OpenClaw **不會**自動產生該 token。
- 將 Gateway 和任何節點主機保持在私人網路上（Tailscale）；避免公開暴露。
- 將遠端 CDP URL/令牌視為機密；優先使用環境變數或機密管理器。

遠端 CDP 提示：

- 盡可能優先使用加密端點（HTTPS 或 WSS）和短期令牌。
- 避免將長期有效的令牌直接嵌入配置檔案中。

## 設定檔（多重瀏覽器）

OpenClaw 支援多個命名設定檔（路由配置）。設定檔可以是：

- **openclaw-managed**：一個專屬的基於 Chromium 的瀏覽器實例，擁有自己用戶資料目錄和 CDP 連接埠
- **remote**：一個明確的 CDP URL（在別處執行的基於 Chromium 的瀏覽器）
- **existing session**：透過 Chrome DevTools MCP 自動連接您現有的 Chrome 設定檔

預設值：

- 如果缺少 `openclaw` 設定檔，它會自動建立。
- `user` 設定檔是內建的，用於 Chrome MCP 現有會話的連接。
- 除了 `user` 之外，現有會話設定檔是選用的；請使用 `--driver existing-session` 來建立它們。
- 本機 CDP 連接埠預設從 **18800-18899** 分配。
- 刪除設定檔會將其本地資料目錄移至廢紙簍。

所有控制端點都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 透過 Chrome DevTools MCP 使用現有會話

OpenClaw 也可以透過官方 Chrome DevTools MCP 伺服器附加到正在執行的基於 Chromium 的瀏覽器設定檔。這會重複使用該瀏覽器設定檔中已開啟的分頁和登入狀態。

官方背景和設定參考資料：

- [Chrome for Developers: Use Chrome DevTools MCP with your browser session](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

內建設定檔：

- `user`

選用：如果您想要不同的名稱、顏色或瀏覽器資料目錄，請建立您自己的自訂現有工作階段設定檔。

預設行為：

- 內建的 `user` 設定檔使用 Chrome MCP 自動連接，其目標是預設的本機 Google Chrome 設定檔。

針對 Brave、Edge、Chromium 或非預設的 Chrome 設定檔，請使用 `userDataDir`。
`~` 會展開為您的作業系統主目錄：

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

接著在相符的瀏覽器中：

1. 開啟該瀏覽器的檢查頁面以進行遠端偵錯。
2. 啟用遠端偵錯。
3. 讓瀏覽器保持執行，並在 OpenClaw 連線時批准連線提示。

常見的檢查頁面：

- Chrome: `chrome://inspect/#remote-debugging`
- Brave：`brave://inspect/#remote-debugging`
- Edge：`edge://inspect/#remote-debugging`

即時連線冒煙測試：

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

如果連線失敗，請檢查下列事項：

- 目標 Chromium 瀏覽器的版本為 `144+`
- 已在該瀏覽器的檢查頁面中啟用遠端偵錯
- 瀏覽器已顯示，且您已接受連線同意提示
- `openclaw doctor` 會遷移舊的擴充功能瀏覽器設定，並檢查
  本機是否已安裝 Chrome 以用於預設的自動連線設定檔，但它無法
  為您啟用瀏覽器端的遠端偵錯

Agent 使用方式：

- 當您需要使用者的已登入瀏覽器狀態時，請使用 `profile="user"`。
- 如果您使用自訂的現有工作階段設定檔，請傳入該明確的設定檔名稱。
- 僅當使用者在電腦前以批准連線
  提示時，才選擇此模式。
- Gateway 或節點主機可以產生 `npx chrome-devtools-mcp@latest --autoConnect`

備註：

- 此路徑的風險高於隔離的 `openclaw` 設定檔，因為它可以在
  您的已登入瀏覽器作業階段中進行操作。
- OpenClaw 不會為此驅動程式啟動瀏覽器；它僅會進行連線。
- OpenClaw 在此使用官方的 Chrome DevTools MCP `--autoConnect` 流程。如果
  設定了 `userDataDir`，它將被傳遞以目標指向該使用者資料目錄。
- Existing-session 可以附加到選定的主機或透過已連線的瀏覽器節點。如果 Chrome 位於其他地方且未連線瀏覽器節點，請改用
  遠端 CDP 或節點主機。

### 自訂 Chrome MCP 啟動

當預設的 `npx chrome-devtools-mcp@latest` 流程不符合您的需求時（離線主機、
釘選版本、供應商提供的二進位檔案），請依設定檔覆寫產生的 Chrome DevTools MCP 伺服器：

| 欄位         | 說明                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `mcpCommand` | 要產生的執行檔，用來取代 `npx`。會依原樣解析；會接受絕對路徑。                                     |
| `mcpArgs`    | 原樣傳遞給 `mcpCommand` 的引數陣列。會取代預設的 `chrome-devtools-mcp@latest --autoConnect` 引數。 |

當在現有作業階段設定檔上設定 `cdpUrl` 時，OpenClaw 會跳過
`--autoConnect` 並自動將端點轉發至 Chrome MCP：

- `http(s)://...` → `--browserUrl <url>` (DevTools HTTP 探索端點)。
- `ws(s)://...` → `--wsEndpoint <url>` (直接 CDP WebSocket)。

端點旗標和 `userDataDir` 不能同時使用：當設定 `cdpUrl` 時，
`userDataDir` 會在啟動 Chrome MCP 時被忽略，因為 Chrome MCP 會連接到
端點後面執行中的瀏覽器，而不是開啟一個設定檔
目錄。

<Accordion title="Existing-session feature limitations">

與受控的 `openclaw` 設定檔相比，現有會話驅動程式受到更多限制：

- **螢幕擷圖** - 頁面擷取和 `--ref` 元素擷取有效；CSS `--element` 選擇器無效。`--full-page` 不能與 `--ref` 或 `--element` 結合使用。頁面或基於參照的元素擷圖不需要 Playwright。
- **動作** - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要快照參照（不支援 CSS 選擇器）。`click-coords` 點擊可見視口座標，不需要快照參照。`click` 僅限左鍵。`type` 不支援 `slowly=true`；請使用 `fill` 或 `press`。`press` 不支援 `delayMs`。`type`、`hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支援個別呼叫逾時。`select` 接受單一值。
- **等待 / 上傳 / 對話框** - `wait --url` 支援完全符合、子字串和 glob 模式；不支援 `wait --load networkidle`。上傳掛鉤需要 `ref` 或 `inputRef`，一次一個檔案，不支援 CSS `element`。對話框掛鉤不支援逾時覆寫或 `dialogId`。
- **對話框可見性** - 受控瀏覽器動作回應在動作開啟強制回應對話框時包含 `blockedByDialog` 和 `browserState.dialogs.pending`；快照也包含待處理對話框狀態。當對話框待處理時，以 `browser dialog --accept/--dismiss --dialog-id <id>` 回應。在 OpenClaw 外部處理的對話框會出現在 `browserState.dialogs.recent` 下。
- **僅限受控的功能** - 批次動作、PDF 匯出、下載攔截和 `responsebody` 仍需要受控瀏覽器路徑。

</Accordion>

## 隔離保證

- **專用使用者資料目錄**：絕不會接觸您的個人瀏覽器設定檔。
- **專用連接埠**：避免 `9222` 以防止與開發工作流程發生衝突。
- **確定性分頁控制**：`tabs` 首先返回 `suggestedTargetId`，然後是穩定的 `tabId` 控制碼，例如 `t1`、可選標籤以及原始 `targetId`。
  智慧體應重複使用 `suggestedTargetId`；原始 ID 仍然可用於
  偵錯和相容性。

## 瀏覽器選擇

當在本機啟動時，OpenClaw 會選擇第一個可用的：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 覆蓋設定。

平台：

- macOS：檢查 `/Applications` 和 `~/Applications`。
- Linux：檢查 `/usr/bin`、
  `/snap/bin`、`/opt/google`、`/opt/brave.com`、`/usr/lib/chromium` 和
  `/usr/lib/chromium-browser` 下常見的 Chrome/Brave/Edge/Chromium 位置，以及位於
  `PLAYWRIGHT_BROWSERS_PATH` 或 `~/.cache/ms-playwright` 下由 Playwright 管理的 Chromium。
- Windows：檢查常見的安裝位置。

## 控制 API (選用)

為了腳本編寫和偵錯，Gateway 提供了一個小型**僅限回環 HTTP
控制 API** 以及配套的 `openclaw browser` CLI（快照、參照、等待
增強功能、JSON 輸出、偵錯工作流程）。請參閱
[瀏覽器控制 API](/zh-Hant/tools/browser-control) 以取得完整參考。

## 疑難排解

關於 Linux 特定問題（特別是 snap Chromium），請參閱
[瀏覽器疑難排解](/zh-Hant/tools/browser-linux-troubleshooting)。

關於 WSL2 Gateway + Windows Chrome 分割主機設定，請參閱
[WSL2 + Windows + 遠端 Chrome CDP 疑難排解](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

### CDP 啟動失敗 vs 導覽 SSRF 封鎖

這些是不同的失敗類別，它們指向不同的程式碼路徑。

- **CDP 啟動或就緒失敗** 表示 OpenClaw 無法確認瀏覽器控制平面是否健康。
- **導覽 SSRF 封鎖** 表示瀏覽器控制平面健康，但頁面導覽目標被原則拒絕。

常見範例：

- CDP 啟動或就緒失敗：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - 當在沒有 `attachOnly: true` 的情況下
    設定了回環外部 CDP 服務時發生 `Port <port> is in use for profile "<name>" but not by openclaw`
- 導覽 SSRF 封鎖：
  - `open`、`navigate`、快照或開啟分頁流程因瀏覽器/網路策略錯誤而失敗，但 `start` 和 `tabs` 仍然正常運作

使用這個最精簡的順序來區分這兩者：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何閱讀結果：

- 如果 `start` 失敗並顯示 `not reachable after start`，請先針對 CDP 就緒狀態進行疑難排解。
- 如果 `start` 成功但 `tabs` 失敗，控制平面仍然不健康。將其視為 CDP 連線性問題，而非頁面導覽問題。
- 如果 `start` 和 `tabs` 成功但 `open` 或 `navigate` 失敗，表示瀏覽器控制平面已啟動，失敗原因在於導覽策略或目標頁面。
- 如果 `start`、`tabs` 和 `open` 全部成功，則基本的管理瀏覽器控制路徑是健康的。

重要的行為細節：

- 即使您未設定 `browser.ssrfPolicy`，瀏覽器設定預設也會採用封閉失敗的 SSRF 策略物件。
- 對於本地回環 `openclaw` 設定檔，CDP 健康檢查會有意跳過對 OpenClaw 本地控制平面的瀏覽器 SSRF 連線性強制執行。
- 導覽保護是分開的。成功的 `start` 或 `tabs` 結果並不表示稍後的 `open` 或 `navigate` 目標是被允許的。

安全性指引：

- 預設情況下**切勿**放寬瀏覽器 SSRF 原則。
- 優先使用狹隘的主機例外，例如 `hostnameAllowlist` 或 `allowedHostnames`，而不是廣泛的私人網路存取。
- 僅在經過審查且需要私人網路瀏覽器存取的可信意圖環境中使用 `dangerouslyAllowPrivateNetwork: true`。

## 代理程式工具 + 控制運作方式

代理程式取得**一個工具**用於瀏覽器自動化：

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

對應方式：

- `browser snapshot` 返回穩定的 UI 樹狀結構（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 來進行點擊/輸入/拖曳/選取。
- `browser screenshot` 擷取像素（完整頁面、元素或標記參照）。
- `browser doctor` 檢查 Gateway、外掛程式、設定檔、瀏覽器和分頁的就緒狀態。
- `browser` 接受：
  - `profile` 用於選擇命名的瀏覽器設定檔（openclaw、chrome 或遠端 CDP）。
  - `target` (`sandbox` | `host` | `node`) 以選擇瀏覽器的所在地。
  - 在沙盒化工作階段中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙盒化工作階段預設為 `sandbox`，非沙盒工作階段預設為 `host`。
  - 如果連接了具備瀏覽器功能的節點，工具可能會自動路由至該節點，除非您指定了 `target="host"` 或 `target="node"`。

這能保持代理程式的確定性，並避免脆弱的選擇器。

## 相關

- [工具概覽](/zh-Hant/tools) - 所有可用的代理程式工具
- [沙盒化](/zh-Hant/gateway/sandboxing) - 在沙盒化環境中的瀏覽器控制
- [安全性](/zh-Hant/gateway/security) - 瀏覽器控制的風險與強化
