---
summary: "整合瀏覽器控制服務 + 動作指令"
read_when:
  - Adding agent-controlled browser automation
  - Debugging why openclaw is interfering with your own Chrome
  - Implementing browser settings + lifecycle in the macOS app
title: "瀏覽器（OpenClaw 管理）"
---

OpenClaw 可以執行一個由代理程式控制的**專屬 Chrome/Brave/Edge/Chromium 設定檔**。
它與您的個人瀏覽器隔離，並透過閘道內部的一個小型本機
控制服務進行管理（僅限迴路）。

初學者觀點：

- 將其視為一個**獨立、僅供代理程式使用的瀏覽器**。
- `openclaw` 設定檔**不會**触碰您的個人瀏覽器設定檔。
- 代理程式可以在安全的通道中**開啟分頁、閱讀頁面、點擊和輸入**。
- 內建的 `user` 設定檔會透過 Chrome MCP 連接到您真實且已登入的 Chrome 工作階段。

## 您將獲得

- 一個名為 **openclaw** 的獨立瀏覽器設定檔（預設為橘色主題）。
- 確定性分頁控制（列出/開啟/聚焦/關閉）。
- 代理程式動作（點擊/輸入/拖曳/選取）、快照、螢幕截圖、PDF。
- 內建的 `browser-automation` 技能，當瀏覽器外掛啟用時，會教導代理程式有關快照、穩定分頁、過時參照和手動封鎖程式的復原迴圈。
- 可選的多設定檔支援（`openclaw`、`work`、`remote` 等）。

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

