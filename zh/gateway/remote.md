---
summary: "通过 SSH 隧道（Gateway WS）与 tailnet 的远程访问"
read_when:
  - 运行或排查远程 gateway 设置
title: "Remote Access"
---
# 远程访问（SSH、隧道与 tailnet）

本仓库支持“SSH 远程”模式：在专用主机（桌面/服务器）上保持单个 Gateway（master）运行，并将客户端连接到它。

- 对**operators（你 / macOS app）**：SSH 隧道是通用兜底。
- 对**nodes（iOS/Android 与未来设备）**：连接 Gateway **WebSocket**（视需要走 LAN/tailnet 或 SSH 隧道）。

## 核心思路

- Gateway WebSocket 默认绑定到**loopback**（默认端口 18789）。
- 远程使用时，通过 SSH 转发该 loopback 端口（或使用 tailnet/VPN 以减少隧道需求）。

## 常见 VPN/tailnet 场景（agent 在哪里）

将 **Gateway 主机**视为“agent 所在地”。它拥有 sessions、auth profiles、channels 与 state。
你的笔记本/桌面（以及 nodes）连接到该主机。

### 1) Tailnet 中的常驻 Gateway（VPS 或家用服务器）

在持久在线主机上运行 Gateway，通过 **Tailscale** 或 SSH 访问。

- **最佳体验：**保持 `gateway.bind: "loopback"` 并使用 **Tailscale Serve** 提供 Control UI。
- **兜底：**保持 loopback + SSH 隧道，任何机器都可访问。
- **示例：**[exe.dev](/zh/platforms/exe-dev)（易用 VM）或 [Hetzner](/zh/platforms/hetzner)（生产 VPS）。

适用于你的笔记本经常休眠但希望 agent 常驻的场景。

### 2) 家用台式机运行 Gateway，笔记本远程控制

笔记本**不**运行 agent，仅远程连接：

- 使用 macOS app 的 **Remote over SSH** 模式（Settings → General → “OpenClaw runs”）。
- App 会打开并管理隧道，WebChat + 健康检查可直接使用。

Runbook： [macOS remote access](/zh/platforms/mac/remote)。

### 3) 笔记本运行 Gateway，其他机器远程访问

保持 Gateway 本地，同时安全暴露：

- 其他机器用 SSH 隧道连到笔记本，或
- 用 Tailscale Serve 提供 Control UI，并保持 Gateway 仅 loopback。

指南： [Tailscale](/zh/gateway/tailscale) 与 [Web overview](/zh/web)。

## 命令流（运行在哪）

一个 gateway 服务拥有 state + channels，nodes 作为外设。

示例流程（Telegram → node）：
- Telegram 消息到达 **Gateway**。
- Gateway 运行 **agent** 并决定是否调用 node 工具。
- Gateway 通过 Gateway WebSocket 调用 **node**（`node.*` RPC）。
- Node 返回结果；Gateway 回复 Telegram。

注：
- **Nodes 不运行 gateway 服务。**除非你明确运行隔离 profile，否则每台主机只运行一个 gateway（见 [Multiple gateways](/zh/gateway/multiple-gateways)）。
- macOS app 的 “node mode” 只是 Gateway WebSocket 上的 node 客户端。

## SSH 隧道（CLI + tools）

建立到远端 Gateway WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

隧道建立后：
- `openclaw health` 与 `openclaw status --deep` 会通过 `ws://127.0.0.1:18789` 访问远端 gateway。
- `openclaw gateway {status,health,send,agent,call}` 也可在需要时用 `--url` 指向转发地址。

注：将 `18789` 替换为你的 `gateway.port`（或 `--port`/`OPENCLAW_GATEWAY_PORT`）。

## CLI 远程默认值

可持久化远程目标，使 CLI 默认使用：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "your-token"
    }
  }
}
```

当 gateway 仅 loopback 绑定时，URL 保持 `ws://127.0.0.1:18789`，并先建立 SSH 隧道。

## Chat UI over SSH

WebChat 不再使用独立 HTTP 端口。SwiftUI Chat UI 直接连接 Gateway WebSocket。

- 通过 SSH 转发 `18789`（见上），然后让客户端连接 `ws://127.0.0.1:18789`。
- 在 macOS 上，优先使用 app 的 “Remote over SSH” 模式（自动管理隧道）。

## macOS app “Remote over SSH”

macOS 菜单栏 app 可端到端驱动该设置（远程状态检查、WebChat、Voice Wake 转发）。

Runbook： [macOS remote access](/zh/platforms/mac/remote)。

## 安全规则（remote/VPN）

简版：**除非确定需要，否则保持 Gateway 仅 loopback**。

- **Loopback + SSH/Tailscale Serve** 是最安全默认（无公网暴露）。
- **非 loopback 绑定**（`lan`/`tailnet`/`custom`，或 loopback 不可用时的 `auto`）必须使用 auth token/password。
- `gateway.remote.token` **仅**用于远程 CLI 调用 — **不会**启用本地认证。
- `gateway.remote.tlsFingerprint` 在使用 `wss://` 时固定远端 TLS 证书。
- **Tailscale Serve** 在 `gateway.auth.allowTailscale: true` 时可通过身份头认证。
  若要强制 token/password，请设为 `false`。
- 将浏览器控制视为 operator 访问：仅 tailnet + 明确 node 配对。

深入说明： [Security](/zh/gateway/security)。
