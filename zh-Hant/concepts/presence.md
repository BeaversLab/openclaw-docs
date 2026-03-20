---
summary: "OpenClaw presence 項目是如何產生、合併及顯示的"
read_when:
  - 除錯 Instances 分頁
  - 調查重複或過時的 instance 資料列
  - Changing gateway WS connect or system-event beacons
title: "Presence"
---

# Presence

OpenClaw 的「presence」是一個輕量級、盡最大努力的檢視，對象包含：

- **Gateway** 本身，以及
- **連線到 Gateway 的客戶端**（mac app、WebChat、CLI 等）

Presence 主要用於呈現 macOS 應用程式的 **Instances** 分頁，並提供
操作員快速的可視性。

## Presence 欄位（顯示內容）

Presence 項目是結構化物件，包含如下欄位：

- `instanceId`（可選但強烈建議）：穩定的客戶端身分（通常是 `connect.client.instanceId`）
- `host`：人類友善的主機名稱
- `ip`：盡最大努力的 IP 位址
- `version`：客戶端版本字串
- `deviceFamily` / `modelIdentifier`：硬體提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node`，...
- `lastInputSeconds`：「距離上次使用者輸入的秒數」（如果已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic`，...
- `ts`：最後更新時間戳記（自 epoch 以來的毫秒數）

## 產生者（presence 的來源）

Presence 項目由多個來源產生並經過**合併**。

### 1) Gateway 自身項目

Gateway 總是在啟動時建立一個「self」項目，因此即使在任何客戶端連線之前，
UI 也會顯示 gateway 主機。

### 2) WebSocket 連線

每個 WS 客戶端都從 `connect` 要求開始。在成功交握後，
Gateway 會為該連線 upsert 一個 presence 項目。

#### 為什麼一次性 CLI 指令不會顯示

CLI 通常會連線執行短暫的一次性指令。為避免造成 Instances 清單的干擾，
`client.mode === "cli"` **不會**轉換為 presence 項目。

### 3) `system-event` 信標

客戶端可以透過 `system-event` 方法傳送更豐富的定期信標。macOS 應用程式使用此功能來回報主機名稱、IP 和 `lastInputSeconds`。

### 4) 節點連線 (role: node)

當節點透過帶有 `role: node` 的 Gateway WebSocket 連線時，Gateway 會為該節點更新或插入一個 presence 項目 (流程與其他 WS 客戶端相同)。

## 合併與去重規則 (為什麼 `instanceId` 很重要)

Presence 項目儲存在單一記憶體映射 中：

- 項目以 **presence key** 作為鍵值。
- 最好的鍵值是穩定的 `instanceId` (來自 `connect.client.instanceId`)，能夠在重新啟動後保持不變。
- 鍵值不區分大小寫。

如果客戶端在沒有穩定 `instanceId` 的情況下重新連線，它可能會顯示為**重複**的項目。

## TTL 與大小限制

Presence 是有意設計為暫時性的：

- **TTL：** 超過 5 分鐘的項目會被清除
- **最大項目數：** 200 (最早加入的優先被移除)

這能保持清單的新鮮度，並避免記憶體無限制增長。

## 遠端/通道 注意事項 (loopback IPs)

當客戶端透過 SSH 通道 / 本機埠轉發連線時，Gateway 可能會將遠端位址視為 `127.0.0.1`。為了避免覆蓋良好的客戶端回報 IP，會忽略 loopback 遠端位址。

## 消費者

### macOS Instances 分頁

macOS 應用程式會渲染 `system-presence` 的輸出，並根據最後一次更新的時間套用一個小的狀態指示器 (Active/Idle/Stale)。

## 除錯提示

- 若要查看原始清單，請對 Gateway 呼叫 `system-presence`。
- 如果您看到重複項目：
  - 確認客戶端在交握時發送了穩定的 `client.instanceId`
  - 確認定期信標使用相同的 `instanceId`
  - 檢查來自連線的項目是否缺少 `instanceId` (預期會有重複)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
