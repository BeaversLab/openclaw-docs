---
summary: "橋接協定（舊版節點）：TCP JSONL、配對、範圍 RPC"
read_when:
  - Building or debugging node clients (iOS/Android/macOS node mode)
  - Investigating pairing or bridge auth failures
  - Auditing the node surface exposed by the gateway
title: "橋接協定"
---

# 橋接協定（舊版節點傳輸）

橋接協定是一種**舊版**節點傳輸 (TCP JSONL)。新的節點用戶端
應改用統一的 Gateway WebSocket 協定。

如果您正在建構操作員或節點用戶端，請使用
[Gateway 協定](/en/gateway/protocol)。

**注意：** 目前的 OpenClaw 建置版本不再隨附 TCP 橋接接聽程式；此文件僅供歷史參考。
舊版 `bridge.*` 配置鍵已不再是配置架構的一部分。

## 為什麼我們同時擁有兩者

- **安全邊界**：橋接公開一個小型允許清單，而不是
  完整的 gateway API 表面。
- **配對 + 節點身分識別**：節點准入由 gateway 擁有，並綁定
  到每個節點的權杖。
- **探索 UX**：節點可以透過區域網路上的 Bonjour 發現 gateway，或直接
  透過 tailnet 連線。
- **回送 WS**：完整的 WS 控制平面保持本地，除非透過 SSH 隧道傳輸。

## 傳輸

- TCP，每行一個 JSON 物件 (JSONL)。
- 選用 TLS (當 `bridge.tls.enabled` 為 true 時)。
- 舊版預設接聽連接埠是 `18790` (目前的建置版本不會啟動 TCP 橋接)。

當啟用 TLS 時，探索 TXT 記錄會包含 `bridgeTls=1` 加上
`bridgeTlsSha256` 作為非秘密提示。請注意，Bonjour/mDNS TXT 記錄是
未經驗證的；用戶端不得在沒有明確使用者意圖或其他頻外驗證的情況下，將公開的指紋視為
權威的 pin。

## 交握 + 配對

1. 用戶端發送 `hello` 並包含節點中繼資料 + 權杖 (如果已配對)。
2. 如果未配對，gateway 回覆 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 用戶端發送 `pair-request`。
4. Gateway 等待核准，然後發送 `pair-ok` 和 `hello-ok`。

`hello-ok` 回傳 `serverName` 並且可能包含 `canvasHostUrl`。

## 框架

用戶端 → Gateway：

- `req` / `res`：具作用域的閘道 RPC（聊天、工作階段、設定、健康狀態、語音喚醒、skills.bins）
- `event`：節點訊號（語音文字記錄、代理程式請求、聊天訂閱、執行生命週期）

閘道 → 客戶端：

- `invoke` / `invoke-res`：節點指令（`canvas.*`、`camera.*`、`screen.record`、
  `location.get`、`sms.send`）
- `event`：已訂閱工作階段的聊天更新
- `ping` / `pong`：保持連線

舊版允許清單執行機制位於 `src/gateway/server-bridge.ts`（已移除）。

## 執行生命週期事件

節點可以發出 `exec.finished` 或 `exec.denied` 事件來呈現 system.run 的活動。
這些會對應到閘道中的系統事件。（舊版節點可能仍會發出 `exec.started`。）

Payload 欄位（除非另有說明，否則皆為選用）：

- `sessionKey`（必填）：接收系統事件的代理程式工作階段。
- `runId`：用於分組的唯一執行 ID。
- `command`：原始或格式化的指令字串。
- `exitCode`、`timedOut`、`success`、`output`：完成詳情（僅限已完成的情況）。
- `reason`：拒絕原因（僅限被拒絕的情況）。

## Tailnet 使用

- 將橋接器繫結到 Tailnet IP：在
  `~/.openclaw/openclaw.json` 中設定 `bridge.bind: "tailnet"`。
- 客戶端透過 MagicDNS 名稱或 Tailnet IP 進行連線。
- Bonjour **不會**跨越網路；如有需要，請使用手動主機/連接埠或廣域 DNS‑SD。

## 版本控制

Bridge 目前為 **隱含的 v1**（無最小/最大版本協商）。預期具有向後相容性；
在進行任何重大變更之前，請新增 Bridge 協定版本欄位。