如果完全缺少 `openclaw browser`，或者代理程式表示瀏覽器工具無法使用，請跳至[缺少瀏覽器指令或工具](/zh-Hant/tools/browser#missing-browser-command-or-tool)。

## 外掛程式控制

預設的 `browser` 工具是內建的外掛。停用它，以便用另一個註冊相同 `browser` 工具名稱的外掛來取代它：

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

預設值同時需要 `plugins.entries.browser.enabled` **和** `browser.enabled=true`。僅停用外掛會將 `openclaw browser` CLI、`browser.request` gateway 方法、代理程式工具和控制服務作為一個單元移除；您的 `browser.*` 設定將保持完整，以便用於取代。

瀏覽器設定的變更需要重新啟動閘道，以便外掛程式能重新註冊其服務。

## 代理程式指引

工具設定檔說明：`tools.profile: "coding"` 包含 `web_search` 和 `web_fetch`，但不包含完整的 `browser` 工具。如果代理程式或衍生的子代理程式應該使用瀏覽器自動化，請在設定檔階段新增瀏覽器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

對於單一代理程式，請使用 `agents.list[].tools.alsoAllow: ["browser"]`。
單獨使用 `tools.subagents.tools.allow: ["browser"]` 是不夠的，因為子代理程式原則是在設定檔篩選之後套用的。

瀏覽器外掛程式提供兩個層級的代理指引：

- `browser` 工具描述帶有緊湊的始終生效約定：選擇正確的設定檔，將參照保持在同一個分頁上，使用 `tabId`/labels 進行分頁定位，並載入瀏覽器技能以進行多步驟工作。
- 內建的 `browser-automation` 技能承載了較長的操作循環：
  先檢查狀態/分頁，標記任務分頁，操作前進行快照，UI 變更後重新快照，
  復原過時引用一次，並將登入/2FA/驗證碼或
  攝像頭/麥克風阻擋器報告為手動操作，而不是猜測。

當外掛程式啟用時，隨附的技能會列在代理的可用技能中。完整的技能指令會按需載入，因此常規回合不需支付完整的 token 成本。

## 遺失瀏覽器指令或工具

如果升級後 `openclaw browser` 未知，`browser.request` 缺失，或者代理程式報告瀏覽器工具不可用，通常原因是 `plugins.allow` 清單中省略了 `browser` 且不存在根層級的 `browser` 設定區塊。請新增它：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

明確的根層級 `browser` 區塊，例如 `browser.enabled=true` 或 `browser.profiles.<name>`，即使在限制性的 `plugins.allow` 下也能啟動內建的瀏覽器外掛，符合頻道設定行為。`plugins.entries.browser.enabled=true` 和 `tools.alsoAllow: ["browser"]` 本身不能替代允許清單成員資格。完全移除 `plugins.allow` 也會恢復預設值。

## 設定檔：`openclaw` vs `user`

- `openclaw`：受控、獨立的瀏覽器（無需擴充功能）。
- `user`：內建的 Chrome MCP 附加設定檔，用於您的 **真實已登入 Chrome**
  工作階段。

針對代理程式瀏覽器工具呼叫：

- 預設值：使用獨立的 `openclaw` 瀏覽器。
- 當現有的已登入工作階段很重要並且使用者
  在電腦前可以點擊/批准任何附加提示時，請優先 `profile="user"`。
- 當您想要特定的瀏覽器模式時，`profile` 是明確的覆寫選項。

如果您希望預設使用受控模式，請設定 `browser.defaultProfile: "openclaw"`。

## 組態

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

### 螢幕截圖視覺（僅文字模型支援）

當主模型僅支援文字（無視覺/多模態支援）時，瀏覽器
螢幕截圖會傳回模型無法讀取的圖像區塊。瀏覽器螢幕截圖
重複使用現有的圖像理解設定，因此為媒體理解配置的圖像模型
可以將螢幕截圖描述為文字，而無需任何
瀏覽器專用的模型設定。

```json5
{
  tools: {
    media: {
      image: {
        models: [
          { provider: "bytedance", model: "doubao-seed-2.0-pro" },
          // Add fallback candidates; first success wins
          { provider: "openai", model: "gpt-4o" },
        ],
      },
      // Shared media models also work when tagged for image support.
      // models: [{ provider: "openai", model: "gpt-4o", capabilities: ["image"] }],
    },
  },
  agents: {
    defaults: {
      // Existing image-model defaults are also honored.
      // imageModel: { primary: "openai/gpt-4o" },
    },
  },
}
```

**運作方式：**

1. Agent 呼叫 `browser screenshot` → 影像照常擷取至磁碟。
2. 瀏覽器工具會詢問現有的影像理解運行時（runtime），它是否可以使用設定的媒體影像模型、共享媒體模型、影像模型預設值或具有驗證支援的影像提供者來描述螢幕截圖。
3. 視覺模型會傳回文字描述，該描述會以 `wrapExternalContent`（提示注入防護）包裝，並以文字區塊而非影像區塊的形式傳回給 agent。
4. 如果影像理解功能不可用、被跳過或失敗，瀏覽器會退回傳回原始影像區塊。

使用現有的 `tools.media.image` / `tools.media.models` 欄位來進行模型退回、逾時、位元組限制、設定檔和提供者請求設定。

如果目前使用的主要模型已支援視覺功能，且未設定明確的影像理解模型，OpenClaw 將保留正常的影像結果，以便主要模型可以直接讀取螢幕截圖。

<AccordionGroup>

<Accordion title="連接埠和可達性">

- 控制服務綁定到從 `gateway.port` 推導出的回環連接埠（預設 `18791` = gateway + 2）。覆寫 `gateway.port` 或 `OPENCLAW_GATEWAY_PORT` 將會在同一系列中移動推導出的連接埠。
- 本機 `openclaw` 設定檔會自動分配 `cdpPort`/`cdpUrl`；僅針對遠端 CDP 設定這些值。若未設定，`cdpUrl` 預設為受管理的本機 CDP 連接埠。
- `remoteCdpTimeoutMs` 適用於遠端和 `attachOnly` CDP HTTP 可達性
  檢查以及開啟分頁的 HTTP 請求；`remoteCdpHandshakeTimeoutMs` 適用於
  它們的 CDP WebSocket 握手。
- `localLaunchTimeoutMs` 是本機啟動的受管理 Chrome
  程序公開其 CDP HTTP 端點的預算時間。`localCdpReadyTimeoutMs` 是
  在程序被發現後，CDP websocket 準備就緒的後續預算時間。
  在 Chromium 啟動緩慢的 Raspberry Pi、低階 VPS 或較舊的硬體上，請增加這些值。數值必須是不超過 `120000` 毫秒的正整數；無效的
  組態值將會被拒絕。
- 重複的受管理 Chrome 啟動/就緒失敗會依據每個設定檔進行斷路。在連續多次失敗後，OpenClaw 會短暫暫停新的啟動嘗試，而不是在每次呼叫瀏覽器工具時都生成 Chromium。請修復啟動問題，如果不需要瀏覽器則將其停用，或在修復後重新啟動 Gateway。
- 當呼叫者未傳遞 `timeoutMs` 時，`actionTimeoutMs` 是瀏覽器 `act` 請求的預設預算時間。用戶端傳輸會增加一個小的寬緩時間視窗，以便長時間等待能夠完成，而不是在 HTTP 邊界逾時。
- `tabCleanup` 是對主要代理程式瀏覽器工作階段所開啟之分頁的盡力清理。子代理程式、cron 和 ACP 生命週期清理仍會在工作階段結束時關閉其明確追蹤的分頁；主要工作階段會保持使用中分頁可重複使用，然後在背景中關閉閒置或過多的追蹤分頁。

</Accordion>

<Accordion title="SSRF 政策">

- 瀏覽器導航和開啟分頁在導航前會受到 SSRF 防護，並在之後對最終的 `http(s)` URL 進行盡力的再次檢查。
- 在嚴格 SSRF 模式下，遠端 CDP 端點探索和 `/json/version` 探測（`cdpUrl`）也會受到檢查。
- Gateway/提供者 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY` 和 `NO_PROXY` 環境變數不會自動代理 OpenClaw 管理的瀏覽器。受管理的 Chrome 預設直接啟動，因此提供者代理設定不會削弱瀏覽器 SSRF 檢查。
- OpenClaw 管理的本機 CDP 就緒探測和 DevTools WebSocket 連線會針對確切啟動的回環端點略過受管理的網路代理，因此當操作員代理阻擋回環出口時，`openclaw browser start` 仍然可以運作。
- 若要代理受管理的瀏覽器本身，請透過 `browser.extraArgs` 傳遞明確的 Chrome 代理旗標，例如 `--proxy-server=...` 或 `--proxy-pac-url=...`。嚴格 SSRF 模式會阻擋明確的瀏覽器代理路由，除非有意啟用私人網路瀏覽器存取權。
- `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork` 預設為關閉；僅在有意信任私人網路瀏覽器存取權時啟用。
- `browser.ssrfPolicy.allowPrivateNetwork` 作為舊版別名仍受支援。

</Accordion>

<Accordion title="設定檔行為">

- `attachOnly: true` 表示絕不啟動本機瀏覽器；僅在已有瀏覽器執行時附加連線。
- `headless` 可全域設定或針對各個本機管理設定檔設定。設定檔專屬值會覆寫 `browser.headless`，因此一個本機啟動的設定檔可保持無頭模式，而另一個則保持可見。
- `POST /start?headless=true` 和 `openclaw browser start --headless` 會針對本機管理設定檔請求一次性無頭啟動，而無需重寫 `browser.headless` 或設定檔設定。現有階段、僅附加和遠端 CDP 設定檔會拒絕此覆寫，因為 OpenClaw 並不啟動那些瀏覽器程序。
- 在沒有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主機上，當環境或設定檔/全域設定未明確選擇有頭模式時，本機管理設定檔會自動預設為無頭模式。`openclaw browser status --json`
  會回報 `headlessSource` 為 `env`、`profile`、`config`、
  `request`、`linux-display-fallback` 或 `default`。
- `OPENCLAW_BROWSER_HEADLESS=1` 會強制當前程序的本機管理啟動使用無頭模式。`OPENCLAW_BROWSER_HEADLESS=0` 會強制一般啟動使用有頭模式，並在沒有顯示伺服器的 Linux 主機上傳回可採取行動的錯誤；針對該次啟動，明確的 `start --headless` 請求仍然優先。
- `executablePath` 可全域設定或針對各個本機管理設定檔設定。設定檔專屬值會覆寫 `browser.executablePath`，因此不同的管理設定檔可啟動不同的 Chromium 系瀏覽器。這兩種形式都接受針對您 OS 家目錄的 `~`。
- `color`（頂層和各設定檔）會為瀏覽器 UI 著色，讓您可看到哪個設定檔是啟用的。
- 預設設定檔是 `openclaw` (獨立管理)。使用 `defaultProfile: "user"` 以選擇加入已登入使用者的瀏覽器。
- 自動偵測順序：若為 Chromium 系則為系統預設瀏覽器；否則為 Chrome → Brave → Edge → Chromium → Chrome Canary。
- `driver: "existing-session"` 使用 Chrome DevTools MCP 而非原始 CDP。請勿為該驅動程式設定 `cdpUrl`。
- 當現有階段設定檔應附加至非預設的 Chromium 使用者設定檔 (Brave、Edge 等) 時，請設定 `browser.profiles.<name>.userDataDir`。此路徑也接受針對您 OS 家目錄的 `~`。

</Accordion>

</AccordionGroup>

## 使用 Brave 或其他基於 Chromium 的瀏覽器

如果您的 **系統預設** 瀏覽器是基於 Chromium 的（Chrome/Brave/Edge/等），
OpenClaw 會自動使用它。設定 `browser.executablePath` 以覆寫
自動偵測。頂層和每個設定檔 `executablePath` 的值接受 `~`
代表您的作業系統主目錄：

```bash
openclaw config set browser.executablePath "/usr/bin/google-chrome"
openclaw config set browser.profiles.work.executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

或在設定檔中針對各平台進行設定：

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

每個設定檔的 `executablePath` 僅影響 OpenClaw 啟動的本機受控設定檔。
`existing-session` 設定檔則改為附加到已執行的瀏覽器，而遠端 CDP 設定檔使用 `cdpUrl` 後方的瀏覽器。

## 本機與遠端控制

- **本機控制（預設）：** Gateway 啟動 loopback 控制服務並可以啟動本機瀏覽器。
- **遠端控制（node host）：** 在擁有瀏覽器的機器上執行 node host；Gateway 將瀏覽器操作代理至該主機。
- **遠端 CDP：** 設定 `browser.profiles.<name>.cdpUrl`（或 `browser.cdpUrl`）以
  附加到遠端基於 Chromium 的瀏覽器。在這種情況下，OpenClaw 將不會啟動本機瀏覽器。
- 對於 loopback 上外部管理的 CDP 服務（例如發布至 `127.0.0.1` 的 Docker
  中的 Browserless），請也設定 `attachOnly: true`。未設定 `attachOnly` 的 Loopback CDP
  會被視為本機 OpenClaw 受控的瀏覽器設定檔。
- `headless` 僅影響 OpenClaw 啟動的本機受控設定檔。它不會重新啟動或變更現有作業階段或遠端 CDP 瀏覽器。
- `executablePath` 遵循相同本機受控設定檔規則。在執行中的本機受控設定檔上變更它會
  將該設定檔標記為重新啟動/協調，以便下一次啟動使用新的執行檔。

停止行為因設定檔模式而異：

- 本機受控設定檔：`openclaw browser stop` 會停止 OpenClaw
  啟動的瀏覽器程序
- attach-only 和 remote CDP 設定檔：`openclaw browser stop` 會關閉作用中的
  控制階段並釋放 Playwright/CDP 模擬覆寫（視口、
  色彩配置、地區設定、時區、離線模式和類似狀態），即使
  OpenClaw 並未啟動任何瀏覽器程序

Remote CDP URL 可以包含驗證資訊：

- 查詢字串權杖（例如 `https://provider.example?token=<token>`）
- HTTP Basic 驗證（例如 `https://user:pass@provider.example`）

當呼叫 `/json/*` 端點並連線
到 CDP WebSocket 時，OpenClaw 會保留驗證資訊。建議優先使用環境變數或祕密管理工具來
處理權杖，而不是將其提交到設定檔中。

## Node 瀏覽器代理（零配置預設值）

如果您在擁有瀏覽器的機器上執行 **node host**，OpenClaw 可以
在不需額外瀏覽器設定的情況下，自動將瀏覽器工具呼叫路由至該節點。
這是遠端 Gateway 的預設路徑。

備註：

- Node host 會透過 **proxy command** 公開其本機瀏覽器控制伺服器。
- 設定檔來自節點自己的 `browser.profiles` 設定（與本機相同）。
- `nodeHost.browserProxy.allowProfiles` 是選用的。將其保留為空白以使用舊版/預設行為：所有已設定的設定檔均可透過代理存取，包括設定檔建立/刪除路由。
- 如果您設定 `nodeHost.browserProxy.allowProfiles`，OpenClaw 會將其視為最小權限邊界：僅允許清單中的設定檔被指定，並且持續性設定檔建立/刪除路由會在代理介面上被封鎖。
- 如果您不想要它，請停用：
  - 在節點上：`nodeHost.browserProxy.enabled=false`
  - 在 Gateway 上：`gateway.nodes.browser.mode="off"`

## Browserless（託管的遠端 CDP）

[Browserless](https://browserless.io) 是一項透過 HTTPS 和 WebSocket 公開
CDP 連線 URL 的託管 Chromium 服務。OpenClaw 可以使用任一種形式，但
對於遠端瀏覽器設定檔而言，最簡單的選項是來自 Browserless 連線文件的直接 WebSocket URL。

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

- 將 `<BROWSERLESS_API_KEY>` 替換為您真實的 Browserless 權杖。
- 選擇與您的 Browserless 帳戶相符的區域端點（請參閱其文件）。
- 如果 Browserless 提供的是 HTTPS 基礎 URL，您可以將其轉換為
  `wss://` 以進行直接 CDP 連線，或者保留 HTTPS URL 並讓 OpenClaw
  自動探索 `/json/version`。

### Browserless Docker 位於相同主機上

當 Browserless 在 Docker 中自我託管且 OpenClaw 在主機上執行時，請將
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

`browser.profiles.browserless.cdpUrl` 中的位址必須能夠從
OpenClaw 程序存取。Browserless 也必須通告一個相符的可存取端點；
將 Browserless `EXTERNAL` 設定為同一個對 OpenClaw 公開的 WebSocket 基礎位址，例如
`ws://127.0.0.1:3000`、`ws://browserless:3000` 或穩定的私有 Docker
網路位址。如果 `/json/version` 返回的 `webSocketDebuggerUrl` 指向
OpenClaw 無法到達的位址，則 CDP HTTP 可能看起來正常，但 WebSocket
連線仍會失敗。

對於回環 Browserless 設定檔，請勿將 `attachOnly` 保持未設置狀態。如果沒有
`attachOnly`，OpenClaw 會將回環連接埠視為本機管理的瀏覽器
設定檔，並可能報告該連接埠正在使用中但並非由 OpenClaw 擁有。

## 直接 WebSocket CDP 提供者

部分託管瀏覽器服務提供 **直接 WebSocket** 端點，而非
標準的基於 HTTP 的 CDP 探索 (`/json/version`)。OpenClaw 接受三種
CDP URL 格式，並會自動選擇正確的連線策略：

- **HTTP(S) 探索** - `http://host[:port]` 或 `https://host[:port]`。
  OpenClaw 呼叫 `/json/version` 來探索 WebSocket 偵錯器 URL，然後
  進行連線。不回退至 WebSocket。
- **直接 WebSocket 端點** - `ws://host[:port]/devtools/<kind>/<id>` 或
  `wss://...`，並帶有 `/devtools/browser|page|worker|shared_worker|service_worker/<id>`
  路徑。OpenClaw 透過 WebSocket 握手直接連線，並完全跳過
  `/json/version`。
- **裸 WebSocket 根目錄** - 沒有 `/devtools/...` 路徑的 `ws://host[:port]` 或 `wss://host[:port]`（例如 [Browserless](https://browserless.io)、
  [Browserbase](https://www.browserbase.com)）。OpenClaw 首先嘗試 HTTP
  `/json/version` 探索（將協議正規化為 `http`/`https`）；
  如果探索返回 `webSocketDebuggerUrl`，則會使用它，否則 OpenClaw
  會退回至在裸根目錄進行直接 WebSocket 握手。如果廣告的
  WebSocket 端點拒絕 CDP 握手，但配置的裸根目錄接受它，
  OpenClaw 也會退回至該根目錄。這使得指向本機 Chrome 的裸 `ws://`
  仍然可以連線，因為 Chrome 僅在來自 `/json/version` 的特定每個目標路徑上接受 WebSocket
  升級，而託管
  提供商當其探索端點廣告的短期 URL 不適用於 Playwright CDP 時，仍然可以使用其根 WebSocket 端點。

`openclaw browser doctor` 使用與執行時期連線 相同的優先探索、WebSocket 退回
邏輯，因此成功連線的裸根目錄 URL 不會
被診斷回報為無法連線。

### Browserbase

[Browserbase](https://www.browserbase.com) 是一個用於執行
無頭瀏覽器的雲端平台，具有內建的 CAPTCHA 解決、隱身模式和住宅
代理功能。

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
- 將 `<BROWSERBASE_API_KEY>` 替換為您的真實 Browserbase API key。
- Browserbase 會在 WebSocket 連線時自動建立瀏覽器階段，因此無需
  手動建立階段。
- 免費層級允許一個並行階段和每月一個瀏覽器小時。
  請參閱 [pricing](https://www.browserbase.com/pricing) 以了解付費方案限制。
- 請參閱 [Browserbase docs](https://docs.browserbase.com) 以取得完整的 API
  參考、SDK 指南和整合範例。

### Notte

[Notte](https://www.notte.cc) 是一個用於執行無頭瀏覽器的雲端平台，
具有內建的隱身模式、住宅代理和 CDP 原生
WebSocket 閘道。

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "notte",
    remoteCdpTimeoutMs: 3000,
    remoteCdpHandshakeTimeoutMs: 5000,
    profiles: {
      notte: {
        cdpUrl: "wss://us-prod.notte.cc/sessions/connect?token=<NOTTE_API_KEY>",
        color: "#7C3AED",
      },
    },
  },
}
```

備註：

- [註冊](https://console.notte.cc) 並從控制台設定頁面複製您的 **API 金鑰**。
- 將 `<NOTTE_API_KEY>` 取換為您的真實 Notte API 金鑰。
- Notte 會在 WebSocket 連線時自動建立瀏覽器工作階段，因此不需要手動建立工作階段。當 WebSocket 連線中斷時，工作階段會被銷毀。
- 免費方案允許五個並行工作階段和 100 小時終身瀏覽器時間。請參閱 [價格](https://www.notte.cc/#pricing) 以了解付費方案的限制。
- 請參閱 [Notte 文件](https://docs.notte.cc) 以取得完整的 API 參考、SDK 指南和整合範例。

## 安全性

重點概念：

- 瀏覽器控制僅限於回送；存取權限透過 Gateway 的驗證或節點配對流動。
- 獨立的回送瀏覽器 HTTP API **僅使用共享金鑰驗證**：gateway token bearer auth、`x-openclaw-password`，或是使用設定的 gateway password 進行 HTTP Basic auth。
- Tailscale Serve 身分標頭和 `gateway.auth.mode: "trusted-proxy"` **不會**對此獨立回送瀏覽器 API 進行驗證。
- 如果啟用瀏覽器控制且未設定共享金鑰驗證，OpenClaw 會為該次啟動產生一個僅限執行時期的 gateway token。如果用戶端需要在重新啟動之間使用穩定的金鑰，請明確設定 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。
- 當 `gateway.auth.mode` 已經是 `password`、`none` 或 `trusted-proxy` 時，OpenClaw **不會**自動產生該 token。
- 請將 Gateway 和任何節點主機保持在私人網路上；避免公開暴露。
- 請將遠端 CDP URL/token 視為機密；優先使用環境變數或密碼管理員。

遠端 CDP 提示：

- 盡可能優先使用加密端點 (HTTPS 或 WSS) 和短期有效的 token。
- 避免將長期有效的 token 直接嵌入設定檔中。

## 設定檔

OpenClaw 支援多個命名設定檔 (路由設定)。設定檔可以是：

- **openclaw-managed**：一個專屬的基於 Chromium 的瀏覽器執行個體，擁有自己的使用者資料目錄和 CDP 連接埠
- **remote**：一個明確的 CDP URL (在其他地方執行的基於 Chromium 的瀏覽器)
- **現有工作階段**：透過 Chrome DevTools MCP 自動連線連線到您現有的 Chrome 設定檔

預設值：

- 如果缺少 `openclaw` 設定檔，將會自動建立。
- `user` 設定檔是內建的，用於 Chrome MCP 現有工作階段連接。
- 除了 `user` 之外，現有工作階段設定檔屬於選擇加入；請使用 `--driver existing-session` 來建立它們。
- 本機 CDP 連接埠預設從 **18800-18899** 分配。
- 刪除設定檔會將其本機資料目錄移至垃圾桶。

所有控制端點都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## 透過 Chrome DevTools MCP 使用現有工作階段

OpenClaw 也可以透過官方 Chrome DevTools MCP 伺服器連接到執行中的 Chromium 瀏覽器設定檔。
這會重複使用該瀏覽器設定檔中已開啟的分頁和登入狀態。

官方背景和設定參考資料：

- [Chrome for Developers: 使用 Chrome DevTools MCP 搭配您的瀏覽器工作階段](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [Chrome DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

內建設定檔：

- `user`

選用：如果您想要不同的名稱、顏色或瀏覽器資料目錄，可以建立您自己的自訂現有工作階段設定檔。

預設行為：

- 內建的 `user` 設定檔使用 Chrome MCP 自動連線，目標是
  預設的本機 Google Chrome 設定檔。

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

然後在相符的瀏覽器中：

1. 開啟該瀏覽器的檢查頁面以進行遠端偵錯。
2. 啟用遠端偵錯。
3. 保持瀏覽器執行，並在 OpenClaw 連線時批准連線提示。

常見的檢查頁面：

- Chrome: `chrome://inspect/#remote-debugging`
- Brave: `brave://inspect/#remote-debugging`
- Edge: `edge://inspect/#remote-debugging`

即時連線基本測試：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功時的樣子：

- `status` 顯示 `driver: existing-session`
- `status` 顯示 `transport: chrome-mcp`
- `status` 顯示 `running: true`
- `tabs` 列出您已開啟的瀏覽器分頁
- `snapshot` 從選取的即時分頁返回參照

如果附加無法運作，請檢查：

- 目標 Chromium 系瀏覽器版本為 `144+`
- 該瀏覽器的檢查頁面中已啟用遠端偵錯
- 瀏覽器已顯示，且您已接受附加同意提示
- `openclaw doctor` 會遷移舊的基於擴充功能的瀏覽器設定，並檢查預設自動連接設定檔是否已在本地安裝 Chrome，但它無法為您啟用瀏覽器端的遠端偵錯

Agent 使用方式：

- 當您需要使用者的登入瀏覽器狀態時，請使用 `profile="user"`。
- 如果您使用自訂的現有工作階段設定檔，請傳遞該明確的設定檔名稱。
- 只有當使用者在電腦前以批准附加提示時，才選擇此模式。
- Gateway 或節點主機可以產生 `npx chrome-devtools-mcp@latest --autoConnect`

注意事項：

- 此路徑的風險高於隔離的 `openclaw` 設定檔，因為它可以在您的登入瀏覽器工作階段中執行動作。
- OpenClaw 不會為此驅動程式啟動瀏覽器；它僅進行附加。
- OpenClaw 在此使用官方 Chrome DevTools MCP `--autoConnect` 流程。如果設定了 `userDataDir`，它會被傳遞以該使用者資料目錄為目標。
- 現有工作階段可以在選取的主機或透過已連線的瀏覽器節點上進行附加。如果 Chrome 位於其他地方且未連線瀏覽器節點，請改用遠端 CDP 或節點主機。

### 自訂 Chrome MCP 啟動

當預設 `npx chrome-devtools-mcp@latest` 流程不符合您的需求時（離線主機、固定版本、供應的二進位檔案），請依設定檔覆寫產生的 Chrome DevTools MCP 伺服器：

| 欄位         | 作用                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------ |
| `mcpCommand` | 要產生的可執行檔，用以取代 `npx`。按原樣解析；絕對路徑會受到尊重。                               |
| `mcpArgs`    | 逐字傳遞給 `mcpCommand` 的引數陣列。取代預設的 `chrome-devtools-mcp@latest --autoConnect` 引數。 |

當在現有工作階段設定檔上設定 `cdpUrl` 時，OpenClaw 會跳過 `--autoConnect` 並自動將端點轉發至 Chrome MCP：

- `http(s)://...` → `--browserUrl <url>` (DevTools HTTP 探索端點)。
- `ws(s)://...` → `--wsEndpoint <url>` (直接 CDP WebSocket)。

端點旗標與 `userDataDir` 無法同時使用：當設定了 `cdpUrl` 時，啟動 Chrome MCP 時會忽略 `userDataDir`，因為 Chrome MCP 會附加到端點後方的執行中瀏覽器，而不是開啟個人資料目錄。

<Accordion title="現有會話功能的限制">

與受控的 `openclaw` 設定檔相比，現有會話驅動程式受到更多限制：

- **螢幕截圖** - 頁面擷取和 `--ref` 元素擷取有效；CSS `--element` 選擇器則無效。`--full-page` 無法與 `--ref` 或 `--element` 結合。頁面或基於參照的元素螢幕截圖不需要 Playwright。
- **動作** - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要快照參照（無 CSS 選擇器）。`click-coords` 點擊可見視口座標，不需要快照參照。`click` 僅限左鍵。`type` 不支援 `slowly=true`；請使用 `fill` 或 `press`。`press` 不支援 `delayMs`。`type`、`hover`、`scrollIntoView`、`drag`、`select`、`fill` 和 `evaluate` 不支援每次呼叫逾時。`select` 接受單一值。
- **等待 / 上傳 / 對話方塊** - `wait --url` 支援精確、子字串和 glob 模式；不支援 `wait --load networkidle`。上傳掛鉤需要 `ref` 或 `inputRef`，一次一個檔案，無 CSS `element`。對話方塊掛鉤不支援逾時覆寫或 `dialogId`。
- **對話方塊可見性** - 受控瀏覽器動作回應會在動作開啟強制回應對話方塊時包含 `blockedByDialog` 和 `browserState.dialogs.pending`；快照也包含待處理的對話方塊狀態。當對話方塊待處理時，以 `browser dialog --accept/--dismiss --dialog-id <id>` 回應。在 OpenClaw 外部處理的對話方塊會出現在 `browserState.dialogs.recent` 下。
- **僅限受控功能** - 批次動作、PDF 匯出、下載攔截和 `responsebody` 仍需要受控瀏覽器路徑。

</Accordion>

## 隔離保證

- **專用用戶資料目錄**：絕不會接觸您的個人瀏覽器設定檔。
- **專用連接埠**：避免 `9222` 以防止與開發工作流程發生衝突。
- **確定性分頁控制**：`tabs` 會先傳回 `suggestedTargetId`，接著
  是穩定的 `tabId` 控制碼，例如 `t1`、選用標籤以及原始的 `targetId`。
  Agent 應該重複使用 `suggestedTargetId`；原始 ID 則保留用於
  偵錯與相容性。

## 瀏覽器選擇

在本機啟動時，OpenClaw 會選擇第一個可用的瀏覽器：

1. Chrome
2. Brave
3. Edge
4. Chromium
5. Chrome Canary

您可以使用 `browser.executablePath` 覆寫設定。

平台：

- macOS：檢查 `/Applications` 和 `~/Applications`。
- Linux：檢查 `/usr/bin`、
  `/snap/bin`、`/opt/google`、`/opt/brave.com`、`/usr/lib/chromium` 和
  `/usr/lib/chromium-browser` 下常見的 Chrome/Brave/Edge/Chromium 位置，以及
  `PLAYWRIGHT_BROWSERS_PATH` 或 `~/.cache/ms-playwright` 下由 Playwright 管理的 Chromium。
- Windows：檢查常見的安裝位置。

## 控制 API (選用)

為了撰寫腳本與偵錯，Gateway 會公開一個小型 **僅限本機回送的 HTTP
控制 API**，以及對應的 `openclaw browser` CLI（快照、參照、等待
強化功能、JSON 輸出、偵錯工作流程）。請參閱
[Browser control API](/zh-Hant/tools/browser-control) 以取得完整參考資料。

## 疑難排解

關於 Linux 特有的問題（特別是 snap 版 Chromium），請參閱
[Browser troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)。

關於 WSL2 Gateway + Windows Chrome 分割主機設定，請參閱
[WSL2 + Windows + remote Chrome CDP troubleshooting](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

### CDP 啟動失敗與導航 SSRF 封鎖

這些是不同的失敗類別，且指向不同的程式碼路徑。

- **CDP 啟動或就緒失敗** 表示 OpenClaw 無法確認瀏覽器控制平面是否健康。
- **Navigation SSRF block** 表示瀏覽器控制平面正常，但頁面導航目標被策略拒絕。

常見範例：

- CDP 啟動或就緒失敗：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - 當配置回環外部 CDP 服務但未配置 `attachOnly: true` 時，發生 `Port <port> is in use for profile "<name>" but not by openclaw`
- Navigation SSRF block：
  - `open`、`navigate`、快照或分頁開啟流程因瀏覽器/網路策略錯誤而失敗，但 `start` 和 `tabs` 仍然正常

使用這個最簡順序來區分這兩種情況：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何解讀結果：

- 如果 `start` 失敗並出現 `not reachable after start`，請先排除 CDP 就緒問題。
- 如果 `start` 成功但 `tabs` 失敗，表示控制平面仍未正常。將此視為 CDP 連線問題，而非頁面導航問題。
- 如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失敗，表示瀏覽器控制平面已啟動，失敗原因在於導航策略或目標頁面。
- 如果 `start`、`tabs` 和 `open` 全部成功，則基本的受控瀏覽器控制路徑正常。

重要行為細節：

- 即使您未配置 `browser.ssrfPolicy`，瀏覽器配置預設也會採用封閉式失敗 的 SSRF 策略物件。
- 對於本地回環 `openclaw` 受控設定檔，CDP 健康檢查會刻意跳過對 OpenClaw 自身本地控制平面的瀏覽器 SSRF 連線能力強制執行。
- 導航保護是分開的。成功的 `start` 或 `tabs` 結果並不代表後續的 `open` 或 `navigate` 目標被允許。

安全性指引：

- 預設情況下請 **勿** 放寬瀏覽器 SSRF 策略。
- 優先使用狹隘的主機例外，例如 `hostnameAllowlist` 或 `allowedHostnames`，而不是廣泛的私有網路存取。
- 僅在需要並審查過私有網路瀏覽器存取權的刻意信任環境中使用 `dangerouslyAllowPrivateNetwork: true`。

## Agent 工具 + 控制運作方式

Agent 會取得 **一個工具** 用於瀏覽器自動化：

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act

其對應方式：

- `browser snapshot` 會回傳一個穩定的 UI 樹（AI 或 ARIA）。
- `browser act` 使用快照 `ref` ID 來進行點擊/輸入/拖曳/選取。
- `browser screenshot` 會擷取像素（完整頁面、元素或標記參照）。
- `browser doctor` 會檢查 Gateway、外掛、設定檔、瀏覽器以及分頁的準備狀態。
- `browser` 接受：
  - `profile` 用於選擇具名瀏覽器設定檔（openclaw、chrome 或遠端 CDP）。
  - `target` (`sandbox` | `host` | `node`) 用於選擇瀏覽器的所在位置。
  - 在沙盒化工作階段中，`target: "host"` 需要 `agents.defaults.sandbox.browser.allowHostControl=true`。
  - 如果省略 `target`：沙盒化工作階段預設為 `sandbox`，非沙盒工作階段預設為 `host`。
  - 如果連接了具備瀏覽器功能的節點，工具可能會自動路由到該節點，除非您固定 `target="host"` 或 `target="node"`。

這能保持 Agent 的決定性，並避免脆弱的選擇器。

## 相關

- [工具總覽](/zh-Hant/tools) - 所有可用的 Agent 工具
- [沙盒化](/zh-Hant/gateway/sandboxing) - 沙盒環境中的瀏覽器控制
- [安全性](/zh-Hant/gateway/security) - 瀏覽器控制的風險與強化防護
