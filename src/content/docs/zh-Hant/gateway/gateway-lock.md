---
summary: "使用 WebSocket 監聽器綁定的閘道單例守衛"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Gateway Lock"
---

# Gateway lock

## 原因

- 確保同一主機上每個基底連接埠只執行一個閘道實例；額外的閘道必須使用隔離的設定檔和唯一的連接埠。
- 在當機 / SIGKILL 後存活，而不留過時的鎖定檔案。
- 當控制連接埠已被佔用時，快速失敗並顯示明確的錯誤。

## 機制

- 閘道在啟動時會立即使用獨佔的 TCP 監聽器綁定 WebSocket 監聽器（預設 `ws://127.0.0.1:18789`）。
- 如果綁定失敗並出現 `EADDRINUSE`，啟動過程會擲回 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 作業系統會在任何程序結束時自動釋放監聽器，包括當機和 SIGKILL——不需要額外的鎖定檔案或清理步驟。
- 關閉時，閘道會關閉 WebSocket 伺服器和底層 HTTP 伺服器，以及時釋放連接埠。

## 錯誤範圍

- 如果另一個程序佔用該連接埠，啟動過程會擲回 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他綁定失敗會顯示為 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 操作說明

- 如果連接埠被「另一個」程序佔用，錯誤訊息是一樣的；請釋放該連接埠或使用 `openclaw gateway --port <port>` 選擇另一個連接埠。
- macOS 應用程式在產生閘道之前仍會維護自己的輕量級 PID 防護；執行時期鎖定是由 WebSocket 綁定強制執行的。

## 相關內容

- [Multiple Gateways](/zh-Hant/gateway/multiple-gateways) — 使用唯一連接埠執行多個實例
- [Troubleshooting](/zh-Hant/gateway/troubleshooting) — 診斷 `EADDRINUSE` 和連接埠衝突
