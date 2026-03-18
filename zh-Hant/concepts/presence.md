---
summary: "OpenClaw presence 項目是如何產生、合併與顯示的"
read_when:
  - Debugging the Instances tab
  - Investigating duplicate or stale instance rows
  - Changing gateway WS connect or system-event beacons
title: "Presence"
---

# Presence

OpenClaw「presence」是對以下內容的輕量級、盡力而為的視圖：

- **Gateway** 本身，以及
- **連接到 Gateway 的客戶端**（mac app、WebChat、CLI 等）

Presence 主要用於呈現 macOS 應用程式的 **Instances** 分頁，並提供操作員快速的可見性。

## Presence 欄位（顯示內容）

Presence 項目是包含以下欄位的結構化物件：

- `instanceId`（選填但強烈建議）：穩定的客戶端身分識別（通常為 `connect.client.instanceId`）
- `host`：人類友善的主機名稱
- `ip`：盡力而為的 IP 位址
- `version`：客戶端版本字串
- `deviceFamily` / `modelIdentifier`：硬體提示
- `mode`：`ui`、`webchat`、`cli`、`backend`、`probe`、`test`、`node`，……
- `lastInputSeconds`：「自上次使用者輸入以來的秒數」（若已知）
- `reason`：`self`、`connect`、`node-connected`、`periodic`，……
- `ts`：最後更新時間戳記（自紀元以來的毫秒數）

## 產生者（Presence 的來源）

Presence 項目由多個來源產生並被**合併**。

### 1) Gateway 自身項目

Gateway 總是在啟動時建立一個「自身」項目，以便 UI 在任何客戶端連接之前就顯示 gateway 主機。

### 2) WebSocket 連接

每個 WS 客戶端都以 `connect` 請求開始。在成功交握後，Gateway 會為該連接 upsert 一個 presence 項目。

#### 為什麼一次性 CLI 命令不會顯示

CLI 經常為了短暫的一次性命令而連接。為了避免充斥 Instances 清單，`client.mode === "cli"` **不會**被轉換為 presence 項目。

### 3) `system-event` 信標

用戶端可以透過 `system-event` 方法傳送更豐富的週期性訊標。mac 應用程式使用此方法來回報主機名稱、IP 和 `lastInputSeconds`。

### 4) 節點連線 (角色：node)

當節點透過 Gateway WebSocket 以 `role: node` 連線時，Gateway 會為該節點更新一個 presence 項目 (與其他 WS 用戶端的流程相同)。

## 合併與去重規則 (為什麼 `instanceId` 很重要)

Presence 項目儲存在單一的記憶體映射中：

- 項目是以 **presence key** 作為鍵值。
- 最佳鍵值是一個穩定的 `instanceId` (來自 `connect.client.instanceId`)，能在重啟後保持不變。
- 鍵值不區分大小寫。

如果用戶端在沒有穩定 `instanceId` 的情況下重新連線，它可能會顯示為**重複**的列。

## TTL 與大小限制

Presence 本質上是暫時性的：

- **TTL:** 超過 5 分鐘的項目會被修剪
- **最大項目數:** 200 (最舊的項目會先被捨棄)

這能保持列表的新鮮度並避免無限制的記憶體增長。

## 遠端/通道注意事項 (Loopback IP)

當用戶端透過 SSH 通道 / 本地連接埠轉發連線時，Gateway 可能會將遠端位址視為 `127.0.0.1`。為了避免覆蓋良好的用戶端回報 IP，loopback 遠端位址會被忽略。

## 消費者

### macOS Instances 分頁

macOS 應用程式會呈現 `system-presence` 的輸出，並根據最後更新的時間套用一個小的狀態指示器 (Active/Idle/Stale)。

## 除錯提示

- 若要查看原始列表，請對 Gateway 呼叫 `system-presence`。
- 如果您看到重複項目：
  - 請確認用戶端在交握時傳送了穩定的 `client.instanceId`
  - 請確認週期性訊標使用了相同的 `instanceId`
  - 檢查連線衍生的項目是否缺少 `instanceId` (這是預期的重複情況)

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
