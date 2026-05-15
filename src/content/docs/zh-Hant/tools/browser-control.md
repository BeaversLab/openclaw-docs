---
summary: "OpenClaw 瀏覽器控制 API、CLI 參考和腳本操作"
read_when:
  - Scripting or debugging the agent browser via the local control API
  - Looking for the `openclaw browser` CLI reference
  - Adding custom browser automation with snapshots and refs
title: "瀏覽器控制 API"
---

有關設定、組態與疑難排解，請參閱 [Browser](/zh-Hant/tools/browser)。
本頁是本機控制 HTTP API、`openclaw browser`
CLI 與腳本模式（快照、參照、等待、除錯流程）的參考文件。

## 控制 API（可選）

僅適用於本機整合，閘道會公開一個小型回送 HTTP API：

- 狀態/啟動/停止：`GET /`、`POST /start`、`POST /stop`
- 分頁：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/螢幕擷圖：`GET /snapshot`、`POST /screenshot`
- 操作：`POST /navigate`、`POST /act`
- 掛鉤：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下載：`POST /download`、`POST /wait/download`
- 權限：`POST /permissions/grant`
- 偵錯：`GET /console`、`POST /pdf`
- 偵錯：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 網路：`POST /response/body`
- 狀態：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 狀態：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 設定：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端點都接受 `?profile=<name>`。`POST /start?headless=true` 請求針對本機管理的設定檔進行一次性無頭啟動，而不會變更持續儲存的瀏覽器設定；僅附加、遠端 CDP 和現有會話設定檔會拒絕該覆寫，因為 OpenClaw 不會啟動那些瀏覽器程序。

如果設定了共用金鑰閘道驗證，瀏覽器 HTTP 路由也需要驗證：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用該密碼進行 HTTP Basic 驗證

備註：

- 此獨立的迴路瀏覽器 API **不會**使用受信任 proxy 或 Tailscale Serve 身分標頭。
- 如果 `gateway.auth.mode` 是 `none` 或 `trusted-proxy`，這些迴路瀏覽器路由並不會繼承那些攜帶身分的模式；請將它們保持為僅限迴路存取。

### `/act` 錯誤契約

`POST /act` 針對路由層級驗證和政策失敗使用結構化錯誤回應：

```json
{ "error": "<message>", "code": "ACT_*" }
```

目前的 `code` 值：

- `ACT_KIND_REQUIRED` (HTTP 400)：`kind` 遺失或無法辨識。
- `ACT_INVALID_REQUEST` (HTTP 400)：動作承載未能通過正規化或驗證。
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400)：`selector` 與不支援的動作類型搭配使用。
- `ACT_EVALUATE_DISABLED` (HTTP 403)：`evaluate` (或 `wait --fn`) 已由設定停用。
- `ACT_TARGET_ID_MISMATCH` (HTTP 403)：頂層或批次 `targetId` 與請求目標衝突。
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501)：不支援針對現有會話設定檔的動作。

其他執行階段失敗可能仍會傳回 `{ "error": "<message>" }`，但不包含
`code` 欄位。

### Playwright 需求

部分功能（導航/操作/AI 快照/角色快照、元素螢幕截圖、
PDF）需要 Playwright。如果未安裝 Playwright，這些端點會傳回
明確的 501 錯誤。

沒有 Playwright 仍可使用的功能：

- ARIA 快照
- 當每個分頁 CDP WebSocket 可用時，角色樣式的輔助功能快照 (`--interactive`, `--compact`,
  `--depth`, `--efficient`)。這是
  檢查和 ref 發現的後備方案；Playwright 仍然是主要的
  動作引擎。
- 當每個分頁 CDP WebSocket 可用時，受管理 `openclaw` 瀏覽器的頁面截圖
- `existing-session` / Chrome MCP 設定檔的頁面截圖
- 來自快照輸出的 `existing-session` 基於 ref 的截圖 (`--ref`)

仍然需要 Playwright 的項目：

