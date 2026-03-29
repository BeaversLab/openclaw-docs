---
summary: "使用 WebSocket 監聽器綁定的閘道單例守衛"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Gateway Lock"
---

# Gateway lock

Last updated: 2025-12-11

## 原因

- 確保在同一主機上每個基礎連接埠只執行一個閘道執行個體；其他閘道必須使用隔離的設定檔和唯一的連接埠。
- 在當機或 SIGKILL 後仍能正常運作，而不會留下過時的鎖定檔案。
- 當控制連接埠已被佔用時，快速失敗並顯示清楚的錯誤。

## 機制

- 閘道在啟動時會立即使用獨佔的 TCP 監聽器綁定 WebSocket 監聽器（預設為 `ws://127.0.0.1:18789`）。
- 如果綁定失敗並出現 `EADDRINUSE`，啟動時會拋出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 作業系統會在任何程序結束時自動釋放監聽器，包括當機和 SIGKILL——不需要額外的鎖定檔案或清理步驟。
- 在關閉時，閘道會關閉 WebSocket 伺服器和底層 HTTP 伺服器，以迅速釋放連接埠。

## 錯誤情況

- 如果另一個程序佔用了該連接埠，啟動時會拋出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他綁定失敗會以 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")` 顯示。

## 操作說明

- 如果連接埠被*另一個*程序佔用，錯誤訊息相同；請釋放該連接埠，或使用 `openclaw gateway --port <port>` 選擇另一個連接埠。
- macOS 應用程式在產生閘道之前仍會維護自己的輕量級 PID 守衛；執行階段鎖定由 WebSocket 綁定執行。
