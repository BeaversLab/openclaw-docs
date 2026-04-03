---
summary: "使用 SSH 隧道（Gateway(网关) WS）和 tailnet 进行远程访问"
read_when:
  - Running or troubleshooting remote gateway setups
title: "远程访问"
---

# 远程访问（SSH、隧道和 tailnet）

通过在专用主机（桌面/服务器）上运行单个 Gateway(网关) 网关（主节点）并将客户端连接到它，此仓库支持“通过 SSH 进行远程访问”。

- 对于**操作员（你 / macOS 应用）**：SSH 隧道是通用的后备方案。
- 对于**节点（iOS/Android 和未来的设备）**：连接到 Gateway(网关) 网关 **WebSocket**（根据需要通过 LAN/tailnet 或 SSH 隧道）。

## 核心概念

- Gateway(网关) 网关 WebSocket 绑定到您配置端口上的**环回地址**（默认为 18789）。
- 对于远程使用，您可以通过 SSH 转发该环回端口（或者使用 tailnet/VPN 以减少隧道）。

## 常见的 VPN/tailnet 设置（代理程序所在的位置）

将 **Gateway(网关) 网关 主机** 视为“代理程序居住的地方”。它拥有会话、身份验证配置文件、通道和状态。
您的笔记本/桌面（和节点）连接到该主机。

### 1) 您的 tailnet 中的常开 Gateway(网关) 网关（VPS 或家庭服务器）

在持久主机上运行 Gateway(网关) 网关，并通过 **Tailscale** 或 SSH 访问它。

- **最佳用户体验：** 保持运行 `gateway.bind: "loopback"` 并使用 **Tailscale Serve** 来访问控制 UI。
- **后备方案：** 保留环回 + 从任何需要访问的机器建立 SSH 隧道。
- **示例：** [exe.dev](/en/install/exe-dev)（简易 VM）或 [Hetzner](/en/install/hetzner)（生产环境 VPS）。

当您的笔记本电脑经常休眠但您希望代理程序始终开启时，这是理想的选择。

### 2) 家庭桌面运行 Gateway(网关) 网关，笔记本电脑作为远程控制

笔记本电脑**不**运行代理程序。它远程连接：

- 使用 macOS 应用的 **通过 SSH 远程** 模式（设置 → 通用 → “OpenClaw 运行位置”）。
- 该应用打开并管理隧道，因此 WebChat + 健康检查“即可工作”。

操作手册：[macOS 远程访问](/en/platforms/mac/remote)。

### 3) 笔记本电脑运行 Gateway(网关) 网关，从其他机器进行远程访问

将 Gateway(网关) 网关 保留在本地，但安全地暴露它：

- 从其他机器建立到笔记本电脑的 SSH 隧道，或
- 使用 Tailscale Serve 托管控制 UI，并保持 Gateway(网关) 网关 仅限环回访问。

指南：[Tailscale](/en/gateway/tailscale) 和 [Web 概览](/en/web)。

## 命令流（什么在哪里运行）

一个网关服务拥有状态 + 通道。节点是外设。

流程示例（Telegram → 节点）：

- Telegram 消息到达 **Gateway(网关) 网关**。
- Gateway(网关) 网关 运行 **agent** 并决定是否调用节点工具。
- Gateway(网关) 通过 Gateway(网关) WebSocket（`node.*` RPC）调用 **节点**。
- 节点返回结果；Gateway(网关) 网关 回复给 Telegram。

备注：

- **节点不运行 gateway 服务。** 除非你有意运行隔离的配置文件（参见 [Multiple gateways](/en/gateway/multiple-gateways)），否则每台主机应仅运行一个 gateway。
- macOS 应用程序的“节点模式”只是通过 Gateway(网关) 网关 WebSocket 连接的节点客户端。

## SSH 隧道（CLI + 工具）

创建到远程 Gateway(网关) 网关 WS 的本地隧道：

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

隧道启动后：

- `openclaw health` 和 `openclaw status --deep` 现在可以通过 `ws://127.0.0.1:18789` 访问远程 gateway。
- 在需要时，`openclaw gateway {status,health,send,agent,call}` 也可以通过 `--url` 定向到转发的 URL。

