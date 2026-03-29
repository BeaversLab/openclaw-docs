---
summary: "透過 WKWebView + 自訂 URL scheme 嵌入的代理程式控制 Canvas 面板"
read_when:
  - Implementing the macOS Canvas panel
  - Adding agent controls for visual workspace
  - Debugging WKWebView canvas loads
title: "Canvas"
---

# Canvas (macOS 應用程式)

macOS 應用程式使用 `WKWebView` 嵌入了由代理程式控制的 **Canvas 面板**。這是一個用於 HTML/CSS/JS、A2UI 和小型互動 UI 介面的輕量級視覺工作區。

## Canvas 的位置

Canvas 狀態儲存在 Application Support 下：

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

Canvas 面板透過 **自訂 URL scheme** 提供這些檔案：

- `openclaw-canvas://<session>/<path>`

範例：

- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

如果根目錄下沒有 `index.html`，應用程式會顯示一個 **內建的鷹架頁面**。

## 面板行為

- 無邊框、可調整大小的面板，錨定在功能表列（或滑鼠游標）附近。
- 記住每個工作階段的大小/位置。
- 當本機 canvas 檔案變更時自動重新載入。
- 一次只能顯示一個 Canvas 面板（視需要切換工作階段）。

可以從設定 → **允許 Canvas** 停用 Canvas。停用時，canvas 節點指令會傳回 `CANVAS_DISABLED`。

## Agent API 表面

Canvas 透過 **Gateway WebSocket** 公開，因此代理程式可以：

- 顯示/隱藏面板
- 導覽至路徑或 URL
- 執行 JavaScript
- 擷取快照影像

CLI 範例：

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> --url "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

備註：

- `canvas.navigate` 接受 **本機 canvas 路徑**、`http(s)` URL 和 `file://` URL。
- 如果您傳遞 `"/"`，Canvas 會顯示本機鷹架或 `index.html`。

## Canvas 中的 A2UI

A2UI 由 Gateway canvas host 託管，並在 Canvas 面板內呈現。當 Gateway 公告 Canvas host 時，macOS 應用程式會在首次開啟時自動導覽至 A2UI host 頁面。

預設 A2UI host URL：

```
http://<gateway-host>:18789/__openclaw__/a2ui/
```

### A2UI 指令 (v0.8)

Canvas 目前接受 **A2UI v0.8** 伺服器到用戶端訊息：

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

快速冒煙測試：

```bash
openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"
```

## 從 Canvas 觸發代理程式執行

Canvas 可以透過深度連結觸發新的代理程式執行：

- `openclaw://agent?...`

範例 (在 JS 中)：

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

除非提供有效的金鑰，否則應用程式會提示確認。

## 安全性注意事項

- Canvas 配置會阻擋目錄遍歷；檔案必須位於工作階段根目錄下。
- 本地 Canvas 內容使用自訂配置 (不需要回送伺服器)。
- 僅在明確導覽時才允許外部 `http(s)` URL。
