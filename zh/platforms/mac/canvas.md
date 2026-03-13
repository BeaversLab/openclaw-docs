---
summary: "通过 WKWebView 和自定义 URL 方案嵌入的 Agent 控制 Canvas 面板"
read_when:
  - Implementing the macOS Canvas panel
  - Adding agent controls for visual workspace
  - Debugging WKWebView canvas loads
title: "Canvas"
---

# Canvas (macOS 应用)

macOS 应用使用 `WKWebView` 嵌入了一个由 Agent 控制的 **Canvas 面板**。它
是一个用于 HTML/CSS/JS、A2UI 和小型交互式
UI 表面的轻量级可视化工作区。

## Canvas 的存储位置

Canvas 状态存储在 Application Support 下：

- `~/Library/Application Support/OpenClaw/canvas/<session>/...`

Canvas 面板通过 **自定义 URL 方案** 提供这些文件：

- `openclaw-canvas://<session>/<path>`

示例：

- `openclaw-canvas://main/` → `<canvasRoot>/main/index.html`
- `openclaw-canvas://main/assets/app.css` → `<canvasRoot>/main/assets/app.css`
- `openclaw-canvas://main/widgets/todo/` → `<canvasRoot>/main/widgets/todo/index.html`

如果根目录下不存在 `index.html`，应用程序将显示一个 **内置的脚手架页面**。

## 面板行为

- 无边框、可调整大小的面板，锚定在菜单栏（或鼠标光标）附近。
- 记住每个会话的大小/位置。
- 当本地 Canvas 文件更改时自动重新加载。
- 一次只能看到一个 Canvas 面板（会话根据需要切换）。

可以在设置中禁用 Canvas → **允许 Canvas**。禁用后，Canvas
节点命令返回 `CANVAS_DISABLED`。

## Agent API 表面

Canvas 通过 **Gateway WebSocket** 公开，因此 Agent 可以：

- 显示/隐藏面板
- 导航到路径或 URL
- 执行 JavaScript
- 捕获快照图像

CLI 示例：

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> --url "/"
openclaw nodes canvas eval --node <id> --js "document.title"
openclaw nodes canvas snapshot --node <id>
```

注：

- `canvas.navigate` 接受 **本地 Canvas 路径**、`http(s)` URL 和 `file://` URL。
- 如果您传递 `"/"`，Canvas 将显示本地脚手架或 `index.html`。

## Canvas 中的 A2UI

A2UI 由 Gateway Canvas 主机托管，并在 Canvas 面板内渲染。
当 Gateway 公告 Canvas 主机时，macOS 应用会在首次打开时自动导航到
A2UI 主机页面。

默认 A2UI 主机 URL：

```
http://<gateway-host>:18789/__openclaw__/a2ui/
```

### A2UI 命令 (v0.8)

Canvas 目前接受 **A2UI v0.8** 服务器→客户端消息：

- `beginRendering`
- `surfaceUpdate`
- `dataModelUpdate`
- `deleteSurface`

不支持 `createSurface` (v0.9)。

CLI 示例：

```bash
cat > /tmp/a2ui-v0.8.jsonl <<'EOFA2'
{"surfaceUpdate":{"surfaceId":"main","components":[{"id":"root","component":{"Column":{"children":{"explicitList":["title","content"]}}}},{"id":"title","component":{"Text":{"text":{"literalString":"Canvas (A2UI v0.8)"},"usageHint":"h1"}}},{"id":"content","component":{"Text":{"text":{"literalString":"If you can read this, A2UI push works."},"usageHint":"body"}}}]}}
{"beginRendering":{"surfaceId":"main","root":"root"}}
EOFA2

openclaw nodes canvas a2ui push --jsonl /tmp/a2ui-v0.8.jsonl --node <id>
```

快速测试：

```bash
openclaw nodes canvas a2ui push --node <id> --text "Hello from A2UI"
```

## 从 Canvas 触发 Agent 运行

Canvas 可以通过深度链接触发新的 Agent 运行：

- `openclaw://agent?...`

示例（在 JS 中）：

```js
window.location.href = "openclaw://agent?message=Review%20this%20design";
```

除非提供了有效的密钥，否则应用程序会提示确认。

## 安全说明

- Canvas 方案阻止目录遍历；文件必须位于会话根目录下。
- 本地 Canvas 内容使用自定义方案（不需要回环服务器）。
- 仅当明确导航时，才允许外部 `http(s)` URL。

import zh from '/components/footer/zh.mdx';

<zh />
