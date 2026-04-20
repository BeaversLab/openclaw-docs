---
summary: "CLI 參考資料，用於 `openclaw browser`（生命週期、設定檔、分頁、動作、狀態和偵錯）"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "browser"
---

# `openclaw browser`

管理 OpenClaw 的瀏覽器控制介面並執行瀏覽器動作（生命週期、設定檔、分頁、快照、螢幕截圖、導航、輸入、狀態模擬和偵錯）。

相關：

- 瀏覽器工具 + API：[瀏覽器工具](/zh-Hant/tools/browser)

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

## 快速疑難排解

如果 `start` 失敗並顯示 `not reachable after start`，請先針對 CDP 就緒狀況進行疑難排解。如果 `start` 和 `tabs` 成功但 `open` 或 `navigate` 失敗，表示瀏覽器控制平面狀況良好，失敗通常是因為導航 SSRF 原則。

最短程序：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

詳細指引：[瀏覽器疑難排解](/zh-Hant/tools/browser#cdp-startup-failure-vs-navigation-ssrf-block)

## 生命週期

```bash
openclaw browser status
openclaw browser start
openclaw browser stop
openclaw browser --browser-profile openclaw reset-profile
```

備註：

- 對於 `attachOnly` 和遠端 CDP 設定檔，`openclaw browser stop` 會關閉
  作用中的控制工作階段並清除暫時的模擬覆寫，即使 OpenClaw
  本身並未啟動瀏覽器程序也是如此。
- 對於本機受管理設定檔，`openclaw browser stop` 會停止產生的瀏覽器
  程序。

## 如果缺少指令

如果 `openclaw browser` 是未知指令，請檢查 `plugins.allow` 中
的 `~/.openclaw/openclaw.json`。

當存在 `plugins.allow` 時，必須明確列出內建的瀏覽器外掛程式：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

當外掛程式允許清單排除 `browser` 時，
`browser.enabled=true` 不會還原 CLI 子指令。

相關：[瀏覽器工具](/zh-Hant/tools/browser#missing-browser-command-or-tool)

## 設定檔

設定檔是命名的瀏覽器路由配置。實際上：

- `openclaw`：啟動或附加至專屬的 OpenClaw 管理的 Chrome 實例（獨立的使用者資料目錄）。
- `user`：透過 Chrome DevTools MCP 控制您現有的已登入 Chrome 工作階段。
- 自訂 CDP 設定檔：指向本機或遠端 CDP 端點。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name remote --cdp-url https://browser-host.example.com
openclaw browser delete-profile --name work
```

使用特定設定檔：

```bash
openclaw browser --browser-profile work tabs
```

## 分頁

```bash
openclaw browser tabs
openclaw browser tab new
openclaw browser tab select 2
openclaw browser tab close 2
openclaw browser open https://docs.openclaw.ai
openclaw browser focus <targetId>
openclaw browser close <targetId>
```

## 快照 / 截圖 / 動作

快照：

```bash
openclaw browser snapshot
```

截圖：

```bash
openclaw browser screenshot
openclaw browser screenshot --full-page
openclaw browser screenshot --ref e12
```

備註：

- `--full-page` 僅用於頁面擷取；它無法與 `--ref`
  或 `--element` 結合使用。
- `existing-session` / `user` 設定檔支援頁面截圖以及來自快照輸出的 `--ref`
  截圖，但不支援 CSS `--element` 截圖。

導覽/點擊/輸入 (基於 ref 的 UI 自動化)：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
openclaw browser press Enter
openclaw browser hover <ref>
openclaw browser scrollintoview <ref>
openclaw browser drag <startRef> <endRef>
openclaw browser select <ref> OptionA OptionB
openclaw browser fill --fields '[{"ref":"1","value":"Ada"}]'
openclaw browser wait --text "Done"
openclaw browser evaluate --fn '(el) => el.textContent' --ref <ref>
```

檔案 + 對話方塊輔助工具：

```bash
openclaw browser upload /tmp/openclaw/uploads/file.pdf --ref <ref>
openclaw browser waitfordownload
openclaw browser download <ref> report.pdf
openclaw browser dialog --accept
```

## 狀態與儲存空間

視口 + 模擬：

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

Cookies + 儲存空間：

```bash
openclaw browser cookies
openclaw browser cookies set session abc123 --url https://example.com
openclaw browser cookies clear
openclaw browser storage local get
openclaw browser storage local set token abc123
openclaw browser storage session clear
```

## 除錯

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

## 透過 MCP 存取現有的 Chrome

使用內建的 `user` 設定檔，或建立您自己的 `existing-session` 設定檔：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

此路徑僅適用於主機。對於 Docker、無頭伺服器、Browserless 或其他遠端設定，請改用 CDP 設定檔。

目前現有工作階段的限制：

- 快照驅動的動作使用 refs，而非 CSS 選擇器
- `click` 僅支援左鍵點擊
- `type` 不支援 `slowly=true`
- `press` 不支援 `delayMs`
- `hover`、`scrollintoview`、`drag`、`select`、`fill` 和 `evaluate` 會拒絕
  每次呼叫的逾時覆寫
- `select` 僅支援一個值
- 不支援 `wait --load networkidle`
- 檔案上傳需要 `--ref` / `--input-ref`，不支援 CSS
  `--element`，且目前一次僅支援一個檔案
- 對話方塊勾點不支援 `--timeout`
- 螢幕截圖支援頁面擷取和 `--ref`，但不支援 CSS `--element`
- `responsebody`、下載攔截、PDF 匯出和批次操作仍需要受管理的瀏覽器或原始 CDP 設定檔

## 遠端瀏覽器控制（節點主機代理）

如果 Gateway 與瀏覽器在不同的機器上運行，請在裝有 Chrome/Brave/Edge/Chromium 的機器上執行 **node host**。Gateway 會將瀏覽器操作代理到該節點（不需要獨立的瀏覽器控制伺服器）。

使用 `gateway.nodes.browser.mode` 來控制自動路由，如果連接了多個節點，使用 `gateway.nodes.browser.node` 來固定特定節點。

安全性 + 遠端設定：[Browser tool](/zh-Hant/tools/browser)、[Remote access](/zh-Hant/gateway/remote)、[Tailscale](/zh-Hant/gateway/tailscale)、[Security](/zh-Hant/gateway/security)
