---
title: "WebChat"
summary: "mac 应用如何嵌入 gateway WebChat 以及调试方式"
read_when:
  - 调试 mac WebChat 视图或 loopback 端口
---

# WebChat（macOS 应用）

macOS 菜单栏应用将 WebChat UI 嵌入为原生 SwiftUI 视图。它连接到 Gateway，
默认使用所选代理的 **main 会话**（可通过会话切换器查看其他会话）。

- **本地模式**：直接连接本地 Gateway WebSocket。
- **远程模式**：通过 SSH 转发 Gateway 控制端口，并使用该隧道作为数据通道。

## 启动与调试

- 手动：Lobster 菜单 → “Open Chat”。
- 测试自动打开：
  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```
- 日志：`./scripts/clawlog.sh`（subsystem `bot.molt`，category `WebChatSwiftUI`）。

## 连接方式

- 数据通道：Gateway WS 方法 `chat.history`、`chat.send`、`chat.abort`、
  `chat.inject`，以及事件 `chat`、`agent`、`presence`、`tick`、`health`。
- 会话：默认使用主会话（`main`，若 scope 为 global 则为 `global`）。UI 可切换会话。
- Onboarding 使用专用会话，保证首轮设置独立。

## 安全面

- 远程模式仅通过 SSH 转发 Gateway WebSocket 控制端口。

## 已知限制

- UI 针对聊天会话优化（不是完整的浏览器沙盒）。
