---
summary: "使用SSH隧道（Gateway WS）和tailnet的远程访问"
read_when:
  - "Running or troubleshooting remote gateway setups"
title: "远程访问"
---

# 远程访问（SSH、隧道和尾网）

此仓库通过在专用主机（桌面/服务器）上运行单个Gateway（主Gateway）并将客户端连接到它来支持”通过 SSH 远程访问”。

- 对于**操作员（你/macOS 应用）**：SSH 隧道是通用的备用方案。
- 对于**节点（iOS/Android 和未来的设备）**：连接到Gateway **WebSocket**（根据需要使用 LAN/尾网或 SSH 隧道）。

## 核心概念

- Gateway WebSocket 绑定到你配置的端口上的**环回**（默认为 18789）。
- 对于远程使用，你通过 SSH 转发该环回端口（或使用尾网/VPN 并减少隧道）。

## 常见的 VPN/尾网设置（代理所在的位置）

将**Gateway主机**视为”代理所在的位置”。它拥有会话、身份验证配置文件、频道和状态。
你的笔记本电脑/桌面（和节点）连接到该主机。

### 1) 尾网中的始终运行的Gateway（VPS 或家庭服务器）

在持久主机上运行Gateway并通过 **Tailscale** 或 SSH 访问它。

- **最佳用户体验**：保持 `gateway.bind: "loopback"` 并为控制 UI 使用 **Tailscale Serve**。
- **备用方案**：保持环回 + 来自任何需要访问的机器的 SSH 隧道。
- **示例**：[exe.dev](/zh/platforms/exe-dev)（简单 VM）或 [Hetzner](/zh/platforms/hetzner)（生产 VPS）。

当你的笔记本电脑经常休眠但你希望代理始终运行时，这是理想的。

### 2) 家庭桌面运行Gateway，笔记本电脑是远程控制

笔记本电脑**不**运行代理。它远程连接：

- 使用 macOS 应用的**通过 SSH 远程**模式（设置 → 通用 → “OpenClaw 运行”）。
- 应用打开并管理隧道，因此 WebChat + 健康检查”正常工作”。

运行手册：[macOS 远程访问](/zh/platforms/mac/remote)。

### 3) 笔记本电脑运行Gateway，从其他机器远程访问

保持Gateway本地但安全地暴露它：

- 从其他机器到笔记本电脑的 SSH 隧道，或
- 为控制 UI 提供 Tailscale Serve 并保持Gateway仅环回。

指南：[Tailscale](/zh/gateway/tailscale) 和 [Web 概述](/zh/web)。

## 命令流（在哪里运行什么）

一个Gateway服务拥有状态 + 频道。节点是外设。

流示例（Telegram → 节点）：

- Telegram 消息到达**Gateway**。
- Gateway运行**代理**并决定是否调用节点工具。
- Gateway通过Gateway WebSocket（`node.*` RPC）调用**节点**。
- 节点返回结果；Gateway回复回 Telegram。

注意：

- **节点不运行Gateway服务。** 每个主机只应运行一个Gateway，除非你有意运行隔离的配置文件（参见[多个Gateway](/zh/gateway/multiple-gateways)）。
- macOS 应用”节点模式”只是通过Gateway WebSocket 的节点客户端。

## SSH 隧道（CLI + 工具）

创建到远程Gateway WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

隧道建立后：

- `openclaw health` 和 `openclaw status --deep` 现在通过 `ws://127.0.0.1:18789` 到达远程Gateway。
- `openclaw gateway {status,health,send,agent,call}` 也可以在需要时通过 `--url` 定向转发的 URL。

注意：将 `18789` 替换为你配置的 `gateway.port`（或 `--port`/`OPENCLAW_GATEWAY_PORT`）。
注意：当你传递 `--url` 时，CLI 不会回退到配置或环境凭据。
明确包含 `--token` 或 `--password`。缺少明确的凭据是错误的。

## CLI 远程默认值

你可以持久化远程目标，以便 CLI 命令默认使用它：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "your-token",
    },
  },
}
```

当Gateway仅环回时，将 URL 保持在 `ws://127.0.0.1:18789` 并首先打开 SSH 隧道。

## 通过 SSH 的聊天 UI

WebChat 不再使用单独的 HTTP 端口。SwiftUI 聊天 UI 直接连接到Gateway WebSocket。

- 通过 SSH 转发 `18789`（见上文），然后将客户端连接到 `ws://127.0.0.1:18789`。
- 在 macOS 上，首选应用的”通过 SSH 远程”模式，该模式自动管理隧道。

## macOS 应用”通过 SSH 远程”

macOS 菜单栏应用可以端到端驱动相同的设置（远程状态检查、WebChat 和语音唤醒转发）。

运行手册：[macOS 远程访问](/zh/platforms/mac/remote)。

## 安全规则（远程/VPN）

简短版本：**保持Gateway仅环回**，除非你确定需要绑定。

- **环回 + SSH/Tailscale Serve** 是最安全的默认设置（无公共暴露）。
- **非环回绑定**（`lan`/`tailnet`/`custom`，或在环回不可用时使用 `auto`）必须使用身份验证令牌/密码。
- `gateway.remote.token` **仅**用于远程 CLI 调用 — 它**不**启用本地身份验证。
- `gateway.remote.tlsFingerprint` 在使用 `wss://` 时固定远程 TLS 证书。
- **Tailscale Serve** 可以在 `gateway.auth.allowTailscale: true` 时通过身份标头进行身份验证。
  如果你想要令牌/密码，请将其设置为 `false`。
- 像对待操作员访问一样对待浏览器控制：仅尾网 + 故意的节点配对。

深入探讨：[安全性](/zh/gateway/security)。
