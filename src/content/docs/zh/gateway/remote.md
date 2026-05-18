---
summary: "Gateway(网关)使用 Gateway(网关) WS、SSH 隧道和 tailnet 进行远程访问"
read_when:
  - Running or troubleshooting remote gateway setups
title: "远程访问"
---

此仓库通过在专用主机（桌面/服务器）上运行单个 Gateway(网关)（主节点）并将客户端连接到它，支持远程网关访问。

- 对于**操作员（您 / macOS 应用）**：当网关可达时，直接的 LAN/Tailnet WebSocket 最简单；SSH 隧道是通用的备选方案。
- 对于**节点（iOS/Android 和未来设备）**：连接到 Gateway(网关) **WebSocket**（根据需要通过局域网/tailnet 或 SSH 隧道）。

## 核心概念

- Gateway(网关) WebSocket 通常绑定到您配置端口上的 **loopback**（默认为 18789）。
- 对于远程使用，通过 Tailscale Serve 或受信任的 LAN/Tailnet 绑定暴露它，或者通过 SSH 转发 loopback 端口。

## 常见的 VPN 和 tailnet 设置

可以将 **Gateway(网关) 主机**视为代理所在的宿主。它拥有会话、认证配置文件、通道和状态。您的笔记本电脑、台式机和节点连接到该主机。

### 您的 tailnet 中始终开启的 Gateway(网关)

在持久主机（VPS 或家庭服务器）上运行 Gateway(网关)，并通过 **Tailscale** 或 SSH 访问它。

- **最佳体验：** 保留 `gateway.bind: "loopback"`Tailscale 并为控制 UI 使用 **Tailscale Serve**。
- **受信任的 LAN/Tailnet：** 将网关绑定到私有接口并使用 `gateway.remote.transport: "direct"` 直接连接。
- **备选方案：** 保留 loopback 并从需要访问的任何机器通过 SSH 隧道连接。
- **示例：** [exe.dev](/zh/install/exe-devHetzner)（简易 VM）或 [Hetzner](/zh/install/hetzner)（生产环境 VPS）。

当您的笔记本电脑经常休眠但您希望代理程序始终运行时，这非常理想。

### 家庭桌面运行 Gateway(网关)

笔记本电脑**不**运行代理程序。它远程连接：

- 使用 macOS 应用的远程模式（设置 → 通用 → OpenClaw 运行）。
- 当网关在 LAN/Tailnet 上可达时，该应用直接连接；或者当您选择 SSH 时，打开并管理 SSH 隧道。

操作手册：[macOS 远程访问](macOS/en/platforms/mac/remote)。

### 笔记本电脑运行 Gateway(网关)

将 Gateway(网关) 保持在本地但安全地暴露它：

- 从其他机器 SSH 隧道到笔记本电脑，或
- 使用 Tailscale Serve 提供控制 UI 并保持 Gateway(网关) 仅限 loopback。

指南：[Tailscale](Tailscale/en/gateway/tailscale) 和 [Web 概述](/zh/web)。

## 命令流程（什么在哪里运行）

一个网关服务拥有状态和通道。节点是外设。

流程示例（Telegram → node）：

- Telegram 消息到达 **Gateway(网关)**。
- Gateway(网关) 运行 **agent** 并决定是否调用节点工具。
- Gateway(网关) 通过 Gateway(网关) WebSocket（`node.*` RPC）调用 **node**。
- 节点返回结果；Gateway(网关) 回复给 Telegram。

备注：

- **节点不运行网关服务。** 每台主机应只运行一个网关，除非您有意运行隔离的配置文件（请参阅 [Multiple gateways](/zh/gateway/multiple-gateways)）。
- macOS 应用程序的“节点模式”只是一个通过 Gateway(网关) WebSocket 连接的节点客户端。

## SSH 隧道（CLI + 工具）

创建通往远程 Gateway(网关) WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

建立隧道后：

- `openclaw health` 和 `openclaw status --deep` 现在可以通过 `ws://127.0.0.1:18789` 访问远程网关。
- `openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 也可以在需要时通过 `--url` 定向到转发的 URL。

<Note>请将 `18789` 替换为您配置的 `gateway.port`（或 `--port` 或 `OPENCLAW_GATEWAY_PORT`）。</Note>

<Warning>当您传递 `--url` 时，CLI 不会回退到配置文件或环境凭据。请显式包含 `--token` 或 `--password`。缺少显式凭据将被视为错误。</Warning>

## CLI 远程默认值

您可以持久保存一个远程目标，以便 CLI 命令默认使用它：

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

当 gateway(网关) 仅限环回访问时，请将 URL 保持在 `ws://127.0.0.1:18789`macOS 并首先打开 SSH 隧道。
在 macOS 应用的 SSH 隧道传输中，发现的 gateway 主机名应位于
`gateway.remote.sshTarget`；`gateway.remote.url` 保持为本地隧道 URL。
如果这些端口不同，请将 `gateway.remote.remotePort` 设置为
SSH 主机上的 gateway 端口。

