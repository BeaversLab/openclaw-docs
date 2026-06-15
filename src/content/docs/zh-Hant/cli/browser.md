---
summary: "CLI 參考資料，用於 `openclaw browser`（生命週期、設定檔、分頁、動作、狀態和偵錯）"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "Browser"
---

# `openclaw browser`

管理 OpenClaw 的瀏覽器控制介面並執行瀏覽器動作（生命週期、設定檔、分頁、快照、螢幕截圖、導航、輸入、狀態模擬和偵錯）。

相關：

- Browser 工具 + API：[Browser 工具](/zh-Hant/tools/browser)

## 通用旗標

- `--url <gatewayWsUrl>`：Gateway WebSocket URL（預設為設定檔）。
- `--token <token>`：Gateway 權杖（如有需要）。
- `--timeout <ms>`：要求逾時 (ms)。
- `--expect-final`：等待最終的 Gateway 回應。
- `--browser-profile <name>`：選擇瀏覽器設定檔（預設來自設定檔）。
- `--json`：機器可讀輸出（如支援）。

## 快速入門（本機）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

Agent 可以使用 `browser({ action: "doctor" })` 執行相同的就緒檢查。

## 快速疑難排解

如果 `start` 失敗並顯示 `not reachable after start`，請先針對 CDP 就緒狀態進行疑難排解。如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失敗，表示瀏覽器控制平面正常，失敗原因通常是導覽 SSRF 原則。

最小序列：

```bash
openclaw browser --browser-profile openclaw doctor
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

詳細指引：[Browser 疑難排解](/zh-Hant/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## 生命週期

```bash
openclaw browser status
openclaw browser doctor
openclaw browser doctor --deep
openclaw browser start
openclaw browser start --headless
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

備註：

- `doctor --deep` 會新增即時快照探測。當基本 CDP
  就緒狀態顯示正常，但您想要證明可以檢查目前分頁時，這很有用。
- 對於 `attachOnly` 和遠端 CDP 設定檔，`openclaw browser stop` 會關閉
  作用中的控制工作階段並清除暫時模擬覆寫，即使
  OpenClaw 並未啟動瀏覽器程序本身。
- 對於本機受控設定檔，`openclaw browser stop` 會停止產生的瀏覽器
  程序。
- `openclaw browser start --headless` 僅適用於該啟動請求，
  且僅在 OpenClaw 啟動本機受控瀏覽器時適用。它不會重寫
  `browser.headless` 或設定檔組態，對於已執行中
  的瀏覽器則為空操作。
- 在沒有 `DISPLAY` 或 `WAYLAND_DISPLAY` 的 Linux 主機上，本機受控設定檔
  會自動以無頭模式執行，除非 `OPENCLAW_BROWSER_HEADLESS=0`、
  `browser.headless=false` 或 `browser.profiles.<name>.headless=false`
  明確要求可見的瀏覽器。

## 如果缺少指令

如果 `openclaw browser` 是未知指令，請檢查 `plugins.allow` 中的
`~/.openclaw/openclaw.json`。

當存在 `plugins.allow` 時，請明確列出內建的瀏覽器外掛程式，
除非組態已經有根 `browser` 區塊：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

明確的根 `browser` 區塊，例如 `browser.enabled=true` 或
`browser.profiles.<name>`，也會在嚴格的外掛程式允許清單下啟用捆綁的瀏覽器外掛程式。

