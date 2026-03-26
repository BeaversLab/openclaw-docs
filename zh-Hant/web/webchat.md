---
summary: "Loopback WebChat 靜態主機和用於聊天 UI 的 Gateway WS 使用"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

# WebChat (Gateway WebSocket UI)

Status：macOS/iOS SwiftUI 聊天 UI 直接與 Gateway WebSocket 通訊。

## 簡介

- 閘道器的原生聊天 UI（無嵌入式瀏覽器且無本機靜態伺服器）。
- 與其他管道使用相同的會話和路由規則。
- 確定性路由：回覆一律返回至 WebChat。

## 快速開始

1. 啟動閘道器。
2. 開啟 WebChat UI (macOS/iOS 應用程式) 或 Control UI 的聊天分頁。
3. 確保已設定閘道器驗證（預設為必要，即使在 loopback 上）。

## 運作方式（行為）

- UI 連接至 Gateway WebSocket 並使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 為了穩定性而有界限：閘道器可能會截斷長文字欄位、省略沉重的元資料，並以 `[chat.history omitted: message too large]` 取代過大的項目。
- `chat.inject` 會直接將助理備註附加到逐字稿，並將其廣播至 UI（不執行代理程式）。
- 已中止的執行可讓部分助理輸出保持在 UI 中可見。
- 當存在緩衝輸出時，閘道器會將已中止的部分助理文字保存到逐字稿歷史記錄中，並以中止中斷元資料標示這些項目。
- 歷史記錄一律是從閘道器擷取（不監看本機檔案）。
- 如果無法連線至閘道器，WebChat 會變成唯讀狀態。

## Control UI 代理程式工具面板

- Control UI `/agents` 工具面板會透過 `tools.catalog` 擷取執行時期目錄，並將每個工具標示為 `core` 或 `plugin:<id>`（外加 `optional` 用於選用外掛程式工具）。
- 如果 `tools.catalog` 無法使用，面板會改用內建的靜態清單。
- 面板會編輯設定檔和覆寫設定，但有效的執行時期存取仍會遵循原則優先順序（`allow`/`deny`、每個代理程式和提供者/管道覆寫）。

## 遠端使用

- 遠端模式會透過 SSH/Tailscale 透傳閘道器 WebSocket。
- 您不需要執行個別的 WebChat 伺服器。

## 組態參考 (WebChat)

完整組態：[Configuration](/zh-Hant/gateway/configuration)

通道選項：

- 沒有專用的 `webchat.*` 區塊。WebChat 使用下列的 gateway endpoint + auth settings。

相關的全域選項：

- `gateway.port`、`gateway.bind`：WebSocket 主機/連接埠。
- `gateway.auth.mode`、`gateway.auth.token`、`gateway.auth.password`：WebSocket 認證 (token/password)。
- `gateway.auth.mode: "trusted-proxy"`：瀏覽器用戶端的反向代理認證 (請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth))。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：遠端 gateway 目標。
- `session.*`：Session storage 和主金鑰預設值。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
