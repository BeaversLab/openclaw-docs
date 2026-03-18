---
summary: "使用 WebSocket 監聽器綁定的 Gateway 單例守衛"
read_when:
  - Running or debugging the gateway process
  - Investigating single-instance enforcement
title: "Gateway Lock"
---

# Gateway Lock

Last updated: 2025-12-11

## 原因

- 確保同一主機上每個基埠只運行一個 Gateway 實例；額外的 Gateway 必須使用隔離的設定檔和唯一的埠號。
- 在崩潰/SIGKILL 後恢復而不留下過期的鎖定檔案。
- 當控制埠已被佔用時，立即以明確的錯誤失敗。

## 機制

- Gateway 在啟動時立即使用獨佔的 TCP 監聽器綁定 WebSocket 監聽器（預設 `ws://127.0.0.1:18789`）。
- 如果綁定因 `EADDRINUSE` 而失敗，啟動過程會拋出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 作業系統會在任何程序退出時（包括崩潰和 SIGKILL）自動釋放監聽器——不需要單獨的鎖定檔案或清理步驟。
- 在關閉時，Gateway 會關閉 WebSocket 伺服器和底層的 HTTP 伺服器以迅速釋放埠號。

## 錯誤範圍

- 如果另一個程序佔用了該埠號，啟動過程會拋出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他綁定失敗會顯示為 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 操作備註

- 如果該埠號被*另一個*程序佔用，錯誤訊息相同；請釋放該埠號或使用 `openclaw gateway --port <port>` 選擇另一個埠號。
- macOS 應用程式在產生 Gateway 之前仍然維護其自己的輕量級 PID 守衛；執行時鎖定由 WebSocket 綁定強制執行。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
