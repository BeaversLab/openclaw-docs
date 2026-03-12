---
summary: "节点发现与传输（Bonjour、Tailscale、SSH）用于查找网关"
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

设计目标是将所有网络发现/通告保留在 **节点网关** (`openclaw gateway`) 中，并使客户端（mac 应用、iOS）作为使用者。

## 术语

- **网关**：拥有状态（会话、配对、节点注册表）并运行通道的单一长期运行的网关进程。大多数设置每台主机使用一个；也可以进行隔离的多网关设置。
- **网关 WS（控制平面）**：默认位于 `127.0.0.1:18789` 上的 WebSocket 端点；可以通过 `gateway.bind` 绑定到局域网/tailnet。
- **直接 WS 传输**：面向局域网/tailnet 的网关 WS 端点（无 SSH）。
- **SSH 传输（回退）**：通过 SSH 转发 `127.0.0.1:18789` 进行的远程控制。
- **传统 TCP 桥接（已弃用/已移除）**：较旧的节点传输（参见 [桥接协议](/zh/en/gateway/bridge-protocol)）；不再通告以供发现。

协议详情：

- [网关协议](/zh/en/gateway/protocol)
- [桥接协议（传统）](/zh/en/gateway/bridge-protocol)

## 为什么我们要同时保留“直接”和 SSH

- **直接 WS** 在同一网络和 tailnet 内提供最佳的用户体验：
  - 通过 Bonjour 在局域网上自动发现
  - 由网关拥有的配对令牌 + ACL
  - 不需要 shell 访问权限；协议表面可以保持严格和可审计
- **SSH** 仍然是最通用的回退方案：
  - 在任何拥有 SSH 访问权限的地方都可以工作（甚至跨不相关的网络）
  - 能够克服多播/mDNS 问题
  - 除 SSH 外不需要新的入站端口

## 发现输入（客户端如何了解网关位置）

### 1) Bonjour / mDNS（仅限局域网）

Bonjour 是尽力而为的，不能跨越网络。它仅用于“同一局域网”的便利。

目标方向：

- **网关** 通过 Bonjour 广播其 WS 端点。
- 客户端浏览并显示“选择网关”列表，然后存储所选的端点。

故障排除和信标详情：[Bonjour](/zh/en/gateway/bonjour)。

#### 服务信标详情

- 服务类型：
  - `_openclaw-gw._tcp` (网关传输信标)
- TXT 密钥（非秘密）：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22` (或任何广播的内容)
  - `gatewayPort=18789` (网关 WS + HTTP)
  - `gatewayTls=1` (仅在启用 TLS 时)
  - `gatewayTlsSha256=<sha256>` (仅在启用 TLS 且指纹可用时)
  - `canvasPort=<port>` (canvas 主机端口；当启用 canvas 主机时，目前与 `gatewayPort` 相同)
  - `cliPath=<path>` (可选；可运行的 `openclaw` 入口点或二进制文件的绝对路径)
  - `tailnetDns=<magicdns>` (可选提示；当 Tailscale 可用时自动检测)

安全说明：

- Bonjour/mDNS TXT 记录是**未经验证的**。客户端必须仅将 TXT 值视为 UX 提示。
- 路由（主机/端口）应优先考虑**解析的服务端点** (SRV + A/AAAA)，而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 固定绝不允许广播的 `gatewayTlsSha256` 覆盖先前存储的固定值。
- iOS/Android 节点应将基于发现的直接连接视为**仅限 TLS**，并且在存储首次固定值（带外验证）之前，需要明确的“信任此指纹”确认。

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用广播。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制网关绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中广播的 SSH 端口（默认为 22）。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示 (MagicDNS)。
- `OPENCLAW_CLI_PATH` 覆盖广播的 CLI 路径。

### 2) Tailnet（跨网络）

对于伦敦/维也纳风格的设置，Bonjour 无济于事。推荐的“直接”目标是：

- Tailscale MagicDNS 名称（首选）或稳定的 tailnet IP。

如果网关检测到自己在 Tailscale 下运行，它会发布 `tailnetDns` 作为给客户端的可选提示（包括广域网信标）。

### 3) 手动 / SSH 目标

当没有直连路由（或直连被禁用）时，客户端始终可以通过转发回环网关端口通过 SSH 连接。

参见 [远程访问](/zh/en/gateway/remote)。

## 传输选择（客户端策略）

推荐的客户端行为：

1. 如果配置了已配对的直连端点且可达，则使用它。
2. 否则，如果 Bonjour 在局域网上发现了网关，提供一键“使用此网关”的选项并将其保存为直连端点。
3. 否则，如果配置了 tailnet DNS/IP，则尝试直连。
4. 否则，回退到 SSH。

## 配对 + 认证（直连传输）

网关是节点/客户端准入的事实来源。

- 配对请求在网关中创建/批准/拒绝（参见 [网关配对](/zh/en/gateway/pairing)）。
- 网关强制执行：
  - 认证（令牌 / 密钥对）
  - 范围/ACL（网关并非每个方法的原始代理）
  - 速率限制

## 各组件的职责

- **网关**：发布发现信标，拥有配对决策权，并托管 WS 端点。
- **macOS 应用**：帮助您选择网关，显示配对提示，并且仅将 SSH 作为备用手段使用。
- **iOS/Android 节点**：为方便起见浏览 Bonjour 并连接到已配对的网关 WS。
