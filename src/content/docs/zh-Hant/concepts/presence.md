---
summary: "OpenClaw Presence 條目是如何產生、合併與顯示的"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Presence"
---

OpenClaw "presence" 是一個輕量級、盡最大努力提供視角的檢視：

- **Gateway** 本身，以及
- **連接到 Gateway 的客戶端**（mac app、WebChat、CLI 等）

Presence 主要用於渲染 macOS 應用程式的 **Instances** 分頁，並
為操作員提供快速的可見性。

## Presence 欄位（顯示內容）

Presence 條目是具有以下欄位的結構化物件：

- `instanceId` (可選但強烈建議)：穩定的客戶端身分識別 (通常是 `connect.client.instanceId`)
- `host`：易於閱讀的主機名稱
- `ip`：盡最大努力提供的 IP 位址
- `version`：客戶端版本字串
- `deviceFamily` / `modelIdentifier`：硬體提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node`……
- `lastInputSeconds`：「自上次使用者輸入以來的秒數」 (如果已知)
- `reason`：`self`、`connect`、`node-connected`、`periodic`……
- `ts`：最後更新時間戳記 (自紀元以來的毫秒數)

## 生產者（Presence 的來源）

Presence 條目由多個來源產生並且會被 **合併**。

### 1) Gateway 自身條目

Gateway 在啟動時總是會建立一個 "self" 項目，以便 UI 在任何客戶端連線之前
就會顯示 gateway 主機。

### 2) WebSocket 連接

每個 WS 用戶端都以 `connect` 請求開始。在成功握手後，
Gateway 會為該連線 upsert (更新或插入) 一個 presence 項目。

#### 為什麼一次性 CLI 命令不會顯示

CLI 經常為短暫、一次性指令進行連線。為了避免灌水 Instances 列表，
`client.mode === "cli"` **不會** 被轉換為 presence 項目。

### 3) `system-event` beacons

客戶端可以透過 `system-event` 方法發送更豐富的週期性 beacons。Mac
app 使用此方法來回報主機名稱、IP 和 `lastInputSeconds`。

### 4) Node 連接（角色：node）

當節點透過 Gateway WebSocket 以 `role: node` 連線時，Gateway
會為該節點 upsert 一個 presence 項目 (流程與其他 WS 用戶端相同)。

## 合併 + 去重規則 (為什麼 `instanceId` 很重要)

Presence 項目儲存在單一記憶體 map 中：

- 項目是以 **presence key** 作為鍵值。
- 最好的金鑰是一個穩定的 `instanceId` (來自 `connect.client.instanceId`)，它能在重新啟動後持續存在。
- 金鑰不區分大小寫。

如果用戶端在沒有穩定 `instanceId` 的情況下重新連線，它可能會顯示為
**重複**的列。

## TTL 與大小限制

Presence 本質上就是暫時性的：

- **TTL：** 超過 5 分鐘的項目會被清除
- **最大項目數：** 200 個（最舊的會先被丟棄）

這能保持列表新鮮，並避免記憶體無限制地增長。

## 遠端/通道 注意事項（Loopback IP）

當用戶端透過 SSH 通道 / 本地端口轉發連線時，Gateway 可能會
將遠端位址視為 `127.0.0.1`。為了避免覆蓋良好的用戶端回報
IP，loopback 遠端位址會被忽略。

## 消費者

### macOS Instances 分頁

macOS 應用程式會呈現 `system-presence` 的輸出，並根據最後一次更新的時間
套用一個小型的狀態
指示器 (Active/Idle/Stale)。

## 除錯提示

- 若要查看原始列表，請對 Gateway 呼叫 `system-presence`。
- 如果您看到重複項目：
  - 確認用戶端在交握時發送了穩定的 `client.instanceId`
  - 確認週期性信標使用了相同的 `instanceId`
  - 檢查源自連線的條目是否缺少 `instanceId`（預期會有重複項）

## 相關內容

<CardGroup cols={2}>
  <Card title="Typing indicators" href="/zh-Hant/concepts/typing-indicators" icon="ellipsis">
    何時發送輸入指示器以及如何調整它們。
  </Card>
  <Card title="Streaming and chunking" href="/zh-Hant/concepts/streaming" icon="bars-staggered">
    外傳串流、分塊以及每個頻道的格式化。
  </Card>
  <Card title="Gateway architecture" href="/zh-Hant/concepts/architecture" icon="diagram-project">
    Gateway 元件以及驅動 presence 更新的 WebSocket 協定。
  </Card>
  <Card title="Gateway protocol" href="/zh-Hant/gateway/protocol" icon="plug">
    `connect`、`system-event` 和 `system-presence` 的傳輸協定。
  </Card>
</CardGroup>
