---
summary: "节点发现和传输（Bonjour、Tailscale、SSH）用于查找 Gateway"
read_when:
  - "Implementing or changing Bonjour discovery/advertising"
  - "Adjusting remote connection modes (direct vs SSH)"
  - "Designing node discovery + pairing for remote nodes"
title: "发现与传输"
---

# 发现与传输

OpenClaw 有两个表面上看起来相似但实际上不同的问题：

1. **操作员远程控制**：macOS 菜单栏应用控制运行在其他地方的Gateway。
2. **节点配对**：iOS/Android（及未来的节点）查找Gateway并安全配对。

设计目标是将所有网络发现/广播保留在**节点Gateway**（`openclaw gateway`）中，并让客户端（mac 应用、iOS）作为使用者。

## 术语

- **Gateway**：拥有状态（会话、配对、节点注册表）并运行频道的单一长期运行的Gateway进程。大多数设置每个主机使用一个；可以进行隔离的多Gateway设置。
- **Gateway WS（控制平面）**：默认位于 `127.0.0.1:18789` 上的 WebSocket 端点；可以通过 `gateway.bind` 绑定到局域网/尾网。
- **直接 WS 传输**：面向局域网/尾网的Gateway WS 端点（无 SSH）。
- **SSH 传输（备用）**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。
- **传统 TCP 网桥（已弃用/已移除）**：较旧的节点传输（参见[网桥协议](/zh/gateway/bridge-protocol)）；不再用于发现广播。

协议详情：

- [Gateway协议](/zh/gateway/protocol)
- [网桥协议 (/en/gateway/bridge-protocol)](/zh/gateway/bridge-protocol)

## 为什么我们同时保留”直接”和 SSH

- **直接 WS** 在同一网络和尾网内提供最佳用户体验：
  - 通过 Bonjour 在局域网上自动发现
  - 由Gateway拥有的配对令牌 + ACL
  - 不需要 shell 访问；协议表面可以保持紧凑和可审计
- **SSH** 仍然是通用的备用方案：
  - 在任何你有 SSH 访问权限的地方都可以工作（甚至在不相关的网络之间）
  - 可以解决多播/mDNS 问题
  - 除了 SSH 之外不需要新的入站端口

## 发现输入（客户端如何了解Gateway位置）

### 1) Bonjour / mDNS（仅局域网）

Bonjour 是尽力而为的，不会跨网络。它仅用于”同一局域网”的便利。

目标方向：

- **Gateway**通过 Bonjour 广播其 WS 端点。
- 客户端浏览并显示”选择Gateway”列表，然后存储所选端点。

故障排除和信标详情：[Bonjour](/zh/gateway/bonjour)。

#### 服务信标详情

- 服务类型：
  - `_openclaw-gw._tcp`（Gateway传输信标）
- TXT 键（非秘密）：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22`（或任何广播的内容）
  - `gatewayPort=18789`（Gateway WS + HTTP）
  - `gatewayTls=1`（仅在启用 TLS 时）
  - `gatewayTlsSha256=<sha256>`（仅在启用 TLS 且指纹可用时）
  - `canvasPort=18793`（默认 canvas 主机端口；提供 `/__openclaw__/canvas/`）
  - `cliPath=<path>`（可选；可运行的 `openclaw` 入口点或二进制文件的绝对路径）
  - `tailnetDns=<magicdns>`（可选提示；当 Tailscale 可用时自动检测）

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用广播。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制Gateway绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中广播的 SSH 端口（默认为 22）。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖广播的 CLI 路径。

### 2) 尾网（跨网络）

对于伦敦/维也纳风格的设置，Bonjour 无济于事。推荐的”直接”目标是：

- Tailscale MagicDNS 名称（首选）或稳定的尾网 IP。

如果Gateway可以检测到它在 Tailscale 下运行，它会将 `tailnetDns` 作为可选提示发布给客户端（包括广域网信标）。

### 3) 手动/SSH 目标

当没有直接路由（或直接路由被禁用）时，客户端可以通过转发环回Gateway端口通过 SSH 连接。

参见[远程访问](/zh/gateway/remote)。

## 传输选择（客户端策略）

推荐的客户端行为：

1. 如果配置了已配对的直接端点且可达，则使用它。
2. 否则，如果 Bonjour 在局域网上找到Gateway，提供一键”使用此Gateway”选择并将其保存为直接端点。
3. 否则，如果配置了尾网 DNS/IP，尝试直接连接。
4. 否则，回退到 SSH。

## 配对 + 认证（直接传输）

Gateway是节点/客户端接入的真实来源。

- 配对请求在Gateway中创建/批准/拒绝（参见[Gateway配对](/zh/gateway/pairing)）。
- Gateway执行：
  - 认证（令牌/密钥对）
  - 范围/ACL（Gateway不是每个方法的原始代理）
  - 速率限制

## 各组件的职责

- **Gateway**：广播发现信标，拥有配对决策，并托管 WS 端点。
- **macOS 应用**：帮助你选择Gateway，显示配对提示，并仅将 SSH 作为备用方案。
- **iOS/Android 节点**：浏览 Bonjour 作为便利，并连接到配对的Gateway WS。
