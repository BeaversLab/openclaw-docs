---
summary: "Gateway、節點和畫布主機的連接方式。"
read_when:
  - You want a concise view of the Gateway networking model
title: "網路模型"
---

# 網路模型

大多數操作都透過 Gateway (`openclaw gateway`) 流轉，這是單一長期執行的處理程序，擁有通道連線和 WebSocket 控制平面。

## 核心規則

- 建議每台主機使用一個 Gateway。這是唯一允許擁有 WhatsApp Web 會話的處理程序。對於救援機器人或嚴格隔離，請使用隔離的設定檔和連接埠執行多個 gateway。請參閱 [Multiple gateways](/zh-Hant/gateway/multiple-gateways)。
- 優先使用回環：Gateway WS 預設為 `ws://127.0.0.1:18789`。精靈預設會產生 gateway token，即使是針對回環。若要進行 tailnet 存取，請執行 `openclaw gateway --bind tailnet --token ...`，因為非回環綁定需要 token。
- 節點根據需要透過 LAN、tailnet 或 SSH 連線到 Gateway WS。舊版的 TCP 橋接器已被棄用。
- Canvas 主機由 Gateway HTTP 伺服器在與 Gateway **相同的連接埠**（預設 `18789`）上提供服務：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    當配置 `gateway.auth` 且 Gateway 綁定到 loopback 以外的位址時，這些路由會受到 Gateway auth 的保護。節點客戶端使用與其作用中 WS session 綁定的節點範圍功能 URL。請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) (`canvasHost`, `gateway`)。
- 遠端使用通常是 SSH 通道或 tailnet VPN。請參閱 [Remote access](/zh-Hant/gateway/remote) 和 [Discovery](/zh-Hant/gateway/discovery)。
