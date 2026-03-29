---
summary: "OpenClaw Presence 條目是如何產生、合併與顯示的"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Presence"
---

# Presence

OpenClaw「presence」是針對以下內容的一種輕量、盡力而為的視圖：

- **Gateway** 本身，以及
- **連接到 Gateway 的客戶端**（mac app、WebChat、CLI 等）

Presence 主要用於渲染 macOS 應用程式的 **Instances** 標籤頁，並為操作員提供快速的可見性。

## Presence 欄位（顯示內容）

Presence 條目是具有以下欄位的結構化物件：

- `instanceId`（可選但強烈建議）：穩定的客戶端身分識別（通常為 `connect.client.instanceId`）
- `host`：人類易讀的主機名稱
- `ip`：盡力而為的 IP 位址
- `version`：客戶端版本字串
- `deviceFamily` / `modelIdentifier`：硬體提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node`...
- `lastInputSeconds`：「距離上次使用者輸入的秒數」（如果已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic`...
- `ts`：上次更新時間戳（自紀元以來的毫秒數）

## 產生者（Presence 的來源）

Presence 條目由多個來源產生並被**合併**。

### 1) Gateway 自身條目

Gateway 總是在啟動時建立一個「自身」條目，以便 UI 在任何客戶端連接之前就顯示 Gateway 主機。

### 2) WebSocket 連接

每個 WS 客戶端都以 `connect` 請求開始。在成功握手後，Gateway 會為該連接新增或更新一個 Presence 條目。

#### 為什麼一次性 CLI 指令不會顯示

CLI 經常為了簡短、一次性指令進行連接。為避免垃圾訊息淹沒 Instances 列表，`client.mode === "cli"` **不會**被轉換為 Presence 條目。

### 3) `system-event` 訊標

客戶端可以透過 `system-event` 方法傳送更豐富的週期性訊標。mac
app 使用此方法回報主機名稱、IP 和 `lastInputSeconds`。

### 4) 節點連線（角色：node）

當節點透過 Gateway WebSocket 以 `role: node` 連線時，Gateway
會為該節點 upsert 一個 presence 項目（流程與其他 WS 客戶端相同）。

## 合併 + 去重規則（為什麼 `instanceId` 很重要）

Presence 項目儲存在單一記憶體 map 中：

- 項目以 **presence key** 為鍵值。
- 最佳的鍵值是一個穩定的 `instanceId`（來自 `connect.client.instanceId`），能在重啟後保持不變。
- 鍵值不區分大小寫。

如果客戶端在沒有穩定 `instanceId` 的情況下重新連線，它可能會顯示為
**重複** 項目。

## TTL 與有界大小

Presence 是刻意設計為暫時性的：

- **TTL：** 超過 5 分鐘的項目會被修剪
- **最大項目數：** 200（優先捨棄最舊的）

這能保持清單新鮮並避免無限制的記憶體增長。

## 遠端/通道注意事項（Loopback IP）

當客戶端透過 SSH 通道 / 本機連接埠轉發連線時，Gateway 可能
會將遠端位址視為 `127.0.0.1`。為避免覆蓋良好的客戶端回報
IP，loopback 遠端位址會被忽略。

## 消費者

### macOS Instances 分頁

macOS app 會呈現 `system-presence` 的輸出，並根據最後一次更新的時間套用一個小型狀態
指示器（Active/Idle/Stale）。

## 除錯提示

- 若要查看原始清單，請對 Gateway 呼叫 `system-presence`。
- 如果您看到重複項目：
  - 請確認客戶端在交握時傳送了穩定的 `client.instanceId`
  - 請確認週期性訊標使用相同的 `instanceId`
  - 請檢查源自連線的項目是否缺少 `instanceId`（預期會有重複項目）
