---
summary: "OpenClaw 瀏覽器控制 API、CLI 參考和腳本操作"
read_when:
  - Scripting or debugging the agent browser via the local control API
  - Looking for the `openclaw browser` CLI reference
  - Adding custom browser automation with snapshots and refs
title: "瀏覽器控制 API"
---

如需設定、設定組和疑難排解，請參閱 [Browser](/zh-Hant/tools/browser)。
本頁面是本機控制 HTTP API、`openclaw browser`
CLI 以及腳本模式（快照、refs、waits、除錯流程）的參考資料。

## 控制 API（可選）

僅適用於本機整合，閘道會公開一個小型回送 HTTP API：

- 狀態/啟動/停止：`GET /`、`POST /start`、`POST /stop`
- 分頁：`GET /tabs`、`POST /tabs/open`、`POST /tabs/focus`、`DELETE /tabs/:targetId`
- 快照/螢幕截圖：`GET /snapshot`、`POST /screenshot`
- 動作：`POST /navigate`、`POST /act`
- 鉤子：`POST /hooks/file-chooser`、`POST /hooks/dialog`
- 下載：`POST /download`、`POST /wait/download`
- 權限：`POST /permissions/grant`
- 除錯：`GET /console`、`POST /pdf`
- 除錯：`GET /errors`、`GET /requests`、`POST /trace/start`、`POST /trace/stop`、`POST /highlight`
- 網路：`POST /response/body`
- 狀態：`GET /cookies`、`POST /cookies/set`、`POST /cookies/clear`
- 狀態：`GET /storage/:kind`、`POST /storage/:kind/set`、`POST /storage/:kind/clear`
- 設定：`POST /set/offline`、`POST /set/headers`、`POST /set/credentials`、`POST /set/geolocation`、`POST /set/media`、`POST /set/timezone`、`POST /set/locale`、`POST /set/device`

所有端點都接受 `?profile=<name>`。`POST /start?headless=true` 請求針對本機管理設定檔的一次性無頭啟動，且不變更持久的瀏覽器設定；僅附加、遠端 CDP 和現有工作階段設定檔會拒絕該覆寫，因為 OpenClaw 不會啟動那些瀏覽器程序。

如果設定了共用金鑰閘道驗證，瀏覽器 HTTP 路由也需要驗證：

- `Authorization: Bearer <gateway token>`
- `x-openclaw-password: <gateway password>` 或使用該密碼進行 HTTP Basic 驗證

備註：

- 此獨立的迴路瀏覽器 API **不會**使用受信任 proxy 或 Tailscale Serve 身分標頭。
- 如果 `gateway.auth.mode` 是 `none` 或 `trusted-proxy`，這些回瀏覽器路由不會繼承那些承載身分的模式；請將它們保持為僅限回環。

### `/act` 錯誤約定

`POST /act` 針對路由層級的驗證和策略失敗使用結構化錯誤回應：

```json
{ "error": "<message>", "code": "ACT_*" }
```

目前的 `code` 值：

- `ACT_KIND_REQUIRED` (HTTP 400)：`kind` 遺失或無法辨識。
- `ACT_INVALID_REQUEST` (HTTP 400)：動作載荷未通過正規化或驗證。
- `ACT_SELECTOR_UNSUPPORTED` (HTTP 400)：`selector` 與不支援的動作類型搭配使用。
- `ACT_EVALUATE_DISABLED` (HTTP 403)：`evaluate` (或 `wait --fn`) 已被設定停用。
- `ACT_TARGET_ID_MISMATCH` (HTTP 403): 頂層或批次 `targetId` 與請求目標衝突。
- `ACT_EXISTING_SESSION_UNSUPPORTED` (HTTP 501): 現有 session 概要設定檔不支援此動作。

其他執行階段失敗可能仍會傳回 `{ "error": "<message>" }` 而不包含
`code` 欄位。

### Playwright 需求

