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

- [Gateway 网关 架构](/zh/en/concepts/architecture)
- [Gateway 网关 协议](/zh/en/gateway/protocol)
- [Gateway 网关 操作手册](/zh/en/gateway)
- [Web 界面 + 绑定模式](/zh/en/web)

## 配对 + 身份

- [配对概述 (私信 + 节点)](/zh/en/channels/pairing)
- [Gateway 网关 拥有的节点配对](/zh/en/gateway/pairing)
- [设备 CLI (配对 + 令牌轮换)](/zh/en/cli/devices)
- [配对 CLI (私信 批准)](/zh/en/cli/pairing)

本地信任：

- 本地连接（环回或网关主机自己的 tailnet 地址）可以
  自动批准配对，以保持同主机用户体验流畅。
- 非本地 tailnet/LAN 客户端仍需要明确的配对批准。

## 发现 + 传输

- [发现与传输](/zh/en/gateway/discovery)
- [Bonjour / mDNS](/zh/en/gateway/bonjour)
- [远程访问 (SSH)](/zh/en/gateway/remote)
- [Tailscale](/zh/en/gateway/tailscale)

## 节点 + 传输

- [节点概述](/zh/en/nodes)
- [桥接协议 (旧版节点)](/zh/en/gateway/bridge-protocol)
- [节点操作手册：iOS](/zh/en/platforms/ios)
- [节点操作手册：Android](/zh/en/platforms/android)

## 安全

- [安全概述](/zh/en/gateway/security)
- [Gateway 网关 配置参考](/zh/en/gateway/configuration)
- [故障排查](/zh/en/gateway/故障排除)
- [Doctor (诊断工具)](/zh/en/gateway/doctor)

import zh from '/components/footer/zh.mdx';

<zh />
