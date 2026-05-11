---
summary: "使用 SSH 隧道（Gateway(网关) WS）和 tailnet 进行远程访问"
read_when:
  - Running or troubleshooting remote gateway setups
title: "远程访问"
---

该仓库通过在专用主机（桌面/服务器）上运行单个Gateway(网关)（主节点）并将客户端连接到它，从而支持“通过 SSH 进行远程操作”。

- 对于**操作者（您 / macOS 应用）**：SSH 隧道是通用的后备方案。
- 对于**节点（iOS/Android 和未来设备）**：连接到 Gateway(网关) **WebSocket**（根据需要通过局域网/tailnet 或 SSH 隧道）。

## 核心概念

- Gateway(网关) WebSocket 绑定到您配置端口上的 **loopback**（默认为 18789）。
- 为了远程使用，您可以通过 SSH 转发该 loopback 端口（或者使用 tailnet/VPN 并减少隧道）。

## 常见的 VPN 和 tailnet 设置

可以将 **Gateway(网关) 主机**视为代理所在的宿主。它拥有会话、认证配置文件、通道和状态。您的笔记本电脑、台式机和节点连接到该主机。

### 您的 tailnet 中始终开启的 Gateway(网关)

在持久主机（VPS 或家庭服务器）上运行 Gateway(网关)，并通过 **Tailscale** 或 SSH 访问它。

- **最佳体验：** 保留 `gateway.bind: "loopback"` 并使用 **Tailscale Serve** 托管控制 UI。
- **后备方案：** 保留 loopback，加上从任何需要访问的机器建立的 SSH 隧道。
- **示例：** [exe.dev](/zh/install/exe-dev)（简易虚拟机）或 [Hetzner](/zh/install/hetzner)（生产环境 VPS）。

当您的笔记本电脑经常休眠但您希望代理始终开启时，这是理想选择。

### 家庭台式机运行 Gateway(网关)

笔记本电脑**不**运行代理。它远程连接：

- 使用 macOS 应用的 **Remote over SSH** 模式（设置 → 通用 → OpenClaw 运行）。
- 该应用程序打开并管理隧道，因此 WebChat 和健康检查开箱即用。

手册：[macOS 远程访问](/zh/platforms/mac/remote)。

### 笔记本电脑运行 Gateway(网关)

将 Gateway(网关) 保留在本地，但安全地暴露它：

- 从其他机器建立 SSH 隧道到笔记本电脑，或者
- 使用 Tailscale Serve 托管控制 UI，并保持 Gateway(网关) 仅限 loopback。

指南：[Tailscale](/zh/gateway/tailscale) 和 [Web 概述](/zh/web)。

## 命令流（什么运行在哪里）

一个网关服务拥有状态 + 通道。节点是外设。

流程示例（Telegram → 节点）：

- Telegram 消息到达 **Gateway(网关)**。
- Gateway(网关) 运行 **agent** 并决定是否调用节点工具。
- Gateway(网关) 通过 Gateway(网关) WebSocket（`node.*` RPC）调用 **节点**。
- Node 返回结果；Gateway 回复给 Telegram。

备注：

- **Node 不运行 gateway 服务。** 每台主机只应运行一个 gateway，除非您有意运行隔离的配置文件（请参阅 [Multiple gateways](/zh/gateway/multiple-gateways)）。
- macOS 应用程序的“节点模式”只是通过 Gateway WebSocket 连接的节点客户端。

## SSH 隧道 (CLI + 工具)

创建到远程 Gateway WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

隧道建立后：

- `openclaw health` 和 `openclaw status --deep` 现在可以通过 `ws://127.0.0.1:18789` 访问远程网关。
- `openclaw gateway status`、`openclaw gateway health`、`openclaw gateway probe` 和 `openclaw gateway call` 也可以在需要时通过 `--url` 指向转发的 URL。

<Note>将 `18789` 替换为您配置的 `gateway.port`（或 `--port` 或 `OPENCLAW_GATEWAY_PORT`）。</Note>

<Warning>当您传递 `--url` 时，CLI 不会回退到配置或环境凭据。请显式包含 `--token` 或 `--password`。缺少显式凭据将报错。</Warning>

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

当 gateway 仅限回环时，将 URL 保持在 `ws://127.0.0.1:18789` 并首先打开 SSH 隧道。
在 macOS 应用程序的 SSH 隧道传输中，发现的网关主机名应位于
`gateway.remote.sshTarget` 中；`gateway.remote.url` 仍然是本地隧道 URL。

## 凭据优先级

Gateway 凭据解析在 call/probe/status 路径和 Discord exec-approval 监控中遵循一个共享契约。Node-host 使用相同的基本契约，但有一个本地模式例外（它有意忽略 `gateway.remote.*`）：

