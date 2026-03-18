---
summary: "Gateway、節點和 Canvas 主機如何連接。"
read_when:
  - You want a concise view of the Gateway networking model
title: "網路模型"
---

大多數操作流程都通過 Gateway (`openclaw gateway`) 進行，這是一個單一長期執行的
程序，擁有通道連線和 WebSocket 控制平面。

## 核心規則

- 建議每個主機執行一個 Gateway。這是唯一被允許擁有 WhatsApp Web 會話的程序。對於救援機器人或嚴格隔離，請使用隔離的設定檔和連接埠執行多個 gateway。請參閱 [Multiple gateways](/zh-Hant/gateway/multiple-gateways)。
- 優先使用迴路：Gateway WS 預設為 `ws://127.0.0.1:18789`。精靈預設會產生 gateway 權杖，即使對於迴路也是如此。若要進行 tailnet 存取，請執行 `openclaw gateway --bind tailnet --token ...`，因為非迴路綁定需要權杖。
- 節點會根據需要透過 LAN、tailnet 或 SSH 連線到 Gateway WS。舊版 TCP 橋接器已被棄用。
- Canvas 主機由 Gateway HTTP 伺服器在與 Gateway **相同的連接埠** 上提供服務 (預設為 `18789`)：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    當設定 `gateway.auth` 且 Gateway 綁定至超出迴路的範圍時，這些路由會受到 Gateway 驗證的保護。節點用戶端使用與其作用中 WS 會話綁定的節點範圍功能 URL。請參閱 [Gateway configuration](/zh-Hant/gateway/configuration) (`canvasHost`, `gateway`)。
- 遠端使用通常是 SSH 通道或 tailnet VPN。請參閱 [Remote access](/zh-Hant/gateway/remote) 和 [Discovery](/zh-Hant/gateway/discovery)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
