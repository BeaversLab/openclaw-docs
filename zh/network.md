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

- [Gateway 网关 architecture](/zh/concepts/architecture)
- [Gateway 网关 protocol](/zh/gateway/protocol)
- [Gateway 网关 runbook](/zh/gateway)
- [Web surfaces + bind modes](/zh/web)

## 配对 + 身份

- [Pairing overview (私信 + nodes)](/zh/channels/pairing)
- [Gateway 网关-owned node pairing](/zh/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/zh/cli/devices)
- [Pairing CLI (私信 approvals)](/zh/cli/pairing)

本地信任：

- Local connections (loopback or the gateway host’s own tailnet address) can be
  auto‑approved for pairing to keep same‑host UX smooth.
- Non‑local tailnet/LAN clients still require explicit pairing approval.

## 设备发现 + 传输协议

- [设备发现 & transports](/zh/gateway/discovery)
- [Bonjour / mDNS](/zh/gateway/bonjour)
- [Remote access (SSH)](/zh/gateway/remote)
- [Tailscale](/zh/gateway/tailscale)

## Nodes + transports

- [Nodes overview](/zh/nodes)
- [Bridge protocol (legacy nodes)](/zh/gateway/bridge-protocol)
- [Node runbook: iOS](/zh/platforms/ios)
- [Node runbook: Android](/zh/platforms/android)

## Security

- [Security overview](/zh/gateway/security)
- [Gateway 网关 config reference](/zh/gateway/configuration)
- [Troubleshooting](/zh/gateway/troubleshooting)
- [Doctor](/zh/gateway/doctor)

import zh from '/components/footer/zh.mdx';

<zh />