注意：将 `18789` 替换为你配置的 `gateway.port`（或 `--port`/`OPENCLAW_GATEWAY_PORT`）。
注意：当你传递 `--url` 时，CLI 不会回退到配置或环境凭据。
显式包含 `--token` 或 `--password`。缺少显式凭据将报错。

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

当 gateway 仅限回环访问时，请将 URL 保持在 `ws://127.0.0.1:18789` 并首先打开 SSH 隧道。

## 凭据优先级

Gateway(网关) 凭据解析在 call/probe/status 路径和 Discord exec-approval 监控中遵循一个共享约定。Node-host 使用相同的基础约定，但有一个本地模式例外（它会故意忽略 `gateway.remote.*`）：

- 显式凭据（`--token`、`--password` 或 工具 `gatewayToken`）在接受显式身份验证的调用路径中始终优先。
- URL 覆盖安全性：
  - CLI URL 覆盖（`--url`）绝不重用隐式的配置/环境凭据。
  - Env URL overrides (`OPENCLAW_GATEWAY_URL`) may use env credentials only (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- 本地模式默认值：
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (remote fallback applies only when local auth token input is unset)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (remote fallback applies only when local auth password input is unset)
- 远程模式默认值：
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Node-host local-mode exception: `gateway.remote.token` / `gateway.remote.password` are ignored.
- Remote probe/status token checks are strict by default: they use `gateway.remote.token` only (no local token fallback) when targeting remote mode.
- Gateway(网关) env overrides use `OPENCLAW_GATEWAY_*` only.

## 通过 SSH 进行聊天 UI

WebChat 不再使用单独的 HTTP 端口。SwiftUI 聊天 UI 直接连接到 Gateway(网关) WebSocket。

- Forward `18789` over SSH (see above), then connect clients to `ws://127.0.0.1:18789`.
- 在 macOS 上，首选应用程序的“通过 SSH 远程控制”模式，该模式会自动管理隧道。

## macOS 应用“通过 SSH 远程访问”

macOS 菜单栏应用程序可以端到端地驱动相同的设置（远程状态检查、WebChat 和 Voice Wake 转发）。

Runbook: [macOS remote access](/en/platforms/mac/remote).

## 安全规则（远程/VPN）

简而言之：除非您确定需要进行绑定，否则**请将 Gateway(网关) 限制为仅限本地回环**。

- **环回 + SSH/Tailscale Serve** 是最安全的默认设置（无公开暴露）。
- Plaintext `ws://` is loopback-only by default. For trusted private networks,
  set `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` on the client process as break-glass.
- **Non-loopback binds** (`lan`/`tailnet`/`custom`, or `auto` when loopback is unavailable) must use auth tokens/passwords.
- `gateway.remote.token` / `.password` are client credential sources. They do **not** configure server auth by themselves.
- Local call paths can use `gateway.remote.*` as fallback only when `gateway.auth.*` is unset.
- If `gateway.auth.token` / `gateway.auth.password` is explicitly configured via SecretRef and unresolved, resolution fails closed (no remote fallback masking).
- `gateway.remote.tlsFingerprint` pins the remote TLS cert when using `wss://`.
- **Tailscale Serve** 可以在 `gateway.auth.allowTailscale: true` 时通过身份标头验证控制 UI/WebSocket 流量；HTTP API 端点仍需要令牌/密码验证。此无令牌流程假定网关主机是受信任的。如果您希望在任何地方都使用令牌/密码，请将其设置为 `false`。
- 将浏览器控制视为操作员访问：仅限 tailnet + 刻意的节点配对。

深入了解：[安全性](/en/gateway/security)。

### macOS：通过 LaunchAgent 建立持久 SSH 隧道

对于连接到远程网关的 macOS 客户端，最简单的持久化设置是使用 SSH `LocalForward` 配置条目以及 LaunchAgent，以在重启和崩溃时保持隧道存活。

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

将令牌存储在配置中，以便其在重启后依然有效：

```bash
openclaw config set gateway.remote.token "<your-token>"
```

#### 步骤 4：创建 LaunchAgent

将此保存为 `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`：

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

注意：如果您从旧设置中保留了 `com.openclaw.ssh-tunnel` LaunchAgent，请将其卸载并删除。

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
| `KeepAlive`                          | 如果隧道崩溃，自动重启隧道                     |
| `RunAtLoad`                          | 当 LaunchAgent 在登录时加载时启动隧道          |
