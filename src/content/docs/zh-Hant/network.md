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

- **優先使用 Loopback**：Gateway WS 預設為 `ws://127.0.0.1:18789`。
  非 loopback 綁定需要有效的 gateway 驗證路徑：shared-secret token/password 驗證，或正確設定的非 loopback
  `trusted-proxy` 部署。
- 建議**每個主機 (Host) 使用一個 Gateway**。為了隔離，請使用隔離的設定檔和連接埠執行多個 gateway ([Multiple Gateways](/en/gateway/multiple-gateways))。
- **Canvas host** 透過與 Gateway 相同的連接埠 (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`) 提供服務，當綁定至 loopback 以外時受 Gateway 驗證保護。
- **遠端存取** 通常是 SSH tunnel 或 Tailscale VPN ([Remote Access](/en/gateway/remote))。

關鍵參考：

- [Gateway architecture](/en/concepts/architecture)
- [Gateway protocol](/en/gateway/protocol)
- [Gateway runbook](/en/gateway)
- [Web surfaces + bind modes](/en/web)

## 配對 + 身份

- [配對概觀 (DM + nodes)](/en/channels/pairing)
- [Gateway-owned node 配對](/en/gateway/pairing)
- [Devices CLI (配對 + token 輪換)](/en/cli/devices)
- [配對 CLI (DM 核准)](/en/cli/pairing)

本地信任：

- 直接的本機 loopback 連線可以自動核准配對，以保持同主機 (same-host) 的使用者體驗流暢。
- OpenClaw 也有一個狹隘的後端/容器本機自我連線路徑，用於受信任的 shared-secret helper 流程。
- Tailnet 和 LAN 用戶端，包括同主機 tailnet 綁定，仍然需要明確的配對核准。

## 探索 + 傳輸

- [探索 & 傳輸](/en/gateway/discovery)
- [Bonjour / mDNS](/en/gateway/bonjour)
- [遠端存取 (SSH)](/en/gateway/remote)
- [Tailscale](/en/gateway/tailscale)

## Nodes + 傳輸

- [Nodes 概觀](/en/nodes)
- [橋接協定 (舊版 nodes，歷史用途)](/en/gateway/bridge-protocol)
- [Node 手冊：iOS](/en/platforms/ios)
- [Node 手冊：Android](/en/platforms/android)

## 安全性

- [安全性概觀](/en/gateway/security)
- [Gateway 設定參考](/en/gateway/configuration)
- [疑難排解](/en/gateway/troubleshooting)
- [Doctor](/en/gateway/doctor)
