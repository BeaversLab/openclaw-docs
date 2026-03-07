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

- [Gateway architecture](/en/concepts/architecture)
- [Gateway protocol](/en/gateway/protocol)
- [Gateway runbook](/en/gateway)
- [Web surfaces + bind modes](/en/web)

## Pairing + identity

- [Pairing overview (/en/start/pairing)](/start/pairing)
- [Gateway-owned node pairing](/en/gateway/pairing)
- [Devices CLI (/en/cli/devices)](/cli/devices)
- [Pairing CLI (/en/cli/pairing)](/cli/pairing)

Local trust:

- Local connections (loopback or the gateway host’s own tailnet address) can be
  auto‑approved for pairing to keep same‑host UX smooth.
- Non‑local tailnet/LAN clients still require explicit pairing approval.

## Discovery + transports

- [Discovery & transports](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [Remote access (/en/gateway/remote)](/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## Nodes + transports

- [Nodes overview](/en/nodes)
- [Bridge protocol (/en/gateway/bridge-protocol)](/gateway/bridge-protocol)
- [Node runbook: iOS](/en/platforms/ios)
- [Node runbook: Android](/en/platforms/android)

## Security

- [Security overview](/en/gateway/security)
- [Gateway config reference](/en/gateway/configuration)
- [Troubleshooting](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)
