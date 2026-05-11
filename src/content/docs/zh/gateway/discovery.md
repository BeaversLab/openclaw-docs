---
summary: "用于发现网关的节点发现和传输（Bonjour、Tailscale、SSH）"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "设备发现与传输"
---

# 发现与传输

OpenClaw 有两个表面看起来相似但实际上截然不同的问题：

1. **操作员远程控制**：macOS 菜单栏应用程序控制运行在其他地方的网关。
2. **节点配对**：iOS/Android（及未来的节点）查找网关并进行安全配对。

设计目标是将所有网络发现/通告保留在 **节点 Gateway(网关) 网关**（`openclaw gateway`）中，并使客户端（Mac 应用、iOS）作为使用者。

## 术语

- **Gateway(网关) 网关**：拥有状态（会话、配对、节点注册表）并运行通道的单一长期运行的网关进程。大多数设置每台主机使用一个；也可以进行隔离的多网关设置。
- **Gateway(网关) 网关 WS（控制平面）**：默认情况下 `127.0.0.1:18789` 上的 WebSocket 端点；可以通过 `gateway.bind` 绑定到局域网/tailnet。
- **直接 WS 传输**：面向局域网/tailnet 的 Gateway(网关) 网关 WS 端点（无 SSH）。
- **SSH 传输（备用）**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。
- **Legacy TCP bridge (removed)**: 较旧的节点传输（参见
  [Bridge protocol](/zh/gateway/bridge-protocol)）；不再进行
  设备发现广播，也不再属于当前构建的一部分。

协议详情：

- [Gateway(网关) protocol](/zh/gateway/protocol)
- [Bridge protocol (legacy)](/zh/gateway/bridge-protocol)

## 为什么我们同时保留“direct”和 SSH

- **直接 WS** 在同一网络和 tailnet 内提供最佳的用户体验：
  - 通过 Bonjour 在局域网上进行自动设备发现
  - 配对令牌 + 由 Gateway 网关拥有的 ACL
  - 不需要 Shell 访问权限；协议表面可以保持紧凑且可审计
- **SSH** 仍然是通用的后备方案：
  - 可以在任何拥有 SSH 访问权限的地方使用（甚至可以在不相关的网络之间）
  - 能够规避多播/mDNS 问题
  - 除了 SSH 之外不需要新的入站端口

## 设备发现输入（客户端如何获知 Gateway 网关的位置）

### 1) Bonjour / DNS-SD 发现

组播 Bonjour 是尽力而为的，且不跨网络。OpenClaw 也可以通过配置的广域 DNS-SD 域浏览
相同的 Gateway 信标，因此发现可以覆盖：

- 同一局域网上的 `local.`
- 用于跨网络发现的已配置单播 DNS-SD 域

目标方向：

- **Gateway** 通过 Bonjour 广播其 WS 端点。
- 客户端浏览并显示“选择一个 Gateway”列表，然后存储所选的端点。

故障排除和信标详情：[Bonjour](/zh/gateway/bonjour)。

#### 服务信标详细信息

- 服务类型：
  - `_openclaw-gw._tcp` (Gateway 传输信标)
- TXT 键（非机密）：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` (操作员配置的显示名称)
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789` (Gateway(网关) WS + HTTP)
  - `gatewayTls=1` (仅在启用 TLS 时)
  - `gatewayTlsSha256=<sha256>` (仅在启用 TLS 且可用指纹时)
  - `canvasPort=<port>` (画布主机端口；启用画布主机时，目前与 `gatewayPort` 相同)
  - `tailnetDns=<magicdns>` (可选提示；当 Tailscale 可用时自动检测)
  - `sshPort=<port>` (仅限 mDNS 完整模式；广域 DNS-SD 可能会省略它，在这种情况下 SSH 默认值保持为 `22`)
  - `cliPath=<path>` (仅限 mDNS 完整模式；广域 DNS-SD 仍会将其作为远程安装提示写入)

安全说明：

