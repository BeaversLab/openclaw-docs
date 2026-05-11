---
summary: "OpenClaw Presence 條目是如何產生、合併與顯示的"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Presence"
---

OpenClaw “presence” 是一個輕量、盡力而為的視圖：

- **Gateway** 本身，以及
- **連接到 Gateway 的客戶端**（mac app、WebChat、CLI 等）

Presence 主要用於渲染 macOS 應用程式的 **Instances** 分頁，並
為操作員提供快速的可見性。

## Presence 欄位（顯示內容）

Presence 條目是具有以下欄位的結構化物件：

- `instanceId`（可選但強烈建議）：穩定的客戶端身分（通常是 `connect.client.instanceId`）
- `host`：人類易讀的主機名稱
- `ip`：盡力而為的 IP 位址
- `version`：客戶端版本字串
- `deviceFamily` / `modelIdentifier`：硬體提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node`，……
- `lastInputSeconds`：「距離上次使用者輸入的秒數」（如果已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic`，……
- `ts`：最後更新時間戳（自紀元以來的毫秒數）

## 生產者（Presence 的來源）

Presence 條目由多個來源產生並且會被 **合併**。

### 1) Gateway 自身條目

Gateway 在啟動時總是會建立一個「自身」條目，以便 UI 在任何客戶端連接之前
就顯示 gateway 主機。

### 2) WebSocket 連接

每個 WS 客戶端都以 `connect` 請求開始。在成功握手後，
Gateway 會為該連接更新或插入一個 presence 條目。

#### 為什麼一次性 CLI 命令不會顯示

CLI 經常為短暫的一次性命令進行連接。為了避免濫發
Instances 列表，`client.mode === "cli"` **不會** 被轉換為 presence 條目。

### 3) `system-event` 信標

客戶端可以透過 `system-event` 方法發送更豐富的週期性信標。Mac
app 使用此方法來報告主機名稱、IP 和 `lastInputSeconds`。

### 4) Node 連接（角色：node）

當節點透過 Gateway WebSocket 連線並帶有 `role: node` 時，Gateway
會為該節點更新或插入一個 presence 項目（流程與其他 WS 客戶端相同）。

## 合併與去重規則（為什麼 `instanceId` 很重要）

Presence 項目儲存在單一個記憶體對應中：

- 項目是以 **presence key** 作為鍵值。
- 最好的鍵值是一個穩定的 `instanceId`（來自 `connect.client.instanceId`），能夠在重啟後持續存在。
- 鍵值不區分大小寫。

如果客戶端重新連線時沒有穩定的 `instanceId`，它可能會顯示為
**重複**的資料列。

## TTL 與大小限制

Presence 本質上就是暫時性的：

- **TTL：** 超過 5 分鐘的項目會被清除
- **最大項目數：** 200 個（最舊的會先被丟棄）

這能保持列表新鮮，並避免記憶體無限制地增長。

## 遠端/通道 注意事項（Loopback IP）

當客戶端透過 SSH 通道 / 本地埠轉發連線時，Gateway
可能會將遠端位址視為 `127.0.0.1`。為了避免覆蓋原本良好的客戶端回報
IP，來自 loopback 的遠端位址會被忽略。

## 消費者

### macOS Instances 分頁

macOS 應用程式會渲染 `system-presence` 的輸出，並根據最後一次更新的時間套用一個小的狀態
指示器（Active/Idle/Stale）。

## 除錯提示

- 若要查看原始列表，請對 Gateway 呼叫 `system-presence`。
- 如果您看到重複項目：
  - 確認客戶端在交握時傳送了穩定的 `client.instanceId`
  - 確認週期性訊號使用了相同的 `instanceId`
  - 檢查由連線衍生的項目是否缺少 `instanceId`（重複是預期的行為）

## 相關內容

- [輸入指示器](/zh-Hant/concepts/typing-indicators)
- [串流與分塊](/zh-Hant/concepts/streaming)
