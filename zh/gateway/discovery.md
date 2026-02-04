---
summary: "Node 发现与传输（Bonjour、Tailscale、SSH）用于定位 gateway"
read_when:
  - 实现或修改 Bonjour 发现/广播
  - 调整远程连接模式（direct vs SSH）
  - 设计远程 node 的发现 + 配对
title: "发现和传输"
---

# 发现和传输

OpenClaw 有两个表面上相似但实际不同的问题：

1. **Operator 远程控制**：macOS 菜单栏 app 控制运行在别处的 gateway。
2. **Node 配对**：iOS/Android（以及未来 nodes）发现 gateway 并安全配对。

设计目标是将所有网络发现/广播集中在 **Node Gateway**（`openclaw gateway`），客户端（mac app、iOS）仅作为消费者。

## 术语

- **Gateway**：单个长期运行的 gateway 进程，拥有状态（sessions、pairing、node registry）并运行各渠道。多数部署每台主机一个；也可隔离多 gateway。
- **Gateway WS（控制平面）**：默认 `127.0.0.1:18789` 的 WebSocket 端点；可通过 `gateway.bind` 绑定到 LAN/tailnet。
- **Direct WS 传输**：面向 LAN/tailnet 的 Gateway WS 端点（无 SSH）。
- **SSH 传输（兜底）**：通过 SSH 转发 `127.0.0.1:18789` 实现远程控制。
- **旧版 TCP bridge（已弃用/移除）**：旧 node 传输（见 [桥接 protocol](/zh/gateway/bridge-protocol)）；不再用于发现。

协议详情：

- [Gateway protocol](/zh/gateway/protocol)
- [桥接 protocol（旧）](/zh/gateway/bridge-protocol)

## 为什么同时保留“direct”和 SSH

- **Direct WS** 在同网与 tailnet 内体验最佳：
  - LAN 上通过 Bonjour 自动发现
  - 配对 tokens + ACLs 由 gateway 管理
  - 无需 shell 访问；协议面可保持紧凑可审计
- **SSH** 仍是通用兜底：
  - 只要有 SSH 就能用（即便跨不相关网络）
  - 能避开多播/mDNS 问题
  - 不需要除 SSH 之外的新入站端口

## 发现输入（客户端如何知道 gateway）

### 1) Bonjour / mDNS（仅 LAN）

Bonjour 为 best‑effort，且不跨网络。只用于"同一局域网"便捷发现。

目标方向：

- **gateway** 通过 Bonjour 广播其 WS 端点。
- 客户端浏览并显示“选择 gateway”列表，然后保存 выбран的端点。

排障与信标细节见：[Bonjour](/zh/gateway/bonjour)。

#### 服务信标细节

- 服务类型：
  - `_openclaw-gw._tcp`（gateway 传输信标）
- TXT 键（非机密）：
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22`（或广播的端口）
  - `gatewayPort=18789`（Gateway WS + HTTP）
  - `gatewayTls=1`（仅启用 TLS 时）
  - `gatewayTlsSha256=<sha256>`（仅启用 TLS 且指纹可用时）
  - `canvasPort=18793`（默认 canvas host 端口；提供 `/__openclaw__/canvas/`）
  - `cliPath=<path>`（可选；可运行 `openclaw` 入口或二进制的绝对路径）
  - `tailnetDns=<magicdns>`（可选提示；检测到 Tailscale 时自动发布）

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用广播。
- `gateway.bind`（`~/.openclaw/openclaw.json`）控制 Gateway 绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中广播的 SSH 端口（默认 22）。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖广播的 CLI 路径。

### 2) Tailnet（跨网络）

对于伦敦/维也纳式部署，Bonjour 无法帮助。推荐的"direct"目标：

- Tailscale MagicDNS 名称（优先）或稳定的 tailnet IP。

若 gateway 检测到运行在 Tailscale 下，会发布 `tailnetDns` 作为可选提示（包括广域信标）。

### 3) 手动 / SSH 目标

当没有 direct 路径（或 direct 被禁用）时，客户端始终可通过 SSH 转发 loopback gateway 端口。

参见 [远程访问](/zh/gateway/remote)。

## 传输选择（客户端策略）

推荐客户端行为：

1. 若已配置且可达的配对 direct 端点，优先使用。
2. 若 Bonjour 在 LAN 上发现 gateway，提供"一键使用此 gateway"并保存为 direct 端点。
3. 否则若配置了 tailnet DNS/IP，尝试 direct。
4. 否则回退到 SSH。

## 配对 + 认证（direct 传输）

gateway 是 node/客户端准入的事实来源。

- 配对请求由 gateway 创建/批准/拒绝（见 [Gateway pairing](/zh/gateway/pairing)）。
- gateway 强制：
  - auth（token / keypair）
  - scopes/ACLs（gateway 不是所有方法的原始代理）
  - rate limits

## 组件职责

- **Gateway**：广播发现信标、管理配对决策，并托管 WS 端点。
- **macOS app**：协助选择 gateway、显示配对提示，并仅在兜底时使用 SSH。
- **iOS/Android nodes**：将 Bonjour 作为便捷入口，并连接已配对的 Gateway WS。
