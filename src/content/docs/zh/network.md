---
summary: "网络中心：网关界面、配对、发现和安全"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "网络"
---

此中心链接了关于 OpenClaw 如何在 localhost、LAN 和 tailnet 上连接、配对和保护设备的核心文档。

## 核心模型

大多数操作流经 Gateway(网关) (`openclaw gateway`)，这是一个拥有渠道连接和 WebSocket 控制平面的单一长期运行进程。

- **Loopback first**：Gateway(网关) WS 默认为 `ws://127.0.0.1:18789`。
  非 loopback 绑定需要有效的网关认证路径：共享密钥
  token/密码认证，或正确配置的非 loopback
  `trusted-proxy` 部署。
- **每主机一个 Gateway(网关)** 是推荐的。为了隔离，请使用隔离的配置文件和端口运行多个网关（[Multiple Gateways](/zh/gateway/multiple-gateways)）。
- **Canvas host** 与 Gateway(网关) (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`) 提供在同一端口上，当绑定超出 loopback 时受 Gateway(网关) 认证保护。
- **远程访问** 通常是 SSH 隧道或 Tailscale VPN（[Remote Access](/zh/gateway/remote)）。

关键参考：

- [Gateway(网关) 架构](/zh/concepts/architecture)
- [Gateway(网关) 协议](/zh/gateway/protocol)
- [Gateway(网关) 运维手册](/zh/gateway)
- [Web 界面 + 绑定模式](/zh/web)

## 配对 + 身份

- [配对概述 (私信 + 节点)](/zh/channels/pairing)
- [Gateway(网关) 拥有的节点配对](/zh/gateway/pairing)
- [设备 CLI (配对 + token 轮换)](/zh/cli/devices)
- [配对 CLI (私信 批准)](/zh/cli/pairing)

本地信任：

- 直接 local loopback 连接可以自动批准配对，以保持
  同主机 UX 的流畅。
- OpenClaw 还有一个狭义的后端/容器本地自连接路径，用于
  受信任的共享密钥辅助流。
- Tailnet 和 LAN 客户端，包括同主机 tailnet 绑定，仍然需要
  明确的配对批准。

## 设备发现 + 传输协议

- [设备发现和传输](/zh/gateway/discovery)
- [Bonjour / mDNS](Bonjour/en/gateway/bonjour)
- [远程访问 (SSH)](/zh/gateway/remote)
- [Tailscale](Tailscale/en/gateway/tailscale)

## 节点 + 传输

- [节点概览](/zh/nodes)
- [桥接协议（旧版节点，历史）](/zh/gateway/bridge-protocol)
- [节点操作手册：iOS](iOS/en/platforms/ios)
- [节点操作手册：Android](Android/en/platforms/android)

## 安全

- [安全概览](/zh/gateway/security)
- [Gateway(网关) 配置参考](<Gateway(网关)/en/gateway/configuration>)
- [故障排除](/zh/gateway/troubleshooting)
- [Doctor](/zh/gateway/doctor)

## 相关

- [Gateway(网关) 操作手册](<Gateway(网关)/en/gateway>)
- [远程访问](/zh/gateway/remote)
