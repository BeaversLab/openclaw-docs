> [!NOTE]
> 本页正在翻译中。

---
summary: "通过 WKWebView + 自定义 URL scheme 嵌入的代理控制 Canvas 面板"
read_when:
  - 实现 macOS Canvas 面板
  - 为可视化工作区添加代理控制
  - 调试 WKWebView 画布加载
---
# Canvas（macOS 应用）

macOS 应用使用 `WKWebView` 嵌入代理控制的 **Canvas 面板**。它是一个轻量的可视化工作区，
用于 HTML/CSS/JS、A2UI 以及小型交互式 UI。

## Canvas 存放位置

Canvas 状态保存在 Application Support 下：

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

Canvas 面板通过 **自定义 URL scheme** 提供这些文件：

- `openclaw-canvas://<session>/<path>`

示例：
- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

如果根目录没有 `index.html`，应用会显示 **内置脚手架页面**。

## 面板行为

- 无边框、可调整大小，靠近菜单栏（或鼠标指针）显示。
- 按会话记住大小/位置。
- 本地 Canvas 文件变更时自动重载。
- 同一时间仅显示一个 Canvas 面板（需要时切换会话）。

可在 Settings → **Allow Canvas** 中禁用 Canvas。禁用后，canvas 节点命令会返回 `CANVAS_DISABLED`。

## 代理 API 能力

Canvas 通过 **Gateway WebSocket** 暴露，因此代理可以：

- 显示/隐藏面板
- 导航到路径或 URL
- 执行 JavaScript
- 捕获快照图片

CLI 示例：

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> --url "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

注意：
- `canvas.navigate` 接受 **本地 canvas 路径**、`http(s)` URL，以及 `file://` URL。
- 传入 `"/"` 时，Canvas 会显示本地脚手架或 `index.html`。

## Canvas 中的 A2UI

A2UI 由 Gateway 的 canvas host 托管，并在 Canvas 面板中渲染。
当 Gateway 广播 Canvas host 时，macOS 应用在首次打开时会自动导航到 A2UI host 页面。

默认 A2UI host URL：

```
http://<gateway-host>:18793/__openclaw__/a2ui/
```

### A2UI 命令（v0.8）

Canvas 目前接受 **A2UI v0.8** 的 server→client 消息：

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

`createSurface`（v0.9）不支持。

CLI 示例：

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas (A2UI v0.8)"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"If you can read this, A2UI push works."},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

openclaw nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

快速冒烟：

```bash
openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"
```

## 从 Canvas 触发代理运行

Canvas 可通过深链触发新的代理运行：

- `openclaw://agent?...`

示例（JS）：

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

除非提供了有效的密钥，应用会提示确认。

## 安全说明

- Canvas scheme 会阻止目录遍历；文件必须位于会话根目录下。
- 本地 Canvas 内容使用自定义 scheme（无需 loopback 服务器）。
- 外部 `http(s)` URL 仅在明确导航时允许。