对于在受信任的 LAN 或 Tailnet 上已可访问的 gateway，请使用直接模式：

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      transport: "direct",
      url: "ws://192.168.0.202:18789",
      token: "your-token",
    },
  },
}
```

## 凭证优先级

Gateway(网关) 凭证解析遵循一个在调用/探测/状态路径和 Discord 批准监控之间共享的契约。Node-host 使用相同的基础契约，但有一个本地模式例外（它会故意忽略 Gateway(网关)Discord`gateway.remote.*`）：

- 显式凭证（`--token`、`--password` 或工具 `gatewayToken`）在接受显式身份验证的调用路径上始终优先。
- URL 覆盖安全性：
  - CLI URL 覆盖（CLI`--url`）绝不重用隐式配置/环境凭证。
  - 环境变量 URL 覆盖（`OPENCLAW_GATEWAY_URL`）只能使用环境变量凭证（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。
- 本地模式默认值：
  - token：`OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token`（仅当未设置本地身份验证令牌输入时才应用远程回退）
  - password：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password`（仅当未设置本地身份验证密码输入时才应用远程回退）
- 远程模式默认值：
  - token：`gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password：`OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Node-host 本地模式例外：`gateway.remote.token` / `gateway.remote.password` 会被忽略。
- 远程探测/状态令牌检查默认是严格的：在针对远程模式时，它们仅使用 `gateway.remote.token`（无本地令牌回退）。
- Gateway(网关) 环境变量覆盖仅使用 Gateway(网关)`OPENCLAW_GATEWAY_*`。

## Chat UI 远程访问

WebChat 不再使用单独的 HTTP 端口。SwiftUI 聊天 UI 直接连接到 Gateway(网关) WebSocket。

- 通过 SSH 转发 `18789`（见上文），然后将客户端连接到 `ws://127.0.0.1:18789`。
- 对于 LAN/Tailnet 直接模式，请将客户端连接到配置的专用 `ws://` 或安全 `wss://` URL。
- 在 macOS 上，首选应用的远程模式，该模式会自动管理所选传输。

## macOS 应用远程模式

macOS 菜单栏应用可以端到端驱动相同的设置（远程状态检查、WebChat 和语音唤醒转发）。

Runbook: [macOS 远程访问](macOS/en/platforms/mac/remote)。

## 安全规则（远程/VPN）

简而言之：**保持 Gateway(网关) 仅环回**，除非您确定需要绑定。

- **环回 + SSH/Tailscale Serve** 是最安全的默认设置（无公网暴露）。
- 对于环回、LAN、链路本地、`.local`、`.ts.net`Tailscale 和 Tailscale CGNAT 主机，接受明文 `ws://`。公共远程主机必须使用 `wss://`。
- **非环回绑定**（`lan`/`tailnet`/`custom`，或在环回不可用时的 `auto`）必须使用网关认证：令牌、密码或带有 `gateway.auth.mode: "trusted-proxy"` 的感知身份的反向代理。
- `gateway.remote.token` / `.password` 是客户端凭据来源。它们本身**不**配置服务器认证。
- 仅当 `gateway.auth.*` 未设置时，本地调用路径才可以将 `gateway.remote.*` 作为回退。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置且未解析，解析将失败关闭（无远程回退屏蔽）。
- 在使用 `wss://`macOSmacOSmacOS 时，包括 macOS 直接模式，`gateway.remote.tlsFingerprint` 会固定远程 TLS 证书。如果没有配置或之前存储的固定值，macOS 仅在通过正常系统信任后才会固定首次使用的证书；macOS 尚不信任的自签名或私有 CA 网关需要显式的指纹或通过 SSH 远程访问。
- 当 `gateway.auth.allowTailscale: true` 时，**Tailscale Serve** 可以通过身份标头对控制 UI/WebSocket 流量进行身份验证；HTTP API 端点不使用该 Tailscale 标头身份验证，而是遵循网关的正常 HTTP 身份验证模式。这种无令牌流程假定网关主机是受信任的。如果您希望在任何地方使用共享密钥身份验证，请将其设置为 `false`。
- **Trusted-proxy** 身份验证默认期望非环回的、具备身份感知的代理设置。同主机环回反向代理需要显式的 `gateway.auth.trustedProxy.allowLoopback = true`。
- 将浏览器控制视为操作员访问：仅限 tailnet + 明确的节点配对。

深入探讨：[安全性](/zh/gateway/security)。

### macOS：通过 LaunchAgent 建立持久 SSH 隧道

对于连接到远程网关的 macOS 客户端，最简单的持久化设置是使用 SSH `LocalForward` 配置条目加上一个 LaunchAgent，以在重启和崩溃后保持隧道存活。

#### 步骤 1：添加 SSH 配置

编辑 `~/.ssh/config`：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替换为您自己的值。

#### 步骤 2：复制 SSH 密钥（一次性）

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### 步骤 3：配置网关令牌

将令牌存储在配置中，以便在重启后仍然保留：

```bash
openclaw config set gateway.remote.token "<your-token>"
```

#### 步骤 4：创建 LaunchAgent

将其保存为 `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

#### 步骤 5：加载 LaunchAgent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

隧道将在登录时自动启动，崩溃时重启，并保持转发的端口处于活动状态。

<Note>如果您有旧设置遗留的 `com.openclaw.ssh-tunnel` LaunchAgent，请将其卸载并删除。</Note>

#### 故障排除

检查隧道是否正在运行：

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

重启隧道：

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

停止隧道：

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

| 配置条目                             | 作用                                  |
| ------------------------------------ | ------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | 将本地端口 18789 转发到远程端口 18789 |
| `ssh -N`                             | SSH 不执行远程命令（仅限端口转发）    |
| `KeepAlive`                          | 如果隧道崩溃则自动重启                |
| `RunAtLoad`                          | 在登录时加载 LaunchAgent 时启动隧道   |

## 相关

- [Tailscale](Tailscale/en/gateway/tailscale)
- [身份验证](/zh/gateway/authentication)
- [远程网关设置](/zh/gateway/remote-gateway-readme)
