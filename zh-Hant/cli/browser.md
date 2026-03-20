---
summary: "`openclaw browser` 的 CLI 參考資料（設定檔、分頁、動作、Chrome MCP 和 CDP）"
read_when:
  - 您使用 `openclaw browser` 並且需要常見任務的範例
  - 您希望透過節點主機控管執行於另一部機器上的瀏覽器
  - 您希望透過 Chrome MCP 連接至您本機已登入的 Chrome
title: "browser"
---

# `openclaw browser`

管理 OpenClaw 的瀏覽器控制伺服器並執行瀏覽器動作（分頁、快照、螢幕截圖、導航、點擊、輸入）。

相關連結：

- 瀏覽器工具 + API：[瀏覽器工具](/zh-Hant/tools/browser)

## 通用旗標

- `--url <gatewayWsUrl>`：閘道 WebSocket URL（預設為設定值）。
- `--token <token>`：閘道權杖（若有需要）。
- `--timeout <ms>`：請求逾時（毫秒）。
- `--browser-profile <name>`：選擇瀏覽器設定檔（預設來自設定值）。
- `--json`：機器可讀輸出（於支援的情況下）。

## 快速入門（本機）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## 設定檔

設定檔是具名的瀏覽器路由設定。實務上：

- `openclaw`：啟動或連接至專屬的 OpenClaw 管理之 Chrome 執行個體（隔離的使用者資料目錄）。
- `user`：透過 Chrome DevTools MCP 控制您現有已登入的 Chrome 工作階段。
- 自訂 CDP 設定檔：指向本機或遠端的 CDP 端點。

```bash
openclaw browser profiles
openclaw browser create-profile --name work --color "#FF5A36"
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser delete-profile --name work
```

使用特定設定檔：

```bash
openclaw browser --browser-profile work tabs
```

## 分頁

```bash
openclaw browser tabs
openclaw browser open https://docs.openclaw.ai
openclaw browser focus <targetId>
openclaw browser close <targetId>
```

## 快照 / 螢幕截圖 / 動作

快照：

```bash
openclaw browser snapshot
```

螢幕截圖：

```bash
openclaw browser screenshot
```

導航/點擊/輸入（基於參照的 UI 自動化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## 透過 MCP 連接現有的 Chrome

使用內建的 `user` 設定檔，或建立您自己的 `existing-session` 設定檔：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

此路徑僅適用於主機。若為 Docker、無介面伺服器、Browserless 或其他遠端設定，請改用 CDP 設定檔。

## 遠端瀏覽器控制（節點主機代理程式）

如果閘道執行所在的機器與瀏覽器不同，請在擁有 Chrome/Brave/Edge/Chromium 的機器上執行**節點主機**。閘道會將瀏覽器動作代理至該節點（不需要個別的瀏覽器控制伺服器）。

使用 `gateway.nodes.browser.mode` 來控制自動路由，並在連接多個節點時使用 `gateway.nodes.browser.node` 釘選特定節點。

安全性 + 遠端設定：[瀏覽器工具](/zh-Hant/tools/browser)、[遠端存取](/zh-Hant/gateway/remote)、[Tailscale](/zh-Hant/gateway/tailscale)、[安全性](/zh-Hant/gateway/security)

import en from "/components/footer/en.mdx";

<en />
