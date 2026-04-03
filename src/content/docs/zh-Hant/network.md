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

大多數操作通過 Gateway (`openclaw gateway`) 進行，這是一個單一的長時間運行進程，擁有通道連接和 WebSocket 控制平面。

- **優先使用回環**：Gateway WS 默認綁定到 `ws://127.0.0.1:18789`。非回環綁定需要 Token。
- 建議**每台主機運行一個 Gateway**。為了隔離，請使用隔離的配置文件和端口運行多個網關 ([Multiple Gateways](/en/gateway/multiple-gateways))。
- **Canvas 主機** 與 Gateway (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`) 服務於同一端口，當綁定到回環之外的地址時，受 Gateway 認證保護。
- **遠端存取** 通常使用 SSH 隧道或 Tailscale VPN ([Remote Access](/en/gateway/remote))。

關鍵參考：

- [Gateway architecture](/en/concepts/architecture)
- [Gateway protocol](/en/gateway/protocol)
- [Gateway runbook](/en/gateway)
- [Web surfaces + bind modes](/en/web)

## 配對 + 身份

- [Pairing overview (DM + nodes)](/en/channels/pairing)
- [Gateway-owned node pairing](/en/gateway/pairing)
- [Devices CLI (pairing + token rotation)](/en/cli/devices)
- [Pairing CLI (DM approvals)](/en/cli/pairing)

本地信任：

- 本地連接（回環或網關主機自己的 tailnet 位址）可以
  自動批准配對，以保持同主機 UX 流暢。
- 非本地 tailnet/LAN 客戶端仍需要明確的配對批准。

## 發現 + 傳輸

- [Discovery & transports](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [Remote access (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## 節點 + 傳輸

- [Nodes overview](/en/nodes)
- [Bridge protocol (legacy nodes)](/en/gateway/bridge-protocol)
- [Node runbook: iOS](/en/platforms/ios)
- [Node runbook: Android](/en/platforms/android)

## 安全性

- [Security overview](/en/gateway/security)
- [Gateway config reference](/en/gateway/configuration)
- [Troubleshooting](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)
