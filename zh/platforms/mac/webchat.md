---
summary: "Mac 应用程序如何嵌入网关 WebChat 以及如何调试它"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat"
---

# WebChat (macOS 应用)

macOS 菜单栏应用程序将 WebChat UI 嵌入为原生 SwiftUI 视图。它
连接到网关，默认为所选代理的**主会话**
（并提供用于切换其他会话的切换器）。

- **本地模式**：直接连接到本地网关 WebSocket。
- **远程模式**：通过 SSH 转发网关控制端口并使用该
  隧道作为数据平面。

## 启动与调试

- 手动：Lobster 菜单 → “打开聊天”。
- 用于测试的自动打开：

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- 日志：`./scripts/clawlog.sh` (子系统 `ai.openclaw`，类别 `WebChatSwiftUI`)。

## 工作原理

- 数据平面：网关 WebSocket 方法 `chat.history`，`chat.send`，`chat.abort`，
  `chat.inject` 和事件 `chat`、`agent`、`presence`、`tick`、`health`。
- 会话：默认为主会话（`main`，或者当范围为全局时为 `global` 当范围为
  全局时）。该 UI 可以在会话之间切换。
- 入职引导使用专用会话以将首次运行设置分开。

## 安全面

- 远程模式仅通过 SSH 转发 Gateway WebSocket 控制端口。

## 已知限制

- 该 UI 已针对聊天会话进行优化（并非完整的浏览器沙箱）。

import zh from '/components/footer/zh.mdx';

<zh />
