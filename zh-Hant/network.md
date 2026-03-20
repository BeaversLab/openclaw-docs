---
summary: "Network hub: gateway surfaces, pairing, discovery, and security"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "Network"
---

# Network hub

This hub links the core docs for how OpenClaw connects, pairs, and secures
devices across localhost, LAN, and tailnet.

## Core model

- [Gateway architecture](/zh-Hant/concepts/architecture)
- [Gateway protocol](/zh-Hant/gateway/protocol)
- [Gateway runbook](/zh-Hant/gateway)
- [Web surfaces + bind modes](/zh-Hant/web)

## Pairing + identity

- [Pairing overview (DM + nodes)](/zh-Hant/channels/pairing)
- [Gateway-owned node pairing](/zh-Hant/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/zh-Hant/cli/devices)
- [Pairing CLI (DM approvals)](/zh-Hant/cli/pairing)

Local trust:

- Local connections (loopback or the gateway host’s own tailnet address) can be
  auto‑approved for pairing to keep same‑host UX smooth.
- Non‑local tailnet/LAN clients still require explicit pairing approval.

## Discovery + transports

- [Discovery & transports](/zh-Hant/gateway/discovery)
- [Bonjour / mDNS](/zh-Hant/gateway/bonjour)
- [Remote access (SSH)](/zh-Hant/gateway/remote)
- [Tailscale](/zh-Hant/gateway/tailscale)

## Nodes + transports

- [Nodes overview](/zh-Hant/nodes)
- [Bridge protocol (legacy nodes)](/zh-Hant/gateway/bridge-protocol)
- [Node runbook: iOS](/zh-Hant/platforms/ios)
- [Node runbook: Android](/zh-Hant/platforms/android)

## Security

- [Security overview](/zh-Hant/gateway/security)
- [Gateway config reference](/zh-Hant/gateway/configuration)
- [Troubleshooting](/zh-Hant/gateway/troubleshooting)
- [Doctor](/zh-Hant/gateway/doctor)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