- 显式凭据（`--token`、`--password` 或工具 `gatewayToken`）在接受显式身份验证的调用路径上始终优先。
- URL 覆盖安全性：
  - CLI URL 覆盖（`--url`）从不重用隐式配置/环境凭据。
  - Env URL 覆盖（`OPENCLAW_GATEWAY_URL`）只能使用环境凭据（`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`）。
- 本地模式默认值：
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (远程回退仅在未设置本地身份验证 token 输入时适用)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (远程回退仅在未设置本地身份验证密码输入时适用)
- 远程模式默认值：
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- 节点主机本地模式例外：`gateway.remote.token` / `gateway.remote.password` 被忽略。
- 远程探测/状态 token 检查默认情况下是严格的：在针对远程模式时，它们仅使用 `gateway.remote.token`（没有本地 token 回退）。
- Gateway 环境变量覆盖仅使用 `OPENCLAW_GATEWAY_*`。

## 通过 SSH 进行聊天 UI

WebChat 不再使用单独的 HTTP 端口。SwiftUI 聊天 UI 直接连接到 Gateway(网关) WebSocket。

- 通过 SSH 转发 `18789`（见上文），然后将客户端连接到 `ws://127.0.0.1:18789`。
- 在 macOS 上，首选应用程序的“通过 SSH 远程控制”模式，该模式会自动管理隧道。

## macOS 应用通过 SSH 远程访问

macOS 菜单栏应用程序可以端到端地驱动相同的设置（远程状态检查、WebChat 和 Voice Wake 转发）。

操作手册：[macOS 远程访问](/zh/platforms/mac/remote)。

## 安全规则（远程/VPN）

简而言之：除非您确定需要进行绑定，否则**请将 Gateway(网关) 限制为仅限本地回环**。

- **环回 + SSH/Tailscale Serve** 是最安全的默认设置（无公开暴露）。
- 纯文本 `ws://` 默认仅限本地回环。对于受信任的专用网络，在客户端进程上设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` 作为应急措施。没有 `openclaw.json` 等效项；这必须是进行 WebSocket 连接的客户端的进程环境。
- **非本地回环绑定**（`lan`/`tailnet`/`custom`，或在本地回环不可用时的 `auto`）必须使用网关身份验证：token、密码，或具有 `gateway.auth.mode: "trusted-proxy"` 的身份感知反向代理。
- `gateway.remote.token` / `.password` 是客户端凭证来源。它们**不**单独配置服务器身份验证。
- 本地调用路径仅在未设置 `gateway.auth.*` 时才能使用 `gateway.remote.*` 作为回退。
- 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但未解析，解析将失败关闭（没有远程回退屏蔽）。
- `gateway.remote.tlsFingerprint` 在使用 `wss://` 时固定远程 TLS 证书。
- 当 `gateway.auth.allowTailscale: true` 时，**Tailscale Serve** 可以通过身份标头对控制 UI/WebSocket 流量进行身份验证；HTTP API 端点不使用该 Tailscale 标头身份验证，而是遵循网关的正常 HTTP 身份验证模式。这种无令牌流程假设网关主机是受信任的。如果您希望在任何地方使用共享密钥身份验证，请将其设置为 `false`。
- **Trusted-proxy** 身份验证仅适用于非本地回环的感知身份的代理设置。同主机本地回环反向代理不满足 `gateway.auth.mode: "trusted-proxy"`。
- 将浏览器控制视为操作员访问：仅限 tailnet + 刻意的节点配对。

深入阅读：[安全性](/zh/gateway/security)。

### macOS：通过 LaunchAgent 持久化 SSH 隧道

对于连接到远程网关的 macOS 客户端，最简单的持久化设置使用 SSH `LocalForward` 配置条目加上 LaunchAgent，以在重新启动和崩溃期间保持隧道活动。

#### 步骤 1：添加 SSH 配置

编辑 `~/.ssh/config`：

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

将 `<REMOTE_IP>` 和 `<REMOTE_USER>` 替换为您的值。

#### 步骤 2：复制 SSH 密钥（一次性）

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### 步骤 3：配置网关令牌

将令牌存储在配置中，以便在重启后依然有效：

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

隧道将在登录时自动启动，崩溃时重启，并保持转发端口处于活动状态。

<Note>如果您有旧设置中遗留的 `com.openclaw.ssh-tunnel` LaunchAgent，请将其卸载并删除。</Note>

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

| 配置条目                             | 作用                                           |
| ------------------------------------ | ---------------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | 将本地端口 18789 转发到远程端口 18789          |
| `ssh -N`                             | 在不执行远程命令的情况下进行 SSH（仅端口转发） |
| `KeepAlive`                          | 如果隧道崩溃，会自动重启                       |
| `RunAtLoad`                          | 当 LaunchAgent 在登录时加载时启动隧道          |

## 相关

- [Tailscale](/zh/gateway/tailscale)
- [身份验证](/zh/gateway/authentication)
- [远程网关设置](/zh/gateway/remote-gateway-readme)
