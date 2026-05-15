---
summary: "用于发现网关的节点发现和传输（Bonjour、Tailscale、SSH）"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "设备发现与传输"
---

OpenClaw 有两个截然不同的问题，表面上看起来很相似：

1. **操作员远程控制**：控制运行在其他地方的 macOS 菜单栏应用程序。
2. **节点配对**：iOS/Android（以及未来的节点）发现网关并安全配对。

设计目标是将所有网络发现/广播保留在 **Node Gateway(网关)** (`openclaw gateway`) 中，并使客户端（mac 应用，iOS）作为消费者。

## 术语

- **Gateway(网关)**：一个单一的长运行网关进程，拥有状态（会话、配对、节点注册表）并运行通道。大多数设置每台主机使用一个；也可以进行隔离的多网关设置。
- **Gateway(网关) WS（控制平面）**：默认情况下 `127.0.0.1:18789` 上的 WebSocket 端点；可以通过 `gateway.bind` 绑定到局域网/tailnet。
- **Direct WS 传输**：面向局域网/tailnet 的 Gateway(网关) WS 端点（无 SSH）。
- **SSH 传输（回退）**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。
- **传统 TCP 桥接（已移除）**：较旧的节点传输（参见
  [桥接协议](/zh/gateway/bridge-protocol)）；不再为此
  设备发现进行广播，也不再是当前构建的一部分。

协议详情：

- [Gateway(网关) 协议](/zh/gateway/protocol)
- [桥接协议（传统）](/zh/gateway/bridge-protocol)

## 为什么我们同时保留直连和 SSH

- **Direct WS** 在同一网络和 tailnet 内提供最佳的用户体验：
  - 通过 Bonjour 在局域网上自动设备发现
  - 由网关拥有的配对令牌和 ACL
  - 不需要 shell 访问权限；协议表面可以保持紧密和可审计
- **SSH** 仍然是通用的回退方案：
  - 可以在任何拥有 SSH 访问权限的地方工作（甚至跨越不相关的网络）
  - 可以解决多播/mDNS 问题
  - 除了 SSH 之外不需要新的入站端口

## 设备发现输入（客户端如何了解网关的位置）

### 1) Bonjour / DNS-SD 设备发现

组播 Bonjour 是尽力而为的，且不会跨越网络。OpenClaw 还可以通过配置的广域 DNS-SD 域浏览相同的 Gateway 信标，因此发现可以覆盖：

- `local.` 在同一局域网上
- 用于跨网络发现的配置的单播 DNS-SD 域

目标方向：

- **Gateway** 在启用捆绑的 Bonjour`bonjour`macOS 插件时，会通过 Bonjour 公告其 WS 端点。该插件在 macOS 主机上自动启动，而在其他地方则是可选加入。
- 客户端浏览并显示“选择一个 Gateway”列表，然后存储所选的端点。

故障排除和信标详细信息：[Bonjour](Bonjour/en/gateway/bonjour)。

#### 服务信标详细信息

- 服务类型：
  - `_openclaw-gw._tcp` (Gateway 传输信标)
- TXT 键（非机密）：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` （操作员配置的显示名称）
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789`Gateway(网关) (Gateway WS + HTTP)
  - `gatewayTls=1` （仅在启用 TLS 时）
  - `gatewayTlsSha256=<sha256>` （仅在启用 TLS 且指纹可用时）
  - `canvasPort=<port>` （画布主机端口；当启用画布主机时，目前与 `gatewayPort` 相同）
  - `tailnetDns=<magicdns>`Tailscale （可选提示；当 Tailscale 可用时自动检测）
  - `sshPort=<port>` （仅限 mDNS 完整模式；广域 DNS-SD 可能会省略它，在这种情况下 SSH 默认值保持在 `22`）
  - `cliPath=<path>` （仅限 mDNS 完整模式；广域 DNS-SD 仍将其作为远程安装提示写入）

安全说明：

- Bonjour/mDNS TXT 记录是**未经身份验证的**。客户端必须将 TXT 值仅视为 UX 提示。
- 路由（主机/端口）应优先考虑**解析的服务端点**（SRV + A/AAAA），而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 固定绝不能允许通告的 `gatewayTlsSha256` 覆盖先前存储的固定值。
- 当所选路由是安全/基于 TLS 的时，iOS/Android 节点应在存储首次固定值之前要求明确的“信任此指纹”确认（带外验证）。

启用/禁用/覆盖：

- `openclaw plugins enable bonjour` 启用 LAN 组播通告。
- `OPENCLAW_DISABLE_BONJOUR=1` 禁用通告。
- 当启用 Bonjour 插件且未设置 `OPENCLAW_DISABLE_BONJOUR` 时，Bonjour 会在普通主机上通告，并在检测到的容器内自动禁用。空配置的 macOS Gateway(网关) 启动时会自动启用该插件；Linux、Windows 和容器化部署需要显式启用。请仅在主机、macvlan 或其他支持 mDNS 的网络上使用 `0`；使用 `1` 强制禁用。
- `gateway.bind` 中的 `~/.openclaw/openclaw.json` 控制 Gateway(网关) 绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖发出 `sshPort` 时通告的 SSH 端口。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖通告的 CLI 路径。

### 2) Tailnet (跨网络)

对于伦敦/维也纳风格的设置，Bonjour 无济于事。推荐的“直接”目标是：

- Tailscale MagicDNS 名称（首选）或稳定的 tailnet IP。

如果网关检测到它在 Tailscale 下运行，它会发布 `tailnetDns` 作为供客户端使用的可选提示（包括广域信标）。

macOS 应用现在更喜欢使用 MagicDNS 名称而不是原始的 Tailscale IP 进行 Gateway(网关) 发现。当 tailnet IP 发生变化时（例如在节点重启或 CGNAT 重新分配后），这提高了可靠性，因为 MagicDNS 名称会自动解析为当前 IP。

对于移动节点配对，设备发现提示不会放宽 tailnet/公共路由上的传输安全性：

- iOS/Android 仍然需要安全的首次 tailnet/公共连接路径（`wss://` 或 Tailscale Serve/Funnel）。
- 发现的原始 tailnet IP 是一个路由提示，而不是使用纯文本远程 `ws://` 的权限。
- 专用 LAN 直接连接 `ws://` 仍然受支持。
- 如果您想要移动节点最简单的 Tailscale 路径，请使用 Tailscale Serve，这样发现和设置代码都会解析到同一个安全的 MagicDNS 端点。

### 3) 手动 / SSH 目标

当没有直接路由（或者直接连接被禁用）时，客户端可以通过转发环回网关端口始终通过 SSH 连接。

参见[远程访问](/zh/gateway/remote)。

## 传输选择（客户端策略）

推荐的客户端行为：

1. 如果配置了配对的直接端点且可访问，请使用它。
2. 否则，如果发现在 `local.` 或配置的广域域上有一个 Gateway(网关)，则提供一键“使用此 Gateway(网关)”选项并将其保存为直接端点。
3. 否则，如果配置了 tailnet DNS/IP，则尝试直接连接。
   对于 tailnet/公共路由上的移动节点，direct 意味着安全端点，而不是明文远程 `ws://`。
4. 否则，回退到 SSH。

## 配对 + 认证（直接传输）

网关是节点/客户端准入的单一事实来源。

- 配对请求在 Gateway(网关)中创建/批准/拒绝（参见 [Gateway(网关) 配对](<Gateway(网关)/en/gateway/pairing>)）。
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
- [Tailscale](Tailscale/en/gateway/tailscale)
- [Bonjour 发现](Bonjour/en/gateway/bonjour)
