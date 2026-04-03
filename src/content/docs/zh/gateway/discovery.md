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

设计目标是将所有网络发现/通告保留在 **节点 Gateway(网关) 网关**（`openclaw gateway`）中，并使客户端（Mac 应用、iOS）作为使用者。

## 术语

- **Gateway(网关) 网关**：拥有状态（会话、配对、节点注册表）并运行通道的单一长期运行的网关进程。大多数设置每台主机使用一个；也可以进行隔离的多网关设置。
- **Gateway(网关) 网关 WS（控制平面）**：默认情况下 `127.0.0.1:18789` 上的 WebSocket 端点；可以通过 `gateway.bind` 绑定到局域网/tailnet。
- **直接 WS 传输**：面向局域网/tailnet 的 Gateway(网关) 网关 WS 端点（无 SSH）。
- **SSH 传输（备用）**：通过 SSH 转发 `127.0.0.1:18789` 进行远程控制。
- **Legacy TCP bridge (deprecated/removed)**：较旧的节点传输方式（参见 [Bridge protocol](/en/gateway/bridge-protocol)）；不再用于发现通告。

协议详情：

- [Gateway(网关) protocol](/en/gateway/protocol)
- [Bridge protocol (legacy)](/en/gateway/bridge-protocol)

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

### 1) Bonjour / mDNS（仅限局域网）

Bonjour 是尽力而为的，无法跨网络工作。它仅用于“同一局域网”的便利性。

目标方向：

- **Gateway 网关**通过 Bonjour 广播其 WS 端点。
- 客户端进行浏览并显示“选择一个 Gateway 网关”列表，然后存储所选的端点。

故障排除和信标详情：[Bonjour](/en/gateway/bonjour)。

#### 服务信标详细信息

- 服务类型：
  - `_openclaw-gw._tcp`（Gateway 网关传输信标）
- TXT 密钥（非秘密）：
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>`（操作员配置的显示名称）
  - `lanHost=<hostname>.local`
  - `sshPort=22`（或任何通告的内容）
  - `gatewayPort=18789`（Gateway(网关) WS + HTTP）
  - `gatewayTls=1`（仅在启用 TLS 时）
  - `gatewayTlsSha256=<sha256>`（仅在启用 TLS 且指纹可用时）
  - `canvasPort=<port>`（canvas 主机端口；启用 canvas 主机时，目前与 `gatewayPort` 相同）
  - `cliPath=<path>`（可选；可运行的 `openclaw` 入口点或二进制文件的绝对路径）
  - `tailnetDns=<magicdns>`（可选提示；当 Tailscale 可用时自动检测）

安全说明：

- Bonjour/mDNS TXT 记录是**未经过身份验证的**。客户端必须仅将 TXT 值视为 UX 提示。
- 路由（主机/端口）应优先使用**已解析的服务端点**（SRV + A/AAAA），而不是 TXT 提供的 `lanHost`、`tailnetDns` 或 `gatewayPort`。
- TLS 固定决不允许通告的 `gatewayTlsSha256` 覆盖先前存储的固定值。
- iOS/Android 节点应将基于发现的直接连接视为**仅限 TLS**，并要求在首次存储固定值（带外验证）之前进行明确的“信任此指纹”确认。

禁用/覆盖：

- `OPENCLAW_DISABLE_BONJOUR=1` 禁用通告。
- `~/.openclaw/openclaw.json` 中的 `gateway.bind` 控制 Gateway(网关) 绑定模式。
- `OPENCLAW_SSH_PORT` 覆盖 TXT 中通告的 SSH 端口（默认为 22）。
- `OPENCLAW_TAILNET_DNS` 发布 `tailnetDns` 提示（MagicDNS）。
- `OPENCLAW_CLI_PATH` 覆盖通告的 CLI 路径。

### 2) Tailnet（跨网络）

对于伦敦/维也纳风格的设置，Bonjour 没有帮助。推荐的“direct”目标是：

- Tailscale MagicDNS 名称（首选）或稳定的 tailnet IP。

如果 Gateway(网关) 检测到它在 Tailscale 下运行，它会发布 `tailnetDns` 作为给客户端的可选提示（包括广域网信标）。

macOS 应用现在优先使用 MagicDNS 名称而不是原始的 Tailscale IP 来进行 Gateway(网关) 发现。当 tailnet IP 发生变化（例如节点重启或 CGNAT 重新分配后）时，这提高了可靠性，因为 MagicDNS 名称会自动解析为当前 IP。

### 3) Manual / SSH target

当没有直连路由（或直连被禁用）时，客户端始终可以通过转发回环 Gateway(网关) 端口通过 SSH 连接。

请参阅 [Remote access](/en/gateway/remote)。

## Transport selection (client policy)

Recommended client behavior:

1. If a paired direct endpoint is configured and reachable, use it.
2. 否则，如果 Bonjour 在局域网上发现了 Gateway(网关)，提供一键“使用此 Gateway(网关)”选项并将其保存为直接端点。
3. Else, if a tailnet DNS/IP is configured, try direct.
4. Else, fall back to SSH.

## Pairing + auth (direct transport)

The gateway is the source of truth for node/client admission.

- Pairing requests are created/approved/rejected in the gateway (see [Gateway(网关) pairing](/en/gateway/pairing)).
- The gateway enforces:
  - auth (token / keypair)
  - scopes/ACLs (the gateway is not a raw proxy to every method)
  - rate limits

## Responsibilities by component

- **Gateway(网关)**: advertises discovery beacons, owns pairing decisions, and hosts the WS endpoint.
- **macOS app**: helps you pick a gateway, shows pairing prompts, and uses SSH only as a fallback.
- **iOS/Android nodes**: browse Bonjour as a convenience and connect to the paired Gateway(网关) WS.
