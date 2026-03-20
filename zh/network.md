---
summary: "网络中心：Gateway(网关) 接口、配对、设备发现和安全"
read_when:
  - 您需要网络架构 + 安全概览
  - 您正在调试本地与 tailnet 访问或配对
  - 您想要网络文档的权威列表
title: "网络"
---

# 网络中心

该中心链接了关于 OpenClaw 如何在本地主机、LAN 和 tailnet 之间连接、配对和保护设备的核心文档。

## 核心模型

- [Gateway(网关) 架构](/zh/concepts/architecture)
- [Gateway(网关) 协议](/zh/gateway/protocol)
- [Gateway(网关) 手册](/zh/gateway)
- [Web 接口 + 绑定模式](/zh/web)

## 配对 + 身份

- [配对概览（私信 + 节点）](/zh/channels/pairing)
- [Gateway(网关) 拥有的节点配对](/zh/gateway/pairing)
- [设备 CLI（配对 + 令牌轮换）](/zh/cli/devices)
- [配对 CLI（私信批准）](/zh/cli/pairing)

本地信任：

- 本地连接（回环或 Gateway(网关) 主机自身的 tailnet 地址）可以自动批准配对，以保持同主机体验的流畅。
- 非本地 tailnet/LAN 客户端仍需要显式的配对批准。

## 设备发现 + 传输协议

- [设备发现 & 传输协议](/zh/gateway/discovery)
- [Bonjour / mDNS](/zh/gateway/bonjour)
- [远程访问 (SSH)](/zh/gateway/remote)
- [Tailscale](/zh/gateway/tailscale)

## 节点 + 传输协议

- [节点概览](/zh/nodes)
- [桥接协议（旧版节点）](/zh/gateway/bridge-protocol)
- [节点手册：iOS](/zh/platforms/ios)
- [节点手册：Android](/zh/platforms/android)

## 安全

- [安全概览](/zh/gateway/security)
- [Gateway(网关) 配置参考](/zh/gateway/configuration)
- [故障排除](/zh/gateway/troubleshooting)
- [诊断工具](/zh/gateway/doctor)

import zh from "/components/footer/zh.mdx";

<zh />
