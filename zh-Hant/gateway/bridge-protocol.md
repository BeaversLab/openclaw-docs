---
summary: "橋接協定 (舊版節點): TCP JSONL、配對、範圍限制的 RPC"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "橋接協定"
---

# 橋接協定 (舊版節點傳輸)

橋接協定是一種**舊版**節點傳輸 (TCP JSONL)。新的節點客戶端應改用統一的 Gateway WebSocket 協定。

如果您正在建構 operator 或節點客戶端，請使用
[Gateway 協定](/zh-Hant/gateway/protocol)。

**注意：** 目前的 OpenClaw 版本不再包含 TCP bridge 監聽器；保留此文件僅供歷史參考。
舊版 `bridge.*` 設定鍵已不再是設定綱要的一部分。

## 為何我們同時擁有兩者

- **安全邊界**：bridge 暴露的是小型允許清單，而非
  完整的 Gateway API 表面。
- **配對 + 節點身分**：節點准入是由 gateway 所擁有並綁定
  至每個節點的 token。
- **探索 UX**：節點可以透過區域網路上的 Bonjour 發現 gateway，或透過
  tailnet 直接連線。
- **Loopback WS**：完整的 WS 控制平面向保持在本機，除非透過 SSH 進行通道傳輸。

## 傳輸

- TCP，每行一個 JSON 物件 (JSONL)。
- 選用 TLS (當 `bridge.tls.enabled` 為 true 時)。
- 舊版預設監聽連接埠為 `18790` (目前的版本不會啟動 TCP bridge)。

啟用 TLS 時，探索 TXT 記錄包含 `bridgeTls=1` 加上
`bridgeTlsSha256` 作為非機密提示。請注意 Bonjour/mDNS TXT 記錄是
未經驗證的；客戶端不得在未經明確使用者意圖或其他頻外驗證的情況下，將廣告的指紋視為
權威 pin。

## 交握 + 配對

1. 客戶端發送 `hello`，其中包含節點中繼資料 + token (如果已配對)。
2. 若未配對，gateway 回覆 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 客戶端發送 `pair-request`。
4. Gateway 等待批准，然後發送 `pair-ok` 和 `hello-ok`。

`hello-ok` 傳回 `serverName` 並可能包含 `canvasHostUrl`。

## 訊框

客戶端 → Gateway：

- `req` / `res`：範圍閘道 RPC（聊天、工作階段、設定、健康狀態、語音喚醒、skills.bins）
- `event`：節點訊號（語音轉錄、代理程式請求、聊天訂閱、執行生命週期）

閘道 → 客戶端：

- `invoke` / `invoke-res`：節點指令（`canvas.*`、`camera.*`、`screen.record`、
  `location.get`、`sms.send`）
- `event`：已訂閱工作階段的聊天更新
- `ping` / `pong`：保持活躍

舊版允許清單強制執行曾位於 `src/gateway/server-bridge.ts`（已移除）。

## 執行生命週期事件

節點可以發出 `exec.finished` 或 `exec.denied` 事件，以顯示 system.run 活動。
這些事件會對應到閘道中的系統事件。（舊版節點可能仍會發出 `exec.started`。）

Payload 欄位（除非另有註明，否則皆為選用）：

- `sessionKey`（必填）：接收系統事件的代理程式工作階段。
- `runId`：用於分組的唯一執行 ID。
- `command`：原始或格式化的指令字串。
- `exitCode`、`timedOut`、`success`、`output`：完成詳細資訊（僅限 finished）。
- `reason`：拒絕原因（僅限 denied）。

## Tailnet 使用方式

- 將橋接器綁定到 tailnet IP：`bridge.bind: "tailnet"` 於
  `~/.openclaw/openclaw.json` 中。
- 客戶端透過 MagicDNS 名稱或 tailnet IP 連線。
- Bonjour **不會**跨越網路；必要時請使用手動主機/連接埠或廣域 DNS‑SD。

## 版本控制

Bridge 目前為 **隱含 v1**（無 min/max 協商）。預期具有向後相容性；
在進行任何重大變更之前，請新增 bridge protocol 版本欄位。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
