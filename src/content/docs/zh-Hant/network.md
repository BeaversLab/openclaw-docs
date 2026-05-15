---
summary: "Network hub: gateway surfaces, pairing, discovery, and security"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "Network"
---

此中心頁面連結了關於 OpenClaw 如何在本機主機、區域網路 (LAN) 和 tailnet 上連線、配對及保護裝置的核心文件。

## 核心模型

大多數操作都流經 Gateway (`openclaw gateway`)，這是一個擁有通道連線和 WebSocket 控制平面的單一長時間執行程序。

- **優先使用回送位址 (Loopback first)**：Gateway WS 預設為 `ws://127.0.0.1:18789`。
  非回送位址的綁定需要有效的 gateway 驗證路徑：共用的金鑰
  token/密碼驗證，或正確設定的非回送
  `trusted-proxy` 部署。
- **建議每個主機一個 Gateway**。為了隔離，請使用隔離的設定檔和連接埠執行多個 gateway ([Multiple Gateways](/zh-Hant/gateway/multiple-gateways))。
- **Canvas 主機** 與 Gateway 服務於相同的連接埠 (`/__openclaw__/canvas/`, `/__openclaw__/a2ui/`)，當綁定至回送位址之外時，受 Gateway 驗證保護。
- **遠端存取** 通常透過 SSH 通道或 Tailscale VPN ([Remote Access](/zh-Hant/gateway/remote))。

主要參考資料：

- [Gateway 架構](/zh-Hant/concepts/architecture)
- [Gateway 協定](/zh-Hant/gateway/protocol)
- [Gateway 手冊](/zh-Hant/gateway)
- [Web 介面 + 綁定模式](/zh-Hant/web)

## 配對 + 身份識別

- [配對概覽 (DM + nodes)](/zh-Hant/channels/pairing)
- [Gateway 擁有的節點配對](/zh-Hant/gateway/pairing)
- [裝置 CLI (配對 + token 輪替)](/zh-Hant/cli/devices)
- [配對 CLI (DM 核准)](/zh-Hant/cli/pairing)

本機信任：

- 直接的本機回送連線可以自動核准進行配對，以保持
  同主機的使用者體驗流暢。
- OpenClaw 也有一個狹窄的後端/容器本機自我連線路徑，用於
  受信任的共用金鑰輔助流程。
- Tailnet 和 LAN 用戶端，包括同主機 tailnet 綁定，仍然需要
  明確的配對核准。

## 探索 + 傳輸

- [探索與傳輸](/zh-Hant/gateway/discovery)
- [Bonjour / mDNS](/zh-Hant/gateway/bonjour)
- [遠端存取 (SSH)](/zh-Hant/gateway/remote)
- [Tailscale](/zh-Hant/gateway/tailscale)

## 節點 + 傳輸

- [節點概覽](/zh-Hant/nodes)
- [橋接協議（舊版節點，歷史）](/zh-Hant/gateway/bridge-protocol)
- [節點操作手冊：iOS](/zh-Hant/platforms/ios)
- [節點操作手冊：Android](/zh-Hant/platforms/android)

## 安全性

- [安全性概覽](/zh-Hant/gateway/security)
- [Gateway 設定參考](/zh-Hant/gateway/configuration)
- [疑難排解](/zh-Hant/gateway/troubleshooting)
- [Doctor](/zh-Hant/gateway/doctor)

## 相關

- [Gateway 操作手冊](/zh-Hant/gateway)
- [遠端存取](/zh-Hant/gateway/remote)
