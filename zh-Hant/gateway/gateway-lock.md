---
summary: "使用 WebSocket 監聽器綁定的 Gateway 單例守衛"
read_when:
  - 正在執行或偵錯 Gateway 處理程序
  - 調查單一實例強制執行
title: "Gateway Lock"
---

# Gateway lock

Last updated: 2025-12-11

## Why

- 確保每個主機上的每個基礎連接埠只執行一個 Gateway 實例；額外的 Gateway 必須使用隔離的設定檔和唯一的連接埠。
- 在當機/SIGKILL 中恢復而不會留下過時的鎖定檔案。
- 當控制連接埠已被佔用時，快速失敗並顯示清晰的錯誤訊息。

## Mechanism

- Gateway 在啟動時立即使用獨佔的 TCP 監聽器綁定 WebSocket 監聽器（預設 `ws://127.0.0.1:18789`）。
- 如果綁定失敗並顯示 `EADDRINUSE`，啟動時會拋出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 作業系統會在任何處理程序結束時（包括當機和 SIGKILL）自動釋放監聽器，無需單獨的鎖定檔案或清理步驟。
- 關閉時，Gateway 會關閉 WebSocket 伺服器和底層 HTTP 伺服器以立即釋放連接埠。

## Error surface

- 如果另一個處理程序持有該連接埠，啟動時會拋出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他綁定失敗會顯示為 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## Operational notes

- 如果連接埠被「另一個」處理程序佔用，錯誤訊息是相同的；請釋放連接埠或使用 `openclaw gateway --port <port>` 選擇另一個連接埠。
- macOS 應用程式在產生 Gateway 之前仍然會維護自己輕量級的 PID 守衛；執行時期鎖定是由 WebSocket 綁定強制執行的。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
