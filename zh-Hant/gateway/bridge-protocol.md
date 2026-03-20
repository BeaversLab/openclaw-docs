---
summary: "橋接協定 (舊版節點): TCP JSONL, 配對, 範圍限制的 RPC"
read_when:
  - 建構或除錯節點客戶端 (iOS/Android/macOS 節點模式)
  - 調查配對或橋接驗證失敗
  - 稽核閘道公開的節點表面
title: "橋接協定"
---

# 橋接協定 (舊版節點傳輸)

橋接協定是一種 **舊版** (legacy) 節點傳輸 (TCP JSONL)。新的節點客戶端應改用統一的閘道 WebSocket 協定。

如果您正在建構操作員或節點客戶端，請使用
[Gateway protocol](/zh-Hant/gateway/protocol)。

**注意：** 目前的 OpenClaw 建構版本不再附帶 TCP 橋接監聽器；本文檔僅供歷史參考。
舊版 `bridge.*` 設定金鑰已不再是設定架構的一部分。

## 為何我們同時擁有兩者

- **安全邊界：** 橋接公開的是小型允許清單，而非
  完整的閘道 API 表面。
- **配對 + 節點身分：** 節點准入由閘道管理，並綁定
  至每個節點的權杖。
- **探索 UX：** 節點可以透過區域網路上的 Bonjour 探索閘道，或是直接
  透過 tailnet 連線。
- **回送 WS：** 完整的 WS 控制平面保持在本地，除非透過 SSH 通道傳輸。

## 傳輸

- TCP，每行一個 JSON 物件 (JSONL)。
- 選用 TLS (當 `bridge.tls.enabled` 為 true 時)。
- 舊版預設監聽連接埠為 `18790` (目前的建構版本不會啟動 TCP 橋接)。

當啟用 TLS 時，探索 TXT 記錄包含 `bridgeTls=1` 加上
`bridgeTlsSha256` 作為非秘密提示。請注意，Bonjour/mDNS TXT 記錄是
未經驗證的；客戶端若未經明確的使用者意圖或其他帶外驗證，
不得將廣告的指紋視為權威的釘選 (pin)。

## 交握 + 配對

1. 客戶端發送 `hello`，其中包含節點中繼資料 + 權杖 (如果已配對)。
2. 若未配對，閘道回覆 `error` (`NOT_PAIRED`/`UNAUTHORIZED`)。
3. 客戶端發送 `pair-request`。
4. 閘道等待批准，然後發送 `pair-ok` 和 `hello-ok`。

`hello-ok` 會回傳 `serverName`，並可能包含 `canvasHostUrl`。

## 框架

用戶端 → 閘道：

- `req` / `res`：具範圍的閘道 RPC（聊天、工作階段、設定、健康狀態、語音喚醒、skills.bins）
- `event`：節點訊號（語音轉錄、代理程式請求、聊天訂閱、執行生命週期）

閘道 → 用戶端：

- `invoke` / `invoke-res`：節點指令（`canvas.*`、`camera.*`、`screen.record`、
  `location.get`、`sms.send`）
- `event`：已訂閱工作階段的聊天更新
- `ping` / `pong`：保持連線

舊版允許清單強制執行位於 `src/gateway/server-bridge.ts`（已移除）。

## 執行生命週期事件

節點可以發出 `exec.finished` 或 `exec.denied` 事件來顯示 system.run 活動。
這些會對應到閘道中的系統事件。（舊版節點可能仍會發出 `exec.started`。）

Payload 欄位（除非另有說明，否則皆為選用）：

- `sessionKey`（必要）：用於接收系統事件的代理程式工作階段。
- `runId`：用於分組的唯一 exec id。
- `command`：原始或格式化的指令字串。
- `exitCode`、`timedOut`、`success`、`output`：完成細節（僅限已完成）。
- `reason`：拒絕原因（僅限已拒絕）。

## Tailnet 使用方式

- 將橋接器繫結到 Tailnet IP：`bridge.bind: "tailnet"` 於
  `~/.openclaw/openclaw.json` 中。
- 用戶端透過 MagicDNS 名稱或 Tailnet IP 進行連線。
- Bonjour **不會**跨越網路；如有需要，請使用手動主機/連接埠或廣域 DNS‑SD。

## 版本控制

橋接器目前為 **隱含 v1**（無最小/最大協商）。預期具有向後相容性；
在任何重大變更之前，請新增橋接器協定版本欄位。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
