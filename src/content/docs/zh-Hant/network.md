---
summary: "網路中樞：閘道介面、配對、探索與安全性"
read_when:
  - You need the network architecture + security overview
  - You are debugging local vs tailnet access or pairing
  - You want the canonical list of networking docs
title: "網路"
---

# 網路中樞

此中樞連結了關於 OpenClaw 如何在本地主機、區域網路和 tailnet 中連線、配對及保護裝置的核心文件。

## 核心模型

- [閘架構](/zh-Hant/concepts/architecture)
- [閘道協定](/zh-Hant/gateway/protocol)
- [閘道操作手冊](/zh-Hant/gateway)
- [Web 介面 + 綁定模式](/zh-Hant/web)

## 配對 + 身份

- [配對總覽 (DM + 節點)](/zh-Hant/channels/pairing)
- [閘道擁有的節點配對](/zh-Hant/gateway/pairing)
- [裝置 CLI (配對 + 權杖輪換)](/zh-Hant/cli/devices)
- [配對 CLI (DM 核准)](/zh-Hant/cli/pairing)

本機信任：

- 本機連線（回環或閘道主機自己的 tailnet 位址）可以自動批准配對，以保持同主機的使用者體驗順暢。
- 非本機的 tailnet/LAN 用戶端仍需要明確的配對批准。

## 探索 + 傳輸

- [探索與傳輸](/zh-Hant/gateway/discovery)
- [Bonjour / mDNS](/zh-Hant/gateway/bonjour)
- [遠端存取 (SSH)](/zh-Hant/gateway/remote)
- [Tailscale](/zh-Hant/gateway/tailscale)

## 節點 + 傳輸

- [節點概覽](/zh-Hant/nodes)
- [橋接協定（舊版節點）](/zh-Hant/gateway/bridge-protocol)
- [節點手冊：iOS](/zh-Hant/platforms/ios)
- [節點手冊：Android](/zh-Hant/platforms/android)

## 安全性

- [安全性概覽](/zh-Hant/gateway/security)
- [閘道設定參考](/zh-Hant/gateway/configuration)
- [疑難排解](/zh-Hant/gateway/troubleshooting)
- [診斷](/zh-Hant/gateway/doctor)
