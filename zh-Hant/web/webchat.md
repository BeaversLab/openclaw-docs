---
summary: "Loopback WebChat 靜態主機與閘道 WS 用於聊天 UI 的使用方式"
read_when:
  - 偵錯或設定 WebChat 存取
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

- UI 連線至閘道 WebSocket 並使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 為了穩定性而有界限：閘道可能會截斷長文字欄位、省略龐大的元資料，並將過大的項目替換為 `[chat.history omitted: message too large]`。
- `chat.inject` 會直接將助理註解附加到對話記錄，並將其廣播至 UI (不執行代理程式)。
- 已中止的執行可讓部分助理輸出在 UI 中保持可見。
- 當存在緩衝輸出時，閘道會將中止的部分助理文字儲存到逐字稿歷史，並以中止中繼資料標記這些項目。
- 歷史記錄一律從閘道擷取（不監看本機檔案）。
- 如果閘道無法連線，WebChat 會變成唯讀。

## Control UI agents tools panel

- 控制 UI `/agents` 工具面板會透過 `tools.catalog` 取得執行階段目錄，並將每個
  工具標記為 `core` 或 `plugin:<id>` (對於選用外掛程式工具則加上 `optional`)。
- 如果無法使用 `tools.catalog`，面板會改用內建的靜態清單。
- 面板會編輯設定檔與覆寫設定，但有效的執行階段存取仍遵循原則
  優先順序 (`allow`/`deny`，各代理程式與供應商/通道覆寫)。

## 遠端使用

- 遠端模式透過 SSH/Tailscale 隧道傳輸閘道 WebSocket。
- 您不需要執行個別的 WebChat 伺服器。

## 配置參考 (WebChat)

完整設定：[設定](/zh-Hant/gateway/configuration)

通道選項：

- 沒有專用的 `webchat.*` 區塊。WebChat 使用下列的閘道端點與驗證設定。

相關的全域選項：

- `gateway.port`、`gateway.bind`：WebSocket 主機/連接埠。
- `gateway.auth.mode`、`gateway.auth.token`、`gateway.auth.password`：WebSocket 驗證 (權杖/密碼)。
- `gateway.auth.mode: "trusted-proxy"`：瀏覽器用戶端的反向代理驗證 (請參閱 [信任的代理驗證](/zh-Hant/gateway/trusted-proxy-auth))。
- `gateway.remote.url`、`gateway.remote.token`、`gateway.remote.password`：遠端閘道目標。
- `session.*`：會話儲存與主要金鑰預設值。

import en from "/components/footer/en.mdx";

<en />
