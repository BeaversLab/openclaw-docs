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

- Gateway 首先會在狀態鎖定目錄下取得個別設定的鎖定檔案，並探測已設定的連接埠是否有現有的監聽器。
- 如果記錄的鎖定擁有者已消失、連接埠閒置，或鎖定已過時，啟動程序會收回鎖定並繼續執行。
- 接著 Gateway 會使用獨佔的 TCP 監聽器，來綁定 HTTP/WebSocket 監聽器（預設為 `ws://127.0.0.1:18789`）。
- 如果綁定失敗並發生 `EADDRINUSE`，啟動程序會拋出 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 關機時，Gateway 會關閉 HTTP/WebSocket 伺服器並移除鎖定檔案。

## 錯誤範圍

- 如果另一個程序佔用該連接埠，啟動過程會擲回 `GatewayLockError("another gateway instance is already listening on ws://127.0.0.1:<port>")`。
- 其他綁定失敗會顯示為 `GatewayLockError("failed to bind gateway socket on ws://127.0.0.1:<port>: …")`。

## 操作說明

- 如果連接埠被「另一個」程序佔用，錯誤訊息是一樣的；請釋放該連接埠或使用 `openclaw gateway --port <port>` 選擇另一個連接埠。
- 在服務監督器下，如果新的 Gateway 程序看到現有健康的 `/healthz` 回應者，會讓該程序保持控制權。在 systemd 上，重複的啟動器會以代碼 78 退出，因此預設的 `RestartPreventExitStatus=78` 會停止 `Restart=always` 在鎖定或 `EADDRINUSE` 衝突上循環。如果現有程序從未變為健康狀態，重試次數會受到限制，且啟動程序會因明確的鎖定錯誤而失敗，而不會無限循環。
- macOS 應用程式在產生 Gateway 之前，仍然會維護自己的輕量級 PID 防護；執行時期鎖定則是由鎖定檔案加上 HTTP/WebSocket 綁定來強制執行。

## 相關

- [Multiple Gateways](/zh-Hant/gateway/multiple-gateways) — 使用唯一連接埠執行多個執行個體
- [Troubleshooting](/zh-Hant/gateway/troubleshooting) — 診斷 `EADDRINUSE` 與連接埠衝突
