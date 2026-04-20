---
summary: "Gateway、節點和 canvas host 如何連線。"
read_when:
  - You want a concise view of the Gateway networking model
title: "網路模型"
---

# 網路模型

> 此內容已合併至 [Network](/zh-Hant/network#core-model)。請參閱該頁面以取得最新指南。

大多數操作都會通過 Gateway (`openclaw gateway`) 流動，這是一個擁有通道連線和 WebSocket 控制平面的單一長期執行程序。

## 核心規則

- 建議每個主機執行一個 Gateway。它是唯一允許擁有 WhatsApp Web 工作階段的程序。對於救援機器人或嚴格隔離，請使用隔離的設定檔和連接埠執行多個 gateway。請參閱 [Multiple gateways](/zh-Hant/gateway/multiple-gateways)。
- 優先使用回環：Gateway WS 預設為 `ws://127.0.0.1:18789`。精靈預設會建立共用金鑰驗證，且通常會產生權杖，即使是回環也是如此。對於非回環存取，請使用有效的 gateway 驗證路徑：共用金鑰權杖/密碼驗證，或是正確設定的非回環 `trusted-proxy` 部署。Tailnet/行動裝置設定通常透過 Tailscale Serve 或其他 `wss://` 端點運作最佳，而不是原始 tailnet `ws://`。
- 節點會根據需要透過 LAN、tailnet 或 SSH 連線至 Gateway WS。
  舊版 TCP 橋接器已被移除。
- Canvas host 是由 Gateway HTTP 伺服器在與 Gateway **相同的連接埠** (預設為 `18789`) 上提供：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    當設定 `gateway.auth` 且 Gateway 繫結至回環以外時，這些路由會受到 Gateway 驗證的保護。節點用戶端使用與其作用中 WS 工作階段繫結的節點範圍功能 URL。請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) (`canvasHost`、`gateway`)。
- 遠端使用通常是 SSH 通道或 tailnet VPN。請參閱 [Remote access](/zh-Hant/gateway/remote) 和 [Discovery](/zh-Hant/gateway/discovery)。
