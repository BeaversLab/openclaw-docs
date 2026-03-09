---
summary: "mac 应用如何嵌入 gateway WebChat 以及如何调试"
read_when:
  - "Debugging mac WebChat view or loopback port"
title: "WebChat"
---

# WebChat（macOS 应用）

macOS 菜单栏应用将 WebChat UI 嵌入为原生 SwiftUI 视图。它连接到 Gateway 并默认为所选代理的**主会话**（带有其他会话的会话切换器）。

- **本地模式**：直接连接到本地 Gateway WebSocket。
- **远程模式**：通过 SSH 转发 Gateway 控制端口并将该隧道用作数据平面。

## 启动和调试

- 手动：Lobster 菜单 → “打开聊天”。
- 用于测试的自动打开：
  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```
- 日志：`./scripts/clawlog.sh`（子系统 `bot.molt`，类别 `WebChatSwiftUI`）。

## 连接方式

- 数据平面：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、`chat.inject` 和事件 `chat`、`agent`、`presence`、`tick`、`health`。
- 会话：默认为主会话（`main`，或者当作用域为全局时为 `global`）。UI 可以在会话之间切换。
- 入门使用专用会话以将首次运行设置分开。

## 安全表面

- 远程模式仅通过 SSH 转发 Gateway WebSocket 控制端口。

## 已知限制

- UI 针对聊天会话进行了优化（不是完整的浏览器沙盒）。
