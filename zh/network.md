---
summary: "网络中心：网关界面、配对、发现和安全"
read_when:
  - "您需要网络架构 + 安全概述"
  - "您正在调试本地与 tailnet 访问或配对"
  - "您想要网络文档的规范列表"
title: "网络"
---

# 网络中心

此中心链接核心文档，介绍 OpenClaw 如何跨 localhost、LAN 和 tailnet 连接、配对和保护设备。

## 核心模型

- [网关架构](/zh/concepts/architecture)
- [网关协议](/zh/gateway/protocol)
- [网关运行手册](/zh/gateway)
- [Web 界面 + 绑定模式](/zh/web)

## 配对 + 身份

- [配对概述 (/en/start/pairing)](/zh/start/pairing)
- [网关拥有的节点配对](/zh/gateway/pairing)
- [设备 CLI (/en/cli/devices)](/zh/cli/devices)
- [配对 CLI (/en/cli/pairing)](/zh/cli/pairing)

本地信任：
- 本地连接（环回或网关主机自己的 tailnet 地址）可以自动批准配对，以保持同主机 UX 流畅。
- 非本地 tailnet/LAN 客户端仍需要明确的配对批准。

## 发现 + 传输

- [发现与传输](/zh/gateway/discovery)
- [Bonjour / mDNS](/zh/gateway/bonjour)
- [远程访问 (/en/gateway/remote)](/zh/gateway/remote)
- [Tailscale](/zh/gateway/tailscale)

## 节点 + 传输

- [节点概述](/zh/nodes)
- [桥接协议 (/en/gateway/bridge-protocol)](/zh/gateway/bridge-protocol)
- [节点运行手册：iOS](/zh/platforms/ios)
- [节点运行手册：Android](/zh/platforms/android)

## 安全

- [安全概述](/zh/gateway/security)
- [网关配置参考](/zh/gateway/configuration)
- [故障排除](/zh/gateway/troubleshooting)
- [诊断工具](/zh/gateway/doctor)
