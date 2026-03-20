---
summary: "使用 SSH 隧道（Gateway WS）和 tailnet 进行远程访问"
read_when:
  - 运行或故障排除远程网关设置
title: "远程访问"
---

# 远程访问（SSH、隧道和 tailnet）

通过在专用主机（桌面/服务器）上运行单个 Gateway 网关（主节点）并将客户端连接到它，此仓库支持“通过 SSH 进行远程访问”。

- 对于**操作员（你 / macOS 应用）**：SSH 隧道是通用的后备方案。
- 对于**节点（iOS/Android 和未来的设备）**：连接到 Gateway 网关 **WebSocket**（根据需要通过 LAN/tailnet 或 SSH 隧道）。

## 核心概念

- Gateway 网关 WebSocket 绑定到您配置端口上的**环回地址**（默认为 18789）。
- 对于远程使用，您可以通过 SSH 转发该环回端口（或者使用 tailnet/VPN 以减少隧道）。

## 常见的 VPN/tailnet 设置（代理程序所在的位置）

可以将 **Gateway 主机** 视为“代理运行的地方”。它拥有会话、身份验证配置文件、通道和状态。
您的笔记本电脑/台式机（以及节点）连接到该主机。

### 1) 您的 tailnet 中的常开 Gateway 网关（VPS 或家庭服务器）

在持久主机上运行 Gateway 网关，并通过 **Tailscale** 或 SSH 访问它。

- **最佳用户体验：** 保持 `gateway.bind: "loopback"` 并为控制 UI 使用 **Tailscale Serve**。
- **后备方案：** 保留环回 + 从任何需要访问的机器建立 SSH 隧道。
- **示例：** [exe.dev](/zh/install/exe-dev)（简易虚拟机）或 [Hetzner](/zh/install/hetzner)（生产虚拟专用服务器）。

当您的笔记本电脑经常休眠但您希望代理程序始终开启时，这是理想的选择。

### 2) 家庭桌面运行 Gateway 网关，笔记本电脑作为远程控制

笔记本电脑**不**运行代理程序。它远程连接：

- 使用 macOS 应用的 **通过 SSH 远程** 模式（设置 → 通用 → “OpenClaw 运行位置”）。
- 该应用打开并管理隧道，因此 WebChat + 健康检查“即可工作”。

操作手册：[macOS 远程访问](/zh/platforms/mac/remote)。

### 3) 笔记本电脑运行 Gateway 网关，从其他机器进行远程访问

将 Gateway 网关 保留在本地，但安全地暴露它：

- 从其他机器建立到笔记本电脑的 SSH 隧道，或
- 使用 Tailscale Serve 托管控制 UI，并保持 Gateway 网关 仅限环回访问。

指南：[Tailscale](/zh/gateway/tailscale) 和 [Web 概述](/zh/web)。

## 命令流（什么在哪里运行）

一个网关服务拥有状态 + 通道。节点是外设。

流程示例（Telegram → 节点）：

- Telegram 消息到达 **Gateway 网关**。
- Gateway 网关 运行 **agent** 并决定是否调用节点工具。
- Gateway 通过 Gateway WebSocket（`node.*` RPC）调用 **节点**。
- 节点返回结果；Gateway 网关 回复给 Telegram。

备注：

- **节点不运行网关服务。** 除非您有意运行隔离的配置文件（请参阅[多个网关](/zh/gateway/multiple-gateways)），否则每台主机应只运行一个网关。
- macOS 应用程序的“节点模式”只是通过 Gateway 网关 WebSocket 连接的节点客户端。

## SSH 隧道（CLI + 工具）

创建到远程 Gateway 网关 WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

隧道启动后：

- `openclaw health` 和 `openclaw status --deep` 现在通过 `ws://127.0.0.1:18789` 访问远程网关。
- 如有需要，`openclaw gateway {status,health,send,agent,call}` 也可以通过 `--url` 定向到转发的 URL。

