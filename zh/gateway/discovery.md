---
summary: "用于发现网关的节点发现和传输（Bonjour、Tailscale、SSH）"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "发现与传输"
---

# 发现与传输

OpenClaw 有两个表面看起来相似但实际上截然不同的问题：

1. **操作员远程控制**：macOS 菜单栏应用程序控制运行在其他地方的网关。
2. **节点配对**：iOS/Android（及未来的节点）查找网关并进行安全配对。

设计目标是将所有网络发现/通告保留在 **节点 Gateway 网关**（`openclaw gateway`）中，并使客户端（Mac 应用、iOS）作为使用者。

## 术语

- **Gateway 网关**：拥有状态（会话、配对、节点注册表）并运行通道的单一长期运行的网关进程。大多数设置每台主机使用一个；也可以进行隔离的多网关设置。
- **Gateway 网关 WS（控制平面）**：默认情况下 `127.0.0.1:18789` 上的 WebSocket 端点；可以通过 `gateway.bind` 绑定到局域网/tailnet。
- **直接 WS 传输**：面向局域网/tailnet 的 Gateway 网关 WS 端点（无 SSH）。
- **SSH 传输（备用）**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。
- **Legacy TCP bridge（已弃用/已移除）**：旧版节点传输（请参阅 [Bridge protocol](/zh/gateway/bridge-protocol)）；不再广播用于设备发现。

协议详情：

- [Gateway(网关) 协议](/zh/gateway/protocol)
- [Bridge protocol (legacy)](/zh/gateway/bridge-protocol)

## 为什么我们要同时保留“直接”和 SSH

- **直接 WS** 在同一网络和 tailnet 内提供最佳的用户体验：
  - 通过 Bonjour 在局域网上进行自动设备发现
  - 配对令牌 + 由 Gateway 网关拥有的 ACL
  - 不需要 Shell 访问权限；协议表面可以保持紧凑且可审计
- **SSH** 仍然是通用的后备方案：
  - 可以在任何拥有 SSH 访问权限的地方使用（甚至可以在不相关的网络之间）
  - 能够规避多播/mDNS 问题
  - 除了 SSH 之外不需要新的入站端口

## 设备发现输入（客户端如何获知 Gateway 网关的位置）

### 1) Bonjour / mDNS（仅限局域网）

Bonjour 是尽力而为的，无法跨网络工作。它仅用于“同一局域网”的便利性。

目标方向：

- **Gateway 网关**通过 Bonjour 广播其 WS 端点。
- 客户端进行浏览并显示“选择一个 Gateway 网关”列表，然后存储所选的端点。

故障排除和信标详细信息：[Bonjour](/zh/gateway/bonjour)。

#### 服务信标详细信息

- 服务类型：
  - `_openclaw-gw._tcp`（Gateway 网关传输信标）
- TXT 密钥（非秘密）：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22`（或任何被广播的内容）
  - `gatewayPort=18789`（Gateway 网关 WS + HTTP）
  - `gatewayTls=1`（仅在启用 TLS 时）
  - `gatewayTlsSha256=<sha256>`（仅在启用 TLS 且指纹可用时）
  - `canvasPort=<port>`（canvas 主机端口；当启用 canvas 主机时，目前与 `gatewayPort` 相同）
  - `cliPath=<path>`（可选；可运行的 `openclaw` 入口点或二进制文件的绝对路径）
  - `tailnetDns=<magicdns>`（可选提示；当 Tailscale 可用时自动检测）

安全说明：

- Bonjour/mDNS TXT 记录是**未经身份验证的**。客户端必须将 TXT 值仅视为 UX 提示。
- 路由（主机/端口）应优先使用 **已解析的服务端点**（SRV + A/AAAA），而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 固定绝不允许通过通告的 `gatewayTlsSha256` 来覆盖先前存储的固定值。
- iOS/Android 节点应将基于发现的直接连接视为 **仅 TLS** 连接，并在存储首次 pin（带外验证）之前要求明确的“信任此指纹”确认。

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用通告。
- `gateway.bind` 在 `~/.openclaw/openclaw.json` 中控制 Gateway(网关) 绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中通告的 SSH 端口（默认为 22）。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 会覆盖通告的 CLI 路径。

### 2) Tailnet（跨网络）

对于伦敦/维也纳风格的设置，Bonjour 无济于事。推荐的“直接”目标是：

- Tailscale MagicDNS 名称（首选）或稳定的 tailnet IP。

如果 Gateway 网关检测到它在 Tailscale 下运行，它会发布 `tailnetDns` 作为供客户端使用的可选提示（包括广域信标）。

### 3) 手动 / SSH 目标

当没有直接路由（或直接连接被禁用）时，客户端始终可以通过转发环回 Gateway 网关端口来通过 SSH 连接。

参见 [远程访问](/zh/gateway/remote)。

## 传输选择（客户端策略）

推荐的客户端行为：

1. 如果配置了配对的直接端点且可达，则使用它。
2. 否则，如果 Bonjour 在 LAN 上发现了一个 Gateway 网关，则提供一键“使用此 Gateway 网关”选项并将其保存为直接端点。
3. 否则，如果配置了 tailnet DNS/IP，请尝试直接连接。
4. 否则，回退到 SSH。

## 配对 + 身份验证（直接传输）

Gateway 网关是节点/客户端准入的单一事实来源。

- 配对请求是在 Gateway(网关) 中创建/批准/拒绝的（请参阅 [Gateway(网关) 配对](/zh/gateway/pairing)）。
- Gateway 网关强制执行：
  - 身份验证（令牌 / 密钥对）
  - 作用域/ACL（Gateway 网关不是每个方法的原始代理）
  - 速率限制

## 各组件的职责

- **Gateway 网关**：发布发现信标，拥有配对决策权，并托管 WS 端点。
- **macOS 应用**：帮助您选择 Gateway 网关，显示配对提示，并仅将 SSH 作为回退方式使用。
- **iOS/Android 节点**：为了方便起见浏览 Bonjour，并连接到已配对的 Gateway 网关 WS。

import zh from "/components/footer/zh.mdx";

<zh />
