---
summary: "macOS 應用程式如何回報 Gateway/Baileys 健康狀態"
read_when:
  - Debugging mac app health indicators
title: "健康檢查"
---

# macOS 上的健康檢查

如何從選單列應用程式中查看連結的頻道是否健康。

## 選單列

- 狀態指示點現已反映 Baileys 的健康狀態：
  - 綠色：已連結 + socket 最近已開啟。
  - 橘色：連線中/重試中。
  - 紅色：已登出或探測失敗。
- 次行文字顯示「linked · auth 12m」或顯示失敗原因。
- 「執行健康檢查」選單項目會觸發隨需探測。

## 設定

- 一般分頁新增了一個健康狀態卡片，顯示：已連結的認證時間、session-store 路徑/數量、上次檢查時間、上次錯誤/狀態碼，以及「執行健康檢查」/「顯示日誌」的按鈕。
- 使用快照快取，讓 UI 能即時載入，並在離線時優雅地降級。
- **頻道分頁** 會顯示頻道狀態 + WhatsApp/Telegram 的控制項（登入 QR、登出、探測、上次斷線/錯誤）。

## 探測運作方式

- 應用程式每約 60 秒及隨需透過 `ShellExecutor` 執行 `openclaw health --json`。探測會載入憑證並回報狀態，而不會傳送訊息。
- 分別快取最後的良好快照與最後的錯誤，以避免閃爍；顯示各自的時間戳記。

## 若有疑慮

- 您仍然可以使用 [Gateway health](/en/gateway/health) 中的 CLI 流程（`openclaw status`、`openclaw status --deep`、`openclaw health --json`），並對 `/tmp/openclaw/openclaw-*.log` 執行 tail 指令以查看 `web-heartbeat` / `web-reconnect`。