部分功能（導航/操作/AI 快照/角色快照、元素螢幕截圖、
PDF）需要 Playwright。如果未安裝 Playwright，這些端點會傳回
明確的 501 錯誤。

沒有 Playwright 仍可使用的功能：

- ARIA 快照
- 當每個分頁 CDP WebSocket 可用時的角色樣式無障礙快照 (`--interactive`, `--compact`,
  `--depth`, `--efficient`)。這是
  用於檢查和 ref 探索的備選方案；Playwright 仍是主要的
  動作引擎。
- 當每個分頁 CDP WebSocket 可用時，針對受管理的 `openclaw` 瀏覽器的頁面截圖
- `existing-session` / Chrome MCP 概要設定檔的頁面截圖
- `existing-session` 基於參照的螢幕截圖 (`--ref`) 來自快照輸出

仍然需要 Playwright 的項目：

- `navigate`
- `act`
- 依賴 Playwright 原生 AI 快照格式的 AI 快照
- CSS 選擇器元素螢幕截圖 (`--element`)
- 完整瀏覽器 PDF 匯出

元素螢幕截圖也會拒絕 `--full-page`；路由會傳回 `fullPage is
not supported for element screenshots`。

如果您看到 `Playwright is not available in this gateway build`，表示打包的
Gateway 缺少核心瀏覽器執行時間相依性。請重新安裝或更新
OpenClaw，然後重新啟動 gateway。對於 Docker，也請如下所示安裝 Chromium
瀏覽器二進位檔。

#### Docker Playwright 安裝

如果您的 Gateway 在 Docker 中執行，請避免使用 `npx playwright` (npm 覆寫衝突)。
對於自訂映像檔，請將 Chromium 內建至映像檔中：

```bash
OPENCLAW_INSTALL_BROWSER=1 ./scripts/docker/setup.sh
```

對於現有的映像檔，請透過內建的 CLI 進行安裝：

```bash
docker compose run --rm openclaw-cli \
  node /app/node_modules/playwright-core/cli.js install chromium
```

若要保留瀏覽器下載內容，請設定 `PLAYWRIGHT_BROWSERS_PATH` (例如，
`/home/node/.cache/ms-playwright`) 並確保 `/home/node` 透過
`OPENCLAW_HOME_VOLUME` 或 bind mount 進行保留。OpenClaw 會自動偵測 Linux 上已
保留的 Chromium。請參閱 [Docker](/zh-Hant/install/docker)。

## 運作原理（內部機制）

一個小型的回送控制伺服器會接受 HTTP 請求，並透過 CDP 連接到基於 Chromium 的瀏覽器。進階動作（點擊/輸入/快照/PDF）會透過 CDP 上層的 Playwright 進行；當缺少 Playwright 時，僅提供非 Playwright 的操作。Agent 看到的是一個穩定的介面，而下層的本地/遠端瀏覽器和設定檔則可以自由替換。

## CLI 快速參考

所有指令都接受 `--browser-profile <name>` 以指定特定的設定檔，以及 `--json` 以取得機器可讀的輸出。

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

<Accordion title="檢查：螢幕截圖、快照、主控台、錯誤、請求">

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

