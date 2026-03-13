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

- [网关架构](/en/concepts/architecture)
- [网关协议](/en/gateway/protocol)
- [网关操作手册](/en/gateway)
- [Web 界面 + 绑定模式](/en/web)

## 配对 + 身份

- [配对概述 (DM + 节点)](/en/channels/pairing)
- [网关拥有的节点配对](/en/gateway/pairing)
- [设备 CLI (配对 + 令牌轮换)](/en/cli/devices)
- [配对 CLI (DM 批准)](/en/cli/pairing)

本地信任：

- 本地连接（环回或网关主机自己的 tailnet 地址）可以
  自动批准配对，以保持同主机用户体验流畅。
- 非本地 tailnet/LAN 客户端仍需要明确的配对批准。

## 发现 + 传输

- [发现与传输](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [远程访问 (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## 节点 + 传输

- [节点概述](/en/nodes)
- [桥接协议 (旧版节点)](/en/gateway/bridge-protocol)
- [节点操作手册：iOS](/en/platforms/ios)
- [节点操作手册：Android](/en/platforms/android)

## 安全

- [安全概述](/en/gateway/security)
- [网关配置参考](/en/gateway/configuration)
- [故障排查](/en/gateway/troubleshooting)
- [Doctor (诊断工具)](/en/gateway/doctor)

import zh from '/components/footer/zh.mdx';

<zh />
