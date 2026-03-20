---
summary: "Node 设备发现和传输 (Bonjour, Tailscale, SSH) 用于查找 gateway"
read_when:
  - 实现或更改 Bonjour 设备发现/广播
  - 调整远程连接模式（直连 vs SSH）
  - 为远程节点设计节点 设备发现 + 配对
title: "设备发现 and Transports"
---

# 设备发现 & transports

OpenClaw 有两个截然不同但在表面上看起来相似的问题：

1. **Operator remote control**：控制运行在其他地方的 Gateway(网关) 的 macOS 菜单栏应用程序。
2. **Node pairing**：iOS/Android（及未来的节点）查找 Gateway(网关) 并安全配对。

设计目标是将所有网络 设备发现/广播保留在 **Node Gateway(网关)** (`openclaw gateway`) 中，并保持客户端（mac 应用，iOS）作为使用者。

## 术语

- **Gateway(网关)**：拥有状态（会话、配对、节点注册表）并运行通道的单一长时间运行的 Gateway(网关) 进程。大多数设置每台主机使用一个；隔离的多 Gateway(网关) 设置也是可能的。
- **Gateway(网关) WS (控制平面)**：默认情况下 `127.0.0.1:18789` 上的 WebSocket 端点；可以通过 `gateway.bind` 绑定到 LAN/tailnet。
- **Direct WS transport**：面向 LAN/tailnet 的 Gateway(网关) WS 端点（无 SSH）。
- **SSH transport (fallback)**：通过 SSH 转发 `127.0.0.1:18789` 进行的远程控制。
- **Legacy TCP bridge (deprecated/removed)**：旧的节点传输（请参阅 [Bridge protocol](/zh/gateway/bridge-protocol)）；不再进行 设备发现 广播。

Protocol details:

- [Gateway(网关) protocol](/zh/gateway/protocol)
- [Bridge protocol (legacy)](/zh/gateway/bridge-protocol)

## Why we keep both "direct" and SSH

- **Direct WS** 在同一网络和 tailnet 内提供最佳用户体验：
  - 通过 Bonjour 在 LAN 上自动 设备发现
  - 由 Gateway(网关) 拥有的配对令牌 + ACL
  - 不需要 shell 访问权限；协议表面可以保持紧凑和可审计
- **SSH** 仍然是通用的后备方案：
  - 只要有 SSH 访问权限就可以在任何地方工作（甚至在不相关的网络之间）
  - 可以解决多播/mDNS 问题
  - 除了 SSH 之外不需要新的入站端口

## 设备发现 inputs (how clients learn where the gateway is)

### 1) Bonjour / mDNS (LAN only)

Bonjour 是尽力而为的，不能跨越网络。它仅用于“同一 LAN”的便利。

Target direction:

- **Gateway(网关)** 通过 Bonjour 公布其 WS 端点。
- 客户端浏览并显示一个“选择网关”列表，然后存储所选端点。

故障排除和信标详细信息：[Bonjour](/zh/gateway/bonjour)。

#### 服务信标详细信息

- 服务类型：
  - `_openclaw-gw._tcp` (网关传输信标)
- TXT 密钥（非机密）：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22` (或任何已公布的内容)
  - `gatewayPort=18789` (Gateway(网关) WS + HTTP)
  - `gatewayTls=1` (仅在启用 TLS 时)
  - `gatewayTlsSha256=<sha256>` (仅在启用 TLS 且指纹可用时)
  - `canvasPort=<port>` (画布主机端口；当启用画布主机时，目前与 `gatewayPort` 相同)
  - `cliPath=<path>` (可选；可运行的 `openclaw` 入口点或二进制文件的绝对路径)
  - `tailnetDns=<magicdns>` (可选提示；当 Tailscale 可用时自动检测)

安全说明：

- Bonjour/mDNS TXT 记录是**未经身份验证的**。客户端必须仅将 TXT 值视为 UX 提示。
- 路由（主机/端口）应优先使用**解析的服务端点**（SRV + A/AAAA），而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 固定绝对不允许公布的 `gatewayTlsSha256` 覆盖之前存储的固定值。
- iOS/Android 节点应将基于发现的直接连接视为**仅限 TLS**，并且在存储首次固定值（带外验证）之前，需要明确的“信任此指纹”确认。

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用公布。
- `gateway.bind` 中的 `~/.openclaw/openclaw.json` 控制 Gateway(网关) 绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中公布的 SSH 端口（默认为 22）。
- `OPENCLAW_TAILNET_DNS` 公布 `tailnetDns` 提示 (MagicDNS)。
- `OPENCLAW_CLI_PATH` 覆盖公布的 CLI 路径。

### 2) Tailnet (跨网络)

对于伦敦/维也纳风格的设置，Bonjour 没有帮助。推荐的“直接”目标是：

- Tailscale MagicDNS 名称（首选）或稳定的 tailnet IP。

如果 Gateway 检测到它正在 Tailscale 下运行，它会发布 `tailnetDns` 作为客户端的可选提示（包括广域网信标）。

### 3) 手动 / SSH 目标

当没有直接路由（或直接路由被禁用）时，客户端始终可以通过转发回环 Gateway 端口通过 SSH 进行连接。

请参阅[远程访问](/zh/gateway/remote)。

## 传输选择（客户端策略）

推荐的客户端行为：

1. 如果已配置并可达配对的直接端点，则使用它。
2. 否则，如果 Bonjour 在局域网中找到 Gateway，则提供一键“使用此 Gateway”选项并将其保存为直接端点。
3. 否则，如果配置了 tailnet DNS/IP，请尝试直接连接。
4. 否则，回退到 SSH。

## 配对 + 身份验证（直接传输）

Gateway 是节点/客户端准入的真实来源。

- 配对请求在 Gateway 中创建/批准/拒绝（请参阅[Gateway(网关) 配对](/zh/gateway/pairing)）。
- Gateway 强制执行：
  - 身份验证（令牌 / 密钥对）
  - 范围/ACL（Gateway 不是每个方法的原始代理）
  - 速率限制

## 各组件的职责

- **Gateway(网关)**：发布发现信标，拥有配对决策权，并托管 WS 端点。
- **macOS 应用**：帮助您选择 Gateway，显示配对提示，并仅将 SSH 作为回退手段使用。
- **iOS/Android 节点**：为了方便起见浏览 Bonjour 并连接到配对的 Gateway(网关) WS。

import en from "/components/footer/en.mdx";

<en />
