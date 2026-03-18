---
summary: "透過 WKWebView + 自訂 URL 配置內嵌的 Agent 控制之 Canvas 面板"
read_when:
  - Implementing the macOS Canvas panel
  - Adding agent controls for visual workspace
  - Debugging WKWebView canvas loads
title: "Canvas"
---

# Canvas (macOS app)

macOS app 使用 `WKWebView` 內嵌一個由 Agent 控制的 **Canvas 面板**。這是一個用於 HTML/CSS/JS、A2UI 和小型互動 UI 介面的輕量級視覺化工作區。

## Canvas 的位置

Canvas 狀態儲存在 Application Support 下：

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

Canvas 面板透過 **自訂 URL 配置** 提供這些檔案：

- `openclaw-canvas://<session>/<path>`

範例：

- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

如果根目錄中沒有 `index.html`，app 會顯示 **內建的腳手架頁面** (built‑in scaffold page)。

## 面板行為

- 無邊框、可調整大小的面板，錨定在功能表列（或滑鼠游標）附近。
- 記住每個工作階段的大小/位置。
- 當本地 canvas 檔案變更時自動重新載入。
- 一次只能看到一個 Canvas 面板（會視需要切換工作階段）。

可以從設定 → **Allow Canvas** 停用 Canvas。停用時，canvas 節點指令會傳回 `CANVAS_DISABLED`。

## Agent API 介面

Canvas 透過 **Gateway WebSocket** 公開，因此 Agent 可以：

- 顯示/隱藏面板
- 瀏覽至路徑或 URL
- 執行 JavaScript
- 擷取快照圖片

CLI 範例：

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> --url "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

備註：

- `canvas.navigate` 接受 **本地 canvas 路徑**、`http(s)` URL 和 `file://` URL。
- 如果您傳遞 `"/"`，Canvas 會顯示本地腳手架或 `index.html`。

## Canvas 中的 A2UI

A2UI 由 Gateway canvas host 託管，並在 Canvas 面板內呈現。當 Gateway 公告 Canvas host 時，macOS app 會在首次開啟時自動瀏覽至 A2UI host 頁面。

預設 A2UI host URL：

```
http://<gateway-host>:18789/__openclaw__/a2ui/
```

### A2UI 指令 (v0.8)

Canvas 目前接受 **A2UI v0.8** 伺服器對用戶端訊息：

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

`createSurface` (v0.9) 不受支援。

CLI 範例：

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas (A2UI v0.8)"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"If you can read this, A2UI push works."},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

openclaw nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

快速測試：

```bash
openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"
```

## 從 Canvas 觸發代理程式執行

Canvas 可以透過深層連結觸發新的代理程式執行：

- `openclaw://agent?...`

範例 (在 JS 中)：

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

除非提供有效的金鑰，否則應用程式會提示確認。

## 安全注意事項

- Canvas 機制會阻擋目錄遍歷；檔案必須位於 session 根目錄下。
- 本機 Canvas 內容使用自訂機制 (不需要回送伺服器)。
- 外部 `http(s)` URL 僅在明確導覽時才允許。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
