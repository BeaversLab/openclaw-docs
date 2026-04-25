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

Most operations flow through the Gateway (`openclaw gateway`), a single long-running process that owns channel connections and the WebSocket control plane.

- **Loopback first**: the Gateway WS defaults to `ws://127.0.0.1:18789`.
  Non-loopback binds require a valid gateway auth path: shared-secret
  token/password auth, or a correctly configured non-loopback
  `trusted-proxy` deployment.
- **One Gateway per host** is recommended. For isolation, run multiple gateways with isolated profiles and ports ([Multiple Gateways](/en/gateway/multiple-gateways)).
- **Canvas host** is served on the same port as the Gateway (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`), protected by Gateway auth when bound beyond loopback.
- **Remote access** is typically SSH tunnel or Tailscale VPN ([Remote Access](/en/gateway/remote)).

Key references:

- [Gateway architecture](/en/concepts/architecture)
- [Gateway protocol](/en/gateway/protocol)
- [Gateway runbook](/en/gateway)
- [Web surfaces + bind modes](/en/web)

## Pairing + identity

- [Pairing overview (DM + nodes)](/en/channels/pairing)
- [Gateway-owned node pairing](/en/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/en/cli/devices)
- [Pairing CLI (DM approvals)](/en/cli/pairing)

Local trust:

- Direct local loopback connects can be auto-approved for pairing to keep
  same-host UX smooth.
- OpenClaw also has a narrow backend/container-local self-connect path for
  trusted shared-secret helper flows.
- Tailnet and LAN clients, including same-host tailnet binds, still require
  explicit pairing approval.

## Discovery + transports

- [Discovery & transports](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [Remote access (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## Nodes + transports

- [Nodes overview](/en/nodes)
- [Bridge protocol (legacy nodes, historical)](/en/gateway/bridge-protocol)
- [Node runbook: iOS](/en/platforms/ios)
- [Node runbook: Android](/en/platforms/android)

## Security

- [Security overview](/en/gateway/security)
- [Gateway config reference](/en/gateway/configuration)
- [Troubleshooting](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)

## Related

- [Gateway network model](/en/gateway/network-model)
- [Remote access](/en/gateway/remote)
