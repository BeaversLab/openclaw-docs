---
summary: "Gateway、節點和 canvas host 如何連線。"
read_when:
  - You want a concise view of the Gateway networking model
title: "網路模型"
---

# 網路模型

大多數操作都通過 Gateway (`openclaw gateway`) 進行，這是一個單一的長時間運行進程，擁有通道連線和 WebSocket 控制平面。

## 核心規則

- 建議每個主機執行一個 Gateway。它是唯一被允許擁有 WhatsApp Web 會話的進程。對於救援機器人或嚴格隔離，請執行多個具有獨立設定檔和連接埠的 gateway。請參閱 [Multiple gateways](/en/gateway/multiple-gateways)。
- 優先使用回環：Gateway WS 預設為 `ws://127.0.0.1:18789`。精靈程式預設會產生 gateway token，即使對於回環也是如此。若要進行 tailnet 存取，請執行 `openclaw gateway --bind tailnet --token ...`，因為非回環綁定需要 token。
- 節點根據需要透過 LAN、tailnet 或 SSH 連線到 Gateway WS。舊版 TCP 橋接器已被棄用。
- Canvas host 由 Gateway HTTP 伺服器提供服務，使用與 Gateway **相同的連接埠**（預設為 `18789`）：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    當配置了 `gateway.auth` 且 Gateway 綁定到回環之外時，這些路由會受到 Gateway 驗證的保護。節點客戶端使用與其作用中 WS 會話綁定的節點範圍功能 URL。請參閱 [Gateway configuration](/en/gateway/configuration) (`canvasHost`, `gateway`)。
- 遠端使用通常是 SSH 通道或 tailnet VPN。請參閱 [Remote access](/en/gateway/remote) 和 [Discovery](/en/gateway/discovery)。