相關：[Browser 工具](/zh-Hant/tools/browser#missing-browser-command-or-tool)

## 設定檔

設定檔是命名的瀏覽器路由設定。實際上：

- `openclaw`：啟動或連接到專屬的 OpenClaw 管理的 Chrome 實例（隔離的使用者資料目錄）。
- `user`：透過 Chrome DevTools MCP 控制您現有的已登入 Chrome 工作階段。
- 自訂 CDP 設定檔：指向本地或遠端 CDP 端點。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

使用特定的設定檔：

```bash
openclaw browser --browser-profile work tabs
```

## 分頁

```bash
openclaw browser tabs
openclaw browser tab new --label docs
openclaw browser tab label t1 docs
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai --label docs
openclaw browser focus docs
openclaw browser close t1
```

`tabs` 首先返回 `suggestedTargetId`，然後是穩定的 `tabId`（例如 `t1`）、
可選的標籤，以及原始 `targetId`。代理應將
`suggestedTargetId` 傳回給 `focus`、`close`、快照和動作。您可以
使用 `open --label`、`tab new --label` 或 `tab label` 指派標籤；
標籤、tab id、原始 target id 和唯一的 target-id 前綴均被接受。
為了相容性，請求欄位仍命名為 `targetId`，但它接受
這些 tab 參考。請將原始 target id 視為診斷句柄，而非持久的
代理記憶。
當 Chromium 在導覽或表單提交期間替換底層原始 target 時，
只要 OpenClaw 能證明匹配，就會將穩定的 `tabId`/標籤
附加到替換的 tab 上。原始 target id 保持不穩定；請優先使用
`suggestedTargetId`。

## 快照 / 截圖 / 動作

快照：

```bash
openclaw browser snapshot
openclaw browser snapshot --urls
```

截圖：

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
openclaw browser screenshot --labels
```

備註：

- `--full-page` 僅用於頁面擷取；它無法與 `--ref`
  或 `--element` 結合使用。
- `existing-session` / `user` 設定檔支援頁面螢幕擷圖和來自快照輸出的 `--ref`
  螢幕擷圖，但不支援 CSS `--element` 螢幕擷圖。
- `--labels` 會在螢幕擷圖上疊加目前的快照參考。
- `snapshot --urls` 會將探索到的連結目的地附加到 AI 快照，以便
  代理可以選擇直接導覽目標，而不僅僅是從連結
  文字進行猜測。

導覽/點擊/輸入（基於 ref 的 UI 自動化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser click-coords 120 340
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser scrollintoview <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
openclaw browser evaluate --timeout-ms 30000 --fn 'async () => { await window.ready; return true; }'
```

當頁面端函式可能需要的時間超過預設的評估逾時時，請使用 `evaluate --timeout-ms <ms>`。

動作回應會在 OpenClaw 能夠證明替換分頁時，傳回動作觸發頁面替換後的目前原始 `targetId`。腳本仍應儲存並傳遞 `suggestedTargetId`/標籤以用於長期工作流程。

檔案 + 對話方塊輔助工具：

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser upload media://inbound/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
openclaw browser dialog --dismiss --dialog-id d1
```

受管理的 Chrome 設定檔會將一般的點擊觸發下載儲存到 OpenClaw 下載目錄中（預設為 `/tmp/openclaw/downloads`，或設定的暫存根目錄）。當代理程式需要等待特定檔案並傳回其路徑時，請使用 `waitfordownload` 或 `download`；這些明確的等待程式會擁有下一次的下載。上傳會接受來自 OpenClaw 暫存上傳根目錄和 OpenClaw 管理的輸入媒體的檔案，包括 `media://inbound/<id>` 和相對於沙箱的 `media/inbound/<id>` 參考。巢狀媒體參考、巡覽和任意本機路徑仍會被拒絕。
當動作開啟強制回應對話方塊時，動作回應會傳回具有 `browserState.dialogs.pending` 的 `blockedByDialog`；請傳遞 `--dialog-id` 以直接回應它。在 OpenClaw 之外處理的對話方塊會顯示在 `browserState.dialogs.recent` 下。

## 狀態與儲存空間

檢視區 + 模擬：

```bash
openclaw browser resize 1280 720
openclaw browser set viewport 1280 720
openclaw browser set offline on
openclaw browser set media dark
openclaw browser set timezone Europe/London
openclaw browser set locale en-GB
openclaw browser set geo 51.5074 -0.1278 --accuracy 25
openclaw browser set device "iPhone 14"
openclaw browser set headers '{"x-test":"1"}'
openclaw browser set credentials myuser mypass
```

Cookie + 儲存空間：

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url https://example.com
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set token abc123
openclaw browser storage session clear
```

## 偵錯

```bash
openclaw browser console --level error
openclaw browser pdf
openclaw browser responsebody "**/api"
openclaw browser highlight <ref>
openclaw browser errors --clear
openclaw browser requests --filter api
openclaw browser trace start
openclaw browser trace stop --out trace.zip
```

## 透過 MCP 使用現有的 Chrome

使用內建的 `user` 設定檔，或建立您自己的 `existing-session` 設定檔：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

此路徑僅適用於主機。對於 Docker、無頭伺服器、Browserless 或其他遠端設定，請改用 CDP 設定檔。

目前現有工作階段的限制：

- 快照驅動的動作使用參照，而非 CSS 選取器
- 當呼叫者省略 `timeoutMs` 時，`browser.actionTimeoutMs` 會將支援的 `act` 要求預設為 60000 毫秒；每次呼叫的 `timeoutMs` 仍然優先。
- `click` 僅支援左鍵點擊
- `type` 不支援 `slowly=true`
- `press` 不支援 `delayMs`
- `hover`、`scrollintoview`、`drag`、`select`、`fill` 和 `evaluate` 會拒絕每次呼叫的逾時覆寫
- `select` 僅支援一個值
- 不支援 `wait --load networkidle`
- 檔案上傳需要 `--ref` / `--input-ref`，不支援 CSS
  `--element`，且目前一次僅支援一個檔案
- 對話框掛鉤不支援 `--timeout`
- 螢幕截圖支援頁面擷取和 `--ref`，但不支援 CSS `--element`
- `responsebody`、下載攔截、PDF 匯出和批次動作仍然
  需要受管理的瀏覽器或原始 CDP 設定檔

## 遠端瀏覽器控制 (節點主機代理)

如果 Gateway 和瀏覽器執行在不同的機器上，請在安裝了 Chrome/Brave/Edge/Chromium 的機器上執行 **node host**。Gateway 會將瀏覽器操作代理到該節點 (不需要單獨的瀏覽器控制伺服器)。

使用 `gateway.nodes.browser.mode` 控制自動路由，並在連線多個節點時使用 `gateway.nodes.browser.node` 固定特定節點。

安全性 + 遠端設定：[Browser tool](/zh-Hant/tools/browser)、[Remote access](/zh-Hant/gateway/remote)、[Tailscale](/zh-Hant/gateway/tailscale)、[Security](/zh-Hant/gateway/security)

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [瀏覽器](/zh-Hant/tools/browser)
