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

- **优先使用 Loopback**：Gateway(网关) WS 默认为 `ws://127.0.0.1:18789`。
  非 Loopback 绑定需要有效的网关身份验证路径：shared-secret
  token/password 认证，或正确配置的非 Loopback
  `trusted-proxy` 部署。
- **建议每个主机使用一个 Gateway(网关)**。为了隔离，请运行多个具有隔离配置文件和端口的网关 ([Multiple Gateways](/zh/gateway/multiple-gateways))。
- **Canvas host** 与 Gateway(网关) 提供在同一端口上 (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`)，当绑定超出 Loopback 时受 Gateway(网关) 认证保护。
- **远程访问** 通常通过 SSH 隧道或 Tailscale VPN ([Remote Access](/zh/gateway/remote)) 进行。

关键参考：

- [Gateway(网关) architecture](/zh/concepts/architecture)
- [Gateway(网关) protocol](/zh/gateway/protocol)
- [Gateway(网关) runbook](/zh/gateway)
- [Web surfaces + bind modes](/zh/web)

## 配对 + 身份

- [配对概述 (私信 + 节点)](/zh/channels/pairing)
- [Gateway(网关) 拥有的节点配对](/zh/gateway/pairing)
- [设备 CLI (配对 + token 轮换)](/zh/cli/devices)
- [配对 CLI (私信 批准)](/zh/cli/pairing)

本地信任：

- 直接的本地 Loopback 连接可以自动批准配对，以保持
  同主机体验 的流畅。
- OpenClaw 还有一个狭窄的后端/容器本地自连接路径，用于
  受信任的 shared-secret 辅助流程。
- Tailnet 和 LAN 客户端（包括同主机 Tailnet 绑定）仍然需要
  显式的配对批准。

## 设备发现 + 传输协议

- [设备发现 & 传输协议](/zh/gateway/discovery)
- [Bonjour / mDNS](/zh/gateway/bonjour)
- [远程访问 (SSH)](/zh/gateway/remote)
- [Tailscale](/zh/gateway/tailscale)

## 节点 + 传输协议

- [节点概述](/zh/nodes)
- [桥接协议 (旧节点，历史)](/zh/gateway/bridge-protocol)
- [节点操作手册： iOS](/zh/platforms/ios)
- [节点操作手册： Android](/zh/platforms/android)

## 安全

- [安全概述](/zh/gateway/security)
- [Gateway(网关) 配置参考](/zh/gateway/configuration)
- [故障排除](/zh/gateway/troubleshooting)
- [Doctor](/zh/gateway/doctor)