- `navigate`
- `act`
- 依賴 Playwright 原生 AI 快照格式的 AI 快照
- CSS 選擇器元素截圖 (`--element`)
- 完整瀏覽器 PDF 匯出

元素截圖也會拒絕 `--full-page`；該路由會回傳 `fullPage is
not supported for element screenshots`。

如果您看到 `Playwright is not available in this gateway build`，表示打包的
Gateway 缺少核心瀏覽器執行時期相依性。請重新安裝或更新
OpenClaw，然後重新啟動 gateway。對於 Docker，還須如下所示安裝 Chromium
瀏覽器二進位檔。

#### Docker Playwright 安裝

如果您的 Gateway 在 Docker 中執行，請避免 `npx playwright`（npm 覆寫衝突）。
請改用隨附的 CLI：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

若要保存瀏覽器下載項目，請設定 `PLAYWRIGHT_BROWSERS_PATH`（例如，
`/home/node/.cache/ms-playwright`）並確保 `/home/node` 已透過
`OPENCLAW_HOME_VOLUME` 或繫結掛載保存。OpenClaw 會在 Linux 上自動偵測已保存的
Chromium。請參閱 [Docker](/zh-Hant/install/docker)。

## 運作方式 (內部)

一個小型回送控制伺服器接受 HTTP 請求，並透過 CDP 連線至基於 Chromium 的瀏覽器。進階動作 (點擊/輸入/快照/PDF) 會透過 CDP 上層的 Playwright 執行；當 Playwright 缺失時，僅提供非 Playwright 操作。代理程式會看到一個穩定的介面，而本機/遠端瀏覽器和設定檔則在下方自由交換。

## CLI 快速參考

所有指令都接受 `--browser-profile <name>` 以指定特定設定檔，以及 `--json` 以取得機器可讀輸出。

<AccordionGroup>

<Accordion title="基礎：狀態、分頁、開啟/聚焦/關閉">

```bash
openclaw browser status
openclaw browser start
openclaw browser start --headless # one-shot local managed headless launch
openclaw browser stop            # also clears emulation on attach-only/remote CDP
openclaw browser tabs
openclaw browser tab             # shortcut for current tab
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://example.com
openclaw browser focus abcd1234
openclaw browser close abcd1234
```

</Accordion>

<Accordion title="檢查：截圖、快照、主控台、錯誤、請求">

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref 12        # or --ref e12
openclaw browser screenshot --labels
openclaw browser snapshot
openclaw browser snapshot --format aria --limit 200
openclaw browser snapshot --interactive --compact --depth 6
openclaw browser snapshot --efficient
openclaw browser snapshot --labels
openclaw browser snapshot --urls
openclaw browser snapshot --selector "#main" --interactive
openclaw browser snapshot --frame "iframe#main" --interactive
openclaw browser console --level error
openclaw browser errors --clear
openclaw browser requests --filter api --clear
openclaw browser pdf
openclaw browser responsebody "**/api" --max-chars 5000
```

</Accordion>

<Accordion title="動作：導覽、點擊、輸入、拖曳、等待、評估">

```bash
openclaw browser navigate https://example.com
openclaw browser resize 1280 720
openclaw browser click 12 --double           # or e12 for role refs
openclaw browser click-coords 120 340        # viewport coordinates
openclaw browser type 23 "hello" --submit
openclaw browser press Enter
openclaw browser hover 44
openclaw browser scrollintoview e12
openclaw browser drag 10 11
openclaw browser select 9 OptionA OptionB
openclaw browser download e12 report.pdf
openclaw browser waitfordownload report.pdf
openclaw browser upload /tmp/openclaw/uploads/file.pdf
openclaw browser fill --fields '[{"ref":"1","type":"text","value":"Ada"}]'
openclaw browser dialog --accept
openclaw browser wait --text "Done"
openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
openclaw browser highlight e12
openclaw browser trace start
openclaw browser trace stop
```

</Accordion>

<Accordion title="狀態：Cookies、儲存空間、離線、標頭、地理位置、裝置">

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url "https://example.com"
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set theme dark
openclaw browser storage session clear
openclaw browser set offline on
openclaw browser set headers --headers-json '{"X-Debug":"1"}'
openclaw browser set credentials user pass            # --clear to remove
openclaw browser set geo 37.7749 -122.4194 --origin "https://example.com"
openclaw browser set media dark
openclaw browser set timezone America/New_York
openclaw browser set locale en-US
openclaw browser set device "iPhone 14"
```

