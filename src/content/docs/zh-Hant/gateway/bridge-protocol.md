---
summary: "歷史橋接協定 (舊版節點): TCP JSONL、配對、範圍限定 RPC"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "橋接協議"
---

<Warning>TCP 橋接器已被**移除**。目前的 OpenClaw 建置版本不包含橋接器監聽器，且 `bridge.*` 設定金鑰已不在架構中。此頁面僅供歷史參考。對於所有節點/操作員客戶端，請使用 [Gateway Protocol](/zh-Hant/gateway/protocol)。</Warning>

## 為何存在

- **安全邊界**：橋接公開的是一份小型允許清單，而非完整的
  gateway API 介面。
- **配對 + 節點身分**：節點准入由 gateway 所有，並與
  每個節點的權杖繫結。
- **探索體驗**：節點可以透過區域網路上的 Bonjour 發現 gateway，或透過
  tailnet 直接連線。
- **回送 WS**：完整的 WS 控制平面保持本機，除非透過 SSH 進行通道傳輸。

## 傳輸

- TCP，每行一個 JSON 物件 (JSONL)。
- 選用 TLS (當 `bridge.tls.enabled` 為 true 時)。
- 歷史預設監聽連接埠為 `18790` (目前的建置版本不會啟動
  TCP 橋接)。

啟用 TLS 時，探索 TXT 記錄會包含 `bridgeTls=1` 加上
`bridgeTlsSha256` 作為非秘密提示。請注意，Bonjour/mDNS TXT 記錄是未經驗證的；
客戶端在沒有明確的使用者意圖或其他頻外驗證的情況下，不得將公開的指紋視為
權威性的釘選。

## 交握 + 配對

1. 客戶端發送 `hello`，其中包含節點中繼資料 + 權杖 (若已配對)。
2. 若未配對，gateway 回覆 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 客戶端發送 `pair-request`。
4. Gateway 等待核准，然後發送 `pair-ok` 和 `hello-ok`。

歷史上，`hello-ok` 曾回傳 `serverName`；託管的外掛介面現在透過 `pluginSurfaceUrls` 公告。Canvas/A2UI 使用 `pluginSurfaceUrls.canvas`；已棄用的 `canvasHostUrl` 別名並非重構後協定的一部分。

## 幀

客戶端 → Gateway：

- `req` / `res`：範圍限定的閘道 RPC (聊天、會話、設定、健康狀態、語音喚醒、skills.bins)
- `event`：節點訊號 (語音文字紀錄、代理請求、聊天訂閱、執行生命週期)

Gateway → 客戶端：

- `invoke` / `invoke-res`：節點指令 (`canvas.*`、`camera.*`、`screen.record`、
  `location.get`、`sms.send`)
- `event`：已訂閱會話的聊天更新
- `ping` / `pong`：保持連線

舊版允許清單執行機制位於 `src/gateway/server-bridge.ts` (已移除)。

## Exec 生命週期事件

節點可以發出 `exec.finished` 或 `exec.denied` 事件以呈現 system.run 活動。
這些會被對應到閘道中的系統事件。(舊版節點可能仍會發出 `exec.started`。)

Payload 欄位（除非另有說明，皆為選填）：

- `sessionKey` (必要)：接收系統事件的代理會話。
- `runId`：用於分組的唯一執行 ID。
- `command`：原始或格式化的指令字串。
- `exitCode`、`timedOut`、`success`、`output`：完成細節 (僅限已完成)。
- `reason`：拒絕原因 (僅限已拒絕)。

## 歷史 tailnet 使用方式

- 將橋接綁定到 tailnet IP：`bridge.bind: "tailnet"` 於
  `~/.openclaw/openclaw.json` 中（僅供歷史參考；`bridge.*` 已不再有效）。
- 用戶端透過 MagicDNS 名稱或 tailnet IP 進行連線。
- Bonjour **不會**跨越網路；必要時請使用手動主機/埠或廣域 DNS-SD。

## 版本控制

該橋接為 **隱式 v1**（無最小/最大版本協商）。本節僅供歷史參考；目前的節點/操作員客戶端使用 WebSocket
[Gateway Protocol](/zh-Hant/gateway/protocol)。

## 相關內容

- [Gateway protocol](/zh-Hant/gateway/protocol)
- [Nodes](/zh-Hant/nodes)
