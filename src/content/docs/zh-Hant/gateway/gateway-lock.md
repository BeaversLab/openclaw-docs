---
summary: "使用 WebSocket 監聽器綁定的 Gateway 單例防護"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Gateway 鎖"
---

# Gateway 鎖

最後更新：2025-12-11

## 原因

- 確保在同一主機上每個基礎連接埠只運行一個 Gateway 實例；額外的 Gateway 必須使用隔離的設定檔和唯一的連接埠。
- 在崩潰/SIGKILL 後倖存，而不留殘留的鎖定檔案。
- 當控制連接埠已被佔用時，快速失敗並顯示清楚的錯誤。

## 機制

- Gateway 在啟動時立即使用獨佔的 TCP 監聽器綁定 WebSocket 監聽器（預設為 `ws://127.0.0.1:18789`）。
- 如果綁定失敗並回報 `EADDRINUSE`，啟動過程會拋出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 作業系統會在任何程序結束時（包括崩潰和 SIGKILL）自動釋放監聽器——不需要單獨的鎖定檔案或清理步驟。
- 關機時，閘道會關閉 WebSocket 伺服器和底層 HTTP 伺服器，以便立即釋放連接埠。

## 錯誤表面

- 如果另一個程序佔用連接埠，啟動時會擲回 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他綁定失敗會顯示為 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 操作說明

- 如果連接埠被另一個程序佔用，錯誤訊息相同；請釋放連接埠或使用 `openclaw gateway --port <port>` 選擇另一個連接埠。
- macOS 應用程式在產生閘道之前仍會維護自己的輕量級 PID 守衛；執行時期鎖定是由 WebSocket 綁定執行。
