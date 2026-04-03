---
summary: "Gateway、節點和 canvas host 如何連線。"
read_when:
  - You want a concise view of the Gateway networking model
title: "網路模型"
---

# 網路模型

> 此內容已合併至 [Network](/en/network#core-model)。請參閱該頁面以取得最新指南。

大多數操作都會通過 Gateway (`openclaw gateway`) 流動，這是一個擁有通道連線和 WebSocket 控制平面的單一長期執行程序。

## 核心規則

- 建議每台主機執行一個 Gateway。這是唯一允許擁有 WhatsApp Web 會話的程序。對於救援機器人或嚴格隔離，請使用隔離的設定檔和連接埠執行多個 Gateway。請參閱 [Multiple gateways](/en/gateway/multiple-gateways)。
- 優先使用 Loopback：Gateway WS 預設為 `ws://127.0.0.1:18789`。精靈預設會產生 gateway token，即使是用於 loopback。若要透過 tailnet 存取，請執行 `openclaw gateway --bind tailnet --token ...`，因為非 loopback 綁定需要 token。
- 節點會根據需要透過 LAN、tailnet 或 SSH 連線至 Gateway WS。舊版 TCP 橋接器已被棄用。
- Canvas host 是由 Gateway HTTP 伺服器在與 Gateway **相同的連接埠** 上提供服務（預設為 `18789`）：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    當設定 `gateway.auth` 且 Gateway 綁定至 loopback 以外時，這些路由會受到 Gateway auth 的保護。節點客戶端使用與其作用中 WS 會話綁定的節點範圍能力 URL。請參閱 [Gateway configuration](/en/gateway/configuration) (`canvasHost`, `gateway`)。
- 遠端使用通常是 SSH 通道或 tailnet VPN。請參閱 [Remote access](/en/gateway/remote) 和 [Discovery](/en/gateway/discovery)。
