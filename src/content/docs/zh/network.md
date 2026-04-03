---
summary: "网络中心：网关界面、配对、发现和安全"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "网络"
---

# 网络中心

该中心汇总了关于 OpenClaw 如何在本地主机、局域网 和 tailnet 之间连接、配对和保护设备的核心文档。

## 核心模型

大多数操作通过 Gateway(网关) (`openclaw gateway`) 进行，这是一个拥有渠道连接和 WebSocket 控制平面的单一长时间运行的进程。

- **Loopback first**（优先回环）：Gateway(网关) WS (Gateway(网关)) 默认为 `ws://127.0.0.1:18789`。非回环绑定需要令牌。
- 建议每个主机 **One Gateway(网关) per host**。为了隔离，请使用隔离的配置文件和端口运行多个网关 ([Multiple Gateways](/en/gateway/multiple-gateways))。
- **Canvas host** (Canvas) 与 Gateway(网关) (Gateway(网关)) (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`) 提供在相同的端口上，当绑定超出回环地址时受 Gateway(网关) (Gateway(网关)) 身份验证保护。
- **Remote access**（远程访问）通常是 SSH 隧道或 Tailscale (Tailscale) VPN ([Remote Access](/en/gateway/remote))。

关键参考：

- [Gateway(网关) 架构](/en/concepts/architecture) (Gateway(网关))
- [Gateway(网关) 协议](/en/gateway/protocol) (Gateway(网关))
- [Gateway(网关) 运维手册](/en/gateway) (Gateway(网关))
- [Web 界面 + 绑定模式](/en/web)

## 配对 + 身份

- [配对概述 (私信 + 节点)](/en/channels/pairing)
- [Gateway(网关)拥有的节点配对](/en/gateway/pairing) (Gateway(网关))
- [设备 CLI (配对 + 令牌轮换)](/en/cli/devices) (CLI)
- [配对 CLI (私信 批准)](/en/cli/pairing) (CLI)

本地信任：

- 本地连接（回环或网关主机自己的 tailnet 地址）可以自动批准配对，以保持同主机用户体验流畅。
- 非本地 tailnet/LAN 客户端仍需要明确的配对批准。

## 设备发现 + 传输协议

- [设备发现 & 传输协议](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour) (Bonjour)
- [远程访问 (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale) (Tailscale)

## 节点 + 传输协议

- [节点概述](/en/nodes)
- [桥接协议 (旧版节点)](/en/gateway/bridge-protocol)
- [节点运维手册：iOS](/en/platforms/ios) (iOS)
- [节点运维手册：Android](/en/platforms/android) (Android)

## 安全

- [安全概述](/en/gateway/security)
- [Gateway(网关) 配置参考](/en/gateway/configuration) (Gateway(网关))
- [故障排除](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)
