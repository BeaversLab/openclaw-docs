---
summary: "Network hub: gateway surfaces, pairing, discovery, and security"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "網路"
---

# 網路中心

本中心匯集了 OpenClaw 如何在本地主機、區域網路和 tailnet 中連線、配對及保護裝置的核心文件。

## 核心模型

- [Gateway architecture](/zh-Hant/concepts/architecture)
- [Gateway protocol](/zh-Hant/gateway/protocol)
- [Gateway runbook](/zh-Hant/gateway)
- [Web surfaces + bind modes](/zh-Hant/web)

## 配對 + 身份

- [Pairing overview (DM + nodes)](/zh-Hant/channels/pairing)
- [Gateway-owned node pairing](/zh-Hant/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/zh-Hant/cli/devices)
- [Pairing CLI (DM approvals)](/zh-Hant/cli/pairing)

本機信任：

- 本機連線（迴路或閘道主機自己的 tailnet 位址）可以自動核准配對，以保持同主機的使用者體驗順暢。
- 非本機的 tailnet/LAN 用戶端仍需要明確的配對核准。

## 探索 + 傳輸

- [Discovery & transports](/zh-Hant/gateway/discovery)
- [Bonjour / mDNS](/zh-Hant/gateway/bonjour)
- [Remote access (SSH)](/zh-Hant/gateway/remote)
- [Tailscale](/zh-Hant/gateway/tailscale)

## 節點 + 傳輸

- [Nodes overview](/zh-Hant/nodes)
- [Bridge protocol (legacy nodes)](/zh-Hant/gateway/bridge-protocol)
- [Node runbook: iOS](/zh-Hant/platforms/ios)
- [Node runbook: Android](/zh-Hant/platforms/android)

## 安全性

- [Security overview](/zh-Hant/gateway/security)
- [Gateway config reference](/zh-Hant/gateway/configuration)
- [Troubleshooting](/zh-Hant/gateway/troubleshooting)
- [Doctor](/zh-Hant/gateway/doctor)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
