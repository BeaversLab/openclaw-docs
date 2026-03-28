---
summary: "OpenClaw Presence 項目如何產生、合併與顯示"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Presence"
---

# Presence

OpenClaw 的「presence」是對以下內容的輕量級、盡力而為的檢視：

- **Gateway** 本身，以及
- **連線到 Gateway 的客戶端**（mac app、WebChat、CLI 等）

Presence 主要用於呈現 macOS 應用程式的 **Instances** 分頁，並提供操作員快速的可見性。

## Presence 欄位（顯示內容）

Presence 項目是具有以下欄位的結構化物件：

- `instanceId`（可選但強烈建議）：穩定的客戶端身分（通常為 `connect.client.instanceId`）
- `host`：易於辨識的主機名稱
- `ip`：盡力而為的 IP 位址
- `version`：客戶端版本字串
- `deviceFamily` / `modelIdentifier`：硬體提示
- `mode`： `ui`、 `webchat`、 `cli`、 `backend`、 `probe`、 `test`、 `node`，...
- `lastInputSeconds`：「自上次使用者輸入以來的秒數」（若已知）
- `reason`： `self`、 `connect`、 `node-connected`、 `periodic`，...
- `ts`：最後更新時間戳記（自紀元以來的毫秒數）

## 生產者（Presence 來源）

Presence 項目由多個來源產生並已**合併**。

### 1) Gateway 自身項目

Gateway 總是在啟動時建立一個「self」（自身）條目，以便 UI 在任何客戶端連線之前就能顯示 gateway 主機。

### 2) WebSocket 連線

每個 WS 客戶端都以 `connect` 請求開始。成功握手後，Gateway 會為該連線更新或插入一個 presence 條目。

#### 為什麼一次性 CLI 指令不會顯示

CLI 經常為了短暫的一次性指令而連線。為了避免灌水 Instances 列表，`client.mode === "cli"` **不會** 被轉換為 presence 條目。

### 3) `system-event` beacons

客戶端可以透過 `system-event` 方法發送更豐富的週期性 beacons。Mac app 使用此方式回報主機名稱、IP 和 `lastInputSeconds`。

### 4) Node 連線（角色：node）

當節點透過 Gateway WebSocket 以 `role: node` 連線時，Gateway 會為該節點更新或插入一個 presence 條目（流程與其他 WS 客戶端相同）。

## 合併與去重規則（為什麼 `instanceId` 很重要）

Presence 項目儲存在單一記憶體映射中：

- 項目以 **presence key** 為鍵。
- 最佳鍵值是一個穩定的 `instanceId`（來自 `connect.client.instanceId`），能夠在重啟後保持不變。
- 鍵值不區分大小寫。

如果客戶端在沒有穩定 `instanceId` 的情況下重新連線，它可能會顯示為
**重複** 的列。

## TTL 與大小上限

Presence 本質上是短暫的：

- **TTL：** 超過 5 分鐘的項目會被清除
- **最大項目數：** 200（最舊的優先移除）

這能保持列表的新鮮度並避免記憶體無限制地增長。

## 遠端/通道連線的限制（迴路 IP）

當客戶端透過 SSH 通道 / 本地連接埠轉發連線時，Gateway 可能
會將遠端位址視為 `127.0.0.1`。為了避免覆蓋良好的客戶端回報
IP，迴路遠端位址會被忽略。

## 消費者

### macOS 執行個體分頁

macOS 應用程式會呈現 `system-presence` 的輸出，並根據最後一次更新的時間套用一個小型的狀態指示器（Active/Idle/Stale）。

## 除錯提示

- 若要查看原始清單，請對 Gateway 呼叫 `system-presence`。
- 如果您看到重複項目：
  - 確認客戶端在交握時發送穩定的 `client.instanceId`
  - 確認週期性訊標使用相同的 `instanceId`
  - 檢查衍生自連線的項目是否缺少 `instanceId`（這是預期的重複項目）
