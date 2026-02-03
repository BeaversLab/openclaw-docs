---
title: "WebChat"
summary: "Loopback WebChat 静态宿主与 Gateway WS 用于聊天 UI"
read_when:
  - 调试或配置 WebChat 访问
---

# 网页聊天 (网关WebSocket界面)

状态：macOS/iOS 的 SwiftUI 聊天 UI 直接连接 Gateway WebSocket。

## 它是什么

- 面向 gateway 的原生聊天 UI（无内嵌浏览器、无本地静态服务器）。
- 使用与其他频道相同的会话与路由规则。
- 路由确定性：回复始终回到 WebChat。

## 快速开始

1. 启动 gateway。
2. 打开 WebChat UI（macOS/iOS app）或 Control UI 的聊天标签。
3. 确保 gateway 认证已配置（默认即要求，哪怕在回环）。

## 工作方式（行为）

- UI 连接 Gateway WebSocket，并使用 `chat.history`、`chat.send`、`chat.inject`。
- `chat.inject` 直接在转录中追加助手备注并广播到 UI（不触发 agent 运行）。
- 历史始终从 gateway 获取（不监视本地文件）。
- 若 gateway 不可达，WebChat 为只读。

## 远程使用

- 远程模式通过 SSH/Tailscale 隧道连接 gateway WebSocket。
- 无需运行独立的 WebChat 服务器。

## 配置参考（WebChat）

完整配置见 [Configuration](/zh/gateway/configuration)。

频道选项：

- 没有专门的 `webchat.*` 配置块。WebChat 使用下面的 gateway 端点 + 认证设置。

相关全局选项：

- `gateway.port`、`gateway.bind`：WebSocket 主机/端口。
- `gateway.auth.mode`、`gateway.auth.token`、`gateway.auth.password`：WebSocket 认证。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：远程 gateway 目标。
- `session.*`：会话存储与 main key 默认值。
