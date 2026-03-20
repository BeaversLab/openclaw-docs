---
summary: "閘道器、節點和畫布主機如何連接。"
read_when:
  - 您想要了解閘道器網路模型的簡要視圖
title: "網路模型"
---

大多數操作通過閘道器 (`openclaw gateway`) 進行，這是一個單一的長期運行
進程，擁有通道連接和 WebSocket 控制平面。

## 核心規則

- 建議每個主機運行一個閘道器。它是唯一允許擁有 WhatsApp Web 會話的進程。對於救援機器人或嚴格隔離，請運行多個具有隔離配置檔案和端口的閘道器。請參閱 [多個閘道器](/zh-Hant/gateway/multiple-gateways)。
- 優先使用回環：閘道器 WS 預設為 `ws://127.0.0.1:18789`。精靈預設會生成閘道器令牌，即使對於回環也是如此。對於 tailnet 訪問，請運行 `openclaw gateway --bind tailnet --token ...`，因為非回環綁定需要令牌。
- 節點會根據需要透過 LAN、tailnet 或 SSH 連線到 Gateway WS。舊版 TCP 橋接器已被棄用。
- 畫布主機由閘道器 HTTP 伺服器提供服務，使用與閘道器**相同的端口**（預設 `18789`）：
  - `/__openclaw__/canvas/`
  - `/__openclaw__/a2ui/`
    當配置了 `gateway.auth` 且閘道器綁定到回環之外時，這些路由由閘道器身份驗證保護。節點客戶端使用綁定到其活動 WS 會話的節點作用域功能 URL。請參閱 [閘道器配置](/zh-Hant/gateway/configuration) (`canvasHost`, `gateway`)。
- 遠端使用通常是 SSH 隧道或 tailnet VPN。請參閱 [遠端訪問](/zh-Hant/gateway/remote) 和 [發現](/zh-Hant/gateway/discovery)。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
