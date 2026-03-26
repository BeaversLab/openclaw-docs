---
summary: "橋接協定（舊版節點）：TCP JSONL、配對、限定範圍 RPC"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "橋接協定"
---

# 橋接協定（舊版節點傳輸）

橋接協定是一種**舊版**節點傳輸（TCP JSONL）。新的節點用戶端
應改用統一的 Gateway WebSocket 協定。

如果您正在建構運算器或節點客戶端，請使用
[Gateway 通訊協定](/zh-Hant/gateway/protocol)。

**注意：** 目前的 OpenClaw 版本不再包含 TCP bridge 接聽器；本文件僅供歷史參考。
舊版的 `bridge.*` 設定金鑰已不再是設定綱領的一部分。

## 為什麼我們兩者都有

- **安全性邊界**：bridge 暴露的是一個小型允許清單，而不是
  完整的 gateway API 介面。
- **配對 + 節點身分**：節點准入由閘道管理，並與每個節點的權杖綁定。
- **探索 UX**：節點可以透過區域網路上的 Bonjour 探索閘道，或透過 tailnet 直接連線。
- **Loopback WS**：完整的 WS 控制平面保持在本地，除非透過 SSH 隧道傳輸。

## 傳輸

- TCP，每行一個 JSON 物件 (JSONL)。
- 選用 TLS (當 `bridge.tls.enabled` 為 true 時)。
- 舊版預設監聽連接埠為 `18790`（目前版本不會啟動 TCP bridge）。

啟用 TLS 時，探索 TXT 記錄會包含 `bridgeTls=1` 加上
`bridgeTlsSha256` 作為非機密提示。請注意，Bonjour/mDNS TXT 記錄是
未經驗證的；在未經使用者明確意圖或其他帶外驗證的情況下，用戶端絕不可將
廣告的指紋視為權威的 pin。

## 交握 + 配對

1. 客戶端發送 `hello`，其中包含節點中繼資料 + 權杖（若已配對）。
2. 若尚未配對，閘道會回覆 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 客戶端發送 `pair-request`。
4. 閘道等待批准，然後發送 `pair-ok` 和 `hello-ok`。

`hello-ok` 傳回 `serverName`，且可能包含 `canvasHostUrl`。

## 框架

客戶端 → 閘道：

- `req` / `res`：範圍閘道 RPC (chat, sessions, config, health, voicewake, skills.bins)
- `event`：節點訊號 (voice transcript, agent request, chat subscribe, exec lifecycle)

閘道 → 客戶端：

- `invoke` / `invoke-res`：節點指令 (`canvas.*`, `camera.*`, `screen.record`,
  `location.get`, `sms.send`)
- `event`：已訂閱工作階段的聊天更新
- `ping` / `pong`：保活

舊版允許清單執行位於 `src/gateway/server-bridge.ts`（已移除）。

## Exec 生命週期事件

節點可以發出 `exec.finished` 或 `exec.denied` 事件來呈現 system.run 活動。
這些會對應到閘道中的系統事件。（舊版節點可能仍會發出 `exec.started`。）

Payload 欄位（除非另有說明，否則皆為選用）：

- `sessionKey` (required): agent session to receive the system event.
- `runId`: unique exec id for grouping.
- `command`: raw or formatted command string.
- `exitCode`, `timedOut`, `success`, `output`: completion details (finished only).
- `reason`：拒絕原因（僅限被拒絕時）。

## Tailnet 使用方式

- 將橋接器綁定到 Tailnet IP：`bridge.bind: "tailnet"` 於
  `~/.openclaw/openclaw.json`。
- 用戶端透過 MagicDNS 名稱或 Tailnet IP 進行連線。
- Bonjour **無法**跨越網路；必要時請使用手動主機/埠或廣域 DNS‑SD。

## 版本控制

Bridge 目前為 **implicit v1**（無 min/max 協商）。預期維持向後相容性；
在任何重大變更之前，請新增 bridge protocol version 欄位。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
