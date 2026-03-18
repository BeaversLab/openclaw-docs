---
summary: "Loopback WebChat 靜態主機與 Gateway WS 用於聊天 UI"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

# WebChat (Gateway WebSocket UI)

狀態：macOS/iOS SwiftUI 聊天 UI 直接與 Gateway WebSocket 通訊。

## 簡介

- 閘道的原生聊天 UI（無內嵌瀏覽器，無本機靜態伺服器）。
- 使用與其他管道相同的會話與路由規則。
- 確定性路由：回覆一律傳回 WebChat。

## 快速開始

1. 啟動閘道。
2. 開啟 WebChat UI (macOS/iOS 應用程式) 或 Control UI 的聊天分頁。
3. 確保已設定閘道驗證（預設為必要，即使在 loopback）。

## 運作方式 (行為)

- UI 連線至 Gateway WebSocket 並使用 `chat.history`、`chat.send` 與 `chat.inject`。
- `chat.history` 為維護穩定性而有上限：閘道可能會截斷長文字欄位、省略繁重中繼資料，並以 `[chat.history omitted: message too large]` 取代過大項目。
- `chat.inject` 會將助理備註直接附加到逐字稿並廣播至 UI（無 agent 執行）。
- 已中止的執行可讓部分助理輸出在 UI 中保持可見。
- 當存在緩衝輸出時，閘道會將中止的部分助理文字儲存到逐字稿歷史，並以中止中繼資料標記這些項目。
- 歷史記錄一律從閘道擷取（不監看本機檔案）。
- 如果閘道無法連線，WebChat 會變成唯讀。

## Control UI agents tools panel

- Control UI `/agents` Tools 面板透過 `tools.catalog` 擷取執行時期目錄，並將每個
  工具標記為 `core` 或 `plugin:<id>`（外加選用外掛工具的 `optional`）。
- 如果無法使用 `tools.catalog`，面板會退回至內建的靜態清單。
- 面板會編輯 profile 與覆寫設定，但實際執行時期存取仍遵循原則
  優先順序（`allow`/`deny`、個別 agent 與 provider/channel 覆寫）。

## 遠端使用

- 遠端模式透過 SSH/Tailscale 隧道傳輸閘道 WebSocket。
- 您不需要執行個別的 WebChat 伺服器。

## 配置參考 (WebChat)

完整配置：[配置](/zh-Hant/gateway/configuration)

通道選項：

- 沒有專用的 `webchat.*` 區塊。WebChat 使用下方的網關端點 + 身分驗證設定。

相關的全域選項：

- `gateway.port`, `gateway.bind`：WebSocket 主機/連接埠。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`：WebSocket 身分驗證 (token/password)。
- `gateway.auth.mode: "trusted-proxy"`：瀏覽器客戶端的反向代理身分驗證 (請參閱 [Trusted Proxy Auth](/zh-Hant/gateway/trusted-proxy-auth))。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：遠端網關目標。
- `session.*`：會話儲存和主金鑰預設值。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
