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

- [Gateway 网关 architecture](/en/concepts/architecture)
- [Gateway 网关 protocol](/en/gateway/protocol)
- [Gateway 网关 runbook](/en/gateway)
- [Web surfaces + bind modes](/en/web)

## 配对 + 身份

- [Pairing overview (私信 + nodes)](/en/channels/pairing)
- [Gateway 网关-owned node pairing](/en/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/en/cli/devices)
- [Pairing CLI (私信 approvals)](/en/cli/pairing)

本地信任：

- Local connections (loopback or the gateway host’s own tailnet address) can be
  auto‑approved for pairing to keep same‑host UX smooth.
- Non‑local tailnet/LAN clients still require explicit pairing approval.

## 设备发现 + 传输协议

- [设备发现 & transports](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [Remote access (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## Nodes + transports

- [Nodes overview](/en/nodes)
- [Bridge protocol (legacy nodes)](/en/gateway/bridge-protocol)
- [Node runbook: iOS](/en/platforms/ios)
- [Node runbook: Android](/en/platforms/android)

## Security

- [Security overview](/en/gateway/security)
- [Gateway 网关 config reference](/en/gateway/configuration)
- [Troubleshooting](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)

import zh from '/components/footer/zh.mdx';

<zh />