</Accordion>

</AccordionGroup>

備註：

- `upload` 與 `dialog` 為**準備**呼叫；請在觸發選擇器/對話方塊的點擊/按下動作之前執行它們。
- `click`/`type`/等需要來自 `snapshot` 的 `ref`（數值 `12`、角色參照 `e12` 或可執行 ARIA 參照 `ax12`）。動作刻意不支援 CSS 選擇器。當可見視口位置是唯一可靠的目標時，請使用 `click-coords`。
- 下載、追蹤與上傳路徑受限於 OpenClaw 暫存根目錄：`/tmp/openclaw{,/downloads,/uploads}`（後備：`${os.tmpdir()}/openclaw/...`）。
- `upload` 也可以透過 `--input-ref` 或 `--element` 直接設定檔案輸入。

當 OpenClaw 能夠證明替換分頁時（例如相同的 URL 或單一舊分頁在表單提交後變成單一新分頁），穩定的分頁 ID 和標籤在 Chromium 原始目標替換中會被保留。原始目標 ID 仍然是不穩定的；在腳本中請優先使用來自 `tabs` 的 `suggestedTargetId`。

快照旗標一覽：

- `--format ai` (使用 Playwright 時的預設值)：帶有數字參照 (`aria-ref="<n>"`) 的 AI 快照。
- `--format aria`：帶有 `axN` 參照的無障礙樹。當 Playwright 可用時，OpenClaw 會將帶有後端 DOM ID 的參照綁定到即時頁面，以便後續操作可以使用它們；否則請將輸出視為僅供檢查。
- `--efficient` (或 `--mode efficient`)：精簡角色快照預設。設定 `browser.snapshotDefaults.mode: "efficient"` 可將此設為預設值 (請參閱 [Gateway configuration](/zh-Hant/gateway/configuration-reference#browser))。
- `--interactive`、`--compact`、`--depth`、`--selector` 會強制使用帶有 `ref=e12` 參照的角色快照。`--frame "<iframe>"` 將角色快照的範圍限定在 iframe 內。
- `--labels` 會新增一個僅檢視區的螢幕截圖，並覆蓋參照標籤 (列印 `MEDIA:<path>`)。
- `--urls` 會將探索到的連結目的地附加到 AI 快照。

## 快照與參照

OpenClaw 支援兩種「快照」樣式：

- **AI 快照 (數字參照)**：`openclaw browser snapshot` (預設值；`--format ai`)
  - 輸出：包含數字參照的文字快照。
  - 操作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在內部，參照是透過 Playwright 的 `aria-ref` 解析的。

- **角色快照 (類似 `e12` 的角色參照)**：`openclaw browser snapshot --interactive` (或 `--compact`、`--depth`、`--selector`、`--frame`)
  - 輸出：帶有 `[ref=e12]` (以及選用的 `[nth=1]`) 的基於角色的清單/樹狀結構。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在內部，ref 是透過 `getByRole(...)` 解析的（對於重複項則加上 `nth()`）。
  - 新增 `--labels` 以包含帶有重疊 `e12` 標籤的視口截圖。
  - 當連結文字不明確且代理需要具體的導航目標時，新增 `--urls`。

- **ARIA 快照（ARIA refs 如 `ax12`）**：`openclaw browser snapshot --format aria`
  - 輸出：作為結構化節點的可存取性樹。
  - 動作：當快照路徑可以透過 Playwright 和 Chrome 後端 DOM ID 綁定 ref 時，`openclaw browser click ax12` 有效。
- 如果 Playwright 不可用，ARIA 快照仍然適用於檢查，但 refs 可能無法執行。當您需要動作 refs 時，請使用 `--format ai`
  或 `--interactive` 重新擷取快照。
- raw-CDP 備援路徑的 Docker 證明：`pnpm test:docker:browser-cdp-snapshot`
  使用 CDP 啟動 Chromium，執行 `browser doctor --deep`，並驗證角色
  快照包含連結 URL、游標提升的可點擊元素和 iframe 元資料。

參考行為：

- Refs 在導航之間**不穩定**；如果操作失敗，請重新執行 `snapshot` 並使用新的 ref。
- 當 `/act` 能夠證明被替換的分頁時，它會在觸發動作的替換之後返回當前的原始 `targetId`。請繼續使用穩定的分頁 ID/標籤進行
  後續指令。
- 如果角色快照是使用 `--frame` 擷取的，則角色 refs 的範圍限定在該 iframe 內，直到下一次角色快照為止。
- 未知或過時的 `axN` refs 會快速失敗，而不是回退到
  Playwright 的 `aria-ref` 選擇器。當發生這種情況時，請在同一個分頁上執行新的快照。

## 等待增強功能

您可以等待的對象不限於時間/文字：

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

## 偵錯工作流程

當動作失敗時（例如「不可見」、「違反嚴格模式」、「被覆蓋」）：

1. `openclaw browser snapshot --interactive`
2. 使用 `click <ref>` / `type <ref>`（在互動模式下首選 role refs）
3. 如果仍然失敗：`openclaw browser highlight <ref>` 以查看 Playwright 的目標是什麼
4. 如果頁面行為異常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 若要進行深度除錯：請記錄追蹤：
   - `openclaw browser trace start`
   - 重現該問題
   - `openclaw browser trace stop` (列印 `TRACE:<path>`)

## JSON 輸出

`--json` 適用於腳本編寫和結構化工具。

範例：

```bash
openclaw browser status --json
openclaw browser snapshot --interactive --json
openclaw browser requests --filter api --json
openclaw browser cookies --json
```

JSON 中的角色快照包含 `refs` 以及一個小型的 `stats` 區塊（行/字元/參照/互動），以便工具能夠推斷負載大小和密度。

## 狀態與環境控制選項

這些功能對於「讓網站表現得像 X」的工作流程非常有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- 儲存空間：`storage local|session get|set|clear`
- 離線：`set offline on|off`
- 標頭：`set headers --headers-json '{"X-Debug":"1"}'`（舊版的 `set headers --json '{"X-Debug":"1"}'` 仍然支援）
- HTTP 基本驗證：`set credentials user pass`（或 `--clear`）
- 地理位置：`set geo <lat> <lon> --origin "https://example.com"`（或 `--clear`）
- 媒體：`set media dark|light|no-preference|none`
- 時區 / 地區設定：`set timezone ...`、`set locale ...`
- 裝置 / 視口：
  - `set device "iPhone 14"` (Playwright 裝置預設集)
  - `set viewport 1280 720`

## 安全性與隱私

- openclaw 瀏覽器設定檔可能包含已登入的工作階段；請將其視為敏感資料。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  會在頁面上下文中執行任意的 JavaScript。提示注入可以操縱
  此行為。如果您不需要它，請使用 `browser.evaluateEnabled=false` 將其停用。
- 有關登入和反機器人注意事項（X/Twitter 等），請參閱 [Browser login + X/Twitter posting](/zh-Hant/tools/browser-login)。
- 請將 Gateway/節點主機保持私密（僅限回送或 tailnet）。
- 遠端 CDP 端點非常強大；請為其建立通道並加以保護。

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

## 相關內容

- [Browser](/zh-Hant/tools/browser) - 概覽、設定、設定檔、安全性
- [Browser login](/zh-Hant/tools/browser-login) - 登入網站
- [Browser Linux troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)
- [Browser WSL2 troubleshooting](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
