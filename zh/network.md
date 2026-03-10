---
summary: "网络中心:Gateway 界面、配对、发现和安全"
read_when:
  - "You need the network architecture + security overview"
  - "You are debugging local vs tailnet access or pairing"
  - "You want the canonical list of networking docs"
title: "网络"
---

# 网络中心

此中心链接核心文档，介绍 OpenClaw 如何跨 localhost、LAN 和 tailnet 连接、配对和保护设备。

## 核心模型

- [Gateway 架构](/zh/concepts/architecture)
- [Gateway 协议](/zh/gateway/protocol)
- [Gateway 运行手册](/zh/gateway)
- [Web 界面 + 绑定模式](/zh/web)

## 配对 + 身份

- [配对概述 (DM + 节点)](/zh/start/pairing)
- [Gateway 拥有的节点配对](/zh/gateway/pairing)
- [设备 CLI (配对 + 令牌轮换)](/zh/cli/devices)
- [配对 CLI (DM 批准)](/zh/cli/pairing)

本地信任：

- 本地连接（环回或 Gateway 主机自己的 tailnet 地址）可以自动批准配对，以保持同主机 UX 流畅。
- 非本地 tailnet/LAN 客户端仍需要明确的配对批准。

## 发现 + 传输

- [发现与传输](/zh/gateway/discovery)
- [Bonjour / mDNS](/zh/gateway/bonjour)
- [远程访问 (SSH)](/zh/gateway/remote)
- [Tailscale](/zh/gateway/tailscale)

## 节点 + 传输

- [节点概述](/zh/nodes)
- [Bridge 协议 (旧节点)](/zh/gateway/bridge-protocol)
- [节点运行手册：iOS](/zh/platforms/ios)
- [节点运行手册：Android](/zh/platforms/android)

## 安全

- [安全概述](/zh/gateway/security)
- [Gateway 配置参考](/zh/gateway/configuration)
- [故障排除](/zh/gateway/troubleshooting)
- [诊断工具](/zh/gateway/doctor)