- Bonjour/mDNS TXT 记录是**未经身份验证的**。客户端必须仅将 TXT 值视为 UX 提示。
- 路由（主机/端口）应优先考虑**已解析的服务端点**（SRV + A/AAAA），而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 固定绝不允许通过广播的 `gatewayTlsSha256` 覆盖之前存储的固定值。
- 当所选路由是安全/基于 TLS 的路由时，iOS/Android 节点应在存储首次固定值（带外验证）之前要求明确的“信任此指纹”确认。

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用广播。
- 当未设置 `OPENCLAW_DISABLE_BONJOUR` 时，Bonjour 会在普通主机上进行广播，
  并在检测到的容器内自动禁用。请仅在主机、macvlan
  或其他支持 mDNS 的网络上使用 `0`；使用 `1` 强制禁用。
- `gateway.bind` 中的 `~/.openclaw/openclaw.json` 控制 Gateway(网关) 绑定模式。
- 当发出 `sshPort` 时，`OPENCLAW_SSH_PORT` 会覆盖通告的 SSH 端口。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示 (MagicDNS)。
- `OPENCLAW_CLI_PATH` 覆盖通告的 CLI 路径。

### 2) Tailnet (跨网络)

对于伦敦/维也纳风格的设置，Bonjour 无济于事。推荐的“直连”目标是：

- Tailscale MagicDNS 名称（首选）或稳定的 tailnet IP。

如果 Gateway(网关) 检测到自己在 Tailscale 下运行，它会发布 `tailnetDns` 作为客户端的可选提示（包括广域信标）。

macOS 应用现在更喜欢使用 MagicDNS 名称而不是原始的 Tailscale IP 进行 Gateway(网关) 发现。当 tailnet IP 发生变化时（例如在节点重启或 CGNAT 重新分配后），这提高了可靠性，因为 MagicDNS 名称会自动解析为当前 IP。

对于移动节点配对，设备发现提示不会放宽 tailnet/公共路由上的传输安全性：

- iOS/Android 仍然需要安全的首次 tailnet/公共连接路径（`wss://` 或 Tailscale Serve/Funnel）。
- 发现的原始 tailnet IP 是路由提示，而不是使用明文远程 `ws://` 的权限。
- 私有 LAN 直连 `ws://` 仍然受支持。
- 如果您想要移动节点最简单的 Tailscale 路径，请使用 Tailscale Serve，这样发现和设置代码都会解析到同一个安全的 MagicDNS 端点。

### 3) 手动 / SSH 目标

当没有直接路由（或者直接连接被禁用）时，客户端可以通过转发环回网关端口始终通过 SSH 连接。

请参阅[远程访问](/zh/gateway/remote)。

## 传输选择（客户端策略）

推荐的客户端行为：

1. 如果配置了配对的直接端点且可访问，请使用它。
2. 否则，如果发现在 `local.` 或配置的广域网上有网关，提供一键“使用此网关”的选项并将其保存为直接端点。
3. 否则，如果配置了 tailnet DNS/IP，请尝试直接连接。
   对于 tailnet/公共路由上的移动节点，直接连接指的是安全端点，而不是纯文本远程 `ws://`。
4. 否则，回退到 SSH。

## 配对 + 认证（直接传输）

网关是节点/客户端准入的单一事实来源。

- 配对请求在网关中创建/批准/拒绝（请参阅[Gateway(网关) 配对](/zh/gateway/pairing)）。
- 网关强制执行：
  - 认证（令牌 / 密钥对）
  - 范围/ACL（网关不是通往每个方法的原始代理）
  - 速率限制

## 各组件职责

- **Gateway(网关)**：发布发现信标，拥有配对决策权，并托管 WS 端点。
- **macOS 应用**：帮助您选择网关，显示配对提示，并仅将 SSH 作为备用手段。
- **iOS/Android 节点**：为了方便起见浏览 Bonjour 并连接到已配对的 Gateway(网关) WS。

## 相关

- [远程访问](/zh/gateway/remote)
- [Tailscale](/zh/gateway/tailscale)
- [Bonjour 发现](/zh/gateway/bonjour)
