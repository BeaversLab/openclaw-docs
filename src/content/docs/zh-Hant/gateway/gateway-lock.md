---
summary: "使用 WebSocket 監聽器綁定的閘道單例守衛"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "閘道鎖定"
---

## 原因

- 確保同一主機上每個基礎連接埠只執行一個閘道執行個體；額外的閘道必須使用隔離的設定檔和唯一的連接埠。
- 在當機或 SIGKILL 後恢復正常，且不留下過時的鎖定檔案。
- 當控制連接埠已被佔用時，快速失敗並回報明確的錯誤。

## 機制

- 閘道會在啟動時立即使用獨佔的 TCP 接聽程式來繫結 WebSocket 接聽程式 (預設為 `ws://127.0.0.1:18789`)。
- 如果繫結失敗並傳回 `EADDRINUSE`，啟動過程會擲回 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 作業系統會在任何程序結束時自動釋放接聽程式，包括當機和 SIGKILL——不需要額外的鎖定檔案或清理步驟。
- 在關閉時，閘道會關閉 WebSocket 伺服器和底層 HTTP 伺服器，以迅速釋放連接埠。

## 錯誤情況

- 如果另一個程序佔用該連接埠，啟動過程會擲回 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他繫結失敗會顯示為 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 操作注意事項

- 如果連接埠被「另一個」程序佔用，錯誤訊息相同；請釋放連接埠或使用 `openclaw gateway --port <port>` 選擇另一個連接埠。
- macOS 應用程式在產生閘道之前仍會維護自己的輕量級 PID 防護；執行時期鎖定則由 WebSocket 繫結強制執行。

## 相關

- [多個閘道](/zh-Hant/gateway/multiple-gateways) — 使用唯一連接埠執行多個執行個體
- [疑難排解](/zh-Hant/gateway/troubleshooting) — 診斷 `EADDRINUSE` 和連接埠衝突