注意：将 `18789` 替换为您配置的 `gateway.port`（或 `--port`/`OPENCLAW_GATEWAY_PORT`）。
注意：当您传递 `--url` 时，CLI 不会回退到配置或环境凭据。
请显式包含 `--token` 或 `--password`。缺少显式凭据是一个错误。

## CLI 远程默认值

您可以持久化一个远程目标，以便 CLI 命令默认使用它：

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

当网关仅限环回时，请将 URL 保持在 `ws://127.0.0.1:18789` 并首先打开 SSH 隧道。

## 凭据优先级

Gateway 凭据解析遵循一个跨调用/探测/状态路径和 Discord 执行批准监控的共享合约。节点主机使用相同的基本合约，但有一个本地模式例外（它会有意忽略 `gateway.remote.*`）：

- 显式凭据（`--token`、`--password` 或工具 `gatewayToken`）在接受显式身份验证的调用路径上始终优先。
- URL 覆盖安全性：
  - CLI URL 覆盖 (`--url`) 从不重用隐式配置/环境凭据。
  - 环境变量 URL 覆盖 (`OPENCLAW_GATEWAY_URL`) 只能使用环境变量凭据 (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`)。
- 本地模式默认值：
  - token：`OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` （仅当未设置本地身份验证令牌输入时，才应用远程回退）
  - password：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` （仅当未设置本地身份验证密码输入时，才应用远程回退）
- 远程模式默认值：
  - token：`gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- 节点主机本地模式例外：`gateway.remote.token` / `gateway.remote.password` 会被忽略。
- 默认情况下，远程探测/状态令牌检查是严格的：在以远程模式为目标时，它们仅使用 `gateway.remote.token` （无本地令牌回退）。
- 传统的 `CLAWDBOT_GATEWAY_*` 环境变量仅由兼容性调用路径使用；探测/状态/身份验证解析仅使用 `OPENCLAW_GATEWAY_*`。

## 通过 SSH 进行聊天 UI

WebChat 不再使用单独的 HTTP 端口。SwiftUI 聊天 UI 直接连接到 Gateway(网关) WebSocket。

- 通过 SSH 转发 `18789` （见上文），然后将客户端连接到 `ws://127.0.0.1:18789`。
- 在 macOS 上，首选应用程序的“通过 SSH 远程控制”模式，该模式会自动管理隧道。

## macOS 应用程序“Remote over SSH”

macOS 菜单栏应用程序可以端到端地驱动相同的设置（远程状态检查、WebChat 和 Voice Wake 转发）。

操作手册：[macOS 远程访问](/zh/platforms/mac/remote)。

## 安全规则（远程/VPN）

简而言之：除非您确定需要进行绑定，否则**请将 Gateway(网关) 限制为仅限本地回环**。

- **环回 + SSH/Tailscale Serve** 是最安全的默认设置（无公开暴露）。
- 默认情况下，纯文本 `ws://` 仅限回环。对于受信任的专用网络，在客户端进程上设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作为应急措施。
- **非回环绑定** （`lan`/`tailnet`/`custom`，或者在回环不可用时 `auto`）必须使用身份验证令牌/密码。
- `gateway.remote.token` / `.password` 是客户端凭据来源。它们本身**不**配置服务器身份验证。
- 仅当未设置 `gateway.auth.*` 时，本地调用路径才能将 `gateway.remote.*` 用作回退。
- 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `gateway.auth.password` 但未解析，解析将以失败告终（无远程回退屏蔽）。
- 在使用 `wss://` 时，`gateway.remote.tlsFingerprint` 会固定远程 TLS 证书。
- **Tailscale Serve** 可以在 `gateway.auth.allowTailscale: true` 时通过身份标头对 Control UI/WebSocket 流量进行身份验证；HTTP API 端点仍需要令牌/密码验证。这种无令牌流程假设网关主机是受信任的。如果您希望在各处都使用令牌/密码，请将其设置为 `false`。
- 将浏览器控制视为操作员访问：仅限 tailnet + 刻意的节点配对。

深入探讨：[安全性](/zh/gateway/security)。

import zh from "/components/footer/zh.mdx";

<zh />