<Accordion title="動作：導航、點擊、輸入、拖曳、等待、執行">

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
openclaw browser dialog --dismiss --dialog-id d1
openclaw browser wait --text "Done"
openclaw browser wait "#main" --url "**/dash" --load networkidle --fn "window.ready===true"
openclaw browser evaluate --fn '(el) => el.textContent' --ref 7
openclaw browser highlight e12
openclaw browser trace start
openclaw browser trace stop
```

</Accordion>

<Accordion title="狀態：Cookie、儲存空間、離線、標頭、地理位置、裝置">

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

- `upload` 和 `dialog` 是**準備 (arming)** 呼叫；請在觸發選擇器/對話方塊的點擊/按下動作之前執行它們。如果動作開啟了強制回應視窗，動作回應會包含 `blockedByDialog` 和 `browserState.dialogs.pending`；請傳遞該 `dialogId` 以直接回應。在 OpenClaw 外部處理的對話方塊會顯示在 `browserState.dialogs.recent` 之下。
- `click`/`type`/etc 需要來自 `snapshot` 的 `ref`（數值 `12`、角色參照 `e12` 或可操作 ARIA 參照 `ax12`）。動作刻意不支援 CSS 選擇器。當可視視口位置是唯一可靠的目標時，請使用 `click-coords`。
- 下載、追蹤和上傳路徑受限於 OpenClaw 暫存根目錄：`/tmp/openclaw{,/downloads,/uploads}` (後備：`${os.tmpdir()}/openclaw/...`)。
- `upload` 也可以透過 `--input-ref` 或 `--element` 直接設定檔案輸入。

當 OpenClaw 能夠證明取代索引標籤時（例如相同的 URL 或單一舊索引標籤在表單提交後變成
單一新索引標籤），穩定的索引標籤 ID 和標籤可在 Chromium 原始目標 取代中存活下來。原始目標 ID 仍然不穩定；在腳本中請優先使用來自 `tabs` 的 `suggestedTargetId`。

快照標誌概覽：

- `--format ai` (Playwright 的預設值)：帶有數值參照 (`aria-ref="<n>"`) 的 AI 快照。
- `--format aria`：具有 `axN` 引用的無障礙樹。當 Playwright 可用時，OpenClaw 會將引用與後端 DOM ID 繫結到即時頁面，以便後續操作可以使用它們；否則將輸出視為僅供檢查。
- `--efficient`（或 `--mode efficient`）：緊湊的角色快照預設。設定 `browser.snapshotDefaults.mode: "efficient"` 以將此設為預設值（請參閱 [Gateway configuration](/zh-Hant/gateway/configuration-reference#browser)）。
- `--interactive`、`--compact`、`--depth`、`--selector` 會強制使用 `ref=e12` 引用進行角色快照。`--frame "<iframe>"` 會將角色快照的範圍限定在 iframe。
- `--labels` 會新增僅限視口的螢幕截圖，並覆蓋引用標籤（列印 `MEDIA:<path>`）。
- `--urls` 會將探索到的連結目的地附加到 AI 快照。

## 快照與 Refs

OpenClaw 支援兩種「快照」風格：

- **AI snapshot (numeric refs)**：`openclaw browser snapshot`（預設值；`--format ai`）
  - 輸出：包含數值 refs 的文字快照。
  - 操作：`openclaw browser click 12`、`openclaw browser type 23 "hello"`。
  - 在內部，引用是透過 Playwright 的 `aria-ref` 解析的。

- **Role snapshot (role refs like `e12`)**：`openclaw browser snapshot --interactive`（或 `--compact`、`--depth`、`--selector`、`--frame`）
  - 輸出：帶有 `[ref=e12]`（以及可選的 `[nth=1]`）的基於角色的列表/樹狀結構。
  - 操作：`openclaw browser click e12`、`openclaw browser highlight e12`。
  - 在內部，引用是透過 `getByRole(...)` 解析的（對於重複項則加上 `nth()`）。
  - 新增 `--labels` 以包含帶有覆蓋 `e12` 標籤的視口螢幕截圖。
  - 當連結文字不明確，且代理需要具體的
    導覽目標時，請新增 `--urls`。

- **ARIA snapshot (ARIA refs like `ax12`)**：`openclaw browser snapshot --format aria`
  - 輸出：作為結構化節點的無障礙功能樹。
  - 動作：當快照路徑可以透過 Playwright 和 Chrome 後端 DOM ID 綁定 ref 時，`openclaw browser click ax12` 才能運作。
- 如果無法使用 Playwright，ARIA 快照對於檢查仍然有用，但 ref 可能無法執行動作。當您需要動作 ref 時，請使用 `--format ai` 或 `--interactive` 重新快照。
- raw-CDP 備援路徑的 Docker 證明：`pnpm test:docker:browser-cdp-snapshot` 啟動具有 CDP 的 Chromium，執行 `browser doctor --deep`，並驗證角色快照包含連結 URL、游標提升的可點擊元素以及 iframe 元資料。

Ref 行為：

- Ref **在導航之間不穩定**；如果操作失敗，請重新執行 `snapshot` 並使用新的 ref。
- 當 `/act` 能夠證明被替換的分頁時，它會在動作觸發的替換之後傳回目前的原始 `targetId`。請繼續使用穩定的分頁 ID/標籤進行後續指令。
- 如果角色快照是使用 `--frame` 擷取的，角色 ref 的範圍將限定於該 iframe，直到下一次角色快照。
- 未知或過時的 `axN` ref 會快速失敗，而不是退回到 Playwright 的 `aria-ref` 選擇器。發生這種情況時，請在同一個分頁上執行新的快照。

## Wait 增強功能

您可以等待的不只是時間/文字：

- 等待 URL（支援 Playwright 的 glob 模式）：
  - `openclaw browser wait --url "**/dash"`
- 等待載入狀態：
  - `openclaw browser wait --load networkidle`
- 等待 JS 述詞：
  - `openclaw browser wait --fn "window.ready===true"`
- 等待選擇器變成可見：
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
2. 使用 `click <ref>` / `type <ref>`（在互動模式中建議使用角色 ref）
3. 如果仍然失敗：`openclaw browser highlight <ref>` 以查看 Playwright 的鎖定目標
4. 如果頁面行為異常：
   - `openclaw browser errors --clear`
   - `openclaw browser requests --filter api --clear`
5. 若要進行深度除錯：記錄追蹤：
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

JSON 中的角色快照包含 `refs` 以及一個小型的 `stats` 區塊（行/字元/ref/互動），以便工具能夠推斷載荷大小和密度。

## 狀態與環境控制

這些對於「讓網站表現得像 X」的工作流程很有用：

- Cookies：`cookies`、`cookies set`、`cookies clear`
- Storage: `storage local|session get|set|clear`
- Offline: `set offline on|off`
- Headers: `set headers --headers-json '{"X-Debug":"1"}'` (legacy `set headers --json '{"X-Debug":"1"}'` remains supported)
- HTTP basic auth: `set credentials user pass` (or `--clear`)
- Geolocation: `set geo <lat> <lon> --origin "https://example.com"` (or `--clear`)
- Media: `set media dark|light|no-preference|none`
- Timezone / locale: `set timezone ...`, `set locale ...`
- 裝置 / 檢視區：
  - `set device "iPhone 14"` (Playwright device presets)
  - `set viewport 1280 720`

## 安全與隱私

- openclaw 瀏覽器設定檔可能包含已登入的工作階段；請將其視為敏感資料。
- `browser act kind=evaluate` / `openclaw browser evaluate` 和 `wait --fn`
  會在頁面上下文中執行任意的 JavaScript。提示注入可以操縱
  此行為。如果您不需要此功能，請使用 `browser.evaluateEnabled=false` 將其停用。
- For logins and anti-bot notes (X/Twitter, etc.), see [Browser login + X/Twitter posting](/zh-Hant/tools/browser-login).
- 請將 Gateway/節點主機保持私密（僅限 loopback 或 tailnet）。
- 遠端 CDP 端點功能強大；請透過通道傳輸並保護它們。

嚴格模式範例（預設封鎖私人/內部目的地）：

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

## 相關

- [Browser](/zh-Hant/tools/browser) - 概覽、設定、設定檔、安全性
- [Browser login](/zh-Hant/tools/browser-login) - 登入網站
- [Browser Linux troubleshooting](/zh-Hant/tools/browser-linux-troubleshooting)
- [Browser WSL2 troubleshooting](/zh-Hant/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
