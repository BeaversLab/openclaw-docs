---
summary: "Mac 应用如何嵌入网关 WebChat 以及如何对其进行调试"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

# WebChat (macOS 应用)

macOS 菜单栏应用程序将 WebChat UI 嵌入为原生 SwiftUI 视图。它
连接到 Gateway(网关) 网关，默认为所选代理的**主会话**
（并提供用于切换其他会话的切换器）。

- **本地模式**：直接连接到本地 Gateway(网关) 网关 WebSocket。
- **远程模式**：通过 SSH 转发 Gateway(网关) 控制端口，并将该隧道用作数据平面。

## 启动与调试

- 手动操作：Lobster 菜单 → “Open Chat”。
- 测试时自动打开：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日志：`./scripts/clawlog.sh` (子系统 `ai.openclaw`，类别 `WebChatSwiftUI`)。

## 如何连接

- 数据平面：Gateway(网关) WS 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject` 和事件 `chat`、`agent`、`presence`、`tick`、`health`。
- 会话：默认为主会话 (`main`，或者当作用域为全局时为 `global`)。UI 可以在会话之间切换。
- 新手引导使用专用的会话，以便将首次运行设置分离开来。

## 安全面

- 远程模式仅通过 SSH 转发 Gateway(网关) WebSocket 控制端口。

## 已知限制

- 该 UI 针对聊天会话进行了优化（并非完整的浏览器沙盒）。
