---
summary: "歷史橋接協定 (舊版節點): TCP JSONL、配對、範圍限定 RPC"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "橋接協定"
---

# 橋接協定（舊版節點傳輸）

<Warning>TCP 橋接器已被移除。目前的 OpenClaw 建構版本不隨附橋接器監聽器，且 `bridge.*` 設定金鑰已不再位於架構中。此頁面僅供歷史參考。對於所有節點/操作員用戶端，請使用 [Gateway Protocol](/en/gateway/protocol)。</Warning>

## 為何存在

- **安全邊界**：橋接公開的是小型允許清單，而非
  完整的 Gateway API 表面。
- **配對 + 節點身分**：節點准入由 Gateway 管理，並綁定
  到各節點的 Token。
- **發現體驗**：節點可以透過 LAN 上的 Bonjour 發現 Gateway，或透過
  Tailnet 直接連接。
- **回環 WS**：完整的 WS 控制平面保持本機運作，除非透過 SSH 通道傳輸。

## 傳輸

- TCP，每行一個 JSON 物件 (JSONL)。
- 選用 TLS (當 `bridge.tls.enabled` 為 true 時)。
- 歷史預設監聽連接埠為 `18790` (目前的建構版本不會啟動
  TCP 橋接器)。

啟用 TLS 時，發現 TXT 記錄會包含 `bridgeTls=1` 加上
`bridgeTlsSha256` 作為非秘密提示。請注意，Bonjour/mDNS TXT 記錄是
未經驗證的；在沒有明確的使用者意圖或其他帶外驗證的情況下，客戶端
不得將宣傳的指紋視為權威性標記。

## 交握 + 配對

1. 客戶端發送 `hello`，包含節點中繼資料 + Token (如果已配對)。
2. 如果未配對，Gateway 回覆 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 客戶端發送 `pair-request`。
4. Gateway 等待批准，然後發送 `pair-ok` 和 `hello-ok`。

歷史上，`hello-ok` 會傳回 `serverName` 並且可能包含
`canvasHostUrl`。

## 框架

客戶端 → Gateway：

- `req` / `res`：範圍限定的 Gateway RPC (chat, sessions, config, health, voicewake, skills.bins)
- `event`：節點訊號 (voice transcript, agent request, chat subscribe, exec lifecycle)

Gateway → 客戶端：

- `invoke` / `invoke-res`: 節點指令 (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event`: 已訂閱工作階段的聊天更新
- `ping` / `pong`: 保持連線

舊版允許清單強制執行位於 `src/gateway/server-bridge.ts` (已移除)。

## Exec 生命週期事件

節點可以發出 `exec.finished` 或 `exec.denied` 事件來呈現 system.run 活動。
這些會對應到閘道中的系統事件。(舊版節點可能仍會發出 `exec.started`。)

Payload 欄位 (除非另有說明，否則皆為選用)：

- `sessionKey` (必填): 接收系統事件的代理程式工作階段。
- `runId`: 用於分組的唯一 exec ID。
- `command`: 原始或格式化的指令字串。
- `exitCode`, `timedOut`, `success`, `output`: 完成詳情 (僅限 finished)。
- `reason`: 拒絕原因 (僅限 denied)。

## 歷史 tailnet 用法

- 將橋接器綁定到 tailnet IP：在 `~/.openclaw/openclaw.json` 中設定 `bridge.bind: "tailnet"` (僅限歷史用途；`bridge.*` 不再有效)。
- 用戶端透過 MagicDNS 名稱或 tailnet IP 進行連線。
- Bonjour **不會**跨網路傳播；視需要使用手動主機/連接埠或廣域 DNS‑SD。

## 版本控制

橋接器屬於 **隱含 v1** (無最小/最大協商)。本節僅供歷史參考；目前的節點/操作員用戶端使用 WebSocket
[Gateway Protocol](/en/gateway/protocol)。
