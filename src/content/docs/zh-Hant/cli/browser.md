---
summary: "CLI 參考資料 `openclaw browser`（設定檔、分頁、動作、Chrome MCP 和 CDP）"
read_when:
  - You use `openclaw browser` and want examples for common tasks
  - You want to control a browser running on another machine via a node host
  - You want to attach to your local signed-in Chrome via Chrome MCP
title: "browser"
---

# `openclaw browser`

管理 OpenClaw 的瀏覽器控制伺服器並執行瀏覽器動作（分頁、快照、擷圖、導航、點擊、輸入）。

相關連結：

- 瀏覽器工具 + API：[Browser tool](/en/tools/browser)

## 常用旗標

- `--url <gatewayWsUrl>`：Gateway WebSocket URL（預設為組態）。
- `--token <token>`：Gateway 權杖（如有需要）。
- `--timeout <ms>`：要求逾時 (ms)。
- `--browser-profile <name>`：選擇瀏覽器設定檔（預設來自組態）。
- `--json`：機器可讀輸出（在支援的情況下）。

## 快速入門（本機）

```bash
openclaw browser profiles
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
openclaw browser --browser-profile openclaw snapshot
```

## 如果缺少指令

如果 `openclaw browser` 是未知指令，請檢查 `plugins.allow` 中的
`~/.openclaw/openclaw.json`。

當存在 `plugins.allow` 時，必須明確列出內建的瀏覽器外掛程式：

```json5
{
  plugins: {
    allow: ["telegram", "browser"],
  },
}
```

當外掛程式允許清單排除 `browser` 時，`browser.enabled=true` 不會還原 CLI 子指令。

相關：[Browser tool](/en/tools/browser#missing-browser-command-or-tool)

## 設定檔

設定檔是具名的瀏覽器路由設定。實務上：

- `openclaw`：啟動或連結至專屬的 OpenClaw 管理的 Chrome 執行個體（獨立的使用者資料目錄）。
- `user`：透過 Chrome DevTools MCP 控制您現有的已登入 Chrome 工作階段。
- 自訂 CDP 設定檔：指向本機或遠端 CDP 端點。

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

## 快照 / 截圖 / 動作

快照：

```bash
openclaw browser snapshot
```

截圖：

```bash
openclaw browser screenshot
```

導覽/點擊/輸入（基於參考的 UI 自動化）：

```bash
openclaw browser navigate https://example.com
openclaw browser click <ref>
openclaw browser type <ref> "hello"
```

## 透過 MCP 使用現有 Chrome

使用內建的 `user` 設定檔，或建立您自己的 `existing-session` 設定檔：

```bash
openclaw browser --browser-profile user tabs
openclaw browser create-profile --name chrome-live --driver existing-session
openclaw browser create-profile --name brave-live --driver existing-session --user-data-dir "~/Library/Application Support/BraveSoftware/Brave-Browser"
openclaw browser --browser-profile chrome-live tabs
```

此路徑僅限主機。對於 Docker、無介面伺服器、Browserless 或其他遠端設定，請改用 CDP 設定檔。

## 遠端瀏覽器控制（節點主機代理程式）

如果 Gateway 與瀏覽器在不同機器上執行，請在具有 Chrome/Brave/Edge/Chromium 的機器上執行 **node host**。Gateway 會將瀏覽器動作代理至該節點（不需要個別的瀏覽器控制伺服器）。

如果連接了多個節點，請使用 `gateway.nodes.browser.mode` 來控制自動路由，並使用 `gateway.nodes.browser.node` 來固定特定節點。

安全 + 遠端設定：[Browser tool](/en/tools/browser)、[Remote access](/en/gateway/remote)、[Tailscale](/en/gateway/tailscale)、[Security](/en/gateway/security)
