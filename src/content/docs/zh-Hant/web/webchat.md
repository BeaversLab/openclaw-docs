---
summary: "Loopback WebChat 靜態主機與 Gateway WS 用於聊天 UI"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

# WebChat (Gateway WebSocket UI)

狀態：macOS/iOS SwiftUI 聊天 UI 直接與 Gateway WebSocket 通訊。

## 它是什麼

- Gateway 的原生聊天 UI（無嵌入式瀏覽器且無本地靜態伺服器）。
- 使用與其他通道相同的會話和路由規則。
- 確定性路由：回覆始終會發送回 WebChat。

## 快速入門

1. 啟動 gateway。
2. 開啟 WebChat UI (macOS/iOS 應用程式) 或 Control UI 的聊天分頁。
3. 確保已設定 gateway 驗證（預設為必填，即使在 loopback 上）。

## 運作方式 (行為)

- UI 連接到 Gateway WebSocket 並使用 `chat.history`、`chat.send` 和 `chat.inject`。
- `chat.history` 為了穩定性而有邊界限制：Gateway 可能會截斷長文字欄位、省略繁重的元數據，並將過大的項目替換為 `[chat.history omitted: message too large]`。
- `chat.inject` 會直接將助理備註附加到逐字稿並廣播至 UI (無 agent 執行)。
- 中止的執行可以保持部分助理輸出在 UI 中可見。
- 當存在緩衝輸出時，Gateway 會將中止的部分助理文字持久化到逐字稿歷史中，並用中止元數據標記這些項目。
- 歷史記錄始終從 gateway 獲取（無本地檔案監控）。
- 如果 gateway 無法連線，WebChat 將為唯讀。

## Control UI agents 工具面板

- Control UI `/agents` 工具面板有兩個不同的視圖：
  - **現時可用** 使用 `tools.effective(sessionKey=...)` 並顯示當前會話在執行時實際可使用的內容，包括核心、外掛程式和通道擁有的工具。
  - **工具配置** 使用 `tools.catalog` 並專注於設定檔、覆蓋和目錄語義。
- 執行時可用性是會話範圍的。在同一 agent 上切換會話可能會改變 **現時可用** 列表。
- 配置編輯器並不意味著執行時可用性；有效存取仍遵循策略優先順序 (`allow`/`deny`、每個 agent 與提供者/通道覆蓋)。

## 遠端使用

- 遠端模式透過 SSH/Tailscale 隧道傳輸閘道 WebSocket。
- 您不需要執行獨立的 WebChat 伺服器。

## 組態參考 (WebChat)

完整組態：[Configuration](/en/gateway/configuration)

通道選項：

- 沒有專屬的 `webchat.*` 區塊。WebChat 使用下方的閘道端點與驗證設定。

相關全域選項：

- `gateway.port`, `gateway.bind`：WebSocket 主機/連接埠。
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password`：WebSocket 驗證 (token/password)。
- `gateway.auth.mode: "trusted-proxy"`：瀏覽器客戶端的反向代理驗證 (請參閱 [Trusted Proxy Auth](/en/gateway/trusted-proxy-auth))。
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password`：遠端閘道目標。
- `session.*`：會話儲存與主要金鑰預設值。
